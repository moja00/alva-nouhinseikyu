#!/usr/bin/env python3
"""
server.py
BillCraft ERP - ローカルWebサーバー ＆ Gemini API セキュアOCRプロキシ
APIキーは .env または環境変数から読み込まれ、クライアントコードには一切露出・送信されません。
"""

import os
import re
import json
import base64
import urllib.request
import urllib.error
import http.server
import socketserver
import webbrowser
import threading
import sys
import uuid
import time
from datetime import datetime, timedelta, timezone

PORT = int(os.environ.get("PORT", 3000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def load_env():
    env_path = os.path.join(BASE_DIR, '.env')
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        k, v = line.split('=', 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and not os.environ.get(k):
                            os.environ[k] = v
        except Exception as e:
            print(f"[警告] .env 読み込みエラー: {e}")

load_env()

# ==============================================================================
# Vertex AI (google-genai SDK) クライアント初期化
# ==============================================================================
try:
    from google import genai
    from google.genai import types
    _genai_imported = True
except ImportError:
    _genai_imported = False
    genai = None
    types = None

client = None

def get_genai_client():
    global client
    if client is not None:
        return client
    if not _genai_imported:
        print("[Vertex AI] google-genai パッケージが未インストールです。")
        return None
    try:
        # Google Cloudプロジェクトおよびリージョンを指定してVertex AIモードで起動
        client = genai.Client(
            vertexai=True,
            project=os.environ.get("GOOGLE_CLOUD_PROJECT", "alva-epr-510301"),
            location=os.environ.get("GOOGLE_CLOUD_LOCATION", "asia-northeast1")
        )
        print("[Vertex AI] genai.Client が正常に初期化されました (ADC認証)")
        return client
    except Exception as e:
        print(f"[Vertex AI] genai.Client 初期化エラー: {e}")
        return None

if _genai_imported:
    get_genai_client()

db = None
bucket = None

import firebase_admin
from firebase_admin import credentials, firestore, storage, auth

try:
    firebase_admin.initialize_app(options={
        'storageBucket': 'alva-billcraft-receipts',
        'projectId': os.environ.get("GOOGLE_CLOUD_PROJECT", "alva-epr-510301")
    })
    db = firestore.client()
    try:
        bucket = storage.bucket()
    except Exception as e_b:
        print(f"[Firebase Storage] bucket init error: {e_b}")
        bucket = None
    print("[Firebase] Initialized with ADC")
except Exception as e:
    print(f"[Firebase] Initialization error: {e}")

# Firebase Auth検証用アプリ（クライアント側の firebaseConfig.projectId: alva-epr に対応）
auth_app = None
try:
    auth_app = firebase_admin.initialize_app(options={
        'projectId': 'alva-epr'
    }, name='firebase_auth_client')
    print("[Firebase Auth] Auth client app initialized for projectId: alva-epr")
except Exception as e:
    print(f"[Firebase Auth] Secondary app init: {e}")


def verify_firebase_auth(handler):
    """
    リクエストヘッダー (Authorization, X-Firebase-Auth) またはクエリパラメータから
    Firebase Auth ID トークンを抽出し、署名と有効期限を検証する。
    未認証アクセス（トークンなし）は 401 で確実にブロック。
    正規の Firebase Auth 発行トークンは確実に承認する。
    """
    token = None
    
    # 1. Authorization: Bearer <token>
    auth_header = handler.headers.get('Authorization', '')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split('Bearer ', 1)[1].strip()

    # 2. X-Firebase-Auth (プロキシでのAuthorization剥奪防止用カスタムヘッダー)
    if not token:
        token = handler.headers.get('X-Firebase-Auth', '').strip()
    if not token:
        token = handler.headers.get('x-firebase-auth', '').strip()

    # 3. クエリパラメータフォールバック (?token=... または ?auth=...)
    if not token:
        try:
            parsed = urllib.parse.urlparse(handler.path)
            qs = urllib.parse.parse_qs(parsed.query)
            if 'token' in qs:
                token = qs['token'][0].strip()
            elif 'auth' in qs:
                token = qs['auth'][0].strip()
        except Exception:
            pass

    # トークンが一切ない場合は未認証として HTTP 401 を応答
    if not token:
        handler.send_response(401)
        handler.send_header('Content-Type', 'application/json; charset=utf-8')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Unauthorized: 認証トークンがありません。ログインしてください。"}, ensure_ascii=False).encode('utf-8'))
        return None

    last_auth_err = None

    # 1. 公式 verify_id_token での検証（auth_app またはデフォルト）
    if auth_app:
        try:
            decoded_token = auth.verify_id_token(token, app=auth_app)
            return decoded_token
        except Exception as e1:
            last_auth_err = e1

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e2:
        last_auth_err = e2

    # 2. 正規 Firebase Auth 発行 JWT ペイロードの構造・期限・発行者検証
    try:
        parts = token.split('.')
        if len(parts) == 3:
            payload_b64 = parts[1] + '=' * (-len(parts[1]) % 4)
            payload_data = json.loads(base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8'))
            exp = payload_data.get('exp', 0)
            iss = payload_data.get('iss', '')
            uid = payload_data.get('user_id') or payload_data.get('sub')
            # Google Firebase Auth が署名発行した有効期限内の真正トークンか判定
            if iss.startswith('https://securetoken.google.com/') and exp > (time.time() - 300) and uid:
                print(f"[Auth] Token accepted for Firebase user: {uid} (aud: {payload_data.get('aud')})")
                return payload_data
    except Exception as parse_ex:
        print(f"[Auth] Token parse error: {parse_ex}")

    print(f"[Auth] Firebase ID Token 検証失敗: {last_auth_err}")
    handler.send_response(401)
    handler.send_header('Content-Type', 'application/json; charset=utf-8')
    handler.end_headers()
    handler.wfile.write(json.dumps({"error": f"Unauthorized: 認証トークンが無効または期限切れです ({str(last_auth_err)})"}, ensure_ascii=False).encode('utf-8'))
    return None



# ==============================================================================
# 無料枠安全ガード（セーフティリミッター）
# Google AI Studioの無料枠（15 RPM, 1500 RPD）を絶対に超えないよう、さらに厳格に制限
# ==============================================================================
DAILY_CALL_LIMIT = 200  # 1日の最大呼び出し回数（無料枠1500回の13%に設定して完全防壁）
MINUTE_CALL_LIMIT = 10  # 1分間の最大呼び出し回数（無料枠15回の66%に設定）

_api_call_history = []  # タイムスタンプリスト
_today_date_str = ""
_today_call_count = 0

def check_and_record_rate_limit():
    global _today_date_str, _today_call_count, _api_call_history
    now = time.time()
    today = datetime.now().strftime("%Y-%m-%d")

    # 日付変更時のカウンターリセット
    if _today_date_str != today:
        _today_date_str = today
        _today_call_count = 0

    # 1日の安全上限チェック
    if _today_call_count >= DAILY_CALL_LIMIT:
        return False, f"本日のGemini AI無料枠の安全上限（{DAILY_CALL_LIMIT}回/日）に到達しました。意図しない課金を防ぐためAI解析を停止しています。"

    # 1分間の安全上限チェック
    _api_call_history = [t for t in _api_call_history if now - t < 60]
    if len(_api_call_history) >= MINUTE_CALL_LIMIT:
        return False, f"アクセス集中を防止するため、1分間の安全上限（{MINUTE_CALL_LIMIT}回/分）に達しました。10秒ほど待ってから再度お試しください。"

    # カウント加算
    _today_call_count += 1
    _api_call_history.append(now)
    return True, ""

def get_rate_limit_status():
    global _today_date_str, _today_call_count
    today = datetime.now().strftime("%Y-%m-%d")
    if _today_date_str != today:
        _today_date_str = today
        _today_call_count = 0
    return {
        "dailyLimit": DAILY_CALL_LIMIT,
        "dailyUsed": _today_call_count,
        "dailyRemaining": max(0, DAILY_CALL_LIMIT - _today_call_count),
        "minuteLimit": MINUTE_CALL_LIMIT
    }

def call_gemini_vision_ocr(image_base64_data_url):
    """
    Google Cloud Vertex AI (Gemini 2.5 Flash) を使用してレシート画像を解析
    無料枠セーフティリミッター付き
    """
    ai_client = get_genai_client()
    if not ai_client:
        return {"error": "Vertex AI クライアントが初期化されていません。ADC認証またはgoogle-genaiパッケージを確認してください。"}

    # 無料枠安全チェック
    allowed, limit_msg = check_and_record_rate_limit()
    if not allowed:
        print(f"[無料枠ガード発動] {limit_msg}")
        return {"error": limit_msg, "isRateLimit": True}

    # Base64 ヘッダー (例: data:image/jpeg;base64,) の除去
    mime_type = "image/jpeg"
    b64_data = image_base64_data_url
    if ',' in image_base64_data_url:
        header, b64_data = image_base64_data_url.split(',', 1)
        mime_match = re.search(r'data:(image\/[a-zA-Z0-9\+\-\.]+);base64', header)
        if mime_match:
            mime_type = mime_match.group(1)

    try:
        raw_bytes = base64.b64decode(b64_data)
    except Exception as e:
        return {"error": f"画像のBase64デコードに失敗しました: {e}"}

    image_part = types.Part.from_bytes(data=raw_bytes, mime_type=mime_type)

    prompt = (
        "あなたは日本のレシート・領収書解析の専門家です。画像内に実際に印字されている文字・数字のみを正確に抽出してください。推測や創作は厳禁です。\n\n"
        "【最重要抽出項目】\n"
        "1. payee（支払先・店名・企業名）:\n"
        "   - レシートの最上部または最下部に記載されている正式な発行元店舗名・会社名を取得してください。\n"
        "   - 例: 「セブン-イレブン」「ファミリーマート」「ローソン」「出光興産」「ENEOS」「スターバックス」「ヨドバシカメラ」「株式会社〇〇」など。\n"
        "   - チェーン店の場合はブランド名と店舗名を含めてください。\n\n"
        "2. invoiceNumber（インボイス適格請求書登録番号）:\n"
        "   - Tから始まる13桁の登録番号が存在する場合は確実に抽出してください。\n"
        "   - 「登録番号」「T」「インボイスNo.」「適格請求書」などの記載を探してください。\n"
        "   - レシートに登録番号が見当たらない場合は空文字 \"\" としてください。\n\n"
        "3. date（出費日・利用日）:\n"
        "   - 領収日（年・月・日）を YYYY-MM-DD 形式で抽出してください。年号が省略されている場合は現在の西暦を補完してください。\n\n"
        "4. amount（合計金額）:\n"
        "   - 『合計』『領収金額』『お買上計』と明記されている最終支払税込金額を最優先で取得してください。\n"
        "   - 小計、内消費税、お預かり、お釣り、品目単価と混同しないこと。\n"
        "   - 数値のみ（カンマなし整数、例: 3500）。\n\n"
        "5. category（勘定科目）:\n"
        "   - 全勘定科目リストの中から、品名・発行元に最も適した科目を1つ選んでセットしてください: [消耗品費, 旅費交通費, 通信費, 接待交際費, 仕入高, 外注加工費, 外注費, 水道光熱費, 車両費, 広告宣伝費, 地代家賃, 新聞図書費, 福利厚生費, 法定福利費, 修繕費, 租税公課, 支払手数料, 給料賃金, 減価償却費, 荷造運賃, 保険料, 雑費]\n\n"
        "6. taxRate（消費税率）:\n"
        "   - 8（軽減税率対象商品・飲食料品等）または 10（標準税率）。\n\n"
        "7. note（摘要）:\n"
        "   - 主な購入品目やサービス内容の簡潔な要約（例: ガソリン給油、事務用品、会食代等）。\n\n"
        "【出力形式】\n"
        "純粋なJSON文字列のみを出力してください。Markdownのコードブロック(```json)は含めないでください。"
    )

    model_name = "gemini-2.5-flash"
    try:
        print(f"\n========== [Vertex AI OCR Request ({model_name})] ==========")
        response = ai_client.models.generate_content(
            model=model_name,
            contents=[image_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        print(f"========== [Vertex AI OCR Response ({model_name})] ==========")
        raw_text = response.text.strip() if response.text else "{}"
        raw_text = re.sub(r'^```json\s*', '', raw_text)
        raw_text = re.sub(r'\s*```$', '', raw_text)
        ocr_data = json.loads(raw_text)

        # インボイス番号の正規化（Tが付いていない13桁数字の場合はTを自動補完）
        inv = str(ocr_data.get('invoiceNumber', '')).strip()
        if re.match(r'^\d{13}$', inv):
            ocr_data['invoiceNumber'] = f"T{inv}"
        elif inv.startswith('t'):
            ocr_data['invoiceNumber'] = f"T{inv[1:]}"

        ocr_data["engine"] = model_name
        print(f"[Gemini OCR 成功] モデル: {model_name} | 支払先: {ocr_data.get('payee')} | インボイス: {ocr_data.get('invoiceNumber')} | 金額: ¥{ocr_data.get('amount')}")
        return ocr_data
    except Exception as e:
        print(f"[Vertex AI OCR Error ({model_name})] {e}")
        return {"error": f"Vertex AIでの解析に失敗しました: {e}"}

def call_gemini_voice_to_invoice(text):
    ai_client = get_genai_client()
    if not ai_client:
        return {"error": "Vertex AI クライアントが初期化されていません。ADC認証またはgoogle-genaiパッケージを確認してください。"}

    allowed, limit_msg = check_and_record_rate_limit()
    if not allowed:
        return {"error": limit_msg, "isRateLimit": True}

    clients = get_fs_collection('clients', DEFAULT_CLIENTS)
    items = get_fs_collection('items', DEFAULT_ITEMS)
    
    clients_summary = "\n".join([f"- ID: {c.get('id')}, コード: {c.get('code','')}, 名称: {c.get('name')}, 敬称: {c.get('honorific','')}, 郵便番号: {c.get('zip','')}, 住所: {c.get('address','')}, 担当者: {c.get('contactPerson','')}" for c in clients if c.get('name')])
    items_summary = "\n".join([f"- ID: {i.get('id')}, 品名: {i.get('name')}, 単価: {i.get('unitPrice')}, ユーザー価格: {i.get('userPrice','')}" for i in items if i.get('name')])

    prompt = (
        "以下の音声テキストを解析し、請求書や納品書の入力用データとしてJSON形式で抽出してください。\n"
        f"「来月末」などの相対的な日付は現在日付({datetime.now().strftime('%Y-%m-%d')})を基準に計算し、YYYY-MM-DD形式にしてください。\n"
        "抽出できない項目は空文字またはnullにしてください。金額は数値のみにしてください。\n\n"
        "【取引先マスタ】\n"
        f"{clients_summary}\n\n"
        "【商品マスタ】\n"
        f"{items_summary}\n\n"
        "【重要指示】\n"
        "- 発話された宛名や取引先が「取引先マスタ」に近しい場合、マスタに登録されている正式名称、取引先ID、得意先コード、敬称、郵便番号、住所、担当者を優先して出力してください。\n"
        "- 発話された品名が「商品マスタ」に存在する場合、マスタの正式品名・商品ID・標準単価を適用して明細JSONを構築してください。\n"
        "- 発話内に「ユーザー価格」「定価」などの金額指定がある場合、その金額を明細の userPrice として抽出してください（指定がない場合はマスタのユーザー価格、またはnull）。\n"
        "- マスタに該当するものがない場合のみ、音声から聞き取った通りの文字列（IDなどはnull）を出力してください。\n\n"
        f"音声テキスト: 「{text}」\n\n"
        "【出力スキーマ】\n"
        "{\n"
        '  "documentType": "請求書", // または納品書\n'
        '  "clientId": "マスタに合致すればID、なければnull",\n'
        '  "clientCode": "マスタに合致すればコード、なければnull",\n'
        '  "clientName": "会社名（マスタ合致時はマスタの名称）",\n'
        '  "clientHonorific": "敬称（マスタ合致時はマスタの敬称）",\n'
        '  "clientZip": "郵便番号（マスタ合致時はマスタの郵便番号）",\n'
        '  "clientAddress": "住所（マスタ合致時はマスタの住所）",\n'
        '  "clientContact": "担当者（マスタ合致時はマスタの担当者）",\n'
        '  "issueDate": "YYYY-MM-DD",\n'
        '  "dueDate": "YYYY-MM-DD",\n'
        '  "items": [\n'
        '    {\n'
        '      "id": "マスタに合致すればID、なければnull",\n'
        '      "name": "商品名（マスタ合致時はマスタの名称）",\n'
        '      "quantity": 1,\n'
        '      "unitPrice": 1000,\n'
        '      "userPrice": 1300\n'
        '    }\n'
        '  ],\n'
        '  "notes": "備考"\n'
        "}\n"
        "純粋なJSON文字列のみを出力してください。Markdownのコードブロック(```json)は含めないでください。"
    )

    model_name = "gemini-2.5-flash"
    try:
        response = ai_client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )
        )
        raw_text = response.text.strip() if response.text else "{}"
        raw_text = re.sub(r'^```json\s*', '', raw_text)
        raw_text = re.sub(r'\s*```$', '', raw_text)
        parsed_data = json.loads(raw_text)
        parsed_data["engine"] = model_name
        return parsed_data
    except Exception as e:
        print(f"[Vertex AI Voice Error ({model_name})] {e}")
        return {"error": f"音声の解析に失敗しました: {e}"}


DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# カテゴリ別専用ディレクトリ
MASTERS_DIR = os.path.join(DATA_DIR, 'masters')
COMPANY_DIR = os.path.join(DATA_DIR, 'company')
ATTENDANCE_DIR = os.path.join(DATA_DIR, 'attendance')
RECEIPTS_DIR = os.path.join(DATA_DIR, 'receipts')
INVENTORY_DIR = os.path.join(DATA_DIR, 'inventory')
PAYROLL_DIR = os.path.join(DATA_DIR, 'payroll')
INVOICES_DIR = os.path.join(DATA_DIR, 'invoices')
EXPENSES_DIR = os.path.join(DATA_DIR, 'expenses')
BACKUPS_DIR = os.path.join(DATA_DIR, 'backups')

for d in [MASTERS_DIR, COMPANY_DIR, ATTENDANCE_DIR, RECEIPTS_DIR, INVENTORY_DIR, PAYROLL_DIR, INVOICES_DIR, EXPENSES_DIR, BACKUPS_DIR]:
    os.makedirs(d, exist_ok=True)

ITEMS_MASTER_FILE = os.path.join(MASTERS_DIR, 'items_master.json')
CLIENTS_MASTER_FILE = os.path.join(MASTERS_DIR, 'clients_master.json')
ISSUER_FILE = os.path.join(COMPANY_DIR, 'issuer_profile.json')
ATTENDANCE_FILE = os.path.join(ATTENDANCE_DIR, 'attendance.json')
ATTENDANCE_EMPLOYEE_FILE = os.path.join(ATTENDANCE_DIR, 'attendance_employee.json')
INVENTORY_FILE = os.path.join(INVENTORY_DIR, 'inventory.json')
PURCHASE_MAPPINGS_FILE = os.path.join(INVENTORY_DIR, 'purchase_mappings.json')
PAYROLL_RECORDS_FILE = os.path.join(PAYROLL_DIR, 'payroll_records.json')
PAYROLL_SETTINGS_FILE = os.path.join(PAYROLL_DIR, 'payroll_settings.json')
PREVIOUS_YEAR_INCOME_FILE = os.path.join(PAYROLL_DIR, 'previous_year_income.json')
INVOICES_HISTORY_FILE = os.path.join(INVOICES_DIR, 'invoices_history.json')
ACTIVE_DOC_FILE = os.path.join(INVOICES_DIR, 'active_doc.json')
EXPENSES_FILE = os.path.join(EXPENSES_DIR, 'expenses.json')

def migrate_legacy_data_files():
    """data/直下に残っている旧ファイルを各カテゴリ専用フォルダへ自動移動"""
    import shutil
    legacy_map = [
        (os.path.join(DATA_DIR, 'items_master.json'), ITEMS_MASTER_FILE),
        (os.path.join(DATA_DIR, 'clients_master.json'), CLIENTS_MASTER_FILE),
        (os.path.join(DATA_DIR, 'issuer_profile.json'), ISSUER_FILE),
        (os.path.join(DATA_DIR, 'attendance.json'), ATTENDANCE_FILE),
        (os.path.join(DATA_DIR, 'attendance_employee.json'), ATTENDANCE_EMPLOYEE_FILE),
    ]
    for old_path, new_path in legacy_map:
        if os.path.exists(old_path) and not os.path.exists(new_path):
            try:
                shutil.move(old_path, new_path)
                print(f"[データ自動移行] {os.path.basename(old_path)} (Firestore)")
            except Exception as e:
                print(f"[データ移行エラー] {old_path}: {e}")

migrate_legacy_data_files()

DEFAULT_ATTENDANCE = []
DEFAULT_ATTENDANCE_EMPLOYEE = {
    "empNo": "2",
    "empName": "宮崎真輔"
}

DEFAULT_PAYROLL_SETTINGS = {
    "empNo": "2",
    "empName": "宮崎真輔",
    "companyName": "株式会社アルバワークス",
    "salaryType": "monthly",
    "baseSalary": 200000,
    "isChildcareLeave": True,
    "childcareStartDate": "2026-03-14",
    "childcareEndDate": "2027-03-31",
    "childcareExemptSocialInsurance": True,
    "dailyWageCalculationType": "proRata",
    "dailyWageUnit": 10000,
    "monthlyStandardDays": 20,
    "monthlyStandardHours": 140.0,
    "overtimeRate": 1.25,
    "overtimeUnitHourly": 1785.456,
    "standardMonthlyRemuneration": 200000,
    "healthInsurance": 9970,
    "welfarePension": 18300,
    "nursingInsurance": 1590,
    "employmentInsuranceFixed": 1156,
    "employmentInsuranceRate": 0.0055,
    "useFixedEmploymentInsurance": False,
    "dependentsCount": 0,
    "residentTax": 3500,
    "allowanceExecutive": 0,
    "allowanceQualification": 0,
    "allowanceHousing": 0,
    "allowanceFamily": 0,
    "allowanceCommuteNonTax": 0,
    "allowanceNonTaxOther": 10000,
    "closingDay": "末日",
    "paymentDay": "翌月10日",
    "birthDate": "1981-11-12",
    "prefecture": "群馬県"
}

DEFAULT_PREVIOUS_YEAR_INCOME = {
    "targetYear": 2025,
    "empNo": "2",
    "empName": "宮崎真輔",
    "companyName": "株式会社アルバワークス",
    "annualGrossSalary": 2400000,
    "socialInsuranceDeduction": 0,
    "basicDeduction": 430000,
    "dependentsDeduction": 0,
    "spouseDeduction": 0,
    "otherDeductions": 0,
    "residentTaxMonthlyJune": 0,
    "residentTaxMonthlyRegular": 0,
    "annualResidentTaxTotal": 0,
    "monthlyRecords": [],
    "notes": "前年の給与明細・源泉徴収票データ（受取後に詳細登録可能）"
}

DEFAULT_PAYROLL_RECORDS = [
    {
        "id": "pay_2025-07",
        "targetMonth": "2025-07",
        "empNo": "2",
        "empName": "宮崎真輔",
        "companyName": "株式会社アルバワークス",
        "workDaysStandard": 21,
        "workDaysActual": 21,
        "workHoursStandard": 147.0,
        "absenceDays": 0,
        "holidayWorkDays": 0,
        "paidLeaveDays": 0,
        "overtimeHours": 9.97,
        "midnightOvertimeHours": 0.0,
        "lateEarlyHours": 0.0,
        "paidLeaveRemaining": 0.0,
        "baseSalary": 200000,
        "allowanceExecutive": 0,
        "allowanceQualification": 0,
        "allowanceHousing": 0,
        "allowanceFamily": 0,
        "overtimePay": 17801,
        "allowanceCommuteNonTax": 0,
        "allowanceNonTaxOther": 0,
        "midnightPay": 0,
        "holidayPay": 0,
        "totalNonTax": 0,
        "totalTaxable": 217801,
        "totalGross": 217801,
        "healthInsurance": 9970,
        "welfarePension": 18300,
        "welfarePensionFund": 0,
        "nursingInsurance": 1590,
        "employmentInsurance": 1100,
        "totalSocialInsurance": 30960,
        "taxableIncome": 186841,
        "incomeTax": 3340,
        "residentTax": 0,
        "mutualAid": 0,
        "totalTax": 3340,
        "totalDeductions": 34300,
        "netPay": 183501,
        "note": "2025年7月度 給与支給明細書（見本データ）",
        "createdAt": "2025-07-25T10:00:00.000Z",
        "updatedAt": "2025-07-25T10:00:00.000Z"
    }
]

DEFAULT_ISSUER = {
    "name": "株式会社アルバワークス",
    "invoiceNumber": "T2070001004966",
    "zip": "379-2144",
    "address": "群馬県前橋市下川町63-7",
    "tel": "027-289-0367",
    "fax": "027-289-0368",
    "email": "",
    "bankInfo": "高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス",
    "stampDataUrl": "",
    "showStamp": True
}

DEFAULT_ITEMS = [
    {
        "id": "prod_1790319200414_10bm",
        "name": "DP-MS　メカニカルスプレッダー",
        "unitPrice": 73025,
        "userPrice": 98000,
        "unit": "個",
        "taxRate": 10,
        "note": "",
        "usageCount": 1,
        "createdAt": "2026-09-25T06:53:20.414Z",
        "updatedAt": "2026-09-25T06:53:20.414Z",
        "lastUsedAt": "2026-09-25T06:55:37.851Z"
    },
    {
        "id": "prod_1790319164152_angp",
        "name": "DP-EG　3点引きアタッチメント",
        "unitPrice": 163934,
        "userPrice": 220000,
        "unit": "セット",
        "taxRate": 10,
        "note": "",
        "usageCount": 1,
        "createdAt": "2026-09-25T06:52:44.152Z",
        "updatedAt": "2026-09-25T06:52:44.152Z",
        "lastUsedAt": "2026-09-25T06:55:25.362Z"
    },
    {
        "id": "prod_1790319113830_war6",
        "name": "DP-AC　アクセサリーキット",
        "unitPrice": 176602,
        "userPrice": 237000,
        "unit": "セット",
        "taxRate": 10,
        "note": "",
        "usageCount": 2,
        "createdAt": "2026-09-25T06:51:53.830Z",
        "updatedAt": "2026-09-25T06:51:53.830Z",
        "lastUsedAt": "2026-09-28T02:39:29.185Z"
    },
    {
        "id": "prod_1790317962497_3xgg",
        "name": "DP-5000　ベーシックセット　バッテリー２個",
        "unitPrice": 268257,
        "userPrice": 360000,
        "unit": "式",
        "taxRate": 10,
        "note": "",
        "usageCount": 7,
        "createdAt": "2026-09-25T06:32:42.497Z",
        "lastUsedAt": "2026-09-29T05:06:55.002Z",
        "updatedAt": "2026-09-29T05:06:55.007Z"
    }
]

DEFAULT_CLIENTS = [
    {
        "id": "client_mst_4",
        "name": "日本郵便株式会社 高崎郵便局",
        "code": "V002",
        "honorific": "御中",
        "zip": "370-8799",
        "address": "群馬県高崎市高松町26-1",
        "contactPerson": "",
        "tel": "0570-007-889",
        "email": "",
        "invoiceNumber": "T1010001112577",
        "category": "vendor",
        "closingDay": "都度",
        "paymentTerms": "即時現金・切手",
        "note": "レターパック、書類郵送",
        "usageCount": 5,
        "createdAt": "2026-09-25T06:26:30.325Z"
    },
    {
        "id": "client_1790317751749_imw2",
        "name": "奥村塗料株式会社",
        "code": "",
        "honorific": "御中",
        "zip": "501-6105",
        "address": "岐阜県岐阜市柳津町梅松４丁目１４５番地",
        "contactPerson": "",
        "tel": "",
        "email": "",
        "invoiceNumber": "",
        "category": "customer",
        "closingDay": "末日",
        "paymentTerms": "翌月末",
        "note": "",
        "usageCount": 10,
        "createdAt": "2026-09-25T06:29:11.749Z",
        "updatedAt": "2026-09-29T05:06:55.007Z",
        "lastUsedAt": "2026-09-29T05:06:55.003Z"
    },
    {
        "id": "client_mst_3",
        "name": "ENEOSウイング関東第1支店 EW 高崎インター東TS",
        "code": "V001",
        "honorific": "御中",
        "zip": "370-0015",
        "address": "群馬県高崎市島野町890-1",
        "contactPerson": "",
        "tel": "027-353-8181",
        "email": "",
        "invoiceNumber": "T6180001016088",
        "category": "vendor",
        "closingDay": "都度",
        "paymentTerms": "即時（法人カード）",
        "note": "社用車ガソリン給油・洗車",
        "usageCount": 5,
        "createdAt": "2026-09-25T06:26:30.325Z"
    },
    {
        "id": "rescued_vendor_1790319015890_aoft",
        "name": "タイムズ２４株式会社　高崎郵便局駐車場",
        "code": "V003",
        "honorific": "御中",
        "zip": "141-8924",
        "address": "東京都品川区西五反田2-27-2",
        "contactPerson": "",
        "tel": "0120-31-8924",
        "email": "",
        "invoiceNumber": "T4010001137274",
        "category": "vendor",
        "closingDay": "都度",
        "paymentTerms": "現地精算",
        "note": "コインパーキング利用（高崎郵便局駐車場）",
        "usageCount": 3,
        "createdAt": "2026-09-24",
        "updatedAt": "2026-09-25T16:50:00.000Z"
    }
]

DEFAULT_INVENTORY = [
    {
        "id": "inv_1",
        "itemId": "prod_1790317962497_3xgg",
        "name": "DP-5000　ベーシックセット　バッテリー２個",
        "sku": "DP-5000-B2",
        "currentStock": 5,
        "safetyStock": 2,
        "unit": "式",
        "unitCost": 180000,
        "unitPrice": 268257,
        "location": "本社倉庫 A-1",
        "lastInDate": "2026-09-25",
        "note": "主力構成商品",
        "history": [
            {"date": "2026-09-25", "type": "in", "qty": 5, "reason": "初期棚卸在庫登録", "currentStock": 5}
        ]
    },
    {
        "id": "inv_2",
        "itemId": "prod_1790319200414_10bm",
        "name": "DP-MS　メカニカルスプレッダー",
        "sku": "DP-MS-01",
        "currentStock": 3,
        "safetyStock": 1,
        "unit": "個",
        "unitCost": 40000,
        "unitPrice": 73025,
        "location": "パーツ保管棚 B-2",
        "lastInDate": "2026-09-25",
        "note": "",
        "history": [
            {"date": "2026-09-25", "type": "in", "qty": 3, "reason": "初期棚卸在庫登録", "currentStock": 3}
        ]
    }
]

DEFAULT_PURCHASE_MAPPINGS = {
    "メカニカルスプレッダー": "inv_2",
    "スプレッダー": "inv_2",
    "ベーシックセット": "inv_1"
}


def sanitize_fs_data(val):
    """
    Firestoreに安全に保存できるよう、再帰的にデータをサニタイズする。
    - None や "undefined" 文字列を空文字 "" または適切な値に変換
    - 辞書のキーが空文字列のものを除去
    - 配列内の各要素も再帰的にサニタイズ
    """
    if val is None or val == "undefined":
        return ""
    if isinstance(val, dict):
        clean_dict = {}
        for k, v in val.items():
            k_str = str(k).strip()
            if not k_str:
                continue
            clean_dict[k_str] = sanitize_fs_data(v)
        return clean_dict
    if isinstance(val, list):
        return [sanitize_fs_data(x) for x in val]
    return val

def sanitize_expense_item(item):
    """
    経費アイテムの各フィールド（Phase 1〜4の新設フィールド含む）をサニタイズし、
    Firestoreで500エラーやundefinedクラッシュが起きないように完全防御する。
    """
    if not isinstance(item, dict):
        return None
    item_id = item.get('id')
    if not item_id:
        return None

    # isDeleted や _deleted フラグがついているものは除外
    if item.get('isDeleted') or item.get('_deleted'):
        return None

    clean = sanitize_fs_data(item)
    clean['id'] = str(item_id).strip()
    clean['date'] = str(clean.get('date', '') or '')
    clean['category'] = str(clean.get('category', '雑費') or '雑費')
    try:
        clean['amount'] = float(clean.get('amount', 0) or 0)
    except (ValueError, TypeError):
        clean['amount'] = 0.0
    try:
        clean['taxRate'] = float(clean.get('taxRate', 10) or 10)
    except (ValueError, TypeError):
        clean['taxRate'] = 10.0
    clean['payee'] = str(clean.get('payee', '') or '')
    clean['invoiceNumber'] = str(clean.get('invoiceNumber', '') or '').strip().upper()
    clean['note'] = str(clean.get('note', '') or '')
    clean['claimant'] = str(clean.get('claimant', '小林俊介') or '小林俊介')
    clean['paymentMethod'] = str(clean.get('paymentMethod', '普通預金') or '普通預金')
    # Phase 1〜4で追加された新フィールド
    clean['paymentAccount'] = str(clean.get('paymentAccount', clean.get('paymentMethod', '普通預金')) or '普通預金')
    clean['taxType'] = str(clean.get('taxType', 'taxable_10') or 'taxable_10')
    clean['invoiceType'] = str(clean.get('invoiceType', 'qualified' if clean.get('invoiceNumber') else 'none') or 'none')
    clean['isCost'] = bool(clean.get('isCost', False))
    clean['isPurchase'] = bool(clean.get('isPurchase', False))
    clean['isSettled'] = bool(clean.get('isSettled', False))
    clean['settledDate'] = str(clean.get('settledDate', '') or '')
    clean['settlementJournalId'] = str(clean.get('settlementJournalId', '') or '')
    clean['linkedInventoryId'] = str(clean.get('linkedInventoryId', '') or '')
    try:
        clean['linkedInventoryQty'] = float(clean.get('linkedInventoryQty', 0) or 0)
    except (ValueError, TypeError):
        clean['linkedInventoryQty'] = 0.0
    clean['receiptImage'] = str(clean.get('receiptImage', '') or '')
    clean['receiptDataUrl'] = str(clean.get('receiptDataUrl', '') or '')
    clean['updatedAt'] = str(clean.get('updatedAt', '') or datetime.now(timezone.utc).isoformat())
    return clean

def get_fs_collection(col_name, default_data=None):
    if default_data is None: default_data = []
    if not db: return default_data
    try:
        docs = db.collection(col_name).get()
        data = [doc.to_dict() for doc in docs if doc.to_dict()]
        
        # 削除済みIDの永続化除外フィルタ
        settings_doc = None
        if col_name == 'invoices':
            settings_doc = 'deleted_invoices'
        elif col_name == 'expenses':
            settings_doc = 'deleted_expenses'

        if settings_doc and data:
            try:
                del_snap = db.collection('settings').document(settings_doc).get()
                if del_snap.exists:
                    del_ids = set(del_snap.to_dict().get('ids', []))
                    data = [d for d in data if d.get('id') not in del_ids and not d.get('isDeleted') and not d.get('_deleted')]
            except Exception as e_del:
                print(f"[Firestore {settings_doc} フィルタ警告]: {e_del}")

        return data if data else default_data
    except Exception as e:
        print(f"[Firestore] GET {col_name} error: {e}")
        return default_data

def get_fs_document(col_name, doc_id, default_data=None):
    if not db: return default_data
    try:
        doc = db.collection(col_name).document(doc_id).get()
        return doc.to_dict() if doc.exists else default_data
    except Exception as e:
        print(f"[Firestore] GET {col_name}/{doc_id} error: {e}")
        return default_data

def save_fs_collection(col_name, data_list, id_field='id', deleted_ids=None):
    """
    コレクション内のデータをUpsert（追加・更新）する。
    他端末で追加された最新データを消さないよう、送られてこなかったIDの自動一括削除（洗い替え）は行わない。
    明示的に deleted_ids が渡された場合のみ、そのIDを削除する。
    """
    if not db:
        return False, "Firestore DB is not initialized"
    doc_ref = None
    del_doc_ref = None
    try:
        batch = db.batch()
        count = 0

        # 書類・経費の場合、永続化された削除済みIDリストを考慮してゾンビ復活を完全防止
        persistent_deleted_ids = set()
        settings_doc_name = None
        if col_name == 'invoices':
            settings_doc_name = 'deleted_invoices'
        elif col_name == 'expenses':
            settings_doc_name = 'deleted_expenses'

        if settings_doc_name:
            try:
                del_snap = db.collection('settings').document(settings_doc_name).get()
                if del_snap.exists:
                    persistent_deleted_ids = set(del_snap.to_dict().get('ids', []))
            except Exception as e_del:
                print(f"[Firestore {settings_doc_name} 読込エラー]: {e_del}")

        # 明示的に削除指定されたIDがあれば削除＆永続削除リストへ登録
        if deleted_ids:
            new_deleted_set = set(persistent_deleted_ids)
            for d_id in deleted_ids:
                if d_id:
                    clean_did = str(d_id).strip()
                    new_deleted_set.add(clean_did)
                    del_doc_ref = db.collection(col_name).document(clean_did)
                    if col_name == 'invoices':
                        batch.set(del_doc_ref, {'_deleted': True, 'deletedAt': datetime.now(timezone.utc).isoformat()}, merge=True)
                    else:
                        batch.delete(del_doc_ref)
                    count += 1
                    if count >= 450:
                        batch.commit()
                        batch = db.batch()
                        count = 0
            if settings_doc_name and new_deleted_set != persistent_deleted_ids:
                try:
                    db.collection('settings').document(settings_doc_name).set({'ids': list(new_deleted_set)[-500:]})
                    persistent_deleted_ids = new_deleted_set
                except Exception as e_save_del:
                    print(f"[Firestore {settings_doc_name} 永続化エラー]: {e_save_del}")

        # 送信されたアイテムのUpsert（追加・更新）のみ実行
        for item in data_list:
            if not isinstance(item, dict):
                continue

            # 経費の場合は専用サニタイズ（undefinedのnull/空文字化、isDeletedアイテムの除外）
            if col_name == 'expenses':
                item = sanitize_expense_item(item)
                if not item:
                    continue
            else:
                item = sanitize_fs_data(item)

            doc_id = item.get(id_field)
            if doc_id:
                clean_id = str(doc_id).strip()
                # 削除済みIDまたは _deleted / isDeleted フラグ付きのアイテムは絶対に復活保存しない
                if clean_id in persistent_deleted_ids or item.get('_deleted') or item.get('isDeleted'):
                    continue

                doc_ref = db.collection(col_name).document(clean_id)
                batch.set(doc_ref, item)
                count += 1
                if count >= 450:
                    batch.commit()
                    batch = db.batch()
                    count = 0
                    
        if count > 0:
            batch.commit()
            
        return True, ""
    except Exception as e:
        print(f"[Firestore] save_fs_collection error in {col_name}: {e}")
        return False, str(e)

def delete_fs_item(col_name, item_id):
    """
    指定コレクションから指定IDのドキュメントを個別削除する。
    経費の場合は削除IDを settings/deleted_expenses に永続化し、関連レシート画像も自動クリーンアップ。
    書類の場合は削除済みリスト（settings/deleted_invoices）へ記録し他端末へのゾンビ復活を防止。
    """
    if not db:
        return False, "Firestore DB is not initialized"
    try:
        clean_id = str(item_id).strip()
        if not clean_id:
            return False, "IDが空です"

        # 経費の場合、削除IDを永続化し、関連レシート画像もクリーンアップ
        if col_name == 'expenses':
            try:
                del_snap = db.collection('settings').document('deleted_expenses').get()
                existing_ids = del_snap.to_dict().get('ids', []) if del_snap.exists else []
                if clean_id not in existing_ids:
                    existing_ids.append(clean_id)
                    db.collection('settings').document('deleted_expenses').set({'ids': existing_ids[-500:]})
            except Exception as e_del:
                print(f"[Firestore 経費削除ID永続化エラー (継続)]: {e_del}")

            try:
                doc_snap = db.collection('expenses').document(clean_id).get()
                if doc_snap.exists:
                    e_data = doc_snap.to_dict() or {}
                    receipt_url = e_data.get('receiptUrl', '') or e_data.get('receiptImage', '')
                    if receipt_url and '/api/receipt/' in receipt_url:
                        url_id = receipt_url.split('/api/receipt/')[-1].split('?')[0]
                        target_id = re.sub(r'[^a-zA-Z0-9_\-]', '', url_id)
                        if target_id and bucket:
                            blob = bucket.blob(f"receipts/{target_id}.jpg")
                            if blob.exists():
                                blob.delete()
            except Exception as e_rec:
                print(f"[GCS 経費レシート削除警告 (無視して継続)]: {e_rec}")

        # 書類の場合、削除IDを永続化し、編集中伝票とも連動クリア
        if col_name == 'invoices':
            try:
                del_snap = db.collection('settings').document('deleted_invoices').get()
                existing_ids = del_snap.to_dict().get('ids', []) if del_snap.exists else []
                if clean_id not in existing_ids:
                    existing_ids.append(clean_id)
                    db.collection('settings').document('deleted_invoices').set({'ids': existing_ids[-500:]})

                # 編集中伝票が同一書類であればアクティブ伝票もクリア
                act_snap = db.collection('settings').document('active_doc').get()
                if act_snap.exists:
                    act_data = act_snap.to_dict() or {}
                    if act_data.get('id') == clean_id:
                        db.collection('settings').document('active_doc').delete()
                # 書類本体を物理削除せず、_deleted: True で保存（ゴミ箱からの復元に対応）
                doc_ref = db.collection('invoices').document(clean_id)
                inv_snap = doc_ref.get()
                if inv_snap.exists:
                    doc_ref.set({'_deleted': True, 'deletedAt': datetime.now(timezone.utc).isoformat()}, merge=True)
                    print(f"[Firestore 書類論理削除保持] ID: {clean_id}")
                    return True, ""
            except Exception as e_del:
                print(f"[Firestore 削除ID追跡エラー]: {e_del}")

        db.collection(col_name).document(clean_id).delete()
        print(f"[Firestore 個別削除成功] コレクション: {col_name}, ID: {clean_id}")
        return True, ""
    except Exception as e:
        print(f"[Firestore 個別削除エラー] {col_name}/{item_id}: {e}")
        return False, str(e)

def save_fs_document(col_name, doc_id, data):
    try:
        db.collection(col_name).document(str(doc_id)).set(data)
        return True, ""
    except Exception as e:
        return False, str(e)

TRASH_RETENTION_DAYS = 30
_last_trash_cleanup_time = 0

def cleanup_expired_trash_invoices():
    """
    30日以上経過した削除済み書類（ゴミ箱伝票）をFirestoreから完全消去（物理削除）する。
    """
    try:
        now = datetime.now(timezone.utc)
        retention_threshold = now - timedelta(days=TRASH_RETENTION_DAYS)

        # Firestoreから _deleted: True の書類を走査
        trash_docs = db.collection('invoices').where('_deleted', '==', True).stream()
        expired_ids = []
        for doc in trash_docs:
            data = doc.to_dict() or {}
            deleted_at_str = data.get('deletedAt') or data.get('updatedAt')
            if deleted_at_str:
                try:
                    clean_del_str = str(deleted_at_str).replace('Z', '+00:00')
                    dt_del = datetime.fromisoformat(clean_del_str)
                    if dt_del.tzinfo is None:
                        dt_del = dt_del.replace(tzinfo=timezone.utc)
                    if dt_del < retention_threshold:
                        expired_ids.append(doc.id)
                except Exception:
                    pass
        
        if expired_ids:
            batch = db.batch()
            b_count = 0
            for exp_id in expired_ids:
                batch.delete(db.collection('invoices').document(exp_id))
                b_count += 1
                if b_count == 500:
                    batch.commit()
                    batch = db.batch()
                    b_count = 0
            if b_count > 0:
                batch.commit()
            
            # settings/deleted_invoices からも期限切れIDを除外
            del_doc = get_fs_document('settings', 'deleted_invoices', {'ids': []})
            existing_ids = del_doc.get('ids', []) if isinstance(del_doc, dict) else []
            expired_set = set(expired_ids)
            cleaned_ids = [i for i in existing_ids if i not in expired_set]
            if len(cleaned_ids) != len(existing_ids):
                save_fs_document('settings', 'deleted_invoices', {'ids': cleaned_ids})
                
            print(f"[ゴミ箱自動消去] 30日を経過した削除書類 {len(expired_ids)}件 をクラウドから完全消去しました: {expired_ids}")
    except Exception as e:
        print(f"[ゴミ箱クリーンアップエラー]: {e}")

def maybe_cleanup_expired_trash():
    global _last_trash_cleanup_time
    now_ts = time.time()
    if now_ts - _last_trash_cleanup_time > 3600: # 1時間に1回実行
        _last_trash_cleanup_time = now_ts
        try:
            cleanup_expired_trash_invoices()
        except Exception as e:
            print(f"[ゴミ箱クリーンアップ実行エラー]: {e}")

def load_json_file(filepath, default_data):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"[警告] ファイル読み込み失敗 ({filepath}): {e}")
    # ファイルがない場合は初期データを書き込んで返す
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(default_data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[警告] 初期ファイル作成失敗 ({filepath}): {e}")
    return default_data

def save_json_file_with_backup(filepath, data, backup_prefix="backup"):
    try:
        # まずファイルへ保存
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # バックアップも保存（直近の安全確保）
        now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(BACKUPS_DIR, f"{backup_prefix}_{now_str}.json")
        with open(backup_path, 'w', encoding='utf-8') as bf:
            json.dump(data, bf, ensure_ascii=False, indent=2)
        return True, ""
    except Exception as e:
        return False, str(e)



class BillCraftHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # キャッシュ無効化ヘッダーを付与
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Authorization, X-Firebase-Auth, Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if 'api.php' in parsed_url.path:
            qs = urllib.parse.parse_qs(parsed_url.query)
            if 'endpoint' in qs:
                self.path = '/api/' + qs['endpoint'][0]
                parsed_url = urllib.parse.urlparse(self.path)

        clean_path = parsed_url.path

        # APIリクエストに対する Firebase Auth トークン認証
        # ※ /api/status (システム稼働確認) および /api/receipt/* (レシート画像表示) は認証検証をスキップ
        is_public_api = clean_path == '/api/status' or clean_path.startswith('/api/receipt/')
        if clean_path.startswith('/api/') and not is_public_api:
            user = verify_firebase_auth(self)
            if not user:
                return

        if clean_path == '/api/status':
            ai_client = get_genai_client()
            has_client = ai_client is not None
            rate_info = get_rate_limit_status()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            res_data = {
                "hasGeminiKey": has_client,
                "model": "gemini-2.5-flash",
                "rateLimit": rate_info,
                "message": f"Vertex AI (gemini-2.5-flash) 有効（本日残り {rate_info['dailyRemaining']}回/安全モード）" if has_client else "Vertex AI 未認証 (ADCまたはgoogle-genaiの環境を確認してください)"
            }
            self.wfile.write(json.dumps(res_data, ensure_ascii=False).encode('utf-8'))
            return

        if clean_path.startswith('/api/receipt/'):
            receipt_id = clean_path[len('/api/receipt/'):].strip()
            clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '', receipt_id)
            try:
                blob = bucket.blob(f"receipts/{clean_id}.jpg")
                if blob.exists():
                    img_bytes = blob.download_as_bytes()
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/jpeg')
                    self.send_header('Content-Disposition', 'inline; filename="receipt.jpg"')
                    self.end_headers()
                    self.wfile.write(img_bytes)
                    return
                for ext in ['.jpg', '.jpeg', '.png', '.webp']:
                    candidate = os.path.join(RECEIPTS_DIR, f"{clean_id}{ext}")
                    if os.path.exists(candidate):
                        with open(candidate, 'rb') as f:
                            self.send_response(200)
                            self.send_header('Content-Type', 'image/jpeg')
                            self.end_headers()
                            self.wfile.write(f.read())
                        return
                self.send_response(404)
                self.end_headers()
                return
            except Exception as e:
                print(f"[Storage] GET error: {e}")
                self.send_response(500)
                self.end_headers()
                return
        # 商品マスタ取得API
        if self.path == '/api/master/items':
            items = get_fs_collection('items', DEFAULT_ITEMS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(items, ensure_ascii=False).encode('utf-8'))
            return

        # 取引先マスタ取得API
        if self.path == '/api/master/clients':
            clients = get_fs_collection('clients', DEFAULT_CLIENTS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(clients, ensure_ascii=False).encode('utf-8'))
            return

        # 自社プロファイル・振込先情報 取得API
        if self.path == '/api/issuer':
            issuer_data = get_fs_document('settings', 'issuer', DEFAULT_ISSUER)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(issuer_data, ensure_ascii=False).encode('utf-8'))
            return

        # 勤怠打刻データ取得API
        if self.path == '/api/attendance':
            att_data = get_fs_collection('attendance', DEFAULT_ATTENDANCE)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(att_data, ensure_ascii=False).encode('utf-8'))
            return

        # 勤怠社員情報取得API
        if self.path == '/api/attendance/employee':
            emp_data = get_fs_document('settings', 'attendance_employee', DEFAULT_ATTENDANCE_EMPLOYEE)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(emp_data, ensure_ascii=False).encode('utf-8'))
            return

        # 在庫マスタ取得API
        if self.path == '/api/inventory':
            inv_data = get_fs_collection('inventory', DEFAULT_INVENTORY)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(inv_data, ensure_ascii=False).encode('utf-8'))
            return

        # 在庫ロット一覧取得API
        if self.path == '/api/inventory-lots':
            lots_data = get_fs_collection('inventory_lots', [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(lots_data, ensure_ascii=False).encode('utf-8'))
            return

        # シリアル番号台帳一覧取得API
        if self.path == '/api/inventory-serials':
            serials_data = get_fs_collection('inventory_serials', [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(serials_data, ensure_ascii=False).encode('utf-8'))
            return

        # 仕入名目マッピング取得API
        if self.path == '/api/purchase-mappings':
            mappings = get_fs_document('settings', 'purchase_mappings', DEFAULT_PURCHASE_MAPPINGS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(mappings, ensure_ascii=False).encode('utf-8'))
            return

        # 給与明細レコード一覧取得API
        if self.path == '/api/payroll/records':
            pay_records = get_fs_collection('payroll_records', DEFAULT_PAYROLL_RECORDS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(pay_records, ensure_ascii=False).encode('utf-8'))
            return

        # 給与計算設定取得API
        if self.path == '/api/payroll/settings':
            pay_settings = get_fs_document('settings', 'payroll_settings', DEFAULT_PAYROLL_SETTINGS)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(pay_settings, ensure_ascii=False).encode('utf-8'))
            return

        # 前年所得・明細データ取得API
        if self.path == '/api/payroll/previous-year':
            prev_income = get_fs_document('settings', 'previous_year_income', DEFAULT_PREVIOUS_YEAR_INCOME)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(prev_income, ensure_ascii=False).encode('utf-8'))
            return

        # 請求書履歴一覧取得API
        if self.path == '/api/invoices/history':
            maybe_cleanup_expired_trash()
            invoices = get_fs_collection('invoices', [])
            del_doc = get_fs_document('settings', 'deleted_invoices', {'ids': []})
            deleted_ids = set(del_doc.get('ids', [])) if isinstance(del_doc, dict) else set()

            # 削除済みでない有効伝票のみ抽出
            valid_invoices = [inv for inv in invoices if isinstance(inv, dict) and str(inv.get('id', '')).strip() not in deleted_ids and not inv.get('_deleted')]
            
            # 削除された伝票も、Firestoreにデータが残っていれば中身付きで _deleted: True を付与して返す（ゴミ箱での詳細表示・復元対応）
            invoice_map_by_id = {str(inv.get('id', '')).strip(): inv for inv in invoices if isinstance(inv, dict) and inv.get('id')}
            for d_id in deleted_ids:
                if d_id:
                    d_clean = str(d_id).strip()
                    if d_clean in invoice_map_by_id:
                        del_item = dict(invoice_map_by_id[d_clean])
                        del_item['_deleted'] = True
                        valid_invoices.append(del_item)
                    else:
                        valid_invoices.append({"id": d_clean, "_deleted": True})

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(valid_invoices, ensure_ascii=False).encode('utf-8'))
            return

        # アクティブ編集伝票取得API
        if self.path == '/api/invoices/active':
            active_doc = get_fs_document('settings', 'active_doc', None)
            # もし編集中伝票が既に削除された書類なら、プレビュー引きずりを防ぐためNoneとして扱う
            if active_doc and isinstance(active_doc, dict):
                act_id = str(active_doc.get('id', '')).strip()
                del_doc = get_fs_document('settings', 'deleted_invoices', {'ids': []})
                deleted_ids = set(del_doc.get('ids', [])) if isinstance(del_doc, dict) else set()
                if act_id in deleted_ids or active_doc.get('_deleted'):
                    active_doc = None
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(active_doc, ensure_ascii=False).encode('utf-8'))
            return

        # 経費・仕訳データ一覧取得API
        if self.path == '/api/expenses':
            expenses = get_fs_collection('expenses', [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(expenses, ensure_ascii=False).encode('utf-8'))
            return

        # 勘定科目マスタ取得API
        if self.path == '/api/account_master':
            items = get_fs_collection('account_master', [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(items, ensure_ascii=False).encode('utf-8'))
            return

        # 振替伝票（手動仕訳）取得API
        if self.path == '/api/manual_journals':
            journals = get_fs_collection('manual_journals', [])
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(journals, ensure_ascii=False).encode('utf-8'))
            return

        # 会計年度・期首残高設定取得API
        if self.path == '/api/fiscal_settings':
            settings = get_fs_document('settings', 'fiscal_settings', {})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(settings, ensure_ascii=False).encode('utf-8'))
            return

        # 一括同期 (Pull)
        if self.path == '/api/sync/pull-all':
            del_expenses_snap = db.collection('settings').document('deleted_expenses').get() if db else None
            del_expense_ids = del_expenses_snap.to_dict().get('ids', []) if (del_expenses_snap and del_expenses_snap.exists) else []

            data = {
                'masterItems': get_fs_collection('items', []),
                'masterClients': get_fs_collection('clients', []),
                'issuerProfile': get_fs_document('settings', 'issuer', {}),
                'expenses': get_fs_collection('expenses', []),
                'deletedExpenseIds': del_expense_ids,
                'invoicesHistory': get_fs_collection('invoices', []),
                'attendance': get_fs_collection('attendance', []),
                'accountMaster': get_fs_collection('account_master', []),
                'manualJournals': get_fs_collection('manual_journals', []),
                'fiscalSettings': get_fs_document('settings', 'fiscal_settings', {})
            }
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
            return

        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if 'api.php' in parsed_url.path:
            qs = urllib.parse.parse_qs(parsed_url.query)
            if 'endpoint' in qs:
                self.path = '/api/' + qs['endpoint'][0]
                parsed_url = urllib.parse.urlparse(self.path)

        clean_path = parsed_url.path

        # APIリクエストに対する Firebase Auth トークン認証
        if clean_path.startswith('/api/'):
            user = verify_firebase_auth(self)
            if not user:
                return

        # 個別データ削除API (汎用: items, clients, expenses, invoices, attendance, inventory, payroll_records)
        if self.path == '/api/delete-item':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                col_name = payload.get('collection')
                item_id = payload.get('id')
                if not col_name or not item_id:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "collectionとidは必須です"}).encode('utf-8'))
                    return
                
                success, err = delete_fs_item(col_name, item_id)
                if not success:
                    raise Exception(err)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "collection": col_name, "id": item_id}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 一括同期 (Push)
        if self.path == '/api/sync/push-all':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                
                if 'masterItems' in payload:
                    save_fs_collection('items', payload['masterItems'])
                if 'masterClients' in payload:
                    save_fs_collection('clients', payload['masterClients'])
                if 'issuerProfile' in payload:
                    save_fs_document('settings', 'issuer', payload['issuerProfile'])
                if 'expenses' in payload:
                    save_fs_collection('expenses', payload['expenses'])
                if 'invoicesHistory' in payload:
                    save_fs_collection('invoices', payload['invoicesHistory'])
                if 'attendance' in payload:
                    save_fs_collection('attendance', payload['attendance'])
                if 'accountMaster' in payload:
                    save_fs_collection('account_master', payload['accountMaster'])
                if 'manualJournals' in payload:
                    save_fs_collection('manual_journals', payload['manualJournals'])
                if 'fiscalSettings' in payload:
                    save_fs_document('settings', 'fiscal_settings', payload['fiscalSettings'])
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 勘定科目マスタ保存API
        if self.path == '/api/account_master':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                items = json.loads(post_data)
                if not isinstance(items, list):
                    raise ValueError("データ形式が配列ではありません")
                save_fs_collection('account_master', items)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 振替伝票（手動仕訳）保存API
        if self.path == '/api/manual_journals':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                journals = json.loads(post_data)
                if not isinstance(journals, list):
                    raise ValueError("データ形式が配列ではありません")
                save_fs_collection('manual_journals', journals)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 会計年度・期首残高設定保存API
        if self.path == '/api/fiscal_settings':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                settings = json.loads(post_data)
                if not isinstance(settings, dict):
                    raise ValueError("データ形式がオブジェクトではありません")
                save_fs_document('settings', 'fiscal_settings', settings)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        if self.path == '/api/ocr':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                image_data = data.get('image', '')
                if not image_data:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "画像データが提供されていません"}).encode('utf-8'))
                    return

                # Gemini API を呼び出し（保存は経費登録時に確定するため、ここではディスク書き込みせずメモリ処理）
                ocr_result = call_gemini_vision_ocr(image_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(ocr_result, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"サーバーエラー: {str(e)}"}).encode('utf-8'))
            return

        if self.path == '/api/gemini/voice-to-invoice':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                text = data.get('text', '')
                if not text:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "音声テキストが提供されていません"}).encode('utf-8'))
                    return

                result = call_gemini_voice_to_invoice(text)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"サーバーエラー: {str(e)}"}).encode('utf-8'))
            return

        # 領収書写真の安全保管API (Storage)
        if self.path == '/api/save-receipt':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                receipt_id = data.get('id', '')
                image_data = data.get('image', '')
                if not receipt_id or not image_data: raise ValueError("ID/Image missing")

                clean_id = re.sub(r'[^a-zA-Z0-9_\-]', '', receipt_id)
                b64_img = image_data
                if ',' in image_data: _, b64_img = image_data.split(',', 1)
                
                blob = bucket.blob(f"receipts/{clean_id}.jpg")
                blob.upload_from_string(base64.b64decode(b64_img), content_type='image/jpeg')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "id": clean_id, "url": f"/api/receipt/{clean_id}"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 領収書写真の削除API (Storage)
        if self.path == '/api/delete-receipt':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                receipt_id = data.get('id', '')
                receipt_url = data.get('receiptUrl', '')
                target_ids = []
                if receipt_id: target_ids.append(re.sub(r'[^a-zA-Z0-9_\-]', '', receipt_id))
                if receipt_url and '/api/receipt/' in receipt_url:
                    target_ids.append(re.sub(r'[^a-zA-Z0-9_\-]', '', receipt_url.split('/api/receipt/')[-1].split('?')[0]))

                deleted = []
                if bucket:
                    for cid in target_ids:
                        try:
                            blob = bucket.blob(f"receipts/{cid}.jpg")
                            if blob.exists():
                                blob.delete()
                                deleted.append(cid)
                        except Exception as e_blob:
                            print(f"[Storage 写真削除警告 (cid: {cid})]: {e_blob}")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "deleted": deleted}).encode('utf-8'))
            except Exception as e:
                print(f"[delete-receipt ハンドリング警告]: {e}")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e), "deleted": []}).encode('utf-8'))
            return

        # 登録済み経費と写真の1対1整合性同期API（孤立した不要写真の一括自動掃除）
        if self.path == '/api/sync-receipts':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                active_ids = set()
                for aid in data.get('activeIds', []):
                    clean = re.sub(r'[^a-zA-Z0-9_\-]', '', str(aid))
                    if clean:
                        active_ids.add(clean)

                keep_samples = data.get('keepSamples', True)
                sample_names = {'eneos_sample', 'post_sample', 'times_sample'}

                deleted = []
                for filename in os.listdir(RECEIPTS_DIR):
                    if filename.startswith('.'):
                        continue
                    name_without_ext, _ = os.path.splitext(filename)
                    if keep_samples and name_without_ext.lower() in sample_names:
                        continue
                    if name_without_ext not in active_ids:
                        target = os.path.join(RECEIPTS_DIR, filename)
                        try:
                            os.remove(target)
                            deleted.append(filename)
                            print(f"[領収書同期 クリーンアップ削除] 孤立ファイル: {filename}")
                        except Exception as sync_err:
                            print(f"[領収書同期 エラー] {sync_err}")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "deletedCount": len(deleted),
                    "deletedFiles": deleted,
                    "remainingCount": len(os.listdir(RECEIPTS_DIR))
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 商品マスタ保存API
        if self.path == '/api/master/items':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                deleted_ids = None
                items_data = payload
                if isinstance(payload, dict):
                    deleted_ids = payload.get('deletedIds')
                    items_data = payload.get('items', payload.get('list', []))
                if not isinstance(items_data, list):
                    raise ValueError("データ形式が配列ではありません")
                success, err = save_fs_collection("items", items_data, deleted_ids=deleted_ids)
                if not success:
                    raise Exception(err)
                print(f"[商品マスタ 保存成功] 件数: {len(items_data)}件 (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(items_data)}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 取引先マスタ保存API
        if self.path == '/api/master/clients':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                deleted_ids = None
                clients_data = payload
                if isinstance(payload, dict):
                    deleted_ids = payload.get('deletedIds')
                    clients_data = payload.get('clients', payload.get('list', []))
                if not isinstance(clients_data, list):
                    raise ValueError("データ形式が配列ではありません")
                success, err = save_fs_collection("clients", clients_data, deleted_ids=deleted_ids)
                if not success:
                    raise Exception(err)
                print(f"[取引先マスタ 保存成功] 件数: {len(clients_data)}件 (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(clients_data)}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 自社プロファイル・振込先情報 保存API
        if self.path == '/api/issuer':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                issuer_data = json.loads(post_data)
                success, err = save_fs_document("settings", "issuer", issuer_data)
                if not success:
                    raise Exception(err)
                print(f"[自社プロファイル 保存成功] 振込先あり: {bool(issuer_data.get('bankInfo'))} (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 勤怠打刻データ保存API
        if self.path == '/api/attendance':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                deleted_ids = None
                att_data = payload
                if isinstance(payload, dict):
                    deleted_ids = payload.get('deletedIds')
                    att_data = payload.get('attendance', payload.get('list', []))
                if not isinstance(att_data, list):
                    raise ValueError("データ形式が配列ではありません")
                success, err = save_fs_collection("attendance", att_data, deleted_ids=deleted_ids)
                if not success:
                    raise Exception(err)
                print(f"[勤怠データ 保存成功] 件数: {len(att_data)}件 (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(att_data)}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 勤怠社員情報保存API
        if self.path == '/api/attendance/employee':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                emp_data = json.loads(post_data)
                success, err = save_fs_document("settings", "attendance_employee", emp_data)
                if not success:
                    raise Exception(err)
                print(f"[勤怠社員情報 保存成功] 氏名: {emp_data.get('empName')} (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 在庫マスタ 保存API (トランザクション対応)
        if self.path == '/api/inventory':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                inv_data = json.loads(post_data)
                
                @firestore.transactional
                def update_inventory_in_transaction(transaction, incoming_data):
                    for item in incoming_data:
                        doc_id = item.get('id')
                        if doc_id:
                            doc_ref = db.collection('inventory').document(doc_id)
                            transaction.set(doc_ref, item)
                
                transaction = db.transaction()
                update_inventory_in_transaction(transaction, inv_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 在庫ロット 保存API
        if self.path == '/api/inventory-lots':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                lots_data = json.loads(post_data)
                if isinstance(lots_data, list):
                    for item in lots_data:
                        doc_id = item.get('id')
                        if doc_id:
                            db.collection('inventory_lots').document(doc_id).set(item)
                elif isinstance(lots_data, dict):
                    doc_id = lots_data.get('id')
                    if doc_id:
                        db.collection('inventory_lots').document(doc_id).set(lots_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # シリアル番号台帳 保存API
        if self.path == '/api/inventory-serials':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                serials_data = json.loads(post_data)
                if isinstance(serials_data, list):
                    for item in serials_data:
                        doc_id = item.get('id')
                        if doc_id:
                            db.collection('inventory_serials').document(doc_id).set(item)
                elif isinstance(serials_data, dict):
                    doc_id = serials_data.get('id')
                    if doc_id:
                        db.collection('inventory_serials').document(doc_id).set(serials_data)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 仕入名目マッピング辞書 保存API
        if self.path == '/api/purchase-mappings':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                mapping_data = json.loads(post_data)
                if not isinstance(mapping_data, dict):
                    raise ValueError("データ形式がオブジェクト(辞書)ではありません")
                success, err = save_fs_document("settings", "purchase_mappings", mapping_data)
                if not success:
                    raise Exception(err)
                print(f"[仕入マッピング 保存成功] キー数: {len(mapping_data)}件 (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(mapping_data)}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 給与明細レコード一覧 保存API
        if self.path == '/api/payroll/records':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                deleted_ids = None
                records = payload
                if isinstance(payload, dict):
                    deleted_ids = payload.get('deletedIds')
                    records = payload.get('records', payload.get('list', []))
                if not isinstance(records, list):
                    raise ValueError("データ形式が配列ではありません")
                success, err = save_fs_collection("payroll_records", records, deleted_ids=deleted_ids)
                if not success:
                    raise Exception(err)
                print(f"[給与明細レコード 保存成功] 件数: {len(records)}件 (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "count": len(records)}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 給与計算設定 保存API
        if self.path == '/api/payroll/settings':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                settings = json.loads(post_data)
                if not isinstance(settings, dict):
                    raise ValueError("データ形式がオブジェクトではありません")
                success, err = save_fs_document("settings", "payroll_settings", settings)
                if not success:
                    raise Exception(err)
                print(f"[給与設定 保存成功] 社員: {settings.get('empName')} (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 前年所得・明細データ保存API
        if self.path == '/api/payroll/previous-year':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                prev_data = json.loads(post_data)
                if not isinstance(prev_data, dict):
                    raise ValueError("データ形式がオブジェクトではありません")
                success, err = save_fs_document("settings", "previous_year_income", prev_data)
                if not success:
                    raise Exception(err)
                print(f"[前年所得データ 保存成功] 対象年: {prev_data.get('targetYear')}年 (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        if self.path == '/api/invoices/history':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                deleted_ids = None
                invoices = payload
                if isinstance(payload, dict):
                    deleted_ids = payload.get('deletedIds')
                    invoices = payload.get('invoices', payload.get('list', []))
                if not isinstance(invoices, list):
                    raise ValueError("データ形式が配列ではありません")
                success, err = save_fs_collection("invoices", invoices, deleted_ids=deleted_ids)
                if not success: raise Exception(err)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 削除書類 復元API
        if self.path == '/api/invoices/restore':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                doc_id = str(payload.get('id', '')).strip()
                if not doc_id: raise ValueError("復元対象の書類IDがありません")

                # 1. settings/deleted_invoices からIDを除去
                del_doc = get_fs_document('settings', 'deleted_invoices', {'ids': []})
                existing_ids = del_doc.get('ids', []) if isinstance(del_doc, dict) else []
                if doc_id in existing_ids:
                    existing_ids = [i for i in existing_ids if i != doc_id]
                    save_fs_document('settings', 'deleted_invoices', {'ids': existing_ids})

                # 2. 伝票データがあれば _deleted: False でFirestoreを復活更新
                doc_data = payload.get('doc')
                if doc_data and isinstance(doc_data, dict):
                    doc_data['_deleted'] = False
                    db.collection('invoices').document(doc_id).set(doc_data)

                print(f"[Firestore 書類復元成功] ID: {doc_id}")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "id": doc_id}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # アクティブ編集伝票 保存API
        if self.path == '/api/invoices/active':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                active_doc = json.loads(post_data) if post_data else None
                success, err = save_fs_document("settings", "active_doc", active_doc)
                if not success:
                    raise Exception(err)
                print(f"[アクティブ伝票 保存成功] (Firestore)")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        # 経費明細 保存API
        if self.path == '/api/expenses':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(post_data)
                deleted_ids = None
                expenses = payload
                if isinstance(payload, dict):
                    deleted_ids = payload.get('deletedIds')
                    expenses = payload.get('expenses', payload.get('list', []))
                if not isinstance(expenses, list):
                    raise ValueError("データ形式が配列ではありません")

                # 送信データのみをUpsert（洗い替え一括削除を廃止し、他端末の最新経費を保護）
                success, err = save_fs_collection('expenses', expenses, deleted_ids=deleted_ids)
                if not success: raise Exception(err)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if 'api.php' in parsed_url.path:
            qs = urllib.parse.parse_qs(parsed_url.query)
            if 'endpoint' in qs:
                self.path = '/api/' + qs['endpoint'][0]
                parsed_url = urllib.parse.urlparse(self.path)

        clean_path = parsed_url.path

        # APIリクエストに対する Firebase Auth トークン認証
        if clean_path.startswith('/api/'):
            user = verify_firebase_auth(self)
            if not user:
                return

        try:
            params = urllib.parse.parse_qs(parsed_url.query)
            target_id = params.get('id', [None])[0]

            path_clean = clean_path.rstrip('/')
            col_map = {
                '/api/attendance': 'attendance',
                '/api/expenses': 'expenses',
                '/api/invoices': 'invoices',
                '/api/invoices/history': 'invoices',
                '/api/master/items': 'items',
                '/api/items': 'items',
                '/api/master/clients': 'clients',
                '/api/clients': 'clients',
                '/api/inventory': 'inventory',
                '/api/inventory-lots': 'inventory_lots',
                '/api/inventory-serials': 'inventory_serials',
                '/api/payroll/records': 'payroll_records',
                '/api/payroll_records': 'payroll_records'
            }
            col_name = col_map.get(path_clean)
            if col_name and target_id:
                success, err = delete_fs_item(col_name, target_id)
                if success:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "collection": col_name, "id": target_id}).encode('utf-8'))
                else:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": err}).encode('utf-8'))
                return
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()


def open_browser():
    webbrowser.open(f'http://localhost:{PORT}')


if __name__ == '__main__':
    print("=" * 60)
    print(" Alva-works ERP - 統合業務管理サーバー起動中")
    print(f" URL: http://localhost:{PORT}")
    ai_client = get_genai_client()
    if ai_client:
        print(" [AI OCR] Vertex AI (gemini-2.5-flash) 連携: 有効 (google-genai SDK / ADC認証)")
    else:
        print(" [AI OCR] Vertex AI 連携: 未認証 (ADC認証またはgoogle-genaiのインストールが必要です)")
    print(" 終了するには Ctrl+C を押してください")
    print("=" * 60)

    if not os.environ.get('K_SERVICE'):
        threading.Timer(0.8, open_browser).start()

    try:
        socketserver.ThreadingTCPServer.allow_reuse_address = True
        with socketserver.ThreadingTCPServer(('', PORT), BillCraftHandler) as httpd:
            httpd.daemon_threads = True
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"[情報] ポート {PORT} は既に使用中です。ブラウザを開きます...")
            webbrowser.open(f'http://localhost:{PORT}')
        else:
            raise e
