/**
 * accounting-state.js
 * BillCraft ERP - 財務会計・複式簿記コアエンジン
 * 
 * 5大区分勘定科目マスタ、複合仕訳（振替伝票）、期首残高、
 * 統合仕訳エンジン（二重計上防止）、総勘定元帳（諸口対応）、
 * 残高試算表（T/B）、貸借対照表（B/S）、損益計算書（P/L）、CSVエクスポート
 */

// ==========================================================================
// 1. 税区分・インボイス区分定数
// ==========================================================================
export const TAX_TYPES = {
  taxable_10: { code: 'taxable_10', label: '課税 10%', rate: 0.10, isTaxable: true },
  taxable_8: { code: 'taxable_8', label: '軽減税率 8%', rate: 0.08, isTaxable: true },
  exempt: { code: 'exempt', label: '非課税', rate: 0, isTaxable: false },
  non_taxable: { code: 'non_taxable', label: '不課税', rate: 0, isTaxable: false },
  out_of_scope: { code: 'out_of_scope', label: '対象外', rate: 0, isTaxable: false }
};

export const INVOICE_TYPES = {
  qualified: { code: 'qualified', label: '適格請求書（100%控除）', deductionRate: 1.0 },
  transitional: { code: 'transitional', label: '経過措置（80%控除）', deductionRate: 0.8 },
  none: { code: 'none', label: '非該当（免税等）', deductionRate: 0.0 }
};

