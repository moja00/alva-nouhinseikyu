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
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[LocalStorage] setItem error:', e);
  }
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (typeof window !== 'undefined' && window.pushAllLocalDataToServer) {
      // 未ログイン状態なら無駄な通信とエラーを避けてスキップ
      if (typeof firebase !== 'undefined' && firebase.auth) {
        const auth = firebase.auth();
        const hasUser = !!auth.currentUser;
        const cachedToken = (typeof getFirebaseAuthToken === 'function') ? await getFirebaseAuthToken(false) : null;
        if (!hasUser && !cachedToken) {
          return;
        }
      }
      try {
        const res = await window.pushAllLocalDataToServer();
        if (!res.success) {
          console.warn('[自動保存] バックグラウンド保存保留:', res.error);
        }
      } catch (e) {
        console.warn('[自動保存] 通信エラー (次回操作時に再試行):', e);
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

export const DEFAULT_INVENTORY = [
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
    return raw ? JSON.parse(raw) : null;
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
export function getHistoryList() {
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
export function saveDocToHistory(doc) {
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
export function deleteDocFromHistory(id) {
  try {
    const list = getHistoryList().filter(item => item.id !== id);
    localStorageSetItemAndSync(KEYS.HISTORY, JSON.stringify(list));
    // サーバーのFirestoreから個別削除
    deleteServerEntity('invoices', id).catch(e => {
      console.warn('Server invoices history delete failed:', e);
    });
    // 互換性のため履歴全体も保存
    saveServerInvoicesHistory(list).catch(e => {
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
  return found ? found.fullDoc : null;
}

/**
 * 書類履歴から商品マスタの使用回数マップを算出
 * @returns {Record<string, number>}
 */
export function getItemMasterUsageMap() {
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

/**
 * 現在ログイン中の Firebase Auth ユーザーから ID トークンを取得
 * ページ読み込み直後などでセッション復元中の場合は待機し、キャッシュフォールバックも行う
 * @param {boolean} forceRefresh 強制的に最新トークンを再取得するかどうか
 */
export async function getFirebaseAuthToken(forceRefresh = false) {
  // 1. Firebase SDK が利用可能かチェック
  if (typeof firebase !== 'undefined' && firebase.auth) {
    const auth = firebase.auth();

    // 1-1. すでに currentUser が存在する場合はトークンを取得
    if (auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(forceRefresh);
        if (token) {
          _memoryCachedToken = token;
          try { localStorage.setItem(CACHED_TOKEN_KEY, token); } catch (e) {}
          return token;
        }
      } catch (e) {
        console.warn('[Auth] getIdToken error, falling back to cached token:', e);
      }
    }

    // 1-2. currentUser が null の場合、セッション復元を最大1.5秒待機
    if (!forceRefresh) {
      const restoredToken = await new Promise((resolve) => {
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            if (unsubscribe) unsubscribe();
            resolve(null);
          }
        }, 1500);

        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timer);
          if (unsubscribe) unsubscribe();
          if (user) {
            try {
              const token = await user.getIdToken();
              if (token) {
                _memoryCachedToken = token;
                try { localStorage.setItem(CACHED_TOKEN_KEY, token); } catch (e) {}
                resolve(token);
                return;
              }
            } catch (e) {}
          }
          resolve(null);
        });
      });

      if (restoredToken) return restoredToken;
    }
  }

  // 2. 直近のキャッシュトークンにフォールバック（画面遷移・初期ロード直後・一時オフライン）
  if (_memoryCachedToken) return _memoryCachedToken;
  try {
    const localCached = localStorage.getItem(CACHED_TOKEN_KEY);
    if (localCached) {
      _memoryCachedToken = localCached;
      return localCached;
    }
  } catch (e) {}

  // 3. Firebase SDK 内部のローカルストレージからトークン抽出を試みるフォールバック
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
            return fbToken;
          }
        }
      }
    }
  } catch (e) {}

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

  // 認証トークンの自動取得・ヘッダー付与
  const headers = new Headers(options.headers || {});
  try {
    const token = await getFirebaseAuthToken(false);
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  } catch (authErr) {
    console.warn('[apiFetch] Auth token error:', authErr);
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
        return await apiFetch(path, {
          ...options,
          headers: retryHeaders,
          _isRetry: true
        });
      }
    } catch (refreshErr) {
      console.warn('[apiFetch] Token refresh retry failed:', refreshErr);
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

export async function saveServerInvoicesHistory(invoices) {
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
export async function syncInvoicesHistoryWithServer() {
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

export async function saveServerExpenses(expenses) {
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
export async function syncExpensesWithServer() {
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
export function saveItemMasterList(list) {
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
export function saveItemToMaster(item) {
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
export function deleteItemFromMaster(id) {
  try {
    const list = getItemMasterList(false).filter(i => i.id !== id);
    saveItemMasterList(list);
    // サーバーのFirestoreから個別削除
    deleteServerEntity('items', id).catch(e => {
      console.warn('Server item delete failed:', e);
    });
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
 * @returns {boolean} 成功可否
 */
export function cancelDocIssue(docId) {
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
export function getAllExpenseList() {
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
export function getExpenseList() {
  return getAllExpenseList().filter(e => !e.isDeleted);
}

/**
 * 経費・仕入データを保存（新規追加または更新）
 * @param {object} expense { id, date, category, amount, taxRate, payee, invoiceNumber, note, receiptImage, receiptDataUrl, isCost }
 */
export function saveExpense(expense) {
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
export function markExpensesSettled(expenseIds = [], settledDate = '') {
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
export function deleteExpense(id) {
  try {
    const list = getAllExpenseList();
    const existingIndex = list.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      list[existingIndex].isDeleted = true;
      list[existingIndex].updatedAt = new Date().toISOString();
      localStorageSetItemAndSync(KEYS.EXPENSES, JSON.stringify(list));
      // サーバーのFirestoreから個別削除（関連レシート画像も自動クリーンアップ）
      deleteServerEntity('expenses', id).catch(e => {
        console.warn('Server expenses delete failed:', e);
      });
      saveServerExpenses(list).catch(e => {
        console.warn('Server expenses save failed:', e);
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
 * 勤怠データを保存
 */
export function saveAttendance(attendance) {
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
export function getTodayAttendance() {
  const today = getLocalDateStr();
  const list = getAttendanceList();
  return list.find(a => a.date === today) || null;
}

/**
 * 本日の出勤打刻
 */
export function clockInToday(timeStr = '', note = '') {
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
export function clockOutToday(timeStr = '', note = '') {
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
export async function fetchServerInventory() {
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
 * 起動時にサーバーと在庫データを同期
 */
export async function initInventoryFromServer() {
  await Promise.all([
    fetchServerInventory(),
    fetchServerPurchaseMappings()
  ]);
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
export function syncInventoryWithItemsMaster() {
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

/**
 * ローカルストレージ内の全データ（マスタ・経費・伝票・自社設定）をサーバーへ一括アップロード
 */
export async function pushAllLocalDataToServer() {
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
export async function pullAllServerDataToLocal() {
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
