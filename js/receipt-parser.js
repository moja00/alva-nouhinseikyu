/**
 * receipt-parser.js
 * レシート・領収書画像解析 ＆ 自動入力エンジン
 * 画像圧縮、OCRテキスト抽出、正規表現パターンによる日付・金額・店名・科目自動抽出
 */

function getExifOrientation(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const view = new DataView(e.target.result);
      if (view.getUint16(0, false) !== 0xFFD8) return resolve(-2);
      const length = view.byteLength;
      let offset = 2;
      while (offset < length) {
        if (view.getUint16(offset+2, false) <= 8) return resolve(-1);
        const marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xFFE1) {
          if (view.getUint32(offset += 2, false) !== 0x45786966) return resolve(-1);
          const little = view.getUint16(offset += 6, false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + (i * 12), little) === 0x0112) {
              return resolve(view.getUint16(offset + (i * 12) + 8, little));
            }
          }
        }
        else if ((marker & 0xFF00) !== 0xFF00) break;
        else offset += view.getUint16(offset, false);
      }
      return resolve(-1);
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * アップロードされた画像をブラウザCanvasで適切なサイズに圧縮（長辺1600px、JPEG 0.92）
 * EXIFによるスマホ横倒し・反転を検知し、正しい向きに補正してAPIに送信する
 * @param {File} file 画像ファイル
 * @returns {Promise<string>} Base64 DataURL
 */
