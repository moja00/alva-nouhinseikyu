/**
 * accounting-state.js
 * 財務会計・損益計算・自動仕訳・税理士用CSV出力エンジン
 */

// 標準的な日本の青色申告・法人勘定科目リスト
export const ACCOUNT_CATEGORIES = [
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
export function normalizeInvoiceDoc(raw) {
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
export function isDateInPeriod(dateStr, periodFilter = 'all') {
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
export function calculateProfitAndLoss(invoices = [], expenses = [], periodFilter = 'all') {
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
export function generateJournalEntries(invoices = [], expenses = [], periodFilter = 'all') {
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
export function exportJournalsToCSV(journals = []) {
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