// ==========================================================================
// 2. 5大区分 標準勘定科目マスタ（B/S・P/L完全対応体系）
// ==========================================================================
export const DEFAULT_ACCOUNT_MASTER = [
  // --- 【資産の部: 100番台】 (type: 'asset', dcType: 'debit') ---
  // 流動資産 (current_asset)
  { code: '101', name: '現金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: ['小口現金'], isSystem: true },
  { code: '102', name: '普通預金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: ['高崎信用金庫', '群馬銀行'], isSystem: true },
  { code: '103', name: '当座預金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '111', name: '売掛金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '112', name: '未収入金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '113', name: '前払金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '114', name: '立替金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: ['役員立替', '従業員立替'], isSystem: true },
  { code: '115', name: '仮払金', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '116', name: '仮払消費税', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '131', name: '商品・棚卸資産', type: 'asset', subType: 'current_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  // 固定資産 (fixed_asset)
  { code: '141', name: '工具器具備品', type: 'asset', subType: 'fixed_asset', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '142', name: '車両運搬具', type: 'asset', subType: 'fixed_asset', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '143', name: '建物・設備', type: 'asset', subType: 'fixed_asset', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '149', name: '減価償却累計額', type: 'asset', subType: 'fixed_asset', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '151', name: '敷金・保証金', type: 'asset', subType: 'fixed_asset', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },

  // --- 【負債の部: 200番台】 (type: 'liability', dcType: 'credit') ---
  // 流動負債 (current_liability)
  { code: '201', name: '買掛金', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '211', name: '短期借入金', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '212', name: '未払金', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: ['クレジットカード', '役員未払金'], isSystem: true },
  { code: '213', name: '未払費用', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: ['給与未払', '社保未払'], isSystem: true },
  { code: '214', name: '預り金', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: ['源泉所得税', '住民税', '社会保険料'], isSystem: true },
  { code: '215', name: '前受金', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '216', name: '仮受消費税', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '217', name: '未払消費税等', type: 'liability', subType: 'current_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  // 固定負債 (fixed_liability)
  { code: '221', name: '長期借入金', type: 'liability', subType: 'fixed_liability', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },

  // --- 【純資産の部: 300番台】 (type: 'equity', dcType: 'credit') ---
  { code: '301', name: '資本金', type: 'equity', subType: 'equity', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '302', name: '繰越利益剰余金', type: 'equity', subType: 'equity', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '303', name: '元入金', type: 'equity', subType: 'equity', dcType: 'credit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },

  // --- 【収益の部: 400番台】 (type: 'revenue', dcType: 'credit') ---
  { code: '401', name: '売上高', type: 'revenue', subType: 'operating_revenue', dcType: 'credit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '411', name: '雑収入', type: 'revenue', subType: 'non_operating_revenue', dcType: 'credit', defaultTaxType: 'non_taxable', subAccounts: ['助成金・補助金'], isSystem: true },
  { code: '412', name: '受取利息', type: 'revenue', subType: 'non_operating_revenue', dcType: 'credit', defaultTaxType: 'non_taxable', subAccounts: [], isSystem: true },

  // --- 【費用の部: 500〜600番台】 (type: 'expense', dcType: 'debit') ---
  // 売上原価 (cost_of_sales) - 粗利益計算用
  { code: '501', name: '仕入高', type: 'expense', subType: 'cost_of_sales', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '502', name: '外注加工費', type: 'expense', subType: 'cost_of_sales', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '503', name: '荷造運賃', type: 'expense', subType: 'cost_of_sales', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },

  // 販売費及び一般管理費 (sga) - 営業利益計算用
  { code: '601', name: '役員報酬', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'non_taxable', subAccounts: [], isSystem: true },
  { code: '602', name: '給料手当', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'non_taxable', subAccounts: [], isSystem: true },
  { code: '603', name: '法定福利費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'non_taxable', subAccounts: [], isSystem: true },
  { code: '604', name: '福利厚生費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '605', name: '旅費交通費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['電車・バス', 'タクシー', '高速代'], isSystem: true },
  { code: '606', name: '通信費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['携帯電話', 'インターネット', '郵送・切手'], isSystem: true },
  { code: '607', name: '消耗品費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['事務用品', '工具消耗品'], isSystem: true },
  { code: '608', name: '接待交際費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['飲食代', '贈答品'], isSystem: true },
  { code: '609', name: '地代家賃', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'exempt', subAccounts: ['事務所家賃', '駐車場代'], isSystem: true },
  { code: '610', name: '水道光熱費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['電気代', 'ガス代', '水道代'], isSystem: true },
  { code: '611', name: '支払手数料', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['振込手数料', 'カード決済手数料'], isSystem: true },
  { code: '612', name: '車両費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['ガソリン代', '車検・修理', '自動車保険'], isSystem: true },
  { code: '613', name: '広告宣伝費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: ['WEB広告', '印刷代'], isSystem: true },
  { code: '614', name: '新聞図書費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '615', name: '租税公課', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'exempt', subAccounts: ['印紙税', '自動車税', '固定資産税'], isSystem: true },
  { code: '616', name: '保険料', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'exempt', subAccounts: ['火災保険', '賠償責任保険'], isSystem: true },
  { code: '617', name: '修繕費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '618', name: '減価償却費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'out_of_scope', subAccounts: [], isSystem: true },
  { code: '619', name: '外注費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },
  { code: '699', name: '雑費', type: 'expense', subType: 'sga', dcType: 'debit', defaultTaxType: 'taxable_10', subAccounts: [], isSystem: true },

  // 営業外費用 (non_operating_expense)
  { code: '701', name: '支払利息', type: 'expense', subType: 'non_operating_expense', dcType: 'debit', defaultTaxType: 'non_taxable', subAccounts: [], isSystem: true }
];

// 従来のコードとの後方互換性配列（既存UI・経費カテゴリ選択がそのまま動くよう維持）
export const ACCOUNT_CATEGORIES = DEFAULT_ACCOUNT_MASTER
  .filter(a => a.type === 'expense')
  .map(a => ({
    code: a.code,
    name: a.name,
    group: a.subType === 'cost_of_sales' ? 'cost' : 'expense',
    taxType: a.defaultTaxType === 'taxable_10' ? 'taxable' : 'exempt',
    description: a.name
  }));

/**
 * 勘定科目名またはコードから科目定義を検索
 * @param {string} codeOrName 
 * @param {Array} masterList 
 * @returns {object|null}
 */
export function findAccountDef(codeOrName, masterList = DEFAULT_ACCOUNT_MASTER) {
  if (!codeOrName) return null;
  const target = String(codeOrName).trim();
  const list = Array.isArray(masterList) && masterList.length > 0 ? masterList : DEFAULT_ACCOUNT_MASTER;
  return list.find(a => a.code === target || a.name === target) || null;
}

// ==========================================================================
// 3. 伝票正規化 & 日付フィルター
// ==========================================================================

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
  const isIssued = isCancelled ? false : (doc.isIssued !== undefined ? !!doc.isIssued : (raw.isIssued !== undefined ? !!raw.isIssued : true));

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

  let taxTotal = tax10 + tax8;
  let grandTotal = subtotal + taxTotal;
  if (grandTotal === 0) {
    const rawGrand = Number(doc.grandTotal || raw.grandTotal || doc.totalAmount || raw.totalAmount || 0);
    if (rawGrand > 0) {
      grandTotal = rawGrand;
      if (subtotal === 0) {
        subtotal = Math.round(rawGrand / 1.1);
        taxTotal = rawGrand - subtotal;
        tax10 = taxTotal;
      }
    }
  }

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

export function isDateInPeriod(dateStr, periodFilter = 'all') {
  if (!periodFilter || periodFilter === 'all') return true;
  if (!dateStr) return false;
  const d = String(dateStr).replace(/\//g, '-').trim().slice(0, 10);
  if (!d) return false;

  if (typeof periodFilter === 'string') {
    if (periodFilter === 'all') return true;
    const p = periodFilter.replace(/\//g, '-').trim();
    return d.startsWith(p);
  }

  if (typeof periodFilter === 'object') {
    if (periodFilter.preset === 'all') return true;
    const start = periodFilter.start ? String(periodFilter.start).replace(/\//g, '-').trim().slice(0, 10) : '';
    const end = periodFilter.end ? String(periodFilter.end).replace(/\//g, '-').trim().slice(0, 10) : '';
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  }

  return true;
}

// ==========================================================================
// 4. 複合仕訳（振替伝票）バリデーション & ヘルパー
// ==========================================================================

/**
 * 複合仕訳の貸借バランス・データ整合性バリデーション
 * @param {object} entry 
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateManualJournal(entry) {
  if (!entry) return { isValid: false, error: '仕訳データが存在しません' };
  if (!entry.date) return { isValid: false, error: '取引日付を入力してください' };

  const debitLines = Array.isArray(entry.debitLines) ? entry.debitLines : [];
  const creditLines = Array.isArray(entry.creditLines) ? entry.creditLines : [];

  if (debitLines.length === 0 || creditLines.length === 0) {
    return { isValid: false, error: '借方および貸方の明細行をそれぞれ1行以上入力してください' };
  }

  const totalDebit = debitLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const totalCredit = creditLines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  if (totalDebit <= 0 || totalCredit <= 0) {
    return { isValid: false, error: '金額は0より大きい数値を入力してください' };
  }

  if (totalDebit !== totalCredit) {
    return {
      isValid: false,
      error: `借方合計 (¥${totalDebit.toLocaleString()}) と 貸方合計 (¥${totalCredit.toLocaleString()}) が一致していません（差額: ¥${Math.abs(totalDebit - totalCredit).toLocaleString()}）`
    };
  }

  return { isValid: true, totalDebit, totalCredit };
}

// ==========================================================================
// 5. 統合仕訳エンジン（Unified Journal Engine）
//    【要件1: 売掛金消込・給与仕訳の二重計上防止排他制御】
//    【要件4: インボイス区分 invoiceType 保持】
// ==========================================================================

/**
 * 請求書、経費、手動・複合仕訳を1つの統合仕訳ストリームとして生成
 * @param {object|Array} arg1
 * @returns {Array<object>} 統合仕訳リスト
 */
export function buildUnifiedJournals(arg1 = {}, arg2 = [], arg3 = [], arg4 = [], arg5 = 'all') {
  let invoices = [];
  let expenses = [];
  let manualJournals = [];
  let payrollRecords = [];
  let periodFilter = 'all';

  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1)) {
    // オブジェクト分割代入形式: { invoices, expenses, manualJournals, payrollRecords, periodFilter }
    invoices = Array.isArray(arg1.invoices) ? arg1.invoices : [];
    expenses = Array.isArray(arg1.expenses) ? arg1.expenses : [];
    manualJournals = Array.isArray(arg1.manualJournals) ? arg1.manualJournals : [];
    payrollRecords = Array.isArray(arg1.payrollRecords) ? arg1.payrollRecords : [];
    periodFilter = arg1.periodFilter || 'all';
  } else {
    // 位置引数形式: (invoices, expenses, manualJournals, payrollRecords, periodFilter)
    // または (invoices, expenses, periodFilter, manualJournals)
    invoices = Array.isArray(arg1) ? arg1 : [];
    expenses = Array.isArray(arg2) ? arg2 : [];

    if (Array.isArray(arg3)) {
      manualJournals = arg3;
      if (Array.isArray(arg4)) {
        payrollRecords = arg4;
        periodFilter = arg5 || 'all';
      } else {
        periodFilter = arg4 || 'all';
      }
    } else {
      periodFilter = arg3 || 'all';
      manualJournals = Array.isArray(arg4) ? arg4 : [];
      payrollRecords = Array.isArray(arg5) ? arg5 : [];
    }
  }

  const unified = [];

  // 手動・複合仕訳側の sourceId セットを構築（二重計上防止用）
  const manualReconciliationSourceIds = new Set();
  const manualPayrollSourceIds = new Set();

  (manualJournals || []).forEach(jnl => {
    if (!jnl) return;
    if (jnl.sourceType === 'reconciliation' && jnl.sourceId) {
      manualReconciliationSourceIds.add(String(jnl.sourceId).trim());
    }
    if (jnl.sourceType === 'payroll' && jnl.sourceId) {
      manualPayrollSourceIds.add(String(jnl.sourceId).trim());
    }
  });

  // 1. 伝票発行（売上計上）および入金消込仕訳
  (invoices || []).forEach(rawInv => {
    const inv = normalizeInvoiceDoc(rawInv);
    if (!inv || inv.docType === 'estimate') return;
    if (!inv.isIssued || inv.isCancelled) return;

    const date = inv.issueDate || new Date().toISOString().split('T')[0];
    const client = inv.clientName || '取引先';
    const docNo = inv.docNumber || '';
    const totalInc = inv.grandTotal;
    if (totalInc <= 0) return;

    // ① 売上計上仕訳
    if (isDateInPeriod(date, periodFilter)) {
      if (inv.docType === 'receipt') {
        // 領収書は即時現金売上
        unified.push({
          id: `jnl_rcpt_${inv.id}`,
          date,
          entryNumber: docNo || `RC-${inv.id.slice(-6)}`,
          description: `領収書売上（現金回収）: ${client} (${docNo})`,
          sourceType: 'invoice_sales',
          sourceId: inv.id,
          debitLines: [{ accountCode: '101', accountName: '現金', subAccount: '', amount: totalInc, taxType: 'taxable_10', invoiceType: 'qualified' }],
          creditLines: [{ accountCode: '401', accountName: '売上高', subAccount: client, amount: totalInc, taxType: 'taxable_10', invoiceType: 'qualified' }],
          totalDebit: totalInc,
          totalCredit: totalInc
        });
      } else {
        // 請求書・納品書の売上計上: （借）売掛金 / （貸）売上高
        unified.push({
          id: `jnl_inv_${inv.id}`,
          date,
          entryNumber: docNo || `INV-${inv.id.slice(-6)}`,
          description: `売上計上: ${client} (${docNo})`,
          sourceType: 'invoice_sales',
          sourceId: inv.id,
          debitLines: [{ accountCode: '111', accountName: '売掛金', subAccount: client, amount: totalInc, taxType: 'out_of_scope', invoiceType: 'qualified' }],
          creditLines: [{ accountCode: '401', accountName: '売上高', subAccount: client, amount: totalInc, taxType: 'taxable_10', invoiceType: 'qualified' }],
          totalDebit: totalInc,
          totalCredit: totalInc
        });
      }
    }

    // ② 売掛金回収仕訳（要件1: 手動・差額振替仕訳がある場合は二重計上を確実に防止）
    if (inv.docType !== 'receipt' && inv.isPaid) {
      const cleanInvId = String(inv.id).trim();
      // もし手動仕訳側でこの伝票に対する消込仕訳が登録されていれば自動生成をスキップ
      if (!manualReconciliationSourceIds.has(cleanInvId)) {
        const paidDate = inv.paidDate || inv.dueDate || date;
        if (isDateInPeriod(paidDate, periodFilter)) {
          unified.push({
            id: `jnl_pay_${inv.id}`,
            date: paidDate,
            entryNumber: docNo ? `REC-${docNo}` : `REC-${inv.id.slice(-6)}`,
            description: `売掛金回収（自動消込）: ${client} (${docNo})`,
            sourceType: 'invoice_receipt',
            sourceId: inv.id,
            debitLines: [{ accountCode: '102', accountName: '普通預金', subAccount: '', amount: totalInc, taxType: 'out_of_scope', invoiceType: 'none' }],
            creditLines: [{ accountCode: '111', accountName: '売掛金', subAccount: client, amount: totalInc, taxType: 'out_of_scope', invoiceType: 'none' }],
            totalDebit: totalInc,
            totalCredit: totalInc
          });
        }
      }
    }
  });

  // 2. 経費明細仕訳（要件1: 給与複合仕訳がある場合は二重計上を確実に防止）
  (expenses || []).forEach(exp => {
    if (!exp) return;
    const cleanExpId = String(exp.id).trim();
    if (manualPayrollSourceIds.has(cleanExpId)) {
      return; // 複合仕訳側で計上済みのためスキップ
    }

    const date = exp.date || new Date().toISOString().split('T')[0];
    if (!isDateInPeriod(date, periodFilter)) return;

    const amount = Number(exp.amount) || 0;
    const taxRate = Number(exp.taxRate !== undefined ? exp.taxRate : 10);
    const amountInc = Math.round(amount * (1 + taxRate / 100));
    const payee = exp.payee ? ` (${exp.payee})` : '';
    const expenseCat = exp.category || '雑費';
    const accDef = findAccountDef(expenseCat);
    const accCode = accDef ? accDef.code : '699';
    const taxType = taxRate === 8 ? 'taxable_8' : (taxRate === 10 ? 'taxable_10' : 'exempt');
    const invoiceType = exp.invoiceNumber ? 'qualified' : (exp.invoiceType || 'none');

    // 貸方支払方法の勘定科目判定
    let creditCode = '102';
    let creditName = '普通預金';
    const method = String(exp.paymentMethod || '').trim();
    if (method === '現金') {
      creditCode = '101'; creditName = '現金';
    } else if (method === '未払金' || method === 'クレジットカード') {
      creditCode = '212'; creditName = '未払金';
    } else if (method === '立替金' || method === '役員立替') {
      creditCode = '114'; creditName = '立替金';
    }

    unified.push({
      id: `jnl_exp_${exp.id}`,
      date,
      entryNumber: `EXP-${exp.id.slice(-6)}`,
      description: `${expenseCat}: ${exp.note || ''}${payee}`.trim(),
      sourceType: 'expense',
      sourceId: exp.id,
      debitLines: [{ accountCode: accCode, accountName: expenseCat, subAccount: '', amount: amountInc, taxType, invoiceType }],
      creditLines: [{ accountCode: creditCode, accountName: creditName, subAccount: method, amount: amountInc, taxType: 'out_of_scope', invoiceType: 'none' }],
      totalDebit: amountInc,
      totalCredit: amountInc
    });
  });

  // 2.5 給与計算データ自動仕訳（要件1: 手動給与仕訳がある場合はスキップ）
  (payrollRecords || []).forEach(pay => {
    if (!pay) return;
    const cleanPayId = String(pay.id || pay.recordId || '').trim();
    if (cleanPayId && manualPayrollSourceIds.has(cleanPayId)) {
      return; // 複合仕訳側で計上済みのためスキップ
    }

    const date = pay.paymentDate || pay.date || pay.period || '';
    if (!isDateInPeriod(date, periodFilter)) return;

    const grossSalary = Number(pay.grossSalary || pay.totalPayment || pay.grossPay || pay.total || 0);
    const deductions = Number(pay.deductionsTotal || pay.totalDeduction || pay.taxTotal || 0);
    const netSalary = Number(pay.netPayment || pay.netSalary || (grossSalary - deductions));
    const empName = pay.employeeName || pay.name || '従業員';

    if (grossSalary <= 0 && netSalary <= 0) return;

    const debLines = [
      { accountCode: '602', accountName: '給料手当', subAccount: empName, amount: grossSalary || netSalary, taxType: 'non_taxable', invoiceType: 'none' }
    ];
    const credLines = [];
    if (netSalary > 0) {
      credLines.push({ accountCode: '102', accountName: '普通預金', subAccount: '', amount: netSalary, taxType: 'out_of_scope', invoiceType: 'none' });
    }
    if (deductions > 0) {
      credLines.push({ accountCode: '214', accountName: '預り金', subAccount: '源泉税・社保控除', amount: deductions, taxType: 'out_of_scope', invoiceType: 'none' });
    }
    if (credLines.length === 0) {
      credLines.push({ accountCode: '102', accountName: '普通預金', subAccount: '', amount: grossSalary, taxType: 'out_of_scope', invoiceType: 'none' });
    }

    const totDeb = debLines.reduce((s, l) => s + l.amount, 0);
    const totCred = credLines.reduce((s, l) => s + l.amount, 0);

    unified.push({
      id: `jnl_pay_${cleanPayId || Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      entryNumber: `PAY-${(cleanPayId || '').slice(-6) || 'AUTO'}`,
      description: `給与支給: ${empName}`,
      sourceType: 'payroll',
      sourceId: cleanPayId,
      debitLines: debLines,
      creditLines: credLines,
      totalDebit: totDeb,
      totalCredit: totCred
    });
  });

  // 3. 手動・複合仕訳（振替伝票・消込差額・給与複合仕訳）
  (manualJournals || []).forEach(jnl => {
    if (!jnl) return;
    const date = jnl.date || '';
    if (!isDateInPeriod(date, periodFilter)) return;

    const val = validateManualJournal(jnl);
    if (!val.isValid) return;

    unified.push({
      id: jnl.id,
      date,
      entryNumber: jnl.entryNumber || `TR-${String(jnl.id).slice(-6)}`,
      description: jnl.description || '振替伝票',
      sourceType: jnl.sourceType || 'manual',
      sourceId: jnl.sourceId || '',
      debitLines: jnl.debitLines || [],
      creditLines: jnl.creditLines || [],
      totalDebit: val.totalDebit,
      totalCredit: val.totalCredit
    });
  });

  // 日付順（昇順）にソート
  unified.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return unified;
}

// 既存の generateJournalEntries との完全互換ラッパー関数
export function generateJournalEntries(invoices = [], expenses = [], periodFilter = 'all', manualJournals = []) {
  const unified = buildUnifiedJournals({ invoices, expenses, manualJournals, periodFilter });

  // 従来のシンプルなフラット仕訳形式（1借方・1貸方行）への変換互換
  const flatJournals = [];
  unified.forEach(u => {
    // 借方1行・貸方1行の単一仕訳
    if (u.debitLines.length === 1 && u.creditLines.length === 1) {
      flatJournals.push({
        id: u.id,
        date: u.date,
        debitAccount: u.debitLines[0].accountName,
        debitAmount: u.debitLines[0].amount,
        creditAccount: u.creditLines[0].accountName,
        creditAmount: u.creditLines[0].amount,
        description: u.description,
        docId: u.sourceId,
        type: u.sourceType
      });
    } else {
      // 複合仕訳の場合：元帳互換用フラット展開
      flatJournals.push({
        id: u.id,
        date: u.date,
        debitAccount: u.debitLines.length === 1 ? u.debitLines[0].accountName : '諸口',
        debitAmount: u.totalDebit,
        creditAccount: u.creditLines.length === 1 ? u.creditLines[0].accountName : '諸口',
        creditAmount: u.totalCredit,
        description: u.description,
        docId: u.sourceId,
        type: u.sourceType,
        isComplex: true,
        debitLines: u.debitLines,
        creditLines: u.creditLines
      });
    }
  });

  return flatJournals;
}

// ==========================================================================
// 6. 損益計算書（P/L）集計
//    【要件3: 売上原価 cost_of_sales と 販管費 sga の段階利益集計】
// ==========================================================================

export function calculateProfitAndLoss(invoices = [], expenses = [], periodFilter = 'all', manualJournals = []) {
  if (typeof invoices === 'string' || (invoices && typeof invoices === 'object' && !Array.isArray(invoices) && invoices.start !== undefined)) {
    periodFilter = invoices || 'all';
    invoices = [];
    expenses = [];
  }
  if (!Array.isArray(invoices)) invoices = [];
  if (!Array.isArray(expenses)) expenses = [];
  if (!periodFilter) periodFilter = 'all';

  const unified = buildUnifiedJournals({ invoices, expenses, manualJournals, periodFilter });

  let totalSales = 0;             // 総売上高（401）
  let totalNonOperatingRevenue = 0; // 営業外収益（411, 412）
  let totalCostOfSales = 0;       // 売上原価（500番台）
  let totalSga = 0;               // 販管費（600番台）
  let totalNonOperatingExpense = 0; // 営業外費用（700番台）

  const expenseByCategory = {};
  const revenueByCategory = {};

  // 統合仕訳からP/L科目（収益・費用）を抽出集計
  unified.forEach(u => {
    // 貸方の収益行を集計
    u.creditLines.forEach(c => {
      const acc = findAccountDef(c.accountCode || c.accountName);
      if (acc && acc.type === 'revenue') {
        const amt = Number(c.amount) || 0;
        if (acc.subType === 'operating_revenue') {
          totalSales += amt;
        } else {
          totalNonOperatingRevenue += amt;
        }
        revenueByCategory[acc.name] = (revenueByCategory[acc.name] || 0) + amt;
      }
    });

    // 借方の費用行を集計
    u.debitLines.forEach(d => {
      const acc = findAccountDef(d.accountCode || d.accountName);
      if (acc && acc.type === 'expense') {
        const amt = Number(d.amount) || 0;
        if (acc.subType === 'cost_of_sales') {
          totalCostOfSales += amt;
        } else if (acc.subType === 'non_operating_expense') {
          totalNonOperatingExpense += amt;
        } else {
          totalSga += amt;
        }
        expenseByCategory[acc.name] = (expenseByCategory[acc.name] || 0) + amt;
      }
    });
  });

  // 段階利益の計算
  const grossProfit = totalSales - totalCostOfSales; // 売上総利益（粗利）
  const grossProfitMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const operatingProfit = grossProfit - totalSga; // 営業利益
  const operatingProfitMargin = totalSales > 0 ? (operatingProfit / totalSales) * 100 : 0;
  const ordinaryProfit = operatingProfit + totalNonOperatingRevenue - totalNonOperatingExpense; // 経常利益
  const netIncome = ordinaryProfit; // 当期純利益（税引前・税引後同額計算）

  // 売掛金回収状況の集計
  let totalSalesInc = 0;
  let paidSalesInc = 0;
  let unpaidSalesInc = 0;

  invoices.forEach(rawInv => {
    const inv = normalizeInvoiceDoc(rawInv);
    if (!inv || inv.docType === 'estimate') return;
    if (!inv.isIssued || inv.isCancelled) return;
    if (!isDateInPeriod(inv.issueDate, periodFilter)) return;

    totalSalesInc += inv.grandTotal;
    if (inv.isPaid) {
      paidSalesInc += inv.grandTotal;
    } else {
      unpaidSalesInc += inv.grandTotal;
    }
  });

  return {
    periodFilter,
    totalSales,
    totalSalesTax: Math.round(totalSales * 0.10), // 目安
    totalSalesInc: totalSalesInc || totalSales,
    paidSalesInc,
    unpaidSalesInc,
    collectionRate: totalSalesInc > 0 ? (paidSalesInc / totalSalesInc) * 100 : 100,
    totalCostOfGoodsSold: totalCostOfSales,
    grossProfit,
    grossProfitMargin,
    totalOperatingExpenses: totalSga,
    operatingProfit,
    operatingProfitMargin,
    totalNonOperatingRevenue,
    totalNonOperatingExpense,
    ordinaryProfit,
    netIncome, // ★当期純利益（B/S純資産連動用）
    revenueByCategory,
    expenseByCategory
  };
}

// ==========================================================================
// 7. 総勘定元帳（General Ledger）
//    【要件2: 相手側が複数行ある場合の「諸口」表示対応】
// ==========================================================================

/**
 * 特定の勘定科目（および補助科目）の総勘定元帳データを計算
 * @param {string} targetAccountCodeOrName 
 * @param {object|Array} arg2 
 * @returns {object} 元帳明細および残高推移
 */
export function calculateGeneralLedger(targetAccountCodeOrName, arg2 = {}, arg3 = [], arg4 = {}, arg5 = [], arg6 = [], arg7 = 'all') {
  let accountMaster = DEFAULT_ACCOUNT_MASTER;
  let openingBalances = {};
  let unifiedJournals = [];
  let periodFilter = 'all';
  let subAccount = '';

  if (arg2 && typeof arg2 === 'object' && !Array.isArray(arg2) && (arg2.accountMaster || arg2.unifiedJournals || arg2.openingBalances !== undefined)) {
    // オブジェクト引数形式
    accountMaster = (Array.isArray(arg2.accountMaster) && arg2.accountMaster.length > 0) ? arg2.accountMaster : DEFAULT_ACCOUNT_MASTER;
    openingBalances = arg2.openingBalances || {};
    unifiedJournals = Array.isArray(arg2.unifiedJournals) ? arg2.unifiedJournals : [];
    periodFilter = arg2.periodFilter || 'all';
    subAccount = arg2.subAccount || '';
  } else if (Array.isArray(arg2)) {
    // 位置引数形式: calculateGeneralLedger(selectedAccount, invoices, expenses, fiscalSettings, accountMaster, manualJournals, periodFilter)
    const invoices = arg2;
    const expenses = Array.isArray(arg3) ? arg3 : [];
    const fiscalSettings = (arg4 && typeof arg4 === 'object' && !Array.isArray(arg4)) ? arg4 : {};
    accountMaster = (Array.isArray(arg5) && arg5.length > 0) ? arg5 : DEFAULT_ACCOUNT_MASTER;
    const manualJournals = Array.isArray(arg6) ? arg6 : [];
    periodFilter = arg7 || fiscalSettings.periodFilter || 'all';

    openingBalances = fiscalSettings.openingBalances || fiscalSettings || {};
    unifiedJournals = buildUnifiedJournals(invoices, expenses, manualJournals, [], periodFilter);
  }

  const accDef = findAccountDef(targetAccountCodeOrName, accountMaster);
  if (!accDef) {
    return { account: null, openingBalance: 0, entries: [], closingBalance: 0, totalDebit: 0, periodDebit: 0, totalCredit: 0, periodCredit: 0 };
  }

  // 期首残高の取得
  const openBalRaw = Number(openingBalances[accDef.code] || openingBalances[accDef.name] || 0);
  let currentBalance = openBalRaw;
  const isDebitAccount = accDef.dcType === 'debit'; // 借方が増加ポジション（資産・費用）

  const entries = [];
  let totalDebit = 0;
  let totalCredit = 0;

  unifiedJournals.forEach(jnl => {
    if (!isDateInPeriod(jnl.date, periodFilter)) return;

    // 当該仕訳の中で、対象科目が借方または貸方に登場するか判定
    const matchingDebits = (jnl.debitLines || []).filter(line => {
      const match = (line.accountCode === accDef.code || line.accountName === accDef.name);
      if (!match) return false;
      if (subAccount && line.subAccount && line.subAccount !== subAccount) return false;
      return true;
    });

    const matchingCredits = (jnl.creditLines || []).filter(line => {
      const match = (line.accountCode === accDef.code || line.accountName === accDef.name);
      if (!match) return false;
      if (subAccount && line.subAccount && line.subAccount !== subAccount) return false;
      return true;
    });

    // ① 対象科目が借方に存在する場合（借方発生）
    matchingDebits.forEach(debLine => {
      const amt = Number(debLine.amount) || 0;
      totalDebit += amt;

      if (isDebitAccount) {
        currentBalance += amt;
      } else {
        currentBalance -= amt;
      }

      // 【要件2: 相手勘定の判定】貸方行が複数ある場合は「諸口」、1行ならその科目名
      let counterpart = '諸口';
      if (jnl.creditLines.length === 1) {
        counterpart = jnl.creditLines[0].accountName;
        if (jnl.creditLines[0].subAccount) counterpart += ` (${jnl.creditLines[0].subAccount})`;
      }

      entries.push({
        id: `${jnl.id}_deb`,
        journalId: jnl.id,
        date: jnl.date,
        entryNumber: jnl.entryNumber,
        counterpart,
        counterAccount: counterpart, // 互換性
        description: jnl.description,
        debitAmount: amt,
        creditAmount: 0,
        balance: currentBalance,
        subAccount: debLine.subAccount || '',
        sourceType: jnl.sourceType,
        sourceId: jnl.sourceId
      });
    });

    // ② 対象科目が貸方に存在する場合（貸方発生）
    matchingCredits.forEach(credLine => {
      const amt = Number(credLine.amount) || 0;
      totalCredit += amt;

      if (isDebitAccount) {
        currentBalance -= amt;
      } else {
        currentBalance += amt;
      }

      // 【要件2: 相手勘定の判定】借方行が複数ある場合は「諸口」、1行ならその科目名
      let counterpart = '諸口';
      if (jnl.debitLines.length === 1) {
        counterpart = jnl.debitLines[0].accountName;
        if (jnl.debitLines[0].subAccount) counterpart += ` (${jnl.debitLines[0].subAccount})`;
      }

      entries.push({
        id: `${jnl.id}_cred`,
        journalId: jnl.id,
        date: jnl.date,
        entryNumber: jnl.entryNumber,
        counterpart,
        counterAccount: counterpart, // 互換性
        description: jnl.description,
        debitAmount: 0,
        creditAmount: amt,
        balance: currentBalance,
        subAccount: credLine.subAccount || '',
        sourceType: jnl.sourceType,
        sourceId: jnl.sourceId
      });
    });
  });

  return {
    account: accDef,
    openingBalance: openBalRaw,
    entries,
    closingBalance: currentBalance,
    totalDebit,
    periodDebit: totalDebit, // 互換性
    totalCredit,
    periodCredit: totalCredit // 互換性
  };
}

// ==========================================================================
// 8. 残高試算表（Trial Balance）
// ==========================================================================

/**
 * 残高試算表（合計残高試算表）の計算
 * @param {object|Array} arg1
 * @returns {object} 全科目の期首・借方計・貸方計・期末残高および合計バランス
 */
export function calculateTrialBalance(arg1 = {}, arg2 = {}, arg3 = {}, arg4 = [], arg5 = [], arg6 = 'all') {
  let accountMaster = DEFAULT_ACCOUNT_MASTER;
  let openingBalances = {};
  let unifiedJournals = [];
  let periodFilter = 'all';

  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1) && (arg1.accountMaster || arg1.unifiedJournals || arg1.openingBalances !== undefined)) {
    // オブジェクト引数形式: { accountMaster, openingBalances, unifiedJournals, periodFilter }
    accountMaster = (Array.isArray(arg1.accountMaster) && arg1.accountMaster.length > 0) ? arg1.accountMaster : DEFAULT_ACCOUNT_MASTER;
    openingBalances = arg1.openingBalances || {};
    unifiedJournals = Array.isArray(arg1.unifiedJournals) ? arg1.unifiedJournals : [];
    periodFilter = arg1.periodFilter || 'all';
  } else if (Array.isArray(arg1)) {
    // 位置引数形式: calculateTrialBalance(invoices, expenses, fiscalSettings, accountMaster, manualJournals, periodFilter)
    const invoices = arg1;
    const expenses = Array.isArray(arg2) ? arg2 : [];
    const fiscalSettings = (arg3 && typeof arg3 === 'object' && !Array.isArray(arg3)) ? arg3 : {};
    accountMaster = (Array.isArray(arg4) && arg4.length > 0) ? arg4 : DEFAULT_ACCOUNT_MASTER;
    const manualJournals = Array.isArray(arg5) ? arg5 : [];
    periodFilter = arg6 || fiscalSettings.periodFilter || 'all';

    openingBalances = fiscalSettings.openingBalances || fiscalSettings || {};
    unifiedJournals = buildUnifiedJournals(invoices, expenses, manualJournals, [], periodFilter);
  }

  const master = Array.isArray(accountMaster) && accountMaster.length > 0 ? accountMaster : DEFAULT_ACCOUNT_MASTER;

  let totalOpeningDebit = 0;
  let totalOpeningCredit = 0;
  let totalPeriodDebit = 0;
  let totalPeriodCredit = 0;
  let totalClosingDebit = 0;
  let totalClosingCredit = 0;

  // 1. 各科目の期間中借方・貸方合計を集計
  const periodDebits = {};
  const periodCredits = {};

  unifiedJournals.forEach(jnl => {
    if (!isDateInPeriod(jnl.date, periodFilter)) return;

    (jnl.debitLines || []).forEach(line => {
      const code = line.accountCode || findAccountDef(line.accountName, master)?.code;
      if (code) {
        periodDebits[code] = (periodDebits[code] || 0) + (Number(line.amount) || 0);
      }
    });

    (jnl.creditLines || []).forEach(line => {
      const code = line.accountCode || findAccountDef(line.accountName, master)?.code;
      if (code) {
        periodCredits[code] = (periodCredits[code] || 0) + (Number(line.amount) || 0);
      }
    });
  });

  // 2. 全科目の行データを生成
  const rows = master.map(acc => {
    const rawOpen = Number(openingBalances[acc.code] || openingBalances[acc.name] || 0);
    const pDeb = periodDebits[acc.code] || 0;
    const pCred = periodCredits[acc.code] || 0;

    let openingDebit = 0;
    let openingCredit = 0;

    if (acc.dcType === 'debit') {
      openingDebit = rawOpen;
      totalOpeningDebit += openingDebit;
    } else {
      openingCredit = rawOpen;
      totalOpeningCredit += openingCredit;
    }

    totalPeriodDebit += pDeb;
    totalPeriodCredit += pCred;

    // 期末残高の算出
    let closingDebit = 0;
    let closingCredit = 0;

    if (acc.dcType === 'debit') {
      const bal = openingDebit + pDeb - pCred;
      if (bal >= 0) {
        closingDebit = bal;
      } else {
        closingCredit = Math.abs(bal);
      }
    } else {
      const bal = openingCredit + pCred - pDeb;
      if (bal >= 0) {
        closingCredit = bal;
      } else {
        closingDebit = Math.abs(bal);
      }
    }

    totalClosingDebit += closingDebit;
    totalClosingCredit += closingCredit;

    return {
      code: acc.code,
      name: acc.name,
      type: acc.type,
      subType: acc.subType,
      dcType: acc.dcType,
      openingDebit,
      openingCredit,
      periodDebit: pDeb,
      debitTotal: pDeb, // 互換性
      periodCredit: pCred,
      creditTotal: pCred, // 互換性
      closingDebit,
      debitBalance: closingDebit, // 互換性
      closingCredit,
      creditBalance: closingCredit // 互換性
    };
  });

  const isBalanced = totalClosingDebit === totalClosingCredit;

  return {
    rows,
    totals: {
      totalOpeningDebit,
      totalOpeningCredit,
      totalPeriodDebit,
      debitTotal: totalPeriodDebit, // 互換性
      totalPeriodCredit,
      creditTotal: totalPeriodCredit, // 互換性
      totalClosingDebit,
      debitBalanceTotal: totalClosingDebit, // 互換性
      totalClosingCredit,
      creditBalanceTotal: totalClosingCredit, // 互換性
      isBalanced
    },
    isBalanced // ★トップレベルの貸借一致フラグ
  };
}

// ==========================================================================
// 9. 貸借対照表（Balance Sheet: B/S）
//    【要件5: P/L当期純利益の繰越利益剰余金への自動合算と貸借完全一致】
// ==========================================================================

/**
 * 貸借対照表（B/S）の計算
 * @param {object|Array} arg1
 * @returns {object} 資産・負債・純資産の部および完全一致バランス検証
 */
export function calculateBalanceSheet(arg1 = {}, arg2 = {}, arg3 = {}, arg4 = [], arg5 = [], arg6 = 'all') {
  let accountMaster = DEFAULT_ACCOUNT_MASTER;
  let openingBalances = {};
  let unifiedJournals = [];
  let periodFilter = 'all';
  let profitAndLoss = null;

  if (arg1 && typeof arg1 === 'object' && !Array.isArray(arg1) && (arg1.accountMaster || arg1.unifiedJournals || arg1.openingBalances !== undefined || arg1.profitAndLoss)) {
    // オブジェクト引数形式: { accountMaster, openingBalances, unifiedJournals, periodFilter, profitAndLoss }
    accountMaster = (Array.isArray(arg1.accountMaster) && arg1.accountMaster.length > 0) ? arg1.accountMaster : DEFAULT_ACCOUNT_MASTER;
    openingBalances = arg1.openingBalances || {};
    unifiedJournals = Array.isArray(arg1.unifiedJournals) ? arg1.unifiedJournals : [];
    periodFilter = arg1.periodFilter || 'all';
    profitAndLoss = arg1.profitAndLoss || null;
  } else if (Array.isArray(arg1)) {
    // 位置引数形式: calculateBalanceSheet(invoices, expenses, fiscalSettings, accountMaster, manualJournals, periodFilter)
    const invoices = arg1;
    const expenses = Array.isArray(arg2) ? arg2 : [];
    const fiscalSettings = (arg3 && typeof arg3 === 'object' && !Array.isArray(arg3)) ? arg3 : {};
    accountMaster = (Array.isArray(arg4) && arg4.length > 0) ? arg4 : DEFAULT_ACCOUNT_MASTER;
    const manualJournals = Array.isArray(arg5) ? arg5 : [];
    periodFilter = arg6 || fiscalSettings.periodFilter || 'all';

    openingBalances = fiscalSettings.openingBalances || fiscalSettings || {};
    unifiedJournals = buildUnifiedJournals(invoices, expenses, manualJournals, [], periodFilter);
    profitAndLoss = calculateProfitAndLoss(invoices, expenses, periodFilter, manualJournals);
  }

  // 試算表をベースに残高を算出
  const tb = calculateTrialBalance({ accountMaster, openingBalances, unifiedJournals, periodFilter });
  const bsRows = tb.rows.filter(r => r.type === 'asset' || r.type === 'liability' || r.type === 'equity');

  // 当期純利益（P/Lから取得、未指定なら自動算出）
  const pl = profitAndLoss || calculateProfitAndLoss([], [], periodFilter);
  const netIncome = pl.netIncome || 0; // 当期純利益

  // 1. 資産の部 (Assets)
  const currentAssets = [];
  const fixedAssets = [];
  let totalCurrentAssets = 0;
  let totalFixedAssets = 0;

  // 2. 負債の部 (Liabilities)
  const currentLiabilities = [];
  const fixedLiabilities = [];
  let totalCurrentLiabilities = 0;
  let totalFixedLiabilities = 0;

  // 3. 純資産の部 (Equity)
  const equityItems = [];
  let totalEquityBase = 0;

  bsRows.forEach(r => {
    // 資産科目
    if (r.type === 'asset') {
      const amount = r.closingDebit - r.closingCredit;
      const itemObj = { code: r.code, name: r.name, amount, balance: amount };
      if (r.subType === 'fixed_asset') {
        fixedAssets.push(itemObj);
        totalFixedAssets += amount;
      } else {
        currentAssets.push(itemObj);
        totalCurrentAssets += amount;
      }
    }
    // 負債科目
    else if (r.type === 'liability') {
      const amount = r.closingCredit - r.closingDebit;
      const itemObj = { code: r.code, name: r.name, amount, balance: amount };
      if (r.subType === 'fixed_liability') {
        fixedLiabilities.push(itemObj);
        totalFixedLiabilities += amount;
      } else {
        currentLiabilities.push(itemObj);
        totalCurrentLiabilities += amount;
      }
    }
    // 純資産科目
    else if (r.type === 'equity') {
      const amount = r.closingCredit - r.closingDebit;
      equityItems.push({ code: r.code, name: r.name, amount, balance: amount });
      totalEquityBase += amount;
    }
  });

  // 純資産に「当期純利益」を項目として追加（UIで自動表示されるようにする）
  equityItems.push({ code: 'NET_INCOME', name: '当期純利益', amount: netIncome, balance: netIncome });

  const totalAssets = totalCurrentAssets + totalFixedAssets;
  const totalLiabilities = totalCurrentLiabilities + totalFixedLiabilities;

  // 【要件5: 当期純利益を純資産に自動合算し完全貸借バランス】
  const totalEquity = totalEquityBase + netIncome;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const balanceDiff = totalAssets - totalLiabilitiesAndEquity;

  return {
    assets: {
      current: currentAssets,
      totalCurrent: totalCurrentAssets,
      currentTotal: totalCurrentAssets, // 互換性
      fixed: fixedAssets,
      totalFixed: totalFixedAssets,
      fixedTotal: totalFixedAssets, // 互換性
      total: totalAssets
    },
    liabilities: {
      current: currentLiabilities,
      totalCurrent: totalCurrentLiabilities,
      currentTotal: totalCurrentLiabilities, // 互換性
      fixed: fixedLiabilities,
      totalFixed: totalFixedLiabilities,
      fixedTotal: totalFixedLiabilities, // 互換性
      total: totalLiabilities
    },
    equity: {
      items: equityItems,
      netIncome, // P/Lからの当期純利益
      total: totalEquity
    },
    totalLiabilitiesAndEquity,
    balanceDiff,
    diff: balanceDiff, // 互換性
    isBalanced: Math.abs(balanceDiff) === 0
  };
}

// ==========================================================================
// 10. 期首残高 貸借バランスバリデーション
//     【要件5: 資産＝負債＋純資産の一致チェック】
// ==========================================================================

export function validateOpeningBalances(openingBalances = {}, accountMaster = DEFAULT_ACCOUNT_MASTER) {
  const master = Array.isArray(accountMaster) && accountMaster.length > 0 ? accountMaster : DEFAULT_ACCOUNT_MASTER;
  let debitTotal = 0; // 資産合計
  let creditTotal = 0; // 負債＋純資産合計

  Object.entries(openingBalances || {}).forEach(([codeOrName, val]) => {
    const amt = Number(val) || 0;
    if (amt === 0) return;

    const acc = findAccountDef(codeOrName, master);
    if (!acc) return;

    if (acc.dcType === 'debit') {
      debitTotal += amt;
    } else {
      creditTotal += amt;
    }
  });

  const diff = debitTotal - creditTotal;
  return {
    debitTotal,
    creditTotal,
    diff,
    isBalanced: diff === 0
  };
}

// ==========================================================================
// 11. CSVエクスポート
// ==========================================================================

export function exportJournalsToCSV(journals = []) {
  const headers = [
    '取引No',
    '取引日',
    '借方勘定科目',
    '借方補助科目',
    '借方金額(税込)',
    '貸方勘定科目',
    '貸方補助科目',
    '貸方金額(税込)',
    '摘要',
    '税区分',
    'インボイス区分',
    '仕訳種別'
  ];

  const rows = [];
  journals.forEach((j, idx) => {
    // 複合仕訳の行展開
    const debLines = j.debitLines || [{ accountName: j.debitAccount, subAccount: '', amount: j.debitAmount, taxType: 'taxable_10', invoiceType: 'qualified' }];
    const credLines = j.creditLines || [{ accountName: j.creditAccount, subAccount: '', amount: j.creditAmount, taxType: 'taxable_10', invoiceType: 'qualified' }];
    const maxLines = Math.max(debLines.length, credLines.length);

    for (let i = 0; i < maxLines; i++) {
      const deb = debLines[i] || { accountName: '', subAccount: '', amount: '' };
      const cred = credLines[i] || { accountName: '', subAccount: '', amount: '' };
      rows.push([
        j.entryNumber || (idx + 1),
        j.date,
        `"${deb.accountName || ''}"`,
        `"${deb.subAccount || ''}"`,
        deb.amount !== '' ? deb.amount : '',
        `"${cred.accountName || ''}"`,
        `"${cred.subAccount || ''}"`,
        cred.amount !== '' ? cred.amount : '',
        `"${(j.description || '').replace(/"/g, '""')}"`,
        deb.taxType || cred.taxType || 'taxable_10',
        deb.invoiceType || cred.invoiceType || 'qualified',
        j.sourceType || j.type || 'journal'
      ]);
    }
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  return csvContent;
}
