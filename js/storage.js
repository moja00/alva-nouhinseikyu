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
  ITEM_CATEGORIES: 'alva_item_categories',
  NON_STOCK_CATEGORIES: 'alva_non_stock_categories',
  DISCOUNT_REASONS: 'quickdoc_discount_reasons',
  USER_PRICE_HISTORY: 'quickdoc_user_price_history',
  EXPENSES: 'quickdoc_expenses',
  ATTENDANCE: 'quickdoc_attendance',
  ATTENDANCE_EMPLOYEE: 'billcraft_attendance_employee',
  INVENTORY: 'billcraft_inventory_master',
  INVENTORY_LOTS: 'billcraft_inventory_lots',
  INVENTORY_SERIALS: 'billcraft_inventory_serials',
  PURCHASE_MAPPINGS: 'billcraft_purchase_mappings',
  PAYROLL_RECORDS: 'billcraft_payroll_records',
  PAYROLL_SETTINGS: 'billcraft_payroll_settings',
  PREVIOUS_YEAR_INCOME: 'billcraft_previous_year_income',
  ACCOUNT_MASTER: 'billcraft_account_master',
  MANUAL_JOURNALS: 'billcraft_manual_journals',
  FISCAL_SETTINGS: 'billcraft_fiscal_settings',
  LOCKED_MONTHS: 'billcraft_locked_months',
  DELETED_DOC_IDS: 'quickdoc_deleted_doc_ids',
  DELETED_EXPENSE_IDS: 'billcraft_deleted_expense_ids',
  TRASH_HISTORY: 'quickdoc_trash_history',
  DELETED_SERIALS: 'billcraft_deleted_serials'
};

/**
 * 削除済み経費IDセットを取得（他端末・同期時のゾンビ復活防止用）
 * @returns {Set<string>}
 */
export function getDeletedExpenseIds() {
  try {
    const raw = localStorage.getItem(KEYS.DELETED_EXPENSE_IDS);
    const set = new Set(raw ? JSON.parse(raw) : []);
    // 既知の重複データ（2026-10-07 ENEOS重複分）のゾンビ復活を恒久防止
    set.add('exp_1791374792331_42ih');
    return set;
  } catch (e) {
    return new Set(['exp_1791374792331_42ih']);
  }
}

/**
 * 経費IDを削除済みリストに永続記録
 * @param {string} id
 */

// 過去のテスト用・架空シリアル番号の完全排除ブラックリスト（入荷ロット未登録・ゾンビ復活防止用）
const PURGED_TEST_SERIALS = [
  'N8001', 'N8002', 'N8003', 'N8004', 'N8005',
  'BAT-2610-001', 'BAT-2610-002', 'BAT-2610-003', 'BAT-2610-004', 'BAT-2610-005',
  'BAT-2610-006', 'BAT-2610-007', 'BAT-2610-008', 'BAT-2610-009', 'BAT-2610-010',
  'N4850870086',
  'N2001', 'N2002'
];

/**
 * 削除済みシリアル番号セットを取得（台帳からの完全削除・ゾンビ復活防止用）
 * @returns {Set<string>}
 */
export function getDeletedSerialNumbers() {
  try {
    const raw = localStorage.getItem(KEYS.DELETED_SERIALS);
    const arr = raw ? JSON.parse(raw) : [];
    const set = new Set(Array.isArray(arr) ? arr.map(s => String(s).trim().toUpperCase()) : []);
    PURGED_TEST_SERIALS.forEach(s => set.add(s));
    return set;
  } catch (e) {
    return new Set(PURGED_TEST_SERIALS);
  }
}

/**
 * シリアル番号を削除済みリストに永続記録
 * @param {string} sn
 */
export function recordDeletedSerial(sn) {
  if (!sn) return;
  try {
    const set = getDeletedSerialNumbers();
    set.add(String(sn).trim().toUpperCase());
    localStorageSetItemAndSync(KEYS.DELETED_SERIALS, JSON.stringify(Array.from(set)));
  } catch (e) { }
}

/**
 * シリアル番号を削除済みリストから除外（再登録時）
 * @param {string} sn
 */
export function removeDeletedSerial(sn) {
  if (!sn) return;
  try {
    const set = getDeletedSerialNumbers();
    set.delete(String(sn).trim().toUpperCase());
    localStorageSetItemAndSync(KEYS.DELETED_SERIALS, JSON.stringify(Array.from(set)));
  } catch (e) { }
}

export function recordDeletedExpenseId(id) {
  if (!id) return;
  try {
    const set = getDeletedExpenseIds();
    set.add(String(id).trim());
    localStorage.setItem(KEYS.DELETED_EXPENSE_IDS, JSON.stringify(Array.from(set).slice(-500)));
  } catch (e) { }
}

/**
 * 経費IDを削除済みリストから除外
 * @param {string} id
 */
export function removeDeletedExpenseId(id) {
  if (!id) return;
  try {
    const set = getDeletedExpenseIds();
    set.delete(String(id).trim());
    localStorage.setItem(KEYS.DELETED_EXPENSE_IDS, JSON.stringify(Array.from(set)));
  } catch (e) { }
}

/**
 * 削除済み書類IDセットを取得（他端末へのゾンビ復活防止用）
 * @returns {Set<string>}
 */
export function getDeletedDocIds() {
  try {
    const raw = localStorage.getItem(KEYS.DELETED_DOC_IDS);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

/**
 * 削除済み請求書/書類IDセットを取得（エイリアス）
 * @returns {Set<string>}
 */
export function getDeletedInvoiceIds() {
  return getDeletedDocIds();
}

/**
 * 書類IDを削除済みリストに永続記録
 * @param {string} id
 */
export function recordDeletedDocId(id) {
  if (!id) return;
  try {
    const set = getDeletedDocIds();
    set.add(String(id).trim());
    localStorage.setItem(KEYS.DELETED_DOC_IDS, JSON.stringify(Array.from(set).slice(-500)));
  } catch (e) { }
}

/**
 * 書類IDを削除済みリストから除外（書類復活時）
 * @param {string} id
 */
export function removeDeletedDocId(id) {
  if (!id) return;
  try {
    const set = getDeletedDocIds();
    set.delete(String(id).trim());
    localStorage.setItem(KEYS.DELETED_DOC_IDS, JSON.stringify(Array.from(set)));
  } catch (e) { }
}

const TRASH_RETENTION_DAYS = 30;

/**
 * ごみ箱（削除済み書類一覧）を取得（30日経過データは自動消去）
 * @returns {Array<any>}
 */
export function getTrashList() {
  try {
    const raw = localStorage.getItem(KEYS.TRASH_HISTORY);
    const list = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const maxAgeMs = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let hasExpired = false;
    const validList = list.filter(item => {
      if (!item || !item.id) return false;

      // 30日（TRASH_RETENTION_DAYS）を経過した削除書類は自動消去
      if (item.deletedAt) {
        const deletedTime = new Date(item.deletedAt).getTime();
        if (!isNaN(deletedTime) && (now - deletedTime > maxAgeMs)) {
          hasExpired = true;
          return false;
        }
      }

      // 中身（書類番号、取引先、明細、または金額）が1つも存在しない空骨データを除外
      const full = item.fullDoc || item;
      const docNum = item.docNumber || item.number || full.docNumber || full.number;
      const client = item.clientName || item.client?.name || full.clientName || full.client?.name;
      const items = item.items || full.items;
      const total = item.grandTotal ?? item.totalAmount ?? (item.totals && item.totals.total) ?? (full.totals && full.totals.total);
      return !!(docNum || client || (items && items.length > 0) || (total && total > 0));
    });

    if (hasExpired) {
      saveTrashList(validList);
      console.log(`【ごみ箱】30日を経過した古い削除書類を自動消去しました (残${validList.length}件)`);
    }

    return validList;
  } catch (e) {
    return [];
  }
}

/**
 * ごみ箱を保存
 * @param {Array<any>} list
 */
export function saveTrashList(list) {
  try {
    localStorage.setItem(KEYS.TRASH_HISTORY, JSON.stringify((list || []).slice(0, 100)));
  } catch (e) {
    console.error('Failed to save trash list:', e);
  }
}

/**
 * 削除された書類をごみ箱に追加（完全な中身を保持・空骨データによる上書きを完全防止）
 * @param {any} docItem
 */
export function addDocToTrash(docItem) {
  if (!docItem || !docItem.id) return;
  try {
    const trash = getTrashList();
    const cleanId = String(docItem.id).trim();

    // fullDoc または docItem 自体から詳細情報を抽出
    const full = docItem.fullDoc || docItem;
    const docNumber = docItem.docNumber || full.docNumber || docItem.number || full.number || '';
    const clientName = docItem.clientName || (docItem.client && docItem.client.name) || (full.client && full.client.name) || '';
    const items = (Array.isArray(docItem.items) && docItem.items.length > 0) ? docItem.items : (Array.isArray(full.items) ? full.items : []);
    const grandTotal = docItem.grandTotal ?? docItem.totalAmount ?? full.grandTotal ?? full.totalAmount ?? (full.totals && full.totals.total) ?? 0;
    const docType = docItem.type || full.type || 'invoice';
    const issueDate = docItem.issueDate || full.issueDate || '';
    const title = docItem.title || full.title || '';

    // 書類の実体データ（中身）があるか判定
    const hasSubstance = !!(docNumber || clientName || (items && items.length > 0) || grandTotal > 0);

    const existingItem = trash.find(item => String(item.id).trim() === cleanId);
    if (existingItem) {
      // 既存データが既に詳細情報を持っており、新しいデータが中身のない骨組みデータなら上書きしない
      if (!hasSubstance) {
        console.log(`【ごみ箱】伝票(${cleanId})は既存の詳細情報を保持するため、骨組みデータでの上書きをスキップします`);
        return;
      }
    } else {
      // 既存にもなく、新規データにも中身が全くない空骨データならごみ箱に登録しない
      if (!hasSubstance) {
        console.log(`【ごみ箱】伝票(${cleanId})は詳細データ（番号・取引先等）が存在しない空骨データのため登録をスキップします`);
        return;
      }
    }

    const filtered = trash.filter(item => String(item.id).trim() !== cleanId);
    const trashEntry = {
      ...docItem,
      type: docType,
      docNumber,
      title,
      clientName: clientName || '名称未設定',
      client: docItem.client || full.client || { name: clientName || '名称未設定' },
      issueDate,
      grandTotal,
      totalAmount: grandTotal,
      items,
      fullDoc: full,
      deletedAt: docItem.deletedAt || new Date().toISOString()
    };
    filtered.unshift(trashEntry);
    saveTrashList(filtered);
    console.log(`【ごみ箱】伝票(${cleanId}: ${docNumber || clientName})をごみ箱に退避保管しました (現在${filtered.length}件)`);
  } catch (e) {
    console.error('Failed to add doc to trash:', e);
  }
}

/**
 * ごみ箱から特定の書類を完全に削除
 * @param {string} id
 */
export function purgeTrashDoc(id) {
  try {
    const cleanId = String(id).trim();
    const trash = getTrashList().filter(item => String(item.id).trim() !== cleanId);
    saveTrashList(trash);
  } catch (e) {
    console.error('Failed to purge trash doc:', e);
  }
}

/**
 * ごみ箱を完全に空にする
 */
export function clearAllTrashDocs() {
  try {
    localStorage.removeItem(KEYS.TRASH_HISTORY);
    return true;
  } catch (e) {
    console.error('Failed to clear trash:', e);
    return false;
  }
}

/**
 * ごみ箱から書類を復元
 * @param {string} id
 */
export async function restoreDocFromTrash(id) {
  try {
    const cleanId = String(id).trim();
    const trash = getTrashList();
    const target = trash.find(item => String(item.id).trim() === cleanId);
    if (!target) return { success: false, error: '復元対象の書類が見つかりません' };

    console.log(`【書類復元】ID: ${cleanId} の復元を開始します...`);

    // 1. ローカル削除IDセットから除外（ゾンビ扱いを解除）
    removeDeletedDocId(cleanId);

    // 2. 履歴リストへ復帰
    const history = getHistoryList();
    const newHistory = history.filter(item => String(item.id).trim() !== cleanId);
    const { deletedAt, _deleted, ...restoredDoc } = target;
    restoredDoc.updatedAt = new Date().toISOString();
    newHistory.unshift(restoredDoc);
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(newHistory));

    // 2.5. 【シリアル台帳連動】復元された書類に紐づくシリアル番号を再び「出荷済（shipped）」に復旧！
    try {
      const fullDoc = restoredDoc.fullDoc || restoredDoc;
      if (fullDoc && Array.isArray(fullDoc.items) && !fullDoc.isCancelled) {
        const docNo = fullDoc.docNumber || '';
        const clientName = fullDoc.client ? (fullDoc.client.name || '') : (fullDoc.clientName || '');
        const shipDate = fullDoc.issueDate || fullDoc.date || '';

        fullDoc.items.forEach(it => {
          if (!it) return;
          const itemSerials = [];
          if (Array.isArray(it.assignedSerials) && it.assignedSerials.length > 0) {
            it.assignedSerials.forEach(as => {
              if (as && as.serialNumber) itemSerials.push(as.serialNumber.trim().toUpperCase());
            });
          }
          if (it.serialNumber && typeof it.serialNumber === 'string') {
            const rawSns = it.serialNumber.split(/[,、\s]+/).map(s => s.trim().toUpperCase()).filter(s => /^N\s*\d{4,12}$/i.test(s));
            rawSns.forEach(sn => {
              const normSn = sn.replace(/\s+/g, '');
              if (!itemSerials.includes(normSn)) itemSerials.push(normSn);
            });
          }

          itemSerials.forEach(sn => {
            updateSerialStatus(sn, 'shipped', {
              clientName: clientName,
              customerName: clientName,
              docNumber: docNo,
              docId: cleanId,
              invoiceNumber: docNo,
              invoiceId: cleanId,
              shipDate: shipDate,
              shippedDate: shipDate
            });
          });
        });
      }
    } catch (snRestoreErr) {
      console.warn('【書類復元】シリアル再出荷連動エラー:', snRestoreErr);
    }

    // 3. ごみ箱から除外
    purgeTrashDoc(cleanId);

    // 4. サーバーAPI (/api/invoices/restore) へ通知して Firestore の deleted_invoices からも解除
    try {
      const fullDoc = restoredDoc.fullDoc || restoredDoc;
      await apiFetch('/api/invoices/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cleanId,
          doc: fullDoc
        })
      });
      console.log(`【書類復元】サーバー側の復元通知APIが成功しました`);
      // サーバー履歴と即時同期
      await syncInvoicesHistoryWithServer();
    } catch (apiErr) {
      console.warn('【書類復元】サーバー通知警告 (ローカル復元は完了):', apiErr);
    }

    return { success: true, doc: restoredDoc };
  } catch (e) {
    console.error('Failed to restore doc from trash:', e);
    return { success: false, error: e.message || String(e) };
  }
}

let syncTimeout = null;
function localStorageSetItemAndSync(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[LocalStorage] setItem error:', e);
  }
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (typeof window !== 'undefined' && window.pushAllLocalDataToServer) {
      // 未ログイン状態なら無駄な通信とエラーを避けてスキップ
      if (typeof getFirebaseAuthToken === 'function') {
        const token = await getFirebaseAuthToken(false);
        if (!token) return;
      }
      try {
        const res = await window.pushAllLocalDataToServer();
        if (res && !res.success) {
          console.warn('[自動保存] バックグラウンド保存保留:', res.error);
        }
      } catch (e) {
        // 静かにローカルのみで維持
      }
    }
  }, 1200);
}


/**
 * 商品名・取引先名の正規化（全角半角スペース・英数記号の揺れを統一）
 */
export function normalizeMasterName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFKC') // 全角英数や全角記号を半角に正規化
    .replace(/[\s\u3000]+/g, ' ') // 全角スペースや連続空白を1つの半角スペースに統一
    .trim();
}

/**
 * マスタの比較用キー（大文字小文字・空白揺れを完全吸収）
 */
export function getMasterKey(name) {
  return normalizeMasterName(name).toLowerCase();
}

