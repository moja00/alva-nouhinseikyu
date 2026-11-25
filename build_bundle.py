#!/usr/bin/env python3
import re

def clean_code(content):
    # 1. 複数行 import の削除
    content = re.sub(r'import\s+[\s\S]*?from\s+[\'"][^\'"]+[\'"];?', '', content)
    # 2. 単一行 import の削除
    content = re.sub(r'import\s+[^;]+;', '', content)
    # 3. export { ... }; の削除
    content = re.sub(r'export\s*\{[\s\S]*?\};?', '', content)
    # 4. export default / export const / export function の export 除去
    content = re.sub(r'^\s*export\s+(default\s+)?', '', content, flags=re.MULTILINE)
    return content.strip()

with open('js/sample-data.js', 'r', encoding='utf-8') as f:
    sample_data_code = clean_code(f.read())

with open('js/stamp-generator.js', 'r', encoding='utf-8') as f:
    stamp_generator_code = clean_code(f.read())

with open('js/invoice-state.js', 'r', encoding='utf-8') as f:
    invoice_state_code = clean_code(f.read())

with open('js/accounting-state.js', 'r', encoding='utf-8') as f:
    accounting_state_code = clean_code(f.read())

with open('js/attendance-state.js', 'r', encoding='utf-8') as f:
    attendance_state_code = clean_code(f.read())

with open('js/payroll-state.js', 'r', encoding='utf-8') as f:
    payroll_state_code = clean_code(f.read())

with open('js/receipt-parser.js', 'r', encoding='utf-8') as f:
    receipt_parser_code = clean_code(f.read())

with open('js/storage.js', 'r', encoding='utf-8') as f:
    storage_code = clean_code(f.read())

with open('js/analytics-engine.js', 'r', encoding='utf-8') as f:
    analytics_engine_code = clean_code(f.read())

with open('js/app.js', 'r', encoding='utf-8') as f:
    app_code = clean_code(f.read())

with open('js/analytics-views.js', 'r', encoding='utf-8') as f:
    analytics_views_code = clean_code(f.read())

bundle_content = f"""/**
 * app.bundle.js
 * BillCraft ERP - 納品・請求 ＋ 財務会計・入金消込・経費OCR・勤怠管理（タイムカード）
 * 外部依存なし・単体動作保証（file:// 直開き & http:// サーバー両対応）
 */

(function () {{
  'use strict';

  // ==========================================================================
  // 定数・サンプルデータ
  // ==========================================================================
{sample_data_code}

  // ==========================================================================
  // 電子印鑑（角印）ジェネレーター
  // ==========================================================================
{stamp_generator_code}

  // ==========================================================================
  // 請求計算・状態管理ロジック
  // ==========================================================================
{invoice_state_code}

  // ==========================================================================
  // 財務会計・損益計算・自動仕訳ロジック
  // ==========================================================================
{accounting_state_code}

  // ==========================================================================
  // 勤怠管理・タイムカード（休憩1時間自動控除）ロジック
  // ==========================================================================
{attendance_state_code}

  // ==========================================================================
  // 給与計算（月給制・社保・所得税・支給控除）ロジック
  // ==========================================================================
{payroll_state_code}

  // ==========================================================================
  // レシート・領収書画像解析エンジン
  // ==========================================================================
{receipt_parser_code}

  // ==========================================================================
  // ストレージ管理（商品マスタ・経費・勤怠・入金管理）
  // ==========================================================================
{storage_code}

  // ==========================================================================
  // 経営分析コアエンジン（ロット別原価・取引先/地域/出張統合分析）
  // ==========================================================================
{analytics_engine_code}

  // ==========================================================================
  // アプリケーションUI制御ロジック
  // ==========================================================================
{app_code}

  // ==========================================================================
  // 経営分析UIビュー（ロット別原価・出張/地域/取引先統合分析）
  // ==========================================================================
{analytics_views_code}

}})();
"""

with open('js/app.bundle.js', 'w', encoding='utf-8') as f:
    f.write(bundle_content)

print("app.bundle.js generated successfully with stamp-generator included.")
