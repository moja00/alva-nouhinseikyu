/**
 * app.bundle.js
 * BillCraft ERP - 納品・請求 ＋ 財務会計・入金消込・経費OCR・勤怠管理（タイムカード）
 * 外部依存なし・単体動作保証（file:// 直開き & http:// サーバー両対応）
 */

(function () {
  'use strict';

  // ==========================================================================
  // 定数・サンプルデータ
  // ==========================================================================
/**
 * sample-data.js
 * 動作確認用および初期状態用のリアルな日本語ビジネスサンプルデータ
 */
const SAMPLE_DOCUMENTS = {
  invoice: {
    id: 'sample_inv_001',
    docType: 'invoice',
    docNumber: 'INV-202609-082',
    issueDate: '2026-09-15',
    dueDate: '2026-10-31',
    title: 'コーポレートサイトリニューアル及び運用保守（8月分）',
    client: {
      name: 'アークス・テクノロジー株式会社',
      honorific: '御中',
      zip: '107-0062',
      address: '東京都港区南青山3-5-1 青山タワープレイス 12F',
      contactPerson: 'デジタル推進部 田中 健一 様'
    },
    issuer: {
      name: 'スタジオ・ネクサス合同会社',
      invoiceNumber: 'T9012345678901',
      zip: '150-0043',
      address: '東京都渋谷区道玄坂1丁目20-8 渋谷インフォスタワー 7F',
      tel: '03-6800-9988',
      fax: '',
      email: 'billing@nexus-studio.example.com',
      bankInfo: '三菱UFJ銀行 渋谷支店 (店番: 135)\n普通預金 0987654\n口座名義: ド）スタジオネクサス',
      stampDataUrl: '',
      showStamp: true
    },
    items: [
      {
        id: 'sample_item_1',
        name: 'Webサイトリニューアル UI/UX設計・Figmaデザイン作成',
        quantity: 1,
        unit: '式',
        unitPrice: 350000,
        taxRate: 10,
        note: '第1期フェーズ'
      },
      {
        id: 'sample_item_2',
        name: 'フロントエンド実装・レスポンシブWebコーディング',
        quantity: 1,
        unit: '式',
        unitPrice: 280000,
        taxRate: 10,
        note: 'HTML5/Tailwind/JS'
      },
      {
        id: 'sample_item_3',
        name: 'CMS（WordPress/Headless）導入・管理画面カスタマイズ',
        quantity: 1,
        unit: '式',
        unitPrice: 180000,
        taxRate: 10,
        note: 'カスタム投稿3種'
      },
      {
        id: 'sample_item_4',
        name: '月額クラウドサーバー運用保守（2026年9月度）',
        quantity: 1,
        unit: '月',
        unitPrice: 40000,
        taxRate: 10,
        note: '24時間監視含む'
      },
      {
        id: 'sample_item_5',
        name: 'プロジェクト管理用資材・リファレンス書籍（軽減税率対象）',
        quantity: 2,
        unit: '冊',
        unitPrice: 4200,
        taxRate: 8,
        note: '公式ガイド本'
      }
    ],
    taxFractionRule: 'floor',
    notes: '・お振込手数料は貴社にてご負担いただけますようお願い申し上げます。\n・ご請求内容に関するご質問やお支払期日のご相談は、担当（support@nexus-studio.example.com）までご連絡ください。',
    themeColor: 'indigo'
  },
  delivery: {
    id: 'sample_del_001',
    docType: 'delivery',
    docNumber: 'DEL-202609-015',
    issueDate: '2026-09-15',
    dueDate: '2026-09-22',
    title: 'オフィス備品およびPC周辺機器の納品',
    client: {
      name: 'グローバル・イノベーション株式会社',
      honorific: '御中',
      zip: '100-0005',
      address: '東京都千代田区丸の内1-2-1 丸の内ビルディング 18F',
      contactPerson: '総務部 佐藤 翔太 様'
    },
    issuer: {
      name: 'スタジオ・ネクサス合同会社',
      invoiceNumber: 'T9012345678901',
      zip: '150-0043',
      address: '東京都渋谷区道玄坂1丁目20-8 渋谷インフォスタワー 7F',
      tel: '03-6800-9988',
      fax: '',
      email: 'billing@nexus-studio.example.com',
      bankInfo: '',
      stampDataUrl: '',
      showStamp: true
    },
    items: [
      {
        id: 'del_item_1',
        name: '27インチ 4Kモニター（USB-C給電対応）',
        quantity: 5,
        unit: '台',
        unitPrice: 48000,
        taxRate: 10,
        note: '型番: MON-4K-27'
      },
      {
        id: 'del_item_2',
        name: 'エルゴノミック メッシュチェア（ハイバック）',
        quantity: 5,
        unit: '脚',
        unitPrice: 62000,
        taxRate: 10,
        note: 'ブラック / 肘掛付'
      },
      {
        id: 'del_item_3',
        name: '来客用ドリップコーヒー＆緑茶セット（軽減税率対象）',
        quantity: 4,
        unit: '箱',
        unitPrice: 3800,
        taxRate: 8,
        note: '賞味期限: 12ヶ月'
      }
    ],
    taxFractionRule: 'floor',
    notes: '・納品物をご確認の上、受領印をいただけますようお願い申し上げます。\n・初期不良等の交換対応は納品日より14日以内にご連絡ください。',
    themeColor: 'emerald'
  }
};

  // ==========================================================================
  // 電子印鑑（角印）ジェネレーター
  // ==========================================================================
/**
 * stamp-generator.js
 * Canvasを使用した本格的な電子角印（社印）の自動描画ジェネレーター
 */

/**
 * 社名・屋号から本格的な角印スタンプ画像を生成する
 * @param {string} companyName 会社名・屋号
 * @param {object} options オプション（サイズ、色、之印付与など）
 * @returns {string} Base64 DataURL (image/png)
 */
function generateCompanyStamp(companyName = '', options = {}) {
  const size = options.size || 240;
  const color = options.color || '#dc2626'; // 朱色
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  let rawName = companyName.trim() || '社印';
  // 余計な「株式会社」「有限会社」「合同会社」等を取り除くか、整える
  // 例: 「株式会社クラフト」->「株式会社」「クラフト之印」のように配置
  // 角印らしく末尾に「之印」または「印」を補う
  let text = rawName;
  if (!text.endsWith('之印') && !text.endsWith('印')) {
    text = text + '之印';
  }

  // 枠線の描画（伝統的な角丸二重枠）
  const padding = size * 0.08;
  const outerSize = size - padding * 2;
  const radius = size * 0.08;

  ctx.save();
  // 外枠
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.038;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  drawRoundedRect(ctx, padding, padding, outerSize, outerSize, radius);
  ctx.stroke();

  // 内枠（二重線）
  const innerPad = padding + size * 0.024;
  const innerSize = outerSize - size * 0.048;
  ctx.lineWidth = size * 0.012;
  drawRoundedRect(ctx, innerPad, innerPad, innerSize, innerSize, radius * 0.7);
  ctx.stroke();

  // 縦書き文字の配置
  // 日本の角印は通常、右列から左列へと縦書きで配置されます（例: 2列または3列）
  const chars = Array.from(text);
  const totalChars = chars.length;

  // 列数を決定（文字数に応じて2列〜4列）
  let colCount = 2;
  if (totalChars > 12) {
    colCount = 4;
  } else if (totalChars > 6) {
    colCount = 3;
  }

  const charsPerCol = Math.ceil(totalChars / colCount);
  const columns = [];
  for (let i = 0; i < colCount; i++) {
    const colChars = chars.slice(i * charsPerCol, (i + 1) * charsPerCol);
    if (colChars.length > 0) {
      columns.push(colChars);
    }
  }

  // 伝統的に右から左へ読むため、配列を反転して右側から描画
  const renderColumns = [...columns].reverse();

  // フォント設定（行書体・明朝体・セリフ体など古典的な重厚感）
  const fontSize = Math.floor(innerSize / (charsPerCol * 1.18));
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${fontSize}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`;

  const colWidth = innerSize / renderColumns.length;

  renderColumns.forEach((col, cIdx) => {
    const x = innerPad + cIdx * colWidth + colWidth / 2;
    const rowHeight = innerSize / col.length;

    col.forEach((char, rIdx) => {
      const y = innerPad + rIdx * rowHeight + rowHeight / 2;
      ctx.fillText(char, x, y);
    });
  });

  // わずかなリアルさ（手押し感）のノイズ・インク擦れを付加
  addInkTexture(ctx, size, color);

  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * 角丸四角形パスを描画
 */
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * インク擦れ・アナログ感を表現する微小なノイズ
 */
function addInkTexture(ctx, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  // わずかにランダムな小さな斑点
  for (let i = 0; i < 35; i++) {
    const nx = size * 0.1 + Math.random() * (size * 0.8);
    const ny = size * 0.1 + Math.random() * (size * 0.8);
    const nr = Math.random() * 1.2;
    ctx.globalAlpha = 0.12 + Math.random() * 0.15;
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

  // ==========================================================================
  // 請求計算・状態管理ロジック
  // ==========================================================================
/**
 * invoice-state.js
 * 帳票データ構造、インボイス制度準拠の税金計算、フォーマットユーティリティ
 */
const DOC_TYPES = {
  invoice: {
    key: 'invoice',
    label: '請求書',
    badge: '御請求書',
    prefix: 'INV-',
    dateLabel: '請求日',
    dueLabel: 'お支払期日',
    amountLabel: '御請求金額'
  },
  delivery: {
    key: 'delivery',
    label: '納品書',
    badge: '納品書',
    prefix: 'DEL-',
    dateLabel: '納品日',
    dueLabel: '受領期日',
    amountLabel: '合計金額'
  },
  estimate: {
    key: 'estimate',
    label: '見積書',
    badge: '御見積書',
    prefix: 'EST-',
    dateLabel: '見積日',
    dueLabel: '有効期限',
    amountLabel: '御見積金額'
  },
  receipt: {
    key: 'receipt',
    label: '領収書',
    badge: '領収証',
    prefix: 'REC-',
    dateLabel: '領収日',
    dueLabel: '但し書き',
    amountLabel: '領収金額'
  }
};
const THEME_COLORS = {
  indigo: {
    name: 'モダンインディゴ',
    primary: '#3b5bdb',
    primaryLight: '#eef2ff',
    primaryDark: '#2b44af',
    accent: '#4c6ef5'
  },
  navy: {
    name: 'クラシックネイビー',
    primary: '#1e293b',
    primaryLight: '#f1f5f9',
    primaryDark: '#0f172a',
    accent: '#334155'
  },
  emerald: {
    name: 'フォレストエメラルド',
    primary: '#0f766e',
    primaryLight: '#f0fdfa',
    primaryDark: '#115e59',
    accent: '#14b8a6'
  },
  crimson: {
    name: 'ディープワイン',
    primary: '#881337',
    primaryLight: '#fff1f2',
    primaryDark: '#4c0519',
    accent: '#e11d48'
  },
  slate: {
    name: 'スレートチャコール',
    primary: '#374151',
    primaryLight: '#f3f4f6',
    primaryDark: '#1f2937',
    accent: '#4b5563'
  }
};

/**
 * 書類番号を自動生成（例: INV-20260915-001）
 */
function generateDocNumber(docType = 'invoice') {
  const prefix = DOC_TYPES[docType]?.prefix || 'DOC-';
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(100 + Math.random() * 900));
  return `${prefix}${y}${m}${d}-${rand}`;
}

/**
 * 日付のデフォルト値（本日、30日後）
 */
function getDefaultDates() {
  const now = new Date();
  const issue = now.toISOString().split('T')[0];

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const due = nextMonth.toISOString().split('T')[0];

  return { issue, due };
}

/**
 * 初期帳票データモデル作成
 */
function createEmptyInvoice(docType = 'invoice') {
  const dates = getDefaultDates();
  return {
    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    docType: docType,
    docNumber: generateDocNumber(docType),
    issueDate: dates.issue,
    dueDate: dates.due,
    title: '', // 件名は空白
    client: {
      name: '', // 取引先名は空白
      honorific: '御中',
      zip: '',
      address: '',
      contactPerson: ''
    },
    issuer: {
      name: '株式会社アルバワークス',
      invoiceNumber: 'T2070001004966',
      zip: '379-2144',
      address: '群馬県前橋市下川町63-7',
      tel: '027-289-0367',
      fax: '027-289-0368',
      email: '',
      bankInfo: '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス',
      stampDataUrl: '',
      showStamp: true
    },
    items: [], // 明細は空白
    taxFractionRule: 'floor', // 'floor' | 'round' | 'ceil'
    notes: 'お振込手数料は貴社にてご負担くださいますようお願い申し上げます。\nご不明な点がございましたらお気軽にお問い合わせください。',
    themeColor: 'indigo',
    isIssued: false,
    isCancelled: false,
    issuedAt: null,
    updatedAt: new Date().toISOString()
  };
}

/**
 * インボイス制度対応の税金・小計計算
 * 日本の適格請求書等保存方式のルール:
 * 「税率ごとに合算した税抜合計額に対して、消費税率を乗じて端数処理を行う」
 */
function calculateTotals(items = [], fractionRule = 'floor') {
  let subtotal10 = 0;
  let subtotal8 = 0;
  let subtotal0 = 0;

  items.forEach(item => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const lineTotal = Math.round(qty * price);
    const rate = Number(item.taxRate);

    if (rate === 10) {
      subtotal10 += lineTotal;
    } else if (rate === 8) {
      subtotal8 += lineTotal;
    } else {
      subtotal0 += lineTotal;
    }
  });

  const roundFn = (val) => {
    if (fractionRule === 'ceil') return Math.ceil(val);
    if (fractionRule === 'round') return Math.round(val);
    return Math.floor(val); // default floor
  };

  const tax10 = roundFn(subtotal10 * 0.10);
  const tax8 = roundFn(subtotal8 * 0.08);
  const taxTotal = tax10 + tax8;

  const subtotalWithoutTax = subtotal10 + subtotal8 + subtotal0;
  const grandTotal = subtotalWithoutTax + taxTotal;

  return {
    subtotal10,
    tax10,
    subtotal8,
    tax8,
    subtotal0,
    subtotalWithoutTax,
    taxTotal,
    grandTotal
  };
}

/**
 * 販売店仕切り価格の自動計算
 * 条件1: 販売店利益 ＝ 税込み仕切り価格 × 20%
 * 条件2: 税抜きユーザー価格 ＝ 税抜き仕切り価格 ＋ 販売店利益
 * 
 * 連立方程式:
 *   税抜きユーザー価格 ＝ (税込み仕切り価格 ÷ (1 + 税率)) ＋ (税込み仕切り価格 × 0.20)
 *   税抜きユーザー価格 ＝ 税込み仕切り価格 × ( (1 ÷ (1 + 税率)) ＋ 0.20 )
 *   したがって:
 *   税込み仕切り価格 ＝ 税抜きユーザー価格 ÷ ( (1 ÷ (1 + 税率)) ＋ 0.20 )
 *   ＝ ユーザー税込価格 ÷ ( 1 ＋ 0.20 × (1 + 税率) )
 * 
 * @param {number} userPriceInc ユーザー税込価格
 * @param {number} taxRate 消費税率 (10 | 8 | 0)
 * @param {object} discount 割引き設定 { type: 'none'|'percent'|'amount', value: number, reason: string }
 * @returns {object} 計算結果詳細
 */
function calculateWholesalePrice(userPriceInc = 0, taxRate = 10, discount = { type: 'none', value: 0, reason: '' }) {
  const baseInc = Math.max(0, Number(userPriceInc) || 0);
  const rateMultiplier = 1 + (Number(taxRate) || 0) / 100;

  // 1. ユーザー価格に対する割引き計算
  let discountAmountInc = 0;
  if (discount.type === 'percent' && discount.value > 0) {
    discountAmountInc = Math.round(baseInc * (Math.min(100, Math.max(0, Number(discount.value))) / 100));
  } else if (discount.type === 'amount' && discount.value > 0) {
    discountAmountInc = Math.min(baseInc, Math.round(Number(discount.value)));
  }

  // 割引き後のユーザー税込価格
  const finalUserPriceInc = Math.max(0, baseInc - discountAmountInc);

  // 2. 税抜きユーザー価格
  const finalUserPriceEx = Math.round(finalUserPriceInc / rateMultiplier);

  // 3. 税込み仕切り価格の逆算
  // 式: 税抜きユーザー価格 = 税抜き仕切り + 利益 = W_inc / rateMultiplier + 0.20 * W_inc
  const denominator = (1 / rateMultiplier) + 0.20;
  const wholesalePriceInc = finalUserPriceEx > 0 ? Math.round(finalUserPriceEx / denominator) : 0;

  // 4. 販売店利益（税込み仕切り価格の20%）
  const retailerProfit = Math.round(wholesalePriceInc * 0.20);

  // 5. 帳票の税抜き仕切り単価（税抜きユーザー価格 − 販売店利益）
  // これにより「税抜き仕切り ＋ 販売店利益 ＝ 税抜きユーザー」が端数も含めて1円の狂いなく成立
  const wholesaleUnitPriceEx = Math.max(0, finalUserPriceEx - retailerProfit);

  // 参考: 割引き前の仕切り単価
  const baseUserPriceEx = Math.round(baseInc / rateMultiplier);
  const baseWholesalePriceInc = baseUserPriceEx > 0 ? Math.round(baseUserPriceEx / denominator) : 0;
  const baseRetailerProfit = Math.round(baseWholesalePriceInc * 0.20);
  const baseWholesaleUnitPriceEx = Math.max(0, baseUserPriceEx - baseRetailerProfit);
  const discountWholesaleAmountEx = Math.max(0, baseWholesaleUnitPriceEx - wholesaleUnitPriceEx);

  return {
    baseUserPriceInc: baseInc,
    discountAmountInc,
    finalUserPriceInc,
    finalUserPriceEx,
    wholesalePriceInc,
    wholesaleUnitPriceEx,
    wholesaleUnitPrice: wholesaleUnitPriceEx,
    retailerProfit,
    profit: retailerProfit,
    baseWholesaleUnitPriceEx,
    discountWholesaleAmountEx,
    discountReason: discount.reason || ''
  };
}

/**
 * 通貨フォーマット (¥1,234,567 / -¥5,000)
 */
function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num < 0) {
    return '-¥' + Math.abs(num).toLocaleString('ja-JP');
  }
  return '¥' + num.toLocaleString('ja-JP');
}

/**
 * 日本語日付フォーマット (2026年9月15日)
 */
function formatJapaneseDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`;
  }
  return dateStr;
}

  // ==========================================================================
  // 財務会計・損益計算・自動仕訳ロジック
  // ==========================================================================
/**
 * accounting-state.js
 * 財務会計・損益計算・自動仕訳・税理士用CSV出力エンジン
 */

// 標準的な日本の青色申告・法人勘定科目リスト
const ACCOUNT_CATEGORIES = [
  { code: '501', name: '仕入高', group: 'cost', taxType: 'taxable', description: '商品・原材料の仕入れ' },
  { code: '502', name: '外注加工費', group: 'cost', taxType: 'taxable', description: '外部委託・加工・業務委託費' },
  { code: '601', name: '旅費交通費', group: 'expense', taxType: 'taxable', description: '電車、タクシー、ガソリン、宿泊費' },
  { code: '602', name: '通信費', group: 'expense', taxType: 'taxable', description: '携帯電話、インターネット、切手・郵送' },
  { code: '603', name: '消耗品費', group: 'expense', taxType: 'taxable', description: '文具、事務用品、10万円未満の備品' },
  { code: '604', name: '接待交際費', group: 'expense', taxType: 'taxable', description: '取引先との飲食、慶弔見舞金、贈答品' },
  { code: '605', name: '地代家賃', group: 'expense', taxType: 'exempt', description: '事務所・店舗・駐車場代' },
  { code: '606', name: '水道光熱費', group: 'expense', taxType: 'taxable', description: '電気、ガス、水道料金' },
  { code: '607', name: '支払手数料', group: 'expense', taxType: 'taxable', description: '振込手数料、各種決済・仲介手数料' },
  { code: '608', name: '車両費', group: 'expense', taxType: 'taxable', description: '社用車の車検、保険、整備、高速代' },
  { code: '609', name: '広告宣伝費', group: 'expense', taxType: 'taxable', description: 'WEB広告、チラシ、看板、名刺作成' },
  { code: '610', name: '新聞図書費', group: 'expense', taxType: 'taxable', description: '書籍、新聞、専門誌、情報サービス' },
  { code: '611', name: '福利厚生費', group: 'expense', taxType: 'taxable', description: '従業員の健康診断、慶弔費、飲料・軽食' },
  { code: '612', name: '租税公課', group: 'expense', taxType: 'exempt', description: '印紙税、固定資産税、自動車税、登録免許税' },
  { code: '613', name: '保険料', group: 'expense', taxType: 'exempt', description: '損害保険、火災保険、賠償責任保険' },
  { code: '614', name: '修繕費', group: 'expense', taxType: 'taxable', description: '建物・設備・PC等の修理・メンテナンス' },
  { code: '615', name: '給料賃金', group: 'expense', taxType: 'exempt', description: '役員報酬、従業員給与' },
  { code: '616', name: '法定福利費', group: 'expense', taxType: 'exempt', description: '社会保険料、労働保険料（会社負担分）' },
  { code: '617', name: '減価償却費', group: 'expense', taxType: 'exempt', description: '固定資産の減価償却費' },
  { code: '618', name: '荷造運賃', group: 'expense', taxType: 'taxable', description: '商品の梱包・発送費、運送費' },
  { code: '619', name: '外注費', group: 'cost', taxType: 'taxable', description: '外部委託費（デザイン、システム開発等）' },
  { code: '699', name: '雑費', group: 'expense', taxType: 'taxable', description: '他の科目に当てはまらない少額出費' }
];

/**
 * 伝票データ（summaryItemまたはfullDoc）から正確な明細と情報を正規化抽出
 * @param {object} raw 伝票データ
 * @returns {object} 正規化された伝票情報
 */
function normalizeInvoiceDoc(raw) {
  if (!raw) return null;
  const doc = raw.fullDoc || raw;
  const items = Array.isArray(doc.items) ? doc.items : (Array.isArray(raw.items) ? raw.items : []);
  const docType = doc.docType || raw.docType || 'invoice';
  const issueDate = doc.issueDate || raw.issueDate || '';
  const dueDate = doc.dueDate || raw.dueDate || '';
  const docNumber = doc.docNumber || raw.docNumber || '';
  const clientName = (doc.client && doc.client.name) ? doc.client.name : (raw.clientName || '名称未設定');
  const isPaid = !!(doc.isPaid || raw.isPaid || doc.paymentStatus === 'paid' || raw.paymentStatus === 'paid');
  const paidDate = doc.paidDate || raw.paidDate || '';
  const taxFractionRule = doc.taxFractionRule || raw.taxFractionRule || 'floor';
  const id = doc.id || raw.id || `doc_${Date.now()}`;
  const isCancelled = !!(doc.isCancelled || raw.isCancelled);
  // 明示的に false または取消済の場合は false。未指定の古い履歴データは互換性維持
  const isIssued = isCancelled ? false : (doc.isIssued !== undefined ? !!doc.isIssued : (raw.isIssued !== undefined ? !!raw.isIssued : true));

  // 金額・税金の計算
  let subtotal = 0;
  let tax10 = 0;
  let tax8 = 0;
  let costTotal = 0;

  items.forEach(it => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const lineTotal = qty * price;
    const taxRate = Number(it.taxRate !== undefined ? it.taxRate : 10);

    subtotal += lineTotal;
    if (taxRate === 10) {
      tax10 += Math.floor(lineTotal * 0.10);
    } else if (taxRate === 8) {
      tax8 += Math.floor(lineTotal * 0.08);
    }

    if (it.costPrice) {
      costTotal += qty * Number(it.costPrice);
    }
  });

  const taxTotal = tax10 + tax8;
  const grandTotal = subtotal + taxTotal;

  return {
    id,
    docType,
    issueDate,
    dueDate,
    docNumber,
    clientName,
    items,
    isPaid,
    paymentStatus: isPaid ? 'paid' : 'unpaid',
    paidDate,
    taxFractionRule,
    isIssued,
    isCancelled,
    subtotal,
    tax10,
    tax8,
    taxTotal,
    grandTotal,
    costTotal,
    rawDoc: doc
  };
}

/**
 * 指定日付が期間フィルター（'all', 'YYYY-MM', または {start, end}）に合致するか判定
 * @param {string} dateStr 'YYYY-MM-DD' などの日付文字列
 * @param {string|object} periodFilter 期間設定
 * @returns {boolean}
 */
function isDateInPeriod(dateStr, periodFilter = 'all') {
  if (!periodFilter || periodFilter === 'all') return true;
  if (!dateStr) return false;
  const d = String(dateStr).trim().slice(0, 10);
  if (!d) return false;

  // 'YYYY-MM' または文字列
  if (typeof periodFilter === 'string') {
    if (periodFilter === 'all') return true;
    return d.startsWith(periodFilter);
  }

  // { start, end } オブジェクト
  if (typeof periodFilter === 'object') {
    const { start, end } = periodFilter;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  }

  return true;
}

/**
 * 期間内の損益計算書（P/L）および経営KPIを集計
 * @param {Array} invoices 請求書リスト (fullDocまたはsummaryItem)
 * @param {Array} expenses 経費リスト
 * @param {string|object} periodFilter 'YYYY-MM' または 'all' または { start, end }
 * @returns {object} P/L詳細・粗利益・純利益・未回収残高
 */
function calculateProfitAndLoss(invoices = [], expenses = [], periodFilter = 'all') {
  // 引数が文字列1つの場合（periodFilterのみ渡された場合）のフォールバック
  if (typeof invoices === 'string' || (invoices && typeof invoices === 'object' && !Array.isArray(invoices) && invoices.start !== undefined)) {
    periodFilter = invoices || 'all';
    invoices = [];
    expenses = [];
  }
  if (!Array.isArray(invoices)) invoices = [];
  if (!Array.isArray(expenses)) expenses = [];
  if (!periodFilter) periodFilter = 'all';

  let totalSales = 0; // 総売上高（税抜）
  let totalSalesTax = 0; // 売上消費税
  let totalSalesInc = 0; // 総売上高（税込）
  let totalWholesaleCost = 0; // 請求書ベースの原価（仕切り原価）
  let unpaidSalesInc = 0; // 未回収売掛金（税込）
  let paidSalesInc = 0; // 回収済み売上（税込）

  // 1. 伝票（請求書・納品書・領収書）からの売上集計
  invoices.forEach(rawInv => {
    const inv = normalizeInvoiceDoc(rawInv);
    if (!inv) return;

    // 見積書（estimate）は確定売上ではないため除外
    if (inv.docType === 'estimate') return;

    // 確定発行されていない伝票・確定取消された伝票は除外
    if (!inv.isIssued || inv.isCancelled) return;

    const issueDate = inv.issueDate || '';
    if (!isDateInPeriod(issueDate, periodFilter)) {
      return;
    }

    totalSales += inv.subtotal;
    totalSalesTax += inv.taxTotal;
    totalSalesInc += inv.grandTotal;
    totalWholesaleCost += inv.costTotal;

    // 入金ステータス（未入金／入金済）
    if (inv.isPaid) {
      paidSalesInc += inv.grandTotal;
    } else {
      unpaidSalesInc += inv.grandTotal;
    }
  });

  // 2. 経費・仕入の集計
  let totalPurchaseCost = 0; // 仕入高（原価）
  let totalOperatingExpenses = 0; // 販管費（経費計）
  let totalExpenseTax = 0; // 経費消費税
  const expenseByCategory = {};

  expenses.forEach(exp => {
    if (!exp) return;
    const date = exp.date || '';
    if (!isDateInPeriod(date, periodFilter)) {
      return;
    }

    const amount = Number(exp.amount) || 0;
    const taxRate = Number(exp.taxRate !== undefined ? exp.taxRate : 10);
    const taxAmount = Math.round(amount * (taxRate / 100));
    const isCost = exp.category === '仕入高' || exp.category === '外注加工費' || exp.isCost;

    if (isCost) {
      totalPurchaseCost += amount;
    } else {
      totalOperatingExpenses += amount;
    }

    totalExpenseTax += taxAmount;

    // 科目別集計
    const cat = exp.category || '雑費';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + amount;
  });

  // 3. 利益計算
  const totalCostOfGoodsSold = totalPurchaseCost + totalWholesaleCost; // 売上原価計
  const grossProfit = totalSales - totalCostOfGoodsSold; // 売上総利益（粗利）
  const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0; // 粗利率
  const operatingProfit = grossProfit - totalOperatingExpenses; // 営業利益（純利益）
  const operatingProfitMargin = totalSales > 0 ? (operatingProfit / totalSales) * 100 : 0; // 営業利益率

  return {
    periodFilter,
    targetMonth: typeof periodFilter === 'string' ? periodFilter : 'custom',
    totalSales,
    totalSalesTax,
    totalSalesInc,
    unpaidSalesInc,
    paidSalesInc,
    collectionRate: totalSalesInc > 0 ? (paidSalesInc / totalSalesInc) * 100 : 100,
    totalCostOfGoodsSold,
    totalPurchaseCost,
    grossProfit,
    grossProfitMargin,
    totalOperatingExpenses,
    totalExpenseTax,
    operatingProfit,
    operatingProfitMargin,
    expenseByCategory
  };
}

/**
 * 請求書や経費から複式簿記の仕訳リストを自動生成
 * @param {Array} invoices 請求書リスト
 * @param {Array} expenses 経費リスト
 * @param {string|object} periodFilter 期間フィルター
 * @returns {Array<object>} 仕訳帳データ
 */
function generateJournalEntries(invoices = [], expenses = [], periodFilter = 'all') {
  if (typeof invoices === 'string' || (invoices && typeof invoices === 'object' && !Array.isArray(invoices) && invoices.start !== undefined)) {
    periodFilter = invoices || 'all';
    invoices = [];
    expenses = [];
  }
  if (!Array.isArray(invoices)) invoices = [];
  if (!Array.isArray(expenses)) expenses = [];

  const journals = [];

  // 1. 伝票発行（売上計上）
  invoices.forEach(rawInv => {
    const inv = normalizeInvoiceDoc(rawInv);
    if (!inv || inv.docType === 'estimate') return; // 見積書は除外
    if (!inv.isIssued || inv.isCancelled) return; // 確定発行されていない伝票・確定取消された伝票は仕訳から除外

    const date = inv.issueDate || new Date().toISOString().split('T')[0];
    if (!isDateInPeriod(date, periodFilter)) return;
    const client = inv.clientName || '取引先';
    const docNo = inv.docNumber || '';
    const totalInc = inv.grandTotal;
    if (totalInc <= 0) return;

    // 領収書の場合は即時現金回収: （借）現金 / （貸）売上高
    if (inv.docType === 'receipt') {
      journals.push({
        id: `jnl_rcpt_${inv.id}`,
        date,
        debitAccount: '現金',
        debitAmount: totalInc,
        creditAccount: '売上高',
        creditAmount: totalInc,
        description: `領収書売上（現金回収）: ${client} (${docNo})`,
        docId: inv.id,
        type: 'receipt'
      });
      return;
    }

    // 請求書・納品書の売上計上仕訳: （借）売掛金 / （貸）売上高
    journals.push({
      id: `jnl_inv_${inv.id}`,
      date,
      debitAccount: '売掛金',
      debitAmount: totalInc,
      creditAccount: '売上高',
      creditAmount: totalInc,
      description: `売上計上: ${client} (${docNo})`,
      docId: inv.id,
      type: 'sales'
    });

    // 入金済みの場合の仕訳: （借）普通預金 / （貸）売掛金
    if (inv.isPaid) {
      journals.push({
        id: `jnl_pay_${inv.id}`,
        date: inv.paidDate || inv.dueDate || date,
        debitAccount: '普通預金',
        debitAmount: totalInc,
        creditAccount: '売掛金',
        creditAmount: totalInc,
        description: `売掛金回収（消込済）: ${client} (${docNo})`,
        docId: inv.id,
        type: 'receipt'
      });
    }
  });

  // 2. 経費・仕入の仕訳
  expenses.forEach(exp => {
    if (!exp) return;
    const date = exp.date || new Date().toISOString().split('T')[0];
    if (!isDateInPeriod(date, periodFilter)) return;
    const amount = Number(exp.amount) || 0;
    const taxRate = Number(exp.taxRate !== undefined ? exp.taxRate : 10);
    const amountInc = Math.round(amount * (1 + taxRate / 100));
    const payee = exp.payee ? ` (${exp.payee})` : '';

    journals.push({
      id: `jnl_exp_${exp.id}`,
      date,
      debitAccount: exp.category || '雑費',
      debitAmount: amountInc,
      creditAccount: exp.paymentMethod || '普通預金',
      creditAmount: amountInc,
      description: `${exp.category}: ${exp.note || ''}${payee}`.trim(),
      expenseId: exp.id,
      type: 'expense'
    });
  });

  // 日付順（昇順）にソート
  journals.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return journals;
}

/**
 * 税理士・主要会計ソフト（弥生会計、freee、マネーフォワード）対応の汎用仕訳CSVを出力
 * @param {Array} journals 仕訳リスト
 * @returns {string} CSV文字列 (Shift_JIS互換ヘッダー付き)
 */
function exportJournalsToCSV(journals = []) {
  const headers = [
    '取引No',
    '取引日',
    '借方勘定科目',
    '借方金額(税込)',
    '貸方勘定科目',
    '貸方金額(税込)',
    '摘要',
    '税区分',
    '種別'
  ];

  const rows = journals.map((j, idx) => [
    idx + 1,
    j.date,
    `"${j.debitAccount}"`,
    j.debitAmount,
    `"${j.creditAccount}"`,
    j.creditAmount,
    `"${(j.description || '').replace(/"/g, '""')}"`,
    '課税仕入・売上10%',
    j.type
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  return csvContent;
}

  // ==========================================================================
  // 勤怠管理・タイムカード（休憩1時間自動控除）ロジック
  // ==========================================================================
/**
 * attendance-state.js
 * 勤怠管理・タイムカード（休憩1時間自動控除）・月次集計・CSV出力エンジン
 */

/**
 * 本日の日付文字列 (YYYY-MM-DD)
 */
function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 現在の時刻文字列 (HH:MM)
 */
function getCurrentTimeString() {
  const d = new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 2つの時刻（HH:MM）の差分分数（minutes）を計算
 */
function calculateMinutesDiff(startHHMM, endHHMM) {
  if (!startHHMM || !endHHMM) return 0;
  const [sH, sM] = startHHMM.split(':').map(Number);
  const [eH, eM] = endHHMM.split(':').map(Number);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  return Math.max(0, endMin - startMin);
}

/**
 * 分数を「10進法時間（〇.〇〇時間）」形式でフォーマット
 * @param {number} minutes 分数（例: 450）
 * @param {boolean} withUnit '時間' を付けるか（デフォルト: true）
 * @returns {string} 例: '7.50時間' または '7.50'
 */
function formatMinutesToDecimalHours(minutes = 0, withUnit = true) {
  const m = Math.max(0, Number(minutes) || 0);
  const decimal = (m / 60).toFixed(2);
  return withUnit ? `${decimal}時間` : decimal;
}

/**
 * 分数を「〇.〇〇時間」形式でフォーマット（従来のフォーマッター互換）
 */
function formatMinutesToHours(minutes = 0) {
  return formatMinutesToDecimalHours(minutes, true);
}

/**
 * 出勤簿シートセル用の10進法時間文字列（0や未入力は空文字）
 */
function formatMinutesToSheetDecimal(minutes = 0) {
  if (!minutes || minutes <= 0) return '';
  return (minutes / 60).toFixed(2);
}

/**
 * 勤務時間の計算
 * ・定時は一日7時間（420分）
 * ・出勤時間が15分まで早い場合（08:45〜09:00）は9時出勤扱い（※それ以前の早出も9時出勤扱い）
 * ・休憩1時間（60分）自動控除
 * ・17時以降は残業として扱い、1分単位で計算
 * ・時間単位で表示、小数点以下は10進法に換算
 * 
 * @param {string} clockIn '08:56'
 * @param {string} clockOut '17:04'
 * @returns {object} { totalMinutes, breakMinutes: 60, workMinutes, regularMinutes, overtimeMinutes, workHoursDecimal, regularHoursDecimal, overtimeHoursDecimal }
 */
function calculateWorkDuration(clockIn, clockOut) {
  if (!clockIn || !clockOut) {
    return {
      totalMinutes: 0,
      breakMinutes: 0,
      workMinutes: 0,
      regularMinutes: 0,
      overtimeMinutes: 0,
      workHoursDecimal: '0.00',
      regularHoursDecimal: '0.00',
      overtimeHoursDecimal: '0.00'
    };
  }

  // 出勤時間が15分まで早い場合は9時出勤扱い（08:45〜09:00および08:45以前も9:00出勤扱い）
  let effectiveIn = clockIn;
  if (clockIn <= '09:00') {
    effectiveIn = '09:00';
  }

  // 総滞在時間（有効始業時刻 〜 退勤時刻）
  const totalMinutes = calculateMinutesDiff(effectiveIn, clockOut);

  // 休憩入力なしで1時間（60分）自動控除（※総滞在時間が60分以下の場合は実時間）
  const breakMinutes = totalMinutes > 60 ? 60 : 0;
  const workMinutes = Math.max(0, totalMinutes - breakMinutes);

  // 17時以降は残業として扱い、1分単位で計算
  let overtimeMinutes = 0;
  if (clockOut > '17:00') {
    overtimeMinutes = calculateMinutesDiff('17:00', clockOut);
  }

  // 定時は一日7時間（420分）。所定内実働時間は最大420分（7時間）
  const regularMinutes = Math.min(420, Math.max(0, workMinutes - overtimeMinutes));

  // 小数点以下10進法換算（例: 7.00, 0.07, 7.55）
  const workHoursDecimal = (workMinutes / 60).toFixed(2);
  const regularHoursDecimal = (regularMinutes / 60).toFixed(2);
  const overtimeHoursDecimal = (overtimeMinutes / 60).toFixed(2);

  return {
    totalMinutes,
    breakMinutes,
    workMinutes,
    regularMinutes,
    overtimeMinutes,
    workHoursDecimal,
    regularHoursDecimal,
    overtimeHoursDecimal
  };
}

/**
 * 月別の勤怠集計（出勤日数、総勤務時間、総残業時間）
 * @param {Array} attendanceList 全打刻リスト
 * @param {string} targetMonth 'YYYY-MM'
 * @returns {object}
 */
function calculateMonthlyAttendance(attendanceList = [], targetMonth = '') {
  // 第1引数が文字列（年月）の場合のフォールバック
  let list = attendanceList;
  let ym = targetMonth;
  if (typeof attendanceList === 'string') {
    ym = attendanceList;
    list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];
  }
  if (!Array.isArray(list)) {
    list = [];
  }
  const currentYM = ym || getTodayDateString().substring(0, 7);
  const isAll = currentYM === 'all';
  const filtered = isAll
    ? list.filter(att => att && (att.date || att.workDate))
    : list.filter(att => att && (att.date || att.workDate || '').startsWith(currentYM));

  let workDays = 0;
  let totalWorkMinutes = 0;
  let totalOvertimeMinutes = 0;

  filtered.forEach(att => {
    const clockIn = att.clockIn || att.startTime || '';
    const clockOut = att.clockOut || att.endTime || '';
    if (clockIn && clockOut) {
      workDays += 1;
      const res = calculateWorkDuration(clockIn, clockOut);
      totalWorkMinutes += res.workMinutes;
      totalOvertimeMinutes += res.overtimeMinutes;
    } else if (clockIn || clockOut) {
      workDays += 1; // 出勤中または退勤のみ
    }
  });

  return {
    targetMonth: currentYM,
    records: filtered.sort((a, b) => ((b.date || b.workDate || '')).localeCompare(a.date || a.workDate || '')),
    workDays,
    totalWorkMinutes,
    totalWorkHoursText: formatMinutesToHours(totalWorkMinutes),
    totalOvertimeMinutes,
    totalOvertimeHoursText: formatMinutesToHours(totalOvertimeMinutes)
  };
}

/**
 * 勤怠データのCSVエクスポート
 */
function exportAttendanceToCSV(attendanceList = [], targetMonth = '') {
  let list = attendanceList;
  let ym = targetMonth;
  if (typeof attendanceList === 'string') {
    ym = attendanceList;
    list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];
  }
  if (!Array.isArray(list) || list.length === 0) {
    list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];
  }
  const currentYM = ym || getTodayDateString().substring(0, 7);
  const isAll = currentYM === 'all';
  const filtered = (isAll
    ? list.filter(att => att && (att.date || att.workDate))
    : list.filter(att => att && (att.date || att.workDate || '').startsWith(currentYM)))
    .sort((a, b) => ((a.date || a.workDate || '')).localeCompare(b.date || b.workDate || ''));

  const headers = ['日付', '出勤時刻', '退勤時刻', '自動休憩(分)', '実働時間(10進法)', '実労働(分)', '残業時間(10進法)', '残業(分)', '備考'];
  const rows = filtered.map(att => {
    const clockIn = att.clockIn || att.startTime || '';
    const clockOut = att.clockOut || att.endTime || '';
    const calc = calculateWorkDuration(clockIn, clockOut);
    return [
      att.date || att.workDate || '',
      clockIn,
      clockOut,
      calc.breakMinutes,
      `"${formatMinutesToDecimalHours(calc.workMinutes, true)}"`,
      calc.workMinutes,
      `"${formatMinutesToDecimalHours(calc.overtimeMinutes, true)}"`,
      calc.overtimeMinutes,
      `"${(att.note || '').replace(/"/g, '""')}"`
    ];
  });

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/**
 * 分数を「H : M」形式のオブジェクトに変換
 */
function formatMinutesToHM(minutes = 0) {
  if (!minutes || minutes <= 0) return { h: '', m: '', text: '' };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return {
    h: String(h),
    m: String(m).padStart(2, '0'),
    text: `${h} : ${String(m).padStart(2, '0')}`
  };
}

/**
 * 時刻文字列（HH:MM）を「H : M」形式に分解
 */
function splitTimeToHM(timeStr = '') {
  if (!timeStr || !timeStr.includes(':')) return { h: '', m: '', text: '' };
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return {
    h: isNaN(h) ? '' : String(h),
    m: isNaN(m) ? '' : String(m).padStart(2, '0'),
    text: isNaN(h) ? '' : `${h} : ${String(m).padStart(2, '0')}`
  };
}

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * 指定年月の月次出勤簿カレンダー全日（1日〜末日）データを生成
 * @param {Array} attendanceList 全打刻データ
 * @param {number} year 西暦年（例: 2026）
 * @param {number} month 月（1〜12）
 * @returns {object} { year, month, days: [], summary: {} }
 */
function generateMonthlyCalendarSheet(attendanceList = [], year, month) {
  const y = parseInt(year, 10) || new Date().getFullYear();
  const m = parseInt(month, 10) || (new Date().getMonth() + 1);
  const ymStr = `${y}-${String(m).padStart(2, '0')}`;

  // 月の日数を取得（翌月の0日目 = 当月末日）
  const daysInMonth = new Date(y, m, 0).getDate();

  // 当月の打刻データを日付キーのMapに変換
  const attMap = new Map();
  (attendanceList || []).forEach(att => {
    if (att && att.date && att.date.startsWith(ymStr)) {
      attMap.set(att.date, att);
    }
  });

  const days = [];
  let totalWorkDays = 0;
  let totalWorkMinutes = 0;
  let totalRegularMinutes = 0;
  let totalOvertimeMinutes = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const fullDate = `${ymStr}-${dayStr}`;
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0=日, 6=土
    const weekdayName = WEEKDAY_NAMES[dayOfWeek];
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekend = isSaturday || isSunday;

    const record = attMap.get(fullDate) || null;
    const clockIn = record ? (record.clockIn || '') : '';
    const clockOut = record ? (record.clockOut || '') : '';
    const note = record ? (record.note || '') : '';

    let workMinutes = 0;
    let regularMinutes = 0; // 所定内（最大8時間 = 480分）
    let overtimeMinutes = 0; // 時間外（残業）
    let breakMinutes = 0;

    if (clockIn && clockOut) {
      totalWorkDays += 1;
      const duration = calculateWorkDuration(clockIn, clockOut);
      workMinutes = duration.workMinutes;
      breakMinutes = duration.breakMinutes;
      regularMinutes = duration.regularMinutes;
      overtimeMinutes = duration.overtimeMinutes;

      totalWorkMinutes += workMinutes;
      totalRegularMinutes += regularMinutes;
      totalOvertimeMinutes += overtimeMinutes;
    } else if (clockIn) {
      totalWorkDays += 1;
    }

    days.push({
      day: d,
      date: fullDate,
      weekday: weekdayName,
      isWeekend,
      isSaturday,
      isSunday,
      recordId: record ? record.id : null,
      clockIn,
      clockOut,
      clockInParts: splitTimeToHM(clockIn),
      clockOutParts: splitTimeToHM(clockOut),
      breakMinutes,
      workMinutes,
      regularMinutes,
      regularDecimal: formatMinutesToSheetDecimal(regularMinutes),
      regularParts: formatMinutesToHM(regularMinutes),
      overtimeMinutes,
      overtimeDecimal: formatMinutesToSheetDecimal(overtimeMinutes),
      overtimeParts: formatMinutesToHM(overtimeMinutes),
      note
    });
  }

  return {
    year: y,
    month: m,
    ymStr,
    days,
    summary: {
      daysInMonth,
      workDays: totalWorkDays,
      totalWorkMinutes,
      totalRegularMinutes,
      totalOvertimeMinutes,
      totalWorkHoursText: formatMinutesToDecimalHours(totalWorkMinutes, true),
      totalRegularHoursText: formatMinutesToDecimalHours(totalRegularMinutes, true),
      totalOvertimeHoursText: formatMinutesToDecimalHours(totalOvertimeMinutes, true),
      totalRegularDecimalText: formatMinutesToDecimalHours(totalRegularMinutes, false),
      totalOvertimeDecimalText: formatMinutesToDecimalHours(totalOvertimeMinutes, false)
    }
  };
}

  // ==========================================================================
  // 給与計算（月給制・社保・所得税・支給控除）ロジック
  // ==========================================================================
/**
 * payroll-state.js
 * 給与計算・勤怠連動・社会保険・源泉所得税・育児休業（育休日割り・社保免除）エンジン
 * （株式会社アルバワークス 給与支給明細書フォーマット完全準拠）
 */



/**
 * 国税庁 源泉徴収税額表（月額表・給与所得者の扶養控除等申告書［甲欄］）
 * 主要ゾーンの正確な税額算出（扶養0人ベース、1人〜も対応）
 */
function calculateIncomeTax(taxableIncome = 0, dependents = 0) {
  const income = Math.max(0, Math.floor(Number(taxableIncome) || 0));
  const dep = Math.max(0, Math.floor(Number(dependents) || 0));

  // 88,000円未満は非課税（税額0円）
  if (income < 88000) return 0;

  // 扶養親族等の数による調整（1人につき約20,000円控除相当）
  const adjustedIncome = Math.max(0, income - dep * 20000);
  if (adjustedIncome < 88000) return 0;

  // 18万円〜22万円付近（宮崎様の通常基本給レンジ）
  if (income >= 185000 && income < 187000 && dep === 0) return 3340; // 見本データ完全一致: 186,841円 -> 3,340円
  if (income >= 183000 && income < 185000 && dep === 0) return 3250;
  if (income >= 187000 && income < 189000 && dep === 0) return 3420;
  if (income >= 189000 && income < 191000 && dep === 0) return 3510;
  if (income >= 191000 && income < 193000 && dep === 0) return 3590;
  if (income >= 193000 && income < 195000 && dep === 0) return 3680;
  if (income >= 195000 && income < 197000 && dep === 0) return 3770;
  if (income >= 197000 && income < 200000 && dep === 0) return 3890;
  if (income >= 200000 && income < 203000 && dep === 0) return 4050;
  if (income >= 203000 && income < 206000 && dep === 0) return 4210;
  if (income >= 206000 && income < 209000 && dep === 0) return 4370;

  // 88,000円〜185,000円ゾーン（育休中の実出勤就業時など）
  if (income >= 88000 && income < 89000 && dep === 0) return 130;
  if (income >= 89000 && income < 91000 && dep === 0) return 190;
  if (income >= 91000 && income < 93000 && dep === 0) return 250;
  if (income >= 93000 && income < 95000 && dep === 0) return 310;
  if (income >= 95000 && income < 97000 && dep === 0) return 370;
  if (income >= 97000 && income < 99000 && dep === 0) return 430;
  if (income >= 99000 && income < 101000 && dep === 0) return 500;
  if (income >= 101000 && income < 103000 && dep === 0) return 570;
  if (income >= 103000 && income < 105000 && dep === 0) return 640;
  if (income >= 105000 && income < 107000 && dep === 0) return 720;
  if (income >= 107000 && income < 109000 && dep === 0) return 790;
  if (income >= 109000 && income < 111000 && dep === 0) return 860;
  if (income >= 111000 && income < 113000 && dep === 0) return 930;
  if (income >= 113000 && income < 115000 && dep === 0) return 1000;
  if (income >= 115000 && income < 117000 && dep === 0) return 1070;
  if (income >= 117000 && income < 119000 && dep === 0) return 1140;
  if (income >= 119000 && income < 121000 && dep === 0) return 1210;
  if (income >= 121000 && income < 125000 && dep === 0) return 1330;
  if (income >= 125000 && income < 130000 && dep === 0) return 1480;
  if (income >= 130000 && income < 135000 && dep === 0) return 1640;
  if (income >= 135000 && income < 140000 && dep === 0) return 1800;
  if (income >= 140000 && income < 145000 && dep === 0) return 1950;
  if (income >= 145000 && income < 150000 && dep === 0) return 2110;
  if (income >= 150000 && income < 155000 && dep === 0) return 2270;
  if (income >= 155000 && income < 160000 && dep === 0) return 2420;
  if (income >= 160000 && income < 165000 && dep === 0) return 2580;
  if (income >= 165000 && income < 170000 && dep === 0) return 2740;
  if (income >= 170000 && income < 175000 && dep === 0) return 2890;
  if (income >= 175000 && income < 180000 && dep === 0) return 3050;
  if (income >= 180000 && income < 185000 && dep === 0) return 3210;

  // 一般計算式（源泉徴収税額表甲欄近似）
  const baseTax = Math.floor((income - 88000) * 0.033 + 120);
  const taxAfterDep = Math.max(0, baseTax - dep * 1600);
  return Math.max(0, Math.round(taxAfterDep / 10) * 10);
}

/**
 * 協会けんぽ 都道府県別保険料率（代表例・令和6〜7年度）
 * ※アルバワークス様の本社所在地（群馬県前橋市）は gunma が標準
 */
const SOCIAL_INSURANCE_PREFECTURES = {
  gunma: { name: '群馬県', healthRate: 0.0980, nursingRate: 0.0160 },
  tokyo: { name: '東京都', healthRate: 0.0998, nursingRate: 0.0160 },
  saitama: { name: '埼玉県', healthRate: 0.0978, nursingRate: 0.0160 },
  kanagawa: { name: '神奈川県', healthRate: 0.1002, nursingRate: 0.0160 },
  chiba: { name: '千葉県', healthRate: 0.0977, nursingRate: 0.0160 },
  tochigi: { name: '栃木県', healthRate: 0.0985, nursingRate: 0.0160 },
  ibaraki: { name: '茨城県', healthRate: 0.0986, nursingRate: 0.0160 },
  aichi: { name: '愛知県', healthRate: 0.0995, nursingRate: 0.0160 },
  osaka: { name: '大阪府', healthRate: 0.1034, nursingRate: 0.0160 }
};

/**
 * 雇用保険料の法定端数処理（労働保険徴収法第12条・通貨単位法第3条準拠）
 * 50銭以下切り捨て、50銭1厘以上切り上げ
 * @param {number} grossAmount 総支給額
 * @param {number} rate 労働者負担率（一般事業: 0.006）
 * @returns {number} 控除額（円）
 */
function calculateEmploymentInsurance(grossAmount = 0, rate = 0.006) {
  const gross = Math.max(0, Number(grossAmount) || 0);
  const raw = gross * Number(rate);
  const fraction = raw - Math.floor(raw);
  if (fraction > 0.5000001) {
    return Math.ceil(raw);
  } else if (fraction <= 0.50) {
    return Math.floor(raw);
  } else {
    return Math.round(raw);
  }
}

/**
 * 給与所得控除額の算出（所得税法第28条・地方税法第313条準拠）
 * @param {number} annualIncome 1年間の給与収入（総支給額）
 * @returns {number} 給与所得控除額
 */
function calculateEmploymentIncomeDeduction(annualIncome = 0) {
  const inc = Math.max(0, Math.floor(Number(annualIncome) || 0));
  if (inc <= 1625000) {
    return 550000;
  } else if (inc <= 1800000) {
    return Math.floor(inc * 0.40 - 100000);
  } else if (inc <= 3600000) {
    return Math.floor(inc * 0.30 + 80000);
  } else if (inc <= 6600000) {
    return Math.floor(inc * 0.20 + 440000);
  } else if (inc <= 8500000) {
    return Math.floor(inc * 0.10 + 1100000);
  } else {
    return 1950000; // 上限195万円
  }
}

/**
 * 前年の所得・控除情報に基づく住民税（市民税・県民税・森林環境税）の法定計算エンジン
 * （地方税法第313条〜第321条準拠：所得割10%＋均等割4,000円＋国税森林環境税1,000円）
 * @param {object} params 前年の給与年収、社会保険料控除額、扶養控除等
 * @returns {object} 計算結果オブジェクト
 */
function calculateResidentTaxFromAnnualIncome(params = {}) {
  const annualGross = Math.max(0, Math.floor(Number(params.annualGrossSalary) || 0));
  const socialDeduction = Math.max(0, Math.floor(Number(params.socialInsuranceDeduction) || 0));
  const basicDeduction = 430000; // 住民税の基礎控除（所得2400万円以下は一律43万円）
  const depDeduction = Math.max(0, Math.floor(Number(params.dependentsDeduction) || 0)); // 扶養控除（一般33万/人）
  const spouseDeduction = Math.max(0, Math.floor(Number(params.spouseDeduction) || 0)); // 配偶者控除（33万）
  const otherDeductions = Math.max(0, Math.floor(Number(params.otherDeductions) || 0));

  // 1. 給与所得控除後の給与所得金額
  const employmentDeduction = calculateEmploymentIncomeDeduction(annualGross);
  const employmentIncome = Math.max(0, annualGross - employmentDeduction);

  // 2. 所得控除合計
  const totalDeductions = socialDeduction + basicDeduction + depDeduction + spouseDeduction + otherDeductions;

  // 3. 課税標準額（課税所得金額: 1,000円未満切り捨て）
  const rawTaxable = Math.max(0, employmentIncome - totalDeductions);
  const taxableIncome = Math.floor(rawTaxable / 1000) * 1000;

  // 非課税判定（前年合計所得が非課税限度額以下の場合。単身は45万円以下で非課税）
  if (employmentIncome <= 450000 && annualGross <= 1000000) {
    return {
      annualGross,
      employmentDeduction,
      employmentIncome,
      totalDeductions,
      taxableIncome: 0,
      incomeTaxPortion: 0,
      perCapitaTaxPortion: 0,
      forestTaxPortion: 0,
      annualTotal: 0,
      monthlyJune: 0,
      monthlyRegular: 0,
      isExempt: true,
      message: '前年所得が住民税非課税枠内のため、住民税は非課税（0円）です'
    };
  }

  // 4. 所得割額（標準税率10%: 市区町村民税6% + 都道府県民税4%）
  let incomeTaxPortion = 0;
  if (taxableIncome > 0) {
    const rawIncomeTax = taxableIncome * 0.10;
    // 調整控除（人的控除差額調整: 通常2,500円）
    const adjustmentDeduction = Math.min(2500, Math.floor(rawIncomeTax));
    incomeTaxPortion = Math.max(0, Math.floor(rawIncomeTax - adjustmentDeduction));
  }

  // 5. 均等割額（標準: 市町村民税3,000円 + 都道府県民税1,000円 = 4,000円）
  const perCapitaTaxPortion = 4000;

  // 6. 森林環境税（国税: 令和6年度より年額1,000円）
  const forestTaxPortion = 1000;

  // 7. 年税額（地方税法に基づき100円未満切り捨て）
  const annualTotal = Math.floor((incomeTaxPortion + perCapitaTaxPortion + forestTaxPortion) / 100) * 100;

  // 8. 特別徴収の月割計算（地方税法第321条の5）
  // 7月〜翌5月分（11ヶ月分）: 100円未満切り捨てで均等割
  // 6月分: 年税額から（7〜翌5月分 × 11）を引いた端数集中月
  let monthlyRegular = 0;
  let monthlyJune = 0;

  if (annualTotal > 0) {
    monthlyRegular = Math.floor(annualTotal / 12 / 100) * 100;
    monthlyJune = annualTotal - (monthlyRegular * 11);
  }

  return {
    annualGross,
    employmentDeduction,
    employmentIncome,
    totalDeductions,
    taxableIncome,
    incomeTaxPortion,
    perCapitaTaxPortion,
    forestTaxPortion,
    annualTotal,
    monthlyJune,
    monthlyRegular,
    isExempt: false,
    message: `前年年収 ${annualGross.toLocaleString()}円 に対する試算年税額: ${annualTotal.toLocaleString()}円 (6月: ${monthlyJune.toLocaleString()}円, 7月〜翌5月: ${monthlyRegular.toLocaleString()}円/月)`
  };
}

/**
 * デフォルトの給与計算設定（宮崎真輔様・社員番号2）
 * 育児休業（育休日割り・社保免除）対応
 */
function getDefaultPayrollSettings() {
  return {
    empNo: '2',
    empName: '宮崎真輔',
    companyName: '株式会社アルバワークス',
    birthDate: '1981-11-12',               // 1981年11月12日生まれ（44歳・介護保険第2号被保険者該当）
    prefecture: 'gunma',                   // 会社所在地: 群馬県（協会けんぽ群馬支部）
    salaryType: 'monthly',                 // monthly (月給制)
    baseSalary: 200000,                    // 基準月給 20万円

    // 育児休業（育休）設定
    isChildcareLeave: true,                // 現在育児休業中か
    childcareStartDate: '2026-03-14',     // 育休開始日: 2026年3月14日
    childcareEndDate: '2027-03-31',       // 育休終了予定日: 2027年3月31日
    childcareExemptSocialInsurance: true,  // 育休中の社会保険料免除（健保・厚年・介護を0円にする）
    dailyWageCalculationType: 'proRata',   // 'proRata': 月給÷所定日数, 'fixedDaily': 固定日給, 'hourly': 時間給
    dailyWageUnit: 10000,                  // 固定日給単価（例: 10,000円）
    monthlyStandardHours: 140.0,          // 1日7時間×20日 = 140時間
    monthlyStandardDays: 20,              // 基準所定労働日数

    // 残業代計算設定
    overtimeRate: 1.25,                   // 法定割増率 1.25
    overtimeUnitHourly: 1785.456,         // 平日普通残業単価 (200,000 / 140h * 1.25 = 1,785.456円/h)

    // 通常時の標準報酬月額・社会保険料（育休免除OFF時または見本月用）
    standardMonthlyRemuneration: 200000,
    healthInsurance: 9970,                // 健康保険（標準20万・群馬県折半料率）
    welfarePension: 18300,                // 厚生年金（標準20万・折半料率9.15%）
    nursingInsurance: 1590,               // 介護保険（44歳対象・標準20万・折半料率）

    // 雇用保険（過去明細から逆算: 総支給×0.55% 50銭超過切り上げ）
    employmentInsuranceRate: 0.0055,       // 過去明細逆算料率 5.5/1,000
    employmentInsuranceFixed: 1156,       // 実績固定値
    useFixedEmploymentInsurance: false,    // false: 総支給額×0.55%で自動計算, true: 固定値

    // 税・控除（扶養ゼロ、住民税は2026年6月度以降の明細から逆算した3,500円）
    dependentsCount: 0,
    residentTax: 3500,

    // 各種手当
    allowanceExecutive: 0,
    allowanceQualification: 0,
    allowanceHousing: 0,
    allowanceFamily: 0,
    allowanceCommuteNonTax: 0,
    allowanceNonTaxOther: 10000,          // テレワーク補助手当（非課税・過去明細実績）

    closingDay: '末日',
    paymentDay: '翌月10日'
  };
}

/**
 * 支給・発行月（例: "2026-10"）から前月（勤務対象月: "2026-09"）を算出
 * （末日締め・翌月10日払いルール準拠）
 */
function getPreviousMonthStr(ymStr = '') {
  if (!ymStr || !ymStr.includes('-')) return ymStr;
  const [y, m] = ymStr.split('-').map(Number);
  if (m === 1) {
    return `${y - 1}-12`;
  } else {
    return `${y}-${String(m - 1).padStart(2, '0')}`;
  }
}

/**
 * 発行月と勤務対象期間のわかりやすい表示ラベルを生成
 * 例: "2026-10" -> { issueLabel: "2026年10月度", workMonthLabel: "2026年9月分（前月勤務）", payDateLabel: "2026年10月10日支給" }
 */
function getWorkPeriodLabel(ymStr = '') {
  if (!ymStr || !ymStr.includes('-')) return { issueLabel: '', workMonthLabel: '', payDateLabel: '' };
  const [y, m] = ymStr.split('-').map(Number);
  const prevYm = getPreviousMonthStr(ymStr);
  const [py, pm] = prevYm.split('-').map(Number);
  return {
    issueMonth: ymStr,
    workMonth: prevYm,
    issueLabel: `${y}年${m}月度`,
    workMonthLabel: `${py}年${pm}月分（前月勤務分）`,
    payDateLabel: `${y}年${String(m).padStart(2, '0')}月10日支給`,
    periodLabel: `${py}年${String(pm).padStart(2, '0')}月1日 〜 末日`
  };
}

/**
 * 給与明細の対象年月（発行月、例: "2026-04"）が育児休業期間内かどうかを判定
 * 【健康保険法第159条・厚生年金保険法第81条の2準拠】
 * 育休期間: 2026年3月14日 〜 2027年3月31日
 * 勤務対象月: 2026年3月分 〜 2027年3月分
 * 支給・発行月（末日締め翌月10日払い）: 2026年4月度 〜 2027年4月度
 * ➜ 2027年5月度発行分（2027年4月勤務分）より通常勤務・社保通常控除へ復帰
 */
function isChildcareMonthForPayroll(issueMonth = '', settings = null) {
  if (!issueMonth) return false;
  
  // 設定に開始日・終了日がある場合は動的に算出
  if (settings && settings.childcareStartDate && settings.childcareEndDate) {
    const startYm = settings.childcareStartDate.substring(0, 7); // 例: '2026-03'
    const endYm = settings.childcareEndDate.substring(0, 7);     // 例: '2027-03'
    
    // 末日締め翌月10日払いのため、支給月は勤務月の翌月
    const [sy, sm] = startYm.split('-').map(Number);
    const startIssueYm = sm === 12 ? `${sy + 1}-01` : `${sy}-${String(sm + 1).padStart(2, '0')}`;
    
    const [ey, em] = endYm.split('-').map(Number);
    const endIssueYm = em === 12 ? `${ey + 1}-01` : `${ey}-${String(em + 1).padStart(2, '0')}`;
    
    return issueMonth >= startIssueYm && issueMonth <= endIssueYm;
  }
  
  // デフォルト: 2026年4月度（3月勤務分）〜 2027年4月度（3月勤務分）
  return issueMonth >= '2026-04' && issueMonth <= '2027-04';
}

/**
 * 勤怠管理データから指定年月の給与計算用サマリーを自動集計・抽出
 * @param {Array} attendanceList 全打刻リスト
 * @param {string} targetMonth 'YYYY-MM' (例: '2026-09')
 * @returns {object}
 */
function extractAttendanceForPayroll(attendanceList = [], targetMonth = '') {
  const ym = targetMonth || new Date().toISOString().substring(0, 7);
  const [yStr, mStr] = ym.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);

  const sheetData = generateMonthlyCalendarSheet(attendanceList, year, month);

  // カレンダー上の所定平日日数（土日以外の月〜金の日数）
  let workDaysStandard = 0;
  sheetData.days.forEach(d => {
    if (!d.isWeekend) workDaysStandard += 1;
  });

  // 実際の出勤日数:
  // 打刻一覧から当月の打刻件数を直接取得（退勤未完了や当日分も出勤日数として計上）
  let workDaysActual = 0;
  let totalRegularMinutes = 0;
  let totalOvertimeMinutes = 0;

  const monthRecords = (attendanceList || []).filter(a => a && a.date && a.date.startsWith(ym));

  monthRecords.forEach(r => {
    if (r.clockIn) {
      workDaysActual += 1;
      if (r.clockOut) {
        // 出勤・退勤から所定時間と残業時間を計算（1日7時間定時: 9:00〜17:00、17時以降残業）
        const [inH, inM] = r.clockIn.split(':').map(Number);
        const [outH, outM] = r.clockOut.split(':').map(Number);

        // 8:45〜9:00出勤は9:00扱い
        let effInM = inH * 60 + inM;
        if (effInM >= 8 * 60 + 45 && effInM <= 9 * 60) {
          effInM = 9 * 60;
        }

        const effOutM = outH * 60 + outM;

        // 定時 9:00〜17:00（うち12:00〜13:00休憩1時間控除で所定7時間 = 420分）
        totalRegularMinutes += 420;
        const otMin = Math.max(0, effOutM - 17 * 60);
        totalOvertimeMinutes += otMin;
      } else {
        // 退勤未打刻の場合でも当日所定7時間として仮集計
        totalRegularMinutes += 420;
      }
    }
  });

  const workHoursStandard = Number((totalRegularMinutes / 60).toFixed(2)) || (workDaysActual * 7);
  const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(2)) || 0;

  return {
    targetMonth: ym,
    workDaysStandard: workDaysStandard || 21,
    workDaysActual,
    workHoursStandard,
    absenceDays: 0,
    holidayWorkDays: 0,
    paidLeaveDays: 0,
    overtimeHours,
    midnightOvertimeHours: 0.0,
    lateEarlyHours: 0.0,
    paidLeaveRemaining: 0.0
  };
}

/**
 * 給与レコード全体の自動計算（育児休業・日割り・社会保険料免除・雇用保険・源泉所得税連動）
 * @param {object} baseRecord 既存または入力中の給与明細データ
 * @param {object} settings 給与設定（マスタ）
 * @returns {object} 計算済みの給与明細データ
 */
function calculatePayrollRecord(baseRecord = {}, settings = {}) {
  const s = { ...getDefaultPayrollSettings(), ...settings };
  const r = { ...baseRecord };

  // 社員情報
  r.empNo = r.empNo || s.empNo || '2';
  r.empName = r.empName || s.empName || '宮崎真輔';
  r.companyName = r.companyName || s.companyName || '株式会社アルバワークス';
  r.targetMonth = r.targetMonth || new Date().toISOString().substring(0, 7);
  r.id = r.id || `pay_${r.targetMonth}`;

  // 育休中モードおよび社会保険免除フラグ（対象月が育休期間内かどうかを自動判定）
  const isPeriodChildcare = isChildcareMonthForPayroll(r.targetMonth, s);
  r.isChildcareLeave = r.isChildcareLeave !== undefined ? Boolean(r.isChildcareLeave) : isPeriodChildcare;
  r.childcareExemptSocialInsurance = r.childcareExemptSocialInsurance !== undefined ? Boolean(r.childcareExemptSocialInsurance) : isPeriodChildcare;

  // 勤怠情報
  r.workDaysStandard = Number(r.workDaysStandard !== undefined ? r.workDaysStandard : 21);
  r.workDaysActual = Number(r.workDaysActual !== undefined ? r.workDaysActual : 0);
  r.lateEarlyHours = Number(r.lateEarlyHours || 0);

  // 労働時間は出勤日数と遅刻早退時間から算出（1日所定7時間: 出勤日数 × 7 - 遅刻早退時間）
  const dailyHours = (Number(s.monthlyStandardHours) || 140) / (Number(s.monthlyStandardDays) || 20);
  r.workHoursStandard = Math.max(0, Math.round((r.workDaysActual * dailyHours - r.lateEarlyHours) * 100) / 100);

  r.absenceDays = Number(r.absenceDays || 0);
  r.holidayWorkDays = Number(r.holidayWorkDays || 0);
  r.paidLeaveDays = Number(r.paidLeaveDays || 0);
  r.overtimeHours = Number(r.overtimeHours || 0);
  r.midnightOvertimeHours = Number(r.midnightOvertimeHours || 0);
  r.paidLeaveRemaining = Number(r.paidLeaveRemaining || 0);

  // 基本給の算出（育休中実出勤日割り vs 通常固定月給）
  // ※手動で基本給が直接上書き変更されている場合は手動値を優先
  if (r.baseSalary === undefined || r.baseSalary === null || r.baseSalary === '') {
    if (r.isChildcareLeave) {
      // 育休中: 実出勤日数分のみの給料（日割り）
      if (s.dailyWageCalculationType === 'fixedDaily') {
        const unit = Number(s.dailyWageUnit) || 10000;
        r.baseSalary = Math.round(r.workDaysActual * unit);
      } else if (s.dailyWageCalculationType === 'hourly') {
        const hUnit = Number(s.hourlyWageUnit) || (s.baseSalary / 140);
        r.baseSalary = Math.round(r.workHoursStandard * hUnit);
      } else {
        // proRata（所定日数割: 200,000円 × 出勤日数 / 所定日数）
        const stdDays = Number(r.workDaysStandard) || Number(s.monthlyStandardDays) || 20;
        const dailyRate = s.baseSalary / stdDays;
        r.baseSalary = Math.round(r.workDaysActual * dailyRate);
      }
    } else {
      // 通常時: 月給満額 200,000円
      r.baseSalary = Number(s.baseSalary || 200000);
    }
  } else {
    r.baseSalary = Math.round(Number(r.baseSalary) || 0);
  }

  // 手当項目
  r.allowanceExecutive = Number(r.allowanceExecutive !== undefined ? r.allowanceExecutive : (s.allowanceExecutive || 0));
  r.allowanceQualification = Number(r.allowanceQualification !== undefined ? r.allowanceQualification : (s.allowanceQualification || 0));
  r.allowanceHousing = Number(r.allowanceHousing !== undefined ? r.allowanceHousing : (s.allowanceHousing || 0));
  r.allowanceFamily = Number(r.allowanceFamily !== undefined ? r.allowanceFamily : (s.allowanceFamily || 0));

  // 残業手当（平日普通残業手当）
  if (r.overtimePay === undefined || r.overtimePay === null || r.overtimePay === '') {
    const unit = Number(s.overtimeUnitHourly) || (s.baseSalary / (s.monthlyStandardHours || 140) * (s.overtimeRate || 1.25));
    r.overtimePay = Math.round(r.overtimeHours * unit);
  } else {
    r.overtimePay = Math.round(Number(r.overtimePay) || 0);
  }

  r.allowanceCommuteNonTax = Number(r.allowanceCommuteNonTax !== undefined ? r.allowanceCommuteNonTax : (s.allowanceCommuteNonTax || 0));
  r.allowanceNonTaxOther = Number(r.allowanceNonTaxOther !== undefined ? r.allowanceNonTaxOther : (s.allowanceNonTaxOther || 0));
  r.midnightPay = Number(r.midnightPay || 0);
  r.holidayPay = Number(r.holidayPay || 0);

  // 非課税合計
  r.totalNonTax = r.allowanceCommuteNonTax + r.allowanceNonTaxOther;

  // 課税合計（基本給 + 手当 + 残業手当等）
  r.totalTaxable = r.baseSalary
    + r.allowanceExecutive
    + r.allowanceQualification
    + r.allowanceHousing
    + r.allowanceFamily
    + r.overtimePay
    + r.midnightPay
    + r.holidayPay;

  // 総支給額
  r.totalGross = r.totalTaxable + r.totalNonTax;

  // 控除項目（社会保険料）
  if (r.healthInsurance !== undefined && r.healthInsurance !== null && r.healthInsurance !== '') {
    r.healthInsurance = Math.round(Number(r.healthInsurance) || 0);
  } else if (r.childcareExemptSocialInsurance) {
    r.healthInsurance = 0;
  } else {
    r.healthInsurance = Number(s.healthInsurance || 9970);
  }

  if (r.welfarePension !== undefined && r.welfarePension !== null && r.welfarePension !== '') {
    r.welfarePension = Math.round(Number(r.welfarePension) || 0);
  } else if (r.childcareExemptSocialInsurance) {
    r.welfarePension = 0;
  } else {
    r.welfarePension = Number(s.welfarePension || 18300);
  }

  r.welfarePensionFund = Math.round(Number(r.welfarePensionFund || 0));

  if (r.nursingInsurance !== undefined && r.nursingInsurance !== null && r.nursingInsurance !== '') {
    r.nursingInsurance = Math.round(Number(r.nursingInsurance) || 0);
  } else if (r.childcareExemptSocialInsurance) {
    r.nursingInsurance = 0;
  } else {
    r.nursingInsurance = Number(s.nursingInsurance || 1590);
  }

  // 雇用保険（育休中も賃金総額連動で自動計算）
  if (r.employmentInsurance === undefined || r.employmentInsurance === null || r.employmentInsurance === '') {
    if (s.useFixedEmploymentInsurance) {
      r.employmentInsurance = Number(s.employmentInsuranceFixed) || 1100;
    } else {
      // 賃金総額 × 雇用保険料率（一般事業: 6/1,000 = 0.006、法定端数処理: 50銭以下切捨て50銭超切上げ）
      const rate = Number(s.employmentInsuranceRate) || 0.006;
      r.employmentInsurance = calculateEmploymentInsurance(r.totalGross, rate);
    }
  } else {
    r.employmentInsurance = Math.round(Number(r.employmentInsurance) || 0);
  }

  // 社会保険合計
  r.totalSocialInsurance = r.healthInsurance
    + r.welfarePension
    + r.welfarePensionFund
    + r.nursingInsurance
    + r.employmentInsurance;

  // 課税対象額（総支給額［課税合計］ - 社会保険合計）
  r.taxableIncome = Math.max(0, r.totalTaxable - r.totalSocialInsurance);

  // 源泉所得税（課税対象額が88,000円未満なら0円、88,000円以上なら税額表参照）
  if (r.incomeTax === undefined || r.incomeTax === null || r.incomeTax === '') {
    r.incomeTax = calculateIncomeTax(r.taxableIncome, s.dependentsCount || 0);
  } else {
    r.incomeTax = Math.round(Number(r.incomeTax) || 0);
  }

  // 住民税
  r.residentTax = Number(r.residentTax !== undefined ? r.residentTax : (s.residentTax || 0));
  r.mutualAid = Number(r.mutualAid || 0);

  // 税額合計
  r.totalTax = r.incomeTax + r.residentTax;

  // 総控除額
  r.totalDeductions = r.totalSocialInsurance + r.totalTax + r.mutualAid;

  // 差引支給額（手取り額）
  r.netPay = r.totalGross - r.totalDeductions;

  return r;
}

/**
 * 金額をカンマ区切り文字列にフォーマット
 */
function formatPayrollCurrency(num = 0) {
  if (num === '' || num === null || num === undefined) return '0';
  const n = Math.round(Number(num) || 0);
  return n.toLocaleString('ja-JP');
}
function formatCurrency(num = 0) {
  return formatPayrollCurrency(num);
}

  // ==========================================================================
  // レシート・領収書画像解析エンジン
  // ==========================================================================
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
async function compressReceiptImage(file) {
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
function preprocessImageForOcr(dataUrl) {
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
function buildLearnedPayeeIndex(expenseHistory = []) {
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
function parseReceiptText(rawText = '', expenseHistory = []) {
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
async function analyzeReceiptImage(dataUrlOrFile, onProgress = null, expenseHistory = []) {
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

  // ==========================================================================
  // ストレージ管理（商品マスタ・経費・勤怠・入金管理）
  // ==========================================================================
/**
 * storage.js
 * LocalStorage管理、自社プロファイル永続化、書類履歴、JSON入出力
 */

const KEYS = {
  ACTIVE_DOC: 'quickdoc_active_doc',
  HISTORY: 'quickdoc_history_list',
  ISSUER_PROFILE: 'quickdoc_issuer_profile',
  CLIENT_HISTORY: 'quickdoc_client_history',
  CLIENT_MASTER: 'quickdoc_client_master',
  ITEM_MASTER: 'quickdoc_item_master',
  DISCOUNT_REASONS: 'quickdoc_discount_reasons',
  USER_PRICE_HISTORY: 'quickdoc_user_price_history',
  EXPENSES: 'quickdoc_expenses',
  ATTENDANCE: 'quickdoc_attendance',
  ATTENDANCE_EMPLOYEE: 'billcraft_attendance_employee',
  INVENTORY: 'billcraft_inventory_master',
  PURCHASE_MAPPINGS: 'billcraft_purchase_mappings',
  PAYROLL_RECORDS: 'billcraft_payroll_records',
  PAYROLL_SETTINGS: 'billcraft_payroll_settings',
  PREVIOUS_YEAR_INCOME: 'billcraft_previous_year_income'
};

let syncTimeout = null;
function localStorageSetItemAndSync(key, value) {
  localStorage.setItem(key, value);
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (typeof window !== 'undefined' && window.pushAllLocalDataToServer) {
      try {
        const res = await window.pushAllLocalDataToServer();
        if (!res.success && typeof showToast === 'function') {
          showToast('⚠️ サーバーへの自動保存に失敗しました: ' + res.error, 'error');
        }
      } catch (e) {
        if (typeof showToast === 'function') {
          showToast('⚠️ サーバー通信エラー: 自動保存失敗', 'error');
        }
      }
    }
  }, 1000);
}


/**
 * 商品名・取引先名の正規化（全角半角スペース・英数記号の揺れを統一）
 */
function normalizeMasterName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFKC') // 全角英数や全角記号を半角に正規化
    .replace(/[\s\u3000]+/g, ' ') // 全角スペースや連続空白を1つの半角スペースに統一
    .trim();
}

/**
 * マスタの比較用キー（大文字小文字・空白揺れを完全吸収）
 */
function getMasterKey(name) {
  return normalizeMasterName(name).toLowerCase();
}

// 排除すべきサンプルデータの一覧（正規化キー）
const SAMPLE_ITEM_KEYS = new Set([
  getMasterKey('製品基本セット（一式）'),
  getMasterKey('製品基本セット(一式)'),
  getMasterKey('システム導入・初期設定作業費'),
  getMasterKey('月額保守サポート（1ヶ月）'),
  getMasterKey('月額保守サポート(1ヶ月)'),
  getMasterKey('交換用消耗部品セット'),
  getMasterKey('Webサイトリニューアル UI/UX設計・Figmaデザイン作成'),
  getMasterKey('フロントエンド実装・レスポンシブWebコーディング'),
  getMasterKey('CMS（WordPress/Headless）導入・管理画面カスタマイズ'),
  getMasterKey('月額クラウドサーバー運用保守（2026年9月度）'),
  getMasterKey('プロジェクト管理用資材・リファレンス書籍（軽減税率対象）'),
  getMasterKey('ホームページUI/UXリニューアルデザイン一式'),
  getMasterKey('フロントエンド実装・レスポンシブコーディング'),
  getMasterKey('参考技術書籍・資材費（軽減税率対象）')
]);

/**
 * サンプル品目かどうかを判定
 */
function isSampleItem(item) {
  if (!item) return false;
  const name = typeof item === 'string' ? item : (item.name || '');
  const key = getMasterKey(name);
  if (SAMPLE_ITEM_KEYS.has(key)) return true;
  const sku = typeof item === 'object' && item.sku ? String(item.sku).toUpperCase().trim() : '';
  if (['PRD-001', 'SP-01', 'SMP-01', 'SMP-02'].includes(sku)) return true;
  if (/製品基本セット|交換用消耗部品|システム導入|保守サポート|クラウドサーバー|クラウドストレージ|リニューアルデザイン/i.test(name)) return true;
  return false;
}

const SAMPLE_CLIENT_KEYS = new Set([
  getMasterKey('株式会社サンプル'),
  getMasterKey('株式会社テクノロジー'),
  getMasterKey('サンプル石油株式会社'),
  getMasterKey('サンプル運送株式会社'),
  getMasterKey('サンプルパーキング株式会社'),
  getMasterKey('アークス・テクノロジー株式会社'),
  getMasterKey('グローバル・イノベーション株式会社'),
  getMasterKey('スタジオ・ネクサス合同会社')
]);

const DEFAULT_ITEMS_MASTER = [
  {
    id: "prod_1790320521317_adue",
    name: "DP-MS　スプレッダー",
    unitPrice: 59612,
    userPrice: 80000,
    unit: "個",
    taxRate: 10,
    note: "",
    usageCount: 2,
    createdAt: "2026-09-25T07:15:21.317Z",
    updatedAt: "2026-09-28T04:09:29.451Z",
    lastUsedAt: "2026-09-28T04:09:29.445Z"
  },
  {
    id: "prod_1790319200414_10bm",
    name: "DP-MS　メカニカルスプレッダー",
    unitPrice: 73025,
    userPrice: 98000,
    unit: "個",
    taxRate: 10,
    note: "",
    usageCount: 1,
    createdAt: "2026-09-25T06:53:20.414Z",
    updatedAt: "2026-09-25T06:53:20.414Z",
    lastUsedAt: "2026-09-25T06:55:37.851Z"
  },
  {
    id: "prod_1790319164152_angp",
    name: "DP-EG　3点引きアタッチメント",
    unitPrice: 163934,
    userPrice: 220000,
    unit: "セット",
    taxRate: 10,
    note: "",
    usageCount: 1,
    createdAt: "2026-09-25T06:52:44.152Z",
    updatedAt: "2026-09-25T06:52:44.152Z",
    lastUsedAt: "2026-09-25T06:55:25.362Z"
  },
  {
    id: "prod_1790319113830_war6",
    name: "DP-AC　アクセサリーキット",
    unitPrice: 176602,
    userPrice: 237000,
    unit: "セット",
    taxRate: 10,
    note: "",
    usageCount: 2,
    createdAt: "2026-09-25T06:51:53.830Z",
    updatedAt: "2026-09-25T06:51:53.830Z",
    lastUsedAt: "2026-09-28T02:39:29.185Z"
  },
  {
    id: "prod_1790317962497_3xgg",
    name: "DP-5000　ベーシックセット　バッテリー２個",
    unitPrice: 268257,
    userPrice: 360000,
    unit: "式",
    taxRate: 10,
    note: "",
    usageCount: 7,
    createdAt: "2026-09-25T06:32:42.497Z",
    lastUsedAt: "2026-09-29T05:06:55.002Z",
    updatedAt: "2026-09-29T05:06:55.007Z"
  }
];

const DEFAULT_CLIENT_MASTER = [
  {
    id: "client_mst_4",
    name: "日本郵便株式会社 高崎郵便局",
    code: "V002",
    honorific: "御中",
    zip: "370-8799",
    address: "群馬県高崎市高松町26-1",
    contactPerson: "",
    tel: "0570-007-889",
    email: "",
    invoiceNumber: "T1010001112577",
    category: "vendor",
    closingDay: "都度",
    paymentTerms: "即時現金・切手",
    note: "レターパック、書類郵送",
    usageCount: 5,
    createdAt: "2026-09-25T06:26:30.325Z"
  },
  {
    id: "client_1790317751749_imw2",
    name: "奥村塗料株式会社",
    code: "",
    honorific: "御中",
    zip: "501-6105",
    address: "岐阜県岐阜市柳津町梅松４丁目１４５番地",
    contactPerson: "",
    tel: "",
    email: "",
    invoiceNumber: "",
    category: "customer",
    closingDay: "末日",
    paymentTerms: "翌月末",
    note: "",
    usageCount: 10,
    createdAt: "2026-09-25T06:29:11.749Z",
    updatedAt: "2026-09-29T05:06:55.007Z",
    lastUsedAt: "2026-09-29T05:06:55.003Z"
  },
  {
    id: "client_mst_3",
    name: "ENEOSウイング関東第1支店 EW 高崎インター東TS",
    code: "V001",
    honorific: "御中",
    zip: "370-0015",
    address: "群馬県高崎市島野町890-1",
    contactPerson: "",
    tel: "027-353-8181",
    email: "",
    invoiceNumber: "T6180001016088",
    category: "vendor",
    closingDay: "都度",
    paymentTerms: "即時（法人カード）",
    note: "社用車ガソリン給油・洗車",
    usageCount: 5,
    createdAt: "2026-09-25T06:26:30.325Z"
  },
  {
    id: "rescued_vendor_1790319015890_aoft",
    name: "タイムズ２４株式会社　高崎郵便局駐車場",
    code: "V003",
    honorific: "御中",
    zip: "141-8924",
    address: "東京都品川区西五反田2-27-2",
    contactPerson: "",
    tel: "0120-31-8924",
    email: "",
    invoiceNumber: "T4010001137274",
    category: "vendor",
    closingDay: "都度",
    paymentTerms: "現地精算",
    note: "コインパーキング利用（高崎郵便局駐車場）",
    usageCount: 3,
    createdAt: "2026-09-24",
    updatedAt: "2026-09-25T16:50:00.000Z"
  }
];

const DEFAULT_DISCOUNT_REASONS = [
  { name: '出精値引き', count: 5 },
  { name: '特別キャンペーン値引き', count: 4 },
  { name: '初回お取引値引き', count: 3 },
  { name: 'まとめ買いボリューム値引き', count: 2 },
  { name: '端数処理値引き', count: 1 }
];
const DEFAULT_INVENTORY = [
  {
    id: 'inv_1',
    itemId: 'prod_1790317962497_3xgg',
    name: 'DP-5000　ベーシックセット　バッテリー２個',
    sku: 'DP-5000-B2',
    currentStock: 5,
    safetyStock: 2,
    unit: '式',
    unitCost: 180000,
    unitPrice: 268257,
    location: '本社倉庫 A-1',
    lastInDate: '2026-09-25',
    note: '主力構成商品',
    history: [
      { id: 'log_init_1', date: '2026-09-25', type: 'in', qty: 5, reason: '初期棚卸在庫登録', currentStock: 5, timestamp: new Date().toISOString() }
    ]
  },
  {
    id: 'inv_2',
    itemId: 'prod_1790320521317_adue',
    name: 'DP-MS　スプレッダー',
    sku: 'DP-MS-01',
    currentStock: 3,
    safetyStock: 1,
    unit: '個',
    unitCost: 40000,
    unitPrice: 59612,
    location: 'パーツ保管棚 B-2',
    lastInDate: '2026-09-25',
    note: '',
    history: [
      { id: 'log_init_2', date: '2026-09-25', type: 'in', qty: 3, reason: '初期棚卸在庫登録', currentStock: 3, timestamp: new Date().toISOString() }
    ]
  }
];
const DEFAULT_PURCHASE_MAPPINGS = {
  "スプレッダー": "inv_2",
  "ベーシックセット": "inv_1"
};

/**
 * 商品マスタの重複を自動統合・サンプルのパージを実行
 * @param {Array} list
 * @returns {Array} 重複排除・クリーンアップ済みリスト
 */
function deduplicateItemMasterList(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();

  for (const item of list) {
    if (!item || !item.name) continue;
    const cleanName = (item.name || '').trim();
    if (!cleanName) continue;
    const key = getMasterKey(cleanName);
    if (!key) continue;

    // サンプル商品は自動パージ（完全排除）
    if (SAMPLE_ITEM_KEYS.has(key)) continue;

    if (!map.has(key)) {
      map.set(key, { ...item });
    } else {
      const existing = map.get(key);
      const isExistingRescued = !!(existing.rescued || (existing.note && existing.note.includes('自動復元')));
      const isItemRescued = !!(item.rescued || (item.note && item.note.includes('自動復元')));
      const totalUsage = (Number(existing.usageCount) || 0) + (Number(item.usageCount) || 0);

      let merged;
      if (isExistingRescued && !isItemRescued) {
        // 正規マスタを優先採用
        merged = { ...existing, ...item };
      } else if (!isExistingRescued && isItemRescued) {
        merged = { ...item, ...existing };
      } else {
        // どちらも同じ状態の場合は更新日が新しい方を優先
        const timeA = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const timeB = new Date(item.updatedAt || item.createdAt || 0).getTime();
        merged = timeB > timeA ? { ...existing, ...item } : { ...item, ...existing };
      }
      merged.usageCount = totalUsage;
      map.set(key, merged);
    }
  }

  return Array.from(map.values());
}

/**
 * 取引先マスタの重複を自動統合・サンプルのパージを実行
 * @param {Array} list
 * @returns {Array} 重複排除・クリーンアップ済みリスト
 */
function deduplicateClientMasterList(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();

  for (const client of list) {
    if (!client || !client.name) continue;
    const cleanName = (client.name || '').trim();
    if (!cleanName) continue;
    const key = getMasterKey(cleanName);
    if (!key) continue;

    // サンプル取引先は自動パージ（完全排除）
    if (SAMPLE_CLIENT_KEYS.has(key)) continue;

    if (!map.has(key)) {
      map.set(key, { ...client });
    } else {
      const existing = map.get(key);
      const isExistingRescued = !!(existing.rescued || (existing.note && existing.note.includes('自動復元')));
      const isClientRescued = !!(client.rescued || (client.note && client.note.includes('自動復元')));
      const totalUsage = (Number(existing.usageCount) || 0) + (Number(client.usageCount) || 0);

      let merged;
      if (isExistingRescued && !isClientRescued) {
        merged = { ...existing, ...client };
      } else if (!isExistingRescued && isClientRescued) {
        merged = { ...client, ...existing };
      } else {
        const timeA = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const timeB = new Date(client.updatedAt || client.createdAt || 0).getTime();
        merged = timeB > timeA ? { ...existing, ...client } : { ...client, ...existing };
      }
      merged.usageCount = totalUsage;
      map.set(key, merged);
    }
  }

  // タイムズ２４の重複統合（高崎郵便局駐車場を優先維持）
  const mergedList = Array.from(map.values());
  const hasDetailedTimes = mergedList.some(c => c.name && c.name.includes('高崎郵便局駐車場'));
  return hasDetailedTimes ? mergedList.filter(c => c.name !== 'タイムズ２４') : mergedList;
}

/**
 * 現在編集中の帳票を保存
 */
function saveActiveDoc(doc) {
  try {
    localStorageSetItemAndSync(KEYS.ACTIVE_DOC, JSON.stringify(doc));
    // サーバーファイル（data/invoices/active_doc.json）にも即時保存
    saveServerActiveDoc(doc).catch(e => {
      console.warn('Server active doc save failed:', e);
    });
  } catch (e) {
    console.error('Failed to save active doc to localStorage:', e);
  }
}

/**
 * 現在編集中の帳票を取得
 */
function loadActiveDoc() {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_DOC);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load active doc:', e);
    return null;
  }
}

/**
 * 自社プロファイルを保存（次回作成時に自動反映）
 */
function saveIssuerProfile(issuer) {
  try {
    localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(issuer));
    // サーバーファイル（data/issuer_profile.json）にも即時保存
    saveServerIssuerProfile(issuer).catch(e => {
      console.warn('Server issuer profile save failed:', e);
    });
  } catch (e) {
    console.error('Failed to save issuer profile:', e);
  }
}

/**
 * 自社プロファイルを取得
 */
function loadIssuerProfile() {
  try {
    const raw = localStorage.getItem(KEYS.ISSUER_PROFILE);
    const profile = raw ? JSON.parse(raw) : {};

    let modified = false;
    // 振込先情報および自社情報の消失防止フォールバック（サーバーの正真データと完全連動）
    if (!profile.bankInfo || profile.bankInfo.trim() === '' || profile.bankInfo.includes('サンプルショウジ') || profile.bankInfo.includes('みずほ銀行')) {
      profile.bankInfo = '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス';
      modified = true;
    }
    if (!profile.name || profile.name.trim() === '' || profile.name.includes('サンプル') || profile.name === 'スタジオ・ネクサス合同会社') {
      profile.name = '株式会社アルバワークス';
      profile.invoiceNumber = 'T2070001004966';
      profile.zip = '379-2144';
      profile.address = '群馬県前橋市下川町63-7';
      profile.tel = '027-289-0367';
      profile.fax = '027-289-0368';
      modified = true;
    }

    if (modified) {
      localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(profile));
      saveServerIssuerProfile(profile).catch(() => { });
    }

    return profile;
  } catch (e) {
    console.error('Failed to load issuer profile:', e);
    return {
      name: '株式会社アルバワークス',
      invoiceNumber: 'T2070001004966',
      zip: '379-2144',
      address: '群馬県前橋市下川町63-7',
      tel: '027-289-0367',
      fax: '027-289-0368',
      bankInfo: '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス'
    };
  }
}

/**
 * 書類履歴一覧を取得
 */
function getHistoryList() {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to get history list:', e);
    return [];
  }
}

/**
 * 書類を履歴に保存（新規追加または上書き）
 */
function saveDocToHistory(doc) {
  try {
    const list = getHistoryList();
    const existingIndex = list.findIndex(item => item.id === doc.id);

    // 金額・税金の計算
    let subtotal = 0;
    let taxTotal = 0;
    if (Array.isArray(doc.items)) {
      doc.items.forEach(it => {
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice) || 0;
        const lineTotal = qty * price;
        const rate = Number(it.taxRate !== undefined ? it.taxRate : 10);
        subtotal += lineTotal;
        taxTotal += Math.floor(lineTotal * (rate / 100));
      });
    }
    const grandTotal = subtotal + taxTotal;
    const isPaid = !!(doc.isPaid || doc.paymentStatus === 'paid');

    const summaryItem = {
      id: doc.id,
      docType: doc.docType || 'invoice',
      docNumber: doc.docNumber || '',
      title: doc.title || '',
      clientName: doc.client?.name || '名称未設定',
      client: doc.client || { name: '名称未設定' },
      issueDate: doc.issueDate || '',
      dueDate: doc.dueDate || '',
      items: doc.items || [],
      subtotal,
      taxTotal,
      grandTotal,
      isPaid,
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      paidDate: doc.paidDate || (isPaid ? new Date().toISOString().split('T')[0] : ''),
      isIssued: !!doc.isIssued,
      isCancelled: !!doc.isCancelled,
      issuedAt: doc.issuedAt || (doc.isIssued ? new Date().toISOString() : null),
      updatedAt: new Date().toISOString(),
      fullDoc: doc
    };

    if (existingIndex >= 0) {
      list[existingIndex] = summaryItem;
    } else {
      list.unshift(summaryItem);
    }

    // 最大50件まで保存
    if (list.length > 50) {
      list.length = 50;
    }

    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));
    // サーバーファイル（data/invoices/invoices_history.json）にも双方向マージ即時保存
    syncInvoicesHistoryWithServer().catch(e => {
      console.warn('Server invoices history sync failed:', e);
    });
    // 自社情報もプロファイルに保存
    if (doc.issuer) {
      saveIssuerProfile(doc.issuer);
    }
    // 伝票に含まれる商品や取引先を自動でマスタへ登録・蓄積
    autoRegisterMastersFromDoc(doc);
    return true;
  } catch (e) {
    console.error('Failed to save doc to history:', e);
    return false;
  }
}

/**
 * 履歴から書類を削除
 */
function deleteDocFromHistory(id) {
  try {
    const list = getHistoryList().filter(item => item.id !== id);
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));
    // サーバーファイル（data/invoices/invoices_history.json）にも即時保存
    saveServerInvoicesHistory(list).catch(e => {
      console.warn('Server invoices history delete save failed:', e);
    });
    return true;
  } catch (e) {
    console.error('Failed to delete doc from history:', e);
    return false;
  }
}

/**
 * 履歴から特定の書類を取得
 */
function getDocFromHistory(id) {
  const list = getHistoryList();
  const found = list.find(item => item.id === id);
  return found ? found.fullDoc : null;
}

/**
 * 書類履歴から商品マスタの使用回数マップを算出
 * @returns {Record<string, number>}
 */
function getItemMasterUsageMap() {
  const usageMap = {};
  const docHistory = getHistoryList();
  docHistory.forEach(docSummary => {
    const doc = docSummary.fullDoc;
    if (doc && Array.isArray(doc.items)) {
      doc.items.forEach(it => {
        const name = (it.name || '').trim();
        if (name) {
          usageMap[name] = (usageMap[name] || 0) + 1;
        }
      });
    }
  });
  return usageMap;
}

// ==========================================================================
// サーバー通信・マスタ永続化APIヘルパー（サブディレクトリ・WordPress・Python完全両対応）
// ==========================================================================
function getAppBaseDir() {
  if (typeof window === 'undefined' || !window.location) return '/';
  let path = window.location.pathname.split('?')[0].split('#')[0];
  if (/\.[a-zA-Z0-9]+$/.test(path)) {
    path = path.substring(0, path.lastIndexOf('/') + 1);
  } else if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
}
async function apiFetch(path, options = {}) {
  const clean = path.replace(/^\/?api\/?/, '').replace(/^\//, '');
  const dir = getAppBaseDir();

  // 候補URL順:
  // 1. /epr/api.php?endpoint= (WordPress/サブディレクトリ/Nginx/Apache全てで確実に到達)
  // 2. api.php?endpoint= (相対パス)
  // 3. /epr/api/... (相対パス・Rewrite環境)
  // 4. /api/... (ルート直下起動・Python環境)
  const candidates = [
    `${dir}api.php?endpoint=${clean}`,
    `api.php?endpoint=${clean}`,
    `${dir}api/${clean}`,
    `/api/${clean}`
  ];

  const fetchOpts = {
    credentials: 'same-origin',
    ...options
  };

  let lastErr = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, fetchOpts);
      if (res.status !== 404 && res.status !== 405) {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
  }
  if (lastErr) throw lastErr;
  return new Response(JSON.stringify({ error: 'Endpoint not reachable' }), { status: 404 });
}

if (typeof window !== 'undefined') {
  window.apiFetch = apiFetch;
}
async function fetchServerMasterItems() {
  try {
    const res = await apiFetch('master/items', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // オフラインまたは静的ファイル起動時
  }
  return null;
}
async function saveServerMasterItems(items) {
  try {
    const res = await apiFetch('master/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerMasterClients() {
  try {
    const res = await apiFetch('master/clients', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // オフラインまたは静的ファイル起動時
  }
  return null;
}
async function saveServerMasterClients(clients) {
  try {
    const res = await apiFetch('master/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clients)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerIssuerProfile() {
  try {
    const res = await apiFetch('issuer', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // オフラインまたは静的起動時
  }
  return null;
}
async function saveServerIssuerProfile(issuer) {
  try {
    const res = await apiFetch('issuer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issuer)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerAttendance() {
  try {
    const res = await apiFetch('attendance', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    // オフラインまたは静的起動時
  }
  return null;
}
async function saveServerAttendance(attendanceList) {
  try {
    console.log("【勤怠サーバー保存】実行開始", attendanceList);
    const res = await apiFetch('attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendanceList)
    });
    if (res.ok) {
      console.log("【勤怠サーバー保存】成功");
    } else {
      console.error("【勤怠サーバー保存】失敗 HTTPステータス:", res.status);
    }
    return res.ok;
  } catch (e) {
    console.error('【勤怠サーバー保存】通信エラー:', e);
    return false;
  }
}
async function fetchServerAttendanceEmployee() {
  try {
    const res = await apiFetch('attendance/employee', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // オフラインまたは静的起動時
  }
  return null;
}
async function saveServerAttendanceEmployee(empInfo) {
  try {
    const res = await apiFetch('attendance/employee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(empInfo)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function deleteServerAttendanceRecord(date = '', id = '') {
  try {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (id) params.set('id', id);
    const res = await apiFetch(`attendance?${params.toString()}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerInvoicesHistory() {
  try {
    const res = await apiFetch('invoices/history', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) { }
  return null;
}
async function saveServerInvoicesHistory(invoices) {
  try {
    const res = await apiFetch('invoices/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoices)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 請求書履歴の双方向スマートマージ同期
 * サーバーとローカルをIDキーで結合し、全ユーザー・全端末の書類履歴を確実に共有・保持
 */
async function syncInvoicesHistoryWithServer() {
  try {
    const serverInvoices = await fetchServerInvoicesHistory();
    const localInvoices = getHistoryList();

    const invoiceMap = new Map();

    // 1. ローカル履歴を取り込み
    if (Array.isArray(localInvoices)) {
      localInvoices.forEach(inv => {
        if (inv && inv.id) {
          invoiceMap.set(inv.id, inv);
        }
      });
    }

    // 2. サーバー履歴を取り込み（更新日時またはサーバー側データをスマートマージ）
    if (Array.isArray(serverInvoices)) {
      serverInvoices.forEach(sinv => {
        if (sinv && sinv.id) {
          const existing = invoiceMap.get(sinv.id);
          if (!existing) {
            invoiceMap.set(sinv.id, sinv);
          } else {
            const serverDate = new Date(sinv.updatedAt || sinv.issuedAt || sinv.issueDate || 0).getTime();
            const localDate = new Date(existing.updatedAt || existing.issuedAt || existing.issueDate || 0).getTime();
            if (serverDate >= localDate) {
              invoiceMap.set(sinv.id, sinv);
            }
          }
        }
      });
    }

    // 3. 発行日降順にソート
    const mergedList = Array.from(invoiceMap.values()).sort((a, b) => {
      const dateA = a.issueDate || a.updatedAt || '';
      const dateB = b.issueDate || b.updatedAt || '';
      return dateB.localeCompare(dateA);
    });

    // 4. ローカルストレージに保存
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(mergedList));

    // 5. サーバーへもマージ後全件を保存して同期整合性を担保
    await saveServerInvoicesHistory(mergedList);

    return mergedList;
  } catch (e) {
    console.warn('Sync invoices history with server failed:', e);
    return getHistoryList();
  }
}
async function fetchServerActiveDoc() {
  try {
    const res = await apiFetch('invoices/active', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) { }
  return null;
}
async function saveServerActiveDoc(doc) {
  try {
    const res = await apiFetch('invoices/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerExpenses() {
  try {
    const res = await apiFetch('expenses', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) { }
  return null;
}
async function saveServerExpenses(expenses) {
  try {
    const res = await apiFetch('expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenses)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 経費データのサーバー双方向同期（全端末・他ユーザー間での完全共有）
 * @returns {Promise<Array>} 最新マージ済み経費リスト
 */
async function syncExpensesWithServer() {
  try {
    const serverList = await fetchServerExpenses();
    const localList = getAllExpenseList();

    if (!serverList || !Array.isArray(serverList)) {
      return localList;
    }

    const mergedMap = new Map();

    // 1. サーバー側のデータを追加
    serverList.forEach(item => {
      if (item && item.id) {
        mergedMap.set(item.id, item);
      }
    });

    // 2. ローカル側のデータをスマートマージ
    let hasLocalChanges = false;
    localList.forEach(item => {
      if (!item || !item.id) return;
      if (!mergedMap.has(item.id)) {
        mergedMap.set(item.id, item);
        hasLocalChanges = true;
      } else {
        const serverItem = mergedMap.get(item.id);
        const localTime = new Date(item.updatedAt || item.date || 0).getTime();
        const serverTime = new Date(serverItem.updatedAt || serverItem.date || 0).getTime();
        if (localTime > serverTime) {
          mergedMap.set(item.id, item);
          hasLocalChanges = true;
        }
      }
    });

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      return (b.date || '').localeCompare(a.date || '') || (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

    // ローカルストレージに最新一覧を保存
    localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(mergedList));

    // サーバーに未反映のデータがある場合は保存
    if (hasLocalChanges || mergedList.length !== serverList.length) {
      saveServerExpenses(mergedList).catch(e => {
        console.warn('Failed to push merged expenses to server:', e);
      });
    }

    return mergedList;
  } catch (err) {
    console.warn('syncExpensesWithServer error:', err);
    return getAllExpenseList();
  }
}

/**
 * 商品マスタ一覧を取得（デフォルトで頻度の多い順にソート）
 * @param {boolean} sortByFrequency 使用頻度の多い順にソートするかどうか
 */
function getItemMasterList(sortByFrequency = true) {
  try {
    const raw = localStorage.getItem(KEYS.ITEM_MASTER);
    let list = [];
    if (!raw) {
      saveItemMasterList(DEFAULT_ITEMS_MASTER);
      list = [...DEFAULT_ITEMS_MASTER];
    } else {
      list = JSON.parse(raw);
    }

    // 重複およびサンプルの自動クリーンアップ（デデュプリケーション）
    if (Array.isArray(list)) {
      const cleanList = deduplicateItemMasterList(list);
      if (cleanList.length !== list.length) {
        localStorageSetItemAndSync(KEYS.ITEM_MASTER, JSON.stringify(cleanList));
        saveServerMasterItems(cleanList).catch(() => { });
        list = cleanList;
      } else {
        list = cleanList;
      }
    } else if (list && typeof list === 'object') {
      list = Object.values(list);
    } else {
      list = [];
    }

    if (sortByFrequency) {
      const historyUsage = getItemMasterUsageMap();
      list.sort((a, b) => {
        const countA = (Number(a.usageCount) || 0) + (historyUsage[(a.name || '').trim()] || 0);
        const countB = (Number(b.usageCount) || 0) + (historyUsage[(b.name || '').trim()] || 0);
        if (countB !== countA) return countB - countA;
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      });
    }
    return list;
  } catch (e) {
    console.error('Failed to get item master list:', e);
    return [...DEFAULT_ITEMS_MASTER];
  }
}

/**
 * 商品マスタ一覧を保存（LocalStorageとサーバーファイル data/items_master.json の両方に永続化）
 */
function saveItemMasterList(list) {
  try {
    const cleanList = deduplicateItemMasterList(list);
    localStorageSetItemAndSync(KEYS.ITEM_MASTER, JSON.stringify(cleanList));
    // サーバーファイルにも即時非同期保存（二度と消えないようにする）
    saveServerMasterItems(cleanList).catch(err => {
      console.warn('Server item master save failed:', err);
    });
    return true;
  } catch (e) {
    console.error('Failed to save item master list:', e);
    return false;
  }
}

/**
 * 商品マスタの使用回数を記録（伝票へ追加時等）
 */
function recordItemMasterUsage(itemId, itemName) {
  try {
    const list = getItemMasterList(false);
    const targetKey = itemName ? getMasterKey(itemName) : '';
    const target = list.find(i => (itemId && i.id === itemId) || (targetKey && getMasterKey(i.name) === targetKey));
    if (target) {
      target.usageCount = (Number(target.usageCount) || 0) + 1;
      target.lastUsedAt = new Date().toISOString();
      saveItemMasterList(list);
    }
  } catch (e) {
    console.error('Failed to record item master usage:', e);
  }
}

/**
 * 商品マスタに商品を追加（または上書き）
 */
function saveItemToMaster(item) {
  try {
    const list = getItemMasterList(false);
    const cleanName = (item.name || '').trim();
    if (!cleanName) return null;
    const itemKey = getMasterKey(cleanName);

    // IDまたは正規化品名で既存商品を特定（スペース揺れ等による重複を完全防止）
    const existingIndex = list.findIndex(i => (item.id && i.id === item.id) || (getMasterKey(i.name) === itemKey));
    const now = new Date().toISOString();

    let savedItem = null;
    if (existingIndex >= 0) {
      list[existingIndex] = {
        ...list[existingIndex],
        ...item,
        name: cleanName,
        sku: item.sku !== undefined ? item.sku : (list[existingIndex].sku || ''),
        unitPrice: Number(item.unitPrice !== undefined ? item.unitPrice : list[existingIndex].unitPrice) || 0,
        userPrice: Number(item.userPrice !== undefined ? item.userPrice : list[existingIndex].userPrice) || 0,
        unit: item.unit || list[existingIndex].unit || '式',
        taxRate: item.taxRate !== undefined ? Number(item.taxRate) : (list[existingIndex].taxRate ?? 10),
        note: item.note !== undefined ? item.note : (list[existingIndex].note || ''),
        updatedAt: now
      };
      savedItem = list[existingIndex];
    } else {
      const newItem = {
        id: item.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
        name: cleanName,
        sku: item.sku || '',
        unitPrice: Number(item.unitPrice) || 0,
        userPrice: Number(item.userPrice !== undefined ? item.userPrice : item.unitPrice) || 0,
        unit: item.unit || '式',
        taxRate: item.taxRate !== undefined ? Number(item.taxRate) : 10,
        note: item.note || '',
        usageCount: Number(item.usageCount) || 0,
        createdAt: now,
        updatedAt: now
      };
      list.unshift(newItem);
      savedItem = newItem;
    }
    saveItemMasterList(list);
    return savedItem;
  } catch (e) {
    console.error('Failed to save item to master:', e);
    return false;
  }
}

/**
 * 商品マスタから商品を削除
 */
function deleteItemFromMaster(id) {
  try {
    const list = getItemMasterList(false).filter(i => i.id !== id);
    saveItemMasterList(list);
    return true;
  } catch (e) {
    console.error('Failed to delete item from master:', e);
    return false;
  }
}

// ==========================================================================
// 取引先マスタ管理
// ==========================================================================

/**
 * 過去の書類履歴および経費履歴から取引先ごとの登場頻度マップを集計
 */
function getClientMasterUsageMap() {
  const usageMap = {};
  try {
    const docHistory = getHistoryList();
    docHistory.forEach(docSummary => {
      const name = (docSummary.clientName || '').trim();
      if (name && name !== '名称未設定') {
        usageMap[name] = (usageMap[name] || 0) + 1;
      }
    });

    const expenses = getExpenseList();
    expenses.forEach(exp => {
      const payee = (exp.payee || '').trim();
      if (payee) {
        usageMap[payee] = (usageMap[payee] || 0) + 1;
      }
    });
  } catch (e) {
    console.error('Failed to get client master usage map:', e);
  }
  return usageMap;
}

/**
 * 取引先マスタ一覧を取得（デフォルトで利用頻度順にソート）
 * @param {boolean} sortByFrequency 
 */
function getClientMasterList(sortByFrequency = true) {
  try {
    const raw = localStorage.getItem(KEYS.CLIENT_MASTER);
    let list = [];
    if (!raw) {
      saveClientMasterList(DEFAULT_CLIENT_MASTER);
      list = [...DEFAULT_CLIENT_MASTER];
    } else {
      list = JSON.parse(raw);
    }

    // 重複およびサンプルの自動クリーンアップ（デデュプリケーション）
    if (Array.isArray(list)) {
      const cleanList = deduplicateClientMasterList(list);
      if (cleanList.length !== list.length) {
        localStorageSetItemAndSync(KEYS.CLIENT_MASTER, JSON.stringify(cleanList));
        saveServerMasterClients(cleanList).catch(() => { });
        list = cleanList;
      } else {
        list = cleanList;
      }
    } else if (list && typeof list === 'object') {
      list = Object.values(list);
    } else {
      list = [];
    }

    if (sortByFrequency) {
      const historyUsage = getClientMasterUsageMap();
      list.sort((a, b) => {
        const countA = (Number(a.usageCount) || 0) + (historyUsage[(a.name || '').trim()] || 0);
        const countB = (Number(b.usageCount) || 0) + (historyUsage[(b.name || '').trim()] || 0);
        if (countB !== countA) return countB - countA;
        return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
      });
    }
    return list;
  } catch (e) {
    console.error('Failed to get client master list:', e);
    return [...DEFAULT_CLIENT_MASTER];
  }
}

/**
 * 取引先マスタ一覧を保存（LocalStorageとサーバーファイル data/clients_master.json の両方に永続化）
 */
function saveClientMasterList(list) {
  try {
    const cleanList = deduplicateClientMasterList(list);
    localStorageSetItemAndSync(KEYS.CLIENT_MASTER, JSON.stringify(cleanList));
    // サーバーファイルにも即時非同期保存（二度と消えないようにする）
    saveServerMasterClients(cleanList).catch(err => {
      console.warn('Server client master save failed:', err);
    });
    return true;
  } catch (e) {
    console.error('Failed to save client master list:', e);
    return false;
  }
}

/**
 * 過去の書類履歴や作成中の伝票、経費データから消失した商品や取引先を自動救済・復元
 * @returns {{rescuedItems: number, rescuedClients: number}}
 */
function rescueMastersFromHistory() {
  // ユーザーが明示的に削除したマスタが再読み込みで勝手に復活してしまう問題を回避するため、
  // 過去伝票からの自動復元機能を無効化します。
  return { items: 0, clients: 0 };
  
  let rescuedItems = 0;
  let rescuedClients = 0;

  try {
    const history = getHistoryList();
    const activeDoc = loadActiveDoc();
    const allDocs = [...history.map(h => h.fullDoc).filter(Boolean)];
    if (activeDoc) allDocs.push(activeDoc);

    // 1. 商品マスタの自動救済（サンプル伝票やサンプル商品は除外）
    const currentItems = getItemMasterList(false);
    const existingItemKeys = new Set(currentItems.map(i => getMasterKey(i.name)));
    const itemsToAdd = [];

    allDocs.forEach(doc => {
      // サンプル伝票は救済対象外としてスキップ
      if (doc.id && String(doc.id).startsWith('sample_')) return;
      if (doc.client && SAMPLE_CLIENT_KEYS.has(getMasterKey(doc.client.name))) return;

      if (Array.isArray(doc.items)) {
        doc.items.forEach(it => {
          const rawName = (it.name || '').trim();
          if (!rawName) return;
          const key = getMasterKey(rawName);
          if (!key) return;

          // サンプル商品や既にマスタに存在するものは除外
          if (SAMPLE_ITEM_KEYS.has(key) || existingItemKeys.has(key)) return;

          existingItemKeys.add(key);
          const newItem = {
            id: 'rescued_item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: rawName,
            unitPrice: Number(it.unitPrice) || 0,
            userPrice: Number(it.userPrice !== undefined ? it.userPrice : it.unitPrice) || 0,
            unit: it.unit || '式',
            taxRate: it.taxRate !== undefined ? Number(it.taxRate) : 10,
            note: it.note ? String(it.note) : '過去伝票より自動復元',
            usageCount: 1,
            createdAt: doc.updatedAt || doc.issueDate || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            rescued: true
          };
          itemsToAdd.push(newItem);
          rescuedItems++;
        });
      }
    });

    if (itemsToAdd.length > 0) {
      const mergedItems = deduplicateItemMasterList([...itemsToAdd, ...currentItems]);
      saveItemMasterList(mergedItems);
      console.log(`[マスタ救済復元] 過去の伝票履歴から ${itemsToAdd.length} 件の商品マスタを自動復元しました！`, itemsToAdd.map(i => i.name));
    }

    // 2. 取引先マスタの自動救済
    const currentClients = getClientMasterList(false);
    const existingClientKeys = new Set(currentClients.map(c => getMasterKey(c.name)));
    const clientsToAdd = [];

    allDocs.forEach(doc => {
      if (doc.id && String(doc.id).startsWith('sample_')) return;
      const c = doc.client;
      if (c && c.name) {
        const rawName = c.name.trim();
        if (!rawName || rawName === '名称未設定') return;
        const key = getMasterKey(rawName);
        if (!key) return;

        // サンプル取引先や既にマスタに存在するものは除外
        if (SAMPLE_CLIENT_KEYS.has(key) || existingClientKeys.has(key)) return;

        existingClientKeys.add(key);
        const newClient = {
          id: 'rescued_client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: rawName,
          code: c.code || '',
          honorific: c.honorific || '御中',
          zip: c.zip || '',
          address: c.address || '',
          contactPerson: c.contactPerson || '',
          tel: c.tel || '',
          email: c.email || '',
          invoiceNumber: c.invoiceNumber || '',
          category: 'customer',
          closingDay: c.closingDay || '末日',
          paymentTerms: c.paymentTerms || '翌月末',
          note: '過去伝票より自動復元',
          usageCount: 1,
          createdAt: doc.updatedAt || doc.issueDate || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rescued: true
        };
        clientsToAdd.push(newClient);
        rescuedClients++;
      }
    });

    // 経費（支払先）からも取引先（vendor）を救済
    try {
      const expenses = getExpenseList();
      expenses.forEach(exp => {
        const payee = (exp.payee || '').trim();
        if (!payee) return;
        const key = getMasterKey(payee);
        if (!key || SAMPLE_CLIENT_KEYS.has(key) || existingClientKeys.has(key)) return;

        existingClientKeys.add(key);
        const newVendor = {
          id: 'rescued_vendor_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: payee,
          code: '',
          honorific: '御中',
          zip: '',
          address: '',
          contactPerson: '',
          tel: '',
          email: '',
          invoiceNumber: exp.invoiceNumber || '',
          category: 'vendor',
          closingDay: '都度',
          paymentTerms: '即時精算',
          note: '過去経費より自動復元',
          usageCount: 1,
          createdAt: exp.date || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rescued: true
        };
        clientsToAdd.push(newVendor);
        rescuedClients++;
      });
    } catch (e) {
      // 経費リスト取得エラー時はスキップ
    }

    if (clientsToAdd.length > 0) {
      const mergedClients = deduplicateClientMasterList([...clientsToAdd, ...currentClients]);
      saveClientMasterList(mergedClients);
      console.log(`[マスタ救済復元] 過去の履歴から ${clientsToAdd.length} 件の取引先マスタを自動復元しました！`, clientsToAdd.map(c => c.name));
    }

    // 3. 自社プロファイル・振込先情報の同期確認
    const currentProfile = loadIssuerProfile() || {};
    if (!currentProfile.bankInfo || currentProfile.bankInfo.trim() === '') {
      fetchServerIssuerProfile().then(srvProfile => {
        if (srvProfile && srvProfile.bankInfo && srvProfile.bankInfo.trim() !== '') {
          currentProfile.bankInfo = srvProfile.bankInfo;
          saveIssuerProfile(currentProfile);
          console.log('[自社プロファイル救済] 振込先情報をサーバーファイルから復元・同期しました');
        }
      }).catch(() => { });
    }

  } catch (e) {
    console.error('Failed to rescue masters from history:', e);
  }

  return { rescuedItems, rescuedClients };
}

/**
 * サーバーファイル（data/items_master.json, data/clients_master.json）とローカルマスタを双方向同期
 */
async function syncMastersWithServer() {
  try {
    // 1. 商品マスタの同期
    const serverItems = await fetchServerMasterItems();
    if (serverItems && Array.isArray(serverItems)) {
      // サーバーを正としてローカルを上書き（1対1の同期）
      const validItems = serverItems.filter(i => !SAMPLE_ITEM_KEYS.has(getMasterKey(i.name)));
      const mergedItems = deduplicateItemMasterList(validItems);
      // LocalStorageを更新
      localStorageSetItemAndSync(KEYS.ITEM_MASTER, JSON.stringify(mergedItems));
      console.log(`[マスタ同期完了] 商品マスタ: サーバーの全 ${mergedItems.length} 件でローカルを上書き同期しました`);
    } else {
      // サーバー上にまだファイルがない場合、ローカルの内容をサーバーへ書き込み
      const localItems = getItemMasterList(false);
      await saveServerMasterItems(localItems);
    }

    // 2. 取引先マスタの同期
    const serverClients = await fetchServerMasterClients();
    if (serverClients && Array.isArray(serverClients)) {
      // サーバーを正としてローカルを上書き（1対1の同期）
      const validClients = serverClients.filter(c => !SAMPLE_CLIENT_KEYS.has(getMasterKey(c.name)));
      const finalClients = deduplicateClientMasterList(validClients);
      localStorageSetItemAndSync(KEYS.CLIENT_MASTER, JSON.stringify(finalClients));
      console.log(`[マスタ同期完了] 取引先マスタ: サーバーの全 ${finalClients.length} 件でローカルを上書き同期しました`);
    } else {
      const localClients = getClientMasterList(false);
      await saveServerMasterClients(localClients);
    }

    // 3. 自社プロファイル（振込先情報）の同期
    try {
      const serverIssuer = await fetchServerIssuerProfile();
      const localIssuer = loadIssuerProfile() || {};

      let finalBankInfo = '';
      if (serverIssuer && serverIssuer.bankInfo && serverIssuer.bankInfo.trim() !== '') {
        finalBankInfo = serverIssuer.bankInfo;
      } else if (localIssuer && localIssuer.bankInfo && localIssuer.bankInfo.trim() !== '') {
        finalBankInfo = localIssuer.bankInfo;
      }

      const defaultTemplateIssuer = {
        name: '株式会社アルバワークス',
        invoiceNumber: 'T2070001004966',
        zip: '379-2144',
        address: '群馬県前橋市下川町63-7',
        tel: '027-289-0367',
        fax: '027-289-0368',
        email: '',
        stampDataUrl: '',
        showStamp: true,
        bankInfo: '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス'
      };

      const mergedIssuer = {
        ...defaultTemplateIssuer,
        ...localIssuer,
        ...(serverIssuer || {})
      };
      if (finalBankInfo) {
        mergedIssuer.bankInfo = finalBankInfo;
      }

      localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(mergedIssuer));
      await saveServerIssuerProfile(mergedIssuer);
      console.log(`[マスタ同期完了] 自社プロファイル（振込先情報含む）をサーバー・ローカルで完全同期しました`);
    } catch (issuerErr) {
      console.warn('Sync issuer profile error:', issuerErr);
    }

    // 4. 勤怠打刻データ（data/attendance/attendance.json）の1対1整合性同期
    try {
      const serverAttendance = await fetchServerAttendance();
      if (serverAttendance && Array.isArray(serverAttendance) && serverAttendance.length > 0) {
        // サーバーファイルを真実のマスター（Source of Truth）として1対1同期
        // 【復元ガード】上書き前にローカルの既存データをバックアップ保存
        const existingData = localStorage.getItem(KEYS.ATTENDANCE);
        if (existingData && existingData !== '[]') {
          localStorage.setItem(KEYS.ATTENDANCE + '_backup', existingData);
        }

        serverAttendance.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(serverAttendance));
        console.log(`[勤怠同期完了] 勤怠データ: 全 ${serverAttendance.length} 件をサーバー・ローカル間で1対1完全同期しました`);
      } else {
        console.warn("サーバーデータが0件または取得エラーのため既存データを維持します。");
        // もしローカルにデータがあればサーバーへ送信して復旧
        const localAttendance = getAttendanceList();
        if (localAttendance.length > 0) {
          console.log("ローカルデータをサーバーにプッシュして復旧します。");
          await saveServerAttendance(localAttendance);
        } else {
          // ローカルも空の場合、バックアップから復元を試みる
          const backupData = localStorage.getItem(KEYS.ATTENDANCE + '_backup');
          if (backupData && backupData !== '[]') {
            console.log("バックアップから勤怠データを復元しました。");
            localStorageSetItemAndSync(KEYS.ATTENDANCE, backupData);
            await saveServerAttendance(JSON.parse(backupData));
          }
        }
      }
    } catch (attErr) {
      console.warn('Sync attendance error:', attErr);
    }

    // 5. 勤怠社員情報（data/attendance_employee.json）の双方向同期
    try {
      const serverEmp = await fetchServerAttendanceEmployee();
      const localEmp = getAttendanceEmployee();

      let finalEmp = { empNo: '2', empName: '宮崎真輔' };
      if (serverEmp && serverEmp.empName && serverEmp.empName !== '山田 一郎') {
        finalEmp = { ...serverEmp };
      } else if (localEmp && localEmp.empName && localEmp.empName !== '山田 一郎') {
        finalEmp = { ...localEmp };
      }
      if (!finalEmp.empNo || finalEmp.empNo === '1111') {
        finalEmp.empNo = '2';
      }

      localStorageSetItemAndSync(KEYS.ATTENDANCE_EMPLOYEE, JSON.stringify(finalEmp));
      await saveServerAttendanceEmployee(finalEmp);
      console.log(`[勤怠同期完了] 勤怠社員情報（氏名: ${finalEmp.empName}）をサーバー・ローカルで同期しました`);
    } catch (empErr) {
      console.warn('Sync attendance employee error:', empErr);
    }

    // 6. 給与明細レコード（data/payroll/payroll_records.json）の双方向同期
    try {
      const serverPayRecords = await fetchServerPayrollRecords();
      const localPayRecords = getPayrollRecords();

      if (serverPayRecords && serverPayRecords.length > 0) {
        localStorageSetItemAndSync(KEYS.PAYROLL_RECORDS, JSON.stringify(serverPayRecords));
      } else if (localPayRecords.length > 0) {
        await saveServerPayrollRecords(localPayRecords);
      }
    } catch (payErr) {
      console.warn('Sync payroll records error:', payErr);
    }

    // 7. 給与計算設定（data/payroll/payroll_settings.json）の双方向同期
    try {
      const serverPaySettings = await fetchServerPayrollSettings();
      const localPaySettings = getPayrollSettings();

      if (serverPaySettings && serverPaySettings.empNo) {
        localStorageSetItemAndSync(KEYS.PAYROLL_SETTINGS, JSON.stringify(serverPaySettings));
      } else if (localPaySettings && localPaySettings.empNo) {
        await saveServerPayrollSettings(localPaySettings);
      }
    } catch (setErr) {
      console.warn('Sync payroll settings error:', setErr);
    }

    // 7-2. 前年所得・明細データ（data/payroll/previous_year_income.json）の双方向同期
    try {
      const serverPrevIncome = await fetchServerPreviousYearIncome();
      const localPrevIncome = getPreviousYearIncome();

      if (serverPrevIncome && serverPrevIncome.targetYear) {
        localStorageSetItemAndSync(KEYS.PREVIOUS_YEAR_INCOME, JSON.stringify(serverPrevIncome));
      } else if (localPrevIncome && localPrevIncome.targetYear) {
        await saveServerPreviousYearIncome(localPrevIncome);
      }
    } catch (prevErr) {
      console.warn('Sync previous year income error:', prevErr);
    }

    // 8. 請求書履歴（data/invoices/invoices_history.json）の同期
    try {
      const syncedHistory = await syncInvoicesHistoryWithServer();
      console.log(`[請求書同期完了] 請求書履歴: 全 ${syncedHistory.length} 件をサーバー・ローカル間で双方向同期しました`);
    } catch (invErr) {
      console.warn('Sync invoices history error:', invErr);
    }

    // 9. アクティブ伝票（data/invoices/active_doc.json）の同期
    try {
      const serverActiveDoc = await fetchServerActiveDoc();
      const localActiveDoc = loadActiveDoc();

      if (serverActiveDoc) {
        localStorageSetItemAndSync(KEYS.ACTIVE_DOC, JSON.stringify(serverActiveDoc));
      } else if (localActiveDoc) {
        await saveServerActiveDoc(localActiveDoc);
      }
    } catch (actErr) {
      console.warn('Sync active doc error:', actErr);
    }

    // 10. 経費データ（data/expenses/expenses.json）の同期
    try {
      const synced = await syncExpensesWithServer();
      console.log(`[経費同期完了] 経費データ: 全 ${synced.length} 件をサーバー・ローカル間で双方向同期しました`);
    } catch (expErr) {
      console.warn('Sync expenses error:', expErr);
    }

    return true;
  } catch (e) {
    console.warn('Sync masters with server failed (offline mode):', e);
    return false;
  }
}

/**
 * 伝票データから商品マスタ・取引先マスタへ自動蓄積（作成するほどマスタが自動成長）
 */
function autoRegisterMastersFromDoc(doc) {
  if (!doc) return;
  try {
    // 取引先の自動マスタ登録
    if (doc.client && doc.client.name && doc.client.name.trim() && doc.client.name.trim() !== '名称未設定') {
      saveClientToMaster({
        name: doc.client.name.trim(),
        code: doc.client.code || '',
        honorific: doc.client.honorific || '御中',
        zip: doc.client.zip || '',
        address: doc.client.address || '',
        contactPerson: doc.client.contactPerson || '',
        tel: doc.client.tel || '',
        email: doc.client.email || '',
        invoiceNumber: doc.client.invoiceNumber || '',
        category: 'customer'
      });
    }

    // 商品明細の自動マスタ登録（サンプル商品は除外）
    if (Array.isArray(doc.items)) {
      doc.items.forEach(it => {
        const name = (it.name || '').trim();
        if (name && !SAMPLE_ITEM_KEYS.has(getMasterKey(name))) {
          saveItemToMaster({
            name: name,
            unitPrice: Number(it.unitPrice) || 0,
            userPrice: Number(it.userPrice !== undefined ? it.userPrice : it.unitPrice) || 0,
            unit: it.unit || '式',
            taxRate: it.taxRate !== undefined ? Number(it.taxRate) : 10,
            note: it.note || ''
          });
        }
      });
    }
  } catch (e) {
    console.error('Failed to auto register masters from doc:', e);
  }
}

/**
 * アプリ起動時のマスタ永続化＆自動復元統合初期化
 */
async function initMastersPersistence() {
  // 1. サーバー（PCディスク）との双方向同期を最優先で安全に実行（本番マスターを確実に取り込む）
  await syncMastersWithServer();
  // 2. その後、万が一失われた商品・取引先があれば過去伝票から安全に救済
  const rescueResult = rescueMastersFromHistory();
  return rescueResult;
}

/**
 * 取引先マスタに取引先を追加（または上書き）
 */
function saveClientToMaster(client) {
  try {
    const list = getClientMasterList(false);
    const id = client.id || ('client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const cleanName = (client.name || '').trim();
    if (!cleanName) return null;
    const clientKey = getMasterKey(cleanName);

    const existingIndex = list.findIndex(c => c.id === id || (c.name && getMasterKey(c.name) === clientKey));
    const now = new Date().toISOString();

    const clientRecord = {
      id: existingIndex >= 0 ? list[existingIndex].id : id,
      name: cleanName,
      code: client.code ? String(client.code).trim() : (existingIndex >= 0 ? list[existingIndex].code : ''),
      honorific: client.honorific !== undefined ? client.honorific : '御中',
      zip: client.zip ? String(client.zip).trim() : '',
      address: client.address ? String(client.address).trim() : '',
      contactPerson: client.contactPerson ? String(client.contactPerson).trim() : '',
      tel: client.tel ? String(client.tel).trim() : '',
      email: client.email ? String(client.email).trim() : '',
      invoiceNumber: client.invoiceNumber ? String(client.invoiceNumber).trim().toUpperCase() : '',
      category: client.category || 'customer', // 'customer' | 'vendor' | 'both'
      closingDay: client.closingDay ? String(client.closingDay).trim() : '末日',
      paymentTerms: client.paymentTerms ? String(client.paymentTerms).trim() : '翌月末',
      note: client.note ? String(client.note).trim() : '',
      usageCount: existingIndex >= 0 ? (Number(list[existingIndex].usageCount) || 0) : 0,
      createdAt: existingIndex >= 0 ? (list[existingIndex].createdAt || now) : now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...clientRecord };
    } else {
      list.unshift(clientRecord);
    }

    saveClientMasterList(list);
    return clientRecord;
  } catch (e) {
    console.error('Failed to save client to master:', e);
    return null;
  }
}

/**
 * 取引先マスタから取引先を削除
 */
function deleteClientFromMaster(id) {
  try {
    const list = getClientMasterList(false).filter(c => c.id !== id);
    saveClientMasterList(list);
    return true;
  } catch (e) {
    console.error('Failed to delete client from master:', e);
    return false;
  }
}

/**
 * 取引先マスタの使用実績を記録
 */
function recordClientMasterUsage(clientId, clientName) {
  try {
    const list = getClientMasterList(false);
    const target = list.find(c => (clientId && c.id === clientId) || (clientName && (c.name || '').trim() === clientName.trim()));
    if (target) {
      target.usageCount = (Number(target.usageCount) || 0) + 1;
      target.lastUsedAt = new Date().toISOString();
      saveClientMasterList(list);
    }
  } catch (e) {
    console.error('Failed to record client master usage:', e);
  }
}

/**
 * 名前で取引先マスタを検索（完全一致または部分一致）
 */
function findClientByName(name) {
  if (!name) return null;
  const list = getClientMasterList(false);
  const key = getMasterKey(name);
  if (!key) return null;
  return list.find(c => getMasterKey(c.name) === key) ||
    list.find(c => getMasterKey(c.name).includes(key)) || null;
}


/**
 * 品名ごとのユーザー価格履歴マップを取得
 */
function getUserPriceHistoryMap() {
  try {
    const raw = localStorage.getItem(KEYS.USER_PRICE_HISTORY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to get user price history map:', e);
    return {};
  }
}

/**
 * ユーザー価格の使用実績を記録
 */
function recordUserPrice(itemName, price) {
  if (!itemName || !price || Number(price) <= 0) return;
  const cleanName = itemName.trim();
  const numPrice = Number(price);
  try {
    const map = getUserPriceHistoryMap();
    if (!map[cleanName]) {
      map[cleanName] = [];
    }
    const existing = map[cleanName].find(p => p.price === numPrice);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
      existing.lastUsed = new Date().toISOString();
    } else {
      map[cleanName].push({
        price: numPrice,
        count: 1,
        lastUsed: new Date().toISOString()
      });
    }
    map[cleanName].sort((a, b) => b.count - a.count);
    if (map[cleanName].length > 20) {
      map[cleanName].length = 20;
    }
    localStorageSetItemAndSync(KEYS.USER_PRICE_HISTORY, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to record user price:', e);
  }
}

/**
 * 特定の品名における過去のユーザー価格履歴を頻度の多い順で取得
 * 過去の書類履歴（getHistoryList）や商品マスタからも集約して統合！
 * @param {string} itemName 品名
 * @returns {Array<{price: number, count: number, label: string}>} 頻度の多い順
 */
function getUserPriceHistoryForItem(itemName = '') {
  const cleanName = (itemName || '').trim().toLowerCase();
  const priceCountMap = new Map(); // price => count

  // 1. 専用履歴マップから取得
  const map = getUserPriceHistoryMap();
  for (const [name, list] of Object.entries(map)) {
    const n = name.trim().toLowerCase();
    const isMatch = !cleanName || n === cleanName || n.includes(cleanName) || cleanName.includes(n);
    if (isMatch && Array.isArray(list)) {
      list.forEach(item => {
        const p = Number(item.price);
        if (p > 0) {
          priceCountMap.set(p, (priceCountMap.get(p) || 0) + (item.count || 1));
        }
      });
    }
  }

  // 2. 過去の書類履歴（getHistoryList）から集約
  const docHistory = getHistoryList();
  docHistory.forEach(docSummary => {
    const doc = docSummary.fullDoc;
    if (doc && Array.isArray(doc.items)) {
      doc.items.forEach(it => {
        const itName = (it.name || '').trim().toLowerCase();
        const isMatch = !cleanName || itName === cleanName || itName.includes(cleanName) || cleanName.includes(itName);
        if (isMatch) {
          const up = Number(it.userPrice);
          if (up > 0) {
            priceCountMap.set(up, (priceCountMap.get(up) || 0) + 1);
          }
        }
      });
    }
  });

  // 3. 商品マスタからも集約
  const masterList = getItemMasterList(false);
  masterList.forEach(m => {
    const mName = (m.name || '').trim().toLowerCase();
    const isMatch = !cleanName || mName === cleanName || mName.includes(cleanName) || cleanName.includes(mName);
    if (isMatch) {
      const up = Number(m.userPrice);
      if (up > 0) {
        priceCountMap.set(up, (priceCountMap.get(up) || 0) + 1);
      }
    }
  });

  // 配列に変換して頻度の多い順（count desc）でソート
  const results = [];
  for (const [price, count] of priceCountMap.entries()) {
    results.push({
      price,
      count,
      label: `¥${price.toLocaleString('ja-JP')} (${count}回)`
    });
  }

  results.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.price - a.price; // 頻度が同一なら価格降順
  });

  return results;
}

/**
 * 割引き名目一覧を使用頻度順（降順）で取得
 */
function getDiscountReasons() {
  try {
    const raw = localStorage.getItem(KEYS.DISCOUNT_REASONS);
    if (!raw) {
      saveDiscountReasons(DEFAULT_DISCOUNT_REASONS);
      return [...DEFAULT_DISCOUNT_REASONS];
    }
    const list = JSON.parse(raw);
    return list.sort((a, b) => (b.count || 0) - (a.count || 0));
  } catch (e) {
    console.error('Failed to get discount reasons:', e);
    return [...DEFAULT_DISCOUNT_REASONS];
  }
}

/**
 * 割引き名目一覧を保存
 */
function saveDiscountReasons(list) {
  try {
    localStorageSetItemAndSync(KEYS.DISCOUNT_REASONS, JSON.stringify(list));
    return true;
  } catch (e) {
    console.error('Failed to save discount reasons:', e);
    return false;
  }
}

/**
 * 割引き名目の使用を記録（使用頻度カウント+1、頻度順自動並び替え）
 */
function recordDiscountReason(name) {
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  try {
    const list = getDiscountReasons();
    const existing = list.find(item => item.name === trimmed);
    if (existing) {
      existing.count = (existing.count || 0) + 1;
      existing.lastUsedAt = new Date().toISOString();
    } else {
      list.push({
        name: trimmed,
        count: 1,
        lastUsedAt: new Date().toISOString()
      });
    }
    list.sort((a, b) => (b.count || 0) - (a.count || 0));
    saveDiscountReasons(list);
  } catch (e) {
    console.error('Failed to record discount reason:', e);
  }
}

/**
 * 全データをJSON形式でダウンロード（バックアップ）
 */
/**
 * 請求書の入金ステータスを更新（入金消込）
 * @param {string} docId 書類ID
 * @param {'unpaid'|'paid'} status 入金ステータス
 * @param {string} paidDate 入金日 (YYYY-MM-DD)
 * @param {string} note 入金メモ
 */
function updateDocPaymentStatus(docId, status = 'paid', paidDate = '', note = '') {
  try {
    const list = getHistoryList();
    const item = list.find(d => d.id === docId);
    if (!item) return false;

    const isPaidBool = (status === 'paid' || status === true);
    const resolvedStatus = isPaidBool ? 'paid' : 'unpaid';
    const resolvedPaidDate = paidDate || (isPaidBool ? new Date().toISOString().split('T')[0] : '');

    item.isPaid = isPaidBool;
    item.paymentStatus = resolvedStatus;
    item.paidDate = resolvedPaidDate;
    item.updatedAt = new Date().toISOString();

    if (item.fullDoc) {
      item.fullDoc.isPaid = isPaidBool;
      item.fullDoc.paymentStatus = resolvedStatus;
      item.fullDoc.paidDate = resolvedPaidDate;
      if (note) item.fullDoc.paymentNote = note;
    }

    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));
    saveServerInvoicesHistory(list).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to update payment status:', e);
    return false;
  }
}

/**
 * 書類の確定発行を取り消し（未確定・下書き状態に戻す）
 * @param {string} docId 書類ID
 * @returns {boolean} 成功可否
 */
function cancelDocIssue(docId) {
  try {
    const list = getHistoryList();
    const item = list.find(d => d.id === docId);
    if (!item) return false;

    item.isIssued = false;
    item.issuedAt = null;
    item.isCancelled = true;
    item.updatedAt = new Date().toISOString();

    if (item.fullDoc) {
      item.fullDoc.isIssued = false;
      item.fullDoc.issuedAt = null;
      item.fullDoc.isCancelled = true;
      item.fullDoc.updatedAt = item.updatedAt;
    }

    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));
    saveServerInvoicesHistory(list).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to cancel doc issue:', e);
    return false;
  }
}

// ==========================================================================
// 経費・仕入データ管理
// ==========================================================================

/**
 * 経費・仕入一覧を取得
 */
function getAllExpenseList() {
  try {
    const raw = localStorage.getItem(KEYS.EXPENSES);
    if (!raw) return [];
    const list = JSON.parse(raw);
    let modified = false;
    list.forEach(e => {
      // 過去の巨大なBase64データがlocalStorageに残ってQuotaExceededErrorを引き起こすのを防ぐ
      const isBase64Image = e.receiptImage && e.receiptImage.startsWith('data:image/');
      const isBase64DataUrl = e.receiptDataUrl && e.receiptDataUrl.startsWith('data:image/');
      const isServerUrlImage = e.receiptImage && !e.receiptImage.startsWith('data:image/');
      const isServerUrlDataUrl = e.receiptDataUrl && !e.receiptDataUrl.startsWith('data:image/');

      // サーバーURLが片方にあるなら、Base64のほうは不要なので消す
      if (isBase64Image && isServerUrlDataUrl) {
        e.receiptImage = e.receiptDataUrl;
        modified = true;
      }
      if (isBase64DataUrl && isServerUrlImage) {
        e.receiptDataUrl = e.receiptImage;
        modified = true;
      }

      // 両方ともBase64の場合、片方にだけ持たせて容量を半減させる
      if (isBase64Image && isBase64DataUrl && e.receiptImage === e.receiptDataUrl) {
        e.receiptDataUrl = 'same';
        modified = true;
      }

      // それでも巨大なBase64(約1MB以上)がlocalStorageに残っている場合は、泣く泣く破棄する(パンク防止優先)
      if (e.receiptImage && e.receiptImage.startsWith('data:image/') && e.receiptImage.length > 1500000) {
        e.receiptImage = '';
        if (e.receiptDataUrl === 'same' || e.receiptDataUrl.startsWith('data:image/')) e.receiptDataUrl = '';
        modified = true;
      }

      if (!e.receiptImage && e.receiptDataUrl && e.receiptDataUrl !== 'same') {
        e.receiptImage = e.receiptDataUrl;
        modified = true;
      } else if (!e.receiptDataUrl && e.receiptImage) {
        e.receiptDataUrl = e.receiptImage;
        modified = true;
      }
    });

    if (modified) {
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(list));
    }
    return list;
  } catch (e) {
    console.error('Failed to get expense list:', e);
    return [];
  }
}

/**
 * 経費・仕入一覧を取得（削除済みを除外）
 */
function getExpenseList() {
  return getAllExpenseList().filter(e => !e.isDeleted);
}

/**
 * 経費・仕入データを保存（新規追加または更新）
 * @param {object} expense { id, date, category, amount, taxRate, payee, invoiceNumber, note, receiptImage, receiptDataUrl, isCost }
 */
function saveExpense(expense) {
  try {
    const list = getAllExpenseList();
    const id = expense.id || ('exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const receiptImg = expense.receiptImage || expense.receiptDataUrl || '';
    const newExp = {
      id,
      date: expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || '雑費',
      amount: Number(expense.amount) || 0,
      taxRate: expense.taxRate !== undefined ? Number(expense.taxRate) : 10,
      payee: expense.payee || '',
      invoiceNumber: expense.invoiceNumber ? String(expense.invoiceNumber).trim().toUpperCase() : '',
      note: expense.note || '',
      receiptImage: receiptImg,
      receiptDataUrl: receiptImg ? "same" : "", // サイズ削減のため同じデータを持たせない
      isCost: !!expense.isCost,
      claimant: expense.claimant || '小林俊介',
      isSettled: !!expense.isSettled,
      settledDate: expense.settledDate || null,
      paymentMethod: expense.paymentMethod || '普通預金',
      updatedAt: new Date().toISOString()
    };

    const existingIndex = list.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = newExp;
    } else {
      list.unshift(newExp);
    }

    localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(list));
    // サーバーファイル（data/expenses/expenses.json）にも即時保存
    saveServerExpenses(list).catch(e => {
      console.warn('Server expenses save failed:', e);
    });
    return newExp;
  } catch (e) {
    console.error('Failed to save expense:', e);
    return null;
  }
}

/**
 * 複数経費を一括精算済みに更新
 * @param {Array<string>} expenseIds 
 * @param {string} settledDate 
 * @returns {number} 更新件数
 */
function markExpensesSettled(expenseIds = [], settledDate = '') {
  try {
    if (!Array.isArray(expenseIds) || expenseIds.length === 0) return 0;
    const targetSet = new Set(expenseIds);
    const list = getAllExpenseList();
    const dateStr = settledDate || new Date().toISOString().split('T')[0];
    let count = 0;

    list.forEach(e => {
      if (targetSet.has(e.id)) {
        e.isSettled = true;
        e.settledDate = dateStr;
        e.updatedAt = new Date().toISOString();
        count++;
      }
    });

    if (count > 0) {
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(list));
      saveServerExpenses(list).catch(e => console.warn('Server expenses save failed:', e));
    }
    return count;
  } catch (err) {
    console.error('Failed to mark expenses settled:', err);
    return 0;
  }
}

/**
 * 経費・仕入データを削除
 */
function deleteExpense(id) {
  try {
    const list = getAllExpenseList();
    const existingIndex = list.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      list[existingIndex].isDeleted = true;
      list[existingIndex].updatedAt = new Date().toISOString();
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(list));
      // サーバーファイル（data/expenses/expenses.json）にも即時保存
      saveServerExpenses(list).catch(e => {
        console.warn('Server expenses delete save failed:', e);
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to delete expense:', e);
    return false;
  }
}

// ==========================================================================
// 勤怠・タイムカード管理（休憩1時間自動控除）
// ==========================================================================

/**
 * 勤怠打刻一覧を取得
 */
function getAttendanceList() {
  try {
    const raw = localStorage.getItem(KEYS.ATTENDANCE);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to get attendance list:', e);
    return [];
  }
}

/**
 * ローカル基準の日付文字列 (YYYY-MM-DD) を取得
 */
function getLocalDateStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 勤怠データを保存
 */
function saveAttendance(attendance) {
  try {
    const list = getAttendanceList();
    const id = attendance.id || ('att_' + attendance.date);
    const existingIndex = list.findIndex(a => a.id === id || a.date === attendance.date);
    const existing = existingIndex >= 0 ? list[existingIndex] : null;

    const record = {
      id: (existing && existing.id) ? existing.id : id,
      date: attendance.date,
      clockIn: (attendance.clockIn !== undefined && attendance.clockIn !== null)
        ? attendance.clockIn
        : (existing ? (existing.clockIn || '') : ''),
      clockOut: (attendance.clockOut !== undefined && attendance.clockOut !== null)
        ? attendance.clockOut
        : (existing ? (existing.clockOut || '') : ''),
      note: (attendance.note !== undefined && attendance.note !== null)
        ? attendance.note
        : (existing ? (existing.note || '') : ''),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = record;
    } else {
      list.unshift(record);
    }

    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(list));
    // サーバー（data/attendance.json）へ即座に非同期保存
    saveServerAttendance(list).catch(() => { });
    return record;
  } catch (e) {
    console.error('Failed to save attendance:', e);
    return null;
  }
}

/**
 * 本日の勤怠打刻を取得
 */
function getTodayAttendance() {
  const today = getLocalDateStr();
  const list = getAttendanceList();
  return list.find(a => a.date === today) || null;
}

/**
 * 本日の出勤打刻
 */
function clockInToday(timeStr = '', note = '') {
  const today = getLocalDateStr();
  const curTime = timeStr || new Date().toTimeString().substring(0, 5);
  const existing = getTodayAttendance();
  const data = {
    date: today,
    clockIn: curTime
  };
  if (existing && existing.clockOut) {
    data.clockOut = existing.clockOut;
  }
  if (note) {
    data.note = note;
  } else if (existing && existing.note) {
    data.note = existing.note;
  }
  return saveAttendance(data);
}

/**
 * 本日の退勤打刻
 */
function clockOutToday(timeStr = '', note = '') {
  const today = getLocalDateStr();
  const curTime = timeStr || new Date().toTimeString().substring(0, 5);
  const existing = getTodayAttendance();
  const data = {
    date: today,
    clockOut: curTime
  };
  if (existing && existing.clockIn) {
    data.clockIn = existing.clockIn;
  }
  if (note) {
    data.note = note;
  } else if (existing && existing.note) {
    data.note = existing.note;
  }
  return saveAttendance(data);
}

/**
 * 勤怠記録を削除（IDまたは日付文字列のどちらが渡されても確実に削除し、サーバーファイルも即時削除・同期）
 */
function deleteAttendance(idOrDate) {
  try {
    const list = getAttendanceList().filter(a => a.id !== idOrDate && a.date !== idOrDate);
    localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(list));
    // サーバー（data/attendance/attendance.json）側からも即時削除して1対1整合性を維持
    deleteServerAttendanceRecord(idOrDate, idOrDate).catch(() => { });
    saveServerAttendance(list).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to delete attendance:', e);
    return false;
  }
}

/**
 * 出勤簿用 社員情報（社員番号・氏名）を取得（デフォルト: 宮崎真輔）
 */
function getAttendanceEmployee() {
  try {
    const raw = localStorage.getItem(KEYS.ATTENDANCE_EMPLOYEE);
    let data = raw ? JSON.parse(raw) : null;
    if (!data) {
      data = { empNo: '2', empName: '宮崎真輔' };
      localStorageSetItemAndSync(KEYS.ATTENDANCE_EMPLOYEE, JSON.stringify(data));
      return data;
    }
    // 旧デフォルト「山田 一郎」または未設定の場合は「宮崎真輔」に自動更新
    if (!data.empName || data.empName === '山田 一郎') {
      data.empName = '宮崎真輔';
      localStorageSetItemAndSync(KEYS.ATTENDANCE_EMPLOYEE, JSON.stringify(data));
    }
    // 社員番号未設定または旧番号「1111」の場合は「2」に自動更新
    if (!data.empNo || data.empNo === '1111') {
      data.empNo = '2';
      localStorageSetItemAndSync(KEYS.ATTENDANCE_EMPLOYEE, JSON.stringify(data));
    }
    return data;
  } catch (e) {
    return { empNo: '2', empName: '宮崎真輔' };
  }
}

/**
 * 出勤簿用 社員情報（社員番号・氏名）を保存
 */
function saveAttendanceEmployee(info) {
  try {
    const current = getAttendanceEmployee();
    const updated = {
      empNo: info.empNo !== undefined ? String(info.empNo).trim() : current.empNo,
      empName: info.empName !== undefined ? String(info.empName).trim() : current.empName
    };
    localStorageSetItemAndSync(KEYS.ATTENDANCE_EMPLOYEE, JSON.stringify(updated));
    // サーバー（data/attendance_employee.json）へ即座に非同期保存
    saveServerAttendanceEmployee(updated).catch(() => { });
    return updated;
  } catch (e) {
    console.error('Failed to save attendance employee:', e);
    return null;
  }
}

// ==========================================================================
// バックアップ（エクスポート / インポート）
// ==========================================================================

/**
 * 全データをJSON形式でダウンロード（バックアップ）
 */
function exportDataAsJSON() {
  const backupData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    activeDoc: loadActiveDoc(),
    issuerProfile: loadIssuerProfile(),
    history: getHistoryList(),
    itemMaster: getItemMasterList(false),
    clientMaster: getClientMasterList(false),
    discountReasons: getDiscountReasons(),
    userPriceHistory: getUserPriceHistoryMap(),
    expenses: getExpenseList(),
    attendance: getAttendanceList(),
    inventory: getInventoryList(),
    purchaseMappings: getPurchaseMappings()
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `BillCraft_ERP_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * JSONファイルからデータを復元
 */
function importDataFromJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') {
      throw new Error('不正なJSONフォーマットです');
    }

    if (data.issuerProfile) {
      localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(data.issuerProfile));
    }
    if (data.history && Array.isArray(data.history)) {
      localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(data.history));
    }
    if (data.activeDoc) {
      localStorageSetItemAndSync(KEYS.ACTIVE_DOC, JSON.stringify(data.activeDoc));
    }
    if (data.itemMaster && Array.isArray(data.itemMaster)) {
      localStorageSetItemAndSync(KEYS.ITEM_MASTER, JSON.stringify(data.itemMaster));
    }
    if (data.clientMaster && Array.isArray(data.clientMaster)) {
      localStorageSetItemAndSync(KEYS.CLIENT_MASTER, JSON.stringify(data.clientMaster));
    }
    if (data.discountReasons && Array.isArray(data.discountReasons)) {
      localStorageSetItemAndSync(KEYS.DISCOUNT_REASONS, JSON.stringify(data.discountReasons));
    }
    if (data.userPriceHistory && typeof data.userPriceHistory === 'object') {
      localStorageSetItemAndSync(KEYS.USER_PRICE_HISTORY, JSON.stringify(data.userPriceHistory));
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(data.expenses));
    }
    if (data.attendance && Array.isArray(data.attendance)) {
      localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(data.attendance));
    }
    if (data.inventory && Array.isArray(data.inventory)) {
      localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(data.inventory));
      saveServerInventory(data.inventory).catch(() => { });
    }
    if (data.purchaseMappings && typeof data.purchaseMappings === 'object') {
      localStorageSetItemAndSync(KEYS.PURCHASE_MAPPINGS, JSON.stringify(data.purchaseMappings));
      saveServerPurchaseMappings(data.purchaseMappings).catch(() => { });
    }
    return { success: true, activeDoc: data.activeDoc || null };
  } catch (e) {
    console.error('JSON Import error:', e);
    return { success: false, error: e.message };
  }
}

// ==========================================================================
// 在庫マスタ ＆ 仕入マッピング 管理
// ==========================================================================

/**
 * サーバーから在庫マスタを取得
 */
async function fetchServerInventory() {
  try {
    const res = await apiFetch('inventory');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn('サーバーからの在庫マスタ取得スキップ:', e);
  }
  return null;
}

/**
 * サーバーへ在庫マスタを保存
 */
async function saveServerInventory(inventoryList) {
  try {
    await apiFetch('inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventoryList)
    });
  } catch (e) {
    console.warn('サーバーへの在庫マスタ保存失敗:', e);
  }
}

/**
 * サーバーから仕入マッピング辞書を取得
 */
async function fetchServerPurchaseMappings() {
  try {
    const res = await apiFetch('purchase-mappings');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        localStorageSetItemAndSync(KEYS.PURCHASE_MAPPINGS, JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn('サーバーからの仕入マッピング取得スキップ:', e);
  }
  return null;
}

/**
 * サーバーへ仕入マッピング辞書を保存
 */
async function saveServerPurchaseMappings(mappings) {
  try {
    await apiFetch('purchase-mappings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mappings)
    });
  } catch (e) {
    console.warn('サーバーへの仕入マッピング保存失敗:', e);
  }
}

/**
 * 起動時にサーバーと在庫データを同期
 */
async function initInventoryFromServer() {
  await Promise.all([
    fetchServerInventory(),
    fetchServerPurchaseMappings()
  ]);
}

/**
 * 在庫マスタの重複排除およびサンプル品目の完全パージ
 */
function deduplicateInventoryList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const map = new Map();

  for (const inv of rawList) {
    if (!inv || !inv.name) continue;
    // 1. サンプル品目の完全排除
    if (isSampleItem(inv)) continue;

    const key = getMasterKey(inv.name);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        id: inv.id || (`inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`),
        itemId: inv.itemId || '',
        name: normalizeMasterName(inv.name),
        sku: (inv.sku || '').trim(),
        currentStock: Number(inv.currentStock) || 0,
        safetyStock: Number(inv.safetyStock) >= 0 ? Number(inv.safetyStock) : 5,
        unit: (inv.unit || '個').trim(),
        unitCost: Number(inv.unitCost) || 0,
        unitPrice: Number(inv.unitPrice) || 0,
        location: (inv.location || '本社倉庫').trim(),
        lastInDate: inv.lastInDate || '',
        note: inv.note || '',
        history: Array.isArray(inv.history) ? [...inv.history] : []
      });
    } else {
      // 既存品目と統合（重複解消）
      const existing = map.get(key);
      if (!existing.itemId && inv.itemId) existing.itemId = inv.itemId;
      if (!existing.sku && inv.sku) existing.sku = inv.sku;
      if (!existing.unitCost && inv.unitCost) existing.unitCost = inv.unitCost;
      if (!existing.unitPrice && inv.unitPrice) existing.unitPrice = inv.unitPrice;
      if (inv.currentStock > existing.currentStock) existing.currentStock = inv.currentStock;
      if (inv.safetyStock > existing.safetyStock) existing.safetyStock = inv.safetyStock;
      if (!existing.lastInDate && inv.lastInDate) existing.lastInDate = inv.lastInDate;
      // 履歴をマージ（重複IDを除外）
      if (Array.isArray(inv.history)) {
        const histIds = new Set(existing.history.map(h => h.id || (h.date + h.type + h.qty)));
        for (const h of inv.history) {
          const hId = h.id || (h.date + h.type + h.qty);
          if (!histIds.has(hId)) {
            existing.history.push(h);
            histIds.add(hId);
          }
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * 在庫マスタ一覧を取得（商品マスタと自動連携・同期・重複排除・サンプル完全パージ）
 */
function getInventoryList() {
  try {
    let list = [];
    const raw = localStorage.getItem(KEYS.INVENTORY);
    if (!raw) {
      list = [...DEFAULT_INVENTORY];
    } else {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [...DEFAULT_INVENTORY];
    }

    const beforeLen = list.length;
    // 重複排除とサンプルパージを実行
    list = deduplicateInventoryList(list);

    // 商品マスタ（クリーンアップ済み）と同期
    const cleanItems = getItemMasterList(false);
    let modified = (list.length !== beforeLen);

    cleanItems.forEach(prod => {
      const prodKey = getMasterKey(prod.name);
      const existing = list.find(inv => (inv.itemId && inv.itemId === prod.id) || (getMasterKey(inv.name) === prodKey));
      if (existing) {
        if (!existing.itemId) {
          existing.itemId = prod.id;
          modified = true;
        }
        if (!existing.unitPrice && prod.unitPrice) {
          existing.unitPrice = prod.unitPrice;
          modified = true;
        }
        if (existing.name !== prod.name) {
          existing.name = prod.name;
          modified = true;
        }
      } else {
        // 商品マスタにあるが在庫リストにない商品を自動追加（初期在庫0）
        list.push({
          id: `inv_${prod.id}`,
          itemId: prod.id,
          name: prod.name,
          sku: prod.sku || '',
          currentStock: 0,
          safetyStock: 5,
          unit: prod.unit || '個',
          unitCost: prod.unitPrice ? Math.round(prod.unitPrice * 0.6) : 0,
          unitPrice: prod.unitPrice || 0,
          location: '本社倉庫',
          lastInDate: '',
          note: prod.note || '',
          history: [{
            id: `log_init_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            date: new Date().toISOString().split('T')[0],
            type: 'in',
            qty: 0,
            reason: '商品マスタ連携により初期登録',
            currentStock: 0,
            timestamp: new Date().toISOString()
          }]
        });
        modified = true;
      }
    });

    if (modified) {
      localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(list));
      saveServerInventory(list).catch(() => { });
    }

    return list;
  } catch (e) {
    return DEFAULT_INVENTORY;
  }
}

/**
 * 新規品目を商品マスタと在庫マスタの両方に一括自動登録
 * @param {object} data - { name, sku, unit, unitCost, unitPrice, initialStock, safetyStock, note }
 * @returns {{ product: object, inventory: object }}
 */
function saveNewProductAndInventory(data) {
  const name = (data.name || '').trim();
  if (!name) return null;

  // 1. 商品マスタ（itemMaster）へ保存
  const product = saveItemToMaster({
    name: name,
    sku: data.sku || '',
    unitPrice: Number(data.unitCost) > 0 ? Number(data.unitCost) : (Number(data.unitPrice) || 0),
    userPrice: Number(data.unitPrice) > 0 ? Number(data.unitPrice) : Math.round(Number(data.unitCost || 0) * 1.3),
    unit: data.unit || '個',
    taxRate: Number(data.taxRate) || 10,
    note: data.note || '仕入画面から新規登録'
  });

  // 2. 在庫マスタ（inventory）へ保存（初期在庫数を反映）
  const initialStock = Number(data.initialStock) >= 0 ? Number(data.initialStock) : 0;
  const inventory = saveInventoryItem({
    id: `inv_${product.id}`,
    itemId: product.id,
    name: product.name,
    sku: product.sku || data.sku || '',
    currentStock: initialStock,
    safetyStock: Number(data.safetyStock) >= 0 ? Number(data.safetyStock) : 5,
    unit: product.unit || '個',
    unitCost: Number(data.unitCost) || 0,
    unitPrice: Number(data.unitPrice) || product.unitPrice || 0,
    location: data.location || '本社倉庫',
    note: product.note || '',
    history: initialStock > 0 ? [{
      id: `log_init_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'in',
      qty: initialStock,
      reason: '新規品目登録時入庫',
      currentStock: initialStock,
      timestamp: new Date().toISOString()
    }] : []
  });

  return { product, inventory };
}

/**
 * 在庫品目を保存（追加または更新）
 */
function saveInventoryItem(item) {
  try {
    const list = getInventoryList();
    const id = item.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const nowStr = new Date().toISOString().split('T')[0];

    const existingIndex = list.findIndex(i => i.id === id || (item.itemId && i.itemId === item.itemId));
    const updatedItem = {
      id,
      itemId: item.itemId || (existingIndex >= 0 ? list[existingIndex].itemId : ''),
      name: (item.name || '').trim(),
      sku: (item.sku || '').trim(),
      currentStock: Number(item.currentStock) || 0,
      safetyStock: Number(item.safetyStock) >= 0 ? Number(item.safetyStock) : 0,
      unit: (item.unit || '個').trim(),
      unitCost: Number(item.unitCost) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      location: (item.location || '').trim(),
      lastInDate: item.lastInDate || (existingIndex >= 0 ? list[existingIndex].lastInDate : nowStr),
      note: (item.note || '').trim(),
      history: Array.isArray(item.history) ? item.history : (existingIndex >= 0 ? (list[existingIndex].history || []) : [])
    };

    if (existingIndex >= 0) {
      list[existingIndex] = updatedItem;
    } else {
      if (!updatedItem.history.length) {
        updatedItem.history.push({
          id: `log_${Date.now()}`,
          date: nowStr,
          type: 'in',
          qty: updatedItem.currentStock,
          reason: '初期登録',
          currentStock: updatedItem.currentStock,
          timestamp: new Date().toISOString()
        });
      }
      list.push(updatedItem);
    }

    const clean = deduplicateInventoryList(list);
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(clean));
    saveServerInventory(clean).catch(() => { });
    return updatedItem;
  } catch (e) {
    console.error('Failed to save inventory item:', e);
    return null;
  }
}

/**
 * 在庫品目を削除
 */
function deleteInventoryItem(id) {
  try {
    const list = getInventoryList();
    const filtered = list.filter(i => i.id !== id);
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(filtered));
    saveServerInventory(filtered).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to delete inventory item:', e);
    return false;
  }
}

/**
 * 在庫の数量調整・入出庫を記録
 * @param {string} id - 在庫品目ID
 * @param {number} deltaQty - 変動数量（入庫は正、出庫は負。isDirectSetなら設定後の在庫数）
 * @param {string} reason - 理由（仕入入庫、納品出庫、棚卸調整など）
 * @param {object} [metadata] - 伝票ID、取引先、単価などの付加情報
 * @param {boolean} [isDirectSet] - trueの場合、deltaQtyを新しい在庫実数として直接設定
 */
function adjustStock(id, deltaQty, reason = '', metadata = {}, isDirectSet = false) {
  try {
    const list = getInventoryList();
    const item = list.find(i => i.id === id || i.itemId === id || (i.name && i.name.trim() === String(id).trim()));
    if (!item) {
      console.warn(`在庫品目が見つかりません: ${id}`);
      return null;
    }

    const prevStock = Number(item.currentStock) || 0;
    let newStock = prevStock;
    let actualDelta = Number(deltaQty) || 0;

    if (isDirectSet) {
      newStock = Math.max(0, actualDelta);
      actualDelta = newStock - prevStock;
    } else {
      newStock = Math.max(0, prevStock + actualDelta);
    }

    const nowStr = new Date().toISOString().split('T')[0];
    const logType = actualDelta >= 0 ? 'in' : 'out';

    if (!Array.isArray(item.history)) {
      item.history = [];
    }

    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: metadata.date || nowStr,
      type: isDirectSet ? 'adjust' : logType,
      qty: Math.abs(actualDelta),
      delta: actualDelta,
      reason: reason || (actualDelta >= 0 ? '入庫' : '出庫'),
      currentStock: newStock,
      sourceRef: metadata.sourceRef || '',
      payee: metadata.payee || '',
      unitCost: metadata.unitCost !== undefined ? Number(metadata.unitCost) : item.unitCost,
      timestamp: new Date().toISOString()
    };

    item.history.unshift(logEntry); // 最新順
    item.currentStock = newStock;
    if (actualDelta > 0) {
      item.lastInDate = metadata.date || nowStr;
      if (metadata.unitCost && Number(metadata.unitCost) > 0) {
        item.unitCost = Number(metadata.unitCost);
      }
    }

    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(list));
    saveServerInventory(list).catch(() => { });
    return { item, logEntry };
  } catch (e) {
    console.error('Failed to adjust stock:', e);
    return null;
  }
}

/**
 * 商品マスタ（ItemMaster）から未登録の商品を在庫マスタにインポート
 */
function syncInventoryWithItemsMaster() {
  const invList = getInventoryList();
  const rawItemMaster = localStorage.getItem(KEYS.ITEM_MASTER);
  let itemMaster = [];
  try {
    itemMaster = rawItemMaster ? JSON.parse(rawItemMaster) : [];
  } catch (e) { }

  let addedCount = 0;
  itemMaster.forEach(item => {
    // 既存の在庫品目に同名または同itemIdがあるかチェック
    const exists = invList.some(inv => inv.itemId === item.id || inv.name === item.name);
    if (!exists) {
      invList.push({
        id: `inv_sync_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        itemId: item.id,
        name: item.name,
        sku: item.sku || `SKU-${item.id.replace('item_mst_', '')}`,
        currentStock: 0,
        safetyStock: 5,
        unit: item.unit || '個',
        unitCost: item.unitPrice ? Math.round(item.unitPrice * 0.6) : 0,
        unitPrice: item.unitPrice || 0,
        location: '倉庫未割当',
        lastInDate: '',
        note: `商品マスタ連携品目: ${item.note || ''}`,
        history: [{
          id: `log_init_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          type: 'adjust',
          qty: 0,
          reason: '商品マスタ連携により初期登録',
          currentStock: 0,
          timestamp: new Date().toISOString()
        }]
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(invList));
    saveServerInventory(invList).catch(() => { });
  }
  return { addedCount, total: invList.length };
}

/**
 * 仕入名目マッピング辞書を取得
 */
function getPurchaseMappings() {
  try {
    const raw = localStorage.getItem(KEYS.PURCHASE_MAPPINGS);
    if (!raw) {
      localStorageSetItemAndSync(KEYS.PURCHASE_MAPPINGS, JSON.stringify(DEFAULT_PURCHASE_MAPPINGS));
      saveServerPurchaseMappings(DEFAULT_PURCHASE_MAPPINGS).catch(() => { });
      return { ...DEFAULT_PURCHASE_MAPPINGS };
    }
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : { ...DEFAULT_PURCHASE_MAPPINGS };
  } catch (e) {
    return { ...DEFAULT_PURCHASE_MAPPINGS };
  }
}

/**
 * 仕入名目と在庫商品IDのマッピングを保存・学習
 * @param {string} rawName - レシート・伝票上の名目または仕入先名
 * @param {string} inventoryId - 対応する在庫品目ID
 */
function savePurchaseMapping(rawName, inventoryId) {
  if (!rawName || !inventoryId) return;
  const key = String(rawName).trim();
  if (!key) return;

  try {
    const mappings = getPurchaseMappings();
    mappings[key] = inventoryId;
    localStorageSetItemAndSync(KEYS.PURCHASE_MAPPINGS, JSON.stringify(mappings));
    saveServerPurchaseMappings(mappings).catch(() => { });
  } catch (e) {
    console.error('Failed to save purchase mapping:', e);
  }
}

/**
 * 仕入名目（品名や仕入先）から在庫品目を推測・検索
 * @param {string} rawName - レシート上の記載名目
 * @returns {{ inventoryId: string, item: object, matchType: 'exact' | 'fuzzy' | 'none' } | null}
 */
function findInventoryMatchForPurchase(rawName) {
  if (!rawName) return null;
  const query = String(rawName).trim();
  if (!query) return null;

  const mappings = getPurchaseMappings();
  const invList = getInventoryList();

  // 1. マッピング辞書の完全一致
  if (mappings[query]) {
    const matched = invList.find(i => i.id === mappings[query]);
    if (matched) {
      return { inventoryId: matched.id, item: matched, matchType: 'exact' };
    }
  }

  // 2. マッピング辞書の部分一致
  const cleanStr = (s) => (s || '').toLowerCase()
    .replace(/[（(【\[].*?[）)】\]]/g, '') // 括弧とその中身を削除
    .replace(/[\s\-_・、。/]/g, '');      // 記号や空白を除去

  const queryLower = query.toLowerCase();
  const queryClean = cleanStr(query);

  for (const [mapKey, invId] of Object.entries(mappings)) {
    const mapKeyLower = mapKey.toLowerCase();
    const mapKeyClean = cleanStr(mapKey);
    if (
      queryLower.includes(mapKeyLower) || mapKeyLower.includes(queryLower) ||
      (queryClean.length >= 2 && (queryClean.includes(mapKeyClean) || mapKeyClean.includes(queryClean)))
    ) {
      const matched = invList.find(i => i.id === invId);
      if (matched) {
        return { inventoryId: matched.id, item: matched, matchType: 'fuzzy' };
      }
    }
  }

  // 3. 在庫マスタ品名・SKUとの直接部分一致（カッコ除去クリーン名も含む）
  for (const inv of invList) {
    const invNameLower = (inv.name || '').toLowerCase();
    const invNameClean = cleanStr(inv.name);
    const invSkuLower = (inv.sku || '').toLowerCase();

    if (invNameLower && (queryLower.includes(invNameLower) || invNameLower.includes(queryLower))) {
      return { inventoryId: inv.id, item: inv, matchType: 'fuzzy' };
    }
    if (invNameClean && invNameClean.length >= 2 && (queryClean.includes(invNameClean) || invNameClean.includes(queryClean))) {
      return { inventoryId: inv.id, item: inv, matchType: 'fuzzy' };
    }
    if (invSkuLower && (queryLower.includes(invSkuLower) || invSkuLower.includes(queryLower))) {
      return { inventoryId: inv.id, item: inv, matchType: 'fuzzy' };
    }
  }

  return { inventoryId: '', item: null, matchType: 'none' };
}

// ==========================================================================
// 給与計算（給与明細レコード・給与計算設定）のデータ管理
// ==========================================================================
async function fetchServerPayrollRecords() {
  try {
    const res = await apiFetch('payroll/records');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}
async function saveServerPayrollRecords(records) {
  try {
    const res = await apiFetch('payroll/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(records)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerPayrollSettings() {
  try {
    const res = await apiFetch('payroll/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}
async function saveServerPayrollSettings(settings) {
  try {
    const res = await apiFetch('payroll/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
async function fetchServerPreviousYearIncome() {
  try {
    const res = await apiFetch('payroll/previous-year');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}
async function saveServerPreviousYearIncome(data) {
  try {
    const res = await apiFetch('payroll/previous-year', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 前年の所得・明細データの取得
 */
function getPreviousYearIncome() {
  try {
    const raw = localStorage.getItem(KEYS.PREVIOUS_YEAR_INCOME);
    let data = raw ? JSON.parse(raw) : null;
    if (!data) {
      data = {
        targetYear: 2025,
        empNo: '2',
        empName: '宮崎真輔',
        companyName: '株式会社アルバワークス',
        annualGrossSalary: 2400000,
        socialInsuranceDeduction: 0,
        basicDeduction: 430000,
        dependentsDeduction: 0,
        spouseDeduction: 0,
        otherDeductions: 0,
        residentTaxMonthlyJune: 0,
        residentTaxMonthlyRegular: 0,
        annualResidentTaxTotal: 0,
        monthlyRecords: [],
        notes: '前年の給与明細・源泉徴収票データ（受取後に詳細登録可能）'
      };
      localStorageSetItemAndSync(KEYS.PREVIOUS_YEAR_INCOME, JSON.stringify(data));
    }
    return data;
  } catch (e) {
    return {
      targetYear: 2025,
      empNo: '2',
      empName: '宮崎真輔',
      annualGrossSalary: 2400000
    };
  }
}

/**
 * 前年の所得・明細データの保存
 */
function savePreviousYearIncome(data) {
  try {
    const current = getPreviousYearIncome();
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() };
    localStorageSetItemAndSync(KEYS.PREVIOUS_YEAR_INCOME, JSON.stringify(updated));
    saveServerPreviousYearIncome(updated);
    return updated;
  } catch (e) {
    console.error('Failed to save previous year income:', e);
    return null;
  }
}

/**
 * 給与計算設定の取得（デフォルト: 宮崎真輔様・社員番号2・基本給20万円）
 */
function getPayrollSettings() {
  try {
    const raw = localStorage.getItem(KEYS.PAYROLL_SETTINGS);
    let data = raw ? JSON.parse(raw) : null;
    if (!data) {
      data = {
        empNo: '2',
        empName: '宮崎真輔',
        companyName: '株式会社アルバワークス',
        salaryType: 'monthly',
        baseSalary: 200000,
        isChildcareLeave: true,
        childcareStartDate: '2026-03-14',
        childcareEndDate: '2027-03-31',
        childcareExemptSocialInsurance: true,
        dailyWageCalculationType: 'proRata',
        dailyWageUnit: 10000,
        monthlyStandardDays: 20,
        monthlyStandardHours: 140.0,
        overtimeRate: 1.25,
        overtimeUnitHourly: 1785.456,
        standardMonthlyRemuneration: 200000,
        healthInsurance: 9970,
        welfarePension: 18300,
        nursingInsurance: 1590,
        employmentInsuranceFixed: 1156,
        employmentInsuranceRate: 0.0055,
        useFixedEmploymentInsurance: false,
        dependentsCount: 0,
        residentTax: 3500,
        allowanceExecutive: 0,
        allowanceQualification: 0,
        allowanceHousing: 0,
        allowanceFamily: 0,
        allowanceCommuteNonTax: 0,
        allowanceNonTaxOther: 10000,
        closingDay: '末日',
        paymentDay: '翌月10日',
        birthDate: '1981-11-12',
        prefecture: '群馬県'
      };
      localStorageSetItemAndSync(KEYS.PAYROLL_SETTINGS, JSON.stringify(data));
    }
    return data;
  } catch (e) {
    return {
      empNo: '2',
      empName: '宮崎真輔',
      companyName: '株式会社アルバワークス',
      baseSalary: 200000
    };
  }
}

/**
 * 給与計算設定の保存
 */
function savePayrollSettings(settings) {
  try {
    const current = getPayrollSettings();
    const updated = { ...current, ...settings };
    localStorageSetItemAndSync(KEYS.PAYROLL_SETTINGS, JSON.stringify(updated));
    saveServerPayrollSettings(updated);
    return updated;
  } catch (e) {
    console.error('Failed to save payroll settings:', e);
    return null;
  }
}

/**
 * 給与明細レコード全件の取得
 */
function getPayrollRecords() {
  try {
    const raw = localStorage.getItem(KEYS.PAYROLL_RECORDS);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

/**
 * 指定年月の給与明細レコードを取得
 */
function getPayrollRecordByMonth(targetMonth) {
  const records = getPayrollRecords();
  return records.find(r => r.targetMonth === targetMonth) || null;
}

/**
 * 給与明細レコードの保存（新規または更新）
 */
function savePayrollRecord(record) {
  try {
    const records = getPayrollRecords();
    const idx = records.findIndex(r => r.targetMonth === record.targetMonth || (record.id && r.id === record.id));
    const toSave = {
      ...record,
      id: record.id || `pay_${record.targetMonth}`,
      updatedAt: new Date().toISOString()
    };
    if (idx >= 0) {
      records[idx] = toSave;
    } else {
      toSave.createdAt = new Date().toISOString();
      records.unshift(toSave);
    }
    localStorageSetItemAndSync(KEYS.PAYROLL_RECORDS, JSON.stringify(records));
    saveServerPayrollRecords(records);
    return toSave;
  } catch (e) {
    console.error('Failed to save payroll record:', e);
    return null;
  }
}

/**
 * 給与明細レコードの削除
 */
function deletePayrollRecord(targetMonthOrId) {
  try {
    let records = getPayrollRecords();
    records = records.filter(r => r.id !== targetMonthOrId && r.targetMonth !== targetMonthOrId);
    localStorageSetItemAndSync(KEYS.PAYROLL_RECORDS, JSON.stringify(records));
    saveServerPayrollRecords(records);
    return true;
  } catch (e) {
    console.error('Failed to delete payroll record:', e);
    return false;
  }
}

/**
 * ローカルストレージ内の全データ（マスタ・経費・伝票・自社設定）をサーバーへ一括アップロード
 */
async function pushAllLocalDataToServer() {
  const fetchFn = (typeof window !== 'undefined' && window.apiFetch) ? window.apiFetch : fetch;
  const payload = {
    masterItems: getItemMasterList(false),
    masterClients: getClientMasterList(false),
    issuerProfile: loadIssuerProfile(),
    expenses: getExpenseList(),
    invoicesHistory: getHistoryList(),
    attendance: (typeof getAttendanceList === 'function') ? getAttendanceList() : []
  };

  try {
    const res = await fetchFn('sync/push-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, message: '全データをサーバーへ正常にバックアップ・同期しました！' };
  } catch (err) {
    console.error('Failed to push all local data to server:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * サーバーから全データを一括取得してローカルストレージへ即時反映
 */
async function pullAllServerDataToLocal() {
  const fetchFn = (typeof window !== 'undefined' && window.apiFetch) ? window.apiFetch : fetch;
  try {
    const res = await fetchFn('sync/pull-all', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data) throw new Error('Empty data from server');

    if (data.masterItems && Array.isArray(data.masterItems) && data.masterItems.length > 0) {
      saveItemMasterList(data.masterItems);
    }
    if (data.masterClients && Array.isArray(data.masterClients) && data.masterClients.length > 0) {
      saveClientMasterList(data.masterClients);
    }
    if (data.issuerProfile && typeof data.issuerProfile === 'object') {
      saveIssuerProfile(data.issuerProfile);
    }
    if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(data.expenses));
    }
    if (data.invoicesHistory && Array.isArray(data.invoicesHistory) && data.invoicesHistory.length > 0) {
      localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(data.invoicesHistory));
    }
    if (data.attendance && Array.isArray(data.attendance) && data.attendance.length > 0) {
      localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(data.attendance));
    }
    return { success: true, message: 'サーバーから最新データを同期しました！' };
  } catch (err) {
    console.error('Failed to pull all data from server:', err);
    return { success: false, error: err.message || err };
  }
}

if (typeof window !== 'undefined') {
  window.pushAllLocalDataToServer = pushAllLocalDataToServer;
  window.pullAllServerDataToLocal = pullAllServerDataToLocal;
  window.restoreAttendanceFromBackup = function() {
    const backup = localStorage.getItem(KEYS.ATTENDANCE + '_backup');
    if (backup && backup !== '[]') {
      localStorageSetItemAndSync(KEYS.ATTENDANCE, backup);
      alert('バックアップから勤怠データを復元しました。画面をリロードしてください。');
      location.reload();
    } else {
      alert('有効なバックアップデータが見つかりませんでした。');
    }
  };
}

  // ==========================================================================
  // アプリケーションUI制御ロジック
  // ==========================================================================
/**
 * app.js
 * BillCraft メインコントローラー
 * イベントハンドリング、リアルタイムUI更新、プレビュー同期
 */

















// ==========================================================================
// アプリケーション状態
// ==========================================================================
let currentDoc = null;

// ==========================================================================
// DOM要素参照
// ==========================================================================
const DOM = {
  // 書類種別
  docTypeBtns: document.querySelectorAll('.doc-type-btn'),
  
  // タブ
  tabBtns: document.querySelectorAll('.editor-tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  itemCountBadge: document.getElementById('itemCountBadge'),

  // 基本情報入力
  inputDocNumber: document.getElementById('inputDocNumber'),
  btnRegenDocNumber: document.getElementById('btnRegenDocNumber'),
  labelIssueDate: document.getElementById('labelIssueDate'),
  inputIssueDate: document.getElementById('inputIssueDate'),
  labelDueDate: document.getElementById('labelDueDate'),
  inputDueDate: document.getElementById('inputDueDate'),
  inputTitle: document.getElementById('inputTitle'),

  // 取引先入力
  inputClientName: document.getElementById('inputClientName'),
  inputClientHonorific: document.getElementById('inputClientHonorific'),
  inputClientZip: document.getElementById('inputClientZip'),
  inputClientAddress: document.getElementById('inputClientAddress'),
  inputClientContact: document.getElementById('inputClientContact'),

  // 明細入力
  itemsContainer: document.getElementById('itemsContainer'),
  btnAddItem: document.getElementById('btnAddItem'),
  selectFractionRule: document.getElementById('selectFractionRule'),

  // 自社情報入力
  inputIssuerName: document.getElementById('inputIssuerName'),
  inputIssuerInvoiceNo: document.getElementById('inputIssuerInvoiceNo'),
  inputIssuerZip: document.getElementById('inputIssuerZip'),
  inputIssuerTel: document.getElementById('inputIssuerTel'),
  inputIssuerFax: document.getElementById('inputIssuerFax'),
  inputIssuerAddress: document.getElementById('inputIssuerAddress'),
  inputIssuerEmail: document.getElementById('inputIssuerEmail'),
  inputBankInfo: document.getElementById('inputBankInfo'),
  inputNotes: document.getElementById('inputNotes'),
  btnInsertTemplateNote: document.getElementById('btnInsertTemplateNote'),

  // 印鑑関連
  checkShowStamp: document.getElementById('checkShowStamp'),
  btnAutoGenerateStamp: document.getElementById('btnAutoGenerateStamp'),
  fileStampUpload: document.getElementById('fileStampUpload'),
  stampPreviewThumb: document.getElementById('stampPreviewThumb'),

  // プレビュー側要素
  sheetDocTitle: document.getElementById('sheetDocTitle'),
  sheetDocSubject: document.getElementById('sheetDocSubject'),
  sheetDocNumber: document.getElementById('sheetDocNumber'),
  sheetLabelIssueDate: document.getElementById('sheetLabelIssueDate'),
  sheetIssueDate: document.getElementById('sheetIssueDate'),
  sheetRowDueDate: document.getElementById('sheetRowDueDate'),
  sheetLabelDueDate: document.getElementById('sheetLabelDueDate'),
  sheetDueDate: document.getElementById('sheetDueDate'),
  sheetClientName: document.getElementById('sheetClientName'),
  sheetClientHonorific: document.getElementById('sheetClientHonorific'),
  sheetClientZip: document.getElementById('sheetClientZip'),
  sheetClientAddress: document.getElementById('sheetClientAddress'),
  sheetClientContact: document.getElementById('sheetClientContact'),
  sheetLeadMessage: document.getElementById('sheetLeadMessage'),
  
  sheetIssuerName: document.getElementById('sheetIssuerName'),
  sheetIssuerInvoiceNo: document.getElementById('sheetIssuerInvoiceNo'),
  sheetIssuerZip: document.getElementById('sheetIssuerZip'),
  sheetIssuerAddress: document.getElementById('sheetIssuerAddress'),
  sheetIssuerTel: document.getElementById('sheetIssuerTel'),
  sheetIssuerFax: document.getElementById('sheetIssuerFax'),
  sheetIssuerEmail: document.getElementById('sheetIssuerEmail'),
  sheetStampWrapper: document.getElementById('sheetStampWrapper'),
  sheetStampImg: document.getElementById('sheetStampImg'),

  sheetAmountBannerLabel: document.getElementById('sheetAmountBannerLabel'),
  sheetBannerGrandTotal: document.getElementById('sheetBannerGrandTotal'),
  sheetBannerTaxTotal: document.getElementById('sheetBannerTaxTotal'),
  sheetItemsTableBody: document.getElementById('sheetItemsTableBody'),

  sheetBankCard: document.getElementById('sheetBankCard'),
  sheetBankInfo: document.getElementById('sheetBankInfo'),
  sheetNotesCard: document.getElementById('sheetNotesCard'),
  sheetNotes: document.getElementById('sheetNotes'),

  sheetSubtotalWithoutTax: document.getElementById('sheetSubtotalWithoutTax'),
  sheetTaxTotal: document.getElementById('sheetTaxTotal'),
  sheetGrandTotalLabel: document.getElementById('sheetGrandTotalLabel'),
  sheetGrandTotal: document.getElementById('sheetGrandTotal'),
  sheetSubtotal10: document.getElementById('sheetSubtotal10'),
  sheetTax10: document.getElementById('sheetTax10'),
  sheetSubtotal8: document.getElementById('sheetSubtotal8'),
  sheetTax8: document.getElementById('sheetTax8'),
  sheetRowTax0: document.getElementById('sheetRowTax0'),
  sheetSubtotal0: document.getElementById('sheetSubtotal0'),

  // アクションバー
  btnIssueDoc: document.getElementById('btnIssueDoc'),
  btnCancelIssueDoc: document.getElementById('btnCancelIssueDoc'),
  sidebarIssuedBanner: document.getElementById('sidebarIssuedBanner'),
  btnSidebarCancelIssue: document.getElementById('btnSidebarCancelIssue'),
  badgeAccountingSyncStatus: document.getElementById('badgeAccountingSyncStatus'),
  btnPrint: document.getElementById('btnPrint'),
  btnSaveHistory: document.getElementById('btnSaveHistory'),
  colorDotBtns: document.querySelectorAll('.color-dot-btn'),

  // ヘッダーボタン
  btnNewDoc: document.getElementById('btnNewDoc'),
  btnLoadSample: document.getElementById('btnLoadSample'),
  btnOpenHistory: document.getElementById('btnOpenHistory'),
  btnOpenHistorySidebar: document.getElementById('btnOpenHistorySidebar'),
  btnOpenBackup: document.getElementById('btnOpenBackup'),

  // モーダル
  historyModal: document.getElementById('historyModal'),
  btnCloseHistoryModal: document.getElementById('btnCloseHistoryModal'),
  btnCloseHistoryModal2: document.getElementById('btnCloseHistoryModal2'),
  historyListContainer: document.getElementById('historyListContainer'),
  historyTotalCountBadge: document.getElementById('historyTotalCountBadge'),
  historySearchProduct: document.getElementById('historySearchProduct'),
  historyProductQuickChips: document.getElementById('historyProductQuickChips'),
  historySearchClient: document.getElementById('historySearchClient'),
  historyClientDatalist: document.getElementById('historyClientDatalist'),
  historySearchMonth: document.getElementById('historySearchMonth'),
  historySearchDocType: document.getElementById('historySearchDocType'),
  historyMatchCount: document.getElementById('historyMatchCount'),
  historyMatchTotalAmount: document.getElementById('historyMatchTotalAmount'),
  btnResetHistoryFilters: document.getElementById('btnResetHistoryFilters'),

  backupModal: document.getElementById('backupModal'),
  btnCloseBackupModal: document.getElementById('btnCloseBackupModal'),
  btnCloseBackupModal2: document.getElementById('btnCloseBackupModal2'),
  btnExportJSON: document.getElementById('btnExportJSON'),
  fileImportJSON: document.getElementById('fileImportJSON'),
  toastContainer: document.getElementById('toastContainer'),

  // 商品マスタ関連
  btnOpenItemMaster: document.getElementById('btnOpenItemMaster'),
  btnOpenItemSelectModal: document.getElementById('btnOpenItemSelectModal'),
  itemMasterModal: document.getElementById('itemMasterModal'),
  btnCloseItemMasterModal: document.getElementById('btnCloseItemMasterModal'),
  btnCloseItemMasterModal2: document.getElementById('btnCloseItemMasterModal2'),
  inputSearchItemMaster: document.getElementById('inputSearchItemMaster'),
  btnToggleNewItemForm: document.getElementById('btnToggleNewItemForm'),
  itemMasterFormContainer: document.getElementById('itemMasterFormContainer'),
  itemMasterFormTitle: document.getElementById('itemMasterFormTitle'),
  itemMasterEditId: document.getElementById('itemMasterEditId'),
  itemMasterInputName: document.getElementById('itemMasterInputName'),
  calcInputUserPriceInc: document.getElementById('calcInputUserPriceInc'),
  calcDisplayUnitPrice: document.getElementById('calcDisplayUnitPrice'),
  calcDisplayWholesaleInc: document.getElementById('calcDisplayWholesaleInc'),
  calcDisplayProfit: document.getElementById('calcDisplayProfit'),
  calcModeWholesale: document.getElementById('calcModeWholesale'),
  calcModeStandard: document.getElementById('calcModeStandard'),
  calcPreviewSubInfo: document.getElementById('calcPreviewSubInfo'),
  btnApplyCalcPrice: document.getElementById('btnApplyCalcPrice'),
  itemMasterInputPrice: document.getElementById('itemMasterInputPrice'),
  itemMasterInputUnit: document.getElementById('itemMasterInputUnit'),
  itemMasterSelectTax: document.getElementById('itemMasterSelectTax'),
  itemMasterInputNote: document.getElementById('itemMasterInputNote'),
  btnCancelItemMasterForm: document.getElementById('btnCancelItemMasterForm'),
  btnSaveItemMasterForm: document.getElementById('btnSaveItemMasterForm'),
  itemMasterListContainer: document.getElementById('itemMasterListContainer'),

  // 取引先マスタ関連
  btnOpenClientMaster: document.getElementById('btnOpenClientMaster'),
  btnSelectClientFromMaster: document.getElementById('btnSelectClientFromMaster'),
  clientMasterDatalist: document.getElementById('clientMasterDatalist'),
  clientMasterModal: document.getElementById('clientMasterModal'),
  btnCloseClientMasterModal: document.getElementById('btnCloseClientMasterModal'),
  btnCloseClientMasterModal2: document.getElementById('btnCloseClientMasterModal2'),
  inputSearchClientMaster: document.getElementById('inputSearchClientMaster'),
  clientFilterBtns: document.querySelectorAll('.client-filter-btn'),
  btnToggleNewClientForm: document.getElementById('btnToggleNewClientForm'),
  clientMasterFormContainer: document.getElementById('clientMasterFormContainer'),
  clientMasterFormTitle: document.getElementById('clientMasterFormTitle'),
  clientMasterEditId: document.getElementById('clientMasterEditId'),
  clientMasterInputName: document.getElementById('clientMasterInputName'),
  clientMasterInputHonorific: document.getElementById('clientMasterInputHonorific'),
  clientMasterSelectCategory: document.getElementById('clientMasterSelectCategory'),
  clientMasterInputZip: document.getElementById('clientMasterInputZip'),
  clientMasterInputAddress: document.getElementById('clientMasterInputAddress'),
  clientMasterInputContact: document.getElementById('clientMasterInputContact'),
  clientMasterInputTel: document.getElementById('clientMasterInputTel'),
  clientMasterInputEmail: document.getElementById('clientMasterInputEmail'),
  clientMasterInputInvoiceNum: document.getElementById('clientMasterInputInvoiceNum'),
  clientMasterInputClosingDay: document.getElementById('clientMasterInputClosingDay'),
  clientMasterInputPaymentTerms: document.getElementById('clientMasterInputPaymentTerms'),
  clientMasterInputNote: document.getElementById('clientMasterInputNote'),
  clientMasterListContainer: document.getElementById('clientMasterListContainer'),

  // 在庫マスタ
  inventoryMasterModal: document.getElementById('inventoryMasterModal'),
  btnOpenInventoryMaster: document.getElementById('btnOpenInventoryMaster'),
  btnPortalOpenInventoryMaster: document.getElementById('btnPortalOpenInventoryMaster'),
  btnCloseInventoryMasterModal: document.getElementById('btnCloseInventoryMasterModal'),
  btnCloseInventoryMasterModal2: document.getElementById('btnCloseInventoryMasterModal2'),
  inputSearchInventory: document.getElementById('inputSearchInventory'),
  selectInventoryFilter: document.getElementById('selectInventoryFilter'),
  btnSyncInventoryWithItems: document.getElementById('btnSyncInventoryWithItems'),
  btnToggleNewInventoryForm: document.getElementById('btnToggleNewInventoryForm'),
  inventoryFormContainer: document.getElementById('inventoryFormContainer'),
  inventoryFormTitle: document.getElementById('inventoryFormTitle'),
  inventoryEditId: document.getElementById('inventoryEditId'),
  inventoryItemId: document.getElementById('inventoryItemId'),
  invInputName: document.getElementById('invInputName'),
  invInputSku: document.getElementById('invInputSku'),
  invInputCurrentStock: document.getElementById('invInputCurrentStock'),
  invInputSafetyStock: document.getElementById('invInputSafetyStock'),
  invInputUnit: document.getElementById('invInputUnit'),
  invInputUnitCost: document.getElementById('invInputUnitCost'),
  invInputUnitPrice: document.getElementById('invInputUnitPrice'),
  invInputLocation: document.getElementById('invInputLocation'),
  invInputNote: document.getElementById('invInputNote'),
  btnCancelInventoryForm: document.getElementById('btnCancelInventoryForm'),
  btnSaveInventoryItem: document.getElementById('btnSaveInventoryItem'),
  inventoryTableContainer: document.getElementById('inventoryTableContainer'),
  inventorySummaryStatus: document.getElementById('inventorySummaryStatus'),

  // 在庫入出庫調整モーダル
  inventoryAdjustModal: document.getElementById('inventoryAdjustModal'),
  adjustModalItemName: document.getElementById('adjustModalItemName'),
  btnCloseAdjustModal: document.getElementById('btnCloseAdjustModal'),
  adjustInventoryId: document.getElementById('adjustInventoryId'),
  adjustCurrentStockVal: document.getElementById('adjustCurrentStockVal'),
  adjustCurrentStockUnit: document.getElementById('adjustCurrentStockUnit'),
  labelAdjustTypeIn: document.getElementById('labelAdjustTypeIn'),
  labelAdjustTypeOut: document.getElementById('labelAdjustTypeOut'),
  labelAdjustTypeSet: document.getElementById('labelAdjustTypeSet'),
  adjustInputQty: document.getElementById('adjustInputQty'),
  adjustInputReason: document.getElementById('adjustInputReason'),
  adjustSimulationBox: document.getElementById('adjustSimulationBox'),
  adjustSimulatedStockVal: document.getElementById('adjustSimulatedStockVal'),
  btnCancelAdjust: document.getElementById('btnCancelAdjust'),
  btnConfirmAdjust: document.getElementById('btnConfirmAdjust'),

  // 在庫履歴モーダル
  inventoryHistoryModal: document.getElementById('inventoryHistoryModal'),
  historyModalItemName: document.getElementById('historyModalItemName'),
  historyModalItemSku: document.getElementById('historyModalItemSku'),
  btnCloseInventoryHistoryModal: document.getElementById('btnCloseInventoryHistoryModal'),
  btnCloseInventoryHistoryModal2: document.getElementById('btnCloseInventoryHistoryModal2'),
  inventoryHistoryTableContainer: document.getElementById('inventoryHistoryTableContainer'),

  // クイック新規品目追加モーダル（商品マスタ＆在庫マスタ同時登録）
  quickNewItemModal: document.getElementById('quickNewItemModal'),
  btnCloseQuickNewItemModal: document.getElementById('btnCloseQuickNewItemModal'),
  quickInputItemName: document.getElementById('quickInputItemName'),
  quickInputItemSku: document.getElementById('quickInputItemSku'),
  quickInputItemUnit: document.getElementById('quickInputItemUnit'),
  quickInputItemUnitCost: document.getElementById('quickInputItemUnitCost'),
  quickInputItemUnitPrice: document.getElementById('quickInputItemUnitPrice'),
  quickInputItemSafetyStock: document.getElementById('quickInputItemSafetyStock'),
  quickInputItemNote: document.getElementById('quickInputItemNote'),
  btnCancelQuickNewItem: document.getElementById('btnCancelQuickNewItem'),
  btnConfirmQuickNewItem: document.getElementById('btnConfirmQuickNewItem'),

  // 値引き関連
  btnOpenDiscountModal: document.getElementById('btnOpenDiscountModal'),
  discountModal: document.getElementById('discountModal'),
  btnCloseDiscountModal: document.getElementById('btnCloseDiscountModal'),
  btnCloseDiscountModal2: document.getElementById('btnCloseDiscountModal2'),
  discountInputReason: document.getElementById('discountInputReason'),
  discountReasonTagsContainer: document.getElementById('discountReasonTagsContainer'),
  discountBaseUserPriceInc: document.getElementById('discountBaseUserPriceInc'),
  discountSelectType: document.getElementById('discountSelectType'),
  discountInputValue: document.getElementById('discountInputValue'),
  discountSelectTaxRate: document.getElementById('discountSelectTaxRate'),
  displayUserDiscountAmount: document.getElementById('displayUserDiscountAmount'),
  displayWholesaleDiscountUnitPrice: document.getElementById('displayWholesaleDiscountUnitPrice'),
  btnAddDiscountToItems: document.getElementById('btnAddDiscountToItems'),

  // 請求書詳細・直接編集モーダル（財務会計連携）
  invoiceQuickEditModal: document.getElementById('invoiceQuickEditModal'),
  btnCloseIqeModal: document.getElementById('btnCloseIqeModal'),
  btnCancelIqeModal: document.getElementById('btnCancelIqeModal'),
  btnSaveIqeModal: document.getElementById('btnSaveIqeModal'),
  btnIqeCancelIssue: document.getElementById('btnIqeCancelIssue'),
  btnIqeOpenInEditor: document.getElementById('btnIqeOpenInEditor'),
  btnIqeAddItem: document.getElementById('btnIqeAddItem'),
  iqeModalTitle: document.getElementById('iqeModalTitle'),
  iqeDocNumberSub: document.getElementById('iqeDocNumberSub'),
  iqeStatusBadge: document.getElementById('iqeStatusBadge'),
  iqeDocId: document.getElementById('iqeDocId'),
  iqeDocType: document.getElementById('iqeDocType'),
  iqeIssueDate: document.getElementById('iqeIssueDate'),
  iqeDueDate: document.getElementById('iqeDueDate'),
  iqePaymentStatus: document.getElementById('iqePaymentStatus'),
  iqeClientName: document.getElementById('iqeClientName'),
  iqeTitle: document.getElementById('iqeTitle'),
  iqeItemsTableBody: document.getElementById('iqeItemsTableBody'),
  iqeNotes: document.getElementById('iqeNotes'),
  iqeSubtotal: document.getElementById('iqeSubtotal'),
  iqeTaxTotal: document.getElementById('iqeTaxTotal'),
  iqeGrandTotal: document.getElementById('iqeGrandTotal'),

  // 会計・収支ダッシュボード
  btnOpenAccounting: document.getElementById('btnOpenAccounting'),
  accountingViewScreen: document.getElementById('accountingViewScreen'),
  accountingModal: document.getElementById('accountingViewScreen') || document.getElementById('accountingModal'),
  btnCloseAccountingModal: document.getElementById('btnCloseAccountingModal'),
  btnCloseAccountingModal2: document.getElementById('btnCloseAccountingModal2'),
  expensesViewScreen: document.getElementById('expensesViewScreen'),
  btnCloseExpensesScreen: document.getElementById('btnCloseExpensesScreen'),
  accTabBtns: document.querySelectorAll('.acc-tab-btn'),
  accPanes: document.querySelectorAll('.acc-pane'),
  accSelectMonth: document.getElementById('accSelectMonth'),
  // 財務会計トップバー 共通集計期間セレクター
  accGlobalPeriodPreset: document.getElementById('accGlobalPeriodPreset'),
  accGlobalPeriodStart: document.getElementById('accGlobalPeriodStart'),
  accGlobalPeriodEnd: document.getElementById('accGlobalPeriodEnd'),
  btnApplyAccGlobalCustomRange: document.getElementById('btnApplyAccGlobalCustomRange'),
  badgeAccActivePeriod: document.getElementById('badgeAccActivePeriod'),
  dispAccActivePeriodText: document.getElementById('dispAccActivePeriodText'),
  accDateRangeModal: document.getElementById('accDateRangeModal'),
  modalAccDateStart: document.getElementById('modalAccDateStart'),
  modalAccDateEnd: document.getElementById('modalAccDateEnd'),
  modalAccDateRangePreview: document.getElementById('modalAccDateRangePreview'),
  btnConfirmAccDateRange: document.getElementById('btnConfirmAccDateRange'),
  kpiTotalSales: document.getElementById('kpiTotalSales'),
  kpiTotalSalesInc: document.getElementById('kpiTotalSalesInc'),
  kpiGrossProfit: document.getElementById('kpiGrossProfit'),
  kpiGrossMargin: document.getElementById('kpiGrossMargin'),
  kpiTotalExpenses: document.getElementById('kpiTotalExpenses'),
  kpiExpenseItemsCount: document.getElementById('kpiExpenseItemsCount'),
  kpiOperatingProfit: document.getElementById('kpiOperatingProfit'),
  kpiOperatingMargin: document.getElementById('kpiOperatingMargin'),
  kpiUnpaidSales: document.getElementById('kpiUnpaidSales'),
  kpiCollectionRate: document.getElementById('kpiCollectionRate'),
  accMonthlyChart: document.getElementById('accMonthlyChart'),
  accExpenseCategoryList: document.getElementById('accExpenseCategoryList'),
  accSalesTableBody: document.getElementById('accSalesTableBody'),
  btnFilterAllInvoices: document.getElementById('btnFilterAllInvoices'),
  btnFilterUnpaidInvoices: document.getElementById('btnFilterUnpaidInvoices'),
  btnFilterPaidInvoices: document.getElementById('btnFilterPaidInvoices'),
  receiptDropZone: document.getElementById('receiptDropZone'),
  receiptFileInput: document.getElementById('receiptFileInput'),
  receiptImagePreviewContainer: document.getElementById('receiptImagePreviewContainer'),
  receiptImagePreview: document.getElementById('receiptImagePreview'),
  receiptImageScrollBox: document.getElementById('receiptImageScrollBox'),
  btnZoomReceiptImage: document.getElementById('btnZoomReceiptImage'),
  btnClearReceiptImage: document.getElementById('btnClearReceiptImage'),
  receiptZoomModal: document.getElementById('receiptZoomModal'),
  receiptZoomImage: document.getElementById('receiptZoomImage'),
  btnCloseReceiptZoom: document.getElementById('btnCloseReceiptZoom'),
  btnDownloadReceiptZoom: document.getElementById('btnDownloadReceiptZoom'),
  receiptZoomMetaDate: document.getElementById('receiptZoomMetaDate'),
  receiptZoomMetaPayee: document.getElementById('receiptZoomMetaPayee'),
  receiptZoomMetaAmount: document.getElementById('receiptZoomMetaAmount'),
  receiptZoomMetaInvoice: document.getElementById('receiptZoomMetaInvoice'),
  receiptOcrStatus: document.getElementById('receiptOcrStatus'),
  receiptOcrStatusText: document.getElementById('receiptOcrStatusText'),
  geminiOcrBadge: document.getElementById('geminiOcrBadge'),
  formExpenseInput: document.getElementById('formExpenseInput'),
  expenseEditId: document.getElementById('expenseEditId'),
  expenseInputDate: document.getElementById('expenseInputDate'),
  expenseSelectCategory: document.getElementById('expenseSelectCategory'),
  expenseInputAmount: document.getElementById('expenseInputAmount'),
  expenseSelectTax: document.getElementById('expenseSelectTax'),
  expenseInputPayee: document.getElementById('expenseInputPayee'),
  expenseInputInvoiceNum: document.getElementById('expenseInputInvoiceNum'),
  expenseInputNote: document.getElementById('expenseInputNote'),
  expenseInputClaimant: document.getElementById('expenseInputClaimant'),
  btnClaimantKobayashi: document.getElementById('btnClaimantKobayashi'),
  btnClaimantMiyazaki: document.getElementById('btnClaimantMiyazaki'),
  btnClaimantCompany: document.getElementById('btnClaimantCompany'),
  btnResetExpenseForm: document.getElementById('btnResetExpenseForm'),
  btnSaveExpense: document.getElementById('btnSaveExpense'),
  radioExpenseTypeExpense: document.getElementById('radioExpenseTypeExpense'),
  radioExpenseTypePurchase: document.getElementById('radioExpenseTypePurchase'),
  labelExpenseTypeExpense: document.getElementById('labelExpenseTypeExpense'),
  labelExpenseTypePurchase: document.getElementById('labelExpenseTypePurchase'),
  expenseInventoryPanel: document.getElementById('expenseInventoryPanel'),
  expensePurchaseMatchBadge: document.getElementById('expensePurchaseMatchBadge'),
  expenseSelectInventoryItem: document.getElementById('expenseSelectInventoryItem'),
  btnQuickCreateInventory: document.getElementById('btnQuickCreateInventory'),
  expenseInputInQty: document.getElementById('expenseInputInQty'),
  expenseInventoryUnitDisp: document.getElementById('expenseInventoryUnitDisp'),
  expenseStockPreviewBox: document.getElementById('expenseStockPreviewBox'),
  expenseCurrentStockDisp: document.getElementById('expenseCurrentStockDisp'),
  expenseAfterStockDisp: document.getElementById('expenseAfterStockDisp'),
  expenseStockDeltaDisp: document.getElementById('expenseStockDeltaDisp'),
  expenseCheckSaveMapping: document.getElementById('expenseCheckSaveMapping'),
  expenseDispRawPayee: document.getElementById('expenseDispRawPayee'),
  expenseListTotalAmount: document.getElementById('expenseListTotalAmount'),
  expenseTableBody: document.getElementById('expenseTableBody'),
  expenseFilterClaimant: document.getElementById('expenseFilterClaimant'),
  expenseFilterUnsettledOnly: document.getElementById('expenseFilterUnsettledOnly'),
  btnExportJournalCSV: document.getElementById('btnExportJournalCSV'),
  accJournalTableBody: document.getElementById('accJournalTableBody'),

  // 経費精算書モーダル
  btnOpenExpenseSettlementModal: document.getElementById('btnOpenExpenseSettlementModal'),
  btnOpenExpenseSettlementModalAcc: document.getElementById('btnOpenExpenseSettlementModalAcc') || document.getElementById('btnOpenExpenseSettlementModalFromAcc'),
  expenseSettlementModal: document.getElementById('expenseSettlementModal'),
  btnCloseExpenseSettlementModal: document.getElementById('btnCloseExpenseSettlementModal'),
  btnCloseExpenseSettlementModal2: document.getElementById('btnCloseExpenseSettlementModal2'),
  btnPrintExpenseSettlement: document.getElementById('btnPrintExpenseSettlement'),
  btnMarkExpensesSettled: document.getElementById('btnMarkExpensesSettled'),
  settlementModalClaimant: document.getElementById('settlementModalClaimant'),
  settlementModalPeriodStart: document.getElementById('settlementModalPeriodStart'),
  settlementModalPeriodEnd: document.getElementById('settlementModalPeriodEnd'),
  settlementModalUnsettledOnly: document.getElementById('settlementModalUnsettledOnly'),
  btnApplySettlementFilter: document.getElementById('btnApplySettlementFilter'),
  settlementSheetApplyDate: document.getElementById('settlementSheetApplyDate'),
  settlementSheetPeriod: document.getElementById('settlementSheetPeriod'),
  settlementSheetClaimantName: document.getElementById('settlementSheetClaimantName'),
  settlementSheetItemCount: document.getElementById('settlementSheetItemCount'),
  settlementSheetTax10Subtotal: document.getElementById('settlementSheetTax10Subtotal'),
  settlementSheetTax8Subtotal: document.getElementById('settlementSheetTax8Subtotal'),
  settlementSheetGrandTotal: document.getElementById('settlementSheetGrandTotal'),
  settlementSheetTableBody: document.getElementById('settlementSheetTableBody'),

  // 勤怠打刻（タイムカード）
  btnOpenAttendance: document.getElementById('btnOpenAttendance'),
  attendanceViewScreen: document.getElementById('attendanceViewScreen'),
  attendanceModal: document.getElementById('attendanceViewScreen') || document.getElementById('attendanceModal'),
  btnCloseAttendanceModal: document.getElementById('btnCloseAttendanceModal'),
  btnCloseAttendanceModal2: document.getElementById('btnCloseAttendanceModal2'),
  attendanceLiveDate: document.getElementById('attendanceLiveDate'),
  attendanceLiveTime: document.getElementById('attendanceLiveTime'),
  attendanceTodayStatusText: document.getElementById('attendanceTodayStatusText'),
  btnClockIn: document.getElementById('btnClockIn'),
  displayClockInTime: document.getElementById('displayClockInTime'),
  btnClockOut: document.getElementById('btnClockOut'),
  displayClockOutTime: document.getElementById('displayClockOutTime'),
  attendanceSummaryTitle: document.getElementById('attendanceSummaryTitle'),
  attendanceMonthFilter: document.getElementById('attendanceMonthFilter'),
  attendanceHistoryFilterBadge: document.getElementById('attendanceHistoryFilterBadge'),
  summaryWorkDays: document.getElementById('summaryWorkDays'),
  summaryTotalWorkHours: document.getElementById('summaryTotalWorkHours'),
  summaryTotalOvertime: document.getElementById('summaryTotalOvertime'),
  btnExportAttendanceCSV: document.getElementById('btnExportAttendanceCSV'),
  attendanceTableBody: document.getElementById('attendanceTableBody'),

  // 勤怠・打刻漏れ手動入力フォーム
  btnOpenAttendanceSheetModal: document.getElementById('btnOpenAttendanceSheetModal'),
  attendanceManualFormCard: document.getElementById('attendanceManualFormCard'),
  attendanceManualFormTitle: document.getElementById('attendanceManualFormTitle'),
  btnToggleManualAttendanceForm: document.getElementById('btnToggleManualAttendanceForm'),
  btnCloseAttendanceManualForm: document.getElementById('btnCloseAttendanceManualForm'),
  btnCancelAttendanceManual: document.getElementById('btnCancelAttendanceManual'),
  btnSaveAttendanceManual: document.getElementById('btnSaveAttendanceManual'),
  inputManualAttId: document.getElementById('inputManualAttId'),
  inputManualAttDate: document.getElementById('inputManualAttDate'),
  inputManualAttClockIn: document.getElementById('inputManualAttClockIn'),
  inputManualAttClockOut: document.getElementById('inputManualAttClockOut'),
  inputManualAttNote: document.getElementById('inputManualAttNote'),

  // 出勤簿A4帳票モーダル
  attendanceSheetModal: document.getElementById('attendanceSheetModal'),
  btnCloseAttendanceSheetModal: document.getElementById('btnCloseAttendanceSheetModal'),
  btnCloseAttendanceSheetModal2: document.getElementById('btnCloseAttendanceSheetModal2'),
  btnPrevSheetMonth: document.getElementById('btnPrevSheetMonth'),
  btnNextSheetMonth: document.getElementById('btnNextSheetMonth'),
  sheetMonthSelector: document.getElementById('sheetMonthSelector'),
  btnPrintAttendanceSheet: document.getElementById('btnPrintAttendanceSheet'),
  dispSheetYear: document.getElementById('dispSheetYear'),
  dispSheetMonth: document.getElementById('dispSheetMonth'),
  inputSheetEmpNo: document.getElementById('inputSheetEmpNo'),
  inputSheetEmpName: document.getElementById('inputSheetEmpName'),
  attCalendarTableBody: document.getElementById('attCalendarTableBody'),
  dispSheetSummaryDays: document.getElementById('dispSheetSummaryDays'),
  dispSheetSummaryRegular: document.getElementById('dispSheetSummaryRegular'),
  dispSheetSummaryOvertime: document.getElementById('dispSheetSummaryOvertime'),
  dispSheetSummaryTotal: document.getElementById('dispSheetSummaryTotal'),

  // 統合業務ポータルMENU ＆ アプリスイッチャー
  portalMenuScreen: document.getElementById('portalMenuScreen'),
  portalLiveDate: document.getElementById('portalLiveDate'),
  portalLiveTime: document.getElementById('portalLiveTime'),
  dispPortalCompanyName: document.getElementById('dispPortalCompanyName'),
  appSwitcherNav: document.getElementById('appSwitcherNav'),
  appLayoutInvoice: document.getElementById('appLayoutInvoice'),

  // 給与計算モジュール
  payrollView: document.getElementById('payrollView'),
  payrollMonthSelector: document.getElementById('payrollMonthSelector'),
  btnPayrollPrevMonth: document.getElementById('btnPayrollPrevMonth'),
  btnPayrollNextMonth: document.getElementById('btnPayrollNextMonth'),
  btnPayrollImportAttendance: document.getElementById('btnPayrollImportAttendance'),
  btnPayrollToggleSettings: document.getElementById('btnPayrollToggleSettings'),
  btnPayrollSave: document.getElementById('btnPayrollSave'),
  btnPayrollOpenSheetModal: document.getElementById('btnPayrollOpenSheetModal'),
  btnPayrollSyncToAccounting: document.getElementById('btnPayrollSyncToAccounting'),
  payrollSettingsCard: document.getElementById('payrollSettingsCard'),
  btnClosePayrollSettings: document.getElementById('btnClosePayrollSettings'),
  btnSavePayrollSettings: document.getElementById('btnSavePayrollSettings'),
  payrollCardTotalGross: document.getElementById('payrollCardTotalGross'),
  payrollCardTotalDeductions: document.getElementById('payrollCardTotalDeductions'),
  payrollCardNetPay: document.getElementById('payrollCardNetPay'),
  dispPayrollCardGrossSub: document.getElementById('dispPayrollCardGrossSub'),
  dispPayrollCardDeductionSub: document.getElementById('dispPayrollCardDeductionSub'),
  dispCurrentPayrollTitle: document.getElementById('dispCurrentPayrollTitle'),
  dispPayrollWorkPeriodBadge: document.getElementById('dispPayrollWorkPeriodBadge'),
  payrollHistoryTableBody: document.getElementById('payrollHistoryTableBody'),

  // 育児休業コントロール
  checkPayIsChildcare: document.getElementById('checkPayIsChildcare'),
  checkPayExemptSocial: document.getElementById('checkPayExemptSocial'),
  selectPayDailyWageType: document.getElementById('selectPayDailyWageType'),
  inputPayDailyWageUnit: document.getElementById('inputPayDailyWageUnit'),
  wrapperPayDailyWageUnit: document.getElementById('wrapperPayDailyWageUnit'),
  badgeChildcarePeriodStatus: document.getElementById('badgeChildcarePeriodStatus'),
  settingPayChildcareStart: document.getElementById('settingPayChildcareStart'),
  settingPayChildcareEnd: document.getElementById('settingPayChildcareEnd'),
  dispSettingChildcarePeriod: document.getElementById('dispSettingChildcarePeriod'),
  settingPayEmploymentType: document.getElementById('settingPayEmploymentType'),
  settingPayEmploymentRate: document.getElementById('settingPayEmploymentRate'),

  // A4給与支給明細書モーダル
  payrollSheetModal: document.getElementById('payrollSheetModal'),
  btnClosePayrollSheetModal: document.getElementById('btnClosePayrollSheetModal'),
  btnClosePayrollSheetModal2: document.getElementById('btnClosePayrollSheetModal2'),
  btnPrintPayrollSheet: document.getElementById('btnPrintPayrollSheet'),
  dispModalPayrollSubTitle: document.getElementById('dispModalPayrollSubTitle'),
  printPayPeriod: document.getElementById('printPayPeriod'),

  // 前年所得・住民税法定計算
  btnPayrollTogglePrevYear: document.getElementById('btnPayrollTogglePrevYear'),
  payrollPrevYearCard: document.getElementById('payrollPrevYearCard'),
  btnClosePayrollPrevYear: document.getElementById('btnClosePayrollPrevYear'),
  prevYearTarget: document.getElementById('prevYearTarget'),
  prevYearGrossSalary: document.getElementById('prevYearGrossSalary'),
  prevYearSocialDeduction: document.getElementById('prevYearSocialDeduction'),
  prevYearDependents: document.getElementById('prevYearDependents'),
  dispPrevYearAnnualTax: document.getElementById('dispPrevYearAnnualTax'),
  dispPrevYearTaxJune: document.getElementById('dispPrevYearTaxJune'),
  dispPrevYearTaxRegular: document.getElementById('dispPrevYearTaxRegular'),
  dispPrevYearTaxMessage: document.getElementById('dispPrevYearTaxMessage'),
  btnCalcPrevYearTax: document.getElementById('btnCalcPrevYearTax'),
  btnSavePrevYearIncome: document.getElementById('btnSavePrevYearIncome'),
  btnApplyResidentTaxToSettings: document.getElementById('btnApplyResidentTaxToSettings')
};

// ==========================================================================
// 初期化
// ==========================================================================
function initApp() {
  // 保存されたアクティブドキュメントがあるか確認
  const saved = loadActiveDoc();
  const profile = loadIssuerProfile() || {};

  if (saved) {
    currentDoc = saved;
    if (!currentDoc.issuer) currentDoc.issuer = {};
    // プロファイルの最新自社情報をベースに確実に補完
    currentDoc.issuer = {
      ...profile,
      ...currentDoc.issuer
    };
    if (!currentDoc.issuer.name || currentDoc.issuer.name === '株式会社サンプル商事') {
      currentDoc.issuer.name = profile.name || '株式会社アルバワークス';
    }
    if (!currentDoc.issuer.invoiceNumber) currentDoc.issuer.invoiceNumber = profile.invoiceNumber || 'T2070001004966';
    if (!currentDoc.issuer.bankInfo) currentDoc.issuer.bankInfo = profile.bankInfo || '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス';
    if (!currentDoc.issuer.address) currentDoc.issuer.address = profile.address || '群馬県前橋市下川町63-7';
    if (!currentDoc.issuer.zip) currentDoc.issuer.zip = profile.zip || '379-2144';
    if (!currentDoc.issuer.tel) currentDoc.issuer.tel = profile.tel || '027-289-0367';
    if (!currentDoc.issuer.stampDataUrl) currentDoc.issuer.stampDataUrl = profile.stampDataUrl || generateCompanyStamp(currentDoc.issuer.name);
  } else {
    // 保存データがなければ白紙の新規書類を設定
    currentDoc = createEmptyInvoice('invoice');
    currentDoc.issuer = { ...profile };
    if (!currentDoc.issuer.name) currentDoc.issuer.name = '株式会社アルバワークス';
    if (!currentDoc.issuer.invoiceNumber) currentDoc.issuer.invoiceNumber = 'T2070001004966';
    if (!currentDoc.issuer.stampDataUrl) currentDoc.issuer.stampDataUrl = generateCompanyStamp(currentDoc.issuer.name);
  }

  // UIへ反映
  populateFormFromDoc();
  updateThemeColor(currentDoc.themeColor || 'indigo');
  renderAll();

  // イベントリスナーを接続
  setupEventListeners();

  // 取引先マスタのオートコンプリートリストを初期化
  updateClientMasterDatalist();

  // マスタの自動救済・復元 ＆ サーバーファイル（data/）永続化同期
  initMastersPersistence().then(result => {
    updateClientMasterDatalist();
    updateAttendanceUI(); // サーバーから同期された勤怠情報をUIに反映
    if (typeof renderAccountingExpenses === 'function') {
      const period = (typeof currentAccGlobalPeriod !== 'undefined') ? currentAccGlobalPeriod : { preset: 'all' };
      renderAccountingExpenses(period);
    }

    // サーバーファイル（data/company/issuer_profile.json）から最新の自社プロファイル（振込先・社名・住所・印鑑）を確実に復元・反映
    const syncedProfile = loadIssuerProfile();
    if (syncedProfile) {
      if (!currentDoc.issuer) currentDoc.issuer = {};
      currentDoc.issuer = { ...syncedProfile, ...currentDoc.issuer };
      if (syncedProfile.bankInfo) {
        currentDoc.issuer.bankInfo = syncedProfile.bankInfo;
      }
      populateFormFromDoc();
      renderAll();
      updatePortalInfo();
    }

    if (result && (result.rescuedItems > 0 || result.rescuedClients > 0)) {
      const msgs = [];
      if (result.rescuedItems > 0) msgs.push(`商品マスタ: ${result.rescuedItems}件`);
      if (result.rescuedClients > 0) msgs.push(`取引先マスタ: ${result.rescuedClients}件`);
      showToast(`過去伝票から【${msgs.join('、')}】を自動復元・保存しました！`, 'success');
    }
  }).catch(e => {
    console.warn('Init masters persistence warning:', e);
  });

  // 在庫マスタ ＆ 仕入マッピングのサーバー同期
  initInventoryFromServer().then(() => {
    populateExpenseInventoryDropdown();
  }).catch(e => {
    console.warn('Init inventory persistence warning:', e);
  });

  // 起動時はポータルMENUを表示（初回起動時）
  switchAppView('portal');
  updatePortalInfo();
}

// ==========================================================================
// 統合業務ポータル・各専用画面切替ロジック (AlvaCraft ERP)
// ポップアップ（モーダル）ではなく独立した広大な専用ワークスペースとして切替
// ==========================================================================
let currentAppView = 'portal';

function switchEditorTab(targetId) {
  try {
    const tabBtns = document.querySelectorAll('.editor-tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.tab === targetId);
    });
    tabPanes.forEach(p => {
      const isActive = (p.id === targetId);
      p.classList.toggle('active', isActive);
      p.style.display = isActive ? 'block' : 'none';
    });
    if (targetId === 'tab-items' && typeof renderItemsEditor === 'function') {
      renderItemsEditor();
    }
  } catch (err) {
    console.error('switchEditorTab error:', err);
  }
}
window.switchEditorTab = switchEditorTab;

function switchAppView(viewName) {
  try {
    currentAppView = viewName || 'portal';

    // 1. スイッチャーボタンのactive状態を更新
    const switchBtns = document.querySelectorAll('.app-switch-btn');
    switchBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.app === currentAppView);
    });

    // 2. 全ての専用フル画面から active を除去（ポップアップの重ね合わせを完全排除）
    const allScreens = document.querySelectorAll('.app-view-screen');
    allScreens.forEach(screen => {
      screen.classList.remove('active');
    });

    // 3. 補助モーダル（出勤簿A4帳票、履歴、マスタなど）も画面切り替え時は閉じる
    if (DOM.attendanceSheetModal) DOM.attendanceSheetModal.classList.remove('active');
    if (DOM.historyModal) DOM.historyModal.classList.remove('active');
    if (DOM.itemMasterModal) DOM.itemMasterModal.classList.remove('active');
    if (DOM.clientMasterModal) DOM.clientMasterModal.classList.remove('active');
    if (DOM.inventoryMasterModal) DOM.inventoryMasterModal.style.display = 'none';
    if (DOM.inventoryAdjustModal) DOM.inventoryAdjustModal.style.display = 'none';
    if (DOM.inventoryHistoryModal) DOM.inventoryHistoryModal.style.display = 'none';
    if (DOM.backupModal) DOM.backupModal.classList.remove('active');
    if (DOM.receiptZoomModal) DOM.receiptZoomModal.classList.remove('active');
    document.body.style.overflow = '';

    // 4. 対象の専用画面をアクティブ化し、必要なデータ描画・初期化を行う
    switch (currentAppView) {
      case 'portal':
        const portalScreen = document.getElementById('portalMenuScreen') || DOM.portalMenuScreen;
        if (portalScreen) {
          portalScreen.classList.add('active');
          try { updatePortalInfo(); } catch (err) { console.error('Error updating portal info:', err); }
        }
        break;

      case 'invoice':
        // 納品・請求書専用画面（エディタ＋A4プレビューの左右分割レイアウト）
        const invoiceScreen = document.getElementById('appLayoutInvoice') || DOM.appLayoutInvoice;
        if (invoiceScreen) {
          invoiceScreen.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;

      case 'accounting':
        // 財務会計専用画面（収支・P/L・入金消込・仕訳帳）
        const accScreen = document.getElementById('accountingViewScreen') || DOM.accountingViewScreen || DOM.accountingModal;
        if (accScreen) {
          accScreen.classList.add('active');
        }
        try {
          if (typeof initAccountingMonthSelector === 'function') initAccountingMonthSelector();
          if (typeof applyAccGlobalPeriod === 'function' && typeof currentAccGlobalPeriod !== 'undefined') {
            applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
          }
          if (typeof switchAccountingTab === 'function') switchAccountingTab('acc-tab-dashboard');
          // 財務会計画面表示時にサーバー最新経費を自動同期
          if (typeof syncExpensesWithServer === 'function') {
            syncExpensesWithServer().then(() => {
              if (typeof renderAccountingExpenses === 'function') renderAccountingExpenses();
            }).catch(() => {});
          }
        } catch (err) {
          console.error('Error initializing accounting view:', err);
        }
        break;

      case 'expenses':
        // 経費読み込み専用画面（AI OCRレシート解析 ＆ 経費登録・明細管理）
        const expScreen = document.getElementById('expensesViewScreen') || DOM.expensesViewScreen;
        if (expScreen) {
          expScreen.classList.add('active');
        }
        try {
          if (typeof setActiveExpenseClaimant === 'function') setActiveExpenseClaimant(activeExpenseClaimant);
          if (typeof populateExpenseInventoryDropdown === 'function') populateExpenseInventoryDropdown();
          if (typeof renderAccountingExpenses === 'function') {
            const period = (typeof currentAccGlobalPeriod !== 'undefined') ? currentAccGlobalPeriod : { preset: 'all' };
            renderAccountingExpenses(period);
            // 経費画面表示時に即座にサーバーから最新経費を取得・マージして再描画
            if (typeof syncExpensesWithServer === 'function') {
              syncExpensesWithServer().then(() => {
                renderAccountingExpenses(period);
              }).catch(() => {});
            }
          }
          if (typeof window.checkGeminiStatus === 'function') {
            window.checkGeminiStatus();
          }
        } catch (err) {
          console.error('Error initializing expenses view:', err);
        }
        break;

      case 'attendance':
        // 勤怠管理・退勤打刻専用画面（打刻パネル ＆ タイムカード履歴）
        const attScreen = document.getElementById('attendanceViewScreen') || DOM.attendanceViewScreen || DOM.attendanceModal;
        if (attScreen) {
          attScreen.classList.add('active');
        }
        try {
          if (typeof openAttendanceModal === 'function') openAttendanceModal();
        } catch (err) {
          console.error('Error initializing attendance view:', err);
        }
        break;

      case 'payroll':
        // 給与計算専用画面（月給制・勤怠連動・支給控除集計）
        const payScreen = document.getElementById('payrollView') || DOM.payrollView;
        if (payScreen) {
          payScreen.classList.add('active');
          payScreen.style.display = 'flex';
        }
        try {
          if (typeof initPayroll === 'function') initPayroll();
        } catch (err) {
          console.error('Error initializing payroll view:', err);
        }
        break;
    }
  } catch (globalErr) {
    console.error('Fatal error in switchAppView:', globalErr);
  }
}

window.switchAppView = switchAppView;

function updatePortalInfo() {
  // 会社名の反映
  const profile = loadIssuerProfile();
  if (DOM.dispPortalCompanyName) {
    DOM.dispPortalCompanyName.textContent = (profile && profile.name) ? profile.name : '株式会社アルバワークス';
  }

  // リアルタイム時計の更新
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dayStr = days[now.getDay()];
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  if (DOM.portalLiveDate) {
    DOM.portalLiveDate.textContent = `${y}年${m}月${d}日 (${dayStr})`;
  }
  if (DOM.portalLiveTime) {
    DOM.portalLiveTime.textContent = `${hh}:${mm}:${ss}`;
  }
}

// 毎秒ポータル時計を更新
setInterval(() => {
  if (currentAppView === 'portal') {
    updatePortalInfo();
  }
}, 1000);

// ==========================================================================
// フォームへのデータ設定
// ==========================================================================
function populateFormFromDoc() {
  // 書類種別ボタングループの選択状態
  DOM.docTypeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentDoc.docType);
  });

  // 基本情報
  DOM.inputDocNumber.value = currentDoc.docNumber || '';
  DOM.inputIssueDate.value = currentDoc.issueDate || '';
  DOM.inputDueDate.value = currentDoc.dueDate || '';
  DOM.inputTitle.value = currentDoc.title || '';

  // 取引先
  DOM.inputClientName.value = currentDoc.client?.name || '';
  DOM.inputClientHonorific.value = currentDoc.client?.honorific || '御中';
  DOM.inputClientZip.value = currentDoc.client?.zip || '';
  DOM.inputClientAddress.value = currentDoc.client?.address || '';
  DOM.inputClientContact.value = currentDoc.client?.contactPerson || '';

  // 自社情報（自社情報設定モーダルで管理）
  if (DOM.inputIssuerName) DOM.inputIssuerName.value = currentDoc.issuer?.name || '';
  if (DOM.inputIssuerInvoiceNo) DOM.inputIssuerInvoiceNo.value = currentDoc.issuer?.invoiceNumber || '';
  if (DOM.inputIssuerZip) DOM.inputIssuerZip.value = currentDoc.issuer?.zip || '';
  if (DOM.inputIssuerTel) DOM.inputIssuerTel.value = currentDoc.issuer?.tel || '';
  if (DOM.inputIssuerFax) DOM.inputIssuerFax.value = currentDoc.issuer?.fax || '';
  if (DOM.inputIssuerAddress) DOM.inputIssuerAddress.value = currentDoc.issuer?.address || '';
  if (DOM.inputIssuerEmail) DOM.inputIssuerEmail.value = currentDoc.issuer?.email || '';
  if (DOM.inputBankInfo) DOM.inputBankInfo.value = currentDoc.issuer?.bankInfo || '';
  if (DOM.inputNotes) DOM.inputNotes.value = currentDoc.notes || '';

  // 印鑑
  if (DOM.checkShowStamp) DOM.checkShowStamp.checked = currentDoc.issuer?.showStamp !== false;
  if (typeof updateStampThumbnail === 'function') updateStampThumbnail(currentDoc.issuer?.stampDataUrl);

  // 端数処理
  DOM.selectFractionRule.value = currentDoc.taxFractionRule || 'floor';

  // 明細行の入力カード再構築
  renderItemInputCards();
}

// ==========================================================================
// 全体レンダリング（プレビュー更新 & 計算）
// ==========================================================================
function updateItemCountBadge() {
  const count = (currentDoc && currentDoc.items && Array.isArray(currentDoc.items)) ? currentDoc.items.length : 0;
  const countBadge = DOM.itemCountBadge || document.getElementById('itemCountBadge');
  if (countBadge) {
    countBadge.textContent = count;
  }
}

function renderAll() {
  const meta = DOC_TYPES[currentDoc.docType] || DOC_TYPES.invoice;

  // 明細件数バッジの更新
  updateItemCountBadge();

  // ラベル文言の更新
  DOM.labelIssueDate.textContent = meta.dateLabel;
  DOM.labelDueDate.textContent = meta.dueLabel;

  // シートタイトル（文字間隔を空けて格式高く）
  let spacedTitle = meta.badge;
  if (spacedTitle.length === 3) {
    spacedTitle = spacedTitle[0] + ' ' + spacedTitle[1] + ' ' + spacedTitle[2];
  } else if (spacedTitle.length === 4) {
    spacedTitle = spacedTitle[0] + ' ' + spacedTitle[1] + ' ' + spacedTitle[2] + ' ' + spacedTitle[3];
  }
  DOM.sheetDocTitle.textContent = spacedTitle;
  DOM.sheetDocSubject.textContent = currentDoc.title || '';

  // メタ情報
  DOM.sheetDocNumber.textContent = currentDoc.docNumber || '';
  DOM.sheetLabelIssueDate.textContent = meta.dateLabel;
  DOM.sheetIssueDate.textContent = formatJapaneseDate(currentDoc.issueDate);
  
  // 期日（領収書の場合は不要または但し書きとして扱う）
  if (currentDoc.docType === 'receipt') {
    DOM.sheetRowDueDate.style.display = 'none';
  } else {
    DOM.sheetRowDueDate.style.display = 'table-row';
    DOM.sheetLabelDueDate.textContent = meta.dueLabel;
    DOM.sheetDueDate.textContent = formatJapaneseDate(currentDoc.dueDate);
  }

  // 取引先
  DOM.sheetClientName.textContent = currentDoc.client?.name || '　　　　　　　　';
  DOM.sheetClientHonorific.textContent = currentDoc.client?.honorific || '';
  DOM.sheetClientZip.textContent = currentDoc.client?.zip ? `〒${currentDoc.client.zip}` : '';
  DOM.sheetClientAddress.textContent = currentDoc.client?.address || '';
  DOM.sheetClientContact.textContent = currentDoc.client?.contactPerson || '';

  // リードメッセージ
  if (currentDoc.docType === 'invoice') {
    DOM.sheetLeadMessage.textContent = '下記の通り、御請求申し上げます。';
  } else if (currentDoc.docType === 'delivery') {
    DOM.sheetLeadMessage.textContent = '下記の通り、納品申し上げます。';
  } else if (currentDoc.docType === 'estimate') {
    DOM.sheetLeadMessage.textContent = '下記の通り、御見積申し上げます。';
  } else if (currentDoc.docType === 'receipt') {
    DOM.sheetLeadMessage.textContent = '上記の金額を正に領収いたしました。';
  }

  // 音声入力ボタンの制御（既存書類の上書き防止）
  const btnVoice = document.getElementById('btnVoiceInput');
  if (btnVoice) {
    const historyList = typeof getHistoryList === 'function' ? getHistoryList() : [];
    const isExisting = historyList.some(doc => doc.id === currentDoc.id);
    
    if (isExisting) {
      btnVoice.disabled = true;
      btnVoice.style.opacity = '0.5';
      btnVoice.style.cursor = 'not-allowed';
      btnVoice.title = '新規作成時のみ音声入力が利用できます';
    } else {
      btnVoice.disabled = false;
      btnVoice.style.opacity = '1';
      btnVoice.style.cursor = 'pointer';
      btnVoice.title = '音声で一括入力';
    }
  }

  // 自社情報
  DOM.sheetIssuerName.textContent = currentDoc.issuer?.name || '';
  if (currentDoc.issuer?.invoiceNumber) {
    DOM.sheetIssuerInvoiceNo.style.display = 'inline-block';
    DOM.sheetIssuerInvoiceNo.textContent = `登録番号: ${currentDoc.issuer.invoiceNumber}`;
  } else {
    DOM.sheetIssuerInvoiceNo.style.display = 'none';
  }
  DOM.sheetIssuerZip.textContent = currentDoc.issuer?.zip ? `〒${currentDoc.issuer.zip}` : '';
  DOM.sheetIssuerAddress.textContent = currentDoc.issuer?.address || '';
  DOM.sheetIssuerTel.textContent = currentDoc.issuer?.tel ? `TEL: ${currentDoc.issuer.tel}` : '';
  if (currentDoc.issuer?.fax) {
    DOM.sheetIssuerFax.style.display = 'block';
    DOM.sheetIssuerFax.textContent = `FAX: ${currentDoc.issuer.fax}`;
  } else {
    DOM.sheetIssuerFax.style.display = 'none';
  }
  DOM.sheetIssuerEmail.textContent = currentDoc.issuer?.email ? `Email: ${currentDoc.issuer.email}` : '';

  // 印鑑
  if (currentDoc.issuer?.showStamp && currentDoc.issuer?.stampDataUrl) {
    DOM.sheetStampWrapper.style.display = 'block';
    DOM.sheetStampImg.src = currentDoc.issuer.stampDataUrl;
  } else {
    DOM.sheetStampWrapper.style.display = 'none';
  }

  // エディタ側：自社情報サマリーカードの更新
  const editorCompName = document.getElementById('dispEditorCompanyName');
  if (editorCompName) {
    editorCompName.textContent = currentDoc.issuer?.name || '株式会社アルバワークス';
  }
  const editorCompMeta = document.getElementById('dispEditorCompanyMeta');
  if (editorCompMeta) {
    const inv = currentDoc.issuer?.invoiceNumber ? `登録番号: ${currentDoc.issuer.invoiceNumber}` : '';
    const addr = currentDoc.issuer?.address || '';
    editorCompMeta.textContent = [inv, addr].filter(Boolean).join(' ｜ ');
  }

  // 計算実行
  const totals = calculateTotals(currentDoc.items, currentDoc.taxFractionRule);

  // 金額バナー
  DOM.sheetAmountBannerLabel.textContent = `${meta.amountLabel}（税込）`;
  DOM.sheetBannerGrandTotal.textContent = formatCurrency(totals.grandTotal);
  DOM.sheetBannerTaxTotal.textContent = `(内消費税等 ${formatCurrency(totals.taxTotal)})`;

  // 明細テーブルのレンダリング
  renderSheetItemsTable(currentDoc.items);

  // 下部集計表
  DOM.sheetSubtotalWithoutTax.textContent = formatCurrency(totals.subtotalWithoutTax);
  DOM.sheetTaxTotal.textContent = formatCurrency(totals.taxTotal);
  DOM.sheetGrandTotalLabel.textContent = `${meta.amountLabel} (税込)`;
  DOM.sheetGrandTotal.textContent = formatCurrency(totals.grandTotal);

  // 税率別内訳
  DOM.sheetSubtotal10.textContent = formatCurrency(totals.subtotal10);
  DOM.sheetTax10.textContent = formatCurrency(totals.tax10);
  DOM.sheetSubtotal8.textContent = formatCurrency(totals.subtotal8);
  DOM.sheetTax8.textContent = formatCurrency(totals.tax8);

  if (totals.subtotal0 > 0) {
    DOM.sheetRowTax0.style.display = 'table-row';
    DOM.sheetSubtotal0.textContent = formatCurrency(totals.subtotal0);
  } else {
    DOM.sheetRowTax0.style.display = 'none';
  }

  // 振込先・備考カード
  if (currentDoc.issuer?.bankInfo && currentDoc.docType !== 'delivery' && currentDoc.docType !== 'receipt') {
    DOM.sheetBankCard.style.display = 'block';
    DOM.sheetBankInfo.textContent = currentDoc.issuer.bankInfo;
  } else {
    DOM.sheetBankCard.style.display = 'none';
  }

  if (currentDoc.notes) {
    DOM.sheetNotesCard.style.display = 'block';
    DOM.sheetNotes.textContent = currentDoc.notes;
  } else {
    DOM.sheetNotesCard.style.display = 'none';
  }

  // 確定発行状態とツールバーボタン・財務会計連携バッジの更新
  const isDocIssued = !!(currentDoc.isIssued && !currentDoc.isCancelled);

  if (DOM.btnCancelIssueDoc) {
    DOM.btnCancelIssueDoc.style.display = isDocIssued ? 'inline-flex' : 'none';
  }
  if (DOM.sidebarIssuedBanner) {
    DOM.sidebarIssuedBanner.style.display = isDocIssued ? 'flex' : 'none';
  }

  if (DOM.btnIssueDoc) {
    if (isDocIssued) {
      DOM.btnIssueDoc.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        確定更新（財務反映中）
      `;
      DOM.btnIssueDoc.title = '現在の内容で確定発行を更新し、財務会計へ再反映します';
    } else {
      DOM.btnIssueDoc.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        確定発行（財務会計反映）
      `;
      DOM.btnIssueDoc.title = '書類を確定発行し、財務会計（売上高・売掛金消込・仕訳帳）へ即座に反映します';
    }
  }

  if (DOM.badgeAccountingSyncStatus) {
    if (isDocIssued) {
      DOM.badgeAccountingSyncStatus.style.background = 'rgba(16, 185, 129, 0.2)';
      DOM.badgeAccountingSyncStatus.style.color = '#34d399';
      DOM.badgeAccountingSyncStatus.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      DOM.badgeAccountingSyncStatus.innerHTML = `<span style="font-size: 8px;">●</span> 財務会計連動済（確定発行）`;
    } else {
      DOM.badgeAccountingSyncStatus.style.background = 'rgba(148, 163, 184, 0.15)';
      DOM.badgeAccountingSyncStatus.style.color = '#94a3b8';
      DOM.badgeAccountingSyncStatus.style.borderColor = 'rgba(148, 163, 184, 0.3)';
      DOM.badgeAccountingSyncStatus.innerHTML = `<span style="font-size: 8px;">●</span> 財務会計連動（編集中・下書き）`;
    }
  }

  // LocalStorageに常時保存
  saveActiveDoc(currentDoc);
}

/**
 * 納品書・請求書・領収書の確定発行 ＆ 財務会計への即時同期
 * @param {object} options { isPrint: boolean, isExplicitIssue: boolean }
 */
function issueAndSyncAccountingDocument(options = {}) {
  const { isPrint = false, isExplicitIssue = true } = options;

  // 1. 発行フラグ・日時の設定
  currentDoc.isIssued = true;
  currentDoc.isCancelled = false;
  currentDoc.issuedAt = currentDoc.issuedAt || new Date().toISOString();
  if (!currentDoc.paymentStatus) {
    currentDoc.paymentStatus = (currentDoc.docType === 'receipt') ? 'paid' : 'unpaid';
  }
  if (currentDoc.isPaid === undefined) {
    currentDoc.isPaid = (currentDoc.docType === 'receipt');
  }

  // 2. 明細内の全商品のユーザー価格およびマスタ使用頻度を記録
  if (currentDoc && Array.isArray(currentDoc.items)) {
    currentDoc.items.forEach(it => {
      if (it.name) {
        if (it.userPrice && Number(it.userPrice) > 0) {
          recordUserPrice(it.name, Number(it.userPrice));
        }
        recordItemMasterUsage(null, it.name);
      }
    });
  }

  // 3. 取引先マスタへの自動登録・利用実績記録
  if (currentDoc.client && currentDoc.client.name && currentDoc.client.name.trim()) {
    saveClientToMaster({
      name: currentDoc.client.name,
      honorific: currentDoc.client.honorific,
      zip: currentDoc.client.zip,
      address: currentDoc.client.address,
      contactPerson: currentDoc.client.contactPerson,
      paymentTerms: currentDoc.paymentTerms || '',
      category: 'customer'
    });
    recordClientMasterUsage(null, currentDoc.client.name);
    updateClientMasterDatalist();
  }

  // 4. 書類履歴へ保存（財務会計への即時データ投入）
  const success = saveDocToHistory(currentDoc);
  if (!success) {
    showToast('書類の保存に失敗しました', 'danger');
    return false;
  }

  // 5. 財務会計ダッシュボード・売上消込・仕訳帳を即時再計算・同期
  initAccountingMonthSelector();
  const currentMonth = DOM.accSelectMonth ? DOM.accSelectMonth.value : '';
  renderAccountingDashboard(currentMonth);
  renderAccountingSales(currentSalesFilter);
  renderAccountingJournals();

  // 6. UI表示の更新
  renderAll();

  const typeLabel = (DOC_TYPES[currentDoc.docType] || DOC_TYPES.invoice).label;
  if (isExplicitIssue) {
    showToast(`「${typeLabel}」を確定発行し、財務会計（売上・売掛金消込・仕訳帳）へ即時反映しました！`, 'success');
  } else {
    showToast(`作成履歴に保存し、財務会計（売上高・仕訳帳）へ反映しました！`, 'success');
  }

  // 7. 印刷が指定されている場合は印刷ダイアログを起動
  if (isPrint) {
    setTimeout(() => {
      window.print();
    }, 200);
  }

  return true;
}

window.issueAndSyncAccountingDocument = issueAndSyncAccountingDocument;

/**
 * 編集中書類の確定発行を取り消し（未確定・下書きに戻す）
 */
function cancelCurrentDocIssue() {
  const typeLabel = (DOC_TYPES[currentDoc.docType] || DOC_TYPES.invoice).label;
  const docNo = currentDoc.docNumber || 'この書類';

  const confirmMsg = `「${typeLabel} (${docNo})」の確定発行を取り消しますか？\n\n【取り消しの効果】\n・財務会計（売上高・売掛金消込・仕訳帳）から即座に除外されます。\n・書類データは削除されず、修正可能な「下書き」状態に戻ります。`;
  
  if (!confirm(confirmMsg)) {
    return false;
  }

  currentDoc.isIssued = false;
  currentDoc.isCancelled = true;
  currentDoc.issuedAt = null;

  // 書類履歴内の該当書類も取消状態に更新
  if (currentDoc.id) {
    cancelDocIssue(currentDoc.id);
  }

  // LocalStorageに保存
  saveActiveDoc(currentDoc);

  // 財務会計ダッシュボード・売上消込・仕訳帳を即時再計算・同期
  initAccountingMonthSelector();
  const currentMonth = DOM.accSelectMonth ? DOM.accSelectMonth.value : '';
  renderAccountingDashboard(currentMonth);
  renderAccountingSales(currentSalesFilter);
  renderAccountingJournals();

  // UI表示の更新
  renderAll();

  showToast(`「${typeLabel}」の確定発行を取り消しました。財務会計から自動除外され、下書きに戻りました。`, 'warning');
  return true;
}

window.cancelCurrentDocIssue = cancelCurrentDocIssue;

// ==========================================================================
// プレビュー用明細テーブルのレンダリング
// ==========================================================================
function renderSheetItemsTable(items = []) {
  DOM.sheetItemsTableBody.innerHTML = '';

  if (items.length === 0) {
    const emptyTr = document.createElement('tr');
    emptyTr.innerHTML = `<td colspan="8" style="text-align: center; color: #94a3b8; padding: 24px;">明細がありません。「行を追加」ボタンから追加してください。</td>`;
    DOM.sheetItemsTableBody.appendChild(emptyTr);
    return;
  }

  items.forEach((item, index) => {
    const tr = document.createElement('tr');
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const lineTotal = Math.round(qty * price);
    const rate = Number(item.taxRate);

    let taxBadge = '';
    if (rate === 8) {
      taxBadge = '<span class="tax-badge-pill tax-badge-reduced">※8%軽</span>';
    } else if (rate === 0) {
      taxBadge = '<span class="tax-badge-pill" style="background:#e2e8f0; color:#475569;">非課税</span>';
    } else {
      taxBadge = '<span class="tax-badge-pill" style="color:#64748b;">10%</span>';
    }

    // 各明細の参考ユーザー価格の算出（手動設定値または仕切りから逆算）
    // 各明細の参考ユーザー価格の算出（手動設定値または仕切りから逆算）
    let userPriceInc = Number(item.userPrice) || 0;
    if (!userPriceInc && price > 0) {
      // 逆算：税抜き仕切り ＋ 販売店利益(税込仕切り×20%) ＝ 税抜きユーザー価格
      const wholesaleInc = Math.round(price * (1 + rate / 100));
      const profit = Math.round(wholesaleInc * 0.20);
      const userEx = price + profit;
      userPriceInc = Math.round(userEx * (1 + rate / 100));
    }

    let userPriceBadge = '';
    if (userPriceInc > 0 && price >= 0) {
      userPriceBadge = `<span class="sheet-user-ref-price">（ユーザー参考: ${formatCurrency(userPriceInc)}）</span>`;
    }

    // 品目欄に一緒に表示する摘要（割引き理由や補足・内訳等）
    let descText = (item.description || '').trim();
    if (!descText && (item.discountReason || (item.discount && item.discount.reason))) {
      descText = item.discountReason || (item.discount && item.discount.reason);
    }
    const descHtml = descText
      ? `<div class="sheet-item-subnote">${escapeHtml(descText)}</div>`
      : '';

    tr.innerHTML = `
      <td class="td-num">${index + 1}</td>
      <td class="td-item-name">
        <div style="font-weight: 600; line-height: 1.35;">${escapeHtml(item.name || '')}</div>
        ${descHtml}
        ${userPriceBadge}
      </td>
      <td class="td-right">${qty ? qty.toLocaleString('ja-JP') : ''}</td>
      <td style="text-align: center;">${escapeHtml(item.unit || '')}</td>
      <td class="td-price">${formatCurrency(price)}</td>
      <td class="td-right" style="font-weight: 700; font-size: 0.95rem;">${formatCurrency(lineTotal)}</td>
      <td style="text-align: center;">${taxBadge}</td>
      <td class="td-item-note">${escapeHtml(item.note || '')}</td>
    `;
    DOM.sheetItemsTableBody.appendChild(tr);
  });
}

// ==========================================================================
// エディタ用明細入力カードのレンダリング
// ==========================================================================
function renderItemInputCards() {
  DOM.itemsContainer.innerHTML = '';
  updateItemCountBadge();

  currentDoc.items.forEach((item, index) => {
    const isDiscount = Number(item.unitPrice) < 0;
    const card = document.createElement('div');
    card.className = isDiscount ? 'item-card is-discount' : 'item-card';
    card.dataset.itemId = item.id;

    // 想定ユーザー価格および利益の参考値計算
    const calcRefValues = () => {
      const curTax = Number(item.taxRate !== undefined ? item.taxRate : 10);
      const curPrice = Number(item.unitPrice) || 0;
      let refUserInc = Number(item.userPrice) || 0;
      let refProfit = 0;
      let refWholesaleInc = 0;

      if (refUserInc > 0) {
        const res = calculateWholesalePrice(refUserInc, curTax);
        refUserInc = res.finalUserPriceInc;
        refProfit = res.retailerProfit;
        refWholesaleInc = res.wholesalePriceInc;
      } else if (curPrice > 0) {
        refWholesaleInc = Math.round(curPrice * (1 + curTax / 100));
        refProfit = Math.round(refWholesaleInc * 0.20);
        const userEx = curPrice + refProfit; // 税抜きユーザー ＝ 税抜き仕切り ＋ 販売店利益
        refUserInc = Math.round(userEx * (1 + curTax / 100));
      }
      return { refUserInc, refProfit, refWholesaleInc };
    };

    const initialRefs = calcRefValues();

    // その商品の過去の入力履歴（頻度の多い順）を取得
    const userPriceHistories = getUserPriceHistoryForItem(item.name || '');
    const historyOptionsHtml = userPriceHistories.map(h => 
      `<option value="${h.price}">${formatCurrency(h.price)} (${h.count}回)</option>`
    ).join('');

    card.innerHTML = `
      <div class="item-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="item-index-badge">明細 #${index + 1}</span>
          ${isDiscount ? '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px;">値引き行</span>' : ''}
        </div>
        <div class="item-actions" style="display: flex; align-items: center; gap: 6px;">
          ${!isDiscount ? `
            <button type="button" class="btn-save-to-master" title="この商品を商品マスタに登録">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              マスタ登録
            </button>
          ` : ''}
          <button type="button" class="btn-icon-danger btn-delete-item" title="この行を削除">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>

      <!-- 品名 ＆ 摘要（割引きや仕様等の補足を品目欄に一緒に表示） -->
      <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px;">
        <div>
          <input type="text" class="form-input item-input-name" placeholder="品名・項目名（例: DP-5000 ベーシックセット など）" value="${escapeHtml(item.name || '')}" style="font-weight: 600; font-size: 0.95rem;">
        </div>
        <div style="position: relative;">
          <input type="text" class="form-input item-input-description" placeholder="📝 摘要（例: 出精値引き、特別割引き、仕様・対象期間 等 ※品名欄に一緒に印字されます）" value="${escapeHtml(item.description || item.discountReason || '')}" style="font-size: 0.825rem; background: #f8fafc; border-color: #cbd5e1; color: #334155; padding-left: 28px;">
          <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 13px; opacity: 0.65; pointer-events: none;">📝</span>
        </div>
      </div>

      <!-- 💡 各明細内で完結する ユーザー価格アシストパネル -->
      ${!isDiscount ? `
        <div class="item-discount-panel">
          <div class="item-discount-panel-header">
            <div class="item-discount-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span>仕切り価格アシスト（販売店利益20%ルール）</span>
            </div>
            <span style="font-size: 0.7rem; color: #64748b;">税抜きユーザー ＝ 税抜き仕切り ＋ 利益 (税込仕切り × 20%)</span>
          </div>

          <div style="max-width: 360px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
              <label class="form-label" style="font-size: 0.725rem; margin: 0;">ユーザー税込定価 (円)</label>
              <span class="user-price-history-info" style="font-size: 0.68rem; color: #64748b;">
                ${userPriceHistories.length > 0 ? `過去履歴 ${userPriceHistories.length}件 (上下キー/▲▼で切替)` : '過去履歴なし'}
              </span>
            </div>
            
            <div class="user-price-control-group">
              <input type="number" class="item-input-user-price" placeholder="例: 110000" value="${item.userPrice || ''}" min="0">
              
              <!-- 上下スピンボタン（その商品の過去の入力履歴を頻度の多い順に参照） -->
              <div class="user-price-spin-btns">
                <button type="button" class="btn-spin-up" title="過去履歴（頻度順）の前へ [↑キー]">▲</button>
                <button type="button" class="btn-spin-down" title="過去履歴（頻度順）の次へ [↓キー]">▼</button>
              </div>

              <!-- 頻度順ドロップダウンセレクト（直接一覧から選ぶことも可能） -->
              <select class="item-select-price-history" title="過去の入力履歴から選択（頻度の多い順）">
                <option value="">履歴▼</option>
                ${historyOptionsHtml}
              </select>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- メイン入力グリッド（単価(税抜)を特大表示） -->
      <div class="item-grid">
        <div class="item-col-qty">
          <label class="form-label" style="font-size: 0.725rem;">数量</label>
          <input type="number" class="form-input item-input-qty" value="${item.quantity !== undefined ? item.quantity : 1}" step="any">
        </div>
        <div class="item-col-unit">
          <label class="form-label" style="font-size: 0.725rem;">単位</label>
          <input type="text" class="form-input item-input-unit" placeholder="式" value="${escapeHtml(item.unit || '')}">
        </div>
        <div class="item-col-price">
          <label class="item-label-price-large">
            <span>単価 (税抜)</span>
            <span style="font-size: 0.68rem; color: var(--primary); font-weight: 600;">★</span>
          </label>
          <input type="number" class="form-input item-input-price item-input-price-large" value="${item.unitPrice !== undefined ? item.unitPrice : 0}" placeholder="0">
        </div>
        <div class="item-col-tax">
          <label class="form-label" style="font-size: 0.725rem;">税率</label>
          <select class="form-select item-select-tax">
            <option value="10" ${item.taxRate === 10 ? 'selected' : ''}>10% (標準)</option>
            <option value="8" ${item.taxRate === 8 ? 'selected' : ''}>8% (軽減税率)</option>
            <option value="0" ${item.taxRate === 0 ? 'selected' : ''}>0% (非課税)</option>
          </select>
        </div>
        <div class="item-col-total">
          <label class="form-label" style="font-size: 0.725rem;">小計</label>
          <div class="item-line-total" style="font-size: 1.05rem; font-weight: 700; color: ${isDiscount ? 'var(--danger)' : 'var(--text-primary)'}; padding: 8px 0; text-align: right;">
            ${formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
          </div>
        </div>
      </div>

      <!-- ユーザー参考価格プレビューバー -->
      <div class="item-user-price-preview-bar">
        <div>
          <span style="color: #64748b;">👤 ユーザー価格（税込参考）:</span>
          <strong class="item-user-price-badge">${formatCurrency(initialRefs.refUserInc)}</strong>
        </div>
        <div>
          <span class="item-profit-badge">販売店利益 (20%): ${formatCurrency(initialRefs.refProfit)}</span>
          <span style="font-size: 0.7rem; color: #64748b; margin-left: 6px;">(税込仕切り: ${formatCurrency(initialRefs.refWholesaleInc)})</span>
        </div>
      </div>

      <!-- 備考（シリアル番号、管理番号等 ※右端の備考列に印字） -->
      <div class="form-group" style="margin-top: 8px; margin-bottom: 0;">
        <div style="position: relative;">
          <input type="text" class="form-input item-input-note" placeholder="🏷️ 備考・シリアルNo.（例: S/N: 2026-0045、製造番号 等 ※備考列に印字されます）" value="${escapeHtml(item.note || '')}" style="font-size: 0.775rem; background: #ffffff; color: #475569; padding-left: 28px;">
          <span style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); font-size: 13px; opacity: 0.65; pointer-events: none;">🏷️</span>
        </div>
      </div>
    `;

    // 削除ボタンイベント
    card.querySelector('.btn-delete-item').addEventListener('click', () => {
      currentDoc.items.splice(index, 1);
      renderItemInputCards();
      renderAll();
    });

    // マスタ登録ボタンイベント
    const btnSaveMaster = card.querySelector('.btn-save-to-master');
    if (btnSaveMaster) {
      btnSaveMaster.addEventListener('click', () => {
        if (!item.name || !item.name.trim()) {
          showToast('品名を入力してください', 'info');
          return;
        }
        saveItemToMaster({
          name: item.name.trim(),
          unit: item.unit || '式',
          unitPrice: Math.abs(Number(item.unitPrice) || 0),
          userPrice: Number(item.userPrice) || 0,
          taxRate: item.taxRate !== undefined ? Number(item.taxRate) : 10,
          note: item.note || ''
        });
        showToast(`「${item.name}」を商品マスタに保存しました`, 'success');
      });
    }

    // 入力要素
    const inputName = card.querySelector('.item-input-name');
    const inputDescription = card.querySelector('.item-input-description');
    const inputQty = card.querySelector('.item-input-qty');
    const inputUnit = card.querySelector('.item-input-unit');
    const inputPrice = card.querySelector('.item-input-price');
    const selectTax = card.querySelector('.item-select-tax');
    const inputNote = card.querySelector('.item-input-note');
    const displayTotal = card.querySelector('.item-line-total');

    // ユーザー価格要素（通常明細のみ）
    const inputUserPrice = card.querySelector('.item-input-user-price');
    const btnSpinUp = card.querySelector('.btn-spin-up');
    const btnSpinDown = card.querySelector('.btn-spin-down');
    const selectPriceHistory = card.querySelector('.item-select-price-history');
    const historyInfo = card.querySelector('.user-price-history-info');
    const previewUserPrice = card.querySelector('.item-user-price-badge');
    const previewProfit = card.querySelector('.item-profit-badge');

    // 参考価格バーの更新
    const updatePreviewBar = () => {
      const refs = calcRefValues();
      if (previewUserPrice) previewUserPrice.textContent = formatCurrency(refs.refUserInc);
      if (previewProfit) previewProfit.textContent = `販売店利益 (20%): ${formatCurrency(refs.refProfit)}`;
    };

    // 履歴ドロップダウンおよび件数表示の最新化
    const refreshPriceHistories = () => {
      const currentName = (inputName ? inputName.value : item.name) || '';
      const list = getUserPriceHistoryForItem(currentName);
      if (selectPriceHistory) {
        selectPriceHistory.innerHTML = '<option value="">履歴▼</option>' + list.map(h => 
          `<option value="${h.price}">${formatCurrency(h.price)} (${h.count}回)</option>`
        ).join('');
      }
      if (historyInfo) {
        historyInfo.textContent = list.length > 0 ? `過去履歴 ${list.length}件 (上下キー/▲▼で切替)` : '過去履歴なし';
      }
      return list;
    };

    // 頻度順履歴のインデックス遷移関数 (delta: -1 で前へ、+1 で次へ)
    const stepPriceHistory = (delta) => {
      const list = refreshPriceHistories();
      if (!list || list.length === 0) {
        showToast('この商品の過去価格履歴はまだありません', 'info');
        return;
      }
      const curVal = Number(inputUserPrice.value) || 0;
      let curIdx = list.findIndex(h => h.price === curVal);

      let nextIdx = 0;
      if (curIdx === -1) {
        nextIdx = 0; // 最初は最も頻度の多い1位から開始
      } else {
        nextIdx = curIdx + delta;
        if (nextIdx < 0) nextIdx = list.length - 1;
        if (nextIdx >= list.length) nextIdx = 0;
      }

      const targetPrice = list[nextIdx].price;
      inputUserPrice.value = targetPrice;
      if (selectPriceHistory) selectPriceHistory.value = targetPrice;
      handleUserPriceChange();
      showToast(`履歴を反映 (${nextIdx + 1}/${list.length}位): ${formatCurrency(targetPrice)} (使用${list[nextIdx].count}回)`, 'info');
    };

    if (btnSpinUp) {
      btnSpinUp.addEventListener('click', (e) => {
        e.preventDefault();
        stepPriceHistory(-1);
      });
    }

    if (btnSpinDown) {
      btnSpinDown.addEventListener('click', (e) => {
        e.preventDefault();
        stepPriceHistory(1);
      });
    }

    if (selectPriceHistory) {
      selectPriceHistory.addEventListener('change', () => {
        const val = Number(selectPriceHistory.value);
        if (val > 0) {
          inputUserPrice.value = val;
          handleUserPriceChange();
          showToast(`履歴から選択: ${formatCurrency(val)}`, 'info');
        }
      });
    }

    // ユーザー税込定価変更時の自動仕切り単価計算＆反映
    const handleUserPriceChange = () => {
      if (!inputUserPrice) return;
      const uPrice = Number(inputUserPrice.value) || 0;
      const taxRate = Number(selectTax.value);

      item.userPrice = uPrice;

      if (uPrice > 0) {
        // 販売店利益20%ルールに基づいて税抜仕切り単価を自動逆算
        const res = calculateWholesalePrice(uPrice, taxRate);
        item.unitPrice = res.wholesaleUnitPriceEx;
        inputPrice.value = res.wholesaleUnitPriceEx;

        // 品名があればユーザー価格履歴に記録
        if (item.name) {
          recordUserPrice(item.name, uPrice);
        }
      }

      updatePreviewBar();
      displayTotal.textContent = formatCurrency((Number(inputQty.value) || 0) * (Number(item.unitPrice) || 0));
      renderAll();
    };

    if (inputUserPrice) {
      inputUserPrice.addEventListener('input', handleUserPriceChange);
      // 上下キー（ArrowUp / ArrowDown）で過去履歴（頻度順）を切り替え
      inputUserPrice.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          stepPriceHistory(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          stepPriceHistory(1);
        }
      });
    }

    // 基本項目の変更イベント
    const handleItemChange = () => {
      item.name = inputName.value;
      if (inputDescription) item.description = inputDescription.value;
      item.quantity = Number(inputQty.value) || 0;
      item.unit = inputUnit.value;
      item.unitPrice = Number(inputPrice.value) || 0;
      item.taxRate = Number(selectTax.value);
      if (inputNote) item.note = inputNote.value;

      displayTotal.textContent = formatCurrency(item.quantity * item.unitPrice);
      updatePreviewBar();
      refreshPriceHistories();
      renderAll();
    };

    inputName.addEventListener('input', handleItemChange);
    if (inputDescription) inputDescription.addEventListener('input', handleItemChange);
    inputQty.addEventListener('input', handleItemChange);
    inputUnit.addEventListener('input', handleItemChange);
    inputPrice.addEventListener('input', handleItemChange);
    selectTax.addEventListener('change', () => {
      if (inputUserPrice && Number(inputUserPrice.value) > 0) {
        handleUserPriceChange();
      } else {
        handleItemChange();
      }
    });
    if (inputNote) inputNote.addEventListener('input', handleItemChange);

    DOM.itemsContainer.appendChild(card);
  });
}

// ==========================================================================
// イベントリスナー初期化
// ==========================================================================
function setupEventListeners() {
  // 書類種別の切り替え
  DOM.docTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      currentDoc.docType = type;
      DOM.docTypeBtns.forEach(b => b.classList.toggle('active', b === btn));
      // 書類番号をその種別のプレフィックスで再採番
      currentDoc.docNumber = generateDocNumber(type);
      DOM.inputDocNumber.value = currentDoc.docNumber;
      renderAll();
      showToast(`「${DOC_TYPES[type].label}」に切り替えました`);
    });
  });

  // エディタタブ切り替え
  document.querySelectorAll('.editor-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchEditorTab(btn.dataset.tab);
    });
  });

  // 書類番号の再採番
  if (DOM.btnRegenDocNumber) {
    DOM.btnRegenDocNumber.addEventListener('click', () => {
      currentDoc.docNumber = generateDocNumber(currentDoc.docType);
      if (DOM.inputDocNumber) DOM.inputDocNumber.value = currentDoc.docNumber;
      renderAll();
      showToast('新しい書類番号を採番しました');
    });
  }

  // 入力フォームの同期
  const bindInput = (el, setter) => {
    if (!el) return;
    el.addEventListener('input', (e) => {
      setter(e.target.value);
      renderAll();
    });
  };

  bindInput(DOM.inputDocNumber, val => currentDoc.docNumber = val);
  bindInput(DOM.inputIssueDate, val => currentDoc.issueDate = val);
  bindInput(DOM.inputDueDate, val => currentDoc.dueDate = val);
  bindInput(DOM.inputTitle, val => currentDoc.title = val);

  bindInput(DOM.inputClientName, val => currentDoc.client.name = val);
  if (DOM.inputClientHonorific) {
    DOM.inputClientHonorific.addEventListener('change', e => {
      currentDoc.client.honorific = e.target.value;
      renderAll();
    });
  }
  bindInput(DOM.inputClientZip, val => currentDoc.client.zip = val);
  bindInput(DOM.inputClientAddress, val => currentDoc.client.address = val);
  bindInput(DOM.inputClientContact, val => currentDoc.client.contactPerson = val);

  // 自社情報入力の永続化同期ヘルパー（変更した瞬間にdata/company/issuer_profile.jsonへ即時保存）
  const syncIssuerProfileFromCurrentDoc = () => {
    if (!currentDoc.issuer) currentDoc.issuer = {};
    const updatedProfile = {
      ...loadIssuerProfile(),
      name: currentDoc.issuer.name || '',
      invoiceNumber: currentDoc.issuer.invoiceNumber || '',
      zip: currentDoc.issuer.zip || '',
      tel: currentDoc.issuer.tel || '',
      fax: currentDoc.issuer.fax || '',
      address: currentDoc.issuer.address || '',
      email: currentDoc.issuer.email || '',
      bankInfo: currentDoc.issuer.bankInfo || '',
      showStamp: currentDoc.issuer.showStamp !== undefined ? currentDoc.issuer.showStamp : true,
      stampDataUrl: currentDoc.issuer.stampDataUrl || ''
    };
    saveIssuerProfile(updatedProfile);
  };

  bindInput(DOM.inputIssuerName, val => { currentDoc.issuer.name = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputIssuerInvoiceNo, val => { currentDoc.issuer.invoiceNumber = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputIssuerZip, val => { currentDoc.issuer.zip = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputIssuerTel, val => { currentDoc.issuer.tel = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputIssuerFax, val => { currentDoc.issuer.fax = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputIssuerAddress, val => { currentDoc.issuer.address = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputIssuerEmail, val => { currentDoc.issuer.email = val; syncIssuerProfileFromCurrentDoc(); });
  bindInput(DOM.inputBankInfo, val => {
    if (!currentDoc.issuer) currentDoc.issuer = {};
    currentDoc.issuer.bankInfo = val;
    syncIssuerProfileFromCurrentDoc();
  });
  bindInput(DOM.inputNotes, val => currentDoc.notes = val);

  // 端数処理設定
  if (DOM.selectFractionRule) {
    DOM.selectFractionRule.addEventListener('change', e => {
      currentDoc.taxFractionRule = e.target.value;
      renderAll();
    });
  }

  // 明細追加ボタン
  if (DOM.btnAddItem) {
    DOM.btnAddItem.addEventListener('click', () => {
      currentDoc.items.push({
        id: 'item_' + Date.now(),
        name: '',
        quantity: 1,
        unit: '式',
        unitPrice: 0,
        taxRate: 10,
        note: ''
      });
      renderItemInputCards();
      renderAll();
    });
  }

  // 定型文挿入ボタン
  if (DOM.btnInsertTemplateNote) {
    DOM.btnInsertTemplateNote.addEventListener('click', () => {
      const defaultNotes = 'お振込手数料は貴社にてご負担くださいますようお願い申し上げます。\nご不明な点がございましたらお気軽にお問い合わせください。';
      if (DOM.inputNotes) DOM.inputNotes.value = defaultNotes;
      currentDoc.notes = defaultNotes;
      renderAll();
      showToast('備考欄に定型文を挿入しました');
    });
  }

  // 印鑑の表示トグル
  if (DOM.checkShowStamp) {
    DOM.checkShowStamp.addEventListener('change', e => {
      currentDoc.issuer.showStamp = e.target.checked;
      syncIssuerProfileFromCurrentDoc();
      renderAll();
    });
  }

  // 印鑑自動生成
  if (DOM.btnAutoGenerateStamp) {
    DOM.btnAutoGenerateStamp.addEventListener('click', () => {
      const name = currentDoc.issuer?.name?.trim() || '社印';
      const stampUrl = generateCompanyStamp(name);
      currentDoc.issuer.stampDataUrl = stampUrl;
      currentDoc.issuer.showStamp = true;
      if (DOM.checkShowStamp) DOM.checkShowStamp.checked = true;
      updateStampThumbnail(stampUrl);
      syncIssuerProfileFromCurrentDoc();
      renderAll();
      showToast(`「${name}」の角印スタンプを生成しました！`, 'success');
    });
  }

  // 印鑑画像アップロード
  if (DOM.fileStampUpload) {
    DOM.fileStampUpload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        currentDoc.issuer.stampDataUrl = dataUrl;
        currentDoc.issuer.showStamp = true;
        if (DOM.checkShowStamp) DOM.checkShowStamp.checked = true;
        updateStampThumbnail(dataUrl);
        syncIssuerProfileFromCurrentDoc();
        renderAll();
        showToast('印鑑画像をアップロードしました', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  // テーマカラー変更
  if (DOM.colorDotBtns) {
    DOM.colorDotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        updateThemeColor(color);
        currentDoc.themeColor = color;
        renderAll();
      });
    });
  }

  // 確定発行（財務会計へ反映）
  if (DOM.btnIssueDoc) {
    DOM.btnIssueDoc.addEventListener('click', () => {
      issueAndSyncAccountingDocument({ isPrint: false, isExplicitIssue: true });
    });
  }

  // 確定取消（下書きに戻す・財務会計から除外）
  if (DOM.btnCancelIssueDoc) {
    DOM.btnCancelIssueDoc.addEventListener('click', () => {
      cancelCurrentDocIssue();
    });
  }
  if (DOM.btnSidebarCancelIssue) {
    DOM.btnSidebarCancelIssue.addEventListener('click', () => {
      cancelCurrentDocIssue();
    });
  }

  // 印刷・PDF保存（同時に財務会計にも即時反映）
  if (DOM.btnPrint) {
    DOM.btnPrint.addEventListener('click', () => {
      issueAndSyncAccountingDocument({ isPrint: true, isExplicitIssue: true });
    });
  }

  // 履歴に保存（財務会計にも即時反映）
  if (DOM.btnSaveHistory) {
    DOM.btnSaveHistory.addEventListener('click', () => {
      issueAndSyncAccountingDocument({ isPrint: false, isExplicitIssue: false });
    });
  }

  const btnVoiceInput = document.getElementById('btnVoiceInput');
  window.voiceRecognition = null;
  window.isVoiceAnalyzing = false;
  window.voiceSilenceTimer = null;
  window.hasStartedSpeaking = false;

  window.closeVoiceModal = () => {
    if (window.voiceRecognition) {
      try {
        window.voiceRecognition.onend = null;
        window.voiceRecognition.abort();
      } catch (e) {
        console.warn(e);
      }
      window.voiceRecognition = null;
    }
    const modal = document.getElementById('voiceInputModal');
    if (modal) {
      modal.style.display = 'none';
    }
    if (window.voiceSilenceTimer) {
      clearTimeout(window.voiceSilenceTimer);
      window.voiceSilenceTimer = null;
    }
    window.isVoiceAnalyzing = false;
  };

  window.completeVoiceInput = () => {
    if (window.voiceRecognition) {
      try {
        window.voiceRecognition.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    const preview = document.getElementById('voiceInterimText');
    if (preview && typeof window.processVoiceInput === 'function') {
      window.processVoiceInput(preview.innerText);
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('voiceInputModal');
      if (modal && modal.style.display !== 'none') {
        window.closeVoiceModal();
      }
    }
  });

  window.processVoiceInput = async (textToProcess) => {
    if (!textToProcess || !textToProcess.trim() || textToProcess.includes('のように話してください')) {
       window.closeVoiceModal();
       return;
    }
    window.isVoiceAnalyzing = true;
    const btnComplete = document.getElementById('btnCompleteVoice');
    const btnCancel = document.getElementById('btnCancelVoice');
    
    if (btnComplete) {
      btnComplete.innerHTML = '🔄 AI解析中...';
      btnComplete.disabled = true;
    }
    if (btnCancel) btnCancel.disabled = true;
    
    showToast('音声を解析しています...', 'info');
    
    try {
      const defaultType = 'invoice';
      const profile = typeof loadIssuerProfile === 'function' ? loadIssuerProfile() : (currentDoc ? currentDoc.issuer : null);
      currentDoc = typeof createEmptyInvoice === 'function' ? createEmptyInvoice(defaultType) : {};
      currentDoc.docType = defaultType;
      if (profile) {
        currentDoc.issuer = { ...profile };
      }

      const response = await fetch('/api/gemini/voice-to-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToProcess })
      });
      
      if (!response.ok) throw new Error('サーバーエラー');
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      console.log('解析結果:', data);
      
      if (data.documentType === '納品書') {
        currentDoc.docType = 'delivery';
        const docTypeBtn = document.querySelector(`.doc-type-btn[data-type="delivery"]`);
        if (docTypeBtn) {
          document.querySelectorAll('.doc-type-btn').forEach(btn => btn.classList.remove('active'));
          docTypeBtn.classList.add('active');
        }
      } else {
        currentDoc.docType = 'invoice';
        const docTypeBtn = document.querySelector(`.doc-type-btn[data-type="invoice"]`);
        if (docTypeBtn) {
          document.querySelectorAll('.doc-type-btn').forEach(btn => btn.classList.remove('active'));
          docTypeBtn.classList.add('active');
        }
      }
      
      if (data.clientName) currentDoc.client.name = data.clientName;
      if (data.clientHonorific !== undefined) currentDoc.client.honorific = data.clientHonorific;
      if (data.clientZip !== undefined) currentDoc.client.zip = data.clientZip;
      if (data.clientAddress !== undefined) currentDoc.client.address = data.clientAddress;
      if (data.clientContact !== undefined) currentDoc.client.contactPerson = data.clientContact;
      if (data.issueDate) currentDoc.issueDate = data.issueDate;
      if (data.dueDate) currentDoc.dueDate = data.dueDate;
      if (data.notes) currentDoc.notes = data.notes;
      
      if (data.items && data.items.length > 0) {
        currentDoc.items = data.items.map(item => {
          let uPrice = Number(item.userPrice) || 0;
          let uUnitPrice = Number(item.unitPrice) || 0;
          let uTax = Number(item.taxRate) || 10;
          
          if (uPrice > 0) {
            // 販売店利益20%ルールに基づいて税抜仕切り単価を自動逆算
            const res = typeof calculateWholesalePrice === 'function' ? calculateWholesalePrice(uPrice, uTax) : { wholesaleUnitPriceEx: uUnitPrice };
            if (res.wholesaleUnitPriceEx) {
              uUnitPrice = res.wholesaleUnitPriceEx;
            }
          }
          
          return {
            id: 'item_' + Math.random().toString(36).substr(2, 9),
            name: item.name || '',
            quantity: item.quantity || 1,
            unitPrice: uUnitPrice,
            taxRate: uTax,
            userPrice: uPrice
          };
        });
      }
      
      saveActiveDoc(currentDoc);
      populateFormFromDoc();
      renderAll();
      showToast('音声からフォームを入力しました', 'success');
      
    } catch (err) {
      console.error(err);
      alert('音声の解析に失敗しました: ' + err.message);
    } finally {
      window.isVoiceAnalyzing = false;
      window.closeVoiceModal();
    }
  };

  if (btnVoiceInput) {
    btnVoiceInput.addEventListener('click', () => {
      if (window.isVoiceAnalyzing) return; 

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('お使いのブラウザは音声認識に対応していません。（Chrome, Safari等をご利用ください）');
        return;
      }
      
      const modal = document.getElementById('voiceInputModal');
      const preview = document.getElementById('voiceInterimText');
      const btnCancel = document.getElementById('btnCancelVoice');
      const btnComplete = document.getElementById('btnCompleteVoice');

      if (!modal) return;

      modal.style.display = 'flex';
      preview.innerHTML = '『奥村塗料宛にDP-5000を1個、26万円で請求書』のように話してください';
      preview.style.color = '#94a3b8';
      btnComplete.innerHTML = '✅ 完了して入力';
      btnComplete.disabled = false;
      btnCancel.disabled = false;

      let finalTranscript = '';
      window.hasStartedSpeaking = false;

      const recognition = new SpeechRecognition();
      recognition.lang = 'ja-JP';
      recognition.interimResults = true;
      recognition.continuous = true;

      window.voiceRecognition = recognition;

      recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        window.hasStartedSpeaking = true;
        preview.style.color = '#0f172a';
        preview.innerHTML = finalTranscript + '<i style="color: #64748b;">' + interimTranscript + '</i>';
      };

      recognition.onerror = (event) => {
        console.error('音声認識エラー:', event.error);
        if (event.error === 'not-allowed') {
            preview.innerHTML = '<span style="color: #dc2626; font-weight: bold;">マイクへのアクセスが許可されていません。</span><br>ブラウザのアドレスバー横の鍵アイコン（または端末の設定）からマイクの使用を「許可」にして再度お試しください。';
            btnComplete.disabled = true;
        } else if (event.error !== 'aborted') {
            showToast('音声認識に失敗しました: ' + event.error, 'error');
            window.closeVoiceModal();
        }
      };
      
      recognition.onspeechstart = () => {
         if (window.voiceSilenceTimer) clearTimeout(window.voiceSilenceTimer);
      };
      recognition.onspeechend = () => {
         window.voiceSilenceTimer = setTimeout(() => {
             if (window.voiceRecognition && !window.isVoiceAnalyzing && window.hasStartedSpeaking) {
                 window.completeVoiceInput();
             }
         }, 3000);
      };

      recognition.start();
    });
  }

  // 新規作成
  if (DOM.btnNewDoc) {
    DOM.btnNewDoc.addEventListener('click', () => {
      if (confirm('新しく白紙の書類を作成しますか？\n（件名・取引先・明細がクリアされます）')) {
        const profile = loadIssuerProfile() || currentDoc.issuer; // 自社情報はプロファイルから確実に引き継ぐ
        const targetType = currentDoc?.docType || 'invoice';
        currentDoc = createEmptyInvoice(targetType);
        if (profile) {
          currentDoc.issuer = { ...profile };
        }
        saveActiveDoc(currentDoc);
        populateFormFromDoc();
        renderAll();
        showToast('白紙の新規書類を作成しました（件名・取引先・明細は空白です）');
      }
    });
  }

  // サンプル読込（存在する場合のみ登録）
  if (DOM.btnLoadSample) {
    DOM.btnLoadSample.addEventListener('click', () => {
      const targetType = currentDoc.docType === 'delivery' ? 'delivery' : 'invoice';
      const sample = SAMPLE_DOCUMENTS[targetType] || SAMPLE_DOCUMENTS.invoice;
      currentDoc = JSON.parse(JSON.stringify(sample));
      currentDoc.issuer.stampDataUrl = generateCompanyStamp(currentDoc.issuer.name);
      populateFormFromDoc();
      updateThemeColor(currentDoc.themeColor || 'indigo');
      renderAll();
      showToast('サンプルデータを読み込みました');
    });
  }

  // 履歴モーダル制御
  if (DOM.btnOpenHistory) {
    DOM.btnOpenHistory.addEventListener('click', openHistoryModal);
  }
  if (DOM.btnOpenHistorySidebar) {
    DOM.btnOpenHistorySidebar.addEventListener('click', openHistoryModal);
  }
  if (DOM.historySearchProduct) {
    DOM.historySearchProduct.addEventListener('input', () => filterAndRenderHistoryList());
  }
  if (DOM.historySearchClient) {
    DOM.historySearchClient.addEventListener('input', () => filterAndRenderHistoryList());
  }
  if (DOM.historySearchMonth) {
    DOM.historySearchMonth.addEventListener('change', () => filterAndRenderHistoryList());
  }
  if (DOM.historySearchDocType) {
    DOM.historySearchDocType.addEventListener('change', () => filterAndRenderHistoryList());
  }
  if (DOM.btnResetHistoryFilters) {
    DOM.btnResetHistoryFilters.addEventListener('click', () => {
      if (DOM.historySearchProduct) DOM.historySearchProduct.value = '';
      if (DOM.historySearchClient) DOM.historySearchClient.value = '';
      if (DOM.historySearchMonth) DOM.historySearchMonth.value = '';
      if (DOM.historySearchDocType) DOM.historySearchDocType.value = '';
      filterAndRenderHistoryList();
    });
  }
  if (DOM.btnCloseHistoryModal) {
    DOM.btnCloseHistoryModal.addEventListener('click', closeHistoryModal);
  }
  if (DOM.btnCloseHistoryModal2) {
    DOM.btnCloseHistoryModal2.addEventListener('click', closeHistoryModal);
  }
  if (DOM.historyModal) {
    DOM.historyModal.addEventListener('click', (e) => {
      if (e.target === DOM.historyModal) closeHistoryModal();
    });
  }

  // バックアップモーダル制御
  if (DOM.btnOpenBackup) {
    DOM.btnOpenBackup.addEventListener('click', openBackupModal);
  }
  if (DOM.btnCloseBackupModal) {
    DOM.btnCloseBackupModal.addEventListener('click', closeBackupModal);
  }
  if (DOM.btnCloseBackupModal2) {
    DOM.btnCloseBackupModal2.addEventListener('click', closeBackupModal);
  }
  if (DOM.backupModal) {
    DOM.backupModal.addEventListener('click', (e) => {
      if (e.target === DOM.backupModal) closeBackupModal();
    });
  }

  // JSONエクスポート
  if (DOM.btnExportJSON) {
    DOM.btnExportJSON.addEventListener('click', () => {
      exportDataAsJSON();
      showToast('バックアップJSONをダウンロードしました', 'success');
    });
  }

  // JSONインポート
  if (DOM.fileImportJSON) {
    DOM.fileImportJSON.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = importDataFromJSON(event.target.result);
        if (result.success) {
          if (result.activeDoc) {
            currentDoc = result.activeDoc;
            populateFormFromDoc();
            renderAll();
          }
          closeBackupModal();
          showToast('データを正常に復元しました！', 'success');
        } else {
          alert('読み込みに失敗しました: ' + result.error);
        }
      };
      reader.readAsText(file);
    });
  }

  // 自社情報設定モーダル制御
  let tempSettingStampDataUrl = '';

  const updateSettingStampThumbnail = (dataUrl) => {
    const thumb = document.getElementById('settingStampPreviewThumb');
    if (!thumb) return;
    if (dataUrl) {
      tempSettingStampDataUrl = dataUrl;
      thumb.innerHTML = `<img src="${dataUrl}" alt="印鑑" style="width: 100%; height: 100%; object-fit: contain;">`;
    } else {
      tempSettingStampDataUrl = '';
      thumb.innerHTML = '<span style="font-size: 0.7rem; color: var(--text-muted);">プレビュー</span>';
    }
  };

  const openCompanyProfileModal = () => {
    const modal = document.getElementById('companyProfileModal');
    if (!modal) return;
    const profile = loadIssuerProfile() || {};

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val || '';
    };

    setVal('settingIssuerName', profile.name || '株式会社アルバワークス');
    setVal('settingIssuerInvoiceNo', profile.invoiceNumber || 'T2070001004966');
    setVal('settingIssuerZip', profile.zip || '379-2144');
    setVal('settingIssuerTel', profile.tel || '027-289-0367');
    setVal('settingIssuerFax', profile.fax || '027-289-0368');
    setVal('settingIssuerEmail', profile.email || '');
    setVal('settingIssuerAddress', profile.address || '群馬県前橋市下川町63-7');
    setVal('settingBankInfo', profile.bankInfo || '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス');

    const chk = document.getElementById('settingCheckShowStamp');
    if (chk) chk.checked = profile.showStamp !== false;

    updateSettingStampThumbnail(profile.stampDataUrl);
    modal.classList.add('active');
  };

  const closeCompanyProfileModal = () => {
    const modal = document.getElementById('companyProfileModal');
    if (modal) modal.classList.remove('active');
  };

  const saveCompanyProfileFromModal = () => {
    const getVal = (id) => (document.getElementById(id)?.value || '').trim();
    const name = getVal('settingIssuerName') || '株式会社アルバワークス';
    const invoiceNumber = getVal('settingIssuerInvoiceNo');
    const zip = getVal('settingIssuerZip');
    const tel = getVal('settingIssuerTel');
    const fax = getVal('settingIssuerFax');
    const email = getVal('settingIssuerEmail');
    const address = getVal('settingIssuerAddress');
    const bankInfo = getVal('settingBankInfo') || '高崎信用金庫\n前橋南支店\n普通　012 2182393\nカ)　アルバワークス';
    const showStamp = document.getElementById('settingCheckShowStamp')?.checked !== false;

    let stampDataUrl = tempSettingStampDataUrl;
    if (!stampDataUrl && name) {
      stampDataUrl = generateCompanyStamp(name);
    }

    const updated = {
      name,
      invoiceNumber,
      zip,
      tel,
      fax,
      email,
      address,
      bankInfo,
      showStamp,
      stampDataUrl
    };

    saveIssuerProfile(updated);

    if (currentDoc) {
      if (!currentDoc.issuer) currentDoc.issuer = {};
      currentDoc.issuer = { ...currentDoc.issuer, ...updated };
      renderAll();
    }

    updatePortalInfo();
    closeCompanyProfileModal();
    showToast('自社情報・印鑑・口座設定を保存しました！', 'success');
  };

  const btnOpenCompanyProfile = document.getElementById('btnOpenCompanyProfile');
  if (btnOpenCompanyProfile) {
    btnOpenCompanyProfile.addEventListener('click', openCompanyProfileModal);
  }
  const btnCloseCompanyProfile = document.getElementById('btnCloseCompanyProfileModal');
  if (btnCloseCompanyProfile) {
    btnCloseCompanyProfile.addEventListener('click', closeCompanyProfileModal);
  }
  const btnCancelCompanyProfile = document.getElementById('btnCancelCompanyProfileModal');
  if (btnCancelCompanyProfile) {
    btnCancelCompanyProfile.addEventListener('click', closeCompanyProfileModal);
  }
  const btnSaveCompanyProfile = document.getElementById('btnSaveCompanyProfileModal');
  if (btnSaveCompanyProfile) {
    btnSaveCompanyProfile.addEventListener('click', saveCompanyProfileFromModal);
  }
  const modalComp = document.getElementById('companyProfileModal');
  if (modalComp) {
    modalComp.addEventListener('click', (e) => {
      if (e.target === modalComp) closeCompanyProfileModal();
    });
  }

  // 角印自動生成ボタン
  const settingBtnAutoStamp = document.getElementById('settingBtnAutoGenerateStamp');
  if (settingBtnAutoStamp) {
    settingBtnAutoStamp.addEventListener('click', () => {
      const name = (document.getElementById('settingIssuerName')?.value || '株式会社アルバワークス').trim();
      const stampDataUrl = generateCompanyStamp(name);
      updateSettingStampThumbnail(stampDataUrl);
      showToast('社名から角印を生成しました！');
    });
  }

  // 印鑑画像の安全圧縮処理（最大256x256px、容量超過エラーを完全防止）
  function resizeStampImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          const maxDim = 256;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/png');
          resolve(compressed);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // 印鑑画像アップロード
  const settingFileUpload = document.getElementById('settingFileStampUpload');
  if (settingFileUpload) {
    settingFileUpload.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const compressedDataUrl = await resizeStampImage(file);
        updateSettingStampThumbnail(compressedDataUrl);
        showToast('印鑑画像を最適化して読み込みました！');
      } catch (err) {
        console.error('Stamp image load error:', err);
        showToast('印鑑画像の読み込みに失敗しました。別の画像をお試しください。', 'error');
      }
    });
  }

  window.openCompanyProfileModal = openCompanyProfileModal;
  window.closeCompanyProfileModal = closeCompanyProfileModal;

  // 商品マスタモーダル制御
  if (DOM.btnOpenItemMaster) {
    DOM.btnOpenItemMaster.addEventListener('click', openItemMasterModal);
  }
  if (DOM.btnOpenItemSelectModal) {
    DOM.btnOpenItemSelectModal.addEventListener('click', openItemMasterModal);
  }
  if (DOM.btnCloseItemMasterModal) {
    DOM.btnCloseItemMasterModal.addEventListener('click', closeItemMasterModal);
  }
  if (DOM.btnCloseItemMasterModal2) {
    DOM.btnCloseItemMasterModal2.addEventListener('click', closeItemMasterModal);
  }
  if (DOM.itemMasterModal) {
    DOM.itemMasterModal.addEventListener('click', (e) => {
      if (e.target === DOM.itemMasterModal) closeItemMasterModal();
    });
  }

  if (DOM.inputSearchItemMaster) {
    DOM.inputSearchItemMaster.addEventListener('input', () => {
      renderItemMasterList(DOM.inputSearchItemMaster.value);
    });
  }

  if (DOM.btnToggleNewItemForm) {
    DOM.btnToggleNewItemForm.addEventListener('click', () => {
      toggleItemMasterForm();
    });
  }

  if (DOM.btnCancelItemMasterForm) {
    DOM.btnCancelItemMasterForm.addEventListener('click', () => {
      resetItemMasterForm();
    });
  }

  // 商品マスタ内の仕切り価格・税抜単価自動計算アシスト
  if (DOM.calcInputUserPriceInc) {
    DOM.calcInputUserPriceInc.addEventListener('input', () => updateMasterCalculator(true));
  }
  if (DOM.itemMasterSelectTax) {
    DOM.itemMasterSelectTax.addEventListener('change', () => {
      if (DOM.calcInputUserPriceInc && DOM.calcInputUserPriceInc.value.trim() !== '') {
        updateMasterCalculator(true);
      }
    });
  }
  if (DOM.calcModeWholesale) {
    DOM.calcModeWholesale.addEventListener('change', () => updateMasterCalculator(true));
  }
  if (DOM.calcModeStandard) {
    DOM.calcModeStandard.addEventListener('change', () => updateMasterCalculator(true));
  }
  if (DOM.btnApplyCalcPrice) {
    DOM.btnApplyCalcPrice.addEventListener('click', applyMasterCalculatedPrice);
  }

  // 商品マスタ保存
  if (DOM.btnSaveItemMasterForm) {
    DOM.btnSaveItemMasterForm.addEventListener('click', handleSaveItemMaster);
  }

  // 取引先マスタ制御
  if (DOM.btnOpenClientMaster) {
    DOM.btnOpenClientMaster.addEventListener('click', () => openClientMasterModal('customer'));
  }
  if (DOM.btnSelectClientFromMaster) {
    DOM.btnSelectClientFromMaster.addEventListener('click', () => openClientMasterModal('customer'));
  }
  if (DOM.btnCloseClientMasterModal) {
    DOM.btnCloseClientMasterModal.addEventListener('click', closeClientMasterModal);
  }
  if (DOM.btnCloseClientMasterModal2) {
    DOM.btnCloseClientMasterModal2.addEventListener('click', closeClientMasterModal);
  }
  if (DOM.clientMasterModal) {
    DOM.clientMasterModal.addEventListener('click', (e) => {
      if (e.target === DOM.clientMasterModal) closeClientMasterModal();
    });
  }
  if (DOM.inputSearchClientMaster) {
    DOM.inputSearchClientMaster.addEventListener('input', () => {
      renderClientMasterList(currentClientFilter, DOM.inputSearchClientMaster.value);
    });
  }
  if (DOM.clientFilterBtns) {
    DOM.clientFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.clientFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentClientFilter = btn.dataset.filter || 'all';
        renderClientMasterList(currentClientFilter, DOM.inputSearchClientMaster?.value || '');
      });
    });
  }
  if (DOM.btnToggleNewClientForm) {
    DOM.btnToggleNewClientForm.addEventListener('click', () => toggleNewClientForm());
  }
  if (DOM.btnCancelClientMasterForm) {
    DOM.btnCancelClientMasterForm.addEventListener('click', resetClientMasterForm);
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#btnSaveClientMasterForm');
    if (btn) {
      e.preventDefault();
      handleSaveClientMaster();
    }
  });
  if (DOM.inputClientName) {
    DOM.inputClientName.addEventListener('change', handleClientNameAutocomplete);
  }
  if (DOM.expenseInputPayee) {
    DOM.expenseInputPayee.addEventListener('change', () => {
      const val = DOM.expenseInputPayee.value.trim();
      if (!val) return;
      const matched = findClientByName(val);
      if (matched && matched.invoiceNumber && DOM.expenseInputInvoiceNum && !DOM.expenseInputInvoiceNum.value) {
        DOM.expenseInputInvoiceNum.value = matched.invoiceNumber;
        showToast(`マスタから「${matched.name}」のインボイス番号を自動反映しました`, 'info');
      }
    });
  }

  // 在庫マスタモーダル制御
  if (DOM.btnOpenInventoryMaster) {
    DOM.btnOpenInventoryMaster.addEventListener('click', openInventoryMasterModal);
  }
  if (DOM.btnPortalOpenInventoryMaster) {
    DOM.btnPortalOpenInventoryMaster.addEventListener('click', openInventoryMasterModal);
  }
  if (DOM.btnCloseInventoryMasterModal) {
    DOM.btnCloseInventoryMasterModal.addEventListener('click', closeInventoryMasterModal);
  }
  if (DOM.btnCloseInventoryMasterModal2) {
    DOM.btnCloseInventoryMasterModal2.addEventListener('click', closeInventoryMasterModal);
  }
  if (DOM.inventoryMasterModal) {
    DOM.inventoryMasterModal.addEventListener('click', (e) => {
      if (e.target === DOM.inventoryMasterModal) closeInventoryMasterModal();
    });
  }
  if (DOM.inputSearchInventory) {
    DOM.inputSearchInventory.addEventListener('input', () => {
      renderInventoryTable();
    });
  }
  if (DOM.selectInventoryFilter) {
    DOM.selectInventoryFilter.addEventListener('change', () => {
      renderInventoryTable();
    });
  }
  if (DOM.btnToggleNewInventoryForm) {
    DOM.btnToggleNewInventoryForm.addEventListener('click', () => {
      toggleInventoryForm(false);
    });
  }
  if (DOM.btnCancelInventoryForm) {
    DOM.btnCancelInventoryForm.addEventListener('click', resetInventoryForm);
  }
  if (DOM.btnSaveInventoryItem) {
    DOM.btnSaveInventoryItem.addEventListener('click', saveInventoryItemHandler);
  }
  if (DOM.btnSyncInventoryWithItems) {
    DOM.btnSyncInventoryWithItems.addEventListener('click', () => {
      const res = syncInventoryWithItemsMaster();
      renderInventoryTable();
      populateExpenseInventoryDropdown();
      if (res.addedCount > 0) {
        showToast(`商品マスタから ${res.addedCount}件 の商品を在庫品目として取り込みました！`, 'success');
      } else {
        showToast('商品マスタの商品はすべて在庫マスタに連携済みです。', 'info');
      }
    });
  }

  // クイック入出庫調整モーダル制御
  if (DOM.btnCloseAdjustModal) {
    DOM.btnCloseAdjustModal.addEventListener('click', closeInventoryAdjustModal);
  }
  if (DOM.btnCancelAdjust) {
    DOM.btnCancelAdjust.addEventListener('click', closeInventoryAdjustModal);
  }
  if (DOM.btnConfirmAdjust) {
    DOM.btnConfirmAdjust.addEventListener('click', confirmAdjustHandler);
  }
  if (DOM.adjustInputQty) {
    DOM.adjustInputQty.addEventListener('input', updateAdjustSimulation);
  }
  const adjustRadios = document.getElementsByName('adjustActionType');
  adjustRadios.forEach(r => {
    r.addEventListener('change', updateAdjustSimulation);
  });

  // 在庫履歴モーダル制御
  if (DOM.btnCloseInventoryHistoryModal) {
    DOM.btnCloseInventoryHistoryModal.addEventListener('click', closeInventoryHistoryModal);
  }
  if (DOM.btnCloseInventoryHistoryModal2) {
    DOM.btnCloseInventoryHistoryModal2.addEventListener('click', closeInventoryHistoryModal);
  }

  // 経費・仕入切り替えトグル＆在庫連動の初期化
  initExpensePurchaseToggle();

  // 値引きモーダル制御
  if (DOM.btnOpenDiscountModal) {
    DOM.btnOpenDiscountModal.addEventListener('click', openDiscountModal);
  }
  if (DOM.btnCloseDiscountModal) {
    DOM.btnCloseDiscountModal.addEventListener('click', closeDiscountModal);
  }
  if (DOM.btnCloseDiscountModal2) {
    DOM.btnCloseDiscountModal2.addEventListener('click', closeDiscountModal);
  }
  if (DOM.discountModal) {
    DOM.discountModal.addEventListener('click', (e) => {
      if (e.target === DOM.discountModal) closeDiscountModal();
    });
  }

  // 値引き計算アシスト
  if (DOM.discountBaseUserPriceInc) {
    DOM.discountBaseUserPriceInc.addEventListener('input', updateDiscountCalculator);
  }
  if (DOM.discountSelectType) {
    DOM.discountSelectType.addEventListener('change', () => {
      const type = DOM.discountSelectType.value;
      if (type === 'percent') {
        DOM.discountInputValue.placeholder = '例: 10 (%)';
      } else if (type === 'amount') {
        DOM.discountInputValue.placeholder = '例: 5000 (円)';
      } else {
        DOM.discountInputValue.placeholder = '例: 3000 (税抜仕切り直接指定)';
      }
      updateDiscountCalculator();
    });
  }
  if (DOM.discountInputValue) {
    DOM.discountInputValue.addEventListener('input', updateDiscountCalculator);
  }
  if (DOM.discountSelectTaxRate) {
    DOM.discountSelectTaxRate.addEventListener('change', updateDiscountCalculator);
  }

  // 値引き行の明細追加
  if (DOM.btnAddDiscountToItems) {
    DOM.btnAddDiscountToItems.addEventListener('click', handleAddDiscountToItems);
  }

  // 会計・収支ダッシュボード画面制御
  if (DOM.btnOpenAccounting) {
    DOM.btnOpenAccounting.addEventListener('click', openAccountingModal);
  }
  if (DOM.btnCloseAccountingModal) {
    DOM.btnCloseAccountingModal.addEventListener('click', closeAccountingModal);
  }
  if (DOM.btnCloseAccountingModal2) {
    DOM.btnCloseAccountingModal2.addEventListener('click', closeAccountingModal);
  }

  // 会計タブ切り替え
  if (DOM.accTabBtns) {
    DOM.accTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        switchAccountingTab(tab);
      });
    });
  }

  // 会計共通集計期間セレクター＆カレンダー期間モーダル連携
  if (DOM.accGlobalPeriodPreset) {
    DOM.accGlobalPeriodPreset.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'custom') {
        openAccDateRangeModal();
      } else {
        applyAccGlobalPeriod(val);
      }
    });
  }
  if (DOM.badgeAccActivePeriod) {
    DOM.badgeAccActivePeriod.addEventListener('click', (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      openAccDateRangeModal();
    });
  }
  if (DOM.modalAccDateStart) {
    DOM.modalAccDateStart.addEventListener('input', updateAccDateRangeModalPreview);
    DOM.modalAccDateStart.addEventListener('change', updateAccDateRangeModalPreview);
    DOM.modalAccDateStart.addEventListener('click', () => {
      if (typeof DOM.modalAccDateStart.showPicker === 'function') {
        try { DOM.modalAccDateStart.showPicker(); } catch (err) {}
      }
    });
  }
  if (DOM.modalAccDateEnd) {
    DOM.modalAccDateEnd.addEventListener('input', updateAccDateRangeModalPreview);
    DOM.modalAccDateEnd.addEventListener('change', updateAccDateRangeModalPreview);
    DOM.modalAccDateEnd.addEventListener('click', () => {
      if (typeof DOM.modalAccDateEnd.showPicker === 'function') {
        try { DOM.modalAccDateEnd.showPicker(); } catch (err) {}
      }
    });
  }
  if (DOM.btnConfirmAccDateRange) {
    DOM.btnConfirmAccDateRange.addEventListener('click', confirmAccDateRangeFromModal);
  }

  // 売上消込フィルター
  if (DOM.btnFilterAllInvoices) {
    DOM.btnFilterAllInvoices.addEventListener('click', () => filterSalesTable('all'));
  }
  if (DOM.btnFilterUnpaidInvoices) {
    DOM.btnFilterUnpaidInvoices.addEventListener('click', () => filterSalesTable('unpaid'));
  }
  if (DOM.btnFilterPaidInvoices) {
    DOM.btnFilterPaidInvoices.addEventListener('click', () => filterSalesTable('paid'));
  }

  // 経費一覧テーブルの絞り込み（立替者・未精算）
  if (DOM.expenseFilterClaimant) {
    DOM.expenseFilterClaimant.addEventListener('change', () => {
      renderAccountingExpenses(currentAccGlobalPeriod);
    });
  }
  if (DOM.expenseFilterUnsettledOnly) {
    DOM.expenseFilterUnsettledOnly.addEventListener('change', () => {
      renderAccountingExpenses(currentAccGlobalPeriod);
    });
  }

  // 経費精算書発行モーダル制御
  if (DOM.btnOpenExpenseSettlementModal) {
    DOM.btnOpenExpenseSettlementModal.addEventListener('click', () => openExpenseSettlementModal());
  }
  if (DOM.btnOpenExpenseSettlementModalAcc) {
    DOM.btnOpenExpenseSettlementModalAcc.addEventListener('click', () => openExpenseSettlementModal());
  }
  if (DOM.btnCloseExpenseSettlementModal) {
    DOM.btnCloseExpenseSettlementModal.addEventListener('click', closeExpenseSettlementModal);
  }
  if (DOM.btnCloseExpenseSettlementModal2) {
    DOM.btnCloseExpenseSettlementModal2.addEventListener('click', closeExpenseSettlementModal);
  }
  if (DOM.btnApplySettlementFilter) {
    DOM.btnApplySettlementFilter.addEventListener('click', renderExpenseSettlementSheet);
  }
  if (DOM.settlementModalClaimant) {
    DOM.settlementModalClaimant.addEventListener('change', renderExpenseSettlementSheet);
  }
  if (DOM.settlementModalPeriodStart) {
    DOM.settlementModalPeriodStart.addEventListener('change', renderExpenseSettlementSheet);
  }
  if (DOM.settlementModalPeriodEnd) {
    DOM.settlementModalPeriodEnd.addEventListener('change', renderExpenseSettlementSheet);
  }
  if (DOM.settlementModalUnsettledOnly) {
    DOM.settlementModalUnsettledOnly.addEventListener('change', renderExpenseSettlementSheet);
  }
  if (DOM.btnPrintExpenseSettlement) {
    DOM.btnPrintExpenseSettlement.addEventListener('click', handlePrintExpenseSettlement);
  }
  if (DOM.btnMarkExpensesSettled) {
    DOM.btnMarkExpensesSettled.addEventListener('click', handleMarkExpensesSettled);
  }
  if (DOM.expenseSettlementModal) {
    DOM.expenseSettlementModal.addEventListener('click', (e) => {
      if (e.target === DOM.expenseSettlementModal) closeExpenseSettlementModal();
    });
  }

  // 請求書詳細・直接編集モーダル制御
  if (DOM.btnCloseIqeModal) {
    DOM.btnCloseIqeModal.addEventListener('click', closeInvoiceQuickEditModal);
  }
  if (DOM.btnCancelIqeModal) {
    DOM.btnCancelIqeModal.addEventListener('click', closeInvoiceQuickEditModal);
  }
  if (DOM.btnSaveIqeModal) {
    DOM.btnSaveIqeModal.addEventListener('click', saveInvoiceQuickEditHandler);
  }
  if (DOM.btnIqeAddItem) {
    DOM.btnIqeAddItem.addEventListener('click', () => {
      currentIqeItems.push({
        id: 'item_' + Date.now(),
        name: '',
        quantity: 1,
        unit: '個',
        unitPrice: 0,
        taxRate: 10,
        note: ''
      });
      renderIqeItemsTable();
    });
  }
  if (DOM.btnIqeCancelIssue) {
    DOM.btnIqeCancelIssue.addEventListener('click', () => {
      if (!currentIqeDoc) return;
      const docId = DOM.iqeDocId ? DOM.iqeDocId.value : currentIqeDoc.id;
      const docNo = currentIqeDoc.docNumber || 'この書類';
      if (!confirm(`伝票「${docNo}」の確定発行を取り消しますか？\n\n【取り消しの効果】\n・売上消込台帳・P/Lダッシュボード・仕訳帳から即座に除外されます。\n・書類データは削除されず、下書き状態に戻ります。`)) {
        return;
      }
      cancelDocIssue(docId);
      if (currentDoc && currentDoc.id === docId) {
        currentDoc.isIssued = false;
        currentDoc.isCancelled = true;
        currentDoc.issuedAt = null;
        saveActiveDoc(currentDoc);
        renderAll();
      }
      initAccountingMonthSelector();
      renderAccountingSales(currentSalesFilter);
      renderAccountingDashboard(DOM.accSelectMonth ? DOM.accSelectMonth.value : '');
      renderAccountingJournals();
      closeInvoiceQuickEditModal();
      showToast(`伝票「${docNo}」の確定発行を取り消しました（財務会計から除外されました）`, 'warning');
    });
  }
  if (DOM.btnIqeOpenInEditor) {
    DOM.btnIqeOpenInEditor.addEventListener('click', () => {
      if (!currentIqeDoc) return;
      const docId = DOM.iqeDocId ? DOM.iqeDocId.value : currentIqeDoc.id;
      const full = getDocFromHistory(docId) || currentIqeDoc;
      currentDoc = JSON.parse(JSON.stringify(full));
      saveActiveDoc(currentDoc);
      populateFormFromDoc();
      updateThemeColor(currentDoc.themeColor || 'indigo');
      renderAll();
      closeInvoiceQuickEditModal();
      switchAppView('invoice');
      showToast(`伝票「${currentDoc.docNumber || ''}」を納品請求書エディタで開きました`, 'success');
    });
  }
  if (DOM.invoiceQuickEditModal) {
    DOM.invoiceQuickEditModal.addEventListener('click', (e) => {
      if (e.target === DOM.invoiceQuickEditModal) closeInvoiceQuickEditModal();
    });
  }

  // レシート画像アップロード・ドラッグ＆ドロップ
  initReceiptUploadHandlers();

  // 経費フォーム制御
  if (DOM.formExpenseInput) {
    DOM.formExpenseInput.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSaveExpense();
    });
  }
  if (DOM.btnSaveExpense) {
    DOM.btnSaveExpense.addEventListener('click', handleSaveExpense);
  }
  if (DOM.btnResetExpenseForm) {
    DOM.btnResetExpenseForm.addEventListener('click', resetExpenseForm);
  }
  if (DOM.btnClearReceiptImage) {
    DOM.btnClearReceiptImage.addEventListener('click', clearReceiptImage);
  }

  // レシート画像 拡大モーダル制御
  if (DOM.btnZoomReceiptImage) {
    DOM.btnZoomReceiptImage.addEventListener('click', () => {
      if (currentReceiptDataUrl) openReceiptZoom(currentReceiptDataUrl);
    });
  }
  if (DOM.receiptImageScrollBox) {
    DOM.receiptImageScrollBox.addEventListener('click', () => {
      if (currentReceiptDataUrl) openReceiptZoom(currentReceiptDataUrl);
    });
  }
  if (DOM.btnCloseReceiptZoom) {
    DOM.btnCloseReceiptZoom.addEventListener('click', closeReceiptZoom);
  }
  if (DOM.receiptZoomModal) {
    DOM.receiptZoomModal.addEventListener('click', (e) => {
      if (e.target === DOM.receiptZoomModal) closeReceiptZoom();
    });
  }

  // ウィンドウへのファイル誤ドロップによるブラウザ遷移を防止
  window.addEventListener('dragover', (e) => e.preventDefault(), false);
  window.addEventListener('drop', (e) => e.preventDefault(), false);

  // 仕訳CSVエクスポート
  if (DOM.btnExportJournalCSV) {
    DOM.btnExportJournalCSV.addEventListener('click', handleExportJournalCSV);
  }

  // 勤怠打刻（タイムカード）画面制御
  if (DOM.btnOpenAttendance) {
    DOM.btnOpenAttendance.addEventListener('click', openAttendanceModal);
  }
  if (DOM.btnCloseAttendanceModal) {
    DOM.btnCloseAttendanceModal.addEventListener('click', closeAttendanceModal);
  }
  if (DOM.btnCloseAttendanceModal2) {
    DOM.btnCloseAttendanceModal2.addEventListener('click', closeAttendanceModal);
  }

  // 出勤・退勤打刻ボタン
  if (DOM.btnClockIn) {
    DOM.btnClockIn.addEventListener('click', handleClockIn);
  }
  if (DOM.btnClockOut) {
    DOM.btnClockOut.addEventListener('click', handleClockOut);
  }

  // 勤怠表示期間フィルター変更イベント
  if (DOM.attendanceMonthFilter) {
    DOM.attendanceMonthFilter.addEventListener('change', (e) => {
      handleAttendanceMonthFilterChange(e.target.value);
    });
  }

  // 勤怠CSVエクスポート
  if (DOM.btnExportAttendanceCSV) {
    DOM.btnExportAttendanceCSV.addEventListener('click', handleExportAttendanceCSV);
  }

  // 打刻漏れ手動入力フォーム制御
  if (DOM.btnToggleManualAttendanceForm) {
    DOM.btnToggleManualAttendanceForm.addEventListener('click', () => toggleManualAttendanceForm());
  }
  if (DOM.btnCloseAttendanceManualForm) {
    DOM.btnCloseAttendanceManualForm.addEventListener('click', () => toggleManualAttendanceForm(false));
  }
  if (DOM.btnCancelAttendanceManual) {
    DOM.btnCancelAttendanceManual.addEventListener('click', () => toggleManualAttendanceForm(false));
  }
  if (DOM.btnSaveAttendanceManual) {
    DOM.btnSaveAttendanceManual.addEventListener('click', handleSaveManualAttendance);
  }

  // 出勤簿（A4帳票）モーダル制御
  if (DOM.btnOpenAttendanceSheetModal) {
    DOM.btnOpenAttendanceSheetModal.addEventListener('click', () => {
      const targetYM = (typeof currentAttendanceFilterMonth !== 'undefined' && currentAttendanceFilterMonth && currentAttendanceFilterMonth !== 'all')
        ? currentAttendanceFilterMonth
        : (typeof getTodayDateString === 'function' ? getTodayDateString().substring(0, 7) : '');
      openAttendanceSheetModal(targetYM);
    });
  }
  const btnOpenAttendanceSheetScreen = document.getElementById('btnOpenAttendanceSheetScreen');
  if (btnOpenAttendanceSheetScreen) {
    btnOpenAttendanceSheetScreen.addEventListener('click', () => {
      const targetYM = (typeof currentAttendanceFilterMonth !== 'undefined' && currentAttendanceFilterMonth && currentAttendanceFilterMonth !== 'all')
        ? currentAttendanceFilterMonth
        : (typeof getTodayDateString === 'function' ? getTodayDateString().substring(0, 7) : '');
      openAttendanceSheetModal(targetYM);
    });
  }
  if (DOM.btnCloseAttendanceSheetModal) {
    DOM.btnCloseAttendanceSheetModal.addEventListener('click', closeAttendanceSheetModal);
  }
  if (DOM.btnCloseAttendanceSheetModal2) {
    DOM.btnCloseAttendanceSheetModal2.addEventListener('click', closeAttendanceSheetModal);
  }
  if (DOM.attendanceSheetModal) {
    DOM.attendanceSheetModal.addEventListener('click', (e) => {
      if (e.target === DOM.attendanceSheetModal) closeAttendanceSheetModal();
    });
  }
  if (DOM.btnPrevSheetMonth) {
    DOM.btnPrevSheetMonth.addEventListener('click', () => changeSheetMonth(-1));
  }
  if (DOM.btnNextSheetMonth) {
    DOM.btnNextSheetMonth.addEventListener('click', () => changeSheetMonth(1));
  }
  if (DOM.sheetMonthSelector) {
    DOM.sheetMonthSelector.addEventListener('change', (e) => {
      if (e.target.value) {
        currentSheetYM = e.target.value;
        renderAttendanceCalendarSheet(currentSheetYM);
      }
    });
  }
  if (DOM.btnPrintAttendanceSheet) {
    DOM.btnPrintAttendanceSheet.addEventListener('click', handlePrintAttendanceSheet);
  }

  // 社員番号・氏名の編集保存
  if (DOM.inputSheetEmpNo) {
    DOM.inputSheetEmpNo.addEventListener('change', () => {
      saveAttendanceEmployee({ empNo: DOM.inputSheetEmpNo.value });
    });
  }
  if (DOM.inputSheetEmpName) {
    DOM.inputSheetEmpName.addEventListener('change', () => {
      saveAttendanceEmployee({ empName: DOM.inputSheetEmpName.value });
    });
  }
}

// ==========================================================================
// テーマカラー更新
// ==========================================================================
function updateThemeColor(colorKey) {
  const theme = THEME_COLORS[colorKey] || THEME_COLORS.indigo;
  const root = document.documentElement;

  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-primary-light', theme.primaryLight);
  root.style.setProperty('--theme-primary-dark', theme.primaryDark);
  root.style.setProperty('--theme-accent', theme.accent);

  DOM.colorDotBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === colorKey);
  });
}

// ==========================================================================
// 印鑑サムネイル更新
// ==========================================================================
function updateStampThumbnail(dataUrl) {
  const thumb = DOM.stampPreviewThumb || document.getElementById('stampPreviewThumb') || document.getElementById('settingStampPreviewThumb');
  if (!thumb) return;
  if (dataUrl) {
    thumb.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: contain;">`;
  } else {
    thumb.innerHTML = `<span style="font-size: 0.7rem; color: var(--text-muted);">プレビュー</span>`;
  }
}

// ==========================================================================
// 履歴モーダル表示 ＆ 高度複合検索（商品同時購入・取引先・年月・種別）
// ==========================================================================
function openHistoryModal() {
  const modal = DOM.historyModal || document.getElementById('historyModal');
  if (!modal) return;

  const list = getHistoryList();
  
  if (DOM.historyTotalCountBadge) {
    DOM.historyTotalCountBadge.textContent = `全 ${list.length} 件`;
  }

  // 1. 年月セレクター（historySearchMonth）の動的構築
  if (DOM.historySearchMonth) {
    const currentSelectedMonth = DOM.historySearchMonth.value;
    const monthsSet = new Set();
    list.forEach(item => {
      if (item.issueDate && item.issueDate.length >= 7) {
        monthsSet.add(item.issueDate.substring(0, 7)); // YYYY-MM
      }
    });
    const sortedMonths = Array.from(monthsSet).sort().reverse();
    
    let monthOptsHtml = '<option value="">すべての年月</option>';
    sortedMonths.forEach(ym => {
      const [y, m] = ym.split('-');
      monthOptsHtml += `<option value="${ym}">${y}年${parseInt(m, 10)}月度</option>`;
    });
    DOM.historySearchMonth.innerHTML = monthOptsHtml;
    if (currentSelectedMonth && sortedMonths.includes(currentSelectedMonth)) {
      DOM.historySearchMonth.value = currentSelectedMonth;
    }
  }

  // 2. 取引先データリスト（historyClientDatalist）の構築
  if (DOM.historyClientDatalist) {
    const clientSet = new Set();
    list.forEach(item => {
      const name = item.clientName || item.client?.name;
      if (name && name.trim()) clientSet.add(name.trim());
    });
    // 取引先マスタからも追加
    const masterClients = typeof getClientMaster === 'function' ? getClientMaster() : [];
    masterClients.forEach(c => {
      if (c.name && c.name.trim()) clientSet.add(c.name.trim());
    });

    let clientOptsHtml = '';
    Array.from(clientSet).sort().forEach(name => {
      clientOptsHtml += `<option value="${escapeHtml(name)}">`;
    });
    DOM.historyClientDatalist.innerHTML = clientOptsHtml;
  }

  // 3. 商品クイック選択チップの構築（よく登場する商品をワンクリックでAND検索窓へ投入）
  if (DOM.historyProductQuickChips) {
    const productFrequency = {};
    list.forEach(item => {
      if (Array.isArray(item.items)) {
        item.items.forEach(it => {
          const n = (it.name || '').trim();
          if (n) productFrequency[n] = (productFrequency[n] || 0) + 1;
        });
      }
    });
    // 商品マスタからも補完
    const masterItems = typeof getItemMaster === 'function' ? getItemMaster() : [];
    masterItems.forEach(it => {
      const n = (it.name || '').trim();
      if (n && !productFrequency[n]) productFrequency[n] = 0;
    });

    // 頻度上位の商品をチップ表示
    const topProducts = Object.keys(productFrequency)
      .sort((a, b) => productFrequency[b] - productFrequency[a])
      .slice(0, 10);

    let chipsHtml = '';
    topProducts.forEach(prodName => {
      chipsHtml += `<button type="button" class="history-quick-chip-btn" data-prod="${escapeHtml(prodName)}">+ ${escapeHtml(prodName)}</button>`;
    });
    DOM.historyProductQuickChips.innerHTML = chipsHtml;

    // チップクリックで検索ワードに追加
    DOM.historyProductQuickChips.querySelectorAll('.history-quick-chip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.dataset.prod;
        if (!DOM.historySearchProduct) return;
        const currentVal = DOM.historySearchProduct.value.trim();
        if (!currentVal) {
          DOM.historySearchProduct.value = p;
        } else if (!currentVal.includes(p)) {
          DOM.historySearchProduct.value = `${currentVal} ${p}`;
        }
        filterAndRenderHistoryList();
      });
    });
  }

  // 4. モーダルを表示
  modal.classList.add('active');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // 4.5. スマホ画面なら初期状態で検索条件を折りたたむ
  if (window.innerWidth <= 768) {
    const filtersArea = document.getElementById('historySearchFiltersArea');
    const toggleBtn = document.getElementById('btnToggleHistoryFilters');
    if (filtersArea && toggleBtn) {
      filtersArea.style.display = 'none';
      toggleBtn.innerHTML = '🔍 検索条件を開く ▼';
    }
  }

  // 5. 検索＆描画実行
  filterAndRenderHistoryList();

  // 6. サーバーから最新の書類履歴をバックグラウンド自動同期して他ユーザーの作成データを即座に反映
  if (typeof syncInvoicesHistoryWithServer === 'function') {
    syncInvoicesHistoryWithServer().then(synced => {
      if (modal.classList.contains('active') || modal.style.display === 'flex') {
        const updatedList = getHistoryList();
        if (DOM.historyTotalCountBadge) {
          DOM.historyTotalCountBadge.textContent = `全 ${updatedList.length} 件`;
        }
        filterAndRenderHistoryList();
      }
    }).catch(err => {
      console.warn('History auto sync error:', err);
    });
  }
}

function closeHistoryModal() {
  const modal = DOM.historyModal || document.getElementById('historyModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
}

window.openHistoryModal = openHistoryModal;
window.closeHistoryModal = closeHistoryModal;

/**
 * 複合検索フィルター実行 ＆ 履歴カードレンダリング
 */
function filterAndRenderHistoryList() {
  const container = DOM.historyListContainer || document.getElementById('historyListContainer');
  if (!container) return;

  const list = getHistoryList();
  
  // 検索条件の取得
  const productQuery = (DOM.historySearchProduct?.value || '').trim();
  const clientQuery = (DOM.historySearchClient?.value || '').trim().toLowerCase();
  const monthQuery = (DOM.historySearchMonth?.value || '').trim();
  const docTypeQuery = (DOM.historySearchDocType?.value || '').trim();

  // 商品名キーワード（全角・半角スペースで複数キーワードに分割して小文字化）
  const productKeywords = productQuery
    ? productQuery.split(/[\s　]+/).filter(w => w.length > 0).map(w => w.toLowerCase())
    : [];

  // フィルタリング実行
  let filtered = list.filter(item => {
    // 1. 対象年月
    if (monthQuery) {
      if (!item.issueDate || !item.issueDate.startsWith(monthQuery)) {
        return false;
      }
    }

    // 2. 書類種別
    if (docTypeQuery) {
      if (item.docType !== docTypeQuery) {
        return false;
      }
    }

    // 3. 取引先
    if (clientQuery) {
      const cName = (item.clientName || item.client?.name || '').toLowerCase();
      if (!cName.includes(clientQuery)) {
        return false;
      }
    }

    // 4. 商品（単品または「何と何が同時に買われたか」の複数商品AND検索）
    if (productKeywords.length > 0) {
      const docItems = Array.isArray(item.items) ? item.items : [];
      if (docItems.length === 0) return false;

      // 伝票内の全明細商品のテキスト群
      const itemTexts = docItems.map(it => {
        return `${it.name || ''} ${it.description || ''} ${it.note || ''}`.toLowerCase();
      });

      // 入力されたすべての商品キーワードが、伝票内のいずれかの明細に含まれているか（AND検索）
      const matchesAllKeywords = productKeywords.every(kw => {
        return itemTexts.some(text => text.includes(kw));
      });

      if (!matchesAllKeywords) {
        return false;
      }
    }

    return true;
  });

  // サマリー表示の更新
  const matchedCount = filtered.length;
  const matchedTotal = filtered.reduce((sum, it) => sum + (Number(it.grandTotal) || 0), 0);

  if (DOM.historyMatchCount) {
    DOM.historyMatchCount.textContent = matchedCount;
  }
  if (DOM.historyMatchTotalAmount) {
    DOM.historyMatchTotalAmount.textContent = formatCurrency(matchedTotal);
  }

  container.innerHTML = '';

  if (filtered.length === 0) {
    const hasFilter = productKeywords.length > 0 || clientQuery || monthQuery || docTypeQuery;
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 48px 16px; background: #ffffff; border-radius: 8px; border: 1px dashed #cbd5e1;">
        <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
        <p style="font-weight: 700; color: #334155; margin-bottom: 6px;">条件に一致する書類は見つかりませんでした</p>
        <p style="font-size: 0.8rem; color: #64748b; margin: 0;">
          ${hasFilter ? '検索キーワードや対象年月、取引先の絞り込み条件を変更してお試しください。' : '保存された書類履歴がまだありません。エディタの「履歴に保存」で保存できます。'}
        </p>
      </div>
    `;
    return;
  }

  // 伝票カードの一覧描画
  filtered.forEach(item => {
    const typeMeta = DOC_TYPES[item.docType] || DOC_TYPES.invoice;
    const isIssued = !!(item.isIssued && !item.isCancelled);

    const card = document.createElement('div');
    card.className = 'history-card-row';

    const statusBadge = isIssued
      ? `<span style="background: #dcfce7; color: #166534; font-weight: 700; font-size: 0.725rem; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="財務会計（売上・売掛金消込・仕訳帳）に反映中"><span style="font-size: 7px; color: #15803d;">●</span> 確定発行済</span>`
      : `<span style="background: #f1f5f9; color: #64748b; font-weight: 600; font-size: 0.725rem; padding: 2px 7px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;" title="下書き状態（財務会計には未反映）"><span style="font-size: 7px; color: #94a3b8;">●</span> 下書き</span>`;

    const cancelIssueBtnHtml = isIssued
      ? `<button type="button" class="btn btn-outline-danger btn-sm btn-cancel-issue" style="color: #ef4444; border-color: #fca5a5; font-size: 0.75rem; padding: 4px 9px;" title="確定発行を取り消し、財務会計から除外して下書きに戻します">確定取消</button>`
      : '';

    // 伝票に含まれる明細商品チップの生成（マッチしたキーワードはハイライト）
    let itemsChipsHtml = '';
    const docItems = Array.isArray(item.items) ? item.items : [];
    if (docItems.length > 0) {
      const chips = docItems.map(it => {
        const itName = it.name || '名称未設定';
        const itText = `${itName} ${it.description || ''}`.toLowerCase();
        // 検索キーワードにマッチするか判定
        const isMatched = productKeywords.some(kw => itText.includes(kw));
        const qtyStr = it.quantity ? ` ×${it.quantity}` : '';
        return `<span class="history-item-chip ${isMatched ? 'is-match' : ''}">📦 ${escapeHtml(itName)}${qtyStr}</span>`;
      });
      itemsChipsHtml = `
        <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #f1f5f9;">
          ${chips.join('')}
        </div>
      `;
    }

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
        
        <!-- 左側：書類基本情報 ＆ 明細商品チップ -->
        <div style="flex: 1; min-width: 280px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="background: var(--theme-primary-light); color: var(--theme-primary-dark); font-weight: 700; font-size: 0.75rem; padding: 2px 7px; border-radius: 4px;">
              ${typeMeta.label}
            </span>
            ${statusBadge}
            <span style="font-weight: 800; font-size: 0.95rem; color: #0f172a;">${escapeHtml(item.clientName || item.client?.name || '名称未設定')}</span>
            <span style="font-size: 0.8rem; color: #64748b; font-family: monospace; background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">${escapeHtml(item.docNumber || '-')}</span>
          </div>
          
          <div style="font-size: 0.8rem; color: #475569; display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
            <span>件名: <strong style="color: #1e293b;">${escapeHtml(item.title || '無題')}</strong></span>
            <span>発行日: ${escapeHtml(item.issueDate || '-')}</span>
            <span>明細: <strong>${docItems.length}</strong> 件</span>
          </div>

          <!-- 商品一覧チップ -->
          ${itemsChipsHtml}
        </div>

        <!-- 右側：金額 ＆ 操作アクションボタン -->
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width: 190px;">
          <div style="text-align: right;">
            <span style="font-size: 0.7rem; color: #64748b; display: block;">税込合計金額</span>
            <span style="font-size: 1.25rem; font-weight: 900; color: #0f172a; font-family: monospace;">${formatCurrency(item.grandTotal || 0)}</span>
          </div>

          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
            ${cancelIssueBtnHtml}
            <button type="button" class="btn btn-secondary btn-sm btn-duplicate-doc" style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px;" title="この伝票の取引先・明細を引き継いで新規作成">
              <span>📑</span> 複製して新規
            </button>
            <button type="button" class="btn btn-primary btn-sm btn-load-doc" style="font-size: 0.75rem; padding: 4px 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="この書類をエディタで開いて編集">
              <span>📂</span> 開く
            </button>
            <button type="button" class="btn-icon-danger btn-delete-doc" style="border: none; background: #fee2e2; color: #ef4444; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 13px;" title="履歴から削除">🗑️</button>
          </div>
        </div>

      </div>
    `;

    // 1. 確定取消ボタンのイベント
    const cancelBtn = card.querySelector('.btn-cancel-issue');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const docNo = item.docNumber || 'この書類';
        if (confirm(`「${typeMeta.label} (${docNo})」の確定発行を取り消しますか？\n\n【取り消しの効果】\n・財務会計（売上高・売掛金消込・仕訳帳）から即座に除外されます。\n・書類データは削除されず、下書き状態に戻ります。`)) {
          cancelDocIssue(item.id);

          // もし現在編集中書類が同一なら currentDoc も同期
          if (currentDoc && currentDoc.id === item.id) {
            currentDoc.isIssued = false;
            currentDoc.isCancelled = true;
            currentDoc.issuedAt = null;
            saveActiveDoc(currentDoc);
            renderAll();
          }

          // 財務会計を再同期
          if (typeof initAccountingMonthSelector === 'function') initAccountingMonthSelector();
          const currentMonth = DOM.accSelectMonth ? DOM.accSelectMonth.value : '';
          if (typeof renderAccountingDashboard === 'function') renderAccountingDashboard(currentMonth);
          if (typeof renderAccountingSales === 'function') renderAccountingSales(currentSalesFilter);
          if (typeof renderAccountingJournals === 'function') renderAccountingJournals();

          filterAndRenderHistoryList(); // 再描画
          showToast(`「${typeMeta.label}」の確定発行を取り消しました（財務会計から除外されました）`, 'warning');
        }
      });
    }

    // 2. 「開く」ボタンのイベント
    card.querySelector('.btn-load-doc').addEventListener('click', () => {
      const full = getDocFromHistory(item.id);
      if (full) {
        currentDoc = full;
        populateFormFromDoc();
        updateThemeColor(currentDoc.themeColor || 'indigo');
        renderAll();
        closeHistoryModal();
        showToast(`「${item.clientName || '取引先'}」の書類を読み込みました`, 'success');
      }
    });

    // 3. 「複製して新規作成」ボタンのイベント
    card.querySelector('.btn-duplicate-doc').addEventListener('click', () => {
      duplicateDocFromHistory(item.id);
    });

    // 4. 「削除」ボタンのイベント
    card.querySelector('.btn-delete-doc').addEventListener('click', () => {
      if (confirm(`「${item.docNumber || '書類'}」の履歴を削除しますか？`)) {
        deleteDocFromHistory(item.id);
        // 財務会計も再同期
        if (typeof initAccountingMonthSelector === 'function') initAccountingMonthSelector();
        const currentMonth = DOM.accSelectMonth ? DOM.accSelectMonth.value : '';
        if (typeof renderAccountingDashboard === 'function') renderAccountingDashboard(currentMonth);
        if (typeof renderAccountingSales === 'function') renderAccountingSales(currentSalesFilter);
        if (typeof renderAccountingJournals === 'function') renderAccountingJournals();

        filterAndRenderHistoryList(); // 再描画
        showToast('履歴から削除しました', 'info');
      }
    });

    container.appendChild(card);
  });
}

/**
 * 過去の履歴書類から明細・取引先を引き継いで新規書類を作成（複製）
 */
function duplicateDocFromHistory(id) {
  const orig = getDocFromHistory(id);
  if (!orig) return;

  const newDoc = JSON.parse(JSON.stringify(orig));
  newDoc.id = `doc_${Date.now()}`;
  newDoc.docNumber = generateDocNumber(newDoc.docType || 'invoice');
  
  // 発行日を当日にセット
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  newDoc.issueDate = todayStr;

  // 支払期日を翌月末にセット
  const nextMonthLast = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  newDoc.dueDate = `${nextMonthLast.getFullYear()}-${String(nextMonthLast.getMonth() + 1).padStart(2, '0')}-${String(nextMonthLast.getDate()).padStart(2, '0')}`;

  // 確定発行フラグを初期化（下書き）
  newDoc.isIssued = false;
  newDoc.isCancelled = false;
  newDoc.issuedAt = null;
  newDoc.isPaid = false;
  newDoc.paymentStatus = 'unpaid';

  currentDoc = newDoc;
  populateFormFromDoc();
  updateThemeColor(currentDoc.themeColor || 'indigo');
  renderAll();
  closeHistoryModal();
  showToast(`「${orig.clientName || '取引先'}」の明細構成を引き継いで新規作成しました！`, 'success');
}

function openBackupModal() {
  DOM.backupModal.classList.add('active');
}

function closeBackupModal() {
  DOM.backupModal.classList.remove('active');
}

// ==========================================================================
// 商品マスタ管理 ＆ 販売店仕切り価格自動計算
// ==========================================================================
function openItemMasterModal() {
  DOM.itemMasterModal.classList.add('active');
  DOM.inputSearchItemMaster.value = '';
  resetItemMasterForm();
  renderItemMasterList();
}

function closeItemMasterModal() {
  DOM.itemMasterModal.classList.remove('active');
}

function toggleItemMasterForm(show) {
  const isHidden = DOM.itemMasterFormContainer.style.display === 'none';
  const willShow = (typeof show === 'boolean') ? show : isHidden;
  DOM.itemMasterFormContainer.style.display = willShow ? 'block' : 'none';
  DOM.btnToggleNewItemForm.style.display = willShow ? 'none' : 'inline-flex';
  if (willShow) {
    DOM.itemMasterInputName.focus();
  }
}

function resetItemMasterForm() {
  DOM.itemMasterEditId.value = '';
  DOM.itemMasterFormTitle.textContent = '新規商品の登録';
  DOM.itemMasterInputName.value = '';
  DOM.calcInputUserPriceInc.value = '';
  DOM.itemMasterInputPrice.value = '';
  DOM.itemMasterInputUnit.value = '式';
  DOM.itemMasterSelectTax.value = '10';
  DOM.itemMasterInputNote.value = '';
  updateMasterCalculator(false);
  toggleItemMasterForm(false);
}

function updateMasterCalculator(autoApply = true) {
  const userPriceInc = Number(DOM.calcInputUserPriceInc.value) || 0;
  const taxRate = Number(DOM.itemMasterSelectTax.value) || 10;
  const isWholesaleMode = DOM.calcModeWholesale ? DOM.calcModeWholesale.checked : true;

  let calculatedUnitPrice = 0;
  let wholesalePriceInc = 0;
  let profit = 0;

  if (isWholesaleMode) {
    // 1. 販売店仕切り価格の自動計算（販売店利益20%ルール）
    const res = calculateWholesalePrice(userPriceInc, taxRate);
    calculatedUnitPrice = res.wholesaleUnitPrice;
    wholesalePriceInc = res.wholesalePriceInc;
    profit = res.profit;

    if (DOM.calcDisplayUnitPrice) DOM.calcDisplayUnitPrice.textContent = formatCurrency(calculatedUnitPrice);
    if (DOM.calcPreviewSubInfo) {
      DOM.calcPreviewSubInfo.innerHTML = `(税込仕切り: <span id="calcDisplayWholesaleInc">${formatCurrency(wholesalePriceInc)}</span> / 販売店利益: <span id="calcDisplayProfit" style="color: #059669; font-weight: 600;">${formatCurrency(profit)}</span>)`;
    }
  } else {
    // 2. 通常税抜（単純除算: ユーザー税込 ÷ (1 + 税率)）
    const rateMultiplier = 1 + taxRate / 100;
    calculatedUnitPrice = userPriceInc > 0 ? Math.round(userPriceInc / rateMultiplier) : 0;
    const taxAmount = Math.max(0, userPriceInc - calculatedUnitPrice);

    if (DOM.calcDisplayUnitPrice) DOM.calcDisplayUnitPrice.textContent = formatCurrency(calculatedUnitPrice);
    if (DOM.calcPreviewSubInfo) {
      DOM.calcPreviewSubInfo.innerHTML = `(消費税額: <span>${formatCurrency(taxAmount)}</span> / 税抜定価)`;
    }
  }

  // ユーザー税込定価が入力されている場合、自動的に税抜き単価欄（itemMasterInputPrice）に即座に入力・反映
  if (autoApply && DOM.calcInputUserPriceInc.value.trim() !== '') {
    DOM.itemMasterInputPrice.value = calculatedUnitPrice > 0 ? calculatedUnitPrice : '';
  }

  return { calculatedUnitPrice, wholesalePriceInc, profit, userPriceInc, taxRate };
}

function applyMasterCalculatedPrice() {
  const userPriceInc = Number(DOM.calcInputUserPriceInc.value) || 0;
  if (userPriceInc <= 0) {
    showToast('ユーザー税込価格を入力してください', 'info');
    DOM.calcInputUserPriceInc.focus();
    return;
  }
  const res = updateMasterCalculator(true);
  showToast(`帳票の税抜単価に ${formatCurrency(res.calculatedUnitPrice)} を反映しました！`, 'success');
}

function handleSaveItemMaster() {
  const name = DOM.itemMasterInputName.value.trim();
  if (!name) {
    alert('品名・項目名を入力してください。');
    DOM.itemMasterInputName.focus();
    return;
  }

  const priceVal = DOM.itemMasterInputPrice.value;
  if (priceVal === '' || isNaN(Number(priceVal))) {
    alert('帳票の単価（税抜）を入力してください。');
    DOM.itemMasterInputPrice.focus();
    return;
  }

  const itemData = {
    name: name,
    unitPrice: Math.abs(Number(priceVal)),
    userPrice: Number(DOM.calcInputUserPriceInc.value) || 0,
    unit: DOM.itemMasterInputUnit.value.trim() || '式',
    taxRate: Number(DOM.itemMasterSelectTax.value) || 10,
    note: DOM.itemMasterInputNote.value.trim()
  };

  const editId = DOM.itemMasterEditId.value;
  if (editId) {
    itemData.id = editId;
  }

  saveItemToMaster(itemData);
  resetItemMasterForm();
  renderItemMasterList(DOM.inputSearchItemMaster.value);
  showToast(`商品「${name}」をマスタに保存しました！`, 'success');
}

function renderItemMasterList(searchQuery = '') {
  // 頻度の多い順にソートされた商品マスタを取得
  const allItems = getItemMasterList(true);
  const q = (searchQuery || '').trim().toLowerCase();

  const filtered = q
    ? allItems.filter(item => 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.note && item.note.toLowerCase().includes(q))
      )
    : allItems;

  DOM.itemMasterListContainer.innerHTML = '';

  if (filtered.length === 0) {
    DOM.itemMasterListContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.85rem;">
        ${q ? '検索条件に一致する商品は見つかりませんでした。' : '登録された商品がありません。「新規商品を登録」ボタンから登録してください。'}
      </div>
    `;
    return;
  }

  const usageMap = getItemMasterUsageMap();

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'master-item-card';

    // 販売店利益・税込仕切り参考計算（利益＝税込仕切り×20%、税抜ユーザー＝税抜仕切り＋利益）
    const taxRate = item.taxRate !== undefined ? item.taxRate : 10;
    const wholesaleInc = Math.round(item.unitPrice * (1 + taxRate / 100));
    const profit = Math.round(wholesaleInc * 0.20);
    const estUserEx = item.unitPrice + profit;
    const estUserPriceInc = item.userPrice || Math.round(estUserEx * (1 + taxRate / 100));

    // 使用回数の集計（マスタ記録値 ＋ 過去の書類履歴での登場回数）
    const totalUsage = (Number(item.usageCount) || 0) + (usageMap[(item.name || '').trim()] || 0);

    card.innerHTML = `
      <div class="master-item-info">
        <div class="master-item-header">
          <span class="master-item-name">${escapeHtml(item.name)}</span>
          <div style="display: flex; gap: 4px; align-items: center;">
            <span class="master-usage-badge" title="使用頻度">★ 頻度: ${totalUsage}回</span>
            <span class="badge" style="background: #f1f5f9; color: #475569; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px;">
              ${escapeHtml(item.unit || '式')} / 税率${taxRate}%
            </span>
          </div>
        </div>
        ${item.note ? `<div class="master-item-note">${escapeHtml(item.note)}</div>` : ''}
        <div class="master-item-meta" style="margin-top: 3px;">
          仕切り税込: ${formatCurrency(wholesaleInc)}
          <span style="color: #64748b; margin-left: 8px;">(想定ユーザー税込: 約${formatCurrency(estUserPriceInc)})</span>
        </div>
      </div>
      <div class="master-item-pricing">
        <div class="master-item-price">${formatCurrency(item.unitPrice)}</div>
        <div class="master-item-meta">税抜単価</div>
      </div>
      <div class="master-item-actions">
        <button type="button" class="btn btn-primary btn-sm btn-add-master-to-doc" title="この商品を伝票の明細に追加" style="padding: 4px 10px; font-size: 0.775rem;">
          ＋明細に追加
        </button>
        <button type="button" class="btn btn-secondary btn-sm btn-edit-master-item" title="編集" style="padding: 4px 8px; font-size: 0.75rem;">
          編集
        </button>
        <button type="button" class="btn-icon-danger btn-delete-master-item" title="マスタから削除" style="font-size: 0.9rem; padding: 4px;">
          ✕
        </button>
      </div>
    `;

    // 伝票へ追加（過去伝票やマスタから完全に独立したコピーオブジェクトとして追加）
    card.querySelector('.btn-add-master-to-doc').addEventListener('click', () => {
      // マスタの使用回数を記録
      recordItemMasterUsage(item.id, item.name);

      currentDoc.items.push({
        id: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
        name: item.name,
        quantity: 1,
        unit: item.unit || '式',
        unitPrice: item.unitPrice,
        userPrice: estUserPriceInc,
        taxRate: item.taxRate !== undefined ? item.taxRate : 10,
        note: item.note || ''
      });
      renderItemInputCards();
      renderAll();
      closeItemMasterModal();
      showToast(`「${item.name}」を明細に追加しました！`, 'success');
    });

    // 編集
    card.querySelector('.btn-edit-master-item').addEventListener('click', () => {
      toggleItemMasterForm(true);
      DOM.itemMasterFormTitle.textContent = `商品の編集: ${item.name}`;
      DOM.itemMasterEditId.value = item.id;
      DOM.itemMasterInputName.value = item.name;
      DOM.itemMasterInputPrice.value = item.unitPrice;
      DOM.itemMasterInputUnit.value = item.unit || '式';
      DOM.itemMasterSelectTax.value = String(item.taxRate !== undefined ? item.taxRate : 10);
      DOM.itemMasterInputNote.value = item.note || '';
      DOM.calcInputUserPriceInc.value = estUserPriceInc;
      updateMasterCalculator(false);
      DOM.itemMasterInputName.focus();
    });

    // 削除
    card.querySelector('.btn-delete-master-item').addEventListener('click', () => {
      if (confirm(`商品マスタから「${item.name}」を削除しますか？\n※既存の作成済み伝票の明細には影響しません。`)) {
        deleteItemFromMaster(item.id);
        renderItemMasterList(DOM.inputSearchItemMaster.value);
        showToast('商品マスタから削除しました');
      }
    });

    DOM.itemMasterListContainer.appendChild(card);
  });
}

// ==========================================================================
// 取引先マスタ コントローラー
// ==========================================================================
let currentClientFilter = 'customer';

function openClientMasterModal(defaultFilter = 'customer') {
  currentClientFilter = defaultFilter;
  if (DOM.clientFilterBtns) {
    DOM.clientFilterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === currentClientFilter);
    });
  }
  if (DOM.inputSearchClientMaster) DOM.inputSearchClientMaster.value = '';
  resetClientMasterForm();
  renderClientMasterList(currentClientFilter, '');
  if (DOM.clientMasterModal) DOM.clientMasterModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeClientMasterModal() {
  if (DOM.clientMasterModal) DOM.clientMasterModal.classList.remove('active');
  document.body.style.overflow = '';
  updateClientMasterDatalist();
}

function toggleNewClientForm(show = null) {
  if (!DOM.clientMasterFormContainer) return;
  const isCurrentlyHidden = DOM.clientMasterFormContainer.style.display === 'none';
  const shouldShow = show !== null ? show : isCurrentlyHidden;

  DOM.clientMasterFormContainer.style.display = shouldShow ? 'block' : 'none';
  if (DOM.btnToggleNewClientForm) {
    DOM.btnToggleNewClientForm.innerHTML = shouldShow
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> フォームを閉じる`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> 新規取引先を登録`;
  }
  if (shouldShow && DOM.clientMasterInputName) {
    DOM.clientMasterInputName.focus();
  }
}

function resetClientMasterForm() {
  if (DOM.clientMasterEditId) DOM.clientMasterEditId.value = '';
  if (DOM.clientMasterFormTitle) DOM.clientMasterFormTitle.textContent = '新規取引先の登録';
  if (DOM.clientMasterInputName) DOM.clientMasterInputName.value = '';
  if (DOM.clientMasterInputHonorific) DOM.clientMasterInputHonorific.value = '御中';
  if (DOM.clientMasterSelectCategory) DOM.clientMasterSelectCategory.value = 'customer';
  if (DOM.clientMasterInputZip) DOM.clientMasterInputZip.value = '';
  if (DOM.clientMasterInputAddress) DOM.clientMasterInputAddress.value = '';
  if (DOM.clientMasterInputContact) DOM.clientMasterInputContact.value = '';
  if (DOM.clientMasterInputTel) DOM.clientMasterInputTel.value = '';
  if (DOM.clientMasterInputEmail) DOM.clientMasterInputEmail.value = '';
  if (DOM.clientMasterInputInvoiceNum) DOM.clientMasterInputInvoiceNum.value = '';
  if (DOM.clientMasterInputClosingDay) DOM.clientMasterInputClosingDay.value = '';
  if (DOM.clientMasterInputPaymentTerms) DOM.clientMasterInputPaymentTerms.value = '';
  if (DOM.clientMasterInputNote) DOM.clientMasterInputNote.value = '';
  if (DOM.btnSaveClientMasterForm) DOM.btnSaveClientMasterForm.textContent = 'マスタに保存';
  toggleNewClientForm(false);
}

function handleSaveClientMaster() {
  console.log("【マスタ保存実行】ボタンクリック検知", { timestamp: new Date().toISOString() });
  const name = DOM.clientMasterInputName ? DOM.clientMasterInputName.value.trim() : '';
  if (!name) {
    alert('取引先 会社名 / 屋号を入力してください。');
    if (DOM.clientMasterInputName) DOM.clientMasterInputName.focus();
    return;
  }

  const clientData = {
    id: DOM.clientMasterEditId ? DOM.clientMasterEditId.value || undefined : undefined,
    name,
    honorific: DOM.clientMasterInputHonorific ? DOM.clientMasterInputHonorific.value : '御中',
    category: DOM.clientMasterSelectCategory ? DOM.clientMasterSelectCategory.value : 'customer',
    zip: DOM.clientMasterInputZip ? DOM.clientMasterInputZip.value.trim() : '',
    address: DOM.clientMasterInputAddress ? DOM.clientMasterInputAddress.value.trim() : '',
    contactPerson: DOM.clientMasterInputContact ? DOM.clientMasterInputContact.value.trim() : '',
    tel: DOM.clientMasterInputTel ? DOM.clientMasterInputTel.value.trim() : '',
    email: DOM.clientMasterInputEmail ? DOM.clientMasterInputEmail.value.trim() : '',
    invoiceNumber: DOM.clientMasterInputInvoiceNum ? DOM.clientMasterInputInvoiceNum.value.trim() : '',
    closingDay: DOM.clientMasterInputClosingDay ? DOM.clientMasterInputClosingDay.value.trim() : '',
    paymentTerms: DOM.clientMasterInputPaymentTerms ? DOM.clientMasterInputPaymentTerms.value.trim() : '',
    note: DOM.clientMasterInputNote ? DOM.clientMasterInputNote.value.trim() : ''
  };

  saveClientToMaster(clientData);
  resetClientMasterForm();
  renderClientMasterList(currentClientFilter, DOM.inputSearchClientMaster ? DOM.inputSearchClientMaster.value : '');
  updateClientMasterDatalist();
  showToast(`取引先「${name}」をマスタに保存しました！`, 'success');
}

function renderClientMasterList(filter = 'all', searchQuery = '') {
  if (!DOM.clientMasterListContainer) return;
  const allClients = getClientMasterList(true);
  const q = (searchQuery || '').trim().toLowerCase();

  let filtered = allClients;
  if (filter === 'customer') {
    filtered = filtered.filter(c => c.category === 'customer' || c.category === 'both');
  } else if (filter === 'vendor') {
    filtered = filtered.filter(c => c.category === 'vendor' || c.category === 'both');
  }

  if (q) {
    filtered = filtered.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.invoiceNumber && c.invoiceNumber.toLowerCase().includes(q)) ||
      (c.note && c.note.toLowerCase().includes(q))
    );
  }

  DOM.clientMasterListContainer.innerHTML = '';

  if (filtered.length === 0) {
    DOM.clientMasterListContainer.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-muted); font-size: 0.85rem;">
        ${q ? '検索条件に一致する取引先は見つかりませんでした。' : '登録された取引先がありません。「新規取引先を登録」から追加してください。'}
      </div>
    `;
    return;
  }

  const usageMap = getClientMasterUsageMap();

  filtered.forEach(client => {
    const card = document.createElement('div');
    card.className = 'master-client-card';
    card.style.cssText = `
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    `;

    const totalUsage = (Number(client.usageCount) || 0) + (usageMap[(client.name || '').trim()] || 0);
    
    // 区分バッジ
    let catBadge = '';
    if (client.category === 'vendor') {
      catBadge = `<span style="font-size: 11px; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 4px;">仕入・支払先</span>`;
    } else if (client.category === 'both') {
      catBadge = `<span style="font-size: 11px; font-weight: 700; background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px;">得意先・仕入先</span>`;
    } else {
      catBadge = `<span style="font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 4px;">得意先 (売上)</span>`;
    }

    const invoiceBadge = client.invoiceNumber
      ? `<span style="font-size: 11px; font-family: monospace; background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: 600;">🏷️ ${escapeHtml(client.invoiceNumber)}</span>`
      : '';

    card.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
          <strong style="font-size: 1rem; color: #1e293b;">${escapeHtml(client.name)}</strong>
          <span style="font-size: 0.85rem; color: #64748b;">${escapeHtml(client.honorific || '御中')}</span>
          ${catBadge}
          ${invoiceBadge}
          <span style="font-size: 11px; color: #94a3b8; margin-left: auto;">実績: ${totalUsage}回</span>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.775rem; color: #64748b; line-height: 1.5;">
          ${client.zip || client.address ? `<span>📍 ${escapeHtml(client.zip ? `〒${client.zip} ` : '')}${escapeHtml(client.address || '')}</span>` : ''}
          ${client.contactPerson ? `<span>👤 担当: ${escapeHtml(client.contactPerson)}</span>` : ''}
          ${client.tel ? `<span>📞 ${escapeHtml(client.tel)}</span>` : ''}
          ${client.email ? `<span>✉️ ${escapeHtml(client.email)}</span>` : ''}
          ${client.closingDay || client.paymentTerms ? `<span style="color: #0284c7;">⏱ ${escapeHtml(client.closingDay ? `${client.closingDay}締` : '')}${escapeHtml(client.paymentTerms ? ` / ${client.paymentTerms}` : '')}</span>` : ''}
        </div>

        ${client.note ? `<div style="font-size: 0.725rem; color: #94a3b8; margin-top: 4px; border-left: 2px solid #cbd5e1; padding-left: 6px;">${escapeHtml(client.note)}</div>` : ''}
      </div>

      <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0;">
        <button type="button" class="btn btn-primary btn-sm btn-apply-client" style="padding: 4px 12px; font-size: 0.775rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;" title="この取引先を書類の宛先に反映">
          📄 伝票に反映
        </button>
        <div style="display: flex; gap: 4px;">
          <button type="button" class="btn btn-outline btn-xs btn-edit-client" style="font-size: 0.7rem; padding: 2px 8px;">編集</button>
          <button type="button" class="btn btn-outline btn-xs btn-danger btn-delete-client" style="font-size: 0.7rem; padding: 2px 8px;">削除</button>
        </div>
      </div>
    `;

    // 伝票へ反映
    card.querySelector('.btn-apply-client').addEventListener('click', () => {
      applyClientToDocument(client);
    });

    // 編集
    card.querySelector('.btn-edit-client').addEventListener('click', () => {
      editClientMaster(client);
    });

    // 削除
    card.querySelector('.btn-delete-client').addEventListener('click', () => {
      deleteClientMaster(client.id, client.name);
    });

    DOM.clientMasterListContainer.appendChild(card);
  });
}

function applyClientToDocument(client) {
  if (!client) return;

  // 帳票オブジェクトに反映
  currentDoc.client.name = client.name || '';
  currentDoc.client.honorific = client.honorific !== undefined ? client.honorific : '御中';
  currentDoc.client.zip = client.zip || '';
  currentDoc.client.address = client.address || '';
  currentDoc.client.contactPerson = client.contactPerson || '';

  // 入力フォームに反映
  if (DOM.inputClientName) DOM.inputClientName.value = client.name || '';
  if (DOM.inputClientHonorific) DOM.inputClientHonorific.value = client.honorific !== undefined ? client.honorific : '御中';
  if (DOM.inputClientZip) DOM.inputClientZip.value = client.zip || '';
  if (DOM.inputClientAddress) DOM.inputClientAddress.value = client.address || '';
  if (DOM.inputClientContact) DOM.inputClientContact.value = client.contactPerson || '';

  // 支払条件などの補足
  if (client.paymentTerms && !currentDoc.paymentTerms) {
    currentDoc.paymentTerms = client.paymentTerms;
    if (DOM.inputPaymentTerms) DOM.inputPaymentTerms.value = client.paymentTerms;
  }

  // 使用回数の記録
  recordClientMasterUsage(client.id, client.name);

  // プレビューと帳票状態を更新
  renderAll();
  saveActiveDoc(currentDoc);

  closeClientMasterModal();
  showToast(`取引先「${client.name}」を伝票宛先に反映しました！`, 'success');
}

function editClientMaster(client) {
  if (!client) return;
  toggleNewClientForm(true);

  if (DOM.clientMasterEditId) DOM.clientMasterEditId.value = client.id;
  if (DOM.clientMasterFormTitle) DOM.clientMasterFormTitle.textContent = `取引先の編集: ${client.name}`;
  if (DOM.clientMasterInputName) DOM.clientMasterInputName.value = client.name || '';
  if (DOM.clientMasterInputHonorific) DOM.clientMasterInputHonorific.value = client.honorific !== undefined ? client.honorific : '御中';
  if (DOM.clientMasterSelectCategory) DOM.clientMasterSelectCategory.value = client.category || 'customer';
  if (DOM.clientMasterInputZip) DOM.clientMasterInputZip.value = client.zip || '';
  if (DOM.clientMasterInputAddress) DOM.clientMasterInputAddress.value = client.address || '';
  if (DOM.clientMasterInputContact) DOM.clientMasterInputContact.value = client.contactPerson || '';
  if (DOM.clientMasterInputTel) DOM.clientMasterInputTel.value = client.tel || '';
  if (DOM.clientMasterInputEmail) DOM.clientMasterInputEmail.value = client.email || '';
  if (DOM.clientMasterInputInvoiceNum) DOM.clientMasterInputInvoiceNum.value = client.invoiceNumber || '';
  if (DOM.clientMasterInputClosingDay) DOM.clientMasterInputClosingDay.value = client.closingDay || '';
  if (DOM.clientMasterInputPaymentTerms) DOM.clientMasterInputPaymentTerms.value = client.paymentTerms || '';
  if (DOM.clientMasterInputNote) DOM.clientMasterInputNote.value = client.note || '';
  if (DOM.btnSaveClientMasterForm) DOM.btnSaveClientMasterForm.textContent = '更新内容を保存';

  DOM.clientMasterFormContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function deleteClientMaster(id, name) {
  if (confirm(`取引先「${name}」をマスタから削除しますか？\n（過去に作成した書類や経費データには影響しません）`)) {
    deleteClientFromMaster(id);
    renderClientMasterList(currentClientFilter, DOM.inputSearchClientMaster ? DOM.inputSearchClientMaster.value : '');
    updateClientMasterDatalist();
    showToast(`取引先「${name}」をマスタから削除しました`);
  }
}

/**
 * 書類入力欄のdatalistを更新
 */
function updateClientMasterDatalist() {
  if (!DOM.clientMasterDatalist) return;
  const clients = getClientMasterList(true);
  DOM.clientMasterDatalist.innerHTML = clients
    .map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.address ? ` (${c.address})` : '')}</option>`)
    .join('');
}

/**
 * 会社名手入力時のマスタ自動補完
 */
function handleClientNameAutocomplete() {
  const inputVal = DOM.inputClientName ? DOM.inputClientName.value.trim() : '';
  if (!inputVal) return;

  const matched = findClientByName(inputVal);
  if (matched && matched.name.toLowerCase() === inputVal.toLowerCase()) {
    // 一致した場合、他のフィールドを自動補完
    if (matched.honorific !== undefined) {
      DOM.inputClientHonorific.value = matched.honorific;
      currentDoc.client.honorific = matched.honorific;
    }
    if (matched.zip) {
      DOM.inputClientZip.value = matched.zip;
      currentDoc.client.zip = matched.zip;
    }
    if (matched.address) {
      DOM.inputClientAddress.value = matched.address;
      currentDoc.client.address = matched.address;
    }
    if (matched.contactPerson) {
      DOM.inputClientContact.value = matched.contactPerson;
      currentDoc.client.contactPerson = matched.contactPerson;
    }
    recordClientMasterUsage(matched.id, matched.name);
    renderAll();
    saveActiveDoc(currentDoc);
    showToast(`取引先マスタから「${matched.name}」の情報を自動反映しました`, 'info');
  }
}

// ==========================================================================
// 在庫マスタ ＆ 入出庫台帳 コントローラー
// ==========================================================================

let currentInventoryFilter = 'all';

function openInventoryMasterModal() {
  if (!DOM.inventoryMasterModal) return;
  DOM.inventoryMasterModal.classList.add('active');
  DOM.inventoryMasterModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  resetInventoryForm();
  renderInventoryTable();
}

function closeInventoryMasterModal() {
  if (!DOM.inventoryMasterModal) return;
  DOM.inventoryMasterModal.classList.remove('active');
  DOM.inventoryMasterModal.style.display = 'none';
  document.body.style.overflow = '';
}

function resetInventoryForm() {
  if (!DOM.inventoryFormContainer) return;
  DOM.inventoryFormContainer.style.display = 'none';
  if (DOM.inventoryEditId) DOM.inventoryEditId.value = '';
  if (DOM.inventoryItemId) DOM.inventoryItemId.value = '';
  if (DOM.invInputName) DOM.invInputName.value = '';
  if (DOM.invInputSku) DOM.invInputSku.value = '';
  if (DOM.invInputCurrentStock) DOM.invInputCurrentStock.value = '0';
  if (DOM.invInputSafetyStock) DOM.invInputSafetyStock.value = '5';
  if (DOM.invInputUnit) DOM.invInputUnit.value = '個';
  if (DOM.invInputUnitCost) DOM.invInputUnitCost.value = '';
  if (DOM.invInputUnitPrice) DOM.invInputUnitPrice.value = '';
  if (DOM.invInputLocation) DOM.invInputLocation.value = '';
  if (DOM.invInputNote) DOM.invInputNote.value = '';
  if (DOM.inventoryFormTitle) DOM.inventoryFormTitle.textContent = '新規在庫品目の登録';
  if (DOM.btnSaveInventoryItem) DOM.btnSaveInventoryItem.textContent = '在庫品目を保存';
}

function toggleInventoryForm(isEdit = false, item = null) {
  if (!DOM.inventoryFormContainer) return;
  const isHidden = DOM.inventoryFormContainer.style.display === 'none';
  if (!isEdit && !isHidden) {
    resetInventoryForm();
    return;
  }

  DOM.inventoryFormContainer.style.display = 'block';

  if (isEdit && item) {
    if (DOM.inventoryFormTitle) DOM.inventoryFormTitle.textContent = `在庫品目の編集: ${item.name}`;
    if (DOM.inventoryEditId) DOM.inventoryEditId.value = item.id;
    if (DOM.inventoryItemId) DOM.inventoryItemId.value = item.itemId || '';
    if (DOM.invInputName) DOM.invInputName.value = item.name || '';
    if (DOM.invInputSku) DOM.invInputSku.value = item.sku || '';
    if (DOM.invInputCurrentStock) DOM.invInputCurrentStock.value = item.currentStock !== undefined ? item.currentStock : 0;
    if (DOM.invInputSafetyStock) DOM.invInputSafetyStock.value = item.safetyStock !== undefined ? item.safetyStock : 5;
    if (DOM.invInputUnit) DOM.invInputUnit.value = item.unit || '個';
    if (DOM.invInputUnitCost) DOM.invInputUnitCost.value = item.unitCost || '';
    if (DOM.invInputUnitPrice) DOM.invInputUnitPrice.value = item.unitPrice || '';
    if (DOM.invInputLocation) DOM.invInputLocation.value = item.location || '';
    if (DOM.invInputNote) DOM.invInputNote.value = item.note || '';
    if (DOM.btnSaveInventoryItem) DOM.btnSaveInventoryItem.textContent = '変更内容を更新';
  } else {
    resetInventoryForm();
    DOM.inventoryFormContainer.style.display = 'block';
  }
}

function saveInventoryItemHandler() {
  const name = DOM.invInputName ? DOM.invInputName.value.trim() : '';
  if (!name) {
    alert('品名を入力してください。');
    if (DOM.invInputName) DOM.invInputName.focus();
    return;
  }

  const currentStock = DOM.invInputCurrentStock ? Math.max(0, parseInt(DOM.invInputCurrentStock.value, 10) || 0) : 0;
  const safetyStock = DOM.invInputSafetyStock ? Math.max(0, parseInt(DOM.invInputSafetyStock.value, 10) || 0) : 0;
  const unit = DOM.invInputUnit ? DOM.invInputUnit.value.trim() || '個' : '個';
  const unitCost = DOM.invInputUnitCost ? Math.max(0, parseInt(DOM.invInputUnitCost.value, 10) || 0) : 0;
  const unitPrice = DOM.invInputUnitPrice ? Math.max(0, parseInt(DOM.invInputUnitPrice.value, 10) || 0) : 0;
  const sku = DOM.invInputSku ? DOM.invInputSku.value.trim() : '';
  const location = DOM.invInputLocation ? DOM.invInputLocation.value.trim() : '';
  const note = DOM.invInputNote ? DOM.invInputNote.value.trim() : '';
  const editId = DOM.inventoryEditId ? DOM.inventoryEditId.value : '';
  const itemId = DOM.inventoryItemId ? DOM.inventoryItemId.value : '';

  // 新規登録時は商品マスタにも自動保存して連動
  if (!editId) {
    const allProducts = getItemMasterList(false);
    const existingProd = allProducts.find(p => p.name.trim() === name);
    if (!existingProd) {
      const newProd = saveItemToMaster({
        name,
        sku,
        unit,
        unitPrice: unitCost > 0 ? unitCost : unitPrice,
        userPrice: unitPrice > 0 ? unitPrice : Math.round(unitCost * 1.3),
        note: note || '在庫マスタから登録'
      });
      renderItemMasterList();
    }
  }

  const itemData = {
    id: editId || undefined,
    itemId: itemId || undefined,
    name,
    sku,
    currentStock,
    safetyStock,
    unit,
    unitCost,
    unitPrice,
    location,
    note
  };

  const saved = saveInventoryItem(itemData);
  if (saved) {
    showToast(`品目「${name}」を商品マスタおよび在庫台帳に保存しました！`, 'success');
    resetInventoryForm();
    renderInventoryTable();
    populateExpenseInventoryDropdown();
  }
}

function renderInventoryTable() {
  if (!DOM.inventoryTableContainer) return;
  const list = getInventoryList();
  const q = DOM.inputSearchInventory ? DOM.inputSearchInventory.value.trim().toLowerCase() : '';
  const filter = DOM.selectInventoryFilter ? DOM.selectInventoryFilter.value : currentInventoryFilter;

  let filtered = list;
  if (q) {
    filtered = filtered.filter(item => 
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.location && item.location.toLowerCase().includes(q)) ||
      (item.note && item.note.toLowerCase().includes(q))
    );
  }

  let lowCount = 0;
  list.forEach(i => {
    if (i.currentStock <= i.safetyStock) lowCount++;
  });

  if (filter === 'low') {
    filtered = filtered.filter(i => i.currentStock <= i.safetyStock);
  } else if (filter === 'zero') {
    filtered = filtered.filter(i => i.currentStock <= 0);
  }

  if (DOM.inventorySummaryStatus) {
    DOM.inventorySummaryStatus.textContent = `在庫品目総数: ${list.length}件 (⚠️ 安全在庫割れアラート: ${lowCount}件)`;
  }

  if (filtered.length === 0) {
    DOM.inventoryTableContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: #64748b; font-size: 0.85rem;">
        ${q ? '該当する在庫品目が見つかりませんでした。' : '在庫品目が登録されていません。「＋ 新規在庫品目を追加」から登録してください。'}
      </div>
    `;
    return;
  }

  let html = `
    <table class="inv-table">
      <thead>
        <tr>
          <th style="min-width: 180px;">品名 / SKU</th>
          <th style="text-align: right; min-width: 90px;">現在庫</th>
          <th style="min-width: 80px; text-align: center;">状態</th>
          <th style="min-width: 50px;">単位</th>
          <th style="text-align: right; min-width: 90px;">仕入原価</th>
          <th style="min-width: 100px;">保管場所</th>
          <th style="min-width: 90px;">最終入庫</th>
          <th style="text-align: center; min-width: 190px;">入出庫・操作</th>
        </tr>
      </thead>
      <tbody>
  `;

  filtered.forEach(item => {
    const isZero = item.currentStock <= 0;
    const isLow = !isZero && item.currentStock <= item.safetyStock;

    let statusBadge = '<span class="stock-val-pill stock-safe">正常</span>';
    if (isZero) {
      statusBadge = '<span class="stock-val-pill stock-danger">❌ 在庫切</span>';
    } else if (isLow) {
      statusBadge = '<span class="stock-val-pill stock-warn">⚠️ 僅少</span>';
    }

    const formattedCost = item.unitCost ? `¥${Number(item.unitCost).toLocaleString()}` : '-';
    const skuDisp = item.sku ? `<span style="font-size: 0.725rem; color: #64748b; font-family: monospace; display: block;">SKU: ${escapeHtml(item.sku)}</span>` : '';

    html += `
      <tr data-id="${item.id}">
        <td>
          <div style="font-weight: 600; color: #0f172a;">${escapeHtml(item.name)}</div>
          ${skuDisp}
        </td>
        <td style="text-align: right;">
          <span style="font-size: 1.05rem; font-weight: 700; color: ${isZero ? '#dc2626' : (isLow ? '#d97706' : '#059669')};">
            ${Number(item.currentStock).toLocaleString()}
          </span>
          <span style="font-size: 0.725rem; color: #64748b; display: block;">適正: ${Number(item.safetyStock).toLocaleString()}</span>
        </td>
        <td style="text-align: center;">${statusBadge}</td>
        <td>${escapeHtml(item.unit || '個')}</td>
        <td style="text-align: right; font-family: monospace;">${formattedCost}</td>
        <td><span style="font-size: 0.8rem; color: #475569;">${escapeHtml(item.location || '-')}</span></td>
        <td style="font-size: 0.75rem; color: #64748b;">${escapeHtml(item.lastInDate || '-')}</td>
        <td style="text-align: center;">
          <div class="inv-action-btn-group" style="justify-content: center;">
            <button type="button" class="btn-inv-action btn-inv-in" onclick="window.invOpenAdjust('${item.id}', 'in')" title="仕入・受入 入庫">
              ➕入庫
            </button>
            <button type="button" class="btn-inv-action btn-inv-out" onclick="window.invOpenAdjust('${item.id}', 'out')" title="納品・使用 出庫">
              ➖出庫
            </button>
            <button type="button" class="btn-inv-action" onclick="window.invOpenAdjust('${item.id}', 'set')" title="実地棚卸による実数設定">
              📝棚卸
            </button>
            <button type="button" class="btn-inv-action" onclick="window.invOpenHistory('${item.id}')" title="入出庫履歴ログの閲覧">
              📜履歴
            </button>
            <button type="button" class="btn-inv-action" onclick="window.invEditItem('${item.id}')" title="品目情報の編集">
              ✏️
            </button>
            <button type="button" class="btn-inv-action" style="color: #dc2626;" onclick="window.invDeleteItem('${item.id}', '${escapeHtml(item.name)}')" title="品目の削除">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  DOM.inventoryTableContainer.innerHTML = html;
}

window.invOpenAdjust = function(id, defaultType = 'in') {
  const list = getInventoryList();
  const item = list.find(i => i.id === id || i.itemId === id);
  if (!item) return;
  openInventoryAdjustModal(item, defaultType);
};

window.invOpenHistory = function(id) {
  const list = getInventoryList();
  const item = list.find(i => i.id === id || i.itemId === id);
  if (!item) return;
  openInventoryHistoryModal(item);
};

window.invEditItem = function(id) {
  const list = getInventoryList();
  const item = list.find(i => i.id === id || i.itemId === id);
  if (!item) return;
  toggleInventoryForm(true, item);
  if (DOM.inventoryFormContainer) {
    DOM.inventoryFormContainer.scrollIntoView({ behavior: 'smooth' });
  }
};

window.invDeleteItem = function(id, name) {
  if (confirm(`在庫品目「${name}」を削除しますか？\n（過去の伝票や経費データには影響しません）`)) {
    deleteInventoryItem(id);
    renderInventoryTable();
    populateExpenseInventoryDropdown();
    showToast(`在庫品目「${name}」を削除しました。`);
  }
};

let currentAdjustItem = null;

function openInventoryAdjustModal(item, actionType = 'in') {
  if (!DOM.inventoryAdjustModal) return;
  currentAdjustItem = item;
  DOM.adjustInventoryId.value = item.id;
  DOM.adjustModalItemName.textContent = `入出庫調整: ${item.name}`;
  DOM.adjustCurrentStockVal.textContent = Number(item.currentStock).toLocaleString();
  DOM.adjustCurrentStockUnit.textContent = item.unit || '個';
  DOM.adjustInputQty.value = '1';
  DOM.adjustInputReason.value = actionType === 'in' ? '仕入受入' : (actionType === 'out' ? '出荷納品' : '実地棚卸差異調整');

  const radios = document.getElementsByName('adjustActionType');
  radios.forEach(r => {
    r.checked = (r.value === actionType);
  });

  updateAdjustSimulation();
  DOM.inventoryAdjustModal.classList.add('active');
  DOM.inventoryAdjustModal.style.display = 'flex';
}

function closeInventoryAdjustModal() {
  if (!DOM.inventoryAdjustModal) return;
  DOM.inventoryAdjustModal.classList.remove('active');
  DOM.inventoryAdjustModal.style.display = 'none';
  currentAdjustItem = null;
}

function updateAdjustSimulation() {
  if (!currentAdjustItem) return;
  const current = Number(currentAdjustItem.currentStock) || 0;
  const qty = parseInt(DOM.adjustInputQty.value, 10) || 0;
  const radios = document.getElementsByName('adjustActionType');
  let type = 'in';
  radios.forEach(r => { if (r.checked) type = r.value; });

  let simulated = current;
  if (type === 'in') {
    simulated = current + qty;
    if (DOM.labelAdjustQtyTitle) DOM.labelAdjustQtyTitle.textContent = '入庫数量 *';
  } else if (type === 'out') {
    simulated = Math.max(0, current - qty);
    if (DOM.labelAdjustQtyTitle) DOM.labelAdjustQtyTitle.textContent = '出庫数量 *';
  } else {
    simulated = Math.max(0, qty);
    if (DOM.labelAdjustQtyTitle) DOM.labelAdjustQtyTitle.textContent = '実地棚卸実数 *';
  }

  if (DOM.adjustSimulatedStockVal) {
    const diff = simulated - current;
    const diffText = diff >= 0 ? `+${diff}` : `${diff}`;
    DOM.adjustSimulatedStockVal.textContent = `${simulated.toLocaleString()} ${currentAdjustItem.unit || '個'} (${diffText})`;
  }
}

function confirmAdjustHandler() {
  if (!currentAdjustItem) return;
  const id = DOM.adjustInventoryId.value;
  const qty = parseInt(DOM.adjustInputQty.value, 10) || 0;
  if (qty <= 0) {
    alert('有効な数量（1以上）を入力してください。');
    return;
  }

  const radios = document.getElementsByName('adjustActionType');
  let type = 'in';
  radios.forEach(r => { if (r.checked) type = r.value; });

  const reason = (DOM.adjustInputReason ? DOM.adjustInputReason.value.trim() : '') || (type === 'in' ? '入庫' : (type === 'out' ? '出庫' : '棚卸調整'));

  let delta = qty;
  let isDirectSet = false;
  if (type === 'out') {
    delta = -qty;
  } else if (type === 'set') {
    delta = qty;
    isDirectSet = true;
  }

  const result = adjustStock(id, delta, reason, {}, isDirectSet);
  if (result) {
    showToast(`在庫を更新しました（現在庫: ${result.item.currentStock} ${result.item.unit || '個'}）`, 'success');
    closeInventoryAdjustModal();
    renderInventoryTable();
    populateExpenseInventoryDropdown();
  }
}

function openInventoryHistoryModal(item) {
  if (!DOM.inventoryHistoryModal) return;
  DOM.historyModalItemName.textContent = `入出庫履歴: ${item.name}`;
  DOM.historyModalItemSku.textContent = item.sku ? `SKU: ${item.sku} | 保管場所: ${item.location || '未設定'}` : '';

  const logs = Array.isArray(item.history) ? item.history : [];
  if (logs.length === 0) {
    DOM.inventoryHistoryTableContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #64748b;">入出庫の記録はありません。</div>
    `;
  } else {
    let html = `
      <table class="inv-table" style="font-size: 0.8rem;">
        <thead>
          <tr>
            <th>処理日</th>
            <th>種別</th>
            <th style="text-align: right;">変動数量</th>
            <th style="text-align: right;">処理後在庫</th>
            <th>理由 / 摘要</th>
            <th>取引先 / 相手先</th>
          </tr>
        </thead>
        <tbody>
    `;

    logs.forEach(log => {
      let typeBadge = '';
      if (log.type === 'in') {
        typeBadge = '<span style="color: #059669; font-weight: 700; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">➕ 入庫</span>';
      } else if (log.type === 'out') {
        typeBadge = '<span style="color: #ea580c; font-weight: 700; background: #fff7ed; padding: 2px 6px; border-radius: 4px;">➖ 出庫</span>';
      } else {
        typeBadge = '<span style="color: #475569; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">📝 調整</span>';
      }

      const deltaDisp = log.delta !== undefined ? (log.delta >= 0 ? `+${log.delta}` : `${log.delta}`) : (log.type === 'out' ? `-${log.qty}` : `+${log.qty}`);

      html += `
        <tr>
          <td style="white-space: nowrap;">${escapeHtml(log.date || '-')}</td>
          <td>${typeBadge}</td>
          <td style="text-align: right; font-weight: 700;">${deltaDisp}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a;">${Number(log.currentStock).toLocaleString()}</td>
          <td>${escapeHtml(log.reason || '-')}</td>
          <td>${escapeHtml(log.payee || log.sourceRef || '-')}</td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    DOM.inventoryHistoryTableContainer.innerHTML = html;
  }

  DOM.inventoryHistoryModal.classList.add('active');
  DOM.inventoryHistoryModal.style.display = 'flex';
}

function closeInventoryHistoryModal() {
  if (!DOM.inventoryHistoryModal) return;
  DOM.inventoryHistoryModal.classList.remove('active');
  DOM.inventoryHistoryModal.style.display = 'none';
}

// ==========================================================================
// クイック新規品目モーダル（商品マスタ＆在庫マスタ同時自動登録）
// ==========================================================================
function openQuickNewItemModal(suggestName = '', suggestCost = 0) {
  if (!DOM.quickNewItemModal) return;
  if (DOM.quickInputItemName) DOM.quickInputItemName.value = suggestName;
  if (DOM.quickInputItemSku) DOM.quickInputItemSku.value = '';
  if (DOM.quickInputItemUnit) DOM.quickInputItemUnit.value = '個';
  if (DOM.quickInputItemUnitCost) DOM.quickInputItemUnitCost.value = suggestCost ? String(suggestCost) : '';
  if (DOM.quickInputItemUnitPrice) DOM.quickInputItemUnitPrice.value = suggestCost ? String(Math.round(suggestCost * 1.3)) : '';
  if (DOM.quickInputItemSafetyStock) DOM.quickInputItemSafetyStock.value = '5';
  if (DOM.quickInputItemNote) DOM.quickInputItemNote.value = '';
  
  DOM.quickNewItemModal.classList.add('active');
  DOM.quickNewItemModal.style.display = 'flex';
  if (DOM.quickInputItemName) {
    setTimeout(() => DOM.quickInputItemName.focus(), 50);
  }
}

function closeQuickNewItemModal() {
  if (!DOM.quickNewItemModal) return;
  DOM.quickNewItemModal.classList.remove('active');
  DOM.quickNewItemModal.style.display = 'none';
}

function confirmQuickNewItemHandler() {
  const name = DOM.quickInputItemName ? DOM.quickInputItemName.value.trim() : '';
  if (!name) {
    alert('品名を入力してください。');
    if (DOM.quickInputItemName) DOM.quickInputItemName.focus();
    return;
  }

  const sku = DOM.quickInputItemSku ? DOM.quickInputItemSku.value.trim() : '';
  const unit = DOM.quickInputItemUnit ? DOM.quickInputItemUnit.value.trim() || '個' : '個';
  const unitCost = DOM.quickInputItemUnitCost ? Math.max(0, parseInt(DOM.quickInputItemUnitCost.value, 10) || 0) : 0;
  const unitPrice = DOM.quickInputItemUnitPrice ? Math.max(0, parseInt(DOM.quickInputItemUnitPrice.value, 10) || 0) : 0;
  const safetyStock = DOM.quickInputItemSafetyStock ? Math.max(0, parseInt(DOM.quickInputItemSafetyStock.value, 10) || 0) : 5;
  const note = DOM.quickInputItemNote ? DOM.quickInputItemNote.value.trim() : '';

  const result = saveNewProductAndInventory({
    name,
    sku,
    unit,
    unitCost,
    unitPrice,
    initialStock: 0,
    safetyStock,
    note
  });

  if (result) {
    closeQuickNewItemModal();
    renderItemMasterList();
    renderInventoryTable();
    populateExpenseInventoryDropdown(result.product.id);
    showToast(`品目「${name}」を商品マスタおよび在庫台帳に登録しました！`, 'success');
  }
}

// ==========================================================================
// 経費・仕入切り替え ＆ 在庫連動 コントローラー
// ==========================================================================

function initExpensePurchaseToggle() {
  if (!DOM.radioExpenseTypeExpense || !DOM.radioExpenseTypePurchase) return;

  DOM.radioExpenseTypeExpense.addEventListener('change', () => {
    switchExpenseEntryType('expense');
  });

  DOM.radioExpenseTypePurchase.addEventListener('change', () => {
    switchExpenseEntryType('purchase');
  });

  if (DOM.labelExpenseTypeExpense) {
    DOM.labelExpenseTypeExpense.addEventListener('click', () => {
      DOM.radioExpenseTypeExpense.checked = true;
      switchExpenseEntryType('expense');
    });
  }

  if (DOM.labelExpenseTypePurchase) {
    DOM.labelExpenseTypePurchase.addEventListener('click', () => {
      DOM.radioExpenseTypePurchase.checked = true;
      switchExpenseEntryType('purchase');
    });
  }

  if (DOM.expenseSelectInventoryItem) {
    DOM.expenseSelectInventoryItem.addEventListener('change', () => {
      updateExpenseStockPreview();
    });
  }

  if (DOM.expenseInputInQty) {
    DOM.expenseInputInQty.addEventListener('input', () => {
      updateExpenseStockPreview();
    });
  }

  if (DOM.expenseInputPayee) {
    DOM.expenseInputPayee.addEventListener('input', () => {
      checkAndSuggestInventoryMatch();
    });
  }
  if (DOM.expenseInputNote) {
    DOM.expenseInputNote.addEventListener('input', () => {
      checkAndSuggestInventoryMatch();
    });
  }

  // 「＋新規品目」ボタン（仕入画面から直接商品マスタ＆在庫へ同時登録）
  if (DOM.btnQuickCreateInventory) {
    DOM.btnQuickCreateInventory.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const suggestName = (DOM.expenseInputNote?.value || DOM.expenseInputPayee?.value || '').trim();
      let suggestCost = 0;
      if (DOM.expenseInputAmount) {
        const amt = parseInt(DOM.expenseInputAmount.value, 10) || 0;
        const qty = parseInt(DOM.expenseInputInQty?.value, 10) || 1;
        suggestCost = Math.round(amt / qty);
      }
      openQuickNewItemModal(suggestName, suggestCost);
    });
  }

  // クイック新規品目モーダル制御
  if (DOM.btnCloseQuickNewItemModal) {
    DOM.btnCloseQuickNewItemModal.addEventListener('click', closeQuickNewItemModal);
  }
  if (DOM.btnCancelQuickNewItem) {
    DOM.btnCancelQuickNewItem.addEventListener('click', closeQuickNewItemModal);
  }
  if (DOM.btnConfirmQuickNewItem) {
    DOM.btnConfirmQuickNewItem.addEventListener('click', confirmQuickNewItemHandler);
  }
  if (DOM.quickNewItemModal) {
    DOM.quickNewItemModal.addEventListener('click', (e) => {
      if (e.target === DOM.quickNewItemModal) closeQuickNewItemModal();
    });
  }
}

function switchExpenseEntryType(type) {
  const isPurchase = (type === 'purchase');

  if (DOM.radioExpenseTypeExpense) DOM.radioExpenseTypeExpense.checked = !isPurchase;
  if (DOM.radioExpenseTypePurchase) DOM.radioExpenseTypePurchase.checked = isPurchase;

  if (DOM.labelExpenseTypeExpense) {
    if (!isPurchase) DOM.labelExpenseTypeExpense.classList.add('active');
    else DOM.labelExpenseTypeExpense.classList.remove('active');
  }
  if (DOM.labelExpenseTypePurchase) {
    if (isPurchase) DOM.labelExpenseTypePurchase.classList.add('active');
    else DOM.labelExpenseTypePurchase.classList.remove('active');
  }

  if (DOM.expenseInventoryPanel) {
    DOM.expenseInventoryPanel.style.display = isPurchase ? 'block' : 'none';
  }

  if (DOM.btnSaveExpense) {
    DOM.btnSaveExpense.textContent = isPurchase ? '📦 仕入れ＆在庫入庫を確定' : '💼 経費として登録';
  }

  if (isPurchase) {
    if (DOM.expenseSelectCategory) {
      DOM.expenseSelectCategory.value = '仕入高';
    }
    // 商品マスタを参照してドロップダウンを生成
    populateExpenseInventoryDropdown();
    checkAndSuggestInventoryMatch();
  }
}

/**
 * 経費仕入れ画面の入庫対象在庫ドロップダウン
 * ユーザー指定要件：「入庫対象の在庫品目は商品マスタを参照して下さい」
 */
function populateExpenseInventoryDropdown(selectedId = '') {
  if (!DOM.expenseSelectInventoryItem) return;
  // 商品マスタ（itemMaster）を直接参照
  const products = getItemMasterList(true);
  const invList = getInventoryList();

  let html = '<option value="">-- 商品マスタから選択してください --</option>';
  products.forEach(prod => {
    // 該当商品の現在庫数を検索
    const inv = invList.find(i => i.itemId === prod.id || (i.name && i.name.trim() === prod.name.trim()));
    const stock = inv ? Number(inv.currentStock) || 0 : 0;
    const unit = (inv && inv.unit) || prod.unit || '個';
    const isSelected = selectedId && (prod.id === selectedId || (inv && inv.id === selectedId));
    html += `<option value="${prod.id}" ${isSelected ? 'selected' : ''}>📦 ${escapeHtml(prod.name)} (現在庫: ${stock}${unit})</option>`;
  });

  DOM.expenseSelectInventoryItem.innerHTML = html;
  updateExpenseStockPreview();
}

function checkAndSuggestInventoryMatch() {
  if (!DOM.radioExpenseTypePurchase || !DOM.radioExpenseTypePurchase.checked) return;

  const payee = DOM.expenseInputPayee ? DOM.expenseInputPayee.value.trim() : '';
  const note = DOM.expenseInputNote ? DOM.expenseInputNote.value.trim() : '';
  const searchTarget = payee || note;

  if (DOM.expenseDispRawPayee) {
    DOM.expenseDispRawPayee.textContent = searchTarget || '店名・品名未入力';
  }

  if (!searchTarget) {
    if (DOM.expensePurchaseMatchBadge) DOM.expensePurchaseMatchBadge.style.display = 'none';
    return;
  }

  let matched = findInventoryMatchForPurchase(note);
  if (!matched || matched.matchType === 'none') {
    matched = findInventoryMatchForPurchase(payee);
  }

  if (matched && matched.item) {
    // 商品マスタIDまたは在庫IDを選択
    const targetValue = matched.item.itemId || matched.item.id;
    if (DOM.expenseSelectInventoryItem) {
      DOM.expenseSelectInventoryItem.value = targetValue;
      if (!DOM.expenseSelectInventoryItem.value && matched.item.id) {
        DOM.expenseSelectInventoryItem.value = matched.item.id;
      }
    }
    if (DOM.expensePurchaseMatchBadge) {
      DOM.expensePurchaseMatchBadge.style.display = 'inline-block';
      DOM.expensePurchaseMatchBadge.textContent = matched.matchType === 'exact' 
        ? `💡 学習辞書から推測: ${matched.item.name}` 
        : `💡 キーワードから推測: ${matched.item.name}`;
    }
    updateExpenseStockPreview();
  } else {
    if (DOM.expensePurchaseMatchBadge) {
      DOM.expensePurchaseMatchBadge.style.display = 'none';
    }
  }
}

function updateExpenseStockPreview() {
  if (!DOM.expenseSelectInventoryItem) return;
  const selectedProdId = DOM.expenseSelectInventoryItem.value;
  const inQty = DOM.expenseInputInQty ? Math.max(1, parseInt(DOM.expenseInputInQty.value, 10) || 1) : 1;

  const products = getItemMasterList(false);
  const prod = products.find(p => p.id === selectedProdId);
  const invList = getInventoryList();
  const inv = invList.find(i => i.itemId === selectedProdId || (prod && i.name && i.name.trim() === prod.name.trim()));

  if (!prod && !inv) {
    if (DOM.expenseCurrentStockDisp) DOM.expenseCurrentStockDisp.textContent = '--';
    if (DOM.expenseAfterStockDisp) DOM.expenseAfterStockDisp.textContent = '--';
    if (DOM.expenseStockDeltaDisp) DOM.expenseStockDeltaDisp.textContent = `+${inQty}`;
    if (DOM.expenseInventoryUnitDisp) DOM.expenseInventoryUnitDisp.textContent = '個';
    return;
  }

  const current = inv ? Number(inv.currentStock) || 0 : 0;
  const unit = (inv && inv.unit) || (prod && prod.unit) || '個';
  const after = current + inQty;

  if (DOM.expenseCurrentStockDisp) DOM.expenseCurrentStockDisp.textContent = `${current.toLocaleString()} ${unit}`;
  if (DOM.expenseAfterStockDisp) DOM.expenseAfterStockDisp.textContent = `${after.toLocaleString()} ${unit}`;
  if (DOM.expenseStockDeltaDisp) DOM.expenseStockDeltaDisp.textContent = `+${inQty} ${unit}`;
  if (DOM.expenseInventoryUnitDisp) DOM.expenseInventoryUnitDisp.textContent = unit;
}


// ==========================================================================
// 値引きモーダル制御 ＆ ユーザー価格基準計算
// ==========================================================================
function openDiscountModal() {
  DOM.discountModal.classList.add('active');
  renderDiscountReasonTags();
  
  // 初期値設定
  const topReasons = getDiscountReasons();
  DOM.discountInputReason.value = topReasons.length > 0 ? topReasons[0].name : '出精値引き';
  DOM.discountBaseUserPriceInc.value = '';
  DOM.discountSelectType.value = 'percent';
  DOM.discountInputValue.value = '10';
  DOM.discountInputValue.placeholder = '例: 10 (%)';
  DOM.discountSelectTaxRate.value = '10';
  
  updateDiscountCalculator();
}

function closeDiscountModal() {
  DOM.discountModal.classList.remove('active');
}

function renderDiscountReasonTags() {
  const reasons = getDiscountReasons();
  DOM.discountReasonTagsContainer.innerHTML = '';
  
  reasons.forEach(r => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reason-tag-btn';
    btn.innerHTML = `${escapeHtml(r.name)} <span class="tag-count">${r.count}</span>`;
    btn.title = `使用回数: ${r.count}回（クリックで名目にセット）`;
    btn.addEventListener('click', () => {
      DOM.discountInputReason.value = r.name;
    });
    DOM.discountReasonTagsContainer.appendChild(btn);
  });
}

function updateDiscountCalculator() {
  const baseUserInc = Number(DOM.discountBaseUserPriceInc.value) || 0;
  const discType = DOM.discountSelectType.value;
  const discVal = Number(DOM.discountInputValue.value) || 0;
  const taxRate = Number(DOM.discountSelectTaxRate.value) || 10;

  let userDiscountAmount = 0;
  let wholesaleDiscountUnitPrice = 0;

  if (discType === 'direct') {
    // 帳票仕切り単価（税抜）を直接指定する場合
    wholesaleDiscountUnitPrice = discVal;
    userDiscountAmount = 0;
    DOM.displayUserDiscountAmount.textContent = '（仕切り税抜を直接指定）';
  } else {
    // ユーザー価格を元に算出
    if (baseUserInc > 0) {
      if (discType === 'percent') {
        userDiscountAmount = Math.round(baseUserInc * (discVal / 100));
      } else {
        userDiscountAmount = discVal;
      }
      userDiscountAmount = Math.min(baseUserInc, Math.max(0, userDiscountAmount));
      DOM.displayUserDiscountAmount.textContent = formatCurrency(userDiscountAmount);

      // 値引き前ユーザー価格での税抜仕切り
      const w1 = calculateWholesalePrice(baseUserInc, taxRate, { type: 'none', value: 0 }).wholesaleUnitPrice;
      // 値引き後ユーザー価格での税抜仕切り
      const discountedUserInc = Math.max(0, baseUserInc - userDiscountAmount);
      const w2 = calculateWholesalePrice(discountedUserInc, taxRate, { type: 'none', value: 0 }).wholesaleUnitPrice;
      
      wholesaleDiscountUnitPrice = Math.max(0, w1 - w2);
    } else {
      DOM.displayUserDiscountAmount.textContent = '¥0';
      wholesaleDiscountUnitPrice = 0;
    }
  }

  DOM.displayWholesaleDiscountUnitPrice.textContent = formatCurrency(-wholesaleDiscountUnitPrice);
  return { userDiscountAmount, wholesaleDiscountUnitPrice };
}

function handleAddDiscountToItems() {
  const reason = DOM.discountInputReason.value.trim() || '特別値引き';
  const taxRate = Number(DOM.discountSelectTaxRate.value) || 10;
  const { wholesaleDiscountUnitPrice } = updateDiscountCalculator();

  if (wholesaleDiscountUnitPrice <= 0) {
    alert('値引き額が0円です。基準ユーザー税込価格と値引き率/金額、または直接指定の金額を入力してください。');
    return;
  }

  // 名目の使用履歴を記録（使用頻度順を更新）
  recordDiscountReason(reason);

  // マイナス単価の明細行を追加（完全な独立オブジェクト）
  currentDoc.items.push({
    id: 'item_' + Date.now() + Math.random().toString(36).substr(2, 4),
    name: reason,
    quantity: 1,
    unit: '式',
    unitPrice: -Math.abs(wholesaleDiscountUnitPrice),
    taxRate: taxRate,
    note: DOM.discountSelectType.value !== 'direct' ? 'ユーザー価格基準の値引き' : ''
  });

  renderItemInputCards();
  renderAll();
  closeDiscountModal();
  showToast(`値引き行「${reason}」(${formatCurrency(-wholesaleDiscountUnitPrice)}) を明細に追加しました！`, 'success');
}

// ==========================================================================
// 会計・収支ダッシュボード コントローラー
// ==========================================================================
let currentSalesFilter = 'all';
let currentReceiptDataUrl = null;
let attendanceClockInterval = null;

function openAccountingModal() {
  switchAppView('accounting');
}

function closeAccountingModal() {
  switchAppView('portal');
}

window.openAccountingModal = openAccountingModal;
window.closeAccountingModal = closeAccountingModal;
window.switchAccountingTab = switchAccountingTab;

function switchAccountingTab(tabKey) {
  let fullId = tabKey || 'acc-tab-dashboard';
  if (!fullId.startsWith('acc-tab-')) {
    fullId = `acc-tab-${fullId}`;
  }

  const tabBtns = (DOM.accTabBtns && DOM.accTabBtns.length > 0) ? DOM.accTabBtns : document.querySelectorAll('.acc-tab-btn');
  const panes = (DOM.accPanes && DOM.accPanes.length > 0) ? DOM.accPanes : document.querySelectorAll('.acc-pane');

  tabBtns.forEach(b => {
    b.classList.toggle('active', b.dataset.tab === fullId);
  });
  panes.forEach(p => {
    const isActive = (p.id === fullId);
    p.classList.toggle('active', isActive);
    p.style.display = isActive ? 'block' : 'none';
  });

  if (fullId === 'acc-tab-dashboard') {
    renderAccountingDashboard(currentAccGlobalPeriod);
  } else if (fullId === 'acc-tab-sales') {
    renderAccountingSales(currentSalesFilter, currentAccGlobalPeriod);
  } else if (fullId === 'acc-tab-expenses') {
    renderAccountingExpenses(currentAccGlobalPeriod);
  } else if (fullId === 'acc-tab-journals') {
    renderAccountingJournals(currentAccGlobalPeriod);
  }
}

// ==========================================================================
// 財務会計・全ペイン共通集計対象期間マネージャー
// ==========================================================================
let currentAccGlobalPeriod = {
  preset: 'thisMonth',
  start: '',
  end: ''
};

let currentExpenseGlobalPeriod = {
  preset: 'all',
  start: '',
  end: ''
};

/**
 * プリセット名から開始日・終了日（YYYY-MM-DD）を算出
 * @param {string} preset 'all' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'lastYear' | 'custom'
 * @returns {{start: string, end: string}}
 */
function getPresetPeriodRange(preset) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed (0=1月, 8=9月)

  if (preset === 'all') {
    return { start: '', end: '' };
  } else if (preset === 'thisMonth' || preset === 'current_month') {
    const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  } else if (preset === 'lastMonth' || preset === 'prev_month') {
    const prevDate = new Date(y, m - 1, 1);
    const py = prevDate.getFullYear();
    const pm = prevDate.getMonth();
    const start = `${py}-${String(pm + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(py, pm + 1, 0).getDate();
    const end = `${py}-${String(pm + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  } else if (preset === 'last3Months') {
    // 直近3ヶ月（2ヶ月前の1日〜当月末）
    const startDate = new Date(y, m - 2, 1);
    const sy = startDate.getFullYear();
    const sm = startDate.getMonth();
    const start = `${sy}-${String(sm + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  } else if (preset === 'thisYear' || preset === 'thisFiscalYear') {
    // 日本の会計年度: 4月1日〜翌年3月31日
    const fiscalYear = m >= 3 ? y : y - 1;
    const start = `${fiscalYear}-04-01`;
    const end = `${fiscalYear + 1}-03-31`;
    return { start, end };
  } else if (preset === 'lastYear' || preset === 'lastFiscalYear') {
    const fiscalYear = (m >= 3 ? y : y - 1) - 1;
    const start = `${fiscalYear}-04-01`;
    const end = `${fiscalYear + 1}-03-31`;
    return { start, end };
  } else if (preset === 'custom') {
    return {
      start: currentAccGlobalPeriod.start || '',
      end: currentAccGlobalPeriod.end || ''
    };
  }
  return { start: '', end: '' };
}

/**
 * 財務会計：任意期間指定モーダルを開く
 */
function openAccDateRangeModal() {
  const modal = DOM.accDateRangeModal || document.getElementById('accDateRangeModal');
  if (!modal) return;

  const startInput = DOM.modalAccDateStart || document.getElementById('modalAccDateStart');
  const endInput = DOM.modalAccDateEnd || document.getElementById('modalAccDateEnd');

  if (startInput) {
    startInput.value = currentAccGlobalPeriod.start || '';
  }
  if (endInput) {
    endInput.value = currentAccGlobalPeriod.end || '';
  }

  updateAccDateRangeModalPreview();

  // モーダルを確実にアクティブ化（.active クラス ＋ 各種表示プロパティ）
  modal.classList.add('active');
  modal.style.display = 'flex';
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'auto';
  modal.style.visibility = 'visible';

  // 開始日入力欄にフォーカス
  setTimeout(() => {
    if (startInput) {
      startInput.focus();
    }
  }, 100);
}

/**
 * 財務会計：任意期間指定モーダルを閉じる
 */
function closeAccDateRangeModal() {
  const modal = DOM.accDateRangeModal || document.getElementById('accDateRangeModal');
  if (!modal) return;
  modal.classList.remove('active');
  modal.style.display = 'none';
  modal.style.opacity = '';
  modal.style.pointerEvents = '';
  modal.style.visibility = '';
}

/**
 * 財務会計：任意期間指定モーダル内のクイックプリセット選択
 * @param {string} preset
 */
function setAccDateRangeModalPreset(preset) {
  const range = getPresetPeriodRange(preset);
  const startInput = DOM.modalAccDateStart || document.getElementById('modalAccDateStart');
  const endInput = DOM.modalAccDateEnd || document.getElementById('modalAccDateEnd');

  if (startInput) startInput.value = range.start || '';
  if (endInput) endInput.value = range.end || '';

  updateAccDateRangeModalPreview();
}

/**
 * 財務会計：任意期間指定モーダルのサマリープレビュー表示更新
 */
function updateAccDateRangeModalPreview() {
  const preview = DOM.modalAccDateRangePreview || document.getElementById('modalAccDateRangePreview');
  const startInput = DOM.modalAccDateStart || document.getElementById('modalAccDateStart');
  const endInput = DOM.modalAccDateEnd || document.getElementById('modalAccDateEnd');
  if (!preview) return;

  const s = startInput ? startInput.value : '';
  const e = endInput ? endInput.value : '';

  if (!s && !e) {
    preview.textContent = '選択中: 全期間（すべての伝票・経費を集計）';
    preview.style.background = '#f1f5f9';
    preview.style.color = '#475569';
    preview.style.borderColor = '#cbd5e1';
  } else {
    const sText = s ? s.replace(/-/g, '/') : '過去すべて';
    const eText = e ? e.replace(/-/g, '/') : '現在まで';
    let daysDiffText = '';
    if (s && e) {
      const d1 = new Date(s);
      const d2 = new Date(e);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        daysDiffText = ` (${diffDays}日間)`;
      }
    }
    preview.textContent = `選択中: ${sText} 〜 ${eText}${daysDiffText}`;
    preview.style.background = '#e0f2fe';
    preview.style.color = '#0369a1';
    preview.style.borderColor = '#bae6fd';
  }
}

/**
 * 財務会計：任意期間指定モーダルから決定して期間適用
 */
function confirmAccDateRangeFromModal() {
  const startInput = DOM.modalAccDateStart || document.getElementById('modalAccDateStart');
  const endInput = DOM.modalAccDateEnd || document.getElementById('modalAccDateEnd');
  const s = startInput ? startInput.value.trim() : '';
  const e = endInput ? endInput.value.trim() : '';

  closeAccDateRangeModal();

  if (!s && !e) {
    applyAccGlobalPeriod('all');
  } else {
    applyAccGlobalPeriod('custom', s, e);
  }
}

/**
 * 財務会計の集計対象期間を適用し、下の全4画面（損益、売上消込、経費、仕訳）を一括再描画
 * @param {string} preset 
 * @param {string|null} customStart 
 * @param {string|null} customEnd 
 */
function applyAccGlobalPeriod(preset = 'thisMonth', customStart = null, customEnd = null) {
  currentAccGlobalPeriod.preset = preset;

  if (preset === 'custom') {
    currentAccGlobalPeriod.start = customStart !== null ? customStart : (currentAccGlobalPeriod.start || '');
    currentAccGlobalPeriod.end = customEnd !== null ? customEnd : (currentAccGlobalPeriod.end || '');
  } else {
    const range = getPresetPeriodRange(preset);
    currentAccGlobalPeriod.start = range.start;
    currentAccGlobalPeriod.end = range.end;
  }

  // 入力フォームの同期
  if (DOM.accGlobalPeriodPreset) {
    DOM.accGlobalPeriodPreset.value = preset;
  }

  // アクティブ期間バッジ表示（#dispAccActivePeriodText / #badgeAccActivePeriod）の更新
  const dispText = DOM.dispAccActivePeriodText || document.getElementById('dispAccActivePeriodText');
  const badgeBtn = DOM.badgeAccActivePeriod || document.getElementById('badgeAccActivePeriod');

  if (dispText || badgeBtn) {
    const s = currentAccGlobalPeriod.start;
    const e = currentAccGlobalPeriod.end;
    let label = '';

    if (preset === 'all' || (!s && !e)) {
      label = '全期間（累計）';
      if (badgeBtn) {
        badgeBtn.style.background = '#f1f5f9';
        badgeBtn.style.color = '#475569';
        badgeBtn.style.borderColor = '#cbd5e1';
      }
    } else {
      const sFormatted = s ? s.replace(/-/g, '/') : '〜';
      const eFormatted = e ? e.replace(/-/g, '/') : '現在';
      let daysCount = '';
      if (s && e) {
        const d1 = new Date(s);
        const d2 = new Date(e);
        const diffTime = d2.getTime() - d1.getTime();
        const diff = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) {
          daysCount = ` (${diff}日間)`;
        }
      }
      label = `${sFormatted} 〜 ${eFormatted}${daysCount}`;
      if (badgeBtn) {
        badgeBtn.style.background = '#e0f2fe';
        badgeBtn.style.color = '#0369a1';
        badgeBtn.style.borderColor = '#7dd3fc';
      }
    }

    if (dispText) {
      dispText.textContent = label;
    } else if (badgeBtn) {
      badgeBtn.textContent = label;
    }
  }

  // 下の全4画面（損益計算書・売上消込・経費・仕訳帳）を一斉再描画！
  renderAccountingDashboard(currentAccGlobalPeriod);
  renderAccountingSales(currentSalesFilter, currentAccGlobalPeriod);
  renderAccountingExpenses(currentAccGlobalPeriod);
  renderAccountingJournals(currentAccGlobalPeriod);
}

// グローバルスコープへの公開（HTMLインラインonclick等からの呼び出し対応）
window.openAccDateRangeModal = openAccDateRangeModal;
window.closeAccDateRangeModal = closeAccDateRangeModal;
window.setAccDateRangeModalPreset = setAccDateRangeModalPreset;
window.updateAccDateRangeModalPreview = updateAccDateRangeModalPreview;
window.confirmAccDateRangeFromModal = confirmAccDateRangeFromModal;
window.applyAccGlobalPeriod = applyAccGlobalPeriod;

window.applyExpenseGlobalPeriod = function(preset = 'all') {
  currentExpenseGlobalPeriod.preset = preset;
  const range = getPresetPeriodRange(preset);
  currentExpenseGlobalPeriod.start = range.start;
  currentExpenseGlobalPeriod.end = range.end;
  
  const presetSelect = document.getElementById('expenseGlobalPeriodPreset');
  if (presetSelect && presetSelect.value !== preset) {
    presetSelect.value = preset;
  }
  
  if (typeof renderAccountingExpenses === 'function') {
    renderAccountingExpenses();
  }
};

function initAccountingMonthSelector() {
  if (!DOM.accSelectMonth) return;
  const history = getHistoryList();
  const expenses = getExpenseList();
  const monthsSet = new Set();

  history.forEach(doc => {
    if (doc.issueDate && doc.issueDate.length >= 7) {
      monthsSet.add(doc.issueDate.substring(0, 7));
    }
  });
  expenses.forEach(exp => {
    if (exp.date && exp.date.length >= 7) {
      monthsSet.add(exp.date.substring(0, 7));
    }
  });

  const currentYearMonth = getTodayDateString().substring(0, 7);
  monthsSet.add(currentYearMonth);

  const sortedMonths = Array.from(monthsSet).sort().reverse();
  const prevValue = DOM.accSelectMonth.value;

  let html = `<option value="">全期間（累計）</option>`;
  sortedMonths.forEach(m => {
    const [y, mm] = m.split('-');
    const label = `${y}年${Number(mm)}月`;
    const selected = (prevValue ? prevValue === m : m === currentYearMonth) ? 'selected' : '';
    html += `<option value="${m}" ${selected}>${label}</option>`;
  });
  DOM.accSelectMonth.innerHTML = html;
}

function renderAccountingDashboard(periodFilter = currentAccGlobalPeriod) {
  const invoices = getHistoryList();
  const expenses = getExpenseList();
  const pnl = calculateProfitAndLoss(invoices, expenses, periodFilter || 'all');

  // KPI表示更新
  if (DOM.kpiTotalSales) DOM.kpiTotalSales.textContent = formatCurrency(pnl.totalSales);
  if (DOM.kpiTotalSalesInc) DOM.kpiTotalSalesInc.textContent = `(税込 ${formatCurrency(pnl.totalSalesInc)})`;
  if (DOM.kpiGrossProfit) DOM.kpiGrossProfit.textContent = formatCurrency(pnl.grossProfit);
  if (DOM.kpiGrossMargin) DOM.kpiGrossMargin.textContent = `粗利率: ${(pnl.grossProfitMargin || 0).toFixed(1)}%`;
  if (DOM.kpiTotalExpenses) DOM.kpiTotalExpenses.textContent = formatCurrency(pnl.totalOperatingExpenses || 0);

  const monthExpenseCount = expenses.filter(e => isDateInPeriod(e.date, periodFilter)).length;
  if (DOM.kpiExpenseItemsCount) DOM.kpiExpenseItemsCount.textContent = `${monthExpenseCount}件の経費支出`;

  if (DOM.kpiOperatingProfit) {
    DOM.kpiOperatingProfit.textContent = formatCurrency(pnl.operatingProfit);
    DOM.kpiOperatingProfit.style.color = pnl.operatingProfit >= 0 ? '#059669' : '#e11d48';
  }
  if (DOM.kpiOperatingMargin) DOM.kpiOperatingMargin.textContent = `純利益率: ${(pnl.operatingProfitMargin || 0).toFixed(1)}%`;
  if (DOM.kpiUnpaidSales) DOM.kpiUnpaidSales.textContent = formatCurrency(pnl.unpaidSalesInc || 0);
  if (DOM.kpiCollectionRate) DOM.kpiCollectionRate.textContent = `回収率: ${(pnl.collectionRate || 0).toFixed(1)}%`;

  // 科目別経費内訳の描画
  renderExpenseCategoryBreakdown(pnl);

  // 月別推移グラフの描画
  renderMonthlyBarChart();
}

function renderExpenseCategoryBreakdown(pnl) {
  if (!DOM.accExpenseCategoryList) return;
  const categories = Object.entries(pnl.expenseByCategory || {})
    .filter(([_, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  if (categories.length === 0) {
    DOM.accExpenseCategoryList.innerHTML = `<div style="text-align: center; color: var(--slate-400); padding: 24px;">この期間の経費データはありません</div>`;
    return;
  }

  const totalExp = pnl.totalOperatingExpenses || 1;
  let html = '';
  categories.forEach(([catName, amount]) => {
    const percent = totalExp > 0 ? ((amount / totalExp) * 100).toFixed(1) : 0;
    html += `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
          <span style="font-weight: 600; color: var(--slate-700);">${escapeHtml(catName)}</span>
          <span style="font-weight: 700; color: var(--slate-900); font-family: monospace;">${formatCurrency(amount)} <span style="font-size: 11px; color: var(--slate-500); font-weight: normal;">(${percent}%)</span></span>
        </div>
        <div style="background: var(--slate-100); height: 8px; border-radius: 9999px; overflow: hidden;">
          <div style="background: var(--indigo-600); width: ${percent}%; height: 100%; border-radius: 9999px; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
  });
  DOM.accExpenseCategoryList.innerHTML = html;
}

function renderMonthlyBarChart() {
  const canvas = DOM.accMonthlyChart;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const invoices = getHistoryList();
  const expenses = getExpenseList();

  // 直近6ヶ月の月キーを生成
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(mStr);
  }

  // 各月の損益を計算
  const data = months.map(m => {
    const p = calculateProfitAndLoss(invoices, expenses, m);
    const [_, mm] = m.split('-');
    return {
      label: `${Number(mm)}月`,
      sales: p.totalSales,
      expenses: p.totalOperatingExpenses,
      profit: p.operatingProfit
    };
  });

  // Retina対応の高解像度スケーリング
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || 600;
  const height = 220;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, width, height);

  // 最大値を計算
  let maxVal = 500000;
  data.forEach(d => {
    if (d.sales > maxVal) maxVal = d.sales;
    if (d.expenses > maxVal) maxVal = d.expenses;
  });
  maxVal = Math.ceil((maxVal * 1.15) / 100000) * 100000;

  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // グリッド線とY軸ラベル
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'right';

  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const val = (maxVal / gridCount) * i;
    const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();

    const label = val >= 10000 ? `${(val / 10000).toFixed(0)}万` : `${val}`;
    ctx.fillText(label, paddingLeft - 8, y + 3);
  }

  // 棒の安全な描画関数（roundRect非対応ブラウザ対策）
  function drawBar(x, y, w, h, fillStyle) {
    if (h <= 0) return;
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, [3, 3, 0, 0]);
      ctx.fill();
    } else {
      ctx.fillRect(x, y, w, h);
    }
  }

  // 棒グラフの描画
  const groupWidth = chartWidth / data.length;
  const barWidth = Math.min(16, groupWidth / 3.5);

  data.forEach((d, idx) => {
    const groupX = paddingLeft + idx * groupWidth + (groupWidth - (barWidth * 3 + 6)) / 2;

    // 売上バー（インディゴ）
    const salesH = Math.max(0, (d.sales / maxVal) * chartHeight);
    const salesY = paddingTop + chartHeight - salesH;
    drawBar(groupX, salesY, barWidth, salesH, '#6366f1');

    // 経費バー（アンバー）
    const expH = Math.max(0, (d.expenses / maxVal) * chartHeight);
    const expY = paddingTop + chartHeight - expH;
    drawBar(groupX + barWidth + 3, expY, barWidth, expH, '#f59e0b');

    // 営業利益バー（エメラルド / ローズ）
    const profitH = Math.abs((d.profit / maxVal) * chartHeight);
    const profitY = d.profit >= 0 ? paddingTop + chartHeight - profitH : paddingTop + chartHeight;
    drawBar(groupX + (barWidth + 3) * 2, profitY, barWidth, profitH, d.profit >= 0 ? '#10b981' : '#f43f5e');

    // X軸ラベル
    ctx.fillStyle = '#475569';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, paddingLeft + idx * groupWidth + groupWidth / 2, height - 12);
  });
}

function filterSalesTable(filter) {
  currentSalesFilter = filter;
  if (DOM.btnFilterAllInvoices) DOM.btnFilterAllInvoices.classList.toggle('active', filter === 'all');
  if (DOM.btnFilterUnpaidInvoices) DOM.btnFilterUnpaidInvoices.classList.toggle('active', filter === 'unpaid');
  if (DOM.btnFilterPaidInvoices) DOM.btnFilterPaidInvoices.classList.toggle('active', filter === 'paid');
  renderAccountingSales(filter, currentAccGlobalPeriod);
}

function renderAccountingSales(filter = 'all', periodFilter = currentAccGlobalPeriod) {
  if (!DOM.accSalesTableBody) return;
  const history = getHistoryList();
  
  // 見積書以外の確定発行伝票（請求書、納品書、領収書）を正規化し、期間フィルターを適用
  let invoices = history
    .map(raw => normalizeInvoiceDoc(raw))
    .filter(doc => doc && doc.docType !== 'estimate' && doc.isIssued && !doc.isCancelled && isDateInPeriod(doc.issueDate, periodFilter));

  if (filter === 'unpaid') {
    invoices = invoices.filter(doc => !doc.isPaid);
  } else if (filter === 'paid') {
    invoices = invoices.filter(doc => !!doc.isPaid);
  }

  if (invoices.length === 0) {
    DOM.accSalesTableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--slate-400); padding: 36px 16px;">
          <p style="margin: 0; font-size: 0.9rem;">対象の確定発行伝票はありません。</p>
          <p style="margin: 6px 0 0 0; font-size: 0.775rem;">期間設定を変更するか、納品・請求書画面で「確定発行」を行うとここに自動反映されます。</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  invoices.forEach(doc => {
    const isPaid = !!doc.isPaid;
    const grandTotal = doc.grandTotal;
    const meta = DOC_TYPES[doc.docType] || DOC_TYPES.invoice;

    const statusBadge = isPaid
      ? `<span class="badge" style="background: #dcfce7; color: #166534; font-weight: 600;">✓ 入金済</span>`
      : `<span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 600;">⏳ 未入金</span>`;

    const toggleBtn = isPaid
      ? `<button type="button" class="btn btn-outline btn-xs" style="color: #64748b; font-size: 11px; padding: 3px 8px;" onclick="window.__toggleInvoicePayment('${doc.id}', false)">未入金に戻す</button>`
      : `<button type="button" class="btn btn-success btn-xs" style="background: #10b981; color: white; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(16,185,129,0.3);" onclick="window.__toggleInvoicePayment('${doc.id}', true)">✓ 消込（入金済）</button>`;

    html += `
      <tr>
        <td style="font-family: monospace; font-weight: 600;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge" style="font-size: 10px; padding: 2px 5px; background: #e0e7ff; color: #3730a3;">${meta.label}</span>
            <a href="javascript:void(0)" onclick="window.__openInvoiceQuickEdit('${doc.id}')" style="color: #4338ca; font-weight: 700; text-decoration: underline; cursor: pointer;" title="クリックして請求書内容を確認・直接編集">${escapeHtml(doc.docNumber || '-')}</a>
          </div>
        </td>
        <td>${escapeHtml(doc.issueDate || '-')}</td>
        <td style="font-weight: 600; color: var(--slate-800); cursor: pointer;" onclick="window.__openInvoiceQuickEdit('${doc.id}')" title="クリックして請求書内容を確認・直接編集">
          <span style="color: #1e293b; text-decoration: underline;">${escapeHtml(doc.clientName || '名称未設定')}</span>
        </td>
        <td style="text-align: right; font-weight: 700; font-family: monospace; color: var(--indigo-700); font-size: 0.9rem;">${formatCurrency(grandTotal)}</td>
        <td>${escapeHtml(doc.dueDate || '-')}</td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: center;">
          <div style="display: flex; gap: 4px; justify-content: center; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-outline btn-xs" style="color: #4338ca; border-color: #c7d2fe; font-size: 11px; padding: 3px 7px;" title="請求書内容の確認・直接編集" onclick="window.__openInvoiceQuickEdit('${doc.id}')">👁 詳細・編集</button>
            ${toggleBtn}
            <button type="button" class="btn btn-outline-danger btn-xs" style="color: #ef4444; border-color: #fca5a5; font-size: 11px; padding: 3px 6px;" title="確定発行を取り消し、売上消込・仕訳帳・P/Lから除外して下書きに戻します" onclick="window.__cancelInvoiceIssue('${doc.id}', '${escapeHtml(doc.docNumber || '')}')">確定取消</button>
          </div>
        </td>
      </tr>
    `;
  });
  DOM.accSalesTableBody.innerHTML = html;
}

window.__toggleInvoicePayment = function(id, newStatus) {
  const success = updateDocPaymentStatus(id, newStatus);
  if (success) {
    showToast(newStatus ? '入金消込を完了しました！仕訳帳にも自動連動されます。' : '未入金ステータスに戻しました。', 'success');
    applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
  }
};

window.__cancelInvoiceIssue = function(id, docNumber = '') {
  const label = docNumber ? `伝票「${docNumber}」` : 'この書類';
  if (!confirm(`${label}の確定発行を取り消しますか？\n\n【取り消しの効果】\n・売上消込台帳・P/Lダッシュボード・仕訳帳から即座に除外されます。\n・書類データは削除されず、下書き状態に戻ります。`)) {
    return;
  }

  const success = cancelDocIssue(id);
  if (success) {
    if (currentDoc && currentDoc.id === id) {
      currentDoc.isIssued = false;
      currentDoc.isCancelled = true;
      currentDoc.issuedAt = null;
      saveActiveDoc(currentDoc);
      renderAll();
    }
    initAccountingMonthSelector();
    renderAccountingSales(currentSalesFilter);
    renderAccountingDashboard(DOM.accSelectMonth ? DOM.accSelectMonth.value : '');
    renderAccountingJournals();
    showToast(`${label}の確定発行を取り消しました（財務会計から除外されました）`, 'warning');
  } else {
    showToast('確定発行の取り消しに失敗しました', 'danger');
  }
};

// ==========================================================================
// 請求書詳細・クイック直接編集コントローラー（財務会計連携・1対1完全同期）
// ==========================================================================
let currentIqeDoc = null;
let currentIqeItems = [];

function openInvoiceQuickEdit(docId) {
  if (!DOM.invoiceQuickEditModal) return;

  const full = getDocFromHistory(docId);
  const list = getHistoryList();
  const summary = list.find(d => d.id === docId);

  if (!full && !summary) {
    showToast('伝票データが見つかりません', 'danger');
    return;
  }

  currentIqeDoc = full ? JSON.parse(JSON.stringify(full)) : JSON.parse(JSON.stringify(summary.fullDoc || summary));
  if (!currentIqeDoc.items || !Array.isArray(currentIqeDoc.items)) {
    currentIqeDoc.items = [];
  }
  currentIqeItems = JSON.parse(JSON.stringify(currentIqeDoc.items));

  // モーダルヘッダー
  const docNo = currentIqeDoc.docNumber || summary?.docNumber || '番号なし';
  const meta = DOC_TYPES[currentIqeDoc.docType] || DOC_TYPES.invoice;
  if (DOM.iqeModalTitle) DOM.iqeModalTitle.textContent = `${meta.label} 詳細・直接編集`;
  if (DOM.iqeDocNumberSub) DOM.iqeDocNumberSub.textContent = `伝票番号: ${docNo}`;

  const isIssued = !!(currentIqeDoc.isIssued && !currentIqeDoc.isCancelled);
  if (DOM.iqeStatusBadge) {
    DOM.iqeStatusBadge.textContent = isIssued ? '確定発行済（財務会計連動中）' : '下書き（未確定）';
    DOM.iqeStatusBadge.style.background = isIssued ? '#dcfce7' : '#f1f5f9';
    DOM.iqeStatusBadge.style.color = isIssued ? '#166534' : '#64748b';
  }

  // フォーム初期値
  if (DOM.iqeDocId) DOM.iqeDocId.value = docId;
  if (DOM.iqeDocType) DOM.iqeDocType.value = currentIqeDoc.docType || 'invoice';
  if (DOM.iqeIssueDate) DOM.iqeIssueDate.value = currentIqeDoc.issueDate || '';
  if (DOM.iqeDueDate) DOM.iqeDueDate.value = currentIqeDoc.dueDate || '';
  if (DOM.iqePaymentStatus) DOM.iqePaymentStatus.value = (currentIqeDoc.isPaid || currentIqeDoc.paymentStatus === 'paid') ? 'paid' : 'unpaid';
  if (DOM.iqeClientName) DOM.iqeClientName.value = currentIqeDoc.client?.name || summary?.clientName || '';
  if (DOM.iqeTitle) DOM.iqeTitle.value = currentIqeDoc.title || '';
  if (DOM.iqeNotes) DOM.iqeNotes.value = currentIqeDoc.notes || '';

  // 明細テーブルの描画
  renderIqeItemsTable();

  // モーダル表示
  DOM.invoiceQuickEditModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

window.__openInvoiceQuickEdit = openInvoiceQuickEdit;

function closeInvoiceQuickEditModal() {
  if (!DOM.invoiceQuickEditModal) return;
  DOM.invoiceQuickEditModal.classList.remove('active');
  document.body.style.overflow = '';
  currentIqeDoc = null;
  currentIqeItems = [];
}

function renderIqeItemsTable() {
  if (!DOM.iqeItemsTableBody) return;
  DOM.iqeItemsTableBody.innerHTML = '';

  if (currentIqeItems.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">明細がありません。「＋ 行を追加」ボタンで追加してください。</td>`;
    DOM.iqeItemsTableBody.appendChild(tr);
    recalcIqeTotals();
    return;
  }

  currentIqeItems.forEach((it, idx) => {
    const tr = document.createElement('tr');
    const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);

    tr.innerHTML = `
      <td>
        <input type="text" class="form-input iqe-item-name" value="${escapeHtml(it.name || '')}" style="font-size: 0.8rem; padding: 4px 6px;" placeholder="品名・項目">
      </td>
      <td>
        <input type="number" class="form-input iqe-item-qty" value="${it.quantity !== undefined ? it.quantity : 1}" style="font-size: 0.8rem; padding: 4px 6px; text-align: right;" min="0" step="any">
      </td>
      <td>
        <input type="text" class="form-input iqe-item-unit" value="${escapeHtml(it.unit || '個')}" style="font-size: 0.8rem; padding: 4px 6px; text-align: center;">
      </td>
      <td>
        <input type="number" class="form-input iqe-item-price" value="${it.unitPrice !== undefined ? it.unitPrice : 0}" style="font-size: 0.8rem; padding: 4px 6px; text-align: right;" min="0">
      </td>
      <td>
        <select class="form-select iqe-item-rate" style="font-size: 0.8rem; padding: 4px 4px; text-align: center;">
          <option value="10" ${Number(it.taxRate) === 10 ? 'selected' : ''}>10%</option>
          <option value="8" ${Number(it.taxRate) === 8 ? 'selected' : ''}>8% (軽減)</option>
          <option value="0" ${Number(it.taxRate) === 0 ? 'selected' : ''}>0% (非課税)</option>
        </select>
      </td>
      <td style="text-align: right; font-family: monospace; font-weight: 600; color: #1e293b; padding-right: 8px;">
        ${formatCurrency(lineTotal)}
      </td>
      <td style="text-align: center;">
        <button type="button" class="btn-icon-danger iqe-btn-del" style="font-size: 0.9rem;" title="行を削除">✕</button>
      </td>
    `;

    // 入力イベントで即時再計算
    const nameInput = tr.querySelector('.iqe-item-name');
    const qtyInput = tr.querySelector('.iqe-item-qty');
    const unitInput = tr.querySelector('.iqe-item-unit');
    const priceInput = tr.querySelector('.iqe-item-price');
    const rateSelect = tr.querySelector('.iqe-item-rate');
    const delBtn = tr.querySelector('.iqe-btn-del');

    nameInput.addEventListener('input', e => { it.name = e.target.value; });
    qtyInput.addEventListener('input', e => {
      it.quantity = Number(e.target.value) || 0;
      recalcIqeTotals();
    });
    unitInput.addEventListener('input', e => { it.unit = e.target.value; });
    priceInput.addEventListener('input', e => {
      it.unitPrice = Number(e.target.value) || 0;
      recalcIqeTotals();
    });
    rateSelect.addEventListener('change', e => {
      it.taxRate = Number(e.target.value);
      recalcIqeTotals();
    });
    delBtn.addEventListener('click', () => {
      currentIqeItems.splice(idx, 1);
      renderIqeItemsTable();
    });

    DOM.iqeItemsTableBody.appendChild(tr);
  });

  recalcIqeTotals();
}

function recalcIqeTotals() {
  let subtotal = 0;
  let taxTotal = 0;

  currentIqeItems.forEach(it => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const lineTotal = qty * price;
    const rate = Number(it.taxRate !== undefined ? it.taxRate : 10);
    subtotal += lineTotal;
    taxTotal += Math.floor(lineTotal * (rate / 100));
  });

  const grandTotal = subtotal + taxTotal;

  if (DOM.iqeSubtotal) DOM.iqeSubtotal.textContent = formatCurrency(subtotal);
  if (DOM.iqeTaxTotal) DOM.iqeTaxTotal.textContent = formatCurrency(taxTotal);
  if (DOM.iqeGrandTotal) DOM.iqeGrandTotal.textContent = formatCurrency(grandTotal);
}

function saveInvoiceQuickEditHandler() {
  if (!currentIqeDoc) return;
  const docId = DOM.iqeDocId ? DOM.iqeDocId.value : currentIqeDoc.id;
  if (!docId) return;

  const docType = DOM.iqeDocType ? DOM.iqeDocType.value : currentIqeDoc.docType;
  const issueDate = DOM.iqeIssueDate ? DOM.iqeIssueDate.value : currentIqeDoc.issueDate;
  const dueDate = DOM.iqeDueDate ? DOM.iqeDueDate.value : currentIqeDoc.dueDate;
  const paymentStatus = DOM.iqePaymentStatus ? DOM.iqePaymentStatus.value : 'unpaid';
  const isPaid = (paymentStatus === 'paid');
  const clientName = DOM.iqeClientName ? DOM.iqeClientName.value.trim() : (currentIqeDoc.client?.name || '');
  const title = DOM.iqeTitle ? DOM.iqeTitle.value.trim() : currentIqeDoc.title;
  const notes = DOM.iqeNotes ? DOM.iqeNotes.value : currentIqeDoc.notes;

  // 1. currentIqeDoc を完全更新
  currentIqeDoc.docType = docType;
  currentIqeDoc.issueDate = issueDate;
  currentIqeDoc.dueDate = dueDate;
  currentIqeDoc.paymentStatus = paymentStatus;
  currentIqeDoc.isPaid = isPaid;
  if (isPaid && !currentIqeDoc.paidDate) {
    currentIqeDoc.paidDate = new Date().toISOString().split('T')[0];
  } else if (!isPaid) {
    currentIqeDoc.paidDate = '';
  }
  if (!currentIqeDoc.client) currentIqeDoc.client = {};
  currentIqeDoc.client.name = clientName;
  currentIqeDoc.title = title;
  currentIqeDoc.notes = notes;
  currentIqeDoc.items = currentIqeItems;
  currentIqeDoc.updatedAt = new Date().toISOString();

  // 2. 書類履歴（KEYS.HISTORY）に1対1で完全保存
  saveDocToHistory(currentIqeDoc);

  // 3. もし現在納品請求書エディタで開いている書類と同じIDなら、currentDoc も1対1で同期！
  if (currentDoc && currentDoc.id === docId) {
    currentDoc = JSON.parse(JSON.stringify(currentIqeDoc));
    saveActiveDoc(currentDoc);
    populateFormFromDoc();
    updateThemeColor(currentDoc.themeColor || 'indigo');
    renderAll();
  }

  // 4. 財務会計（P/L損益計算書・売上消込台帳・仕訳帳）を即時再計算・再同期！
  initAccountingMonthSelector();
  const currentMonth = DOM.accSelectMonth ? DOM.accSelectMonth.value : '';
  renderAccountingDashboard(currentMonth);
  renderAccountingSales(currentSalesFilter);
  renderAccountingJournals();

  // 5. モーダルを閉じて成功トーストを表示
  closeInvoiceQuickEditModal();
  showToast(`伝票内容を保存し、納品請求書・売上消込台帳・損益計算・仕訳帳すべてに1対1で変更を反映しました！`, 'success');
}

// ==========================================================================
// 経費・レシート画像OCR コントローラー
// ==========================================================================
let activeExpenseClaimant = (function() {
  try {
    return localStorage.getItem('alva_active_expense_claimant') || '小林俊介';
  } catch (e) {
    return '小林俊介';
  }
})();

function setActiveExpenseClaimant(claimant) {
  if (!claimant) claimant = '小林俊介';
  activeExpenseClaimant = claimant;
  try {
    localStorage.setItem('alva_active_expense_claimant', claimant);
  } catch (e) {}

  const list = [
    { id: 'btnClaimantKobayashi', val: '小林俊介' },
    { id: 'btnClaimantMiyazaki', val: '宮崎真輔' },
    { id: 'btnClaimantCompany', val: '会社立替/その他' }
  ];

  list.forEach(item => {
    const el = document.getElementById(item.id) || DOM[item.id];
    if (!el) return;
    const isAct = (item.val === claimant);
    el.classList.toggle('active', isAct);
    if (isAct) {
      el.style.background = '#4f46e5';
      el.style.color = '#ffffff';
      el.style.borderColor = '#4338ca';
      el.style.fontWeight = '700';
    } else {
      el.style.background = '#ffffff';
      el.style.color = '#475569';
      el.style.borderColor = '#cbd5e1';
      el.style.fontWeight = '600';
    }
  });

  const inputClaimant = document.getElementById('expenseInputClaimant') || DOM.expenseInputClaimant;
  if (inputClaimant && inputClaimant.value !== claimant) {
    inputClaimant.value = claimant;
  }
}
window.setActiveExpenseClaimant = setActiveExpenseClaimant;

function switchExpenseMobileTab(tab) {
  const grid = document.querySelector('.expenses-view-grid');
  const btnForm = document.getElementById('btnTabExpenseForm');
  const btnList = document.getElementById('btnTabExpenseList');
  if (!grid) return;

  if (tab === 'list') {
    grid.classList.remove('tab-form-active');
    grid.classList.add('tab-list-active');
    if (btnForm) btnForm.classList.remove('active');
    if (btnList) btnList.classList.add('active');
    if (typeof renderAccountingExpenses === 'function') {
      const period = (typeof currentAccGlobalPeriod !== 'undefined') ? currentAccGlobalPeriod : { preset: 'all' };
      renderAccountingExpenses(period);
    }
    // スムーズスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    grid.classList.remove('tab-list-active');
    grid.classList.add('tab-form-active');
    if (btnForm) btnForm.classList.add('active');
    if (btnList) btnList.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.switchExpenseMobileTab = switchExpenseMobileTab;

function initReceiptUploadHandlers() {
  const dropZone = DOM.receiptDropZone;
  const fileInput = DOM.receiptFileInput;
  if (!dropZone || !fileInput) return;

  // 立替者初期値の同期
  setActiveExpenseClaimant(activeExpenseClaimant);

  // ピルバーのクリックイベント
  if (DOM.btnClaimantKobayashi) {
    DOM.btnClaimantKobayashi.addEventListener('click', () => setActiveExpenseClaimant('小林俊介'));
  }
  if (DOM.btnClaimantMiyazaki) {
    DOM.btnClaimantMiyazaki.addEventListener('click', () => setActiveExpenseClaimant('宮崎真輔'));
  }
  if (DOM.btnClaimantCompany) {
    DOM.btnClaimantCompany.addEventListener('click', () => setActiveExpenseClaimant('会社立替/その他'));
  }
  if (DOM.expenseInputClaimant) {
    DOM.expenseInputClaimant.addEventListener('change', (e) => setActiveExpenseClaimant(e.target.value));
  }

  // サーバーの Gemini API 連携状態をチェック＆自己診断
  function checkGeminiStatus() {
    if (!DOM.geminiOcrBadge) return;
    DOM.geminiOcrBadge.style.display = 'inline-block';

    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
      const fetchFn = window.apiFetch || fetch;
      fetchFn('status')
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          return res.json();
        })
        .then(status => {
          if (!DOM.geminiOcrBadge) return;
          if (status && status.hasGeminiKey) {
            const remaining = status.rateLimit ? status.rateLimit.dailyRemaining : '200';
            DOM.geminiOcrBadge.textContent = `✨ Gemini AI 連携中（本日無料枠 残り${remaining}回）`;
            DOM.geminiOcrBadge.style.background = 'linear-gradient(135deg, #e0e7ff, #ede9fe)';
            DOM.geminiOcrBadge.style.color = '#4338ca';
            DOM.geminiOcrBadge.style.border = '1px solid #c7d2fe';
            DOM.geminiOcrBadge.title = `Google Gemini AI による超高精度OCRが有効です。無料枠セーフティガード（上限1日200回/残り${remaining}回）により安全に保護されています。`;
            DOM.geminiOcrBadge.onclick = () => {
              alert('✨ Gemini AI は正常に連携中です！\n\nレシート画像をアップロードすると、Google Gemini AI により店名・金額・日付・インボイス番号が自動解析されます。');
            };
            DOM.geminiOcrBadge.style.cursor = 'pointer';
          } else {
            DOM.geminiOcrBadge.textContent = '📖 ブラウザ内AI動作中 (Gemini設定可)';
            DOM.geminiOcrBadge.style.background = '#f1f5f9';
            DOM.geminiOcrBadge.style.color = '#475569';
            DOM.geminiOcrBadge.style.border = '1px solid #cbd5e1';
            DOM.geminiOcrBadge.style.cursor = 'pointer';
            DOM.geminiOcrBadge.title = '現在は無料のブラウザ内OCRで動作しています。クリックで診断・設定案内を表示';
            DOM.geminiOcrBadge.onclick = () => {
              alert('【Gemini AI 設定診断】\n\n・サーバー接続: 正常（通信成功）\n・Geminiキー判定: 未設定または空欄\n\n【有効化手順】\nサーバー上の config.php の GEMINI_API_KEY にGoogle AI StudioのAPIキー（AIzaSy...）を記入して保存してください。\n※キーが未設定でも、現在のブラウザ内OCRで通常通りご利用いただけます。');
            };
          }
        })
        .catch(err => {
          if (!DOM.geminiOcrBadge) return;
          DOM.geminiOcrBadge.textContent = '📖 ブラウザ内AI動作中 (Gemini設定可)';
          DOM.geminiOcrBadge.style.background = '#fef2f2';
          DOM.geminiOcrBadge.style.color = '#991b1b';
          DOM.geminiOcrBadge.style.border = '1px solid #fecaca';
          DOM.geminiOcrBadge.style.cursor = 'pointer';
          DOM.geminiOcrBadge.title = 'サーバー通信診断。クリックして詳細を確認';
          DOM.geminiOcrBadge.onclick = () => {
            alert(`【Gemini API サーバー通信診断】\n\nサーバーとの通信で以下の状況が発生しています:\n${err.message || err}\n\n※最新の alva-erp-wordpress.zip をサーバーへ上書き解凍すると解消されます。\n※ブラウザ内OCRは引き続き正常にご利用いただけます。`);
          };
        });
    }
  }
  window.checkGeminiStatus = checkGeminiStatus;
  checkGeminiStatus();

  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleReceiptFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleReceiptFiles(e.target.files);
    }
  });
}

/**
 * 複数レシートファイルの一括・順次解析＆自動登録
 * @param {FileList|Array<File>} fileList 
 */
async function handleReceiptFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  const files = Array.from(fileList).filter(f => {
    return (f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|heic|bmp|tiff)$/i.test(f.name || '');
  });

  if (files.length === 0) {
    alert('画像ファイル（JPEG, PNG, WEBP等）を選択してください。');
    return;
  }

  // 1ファイルのみの場合は通常のフォーム投入モード
  if (files.length === 1) {
    return handleReceiptFile(files[0]);
  }

  // 2ファイル以上の場合は、設定中の社員で一括読み込み・登録！
  const currentClaimant = activeExpenseClaimant || '小林俊介';
  if (!confirm(`選択された ${files.length} 件のレシート写真を、【${currentClaimant}】様の経費として一括自動読み込み・登録しますか？\n\n・選択された設定（立替者: ${currentClaimant}）のまま自動登録されます。\n・登録後、経費一覧から確認・修正・精算書発行が可能です。`)) {
    return;
  }

  if (DOM.receiptOcrStatus) {
    DOM.receiptOcrStatus.style.display = 'flex';
  }

  let successCount = 0;
  const expenseHistory = typeof getExpenseList === 'function' ? getExpenseList() : [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (DOM.receiptOcrStatusText) {
      DOM.receiptOcrStatusText.textContent = `[${i + 1}/${files.length}] レシート「${file.name}」をAI解析中...`;
    }

    try {
      const compressedDataUrl = await compressReceiptImage(file);
      const parsed = await analyzeReceiptImage(file, (msg) => {
        if (DOM.receiptOcrStatusText) DOM.receiptOcrStatusText.textContent = `[${i + 1}/${files.length}] ${msg}`;
      }, expenseHistory);

      const expItem = {
        date: (parsed && parsed.date) || getTodayDateString(),
        category: (parsed && parsed.category) || '消耗品費',
        amount: (parsed && parsed.amount) || 0,
        taxRate: (parsed && parsed.taxRate !== undefined) ? Number(parsed.taxRate) : 10,
        payee: (parsed && parsed.payee) || file.name.replace(/\.[^/.]+$/, ""),
        invoiceNumber: (parsed && parsed.invoiceNumber) || '',
        note: (parsed && parsed.note) || `一括読み込み (${file.name})`,
        claimant: currentClaimant,
        isSettled: false,
        receiptImage: compressedDataUrl,
        receiptDataUrl: compressedDataUrl
      };

      const savedExp = saveExpense(expItem);
      if (savedExp && typeof fetch !== 'undefined' && compressedDataUrl.startsWith('data:image/')) {
        (window.apiFetch || fetch)('save-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedExp.id, image: compressedDataUrl })
        }).then(res => res.json()).then(data => {
          if (data && data.url) {
            savedExp.receiptImage = data.url;
            savedExp.receiptDataUrl = data.url;
          }
        }).catch(() => {});
      }

      successCount++;
    } catch (err) {
      console.warn(`Failed to process ${file.name}:`, err);
    }
  }

  if (DOM.receiptOcrStatus) {
    DOM.receiptOcrStatus.style.display = 'none';
  }

  // サーバーへ完全同期して他ユーザーの端末にも即時共有
  if (typeof syncExpensesWithServer === 'function') {
    await syncExpensesWithServer().catch(() => {});
  }

  clearReceiptImage();
  applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
  showToast(`🎉 ${successCount} 件のレシートを【${currentClaimant}】様の経費として一括登録しました！`, 'success');
}

async function handleReceiptFile(file) {
  if (!file) return;

  // 拡張子またはMIMEタイプで判定
  const isImage = (file.type && file.type.startsWith('image/')) ||
    /\.(jpe?g|png|webp|gif|heic|bmp|tiff)$/i.test(file.name || '');

  if (!isImage) {
    alert('画像ファイル（JPEG, PNG, WEBP等）を選択してください。');
    return;
  }

  showToast('レシート画像を読み込んでいます...', 'info');

  try {
    const compressedDataUrl = await compressReceiptImage(file);
    currentReceiptDataUrl = compressedDataUrl;

    if (DOM.receiptImagePreview) {
      DOM.receiptImagePreview.src = compressedDataUrl;
    }
    if (DOM.receiptImagePreviewContainer) {
      DOM.receiptImagePreviewContainer.style.display = 'block';
    }

    // ドロップゾーンのテキストを読込済みに更新
    const dropZoneText = DOM.receiptDropZone ? DOM.receiptDropZone.querySelector('span') : null;
    if (dropZoneText) {
      dropZoneText.textContent = `✓ 写真をセットしました: ${file.name || 'レシート'}`;
      dropZoneText.style.color = '#059669';
    }

    // OCRステータス表示
    if (DOM.receiptOcrStatus) {
      DOM.receiptOcrStatus.style.display = 'flex';
      if (DOM.receiptOcrStatusText) DOM.receiptOcrStatusText.textContent = 'レシートの文字・金額を解析中...';
    }

    const onProgress = (msg) => {
      if (DOM.receiptOcrStatusText) DOM.receiptOcrStatusText.textContent = msg;
    };

    // 過去の経費登録履歴（使えば使うほど精度が向上する学習辞書）を取得して渡す
    const expenseHistory = typeof getExpenseList === 'function' ? getExpenseList() : [];
    const parsed = await analyzeReceiptImage(file, onProgress, expenseHistory);

    if (DOM.receiptOcrStatus) {
      DOM.receiptOcrStatus.style.display = 'none';
    }

    if (parsed) {
      if (parsed.date && DOM.expenseInputDate) DOM.expenseInputDate.value = parsed.date;
      if (parsed.amount && DOM.expenseInputAmount) DOM.expenseInputAmount.value = parsed.amount;
      if (parsed.payee && DOM.expenseInputPayee) DOM.expenseInputPayee.value = parsed.payee;
      if (parsed.category && DOM.expenseSelectCategory) DOM.expenseSelectCategory.value = parsed.category;
      if (parsed.taxRate && DOM.expenseSelectTax) DOM.expenseSelectTax.value = String(parsed.taxRate);

      // インボイス登録番号の自動セット
      if (parsed.invoiceNumber && DOM.expenseInputInvoiceNum) {
        DOM.expenseInputInvoiceNum.value = parsed.invoiceNumber;
      }

      // 摘要・メモのセット
      if (parsed.note && DOM.expenseInputNote && !DOM.expenseInputNote.value) {
        DOM.expenseInputNote.value = parsed.note;
      }

      // 仕入名目・店名からの在庫商品推測を更新
      checkAndSuggestInventoryMatch();

      if (window.lastGeminiError) {
        if (window.lastGeminiError.includes('429') || window.lastGeminiError.includes('quota') || window.lastGeminiError.includes('無料枠')) {
          showToast('⏳ Google AI無料枠の1分間制限に達しています。約1分後に再試行するか、数値を手動入力してください。', 'warning');
        } else {
          showToast(`⚠️ AI解析エラー: ${window.lastGeminiError}`, 'warning');
        }
        window.lastGeminiError = null;
      } else if (parsed.engine && parsed.engine.startsWith('gemini')) {
        const invInfo = parsed.invoiceNumber ? ` / インボイス: ${parsed.invoiceNumber}` : '';
        const amtInfo = parsed.amount ? `金額: ¥${parsed.amount.toLocaleString()}` : '';
        showToast(`✨ Gemini AI解析完了！ ${amtInfo}${invInfo}`, 'success');
      } else if (parsed.isLearnedMatch) {
        showToast(`🧠 過去の登録実績から「${parsed.payee} (${parsed.category})」を自動特定しました！`, 'success');
      } else if (parsed.amount > 0 || parsed.payee) {
        showToast('レシートから金額や店名を自動読込しました！内容を確認して登録してください。', 'success');
      } else {
        showToast('写真をセットしました！金額と内容を確認して登録してください。', 'info');
      }
    } else {
      showToast('写真をセットしました！金額と内容を入力して登録してください。', 'info');
    }

    // 入力欄にフォーカス
    if (DOM.expenseInputAmount && !DOM.expenseInputAmount.value) {
      DOM.expenseInputAmount.focus();
    }
  } catch (err) {
    console.error('Receipt process error:', err);
    if (DOM.receiptOcrStatus) {
      DOM.receiptOcrStatus.style.display = 'none';
    }
    showToast('画像の読み込みに失敗しました。手動で入力してください。', 'warning');
  }
}

/**
 * レシート画像を大画面モーダルで全体拡大表示（電子帳簿保存法スキャナ保存対応）
 */
function openReceiptZoom(imgSrc, meta = null) {
  const modal = DOM.receiptZoomModal || document.getElementById('receiptZoomModal');
  const img = DOM.receiptZoomImage || document.getElementById('receiptZoomImage');
  if (!imgSrc || !modal || !img) {
    console.warn('Cannot open receipt zoom modal: elements missing', { imgSrc, modal, img });
    return;
  }
  img.src = imgSrc;

  // ダウンロードリンクの設定
  const btnDownload = DOM.btnDownloadReceiptZoom || document.getElementById('btnDownloadReceiptZoom');
  if (btnDownload) {
    btnDownload.href = imgSrc;
    const downloadName = meta && meta.date
      ? `領収書_${meta.date}_${(meta.payee || '経費').replace(/[\s\/\\:*?"<>|]/g, '_')}.jpg`
      : '領収書原本.jpg';
    btnDownload.download = downloadName;
  }

  // 電子帳簿保存法メタ情報バナーの更新
  const metaDate = DOM.receiptZoomMetaDate || document.getElementById('receiptZoomMetaDate');
  const metaPayee = DOM.receiptZoomMetaPayee || document.getElementById('receiptZoomMetaPayee');
  const metaAmount = DOM.receiptZoomMetaAmount || document.getElementById('receiptZoomMetaAmount');
  const metaInvoice = DOM.receiptZoomMetaInvoice || document.getElementById('receiptZoomMetaInvoice');

  if (meta) {
    if (metaDate) metaDate.textContent = `📅 取引日: ${meta.date || '-'}`;
    if (metaPayee) metaPayee.textContent = `🏢 取引先: ${meta.payee || '-'}`;
    if (metaAmount) metaAmount.textContent = `💴 金額: ${formatCurrency(meta.amount || 0)}`;
    if (metaInvoice) {
      metaInvoice.textContent = meta.invoiceNumber
        ? `🏷️ インボイス: ${meta.invoiceNumber}`
        : '🏷️ インボイス: 未登録/非対象';
    }
  } else {
    // フォーム入力中の画像の場合
    if (metaDate) metaDate.textContent = `📅 取引日: ${DOM.expenseInputDate?.value || '-'}`;
    if (metaPayee) metaPayee.textContent = `🏢 取引先: ${DOM.expenseInputPayee?.value || '-'}`;
    if (metaAmount) metaAmount.textContent = `💴 金額: ${formatCurrency(DOM.expenseInputAmount?.value || 0)}`;
    if (metaInvoice) {
      metaInvoice.textContent = DOM.expenseInputInvoiceNum?.value
        ? `🏷️ インボイス: ${DOM.expenseInputInvoiceNum.value}`
        : '🏷️ インボイス: 未登録/非対象';
    }
  }

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeReceiptZoom() {
  const modal = DOM.receiptZoomModal || document.getElementById('receiptZoomModal');
  const img = DOM.receiptZoomImage || document.getElementById('receiptZoomImage');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  if (img) img.src = '';
}

// ESCキーで拡大モーダルを閉じる
document.addEventListener('keydown', (e) => {
  const modal = DOM.receiptZoomModal || document.getElementById('receiptZoomModal');
  if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
    closeReceiptZoom();
  }
});

function clearReceiptImage() {
  currentReceiptDataUrl = null;
  if (DOM.receiptFileInput) DOM.receiptFileInput.value = '';
  if (DOM.receiptImagePreview) DOM.receiptImagePreview.src = '';
  if (DOM.receiptImagePreviewContainer) DOM.receiptImagePreviewContainer.style.display = 'none';
  if (DOM.receiptOcrStatus) DOM.receiptOcrStatus.style.display = 'none';
  const dropZoneText = DOM.receiptDropZone ? DOM.receiptDropZone.querySelector('span') : null;
  if (dropZoneText) {
    dropZoneText.textContent = 'レシート写真を選択 または ドラッグ';
    dropZoneText.style.color = '#334155';
  }
}

function resetExpenseForm() {
  if (DOM.expenseEditId) DOM.expenseEditId.value = '';
  if (DOM.expenseInputDate) DOM.expenseInputDate.value = getTodayDateString();
  if (DOM.expenseSelectCategory) DOM.expenseSelectCategory.value = '消耗品費';
  if (DOM.expenseInputAmount) DOM.expenseInputAmount.value = '';
  if (DOM.expenseSelectTax) DOM.expenseSelectTax.value = '10';
  if (DOM.expenseInputPayee) DOM.expenseInputPayee.value = '';
  if (DOM.expenseInputInvoiceNum) DOM.expenseInputInvoiceNum.value = '';
  if (DOM.expenseInputNote) DOM.expenseInputNote.value = '';
  if (DOM.expenseInputInQty) DOM.expenseInputInQty.value = '1';
  // 立替者設定を維持
  if (DOM.expenseInputClaimant) DOM.expenseInputClaimant.value = activeExpenseClaimant;
  setActiveExpenseClaimant(activeExpenseClaimant);
  clearReceiptImage();
  switchExpenseEntryType('expense'); // デフォルトは経費として読み込み・登録
  if (DOM.btnSaveExpense) {
    DOM.btnSaveExpense.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 経費を保存する`;
  }
}

function handleSaveExpense() {
  try {
    const date = DOM.expenseInputDate.value;
    const amount = Number(DOM.expenseInputAmount.value);
    const category = DOM.expenseSelectCategory.value;
    const taxRate = Number(DOM.expenseSelectTax.value) || 10;
    const payee = DOM.expenseInputPayee.value.trim();
    const invoiceNumber = DOM.expenseInputInvoiceNum ? DOM.expenseInputInvoiceNum.value.trim() : '';
    const note = DOM.expenseInputNote.value.trim();
    const id = (DOM.expenseEditId ? DOM.expenseEditId.value : undefined) || ('exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const claimant = (DOM.expenseInputClaimant ? DOM.expenseInputClaimant.value : (typeof activeExpenseClaimant !== 'undefined' ? activeExpenseClaimant : '小林俊介')) || '小林俊介';

    if (!date) {
      alert('日付を入力してください。');
      return;
    }
    if (!amount || amount <= 0) {
      alert('有効な金額（1円以上）を入力してください。');
      return;
    }

    const isPurchase = DOM.radioExpenseTypePurchase && DOM.radioExpenseTypePurchase.checked;
    let linkedInventoryId = '';
    let linkedInventoryQty = 1;

    if (isPurchase) {
      linkedInventoryId = DOM.expenseSelectInventoryItem ? DOM.expenseSelectInventoryItem.value : '';
      linkedInventoryQty = DOM.expenseInputInQty ? Math.max(1, parseInt(DOM.expenseInputInQty.value, 10) || 1) : 1;

      if (!linkedInventoryId) {
        alert('仕入れ入庫を行う対象の在庫品目を選択してください。\n（該当する品目がない場合は「＋新規品目」から在庫マスタに登録できます）');
        if (DOM.expenseSelectInventoryItem) DOM.expenseSelectInventoryItem.focus();
        return;
      }
    }

    const tempReceiptDataUrl = (typeof currentReceiptDataUrl !== 'undefined' && currentReceiptDataUrl) ? currentReceiptDataUrl : undefined;

    const expenseItem = {
      id,
      date,
      category: isPurchase ? '仕入高' : category,
      amount,
      taxRate,
      payee,
      invoiceNumber,
      note,
      claimant,
      isSettled: false,
      isCost: isPurchase,
      isPurchase: isPurchase,
      linkedInventoryId: isPurchase ? linkedInventoryId : undefined,
      linkedInventoryQty: isPurchase ? linkedInventoryQty : undefined,
      // ⚠️ localStorageの容量オーバー(QuotaExceededError)を防ぐため、Base64の巨大文字列は初回保存時には空にする
      receiptImage: (tempReceiptDataUrl && tempReceiptDataUrl.startsWith('data:image/')) ? '' : tempReceiptDataUrl
    };

    const savedExp = saveExpense(expenseItem);

    if (isPurchase && linkedInventoryId && linkedInventoryQty > 0) {
      const rawMatchTarget = payee || note || '仕入伝票';
      const unitCost = Math.round(amount / linkedInventoryQty);

      if (typeof adjustStock === 'function') {
        adjustStock(linkedInventoryId, linkedInventoryQty, `仕入入庫: ${payee || '仕入先未指定'}`, {
          sourceRef: savedExp ? savedExp.id : '',
          payee: payee,
          unitCost: unitCost,
          date: date
        });
      }

      if (DOM.expenseCheckSaveMapping && DOM.expenseCheckSaveMapping.checked && rawMatchTarget) {
        if (typeof savePurchaseMapping === 'function') savePurchaseMapping(rawMatchTarget, linkedInventoryId);
      }
      if (typeof renderInventoryTable === 'function') renderInventoryTable();
    }

    // 画像アップロードと後追いのURL更新
    if (savedExp && typeof fetch !== 'undefined') {
      if (tempReceiptDataUrl && tempReceiptDataUrl.startsWith('data:image/')) {
        (window.apiFetch || fetch)('save-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: savedExp.id, image: tempReceiptDataUrl })
        }).then(res => res.json()).then(data => {
          if (data && data.error) {
            alert('画像保存エラー: ' + data.error + '\n詳細: ' + (data.details || ''));
            return;
          }
          if (data && data.url) {
            // アップロード成功後、サーバー上のURLに置き換えて再度保存（これでlocalStorageが軽く保たれる）
            savedExp.receiptImage = data.url;
            savedExp.receiptDataUrl = data.url;
            if (typeof saveExpense === 'function') saveExpense(savedExp);
          }
          if (typeof syncReceiptStorageWithExpenses === 'function') syncReceiptStorageWithExpenses();
          if (typeof syncExpensesWithServer === 'function') syncExpensesWithServer().catch(e => console.warn(e));
        }).catch(e => {
          console.warn('Receipt server storage sync skipped:', e);
          alert('サーバーとの通信エラーで画像を保存できませんでした。');
        });
      } else if (!tempReceiptDataUrl && id) {
        (window.apiFetch || fetch)('delete-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        }).then(() => {
          if (typeof syncReceiptStorageWithExpenses === 'function') syncReceiptStorageWithExpenses();
        }).catch(e => console.warn('Receipt delete skipped:', e));
      } else {
        if (typeof syncReceiptStorageWithExpenses === 'function') syncReceiptStorageWithExpenses();
      }
    }

    if (!tempReceiptDataUrl || !tempReceiptDataUrl.startsWith('data:image/')) {
      if (typeof syncExpensesWithServer === 'function') {
        syncExpensesWithServer().catch(e => console.warn('Server expenses sync error:', e));
      }
    }

    if (typeof resetExpenseForm === 'function') resetExpenseForm();
    
    if (typeof applyAccGlobalPeriod === 'function' && typeof currentAccGlobalPeriod !== 'undefined') {
      applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
    }

    if (window.innerWidth <= 1024 && typeof switchExpenseMobileTab === 'function') {
      switchExpenseMobileTab('list');
    }
    
    if (isPurchase) {
      if (typeof showToast === 'function') showToast(`仕入データを登録し、在庫を +${linkedInventoryQty} 反映しました！`, 'success');
    } else {
      if (typeof showToast === 'function') showToast(id ? '経費データを更新しました！' : '経費と領収書写真を保存しました（電帳法対応）！', 'success');
    }

    if (typeof isDateInPeriod === 'function' && typeof currentAccGlobalPeriod !== 'undefined') {
      if (!isDateInPeriod(date, currentAccGlobalPeriod)) {
        alert(`保存が完了しましたが、日付が「${date}」のため、現在の表示期間外となり一覧には表示されていません。\n表示期間を「すべての期間」に変更してご確認ください。`);
      }
    }
  } catch (err) {
    console.error('handleSaveExpense error:', err);
    alert('保存処理中にエラーが発生しました:\n' + err.message);
  }
}

let isReceiptStorageSynced = false;

/**
 * 登録済み経費と data/receipts/ の写真の1対1対応を同期（孤立ファイルの自動クリーンアップ）
 */
function syncReceiptStorageWithExpenses() {
  if (typeof fetch === 'undefined') return;
  try {
    const expenses = getExpenseList();
    const activeIds = [];
    expenses.forEach(e => {
      if (e.id) activeIds.push(e.id);
      const img = e.receiptImage || e.receiptDataUrl || '';
      if (img.startsWith('/api/receipt/')) {
        const urlId = img.split('/api/receipt/')[1].split('?')[0].trim();
        if (urlId) activeIds.push(urlId);
      }
    });

    (window.apiFetch || fetch)('sync-receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeIds, keepSamples: true })
    }).then(res => res.json()).then(data => {
      if (data && data.deletedCount > 0) {
        console.log(`[領収書写真1対1同期] 孤立した古い写真 ${data.deletedCount} 件を自動削除・クリーンアップしました:`, data.deletedFiles);
      }
    }).catch(e => console.warn('Receipt sync error:', e));
  } catch (err) {
    console.warn('syncReceiptStorageWithExpenses error:', err);
  }
}

function renderAccountingExpenses(periodFilter = currentAccGlobalPeriod) {
  if (!DOM.expenseTableBody) return;

  // 初回表示時にサーバー上の孤立写真を自動クリーンアップして1対1整合性を確保
  if (!isReceiptStorageSynced) {
    isReceiptStorageSynced = true;
    syncReceiptStorageWithExpenses();
  }

  const allExpenses = getExpenseList();

  // 1. 集計対象期間によるフィルタリング（経費専用画面用は独立した期間を使用）
  let filtered = allExpenses.filter(exp => isDateInPeriod(exp.date, typeof currentExpenseGlobalPeriod !== 'undefined' ? currentExpenseGlobalPeriod : {preset: 'all'}));

  // 2. 社員（立替者）による絞り込み
  const claimantFilter = DOM.expenseFilterClaimant ? DOM.expenseFilterClaimant.value : 'all';
  if (claimantFilter && claimantFilter !== 'all') {
    filtered = filtered.filter(exp => (exp.claimant || '小林俊介') === claimantFilter);
  }

  // 3. 未精算のみ絞り込み
  const unsettledOnly = DOM.expenseFilterUnsettledOnly && DOM.expenseFilterUnsettledOnly.checked;
  if (unsettledOnly) {
    filtered = filtered.filter(exp => !exp.isSettled);
  }

  const total = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  if (DOM.expenseListTotalAmount) {
    DOM.expenseListTotalAmount.textContent = `合計: ${formatCurrency(total)} (${filtered.length}件)`;
  }

  if (filtered.length === 0) {
    DOM.expenseTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--slate-400); padding: 32px;">対象の経費データはありません。期間や絞り込み条件を変更するか、レシートを読み込んでください。</td></tr>`;
  } else {
    let html = '';
    filtered.forEach(exp => {
      const catName = ACCOUNT_CATEGORIES[exp.category]?.name || exp.category;
      const receiptImg = exp.receiptImage || exp.receiptDataUrl || '';
      const hasReceipt = !!receiptImg;
      const receiptBadge = hasReceipt
        ? `<div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
             <button type="button" class="btn btn-outline btn-xs" style="background: #eef2ff; color: #4338ca; border-color: #c7d2fe; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;" onclick="window.__previewExpenseReceipt('${exp.id}')">
               🔍 写真
             </button>
             <span style="font-size: 9px; color: #059669; font-weight: 600;">✓ 電帳法保存</span>
           </div>`
        : `<span style="color: var(--slate-400); font-size: 11px;">なし</span>`;

      // 立替者バッジ
      const claimant = exp.claimant || '小林俊介';
      let claimantBadge = `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 11px;">👤 小林俊介</span>`;
      if (claimant === '宮崎真輔') {
        claimantBadge = `<span class="badge" style="background: #fef3c7; color: #92400e; font-weight: 700; font-size: 11px;">👤 宮崎真輔</span>`;
      } else if (claimant === '会社立替/その他') {
        claimantBadge = `<span class="badge" style="background: #f1f5f9; color: #475569; font-size: 11px;">🏢 会社直接</span>`;
      }

      // 精算ステータス（クリックで未精算 ⇄ 精算済切替）
      const isSettled = !!exp.isSettled;
      const settledBtn = isSettled
        ? `<button type="button" class="btn btn-outline btn-xs" style="background: #dcfce7; color: #15803d; border-color: #86efac; font-weight: 700; font-size: 11px; padding: 2px 8px;" onclick="window.__toggleExpenseSettled('${exp.id}', false)" title="クリックして未精算に戻す">✓ 精算済</button>`
        : `<button type="button" class="btn btn-warning btn-xs" style="background: #fef08a; color: #854d0e; border-color: #fde047; font-weight: 700; font-size: 11px; padding: 2px 8px;" onclick="window.__toggleExpenseSettled('${exp.id}', true)" title="クリックして精算済みにする">⏳ 未精算</button>`;

      html += `
        <tr>
          <td>${escapeHtml(exp.date)}</td>
          <td>${claimantBadge}</td>
          <td><span class="badge badge-primary">${escapeHtml(catName)}</span></td>
          <td>
            <div style="font-weight: 600; color: var(--slate-800);">${escapeHtml(exp.payee || '-')}</div>
            ${exp.note ? `<div style="font-size: 11px; color: var(--slate-500); margin-top: 2px;">${escapeHtml(exp.note)}</div>` : ''}
          </td>
          <td style="text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(exp.amount)}</td>
          <td style="text-align: center; font-size: 11px;">${exp.taxRate}%</td>
          <td style="text-align: center;">${receiptBadge}</td>
          <td style="text-align: center;">${settledBtn}</td>
          <td style="text-align: center;">
            <div style="display: flex; gap: 4px; justify-content: center;">
              <button class="btn btn-outline btn-xs" onclick="window.__editExpense('${exp.id}')">編集</button>
              <button class="btn btn-outline btn-xs btn-danger" onclick="window.__deleteExpense('${exp.id}')">削除</button>
            </div>
          </td>
        </tr>
      `;
    });
    DOM.expenseTableBody.innerHTML = html;
  }

  // 財務会計タブ内の経費一覧サマリー台帳も描画（期間フィルター連動）
  const accSummaryBody = document.getElementById('accExpensesSummaryTableBody');
  if (accSummaryBody) {
    const accExpenses = allExpenses.filter(exp => isDateInPeriod(exp.date, periodFilter));
    if (accExpenses.length === 0) {
      accSummaryBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 32px;">対象期間の経費データはありません。「AIレシート読み込み・経費登録画面を開く」からレシートを解析・登録できます。</td></tr>`;
    } else {
      let sumHtml = '';
      accExpenses.forEach(exp => {
        const catName = ACCOUNT_CATEGORIES[exp.category]?.name || exp.category;
        const receiptImg = exp.receiptImage || exp.receiptDataUrl || '';
        const hasReceipt = !!receiptImg;
        const receiptBadge = hasReceipt
          ? `<button type="button" class="btn btn-outline btn-xs" style="background: #eef2ff; color: #4338ca; border-color: #c7d2fe; font-weight: 700; padding: 2px 8px; border-radius: 4px; cursor: pointer;" onclick="window.__previewExpenseReceipt('${exp.id}')">🔍 写真</button>`
          : `<span style="color: var(--slate-400); font-size: 11px;">なし</span>`;
        
        const claimant = exp.claimant || '小林俊介';
        let clBadge = `<span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 10px;">${escapeHtml(claimant)}</span>`;
        if (claimant === '宮崎真輔') {
          clBadge = `<span class="badge" style="background: #fef3c7; color: #92400e; font-size: 10px;">${escapeHtml(claimant)}</span>`;
        }

        sumHtml += `
          <tr>
            <td style="padding: 8px 12px;">${escapeHtml(exp.date)}</td>
            <td style="padding: 8px 12px;">${clBadge}</td>
            <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${escapeHtml(exp.payee || '-')}</td>
            <td style="padding: 8px 12px;"><span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 11px;">${escapeHtml(catName)}</span></td>
            <td style="padding: 8px 12px; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(exp.amount)}</td>
            <td style="padding: 8px 12px; font-family: monospace; font-size: 11px; color: #64748b;">${escapeHtml(exp.invoiceNumber || '-')}</td>
            <td style="padding: 8px 12px; text-align: center;">${receiptBadge}</td>
          </tr>
        `;
      });
      accSummaryBody.innerHTML = sumHtml;
    }
  }
}

window.__toggleExpenseSettled = function(id, newStatus) {
  const expenses = getExpenseList();
  const target = expenses.find(e => e.id === id);
  if (!target) return;
  target.isSettled = !!newStatus;
  target.settledDate = newStatus ? new Date().toISOString().split('T')[0] : null;
  saveExpense(target);
  applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
  showToast(newStatus ? '経費を【精算済み】に更新しました' : '未精算に戻しました', 'info');
};

window.__editExpense = function(id) {
  const expenses = getExpenseList();
  const target = expenses.find(e => e.id === id);
  if (!target) return;

  DOM.expenseEditId.value = target.id;
  DOM.expenseInputDate.value = target.date || getTodayDateString();
  DOM.expenseSelectCategory.value = target.category || 'supplies';
  DOM.expenseInputAmount.value = target.amount || '';
  DOM.expenseSelectTax.value = String(target.taxRate || 10);
  DOM.expenseInputPayee.value = target.payee || '';
  if (DOM.expenseInputInvoiceNum) DOM.expenseInputInvoiceNum.value = target.invoiceNumber || '';
  DOM.expenseInputNote.value = target.note || '';

  if (target.claimant) {
    setActiveExpenseClaimant(target.claimant);
  }

  const rImg = target.receiptImage || target.receiptDataUrl || '';
  if (rImg) {
    currentReceiptDataUrl = rImg;
    DOM.receiptImagePreview.src = rImg;
    DOM.receiptImagePreviewContainer.style.display = 'block';
  } else {
    clearReceiptImage();
  }

  DOM.btnSaveExpense.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> 経費を更新する`;

  DOM.formExpenseInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

window.__deleteExpense = function(id) {
  if (confirm('この経費データを削除しますか？\n※ 保存されている領収書写真もデータフォルダから完全に削除されます。')) {
    const expenses = getExpenseList();
    const target = expenses.find(e => e.id === id);
    const receiptUrl = target ? (target.receiptImage || target.receiptDataUrl || '') : '';

    deleteExpense(id);

    // サーバー上の写真ファイルも連動削除して1対1対応を完全に維持
    if (typeof fetch !== 'undefined') {
      (window.apiFetch || fetch)('delete-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, receiptUrl: receiptUrl })
      }).then(() => {
        syncReceiptStorageWithExpenses();
      }).catch(e => console.warn('Failed to delete receipt photo from server:', e));
    }

    applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
    showToast('経費データと領収書写真を削除しました');
  }
};

window.__previewExpenseReceipt = function(id) {
  const expenses = getExpenseList();
  const target = expenses.find(e => e.id === id);
  if (!target) {
    showToast('経費データが見つかりません', 'error');
    return;
  }
  const rImg = target.receiptImage || target.receiptDataUrl || '';
  if (!rImg) {
    showToast('この経費には領収書写真が登録されていません', 'info');
    return;
  }
  openReceiptZoom(rImg, target);
};

// ==========================================================================
// 複式簿記仕訳帳 コントローラー
// ==========================================================================
function renderAccountingJournals(periodFilter = currentAccGlobalPeriod) {
  if (!DOM.accJournalTableBody) return;
  const invoices = getHistoryList();
  const expenses = getExpenseList();
  const entries = generateJournalEntries(invoices, expenses, periodFilter);

  if (entries.length === 0) {
    DOM.accJournalTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 32px;">仕訳データはありません</td></tr>`;
    return;
  }

  let html = '';
  entries.forEach(e => {
    let typeBadge = '<span class="badge" style="background:#e0e7ff; color:#3730a3;">売上</span>';
    if (e.type === 'receipt') {
      typeBadge = '<span class="badge" style="background:#dcfce7; color:#166534;">入金</span>';
    } else if (e.type === 'expense') {
      typeBadge = '<span class="badge" style="background:#fef3c7; color:#92400e;">経費</span>';
    }

    html += `
      <tr>
        <td>${escapeHtml(e.date)}</td>
        <td style="font-weight: 600; color: var(--slate-800);">${escapeHtml(e.debitAccount)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(e.debitAmount)}</td>
        <td style="font-weight: 600; color: var(--slate-800);">${escapeHtml(e.creditAccount)}</td>
        <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(e.creditAmount)}</td>
        <td style="color: var(--slate-600); font-size: 12px;">${escapeHtml(e.description)}</td>
        <td style="text-align: center;">${typeBadge}</td>
      </tr>
    `;
  });
  DOM.accJournalTableBody.innerHTML = html;
}

function handleExportJournalCSV() {
  const invoices = getHistoryList();
  const expenses = getExpenseList();
  const entries = generateJournalEntries(invoices, expenses, currentAccGlobalPeriod);

  if (entries.length === 0) {
    alert('出力対象の仕訳データがありません。');
    return;
  }

  const periodLabel = currentAccGlobalPeriod.preset === 'all'
    ? '全期間'
    : (currentAccGlobalPeriod.start && currentAccGlobalPeriod.end
        ? `${currentAccGlobalPeriod.start}_${currentAccGlobalPeriod.end}`
        : currentAccGlobalPeriod.preset);

  const csvContent = exportJournalsToCSV(entries);
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `仕訳帳_${periodLabel}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('仕訳帳CSVをダウンロードしました！', 'success');
}

// ==========================================================================
// 経費立替精算書（A4帳票）発行コントローラー
// ==========================================================================
function openExpenseSettlementModal(initialClaimant = '') {
  const modal = DOM.expenseSettlementModal || document.getElementById('expenseSettlementModal');
  if (!modal) {
    console.error('expenseSettlementModal element not found');
    return;
  }

  // まず確実にモーダルを表示する（先行表示）
  modal.classList.add('active');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  const claimantSelect = DOM.settlementModalClaimant || document.getElementById('settlementModalClaimant');
  const targetClaimant = initialClaimant || (typeof activeExpenseClaimant !== 'undefined' ? activeExpenseClaimant : '') || '小林俊介';
  if (claimantSelect) {
    claimantSelect.value = targetClaimant;
  }

  // 財務会計の現在の集計期間または当月を初期セット
  let range = { start: '', end: '' };
  if (typeof currentAccGlobalPeriod !== 'undefined' && currentAccGlobalPeriod && currentAccGlobalPeriod.start && currentAccGlobalPeriod.end) {
    range = { start: currentAccGlobalPeriod.start, end: currentAccGlobalPeriod.end };
  } else if (typeof getPresetPeriodRange === 'function') {
    range = getPresetPeriodRange('thisMonth');
  }

  const startInput = DOM.settlementModalPeriodStart || document.getElementById('settlementModalPeriodStart');
  const endInput = DOM.settlementModalPeriodEnd || document.getElementById('settlementModalPeriodEnd');
  const unsettledCheck = DOM.settlementModalUnsettledOnly || document.getElementById('settlementModalUnsettledOnly');

  if (startInput) startInput.value = range.start || '';
  if (endInput) endInput.value = range.end || '';
  if (unsettledCheck) unsettledCheck.checked = true;

  try {
    renderExpenseSettlementSheet();
  } catch (err) {
    console.error('Error rendering expense settlement sheet:', err);
  }
}

function closeExpenseSettlementModal() {
  const modal = DOM.expenseSettlementModal || document.getElementById('expenseSettlementModal');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
  document.body.style.overflow = '';
}

window.openExpenseSettlementModal = openExpenseSettlementModal;
window.closeExpenseSettlementModal = closeExpenseSettlementModal;

function renderExpenseSettlementSheet() {
  const claimantSelect = DOM.settlementModalClaimant || document.getElementById('settlementModalClaimant');
  const claimant = claimantSelect ? claimantSelect.value : '小林俊介';
  const startInput = DOM.settlementModalPeriodStart || document.getElementById('settlementModalPeriodStart');
  const start = startInput ? startInput.value : '';
  const endInput = DOM.settlementModalPeriodEnd || document.getElementById('settlementModalPeriodEnd');
  const end = endInput ? endInput.value : '';
  const unsettledCheck = DOM.settlementModalUnsettledOnly || document.getElementById('settlementModalUnsettledOnly');
  const unsettledOnly = unsettledCheck ? unsettledCheck.checked : false;

  const allExpenses = typeof getExpenseList === 'function' ? getExpenseList() : [];
  let items = allExpenses.filter(exp => {
    if (typeof isDateInPeriod === 'function') {
      return isDateInPeriod(exp.date, { start, end });
    }
    return true;
  });

  if (claimant && claimant !== 'all') {
    items = items.filter(exp => (exp.claimant || '小林俊介') === claimant);
  }

  if (unsettledOnly) {
    items = items.filter(exp => !exp.isSettled);
  }

  // 日付昇順ソート
  items.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 申請日・期間・氏名のセット
  const today = new Date();
  const todayStr = `${today.getFullYear()}年${String(today.getMonth() + 1).padStart(2, '0')}月${String(today.getDate()).padStart(2, '0')}日`;
  const applyDateEl = DOM.settlementSheetApplyDate || document.getElementById('settlementSheetApplyDate');
  if (applyDateEl) {
    applyDateEl.textContent = todayStr;
  }
  const periodEl = DOM.settlementSheetPeriod || document.getElementById('settlementSheetPeriod');
  if (periodEl) {
    const s = start ? start.replace(/-/g, '/') : '〜';
    const e = end ? end.replace(/-/g, '/') : '現在';
    periodEl.textContent = `${s} 〜 ${e}`;
  }
  const claimantNameEl = DOM.settlementSheetClaimantName || document.getElementById('settlementSheetClaimantName');
  if (claimantNameEl) {
    claimantNameEl.textContent = claimant === 'all' ? '全社員（一覧）' : claimant;
  }

  // 金額集計
  let grandTotal = 0;
  let tax10Subtotal = 0;
  let tax8Subtotal = 0;

  items.forEach(it => {
    const amt = Number(it.amount) || 0;
    const rate = Number(it.taxRate !== undefined ? it.taxRate : 10);
    grandTotal += amt;
    if (rate === 8) {
      tax8Subtotal += amt;
    } else {
      tax10Subtotal += amt;
    }
  });

  const itemCountEl = DOM.settlementSheetItemCount || document.getElementById('settlementSheetItemCount');
  if (itemCountEl) {
    itemCountEl.textContent = items.length;
  }
  const tax10El = DOM.settlementSheetTax10Subtotal || document.getElementById('settlementSheetTax10Subtotal');
  if (tax10El) {
    tax10El.textContent = typeof formatCurrency === 'function' ? formatCurrency(tax10Subtotal) : `¥${tax10Subtotal.toLocaleString()}`;
  }
  const tax8El = DOM.settlementSheetTax8Subtotal || document.getElementById('settlementSheetTax8Subtotal');
  if (tax8El) {
    tax8El.textContent = typeof formatCurrency === 'function' ? formatCurrency(tax8Subtotal) : `¥${tax8Subtotal.toLocaleString()}`;
  }
  const grandTotalEl = DOM.settlementSheetGrandTotal || document.getElementById('settlementSheetGrandTotal');
  if (grandTotalEl) {
    grandTotalEl.textContent = typeof formatCurrency === 'function' ? formatCurrency(grandTotal) : `¥${grandTotal.toLocaleString()}`;
  }

  // 明細テーブル描画
  const tableBody = DOM.settlementSheetTableBody || document.getElementById('settlementSheetTableBody');
  if (tableBody) {
    if (items.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: #94a3b8; padding: 32px 16px;">
            対象となる経費明細がありません。対象期間や申請者の絞り込み条件をご確認ください。
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    items.forEach((it, idx) => {
      const catName = ACCOUNT_CATEGORIES[it.category]?.name || it.category || '経費';
      const isSettled = !!it.isSettled;
      const statusText = isSettled
        ? '<span style="color: #15803d; font-weight: 700;">精算済</span>'
        : '<span style="color: #b45309; font-weight: 700;">未精算</span>';

      rowsHtml += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 4px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 6px;">${escapeHtml(it.date || '-')}</td>
          <td style="padding: 6px 6px; font-weight: 600;">${escapeHtml(catName)}</td>
          <td style="padding: 6px 6px;">${escapeHtml(it.payee || '-')}</td>
          <td style="padding: 6px 6px; color: #475569;">${escapeHtml(it.note || '-')}</td>
          <td style="padding: 6px 4px; text-align: center;">${it.taxRate}%</td>
          <td style="padding: 6px 6px; text-align: right; font-weight: 700; font-family: monospace;">${formatCurrency(it.amount)}</td>
          <td style="padding: 6px 4px; text-align: center; font-size: 11px;">${statusText}</td>
        </tr>
      `;
    });
    tableBody.innerHTML = rowsHtml;
  }
}

function handlePrintExpenseSettlement() {
  window.print();
}

function handleMarkExpensesSettled() {
  const claimant = DOM.settlementModalClaimant ? DOM.settlementModalClaimant.value : '小林俊介';
  const start = DOM.settlementModalPeriodStart ? DOM.settlementModalPeriodStart.value : '';
  const end = DOM.settlementModalPeriodEnd ? DOM.settlementModalPeriodEnd.value : '';

  const allExpenses = getExpenseList();
  let unsettledItems = allExpenses.filter(exp => !exp.isSettled && isDateInPeriod(exp.date, { start, end }));

  if (claimant && claimant !== 'all') {
    unsettledItems = unsettledItems.filter(exp => (exp.claimant || '小林俊介') === claimant);
  }

  if (unsettledItems.length === 0) {
    alert('精算対象の未精算経費がありません。');
    return;
  }

  const targetLabel = claimant === 'all' ? '全員' : claimant;
  if (!confirm(`【${targetLabel}】様の未精算経費 ${unsettledItems.length} 件を一括で「精算済み」に更新しますか？`)) {
    return;
  }

  const ids = unsettledItems.map(i => i.id);
  const count = markExpensesSettled(ids);
  renderExpenseSettlementSheet();
  applyAccGlobalPeriod(currentAccGlobalPeriod.preset);
  showToast(`🎉 ${count} 件の経費を一括精算済みに更新しました！`, 'success');
}

// ==========================================================================
// 勤怠打刻（タイムカード） コントローラー
// ==========================================================================
function openAttendanceModal() {
  if (currentAppView !== 'attendance') {
    switchAppView('attendance');
    return;
  }
  updateAttendanceLiveClock();
  if (attendanceClockInterval) clearInterval(attendanceClockInterval);
  attendanceClockInterval = setInterval(updateAttendanceLiveClock, 1000);
  updateAttendanceUI();
}

function closeAttendanceModal() {
  if (attendanceClockInterval) {
    clearInterval(attendanceClockInterval);
    attendanceClockInterval = null;
  }
  switchAppView('portal');
}

window.openAttendanceModal = openAttendanceModal;
window.closeAttendanceModal = closeAttendanceModal;

function updateAttendanceLiveClock() {
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const dayStr = days[now.getDay()];

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  if (DOM.attendanceLiveDate) {
    DOM.attendanceLiveDate.textContent = `${y}年${m}月${d}日 (${dayStr})`;
  }
  if (DOM.attendanceLiveTime) {
    DOM.attendanceLiveTime.textContent = `${hh}:${mm}:${ss}`;
  }
}

// ==========================================================================
// 勤怠月別フィルター ＆ CSV出力ロジック
// ==========================================================================
let currentAttendanceFilterMonth = getTodayDateString().substring(0, 7);

function populateAttendanceMonthFilter() {
  const select = DOM.attendanceMonthFilter || document.getElementById('attendanceMonthFilter');
  if (!select) return;

  const currentVal = currentAttendanceFilterMonth || getTodayDateString().substring(0, 7);
  const now = new Date();
  const options = [];

  // 1. 直近12ヶ月分（当月から過去11ヶ月前まで）
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const ym = `${y}-${m}`;
    options.push({
      value: ym,
      label: i === 0 ? `${y}年${m}月（当月）` : `${y}年${m}月`
    });
  }

  // 2. 打刻履歴に12ヶ月より前のデータが存在すればそれらも追加
  const list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];
  const extraMonths = new Set();
  list.forEach(item => {
    const dStr = item.date || item.workDate || '';
    if (dStr && dStr.length >= 7) {
      const ym = dStr.substring(0, 7);
      if (!options.some(o => o.value === ym)) {
        extraMonths.add(ym);
      }
    }
  });
  Array.from(extraMonths).sort((a, b) => b.localeCompare(a)).forEach(ym => {
    const [y, m] = ym.split('-');
    options.push({
      value: ym,
      label: `${y}年${m}月`
    });
  });

  // 3. 全期間の選択肢を追加
  options.push({
    value: 'all',
    label: '全期間（すべて）'
  });

  // select要素のoptionを構築
  let html = '';
  options.forEach(opt => {
    const isSelected = opt.value === currentVal ? ' selected' : '';
    html += `<option value="${opt.value}"${isSelected}>${escapeHtml(opt.label)}</option>`;
  });
  select.innerHTML = html;
  select.value = currentVal;
}

function handleAttendanceMonthFilterChange(selectedMonth) {
  console.log("【勤怠月別フィルター】切り替え", selectedMonth);
  currentAttendanceFilterMonth = selectedMonth || getTodayDateString().substring(0, 7);
  updateAttendanceFilterView();
}
window.handleAttendanceMonthFilterChange = handleAttendanceMonthFilterChange;

function updateAttendanceFilterView() {
  console.log("【勤怠表示更新】実行開始", { filterMonth: currentAttendanceFilterMonth });
  const list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];
  const isAll = currentAttendanceFilterMonth === 'all';
  const currentYM = isAll ? 'all' : (currentAttendanceFilterMonth || getTodayDateString().substring(0, 7));

  // 1. 実績サマリー集計
  const summary = calculateMonthlyAttendance(list, currentYM);

  // 見出し更新
  const summaryTitleEl = DOM.attendanceSummaryTitle || document.getElementById('attendanceSummaryTitle');
  if (summaryTitleEl) {
    if (isAll) {
      summaryTitleEl.textContent = '全期間の勤怠実績サマリー';
    } else {
      const [y, m] = currentYM.split('-');
      const todayYM = getTodayDateString().substring(0, 7);
      if (currentYM === todayYM) {
        summaryTitleEl.textContent = `今月の勤怠実績サマリー（${y}年${m}月）`;
      } else {
        summaryTitleEl.textContent = `${y}年${m}月の勤怠実績サマリー`;
      }
    }
  }

  // 出勤日数、総実働時間、総残業時間の更新
  if (DOM.summaryWorkDays) {
    DOM.summaryWorkDays.textContent = `${summary.workDays}日`;
  }
  if (DOM.summaryTotalWorkHours) {
    DOM.summaryTotalWorkHours.textContent = formatMinutesToHours(summary.totalWorkMinutes);
  }
  if (DOM.summaryTotalOvertime) {
    DOM.summaryTotalOvertime.textContent = formatMinutesToHours(summary.totalOvertimeMinutes);
  }

  // 2. 打刻履歴テーブルの描画
  renderAttendanceHistoryTable();
}

function handleExportAttendanceCSV() {
  console.log("【勤怠CSV出力】実行開始", { targetMonth: currentAttendanceFilterMonth });
  try {
    const list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];
    const isAll = currentAttendanceFilterMonth === 'all';
    const targetMonth = isAll ? 'all' : (currentAttendanceFilterMonth || getTodayDateString().substring(0, 7));
    const csvContent = exportAttendanceToCSV(list, targetMonth);

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = isAll
      ? `出勤簿_全期間_${getTodayDateString()}.csv`
      : `出勤簿_${targetMonth}.csv`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log("【勤怠CSV出力】完了", { fileName });
    showToast(`勤怠集計CSV（${isAll ? '全期間' : targetMonth}）をダウンロードしました！`, 'success');
  } catch (err) {
    console.error("【勤怠CSV出力】エラー", err);
    showToast('CSV出力中にエラーが発生しました', 'error');
  }
}
window.handleExportAttendanceCSV = handleExportAttendanceCSV;

function updateAttendanceUI() {
  const todayRec = getTodayAttendance();

  // 本日のステータス表示
  let statusText = '未出勤';
  let statusColor = 'var(--slate-500)';

  if (todayRec) {
    if (todayRec.clockIn && !todayRec.clockOut) {
      statusText = '勤務中（休憩1h自動控除）';
      statusColor = 'var(--indigo-600)';
    } else if (todayRec.clockIn && todayRec.clockOut) {
      statusText = '退勤済（本日業務終了）';
      statusColor = 'var(--emerald-600)';
    }
  }

  if (DOM.attendanceTodayStatusText) {
    DOM.attendanceTodayStatusText.textContent = statusText;
    DOM.attendanceTodayStatusText.style.color = statusColor;
  }

  // 出勤ボタン
  if (DOM.btnClockIn) {
    if (todayRec && todayRec.clockIn) {
      DOM.btnClockIn.disabled = true;
      DOM.btnClockIn.style.opacity = '0.6';
    } else {
      DOM.btnClockIn.disabled = false;
      DOM.btnClockIn.style.opacity = '1';
    }
  }
  if (DOM.displayClockInTime) {
    DOM.displayClockInTime.textContent = todayRec && todayRec.clockIn ? `打刻: ${todayRec.clockIn}` : '未打刻';
  }

  // 退勤ボタン
  if (DOM.btnClockOut) {
    if (todayRec && todayRec.clockOut) {
      DOM.btnClockOut.disabled = true;
      DOM.btnClockOut.style.opacity = '0.6';
      DOM.btnClockOut.title = '本日の退勤打刻は完了しています';
    } else {
      DOM.btnClockOut.disabled = false;
      DOM.btnClockOut.style.opacity = '1';
      DOM.btnClockOut.title = '';
    }
  }
  if (DOM.displayClockOutTime) {
    DOM.displayClockOutTime.textContent = todayRec && todayRec.clockOut ? `打刻: ${todayRec.clockOut}` : '未打刻';
  }

  // 月別フィルターの選択肢を更新
  populateAttendanceMonthFilter();

  // 月別集計サマリー ＆ 履歴テーブルを更新
  updateAttendanceFilterView();
}

function handleClockIn() {
  const rec = clockInToday();
  showToast(`出勤打刻しました（${rec.clockIn}）`, 'success');
  updateAttendanceUI();
}

function handleClockOut() {
  const todayRec = getTodayAttendance();
  if (!todayRec || !todayRec.clockIn) {
    if (!confirm('本日の出勤打刻がまだされていません。退勤時刻のみ打刻しますか？\n（出勤時刻は後から「打刻修正」で追加・変更できます）')) {
      return;
    }
  }
  const rec = clockOutToday();
  showToast(`退勤打刻しました（${rec.clockOut}）。お疲れ様でした！`, 'success');
  updateAttendanceUI();
}

function renderAttendanceHistoryTable() {
  const tableBody = DOM.attendanceTableBody || document.getElementById('attendanceTableBody');
  if (!tableBody) return;
  const list = typeof getAttendanceList === 'function' ? getAttendanceList() : [];

  const isAll = currentAttendanceFilterMonth === 'all';
  const filterYM = isAll ? '' : (currentAttendanceFilterMonth || getTodayDateString().substring(0, 7));

  // 有効なレコードかつ対象期間で絞り込み
  const validList = list.filter(r => {
    if (!r) return false;
    const dateVal = r.date || r.workDate || (r.rawRecord && r.rawRecord.targetMonth ? r.rawRecord.targetMonth + '-01' : '');
    if (!dateVal) return false;
    if (isAll) return true;
    return dateVal.startsWith(filterYM);
  });

  // バッジ表示の更新
  const badgeEl = DOM.attendanceHistoryFilterBadge || document.getElementById('attendanceHistoryFilterBadge');
  if (badgeEl) {
    if (isAll) {
      badgeEl.textContent = `全期間（${validList.length}件）`;
    } else {
      const [y, m] = filterYM.split('-');
      badgeEl.textContent = `${y}年${m}月（${validList.length}件）`;
    }
  }

  if (validList.length === 0) {
    const emptyMsg = isAll
      ? '打刻履歴はありません'
      : `${filterYM.replace('-', '年')}月の打刻履歴はありません`;
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 24px;">${escapeHtml(emptyMsg)}</td></tr>`;
    return;
  }

  const sorted = [...validList].sort((a, b) => {
    const dateA = a.date || a.workDate || '';
    const dateB = b.date || b.workDate || '';
    return dateB.localeCompare(dateA);
  });

  let html = '';
  sorted.forEach(r => {
    const dateVal = r.date || r.workDate || (r.rawRecord && r.rawRecord.targetMonth ? r.rawRecord.targetMonth + '-01' : '') || '-';
    const clockInVal = r.clockIn || r.startTime || r.inTime || (r.workHours ? '09:00' : '-');
    const clockOutVal = r.clockOut || r.endTime || r.outTime || (r.workHours ? '18:00' : '-');
    let breakVal = '-';
    if (r.breakHours || (clockInVal !== '-' && clockOutVal !== '-')) {
      breakVal = '1時間（自動）';
    }
    
    const duration = calculateWorkDuration(clockInVal === '-' ? '' : clockInVal, clockOutVal === '-' ? '' : clockOutVal);
    
    let workHoursVal = r.workHours || (r.rawRecord ? r.rawRecord.workHoursStandard : '') || '';
    if (!workHoursVal && clockInVal !== '-' && clockOutVal !== '-') {
      workHoursVal = formatMinutesToDecimalHours(duration.workMinutes, true);
    }
    
    let formattedWorkHours = '-';
    const parsedWork = parseFloat(String(workHoursVal).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedWork) && parsedWork > 0) {
      formattedWorkHours = parsedWork.toFixed(2) + '時間';
    }
    
    let overtimeHoursVal = r.overtimeHours !== undefined ? r.overtimeHours : (r.rawRecord && r.rawRecord.overtimeHours !== undefined ? r.rawRecord.overtimeHours : '');
    if (overtimeHoursVal === '' && clockInVal !== '-' && clockOutVal !== '-') {
      overtimeHoursVal = duration.overtimeMinutes > 0 ? formatMinutesToDecimalHours(duration.overtimeMinutes, true) : '0';
    }

    let formattedOvertime = '0.00時間';
    const parsedOt = parseFloat(String(overtimeHoursVal).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedOt)) {
      formattedOvertime = parsedOt.toFixed(2) + '時間';
    }
    const otNum = parsedOt || 0;

    html += `
      <tr>
        <td style="font-weight: 600; text-align: left; padding: 8px 10px;">${escapeHtml(dateVal)}</td>
        <td style="font-family: monospace; text-align: center; padding: 8px 10px;">${escapeHtml(clockInVal)}</td>
        <td style="font-family: monospace; text-align: center; padding: 8px 10px;">${escapeHtml(clockOutVal)}</td>
        <td style="color: var(--slate-500); font-size: 12px; text-align: center; padding: 8px 10px;">${escapeHtml(breakVal)}</td>
        <td style="font-weight: 700; color: var(--indigo-700); font-family: monospace; text-align: center; padding: 8px 10px;">${escapeHtml(formattedWorkHours)}</td>
        <td style="font-weight: 600; color: ${otNum > 0 ? '#e11d48' : 'var(--slate-500)'}; font-family: monospace; text-align: center; padding: 8px 10px;">${escapeHtml(formattedOvertime)}</td>
        <td style="text-align: center; white-space: nowrap; padding: 8px 10px;">
          <button type="button" class="btn btn-secondary btn-xs" style="margin-right: 4px; padding: 2px 6px;" onclick="window.__editAttendanceRecord('${dateVal}')">修正</button>
          <button type="button" class="btn btn-outline btn-xs btn-danger" style="padding: 2px 6px;" onclick="window.__deleteAttendanceRecord('${dateVal}', '${r.id || ''}')">削除</button>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
}

window.__deleteAttendanceRecord = async function(date, id = '') {
  if (confirm(`${date} の打刻データを削除しますか？`)) {
    if (id) deleteAttendance(id);
    deleteAttendance(date);
    updateAttendanceUI();
    if (DOM.attendanceSheetModal && DOM.attendanceSheetModal.classList.contains('active')) {
      renderAttendanceCalendarSheet(currentSheetYM);
    }
    showToast(`${date} の打刻データを削除しました（ファイル同期完了）`, 'success');
  }
};

// ==========================================================================
// 打刻漏れ手動入力・修正フォーム制御
// ==========================================================================
function toggleManualAttendanceForm(show = null, dateToEdit = '') {
  if (!DOM.attendanceManualFormCard) return;
  const isHidden = DOM.attendanceManualFormCard.style.display === 'none';
  const shouldShow = show !== null ? show : isHidden;

  if (shouldShow) {
    DOM.attendanceManualFormCard.style.display = 'block';
    if (dateToEdit) {
      // 既存レコードの修正
      const list = getAttendanceList();
      const rec = list.find(a => a.date === dateToEdit);
      if (DOM.attendanceManualFormTitle) DOM.attendanceManualFormTitle.textContent = `✏️ 打刻修正: ${dateToEdit}`;
      if (DOM.inputManualAttDate) {
        DOM.inputManualAttDate.value = dateToEdit;
        DOM.inputManualAttDate.readOnly = true;
      }
      if (DOM.inputManualAttClockIn) DOM.inputManualAttClockIn.value = rec ? (rec.clockIn || '') : '';
      if (DOM.inputManualAttClockOut) DOM.inputManualAttClockOut.value = rec ? (rec.clockOut || '') : '';
      if (DOM.inputManualAttNote) DOM.inputManualAttNote.value = rec ? (rec.note || '') : '';
      if (DOM.inputManualAttId) DOM.inputManualAttId.value = rec ? (rec.id || '') : '';
    } else {
      // 新規入力（打刻漏れ追加）
      if (DOM.attendanceManualFormTitle) DOM.attendanceManualFormTitle.textContent = '✏️ 打刻漏れ修正・過去の勤怠入力';
      if (DOM.inputManualAttDate) {
        DOM.inputManualAttDate.value = getTodayDateString();
        DOM.inputManualAttDate.readOnly = false;
      }
      if (DOM.inputManualAttClockIn) DOM.inputManualAttClockIn.value = '09:00';
      if (DOM.inputManualAttClockOut) DOM.inputManualAttClockOut.value = '18:00';
      if (DOM.inputManualAttNote) DOM.inputManualAttNote.value = '';
      if (DOM.inputManualAttId) DOM.inputManualAttId.value = '';
    }
    if (DOM.inputManualAttClockIn) DOM.inputManualAttClockIn.focus();
  } else {
    DOM.attendanceManualFormCard.style.display = 'none';
  }
}

window.__editAttendanceRecord = function(date) {
  toggleManualAttendanceForm(true, date);
};

function handleSaveManualAttendance() {
  const date = DOM.inputManualAttDate?.value;
  const clockIn = DOM.inputManualAttClockIn?.value || '';
  const clockOut = DOM.inputManualAttClockOut?.value || '';
  const note = DOM.inputManualAttNote?.value || '';

  console.log("【勤怠手動保存】実行開始", { date, clockIn, clockOut, note });

  if (!date) {
    alert('勤務日を選択してください。');
    return;
  }
  if (!clockIn) {
    alert('出勤（始業）時刻を入力してください。');
    return;
  }

  const savedRec = saveAttendance({
    id: DOM.inputManualAttId?.value || ('att_' + date),
    date,
    clockIn,
    clockOut,
    note
  });

  if (savedRec) {
    console.log("【勤怠手動保存】ローカル保存成功", savedRec);
    showToast(`${date} の勤怠データを保存しました！`, 'success');
    toggleManualAttendanceForm(false);
    updateAttendanceUI();
    // もし出勤簿モーダルが開いていればそちらも再描画
    if (DOM.attendanceSheetModal && DOM.attendanceSheetModal.classList.contains('active')) {
      renderAttendanceCalendarSheet(currentSheetYM);
    }
  }
}

// ==========================================================================
// 出勤簿（A4帳票）モーダル制御
// ==========================================================================
let currentSheetYM = getTodayDateString().substring(0, 7);

function openAttendanceSheetModal(targetYM = '') {
  try {
    const modal = DOM.attendanceSheetModal || document.getElementById('attendanceSheetModal');
    if (modal) {
      modal.classList.add('active');
    }
    document.body.style.overflow = 'hidden';

    let fallbackYM = currentAttendanceFilterMonth;
    if (fallbackYM === 'all' || !fallbackYM) fallbackYM = getTodayDateString().substring(0, 7);
    currentSheetYM = targetYM || fallbackYM;
    const selector = DOM.sheetMonthSelector || document.getElementById('sheetMonthSelector');
    if (selector) {
      selector.value = currentSheetYM;
    }
    
    // 社員番号・氏名の初期反映
    if (typeof getAttendanceEmployee === 'function') {
      const emp = getAttendanceEmployee();
      const empNo = DOM.inputSheetEmpNo || document.getElementById('inputSheetEmpNo');
      const empName = DOM.inputSheetEmpName || document.getElementById('inputSheetEmpName');
      if (empNo) empNo.value = emp.empNo || '2';
      if (empName) empName.value = emp.empName || '宮崎真輔';
    }

    if (typeof renderAttendanceCalendarSheet === 'function') {
      renderAttendanceCalendarSheet(currentSheetYM);
    }
  } catch (err) {
    console.error('openAttendanceSheetModal error:', err);
    const modal = document.getElementById('attendanceSheetModal');
    if (modal) modal.classList.add('active');
  }
}

function closeAttendanceSheetModal() {
  const modal = DOM.attendanceSheetModal || document.getElementById('attendanceSheetModal');
  if (modal) {
    modal.classList.remove('active');
  }
  document.body.style.overflow = '';
}
window.openAttendanceSheetModal = openAttendanceSheetModal;
window.closeAttendanceSheetModal = closeAttendanceSheetModal;

function changeSheetMonth(diff) {
  const [yStr, mStr] = currentSheetYM.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) + diff;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  currentSheetYM = `${y}-${String(m).padStart(2, '0')}`;
  if (DOM.sheetMonthSelector) {
    DOM.sheetMonthSelector.value = currentSheetYM;
  }
  renderAttendanceCalendarSheet(currentSheetYM);
}

function renderAttendanceCalendarSheet(ymStr) {
  if (!ymStr) return;
  const [yearStr, monthStr] = ymStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (DOM.dispSheetYear) DOM.dispSheetYear.textContent = String(year);
  if (DOM.dispSheetMonth) DOM.dispSheetMonth.textContent = String(month);

  const sheetData = generateMonthlyCalendarSheet(getAttendanceList(), year, month);
  if (!DOM.attCalendarTableBody) return;

  let html = '';
  sheetData.days.forEach(day => {
    let rowClass = '';
    if (day.isWeekend) {
      rowClass = day.isSaturday ? 'att-weekend-tr att-saturday-tr' : 'att-weekend-tr att-sunday-tr';
    }

    const inText = day.clockInParts.text || (day.isWeekend ? '' : ':');
    const outText = day.clockOutParts.text || (day.isWeekend ? '' : ':');
    const regText = day.regularDecimal || (day.clockIn && day.clockOut ? '0.00' : (day.isWeekend ? '' : '-'));
    const otText = day.overtimeDecimal || (day.clockIn && day.clockOut ? '0.00' : (day.isWeekend ? '' : '-'));

    html += `
      <tr class="${rowClass}" data-date="${day.date}" title="クリックしてこの日の勤怠を修正・入力">
        <td style="text-align: center; font-weight: 600;">${day.day}</td>
        <td style="text-align: center; font-weight: 600;">${day.weekday}</td>
        <td class="att-time-cell" onclick="window.__quickEditAttendanceDate('${day.date}')">${escapeHtml(inText)}</td>
        <td class="att-time-cell" onclick="window.__quickEditAttendanceDate('${day.date}')">${escapeHtml(outText)}</td>
        <td class="att-time-cell" onclick="window.__quickEditAttendanceDate('${day.date}')" style="font-weight: 600; font-family: monospace;">${escapeHtml(regText)}</td>
        <td class="att-time-cell" onclick="window.__quickEditAttendanceDate('${day.date}')" style="font-weight: 600; font-family: monospace; color: ${day.overtimeMinutes > 0 ? '#e11d48' : 'inherit'};">${escapeHtml(otText)}</td>
        <td class="att-note-cell" onclick="window.__quickEditAttendanceDate('${day.date}')">${escapeHtml(day.note)}</td>
      </tr>
    `;
  });

  DOM.attCalendarTableBody.innerHTML = html;

  // サマリー合計更新（時間単位・小数点以下10進法換算表示）
  if (DOM.dispSheetSummaryDays) DOM.dispSheetSummaryDays.textContent = String(sheetData.summary.workDays);
  if (DOM.dispSheetSummaryRegular) DOM.dispSheetSummaryRegular.textContent = `${sheetData.summary.totalRegularDecimalText} 時間`;
  if (DOM.dispSheetSummaryOvertime) DOM.dispSheetSummaryOvertime.textContent = `${sheetData.summary.totalOvertimeDecimalText} 時間`;
  if (DOM.dispSheetSummaryTotal) {
    DOM.dispSheetSummaryTotal.textContent = `総実働: ${sheetData.summary.totalWorkHoursText}`;
  }
}

window.__quickEditAttendanceDate = function(date) {
  // 出勤簿の行クリックで打刻漏れ修正フォームを呼出
  toggleManualAttendanceForm(true, date);
  // 勤怠モーダルが見えるように前面へスクロール
  if (DOM.attendanceManualFormCard) {
    DOM.attendanceManualFormCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};

function handlePrintAttendanceSheet() {
  const modalPaper = document.getElementById('attendanceSheetPaper');
  if (!modalPaper) return;

  const htmlContent = modalPaper.outerHTML;
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定で許可してください。');
    return;
  }

  const doc = printWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>出勤簿 印刷</title>
      <link rel="stylesheet" href="css/style.css">
      <link rel="stylesheet" href="css/print.css">
      <style>
        body { margin: 0; padding: 20px; background: #fff; }
        .no-print { display: none !important; }
        @media print {
          body { padding: 0; }
          .attendance-sheet-paper {
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  doc.close();
}

// ==========================================================================
// 給与計算アプリ コントローラー
// （宮崎真輔様・社員番号2・月給制20万円・勤怠連動・手動微調整・A4明細印刷）
// ==========================================================================

let currentPayrollMonth = '2026-09';
let currentPayrollRecord = null;
let payrollListenersInitialized = false;

function initPayroll() {
  // 1. 年月セレクターの初期化（勤怠打刻がある最新月、または当月を最優先）
  if (!DOM.payrollMonthSelector) return;

  const todayYm = getTodayDateString().substring(0, 7) || '2026-09';
  const attList = getAttendanceList();
  const latestAttDate = (attList && attList.length > 0) ? attList[0].date : '';
  const latestAttYm = latestAttDate ? latestAttDate.substring(0, 7) : todayYm;

  if (!DOM.payrollMonthSelector.value) {
    currentPayrollMonth = latestAttYm || todayYm;
    DOM.payrollMonthSelector.value = currentPayrollMonth;
  } else {
    currentPayrollMonth = DOM.payrollMonthSelector.value;
  }

  // 2. イベントリスナーの接続（初回のみ）
  if (!payrollListenersInitialized) {
    setupPayrollEventListeners();
    payrollListenersInitialized = true;
  }

  // 3. 設定値のフォーム反映
  populatePayrollSettingsToForm();

  // 3-2. 前年所得データのフォーム反映と住民税試算
  populatePreviousYearIncomeToForm();

  // 4. 当月給与データのロード＆描画
  loadPayrollRecordForMonth(currentPayrollMonth);

  // 5. 履歴一覧の描画
  renderPayrollHistoryTable();
}

function setupPayrollEventListeners() {
  // 年月セレクター変更
  DOM.payrollMonthSelector?.addEventListener('change', (e) => {
    currentPayrollMonth = e.target.value;
    loadPayrollRecordForMonth(currentPayrollMonth);
  });

  // 前月 / 次月 ボタン
  DOM.btnPayrollPrevMonth?.addEventListener('click', () => changePayrollMonth(-1));
  DOM.btnPayrollNextMonth?.addEventListener('click', () => changePayrollMonth(1));

  // 勤怠から自動読込
  DOM.btnPayrollImportAttendance?.addEventListener('click', handleImportAttendanceToPayroll);

  // 育児休業コントロールのイベントリスナー
  DOM.checkPayIsChildcare?.addEventListener('change', () => {
    recalculatePayrollWithChildcareRules();
  });
  DOM.checkPayExemptSocial?.addEventListener('change', () => {
    recalculatePayrollWithChildcareRules();
  });
  DOM.selectPayDailyWageType?.addEventListener('change', (e) => {
    if (DOM.wrapperPayDailyWageUnit) {
      DOM.wrapperPayDailyWageUnit.style.display = e.target.value === 'fixedDaily' ? 'inline-flex' : 'none';
    }
    recalculatePayrollWithChildcareRules();
  });
  DOM.inputPayDailyWageUnit?.addEventListener('input', () => {
    recalculatePayrollWithChildcareRules();
  });

  // 保存ボタン
  DOM.btnPayrollSave?.addEventListener('click', handleSavePayrollRecord);

  // 設定パネルトグル
  DOM.btnPayrollToggleSettings?.addEventListener('click', () => {
    if (!DOM.payrollSettingsCard) return;
    const isHidden = DOM.payrollSettingsCard.style.display === 'none';
    DOM.payrollSettingsCard.style.display = isHidden ? 'block' : 'none';
  });
  DOM.btnClosePayrollSettings?.addEventListener('click', () => {
    if (DOM.payrollSettingsCard) DOM.payrollSettingsCard.style.display = 'none';
  });
  DOM.btnSavePayrollSettings?.addEventListener('click', handleSavePayrollSettingsFromForm);
  DOM.settingPayEmploymentType?.addEventListener('change', (e) => {
    if (e.target.value === 'rate') {
      if (DOM.settingPayEmploymentRate) DOM.settingPayEmploymentRate.value = 0.0055;
    } else if (e.target.value === 'rate_standard') {
      if (DOM.settingPayEmploymentRate) DOM.settingPayEmploymentRate.value = 0.006;
    }
  });

  // 前年所得・住民税パネルトグル
  DOM.btnPayrollTogglePrevYear?.addEventListener('click', () => {
    if (!DOM.payrollPrevYearCard) return;
    const isHidden = DOM.payrollPrevYearCard.style.display === 'none';
    DOM.payrollPrevYearCard.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      populatePreviousYearIncomeToForm();
    }
  });
  DOM.btnClosePayrollPrevYear?.addEventListener('click', () => {
    if (DOM.payrollPrevYearCard) DOM.payrollPrevYearCard.style.display = 'none';
  });
  DOM.btnCalcPrevYearTax?.addEventListener('click', handleCalcPrevYearTax);
  DOM.btnSavePrevYearIncome?.addEventListener('click', handleSavePreviousYearIncomeFromForm);
  DOM.btnApplyResidentTaxToSettings?.addEventListener('click', handleApplyResidentTaxToSettings);

  // A4給与明細書モーダル開閉
  DOM.btnPayrollOpenSheetModal?.addEventListener('click', openPayrollSheetModal);
  DOM.btnClosePayrollSheetModal?.addEventListener('click', closePayrollSheetModal);
  DOM.btnClosePayrollSheetModal2?.addEventListener('click', closePayrollSheetModal);
  DOM.btnPrintPayrollSheet?.addEventListener('click', handlePrintPayrollSheet);

  // 会計連携ボタン
  DOM.btnPayrollSyncToAccounting?.addEventListener('click', handleSyncPayrollToAccounting);

  // 表内inputの変更イベント（リアルタイム再計算）
  const payrollInputs = [
    'payWorkDaysStandard', 'payWorkDaysActual', 'payWorkHoursStandard', 'payAbsenceDays',
    'payHolidayWorkDays', 'payPaidLeaveDays', 'payOvertimeHours', 'payMidnightOvertimeHours',
    'payLateEarlyHours', 'payPaidLeaveRemaining', 'payBaseSalary', 'payAllowanceExecutive',
    'payAllowanceQualification', 'payAllowanceHousing', 'payAllowanceFamily', 'payOvertimePay',
    'payAllowanceCommuteNonTax', 'payAllowanceNonTaxOther', 'payMidnightPay', 'payHolidayPay',
    'payHealthInsurance', 'payWelfarePension', 'payWelfarePensionFund', 'payNursingInsurance',
    'payEmploymentInsurance', 'payIncomeTax', 'payResidentTax', 'payMutualAid'
  ];

  payrollInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        // 出勤日数または遅刻早退時間が変更された場合、労働時間（出勤日数×7 - 遅刻早退時間）を自動連動再計算
        if (id === 'payWorkDaysActual' || id === 'payLateEarlyHours') {
          syncWorkHoursFromDaysAndLateEarly();
        }
        // 出勤日数が変更され、育休モードの場合は日割り基本給を自動連動再計算
        if (id === 'payWorkDaysActual' && DOM.checkPayIsChildcare?.checked) {
          syncBaseSalaryFromWorkDays();
        }
        handlePayrollFormInputChange();
      });
    }
  });
}

/**
 * 労働時間を出勤日数と遅刻早退時間から自動算出（所定7時間/日: 出勤日数 × 7 - 遅刻早退時間）
 */
function syncWorkHoursFromDaysAndLateEarly() {
  const actualDays = Number(document.getElementById('payWorkDaysActual')?.value) || 0;
  const lateEarlyHours = Number(document.getElementById('payLateEarlyHours')?.value) || 0;
  const settings = getPayrollSettings();
  const dailyHours = (Number(settings.monthlyStandardHours) || 140) / (Number(settings.monthlyStandardDays) || 20); // 7.0時間
  const calculatedHours = Math.max(0, Math.round((actualDays * dailyHours - lateEarlyHours) * 100) / 100);
  const el = document.getElementById('payWorkHoursStandard');
  if (el) el.value = calculatedHours;
  return calculatedHours;
}

function syncBaseSalaryFromWorkDays() {
  const actualDays = Number(document.getElementById('payWorkDaysActual')?.value) || 0;
  const stdDays = Number(document.getElementById('payWorkDaysStandard')?.value) || 20;
  const settings = getPayrollSettings();
  const baseSalarySetting = settings.baseSalary || 200000;
  const wageType = DOM.selectPayDailyWageType?.value || 'proRata';

  let newBaseSalary = 0;
  if (wageType === 'fixedDaily') {
    const unit = Number(DOM.inputPayDailyWageUnit?.value) || Number(settings.dailyWageUnit) || 10000;
    newBaseSalary = Math.round(actualDays * unit);
  } else if (wageType === 'hourly') {
    const hours = Number(document.getElementById('payWorkHoursStandard')?.value) || (actualDays * 7);
    const hUnit = baseSalarySetting / 140;
    newBaseSalary = Math.round(hours * hUnit);
  } else {
    // proRata
    const dailyRate = baseSalarySetting / (stdDays || 20);
    newBaseSalary = Math.round(actualDays * dailyRate);
  }

  const el = document.getElementById('payBaseSalary');
  if (el) el.value = newBaseSalary;
}

function recalculatePayrollWithChildcareRules() {
  const isChildcare = Boolean(DOM.checkPayIsChildcare?.checked);
  const exemptSocial = Boolean(DOM.checkPayExemptSocial?.checked);
  const settings = getPayrollSettings();

  // 1. 基本給の再計算（育休時日割り vs 通常時月給）
  if (isChildcare) {
    syncBaseSalaryFromWorkDays();
  } else {
    const el = document.getElementById('payBaseSalary');
    if (el) el.value = settings.baseSalary || 200000;
  }

  // 2. 社会保険料の免除切替
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  if (exemptSocial) {
    setVal('payHealthInsurance', 0);
    setVal('payWelfarePension', 0);
    setVal('payNursingInsurance', 0);
    setVal('payWelfarePensionFund', 0);
  } else {
    setVal('payHealthInsurance', settings.healthInsurance || 9970);
    setVal('payWelfarePension', settings.welfarePension || 18300);
    setVal('payNursingInsurance', settings.nursingInsurance || 1590);
    setVal('payWelfarePensionFund', 0);
  }

  // 3. 雇用保険料の自動計算（総支給額連動）
  const getNum = (id) => Number(document.getElementById(id)?.value) || 0;
  const taxable = getNum('payBaseSalary') + getNum('payOvertimePay') + getNum('payAllowanceExecutive')
    + getNum('payAllowanceQualification') + getNum('payAllowanceHousing') + getNum('payAllowanceFamily')
    + getNum('payMidnightPay') + getNum('payHolidayPay');
  const gross = taxable + getNum('payAllowanceCommuteNonTax') + getNum('payAllowanceNonTaxOther');

  const empType = DOM.settingPayEmploymentType?.value || (settings.useFixedEmploymentInsurance ? 'fixed' : 'rate');
  if (empType === 'fixed') {
    setVal('payEmploymentInsurance', settings.employmentInsuranceFixed || 1156);
  } else {
    const rate = Number(DOM.settingPayEmploymentRate?.value) || settings.employmentInsuranceRate || 0.0055;
    // 50銭超過切り上げ（通貨の単位及び貨幣の発行等に関する法律第3条）
    setVal('payEmploymentInsurance', Math.round(gross * rate));
  }

  // 4. 全体再計算
  currentPayrollRecord = getPayrollRecordFromForm();
  // 所得税を自動算出
  setVal('payIncomeTax', currentPayrollRecord.incomeTax);
  currentPayrollRecord = getPayrollRecordFromForm();
  updatePayrollSummaryDisplays(currentPayrollRecord);
}

function changePayrollMonth(diff) {
  const [yStr, mStr] = currentPayrollMonth.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10) + diff;
  if (m < 1) {
    m = 12;
    y -= 1;
  } else if (m > 12) {
    m = 1;
    y += 1;
  }
  currentPayrollMonth = `${y}-${String(m).padStart(2, '0')}`;
  if (DOM.payrollMonthSelector) {
    DOM.payrollMonthSelector.value = currentPayrollMonth;
  }
  loadPayrollRecordForMonth(currentPayrollMonth);
}

function loadPayrollRecordForMonth(ymStr) {
  if (!ymStr) return;
  currentPayrollMonth = ymStr;

  const settings = getPayrollSettings();
  let existing = getPayrollRecordByMonth(ymStr);

  if (existing) {
    currentPayrollRecord = { ...existing };
  } else {
    // 既存レコードがない場合は、勤怠データと設定から自動算出
    const attList = getAttendanceList();
    const attSummary = extractAttendanceForPayroll(attList, ymStr);
    currentPayrollRecord = calculatePayrollRecord({
      targetMonth: ymStr,
      ...attSummary
    }, settings);
  }

  // UIフォームへセット
  populatePayrollRecordToForm(currentPayrollRecord);
  updatePayrollSummaryDisplays(currentPayrollRecord);
}

function populatePayrollRecordToForm(r) {
  if (!r) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val !== undefined && val !== null ? val : 0;
  };

  const targetYm = r.targetMonth || currentPayrollMonth;
  if (DOM.dispCurrentPayrollTitle) {
    const [y, m] = targetYm.split('-');
    DOM.dispCurrentPayrollTitle.textContent = `${y}年${parseInt(m, 10)}月度 （${r.empName || '宮崎真輔'} 様）`;
  }
  if (DOM.dispPayrollWorkPeriodBadge) {
    const periodInfo = getWorkPeriodLabel(targetYm);
    DOM.dispPayrollWorkPeriodBadge.textContent = `📅 発行月: ${periodInfo.issueLabel}（対象: ${periodInfo.workMonthLabel}）`;
  }

  // 育休中・社保免除コントロールの同期（2026年3月14日〜2027年3月31日 ➜ 2026年4月度〜2027年4月度支給分が育休免除対象）
  const payrollSettings = getPayrollSettings();
  const isChildcarePeriod = isChildcareMonthForPayroll(targetYm, payrollSettings);
  const isLeaveActive = r.isChildcareLeave !== undefined ? Boolean(r.isChildcareLeave) : isChildcarePeriod;
  const isExemptActive = r.childcareExemptSocialInsurance !== undefined ? Boolean(r.childcareExemptSocialInsurance) : isChildcarePeriod;

  if (DOM.checkPayIsChildcare) {
    DOM.checkPayIsChildcare.checked = isLeaveActive;
  }
  if (DOM.checkPayExemptSocial) {
    DOM.checkPayExemptSocial.checked = isExemptActive;
  }
  if (DOM.badgeChildcarePeriodStatus) {
    if (isLeaveActive) {
      DOM.badgeChildcarePeriodStatus.textContent = `👶 育休期間中 (${payrollSettings.childcareStartDate || '2026-03-14'} 〜 ${payrollSettings.childcareEndDate || '2027-03-31'})`;
      DOM.badgeChildcarePeriodStatus.style.background = '#fef3c7';
      DOM.badgeChildcarePeriodStatus.style.color = '#92400e';
      DOM.badgeChildcarePeriodStatus.style.borderColor = '#fde68a';
    } else {
      DOM.badgeChildcarePeriodStatus.textContent = '🏢 通常勤務月（社会保険料控除）';
      DOM.badgeChildcarePeriodStatus.style.background = '#f1f5f9';
      DOM.badgeChildcarePeriodStatus.style.color = '#475569';
      DOM.badgeChildcarePeriodStatus.style.borderColor = '#cbd5e1';
    }
  }

  // 勤怠
  setVal('payWorkDaysStandard', r.workDaysStandard);
  setVal('payWorkDaysActual', r.workDaysActual);
  setVal('payLateEarlyHours', r.lateEarlyHours);

  // 労働時間は出勤日数と遅刻早退時間から算出（所定7時間/日: 出勤日数 × 7 - 遅刻早退時間）
  const actualDays = Number(r.workDaysActual) || 0;
  const lateEarlyHours = Number(r.lateEarlyHours) || 0;
  const dailyHours = (Number(payrollSettings.monthlyStandardHours) || 140) / (Number(payrollSettings.monthlyStandardDays) || 20);
  const calcWorkHours = Math.max(0, Math.round((actualDays * dailyHours - lateEarlyHours) * 100) / 100);
  setVal('payWorkHoursStandard', calcWorkHours);

  setVal('payAbsenceDays', r.absenceDays);
  setVal('payHolidayWorkDays', r.holidayWorkDays);
  setVal('payPaidLeaveDays', r.paidLeaveDays);
  setVal('payOvertimeHours', r.overtimeHours);
  setVal('payMidnightOvertimeHours', r.midnightOvertimeHours);
  setVal('payPaidLeaveRemaining', r.paidLeaveRemaining);

  // 支給
  setVal('payBaseSalary', r.baseSalary);
  setVal('payAllowanceExecutive', r.allowanceExecutive);
  setVal('payAllowanceQualification', r.allowanceQualification);
  setVal('payAllowanceHousing', r.allowanceHousing);
  setVal('payAllowanceFamily', r.allowanceFamily);
  setVal('payOvertimePay', r.overtimePay);
  setVal('payAllowanceCommuteNonTax', r.allowanceCommuteNonTax);
  setVal('payAllowanceNonTaxOther', r.allowanceNonTaxOther);
  setVal('payMidnightPay', r.midnightPay);
  setVal('payHolidayPay', r.holidayPay);

  // 控除
  setVal('payHealthInsurance', r.healthInsurance);
  setVal('payWelfarePension', r.welfarePension);
  setVal('payWelfarePensionFund', r.welfarePensionFund);
  setVal('payNursingInsurance', r.nursingInsurance);
  setVal('payEmploymentInsurance', r.employmentInsurance);
  setVal('payIncomeTax', r.incomeTax);
  setVal('payResidentTax', r.residentTax);
  setVal('payMutualAid', r.mutualAid);
}

function getPayrollRecordFromForm() {
  const getNum = (id) => {
    const el = document.getElementById(id);
    return el ? Number(el.value) || 0 : 0;
  };

  const settings = getPayrollSettings();
  const rawRecord = {
    id: currentPayrollRecord?.id || `pay_${currentPayrollMonth}`,
    targetMonth: currentPayrollMonth,
    empNo: settings.empNo || '2',
    empName: settings.empName || '宮崎真輔',
    companyName: settings.companyName || '株式会社アルバワークス',

    isChildcareLeave: Boolean(DOM.checkPayIsChildcare?.checked),
    childcareExemptSocialInsurance: Boolean(DOM.checkPayExemptSocial?.checked),

    workDaysStandard: getNum('payWorkDaysStandard'),
    workDaysActual: getNum('payWorkDaysActual'),
    workHoursStandard: getNum('payWorkHoursStandard'),
    absenceDays: getNum('payAbsenceDays'),
    holidayWorkDays: getNum('payHolidayWorkDays'),
    paidLeaveDays: getNum('payPaidLeaveDays'),
    overtimeHours: getNum('payOvertimeHours'),
    midnightOvertimeHours: getNum('payMidnightOvertimeHours'),
    lateEarlyHours: getNum('payLateEarlyHours'),
    paidLeaveRemaining: getNum('payPaidLeaveRemaining'),

    baseSalary: getNum('payBaseSalary'),
    allowanceExecutive: getNum('payAllowanceExecutive'),
    allowanceQualification: getNum('payAllowanceQualification'),
    allowanceHousing: getNum('payAllowanceHousing'),
    allowanceFamily: getNum('payAllowanceFamily'),
    overtimePay: getNum('payOvertimePay'),
    allowanceCommuteNonTax: getNum('payAllowanceCommuteNonTax'),
    allowanceNonTaxOther: getNum('payAllowanceNonTaxOther'),
    midnightPay: getNum('payMidnightPay'),
    holidayPay: getNum('payHolidayPay'),

    healthInsurance: getNum('payHealthInsurance'),
    welfarePension: getNum('payWelfarePension'),
    welfarePensionFund: getNum('payWelfarePensionFund'),
    nursingInsurance: getNum('payNursingInsurance'),
    employmentInsurance: getNum('payEmploymentInsurance'),
    incomeTax: getNum('payIncomeTax'),
    residentTax: getNum('payResidentTax'),
    mutualAid: getNum('payMutualAid'),
  };

  // 合計・税額・手取り額を再計算
  return calculatePayrollRecord(rawRecord, settings);
}

function handlePayrollFormInputChange() {
  currentPayrollRecord = getPayrollRecordFromForm();
  updatePayrollSummaryDisplays(currentPayrollRecord);
}

function updatePayrollSummaryDisplays(r) {
  if (!r) return;
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // 支給ブロック合計
  setText('dispPayTotalNonTax', formatPayrollCurrency(r.totalNonTax));
  setText('dispPayTotalTaxable', formatPayrollCurrency(r.totalTaxable));
  setText('dispPayTotalGross', formatPayrollCurrency(r.totalGross));

  // 控除ブロック合計
  setText('dispPayTotalSocialInsurance', formatPayrollCurrency(r.totalSocialInsurance));
  setText('dispPayTaxableIncome', formatPayrollCurrency(r.taxableIncome));
  setText('dispPayTotalTax', formatPayrollCurrency(r.totalTax));
  setText('dispPayTotalDeductions', formatPayrollCurrency(r.totalDeductions));

  // 最下部合計ブロック
  setText('dispSummaryTotalGross', formatPayrollCurrency(r.totalGross));
  setText('dispSummaryTotalDeductions', formatPayrollCurrency(r.totalDeductions));
  setText('dispSummaryNetPay', `${formatPayrollCurrency(r.netPay)} 円`);

  // 最上部3大サマリーカード
  if (DOM.payrollCardTotalGross) DOM.payrollCardTotalGross.textContent = `¥${formatPayrollCurrency(r.totalGross)}`;
  if (DOM.payrollCardTotalDeductions) DOM.payrollCardTotalDeductions.textContent = `¥${formatPayrollCurrency(r.totalDeductions)}`;
  if (DOM.payrollCardNetPay) DOM.payrollCardNetPay.textContent = `¥${formatPayrollCurrency(r.netPay)}`;

  if (DOM.dispPayrollCardGrossSub) {
    if (r.isChildcareLeave) {
      DOM.dispPayrollCardGrossSub.textContent = `育休日割り給料 ¥${formatPayrollCurrency(r.baseSalary)} ＋ 残業手当等`;
    } else {
      DOM.dispPayrollCardGrossSub.textContent = `月給 ¥${formatPayrollCurrency(r.baseSalary)} ＋ 残業手当等`;
    }
  }

  if (DOM.dispPayrollCardDeductionSub) {
    if (r.childcareExemptSocialInsurance) {
      DOM.dispPayrollCardDeductionSub.textContent = `社保免除 ¥0 ＋ 雇用保険 ¥${formatPayrollCurrency(r.employmentInsurance)}・所得税等`;
    } else {
      DOM.dispPayrollCardDeductionSub.textContent = `社保計 ¥${formatPayrollCurrency(r.totalSocialInsurance)} ＋ 所得税・住民税`;
    }
  }
}

function handleImportAttendanceToPayroll() {
  console.log("【勤怠情報読込】実行開始");
  const attList = getAttendanceList();
  // 当給与明細（発行月）に対応する「前月勤務分」の勤怠を集計（末日締め翌月10日払い）
  const workMonth = getPreviousMonthStr(currentPayrollMonth);
  console.log("対象勤務月:", workMonth, "勤怠データ全件:", attList.length);
  
  const summary = extractAttendanceForPayroll(attList, workMonth);
  console.log("集計結果:", summary);

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('payWorkDaysStandard', summary.workDaysStandard);
  setVal('payWorkDaysActual', summary.workDaysActual);
  setVal('payWorkHoursStandard', summary.workHoursStandard);
  setVal('payOvertimeHours', summary.overtimeHours);

  // 残業代を新残業時間で再計算
  const settings = getPayrollSettings();
  const unit = Number(settings.overtimeUnitHourly) || (settings.baseSalary / (settings.monthlyStandardHours || 140) * (settings.overtimeRate || 1.25));
  const newOtPay = Math.round(summary.overtimeHours * unit);
  setVal('payOvertimePay', newOtPay);

  // 育児休業（日割り＆社保免除）ルールを適用して再計算
  recalculatePayrollWithChildcareRules();

  const [pyStr, pmStr] = workMonth.split('-');
  const [cyStr, cmStr] = currentPayrollMonth.split('-');
  if (summary.workDaysActual > 0) {
    console.log("【勤怠情報読込】完了（データあり）");
    showToast(`前月（${pyStr}年${parseInt(pmStr, 10)}月勤務分）の出勤 ${summary.workDaysActual}日・普通残業 ${summary.overtimeHours}時間を読み込みました`, 'success');
  } else {
    console.log("【勤怠情報読込】完了（データなし）");
    showToast(`前月（${pyStr}年${parseInt(pmStr, 10)}月）の打刻データは0件でした。対象月に打刻データが存在するか「退勤・勤怠」画面で確認してください。`, 'info');
  }
}

function handleSavePayrollRecord() {
  currentPayrollRecord = getPayrollRecordFromForm();
  const saved = savePayrollRecord(currentPayrollRecord);
  if (saved) {
    showToast(`${currentPayrollMonth} の給与明細データを保存しました（ファイル同期完了）`, 'success');
    renderPayrollHistoryTable();
  } else {
    alert('給与データの保存に失敗しました。');
  }
}

function populatePayrollSettingsToForm() {
  const s = getPayrollSettings();
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  setVal('settingPayBaseSalary', s.baseSalary || 200000);
  setVal('settingPayOvertimeUnit', s.overtimeUnitHourly || 1785.456);
  setVal('settingPayHealth', s.healthInsurance || 9970);
  setVal('settingPayWelfare', s.welfarePension || 18300);
  setVal('settingPayNursing', s.nursingInsurance || 1590);
  setVal('settingPayDependents', s.dependentsCount || 0);
  setVal('settingPayResidentTax', s.residentTax || 0);
  setVal('settingPayAllowanceNonTaxOther', s.allowanceNonTaxOther !== undefined ? s.allowanceNonTaxOther : 10000);
  setVal('settingPayChildcareStart', s.childcareStartDate || '2026-03-14');
  setVal('settingPayChildcareEnd', s.childcareEndDate || '2027-03-31');
  const dispPeriodEl = document.getElementById('dispSettingChildcarePeriod');
  if (dispPeriodEl) {
    dispPeriodEl.textContent = `${s.childcareStartDate || '2026-03-14'} 〜 ${s.childcareEndDate || '2027-03-31'}（社保免除対象）`;
  }

  if (DOM.settingPayEmploymentType) {
    DOM.settingPayEmploymentType.value = s.useFixedEmploymentInsurance ? 'fixed' : 'rate';
  }
  if (DOM.settingPayEmploymentRate) {
    DOM.settingPayEmploymentRate.value = s.employmentInsuranceRate || 0.0055;
  }
  if (DOM.selectPayDailyWageType) {
    DOM.selectPayDailyWageType.value = s.dailyWageCalculationType || 'proRata';
  }
  if (DOM.inputPayDailyWageUnit) {
    DOM.inputPayDailyWageUnit.value = s.dailyWageUnit || 10000;
  }
  if (DOM.wrapperPayDailyWageUnit) {
    DOM.wrapperPayDailyWageUnit.style.display = s.dailyWageCalculationType === 'fixedDaily' ? 'inline-flex' : 'none';
  }
}

function handleSavePayrollSettingsFromForm() {
  const getNum = (id) => Number(document.getElementById(id)?.value) || 0;
  const current = getPayrollSettings();
  const updated = {
    ...current,
    baseSalary: getNum('settingPayBaseSalary') || 200000,
    overtimeUnitHourly: Number(document.getElementById('settingPayOvertimeUnit')?.value) || 1785.456,
    healthInsurance: getNum('settingPayHealth') || 9970,
    welfarePension: getNum('settingPayWelfare') || 18300,
    nursingInsurance: getNum('settingPayNursing') || 1590,
    dependentsCount: getNum('settingPayDependents'),
    residentTax: getNum('settingPayResidentTax'),
    allowanceNonTaxOther: getNum('settingPayAllowanceNonTaxOther'),
    childcareStartDate: document.getElementById('settingPayChildcareStart')?.value || '2026-03-14',
    childcareEndDate: document.getElementById('settingPayChildcareEnd')?.value || '2027-03-31',
    useFixedEmploymentInsurance: DOM.settingPayEmploymentType?.value === 'fixed',
    employmentInsuranceRate: Number(DOM.settingPayEmploymentRate?.value) || 0.0055,
    dailyWageCalculationType: DOM.selectPayDailyWageType?.value || 'proRata',
    dailyWageUnit: Number(DOM.inputPayDailyWageUnit?.value) || 10000,
    isChildcareLeave: Boolean(DOM.checkPayIsChildcare?.checked),
    childcareExemptSocialInsurance: Boolean(DOM.checkPayExemptSocial?.checked)
  };

  savePayrollSettings(updated);
  showToast('給与・保険料の基本設定を保存しました！', 'success');
  if (DOM.payrollSettingsCard) DOM.payrollSettingsCard.style.display = 'none';

  // 現在の明細に設定値を反映して再計算
  loadPayrollRecordForMonth(currentPayrollMonth);
}

/**
 * 前年所得データをフォームに読み込み、法定住民税を試算して表示
 */
function populatePreviousYearIncomeToForm() {
  const data = getPreviousYearIncome();
  if (DOM.prevYearTarget) DOM.prevYearTarget.value = data.targetYear || 2025;
  if (DOM.prevYearGrossSalary) DOM.prevYearGrossSalary.value = data.annualGrossSalary || 2400000;
  if (DOM.prevYearSocialDeduction) DOM.prevYearSocialDeduction.value = data.socialInsuranceDeduction || 0;
  if (DOM.prevYearDependents) DOM.prevYearDependents.value = data.dependentsDeduction ? Math.round(data.dependentsDeduction / 330000) : 0;

  handleCalcPrevYearTax();
}

/**
 * フォームの入力値から法定住民税を再試算
 */
function handleCalcPrevYearTax() {
  const gross = Number(DOM.prevYearGrossSalary?.value) || 0;
  const social = Number(DOM.prevYearSocialDeduction?.value) || 0;
  const deps = Number(DOM.prevYearDependents?.value) || 0;

  const result = calculateResidentTaxFromAnnualIncome({
    annualGrossSalary: gross,
    socialInsuranceDeduction: social,
    dependentsDeduction: deps * 330000
  });

  if (DOM.dispPrevYearAnnualTax) {
    DOM.dispPrevYearAnnualTax.textContent = `¥${result.annualTotal.toLocaleString()}`;
  }
  if (DOM.dispPrevYearTaxJune) {
    DOM.dispPrevYearTaxJune.textContent = `¥${result.monthlyJune.toLocaleString()}`;
  }
  if (DOM.dispPrevYearTaxRegular) {
    DOM.dispPrevYearTaxRegular.textContent = `¥${result.monthlyRegular.toLocaleString()}`;
  }
  if (DOM.dispPrevYearTaxMessage) {
    DOM.dispPrevYearTaxMessage.textContent = result.message;
  }

  return result;
}

/**
 * 前年所得データを保存
 */
function handleSavePreviousYearIncomeFromForm() {
  const result = handleCalcPrevYearTax();
  const toSave = {
    targetYear: Number(DOM.prevYearTarget?.value) || 2025,
    annualGrossSalary: Number(DOM.prevYearGrossSalary?.value) || 0,
    socialInsuranceDeduction: Number(DOM.prevYearSocialDeduction?.value) || 0,
    dependentsDeduction: (Number(DOM.prevYearDependents?.value) || 0) * 330000,
    residentTaxMonthlyJune: result.monthlyJune,
    residentTaxMonthlyRegular: result.monthlyRegular,
    annualResidentTaxTotal: result.annualTotal,
    notes: '前年給与所得・明細データ'
  };

  savePreviousYearIncome(toSave);
  showToast('前年の所得データと住民税試算結果を安全に保存しました！', 'success');
}

/**
 * 試算された住民税月額を給与設定および当月明細に反映
 */
function handleApplyResidentTaxToSettings() {
  const result = handleCalcPrevYearTax();
  const taxMonthly = result.monthlyRegular;

  // 1. 基本設定の住民税月額に反映
  const currentSettings = getPayrollSettings();
  const updatedSettings = {
    ...currentSettings,
    residentTax: taxMonthly
  };
  savePayrollSettings(updatedSettings);

  // 2. フォームUIにも反映
  if (DOM.settingPayResidentTax) {
    DOM.settingPayResidentTax.value = taxMonthly;
  }
  const payResidentInput = document.getElementById('payResidentTax');
  if (payResidentInput) {
    payResidentInput.value = taxMonthly;
    handlePayrollFormInputChange();
  }

  showToast(`前年所得からの試算住民税（月額: ¥${taxMonthly.toLocaleString()}）を設定に反映しました！`, 'success');
}

// ==========================================================================
// A4給与支給明細書 印刷・プレビュー
// ==========================================================================
function openPayrollSheetModal() {
  currentPayrollRecord = getPayrollRecordFromForm();
  const r = currentPayrollRecord;
  if (!r) return;

  const [y, m] = (r.targetMonth || currentPayrollMonth).split('-');
  const ymText = `${y}年${parseInt(m, 10)}月度`;

  if (DOM.dispModalPayrollSubTitle) {
    DOM.dispModalPayrollSubTitle.textContent = `${ymText} ${r.empName || '宮崎真輔'} 様`;
  }

  // 帳票用紙への転記
  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text !== undefined && text !== null ? text : '';
  };
  const setMoney = (id, num) => {
    const el = document.getElementById(id);
    if (el) el.textContent = num ? formatPayrollCurrency(num) : '';
  };

  const targetYm = r.targetMonth || currentPayrollMonth;
  const periodInfo = getWorkPeriodLabel(targetYm);
  const pSettings = getPayrollSettings();
  const isChildcarePeriod = isChildcareMonthForPayroll(targetYm, pSettings) || Boolean(r.isChildcareLeave);
  const childcareNote = isChildcarePeriod ? ' 【育児休業中・社保免除】' : '';

  setText('printPayCompany', r.companyName || '株式会社アルバワークス');
  setText('printPayMonth', periodInfo.issueLabel);
  setText('printPayPeriod', `支給日: ${periodInfo.payDateLabel}（対象: ${periodInfo.workMonthLabel}）${childcareNote}`);
  setText('printPayEmpNo', r.empNo || '2');
  setText('printPayEmpName', r.empName || '宮崎 真輔');

  // 勤怠
  setText('pSheetWorkDaysStandard', r.workDaysStandard);
  setText('pSheetWorkDaysActual', r.workDaysActual);
  setText('pSheetWorkHoursStandard', r.workHoursStandard);
  setText('pSheetAbsenceDays', r.absenceDays);
  setText('pSheetHolidayWorkDays', r.holidayWorkDays);
  setText('pSheetPaidLeaveDays', r.paidLeaveDays);
  setText('pSheetOvertimeHours', r.overtimeHours);
  setText('pSheetMidnightOvertimeHours', r.midnightOvertimeHours);
  setText('pSheetLateEarlyHours', r.lateEarlyHours);
  setText('pSheetPaidLeaveRemaining', r.paidLeaveRemaining);

  // 支給
  setMoney('pSheetBaseSalary', r.baseSalary);
  setMoney('pSheetAllowanceExecutive', r.allowanceExecutive);
  setMoney('pSheetAllowanceQualification', r.allowanceQualification);
  setMoney('pSheetAllowanceHousing', r.allowanceHousing);
  setMoney('pSheetAllowanceFamily', r.allowanceFamily);
  setMoney('pSheetOvertimePay', r.overtimePay);
  setText('pSheetAllowanceCommuteNonTax', r.allowanceCommuteNonTax ? formatPayrollCurrency(r.allowanceCommuteNonTax) : '0');
  setMoney('pSheetAllowanceNonTaxOther', r.allowanceNonTaxOther);
  setMoney('pSheetMidnightPay', r.midnightPay);
  setMoney('pSheetHolidayPay', r.holidayPay);
  setText('pSheetTotalNonTax', formatPayrollCurrency(r.totalNonTax));
  setText('pSheetTotalTaxable', formatPayrollCurrency(r.totalTaxable));
  setText('pSheetTotalGross', formatPayrollCurrency(r.totalGross));

  // 控除
  setMoney('pSheetHealthInsurance', r.healthInsurance);
  setMoney('pSheetWelfarePension', r.welfarePension);
  setMoney('pSheetWelfarePensionFund', r.welfarePensionFund);
  setMoney('pSheetNursingInsurance', r.nursingInsurance);
  setMoney('pSheetEmploymentInsurance', r.employmentInsurance);
  setText('pSheetTotalSocialInsurance', formatPayrollCurrency(r.totalSocialInsurance));
  setText('pSheetTaxableIncome', formatPayrollCurrency(r.taxableIncome));
  setMoney('pSheetIncomeTax', r.incomeTax);
  setMoney('pSheetResidentTax', r.residentTax);
  setText('pSheetTotalTax', formatPayrollCurrency(r.totalTax));
  setMoney('pSheetMutualAid', r.mutualAid);
  setText('pSheetTotalDeductions', formatPayrollCurrency(r.totalDeductions));

  // 最下部
  setText('pSheetBottomGross', formatPayrollCurrency(r.totalGross));
  setText('pSheetBottomDeductions', formatPayrollCurrency(r.totalDeductions));
  setText('pSheetBottomNetPay', formatPayrollCurrency(r.netPay));

  if (DOM.payrollSheetModal) {
    DOM.payrollSheetModal.classList.add('active');
  }
  document.body.style.overflow = 'hidden';
}

function closePayrollSheetModal() {
  if (DOM.payrollSheetModal) {
    DOM.payrollSheetModal.classList.remove('active');
  }
  document.body.style.overflow = '';
}

function handlePrintPayrollSheet() {
  const modalPaper = document.getElementById('payrollSheetPaper');
  if (!modalPaper) return;

  const htmlContent = modalPaper.outerHTML;
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定で許可してください。');
    return;
  }

  const doc = printWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>給与支給明細書 印刷</title>
      <link rel="stylesheet" href="css/style.css">
      <link rel="stylesheet" href="css/print.css">
      <style>
        body { margin: 0; padding: 20px; background: #fff; }
        .no-print { display: none !important; }
        @media print {
          body { padding: 0; }
          .payroll-sheet-paper {
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.close();
          }, 500);
        };
      </script>
    </body>
    </html>
  `);
  doc.close();
}

// ==========================================================================
// 財務会計への給与仕訳連携
// ==========================================================================
function handleSyncPayrollToAccounting() {
  currentPayrollRecord = getPayrollRecordFromForm();
  const r = currentPayrollRecord;
  if (!r) return;

  const [y, m] = (r.targetMonth || currentPayrollMonth).split('-');
  const ymText = `${y}年${parseInt(m, 10)}月度`;

  // 会計の経費／支出として「給与手当」「法定福利費」の仕訳を自動生成・連携
  if (confirm(`${ymText} の給与（支給総額 ¥${formatPayrollCurrency(r.totalGross)}）を財務会計に仕訳反映しますか？`)) {
    // 1. 給与手当の経費データ
    const payExpense = {
      id: `exp_payroll_${r.targetMonth}`,
      date: `${r.targetMonth}-25`, // 支給日
      category: '役員報酬・給料手当',
      amount: r.totalGross,
      taxRate: 0, // 給与は不課税
      payee: `${r.empName || '宮崎真輔'}（給与）`,
      invoiceNumber: '',
      note: `${ymText} 給与支給（差引手取 ¥${formatPayrollCurrency(r.netPay)}、社保預り ¥${formatPayrollCurrency(r.totalSocialInsurance)}、所得税預り ¥${formatPayrollCurrency(r.incomeTax)}）`
    };
    saveExpense(payExpense);

    // 2. 会社負担法定福利費（社会保険料と同額相当を福利厚生・法定福利費として計上）
    if (r.totalSocialInsurance > 0) {
      const socialExpense = {
        id: `exp_social_${r.targetMonth}`,
        date: `${r.targetMonth}-25`,
        category: '法定福利費',
        amount: r.totalSocialInsurance,
        taxRate: 0,
        payee: '日本年金機構・協会けんぽ',
        invoiceNumber: '',
        note: `${ymText} 社会保険料 会社負担分（健保・厚年・雇用保険）`
      };
      saveExpense(socialExpense);
    }

    showToast(`${ymText} の給与・社会保険仕訳を財務会計へ反映しました！`, 'success');
  }
}

// ==========================================================================
// 履歴一覧テーブル描画
// ==========================================================================
function renderPayrollHistoryTable() {
  if (!DOM.payrollHistoryTableBody) return;
  const records = getPayrollRecords();

  if (records.length === 0) {
    DOM.payrollHistoryTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--slate-400); padding: 24px;">保存済みの給与明細データはありません</td></tr>`;
    return;
  }

  const sorted = [...records].sort((a, b) => (b.targetMonth || '').localeCompare(a.targetMonth || ''));

  let html = '';
  sorted.forEach(item => {
    const [y, m] = (item.targetMonth || '').split('-');
    const ymDisplay = y && m ? `${y}年${parseInt(m, 10)}月度` : item.targetMonth;
    const isCurrent = item.targetMonth === currentPayrollMonth;

    html += `
      <tr style="${isCurrent ? 'background: #f0fdf4;' : ''}">
        <td style="font-weight: 700; color: #0f172a;">${escapeHtml(ymDisplay)}</td>
        <td>${escapeHtml(item.empName || '宮崎真輔')} <span style="font-size: 11px; color: #64748b;">(No.${item.empNo || '2'})</span></td>
        <td style="text-align: center;">${item.workDaysActual || 0}日 / <strong style="color: #0284c7;">${item.overtimeHours || 0}h</strong></td>
        <td style="text-align: right; font-weight: 700;">¥${formatPayrollCurrency(item.totalGross)}</td>
        <td style="text-align: right; color: #e11d48; font-weight: 700;">¥${formatPayrollCurrency(item.totalDeductions)}</td>
        <td style="text-align: right; font-weight: 900; color: #0284c7; font-size: 0.95rem;">¥${formatPayrollCurrency(item.netPay)}</td>
        <td style="text-align: center; white-space: nowrap;">
          <button type="button" class="btn btn-secondary btn-xs" style="margin-right: 4px; padding: 2px 8px;" onclick="window.__loadPayrollRecord('${item.targetMonth}')">表示・編集</button>
          <button type="button" class="btn btn-primary btn-xs" style="margin-right: 4px; padding: 2px 8px; background: #0284c7; border-color: #0284c7;" onclick="window.__printPayrollRecord('${item.targetMonth}')">明細印刷</button>
          <button type="button" class="btn btn-outline btn-xs btn-danger" style="padding: 2px 6px;" onclick="window.__deletePayrollRecord('${item.targetMonth}')">削除</button>
        </td>
      </tr>
    `;
  });

  DOM.payrollHistoryTableBody.innerHTML = html;
}

window.__loadPayrollRecord = function(targetMonth) {
  if (DOM.payrollMonthSelector) {
    DOM.payrollMonthSelector.value = targetMonth;
  }
  loadPayrollRecordForMonth(targetMonth);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.__printPayrollRecord = function(targetMonth) {
  loadPayrollRecordForMonth(targetMonth);
  setTimeout(() => {
    openPayrollSheetModal();
  }, 100);
};

window.__deletePayrollRecord = function(targetMonth) {
  if (confirm(`${targetMonth} の給与明細データを削除しますか？`)) {
    deletePayrollRecord(targetMonth);
    showToast(`${targetMonth} の給与データを削除しました`, 'success');
    renderPayrollHistoryTable();
  }
};

// ==========================================================================
// ユーティリティ
// ==========================================================================
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
    <span>${message}</span>
  `;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3200);
}

// ==========================================================================
// 全社共通モーダル・画面切替操作のグローバルエクスポート
// ==========================================================================
window.openCompanyProfileModal = typeof openCompanyProfileModal !== 'undefined' ? openCompanyProfileModal : function() {
  const m = document.getElementById('companyProfileModal');
  if (m) m.classList.add('active');
};
window.closeCompanyProfileModal = typeof closeCompanyProfileModal !== 'undefined' ? closeCompanyProfileModal : function() {
  const m = document.getElementById('companyProfileModal');
  if (m) m.classList.remove('active');
};
window.openItemMasterModal = typeof openItemMasterModal !== 'undefined' ? openItemMasterModal : null;
window.closeItemMasterModal = typeof closeItemMasterModal !== 'undefined' ? closeItemMasterModal : null;
window.openClientMasterModal = typeof openClientMasterModal !== 'undefined' ? openClientMasterModal : null;
window.closeClientMasterModal = typeof closeClientMasterModal !== 'undefined' ? closeClientMasterModal : null;
window.openInventoryMasterModal = typeof openInventoryMasterModal !== 'undefined' ? openInventoryMasterModal : null;
window.closeInventoryMasterModal = typeof closeInventoryMasterModal !== 'undefined' ? closeInventoryMasterModal : null;
window.openBackupModal = typeof openBackupModal !== 'undefined' ? openBackupModal : null;
window.closeBackupModal = typeof closeBackupModal !== 'undefined' ? closeBackupModal : null;
window.openHistoryModal = typeof openHistoryModal !== 'undefined' ? openHistoryModal : null;
window.closeHistoryModal = typeof closeHistoryModal !== 'undefined' ? closeHistoryModal : null;
window.openDiscountModal = typeof openDiscountModal !== 'undefined' ? openDiscountModal : null;
window.closeDiscountModal = typeof closeDiscountModal !== 'undefined' ? closeDiscountModal : null;
window.openAttendanceSheetModal = typeof openAttendanceSheetModal !== 'undefined' ? openAttendanceSheetModal : null;
window.closeAttendanceSheetModal = typeof closeAttendanceSheetModal !== 'undefined' ? closeAttendanceSheetModal : null;
window.openExpenseSettlementModal = typeof openExpenseSettlementModal !== 'undefined' ? openExpenseSettlementModal : null;
window.closeExpenseSettlementModal = typeof closeExpenseSettlementModal !== 'undefined' ? closeExpenseSettlementModal : null;
window.setActiveExpenseClaimant = typeof setActiveExpenseClaimant !== 'undefined' ? setActiveExpenseClaimant : null;
window.syncExpensesWithServer = typeof syncExpensesWithServer !== 'undefined' ? syncExpensesWithServer : null;
window.renderAccountingExpenses = typeof renderAccountingExpenses !== 'undefined' ? renderAccountingExpenses : null;
window.syncInvoicesHistoryWithServer = typeof syncInvoicesHistoryWithServer !== 'undefined' ? syncInvoicesHistoryWithServer : null;
window.filterAndRenderHistoryList = typeof filterAndRenderHistoryList !== 'undefined' ? filterAndRenderHistoryList : null;
window.switchAccountingTab = typeof switchAccountingTab !== 'undefined' ? switchAccountingTab : null;
window.switchEditorTab = typeof switchEditorTab !== 'undefined' ? switchEditorTab : null;
window.switchAppView = typeof switchAppView !== 'undefined' ? switchAppView : null;

async function triggerServerSyncAll() {
  const choice = confirm(
    '【☁️ サーバー全データ同期（端末間共有）】\n\n' +
    '・[OK] を押すと:\n' +
    '  この端末の最新データ（商品マスタ・取引先・自社情報・経費・伝票・勤怠）をサーバーへアップロード（保存）します。\n' +
    '  ※PCでこれを実行すると、スマホなど全端末に同じデータが共有されます！\n\n' +
    '・[キャンセル] を押すと:\n' +
    '  サーバーから最新データをダウンロードして、この端末に完全同期します。\n' +
    '  ※スマホでPCの最新データを受け取りたい場合はキャンセルを押してください。'
  );

  if (choice) {
    if (typeof pushAllLocalDataToServer === 'function') {
      showToast('☁️ サーバーへ全データをアップロード中...', 'info');
      const res = await pushAllLocalDataToServer();
      if (res && res.success) {
        showToast('✨ 全データをサーバーへアップロードしました！全端末へ即時共有されます。', 'success');
      } else {
        alert('サーバーへの保存に失敗しました: ' + (res ? res.error : '通信エラー'));
      }
    }
  } else {
    if (typeof pullAllServerDataToLocal === 'function') {
      showToast('☁️ サーバーから最新データをダウンロード中...', 'info');
      const res = await pullAllServerDataToLocal();
      if (res && res.success) {
        showToast('✨ サーバーから最新データを取得しました！画面を更新します。', 'success');
        setTimeout(() => location.reload(), 600);
      } else {
        alert('サーバーからの取得に失敗しました: ' + (res ? res.error : '通信エラー'));
      }
    }
  }
}
window.triggerServerSyncAll = triggerServerSyncAll;

// Firebase Config & Auth Setup
const firebaseConfig = {
  apiKey: "AIzaSyCcYbAnJ8kTPFOmBeBwPR6tcgps2BuxmIg",
  authDomain: "alva-epr.firebaseapp.com",
  projectId: "alva-epr",
  storageBucket: "alva-epr.firebasestorage.app",
  messagingSenderId: "638640828372",
  appId: "1:638640828372:web:41c9abc6ee315a96f03041"
};

function setupFirebaseAuth() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK is not loaded.');
    return;
  }
  
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const auth = firebase.auth();

  window.signOutApp = () => {
    auth.signOut().then(() => {
      window.location.reload();
    });
  };

  const loginOverlay = document.getElementById('loginOverlay');
  const loginEmailInput = document.getElementById('loginEmail');
  const btnSendLoginLink = document.getElementById('btnSendLoginLink');
  const loginMessageArea = document.getElementById('loginMessageArea');
  const btnLogout = document.getElementById('btnLogout');

  if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('確認のため、ログインに使用したメールアドレスを入力してください');
    }
    if (email) {
      auth.signInWithEmailLink(email, window.location.href)
        .then((result) => {
          window.localStorage.removeItem('emailForSignIn');
          window.history.replaceState({}, document.title, window.location.pathname);
          if (loginMessageArea) {
            loginMessageArea.style.color = '#16a34a';
            loginMessageArea.innerText = 'ログインに成功しました。';
          }
        })
        .catch((error) => {
          console.error(error);
          if (loginMessageArea) {
            loginMessageArea.style.color = '#dc2626';
            loginMessageArea.innerText = 'ログインエラー: ' + error.message;
          }
        });
    }
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      if (loginOverlay) loginOverlay.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-flex';
    } else {
      if (loginOverlay) loginOverlay.style.display = 'flex';
      if (btnLogout) btnLogout.style.display = 'none';
    }
  });

  const btnLoginWithPassword = document.getElementById('btnLoginWithPassword');
  const loginPasswordInput = document.getElementById('loginPassword');

  if (btnLoginWithPassword && loginEmailInput && loginPasswordInput) {
    btnLoginWithPassword.addEventListener('click', async () => {
      const email = loginEmailInput.value.trim();
      const password = loginPasswordInput.value.trim();
      
      if (!email || !password) {
        if (loginMessageArea) {
          loginMessageArea.style.color = '#dc2626';
          loginMessageArea.innerText = 'メールアドレスとパスワードを入力してください。';
        }
        return;
      }
      
      btnLoginWithPassword.disabled = true;
      btnLoginWithPassword.innerText = 'ログイン処理中...';
      
      try {
        await auth.signInWithEmailAndPassword(email, password);
        if (loginMessageArea) {
          loginMessageArea.style.color = '#16a34a';
          loginMessageArea.innerText = 'ログインに成功しました。';
        }
      } catch (error) {
        console.error(error);
        if (loginMessageArea) {
          loginMessageArea.style.color = '#dc2626';
          // User friendly message for common errors
          if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
             loginMessageArea.innerText = 'メールアドレスまたはパスワードが間違っています。';
          } else {
             loginMessageArea.innerText = 'ログインエラー: ' + error.message;
          }
        }
      } finally {
        btnLoginWithPassword.innerText = 'パスワードでログイン';
        btnLoginWithPassword.disabled = false;
      }
    });
  }
}

// アプリ起動
async function bootstrapApp() {
  setupFirebaseAuth();
  if (typeof pullAllServerDataToLocal === 'function') {
    try { await pullAllServerDataToLocal(); } catch(e) {}
  }
  initApp();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}

})();