// 排除すべきサンプルデータの一覧（正規化キー）
export const SAMPLE_ITEM_KEYS = new Set([
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
/**
 * 修理・オーバーホール・中古部品等の修理項目かどうかを判定
 * （※商品マスタでは「修理・工賃」カテゴリとして選択・明細引用可能。在庫マスタからは自動除外）
 * @param {string|object} item
 * @returns {boolean}
 */
export function isRepairItem(item) {
  if (!item) return false;
  const name = typeof item === 'string' ? item : (item.name || '');
  if (!name) return false;
  const n = String(name).trim();

  // 0. 値引き・割引・相殺・調整行（非商品・非在庫）
  if (/値引|割引|相殺|調整|特別値引|出精値引/i.test(n)) {
    return true;
  }

  // 1. 具体的な指定修理品目パターン
  if (/オーバーホール|研磨機|クラッチ用|スイッチング|電源基盤|モーター及び電源関係|本体交換部品|バイト台/i.test(n)) {
    return true;
  }

  // 2. 「（中古）」、「中古部品使用」等の修理用中古パーツ
  if (/中古部品使用|（中古）|\(中古\)|（中古部品/i.test(n)) {
    return true;
  }

  // 3. 修理役務・工賃・点検
  if (/修理料金|修理費用|修理基本料金|点検費用|分解点検|修理工賃|作業工賃|修理作業/i.test(n)) {
    return true;
  }

  return false;
}

export function isSampleItem(item) {
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

export const DEFAULT_NON_STOCK_CATEGORIES = [
  '修理・工賃',
  '修理・オーバーホール',
  '工賃・役務',
  '役務・工賃',
  'サービス',
  '配送料'
];

export const DEFAULT_ITEM_CATEGORIES = [
  '本体・セット',
  'アタッチメント',
  'アクセサリー',
  '消耗品・クランプ',
  '修理・工賃',
  'その他'
];

const DEFAULT_ITEMS_MASTER = [
  {
    id: "prod_1790319200414_10bm",
    name: "DP-MS　メカニカルスプレッダー",
    category: "アタッチメント",
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
    category: "アタッチメント",
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
    category: "アクセサリー",
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
    category: "本体・セット",
    unitPrice: 268257,
    userPrice: 360000,
    unit: "セット",
    taxRate: 10,
    note: "",
    usageCount: 7,
    createdAt: "2026-09-25T06:32:42.497Z",
    lastUsedAt: "2026-09-29T05:06:55.002Z",
    updatedAt: "2026-09-29T05:06:55.007Z"
  },
  {
    id: "prod_auto_7",
    name: "HIC-025　ホールドイットクランプ",
    category: "消耗品・クランプ",
    unitPrice: 10400,
    userPrice: 11440,
    unit: "セット",
    taxRate: 10,
    note: "",
    usageCount: 2,
    createdAt: "2026-09-24T00:00:00.000Z",
    updatedAt: "2026-10-27T06:37:16.228Z",
    lastUsedAt: "2026-10-27T06:37:16.222Z"
  },
  {
    id: "prod_repair_overhaul_2",
    name: "研磨機オーバーホール②　基本料金",
    category: "修理・工賃",
    unitPrice: 100000,
    userPrice: 100000,
    unit: "式",
    taxRate: 10,
    note: "研磨機オーバーホール基本料金",
    usageCount: 1,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-10-28T10:00:00.000Z"
  },
  {
    id: "prod_repair_body_parts",
    name: "本体交換部品　（中古部品使用）",
    category: "修理・工賃",
    unitPrice: 94000,
    userPrice: 94000,
    unit: "式",
    taxRate: 10,
    note: "本体交換部品",
    usageCount: 1,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-10-28T10:00:00.000Z"
  },
  {
    id: "prod_repair_motor_power",
    name: "モーター及び電源関係　（中古部品使用）",
    category: "修理・工賃",
    unitPrice: 85000,
    userPrice: 85000,
    unit: "式",
    taxRate: 10,
    note: "モーター・電源関係部品",
    usageCount: 1,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-10-28T10:00:00.000Z"
  },
  {
    id: "prod_repair_bite_stand",
    name: "バイト台 （中古部品使用）",
    category: "修理・工賃",
    unitPrice: 43000,
    userPrice: 43000,
    unit: "式",
    taxRate: 10,
    note: "バイト台部品",
    usageCount: 1,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-10-28T10:00:00.000Z"
  },
  {
    id: "prod_repair_overhaul_1",
    name: "研磨機オーバーホール①　基本料金",
    category: "修理・工賃",
    unitPrice: 60000,
    userPrice: 60000,
    unit: "式",
    taxRate: 10,
    note: "研磨機オーバーホール基本料金",
    usageCount: 0,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-10-28T10:00:00.000Z"
  },
  {
    id: "prod_repair_clutch_power",
    name: "クラッチ用 スイッチング 電源基盤 （中古）",
    category: "修理・工賃",
    unitPrice: 6720,
    userPrice: 6720,
    unit: "式",
    taxRate: 10,
    note: "クラッチ用スイッチング電源基盤",
    usageCount: 0,
    createdAt: "2026-09-25T06:00:00.000Z",
    updatedAt: "2026-10-28T10:00:00.000Z"
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

export const DEFAULT_INVENTORY = [
  {
    id: 'inv_1',
    itemId: 'prod_1790317962497_3xgg',
    name: 'DP-5000　ベーシックセット　バッテリー２個',
    sku: 'DP-5000-B2',
    type: 'bundle', // セット品 / BOM
    hasSerial: false,
    bundleItems: [
      { inventoryId: 'inv_dp5000_body', name: 'DP-5000 本体', qty: 1, role: 'main' },
      { inventoryId: 'inv_prod_1794209910003_eqxd', name: 'DP-BT-CS　DP-5000用バッテリー', qty: 2, role: 'battery' },
      { inventoryId: 'inv_dp5000_chg', name: 'PSE認証 専用急速充電器', qty: 1, role: 'charger' }
    ],
    currentStock: 0,
    safetyStock: 2,
    unit: 'セット',
    unitCost: 84417,
    unitPrice: 268257,
    location: '本社倉庫 A-1',
    lastInDate: '2026-03-16',
    note: '主力セット商品（本体1台+バッテリー2個+充電器1個）',
    history: []
  },
  {
    id: 'inv_dp5000_body',
    name: 'DP-5000 本体',
    sku: 'DP-5000-MAIN',
    type: 'single', // 単品
    hasSerial: true, // シリアル管理対象
    currentStock: 0,
    safetyStock: 2,
    unit: '台',
    unitCost: 68191,
    unitPrice: 220000,
    location: '本社倉庫 A-1',
    lastInDate: '2026-03-16',
    note: '海外輸入本体（シリアル番号管理対象）',
    history: []
  },
  {
    id: 'inv_prod_1794209910003_eqxd',
    itemId: 'prod_1794209910003_eqxd',
    name: 'DP-BT-CS　DP-5000用バッテリー',
    sku: 'DP-BT-CS',
    type: 'single',
    hasSerial: true, // シリアル管理対象
    currentStock: 0,
    safetyStock: 4,
    unit: '個',
    unitCost: 7700,
    unitPrice: 16500,
    location: 'パーツ保管棚 B-1',
    lastInDate: '2026-03-24',
    note: 'DP-5000用バッテリー（CS製・シリアル番号管理対象）',
    history: []
  },
  {
    id: 'inv_prod_1794209994433_ij47',
    itemId: 'prod_1794209994433_ij47',
    name: 'DP-BT-SK　DP-5000用バッテリー',
    sku: 'DP-BT-SK',
    type: 'single',
    hasSerial: true, // シリアル管理対象
    currentStock: 15,
    safetyStock: 4,
    unit: '個',
    unitCost: 7700,
    unitPrice: 16500,
    location: 'パーツ保管棚 B-1',
    lastInDate: '2026-11-05',
    note: 'DP-5000用バッテリー（SK製・シリアル番号管理対象）',
    history: []
  },
  {
    id: 'inv_dp5000_chg',
    name: 'PSE認証 専用急速充電器',
    sku: 'CHG-DP5K',
    type: 'single',
    hasSerial: true, // シリアル番号管理対象
    currentStock: 0,
    safetyStock: 2,
    unit: '個',
    unitCost: 7700,
    unitPrice: 8000,
    location: 'パーツ保管棚 B-2',
    lastInDate: '2026-03-24',
    note: '国内仕入PSE認証充電器（シリアル番号管理対象）',
    history: []
  },
  {
    id: 'inv_2',
    itemId: 'prod_1790319200414_10bm',
    name: 'DP-MS　メカニカルスプレッダー',
    sku: 'DP-MS-01',
    type: 'single',
    hasSerial: true,
    currentStock: 0,
    safetyStock: 1,
    unit: '個',
    unitCost: 29260,
    unitPrice: 73025,
    location: 'パーツ保管棚 B-2',
    lastInDate: '2026-07-29',
    note: '',
    history: []
  },
  {
    id: 'inv_prod_auto_7',
    itemId: 'prod_auto_7',
    name: 'HIC-025　ホールドイットクランプ',
    sku: 'HIC-025',
    type: 'single',
    hasSerial: false,
    currentStock: -1,
    safetyStock: 2,
    unit: 'セット',
    unitCost: 6240,
    unitPrice: 10400,
    location: '本社倉庫',
    lastInDate: '2026-09-24',
    note: '固定クランプ（標準在庫品）',
    history: []
  },
  {
    id: 'inv_prod_1790319113830_war6',
    itemId: 'prod_1790319113830_war6',
    name: 'DP-AC　アクセサリーキット',
    sku: 'DP-AC',
    type: 'single',
    hasSerial: false,
    currentStock: 1,
    safetyStock: 2,
    unit: 'セット',
    unitCost: 73902,
    unitPrice: 120000,
    location: '本社倉庫',
    lastInDate: '2025-11-25',
    note: '',
    history: []
  },
  {
    id: 'inv_prod_1790319164152_angp',
    itemId: 'prod_1790319164152_angp',
    name: 'DP-EG　3点引きアタッチメント',
    sku: 'DP-EG',
    type: 'single',
    hasSerial: false,
    currentStock: 0,
    safetyStock: 2,
    unit: 'セット',
    unitCost: 73635,
    unitPrice: 120000,
    location: '本社倉庫',
    lastInDate: '2026-07-29',
    note: '',
    history: []
  }
];

export const DEFAULT_INVENTORY_SERIALS = [
  { id: "sn_N8460", serialNumber: "N8460", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "demo", clientName: "", endUserName: "デモ機", shipDate: "", docNumber: "", docId: "", note: "デモ機", inDate: "2025-07-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8461", serialNumber: "N8461", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "株式会社朝日エージェンシー", endUserName: "", shipDate: "2025-07-03", docNumber: "INV-20250703-01", docId: "doc_20250703_01", note: "数量限定特別価格 (KET.IC.2B エレクトロパワー)", inDate: "2025-07-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8462", serialNumber: "N8462", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "demo", clientName: "", endUserName: "デモ機", shipDate: "", docNumber: "", docId: "", note: "デモ機", inDate: "2025-07-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8463", serialNumber: "N8463", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "Ｙ’ｓボディー", endUserName: "NCRAFT 様", shipDate: "2025-12-22", docNumber: "INV-20251222-01", docId: "doc_20251222_01", note: "NCRAFT様分 特別価格", inDate: "2025-07-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8464", serialNumber: "N8464", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "バンザイ沖縄販売株式会社", endUserName: "", shipDate: "2025-08-12", docNumber: "INV-20250729-01", docId: "doc_20250729_01", note: "特別価格（スプレッダーN35600同時出荷）", inDate: "2025-07-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8472", serialNumber: "N8472", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "株式会社朝日エージェンシー", endUserName: "消防署", shipDate: "2025-03-13", docNumber: "INV-20250313-01", docId: "doc_20250313_01", note: "消防署寄贈用 50%値引き", inDate: "2025-03-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8473", serialNumber: "N8473", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "株式会社伊佐ペイント", endUserName: "", shipDate: "2025-03-27", docNumber: "INV-20250327-01", docId: "doc_20250327_01", note: "特別価格", inDate: "2025-03-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8474", serialNumber: "N8474", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "R・Cペイント販売株式会社", endUserName: "", shipDate: "2025-11-17", docNumber: "INV-202501117-01", docId: "doc_20251117_01", note: "特別価格", inDate: "2025-03-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8475", serialNumber: "N8475", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "有限会社いわさきオートラック", endUserName: "", shipDate: "2025-11-26", docNumber: "INV-20251126-01", docId: "doc_20251126_01", note: "特別価格（スプレッダーN35601同時出荷）", inDate: "2025-03-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N8476", serialNumber: "N8476", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "Ysボディ", endUserName: "", shipDate: "2025-12-22", docNumber: "", docId: "", note: "宣伝用寄贈", inDate: "2025-03-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10411", serialNumber: "N10411", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "有限会社いわさきオートラック", endUserName: "FT WORKS 様", shipDate: "2026-03-31", docNumber: "INV-20260331-01", docId: "doc_imported_20260331_01", note: "同行特価 FT WORKS様分", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10412", serialNumber: "N10412", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "日産部品北海道販売株式会社 札幌白石店", endUserName: "", shipDate: "2026-07-06", docNumber: "INV-20260706-02", docId: "doc_20260706_02", note: "DP-5000同行特価", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10413", serialNumber: "N10413", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "有限会社いわさきオートラック", endUserName: "E＆Eスタイリング 様", shipDate: "2026-03-31", docNumber: "INV-20260331-01", docId: "doc_imported_20260331_01", note: "同行特価 E＆Eスタイリング様分", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10414", serialNumber: "N10414", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "有限会社近藤", endUserName: "", shipDate: "2026-08-24", docNumber: "INV-20260824-01", docId: "doc_20260824_01", note: "デモ機特価", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10415", serialNumber: "N10415", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "奥村塗料株式会社", endUserName: "", shipDate: "2026-02-20", docNumber: "INV-20260220-01", docId: "doc_20260220_01", note: "数量限定特別価格", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10416", serialNumber: "N10416", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "ボディショップ トラスト", endUserName: "", shipDate: "2025-12-23", docNumber: "INV-20251223-01", docId: "doc_20251223_01", note: "特別価格", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10417", serialNumber: "N10417", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "奥村塗料株式会社", endUserName: "", shipDate: "2026-03-07", docNumber: "INV-20260307-01", docId: "doc_20260307_01", note: "DP5000同行時特別価格+セット値引き（スプレッダーN36115同時出荷）", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10418", serialNumber: "N10418", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "奥村塗料株式会社", endUserName: "", shipDate: "2026-09-15", docNumber: "INV-20260915-01", docId: "doc_20260915_01", note: "展示会特価", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10419", serialNumber: "N10419", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "R・Cペイント販売株式会社", endUserName: "", shipDate: "2026-07-06", docNumber: "INV-20260706-01", docId: "doc_20260706_01", note: "DP-MS値引き", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10420", serialNumber: "N10420", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", clientName: "朝日エージェンシー", endUserName: "", shipDate: "2026-03-31", docNumber: "", docId: "", note: "在庫管理用", inDate: "2026-02-01", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10933", serialNumber: "N10933", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "株式会社宮田自動車商会 西営業所", endUserName: "ストリームズ 様", shipDate: "2026-10-01", docNumber: "INV-20261001-01", docId: "doc_20261001_01", note: "ストリームズ様分 (169-376200)", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10934", serialNumber: "N10934", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "株式会社BIC", endUserName: "", shipDate: "2026-10-01", docNumber: "", docId: "", note: "宣伝用寄贈", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10935", serialNumber: "N10935", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "maintenance", isBundled: true, lotNumber: "LOT-20260316", clientName: "", endUserName: "", shipDate: "", docNumber: "", docId: "", note: "部品足らない (保守・貸出)", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10936", serialNumber: "N10936", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "日産部品北海道販売株式会社 岩見沢店", endUserName: "ボディリバイブK 様", shipDate: "2026-08-03", docNumber: "INV-20260813-01", docId: "doc_20260813_01", note: "展示会特価 ボディリバイブK様分", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10937", serialNumber: "N10937", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "マヒミアカラー東村", endUserName: "", shipDate: "2026-09-20", docNumber: "INV-20260920-01", docId: "doc_20260920_01", note: "展示会特価（価格訂正済）", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10938", serialNumber: "N10938", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "株式会社宮田自動車商会 苫小牧営業所", endUserName: "", shipDate: "2026-10-01", docNumber: "INV-20261001-02", docId: "doc_20261001_02", note: "スプレッダーN36709同時出荷", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10939", serialNumber: "N10939", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "有限会社いわさきオートラック", endUserName: "FAC 様", shipDate: "2026-07-11", docNumber: "INV-20260711-01", docId: "doc_20260711_01", note: "FAC様分特価", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10940", serialNumber: "N10940", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "日産部品千葉販売株式会社 本社", endUserName: "戸倉 様", shipDate: "2026-08-03", docNumber: "INV-20260813-02", docId: "doc_20260813_02", note: "戸倉様分", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N10942", serialNumber: "N10942", inventoryId: "inv_dp5000_body", itemName: "DP-5000", itemType: "body", status: "shipped", isBundled: true, lotNumber: "LOT-20260316", clientName: "中村塗料株式会社", endUserName: "", shipDate: "2026-09-24", docNumber: "INV-20260924-01", docId: "doc_20260924_01", note: "ホールドイットクランプ同時出荷", inDate: "2026-03-16", unitCost: 152000, updatedAt: new Date().toISOString() },
  { id: "sn_N35600", serialNumber: "N35600", inventoryId: "inv_2", itemName: "DP-MS", itemType: "spreader", status: "shipped", clientName: "バンザイ沖縄販売株式会社", endUserName: "", shipDate: "2025-08-12", docNumber: "INV-20250729-01", docId: "doc_20250729_01", note: "DP-5000(N8464)同時出荷", inDate: "2025-07-01", unitCost: 40000, updatedAt: new Date().toISOString() },
  { id: "sn_N35601", serialNumber: "N35601", inventoryId: "inv_2", itemName: "DP-MS", itemType: "spreader", status: "shipped", clientName: "有限会社いわさきオートラック", endUserName: "", shipDate: "2025-11-26", docNumber: "INV-20251126-01", docId: "doc_20251126_01", note: "DP-5000(N8475)同時出荷", inDate: "2025-07-01", unitCost: 40000, updatedAt: new Date().toISOString() },
  { id: "sn_N36115", serialNumber: "N36115", inventoryId: "inv_2", itemName: "DP-MS", itemType: "spreader", status: "shipped", clientName: "奥村塗料株式会社", endUserName: "", shipDate: "2026-03-07", docNumber: "INV-20260307-01", docId: "doc_20260307_01", note: "DP-5000(N10417)同時出荷", inDate: "2026-02-01", unitCost: 40000, updatedAt: new Date().toISOString() },
  { id: "sn_N36116", serialNumber: "N36116", inventoryId: "inv_2", itemName: "DP-MS", itemType: "spreader", status: "shipped", clientName: "有限会社近藤", endUserName: "", shipDate: "2026-10-13", docNumber: "INV-20261013", docId: "doc_20261013", note: "単体出荷", inDate: "2026-02-01", unitCost: 40000, updatedAt: new Date().toISOString() },
  { id: "sn_N36707", serialNumber: "N36707", inventoryId: "inv_2", itemName: "DP-MS", itemType: "spreader", status: "shipped", clientName: "R・Cペイント販売株式会社", endUserName: "", shipDate: "2026-07-06", docNumber: "INV-20260706-01", docId: "doc_20260706_01", note: "DP-5000(N10419)同時出荷", inDate: "2026-02-01", unitCost: 40000, updatedAt: new Date().toISOString() },
  { id: "sn_N36709", serialNumber: "N36709", inventoryId: "inv_2", itemName: "DP-MS", itemType: "spreader", status: "shipped", clientName: "株式会社宮田自動車商会 苫小牧営業所", endUserName: "", shipDate: "2026-10-01", docNumber: "INV-20261001-02", docId: "doc_20261001_02", note: "DP-5000(N10938)同時出荷", inDate: "2026-02-01", unitCost: 40000, updatedAt: new Date().toISOString() }
];

export const DEFAULT_INVENTORY_LOTS = [];

export const DEFAULT_PURCHASE_MAPPINGS = {
  "スプレッダー": "inv_2",
  "ベーシックセット": "inv_1"
};

/**
 * 商品マスタの重複を自動統合・サンプルのパージを実行
 * @param {Array} list
 * @returns {Array} 重複排除・クリーンアップ済みリスト
 */
export function deduplicateItemMasterList(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();

  for (const item of list) {
    if (!item || !item.name) continue;
    const cleanName = (item.name || '').trim();
    if (!cleanName) continue;
    let key = getMasterKey(cleanName);
    if (!key) continue;

    // サンプル商品は自動パージ（完全排除）
    if (SAMPLE_ITEM_KEYS.has(key)) continue;

    // アスタリスク付き品目（*DP-MS等の重複・ゴミ）、テスト品目、KET.IC.2B（DP-5000旧名称）、および値引き・割引行の完全パージ
    const lowerName = cleanName.toLowerCase();
    if (cleanName.startsWith('*') || lowerName === 'てすと' || lowerName === 'test' || lowerName.includes('ket.ic.2b') || lowerName.includes('エレクトロパワー') || /値引|割引|相殺|調整|特別値引|出精値引/i.test(lowerName)) {
      continue;
    }

    // 修理・オーバーホール項目は「修理・工賃」カテゴリを補完（未設定時）
    if (isRepairItem(item) && !item.category) {
      item.category = '修理・工賃';
    }

    // スプレッダーとメカニカルスプレッダーをメカニカルスプレッダーに統一（単価73,025円固定）
    if (key === 'dp-ms スプレッダー' || key === 'スプレッダー' || key === 'dp-ms メカニカルスプレッダー' || key === 'メカニカルスプレッダー') {
      item.name = 'DP-MS　メカニカルスプレッダー';
      item.unitPrice = 73025;
      item.userPrice = 98000;
      item.unit = '個';
      if (!item.category) {
        item.category = 'アタッチメント';
      }
      key = getMasterKey(item.name);
    }

    // デフォルトマスタに定義されたカテゴリがあれば未設定時に補完
    if (!item.category) {
      const def = DEFAULT_ITEMS_MASTER.find(d => getMasterKey(d.name) === key);
      if (def && def.category) {
        item.category = def.category;
      }
    }

    if (!map.has(key)) {
      map.set(key, { ...item });
    } else {
      const existing = map.get(key);
      const isExistingRescued = !!(existing.rescued || (existing.note && existing.note.includes('自動復元')));
      const isItemRescued = !!(item.rescued || (item.note && item.note.includes('自動復元')));
      // 重複統合時に加算すると実行毎に肥大化するため、最大値を維持
      const mergedUsage = Math.max(Number(existing.usageCount) || 0, Number(item.usageCount) || 0);

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
      merged.usageCount = mergedUsage;
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
export function deduplicateClientMasterList(list) {
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
export function saveActiveDoc(doc) {
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
export function loadActiveDoc() {
  try {
    const raw = localStorage.getItem(KEYS.ACTIVE_DOC);
    if (!raw) return null;
    const doc = JSON.parse(raw);
    if (doc && typeof syncEndUsersToDocItems === 'function') {
      syncEndUsersToDocItems(doc);
    }
    return doc;
  } catch (e) {
    console.error('Failed to load active doc:', e);
    return null;
  }
}

/**
 * 自社プロファイルを保存（次回作成時に自動反映）
 */
export function saveIssuerProfile(issuer) {
  try {
    const raw = localStorage.getItem(KEYS.ISSUER_PROFILE);
    const existing = raw ? JSON.parse(raw) : {};
    const merged = {
      ...existing,
      ...(issuer || {})
    };

    // 【超重要】印影画像（stampDataUrl）の消失防止（渡されたデータに画像が無く既存にあれば絶対保護）
    if (!issuer?.stampDataUrl || String(issuer.stampDataUrl).trim() === '') {
      if (existing.stampDataUrl && String(existing.stampDataUrl).trim() !== '') {
        merged.stampDataUrl = existing.stampDataUrl;
      }
    } else {
      merged.stampDataUrl = issuer.stampDataUrl;
    }

    // 印影表示フラグの保護
    if (issuer?.showStamp !== undefined) {
      merged.showStamp = issuer.showStamp;
    } else if (existing.showStamp !== undefined) {
      merged.showStamp = existing.showStamp;
    }

    // 振込先情報の消失防止
    if (!issuer?.bankInfo || String(issuer.bankInfo).trim() === '') {
      if (existing.bankInfo && String(existing.bankInfo).trim() !== '') {
        merged.bankInfo = existing.bankInfo;
      }
    }

    localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(merged));
    // サーバーファイル（Firestore settings/issuer）にも即時保存
    saveServerIssuerProfile(merged).catch(e => {
      console.warn('Server issuer profile save failed:', e);
    });
  } catch (e) {
    console.error('Failed to save issuer profile:', e);
  }
}

/**
 * 自社プロファイルを取得
 */
export function loadIssuerProfile() {
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

    // 印影画像がローカルにない場合、サーバーから非同期フェッチして復元
    if (!profile.stampDataUrl || profile.stampDataUrl.trim() === '') {
      fetchServerIssuerProfile().then(srv => {
        if (srv && srv.stampDataUrl && srv.stampDataUrl.trim() !== '') {
          profile.stampDataUrl = srv.stampDataUrl;
          if (srv.showStamp !== undefined) profile.showStamp = srv.showStamp;
          localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(profile));
          console.log('[自社印復元] サーバーから印鑑画像を自動復元・同期しました');
          if (typeof window !== 'undefined' && typeof window.renderAll === 'function') {
            window.renderAll();
          }
        }
      }).catch(() => { });
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
 * ユーザー名の整形（「ストリームズ様分」や「戸倉様」などを「ストリームズ 様」「戸倉 様」に統一）
 */
export function formatEndUserName(name) {
  if (!name) return '';
  let clean = String(name).trim().replace(/様分\s*$/, '様').trim();
  if (!clean) return '';
  if (clean === '消防署') return '消防署';
  if (!clean.endsWith('様')) {
    clean += ' 様';
  } else if (!clean.endsWith(' 様')) {
    clean = clean.replace(/([^ ])様$/, '$1 様');
  }
  return clean;
}

/**
 * 伝票内の明細において、ユーザー名が特定可能なのに明細のendUserNameが空欄のものを自動追加記載・補完
 * @param {Object} doc - 伝票または履歴サマリーオブジェクト
 * @param {Array} [serialList] - オプションのシリアルリスト
 * @returns {boolean} - 内容が更新されたかどうか
 */
export function syncEndUsersToDocItems(doc, serialList) {
  // ⚠️ 過去の移行処理は完了済み。ユーザーが明示的に空欄にしたユーザー名をシリアル台帳やタイトルから勝手に復元・上書きさせないため、自動補完は行わない
  return false;
}

/**
 * 過去伝票の明細で「スプレッダー」となっている品名を「DP-MS　メカニカルスプレッダー」に統一
 * （※ユーザー指示により単価・金額などの価格情報は一切変更せず維持）
 */
export function unifyMechanicalSpreaderDocItems(doc) {
  if (!doc) return false;
  let updated = false;
  const items = Array.isArray(doc.items) ? doc.items : [];
  items.forEach(it => {
    if (!it || !it.name) return;
    const key = getMasterKey(it.name);
    if (key === 'dp-ms スプレッダー' || key === 'スプレッダー') {
      it.name = 'DP-MS　メカニカルスプレッダー';
      updated = true;
    }
  });
  return updated;
}

/**
 * 全伝票・全商品明細におけるシリアル番号の整合性自動サニタイズ（全社・全取引先共通の包括的恒久防壁）
 * 1. 画面上の手入力シリアルと内部引き当てデータ(assignedSerials)の乖離を全伝票で自動修復
 * 2. 古いゾンビシリアル（裏側に残った過去の若番割当など）を全伝票から完全消去・整合
 * 3. 本田塗料店伝票(DEL-20261105-235)におけるN8460->N10935の自動修復
 */
export function sanitizeDocSerialsConsistency(doc) {
  if (!doc) return false;
  let updated = false;

  const docNo = String(doc.docNumber || doc.id || '').trim();
  const clientName = doc.client ? (doc.client.name || '') : (doc.clientName || '');
  const isHonda = docNo.includes('DEL-20261105-235') || doc.id === 'doc_1793843756482_m0tc1' || clientName.includes('本田塗料');

  const items = (Array.isArray(doc.items) && doc.items.length > 0)
    ? doc.items
    : (doc.fullDoc && Array.isArray(doc.fullDoc.items) ? doc.fullDoc.items : []);

  items.forEach(it => {
    if (!it) return;

    // ① 本田塗料店伝票におけるN8460の確実なN10935置換
    if (isHonda) {
      if (it.serialNumber && it.serialNumber.includes('N8460')) {
        it.serialNumber = it.serialNumber.replace(/N8460/g, 'N10935');
        updated = true;
      }
      if (Array.isArray(it.assignedSerials)) {
        it.assignedSerials.forEach(as => {
          if (as && String(as.serialNumber).trim().toUpperCase() === 'N8460') {
            as.serialNumber = 'N10935';
            as.itemName = 'DP-5000 本体';
            as.costPrice = 152000;
            updated = true;
          }
        });
        it.costPrice = 152000;
        it.assignedCogs = 152000;
      }
      if (it.serialNumber === 'N10935' && (!it.assignedSerials || it.assignedSerials.length === 0 || it.assignedSerials[0]?.serialNumber !== 'N10935')) {
        it.assignedSerials = [{
          itemId: 'inv_dp5000_body',
          itemName: 'DP-5000 本体',
          serialNumber: 'N10935',
          costPrice: 152000
        }];
        it.costPrice = 152000;
        it.assignedCogs = 152000;
        updated = true;
      }
    }

    // ② 全伝票共通：手入力シリアルと内部 assignedSerials の完全連動同期
    const manualSn = (it.serialNumber || '').trim();
    if (manualSn && !isHonda) {
      const manualParts = manualSn.split(/[,、\n\r\t;/|\s]+/)
        .map(p => p.replace(/^[(\[{<"']+|[)\]}>"':]+$/g, '').trim().toUpperCase())
        .filter(p => p.length >= 3);

      if (manualParts.length > 0) {
        if (Array.isArray(it.assignedSerials) && it.assignedSerials.length > 0) {
          const assignedSns = it.assignedSerials.map(a => String(a.serialNumber || '').trim().toUpperCase());
          // 手入力に存在しないシリアルが裏側に残っている場合（乖離発生）
          const hasMismatch = assignedSns.some(asn => !manualParts.includes(asn)) || (assignedSns.length !== manualParts.length);
          if (hasMismatch) {
            it.assignedSerials = manualParts.map(asn => {
              const matched = it.assignedSerials.find(a => String(a.serialNumber || '').trim().toUpperCase() === asn);
              return matched || {
                itemId: it.id || 'inv_dp5000_body',
                itemName: it.name || 'DP-5000 本体',
                serialNumber: asn,
                costPrice: it.costPrice || 152000
              };
            });
            updated = true;
          }
        }
      }
    }

    // ③ 全伝票共通：社内デモ機(N8460)が通常伝票に誤混入していた場合の自動消去
    if (!isHonda && it.assignedSerials && Array.isArray(it.assignedSerials)) {
      const hadDemo = it.assignedSerials.some(a => String(a.serialNumber || '').trim().toUpperCase() === 'N8460');
      if (hadDemo) {
        it.assignedSerials = it.assignedSerials.filter(a => String(a.serialNumber || '').trim().toUpperCase() !== 'N8460');
        updated = true;
      }
    }
  });

  return updated;
}

// 互換性エイリアス
export const sanitizeHondaPaintDocAndSerials = sanitizeDocSerialsConsistency;

/**
 * 書類履歴一覧を取得
 */
export function getHistoryList(includeSuperseded = false) {
  try {
    const raw = localStorage.getItem(KEYS.HISTORY);
    if (!raw) return [];
    let list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    // スプレッダーの品名統一 & 本田塗料店伝票(N8460->N10935)のキャッシュ自動サニタイズ
    let anyUpdated = false;
    list.forEach(docItem => {
      if (docItem.fullDoc) {
        if (unifyMechanicalSpreaderDocItems(docItem.fullDoc)) anyUpdated = true;
        if (sanitizeHondaPaintDocAndSerials(docItem.fullDoc)) anyUpdated = true;
      }
      if (unifyMechanicalSpreaderDocItems(docItem)) anyUpdated = true;
      if (sanitizeHondaPaintDocAndSerials(docItem)) anyUpdated = true;
    });

    if (anyUpdated) {
      try {
        localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));
      } catch (e) {
        console.warn('Failed to update synced history to localStorage:', e);
      }
    }

    // 訂正前の元伝票(superseded)は、一覧表示では除外しスッキリ表示（訂正後伝票から参照可能）
    if (!includeSuperseded) {
      // 一覧内の全伝票から「訂正された元伝票番号(replacesDocNumber)」を収集
      const replacedNumbers = new Set();
      list.forEach(item => {
        const doc = item.fullDoc || item;
        const rep = (item.replacesDocNumber || doc.replacesDocNumber || '').trim();
        if (rep) replacedNumbers.add(rep);
      });

      list = list.filter(item => {
        const doc = item.fullDoc || item;
        const docNum = String(item.docNumber || doc.docNumber || item.invoiceNumber || doc.invoiceNumber || '').trim();
        if (docNum && replacedNumbers.has(docNum)) {
          return false; // 他の伝票によって「訂正前の元伝票」として指定されているため一覧から除外
        }
        const isSup = item.status === 'superseded' || item.isSuperseded === true || doc.status === 'superseded' || doc.isSuperseded === true;
        return !isSup;
      });
    }

    return list;
  } catch (e) {
    console.error('Failed to get history list:', e);
    return [];
  }
}

/**
 * 書類を履歴に保存（新規追加または上書き）
 */
export function saveDocToHistory(doc) {
  try {
    // ⚠️ 既存伝票の上書き時は全件（superseded含む）を対象に探す
    const list = getHistoryList(true);
    const existingIndex = list.findIndex(item => item.id === doc.id || (item.docNumber && doc.docNumber && item.docNumber === doc.docNumber));

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
      endUserName: doc.endUserName || doc.client?.endUserName || '',
      clientName: doc.client?.name || '名称未設定',
      client: doc.client || { name: '名称未設定' },
      issueDate: doc.issueDate || doc.date || '',
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
      status: doc.status || 'draft',
      isSuperseded: !!doc.isSuperseded,
      supersededBy: doc.supersededBy || '',
      supersededAt: doc.supersededAt || '',
      supersededReason: doc.supersededReason || '',
      replacesDocNumber: doc.replacesDocNumber || '',
      replacesDocId: doc.replacesDocId || '',
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
 * 履歴から書類を削除（プレビュー画面の引きずりおよび他端末ゾンビ復活を完全防止）
 */
export function deleteDocFromHistory(id) {
  try {
    const cleanId = String(id).trim();

    // 0. 誤削除対策：ごみ箱にバックアップ保管
    const existingList = getHistoryList();
    const targetItem = existingList.find(item => String(item.id).trim() === cleanId);
    if (targetItem) {
      addDocToTrash(targetItem);
    }

    // 0.5. 【シリアル台帳連動】削除対象書類に紐づくシリアル番号を抽出し、ステータスを「在庫中（in_stock）」に自動復帰！
    // ※ ユーザー様の指定仕様：伝票を消した時にシリアル台帳から消えるのではなく、出荷前（在庫中）に戻す
    try {
      const fullDoc = (targetItem && targetItem.fullDoc) || targetItem;
      const docNo = String(fullDoc?.docNumber || targetItem?.docNumber || '').trim();
      const serialList = getInventorySerialList();
      let serialsRestored = 0;

      if (Array.isArray(serialList) && serialList.length > 0) {
        serialList.forEach(s => {
          if (!s) return;
          const sDocNo = String(s.docNumber || s.invoiceNumber || '').trim();
          const sDocId = String(s.docId || s.invoiceId || '').trim();

          let isMatch = false;
          if (docNo && sDocNo === docNo) isMatch = true;
          if (cleanId && sDocId === cleanId) isMatch = true;

          // 明細のシリアル指定とも照合
          if (!isMatch && fullDoc && Array.isArray(fullDoc.items)) {
            fullDoc.items.forEach(it => {
              if (!it) return;
              if (Array.isArray(it.assignedSerials)) {
                it.assignedSerials.forEach(as => {
                  if (as && as.serialNumber && String(as.serialNumber).trim().toUpperCase() === String(s.serialNumber).trim().toUpperCase()) {
                    isMatch = true;
                  }
                });
              }
              if (it.serialNumber && typeof it.serialNumber === 'string') {
                if (it.serialNumber.toUpperCase().includes(String(s.serialNumber).trim().toUpperCase())) {
                  isMatch = true;
                }
              }
            });
          }

          if (isMatch) {
            s.status = s.isBundled ? 'bundled' : 'in_stock';
            s.clientName = '';
            s.customerName = '';
            s.endUserName = '';
            s.shipDate = '';
            s.shippedDate = '';
            s.docNumber = '';
            s.docId = '';
            s.invoiceNumber = '';
            s.invoiceId = '';
            s.updatedAt = new Date().toISOString();
            serialsRestored++;

            // セット品化された本体の場合、組込バッテリーも連動して在庫中に復帰
            if (s.isBundled && Array.isArray(s.batterySerials)) {
              s.batterySerials.forEach(bSn => {
                const bat = serialList.find(b => b && String(b.serialNumber).trim().toUpperCase() === String(bSn).trim().toUpperCase());
                if (bat) {
                  bat.status = 'bundled';
                  bat.clientName = '';
                  bat.customerName = '';
                  bat.endUserName = '';
                  bat.shipDate = '';
                  bat.shippedDate = '';
                  bat.docNumber = '';
                  bat.docId = '';
                  bat.invoiceNumber = '';
                  bat.invoiceId = '';
                  bat.updatedAt = new Date().toISOString();
                }
              });
            }
          }
        });

        if (serialsRestored > 0) {
          localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(serialList));
          saveServerInventorySerials(serialList).catch(() => { });
          if (typeof syncInventoryStockFromSerials === 'function') syncInventoryStockFromSerials();
          console.log(`【伝票削除連動】シリアル番号 ${serialsRestored} 件を台帳上で「在庫中」に完全復帰し、サーバーへ同期保存しました`);
        }
      }
    } catch (snErr) {
      console.warn('【伝票削除連動】シリアル復帰エラー:', snErr);
    }

    // 1. ローカル削除済みIDセットに記録
    recordDeletedDocId(cleanId);

    // 2. 履歴リストから削除
    const list = existingList.filter(item => String(item.id).trim() !== cleanId);
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));

    // 3. もし編集中アクティブ伝票(activeDoc)がこの書類ならアクティブ伝票もクリア
    const activeDoc = loadActiveDoc();
    if (activeDoc && String(activeDoc.id).trim() === cleanId) {
      console.log("【書類削除】編集中アクティブ伝票も削除対象のためクリアします:", cleanId);
      localStorage.removeItem(KEYS.ACTIVE_DOC);
      saveServerActiveDoc({}).catch(() => { });
    }

    // 4. サーバーのFirestoreから個別削除
    deleteServerEntity('invoices', cleanId).catch(e => {
      console.warn('Server invoices history delete failed:', e);
    });

    // 5. 削除IDも含めて履歴全体を即時同期保存
    saveServerInvoicesHistory(list, [cleanId]).catch(e => {
      console.warn('Server invoices history save failed:', e);
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
export function getDocFromHistory(id) {
  const list = getHistoryList();
  const found = list.find(item => item.id === id);
  if (!found || !found.fullDoc) return null;
  if (typeof syncEndUsersToDocItems === 'function') {
    syncEndUsersToDocItems(found.fullDoc);
  }
  return found.fullDoc;
}

/**
 * 過去の納品請求書履歴から各商品マスタの記載頻度（登場伝票件数）を集計
 * 全角・半角スペースや大文字小文字の揺れを正規化し、1伝票1回として集計
 * @returns {Record<string, number>} 商品名および正規化キーに対する伝票記載件数マップ
 */
export function getItemMasterUsageMap() {
  const usageMap = {};
  try {
    const docHistory = getHistoryList();
    if (Array.isArray(docHistory)) {
      docHistory.forEach(docSummary => {
        // サンプル伝票やキャンセル済み伝票は集計から除外
        if (docSummary && docSummary.id && String(docSummary.id).startsWith('sample_')) return;
        if (docSummary && docSummary.isCancelled) return;

        const doc = (docSummary && docSummary.fullDoc) || docSummary;
        if (!doc || doc.isCancelled) return;

        const items = Array.isArray(doc.items) ? doc.items : (Array.isArray(docSummary.items) ? docSummary.items : []);
        if (Array.isArray(items)) {
          // 1枚の伝票内での同一商品の重複行を1回としてカウント
          const seenInDoc = new Set();
          items.forEach(it => {
            if (!it) return;
            const rawName = (it.name || '').trim();
            if (!rawName) return;

            const key = getMasterKey(rawName);
            if (!key || seenInDoc.has(key)) return;
            seenInDoc.add(key);

            // 正規化キー（全角半角スペースや大文字小文字を吸収）でカウント加算
            usageMap[key] = (usageMap[key] || 0) + 1;

            // 生の商品名（トリム後）でも引けるように保存
            usageMap[rawName] = (usageMap[rawName] || 0) + 1;
          });
        }
      });
    }
  } catch (e) {
    console.error('Failed to get item master usage map:', e);
  }
  return usageMap;
}

/**
 * 商品マスタアイテムに対する納品請求書への記載頻度（登場件数）を正確に取得
 * @param {Object} item 商品マスタアイテム
 * @param {Record<string, number>} [usageMap] 事前集計マップ（省略時は自動取得）
 * @returns {number} 納品請求書に記載された回数
 */
export function getItemDocUsage(item, usageMap) {
  if (!item) return 0;
  const map = usageMap || getItemMasterUsageMap();
  const name = (item.name || '').trim();
  const key = getMasterKey(name);
  if (key && typeof map[key] === 'number') {
    return map[key];
  }
  if (name && typeof map[name] === 'number') {
    return map[name];
  }
  return 0;
}

// ==========================================================================
// サーバー通信・マスタ永続化APIヘルパー（サブディレクトリ・WordPress・Python完全両対応）
// ==========================================================================

export function getAppBaseDir() {
  if (typeof window === 'undefined' || !window.location) return '/';
  let path = window.location.pathname.split('?')[0].split('#')[0];
  if (/\.[a-zA-Z0-9]+$/.test(path)) {
    path = path.substring(0, path.lastIndexOf('/') + 1);
  } else if (!path.endsWith('/')) {
    path += '/';
  }
  return path;
}

// 直近のトークンキャッシュ（メモリおよびlocalStorage）
let _memoryCachedToken = null;
const CACHED_TOKEN_KEY = 'billcraft_cached_id_token';
let _authRestorePromise = null;

/**
 * 現在ログイン中の Firebase Auth ユーザーから ID トークンを取得
 * ページ読み込み直後などでセッション復元中の場合は待機し、キャッシュフォールバックも行う
 * @param {boolean} forceRefresh 強制的に最新トークンを再取得するかどうか
 */
export async function getFirebaseAuthToken(forceRefresh = false) {
  // 1. キャッシュトークンが利用可能な場合は即座に返却（初期ロード遅延・初回APIタイムアウトを完全解消）
  if (!forceRefresh) {
    if (_memoryCachedToken) return _memoryCachedToken;
    try {
      const localCached = localStorage.getItem(CACHED_TOKEN_KEY);
      if (localCached) {
        _memoryCachedToken = localCached;
        return localCached;
      }
    } catch (e) { }

    // Firebase SDK 内部のローカルストレージ（IndexedDB/localStorage）から直近トークンを抽出
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('firebase:authUser:')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const authData = JSON.parse(raw);
            if (authData && authData.stsTokenManager && authData.stsTokenManager.accessToken) {
              const fbToken = authData.stsTokenManager.accessToken;
              _memoryCachedToken = fbToken;
              try { localStorage.setItem(CACHED_TOKEN_KEY, fbToken); } catch (e) { }
              return fbToken;
            }
          }
        }
      }
    } catch (e) { }
  }

  // 2. Firebase SDK が利用可能な場合、currentUser またはセッション復元から取得
  if (typeof firebase !== 'undefined' && firebase.auth) {
    const auth = firebase.auth();

    // 2-1. すでに currentUser が存在する場合はトークンを取得
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(forceRefresh);
        if (token) {
          _memoryCachedToken = token;
          try { localStorage.setItem(CACHED_TOKEN_KEY, token); } catch (e) { }
          return token;
        }
      } catch (e) { }
    }

    // 2-2. currentUser が null の場合、セッション復元を待機（最大4000ms）
    if (!forceRefresh) {
      if (!_authRestorePromise) {
        _authRestorePromise = new Promise((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (unsubscribe) unsubscribe();
              _authRestorePromise = null;
              resolve(null);
            }
          }, 4000);

          const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timer);
            if (unsubscribe) unsubscribe();
            _authRestorePromise = null;
            if (user) {
              try {
                const token = await user.getIdToken();
                if (token) {
                  _memoryCachedToken = token;
                  try { localStorage.setItem(CACHED_TOKEN_KEY, token); } catch (e) { }
                  resolve(token);
                  return;
                }
              } catch (e) { }
            }
            resolve(null);
          });
        });
      }

      const restoredToken = await _authRestorePromise;
      if (restoredToken) return restoredToken;
    }
  }

  return null;
}

/**
 * サーバー(Firestore)上のデータを個別削除
 * 洗い替え削除を廃止し、削除操作されたアイテムのみを安全・確実に削除
 * @param {'items'|'clients'|'expenses'|'invoices'|'attendance'|'inventory'|'payroll_records'} collection
 * @param {string} id
 */
export async function deleteServerEntity(collection, id) {
  if (!id) return false;
  try {
    const res = await apiFetch('delete-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection, id: String(id) })
    });
    if (!res.ok) {
      // フォールバック: DELETE /api/{collection}?id={id}
      const delRes = await apiFetch(`${collection}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return delRes.ok;
    }
    return res.ok;
  } catch (err) {
    console.warn(`[deleteServerEntity] Failed to delete ${collection}/${id}:`, err);
    return false;
  }
}

export async function apiFetch(path, options = {}) {
  const clean = path.replace(/^\/?api\/?/, '').replace(/^\//, '');
  const cleanEndpoint = clean.split('?')[0];
  const isPublic = cleanEndpoint === 'status' || cleanEndpoint.startsWith('receipt/');

  // 認証トークンの自動取得
  let token = null;
  try {
    token = await getFirebaseAuthToken(false);
  } catch (authErr) {
    // 静かに無視
  }

  // 公開API以外でトークンが存在しない場合（未ログインまたはセッション復元中）：
  // サーバーへ無理にリクエストを投げて401エラーを連発させず、
  // ローカルストレージのみで安全に動作継続するためのオフラインモック応答を返す
  if (!isPublic && !token) {
    return new Response(JSON.stringify({
      offline: true,
      unauthenticated: true,
      message: '未ログインのためローカルストレージ優先モードで動作を継続します。'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const dir = getAppBaseDir();
  const candidates = [
    `${dir}api.php?endpoint=${clean}`,
    `api.php?endpoint=${clean}`,
    `${dir}api/${clean}`,
    `/api/${clean}`
  ];

  const headers = new Headers(options.headers || {});
  if (token) {
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('X-Firebase-Auth', token);
  }

  const fetchOpts = {
    credentials: 'same-origin',
    ...options,
    headers
  };

  let lastErr = null;
  let response = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, fetchOpts);
      if (res.status !== 404 && res.status !== 405) {
        response = res;
        break;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  // 401 (Unauthorized) の場合: トークン強制再取得（forceRefresh）して1度だけ自動リトライ
  if (response && response.status === 401 && !options._isRetry) {
    try {
      const freshToken = await getFirebaseAuthToken(true);
      if (freshToken) {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${freshToken}`);
        retryHeaders.set('X-Firebase-Auth', freshToken);
        return await apiFetch(path, {
          ...options,
          headers: retryHeaders,
          _isRetry: true
        });
      }
    } catch (refreshErr) {
      // リフレッシュ失敗
    }

    // リフレッシュ後も401の場合: キャッシュトークンをクリアし、再ログインを案内
    _memoryCachedToken = null;
    try { localStorage.removeItem(CACHED_TOKEN_KEY); } catch (e) { }

    if (typeof document !== 'undefined') {
      const overlay = document.getElementById('loginOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
      }
      const msgArea = document.getElementById('loginMessageArea');
      if (msgArea) {
        msgArea.style.color = '#f59e0b';
        msgArea.innerText = '認証セッションの有効期限が切れました。再度ログインしてください。';
      }
    }
  }

  if (response) return response;
  if (lastErr) throw lastErr;
  return new Response(JSON.stringify({ error: 'Endpoint not reachable' }), { status: 404 });
}

if (typeof window !== 'undefined') {
  window.getFirebaseAuthToken = getFirebaseAuthToken;
  window.deleteServerEntity = deleteServerEntity;
  window.apiFetch = apiFetch;
}

export async function fetchServerMasterItems() {
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

export async function saveServerMasterItems(items) {
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

export async function fetchServerMasterClients() {
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

export async function saveServerMasterClients(clients) {
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

export async function fetchServerIssuerProfile() {
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

export async function saveServerIssuerProfile(issuer) {
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

export async function fetchServerAttendance() {
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

export async function saveServerAttendance(attendanceList) {
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

/**
 * 勤怠打刻データのサーバー・ローカル双方向同期エンジン
 * ・PC / モバイル間での最新打刻（出勤・退勤）をフィールド単位で安全マージ
 * ・ローカルで打刻した退勤時刻がサーバーの未退勤データで消去される事故を完全防止
 * ・どちらか一方に入力済みの出勤・退勤・備考を空文字で破壊しない空上書き保護
 */
export async function syncAttendanceWithServer() {
  try {
    const serverAttendance = await fetchServerAttendance();
    const localAttendance = getAttendanceList();

    if (serverAttendance && Array.isArray(serverAttendance)) {
      const attMap = new Map();

      // 1. サーバーデータを初期マップに登録
      serverAttendance.forEach(item => {
        if (!item) return;
        const key = item.date || item.id;
        if (key) {
          attMap.set(key, { ...item });
        }
      });

      let hasLocalChanges = false;

      // 2. ローカルデータとフィールド単位で安全マージ
      localAttendance.forEach(loc => {
        if (!loc) return;
        const key = loc.date || loc.id;
        if (!key) return;

        if (!attMap.has(key)) {
          // サーバーに未登録のローカル打刻（オフライン打刻等）
          attMap.set(key, { ...loc });
          hasLocalChanges = true;
        } else {
          const srv = attMap.get(key);
          const srvTime = new Date(srv.updatedAt || 0).getTime();
          const locTime = new Date(loc.updatedAt || 0).getTime();

          // 出勤打刻のマージ（空上書き防止：どちらかにあれば必ず維持）
          let mergedClockIn = srv.clockIn || '';
          if (!mergedClockIn && loc.clockIn) {
            mergedClockIn = loc.clockIn;
            hasLocalChanges = true;
          } else if (loc.clockIn && srv.clockIn && locTime > srvTime) {
            mergedClockIn = loc.clockIn;
          }

          // 退勤打刻のマージ（空上書き防止：どちらかにあれば必ず維持）
          let mergedClockOut = srv.clockOut || '';
          if (!mergedClockOut && loc.clockOut) {
            mergedClockOut = loc.clockOut;
            hasLocalChanges = true; // 携帯等で打刻した退勤時刻をサーバーへ反映
          } else if (loc.clockOut && srv.clockOut && locTime > srvTime) {
            mergedClockOut = loc.clockOut;
          }

          // 備考のマージ
          let mergedNote = srv.note || '';
          if (!mergedNote && loc.note) {
            mergedNote = loc.note;
            hasLocalChanges = true;
          } else if (loc.note && locTime > srvTime) {
            mergedNote = loc.note;
          }

          const mergedUpdatedAt = (locTime > srvTime ? loc.updatedAt : srv.updatedAt) || new Date().toISOString();

          attMap.set(key, {
            id: srv.id || loc.id || ('att_' + (srv.date || loc.date)),
            date: srv.date || loc.date,
            clockIn: mergedClockIn,
            clockOut: mergedClockOut,
            note: mergedNote,
            updatedAt: mergedUpdatedAt
          });
        }
      });

      const mergedList = Array.from(attMap.values());
      mergedList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // ローカルストレージを最新マージデータで更新
      localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(mergedList));

      // サーバー側に未反映の最新打刻があれば即座にサーバー保存
      if (hasLocalChanges) {
        console.log("【勤怠双方向同期】ローカルの最新打刻（未反映分）をサーバーへ送信・同期します");
        await saveServerAttendance(mergedList);
      }

      console.log(`[勤怠双方向同期完了] 全 ${mergedList.length} 件の勤怠データをクラウド・端末間で完全同期しました`);
      return mergedList;
    }
  } catch (err) {
    console.warn('syncAttendanceWithServer error:', err);
  }
  return getAttendanceList();
}

export async function fetchServerAttendanceEmployee() {
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

export async function saveServerAttendanceEmployee(empInfo) {
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

export async function deleteServerAttendanceRecord(date = '', id = '') {
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

export async function fetchServerInvoicesHistory() {
  try {
    const res = await apiFetch('invoices/history', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) { }
  return null;
}

export async function saveServerInvoicesHistory(invoices, deletedIds = []) {
  try {
    const deletedSet = getDeletedDocIds();
    (deletedIds || []).forEach(id => { if (id) deletedSet.add(String(id).trim()); });

    const validList = (Array.isArray(invoices) ? invoices : []).filter(inv => {
      if (!inv || !inv.id) return false;
      const cleanId = String(inv.id).trim();
      return !deletedSet.has(cleanId) && !inv._deleted;
    });

    const payload = {
      invoices: validList,
      deletedIds: Array.from(deletedSet)
    };

    const res = await apiFetch('invoices/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
export async function syncInvoicesHistoryWithServer() {
  try {
    console.log("【書類履歴同期】サーバーから履歴データ取得開始...");
    const serverInvoices = await fetchServerInvoicesHistory();
    const localInvoices = getHistoryList();
    const deletedSet = getDeletedDocIds();

    const invoiceMap = new Map();

    // 1. サーバーから取得したデータから削除マーカー(_deleted: true)を検知してローカル削除セットへ反映
    if (Array.isArray(serverInvoices)) {
      serverInvoices.forEach(sinv => {
        if (sinv && sinv.id && sinv._deleted) {
          const cleanId = String(sinv.id).trim();
          recordDeletedDocId(cleanId);
          deletedSet.add(cleanId);
          // 他端末で削除された書類もごみ箱に保管して復元可能にしておく
          addDocToTrash(sinv);
        }
      });
    }

    // 2. ローカル履歴を取り込み（削除済みIDに含まれているものは完全破棄・抹消）
    if (Array.isArray(localInvoices)) {
      localInvoices.forEach(inv => {
        if (inv && inv.id) {
          const cleanId = String(inv.id).trim();
          if (!deletedSet.has(cleanId) && !inv._deleted) {
            invoiceMap.set(cleanId, inv);
          } else {
            console.log(`【書類履歴同期】ローカルに残っていた削除済み伝票(${cleanId})を完全抹消しました`);
            addDocToTrash(inv);
          }
        }
      });
    }

    // 3. サーバー履歴を取り込み（削除済みでなく、_deleted でない有効データのみスマートマージ）
    if (Array.isArray(serverInvoices)) {
      serverInvoices.forEach(sinv => {
        if (sinv && sinv.id) {
          const cleanId = String(sinv.id).trim();
          if (sinv._deleted || deletedSet.has(cleanId)) {
            // サーバー側またはローカルで削除済みの場合は確実にマップから除去
            invoiceMap.delete(cleanId);
            return;
          }

          const existing = invoiceMap.get(cleanId);
          if (!existing) {
            invoiceMap.set(cleanId, sinv);
          } else {
            const serverDate = new Date(sinv.updatedAt || sinv.issuedAt || sinv.issueDate || 0).getTime();
            const localDate = new Date(existing.updatedAt || existing.issuedAt || existing.issueDate || 0).getTime();

            const serverIsDraft = sinv.isCancelled === true || sinv.isIssued === false;
            const localIsIssued = existing.isIssued === true && !existing.isCancelled;

            // サーバー側で取消（下書き化）された場合、端末間の時計ズレでローカルが勝ってしまわないようサーバーの下書きを最優先
            if (serverIsDraft && localIsIssued) {
              console.log(`【書類履歴同期】端末間同期: 伝票(${cleanId}) をサーバー最新の「下書き（確定取消）」状態にマージ`);
              invoiceMap.set(cleanId, sinv);
            } else if (serverDate >= localDate) {
              invoiceMap.set(cleanId, sinv);
            }
          }
        }
      });
    }

    // 4. 発行日降順にソート & 本田塗料店伝票(N8460->N10935)のスマートサニタイズ
    invoiceMap.forEach(sinv => {
      sanitizeHondaPaintDocAndSerials(sinv);
      if (sinv.fullDoc) sanitizeHondaPaintDocAndSerials(sinv.fullDoc);
    });

    const mergedList = Array.from(invoiceMap.values()).sort((a, b) => {
      const dateA = a.issueDate || a.updatedAt || '';
      const dateB = b.issueDate || b.updatedAt || '';
      return dateB.localeCompare(dateA);
    });

    // 5. ローカルストレージに保存
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(mergedList));

    // 6. 編集中アクティブ伝票(activeDoc)のゾンビ引きずりチェック
    const activeDoc = loadActiveDoc();
    if (activeDoc && activeDoc.id) {
      const cleanActiveId = String(activeDoc.id).trim();
      if (deletedSet.has(cleanActiveId)) {
        console.log("【書類履歴同期】編集中プレビュー伝票が削除済みだったためクリア:", cleanActiveId);
        localStorage.removeItem(KEYS.ACTIVE_DOC);
        saveServerActiveDoc({}).catch(() => { });
        if (typeof window !== 'undefined' && window.currentDoc && String(window.currentDoc.id).trim() === cleanActiveId) {
          if (typeof window.resetActiveDocToNew === 'function') {
            window.resetActiveDocToNew();
          }
        }
      } else {
        const mergedActive = invoiceMap.get(cleanActiveId);
        if (mergedActive && (mergedActive.isCancelled === true || mergedActive.isIssued === false)) {
          if (activeDoc.isIssued !== false || activeDoc.isCancelled !== true) {
            activeDoc.isIssued = false;
            activeDoc.issuedAt = null;
            activeDoc.isCancelled = true;
            activeDoc.updatedAt = mergedActive.updatedAt || new Date().toISOString();
            localStorage.setItem(KEYS.ACTIVE_DOC, JSON.stringify(activeDoc));
            saveServerActiveDoc(activeDoc).catch(() => { });
            console.log("【書類履歴同期】編集中アクティブ伝票もサーバーに合わせて「下書き」に更新しました");
          }
        }
      }
    }

    // 7. サーバーへもマージ後全件と削除済みIDを送信
    await saveServerInvoicesHistory(mergedList, Array.from(deletedSet));
    console.log(`【書類履歴同期】マージ完了: 有効 ${mergedList.length} 件 (削除済み除外: ${deletedSet.size}件)`);

    return mergedList;
  } catch (e) {
    console.warn('Sync invoices history with server failed:', e);
    return getHistoryList();
  }
}

export async function fetchServerActiveDoc() {
  try {
    const res = await apiFetch('invoices/active', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) { }
  return null;
}

export async function saveServerActiveDoc(doc) {
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

export async function fetchServerExpenses() {
  try {
    const res = await apiFetch('expenses', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
    }
  } catch (e) { }
  return null;
}

/**
 * 経費オブジェクトをサーバー送信用に完全サニタイズ（undefinedの排除、型保証）
 */
export function sanitizeExpenseForServer(exp) {
  if (!exp || typeof exp !== 'object') return null;
  const id = String(exp.id || '').trim();
  if (!id) return null;

  return {
    id,
    date: exp.date || new Date().toISOString().split('T')[0],
    category: exp.category || '雑費',
    amount: Number(exp.amount) || 0,
    taxRate: exp.taxRate !== undefined && exp.taxRate !== null ? Number(exp.taxRate) : 10,
    payee: exp.payee || '',
    invoiceNumber: exp.invoiceNumber ? String(exp.invoiceNumber).trim().toUpperCase() : '',
    note: exp.note || '',
    receiptImage: exp.receiptImage || '',
    receiptDataUrl: exp.receiptDataUrl || '',
    isCost: !!exp.isCost,
    isPurchase: !!exp.isPurchase,
    claimant: exp.claimant || '小林俊介',
    isSettled: !!exp.isSettled,
    settledDate: exp.settledDate || '',
    paymentMethod: exp.paymentMethod || '普通預金',
    paymentAccount: exp.paymentAccount || exp.paymentMethod || '普通預金',
    taxType: exp.taxType || 'taxable_10',
    invoiceType: exp.invoiceType || (exp.invoiceNumber ? 'qualified' : 'none'),
    linkedInventoryId: exp.linkedInventoryId || '',
    linkedInventoryQty: Number(exp.linkedInventoryQty) || 0,
    updatedAt: exp.updatedAt || new Date().toISOString()
  };
}

export async function saveServerExpenses(expenses, deletedIds = []) {
  try {
    const deletedSet = getDeletedExpenseIds();
    (deletedIds || []).forEach(id => { if (id) deletedSet.add(String(id).trim()); });

    const rawList = Array.isArray(expenses) ? expenses : [];
    const validList = rawList
      .filter(item => {
        if (!item || !item.id) return false;
        const cleanId = String(item.id).trim();
        return !deletedSet.has(cleanId) && !item.isDeleted && !item._deleted;
      })
      .map(item => sanitizeExpenseForServer(item))
      .filter(Boolean);

    const payload = {
      expenses: validList,
      deletedIds: Array.from(deletedSet)
    };

    const res = await apiFetch('expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 経費データのサーバー双方向同期（全端末・他ユーザー間での完全共有）
 * 削除済みID（Tombstone）を最優先で除外し、ゾンビ復活を完全防止
 * @returns {Promise<Array>} 最新マージ済み経費リスト
 */
export async function syncExpensesWithServer() {
  try {
    const serverList = await fetchServerExpenses();
    const localList = getAllExpenseList();
    const deletedSet = getDeletedExpenseIds();

    // 1. サーバーから取得したデータから削除マーカー(_deleted または isDeleted)を検知して削除セットへ反映
    if (Array.isArray(serverList)) {
      serverList.forEach(sItem => {
        if (sItem && sItem.id && (sItem.isDeleted || sItem._deleted)) {
          const cleanId = String(sItem.id).trim();
          recordDeletedExpenseId(cleanId);
          deletedSet.add(cleanId);
        }
      });
    }

    const mergedMap = new Map();

    // 2. サーバー側のデータを追加（削除済みIDに含まれているものは完全破棄）
    if (Array.isArray(serverList)) {
      serverList.forEach(item => {
        if (!item || !item.id) return;
        const cleanId = String(item.id).trim();
        if (deletedSet.has(cleanId) || item.isDeleted || item._deleted) return;
        const sanitized = sanitizeExpenseForServer(item);
        if (sanitized) mergedMap.set(cleanId, sanitized);
      });
    }

    // 3. ローカル側のデータをスマートマージ（削除済みIDに含まれているものは完全破棄）
    let hasLocalChanges = false;
    if (Array.isArray(localList)) {
      localList.forEach(item => {
        if (!item || !item.id) return;
        const cleanId = String(item.id).trim();
        if (deletedSet.has(cleanId) || item.isDeleted || item._deleted) return;

        const cleanItem = sanitizeExpenseForServer(item);
        if (!cleanItem) return;

        if (!mergedMap.has(cleanId)) {
          mergedMap.set(cleanId, cleanItem);
          hasLocalChanges = true;
        } else {
          const serverItem = mergedMap.get(cleanId);
          const localTime = new Date(item.updatedAt || item.date || 0).getTime();
          const serverTime = new Date(serverItem.updatedAt || serverItem.date || 0).getTime();
          if (localTime > serverTime) {
            mergedMap.set(cleanId, cleanItem);
            hasLocalChanges = true;
          }
        }
      });
    }

    const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
      return (b.date || '').localeCompare(a.date || '') || (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });

    // ローカルストレージに最新一覧を保存
    localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(mergedList));

    // サーバーに未反映のデータまたは削除IDがある場合は同期
    if (hasLocalChanges || deletedSet.size > 0 || (Array.isArray(serverList) && mergedList.length !== serverList.length)) {
      saveServerExpenses(mergedList, Array.from(deletedSet)).catch(e => {
        console.warn('Failed to push merged expenses to server:', e);
      });
    }

    return mergedList;
  } catch (err) {
    console.warn('syncExpensesWithServer error:', err);
    return getExpenseList();
  }
}

/**
 * 商品マスタ一覧を取得（デフォルトで頻度の多い順にソート）
 * @param {boolean} sortByFrequency 使用頻度の多い順にソートするかどうか
 */
export function getItemMasterList(sortByFrequency = true) {
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

      // デフォルトマスタに定義されている正規商品（ホールドイットクランプ等）が欠落していれば自動補完
      let anyAdded = false;
      DEFAULT_ITEMS_MASTER.forEach(defItem => {
        const defKey = getMasterKey(defItem.name);
        if (!cleanList.some(it => getMasterKey(it.name) === defKey)) {
          cleanList.push({ ...defItem });
          anyAdded = true;
        }
      });

      if (cleanList.length !== list.length || anyAdded) {
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
      // マスタ内アイテムの usageCount も納品請求書の実記載頻度で同期・更新
      list.forEach(item => {
        item.docUsageCount = getItemDocUsage(item, historyUsage);
        item.usageCount = item.docUsageCount; // 肥大化した内部カウンタを伝票記載実数に正規化
      });
      list.sort((a, b) => {
        const countA = Number(a.docUsageCount) || 0;
        const countB = Number(b.docUsageCount) || 0;
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
export function saveItemMasterList(list) {
  try {
    const cleanList = deduplicateItemMasterList(list);
    localStorageSetItemAndSync(KEYS.ITEM_MASTER, JSON.stringify(cleanList));
    // サーバーファイルにも即時非同期保存（二度と消えないようにする）
    saveServerMasterItems(cleanList).catch(err => {
      console.warn('Server item master save failed:', err);
    });
    // 在庫マスタとも即時連動（カテゴリ変更による在庫除外・追加を反映）
    try {
      getInventoryList();
    } catch (invErr) {
      console.warn('Inventory sync failed during saveItemMasterList:', invErr);
    }
    return true;
  } catch (e) {
    console.error('Failed to save item master list:', e);
    return false;
  }
}

/**
 * 商品マスタの使用回数を記録（伝票へ追加時等）
 */
export function recordItemMasterUsage(itemId, itemName) {
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
export function saveItemToMaster(item, isExplicitEdit = true) {
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
      // 既存商品の更新時：
      // isExplicitEditがfalse（伝票保存等の自動処理）の場合は商品マスタの固定価格（unitPrice/userPrice）を絶対に変更しない！
      const currentUnitPrice = Number(list[existingIndex].unitPrice) || 0;
      const currentUserPrice = Number(list[existingIndex].userPrice) || 0;

      list[existingIndex] = {
        ...list[existingIndex],
        ...item,
        name: cleanName,
        category: item.category !== undefined ? item.category : (list[existingIndex].category || ''),
        sku: item.sku !== undefined ? item.sku : (list[existingIndex].sku || ''),
        unitPrice: isExplicitEdit
          ? (Number(item.unitPrice !== undefined ? item.unitPrice : currentUnitPrice) || 0)
          : currentUnitPrice,
        userPrice: isExplicitEdit
          ? (Number(item.userPrice !== undefined ? item.userPrice : currentUserPrice) || 0)
          : currentUserPrice,
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
        category: item.category || '',
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
 * 商品カテゴリ一覧を取得
 * @returns {string[]} カテゴリ名配列
 */
export function getItemCategoryList() {
  try {
    const raw = localStorage.getItem(KEYS.ITEM_CATEGORIES);
    if (!raw) {
      saveItemCategoryList(DEFAULT_ITEM_CATEGORIES);
      return [...DEFAULT_ITEM_CATEGORIES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveItemCategoryList(DEFAULT_ITEM_CATEGORIES);
      return [...DEFAULT_ITEM_CATEGORIES];
    }
    // 「修理・工賃」が未登録なら自動補完
    if (!parsed.includes('修理・工賃')) {
      parsed.push('修理・工賃');
      saveItemCategoryList(parsed);
    }
    return parsed;
  } catch (e) {
    console.error('Failed to get item category list:', e);
    return [...DEFAULT_ITEM_CATEGORIES];
  }
}

/**
 * 商品カテゴリ一覧を保存
 * @param {string[]} list 
 */
export function saveItemCategoryList(list) {
  try {
    if (!Array.isArray(list)) return false;
    const cleanList = Array.from(new Set(list.map(c => String(c || '').trim()).filter(Boolean)));
    localStorageSetItemAndSync(KEYS.ITEM_CATEGORIES, JSON.stringify(cleanList));
    // サーバーへ即時保存（クラウド同期）
    saveServerItemCategories({
      itemCategories: cleanList,
      nonStockCategories: getNonStockCategories()
    }).catch(e => {
      console.warn('Server item categories save failed:', e);
    });
    return true;
  } catch (e) {
    console.error('Failed to save item category list:', e);
    return false;
  }
}

/**
 * 商品カテゴリを新規追加
 * @param {string} name カテゴリ名
 * @param {boolean} [isNonStock=false] 在庫管理対象外とするか
 */
export function addItemCategory(name, isNonStock = false) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return false;
  const list = getItemCategoryList();
  if (!list.includes(cleanName)) {
    list.push(cleanName);
    saveItemCategoryList(list);
  }
  if (isNonStock) {
    setCategoryNonStock(cleanName, true);
  }
  return true;
}

/**
 * 商品カテゴリの並び順を上下に移動
 * @param {string} name カテゴリ名
 * @param {'up'|'down'} direction 移動方向
 * @returns {string[]} 更新後のカテゴリリスト
 */
export function moveItemCategory(name, direction) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return getItemCategoryList();
  const list = [...getItemCategoryList()];
  const idx = list.indexOf(cleanName);
  if (idx === -1) return list;

  if (direction === 'up' && idx > 0) {
    const temp = list[idx - 1];
    list[idx - 1] = list[idx];
    list[idx] = temp;
    saveItemCategoryList(list);
  } else if (direction === 'down' && idx < list.length - 1) {
    const temp = list[idx + 1];
    list[idx + 1] = list[idx];
    list[idx] = temp;
    saveItemCategoryList(list);
  }
  return list;
}

/**
 * 非在庫対象（在庫マスタ連携除外）カテゴリ一覧を取得
 * @returns {string[]}
 */
export function getNonStockCategories() {
  try {
    const raw = localStorage.getItem(KEYS.NON_STOCK_CATEGORIES);
    if (!raw) {
      return [...DEFAULT_NON_STOCK_CATEGORIES];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...DEFAULT_NON_STOCK_CATEGORIES];
  } catch (e) {
    return [...DEFAULT_NON_STOCK_CATEGORIES];
  }
}

/**
 * 非在庫対象カテゴリ一覧を保存
 * @param {string[]} list
 */
export function saveNonStockCategories(list) {
  try {
    if (!Array.isArray(list)) return false;
    const clean = Array.from(new Set(list.map(c => String(c || '').trim()).filter(Boolean)));
    localStorageSetItemAndSync(KEYS.NON_STOCK_CATEGORIES, JSON.stringify(clean));
    // サーバーへ即時保存（クラウド同期）
    saveServerItemCategories({
      itemCategories: getItemCategoryList(),
      nonStockCategories: clean
    }).catch(e => {
      console.warn('Server non-stock categories save failed:', e);
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * カテゴリが在庫管理対象外（役務・工賃・修理等）かどうかを判定
 * @param {string} categoryName
 * @returns {boolean}
 */
export function isNonStockCategory(categoryName) {
  if (!categoryName) return false;
  const name = String(categoryName).trim();
  const nonStockList = getNonStockCategories();
  if (nonStockList.includes(name)) return true;
  return /修理|工賃|役務|点検|保守|送料|配送料|値引|割引|相殺|調整/i.test(name);
}

export function isNonStockItem(item) {
  if (!item) return false;
  const itemName = typeof item === 'string' ? item : (item.name || '');
  if (/値引|割引|相殺|調整|特別値引|出精値引/i.test(itemName)) return true;
  // アスタリスクで始まるゴミ品目（*DP-MS等）は在庫品目から完全除外
  if (String(itemName).trim().startsWith('*')) return true;

  if (typeof item === 'string') {
    const product = findItemMasterByName(item);
    if (product && product.category && String(product.category).trim()) {
      return isNonStockCategory(product.category);
    }
    return isRepairItem(item);
  }
  if (item.category && String(item.category).trim()) {
    return isNonStockCategory(item.category);
  }
  const product = item.itemId
    ? (getItemMasterList(false) || []).find(p => p.id === item.itemId)
    : findItemMasterByName(item.name);
  if (product && product.category && String(product.category).trim()) {
    return isNonStockCategory(product.category);
  }
  return isRepairItem(item.name || item);
}

/**
 * カテゴリの在庫管理対象/対象外属性を切り替え
 * @param {string} categoryName
 * @param {boolean} isNonStock
 */
export function setCategoryNonStock(categoryName, isNonStock) {
  const name = String(categoryName || '').trim();
  if (!name) return;
  const list = getNonStockCategories();
  const exists = list.includes(name);
  if (isNonStock && !exists) {
    list.push(name);
    saveNonStockCategories(list);
  } else if (!isNonStock && exists) {
    const updated = list.filter(c => c !== name);
    saveNonStockCategories(updated);
  }
}

/**
 * 商品カテゴリを削除
 * @param {string} name カテゴリ名
 */
export function deleteItemCategory(name) {
  const cleanName = String(name || '').trim();
  if (!cleanName) return false;
  const list = getItemCategoryList().filter(c => c !== cleanName);
  saveItemCategoryList(list);
  return true;
}

/**
 * 品名で商品マスタを検索（完全一致または正規化キー一致）
 * @param {string} name 
 * @returns {Object|null}
 */
export function findItemMasterByName(name) {
  if (!name) return null;
  const key = getMasterKey(name);
  if (!key) return null;
  const list = getItemMasterList(false);
  return list.find(i => getMasterKey(i.name) === key) || null;
}

/**
 * 商品マスタから商品を削除（在庫品目マスタも連動削除）
 */
export function deleteItemFromMaster(id) {
  try {
    const list = getItemMasterList(false);
    const targetItem = list.find(i => i.id === id);
    const filtered = list.filter(i => i.id !== id);
    saveItemMasterList(filtered);
    // サーバーのFirestoreから個別削除
    deleteServerEntity('items', id).catch(e => {
      console.warn('Server item delete failed:', e);
    });

    // 在庫品目マスタ（KEYS.INVENTORY）からも連動して削除
    const invList = getInventoryList();
    const targetName = targetItem ? targetItem.name : '';
    const newInvList = invList.filter(inv => inv.id !== id && inv.name !== targetName);
    if (newInvList.length !== invList.length) {
      localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(newInvList));
      saveServerInventory(newInvList).catch(() => { });
      deleteServerEntity('inventory', id).catch(() => { });
    }

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
export function getClientMasterUsageMap() {
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
export function getClientMasterList(sortByFrequency = true) {
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
export function saveClientMasterList(list) {
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
export function rescueMastersFromHistory() {
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
export async function syncMastersWithServer() {
  try {
    // 1. 商品マスタの同期（スマートマージ: サーバー・ローカル双方の最新データを保護）
    const serverItems = await fetchServerMasterItems();
    const localItems = getItemMasterList(false);
    if (serverItems && Array.isArray(serverItems)) {
      const mergedMap = new Map();
      serverItems.forEach(i => {
        if (i && (i.id || i.name)) mergedMap.set(i.id || i.name, i);
      });
      let hasLocalChanges = false;
      localItems.forEach(i => {
        const key = i.id || i.name;
        if (!key) return;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, i);
          hasLocalChanges = true;
        } else {
          const sItem = mergedMap.get(key);
          const lTime = new Date(i.updatedAt || i.createdAt || 0).getTime();
          const sTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();
          if (lTime > sTime) {
            mergedMap.set(key, i);
            hasLocalChanges = true;
          }
        }
      });
      const validItems = Array.from(mergedMap.values()).filter(i => !SAMPLE_ITEM_KEYS.has(getMasterKey(i.name)));
      const mergedItems = deduplicateItemMasterList(validItems);
      localStorageSetItemAndSync(KEYS.ITEM_MASTER, JSON.stringify(mergedItems));
      if (hasLocalChanges) {
        saveServerMasterItems(mergedItems).catch(() => { });
      }
      console.log(`[マスタ同期完了] 商品マスタ: 全 ${mergedItems.length} 件をスマート同期しました`);
    } else if (localItems && localItems.length > 0) {
      await saveServerMasterItems(localItems);
    }

    // 2. 取引先マスタの同期（スマートマージ: サーバー・ローカル双方の最新データを保護）
    const serverClients = await fetchServerMasterClients();
    const localClients = getClientMasterList(false);
    if (serverClients && Array.isArray(serverClients)) {
      const mergedMap = new Map();
      serverClients.forEach(c => {
        if (c && (c.id || c.name)) mergedMap.set(c.id || c.name, c);
      });
      let hasLocalChanges = false;
      localClients.forEach(c => {
        const key = c.id || c.name;
        if (!key) return;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, c);
          hasLocalChanges = true;
        } else {
          const sClient = mergedMap.get(key);
          const lTime = new Date(c.updatedAt || c.createdAt || 0).getTime();
          const sTime = new Date(sClient.updatedAt || sClient.createdAt || 0).getTime();
          if (lTime > sTime) {
            mergedMap.set(key, c);
            hasLocalChanges = true;
          }
        }
      });
      const validClients = Array.from(mergedMap.values()).filter(c => !SAMPLE_CLIENT_KEYS.has(getMasterKey(c.name)));
      const finalClients = deduplicateClientMasterList(validClients);
      localStorageSetItemAndSync(KEYS.CLIENT_MASTER, JSON.stringify(finalClients));
      if (hasLocalChanges) {
        saveServerMasterClients(finalClients).catch(() => { });
      }
      console.log(`[マスタ同期完了] 取引先マスタ: 全 ${finalClients.length} 件をスマート同期しました`);
    } else if (localClients && localClients.length > 0) {
      await saveServerMasterClients(localClients);
    }

    // 2-2. 商品カテゴリ・非在庫カテゴリの同期（クラウド双方向同期）
    try {
      const serverCats = await fetchServerItemCategories();
      const localItemCats = getItemCategoryList();
      const localNonStockCats = getNonStockCategories();

      let finalItemCats = localItemCats;
      let finalNonStockCats = localNonStockCats;
      let hasCatChanges = false;

      if (serverCats && Array.isArray(serverCats.itemCategories) && serverCats.itemCategories.length > 0) {
        // サーバーとローカルを統合（並び順と新規登録項目を漏れなく保護）
        const mergedSet = new Set(serverCats.itemCategories);
        localItemCats.forEach(c => mergedSet.add(c));
        finalItemCats = Array.from(mergedSet);
        localStorageSetItemAndSync(KEYS.ITEM_CATEGORIES, JSON.stringify(finalItemCats));
        if (finalItemCats.length !== serverCats.itemCategories.length) {
          hasCatChanges = true;
        }
      } else if (localItemCats.length > 0) {
        hasCatChanges = true;
      }

      if (serverCats && Array.isArray(serverCats.nonStockCategories) && serverCats.nonStockCategories.length > 0) {
        const mergedNonStock = new Set(serverCats.nonStockCategories);
        localNonStockCats.forEach(c => mergedNonStock.add(c));
        finalNonStockCats = Array.from(mergedNonStock);
        localStorageSetItemAndSync(KEYS.NON_STOCK_CATEGORIES, JSON.stringify(finalNonStockCats));
        if (finalNonStockCats.length !== serverCats.nonStockCategories.length) {
          hasCatChanges = true;
        }
      } else if (localNonStockCats.length > 0) {
        hasCatChanges = true;
      }

      if (hasCatChanges) {
        await saveServerItemCategories({
          itemCategories: finalItemCats,
          nonStockCategories: finalNonStockCats
        });
      }
      console.log(`[カテゴリ同期完了] 商品カテゴリ: 全 ${finalItemCats.length} 件をサーバー・ローカルで完全同期しました`);
    } catch (catErr) {
      console.warn('Sync categories error:', catErr);
    }

    // 3. 自社プロファイル（振込先・判子印影含む）の同期
    try {
      const serverIssuer = await fetchServerIssuerProfile();
      const localIssuer = loadIssuerProfile() || {};

      let finalBankInfo = '';
      if (serverIssuer && serverIssuer.bankInfo && serverIssuer.bankInfo.trim() !== '') {
        finalBankInfo = serverIssuer.bankInfo;
      } else if (localIssuer && localIssuer.bankInfo && localIssuer.bankInfo.trim() !== '') {
        finalBankInfo = localIssuer.bankInfo;
      }

      // 判子画像の保護マージ（サーバー・ローカルどちらかにあれば最優先維持）
      let finalStampDataUrl = '';
      if (serverIssuer && serverIssuer.stampDataUrl && serverIssuer.stampDataUrl.trim() !== '') {
        finalStampDataUrl = serverIssuer.stampDataUrl;
      } else if (localIssuer && localIssuer.stampDataUrl && localIssuer.stampDataUrl.trim() !== '') {
        finalStampDataUrl = localIssuer.stampDataUrl;
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
      if (finalStampDataUrl) {
        mergedIssuer.stampDataUrl = finalStampDataUrl;
      }
      if (serverIssuer && serverIssuer.showStamp !== undefined) {
        mergedIssuer.showStamp = serverIssuer.showStamp;
      } else if (localIssuer && localIssuer.showStamp !== undefined) {
        mergedIssuer.showStamp = localIssuer.showStamp;
      }

      localStorageSetItemAndSync(KEYS.ISSUER_PROFILE, JSON.stringify(mergedIssuer));
      await saveServerIssuerProfile(mergedIssuer);
      console.log(`[マスタ同期完了] 自社プロファイル（振込先・判子印影含む）をサーバー・ローカルで完全同期しました`);
    } catch (issuerErr) {
      console.warn('Sync issuer profile error:', issuerErr);
    }

    // 3-2. 会計期首設定（fiscal_settings / openingBalances）の双方向同期
    try {
      const serverFiscal = await fetchServerFiscalSettings();
      const localFiscal = getFiscalSettings() || {};

      if (serverFiscal && typeof serverFiscal === 'object') {
        const sOb = serverFiscal.openingBalances || {};
        const lOb = localFiscal.openingBalances || {};
        // 期首残高の統合（どちらかに設定された数値を保護）
        const mergedOb = { ...sOb, ...lOb };

        const mergedFiscal = {
          ...localFiscal,
          ...serverFiscal,
          openingBalances: (Object.keys(mergedOb).length > 0) ? mergedOb : (Object.keys(sOb).length > 0 ? sOb : lOb),
          updatedAt: new Date().toISOString()
        };

        localStorageSetItemAndSync(KEYS.FISCAL_SETTINGS, JSON.stringify(mergedFiscal));
        if (Object.keys(sOb).length === 0 && Object.keys(lOb).length > 0) {
          await saveServerFiscalSettings(mergedFiscal);
        }
        console.log(`[会計設定同期完了] 期首設定および期首残高をサーバー・ローカルで完全同期しました`);
      } else if (localFiscal && Object.keys(localFiscal).length > 0) {
        await saveServerFiscalSettings(localFiscal);
      }
    } catch (fiscErr) {
      console.warn('Sync fiscal settings error:', fiscErr);
    }

    // 4. 勤怠打刻データのクラウド双方向同期（退勤時刻消失・空上書き防止保護）
    try {
      await syncAttendanceWithServer();
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

    // 11. 在庫マスタ・入荷ロット・シリアル台帳の完全同期
    try {
      await Promise.all([
        syncInventoryLotsWithServer(),
        syncInventorySerialsWithServer(),
        fetchServerInventory()
      ]);
      if (typeof syncInventorySerialsFromIssuedDocs === 'function') syncInventorySerialsFromIssuedDocs();
      if (typeof syncInventoryStockFromIssuedDocs === 'function') syncInventoryStockFromIssuedDocs();
      if (typeof syncInventoryStockFromSerials === 'function') syncInventoryStockFromSerials();
    } catch (invSyncErr) {
      console.warn('Sync inventory masters error:', invSyncErr);
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
export function autoRegisterMastersFromDoc(doc) {
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

    // 商品明細の自動マスタ登録（サンプル商品・修理項目は除外）
    // 【最重要ルール】伝票保存時に既存商品マスタの価格を絶対に上書きしない！
    // 納品請求書で価格を変更して発行しても、商品マスタの価格は固定で維持されます。
    if (Array.isArray(doc.items)) {
      const currentList = getItemMasterList(false);
      doc.items.forEach(it => {
        const name = (it.name || '').trim();
        if (!name || SAMPLE_ITEM_KEYS.has(getMasterKey(name))) return;

        const key = getMasterKey(name);
        const exists = currentList.some(m => getMasterKey(m.name) === key);
        if (!exists) {
          // 未登録の完全新規品目のみマスタに追加（isExplicitEdit: false で価格を保護）
          const autoCat = it.category || (isRepairItem(it) ? '修理・工賃' : '');
          saveItemToMaster({
            name: name,
            category: autoCat,
            unitPrice: Number(it.unitPrice) || 0,
            userPrice: Number(it.userPrice !== undefined ? it.userPrice : it.unitPrice) || 0,
            unit: it.unit || '式',
            taxRate: it.taxRate !== undefined ? Number(it.taxRate) : 10,
            note: it.note || ''
          }, false);
          currentList.push({ name });
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
export async function initMastersPersistence() {
  // 1. サーバー（PCディスク）との双方向同期を最優先で安全に実行（本番マスターを確実に取り込む）
  await syncMastersWithServer();
  // 2. その後、万が一失われた商品・取引先があれば過去伝票から安全に救済
  const rescueResult = rescueMastersFromHistory();
  return rescueResult;
}

/**
 * 取引先マスタに取引先を追加（または上書き）
 */
export function saveClientToMaster(client) {
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
export function deleteClientFromMaster(id) {
  try {
    const list = getClientMasterList(false).filter(c => c.id !== id);
    saveClientMasterList(list);
    // サーバーのFirestoreから個別削除
    deleteServerEntity('clients', id).catch(e => {
      console.warn('Server client delete failed:', e);
    });
    return true;
  } catch (e) {
    console.error('Failed to delete client from master:', e);
    return false;
  }
}

/**
 * 取引先マスタの使用実績を記録
 */
export function recordClientMasterUsage(clientId, clientName) {
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
export function findClientByName(name) {
  if (!name) return null;
  const list = getClientMasterList(false);
  const key = getMasterKey(name);
  if (!key) return null;
  return list.find(c => getMasterKey(c.name) === key) ||
    list.find(c => getMasterKey(c.name).includes(key)) || null;
}

/**
 * 販売店コード（得意先コード）で取引先マスタを検索（重複チェック用）
 * @param {string} code 検索対象のコード
 * @param {string} [excludeId] 編集時に除外する自身の取引先ID
 * @returns {Object|null} 一致した取引先オブジェクト、なければnull
 */
export function findClientByCode(code, excludeId = '') {
  if (!code) return null;
  const cleanCode = normalizeMasterName(code).toLowerCase();
  if (!cleanCode) return null;
  const list = getClientMasterList(false);
  return list.find(c => {
    if (excludeId && c.id === excludeId) return false;
    const cCode = c.code ? normalizeMasterName(c.code).toLowerCase() : '';
    return cCode && cCode === cleanCode;
  }) || null;
}

/**
 * 重複しないユニークな販売店コード（5桁乱数）を自動生成
 * @returns {string} 5桁のユニークな乱数コード（例: "64108"）
 */
export function generateUniqueClientCode() {
  const existingCodes = new Set();

  // 1. 取引先マスタの全コード
  const clientList = (typeof getClientMasterList === 'function') ? getClientMasterList(false) : [];
  if (Array.isArray(clientList)) {
    clientList.forEach(c => {
      if (c && c.code) {
        existingCodes.add(String(c.code).trim().toLowerCase());
      }
    });
  }

  // 2. 伝票履歴の取引先コード
  const docList = (typeof getHistoryList === 'function') ? getHistoryList() : [];
  if (Array.isArray(docList)) {
    docList.forEach(d => {
      const code = d?.client?.code || d?.clientCode;
      if (code) existingCodes.add(String(code).trim().toLowerCase());
    });
  }

  // 3. 重複しない5桁の乱数（10000〜99999）を生成
  let newCode = '';
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const num = Math.floor(10000 + Math.random() * 90000); // 10000 〜 99999
    const str = String(num);
    if (!existingCodes.has(str.toLowerCase())) {
      newCode = str;
      break;
    }
  }

  // 万が一1000回試行しても重複した場合（安全策）
  if (!newCode) {
    newCode = String(Date.now()).slice(-5);
  }

  return newCode;
}


/**
 * 品名ごとのユーザー価格履歴マップを取得
 */
export function getUserPriceHistoryMap() {
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
export function recordUserPrice(itemName, price) {
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
export function getUserPriceHistoryForItem(itemName = '') {
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
export function getDiscountReasons() {
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
export function saveDiscountReasons(list) {
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
export function recordDiscountReason(name) {
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
export function updateDocPaymentStatus(docId, status = 'paid', paidDate = '', note = '') {
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
 * @returns {Promise<boolean>} 成功可否
 */
export async function cancelDocIssue(docId) {
  try {
    console.log("【伝票確定取消】開始:", docId);
    const list = getHistoryList();
    const item = list.find(d => d.id === docId);
    if (!item) {
      console.warn("【伝票確定取消】対象書類が見つかりません:", docId);
      return false;
    }

    const nowIso = new Date().toISOString();
    item.isIssued = false;
    item.issuedAt = null;
    item.isCancelled = true;
    item.updatedAt = nowIso;

    if (item.fullDoc) {
      item.fullDoc.isIssued = false;
      item.fullDoc.issuedAt = null;
      item.fullDoc.isCancelled = true;
      item.fullDoc.updatedAt = nowIso;
    }

    // 1. ローカル履歴に反映
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));

    // 2. 編集中アクティブ伝票が同一書類であればアクティブ伝票も即座に下書き化
    const activeDoc = loadActiveDoc();
    if (activeDoc && activeDoc.id === docId) {
      activeDoc.isIssued = false;
      activeDoc.issuedAt = null;
      activeDoc.isCancelled = true;
      activeDoc.updatedAt = nowIso;
      localStorage.setItem(KEYS.ACTIVE_DOC, JSON.stringify(activeDoc));
      saveServerActiveDoc(activeDoc).catch(() => { });
    }

    // 3. サーバーへ全件マージ保存を確実に即時実行
    const saveRes = await saveServerInvoicesHistory(list);
    if (saveRes) {
      console.log("【伝票確定取消】サーバーへ即座に反映完了:", docId);
    } else {
      console.warn("【伝票確定取消】サーバー反映が保留または失敗しました（ローカルでは取消済み）:", docId);
    }
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
export function getAllExpenseList() {
  try {
    const raw = localStorage.getItem(KEYS.EXPENSES);
    if (!raw) return [];
    let list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    const deletedSet = getDeletedExpenseIds();
    let modified = false;

    // 削除済みIDセット（Tombstone）に含まれるアイテムは完全パージ
    if (deletedSet.size > 0) {
      const originalLen = list.length;
      list = list.filter(e => e && e.id && !deletedSet.has(String(e.id).trim()) && !e.isDeleted && !e._deleted);
      if (list.length !== originalLen) {
        modified = true;
      }
    }

    list.forEach(e => {
      if (!e) return;
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

      // それでも巨大なBase64(約1MB以上)がlocalStorageに残っている場合は、破棄する(パンク防止優先)
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
export function getExpenseList() {
  const deletedSet = getDeletedExpenseIds();
  return getAllExpenseList().filter(e => e && !e.isDeleted && !e._deleted && !deletedSet.has(String(e.id).trim()));
}

/**
 * 経費・仕入データを保存（新規追加または更新）
 * @param {object} expense
 */
export function saveExpense(expense) {
  try {
    const list = getAllExpenseList();
    const id = expense.id || ('exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6));
    const receiptImg = expense.receiptImage || expense.receiptDataUrl || '';

    // 再保存の場合は削除済みリストから解除
    removeDeletedExpenseId(id);

    const newExp = {
      id,
      date: expense.date || new Date().toISOString().split('T')[0],
      category: expense.category || '雑費',
      amount: Number(expense.amount) || 0,
      taxRate: expense.taxRate !== undefined && expense.taxRate !== null ? Number(expense.taxRate) : 10,
      payee: expense.payee || '',
      invoiceNumber: expense.invoiceNumber ? String(expense.invoiceNumber).trim().toUpperCase() : '',
      note: expense.note || '',
      receiptImage: receiptImg,
      receiptDataUrl: receiptImg ? "same" : "", // サイズ削減のため同じデータを持たせない
      isCost: !!expense.isCost,
      isPurchase: !!expense.isPurchase,
      claimant: expense.claimant || '小林俊介',
      isSettled: !!expense.isSettled,
      settledDate: expense.settledDate || '',
      paymentMethod: expense.paymentMethod || '普通預金',
      // Phase 1〜4 で追加された新フィールド
      paymentAccount: expense.paymentAccount || expense.paymentMethod || '普通預金',
      taxType: expense.taxType || 'taxable_10',
      invoiceType: expense.invoiceType || (expense.invoiceNumber ? 'qualified' : 'none'),
      linkedInventoryId: expense.linkedInventoryId || '',
      linkedInventoryQty: Number(expense.linkedInventoryQty) || 0,
      updatedAt: new Date().toISOString()
    };

    const existingIndex = list.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = newExp;
    } else {
      list.unshift(newExp);
    }

    localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(list));
    // サーバーファイル / Firestore にも即時保存
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
 * @param {string} settlementJournalId
 * @returns {number} 更新件数
 */
export function markExpensesSettled(expenseIds = [], settledDate = '', settlementJournalId = '') {
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
        if (settlementJournalId) {
          e.settlementJournalId = settlementJournalId;
        }
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
 * 経費・仕入データを削除（Tombstone記録・ローカル即時除外・Firestore完全反映）
 */
export async function deleteExpense(id) {
  try {
    if (!id) return false;
    const cleanId = String(id).trim();

    // 1. ゾンビ復活防止のため削除済みIDセット（Tombstone）に永続記録
    recordDeletedExpenseId(cleanId);

    // 2. ローカルリストから該当アイテムを即座に完全除外
    const list = getAllExpenseList();
    const updatedList = list.filter(e => e && e.id !== cleanId);
    localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(updatedList));

    // 3. サーバーFirestoreから個別削除 & 最新リストとdeletedIds送信による完全上書き
    try {
      await Promise.allSettled([
        deleteServerEntity('expenses', cleanId),
        saveServerExpenses(updatedList, [cleanId])
      ]);
    } catch (netErr) {
      console.warn('Server delete/save error:', netErr);
    }

    return true;
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
export function getAttendanceList() {
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
 * 勤怠データを保存（ローカルおよびサーバーへ即座に確実に同期）
 */
export async function saveAttendance(attendance) {
  try {
    const list = getAttendanceList();
    const id = attendance.id || ('att_' + attendance.date);
    const existingIndex = list.findIndex(a => a.id === id || a.date === attendance.date);
    const existing = existingIndex >= 0 ? list[existingIndex] : null;

    const record = {
      id: (existing && existing.id) ? existing.id : id,
      date: attendance.date,
      clockIn: (attendance.clockIn !== undefined && attendance.clockIn !== null && attendance.clockIn !== '')
        ? attendance.clockIn
        : (existing ? (existing.clockIn || '') : ''),
      clockOut: (attendance.clockOut !== undefined && attendance.clockOut !== null && attendance.clockOut !== '')
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
    
    // サーバー（Firestore / data/attendance/attendance.json）へ確実に非同期保存を待機
    const serverSaved = await saveServerAttendance(list);
    if (!serverSaved) {
      console.warn("【勤怠サーバー保存警告】オフラインまたは一時エラーのためローカル保存のみ完了しました。次回通信復帰時に自動同期されます。");
    }
    return record;
  } catch (e) {
    console.error('Failed to save attendance:', e);
    return null;
  }
}

/**
 * 本日の勤怠打刻を取得
 */
export function getTodayAttendance() {
  const today = getLocalDateStr();
  const list = getAttendanceList();
  return list.find(a => a.date === today) || null;
}

/**
 * 本日の出勤打刻
 */
export async function clockInToday(timeStr = '', note = '') {
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
  return await saveAttendance(data);
}

/**
 * 本日の退勤打刻
 */
export async function clockOutToday(timeStr = '', note = '') {
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
  return await saveAttendance(data);
}

/**
 * 勤怠記録を削除（IDまたは日付文字列のどちらが渡されても確実に削除し、サーバーファイルも即時削除・同期）
 */
export function deleteAttendance(idOrDate) {
  try {
    const list = getAttendanceList().filter(a => a.id !== idOrDate && a.date !== idOrDate);
    localStorageSetItemAndSync(KEYS.ATTENDANCE, JSON.stringify(list));
    // サーバー（Firestore）側からも即時削除
    deleteServerEntity('attendance', idOrDate).catch(() => { });
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
export function getAttendanceEmployee() {
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
export function saveAttendanceEmployee(info) {
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
export function exportDataAsJSON() {
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
    purchaseMappings: getPurchaseMappings(),
    itemCategories: getItemCategoryList(),
    nonStockCategories: getNonStockCategories(),
    fiscalSettings: getFiscalSettings()
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
export function importDataFromJSON(jsonString) {
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
    if (data.itemCategories && Array.isArray(data.itemCategories)) {
      saveItemCategoryList(data.itemCategories);
    }
    if (data.nonStockCategories && Array.isArray(data.nonStockCategories)) {
      saveNonStockCategories(data.nonStockCategories);
    }
    if (data.fiscalSettings && typeof data.fiscalSettings === 'object') {
      saveFiscalSettings(data.fiscalSettings);
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
 * サーバーとローカルの在庫マスタおよび履歴を安全に相互マージ
 * ローカルにのみ存在する出庫ログや棚卸調整がリロード時に消滅するのを防止
 */
export function mergeInventoryServerAndLocal(serverList, localList) {
  if (!Array.isArray(serverList)) return localList || [];
  if (!Array.isArray(localList) || localList.length === 0) return deduplicateInventoryList(serverList);

  const localMap = new Map();
  localList.forEach(item => {
    if (!item) return;
    const key = getMasterKey(normalizeMasterName(item.name || ''));
    if (key) localMap.set(key, item);
    if (item.id) localMap.set(item.id, item);
  });

  const merged = serverList.map(sItem => {
    if (!sItem) return sItem;
    const key = getMasterKey(normalizeMasterName(sItem.name || ''));
    const lItem = localMap.get(key) || (sItem.id ? localMap.get(sItem.id) : null);
    if (!lItem) return { ...sItem };

    // 履歴を双方向マージ（ローカル手動出庫ログを確実に合成）
    const sHist = Array.isArray(sItem.history) ? sItem.history : [];
    const lHist = Array.isArray(lItem.history) ? lItem.history : [];
    const histMap = new Map();
    const seenLots = new Set();

    const makeHistKey = (h) => {
      if (!h) return '';
      const r = String(h.reason || '');
      // ロット番号が含まれる場合はロット番号を一意キーとして重複を排除
      const matchLot = r.match(/LOT-[0-9]+(-[0-9]+)?/);
      if (matchLot) {
        return `lot_${matchLot[0]}`;
      }
      return h.id || `${h.date || ''}_${h.type || ''}_${h.qty || ''}_${h.delta || ''}_${r.trim()}`;
    };

    sHist.forEach(h => {
      if (!h) return;
      const r = String(h.reason || '');
      if (r.includes('商品マスタ連携により初期登録') && Number(h.qty) === 0) return;
      const hk = makeHistKey(h);
      if (hk && !histMap.has(hk)) histMap.set(hk, h);
    });

    let hasLocalOnlyHistory = false;
    lHist.forEach(h => {
      if (!h) return;
      const r = String(h.reason || '');
      if (r.includes('商品マスタ連携により初期登録') && Number(h.qty) === 0) return;
      const hk = makeHistKey(h);
      if (hk && !histMap.has(hk)) {
        histMap.set(hk, h);
        hasLocalOnlyHistory = true;
      }
    });

    const combinedHistory = Array.from(histMap.values());
    combinedHistory.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date || 0).getTime();
      const timeB = new Date(b.timestamp || b.date || 0).getTime();
      return timeB - timeA;
    });

    // サーバーの現在庫・確定原価・入荷日を第一優先（Source of Truth）として維持
    let chosenStock = (sItem.currentStock !== undefined) ? Number(sItem.currentStock) : (Number(lItem.currentStock) || 0);
    let chosenCost = (sItem.unitCost !== undefined && sItem.unitCost !== null && Number(sItem.unitCost) > 0) ? Number(sItem.unitCost) : (Number(lItem.unitCost) || 0);
    let chosenLastIn = sItem.lastInDate || lItem.lastInDate || '';

    return {
      ...sItem,
      currentStock: chosenStock,
      unitCost: chosenCost,
      lastInDate: chosenLastIn,
      history: combinedHistory
    };
  });

  return deduplicateInventoryList(merged);
}

/**
 * サーバーから在庫マスタを取得（クラウドを唯一の真実として完全同期）
 */
export async function fetchServerInventory() {
  try {
    const res = await apiFetch('inventory', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // ローカルの既存データを取得
        const rawLocal = localStorage.getItem(KEYS.INVENTORY);
        let localList = [];
        try {
          localList = rawLocal ? JSON.parse(rawLocal) : [];
        } catch (e) { localList = []; }

        // サーバー（Firestore）の現在庫数・確定原価を100%維持しながら、未同期の手動出庫ログのみ安全にマージ
        const merged = mergeInventoryServerAndLocal(data, localList);
        localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(merged));
        console.log(`[在庫マスタ同期完了] 全 ${merged.length} 品目をクラウド（Firestore）から完全同期しました`);
        return merged;
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
export async function saveServerInventory(inventoryList) {
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
export async function fetchServerPurchaseMappings() {
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
export async function saveServerPurchaseMappings(mappings) {
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
 * 起動時にサーバーと在庫データ（マスタ・仕入マッピング・入荷ロット・シリアル台帳）を完全同期
 */
export async function initInventoryFromServer() {
  await Promise.all([
    fetchServerInventory(),
    fetchServerPurchaseMappings(),
    syncInventoryLotsWithServer(),
    syncInventorySerialsWithServer()
  ]);
  // シリアル台帳・発行済伝票から実在庫およびシリアル出荷ステータスを自動引落・完全同期
  if (typeof syncInventorySerialsFromIssuedDocs === 'function') {
    syncInventorySerialsFromIssuedDocs();
  }
  if (typeof syncInventoryStockFromIssuedDocs === 'function') {
    syncInventoryStockFromIssuedDocs();
  }
  if (typeof syncInventoryStockFromSerials === 'function') {
    syncInventoryStockFromSerials();
  }
}

/**
 * 在庫マスタの重複排除およびサンプル品目の完全パージ
 */
export function deduplicateInventoryList(rawList) {
  if (!Array.isArray(rawList)) return [];
  const map = new Map();

  for (const inv of rawList) {
    if (!inv || !inv.name) continue;
    // 1. サンプル品目の完全排除
    if (isSampleItem(inv)) continue;

    // 2. 修理・工賃等の非在庫カテゴリ品目の完全排除（在庫マスタ非表示）
    if (isNonStockItem(inv)) continue;

    // 3. アスタリスク付きゴミ品目（*DP-MS等）、テスト品目、KET.IC.2B（DP-5000旧名称）、および値引き・割引行の完全排除
    const rawTrimmed = String(inv.name || '').trim();
    const rawName = rawTrimmed.toLowerCase();
    if (rawTrimmed.startsWith('*') || rawName === 'てすと' || rawName === 'test' || rawName.includes('ket.ic.2b') || rawName.includes('エレクトロパワー') || /値引|割引|相殺|調整|特別値引|出精値引/i.test(rawName)) {
      continue;
    }

    // 4. 旧・汎用「PSE認証 リチウムイオンバッテリー」（DP-BT-CS / DP-BT-SK への移行に伴う完全排除）
    if (inv.id === 'inv_dp5000_bat' || rawTrimmed === 'PSE認証 リチウムイオンバッテリー' || rawTrimmed === 'PSE認証リチウムイオンバッテリー') {
      continue;
    }

    let normName = normalizeMasterName(inv.name);
    let key = getMasterKey(normName);
    if (!key) continue;

    // スプレッダーとメカニカルスプレッダーの統合（重複解消）
    if (key === 'dp-ms スプレッダー' || key === 'スプレッダー' || key === 'dp-ms メカニカルスプレッダー' || key === 'メカニカルスプレッダー') {
      normName = 'DP-MS　メカニカルスプレッダー';
      inv.name = 'DP-MS　メカニカルスプレッダー';
      if (!inv.sku) inv.sku = 'DP-MS-01';
      key = getMasterKey(normName);
    }

    if (!map.has(key)) {
      map.set(key, {
        id: inv.id || (`inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`),
        itemId: inv.itemId || '',
        name: normName,
        sku: (inv.sku || '').trim(),
        currentStock: Number(inv.currentStock) || 0,
        safetyStock: Number(inv.safetyStock) >= 0 ? Number(inv.safetyStock) : 5,
        unit: (inv.unit || '個').trim(),
        unitCost: Number(inv.unitCost) || 0,
        unitPrice: Number(inv.unitPrice) || 0,
        location: (inv.location || '本社倉庫').trim(),
        lastInDate: inv.lastInDate || '',
        note: inv.note || '',
        type: inv.type || (inv.id === 'inv_1' ? 'bundle' : 'single'),
        hasSerial: (!normName.includes('DP-EG') && !normName.includes('3点引き') && !normName.includes('アタッチメント')) && (
          (inv.hasSerial !== undefined ? !!inv.hasSerial : false) ||
          (inv.id === 'inv_dp5000_body' || inv.id === 'inv_dp5000_bat' || inv.id === 'inv_2') ||
          (normName.includes('DP-5000') || normName.includes('バッテリー') || normName.includes('DP-MS') || normName.includes('メカニカルスプレッダー') || normName.includes('スプレッダー'))
        ),
        bundleItems: Array.isArray(inv.bundleItems) ? inv.bundleItems.map(b => {
          if (b.inventoryId === 'inv_dp5000_bat' || (b.name && b.name.includes('PSE認証 リチウムイオンバッテリー'))) {
            return { inventoryId: 'inv_prod_1794209910003_eqxd', name: 'DP-BT-CS　DP-5000用バッテリー', qty: 2, role: 'battery' };
          }
          return b;
        }) : (inv.id === 'inv_1' ? [
          { inventoryId: 'inv_dp5000_body', name: 'DP-5000 本体', qty: 1, role: 'main' },
          { inventoryId: 'inv_prod_1794209910003_eqxd', name: 'DP-BT-CS　DP-5000用バッテリー', qty: 2, role: 'battery' },
          { inventoryId: 'inv_dp5000_chg', name: 'PSE認証 専用急速充電器', qty: 1, role: 'charger' }
        ] : []),
        history: Array.isArray(inv.history) ? [...inv.history] : []
      });
    } else {
      // 既存品目と統合（重複解消）
      const existing = map.get(key);
      if (!existing.itemId && inv.itemId) existing.itemId = inv.itemId;
      if (!existing.sku && inv.sku) existing.sku = inv.sku;
      if (!existing.unitCost && inv.unitCost) existing.unitCost = inv.unitCost;
      if (!existing.unitPrice && inv.unitPrice) existing.unitPrice = inv.unitPrice;
      if (inv.safetyStock > existing.safetyStock) existing.safetyStock = inv.safetyStock;
      if (!existing.lastInDate && inv.lastInDate) existing.lastInDate = inv.lastInDate;
      if (inv.type) existing.type = inv.type;
      if (inv.hasSerial !== undefined) {
        existing.hasSerial = (!existing.name.includes('DP-EG') && !existing.name.includes('3点引き')) ? inv.hasSerial : false;
      }
      if (Array.isArray(inv.bundleItems) && inv.bundleItems.length > 0) existing.bundleItems = inv.bundleItems;
      // 履歴をマージ（同一ロットの重複を完全排除・キー除外）
      if (Array.isArray(inv.history)) {
        const makeKey = h => {
          if (!h) return '';
          const r = String(h.reason || '');
          const matchLot = r.match(/LOT-[0-9]+(-[0-9]+)?/);
          if (matchLot) return `lot_${matchLot[0]}`;
          return h.id || `${h.date}_${h.type}_${h.qty}_${h.delta || ''}_${r.trim()}`;
        };
        const histKeys = new Set(existing.history.map(makeKey));
        for (const h of inv.history) {
          if (!h) continue;
          const r = String(h.reason || '');
          if (r.includes('商品マスタ連携により初期登録') && Number(h.qty) === 0) continue;
          const hk = makeKey(h);
          if (!histKeys.has(hk)) {
            existing.history.push(h);
            histKeys.add(hk);
          }
        }
        // 日付・timestampで降順ソート
        existing.history.sort((a, b) => {
          const timeA = new Date(a.timestamp || a.date || 0).getTime();
          const timeB = new Date(b.timestamp || b.date || 0).getTime();
          return timeB - timeA;
        });
      }
      // 最新の履歴エントリに処理後在庫(currentStock)が記録されていればそれを優先（出庫による在庫減少を巻き戻さない）
      if (existing.history && existing.history.length > 0 && existing.history[0].currentStock !== undefined) {
        existing.currentStock = Number(existing.history[0].currentStock);
      } else if (existing.currentStock === 0 && inv.currentStock !== 0) {
        existing.currentStock = inv.currentStock;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * 在庫マスタ一覧を取得（商品マスタと自動連携・同期・重複排除・サンプル完全パージ）
 */
export function getInventoryList() {
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

    // 非在庫カテゴリ、アスタリスク付き品目、テスト品目、KET.IC.2B（DP-5000旧名称）、値引き行を除去
    const beforeCleanLen = list.length;
    list = list.filter(inv => {
      if (!inv || !inv.name) return false;
      if (String(inv.name).trim().startsWith('*')) return false;
      if (isNonStockItem(inv)) return false;
      const lower = inv.name.toLowerCase();
      if (lower.includes('てすと') || lower.includes('test')) return false;
      if (lower.includes('ket.ic.2b') || lower.includes('エレクトロパワー')) return false;
      if (/値引|割引|相殺|調整|特別値引|出精値引/i.test(lower)) return false;
      return true;
    });
    if (list.length !== beforeCleanLen) modified = true;

    cleanItems.forEach(prod => {
      if (!prod || !prod.name) return;
      if (String(prod.name).trim().startsWith('*')) return;
      if (isNonStockItem(prod)) return; // 修理項目・非在庫カテゴリは在庫マスタに追加しない
      const lowerProd = (prod.name || '').toLowerCase();
      if (lowerProd.includes('てすと') || lowerProd.includes('test') || lowerProd.includes('ket.ic.2b') || lowerProd.includes('エレクトロパワー') || /値引|割引|相殺|調整|特別値引|出精値引/i.test(lowerProd)) {
        return; // テスト・旧KET・値引き項目は在庫マスタに追加しない
      }
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
        const isTracked = (prod.name.includes('DP-5000') || prod.name.includes('バッテリー') || prod.name.includes('DP-MS') || prod.name.includes('メカニカルスプレッダー') || prod.name.includes('スプレッダー'));
        if (isTracked && !existing.hasSerial) {
          existing.hasSerial = true;
          modified = true;
        }
      } else {
        // 商品マスタにあるが在庫リストにない商品を自動追加（初期在庫0）
        const isTracked = (prod.name.includes('DP-5000') || prod.name.includes('バッテリー') || prod.name.includes('DP-MS') || prod.name.includes('メカニカルスプレッダー') || prod.name.includes('スプレッダー'));
        list.push({
          id: `inv_${prod.id}`,
          itemId: prod.id,
          name: prod.name,
          sku: prod.sku || '',
          hasSerial: isTracked,
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
    }

    // デフォルト構成品（本体・バッテリー・充電器）が未登録の場合は補完
    DEFAULT_INVENTORY.forEach(def => {
      const exists = list.find(it => it.id === def.id || it.sku === def.sku || it.name === def.name);
      if (!exists) {
        list.push({ ...def });
        modified = true;
      } else if (def.type === 'bundle' && exists.type !== 'bundle') {
        exists.type = 'bundle';
        exists.bundleItems = def.bundleItems;
        modified = true;
      }
    });

    // セット品（BOM）の理論在庫可能数および標準原価を構成品在庫から動的算出
    list.forEach(inv => {
      if (inv.type === 'bundle' && Array.isArray(inv.bundleItems) && inv.bundleItems.length > 0) {
        // 完成品在庫（ロット入庫等の実在庫）が既に存在する場合はそれを優先維持し、未設定・0の場合のみ部品から算出
        if (inv.currentStock === undefined || inv.currentStock === null || Number(inv.currentStock) <= 0) {
          const calc = calculateBundleStockAndCost(inv, list);
          if (calc.availableStock > 0) {
            inv.currentStock = calc.availableStock;
          }
          if (calc.unitCost > 0 && (!inv.unitCost || Number(inv.unitCost) === 0)) {
            inv.unitCost = calc.unitCost;
          }
        }
      }
    });

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
export function saveNewProductAndInventory(data) {
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
export function saveInventoryItem(item) {
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
 * 在庫リスト全体を一括保存
 * @param {Array} list
 * @returns {boolean}
 */
export function saveInventoryList(list) {
  try {
    if (!Array.isArray(list)) return false;
    const clean = deduplicateInventoryList(list);
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(clean));
    saveServerInventory(clean).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to save inventory list:', e);
    return false;
  }
}

/**
 * 在庫品目を削除
 */
export function deleteInventoryItem(id) {
  try {
    const list = getInventoryList();
    const filtered = list.filter(i => i.id !== id);
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(filtered));
    saveServerInventory(filtered).catch(() => { });
    deleteServerEntity('inventory', id).catch(e => {
      console.warn('Server inventory delete failed:', e);
    });
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
export function adjustStock(id, deltaQty, reason = '', metadata = {}, isDirectSet = false) {
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

    const clean = deduplicateInventoryList(list);
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(clean));
    saveServerInventory(clean).catch(() => { });
    console.log(`【在庫出入庫調整】完了: ${item.name} (${id}) 変動: ${actualDelta} => 現在庫: ${newStock}`);
    return { item, logEntry };
  } catch (e) {
    console.error('Failed to adjust stock:', e);
    return null;
  }
}

/**
 * 手動入出庫ログの削除
 * @param {string} itemId - 在庫品目ID
 * @param {string} logId - 履歴ログID
 */
export function deleteManualInventoryLog(itemId, logId) {
  try {
    const list = getInventoryList();
    const item = list.find(i => i.id === itemId || i.itemId === itemId || (i.name && i.name.trim() === String(itemId).trim()));
    if (!item || !Array.isArray(item.history)) return false;

    const initialLen = item.history.length;
    item.history = item.history.filter(h => String(h.id) !== String(logId));
    if (item.history.length === initialLen) return false;

    // 現在庫を再計算
    const histLogs = getInventoryHistoryWithShipments(item);
    if (Array.isArray(histLogs) && histLogs.length > 0) {
      item.currentStock = histLogs[0].computedRunningStock !== undefined ? Number(histLogs[0].computedRunningStock) : 0;
    }

    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(list));
    saveServerInventory(list).catch(() => { });
    console.log(`【手動ログ削除】完了: 品目「${item.name}」ログID: ${logId} 現在庫再計算: ${item.currentStock}`);
    return true;
  } catch (err) {
    console.error('Failed to delete manual inventory log:', err);
    return false;
  }
}

/**
 * 手動入出庫ログの編集・更新
 * @param {string} itemId - 在庫品目ID
 * @param {string} logId - 履歴ログID
 * @param {object} updateData - { date, delta, reason, payee }
 */
export function updateManualInventoryLog(itemId, logId, updateData) {
  try {
    const list = getInventoryList();
    const item = list.find(i => i.id === itemId || i.itemId === itemId || (i.name && i.name.trim() === String(itemId).trim()));
    if (!item || !Array.isArray(item.history)) return false;

    const log = item.history.find(h => String(h.id) === String(logId));
    if (!log) return false;

    if (updateData.date) log.date = updateData.date;
    if (updateData.reason !== undefined) log.reason = updateData.reason;
    if (updateData.payee !== undefined) log.payee = updateData.payee;
    if (updateData.delta !== undefined) {
      const d = Number(updateData.delta) || 0;
      log.delta = d;
      log.qty = Math.abs(d);
      log.type = d >= 0 ? 'in' : 'out';
    }
    log.updatedAt = new Date().toISOString();

    // 現在庫を再計算
    const histLogs = getInventoryHistoryWithShipments(item);
    if (Array.isArray(histLogs) && histLogs.length > 0) {
      item.currentStock = histLogs[0].computedRunningStock !== undefined ? Number(histLogs[0].computedRunningStock) : 0;
    }

    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(list));
    saveServerInventory(list).catch(() => { });
    console.log(`【手動ログ編集】完了: 品目「${item.name}」ログID: ${logId} 現在庫再計算: ${item.currentStock}`, updateData);
    return true;
  } catch (err) {
    console.error('Failed to update manual inventory log:', err);
    return false;
  }
}

/**
 * 商品マスタ（ItemMaster）から未登録の商品を在庫マスタにインポート
 */
export function syncInventoryWithItemsMaster() {
  const invList = getInventoryList();
  const cleanItems = getItemMasterList(false);

  let addedCount = 0;
  cleanItems.forEach(item => {
    if (isNonStockItem(item)) return; // 修理・工賃等の非在庫品目は除外
    const itemKey = getMasterKey(item.name);
    // 既存の在庫品目に同名または同itemIdがあるかチェック
    const exists = invList.some(inv => (inv.itemId && inv.itemId === item.id) || (getMasterKey(inv.name) === itemKey));
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
        location: '本社倉庫',
        lastInDate: '',
        note: `商品マスタ連携品目: ${item.note || ''}`,
        type: 'single',
        hasSerial: false,
        bundleItems: [],
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
export function getPurchaseMappings() {
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
export function savePurchaseMapping(rawName, inventoryId) {
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
export function findInventoryMatchForPurchase(rawName) {
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

export async function fetchServerPayrollRecords() {
  try {
    const res = await apiFetch('payroll/records');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function saveServerPayrollRecords(records) {
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

export async function fetchServerPayrollSettings() {
  try {
    const res = await apiFetch('payroll/settings');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function saveServerPayrollSettings(settings) {
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

export async function fetchServerPreviousYearIncome() {
  try {
    const res = await apiFetch('payroll/previous-year');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function saveServerPreviousYearIncome(data) {
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
export function getPreviousYearIncome() {
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
export function savePreviousYearIncome(data) {
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
export function getPayrollSettings() {
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
export function savePayrollSettings(settings) {
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
export function getPayrollRecords() {
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
export function getPayrollRecordByMonth(targetMonth) {
  const records = getPayrollRecords();
  return records.find(r => r.targetMonth === targetMonth) || null;
}

/**
 * 給与明細レコードの保存（新規または更新）
 */
export function savePayrollRecord(record) {
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
export function deletePayrollRecord(targetMonthOrId) {
  try {
    let records = getPayrollRecords();
    records = records.filter(r => r.id !== targetMonthOrId && r.targetMonth !== targetMonthOrId);
    localStorageSetItemAndSync(KEYS.PAYROLL_RECORDS, JSON.stringify(records));
    saveServerPayrollRecords(records);
    deleteServerEntity('payroll_records', targetMonthOrId).catch(e => {
      console.warn('Server payroll record delete failed:', e);
    });
    return true;
  } catch (e) {
    console.error('Failed to delete payroll record:', e);
    return false;
  }
}

// ==========================================================================
// 財務会計（複式簿記・振替伝票・期首残高）データ永続化
// ==========================================================================

export async function saveServerAccountMaster(items) {
  try {
    const res = await apiFetch('account_master', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function saveServerManualJournals(journals) {
  try {
    const res = await apiFetch('manual_journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(journals)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function saveServerFiscalSettings(settings) {
  try {
    const res = await apiFetch('fiscal_settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchServerFiscalSettings() {
  try {
    const res = await apiFetch('fiscal_settings', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // オフラインまたは静的起動時
  }
  return null;
}

export async function fetchServerItemCategories() {
  try {
    const res = await apiFetch('item-categories', { cache: 'no-store' });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // オフライン
  }
  return null;
}

export async function saveServerItemCategories(payload) {
  try {
    const res = await apiFetch('item-categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * 勘定科目マスタ一覧を取得（未設定時は DEFAULT_ACCOUNT_MASTER を返す）
 * @returns {Array<any>}
 */
export function getAccountMasterList() {
  try {
    const raw = localStorage.getItem(KEYS.ACCOUNT_MASTER);
    if (!raw) {
      if (typeof DEFAULT_ACCOUNT_MASTER !== 'undefined' && Array.isArray(DEFAULT_ACCOUNT_MASTER)) {
        return JSON.parse(JSON.stringify(DEFAULT_ACCOUNT_MASTER));
      }
      return [];
    }
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Failed to load account master:', e);
    return (typeof DEFAULT_ACCOUNT_MASTER !== 'undefined') ? JSON.parse(JSON.stringify(DEFAULT_ACCOUNT_MASTER)) : [];
  }
}

/**
 * 勘定科目マスタ一覧を保存
 * @param {Array<any>} list
 */
export function saveAccountMasterList(list) {
  try {
    const safeList = Array.isArray(list) ? list : [];
    localStorageSetItemAndSync(KEYS.ACCOUNT_MASTER, JSON.stringify(safeList));
    saveServerAccountMaster(safeList).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to save account master:', e);
    return false;
  }
}

/**
 * 手動振替伝票（複合仕訳）一覧を取得
 * @returns {Array<any>}
 */
export function getManualJournals() {
  try {
    const raw = localStorage.getItem(KEYS.MANUAL_JOURNALS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Failed to load manual journals:', e);
    return [];
  }
}

/**
 * 振替伝票を保存（新規追加または更新）
 * @param {Object} journal
 * @returns {string|boolean} 生成または更新されたID
 */
export function saveManualJournal(journal) {
  try {
    if (!journal) return false;
    const list = getManualJournals();
    const entryId = journal.id || `mj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();
    const newEntry = {
      ...journal,
      id: entryId,
      updatedAt: nowIso
    };
    if (!newEntry.createdAt) newEntry.createdAt = nowIso;

    const existingIndex = list.findIndex(j => j.id === entryId);
    if (existingIndex >= 0) {
      list[existingIndex] = newEntry;
    } else {
      list.push(newEntry);
    }

    localStorageSetItemAndSync(KEYS.MANUAL_JOURNALS, JSON.stringify(list));
    saveServerManualJournals(list).catch(() => { });
    return entryId;
  } catch (e) {
    console.error('Failed to save manual journal:', e);
    return false;
  }
}

/**
 * 振替伝票を削除
 * @param {string} id
 */
export function deleteManualJournal(id) {
  try {
    let list = getManualJournals();
    list = list.filter(j => j.id !== id);
    localStorageSetItemAndSync(KEYS.MANUAL_JOURNALS, JSON.stringify(list));
    deleteServerEntity('manual_journals', id).catch(() => { });
    saveServerManualJournals(list).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to delete manual journal:', e);
    return false;
  }
}

/**
 * 会計年度と期首月から、期首日(YYYY-MM-DD)と期末日(YYYY-MM-DD)を計算
 */
export function calculateFiscalDates(year, month) {
  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || 4;
  const startStr = `${y}-${String(m).padStart(2, '0')}-01`;
  const endMonth = ((m - 1 + 12 - 1) % 12) + 1;
  const endYear = m === 1 ? y : y + 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const endStr = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start: startStr, end: endStr, endMonth, endYear };
}

/**
 * 会計年度・期首残高設定を取得
 * @returns {Object}
 */
export function getFiscalSettings() {
  try {
    const raw = localStorage.getItem(KEYS.FISCAL_SETTINGS);
    const today = new Date();
    const currentYear = today.getFullYear();
    const defaultDates = calculateFiscalDates(currentYear, 4);
    const defaultSettings = {
      fiscalYear: currentYear,
      fiscalStartMonth: 4,
      fiscalYearStart: defaultDates.start,
      fiscalYearEnd: defaultDates.end,
      taxMethod: 'tax_inclusive',
      openingBalances: {}
    };
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    const year = parsed.fiscalYear ? Number(parsed.fiscalYear) : currentYear;
    const startM = parsed.fiscalStartMonth ? Number(parsed.fiscalStartMonth) : 4;
    const dates = calculateFiscalDates(year, startM);
    return {
      ...defaultSettings,
      ...parsed,
      fiscalYear: year,
      fiscalStartMonth: startM,
      fiscalYearStart: parsed.fiscalYearStart || dates.start,
      fiscalYearEnd: parsed.fiscalYearEnd || dates.end
    };
  } catch (e) {
    console.warn('Failed to load fiscal settings:', e);
    const defaultDates = calculateFiscalDates(2026, 4);
    return {
      fiscalYear: 2026,
      fiscalStartMonth: 4,
      fiscalYearStart: defaultDates.start,
      fiscalYearEnd: defaultDates.end,
      taxMethod: 'tax_inclusive',
      openingBalances: {}
    };
  }
}

/**
 * 会計年度・期首残高設定を保存
 * @param {Object} settings
 */
export function saveFiscalSettings(settings) {
  try {
    const current = getFiscalSettings();
    const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
    localStorageSetItemAndSync(KEYS.FISCAL_SETTINGS, JSON.stringify(updated));
    saveServerFiscalSettings(updated).catch(() => { });
    return true;
  } catch (e) {
    console.error('Failed to save fiscal settings:', e);
    return false;
  }
}

/**
 * ローカルストレージ内の全データ（マスタ・経費・伝票・自社設定・会計）をサーバーへ一括アップロード
 */
export async function pushAllLocalDataToServer() {
  const token = (typeof getFirebaseAuthToken === 'function') ? await getFirebaseAuthToken(false) : null;
  if (!token) {
    return { success: true, offline: true, message: '未ログインのためローカルストレージのみに保存しました（サーバー同期はログイン後に実行されます）' };
  }

  const fetchFn = (typeof window !== 'undefined' && window.apiFetch) ? window.apiFetch : fetch;
  const payload = {
    masterItems: getItemMasterList(false),
    masterClients: getClientMasterList(false),
    issuerProfile: loadIssuerProfile(),
    expenses: getExpenseList(),
    invoicesHistory: getHistoryList(),
    attendance: (typeof getAttendanceList === 'function') ? getAttendanceList() : [],
    accountMaster: getAccountMasterList(),
    manualJournals: getManualJournals(),
    fiscalSettings: getFiscalSettings(),
    lockedMonths: getLockedMonths(),
    itemCategories: getItemCategoryList(),
    nonStockCategories: getNonStockCategories()
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
    if (data.offline) {
      return { success: true, offline: true, message: data.message || 'ローカルストレージに保存しました' };
    }
    return { success: true, message: '全データをサーバーへ正常にバックアップ・同期しました！' };
  } catch (err) {
    console.warn('Failed to push all local data to server:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * サーバーから全データを一括取得してローカルストレージへ即時反映
 */
export async function pullAllServerDataToLocal() {
  const token = (typeof getFirebaseAuthToken === 'function') ? await getFirebaseAuthToken(false) : null;
  if (!token) {
    return { success: true, offline: true, message: '未ログインのためローカルデータを使用します' };
  }

  const fetchFn = (typeof window !== 'undefined' && window.apiFetch) ? window.apiFetch : fetch;
  try {
    const res = await fetchFn('sync/pull-all', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.offline) return { success: true, offline: true, message: 'ローカルデータを優先して使用します' };

    if (data.masterItems && Array.isArray(data.masterItems) && data.masterItems.length > 0) {
      saveItemMasterList(data.masterItems);
    }
    if (data.masterClients && Array.isArray(data.masterClients) && data.masterClients.length > 0) {
      saveClientMasterList(data.masterClients);
    }
    if (data.issuerProfile && typeof data.issuerProfile === 'object') {
      saveIssuerProfile(data.issuerProfile);
    }
    if (data.expenses && Array.isArray(data.expenses)) {
      const deletedSet = getDeletedExpenseIds();
      if (Array.isArray(data.deletedExpenseIds)) {
        data.deletedExpenseIds.forEach(id => {
          if (id) {
            const cleanId = String(id).trim();
            recordDeletedExpenseId(cleanId);
            deletedSet.add(cleanId);
          }
        });
      }
      const cleanExpenses = data.expenses.filter(e => e && e.id && !deletedSet.has(String(e.id).trim()) && !e.isDeleted && !e._deleted);
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(cleanExpenses));
    }
    if (data.invoicesHistory && Array.isArray(data.invoicesHistory)) {
      const deletedInvoicesSet = typeof getDeletedInvoiceIds === 'function' ? getDeletedInvoiceIds() : (typeof getDeletedDocIds === 'function' ? getDeletedDocIds() : new Set());
      const cleanInvoices = data.invoicesHistory.filter(inv => inv && inv.id && !deletedInvoicesSet.has(String(inv.id).trim()) && !inv.isDeleted && !inv._deleted);
      localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(cleanInvoices));
    }
    if (data.attendance && Array.isArray(data.attendance)) {
      try {
        await syncAttendanceWithServer();
      } catch (attSyncErr) {
        console.warn('pullAllServerDataToLocal attendance sync warning:', attSyncErr);
      }
    }
    if (data.accountMaster && Array.isArray(data.accountMaster) && data.accountMaster.length > 0) {
      localStorageSetItemAndSync(KEYS.ACCOUNT_MASTER, JSON.stringify(data.accountMaster));
    }
    if (data.manualJournals && Array.isArray(data.manualJournals)) {
      localStorageSetItemAndSync(KEYS.MANUAL_JOURNALS, JSON.stringify(data.manualJournals));
    }
    if (data.fiscalSettings && typeof data.fiscalSettings === 'object') {
      localStorageSetItemAndSync(KEYS.FISCAL_SETTINGS, JSON.stringify(data.fiscalSettings));
    }
    if (data.lockedMonths && Array.isArray(data.lockedMonths)) {
      saveLockedMonths(data.lockedMonths);
    }
    if (data.itemCategories && Array.isArray(data.itemCategories) && data.itemCategories.length > 0) {
      saveItemCategoryList(data.itemCategories);
    }
    if (data.nonStockCategories && Array.isArray(data.nonStockCategories) && data.nonStockCategories.length > 0) {
      saveNonStockCategories(data.nonStockCategories);
    }
    await Promise.all([
      syncInventoryLotsWithServer(),
      syncInventorySerialsWithServer(),
      fetchServerInventory()
    ]);
    if (typeof syncInventoryStockFromIssuedDocs === 'function') syncInventoryStockFromIssuedDocs();
    if (typeof syncInventoryStockFromSerials === 'function') syncInventoryStockFromSerials();
    return { success: true, message: 'サーバーから最新データを同期しました！' };
  } catch (err) {
    console.error('Failed to pull all data from server:', err);
    return { success: false, error: err.message || err };
  }
}

/**
 * 月次締め（ロック）年月リストの取得
 * @returns {string[]} 例: ['2026-09', '2026-08']
 */
export function getLockedMonths() {
  try {
    const raw = localStorage.getItem(KEYS.LOCKED_MONTHS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * 月次締め（ロック）年月リストの保存
 * @param {string[]} months 
 */
export function saveLockedMonths(months) {
  try {
    if (!Array.isArray(months)) months = [];
    const unique = Array.from(new Set(months.filter(Boolean))).sort().reverse();
    localStorageSetItemAndSync(KEYS.LOCKED_MONTHS, JSON.stringify(unique));
    return true;
  } catch (e) {
    console.error('Failed to save locked months:', e);
    return false;
  }
}

/**
 * 指定された日付または年月がロック済み（月次締め完了）かどうか判定
 * @param {string} dateOrMonth 例: '2026-10-21' または '2026-10'
 * @returns {boolean}
 */
export function isMonthLocked(dateOrMonth) {
  if (!dateOrMonth) return false;
  try {
    const ym = String(dateOrMonth).trim().slice(0, 7).replace(/\//g, '-');
    if (!/^\d{4}-\d{2}$/.test(ym)) return false;
    const lockedList = getLockedMonths();
    return Array.isArray(lockedList) && lockedList.includes(ym);
  } catch (e) {
    return false;
  }
}

/**
 * セット品（BOM）の現在庫可能数および標準原価を構成品から自動計算
 * @param {object} bundleItem - セット品オブジェクト
 * @param {Array} allItems - 全在庫品目リスト
 * @returns {{ availableStock: number, unitCost: number }}
 */
export function calculateBundleStockAndCost(bundleItem, allItems = []) {
  const parts = Array.isArray(bundleItem?.bundleItems) && bundleItem.bundleItems.length > 0
    ? bundleItem.bundleItems
    : (Array.isArray(bundleItem?.bom) && bundleItem.bom.length > 0 ? bundleItem.bom : []);

  if (!bundleItem || bundleItem.type !== 'bundle' || parts.length === 0) {
    return {
      availableStock: Number(bundleItem?.currentStock) || 0,
      unitCost: Number(bundleItem?.unitCost) || 0
    };
  }

  // 完成品としてのロット入庫・手元在庫が存在する場合は最優先
  if (bundleItem.currentStock !== undefined && Number(bundleItem.currentStock) > 0) {
    return {
      availableStock: Number(bundleItem.currentStock),
      unitCost: Number(bundleItem.unitCost) || 0
    };
  }

  let minStock = Infinity;
  let totalCost = 0;

  parts.forEach(bPart => {
    const compId = bPart.inventoryId || bPart.componentId;
    const part = allItems.find(p => p.id === compId || (bPart.name && p.name === bPart.name));
    const reqQty = Number(bPart.qty || bPart.quantity) || 1;
    if (part) {
      const partStock = Number(part.currentStock) || 0;
      const partCost = Number(part.unitCost) || 0;
      const possibleSets = Math.floor(partStock / reqQty);
      if (possibleSets < minStock) {
        minStock = possibleSets;
      }
      totalCost += (partCost * reqQty);
    } else {
      minStock = 0;
    }
  });

  return {
    availableStock: minStock === Infinity ? 0 : minStock,
    unitCost: totalCost > 0 ? totalCost : (Number(bundleItem.unitCost) || 0)
  };
}

// ==========================================================================
// ロット入庫（Inventory Lots）管理
// ==========================================================================

export function getInventoryLotList() {
  try {
    const raw = localStorage.getItem(KEYS.INVENTORY_LOTS);
    let list = raw ? JSON.parse(raw) : [...DEFAULT_INVENTORY_LOTS];
    if (!Array.isArray(list) || list.length === 0) list = [...DEFAULT_INVENTORY_LOTS];

    // 輸入仕入／国内仕入の自己修復（バッテリー・充電器は国内仕入れ、ベーシックセットは輸入仕入れ）
    let modified = false;
    list.forEach(l => {
      const isKnownDomestic = l.lotNumber === 'LOT-20261028-01' || l.lotNumber === 'LOT-20261028-02' ||
        (l.itemName && (l.itemName.includes('充電器') || l.itemName.includes('バッテリー')) && !l.itemName.includes('ベーシックセット') && !/Shenzhen|China|海外/i.test(l.supplier || ''));
      const isKnownImport = l.lotNumber === 'LOT-20260115' || l.lotNumber === 'LOT-202610-01' ||
        (l.itemName && l.itemName.includes('ベーシックセット')) ||
        (l.supplier && /Shenzhen|China|Overseas|海外/i.test(l.supplier)) ||
        Boolean(l.costDetails && (l.costDetails.costShipping > 0 || l.costDetails.costTariff > 0 || l.costDetails.costImportTax > 0));

      if (isKnownDomestic) {
        if (l.procurementType !== 'domestic') {
          l.procurementType = 'domestic';
          modified = true;
        }
        if (l.importTax && l.importTax > 0) {
          l.domesticTax = l.importTax;
          l.importTax = 0;
          modified = true;
        }
      } else if (isKnownImport) {
        if (l.procurementType !== 'import') {
          l.procurementType = 'import';
          modified = true;
        }
        if (!l.importTax && l.taxTotal > 0) {
          l.importTax = l.taxTotal;
          modified = true;
        }
      } else if (!l.procurementType) {
        l.procurementType = 'domestic';
        modified = true;
      }
    });

    // 重複IDの自己修復（各ロットに固有の一意なIDを保証し、編集時の相互引きずりを完全防止）
    const seenIds = new Set();
    list.forEach((l, idx) => {
      if (!l.id || seenIds.has(l.id)) {
        const uniqueSuffix = Math.random().toString(36).substr(2, 6);
        const baseNum = l.lotNumber ? l.lotNumber.replace(/[^a-zA-Z0-9_-]/g, '_') : Date.now();
        l.id = `lot_${baseNum}_${uniqueSuffix}`;
        modified = true;
      }
      seenIds.add(l.id);
    });

    if (modified && raw) {
      try {
        localStorageSetItemAndSync(KEYS.INVENTORY_LOTS, JSON.stringify(list));
        saveServerInventoryLots(list).catch(() => { });
      } catch (_) { }
    }

    return list;
  } catch (e) {
    return [...DEFAULT_INVENTORY_LOTS];
  }
}

export function saveInventoryLot(lotData) {
  try {
    if (!lotData) return false;
    const list = getInventoryLotList();
    let entryId = lotData.id || `lot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newLot = {
      ...lotData,
      id: entryId,
      updatedAt: new Date().toISOString()
    };
    if (!newLot.createdAt) newLot.createdAt = newLot.updatedAt;

    // 既存ロットの検索：まず ID が一致するレコードを探す（編集モード優先）
    let existingIndex = list.findIndex(l => l.id === entryId);

    // ID で見つからない場合のみ、ロット番号が完全一致するレコードを探す
    if (existingIndex < 0 && newLot.lotNumber) {
      existingIndex = list.findIndex(l => l.lotNumber === newLot.lotNumber);
      if (existingIndex >= 0) {
        newLot.id = list[existingIndex].id;
      }
    }

    if (existingIndex >= 0) {
      list[existingIndex] = newLot;
    } else {
      list.unshift(newLot);
    }

    localStorageSetItemAndSync(KEYS.INVENTORY_LOTS, JSON.stringify(list));
    saveServerInventoryLots(list).catch(() => { });
    return newLot.id;
  } catch (e) {
    console.error('Failed to save inventory lot:', e);
    return false;
  }
}

export async function fetchServerInventoryLots() {
  try {
    const res = await apiFetch('inventory-lots', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (e) {
    console.warn('サーバーからの入荷ロット取得失敗:', e);
  }
  return null;
}

export async function syncInventoryLotsWithServer() {
  try {
    const serverLots = await fetchServerInventoryLots();
    const localLots = getInventoryLotList();

    if (serverLots && Array.isArray(serverLots)) {
      const lotMap = new Map();
      serverLots.forEach(l => {
        if (!l) return;
        const key = l.id || l.lotNumber;
        if (key) lotMap.set(key, l);
      });

      let hasLocalOnly = false;
      localLots.forEach(l => {
        if (!l) return;
        const key = l.id || l.lotNumber;
        if (key && !lotMap.has(key)) {
          lotMap.set(key, l);
          hasLocalOnly = true;
        }
      });

      const mergedLots = Array.from(lotMap.values());
      mergedLots.sort((a, b) => {
        const dateA = a.arrivalDate || a.date || (a.createdAt ? a.createdAt.split('T')[0] : '') || '';
        const dateB = b.arrivalDate || b.date || (b.createdAt ? b.createdAt.split('T')[0] : '') || '';
        return dateB.localeCompare(dateA);
      });

      localStorageSetItemAndSync(KEYS.INVENTORY_LOTS, JSON.stringify(mergedLots));
      if (hasLocalOnly) {
        saveServerInventoryLots(mergedLots).catch(() => { });
      }
      console.log(`[ロット同期完了] 全 ${mergedLots.length} 件の入荷ロットをサーバー・ローカルで完全同期しました`);
      return mergedLots;
    }
  } catch (err) {
    console.warn('syncInventoryLotsWithServer error:', err);
  }
  return getInventoryLotList();
}

export async function saveServerInventoryLots(lots) {
  try {
    await apiFetch('inventory-lots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lots)
    });
  } catch (e) {
    console.warn('サーバーへのロット保存失敗:', e);
  }
}

/**
 * 入荷ロットを削除（在庫マスタ・シリアル台帳・財務会計仕訳を完全連動取消）
 */
export function deleteInventoryLot(lotId) {
  try {
    if (!lotId) return false;
    const lotList = getInventoryLotList();
    const lotIndex = lotList.findIndex(l => l.id === lotId || l.lotNumber === lotId);
    if (lotIndex === -1) return false;
    const lot = lotList[lotIndex];

    // ① 在庫マスタから数量を差し引く（入庫の取り消し）
    const invList = getInventoryList();
    if (Array.isArray(lot.items) && lot.items.length > 0) {
      lot.items.forEach(it => {
        const qty = Number(it.quantity || it.qty || 0);
        if (qty > 0) {
          adjustStock(it.itemId, -qty, `ロット削除による取消: ${lot.lotNumber}`, { lotNumber: lot.lotNumber });
        }
      });
    } else {
      const qty = Number(lot.quantity || 0);
      if (qty > 0 && lot.itemId) {
        adjustStock(lot.itemId, -qty, `ロット削除による取消: ${lot.lotNumber}`, { lotNumber: lot.lotNumber });
      }
    }

    // 各品目の履歴から該当ロット番号の入庫ログを除去
    const cleanLotNumber = String(lot.lotNumber || '').trim();
    if (cleanLotNumber) {
      const curInvList = getInventoryList();
      let historyModified = false;
      curInvList.forEach(item => {
        if (Array.isArray(item.history)) {
          const beforeLen = item.history.length;
          item.history = item.history.filter(h => {
            const r = String(h.reason || '');
            return !r.includes(cleanLotNumber);
          });
          if (item.history.length !== beforeLen) {
            historyModified = true;
          }
        }
      });
      if (historyModified) {
        saveInventoryList(curInvList);
        saveServerInventory(curInvList).catch(() => { });
      }
    }

    // ② このロットで登録されたシリアル番号の削除
    const serialList = getInventorySerialList();
    const lotSerials = new Set();
    if (Array.isArray(lot.items)) {
      lot.items.forEach(it => {
        if (Array.isArray(it.serials)) {
          it.serials.forEach(s => lotSerials.add(String(s).trim().toUpperCase()));
        }
      });
    }
    const filteredSerials = serialList.filter(s => {
      const sn = String(s.serialNumber || '').trim().toUpperCase();
      const matchLot = (s.lotId && s.lotId === lot.id) || (s.lotNumber && s.lotNumber === lot.lotNumber);
      const inLotSerials = lotSerials.has(sn);
      if (matchLot || inLotSerials) {
        // 先行出荷されたシリアル（納品書や顧客があるもの）は削除せずロット情報のみクリア
        if (s.docNumber || s.clientName || s.status === 'shipped') {
          delete s.lotId;
          delete s.lotNumber;
          s.costPrice = 0;
          return true;
        }
        return false; // 新規入庫された未出荷シリアルは削除
      }
      return true;
    });
    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(filteredSerials));
    saveServerInventorySerials(filteredSerials).catch(() => { });

    // ③ 財務会計の仕訳データを連動削除
    if (typeof getManualJournals === 'function' && typeof deleteManualJournal === 'function') {
      const journals = getManualJournals();
      const targetJnl = journals.find(j =>
        j.id === `jnl_lot_${lot.id}` ||
        (j.sourceType === 'inventory_lot' && j.sourceId === lot.id) ||
        (j.entryNumber === lot.lotNumber && j.sourceType === 'inventory_lot')
      );
      if (targetJnl) {
        deleteManualJournal(targetJnl.id);
        console.log('【財務会計連動取消】ロット仕訳を削除しました:', targetJnl.id);
      }
    }

    // ④ ロット一覧から削除して保存
    lotList.splice(lotIndex, 1);
    localStorageSetItemAndSync(KEYS.INVENTORY_LOTS, JSON.stringify(lotList));
    saveServerInventoryLots(lotList).catch(() => { });
    deleteServerEntity('inventory_lots', lot.id).catch(() => { });

    // 在庫マスタ同期
    syncInventoryStockFromSerials();

    return true;
  } catch (e) {
    console.error('Failed to delete inventory lot:', e);
    return false;
  }
}

// ==========================================================================
// シリアル番号台帳（Inventory Serials）管理 & 在庫マスタ連動
// ==========================================================================

/**
 * シリアル台帳（Inventory Serials）の在庫中件数を在庫マスタ（Inventory Master）へ完全連動同期
 */
export function syncInventoryStockFromSerials() {
  try {
    const serials = getInventorySerialList();
    const raw = localStorage.getItem(KEYS.INVENTORY);
    if (!raw) return;
    let invList = JSON.parse(raw);
    if (!Array.isArray(invList) || invList.length === 0) return;
    let modified = false;

    // 品目ごとの「在庫中 (in_stock)」件数を集計
    const inStockCounts = {
      'inv_dp5000_body': 0,
      'inv_2': 0,
      'inv_prod_1794209910003_eqxd': 0,
      'inv_prod_1794209994433_ij47': 0
    };

    serials.forEach(s => {
      if (!s || s.status !== 'in_stock') return;
      // セット化済（isBundled）のシリアルは、本体単品（inv_dp5000_body）の手元在庫としては絶対にカウントしない！
      if (s.isBundled) return;

      const itemName = String(s.itemName || '').toUpperCase();
      const sSn = String(s.serialNumber || '').toUpperCase();
      if (s.inventoryId === 'inv_dp5000_body' || (itemName.includes('DP-5000') && !itemName.includes('MS'))) {
        inStockCounts['inv_dp5000_body']++;
      } else if (s.inventoryId === 'inv_2' || itemName.includes('DP-MS')) {
        inStockCounts['inv_2']++;
      } else if (s.inventoryId === 'inv_prod_1794209910003_eqxd' || itemName.includes('DP-BT-CS') || s.sku === 'DP-BT-CS' || sSn.startsWith('BAT-') || sSn.startsWith('N485')) {
        inStockCounts['inv_prod_1794209910003_eqxd']++;
      } else if (s.inventoryId === 'inv_prod_1794209994433_ij47' || itemName.includes('DP-BT-SK') || s.sku === 'DP-BT-SK' || sSn.startsWith('0031077')) {
        inStockCounts['inv_prod_1794209994433_ij47']++;
      }
    });

    // 【最重要原則】在庫マスタの現在庫（currentStock）は、ロット入庫・セット品化・出荷履歴に基づく
    // 帳簿実在庫（getInventoryHistoryWithShipments）を唯一の真実（Source of Truth）として100%統一管理する。
    // シリアル件数による破壊的上書きは行わず、手元在庫シリアル数の現状把握ログのみを出力する。
    console.log('【シリアル台帳現況】在庫中シリアル数集計:', inStockCounts);
    return inStockCounts;
  } catch (e) {
    console.error('Failed to sync inventory from serials:', e);
  }
}

/**
 * 発行済伝票（確定された納品書・請求書）から出荷数量を集計し、
 * 非シリアル商品および単品在庫を自動引き落とし・同期する
 */
export function syncInventoryStockFromIssuedDocs() {
  try {
    // 伝票履歴（書類履歴）を全件取得
    const docs = getHistoryList();
    if (!Array.isArray(docs) || docs.length === 0) {
      return { updated: false, validDocCount: 0, summary: {}, detailsList: [] };
    }

    const rawInv = localStorage.getItem(KEYS.INVENTORY);
    if (!rawInv) return { updated: false, validDocCount: 0, summary: {}, detailsList: [] };
    let invList = JSON.parse(rawInv);
    if (!Array.isArray(invList) || invList.length === 0) return { updated: false, validDocCount: 0, summary: {}, detailsList: [] };

    // 不要品目（てすと、KET.IC.2B、値引き行）を在庫マスタから完全自動排除
    const originalLen = invList.length;
    invList = invList.filter(item => {
      if (!item || !item.name) return false;
      const lower = item.name.toLowerCase();
      if (lower.includes('てすと') || lower.includes('test')) return false;
      if (lower.includes('ket.ic.2b') || lower.includes('エレクトロパワー')) return false;
      if (/値引|割引|相殺|調整|特別値引|出精値引/i.test(lower)) return false;
      return true;
    });
    let modified = (invList.length !== originalLen);

    // 商品マスタからも「てすと」や値引き項目を念のため除去
    try {
      const rawItems = localStorage.getItem(KEYS.ITEMS);
      if (rawItems) {
        let items = JSON.parse(rawItems);
        if (Array.isArray(items)) {
          const cleanItems = items.filter(it => !it.name || (!it.name.includes('てすと') && !it.name.toLowerCase().includes('test') && !/値引|割引|相殺|調整/i.test(it.name)));
          if (cleanItems.length !== items.length) {
            localStorageSetItemAndSync(KEYS.ITEMS, JSON.stringify(cleanItems));
            saveServerItemMaster(cleanItems).catch(() => { });
          }
        }
      }
    } catch (e) { }

    // 1. 各品目の「発行済出荷累計数量」を集計
    const shippedQtyMap = {};
    let validDocCount = 0;

    docs.forEach(doc => {
      // 見積書、取消済伝票、および訂正前の元伝票(superseded)は二重引当防止のため出荷集計から完全除外
      if (!doc || doc.isCancelled === true || doc.isCancelled === 'true' || doc.docType === 'estimate') return;
      if (doc.status === 'superseded' || doc.isSuperseded === true || (doc.fullDoc && (doc.fullDoc.status === 'superseded' || doc.fullDoc.isSuperseded))) return;

      // 確定済伝票明細（doc.items または doc.fullDoc.items を網羅的に取得）
      const docItems = (Array.isArray(doc.items) && doc.items.length > 0)
        ? doc.items
        : (doc.fullDoc && Array.isArray(doc.fullDoc.items) ? doc.fullDoc.items : []);
      if (docItems.length === 0) return;

      validDocCount++;

      docItems.forEach(it => {
        if (!it || !it.name) return;
        const itName = it.name.trim();
        // 値引き・割引等の金額調整行は出荷数量集計から完全除外
        if (/値引|割引|相殺|調整|特別値引|出精値引/i.test(itName)) return;

        const qty = Number(it.quantity) || 0;
        if (qty <= 0) return;

        const norm = getMasterKey(itName);

        // 商品グループキーの特定
        let groupKey = norm;
        if (norm.includes('dp-5000') || norm.includes('ベーシックセット') || norm.includes('ket.ic.2b') || norm.includes('エレクトロパワー')) {
          groupKey = 'grp_dp5000';
        } else if (norm.includes('dp-ms') || norm.includes('スプレッダー')) {
          groupKey = 'grp_dpms';
        } else if (norm.includes('dp-eg') || norm.includes('3点引き') || norm.includes('３点引き')) {
          groupKey = 'grp_dpeg';
        } else if (norm.includes('dp-ac') || norm.includes('アクセサリー')) {
          groupKey = 'grp_dpac';
        } else if (norm.includes('hic-025') || norm.includes('クランプ') || norm.includes('ホールドイット')) {
          groupKey = 'grp_hic';
        } else if (norm.includes('急速充電器')) {
          groupKey = 'grp_charger';
        }

        shippedQtyMap[groupKey] = (shippedQtyMap[groupKey] || 0) + qty;
        shippedQtyMap[norm] = (shippedQtyMap[norm] || 0) + qty;
        if (it.itemId) {
          shippedQtyMap[it.itemId] = (shippedQtyMap[it.itemId] || 0) + qty;
        }
      });
    });

    // 1.5. 【ユーザー指定仕様】シリアル管理台帳の「納品請求書と紐づけしてないが、在庫中になってない物（デモ機・寄贈等）」をプラス
    const serialList = getInventorySerialList();
    const unlinkedOutMap = {};
    if (Array.isArray(serialList)) {
      serialList.forEach(s => {
        if (!s) return;
        const status = s.status || '';
        // 「在庫中（in_stock）」以外のもの（出荷済、デモ機、寄贈、貸出中、廃棄等）
        const isNotStock = (status !== 'in_stock');
        // 「納品請求書と紐づけしてない」もの
        const isUnlinked = !s.docNumber && !s.docId;

        if (isNotStock && isUnlinked) {
          const sName = String(s.itemName || '').toUpperCase();
          let groupKey = 'other';
          if (s.inventoryId === 'inv_dp5000_body' || (sName.includes('DP-5000') && !sName.includes('MS'))) {
            groupKey = 'grp_dp5000';
          } else if (s.inventoryId === 'inv_2' || sName.includes('DP-MS') || sName.includes('スプレッダー')) {
            groupKey = 'grp_dpms';
          } else if (s.inventoryId === 'inv_dp5000_bat' || s.itemType === 'battery' || sName.includes('バッテリー')) {
            groupKey = 'grp_battery';
          }

          unlinkedOutMap[groupKey] = (unlinkedOutMap[groupKey] || 0) + 1;
          shippedQtyMap[groupKey] = (shippedQtyMap[groupKey] || 0) + 1;
        }
      });
    }

    // シリアル管理品目（DP-5000本体、DP-MS）については、シリアル台帳上の出庫実績数（30台、8台等）を下回らないよう安全保証
    const totalSerialOutMap = {};
    if (Array.isArray(serialList)) {
      serialList.forEach(s => {
        if (!s || s.status === 'in_stock') return;
        const sName = String(s.itemName || '').toUpperCase();
        let groupKey = '';
        if (s.inventoryId === 'inv_dp5000_body' || (sName.includes('DP-5000') && !sName.includes('MS'))) {
          groupKey = 'grp_dp5000';
        } else if (s.inventoryId === 'inv_2' || sName.includes('DP-MS') || sName.includes('スプレッダー')) {
          groupKey = 'grp_dpms';
        }
        if (groupKey) {
          totalSerialOutMap[groupKey] = (totalSerialOutMap[groupKey] || 0) + 1;
        }
      });
    }
    if (totalSerialOutMap['grp_dp5000']) {
      shippedQtyMap['grp_dp5000'] = Math.max(shippedQtyMap['grp_dp5000'] || 0, totalSerialOutMap['grp_dp5000']);
    }
    if (totalSerialOutMap['grp_dpms']) {
      shippedQtyMap['grp_dpms'] = Math.max(shippedQtyMap['grp_dpms'] || 0, totalSerialOutMap['grp_dpms']);
    }

    // 1.6. 【非伝票手動出庫・入出庫調整の完全集計】
    // 在庫台帳の「➖出庫」「📝棚卸」から手動登録された変動（デモ機、破損、サンプル、社内利用等）を集計
    // ※ 確定伝票（docs）にもシリアル台帳（serialList）にも載らない手動出庫を現在庫から確実に引き落とす
    console.log("【伝票在庫連動】手動出庫・入出庫ログ集計開始");
    const manualOutMap = {}; // item.id / norm / groupKey -> 手動出庫数量
    const manualAdjustDeltaMap = {}; // item.id / norm / groupKey -> 棚卸差分合計

    invList.forEach(item => {
      if (!item || !Array.isArray(item.history)) return;
      const rawNorm = String(item.name || '').toLowerCase();
      const norm = getMasterKey(item.name);
      const isBundle = item.id === 'inv_1' || item.type === 'bundle' || norm.includes('ベーシックセット');
      const isChg = item.id === 'inv_dp5000_chg' || norm.includes('急速充電器') || norm.includes('充電器');
      const isBatSK = !isChg && (item.id === 'inv_prod_1794209994433_ij47' || norm.includes('dpbtsk') || (norm.includes('バッテリー') && (rawNorm.includes('sk') || norm.includes('sk'))));
      const isBatCS = !isChg && (item.id === 'inv_prod_1794209910003_eqxd' || norm.includes('dpbtcs') || (norm.includes('バッテリー') && (rawNorm.includes('cs') || norm.includes('cs'))));
      const isBat = !isChg && (isBatSK || isBatCS || item.id === 'inv_dp5000_bat' || (norm.includes('バッテリー') && !isBundle));
      const isBody = item.id === 'inv_dp5000_body' || (norm.includes('dp5000') && !isBundle && !isBat && !isChg && !norm.includes('スプレッダー') && !norm.includes('アクセサリー') && !norm.includes('3点引き'));

      let groupKey = norm;
      if (isBundle) groupKey = 'grp_dp5000_bundle';
      else if (isBody) groupKey = 'grp_dp5000_body';
      else if (isBatSK) groupKey = 'grp_dp5000_bat_sk';
      else if (isBatCS) groupKey = 'grp_dp5000_bat_cs';
      else if (isBat) groupKey = 'grp_dp5000_bat';
      else if (isChg) groupKey = 'grp_dp5000_chg';
      else if (norm.includes('dpms') || norm.includes('スプレッダー')) groupKey = 'grp_dpms';
      else if (norm.includes('dpeg') || norm.includes('3点引き')) groupKey = 'grp_dpeg';
      else if (norm.includes('dpac') || norm.includes('アクセサリー')) groupKey = 'grp_dpac';
      else if (norm.includes('hic025') || norm.includes('クランプ')) groupKey = 'grp_hic';

      let itemManualOut = 0;
      let itemAdjustDelta = 0;

      item.history.forEach(h => {
        if (!h) return;
        const reason = String(h.reason || '');
        const hid = String(h.id || '');

        // ロット削除による取消は除外（ロット履歴集計に含まれないため）
        if (reason.includes('ロット削除')) return;
        // 確定出荷引当など、伝票発行による自動引当・確定取消復元は伝票集計（docs）と重複するため除外
        if (reason.includes('確定出荷引当') || reason.includes('確定発行取消') || reason.includes('在庫復元') || reason.includes('伝票連携') || reason.includes('自動引当')) return;
        // キッティング（セット品化）による急速充電器消費等は除外
        if (hid.startsWith('log_bundle_') || hid.startsWith('log_unbundle_') || reason.includes('セット品化')) return;
        // 伝票番号が明示されている場合は伝票集計と重複するため除外
        if (h.docNumber || (h.sourceRef && /INV-|EST-|ORD-/i.test(h.sourceRef))) return;

        // 出庫（デモ機、破損、サンプル、社内使用、一般出庫等）
        const isOut = (h.type === 'out') || (h.delta !== undefined && Number(h.delta) < 0 && h.type !== 'adjust');
        if (isOut) {
          const outQty = Math.abs(Number(h.delta !== undefined ? h.delta : h.qty)) || 0;
          itemManualOut += outQty;
        }

        // 実地棚卸差異調整（adjust）
        if (h.type === 'adjust' && h.delta !== undefined) {
          itemAdjustDelta += Number(h.delta) || 0;
        }
      });

      if (itemManualOut > 0) {
        manualOutMap[groupKey] = (manualOutMap[groupKey] || 0) + itemManualOut;
        manualOutMap[norm] = (manualOutMap[norm] || 0) + itemManualOut;
        if (item.itemId) manualOutMap[item.itemId] = (manualOutMap[item.itemId] || 0) + itemManualOut;
        if (item.id) manualOutMap[item.id] = (manualOutMap[item.id] || 0) + itemManualOut;
      }

      if (itemAdjustDelta !== 0) {
        manualAdjustDeltaMap[groupKey] = (manualAdjustDeltaMap[groupKey] || 0) + itemAdjustDelta;
        manualAdjustDeltaMap[norm] = (manualAdjustDeltaMap[norm] || 0) + itemAdjustDelta;
        if (item.itemId) manualAdjustDeltaMap[item.itemId] = (manualAdjustDeltaMap[item.itemId] || 0) + itemAdjustDelta;
        if (item.id) manualAdjustDeltaMap[item.id] = (manualAdjustDeltaMap[item.id] || 0) + itemAdjustDelta;
      }
    });
    console.log("【伝票在庫連動】手動出庫集計完了:", manualOutMap, "棚卸差分:", manualAdjustDeltaMap);

    // 2. ロット履歴からの総入庫数集計 ＆ 最新確定仕入原価・最新入荷日の集計
    const rawLots = localStorage.getItem(KEYS.INVENTORY_LOTS);
    const lots = rawLots ? JSON.parse(rawLots) : [];
    const totalInQtyMap = {};
    const latestLotMap = {}; // groupKey -> { date, unitCost, lotNumber }

    if (Array.isArray(lots)) {
      lots.forEach(lot => {
        if (!lot) return;
        // ロット番号の年と入荷日の年が食い違っている場合の自動修復ガード
        let arrDate = String(lot.arrivalDate || '').trim();
        const lotNum = String(lot.lotNumber || '').trim();
        if (lotNum.includes('2026') && arrDate.startsWith('2025')) {
          arrDate = arrDate.replace('2025', '2026');
          lot.arrivalDate = arrDate;
        }

        if (Array.isArray(lot.items) && lot.items.length > 0) {
          // 混載ロットの場合：各明細品目の数量・確定原価・入荷日を正確に集計
          lot.items.forEach(it => {
            if (!it) return;
            const itName = it.itemName || '';
            const itNorm = getMasterKey(itName);
            const lotNorm = getMasterKey(lot.itemName || '');
            const rawNorm = String(itName).toLowerCase();
            const rawLotNorm = String(lot.itemName || '').toLowerCase();
            const itIsBundle = it.itemId === 'inv_1' || itNorm.includes('ベーシックセット') || (itNorm.includes('dp5000') && itNorm.includes('セット'));
            const isBasicSet = itIsBundle;
            const itIsChg = it.itemId === 'inv_dp5000_chg' || itNorm.includes('急速充電器') || itNorm.includes('充電器');
            const itIsBatSK = !itIsChg && (it.itemId === 'inv_prod_1794209994433_ij47' || itNorm.includes('dpbtsk') || (itNorm.includes('バッテリー') && (lotNum.includes('20261105') || rawNorm.includes('sk') || rawLotNorm.includes('sk'))));
            const itIsBatCS = !itIsChg && (it.itemId === 'inv_prod_1794209910003_eqxd' || itNorm.includes('dpbtcs') || (itNorm.includes('バッテリー') && (lotNum.includes('20260324') || rawNorm.includes('cs') || rawLotNorm.includes('cs'))));
            const itIsBat = !itIsChg && (itIsBatSK || itIsBatCS || it.itemId === 'inv_dp5000_bat' || (itNorm.includes('バッテリー') && !itIsBundle));
            const itIsBody = it.itemId === 'inv_dp5000_body' || (itNorm.includes('dp5000') && !itIsBundle && !itIsBat && !itIsChg && !itNorm.includes('スプレッダー') && !itNorm.includes('アクセサリー') && !itNorm.includes('3点引き'));

            let groupKey = itNorm;
            if (itIsBundle) groupKey = 'grp_dp5000_bundle';
            else if (itIsBody) groupKey = 'grp_dp5000_body';
            else if (itIsBatSK) groupKey = 'grp_dp5000_bat_sk';
            else if (itIsBatCS) groupKey = 'grp_dp5000_bat_cs';
            else if (itIsBat) groupKey = 'grp_dp5000_bat';
            else if (itIsChg) groupKey = 'grp_dp5000_chg';
            else if (itNorm.includes('dpms') || itNorm.includes('スプレッダー')) groupKey = 'grp_dpms';
            else if (itNorm.includes('dpeg') || itNorm.includes('3点引き')) groupKey = 'grp_dpeg';
            else if (itNorm.includes('dpac') || itNorm.includes('アクセサリー')) groupKey = 'grp_dpac';
            else if (itNorm.includes('hic025') || itNorm.includes('クランプ')) groupKey = 'grp_hic';

            const q = Number(it.quantity || it.qty) || 0;
            totalInQtyMap[groupKey] = (totalInQtyMap[groupKey] || 0) + q;
            totalInQtyMap[itNorm] = (totalInQtyMap[itNorm] || 0) + q;
            if (it.itemId) totalInQtyMap[it.itemId] = (totalInQtyMap[it.itemId] || 0) + q;

            // ベーシックセット仕入の場合：本体(+q)の入庫として自動連動
            if (isBasicSet) {
              totalInQtyMap['inv_dp5000_body'] = (totalInQtyMap['inv_dp5000_body'] || 0) + q;
            }

            // 最新確定原価・入荷日の更新（時系列でより新しい日付を優先）
            const cost = Number(it.unitCost || it.landedUnitCost) || 0;
            [groupKey, itNorm, it.itemId].filter(Boolean).forEach(k => {
              if (!latestLotMap[k] || (arrDate && arrDate >= latestLotMap[k].date)) {
                latestLotMap[k] = { date: arrDate, unitCost: cost, lot: lotNum };
              }
            });
          });
        } else if (lot.itemId || lot.itemName) {
          // 単品ロットの場合
          const itName = lot.itemName || '';
          const itNorm = getMasterKey(itName);
          const rawLotNorm = String(lot.itemName || '').toLowerCase();
          const itIsBundle = lot.itemId === 'inv_1' || itNorm.includes('ベーシックセット') || (itNorm.includes('dp5000') && itNorm.includes('セット'));
          const isBasicSet = itIsBundle;
          const itIsChg = lot.itemId === 'inv_dp5000_chg' || itNorm.includes('急速充電器') || itNorm.includes('充電器');
          const itIsBatSK = !itIsChg && (lot.itemId === 'inv_prod_1794209994433_ij47' || itNorm.includes('dpbtsk') || (itNorm.includes('バッテリー') && (lotNum.includes('20261105') || rawLotNorm.includes('sk'))));
          const itIsBatCS = !itIsChg && (lot.itemId === 'inv_prod_1794209910003_eqxd' || itNorm.includes('dpbtcs') || (itNorm.includes('バッテリー') && (lotNum.includes('20260324') || rawLotNorm.includes('cs'))));
          const itIsBat = !itIsChg && (itIsBatSK || itIsBatCS || lot.itemId === 'inv_dp5000_bat' || (itNorm.includes('バッテリー') && !itIsBundle));
          const itIsBody = lot.itemId === 'inv_dp5000_body' || (itNorm.includes('dp5000') && !itIsBundle && !itIsBat && !itIsChg && !itNorm.includes('スプレッダー') && !itNorm.includes('アクセサリー') && !itNorm.includes('3点引き'));

          let groupKey = itNorm;
          if (itIsBundle) groupKey = 'grp_dp5000_bundle';
          else if (itIsBody) groupKey = 'grp_dp5000_body';
          else if (itIsBatSK) groupKey = 'grp_dp5000_bat_sk';
          else if (itIsBatCS) groupKey = 'grp_dp5000_bat_cs';
          else if (itIsBat) groupKey = 'grp_dp5000_bat';
          else if (itIsChg) groupKey = 'grp_dp5000_chg';
          else if (itNorm.includes('dpms') || itNorm.includes('スプレッダー')) groupKey = 'grp_dpms';
          else if (itNorm.includes('dpeg') || itNorm.includes('3点引き')) groupKey = 'grp_dpeg';
          else if (itNorm.includes('dpac') || itNorm.includes('アクセサリー')) groupKey = 'grp_dpac';
          else if (itNorm.includes('hic025') || itNorm.includes('クランプ')) groupKey = 'grp_hic';

          const q = Number(lot.quantity || lot.qty) || 0;
          totalInQtyMap[groupKey] = (totalInQtyMap[groupKey] || 0) + q;
          totalInQtyMap[itNorm] = (totalInQtyMap[itNorm] || 0) + q;
          if (lot.itemId) totalInQtyMap[lot.itemId] = (totalInQtyMap[lot.itemId] || 0) + q;

          // ベーシックセット仕入の場合：本体(+q)の入庫として自動連動
          if (isBasicSet) {
            totalInQtyMap['inv_dp5000_body'] = (totalInQtyMap['inv_dp5000_body'] || 0) + q;
          }

          // 最新確定原価・入荷日の更新
          const cost = Number(lot.unitCost || lot.landedUnitCost) || 0;
          [groupKey, itNorm, lot.itemId].filter(Boolean).forEach(k => {
            if (!latestLotMap[k] || (arrDate && arrDate >= latestLotMap[k].date)) {
              latestLotMap[k] = { date: arrDate, unitCost: cost, lot: lotNum };
            }
          });
        }
      });
    }

    const summary = {};
    const detailsList = [];

    invList.forEach(item => {
      const rawNorm = String(item.name || '').toLowerCase();
      const norm = getMasterKey(item.name);
      const isBundle = item.id === 'inv_1' || item.type === 'bundle' || norm.includes('ベーシックセット');
      const isChg = item.id === 'inv_dp5000_chg' || norm.includes('急速充電器') || norm.includes('充電器');
      const isBatSK = !isChg && (item.id === 'inv_prod_1794209994433_ij47' || norm.includes('dpbtsk') || (norm.includes('バッテリー') && (rawNorm.includes('sk') || norm.includes('sk'))));
      const isBatCS = !isChg && (item.id === 'inv_prod_1794209910003_eqxd' || norm.includes('dpbtcs') || (norm.includes('バッテリー') && (rawNorm.includes('cs') || norm.includes('cs'))));
      const isBat = !isChg && (isBatSK || isBatCS || item.id === 'inv_dp5000_bat' || (norm.includes('バッテリー') && !isBundle));
      const isBody = item.id === 'inv_dp5000_body' || (norm.includes('dp5000') && !isBundle && !isBat && !isChg && !norm.includes('スプレッダー') && !norm.includes('アクセサリー') && !norm.includes('3点引き'));

      let groupKey = norm;
      if (isBundle) groupKey = 'grp_dp5000_bundle';
      else if (isBody) groupKey = 'grp_dp5000_body';
      else if (isBatSK) groupKey = 'grp_dp5000_bat_sk';
      else if (isBatCS) groupKey = 'grp_dp5000_bat_cs';
      else if (isBat) groupKey = 'grp_dp5000_bat';
      else if (isChg) groupKey = 'grp_dp5000_chg';
      else if (norm.includes('dpms') || norm.includes('スプレッダー')) groupKey = 'grp_dpms';
      else if (norm.includes('dpeg') || norm.includes('3点引き')) groupKey = 'grp_dpeg';
      else if (norm.includes('dpac') || norm.includes('アクセサリー')) groupKey = 'grp_dpac';
      else if (norm.includes('hic025') || norm.includes('クランプ')) groupKey = 'grp_hic';

      // ベーシックセットの単位は「セット」に自動正規化
      if (isBundle && item.unit !== 'セット') {
        item.unit = 'セット';
        modified = true;
      }

      const shippedQty = shippedQtyMap[groupKey] || shippedQtyMap[norm] || (item.itemId ? shippedQtyMap[item.itemId] : 0) || 0;
      const lotInQty = totalInQtyMap[groupKey] || totalInQtyMap[norm] || (item.itemId ? totalInQtyMap[item.itemId] : 0) || 0;
      const totalIn = lotInQty;

      // 手動出庫（デモ機・寄贈・社内使用など）および棚卸差分の取得
      let manualOut = (item.id && manualOutMap[item.id]) || (item.itemId && manualOutMap[item.itemId]) || manualOutMap[norm] || manualOutMap[groupKey] || 0;
      // シリアル管理品目（DP-5000本体、DP-MS等）はシリアル台帳の未紐付け出庫（unlinkedOutMap）ですでに shippedQtyMap に加算されている場合があるため二重加算を防止
      if (groupKey === 'grp_dp5000_body' || groupKey === 'grp_dp5000' || groupKey === 'grp_dpms' || groupKey === 'grp_battery' || isBat) {
        const serialUnlinked = (groupKey === 'grp_dp5000_body' ? unlinkedOutMap['grp_dp5000'] : unlinkedOutMap[groupKey]) || 0;
        manualOut = Math.max(0, manualOut - serialUnlinked);
      }
      const adjustDelta = (item.id && manualAdjustDeltaMap[item.id]) || (item.itemId && manualAdjustDeltaMap[item.itemId]) || manualAdjustDeltaMap[norm] || manualAdjustDeltaMap[groupKey] || 0;

      // 【統一計算エンジン】マスタ一覧の現在庫（currentStock）は、履歴モーダル（getInventoryHistoryWithShipments）が算出する
      // 最新の処理後在庫（computedRunningStock）と100%同一の値を採用する！
      let calculatedStock = 0;
      try {
        const histLogs = getInventoryHistoryWithShipments(item);
        if (Array.isArray(histLogs) && histLogs.length > 0) {
          // getInventoryHistoryWithShipments は reverse() 済みのため index 0 が最新ログ
          calculatedStock = histLogs[0].computedRunningStock !== undefined ? Number(histLogs[0].computedRunningStock) : 0;
        } else {
          calculatedStock = totalIn - shippedQty - manualOut + adjustDelta;
        }
      } catch (err) {
        console.warn('getInventoryHistoryWithShipments calculation fallback:', err);
        calculatedStock = totalIn - shippedQty - manualOut + adjustDelta;
      }

      const prevStock = item.currentStock;

      // 【安全ガード】サーバー上の正規現在庫が存在し、ロット台帳が空または未取得の場合はサーバー在庫数を最優先保護
      if (prevStock !== undefined && prevStock > 0 && totalIn === 0 && (!lots || lots.length === 0)) {
        calculatedStock = prevStock;
      }

      if (item.currentStock !== calculatedStock) {
        item.currentStock = calculatedStock;
        modified = true;
      }

      // 最新確定仕入原価 ＆ 最新最終入庫日の完全同期
      const latest = latestLotMap[groupKey] || latestLotMap[norm] || (item.itemId ? latestLotMap[item.itemId] : null) || (item.id ? latestLotMap[item.id] : null);
      if (latest) {
        if (latest.date && item.lastInDate !== latest.date) {
          item.lastInDate = latest.date;
          modified = true;
        }
        if (latest.unitCost && Number(latest.unitCost) > 0) {
          let targetCost = Number(latest.unitCost);
          if (item.unitCost !== targetCost) {
            item.unitCost = targetCost;
            modified = true;
          }
        }
      }

      summary[item.name] = {
        before: prevStock,
        after: calculatedStock,
        shipped: shippedQty,
        manualOut: manualOut,
        adjustDelta: adjustDelta,
        totalIn: totalIn
      };

      detailsList.push({
        name: item.name,
        before: prevStock,
        after: calculatedStock,
        shipped: shippedQty,
        manualOut: manualOut,
        adjustDelta: adjustDelta,
        totalIn: totalIn
      });
    });

    if (modified) {
      localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(invList));
      saveServerInventory(invList).catch(() => { });
      console.log('【伝票在庫連動】発行済伝票から実在庫を自動引落・同期しました:', summary);
    }

    return { updated: modified, validDocCount, summary, detailsList };
  } catch (err) {
    console.error('syncInventoryStockFromIssuedDocs エラー:', err);
    return { updated: false, validDocCount: 0, summary: {}, detailsList: [] };
  }
}

export function getInventorySerialList() {
  try {
    const deletedSerials = getDeletedSerialNumbers();
    const raw = localStorage.getItem(KEYS.INVENTORY_SERIALS);
    if (!raw) {
      const filteredDefaults = DEFAULT_INVENTORY_SERIALS.filter(s => !deletedSerials.has(String(s.serialNumber).trim().toUpperCase()));
      localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(filteredDefaults));
      return [...filteredDefaults];
    }
    let parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const filteredDefaults = DEFAULT_INVENTORY_SERIALS.filter(s => !deletedSerials.has(String(s.serialNumber).trim().toUpperCase()));
      localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(filteredDefaults));
      return [...filteredDefaults];
    }

    // 削除済みシリアルが万が一残っていたら除外
    const initLen = parsed.length;
    parsed = parsed.filter(s => s && s.serialNumber && !deletedSerials.has(String(s.serialNumber).trim().toUpperCase()));
    let updated = (parsed.length !== initLen);

    // 旧シリアル体系（DP5K- や BAT- のみで N始まりのシリアルが1件もない場合）は新デフォルトに刷新
    const hasNSerial = parsed.some(s => s && s.serialNumber && /^N\s*\d{4,5}$/i.test(String(s.serialNumber).trim()));
    if (!hasNSerial) {
      const filteredDefaults = DEFAULT_INVENTORY_SERIALS.filter(s => !deletedSerials.has(String(s.serialNumber).trim().toUpperCase()));
      localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(filteredDefaults));
      return [...filteredDefaults];
    }

    // 伝票履歴（書類履歴）に紐付いている伝票から、未設定のユーザー名を安全に自動同期
    try {
      const rawHistory = localStorage.getItem(KEYS.HISTORY);
      if (rawHistory) {
        const historyList = JSON.parse(rawHistory);
        if (Array.isArray(historyList)) {
          parsed.forEach(s => {
            if (!s || s.endUserName || s.userEditedEndUser || !s.docNumber) return;
            const matchedDoc = historyList.find(d => (d.docNumber === s.docNumber || d.id === s.docId));
            if (!matchedDoc) return;
            let docUser = '';
            if (Array.isArray(matchedDoc.items)) {
              const item = matchedDoc.items.find(it => it && it.serialNumber && String(it.serialNumber).includes(s.serialNumber));
              if (item && item.endUserName) docUser = item.endUserName;
            }
            if (!docUser && matchedDoc.fullDoc && Array.isArray(matchedDoc.fullDoc.items)) {
              const item = matchedDoc.fullDoc.items.find(it => it && it.serialNumber && String(it.serialNumber).includes(s.serialNumber));
              if (item && item.endUserName) docUser = item.endUserName;
            }
            if (!docUser) {
              docUser = matchedDoc.endUserName || (matchedDoc.fullDoc ? matchedDoc.fullDoc.endUserName : '');
            }
            if (docUser) {
              s.endUserName = docUser;
              updated = true;
            }
          });
        }
      }
    } catch (e) {
      console.warn('Auto sync endUserName from history failed:', e);
    }

    // 伝票から判明した実シリアル（N8460系、N10411系等）および最新マスタを自動マージ・補完
    // ※ただしユーザーがゴミ箱で削除したシリアル（deletedSerials）は絶対に復活させない
    for (const def of DEFAULT_INVENTORY_SERIALS) {
      const defSn = String(def.serialNumber).trim().toUpperCase();
      if (deletedSerials.has(defSn)) {
        continue; // 削除済みはスキップ！
      }

      const idx = parsed.findIndex(s => s && s.serialNumber && String(s.serialNumber).trim().toUpperCase() === defSn);
      if (idx === -1) {
        parsed.push({ ...def });
        updated = true;
      }
      // ⚠️ 既に台帳に存在するシリアルレコードに対しては、空欄にした値をデフォルトデータで上書きしてはならない！
    }
    const bundleChanged = syncBundledBatteriesWithParents(parsed);
    if (updated || bundleChanged) {
      localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(parsed));
    }
    return parsed;
  } catch (e) {
    return [...DEFAULT_INVENTORY_SERIALS];
  }
}

export function saveInventorySerial(serialData) {
  try {
    if (!serialData || !serialData.serialNumber) return false;
    const list = getInventorySerialList();
    const sn = String(serialData.serialNumber).trim().toUpperCase();

    // 再登録時は削除済みリストから解除
    removeDeletedSerial(sn);

    const entryId = serialData.id || `sn_${sn.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const newSerial = {
      ...serialData,
      id: entryId,
      serialNumber: sn,
      status: serialData.status || 'in_stock',
      clientName: serialData.clientName || '',
      endUserName: serialData.endUserName || '',
      shipDate: serialData.shipDate || serialData.shippedDate || '',
      docNumber: serialData.docNumber || serialData.invoiceNumber || '',
      docId: serialData.docId || serialData.invoiceId || '',
      note: serialData.note || '',
      updatedAt: new Date().toISOString()
    };

    const existingIndex = list.findIndex(s => s.id === entryId || s.serialNumber === sn);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newSerial };
    } else {
      list.push(newSerial);
    }

    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(list));
    saveServerInventorySerials(list).catch(() => { });

    // 在庫マスタ連動
    syncInventoryStockFromSerials();
    return entryId;
  } catch (e) {
    console.error('Failed to save inventory serial:', e);
    return false;
  }
}

export function deleteInventorySerial(serialIdOrNumber) {
  try {
    if (!serialIdOrNumber) return false;
    const list = getInventorySerialList();
    const target = list.find(s => s.id === serialIdOrNumber || s.serialNumber === serialIdOrNumber);
    const targetSn = target ? target.serialNumber : (String(serialIdOrNumber).startsWith('N') ? serialIdOrNumber : '');

    // 削除済みリストへ永続記録（ゾンビ復活防止）
    if (targetSn) {
      recordDeletedSerial(targetSn);
    }

    const updated = list.filter(s => s.id !== serialIdOrNumber && s.serialNumber !== serialIdOrNumber);
    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(updated));
    saveServerInventorySerials(updated).catch(() => { });

    // 在庫マスタ連動（現在庫数を即座に再計算）
    syncInventoryStockFromSerials();
    return true;
  } catch (e) {
    console.error('Failed to delete inventory serial:', e);
    return false;
  }
}

export function updateSerialStatus(serialNumber, newStatus, details = {}) {
  try {
    if (!serialNumber) return false;
    const list = getInventorySerialList();
    const cleanSn = String(serialNumber).trim().toUpperCase();
    let target = list.find(s => s && String(s.serialNumber || '').trim().toUpperCase() === cleanSn);

    // もし台帳に未登録のシリアルであれば自動登録（取りこぼし防止）
    if (!target) {
      target = {
        id: `sn_${cleanSn}`,
        serialNumber: cleanSn,
        status: newStatus,
        itemName: details.itemName || (cleanSn.startsWith('N') ? 'DP-5000' : (cleanSn.includes('BAT') ? 'PSE認証 リチウムイオンバッテリー' : 'PSE認証 専用急速充電器')),
        createdAt: new Date().toISOString()
      };
      list.push(target);
    }

    target.status = newStatus;
    target.updatedAt = new Date().toISOString();

    if (newStatus === 'in_stock') {
      // 対象品自体が他の本体に組込されている構成部品（bundledWithあり）の場合は 'bundled'、それ以外は 'in_stock'
      if (target.bundledWith && String(target.bundledWith).trim()) {
        target.status = 'bundled';
      } else {
        target.status = 'in_stock';
      }
      target.clientName = '';
      target.endUserName = '';
      target.shipDate = '';
      target.shippedDate = '';
      target.docNumber = '';
      target.docId = '';
      target.bundleItemId = '';

      // セット品化された本体が在庫中に戻った場合、組込バッテリーおよび急速充電器も連動して「セット組込（bundled）」へ復元
      if (target.isBundled) {
        const bodySnNorm = String(target.serialNumber || cleanSn).trim().toUpperCase();

        // 1. 組込バッテリーの復元
        const batSns = Array.isArray(target.batterySerials) && target.batterySerials.length > 0
          ? target.batterySerials
          : list.filter(s => s && String(s.bundledWith || '').trim().toUpperCase() === bodySnNorm && (s.itemId === 'inv_dp5000_bat' || (s.itemName && s.itemName.includes('バッテリー')))).map(b => b.serialNumber);

        batSns.forEach(batSn => {
          const bat = list.find(s => s && String(s.serialNumber || '').trim().toUpperCase() === String(batSn || '').trim().toUpperCase());
          if (bat) {
            bat.status = 'bundled';
            bat.clientName = '';
            bat.endUserName = '';
            bat.shipDate = '';
            bat.shippedDate = '';
            bat.docNumber = '';
            bat.docId = '';
            bat.note = (bat.note || '').replace(/\s*\[DP-5000\([^)]+\)と共に出荷\]/g, '').trim();
            bat.updatedAt = new Date().toISOString();
          }
        });

        // 2. 組込急速充電器の復元
        const chgSn = target.chargerSerial || (list.find(s => s && String(s.bundledWith || '').trim().toUpperCase() === bodySnNorm && (s.itemId === 'inv_dp5000_chg' || (s.itemName && s.itemName.includes('充電器')))) || {}).serialNumber;
        if (chgSn) {
          const chg = list.find(s => s && String(s.serialNumber || '').trim().toUpperCase() === String(chgSn || '').trim().toUpperCase());
          if (chg) {
            chg.status = 'bundled';
            chg.clientName = '';
            chg.endUserName = '';
            chg.shipDate = '';
            chg.shippedDate = '';
            chg.docNumber = '';
            chg.docId = '';
            chg.note = (chg.note || '').replace(/\s*\[DP-5000\([^)]+\)と共に出荷\]/g, '').trim();
            chg.updatedAt = new Date().toISOString();
          }
        }

        // 3. bundledWith で紐付いている全構成品を漏れなくセット組込へ復元
        list.forEach(c => {
          if (c && c.bundledWith && String(c.bundledWith).trim().toUpperCase() === bodySnNorm) {
            c.status = 'bundled';
            c.clientName = '';
            c.endUserName = '';
            c.shipDate = '';
            c.shippedDate = '';
            c.docNumber = '';
            c.docId = '';
            c.note = (c.note || '').replace(/\s*\[DP-5000\([^)]+\)と共に出荷\]/g, '').trim();
            c.updatedAt = new Date().toISOString();
          }
        });
      }
    } else {
      if (details.clientName !== undefined) target.clientName = details.clientName;
      if (details.customerName !== undefined) target.clientName = details.customerName;
      if (details.endUserName !== undefined) {
        target.endUserName = details.endUserName;
        target.userEditedEndUser = false; // 伝票からの確定反映時はフラグをリセット
      }
      if (details.shipDate !== undefined) target.shipDate = details.shipDate;
      if (details.shippedDate !== undefined) { target.shipDate = details.shippedDate; target.shippedDate = details.shippedDate; }
      if (details.docNumber !== undefined) target.docNumber = details.docNumber;
      if (details.invoiceNumber !== undefined) target.docNumber = details.invoiceNumber;
      if (details.docId !== undefined) target.docId = details.docId;
      if (details.note !== undefined && details.note) {
        const cleanDetailNote = String(details.note).trim();
        if (cleanDetailNote) {
          if (target.note && target.note !== cleanDetailNote && !target.note.includes(cleanDetailNote)) {
            target.note = `${target.note} / ${cleanDetailNote}`;
          } else if (!target.note) {
            target.note = cleanDetailNote;
          }
        }
      }

      // セット品化された本体が出荷またはデモ機になった場合、組込バッテリー ＆ 組込急速充電器も連動してステータス更新
      if (newStatus === 'shipped' || newStatus === 'demo') {
        const bodySn = target.serialNumber;
        const statusLabel = newStatus === 'shipped' ? 'と共に出荷' : 'デモ機組込';

        // 1. 組込バッテリーの連動
        const batSns = Array.isArray(target.batterySerials) && target.batterySerials.length > 0
          ? target.batterySerials
          : list.filter(s => s && s.bundledWith === bodySn && (s.itemId === 'inv_dp5000_bat' || (s.itemName && s.itemName.includes('バッテリー')))).map(b => b.serialNumber);

        batSns.forEach(batSn => {
          const bat = list.find(s => s && String(s.serialNumber).trim().toUpperCase() === String(batSn).trim().toUpperCase());
          if (bat) {
            bat.status = newStatus;
            bat.clientName = target.clientName || '';
            bat.endUserName = target.endUserName || '';
            bat.shipDate = target.shipDate || '';
            bat.docNumber = target.docNumber || '';
            bat.docId = target.docId || '';
            const baseNote = (bat.note || '').replace(/\s*\[DP-5000\([^)]+\)(と共に出荷|デモ機組込)\]/g, '').trim();
            const additionalNote = (target.note || '').replace(/\s*\[DP-5000\([^)]+\)(と共に出荷|デモ機組込)\]/g, '').trim();
            const combinedNote = [baseNote, additionalNote].filter((v, idx, arr) => v && arr.indexOf(v) === idx).join(' / ');
            bat.note = (combinedNote ? combinedNote + ' ' : '') + `[DP-5000(${target.serialNumber})${statusLabel}]`;
            bat.updatedAt = new Date().toISOString();
          }
        });

        // 2. 組込急速充電器の連動
        const chgSn = target.chargerSerial || (list.find(s => s && s.bundledWith === bodySn && (s.itemId === 'inv_dp5000_chg' || (s.itemName && s.itemName.includes('充電器')))) || {}).serialNumber;
        if (chgSn) {
          const chg = list.find(s => s && String(s.serialNumber).trim().toUpperCase() === String(chgSn).trim().toUpperCase());
          if (chg) {
            chg.status = newStatus;
            chg.clientName = target.clientName || '';
            chg.endUserName = target.endUserName || '';
            chg.shipDate = target.shipDate || '';
            chg.docNumber = target.docNumber || '';
            chg.docId = target.docId || '';
            const baseNote = (chg.note || '').replace(/\s*\[DP-5000\([^)]+\)(と共に出荷|デモ機組込)\]/g, '').trim();
            chg.note = (baseNote ? baseNote + ' ' : '') + `[DP-5000(${target.serialNumber})${statusLabel}]`;
            chg.updatedAt = new Date().toISOString();
          }
        }
      }
    }

    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(list));
    saveServerInventorySerials(list).catch(() => { });

    // 在庫マスタ連動
    syncInventoryStockFromSerials();
    return true;
  } catch (e) {
    console.error('Failed to update serial status:', e);
    return false;
  }
}

/**
 * セット組込バッテリーに対して、親本体（DP-5000等）の販売店・ユーザー・出荷日・伝票情報を自動同期
 * （親本体の batterySerials / chargerSerial と 子の bundledWith の双方向整合性を完全維持）
 */
export function syncBundledBatteriesWithParents(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  const bodyMap = new Map();
  list.forEach(s => {
    if (s && s.serialNumber && !s.bundledWith) {
      bodyMap.set(String(s.serialNumber).trim().toUpperCase(), s);
    }
  });

  let changed = false;

  // 1. 親本体の batterySerials / chargerSerial に登録されている子部品の bundledWith を自動補正
  bodyMap.forEach((parent, parentSn) => {
    if (Array.isArray(parent.batterySerials)) {
      parent.batterySerials.forEach(bSn => {
        const cleanBSn = String(bSn).trim().toUpperCase();
        const bat = list.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanBSn);
        if (bat && bat.bundledWith !== parentSn) {
          bat.bundledWith = parentSn;
          changed = true;
        }
      });
    }
    if (parent.chargerSerial) {
      const cleanCSn = String(parent.chargerSerial).trim().toUpperCase();
      const chg = list.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanCSn);
      if (chg && chg.bundledWith !== parentSn) {
        chg.bundledWith = parentSn;
        changed = true;
      }
    }
  });

  // 1.5. 逆に子部品側に bundledWith が設定されているのに親本体側に未登録の場合、自動で親本体へ逆反映
  list.forEach(s => {
    if (s && s.serialNumber && s.bundledWith) {
      const parent = bodyMap.get(String(s.bundledWith).trim().toUpperCase());
      if (parent) {
        const sSn = String(s.serialNumber).trim().toUpperCase();
        const itemName = String(s.itemName || '').toUpperCase();
        const isBat = s.inventoryId === 'inv_dp5000_bat' || s.itemId === 'inv_dp5000_bat' || s.itemType === 'battery' || itemName.includes('バッテリー');
        const isChg = s.inventoryId === 'inv_dp5000_chg' || s.itemId === 'inv_dp5000_chg' || s.itemType === 'charger' || itemName.includes('充電器');

        if (isBat) {
          if (!Array.isArray(parent.batterySerials)) {
            parent.batterySerials = [];
          }
          if (!parent.batterySerials.map(x => String(x).trim().toUpperCase()).includes(sSn)) {
            parent.batterySerials.push(sSn);
            parent.isBundled = true;
            changed = true;
          }
        } else if (isChg) {
          if (!parent.chargerSerial || String(parent.chargerSerial).trim().toUpperCase() !== sSn) {
            parent.chargerSerial = sSn;
            parent.isBundled = true;
            changed = true;
          }
        }
      }
    }
  });

  // 2. 子部品の出荷状態・伝票情報を親本体の状態に合わせて厳格に同期
  list.forEach(s => {
    if (s && s.bundledWith) {
      const parent = bodyMap.get(String(s.bundledWith).trim().toUpperCase());
      if (parent) {
        if (parent.status === 'shipped') {
          // 親本体が出荷済の場合: 子部品も出荷済みに連動
          if (s.status !== 'shipped') {
            s.status = 'shipped';
            changed = true;
          }
          if (parent.clientName && s.clientName !== parent.clientName) {
            s.clientName = parent.clientName;
            changed = true;
          }
          if (parent.endUserName && s.endUserName !== parent.endUserName) {
            s.endUserName = parent.endUserName;
            changed = true;
          }
          const parentShipDate = parent.shipDate || parent.shippedDate || '';
          if (parentShipDate && (s.shipDate !== parentShipDate || s.shippedDate !== parentShipDate)) {
            s.shipDate = parentShipDate;
            s.shippedDate = parentShipDate;
            changed = true;
          }
          const parentDocNum = parent.docNumber || parent.invoiceNumber || '';
          if (parentDocNum && s.docNumber !== parentDocNum) {
            s.docNumber = parentDocNum;
            s.invoiceNumber = parentDocNum;
            changed = true;
          }
          if (parent.docId && s.docId !== parent.docId) {
            s.docId = parent.docId;
            changed = true;
          }
        } else if (parent.status === 'in_stock') {
          // 親本体が在庫中の場合: 子部品はセット組込中（bundled）とし、誤った出荷情報・伝票番号をクリア
          if (s.status !== 'bundled') {
            s.status = 'bundled';
            changed = true;
          }
          if (s.docNumber || s.invoiceNumber) {
            s.docNumber = '';
            s.invoiceNumber = '';
            changed = true;
          }
          if (s.docId) {
            s.docId = '';
            changed = true;
          }
          if (s.clientName) {
            s.clientName = '';
            changed = true;
          }
          if (s.shipDate || s.shippedDate) {
            s.shipDate = '';
            s.shippedDate = '';
            changed = true;
          }
        }
      }
    }
  });
  return changed;
}

export function updateSerialDetails(serialNumber, updates = {}) {
  try {
    if (!serialNumber) return false;
    const list = getInventorySerialList();
    const target = list.find(s => s.serialNumber === serialNumber || s.id === serialNumber);
    if (!target) return false;

    if (updates.endUserName !== undefined) {
      target.userEditedEndUser = true; // 台帳で明示的に手動編集されたことを記録
    }
    Object.assign(target, updates, { updatedAt: new Date().toISOString() });

    // もし本体（セット品化済・組込バッテリー/充電器持ち）を編集した場合、付属バッテリー・充電器側にも自動連動
    if (target.isBundled || (Array.isArray(target.batterySerials) && target.batterySerials.length > 0) || target.chargerSerial) {
      const batSns = Array.isArray(target.batterySerials) ? target.batterySerials : [];
      batSns.forEach(bSn => {
        const batObj = list.find(s => s && String(s.serialNumber).trim().toUpperCase() === String(bSn).trim().toUpperCase());
        if (batObj) {
          if (updates.clientName !== undefined) batObj.clientName = updates.clientName;
          if (updates.endUserName !== undefined) batObj.endUserName = updates.endUserName;
          if (updates.shipDate !== undefined) batObj.shipDate = updates.shipDate;
          if (updates.shippedDate !== undefined) batObj.shippedDate = updates.shippedDate;
          if (updates.docNumber !== undefined) batObj.docNumber = updates.docNumber;
          if (updates.docId !== undefined) batObj.docId = updates.docId;
          batObj.updatedAt = new Date().toISOString();
        }
      });

      // 付属専用急速充電器の連動
      list.forEach(chgObj => {
        if (chgObj && (chgObj.serialNumber === target.chargerSerial || (chgObj.bundledWith && chgObj.bundledWith === target.serialNumber))) {
          if (updates.clientName !== undefined) chgObj.clientName = updates.clientName;
          if (updates.endUserName !== undefined) chgObj.endUserName = updates.endUserName;
          if (updates.shipDate !== undefined) chgObj.shipDate = updates.shipDate;
          if (updates.shippedDate !== undefined) chgObj.shippedDate = updates.shippedDate;
          if (updates.docNumber !== undefined) chgObj.docNumber = updates.docNumber;
          if (updates.docId !== undefined) chgObj.docId = updates.docId;
          chgObj.updatedAt = new Date().toISOString();
        }
      });
    }

    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(list));
    saveServerInventorySerials(list).catch(() => { });

    // 在庫マスタ連動
    syncInventoryStockFromSerials();
    return true;
  } catch (e) {
    console.error('Failed to update serial details:', e);
    return false;
  }
}

/**
 * 発行済伝票（納品書・請求書）を全件走査し、シリアル管理台帳（inventory_serials）から
 * 伝票記載のシリアル番号を出荷済（shipped）へ自動引き落とし・伝票完全紐付け
 * 先行出荷されたシリアルが後からロット入庫された場合でも確実に自動連動
 */
export function syncInventorySerialsFromIssuedDocs() {
  try {
    const docs = getHistoryList();
    const list = getInventorySerialList();
    if (!Array.isArray(docs) || !Array.isArray(list)) {
      return { updatedCount: 0, updatedSerials: [], validDocCount: 0 };
    }

    const serialMap = new Map();
    list.forEach(s => {
      if (s && s.serialNumber) {
        serialMap.set(String(s.serialNumber).trim().toUpperCase(), s);
      }
    });

    let modified = false;
    const updatedSerials = [];
    let validDocCount = 0;

    docs.forEach(doc => {
      if (!doc || doc.isCancelled === true || doc.isCancelled === 'true' || doc.docType === 'estimate') return;
      if (doc.status === 'superseded' || doc.isSuperseded === true) return;
      validDocCount++;

      const docNo = String(doc.docNumber || doc.id || '').trim();
      const clientName = doc.client ? (doc.client.name || '') : (doc.clientName || '');
      const docDate = doc.issueDate || doc.date || '';
      const docEndUser = (doc.endUserName || '').trim();
      const docItems = (Array.isArray(doc.items) && doc.items.length > 0)
        ? doc.items
        : (doc.fullDoc && Array.isArray(doc.fullDoc.items) ? doc.fullDoc.items : []);

      docItems.forEach(it => {
        if (!it) return;
        const itemSerials = [];

        // ① assignedSerials から抽出
        if (Array.isArray(it.assignedSerials) && it.assignedSerials.length > 0) {
          it.assignedSerials.forEach(as => {
            if (as && as.serialNumber) {
              const sn = String(as.serialNumber).trim().toUpperCase();
              if (sn && !itemSerials.includes(sn)) itemSerials.push(sn);
            }
          });
        }

        // ② serialNumber 文字列から抽出（N+数字だけでなく充電器やバッテリー等の全形式に対応）
        if (it.serialNumber && typeof it.serialNumber === 'string') {
          const rawParts = it.serialNumber.split(/[,、\n\r\t;/|]+/);
          rawParts.forEach(part => {
            const trimmed = part.trim().toUpperCase();
            if (!trimmed) return;
            // スペース区切りの場合も分解
            const tokens = trimmed.split(/\s+/);
            tokens.forEach(tok => {
              const cleanTok = tok.replace(/^[(\[{<"']+|[)\]}>"':]+$/g, '').trim();
              if (cleanTok && cleanTok.length >= 3) {
                if (!itemSerials.includes(cleanTok)) itemSerials.push(cleanTok);
              }
            });
          });
        }

        // ③ item.note から抽出（台帳登録シリアルおよびN+数字等の形式を柔軟に検出）
        if (it.note && typeof it.note === 'string') {
          // N+数字の検出
          const nMatches = it.note.match(/N\s*\d+/gi);
          if (nMatches) {
            nMatches.forEach(m => {
              const norm = m.replace(/\s+/g, '').toUpperCase();
              if (norm && !itemSerials.includes(norm)) itemSerials.push(norm);
            });
          }
          // 台帳マップに存在するシリアル番号が備考欄に含まれているか直接照合
          serialMap.forEach((_, mapSn) => {
            if (mapSn && it.note.toUpperCase().includes(mapSn)) {
              if (!itemSerials.includes(mapSn)) itemSerials.push(mapSn);
            }
          });
        }

        const itemEndUser = (it.endUserName || docEndUser).trim();

        itemSerials.forEach(sn => {
          // 【包括的保護防壁（全社・全シリアル共通）】
          // ① 社内デモ機 (N8460)
          // ② デモ機ステータス (demo)
          // ③ 保守・貸出中 (maintenance)
          // ④ 初期不良・廃棄 (defective)
          // ⑤ 備考に「デモ機」と記載のある社内管理機
          // これらは、過去伝票の自動走査によって勝手に出荷済（shipped）に書き戻されることを完全遮断！
          const target = serialMap.get(sn);
          if (target) {
            // 社内デモ機配備伝票（DEL-20250115-01, DEL-20250729-01等）の場合：status は demo を維持したまま伝票番号・出荷日を確実に紐付け
            const isDemoDoc = docNo.includes('DEL-20250115') || docNo.includes('DEL-20250729') || clientName.includes('社内デモ') || (doc.title && doc.title.includes('社内デモ'));
            if (target.status === 'demo' && isDemoDoc) {
              let changed = false;
              if (!target.docNumber || target.docNumber !== docNo) {
                target.docNumber = docNo;
                target.invoiceNumber = docNo;
                target.docId = doc.id;
                target.invoiceId = doc.id;
                changed = true;
              }
              if (!target.clientName || target.clientName !== clientName) {
                target.clientName = clientName;
                target.customerName = clientName;
                changed = true;
              }
              if (docDate && (!target.shipDate || target.shipDate !== docDate)) {
                target.shipDate = docDate;
                target.shippedDate = docDate;
                changed = true;
              }
              if (itemEndUser && (!target.endUserName || target.endUserName !== itemEndUser)) {
                target.endUserName = itemEndUser;
                changed = true;
              }
              if (changed) {
                modified = true;
                updatedSerials.push(target);
              }
              return;
            }

            // 本田塗料店(DEL-20261105-235)に割り当てられたN10935はメンテナンスから正常出荷へ移行
            if (sn === 'N10935' && docNo.includes('DEL-20261105-235')) {
              target.status = 'shipped';
            } else if (['demo', 'maintenance', 'defective'].includes(target.status) || (target.note && target.note.includes('デモ機'))) {
              return;
            }
            let changed = false;
            if (target.status !== 'shipped') {
              target.status = 'shipped';
              changed = true;
            }
            if (!target.docNumber || target.docNumber !== docNo) {
              target.docNumber = docNo;
              target.invoiceNumber = docNo;
              target.docId = doc.id;
              target.invoiceId = doc.id;
              changed = true;
            }
            if (!target.clientName || (clientName && target.clientName !== clientName)) {
              target.clientName = clientName;
              target.customerName = clientName;
              changed = true;
            }
            if (itemEndUser && (!target.endUserName || target.endUserName !== itemEndUser)) {
              target.endUserName = itemEndUser;
              changed = true;
            }
            if (docDate && (!target.shipDate || target.shipDate !== docDate)) {
              target.shipDate = docDate;
              target.shippedDate = docDate;
              changed = true;
            }

            // ベーシックセット伝票で本体が出荷された場合、自動的に isBundled: true を付与
            const itNorm = getMasterKey(it.name || '');
            const itIsBundle = it.itemId === 'inv_1' || itNorm.includes('ベーシックセット') || itNorm.includes('ket.ic.2b') || itNorm.includes('エレクトロパワー');
            const targetSnNorm = String(target.serialNumber || sn).trim().toUpperCase();
            const isBodySn = (targetSnNorm.startsWith('N84') || targetSnNorm.startsWith('N10') || targetSnNorm.startsWith('N11')) && targetSnNorm.length <= 6;
            if (itIsBundle && isBodySn && !target.isBundled) {
              target.isBundled = true;
              changed = true;
            }
            if (target.isBundled) {
              // 1. 組込バッテリーの連動出荷
              if (Array.isArray(target.batterySerials)) {
                target.batterySerials.forEach(batSn => {
                  const bat = serialMap.get(String(batSn).trim().toUpperCase());
                  if (bat) {
                    if (bat.status !== 'shipped' || bat.docNumber !== docNo) {
                      bat.status = 'shipped';
                      bat.clientName = clientName;
                      bat.customerName = clientName;
                      bat.endUserName = itemEndUser;
                      bat.docNumber = docNo;
                      bat.docId = doc.id;
                      bat.shipDate = docDate;
                      bat.shippedDate = docDate;
                      bat.updatedAt = new Date().toISOString();
                      changed = true;
                    }
                  }
                });
              }

              // 2. 付属急速充電器の連動出荷
              if (target.chargerSerial) {
                const chg = serialMap.get(String(target.chargerSerial).trim().toUpperCase());
                if (chg) {
                  if (chg.status !== 'shipped' || chg.docNumber !== docNo) {
                    chg.status = 'shipped';
                    chg.clientName = clientName;
                    chg.customerName = clientName;
                    chg.endUserName = itemEndUser;
                    chg.docNumber = docNo;
                    chg.docId = doc.id;
                    chg.shipDate = docDate;
                    chg.shippedDate = docDate;
                    chg.updatedAt = new Date().toISOString();
                    changed = true;
                  }
                }
              }

              // 3. bundledWith で逆引きされる全構成品（バッテリー・充電器）の連動出荷
              list.forEach(c => {
                if (c && c.bundledWith && String(c.bundledWith).trim().toUpperCase() === targetSnNorm) {
                  if (c.status !== 'shipped' || c.docNumber !== docNo) {
                    c.status = 'shipped';
                    c.clientName = clientName;
                    c.customerName = clientName;
                    c.endUserName = itemEndUser;
                    c.docNumber = docNo;
                    c.docId = doc.id;
                    c.shipDate = docDate;
                    c.shippedDate = docDate;
                    c.updatedAt = new Date().toISOString();
                    changed = true;
                  }
                }
              });
            }

            if (changed) {
              target.updatedAt = new Date().toISOString();
              modified = true;
              updatedSerials.push({
                serialNumber: sn,
                docNumber: docNo,
                clientName: clientName,
                itemName: target.itemName || it.name || ''
              });
            }
          }
        });
      });
    });

    // 2. 【逆方向の整合性保証】伝票削除・確定取消・見積書連動解除の自動検知
    // シリアル台帳上で伝票番号（docNumber / invoiceNumber）が記録されているが、
    // その伝票が「有効な確定伝票」に存在しない場合（伝票が削除された、見積書だった、確定取消された場合）、
    // 自動的に台帳上で「在庫中（in_stock）」へ復元し、伝票紐付けをクリアする！
    const validDocNumbers = new Set();
    const validDocIds = new Set();
    docs.forEach(doc => {
      if (!doc || doc.isCancelled === true || doc.isCancelled === 'true' || doc.docType === 'estimate') return;
      if (doc.status === 'superseded' || doc.isSuperseded === true) return;
      if (doc.docNumber) validDocNumbers.add(String(doc.docNumber).trim());
      if (doc.id) validDocIds.add(String(doc.id).trim());
    });

    list.forEach(s => {
      if (!s) return;
      const sDocNo = String(s.docNumber || s.invoiceNumber || '').trim();
      const sDocId = String(s.docId || s.invoiceId || '').trim();

      // 出荷済（shipped）で、伝票番号またはIDが記録されているもの
      if (s.status === 'shipped' && (sDocNo || sDocId)) {
        // 見積書（EST-）、または有効な確定伝票に存在しない伝票番号/IDの場合
        const isEstimate = sDocNo.startsWith('EST-') || (s.note && s.note.includes('EST-'));
        const isValid = (sDocNo && validDocNumbers.has(sDocNo)) || (sDocId && validDocIds.has(sDocId));

        if (isEstimate || !isValid) {
          console.log(`【シリアル整合復帰】存在しない/削除/取消伝票(${sDocNo})に紐付いていたシリアル ${s.serialNumber} を在庫中に自動復帰`);
          s.status = s.isBundled ? 'bundled' : 'in_stock';
          s.clientName = '';
          s.customerName = '';
          s.endUserName = '';
          s.shipDate = '';
          s.shippedDate = '';
          s.docNumber = '';
          s.docId = '';
          s.invoiceNumber = '';
          s.invoiceId = '';
          s.updatedAt = new Date().toISOString();
          modified = true;
          updatedSerials.push({
            serialNumber: s.serialNumber,
            docNumber: '(削除/取消伝票解除)',
            clientName: '',
            itemName: s.itemName || ''
          });

          // セット品化された本体の場合、組込バッテリーおよび急速充電器も連動して在庫中に復帰
          if (s.isBundled) {
            const sSnNorm = String(s.serialNumber).trim().toUpperCase();
            if (Array.isArray(s.batterySerials)) {
              s.batterySerials.forEach(bSn => {
                const bat = serialMap.get(String(bSn).trim().toUpperCase());
                if (bat) {
                  bat.status = 'bundled';
                  bat.clientName = '';
                  bat.customerName = '';
                  bat.endUserName = '';
                  bat.shipDate = '';
                  bat.shippedDate = '';
                  bat.docNumber = '';
                  bat.docId = '';
                  bat.invoiceNumber = '';
                  bat.invoiceId = '';
                  bat.updatedAt = new Date().toISOString();
                }
              });
            }
            if (s.chargerSerial) {
              const chg = serialMap.get(String(s.chargerSerial).trim().toUpperCase());
              if (chg) {
                chg.status = 'bundled';
                chg.clientName = '';
                chg.customerName = '';
                chg.endUserName = '';
                chg.shipDate = '';
                chg.shippedDate = '';
                chg.docNumber = '';
                chg.docId = '';
                chg.invoiceNumber = '';
                chg.invoiceId = '';
                chg.updatedAt = new Date().toISOString();
              }
            }
            list.forEach(c => {
              if (c && c.bundledWith && String(c.bundledWith).trim().toUpperCase() === sSnNorm) {
                c.status = 'bundled';
                c.clientName = '';
                c.customerName = '';
                c.endUserName = '';
                c.shipDate = '';
                c.shippedDate = '';
                c.docNumber = '';
                c.docId = '';
                c.invoiceNumber = '';
                c.invoiceId = '';
                c.updatedAt = new Date().toISOString();
              }
            });
          }
        }
      }
    });

    // 3. 【社内デモ機(N8460)の絶対保護サニタイズ】
    // 過去のキャッシュや古い同期データで N8460 が出荷済み・本田塗料店に誤認されていても確実に「デモ機」に隔離
    const n8460 = serialMap.get('N8460');
    if (n8460) {
      if (n8460.status !== 'demo' || n8460.docNumber || n8460.clientName) {
        n8460.status = 'demo';
        n8460.clientName = '';
        n8460.customerName = '';
        n8460.endUserName = '';
        n8460.shipDate = '';
        n8460.shippedDate = '';
        n8460.docNumber = '';
        n8460.invoiceNumber = '';
        n8460.docId = '';
        n8460.invoiceId = '';
        n8460.note = 'デモ機';
        n8460.updatedAt = new Date().toISOString();
        modified = true;
      }
    }

    if (modified) {
      localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(list));
      saveServerInventorySerials(list).catch(() => { });
      console.log(`【シリアル伝票出荷引落】全 ${updatedSerials.length} 件のシリアルを発行伝票から出荷済みに引き落としました:`, updatedSerials);
      // 在庫マスタ連動
      syncInventoryStockFromSerials();
    }

    return { updatedCount: updatedSerials.length, updatedSerials, validDocCount };
  } catch (err) {
    console.error('syncInventorySerialsFromIssuedDocs エラー:', err);
    return { updatedCount: 0, updatedSerials: [], validDocCount: 0 };
  }
}

export function saveBatchInventorySerials(serialsArray = []) {
  try {
    if (!Array.isArray(serialsArray) || serialsArray.length === 0) return 0;
    const list = getInventorySerialList();
    const snMap = new Map();
    list.forEach(s => {
      if (s && s.serialNumber) {
        snMap.set(String(s.serialNumber).trim().toUpperCase(), s);
      }
    });

    let addedCount = 0;
    serialsArray.forEach(item => {
      if (!item || !item.serialNumber) return;
      const sn = String(item.serialNumber).trim().toUpperCase();

      // 再登録時は削除フラグ解除
      removeDeletedSerial(sn);

      const existing = snMap.get(sn);
      const isShipped = existing && (existing.status === 'shipped' || existing.clientName || existing.docNumber);
      const entryId = (existing && existing.id) || item.id || `sn_${sn.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      // 既存の先行出荷データ（顧客名・出荷日・伝票番号など）を絶対に消去せず、ロット情報を安全に後付けマージ
      const newObj = {
        ...(existing || {}),
        ...item,
        id: entryId,
        serialNumber: sn,
        status: isShipped ? 'shipped' : (item.status || (existing && existing.status) || 'in_stock'),
        clientName: (existing && existing.clientName) || item.clientName || '',
        endUserName: (existing && existing.endUserName) || item.endUserName || '',
        shipDate: (existing && (existing.shipDate || existing.shippedDate)) || item.shipDate || item.shippedDate || '',
        docNumber: (existing && (existing.docNumber || existing.invoiceNumber)) || item.docNumber || item.invoiceNumber || '',
        docId: (existing && (existing.docId || existing.invoiceId)) || item.docId || item.invoiceId || '',
        lotId: item.lotId || (existing && existing.lotId) || '',
        lotNumber: item.lotNumber || (existing && existing.lotNumber) || '',
        costPrice: (item.costPrice !== undefined) ? item.costPrice : (existing && (existing.costPrice !== undefined ? existing.costPrice : existing.unitCost)) || 0,
        unitCost: (item.unitCost !== undefined) ? item.unitCost : (item.costPrice !== undefined ? item.costPrice : (existing && (existing.unitCost !== undefined ? existing.unitCost : existing.costPrice)) || 0),
        arrivalDate: item.arrivalDate || item.inDate || (existing && (existing.arrivalDate || existing.inDate)) || '',
        inDate: item.inDate || item.arrivalDate || (existing && (existing.inDate || existing.arrivalDate)) || '',
        isBundled: (item.isBundled !== undefined) ? item.isBundled : (existing && existing.isBundled),
        batterySerials: item.batterySerials || (existing && existing.batterySerials),
        bundledWith: item.bundledWith || (existing && existing.bundledWith),
        note: [existing && existing.note, item.note].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' ') || '',
        updatedAt: new Date().toISOString()
      };
      snMap.set(sn, newObj);
      addedCount++;
    });

    const updatedList = Array.from(snMap.values());
    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(updatedList));
    saveServerInventorySerials(updatedList).catch(() => { });

    // 在庫マスタ連動
    syncInventoryStockFromSerials();
    return addedCount;
  } catch (e) {
    console.error('Failed to batch save inventory serials:', e);
    return 0;
  }
}


export function getAvailableSerialsByItem(inventoryIdOrName, options = {}) {
  const list = getInventorySerialList();
  const targetKey = String(inventoryIdOrName || '').trim();
  const targetUpper = targetKey.toUpperCase();

  const isTargetDp5000Body = targetKey === 'inv_dp5000_body' ||
    (targetUpper.includes('DP-5000') && !targetUpper.includes('MS') && !targetUpper.includes('ベーシックセット') && !targetUpper.includes('バッテリー') && !targetUpper.includes('充電器'));
  const isTargetChg = targetKey === 'inv_dp5000_chg' || targetUpper.includes('充電器') || targetUpper.includes('CHG');

  // バッテリー判定の細分化（DP-BT-CS, DP-BT-SK, 汎用バッテリー）
  const isTargetBtCs = targetKey === 'inv_prod_1794209910003_eqxd' || targetKey === 'prod_1794209910003_eqxd' || targetUpper.includes('DP-BT-CS') || targetUpper.includes('BT-CS');
  const isTargetBtSk = targetKey === 'inv_prod_1794209994433_ij47' || targetKey === 'prod_1794209994433_ij47' || targetUpper.includes('DP-BT-SK') || targetUpper.includes('BT-SK');
  const isTargetBat = !isTargetChg && (isTargetBtCs || isTargetBtSk || targetKey === 'inv_dp5000_bat' || targetUpper.includes('バッテリー') || targetUpper.includes('BAT'));

  const isTargetMs = targetKey === 'inv_2' || targetUpper.includes('DP-MS') || targetUpper.includes('スプレッダー');

  return list.filter(s => {
    if (!s) return false;
    if (s.status !== 'in_stock') return false;

    const sId = String(s.itemId || s.inventoryId || '').trim();
    const sName = String(s.itemName || '').trim();
    const sNameUpper = sName.toUpperCase();
    const snUpper = String(s.serialNumber || '').trim().toUpperCase();

    const isThisChg = (sId === 'inv_dp5000_chg' || s.itemType === 'charger' || sNameUpper.includes('充電器') || (s.targetSku && s.targetSku.includes('CHG')));
    const isThisBtCs = !isThisChg && (sId === 'inv_prod_1794209910003_eqxd' || s.productId === 'prod_1794209910003_eqxd' || s.sku === 'DP-BT-CS' || sNameUpper.includes('DP-BT-CS') || sNameUpper.includes('BT-CS') || snUpper.startsWith('BAT-') || snUpper.startsWith('N485'));
    const isThisBtSk = !isThisChg && (sId === 'inv_prod_1794209994433_ij47' || s.productId === 'prod_1794209994433_ij47' || s.sku === 'DP-BT-SK' || sNameUpper.includes('DP-BT-SK') || sNameUpper.includes('BT-SK') || snUpper.startsWith('0031077'));
    const isThisBat = isThisBtCs || isThisBtSk || (sId === 'inv_dp5000_bat' || s.itemType === 'battery' || sNameUpper.includes('バッテリー') || s.isCompanyOnly);
    const isThisMs = !isThisChg && !isThisBat && (sId === 'inv_2' || sNameUpper.includes('DP-MS') || sNameUpper.includes('スプレッダー'));
    const isThisDp5kBody = !isThisChg && !isThisBat && !isThisMs && (sId === 'inv_dp5000_body' || sNameUpper.includes('DP-5000') || /^N\s*\d{4,12}$/i.test(snUpper));

    // 1. DP-5000 本体の引当
    if (isTargetDp5000Body) {
      if (!isThisDp5kBody) return false;
      // 新規キッティング専用（onlyUnbundled: true）の時のみ未セット品に絞る。
      // 納品書・請求書からの引当では、保守から戻した本体やセット品化済本体も含めすべて選択可能！
      if (options.onlyUnbundled && s.isBundled) return false;
      return true;
    }

    // 2. 急速充電器の引当
    if (isTargetChg) {
      if (!isThisChg) return false;
      // 他の本体に組込中のものは除外（在庫中未組込のもののみ）
      if (s.status === 'bundled' || s.bundledWith) return false;
      return true;
    }

    // 3. バッテリーの引当（個別の型番指定がある場合は優先絞り込み）
    if (isTargetBtCs) {
      if (!isThisBtCs) return false;
      if (s.status === 'bundled' || s.bundledWith) return false;
      return true;
    }
    if (isTargetBtSk) {
      if (!isThisBtSk) return false;
      if (s.status === 'bundled' || s.bundledWith) return false;
      return true;
    }
    if (isTargetBat) {
      if (!isThisBat) return false;
      if (s.status === 'bundled' || s.bundledWith) return false;
      return true;
    }

    // 4. スプレッダーの引当
    if (isTargetMs) {
      return isThisMs;
    }

    // 5. 完全一致またはフォールバック
    if (sId === targetKey || sName === targetKey) {
      return true;
    }

    return false;
  });
}

/**
 * DP-5000セット品化に必要な各コンポーネント（本体、バッテリー、充電器）の利用可能状況を取得
 */
export function getAvailableBundleComponents() {
  const serials = getInventorySerialList();
  const invList = getInventoryList();

  // 1. 未セット化のDP-5000本体（在庫中および出荷済みの両方を含む）
  const availableBodies = serials.filter(s => {
    if (!s) return false;
    if (s.isBundled) return false;
    // 在庫中または出荷済みで未セット化のもの
    if (s.status !== 'in_stock' && s.status !== 'shipped') return false;
    const itemName = String(s.itemName || '').toUpperCase();
    return s.inventoryId === 'inv_dp5000_body' || s.itemId === 'inv_dp5000_body' || (itemName.includes('DP-5000') && !itemName.includes('MS') && !itemName.includes('バッテリー') && !itemName.includes('充電器')) || /^N\s*\d{4,12}$/i.test(s.serialNumber || '');
  });

  // 2. 在庫中かつ未セット化のリチウムイオンバッテリー
  const availableBatteries = serials.filter(s => {
    if (!s || s.status !== 'in_stock') return false;
    if (s.status === 'bundled' || s.bundledWith) return false;
    const itemName = String(s.itemName || '').toUpperCase();
    return s.inventoryId === 'inv_dp5000_bat' || s.itemId === 'inv_dp5000_bat' || s.itemType === 'battery' || itemName.includes('バッテリー');
  });

  // 3. 在庫中かつ未組込の専用急速充電器
  const availableChargers = serials.filter(s => {
    if (!s || s.status !== 'in_stock') return false;
    if (s.status === 'bundled' || s.bundledWith) return false;
    const itemName = String(s.itemName || '').toUpperCase();
    return s.inventoryId === 'inv_dp5000_chg' || s.itemId === 'inv_dp5000_chg' || s.itemType === 'charger' || itemName.includes('充電器');
  });

  // 急速充電器の在庫マスタ
  const chgItem = invList.find(it => it.id === 'inv_dp5000_chg' || (it.name && it.name.includes('急速充電器')));
  const chargerStock = Math.max(availableChargers.length, chgItem ? Number(chgItem.currentStock || 0) : 0);

  return {
    bodies: availableBodies,
    batteries: availableBatteries,
    chargers: availableChargers,
    chargerStock,
    chargerItem: chgItem || null,
    possibleSetCount: Math.min(availableBodies.length, Math.floor(availableBatteries.length / 2), Math.max(availableChargers.length, chargerStock))
  };
}

/**
 * DP-5000本体とバッテリー2個・急速充電器1個をセット品化（キッティング）
 * @param {string} bodySerialNumber - DP-5000本体のシリアル番号（例: "N8460"）
 * @param {string[]} batterySerialNumbers - 選択されたリチウムイオンバッテリーのシリアル番号（2個）
 * @param {string} chargerSerialNumber - 選択された専用急速充電器のシリアル番号（1個）
 * @param {Object} [options] - オプション
 * @returns {{ success: boolean, message?: string }}
 */
export function assembleDP5000Bundle(bodySerialNumber, batterySerialNumbers, chargerSerialNumber = '', options = {}) {
  try {
    if (!bodySerialNumber) {
      return { success: false, message: 'DP-5000本体のシリアル番号が指定されていません。' };
    }
    if (!Array.isArray(batterySerialNumbers) || batterySerialNumbers.length !== 2) {
      return { success: false, message: 'リチウムイオンバッテリーは正確に2個選択してください。' };
    }
    if (String(batterySerialNumbers[0]).trim().toUpperCase() === String(batterySerialNumbers[1]).trim().toUpperCase()) {
      return { success: false, message: '異なる2個のバッテリーシリアルを選択してください。' };
    }

    const cleanBodySn = String(bodySerialNumber).trim().toUpperCase();
    const cleanBatSns = batterySerialNumbers.map(s => String(s).trim().toUpperCase());
    const cleanChgSn = chargerSerialNumber ? String(chargerSerialNumber).trim().toUpperCase() : '';

    // 1. シリアルリストの取得と検証
    const serialList = getInventorySerialList();
    const bodySerial = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanBodySn);
    if (!bodySerial) {
      return { success: false, message: `指定されたDP-5000本体(S/N: ${cleanBodySn})が見つかりません。` };
    }
    // 在庫中または出荷済みの未セット化本体をセット品化可能とする
    if (bodySerial.status !== 'in_stock' && bodySerial.status !== 'shipped') {
      return { success: false, message: `DP-5000本体(S/N: ${cleanBodySn})はセット品化可能な状態ではありません。(状態: ${bodySerial.status})` };
    }
    if (bodySerial.isBundled) {
      return { success: false, message: `DP-5000本体(S/N: ${cleanBodySn})は既にセット品化されています。` };
    }

    // バッテリーの検証
    for (const batSn of cleanBatSns) {
      const bat = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === batSn);
      if (!bat) {
        return { success: false, message: `バッテリー(S/N: ${batSn})が見つかりません。` };
      }
      if (bat.status !== 'in_stock') {
        return { success: false, message: `バッテリー(S/N: ${batSn})は在庫中ではありません。(状態: ${bat.status})` };
      }
    }

    // 急速充電器の検証（シリアル指定がある場合）
    let chgSerial = null;
    if (cleanChgSn) {
      chgSerial = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanChgSn);
      if (!chgSerial) {
        return { success: false, message: `専用急速充電器(S/N: ${cleanChgSn})が見つかりません。` };
      }
      if (chgSerial.status !== 'in_stock') {
        return { success: false, message: `専用急速充電器(S/N: ${cleanChgSn})は在庫中ではありません。(状態: ${chgSerial.status})` };
      }
    }

    // 2. 在庫マスタから急速充電器の在庫数を確認・減算
    const invList = getInventoryList();
    const chgItem = invList.find(it => it.id === 'inv_dp5000_chg' || (it.name && it.name.includes('急速充電器')));
    if (!chgItem) {
      return { success: false, message: '在庫マスタに専用急速充電器が見つかりません。' };
    }
    if (Number(chgItem.currentStock || 0) < 1) {
      return { success: false, message: '専用急速充電器の在庫が不足しています。(現在庫: 0個)' };
    }

    // 急速充電器を 1 個減算（自動出庫！）
    chgItem.currentStock = Math.max(0, Number(chgItem.currentStock || 0) - 1);
    if (!Array.isArray(chgItem.history)) chgItem.history = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    chgItem.history.unshift({
      id: 'log_bundle_chg_' + Date.now(),
      date: todayStr,
      type: 'out',
      qty: 1,
      delta: -1,
      reason: `DP-5000(S/N: ${cleanBodySn})セット品化に伴う出庫${cleanChgSn ? ` (充電器S/N: ${cleanChgSn})` : ''}`,
      currentStock: chgItem.currentStock,
      timestamp: nowIso
    });

    // セット品（完成品: inv_1）の在庫を +1 加算、本体（inv_dp5000_body）を -1 減算、バッテリー（inv_dp5000_bat）を -2 減算
    const bundleItem = invList.find(it => it.id === 'inv_1' || (it.name && it.name.includes('ベーシックセット')));
    const bodyItem = invList.find(it => it.id === 'inv_dp5000_body' || (it.name && it.name.includes('本体') && it.type !== 'bundle'));
    const batItem = invList.find(it => it.id === 'inv_dp5000_bat' || (it.name && it.name.includes('バッテリー') && !it.name.includes('セット') && it.type !== 'bundle'));

    if (bundleItem) {
      bundleItem.currentStock = Number(bundleItem.currentStock || 0) + 1;
      if (!Array.isArray(bundleItem.history)) bundleItem.history = [];
      bundleItem.history.unshift({
        id: 'log_bundle_in_' + Date.now(),
        date: todayStr,
        type: 'in',
        qty: 1,
        delta: 1,
        reason: `セット品化組立完了: DP-5000 (S/N: ${cleanBodySn})`,
        currentStock: bundleItem.currentStock,
        timestamp: nowIso
      });
    }

    if (bodyItem) {
      bodyItem.currentStock = Math.max(0, Number(bodyItem.currentStock || 0) - 1);
      if (!Array.isArray(bodyItem.history)) bodyItem.history = [];
      bodyItem.history.unshift({
        id: 'log_bundle_out_body_' + Date.now(),
        date: todayStr,
        type: 'out',
        qty: 1,
        delta: -1,
        reason: `セット品化組込出庫: S/N ${cleanBodySn}`,
        currentStock: bodyItem.currentStock,
        timestamp: nowIso
      });
    }

    if (batItem) {
      batItem.currentStock = Math.max(0, Number(batItem.currentStock || 0) - 2);
      if (!Array.isArray(batItem.history)) batItem.history = [];
      batItem.history.unshift({
        id: 'log_bundle_out_bat_' + Date.now(),
        date: todayStr,
        type: 'out',
        qty: 2,
        delta: -2,
        reason: `セット品化組込出庫: S/N ${cleanBatSns.join(', ')}`,
        currentStock: batItem.currentStock,
        timestamp: nowIso
      });
    }

    const isBodyShipped = bodySerial.status === 'shipped';

    // 3. バッテリー2個のステータスを更新（本体が出荷済みなら自動で出荷連動！）
    cleanBatSns.forEach(batSn => {
      const bat = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === batSn);
      if (bat) {
        bat.status = isBodyShipped ? 'shipped' : 'bundled';
        bat.bundledWith = cleanBodySn;
        bat.bundledAt = nowIso;
        if (isBodyShipped) {
          bat.clientName = bodySerial.clientName || '';
          bat.customerName = bodySerial.clientName || '';
          bat.endUserName = bodySerial.endUserName || '';
          bat.shipDate = bodySerial.shipDate || bodySerial.shippedDate || '';
          bat.shippedDate = bodySerial.shippedDate || bodySerial.shipDate || '';
          bat.docNumber = bodySerial.docNumber || bodySerial.invoiceNumber || '';
          bat.invoiceNumber = bodySerial.invoiceNumber || bodySerial.docNumber || '';
          bat.docId = bodySerial.docId || bodySerial.invoiceId || '';
        }
        const baseNote = (bat.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').trim();
        bat.note = (baseNote ? baseNote + ' ' : '') + `[DP-5000(${cleanBodySn})セット組込]`;
        bat.updatedAt = nowIso;
      }
    });

    // 4. 急速充電器のステータスを更新
    if (chgSerial) {
      chgSerial.status = isBodyShipped ? 'shipped' : 'bundled';
      chgSerial.bundledWith = cleanBodySn;
      chgSerial.bundledAt = nowIso;
      if (isBodyShipped) {
        chgSerial.clientName = bodySerial.clientName || '';
        chgSerial.customerName = bodySerial.clientName || '';
        chgSerial.endUserName = bodySerial.endUserName || '';
        chgSerial.shipDate = bodySerial.shipDate || bodySerial.shippedDate || '';
        chgSerial.shippedDate = bodySerial.shippedDate || bodySerial.shipDate || '';
        chgSerial.docNumber = bodySerial.docNumber || bodySerial.invoiceNumber || '';
        chgSerial.invoiceNumber = bodySerial.invoiceNumber || bodySerial.docNumber || '';
        chgSerial.docId = bodySerial.docId || bodySerial.invoiceId || '';
      }
      const chgBaseNote = (chgSerial.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').trim();
      chgSerial.note = (chgBaseNote ? chgBaseNote + ' ' : '') + `[DP-5000(${cleanBodySn})セット組込]`;
      chgSerial.updatedAt = nowIso;
    }

    // 5. DP-5000本体をセット品化済みに更新
    bodySerial.isBundled = true;
    bodySerial.bundleName = 'DP-5000 ベーシックセット バッテリー２個';
    bodySerial.batterySerials = cleanBatSns;
    bodySerial.chargerSerial = cleanChgSn;
    bodySerial.chargerDeducted = true;
    bodySerial.bundledAt = nowIso;
    const bodyBaseNote = (bodySerial.note || '').replace(/\s*\[セット品化済:[^\]]+\]/g, '').replace(/\s*\[セット構成:[^\]]+\]/g, '').trim();
    bodySerial.note = (bodyBaseNote ? bodyBaseNote + ' ' : '') + `[セット構成: 🔋 ${cleanBatSns.join(', ')} / ⚡ 充電器 ${cleanChgSn || '付属'}]`;
    bodySerial.updatedAt = nowIso;

    // 6. 保存と全体同期
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(invList));
    saveServerInventory(invList).catch(() => { });

    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(serialList));
    saveServerInventorySerials(serialList).catch(() => { });

    // 在庫マスタとシリアルの数値を完全同期
    syncInventoryStockFromSerials();
    if (typeof syncInventoryStockFromIssuedDocs === 'function') {
      try { syncInventoryStockFromIssuedDocs(); } catch (_) { }
    }

    console.log(`【セット品化完了】本体: ${cleanBodySn}, バッテリー: ${cleanBatSns.join(', ')}, 充電器: ${cleanChgSn || '-1個'}`);
    return {
      success: true,
      bodySerialNumber: cleanBodySn,
      batterySerialNumbers: cleanBatSns,
      chargerSerialNumber: cleanChgSn,
      message: `DP-5000本体(S/N: ${cleanBodySn})をセット品化しました！バッテリー(${cleanBatSns.join(', ')}) 2個と急速充電器(${cleanChgSn || '1個'})を出庫・紐付けました。`
    };
  } catch (e) {
    console.error('Failed to assemble DP-5000 bundle:', e);
    return { success: false, message: e.message || 'セット品化処理中にエラーが発生しました。' };
  }
}

/**
 * 既存（セット済含む）の DP-5000 本体に対して、急速充電器シリアルおよびバッテリーシリアルを割り当て・変更する
 * @param {string} bodySerialNumber - DP-5000 本体のシリアル番号
 * @param {string[]} batterySerialNumbers - バッテリーシリアル（空なら既存維持）
 * @param {string} chargerSerialNumber - 割り当てる専用急速充電器のシリアル番号
 * @returns {{ success: boolean, message?: string }}
 */
export function assignBundleComponentsToBody(bodySerialNumber, batterySerialNumbers = [], chargerSerialNumber = '') {
  try {
    if (!bodySerialNumber) return { success: false, message: '本体シリアル番号が指定されていません。' };
    const cleanBodySn = String(bodySerialNumber).trim().toUpperCase();
    const cleanChgSn = chargerSerialNumber ? String(chargerSerialNumber).trim().toUpperCase() : '';
    const cleanBatSns = Array.isArray(batterySerialNumbers) ? batterySerialNumbers.map(s => String(s).trim().toUpperCase()).filter(Boolean) : [];

    const serialList = getInventorySerialList();
    const bodySerial = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanBodySn);
    if (!bodySerial) return { success: false, message: `DP-5000本体 (S/N: ${cleanBodySn}) が台帳に見つかりません。` };

    const nowIso = new Date().toISOString();
    const isBodyShipped = bodySerial.status === 'shipped';

    // 1. 旧充電器の紐付け解除（もし別の充電器が割り当てられていた場合）
    if (bodySerial.chargerSerial && bodySerial.chargerSerial !== cleanChgSn) {
      const oldChg = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === String(bodySerial.chargerSerial).trim().toUpperCase());
      if (oldChg && oldChg.bundledWith === cleanBodySn) {
        oldChg.bundledWith = '';
        oldChg.status = 'in_stock';
        oldChg.clientName = '';
        oldChg.customerName = '';
        oldChg.endUserName = '';
        oldChg.shipDate = '';
        oldChg.shippedDate = '';
        oldChg.docNumber = '';
        oldChg.invoiceNumber = '';
        oldChg.docId = '';
        oldChg.note = (oldChg.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').replace(/\s*\[セット組込済\s*\(本体:[^)]+\)\]/g, '').trim();
        oldChg.updatedAt = nowIso;
      }
    }

    // 1.5. 旧バッテリーの紐付け解除（新たに指定されたバッテリー以外で、以前この本体に紐付いていたバッテリー）
    if (cleanBatSns.length > 0) {
      const oldBatSns = Array.isArray(bodySerial.batterySerials) ? bodySerial.batterySerials.map(s => String(s).trim().toUpperCase()) : [];
      oldBatSns.forEach(oldSn => {
        if (!cleanBatSns.includes(oldSn)) {
          const oldBat = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === oldSn);
          if (oldBat && oldBat.bundledWith === cleanBodySn) {
            oldBat.bundledWith = '';
            oldBat.status = 'in_stock';
            oldBat.clientName = '';
            oldBat.customerName = '';
            oldBat.endUserName = '';
            oldBat.shipDate = '';
            oldBat.shippedDate = '';
            oldBat.docNumber = '';
            oldBat.invoiceNumber = '';
            oldBat.docId = '';
            oldBat.note = (oldBat.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').replace(/\s*\[セット組込済\s*\(本体:[^)]+\)\]/g, '').trim();
            oldBat.updatedAt = nowIso;
          }
        }
      });
    }

    // 2. 新充電器シリアルの紐付け
    if (cleanChgSn) {
      let chgObj = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanChgSn);
      if (!chgObj) {
        // もし台帳に未登録なら自動登録
        chgObj = {
          id: 'sn_' + cleanChgSn,
          serialNumber: cleanChgSn,
          itemId: 'inv_dp5000_chg',
          itemName: 'PSE認証 専用急速充電器',
          itemType: 'charger',
          status: 'in_stock',
          unitCost: 7700,
          costPrice: 7700,
          createdAt: nowIso
        };
        serialList.push(chgObj);
      }

      chgObj.bundledWith = cleanBodySn;
      chgObj.status = isBodyShipped ? 'shipped' : 'bundled';
      if (isBodyShipped) {
        chgObj.clientName = bodySerial.clientName || '';
        chgObj.customerName = bodySerial.clientName || '';
        chgObj.endUserName = bodySerial.endUserName || '';
        chgObj.shipDate = bodySerial.shipDate || bodySerial.shippedDate || '';
        chgObj.shippedDate = bodySerial.shippedDate || bodySerial.shipDate || '';
        chgObj.docNumber = bodySerial.docNumber || bodySerial.invoiceNumber || '';
        chgObj.invoiceNumber = bodySerial.invoiceNumber || bodySerial.docNumber || '';
        chgObj.docId = bodySerial.docId || bodySerial.invoiceId || '';
      } else {
        chgObj.clientName = '';
        chgObj.customerName = '';
        chgObj.endUserName = '';
        chgObj.shipDate = '';
        chgObj.shippedDate = '';
        chgObj.docNumber = '';
        chgObj.invoiceNumber = '';
        chgObj.docId = '';
      }
      const baseNote = (chgObj.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').trim();
      chgObj.note = (baseNote ? baseNote + ' ' : '') + `[DP-5000(${cleanBodySn})セット組込]`;
      chgObj.updatedAt = nowIso;

      bodySerial.chargerSerial = cleanChgSn;
    }

    // 3. バッテリーシリアルの更新（指定があれば）
    if (cleanBatSns.length > 0) {
      bodySerial.batterySerials = cleanBatSns;
      cleanBatSns.forEach(bSn => {
        const bat = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === bSn);
        if (bat) {
          bat.bundledWith = cleanBodySn;
          bat.status = isBodyShipped ? 'shipped' : 'bundled';
          if (isBodyShipped) {
            bat.clientName = bodySerial.clientName || '';
            bat.customerName = bodySerial.clientName || '';
            bat.endUserName = bodySerial.endUserName || '';
            bat.shipDate = bodySerial.shipDate || bodySerial.shippedDate || '';
            bat.shippedDate = bodySerial.shippedDate || bodySerial.shipDate || '';
            bat.docNumber = bodySerial.docNumber || bodySerial.invoiceNumber || '';
            bat.invoiceNumber = bodySerial.invoiceNumber || bodySerial.docNumber || '';
            bat.docId = bodySerial.docId || bodySerial.invoiceId || '';
          } else {
            bat.clientName = '';
            bat.customerName = '';
            bat.endUserName = '';
            bat.shipDate = '';
            bat.shippedDate = '';
            bat.docNumber = '';
            bat.invoiceNumber = '';
            bat.docId = '';
          }
          const baseBatNote = (bat.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').replace(/\s*\[セット組込済\s*\(本体:[^)]+\)\]/g, '').trim();
          bat.note = (baseBatNote ? baseBatNote + ' ' : '') + `[セット組込済 (本体: ${cleanBodySn})]`;
          bat.updatedAt = nowIso;
        }
      });
    }

    bodySerial.isBundled = true;
    bodySerial.bundleName = 'DP-5000 ベーシックセット バッテリー２個';
    bodySerial.updatedAt = nowIso;

    // 備考欄の更新
    const batText = (bodySerial.batterySerials || []).join(', ') || '未割当';
    const chgText = bodySerial.chargerSerial || '未割当';
    const baseBodyNote = (bodySerial.note || '').replace(/\s*\[セット品化済:[^\]]+\]/g, '').replace(/\s*\[セット構成:[^\]]+\]/g, '').trim();
    bodySerial.note = (baseBodyNote ? baseBodyNote + ' ' : '') + `[セット構成: 🔋 ${batText} / ⚡ 充電器 ${chgText}]`;

    // 保存と同期
    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(serialList));
    saveServerInventorySerials(serialList).catch(() => { });
    syncInventoryStockFromSerials();

    console.log(`【セット構成更新】本体: ${cleanBodySn}, 充電器: ${cleanChgSn}, バッテリー: ${batText}`);
    return {
      success: true,
      message: `DP-5000本体 (S/N: ${cleanBodySn}) に急速充電器シリアル「${cleanChgSn || '未指定'}」を割り当てました！`
    };
  } catch (err) {
    console.error('Failed to assign bundle components:', err);
    return { success: false, message: err.message || '構成割り当て中にエラーが発生しました。' };
  }
}

/**
 * DP-5000本体のセット品化を解除（バラし・在庫戻し）
 * @param {string} bodySerialNumber - DP-5000本体のシリアル番号
 * @returns {{ success: boolean, message?: string }}
 */
export function disassembleDP5000Bundle(bodySerialNumber) {
  try {
    if (!bodySerialNumber) return { success: false, message: 'シリアル番号が指定されていません。' };
    const cleanBodySn = String(bodySerialNumber).trim().toUpperCase();
    const serialList = getInventorySerialList();
    const bodySerial = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === cleanBodySn);
    if (!bodySerial || !bodySerial.isBundled) {
      return { success: false, message: `指定された本体(S/N: ${cleanBodySn})はセット品化されていません。` };
    }

    // 【安全ガード】既に出荷済みの本体セットは、過去の伝票や納品履歴の整合性を保つため解除不可
    if (bodySerial.status === 'shipped') {
      return { success: false, message: `DP-5000(S/N: ${cleanBodySn})は既に出荷済み（納品書に紐付け）のため、セット品化を解除できません。` };
    }

    const batSns = Array.isArray(bodySerial.batterySerials) ? bodySerial.batterySerials : [];
    const nowIso = new Date().toISOString();

    // 1. バッテリーを在庫中(in_stock)に戻す
    batSns.forEach(batSn => {
      const bat = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === String(batSn).trim().toUpperCase());
      if (bat) {
        bat.status = 'in_stock';
        bat.bundledWith = '';
        bat.bundledAt = null;
        bat.note = (bat.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').replace(/\s*\[セット組込済\s*\(本体:[^)]+\)\]/g, '').trim();
        bat.updatedAt = nowIso;
      }
    });

    // 2. 急速充電器の紐付け解除と在庫戻し
    if (bodySerial.chargerSerial) {
      const chgObj = serialList.find(s => s && String(s.serialNumber).trim().toUpperCase() === String(bodySerial.chargerSerial).trim().toUpperCase());
      if (chgObj && chgObj.bundledWith === cleanBodySn) {
        chgObj.bundledWith = '';
        chgObj.status = 'in_stock';
        chgObj.note = (chgObj.note || '').replace(/\s*\[DP-5000\([^)]+\)セット組込\]/g, '').trim();
        chgObj.updatedAt = nowIso;
      }
    }

    // 3. 本体のセット品化フラグを解除し、「DP-5000 本体」に戻す
    bodySerial.isBundled = false;
    bodySerial.bundleName = '';
    bodySerial.itemId = 'inv_dp5000_body';
    bodySerial.inventoryId = 'inv_dp5000_body';
    bodySerial.itemName = 'DP-5000 本体';
    bodySerial.batterySerials = [];
    bodySerial.chargerSerial = '';
    bodySerial.chargerDeducted = false;
    bodySerial.bundledAt = null;
    bodySerial.note = (bodySerial.note || '').replace(/\s*\[セット品化済:[^\]]+\]/g, '').replace(/\s*\[セット構成:[^\]]+\]/g, '').trim();
    bodySerial.updatedAt = nowIso;

    // 4. 保存と全体同期
    const invList = getInventoryList();
    localStorageSetItemAndSync(KEYS.INVENTORY, JSON.stringify(invList));
    saveServerInventory(invList).catch(() => { });

    localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(serialList));
    saveServerInventorySerials(serialList).catch(() => { });

    // 在庫マスタ数値をシリアル台帳・時系列集計から完全同期
    syncInventoryStockFromSerials();
    if (typeof syncInventoryStockFromIssuedDocs === 'function') {
      try { syncInventoryStockFromIssuedDocs(); } catch (_) { }
    }

    return {
      success: true,
      message: `DP-5000(S/N: ${cleanBodySn})のセット品化を解除しました。本体1台、バッテリー${batSns.length}個、急速充電器1台を通常在庫に戻しました。`
    };
  } catch (e) {
    console.error('Failed to disassemble DP-5000 bundle:', e);
    return { success: false, message: e.message || 'セット品化解除中にエラーが発生しました。' };
  }
}

export async function fetchServerInventorySerials() {
  try {
    const res = await apiFetch('inventory-serials', { cache: 'no-store' });
    if (res && res.ok) {
      const text = await res.text();
      if (!text || !text.trim()) return null;
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          return data;
        }
      } catch (parseErr) {
        console.warn('サーバーからのシリアル台帳JSONパース失敗:', parseErr);
        return null;
      }
    }
  } catch (e) {
    console.warn('サーバーからのシリアル台帳取得失敗:', e);
  }
  return null;
}

export async function syncInventorySerialsWithServer() {
  try {
    const serverSerials = await fetchServerInventorySerials();
    const localSerials = getInventorySerialList();

    if (serverSerials && Array.isArray(serverSerials)) {
      const deletedSerials = getDeletedSerialNumbers();
      const serialMap = new Map();

      serverSerials.forEach(s => {
        if (!s || !s.serialNumber) return;
        const sn = String(s.serialNumber).trim().toUpperCase();
        if (deletedSerials.has(sn)) return;
        serialMap.set(sn, s);
      });

      let hasLocalOnly = false;
      localSerials.forEach(s => {
        if (!s || !s.serialNumber) return;
        const sn = String(s.serialNumber).trim().toUpperCase();
        if (deletedSerials.has(sn)) return;
        if (!serialMap.has(sn)) {
          serialMap.set(sn, s);
          hasLocalOnly = true;
        } else {
          const sItem = serialMap.get(sn);
          // サーバー側に確定伝票番号(docNumber)がある場合、ローカルの空文字・未設定による破損・巻き戻しを防止
          if (sItem && sItem.docNumber && !s.docNumber) {
            s.docNumber = sItem.docNumber;
            s.docId = sItem.docId || s.docId;
            s.shipDate = sItem.shipDate || s.shipDate;
            s.shippedDate = sItem.shippedDate || s.shippedDate;
            s.clientName = sItem.clientName || s.clientName;
            s.endUserName = sItem.endUserName || s.endUserName;
          }
          const lTime = new Date(s.updatedAt || s.createdAt || 0).getTime();
          const sTime = new Date(sItem.updatedAt || sItem.createdAt || 0).getTime();
          if (lTime > sTime) {
            serialMap.set(sn, s);
            hasLocalOnly = true;
          }
        }
      });

      const mergedSerials = Array.from(serialMap.values());
      localStorageSetItemAndSync(KEYS.INVENTORY_SERIALS, JSON.stringify(mergedSerials));
      if (hasLocalOnly) {
        saveServerInventorySerials(mergedSerials).catch(() => { });
      }
      console.log(`[シリアル同期完了] 全 ${mergedSerials.length} 件のシリアル台帳をサーバー・ローカルで完全同期しました`);
      return mergedSerials;
    }
  } catch (err) {
    console.warn('syncInventorySerialsWithServer error:', err);
  }
  return getInventorySerialList();
}

export async function saveServerInventorySerials(serials) {
  try {
    await apiFetch('inventory-serials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serials)
    });
  } catch (e) {
    console.warn('サーバーへのシリアル台帳保存失敗:', e);
  }
}

/**
 * 対象在庫品目の全履歴（手動入出庫・ロット入庫・確定伝票出荷）を統合・時系列推移で取得
 * @param {object} item - 在庫品目オブジェクト
 * @returns {Array} 時系列（最新降順）に並んだ完全入出庫履歴ログ一覧
 */
export function getInventoryHistoryWithShipments(item) {
  if (!item) return [];

  const norm = getMasterKey(normalizeMasterName(item.name || ''));
  const isBundle = item.id === 'inv_1' || item.type === 'bundle' || norm.includes('ベーシックセット');
  const isBatSK = item.id === 'inv_prod_1794209994433_ij47' || norm.includes('dp-bt-sk') || (norm.includes('バッテリー') && norm.includes('sk'));
  const isBatCS = item.id === 'inv_prod_1794209910003_eqxd' || norm.includes('dp-bt-cs') || (norm.includes('バッテリー') && norm.includes('cs'));
  const isBat = isBatSK || isBatCS || item.id === 'inv_dp5000_bat' || (norm.includes('バッテリー') && !isBundle);
  const isChg = item.id === 'inv_dp5000_chg' || norm.includes('急速充電器');
  const isBody = item.id === 'inv_dp5000_body' || (norm.includes('dp-5000') && !isBundle && !isBat && !isChg && !norm.includes('スプレッダー') && !norm.includes('アクセサリー') && !norm.includes('3点引き'));

  let groupKey = norm;
  if (isBundle) groupKey = 'grp_dp5000_bundle';
  else if (isBody) groupKey = 'grp_dp5000_body';
  else if (isBatSK) groupKey = 'grp_dp5000_bat_sk';
  else if (isBatCS) groupKey = 'grp_dp5000_bat_cs';
  else if (isBat) groupKey = 'grp_dp5000_bat';
  else if (isChg) groupKey = 'grp_dp5000_chg';
  else if (norm.includes('dp-ms') || norm.includes('スプレッダー')) groupKey = 'grp_dpms';
  else if (norm.includes('dp-eg') || norm.includes('3点引き')) groupKey = 'grp_dpeg';
  else if (norm.includes('dp-ac') || norm.includes('アクセサリー')) groupKey = 'grp_dpac';
  else if (norm.includes('hic-025') || norm.includes('クランプ')) groupKey = 'grp_hic';

  // 1. 基本履歴（手動出庫・ロット入庫・調整）
  const baseLogs = Array.isArray(item.history) ? [...item.history] : [];
  const combined = [];
  const existingDocNums = new Set();
  const seenLots = new Set();

  baseLogs.forEach(h => {
    if (!h) return;
    const r = String(h.reason || '');
    // 初期棚卸在庫登録や商品マスタ初期登録の架空ログは完全除外
    if (r.includes('初期棚卸') || r.includes('商品マスタ連携により初期登録') || h.id === 'log_init_1' || String(h.id || '').startsWith('log_init_')) return;

    // DP-AC アクセサリーキットの架空ログ「仕入受入」を完全除外
    if (r.includes('仕入受入') && (item.id === 'inv_prod_1790319113830_war6' || norm.includes('アクセサリー'))) return;

    // 【最重要原則】ロット入庫はすべて正式なロット台帳（inventory_lots）から唯一の真実として動的に取得する！
    // したがって、baseLogs（item.history）に含まれる過去の重複・汚染ロットログおよびロット削除ログはすべて完全除外する
    if (/混載ロット|ロット入庫|LOT-[0-9]+/i.test(r) || /LOT-[0-9]+/i.test(String(h.id || '')) || r.includes('ロット削除')) return;

    // 確定出荷引当や確定発行取消、在庫復元、伝票連携などの自動生成ログは伝票履歴（docs）から動的取得するため除外
    if (r.includes('確定出荷引当') || r.includes('確定発行取消') || r.includes('在庫復元') || r.includes('伝票連携') || r.includes('出荷納品') || (r.includes('セット仕入') && !isBundle)) return;

    // 急速充電器・バッテリー・本体の過去の重複・汚染ログを除外
    if (isChg && (r.includes('国内仕入入庫') || r.includes('急速充電器在庫戻し') || r.includes('セット品化に伴う自動出庫') || r.includes('確定発行取消') || r.includes('在庫復元'))) return;
    if (isBat && (r.includes('国内仕入') || r.includes('在庫戻し') || r.includes('自動出庫') || r.includes('確定発行取消') || r.includes('在庫復元'))) return;

    // セット品化・セット品化解除のログは動的集約表示するためbaseLogsからは除外
    const hidStr = String(h.id || '');
    if (hidStr.startsWith('log_bundle_') || hidStr.startsWith('log_unbundle_') || r.includes('セット品化') || r.includes('セット品化解除') || r.includes('在庫戻し')) return;

    const delta = h.delta !== undefined ? Number(h.delta) : (h.type === 'out' ? -Number(h.qty || 0) : Number(h.qty || 0));
    const hid = h.id || `${h.date}_${h.type}_${h.qty}_${r}`;
    combined.push({
      ...h,
      id: hid,
      delta: delta,
      qty: Math.abs(delta),
      isManual: true
    });
    if (h.sourceRef) existingDocNums.add(String(h.sourceRef).trim());
    if (h.docNumber) existingDocNums.add(String(h.docNumber).trim());
    if (h.reason && /INV-|EST-|ORD-|DEL-/i.test(h.reason)) {
      const match = h.reason.match(/(INV|EST|ORD|DEL)-[A-Za-z0-9_\-]+/i);
      if (match) existingDocNums.add(match[0]);
    }
  });

  // 2. ロット台帳（inventory_lots）に存在してbaseLogsにまだないロット入庫を自動補完
  const lots = (typeof getInventoryLotList === 'function') ? getInventoryLotList() : [];
  if (Array.isArray(lots)) {
    lots.forEach(l => {
      if (!l) return;
      const lNum = String(l.lotNumber || '').trim();
      if (!lNum || seenLots.has(lNum)) return;

      const arrDate = String(l.arrivalDate || l.date || '').trim();
      if (Array.isArray(l.items) && l.items.length > 0) {
        l.items.forEach(it => {
          if (!it) return;
          const itNorm = getMasterKey(it.itemName || '');
          const itIsBundle = it.itemId === 'inv_1' || itNorm.includes('ベーシックセット');
          const itIsBatSK = it.itemId === 'inv_prod_1794209994433_ij47' || itNorm.includes('dp-bt-sk') || (itNorm.includes('バッテリー') && (lNum.includes('20261105') || itNorm.includes('sk')));
          const itIsBatCS = it.itemId === 'inv_prod_1794209910003_eqxd' || itNorm.includes('dp-bt-cs') || (itNorm.includes('バッテリー') && (lNum.includes('20260324') || itNorm.includes('cs')));
          const itIsBat = itIsBatSK || itIsBatCS || it.itemId === 'inv_dp5000_bat' || (itNorm.includes('バッテリー') && !itIsBundle);
          const itIsChg = it.itemId === 'inv_dp5000_chg' || itNorm.includes('急速充電器');
          const itIsBody = it.itemId === 'inv_dp5000_body' || (itNorm.includes('dp-5000') && !itIsBundle && !itIsBat && !itIsChg && !itNorm.includes('スプレッダー') && !itNorm.includes('アクセサリー') && !itNorm.includes('3点引き'));

          let itGk = itNorm;
          if (itIsBundle) itGk = 'grp_dp5000_bundle';
          else if (itIsBody) itGk = 'grp_dp5000_body';
          else if (itIsBatSK) itGk = 'grp_dp5000_bat_sk';
          else if (itIsBatCS) itGk = 'grp_dp5000_bat_cs';
          else if (itIsBat) itGk = 'grp_dp5000_bat';
          else if (itIsChg) itGk = 'grp_dp5000_chg';
          else if (itNorm.includes('dp-ms') || itNorm.includes('スプレッダー')) itGk = 'grp_dpms';
          else if (itNorm.includes('dp-eg') || itNorm.includes('3点引き')) itGk = 'grp_dpeg';
          else if (itNorm.includes('dp-ac') || itNorm.includes('アクセサリー')) itGk = 'grp_dpac';
          else if (itNorm.includes('hic-025') || itNorm.includes('クランプ')) itGk = 'grp_hic';

          let isLotMatch = false;
          if (it.itemId && (it.itemId === item.id || it.itemId === item.itemId)) {
            isLotMatch = true;
          } else if (itGk === groupKey) {
            isLotMatch = true;
          }

          if (isLotMatch) {
            const q = Number(it.quantity || it.qty) || 0;
            const cost = Number(it.landedUnitCost || it.unitCost) || 0;
            const lotItemKey = `${lNum}_${it.itemId || itGk}`;
            if (q > 0 && !seenLots.has(lotItemKey)) {
              seenLots.add(lotItemKey);
              const supplierName = l.supplier || l.supplierName || (l.procurementType === 'domestic' ? '国内仕入先' : 'CMO');
              combined.push({
                id: `lot_${l.id || lNum}_${it.itemId || ''}`,
                date: arrDate,
                type: 'in',
                qty: q,
                delta: q,
                reason: cost ? `混載ロット入庫: ${lNum} (確定実仕入原価: ¥${Math.round(cost).toLocaleString()}/台)` : `混載ロット入庫: ${lNum}`,
                payee: supplierName,
                timestamp: `${arrDate}T09:00:00.000Z`
              });
            }
          }
        });
      }
    });
  }

  // 3. シリアル台帳（inventory_serials）から社内キッティング（セット品化）履歴を動的集約
  const serials = (typeof getInventorySerialList === 'function') ? getInventorySerialList() : [];
  let bodyArrivalDate = '2026-03-16';
  if (Array.isArray(lots)) {
    const bodyLot = lots.find(l => l && String(l.lotNumber || '').includes('20260316'));
    if (bodyLot && (bodyLot.arrivalDate || bodyLot.date)) {
      bodyArrivalDate = String(bodyLot.arrivalDate || bodyLot.date).trim();
    }
  }

  if (Array.isArray(serials)) {
    // ロットで最初から完成品セット(inv_1)として入荷したシリアル（LOT-20260115, LOT-20251125, および LOT-20261104-01のN11667/N11670）以外の、
    // 本体単品として入荷し社内でセット品化(isBundled)されたシリアルを日付グループごとに動的抽出
    const postAssembledMapByDate = new Map();
    serials.forEach(s => {
      if (!s || !s.isBundled) return;
      const bSn = String(s.serialNumber || '').trim().toUpperCase();
      // 最初から完成品セットとして直接入庫したシリアルは除外
      if (s.lotNumber === 'LOT-20260115' || s.lotNumber === 'LOT-20251125') return;
      if (bSn.startsWith('N84') || (bSn.startsWith('N104') && bSn !== 'N10414')) return;
      if (bSn === 'N11667' || bSn === 'N11670') return;

      const isBodySn = (bSn.startsWith('N84') || bSn.startsWith('N10') || bSn.startsWith('N11')) && bSn.length <= 6;
      if (!isBodySn) return;

      const dateStr = (s.bundledAt ? s.bundledAt.split('T')[0] : (s.inDate || s.arrivalDate || (bSn.startsWith('N109') ? bodyArrivalDate : '2026-11-04')));
      if (!postAssembledMapByDate.has(dateStr)) postAssembledMapByDate.set(dateStr, []);
      postAssembledMapByDate.get(dateStr).push({
        sn: bSn,
        bats: Array.isArray(s.batterySerials) ? s.batterySerials : [],
        bundledAt: `${dateStr}T09:30:00.000Z`
      });
    });

    postAssembledMapByDate.forEach((list, dateStr) => {
      const timestamp = `${dateStr}T09:30:00.000Z`;
      if (isBundle) {
        combined.push({
          id: `bundle_summary_in_${dateStr}_${list.length}`,
          date: dateStr,
          type: 'in',
          qty: list.length,
          delta: list.length,
          reason: `セット品化組立完了: DP-5000 (${list.length}台)`,
          payee: '社内キッティング',
          isBundleSummary: true,
          details: list,
          timestamp: timestamp
        });
      } else if (isBody) {
        combined.push({
          id: `bundle_summary_out_body_${dateStr}_${list.length}`,
          date: dateStr,
          type: 'out',
          qty: list.length,
          delta: -list.length,
          reason: `セット品化組込出庫: DP-5000 本体 (${list.length}台)`,
          payee: 'セット化',
          isBundleSummary: true,
          details: list,
          timestamp: timestamp
        });
      } else if (isBat) {
        // 【完全マスタ主導】シリアル台帳（inventory_serials）のマスタID・SKU・品名を照合し、
        // 現在集計対象のバッテリー商品（item）と100%一致する組込バッテリーのみを動的集計！
        // シリアル番号の特定文字列（0031077...等）に依存しないため、新ロット・新バッテリー・新SKUでも一切誤判定しない。
        let matchedBatsCount = 0;
        list.forEach(d => {
          (d.bats || []).forEach(bSn => {
            const cleanSn = String(bSn || '').trim().toUpperCase();
            const batObj = serials.find(s => s && String(s.serialNumber || '').trim().toUpperCase() === cleanSn);
            if (batObj) {
              const bItemId = batObj.itemId || batObj.inventoryId;
              const bSku = String(batObj.sku || '').toUpperCase();
              const bName = getMasterKey(batObj.itemName || '');
              const itemNorm = getMasterKey(item.name || '');

              let isMatch = false;
              if (bItemId && (bItemId === item.id || bItemId === item.itemId)) isMatch = true;
              else if (bSku && item.sku && bSku === String(item.sku).toUpperCase()) isMatch = true;
              else if (isBatSK && (bSku.includes('SK') || bName.includes('sk'))) isMatch = true;
              else if (isBatCS && (bSku.includes('CS') || bName.includes('cs'))) isMatch = true;
              else if (bName && bName === itemNorm) isMatch = true;

              if (isMatch) matchedBatsCount++;
            } else {
              // 台帳未登録シリアルの場合の安全フォールバック（旧ロット救済）
              if (isBatSK && (dateStr.includes('2026-11') || cleanSn.startsWith('0031077'))) matchedBatsCount++;
              else if (isBatCS && (dateStr.includes('2026-03') || cleanSn.startsWith('BAT-') || cleanSn.startsWith('N485'))) matchedBatsCount++;
            }
          });
        });

        if (matchedBatsCount > 0) {
          const batBundleDate = (isBatCS && dateStr.includes('2026-03')) ? '2026-03-24' : dateStr;
          combined.push({
            id: `bundle_summary_out_bat_${item.id || groupKey}_${batBundleDate}_${matchedBatsCount}`,
            date: batBundleDate,
            type: 'out',
            qty: matchedBatsCount,
            delta: -matchedBatsCount,
            reason: `セット品化組込出庫: ${item.name || 'バッテリー'} (${matchedBatsCount}個)`,
            payee: 'セット化',
            isBundleSummary: true,
            details: list,
            timestamp: `${batBundleDate}T10:00:00.000Z`
          });
        }
      } else if (isChg) {
        // 充電器側：セット品への組込出庫
        const chgDate = dateStr.includes('2026-03') ? '2026-03-24' : dateStr;
        combined.push({
          id: `bundle_summary_out_chg_${chgDate}_${list.length}`,
          date: chgDate,
          type: 'out',
          qty: list.length,
          delta: -list.length,
          reason: `セット品化組込出庫: 専用急速充電器 (${list.length}個)`,
          payee: 'セット化',
          isBundleSummary: true,
          details: list,
          timestamp: `${chgDate}T10:00:00.000Z`
        });
      }
    });
  }

  // 4. 確定伝票（納品書・請求書）からの出荷明細を抽出
  const docs = (typeof getHistoryList === 'function') ? getHistoryList() : [];
  const docSerialNumbers = new Set();
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (!doc || doc.isCancelled === true || doc.isCancelled === 'true' || doc.docType === 'estimate') return;
      if (doc.status === 'superseded' || doc.isSuperseded === true || (doc.fullDoc && (doc.fullDoc.status === 'superseded' || doc.fullDoc.isSuperseded))) return;

      const docNo = String(doc.docNumber || doc.id || '').trim();
      if (existingDocNums.has(docNo)) return;

      const docItems = (Array.isArray(doc.items) && doc.items.length > 0)
        ? doc.items
        : (doc.fullDoc && Array.isArray(doc.fullDoc.items) ? doc.fullDoc.items : []);
      if (!docItems || docItems.length === 0) return;

      const clientName = doc.client ? (doc.client.name || '') : (doc.clientName || '');
      const docDate = doc.issueDate || doc.date || '';
      const docTypeLabel = doc.docType === 'delivery' ? '納品書' : (doc.docType === 'receipt' ? '領収書' : '請求書');

      docItems.forEach((it, idx) => {
        if (!it || !it.name) return;

        // 伝票に含まれるシリアル番号を収集（シリアル台帳との二重減算を完全防止）
        if (it.serialNumber) {
          docSerialNumbers.add(String(it.serialNumber).trim().toUpperCase());
        }
        if (Array.isArray(it.assignedSerials)) {
          it.assignedSerials.forEach(as => {
            if (as && as.serialNumber) {
              docSerialNumbers.add(String(as.serialNumber).trim().toUpperCase());
            }
          });
        }

        const itName = String(it.name || '').trim();
        if (/値引|割引|相殺|調整|特別値引|出精値引/i.test(itName)) return;

        const itNorm = getMasterKey(itName);
        const itIsBundle = it.itemId === 'inv_1' || itNorm.includes('ベーシックセット') || itNorm.includes('ket.ic.2b') || itNorm.includes('エレクトロパワー');
        const itIsBatSK = it.itemId === 'inv_prod_1794209994433_ij47' || itNorm.includes('dp-bt-sk') || (itNorm.includes('バッテリー') && itNorm.includes('sk'));
        const itIsBatCS = it.itemId === 'inv_prod_1794209910003_eqxd' || itNorm.includes('dp-bt-cs') || (itNorm.includes('バッテリー') && itNorm.includes('cs'));
        const itIsBat = itIsBatSK || itIsBatCS || it.itemId === 'inv_dp5000_bat' || (itNorm.includes('バッテリー') && !itIsBundle);
        const itIsChg = it.itemId === 'inv_dp5000_chg' || itNorm.includes('急速充電器');
        const itIsBody = it.itemId === 'inv_dp5000_body' || (itNorm.includes('dp-5000') && !itIsBundle && !itIsBat && !itIsChg && !itNorm.includes('スプレッダー') && !itNorm.includes('アクセサリー') && !itNorm.includes('3点引き'));

        let itGk = itNorm;
        if (itIsBundle) itGk = 'grp_dp5000_bundle';
        else if (itIsBody) itGk = 'grp_dp5000_body';
        else if (itIsBatSK) itGk = 'grp_dp5000_bat_sk';
        else if (itIsBatCS) itGk = 'grp_dp5000_bat_cs';
        else if (itIsBat) itGk = 'grp_dp5000_bat';
        else if (itIsChg) itGk = 'grp_dp5000_chg';
        else if (itNorm.includes('dp-ms') || itNorm.includes('スプレッダー')) itGk = 'grp_dpms';
        else if (itNorm.includes('dp-eg') || itNorm.includes('3点引き')) itGk = 'grp_dpeg';
        else if (itNorm.includes('dp-ac') || itNorm.includes('アクセサリー')) itGk = 'grp_dpac';
        else if (itNorm.includes('hic-025') || itNorm.includes('クランプ')) itGk = 'grp_hic';

        let isMatch = false;
        let itemQty = Number(it.quantity) || 0;
        if (itemQty <= 0) return;

        if (it.itemId && (it.itemId === item.id || it.itemId === item.itemId)) {
          isMatch = true;
        } else if (itGk === groupKey) {
          isMatch = true;
        }

        if (isMatch) {
          combined.push({
            id: `ship_${doc.id || docNo}_${idx}`,
            date: docDate,
            type: 'ship',
            qty: itemQty,
            delta: -itemQty,
            reason: `確定出荷: ${docNo} (${docTypeLabel})`,
            payee: clientName || '-',
            sourceRef: docNo,
            timestamp: doc.createdAt || (docDate ? `${docDate}T12:00:00.000Z` : ''),
            isShipment: true
          });
          if (docNo) existingDocNums.add(docNo);
        }
      });
    });
  }

  // 4.5. シリアル管理台帳から確定伝票外の出荷・デモ機・メンテナンス出庫を統合（在庫整合の担保）
  if (isBundle && Array.isArray(serials)) {
    serials.forEach(s => {
      if (!s) return;
      const bSn = String(s.serialNumber || '').trim().toUpperCase();
      const isBodySn = (bSn.startsWith('N10') || bSn.startsWith('N84')) && bSn.length <= 6;
      if (!isBodySn) return;

      const docNo = String(s.docNumber || '').trim();
      // 確定伝票に紐づいているもの、確定伝票明細に含まれているシリアル、または正式伝票発行済シリアルはスキップ（二重減算完全防止）
      if (docSerialNumbers.has(bSn)) return;
      if (docNo && (existingDocNums.has(docNo) || docNo === 'INV-20260920-01')) return;
      if (bSn === 'N8460' || bSn === 'N8462' || bSn === 'N8476' || bSn === 'N10934') return;

      if (s.status === 'shipped') {
        const sDate = s.shippedDate || s.shipDate || (bSn.startsWith('N109') ? '2026-10-01' : (bSn.startsWith('N84') ? '2025-12-22' : '2026-03-31'));
        combined.push({
          id: `serial_ship_${bSn}`,
          date: sDate,
          type: 'ship',
          qty: 1,
          delta: -1,
          reason: `シリアル台帳出荷: S/N ${bSn}${docNo ? ` (${docNo})` : ''}`,
          payee: s.clientName || '取引先',
          sourceRef: docNo || bSn,
          timestamp: `${sDate}T15:00:00.000Z`,
          isShipment: true
        });
      } else if (s.status === 'demo' || (s.note && s.note.includes('デモ機'))) {
        const dDate = '2025-07-01';
        combined.push({
          id: `serial_demo_${bSn}`,
          date: dDate,
          type: 'out',
          qty: 1,
          delta: -1,
          reason: `社内デモ機出庫（販売在庫対象外）: S/N ${bSn}`,
          payee: '社内デモ',
          sourceRef: bSn,
          timestamp: `${dDate}T12:00:00.000Z`
        });
      } else if (s.status === 'maintenance' || (s.note && s.note.includes('部品足らない'))) {
        const mDate = '2026-10-01';
        combined.push({
          id: `serial_maint_${bSn}`,
          date: mDate,
          type: 'out',
          qty: 1,
          delta: -1,
          reason: `メンテナンス出庫（手元在庫対象外）: S/N ${bSn}`,
          payee: '社内メンテ',
          sourceRef: bSn,
          timestamp: `${mDate}T16:00:00.000Z`
        });
      }
    });
  }

  // 5. 日付・タイムスタンプ昇順（過去→現在）でソートし、処理後在庫推移を計算
  combined.sort((a, b) => {
    const dateA = a.date || '1970-01-01';
    const dateB = b.date || '1970-01-01';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeA - timeB;
  });

  let runningStock = 0;
  combined.forEach(log => {
    runningStock += Number(log.delta) || 0;
    log.computedRunningStock = runningStock;
  });

  return combined.reverse();
}

if (typeof window !== 'undefined') {
  window.pushAllLocalDataToServer = pushAllLocalDataToServer;
  window.pullAllServerDataToLocal = pullAllServerDataToLocal;
  window.getTrashList = getTrashList;
  window.restoreDocFromTrash = restoreDocFromTrash;
  window.purgeTrashDoc = purgeTrashDoc;
  window.clearAllTrashDocs = clearAllTrashDocs;
  window.getAccountMasterList = getAccountMasterList;
  window.saveAccountMasterList = saveAccountMasterList;
  window.getManualJournals = getManualJournals;
  window.saveManualJournal = saveManualJournal;
  window.deleteManualJournal = deleteManualJournal;
  window.getFiscalSettings = getFiscalSettings;
  window.saveFiscalSettings = saveFiscalSettings;
  window.getLockedMonths = getLockedMonths;
  window.saveLockedMonths = saveLockedMonths;
  window.isMonthLocked = isMonthLocked;
  window.getDeletedDocIds = getDeletedDocIds;
  window.getDeletedInvoiceIds = getDeletedInvoiceIds;
  window.getDeletedExpenseIds = getDeletedExpenseIds;
  window.recordDeletedExpenseId = recordDeletedExpenseId;
  window.getInventoryLotList = getInventoryLotList;
  window.saveInventoryLot = saveInventoryLot;
  window.deleteInventoryLot = deleteInventoryLot;
  window.getInventorySerialList = getInventorySerialList;
  window.saveInventorySerial = saveInventorySerial;
  window.saveBatchInventorySerials = saveBatchInventorySerials;
  window.deleteInventorySerial = deleteInventorySerial;
  window.updateSerialDetails = updateSerialDetails;
  window.updateSerialStatus = updateSerialStatus;
  window.getAvailableSerialsByItem = getAvailableSerialsByItem;
  window.getAvailableBundleComponents = getAvailableBundleComponents;
  window.assembleDP5000Bundle = assembleDP5000Bundle;
  window.disassembleDP5000Bundle = disassembleDP5000Bundle;
  window.assignBundleComponentsToBody = assignBundleComponentsToBody;
  window.findClientByCode = findClientByCode;
  window.generateUniqueClientCode = generateUniqueClientCode;
  window.calculateBundleStockAndCost = calculateBundleStockAndCost;
  window.deleteManualInventoryLog = deleteManualInventoryLog;
  window.updateManualInventoryLog = updateManualInventoryLog;
  window.getInventoryList = getInventoryList;
  window.saveInventoryList = saveInventoryList;
  window.saveInventoryItem = saveInventoryItem;
  window.getInventoryHistoryWithShipments = getInventoryHistoryWithShipments;
  window.getHistoryList = getHistoryList;
  window.getExpenseList = getExpenseList;
  window.loadActiveDoc = loadActiveDoc;
  window.saveActiveDoc = saveActiveDoc;
  window.getItemCategoryList = getItemCategoryList;
  window.saveItemCategoryList = saveItemCategoryList;
  window.addItemCategory = addItemCategory;
  window.deleteItemCategory = deleteItemCategory;
  window.moveItemCategory = moveItemCategory;
  window.getNonStockCategories = getNonStockCategories;
  window.saveNonStockCategories = saveNonStockCategories;
  window.isNonStockCategory = isNonStockCategory;
  window.isNonStockItem = isNonStockItem;
  window.setCategoryNonStock = setCategoryNonStock;
  window.syncInventoryLotsWithServer = syncInventoryLotsWithServer;
  window.syncInventorySerialsWithServer = syncInventorySerialsWithServer;
  window.fetchServerInventoryLots = fetchServerInventoryLots;
  window.fetchServerInventorySerials = fetchServerInventorySerials;
  window.syncInventorySerialsFromIssuedDocs = syncInventorySerialsFromIssuedDocs;
  window.initInventoryFromServer = initInventoryFromServer;
  window.loadIssuerProfile = loadIssuerProfile;
  window.saveIssuerProfile = saveIssuerProfile;
  window.sanitizeDocSerialsConsistency = sanitizeDocSerialsConsistency;
  window.sanitizeHondaPaintDocAndSerials = sanitizeHondaPaintDocAndSerials;
  window.restoreAttendanceFromBackup = function () {
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

