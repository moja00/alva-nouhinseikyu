/**
 * invoice-state.js
 * 帳票データ構造、インボイス制度準拠の税金計算、フォーマットユーティリティ
 */

export const DOC_TYPES = {
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

export const THEME_COLORS = {
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
export function generateDocNumber(docType = 'invoice') {
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
export function getDefaultDates() {
  const now = new Date();
  const issue = now.toISOString().split('T')[0];

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const due = nextMonth.toISOString().split('T')[0];

  return { issue, due };
}

/**
 * 初期帳票データモデル作成
 */
export function createEmptyInvoice(docType = 'invoice') {
  const dates = getDefaultDates();
  return {
    id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    docType: docType,
    docNumber: generateDocNumber(docType),
    issueDate: dates.issue,
    dueDate: dates.due,
    title: '', // 件名は空白
    client: {
      code: '',
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
export function calculateTotals(items = [], fractionRule = 'floor') {
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
export function calculateWholesalePrice(userPriceInc = 0, taxRate = 10, discount = { type: 'none', value: 0, reason: '' }) {
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
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  if (num < 0) {
    return '-¥' + Math.abs(num).toLocaleString('ja-JP');
  }
  return '¥' + num.toLocaleString('ja-JP');
}

/**
 * 日本語日付フォーマット (2026年9月15日)
 */
export function formatJapaneseDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`;
  }
  return dateStr;
}