export async function compressReceiptImage(file) {
  if (!file) return Promise.reject(new Error('ファイルが指定されていません'));

  let orientation = 1;
  try {
    orientation = await getExifOrientation(file);
  } catch(e) {}

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return resolve(dataUrl);
      }

      const img = new Image();
      img.onload = () => {
        try {
          const maxDimension = 1600; // OCR文字が潰れないよう1600px維持
          let width = img.width || 800;
          let height = img.height || 600;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(dataUrl);
          }

          if ([5, 6, 7, 8].includes(orientation)) {
             canvas.width = height;
             canvas.height = width;
          } else {
             canvas.width = width;
             canvas.height = height;
          }

          switch (orientation) {
            case 2: ctx.transform(-1, 0, 0, 1, width, 0); break;
            case 3: ctx.transform(-1, 0, 0, -1, width, height); break;
            case 4: ctx.transform(1, 0, 0, -1, 0, height); break;
            case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
            case 6: ctx.transform(0, 1, -1, 0, height, 0); break;
            case 7: ctx.transform(0, -1, -1, 0, height, width); break;
            case 8: ctx.transform(0, -1, 1, 0, 0, width); break;
            default: break;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          resolve(compressedDataUrl);
        } catch (err) {
          console.warn('Canvas compression error, using raw DataURL:', err);
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
}

/**
 * OCR認識率向上のための画像前処理（グレースケール・高コントラスト化）
 * 薄い感熱紙レシートや影のある画像でも、文字をクッキリ浮き彫りにする
 * @param {string} dataUrl 画像Base64
 * @returns {Promise<string>} 前処理済みBase64 DataURL
 */
export function preprocessImageForOcr(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // グレースケール変換 ＋ ガンマ・コントラスト強調
        // 感熱紙の背景グレーを白く飛ばし、薄い黒文字を濃くする
        for (let i = 0; i < data.length; i += 4) {
          // 輝度計算 (Rec. 601)
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          // コントラストストレッチ（128を中心に拡大）
          let val = (gray - 120) * 1.5 + 120;
          if (val > 240) val = 255; // 明るい背景は真っ白に
          else if (val < 70) val = 0; // 暗い文字は真っ黒に
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        console.warn('Image preprocessing failed:', e);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * 過去の経費登録履歴から「支払先 ⇔ 勘定科目」の学習辞書を作成
 * @param {Array} expenseHistory 過去の経費オブジェクト配列
 * @returns {Array<{ payee: string, category: string, count: number }>}
 */
export function buildLearnedPayeeIndex(expenseHistory = []) {
  if (!Array.isArray(expenseHistory) || expenseHistory.length === 0) {
    return [];
  }

  // 支払先ごとに集計
  const payeeMap = {};
  expenseHistory.forEach(exp => {
    const p = (exp.payee || '').trim();
    if (!p) return;
    if (!payeeMap[p]) {
      payeeMap[p] = { payee: p, counts: {}, total: 0 };
    }
    payeeMap[p].total += 1;
    const cat = exp.category || '消耗品費';
    payeeMap[p].counts[cat] = (payeeMap[p].counts[cat] || 0) + 1;
  });

  // 最も多く使われた勘定科目を紐付けて出現頻度順にソート
  return Object.values(payeeMap).map(item => {
    let topCategory = '消耗品費';
    let maxCount = -1;
    for (const [cat, cnt] of Object.entries(item.counts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        topCategory = cat;
      }
    }
    return {
      payee: item.payee,
      category: topCategory,
      count: item.total
    };
  }).sort((a, b) => b.count - a.count);
}

/**
 * レシートテキストから日付・金額・店名・勘定科目を自動抽出
 * 過去の経費履歴（学習辞書）と照合して、使えば使うほど精度が向上するハイブリッド推論
 * @param {string} rawText OCR等で得られた生テキスト
 * @param {Array} expenseHistory 過去の経費登録履歴
 * @returns {object} 解析結果 { date, amount, payee, category, taxRate, confidence, learned }
 */
export function parseReceiptText(rawText = '', expenseHistory = []) {
  const result = {
    date: '',
    amount: 0,
    payee: '',
    category: '消耗品費',
    taxRate: 10,
    invoiceNumber: '',
    rawText: rawText,
    isLearnedMatch: false
  };

  if (!rawText || !rawText.trim()) {
    result.date = new Date().toISOString().split('T')[0];
    return result;
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const normalizedRaw = rawText.replace(/[\s\t\r\n]+/g, '').toLowerCase();

  // 1. 日付の検出
  // 2020年代西暦 (例: 2026年9月25日, 2026/09/25, 2026.09.25, 2026-09-25)
  const fullYearMatch = rawText.match(/202[4-9][年\/\-.\s][0-1]?[0-9][月\/\-.\s][0-3]?[0-9]/);
  if (fullYearMatch) {
    const dStr = fullYearMatch[0].replace(/[年月]/g, '-').replace(/日/g, '').replace(/[\/.\s]/g, '-');
    const parts = dStr.split('-').filter(Boolean);
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      result.date = `${y}-${m}-${d}`;
    }
  }

  // 西暦2桁または和暦 (例: 26/09/25, R8.9.25, 令和8年9月25日)
  if (!result.date) {
    const shortYearMatch = rawText.match(/(?:R|令|令和)?\s*([6-9]|[0-9]{2})[年\/\-.][0-1]?[0-9][月\/\-.][0-3]?[0-9]/);
    if (shortYearMatch) {
      const parts = shortYearMatch[0].replace(/(?:R|令|令和)/, '').replace(/[年月]/g, '-').replace(/日/g, '').replace(/[\/.]/g, '-').split('-').filter(Boolean);
      if (parts.length === 3) {
        let y = Number(parts[0]);
        if (y < 20) y = 2018 + y; // 令和 (R1=2019, R8=2026)
        else if (y < 100) y = 2000 + y; // 26 -> 2026
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        result.date = `${y}-${m}-${d}`;
      }
    }
  }

  if (!result.date) {
    result.date = new Date().toISOString().split('T')[0];
  }

  // 2. 金額の検出
  let detectedAmount = 0;

  // A. 合計キーワード近傍からの優先検出
  const priorityPatterns = [
    /(?:合計|ご請求|お買上[げ額]?|お会計|支払金額|領収金額|合\s*計|合言十|Total|TOTAL|Amount|Cash)[\s:：]*[¥￥Y\\]?\s*([0-9,]+)/i,
    /(?:合計|ご請求|領収金額)[\s\S]{0,15}?[¥￥Y\\]\s*([0-9,]+)/i,
    /(?:小計|お預[りかり]|税込)[\s:：]*[¥￥Y\\]?\s*([0-9,]+)/i,
    /[¥￥\\]\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{2,7})/,
    /([0-9]{1,3}(?:,[0-9]{3})+)\s*(?:円|税込)?/
  ];

  for (const pattern of priorityPatterns) {
    const match = rawText.match(pattern);
    if (match && match[1]) {
      const cleanNum = Number(match[1].replace(/,/g, ''));
      if (cleanNum > 0 && cleanNum < 5000000) {
        detectedAmount = cleanNum;
        break;
      }
    }
  }

  // B. キーワードで見つからない場合、レシート中の妥当な最大数値を推定
  if (!detectedAmount) {
    const allNumbers = [];
    const numMatches = rawText.matchAll(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,7})/g);
    for (const m of numMatches) {
      const n = Number(m[1].replace(/,/g, ''));
      // 年号(2024-2027)や電話番号、郵便番号を除外
      if (n >= 100 && n <= 1000000 && n !== 2024 && n !== 2025 && n !== 2026 && n !== 2027) {
        allNumbers.push(n);
      }
    }
    if (allNumbers.length > 0) {
      detectedAmount = Math.max(...allNumbers);
    }
  }

  result.amount = detectedAmount;

  // 2.5 インボイス登録番号の検出 (T+13桁)
  let detectedInvoiceNumber = '';
  const invoiceMatch = rawText.match(/(?:登録番号|インボイス|No\.?)?[\s:：]*([tT][0-9]{13})\b/);
  if (invoiceMatch && invoiceMatch[1]) {
    detectedInvoiceNumber = invoiceMatch[1].toUpperCase();
  } else {
    const numOnlyMatch = rawText.match(/(?:登録番号|事業者番号)[\s:：]*([0-9]{13})\b/);
    if (numOnlyMatch && numOnlyMatch[1]) {
      detectedInvoiceNumber = `T${numOnlyMatch[1]}`;
    }
  }
  result.invoiceNumber = detectedInvoiceNumber;

  // 3. 【最優先】過去の登録履歴（学習辞書）とのマッチング
  // ユーザーが一度登録した支払先と勘定科目を最優先で自動特定（使えば使うほど精度が向上！）
  const learnedList = buildLearnedPayeeIndex(expenseHistory);
  for (const item of learnedList) {
    const pName = item.payee.trim();
    if (!pName || pName.length < 2) continue;
    const cleanP = pName.replace(/[\s\t\r\n\(\)（）株式会社有限会社]/g, '').toLowerCase();

    // OCR生テキストまたは正規化テキストに過去の店名が含まれているか判定
    if (cleanP.length >= 2 && (normalizedRaw.includes(cleanP) || rawText.includes(pName))) {
      result.payee = item.payee;
      result.category = item.category;
      result.isLearnedMatch = true;
      break;
    }
  }

  // 4. 定番チェーン店・主要サービスのパターンマッチング（学習辞書で見つからない場合のフォールバック）
  if (!result.payee) {
    const KNOWN_MERCHANTS = [
      { pattern: /セブン[\-ー]?イレブン|7[\-ー]?eleven/i, name: 'セブン-イレブン', category: '消耗品費' },
      { pattern: /ローソン|lawson/i, name: 'ローソン', category: '消耗品費' },
      { pattern: /ファミリーマート|ファミマ|family[\s\-]?mart/i, name: 'ファミリーマート', category: '消耗品費' },
      { pattern: /ミニストップ|ministop/i, name: 'ミニストップ', category: '消耗品費' },
      { pattern: /出光|idemitsu|アポロステーション|apollostation/i, name: '出光興産', category: '旅費交通費' },
      { pattern: /eneos|エネオス/i, name: 'ENEOS', category: '旅費交通費' },
      { pattern: /コスモ石油|cosmo/i, name: 'コスモ石油', category: '旅費交通費' },
      { pattern: /キグナス|kygnus/i, name: 'キグナス石油', category: '旅費交通費' },
      { pattern: /タクシー|taxi|交通|日本交通|kmタクシー|第一交通/i, name: 'タクシー代', category: '旅費交通費' },
      { pattern: /jr[東日本|西日本|東海|九州|北海道]?|東日本旅客鉄道|西日本旅客鉄道/i, name: 'JR乗車券・特急券', category: '旅費交通費' },
      { pattern: /東京メトロ|地下鉄|私鉄/i, name: '地下鉄・私鉄電車代', category: '旅費交通費' },
      { pattern: /タイムズ|times|三井のリパーク|コインパーキング|駐車場/i, name: '駐車場代（パーキング）', category: '旅費交通費' },
      { pattern: /高速道路|nexco|首都高|阪神高速|etc/i, name: '高速道路料金', category: '車両費' },
      { pattern: /アスクル|askul/i, name: 'アスクル', category: '消耗品費' },
      { pattern: /amazon|アマゾン/i, name: 'Amazon', category: '消耗品費' },
      { pattern: /モノタロウ|monotaro/i, name: 'モノタロウ', category: '消耗品費' },
      { pattern: /ヨドバシ|yodobashi/i, name: 'ヨドバシカメラ', category: '消耗品費' },
      { pattern: /ビックカメラ|bic\s*camera/i, name: 'ビックカメラ', category: '消耗品費' },
      { pattern: /ダイソー|daiso|セリア|seria|キャンドゥ/i, name: '100円均一ショップ', category: '消耗品費' },
      { pattern: /カインズ|cainz|コーナン|コメリ|ビバホーム|ジョイフル本田|ロイヤルホームセンター/i, name: 'ホームセンター資材・備品', category: '消耗品費' },
      { pattern: /スターバックス|starbucks|スタバ/i, name: 'スターバックス', category: '接待交際費' },
      { pattern: /ドトール|doutor|タリーズ|コメダ珈琲|ベローチェ/i, name: 'カフェ・喫茶代', category: '接待交際費' },
      { pattern: /マクドナルド|ガスト|サイゼリヤ|すき家|吉野家|松屋|大戸屋|やよい軒/i, name: '飲食・会食代', category: '接待交際費' },
      { pattern: /日本郵便|郵便局|ゆうパック|レターパック/i, name: '郵便局', category: '通信費' },
      { pattern: /ヤマト運輸|クロネコヤマト|佐川急便/i, name: '宅配便・運送代', category: '通信費' }
    ];

    for (const m of KNOWN_MERCHANTS) {
      if (m.pattern.test(rawText)) {
        result.payee = m.name;
        result.category = m.category;
        break;
      }
    }
  }

  // 5. 特定店名に一致しない場合、レシートの先頭数行から店名を推定
  if (!result.payee && lines.length > 0) {
    for (let i = 0; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      if (!/^\d{2,4}-\d{2,4}-\d{4}/.test(line) &&
        !/^\d{4}[\/\-.]/.test(line) &&
        !/^(領収書|レシート|RECEIPT|お会計|取扱|登録番号|インボイス|No\.|TEL|電話)/i.test(line)) {
        if (line.length >= 2 && line.length <= 25) {
          result.payee = line;
          break;
        }
      }
    }
  }

  // 6. 勘定科目の自動推定（店名で未定の場合のテキスト全体スキャン）
  if (result.category === '消耗品費') {
    const lowerText = rawText.toLowerCase();
    if (/ガソリン|給油|軽油|レギュラー|ハイオク|駐車|パーキング|電車|切符|運賃|バス|suica|pasmo|icoca/.test(lowerText)) {
      result.category = '旅費交通費';
    } else if (/高速|etc|車検|オイル交換|タイヤ|洗車/.test(lowerText)) {
      result.category = '車両費';
    } else if (/ntt|kddi|ソフトバンク|docomo|ドコモ|郵便|切手|ヤマト|佐川|インターネット|wifi|プロバイダ/.test(lowerText)) {
      result.category = '通信費';
    } else if (/居酒屋|会食|料理|酒|ビール|寿司|焼肉|レストラン|カフェ|宴会/.test(lowerText)) {
      result.category = '接待交際費';
    } else if (/仕入|卸|材料|原材料|パーツ|部品|木材|鋼材|建材/.test(lowerText)) {
      result.category = '仕入高';
    } else if (/書籍|専門書|雑誌|新聞|講読/.test(lowerText)) {
      result.category = '新聞図書費';
    } else if (/電気代|水道代|ガス代|東京電力|関西電力|東京ガス/.test(lowerText)) {
      result.category = '水道光熱費';
    }
  }

  // 7. 軽減税率（8%）判定
  if (/軽減|軽\s*[8８]%|飲食料品|テイクアウト|お持ち帰り/.test(rawText)) {
    result.taxRate = 8;
  }

  return result;
}

/**
 * 画像からテキスト認識（Tesseract.js / TextDetector / スマートフォールバック）
 * @param {string|File} dataUrlOrFile 画像Base64 または File
 * @param {Function} onProgress 進捗コールバック
 * @param {Array} expenseHistory 過去の経費登録履歴（使えば使うほど精度が向上する学習辞書）
 * @returns {Promise<object>} 解析結果
 */
export async function analyzeReceiptImage(dataUrlOrFile, onProgress = null, expenseHistory = []) {
  let dataUrl = dataUrlOrFile;
  let fileName = '';

  if (dataUrlOrFile instanceof Blob || (dataUrlOrFile && typeof dataUrlOrFile === 'object' && dataUrlOrFile.name)) {
    fileName = dataUrlOrFile.name || '';
    try {
      dataUrl = await compressReceiptImage(dataUrlOrFile);
    } catch (_) {
      dataUrl = '';
    }
  }

  // ========================================================================
  // 0. ローカルサーバー経由の Gemini 2.5 Flash Vision OCR（超高精度・最優先）
  // コードにはAPIキーを一切書かず、ローカルサーバー（.env）経由で安全に通信
  // ========================================================================
  if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') && dataUrl) {
    try {
      if (onProgress) onProgress('✨ Google Gemini AIで超高精度解析中...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const fetchFn = (typeof window !== 'undefined' && window.apiFetch) ? window.apiFetch : fetch;
      const res = await fetchFn('ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, fileName }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Gemini OCR API failed with status:', res.status, errorText);
        if (typeof showToast === 'function') showToast('⚠️ AI解析失敗: ' + (errorText.substring(0, 50)), 'error');
        throw new Error('API returns ' + res.status);
      }

      if (res.ok) {
        const geminiResult = await res.json();
        if (geminiResult && !geminiResult.error && (geminiResult.amount || geminiResult.payee)) {
          return {
            date: geminiResult.date || new Date().toISOString().split('T')[0],
            amount: Number(geminiResult.amount) || 0,
            payee: geminiResult.payee || '',
            category: geminiResult.category || '消耗品費',
            taxRate: Number(geminiResult.taxRate) || 10,
            invoiceNumber: geminiResult.invoiceNumber || '',
            note: geminiResult.note || '',
            engine: geminiResult.engine || 'gemini-flash',
            receiptDataUrl: typeof dataUrl === 'string' ? dataUrl : ''
          };
        } else if (geminiResult && geminiResult.error) {
          console.warn('Gemini API returned error:', geminiResult.error);
          if (typeof window !== 'undefined') {
            window.lastGeminiError = geminiResult.error;
          }
        }
      }
    } catch (e) {
      console.log('Gemini API Error:', e);
      // Gemini APIの明確なエラー(500, 400等)が返ってきた場合は、勝手にローカルOCRへ進まずここで処理を中断する。
      // これにより、ユーザーはトーストでエラー内容を確認できる。
      if (e.message && e.message.includes('API returns')) {
        if (onProgress) onProgress('❌ 解析失敗 (APIエラー)');
        return null; // 中断
      }
      console.log('Gemini API proxy unavailable, falling back to local OCR engine');
    }
  }

  // ========================================================================
  // ローカルOCRパイプライン（Tesseract.js + 学習辞書フォールバック）
  // ========================================================================
  let ocrInputUrl = dataUrl;
  try {
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      ocrInputUrl = await preprocessImageForOcr(dataUrl);
    }
  } catch (e) {
    ocrInputUrl = dataUrl;
  }

  let extractedRawText = '';

  // 1. ブラウザネイティブの TextDetector API（最速）
  if (typeof window !== 'undefined' && 'TextDetector' in window && typeof ocrInputUrl === 'string' && ocrInputUrl.startsWith('data:')) {
    try {
      if (onProgress) onProgress('ネイティブOCRで解析中...');
      const detector = new window.TextDetector();
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = ocrInputUrl;
      });
      const detectedTexts = await detector.detect(img);
      extractedRawText = detectedTexts.map(t => t.rawValue).join('\n');
    } catch (e) {
      console.warn('TextDetector failed, trying next method:', e);
    }
  }

  // 2. Tesseract.js（ブラウザ内Wasm OCRエンジン）
  if (!extractedRawText && typeof window !== 'undefined' && window.Tesseract && typeof ocrInputUrl === 'string' && ocrInputUrl.startsWith('data:')) {
    try {
      if (onProgress) onProgress('AI文字認識エンジンで解析中...');
      const ocrPromise = (async () => {
        const ret = await window.Tesseract.recognize(ocrInputUrl, 'eng+jpn', {
          logger: m => {
            if (onProgress && m.status === 'recognizing text' && m.progress) {
              onProgress(`文字認識中... ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        return ret?.data?.text || '';
      })();

      // 最大10秒でタイムアウトして安全にフォールバック
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(''), 10000));
      extractedRawText = await Promise.race([ocrPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Tesseract OCR error:', err);
    }
  }

  // 3. テキストからレシート情報を抽出（過去の登録履歴から自動学習）
  const parsed = parseReceiptText(extractedRawText, expenseHistory);
  parsed.receiptDataUrl = typeof dataUrl === 'string' ? dataUrl : '';

  // 4. ファイル名からのスマート補完（OCRで漏れた場合の補助）
  if (fileName) {
    const fnDate = fileName.match(/202[4-9][\-_]?[0-1][0-9][\-_]?[0-3][0-9]/);
    if (fnDate && (!parsed.date || parsed.date === new Date().toISOString().split('T')[0])) {
      const clean = fnDate[0].replace(/[\-_]/g, '');
      parsed.date = `${clean.substr(0, 4)}-${clean.substr(4, 2)}-${clean.substr(6, 2)}`;
    }
    const fnAmount = fileName.match(/([0-9]{2,7})(?:円|yen)/i);
    if (fnAmount && (!parsed.amount || parsed.amount === 0)) {
      parsed.amount = Number(fnAmount[1]);
    }
    const fnPayee = fileName.match(/(セブン|ローソン|ファミマ|出光|eneos|jr|アスクル|amazon|ビックカメラ|ヨドバシ|タクシー)/i);
    if (fnPayee && !parsed.payee) {
      parsed.payee = fnPayee[0];
    }
  }

  return parsed;
}
