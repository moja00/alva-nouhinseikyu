/**
 * analytics-engine.js
 * Alva-works ERP - 経営分析コアエンジン
 *
 * 1. ロット別原価ビュー（入荷ロット・商品マスタ・在庫・シリアル・伝票からの動的集計）
 * 2. 出張・地域・取引先 統合分析ビュー
 *    - 取引先別 売上・粗利サマリー（複数回取引・エンドユーザー展開追跡）
 *    - 地域（エリア・都道府県）別 売上・経費バランス
 *    - 出張期間と「直後〜後追い」売上の連動分析
 *
 * ※ ハードコード禁止ルール準拠：特定の取引先名・ロット番号・単価・経費金額等は一切記述せず、
 *   すべてマスタ・伝票・ロット台帳・経費・仕訳データから動的に算出します。
 */

// ==========================================================================
// 1. 汎用地理マスタ（日本47都道府県・地方区分・標準郵便番号3桁帯）
// ==========================================================================

export const REGION_ORDER = [
  '北海道',
  '東北',
  '関東',
  '中部',
  '近畿',
  '中国',
  '四国',
  '九州・沖縄',
  '海外',
  '未設定'
];

const PREF_GEO_TABLE = [
  { pref: '北海道', region: '北海道', zipRanges: [[1, 99]], keywords: ['北海道', '札幌', '新千歳', '函館', '旭川', '帯広', '釧路', '北見', '苫小牧', '千歳'] },
  { pref: '青森県', region: '東北', zipRanges: [[30, 39]], keywords: ['青森県', '青森市', '八戸', '弘前'] },
  { pref: '岩手県', region: '東北', zipRanges: [[20, 29]], keywords: ['岩手県', '盛岡', '花巻', '一関'] },
  { pref: '宮城県', region: '東北', zipRanges: [[980, 989]], keywords: ['宮城県', '仙台', '石巻', '大崎'] },
  { pref: '秋田県', region: '東北', zipRanges: [[10, 19]], keywords: ['秋田県', '秋田市', '横手'] },
  { pref: '山形県', region: '東北', zipRanges: [[990, 999]], keywords: ['山形県', '山形市', '米沢', '鶴岡', '酒田'] },
  { pref: '福島県', region: '東北', zipRanges: [[960, 979]], keywords: ['福島県', '福島市', '郡山', 'いわき', '会津若松'] },
  { pref: '茨城県', region: '関東', zipRanges: [[300, 319]], keywords: ['茨城県', '水戸', 'つくば', '日立', '土浦'] },
  { pref: '栃木県', region: '関東', zipRanges: [[320, 329]], keywords: ['栃木県', '宇都宮', '小山', '足利', '佐野', '那須'] },
  { pref: '群馬県', region: '関東', zipRanges: [[370, 379]], keywords: ['群馬県', '前橋', '高崎', '太田', '伊勢崎', '桐生', '渋川', '館林'] },
  { pref: '埼玉県', region: '関東', zipRanges: [[330, 369]], keywords: ['埼玉県', 'さいたま', '川口', '大宮', '浦和', '川越', '熊谷', '深谷', '所沢', '春日部', '越谷', '本庄'] },
  { pref: '千葉県', region: '関東', zipRanges: [[260, 299]], keywords: ['千葉県', '千葉市', '船橋', '柏', '松戸', '市川', '成田', '幕張', '木更津'] },
  { pref: '東京都', region: '関東', zipRanges: [[100, 208]], keywords: ['東京都', '羽田空港', '羽田', '東京駅', '品川', '新宿', '渋谷', '池袋', '銀座', '丸の内', '八王子', '立川', '町田', '足立区', '港区', '千代田区', '中央区', '江東区', '大田区', '世田谷区'] },
  { pref: '神奈川県', region: '関東', zipRanges: [[210, 259]], keywords: ['神奈川県', '横浜', '川崎', '相模原', '藤沢', '厚木', '小田原', '横須賀', '新横浜'] },
  { pref: '新潟県', region: '中部', zipRanges: [[940, 959]], keywords: ['新潟県', '新潟市', '長岡', '上越', '三条'] },
  { pref: '富山県', region: '中部', zipRanges: [[930, 939]], keywords: ['富山県', '富山市', '高岡'] },
  { pref: '石川県', region: '中部', zipRanges: [[920, 929]], keywords: ['石川県', '金沢', '小松', '白山'] },
  { pref: '福井県', region: '中部', zipRanges: [[910, 919]], keywords: ['福井県', '福井市', '敦賀'] },
  { pref: '山梨県', region: '中部', zipRanges: [[400, 409]], keywords: ['山梨県', '甲府', '富士吉田'] },
  { pref: '長野県', region: '中部', zipRanges: [[380, 399]], keywords: ['長野県', '長野市', '松本', '上田', '千曲', '軽井沢', '飯田', '佐久'] },
  { pref: '岐阜県', region: '中部', zipRanges: [[500, 509]], keywords: ['岐阜県', '岐阜市', '大垣', '高山', '各務原', '多治見'] },
  { pref: '静岡県', region: '中部', zipRanges: [[410, 439]], keywords: ['静岡県', '静岡市', '浜松', '沼津', '富士市', '熱海', '三島'] },
  { pref: '愛知県', region: '中部', zipRanges: [[440, 498]], keywords: ['愛知県', '名古屋', '中部国際空港', 'セントレア', '豊田', '岡崎', '一宮', '豊橋', '春日井', '刈谷'] },
  { pref: '三重県', region: '近畿', zipRanges: [[510, 519]], keywords: ['三重県', '津市', '四日市', '鈴鹿', '桑名', '伊勢'] },
  { pref: '滋賀県', region: '近畿', zipRanges: [[520, 529]], keywords: ['滋賀県', '大津', '草津', '彦根', '長浜'] },
  { pref: '京都府', region: '近畿', zipRanges: [[600, 629]], keywords: ['京都府', '京都市', '京都駅', '宇治', '舞鶴', '福知山'] },
  { pref: '大阪府', region: '近畿', zipRanges: [[530, 599]], keywords: ['大阪府', '大阪市', '新大阪', '伊丹空港', '関西国際空港', '関西空港', '関空', '梅田', '難波', '堺市', '東大阪', '豊中', '吹田', '枚方'] },
  { pref: '兵庫県', region: '近畿', zipRanges: [[650, 679]], keywords: ['兵庫県', '神戸', '姫路', '尼崎', '西宮', '明石', '加古川', '伊丹市'] },
  { pref: '奈良県', region: '近畿', zipRanges: [[630, 639]], keywords: ['奈良県', '奈良市', '橿原', '生駒'] },
  { pref: '和歌山県', region: '近畿', zipRanges: [[640, 649]], keywords: ['和歌山県', '和歌山市', '田辺'] },
  { pref: '鳥取県', region: '中国', zipRanges: [[680, 689]], keywords: ['鳥取県', '鳥取市', '米子'] },
  { pref: '島根県', region: '中国', zipRanges: [[690, 699]], keywords: ['島根県', '松江', '出雲'] },
  { pref: '岡山県', region: '中国', zipRanges: [[700, 719]], keywords: ['岡山県', '岡山市', '倉敷', '津山'] },
  { pref: '広島県', region: '中国', zipRanges: [[720, 739]], keywords: ['広島県', '広島市', '広島空港', '福山', '呉市', '廿日市', '東広島'] },
  { pref: '山口県', region: '中国', zipRanges: [[740, 759]], keywords: ['山口県', '山口市', '下関', '宇部', '周南', '岩国'] },
  { pref: '徳島県', region: '四国', zipRanges: [[770, 779]], keywords: ['徳島県', '徳島市', '鳴門'] },
  { pref: '香川県', region: '四国', zipRanges: [[760, 769]], keywords: ['香川県', '高松', '丸亀'] },
  { pref: '愛媛県', region: '四国', zipRanges: [[790, 799]], keywords: ['愛媛県', '松山', '今治', '新居浜'] },
  { pref: '高知県', region: '四国', zipRanges: [[780, 789]], keywords: ['高知県', '高知市'] },
  { pref: '福岡県', region: '九州・沖縄', zipRanges: [[800, 839]], keywords: ['福岡県', '福岡市', '福岡空港', '博多', '天神', '北九州', '小倉', '久留米', '飯塚'] },
  { pref: '佐賀県', region: '九州・沖縄', zipRanges: [[840, 849]], keywords: ['佐賀県', '佐賀市', '鳥栖', '唐津'] },
  { pref: '長崎県', region: '九州・沖縄', zipRanges: [[850, 859]], keywords: ['長崎県', '長崎市', '佐世保', '諫早'] },
  { pref: '熊本県', region: '九州・沖縄', zipRanges: [[860, 869]], keywords: ['熊本県', '熊本市', '熊本空港', '阿蘇くまもと', '八代', '玉名'] },
  { pref: '大分県', region: '九州・沖縄', zipRanges: [[870, 879]], keywords: ['大分県', '大分市', '別府', '中津'] },
  { pref: '宮崎県', region: '九州・沖縄', zipRanges: [[880, 889]], keywords: ['宮崎県', '宮崎市', '都城', '延岡'] },
  { pref: '鹿児島県', region: '九州・沖縄', zipRanges: [[890, 899]], keywords: ['鹿児島県', '鹿児島市', '鹿児島空港', '霧島', '鹿屋'] },
  { pref: '沖縄県', region: '九州・沖縄', zipRanges: [[900, 907]], keywords: ['沖縄県', '那覇', '沖縄市', '浦添', '宜野湾', '石垣', '宮古島'] }
];

const OVERSEAS_COUNTRY_RE = /\b(germany|deutschland|italy|italia|france|uk|united kingdom|england|usa|united states|america|canada|china|taiwan|korea|singapore|thailand|vietnam|australia|switzerland|austria|netherlands|spain|sweden|poland|belgium|europe|eu)\b/i;

// 移動・デモ・出張関連の経費カテゴリキーワード
export const TRAVEL_DEMO_EXPENSE_CATEGORIES = ['旅費交通費', '車両費', '接待交際費', '会議費'];

export function isTravelDemoExpenseCategory(category) {
  const c = String(category || '').trim();
  if (!c) return false;
  return TRAVEL_DEMO_EXPENSE_CATEGORIES.some(k => c.includes(k)) ||
    /旅費|交通|出張|車両|ガソリン|高速|駐車|宿泊|交際/.test(c);
}

/**
 * 住所・郵便番号・テキストから汎用的に都道府県・地方エリアを判定する
 * （ハードコード禁止：一般的な日本の都道府県・郵便番号規則・海外判定のみを使用）
 */
export function resolveGeoLocation({ address = '', zip = '', text = '', currency = '', docLang = '' } = {}) {
  const addrStr = String(address || '').normalize('NFKC').trim();
  const zipStr = String(zip || '').normalize('NFKC').trim();
  const extraStr = String(text || '').normalize('NFKC').trim();
  const combined = `${addrStr} ${extraStr}`.trim();

  // 1. 住所・テキスト内の明確な47都道府県名（完全一致優先）
  for (const row of PREF_GEO_TABLE) {
    if (addrStr && addrStr.includes(row.pref)) {
      return { prefecture: row.pref, region: row.region, source: 'address_pref' };
    }
  }

  // 2. 日本標準郵便番号（NNN-NNNN または 7桁数字）の上3桁から判定
  const jpZipMatch = zipStr.replace(/〒/g, '').trim().match(/^(\d{3})-?(\d{4})$/);
  if (jpZipMatch) {
    const prefix3 = parseInt(jpZipMatch[1], 10);
    // 001〜099 は北海道・東北（010-019秋田, 020-029岩手, 030-039青森, その他北海道）
    if (prefix3 >= 10 && prefix3 <= 19) return { prefecture: '秋田県', region: '東北', source: 'zip' };
    if (prefix3 >= 20 && prefix3 <= 29) return { prefecture: '岩手県', region: '東北', source: 'zip' };
    if (prefix3 >= 30 && prefix3 <= 39) return { prefecture: '青森県', region: '東北', source: 'zip' };
    if ((prefix3 >= 1 && prefix3 <= 9) || (prefix3 >= 40 && prefix3 <= 99)) {
      return { prefecture: '北海道', region: '北海道', source: 'zip' };
    }
    for (const row of PREF_GEO_TABLE) {
      if (row.pref === '北海道' || row.pref === '青森県' || row.pref === '岩手県' || row.pref === '秋田県') continue;
      for (const [lo, hi] of row.zipRanges) {
        if (prefix3 >= lo && prefix3 <= hi) {
          return { prefecture: row.pref, region: row.region, source: 'zip' };
        }
      }
    }
  }

  // 3. 海外判定（英語書類・海外国名・欧州郵便番号 D-xxxxx 等）
  if (
    OVERSEAS_COUNTRY_RE.test(combined) ||
    /^[A-Z]{1,2}-\d{4,6}$/i.test(zipStr) ||
    (docLang === 'en' && !/[ぁ-んァ-ヶ一-龠]/.test(addrStr)) ||
    (currency && currency !== 'JPY' && !/[ぁ-んァ-ヶ一-龠]/.test(addrStr))
  ) {
    return { prefecture: '海外', region: '海外', source: 'overseas' };
  }

  // 4. テキスト全体（支払先・摘要・住所）から都道府県名・一般主要地名キーワードを判定
  for (const row of PREF_GEO_TABLE) {
    if (combined.includes(row.pref)) {
      return { prefecture: row.pref, region: row.region, source: 'text_pref' };
    }
  }
  for (const row of PREF_GEO_TABLE) {
    for (const kw of row.keywords) {
      if (kw && combined.includes(kw)) {
        return { prefecture: row.pref, region: row.region, source: 'text_keyword' };
      }
    }
  }

  return { prefecture: '未設定', region: '未設定', source: 'unknown' };
}

// ==========================================================================
// 2. 日付ユーティリティ
// ==========================================================================

function parseYmdToUtcMs(dateStr) {
  const s = String(dateStr || '').trim().slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return Date.UTC(y, mo - 1, d);
}

function addDaysYmd(dateStr, days) {
  const ms = parseYmdToUtcMs(dateStr);
  if (ms === null) return '';
  const dt = new Date(ms + (Number(days) || 0) * 86400000);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function diffDaysYmd(startStr, endStr) {
  const ms1 = parseYmdToUtcMs(startStr);
  const ms2 = parseYmdToUtcMs(endStr);
  if (ms1 === null || ms2 === null) return null;
  return Math.round((ms2 - ms1) / 86400000);
}

function isDateInRange(dateStr, startStr, endStr) {
  const d = String(dateStr || '').trim().slice(0, 10);
  if (!d) return false;
  if (startStr && d < startStr) return false;
  if (endStr && d > endStr) return false;
  return true;
}

function normalizeLookupName(str) {
  return String(str || '')
    .normalize('NFKC')
    .replace(/[\s\u3000]+/g, ' ')
    .trim()
    .toLowerCase();
}

// ==========================================================================
// 3. ロット別原価ビュー 分析エンジン
// ==========================================================================

/**
 * ロット台帳・商品マスタ・在庫マスタ・シリアル台帳・確定伝票から
 * ロット別原価・諸掛按分・原価率・前回ロット比を動的集計する
 */
export function buildLotCostAnalytics({
  lots = [],
  itemsMaster = [],
  inventoryList = [],
  serials = [],
  docs = []
} = {}) {
  const safeLots = Array.isArray(lots) ? lots : [];
  const safeItems = Array.isArray(itemsMaster) ? itemsMaster : [];
  const safeInv = Array.isArray(inventoryList) ? inventoryList : [];
  const safeSerials = Array.isArray(serials) ? serials : [];
  const safeDocs = Array.isArray(docs) ? docs : [];

  // 商品マスタ・在庫マスタの高速ルックアップ辞書を構築
  const itemById = new Map();
  const itemBySku = new Map();
  const itemByName = new Map();
  safeItems.forEach(it => {
    if (!it) return;
    if (it.id) {
      itemById.set(String(it.id), it);
      itemById.set(`inv_${it.id}`, it);
    }
    if (it.sku) itemBySku.set(normalizeLookupName(it.sku), it);
    if (it.name) itemByName.set(normalizeLookupName(it.name), it);
  });

  const invById = new Map();
  const invByName = new Map();
  safeInv.forEach(inv => {
    if (!inv) return;
    if (inv.id) invById.set(String(inv.id), inv);
    if (inv.name) invByName.set(normalizeLookupName(inv.name), inv);
  });

  // 確定伝票から品目別の実績平均販売単価（マスタ単価が無い場合のフォールバック）を動的算出
  const salesPriceAcc = new Map(); // normName / itemId -> { sum, qty }
  safeDocs.forEach(rawDoc => {
    const doc = (typeof normalizeInvoiceDoc === 'function') ? normalizeInvoiceDoc(rawDoc) : rawDoc;
    if (!doc || doc.isCancelled || doc.isSuperseded || doc.docType === 'estimate') return;
    if (Number(doc.subtotal) <= 0) return; // 0円伝票（デモ・寄贈等）は販売単価平均から除外
    const docItems = Array.isArray(doc.items) ? doc.items : [];
    docItems.forEach(it => {
      if (!it || (Number(it.unitPrice) || 0) <= 0) return;
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) return;
      const price = Number(it.unitPrice) || 0;
      const keys = [it.itemId ? String(it.itemId) : '', it.name ? normalizeLookupName(it.name) : ''].filter(Boolean);
      keys.forEach(k => {
        const cur = salesPriceAcc.get(k) || { sum: 0, qty: 0 };
        cur.sum += price * qty;
        cur.qty += qty;
        salesPriceAcc.set(k, cur);
      });
    });
  });

  // シリアル台帳からロット×品目別のシリアル件数（総数・在庫中・出荷済）を動的集計
  const serialStatsByLot = new Map(); // `${lotNumber}__${itemIdOrNorm}` -> { total, inStock, shipped }
  safeSerials.forEach(s => {
    if (!s) return;
    const lNum = String(s.lotNumber || '').trim();
    if (!lNum) return;
    const isInStock = (s.status === 'in_stock');
    const keys = [
      s.inventoryId ? `${lNum}__${s.inventoryId}` : '',
      s.itemId ? `${lNum}__${s.itemId}` : '',
      s.itemName ? `${lNum}__${normalizeLookupName(s.itemName)}` : ''
    ].filter(Boolean);
    keys.forEach(k => {
      const st = serialStatsByLot.get(k) || { total: 0, inStock: 0, shipped: 0 };
      st.total += 1;
      if (isInStock) st.inStock += 1;
      else st.shipped += 1;
      serialStatsByLot.set(k, st);
    });
  });

  const resolveMasterRef = (itemId, itemName, sku) => {
    const idStr = String(itemId || '').trim();
    const inv = invById.get(idStr) || invByName.get(normalizeLookupName(itemName)) || null;
    const strippedId = idStr.replace(/^inv_/, '');
    const prod =
      itemById.get(idStr) ||
      itemById.get(strippedId) ||
      (sku ? itemBySku.get(normalizeLookupName(sku)) : null) ||
      (inv && inv.sku ? itemBySku.get(normalizeLookupName(inv.sku)) : null) ||
      itemByName.get(normalizeLookupName(itemName)) ||
      (inv && inv.name ? itemByName.get(normalizeLookupName(inv.name)) : null) ||
      null;

    // 基準販売単価の決定（商品マスタ標準売価 → 伝票実績平均単価 → null）
    let refSalesPrice = 0;
    let refSalesSource = '';
    if (prod && Number(prod.unitPrice) > 0) {
      refSalesPrice = Number(prod.unitPrice);
      refSalesSource = '商品マスタ';
    } else if (inv && Number(inv.salesPrice || inv.sellingPrice) > 0) {
      refSalesPrice = Number(inv.salesPrice || inv.sellingPrice);
      refSalesSource = '在庫マスタ';
    } else {
      const acc =
        salesPriceAcc.get(strippedId) ||
        salesPriceAcc.get(idStr) ||
        salesPriceAcc.get(normalizeLookupName(itemName));
      if (acc && acc.qty > 0) {
        refSalesPrice = Math.round(acc.sum / acc.qty);
        refSalesSource = '伝票平均';
      }
    }

    return {
      canonicalItemId: (inv && inv.id) || idStr || normalizeLookupName(itemName),
      canonicalName: (inv && inv.name) || (prod && prod.name) || String(itemName || '名称未設定').trim(),
      sku: String(sku || (inv && inv.sku) || (prod && prod.sku) || '').trim(),
      category: String((prod && prod.category) || (inv && inv.category) || '未分類').trim(),
      unit: String((inv && inv.unit) || (prod && prod.unit) || '個').trim(),
      refSalesPrice: refSalesPrice > 0 ? refSalesPrice : null,
      refSalesSource: refSalesSource || '未設定'
    };
  };

  // 全ロット明細をフラット展開
  const rows = [];
  const lotSet = new Set();

  safeLots.forEach(lot => {
    if (!lot) return;
    const lotNumber = String(lot.lotNumber || lot.id || '').trim() || '未設定';
    lotSet.add(lotNumber);
    const arrivalDate = String(lot.arrivalDate || lot.date || '').trim().slice(0, 10);
    const procurementType = lot.procurementType === 'domestic' ? 'domestic' : 'import';
    const supplier = String(lot.supplier || lot.supplierName || '').trim() || '未設定';
    const foreignCurrency = procurementType === 'import' ? String(lot.foreignCurrency || '').trim() : 'JPY';
    const exchangeRate = procurementType === 'import' ? (Number(lot.exchangeRate) || 0) : 0;

    const rawItems = (Array.isArray(lot.items) && lot.items.length > 0)
      ? lot.items
      : [{
          itemId: lot.itemId || '',
          itemName: lot.itemName || '',
          sku: lot.sku || '',
          quantity: Number(lot.quantity || lot.qty) || 0,
          foreignPrice: Number(lot.foreignPrice) || 0,
          foreignSubtotal: Number(lot.foreignAmount) || 0,
          unitPrice: Number(lot.unitPrice) || 0,
          subtotal: Number(lot.subtotal || lot.totalCost) || 0,
          allocatedCost: Number(lot.allocatedCost) || 0,
          unitCost: Number(lot.unitCost || lot.landedUnitCost) || 0
        }];

    rawItems.forEach((it, idx) => {
      if (!it) return;
      const qty = Math.max(0, Number(it.quantity ?? it.qty) || 0);
      if (qty <= 0) return;

      const meta = resolveMasterRef(it.itemId, it.itemName, it.sku);
      const landedUnitCost = Math.round(Number(it.unitCost ?? it.landedUnitCost) || 0);
      const rawSubtotal = Number(it.subtotal) || 0;
      const rawUnitPrice = Number(it.unitPrice) || (rawSubtotal > 0 ? Math.round(rawSubtotal / qty) : 0);
      const rawAllocatedTotal = Number(it.allocatedCost) || 0;

      // 本体単価と1台あたり諸掛按分額を整合計算
      let baseUnitCost = rawUnitPrice > 0 ? Math.round(rawUnitPrice) : landedUnitCost;
      let allocatedUnitCost = rawAllocatedTotal > 0
        ? Math.round(rawAllocatedTotal / qty)
        : Math.max(0, landedUnitCost - baseUnitCost);
      if (baseUnitCost > landedUnitCost && landedUnitCost > 0) {
        // 本体単価が確定原価を上回るデータ揺れがある場合は確定原価基準に丸める
        baseUnitCost = landedUnitCost;
        allocatedUnitCost = 0;
      }

      const totalLandedCost = landedUnitCost * qty;
      const totalAllocatedCost = allocatedUnitCost * qty;
      const allocatedRatioPct = landedUnitCost > 0 ? Math.round((allocatedUnitCost / landedUnitCost) * 1000) / 10 : 0;

      const foreignPrice = Number(it.foreignPrice) || 0;
      const foreignSubtotal = Number(it.foreignSubtotal) || (foreignPrice > 0 ? Math.round(foreignPrice * qty * 100) / 100 : 0);

      const refPrice = meta.refSalesPrice;
      const costRatioPct = (refPrice && refPrice > 0 && landedUnitCost > 0)
        ? Math.round((landedUnitCost / refPrice) * 1000) / 10
        : null;
      const estGrossMarginPerUnit = (refPrice && refPrice > 0)
        ? (refPrice - landedUnitCost)
        : null;

      const snStat =
        serialStatsByLot.get(`${lotNumber}__${meta.canonicalItemId}`) ||
        serialStatsByLot.get(`${lotNumber}__${it.itemId || ''}`) ||
        serialStatsByLot.get(`${lotNumber}__${normalizeLookupName(meta.canonicalName)}`) ||
        { total: 0, inStock: 0, shipped: 0 };

      rows.push({
        rowKey: `${lot.id || lotNumber}_${idx}`,
        lotId: lot.id || '',
        lotNumber,
        arrivalDate,
        procurementType,
        supplier,
        foreignCurrency,
        exchangeRate,
        itemId: meta.canonicalItemId,
        itemName: meta.canonicalName,
        sku: meta.sku,
        category: meta.category,
        unit: meta.unit,
        qty,
        foreignPrice,
        foreignSubtotal,
        baseUnitCost,
        allocatedUnitCost,
        componentUnitCost: 0,
        landedUnitCost,
        totalLandedCost,
        totalAllocatedCost,
        allocatedRatioPct,
        refSalesPrice: refPrice,
        refSalesSource: meta.refSalesSource,
        costRatioPct,
        estGrossMarginPerUnit,
        serialStats: snStat,
        isAssembledFromComponents: false,
        componentBreakdown: [],
        sourceMainItemName: '',
        // 推移比較（後段で埋める）
        prevUnitCost: null,
        prevDelta: null,
        prevDeltaPct: null,
        itemMinCost: landedUnitCost,
        itemMaxCost: landedUnitCost,
        itemAvgCost: landedUnitCost
      });
    });
  });

  // BOM（セット品構成）に基づく本体単体ロット → セット品合成原価行の動的生成
  // （例：本体単体ロットに直近入庫の付帯部品原価を合算し、販売単位のセット品原価推移にも並べて比較可能にする）
  const baseRowsSnapshot = [...rows];
  const bundleMasters = safeInv.filter(inv => inv && inv.type === 'bundle' && Array.isArray(inv.bundleItems) && inv.bundleItems.length >= 2);

  const findNearestComponentLotRow = (comp, targetDate) => {
    const compInvId = String(comp.inventoryId || '').trim();
    const role = String(comp.role || '').toLowerCase();
    const compNameNorm = normalizeLookupName(comp.name || '');

    // 1. inventoryId 完全一致の入庫ロットを優先
    let candidates = baseRowsSnapshot.filter(r => r.itemId === compInvId && r.landedUnitCost > 0);

    // 2. 直接の入庫ロットが無い場合は同一ロール（バッテリー・充電器等）の単品入庫ロットから動的検索
    if (candidates.length === 0) {
      candidates = baseRowsSnapshot.filter(r => {
        if (r.landedUnitCost <= 0) return false;
        const rn = normalizeLookupName(r.itemName);
        if (rn.includes('セット')) return false;
        if (role === 'battery' || compNameNorm.includes('バッテリー') || compNameNorm.includes('電池')) {
          return rn.includes('バッテリー') || rn.includes('電池');
        }
        if (role === 'charger' || compNameNorm.includes('充電器')) {
          return rn.includes('充電器');
        }
        return compNameNorm && rn === compNameNorm;
      });
    }

    if (candidates.length > 0) {
      // 本体入荷日に最も近い（日付差の絶対値が最小な）直近入庫ロットを選定。同点時は新しい入荷日を優先
      const sorted = [...candidates].sort((a, b) => {
        const da = (targetDate && a.arrivalDate) ? Math.abs(diffDaysYmd(targetDate, a.arrivalDate) ?? 999999) : 999999;
        const db = (targetDate && b.arrivalDate) ? Math.abs(diffDaysYmd(targetDate, b.arrivalDate) ?? 999999) : 999999;
        if (da !== db) return da - db;
        return (b.arrivalDate || '').localeCompare(a.arrivalDate || '');
      });
      const picked = sorted[0];
      return {
        unitCost: picked.landedUnitCost,
        lotNumber: picked.lotNumber,
        arrivalDate: picked.arrivalDate,
        itemName: picked.itemName,
        sku: picked.sku,
        source: 'lot'
      };
    }

    // 3. ロット履歴が1件も無い場合は在庫マスタの標準原価へ安全フォールバック
    const invFallback = invById.get(compInvId);
    if (invFallback && Number(invFallback.unitCost) > 0) {
      return {
        unitCost: Math.round(Number(invFallback.unitCost)),
        lotNumber: 'マスタ標準',
        arrivalDate: invFallback.lastInDate || '',
        itemName: invFallback.name || comp.name || '',
        sku: invFallback.sku || '',
        source: 'master'
      };
    }
    return null;
  };

  bundleMasters.forEach(bundleInv => {
    const bom = bundleInv.bundleItems;
    const mainComp = bom.find(c => c && c.role === 'main') || bom[0];
    const subComps = bom.filter(c => c && c !== mainComp && Number(c.qty) > 0);
    if (!mainComp || !mainComp.inventoryId || subComps.length === 0) return;

    const bundleMeta = resolveMasterRef(bundleInv.id, bundleInv.name, bundleInv.sku);
    const mainRows = baseRowsSnapshot.filter(r => r.itemId === String(mainComp.inventoryId));

    mainRows.forEach((mr, mIdx) => {
      const breakdown = [];
      let extraUnitCost = 0;
      subComps.forEach(sc => {
        const compQty = Math.max(1, Number(sc.qty) || 1);
        const found = findNearestComponentLotRow(sc, mr.arrivalDate);
        const uCost = found ? found.unitCost : 0;
        const subTotal = uCost * compQty;
        extraUnitCost += subTotal;
        breakdown.push({
          role: sc.role || 'part',
          name: (found && found.itemName) || sc.name || '構成部品',
          sku: (found && found.sku) || '',
          qty: compQty,
          unitCost: uCost,
          subtotal: subTotal,
          lotNumber: found ? found.lotNumber : '未設定',
          arrivalDate: found ? found.arrivalDate : ''
        });
      });

      const assembledUnitCost = mr.landedUnitCost + extraUnitCost;
      const assembledTotalCost = assembledUnitCost * mr.qty;
      const assembledAllocRatioPct = assembledUnitCost > 0
        ? Math.round((mr.allocatedUnitCost / assembledUnitCost) * 1000) / 10
        : 0;
      const refPrice = bundleMeta.refSalesPrice;
      const costRatioPct = (refPrice && refPrice > 0 && assembledUnitCost > 0)
        ? Math.round((assembledUnitCost / refPrice) * 1000) / 10
        : null;
      const estGrossMarginPerUnit = (refPrice && refPrice > 0)
        ? (refPrice - assembledUnitCost)
        : null;

      rows.push({
        rowKey: `${mr.rowKey}_assembled_${bundleInv.id}_${mIdx}`,
        lotId: mr.lotId,
        lotNumber: mr.lotNumber,
        arrivalDate: mr.arrivalDate,
        procurementType: mr.procurementType,
        supplier: mr.supplier,
        foreignCurrency: mr.foreignCurrency,
        exchangeRate: mr.exchangeRate,
        itemId: bundleMeta.canonicalItemId,
        itemName: bundleMeta.canonicalName,
        sku: bundleMeta.sku,
        category: bundleMeta.category,
        unit: bundleMeta.unit || 'セット',
        qty: mr.qty,
        foreignPrice: mr.foreignPrice,
        foreignSubtotal: mr.foreignSubtotal,
        baseUnitCost: mr.baseUnitCost,
        allocatedUnitCost: mr.allocatedUnitCost,
        componentUnitCost: extraUnitCost,
        landedUnitCost: assembledUnitCost,
        totalLandedCost: assembledTotalCost,
        totalAllocatedCost: mr.totalAllocatedCost,
        allocatedRatioPct: assembledAllocRatioPct,
        refSalesPrice: refPrice,
        refSalesSource: bundleMeta.refSalesSource,
        costRatioPct,
        estGrossMarginPerUnit,
        serialStats: mr.serialStats,
        isAssembledFromComponents: true,
        componentBreakdown: breakdown,
        sourceMainItemName: mr.sku ? `${mr.sku} ${mr.itemName}` : mr.itemName,
        prevUnitCost: null,
        prevDelta: null,
        prevDeltaPct: null,
        itemMinCost: assembledUnitCost,
        itemMaxCost: assembledUnitCost,
        itemAvgCost: assembledUnitCost
      });
    });
  });

  // 品目ごとに時系列ソートして前回ロット比・最安・最高・平均を算出
  const byItemMap = new Map();
  rows.forEach(r => {
    const key = r.itemId || normalizeLookupName(r.itemName);
    if (!byItemMap.has(key)) byItemMap.set(key, []);
    byItemMap.get(key).push(r);
  });

  const itemTrends = [];
  byItemMap.forEach((list, key) => {
    list.sort((a, b) => {
      const da = a.arrivalDate || '';
      const db = b.arrivalDate || '';
      if (da !== db) return da.localeCompare(db);
      if (a.lotNumber !== b.lotNumber) return a.lotNumber.localeCompare(b.lotNumber);
      return (a.isAssembledFromComponents ? 1 : 0) - (b.isAssembledFromComponents ? 1 : 0);
    });

    const validCosts = list.map(r => r.landedUnitCost).filter(c => c > 0);
    const minCost = validCosts.length > 0 ? Math.min(...validCosts) : 0;
    const maxCost = validCosts.length > 0 ? Math.max(...validCosts) : 0;
    const totalQty = list.reduce((s, r) => s + r.qty, 0);
    const totalCost = list.reduce((s, r) => s + r.totalLandedCost, 0);
    const weightedAvgCost = totalQty > 0 ? Math.round(totalCost / totalQty) : 0;

    list.forEach((r, idx) => {
      r.itemMinCost = minCost;
      r.itemMaxCost = maxCost;
      r.itemAvgCost = weightedAvgCost;
      if (idx > 0 && list[idx - 1].landedUnitCost > 0 && r.landedUnitCost > 0) {
        const prev = list[idx - 1].landedUnitCost;
        r.prevUnitCost = prev;
        r.prevDelta = r.landedUnitCost - prev;
        r.prevDeltaPct = Math.round(((r.landedUnitCost - prev) / prev) * 1000) / 10;
      }
    });

    const latest = list[list.length - 1];
    itemTrends.push({
      itemKey: key,
      itemId: latest.itemId,
      itemName: latest.itemName,
      sku: latest.sku,
      category: latest.category,
      unit: latest.unit,
      lotCount: list.length,
      totalQty,
      totalCost,
      minCost,
      maxCost,
      costSpread: maxCost - minCost,
      costSpreadPct: minCost > 0 ? Math.round(((maxCost - minCost) / minCost) * 1000) / 10 : 0,
      weightedAvgCost,
      latestCost: latest.landedUnitCost,
      latestArrivalDate: latest.arrivalDate,
      latestLotNumber: latest.lotNumber,
      latestPrevDelta: latest.prevDelta,
      latestPrevDeltaPct: latest.prevDeltaPct,
      refSalesPrice: latest.refSalesPrice,
      latestCostRatioPct: latest.costRatioPct,
      points: list.map(r => ({
        lotNumber: r.lotNumber,
        arrivalDate: r.arrivalDate,
        procurementType: r.procurementType,
        foreignCurrency: r.foreignCurrency,
        exchangeRate: r.exchangeRate,
        qty: r.qty,
        baseUnitCost: r.baseUnitCost,
        allocatedUnitCost: r.allocatedUnitCost,
        componentUnitCost: r.componentUnitCost || 0,
        landedUnitCost: r.landedUnitCost,
        prevDelta: r.prevDelta,
        prevDeltaPct: r.prevDeltaPct,
        costRatioPct: r.costRatioPct,
        isAssembledFromComponents: !!r.isAssembledFromComponents,
        componentBreakdown: r.componentBreakdown || [],
        sourceMainItemName: r.sourceMainItemName || ''
      }))
    });
  });

  // 複数ロットが存在する品目（比較価値が高い品目）を先頭に、総仕入額降順で並べる
  itemTrends.sort((a, b) => {
    if ((b.lotCount > 1 ? 1 : 0) !== (a.lotCount > 1 ? 1 : 0)) {
      return (b.lotCount > 1 ? 1 : 0) - (a.lotCount > 1 ? 1 : 0);
    }
    return b.totalCost - a.totalCost;
  });

  // 全体サマリーKPI（合成セット行は二重計上防止のため実入庫行のみで総額・数量を集計）
  const actualRows = rows.filter(r => !r.isAssembledFromComponents);
  const assembledRowsCount = rows.length - actualRows.length;
  const totalLandedAmount = actualRows.reduce((s, r) => s + r.totalLandedCost, 0);
  const totalAllocatedAmount = actualRows.reduce((s, r) => s + r.totalAllocatedCost, 0);
  const totalQuantity = actualRows.reduce((s, r) => s + r.qty, 0);
  const avgAllocatedRatioPct = totalLandedAmount > 0
    ? Math.round((totalAllocatedAmount / totalLandedAmount) * 1000) / 10
    : 0;
  const rowsWithCostRatio = actualRows.filter(r => r.costRatioPct !== null);
  const weightedRefSales = rowsWithCostRatio.reduce((s, r) => s + (r.refSalesPrice * r.qty), 0);
  const weightedRefCost = rowsWithCostRatio.reduce((s, r) => s + r.totalLandedCost, 0);
  const avgCostRatioPct = weightedRefSales > 0
    ? Math.round((weightedRefCost / weightedRefSales) * 1000) / 10
    : null;

  const maxSpreadItem = itemTrends.filter(t => t.lotCount >= 2).sort((a, b) => b.costSpread - a.costSpread)[0] || null;

  return {
    summary: {
      lotCount: lotSet.size,
      rowCount: actualRows.length,
      assembledRowCount: assembledRowsCount,
      itemCount: itemTrends.length,
      totalQuantity,
      totalLandedAmount,
      totalAllocatedAmount,
      avgAllocatedRatioPct,
      avgCostRatioPct,
      maxSpreadItem: maxSpreadItem ? {
        itemName: maxSpreadItem.itemName,
        sku: maxSpreadItem.sku,
        costSpread: maxSpreadItem.costSpread,
        minCost: maxSpreadItem.minCost,
        maxCost: maxSpreadItem.maxCost
      } : null
    },
    rows,
    itemTrends
  };
}

// ==========================================================================
// 4. 出張・地域・取引先 統合分析エンジン
// ==========================================================================

/**
 * 経費データから出張候補期間（旅費交通費等が近接発生した期間クラスタ）を動的抽出する
 * （特定日付や特定地域のハードコード禁止）
 */
export function extractTripPeriodCandidates(expenses = [], maxGapDays = 2) {
  const safeExp = Array.isArray(expenses) ? expenses : [];
  const travelRows = safeExp
    .filter(e => e && e.date && isTravelDemoExpenseCategory(e.category))
    .map(e => {
      const geo = resolveGeoLocation({
        text: `${e.payee || ''} ${e.note || ''} ${e.memo || ''} ${e.location || ''}`
      });
      return {
        id: e.id || '',
        date: String(e.date).slice(0, 10),
        amount: Number(e.amount) || 0,
        category: String(e.category || ''),
        payee: String(e.payee || ''),
        note: String(e.note || ''),
        region: geo.region,
        prefecture: geo.prefecture
      };
    })
    .filter(e => parseYmdToUtcMs(e.date) !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (travelRows.length === 0) return [];

  const clusters = [];
  let cur = null;

  travelRows.forEach(row => {
    if (!cur) {
      cur = { startDate: row.date, endDate: row.date, items: [row] };
      return;
    }
    const gap = diffDaysYmd(cur.endDate, row.date);
    if (gap !== null && gap <= maxGapDays) {
      cur.endDate = row.date;
      cur.items.push(row);
    } else {
      clusters.push(cur);
      cur = { startDate: row.date, endDate: row.date, items: [row] };
    }
  });
  if (cur) clusters.push(cur);

  // 旅費交通費を含むクラスタ、または複数日・複数件のクラスタを優先提示
  return clusters
    .map((cl, idx) => {
      const totalAmount = cl.items.reduce((s, x) => s + x.amount, 0);
      const travelCount = cl.items.filter(x => String(x.category).includes('旅費')).length;
      const prefCounts = new Map();
      const regionCounts = new Map();
      cl.items.forEach(x => {
        if (x.prefecture && x.prefecture !== '未設定') {
          prefCounts.set(x.prefecture, (prefCounts.get(x.prefecture) || 0) + 1);
        }
        if (x.region && x.region !== '未設定') {
          regionCounts.set(x.region, (regionCounts.get(x.region) || 0) + 1);
        }
      });
      const topPref = Array.from(prefCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '未設定';
      const topRegion = Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '未設定';
      const days = (diffDaysYmd(cl.startDate, cl.endDate) || 0) + 1;
      const dateLabel = cl.startDate === cl.endDate ? cl.startDate : `${cl.startDate} 〜 ${cl.endDate}`;
      return {
        id: `trip_${idx}_${cl.startDate}_${cl.endDate}`,
        startDate: cl.startDate,
        endDate: cl.endDate,
        days,
        itemCount: cl.items.length,
        travelCount,
        totalAmount,
        primaryPrefecture: topPref,
        primaryRegion: topRegion,
        label: `${dateLabel}（${topPref !== '未設定' ? topPref : 'エリア未設定'} / ${cl.items.length}件・¥${Math.round(totalAmount).toLocaleString()}）`
      };
    })
    .filter(c => c.travelCount > 0 || c.itemCount >= 2)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * 取引先別サマリー・地域別売上経費バランス・出張＆後追い売上連動を一括算出する
 */
export function buildBusinessAnalytics({
  docs = [],
  clients = [],
  expenses = [],
  manualJournals = [],
  period = null,
  includeZeroDocs = true,
  tripStart = '',
  tripEnd = '',
  followUpDays = 60,
  filterRegion = 'all',
  filterPrefecture = 'all',
  filterClient = 'all'
} = {}) {
  const safeDocs = Array.isArray(docs) ? docs : [];
  const safeClients = Array.isArray(clients) ? clients : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const safeJournals = Array.isArray(manualJournals) ? manualJournals : [];

  const periodStart = (period && period.start) ? String(period.start).slice(0, 10) : '';
  const periodEnd = (period && period.end) ? String(period.end).slice(0, 10) : '';

  // 取引先マスタの高速ルックアップ（名前・IDで住所・郵便番号を補完）
  const clientById = new Map();
  const clientByName = new Map();
  safeClients.forEach(c => {
    if (!c) return;
    if (c.id) clientById.set(String(c.id), c);
    if (c.name) clientByName.set(normalizeLookupName(c.name), c);
  });

  // 全有効確定伝票の正規化（出張後追い分析では期間外の後追い伝票も必要なため全期間ベースで一度正規化）
  const allNormalizedDocs = [];
  safeDocs.forEach(rawDoc => {
    const doc = (typeof normalizeInvoiceDoc === 'function') ? normalizeInvoiceDoc(rawDoc) : rawDoc;
    if (!doc || doc.isCancelled || doc.isSuperseded || doc.docType === 'estimate') return;
    if (doc.isIssued === false) return;

    const rawInner = (rawDoc && rawDoc.fullDoc) ? rawDoc.fullDoc : (rawDoc || {});
    const clientObj = rawInner.client || doc.client || {};
    const clientName = String(doc.clientName || clientObj.name || '名称未設定').trim() || '名称未設定';
    const masterClient =
      (clientObj.id && clientById.get(String(clientObj.id))) ||
      clientByName.get(normalizeLookupName(clientName)) ||
      null;

    const address = String(clientObj.address || (masterClient && masterClient.address) || '').trim();
    const zip = String(clientObj.zip || (masterClient && masterClient.zip) || '').trim();
    const currency = String(rawInner.currency || (rawDoc && rawDoc.currency) || 'JPY').trim().toUpperCase();
    const docLang = String(rawInner.docLang || (rawDoc && rawDoc.docLang) || 'ja').trim().toLowerCase();

    const geo = resolveGeoLocation({
      address,
      zip,
      text: `${clientName} ${address}`,
      currency,
      docLang
    });

    const items = Array.isArray(doc.items) ? doc.items : [];
    let totalQty = 0;
    const endUsersSet = new Set();
    const topEndUser = String(rawInner.endUserName || (rawDoc && rawDoc.endUserName) || clientObj.endUserName || '').trim();
    if (topEndUser) endUsersSet.add(topEndUser);
    items.forEach(it => {
      if (!it) return;
      const itName = String(it.name || '');
      const unitPrice = Number(it.unitPrice) || 0;
      if (unitPrice >= 0 && !/値引|割引|相殺|調整/.test(itName)) {
        totalQty += Math.max(0, Number(it.quantity) || 0);
      }
      if (it.endUserName && String(it.endUserName).trim()) {
        endUsersSet.add(String(it.endUserName).trim());
      }
    });

    const sales = Number(doc.subtotal) || 0;
    const cogs = Number(doc.costTotal) || 0;
    const grossProfit = sales - cogs;
    const isZeroDoc = (sales === 0);

    allNormalizedDocs.push({
      id: doc.id,
      docNumber: String(doc.docNumber || doc.id || '').trim(),
      docType: doc.docType || 'invoice',
      issueDate: String(doc.issueDate || '').slice(0, 10),
      title: String(rawInner.title || (rawDoc && rawDoc.title) || '').trim(),
      clientName,
      address,
      zip,
      region: geo.region,
      prefecture: geo.prefecture,
      sales,
      cogs,
      grossProfit,
      grossMarginPct: sales > 0 ? Math.round((grossProfit / sales) * 1000) / 10 : null,
      totalQty,
      endUsers: Array.from(endUsersSet),
      isZeroDoc,
      isPaid: !!doc.isPaid
    });
  });

  // 期間・0円伝票フィルタ適用後の伝票リスト
  const scopedDocs = allNormalizedDocs.filter(d => {
    if (!includeZeroDocs && d.isZeroDoc) return false;
    if (periodStart || periodEnd) {
      return isDateInRange(d.issueDate, periodStart, periodEnd);
    }
    return true;
  });

  // ------------------------------------------------------------------------
  // (A) 取引先別 売上・粗利サマリー
  // ------------------------------------------------------------------------
  const clientMap = new Map();
  scopedDocs.forEach(d => {
    const key = normalizeLookupName(d.clientName) || 'unknown';
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        clientKey: key,
        clientName: d.clientName,
        region: d.region,
        prefecture: d.prefecture,
        address: d.address,
        sales: 0,
        cogs: 0,
        grossProfit: 0,
        grossMarginPct: null,
        docCount: 0,
        totalQty: 0,
        firstDate: d.issueDate,
        lastDate: d.issueDate,
        endUsersSet: new Set(),
        titlesSet: new Set(),
        docs: []
      });
    }
    const c = clientMap.get(key);
    c.sales += d.sales;
    c.cogs += d.cogs;
    c.grossProfit += d.grossProfit;
    c.docCount += 1;
    c.totalQty += d.totalQty;
    if (d.issueDate && (!c.firstDate || d.issueDate < c.firstDate)) c.firstDate = d.issueDate;
    if (d.issueDate && (!c.lastDate || d.issueDate > c.lastDate)) c.lastDate = d.issueDate;
    if (c.region === '未設定' && d.region !== '未設定') {
      c.region = d.region;
      c.prefecture = d.prefecture;
      c.address = d.address;
    }
    d.endUsers.forEach(eu => c.endUsersSet.add(eu));
    if (d.title) c.titlesSet.add(d.title);
    c.docs.push(d);
  });

  const clientSummary = Array.from(clientMap.values()).map(c => {
    c.docs.sort((a, b) => b.issueDate.localeCompare(a.issueDate));
    return {
      clientKey: c.clientKey,
      clientName: c.clientName,
      region: c.region,
      prefecture: c.prefecture,
      address: c.address,
      sales: Math.round(c.sales),
      cogs: Math.round(c.cogs),
      grossProfit: Math.round(c.grossProfit),
      grossMarginPct: c.sales > 0 ? Math.round((c.grossProfit / c.sales) * 1000) / 10 : null,
      docCount: c.docCount,
      totalQty: c.totalQty,
      firstDate: c.firstDate || '',
      lastDate: c.lastDate || '',
      isRepeat: c.docCount >= 2,
      endUsers: Array.from(c.endUsersSet),
      endUserCount: c.endUsersSet.size,
      titles: Array.from(c.titlesSet),
      docs: c.docs
    };
  }).sort((a, b) => b.sales - a.sales);

  // ------------------------------------------------------------------------
  // (B) 移動・デモ関連経費の正規化（expenses + manual_journals の該当勘定科目）
  // ------------------------------------------------------------------------
  const allTravelExpenses = [];
  safeExpenses.forEach(e => {
    if (!e) return;
    if (!isTravelDemoExpenseCategory(e.category)) return;
    const dt = String(e.date || '').slice(0, 10);
    const amount = Number(e.amount) || 0;
    if (amount === 0) return;
    const geo = resolveGeoLocation({
      text: `${e.payee || ''} ${e.note || ''} ${e.memo || ''} ${e.location || ''}`
    });
    allTravelExpenses.push({
      id: e.id || '',
      source: 'expense',
      date: dt,
      category: String(e.category || 'その他'),
      payee: String(e.payee || '').trim() || '未設定',
      note: String(e.note || '').trim(),
      claimant: String(e.claimant || '').trim(),
      amount: Math.round(amount),
      region: geo.region,
      prefecture: geo.prefecture
    });
  });

  // 振替仕訳（manual_journals）にも旅費交通費・車両費・接待交際費が直接計上されていれば取り込む
  safeJournals.forEach(j => {
    if (!j || j.sourceType === 'expense') return; // expenses と二重計上しない
    const dt = String(j.date || '').slice(0, 10);
    const desc = String(j.description || '');
    (j.debitLines || []).forEach((ln, idx) => {
      if (!ln || !isTravelDemoExpenseCategory(ln.accountName)) return;
      const amount = Number(ln.amount) || 0;
      if (amount === 0) return;
      const geo = resolveGeoLocation({ text: `${desc} ${ln.subAccount || ''}` });
      allTravelExpenses.push({
        id: `${j.id || 'jnl'}_${idx}`,
        source: 'journal',
        date: dt,
        category: String(ln.accountName || ''),
        payee: String(ln.subAccount || '振替仕訳'),
        note: desc,
        claimant: '',
        amount: Math.round(amount),
        region: geo.region,
        prefecture: geo.prefecture
      });
    });
  });

  const scopedTravelExpenses = allTravelExpenses.filter(e => {
    if (periodStart || periodEnd) {
      return isDateInRange(e.date, periodStart, periodEnd);
    }
    return true;
  });

  // 地域別 / 都道府県別 集計ビルダー
  const aggregateGeoBuckets = (mode) => {
    const map = new Map();
    const getOrCreate = (key, region, prefecture) => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: key,
          region,
          prefecture,
          sales: 0,
          cogs: 0,
          grossProfit: 0,
          grossMarginPct: null,
          docCount: 0,
          clientNamesSet: new Set(),
          travelExpense: 0,
          vehicleExpense: 0,
          entertainExpense: 0,
          otherDemoExpense: 0,
          totalExpense: 0,
          expenseCount: 0,
          netContribution: 0,
          expenseToSalesPct: null,
          roiMultiple: null
        });
      }
      return map.get(key);
    };

    scopedDocs.forEach(d => {
      const key = mode === 'region' ? d.region : d.prefecture;
      const b = getOrCreate(key, d.region, d.prefecture);
      b.sales += d.sales;
      b.cogs += d.cogs;
      b.grossProfit += d.grossProfit;
      b.docCount += 1;
      b.clientNamesSet.add(d.clientName);
    });

    scopedTravelExpenses.forEach(e => {
      const key = mode === 'region' ? e.region : e.prefecture;
      const b = getOrCreate(key, e.region, e.prefecture);
      b.totalExpense += e.amount;
      b.expenseCount += 1;
      if (e.category.includes('旅費') || e.category.includes('交通')) b.travelExpense += e.amount;
      else if (e.category.includes('車両')) b.vehicleExpense += e.amount;
      else if (e.category.includes('交際') || e.category.includes('会議')) b.entertainExpense += e.amount;
      else b.otherDemoExpense += e.amount;
    });

    const list = Array.from(map.values()).map(b => {
      b.sales = Math.round(b.sales);
      b.cogs = Math.round(b.cogs);
      b.grossProfit = Math.round(b.grossProfit);
      b.totalExpense = Math.round(b.totalExpense);
      b.netContribution = b.grossProfit - b.totalExpense;
      b.grossMarginPct = b.sales > 0 ? Math.round((b.grossProfit / b.sales) * 1000) / 10 : null;
      b.expenseToSalesPct = b.sales > 0 ? Math.round((b.totalExpense / b.sales) * 1000) / 10 : null;
      b.roiMultiple = b.totalExpense > 0 ? Math.round((b.sales / b.totalExpense) * 10) / 10 : null;
      b.clientCount = b.clientNamesSet.size;
      delete b.clientNamesSet;
      return b;
    });

    if (mode === 'region') {
      list.sort((a, b) => {
        const ia = REGION_ORDER.indexOf(a.key);
        const ib = REGION_ORDER.indexOf(b.key);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    } else {
      list.sort((a, b) => (b.sales + b.totalExpense) - (a.sales + a.totalExpense));
    }
    return list;
  };

  const regionSummary = aggregateGeoBuckets('region');
  const prefectureSummary = aggregateGeoBuckets('prefecture');

  // ------------------------------------------------------------------------
  // (C) 出張期間と「直後〜後追い」売上の連動分析
  // ------------------------------------------------------------------------
  const tripCandidates = extractTripPeriodCandidates(safeExpenses, 2);

  // 未指定時は最新の出張候補をデフォルト提案（存在しない場合は空で安全に0表示）
  let effectiveTripStart = String(tripStart || '').slice(0, 10);
  let effectiveTripEnd = String(tripEnd || '').slice(0, 10);
  if (!effectiveTripStart && !effectiveTripEnd && tripCandidates.length > 0) {
    effectiveTripStart = tripCandidates[0].startDate;
    effectiveTripEnd = tripCandidates[0].endDate;
  }
  if (effectiveTripStart && !effectiveTripEnd) effectiveTripEnd = effectiveTripStart;
  if (!effectiveTripStart && effectiveTripEnd) effectiveTripStart = effectiveTripEnd;
  if (effectiveTripStart && effectiveTripEnd && effectiveTripStart > effectiveTripEnd) {
    const tmp = effectiveTripStart;
    effectiveTripStart = effectiveTripEnd;
    effectiveTripEnd = tmp;
  }

  const safeFollowUpDays = Math.max(0, Math.min(365, Number(followUpDays) || 0));
  const followUpStart = effectiveTripEnd ? addDaysYmd(effectiveTripEnd, 1) : '';
  const followUpEnd = effectiveTripEnd ? addDaysYmd(effectiveTripEnd, safeFollowUpDays) : '';

  const matchesTripScope = (item) => {
    if (filterRegion && filterRegion !== 'all' && item.region !== filterRegion) return false;
    if (filterPrefecture && filterPrefecture !== 'all' && item.prefecture !== filterPrefecture) return false;
    if (filterClient && filterClient !== 'all' && item.clientName && item.clientName !== filterClient) return false;
    return true;
  };

  let tripExpenses = [];
  let duringDocs = [];
  let followUpDocs = [];

  if (effectiveTripStart && effectiveTripEnd) {
    tripExpenses = allTravelExpenses.filter(e => {
      if (!isDateInRange(e.date, effectiveTripStart, effectiveTripEnd)) return false;
      if (filterRegion && filterRegion !== 'all' && e.region !== filterRegion && e.region !== '未設定') return false;
      if (filterPrefecture && filterPrefecture !== 'all' && e.prefecture !== filterPrefecture && e.prefecture !== '未設定') return false;
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));

    allNormalizedDocs.forEach(d => {
      if (!includeZeroDocs && d.isZeroDoc) return;
      if (!matchesTripScope(d)) return;
      if (isDateInRange(d.issueDate, effectiveTripStart, effectiveTripEnd)) {
        duringDocs.push({ ...d, phase: 'during', daysAfterTrip: 0 });
      } else if (safeFollowUpDays > 0 && followUpStart && followUpEnd && isDateInRange(d.issueDate, followUpStart, followUpEnd)) {
        const lag = diffDaysYmd(effectiveTripEnd, d.issueDate);
        followUpDocs.push({ ...d, phase: 'followup', daysAfterTrip: lag !== null ? lag : 0 });
      }
    });
    duringDocs.sort((a, b) => a.issueDate.localeCompare(b.issueDate));
    followUpDocs.sort((a, b) => a.issueDate.localeCompare(b.issueDate));
  }

  const sumDocs = (arr) => ({
    docCount: arr.length,
    sales: Math.round(arr.reduce((s, d) => s + d.sales, 0)),
    cogs: Math.round(arr.reduce((s, d) => s + d.cogs, 0)),
    grossProfit: Math.round(arr.reduce((s, d) => s + d.grossProfit, 0)),
    qty: arr.reduce((s, d) => s + d.totalQty, 0)
  });

  const duringMetrics = sumDocs(duringDocs);
  const followUpMetrics = sumDocs(followUpDocs);
  const combinedMetrics = {
    docCount: duringMetrics.docCount + followUpMetrics.docCount,
    sales: duringMetrics.sales + followUpMetrics.sales,
    cogs: duringMetrics.cogs + followUpMetrics.cogs,
    grossProfit: duringMetrics.grossProfit + followUpMetrics.grossProfit,
    qty: duringMetrics.qty + followUpMetrics.qty
  };

  const tripExpenseTotal = Math.round(tripExpenses.reduce((s, e) => s + e.amount, 0));
  const tripExpenseBreakdown = {
    travel: Math.round(tripExpenses.filter(e => e.category.includes('旅費') || e.category.includes('交通')).reduce((s, e) => s + e.amount, 0)),
    vehicle: Math.round(tripExpenses.filter(e => e.category.includes('車両')).reduce((s, e) => s + e.amount, 0)),
    entertain: Math.round(tripExpenses.filter(e => e.category.includes('交際') || e.category.includes('会議')).reduce((s, e) => s + e.amount, 0)),
    other: Math.round(tripExpenses.filter(e => !e.category.includes('旅費') && !e.category.includes('交通') && !e.category.includes('車両') && !e.category.includes('交際') && !e.category.includes('会議')).reduce((s, e) => s + e.amount, 0))
  };

  const tripImpact = {
    tripStart: effectiveTripStart,
    tripEnd: effectiveTripEnd,
    tripDays: (effectiveTripStart && effectiveTripEnd) ? ((diffDaysYmd(effectiveTripStart, effectiveTripEnd) || 0) + 1) : 0,
    followUpDays: safeFollowUpDays,
    followUpStart,
    followUpEnd,
    tripExpenseCount: tripExpenses.length,
    tripExpenseTotal,
    tripExpenseBreakdown,
    during: duringMetrics,
    followUp: followUpMetrics,
    combined: combinedMetrics,
    netAfterTripExpense: combinedMetrics.grossProfit - tripExpenseTotal,
    salesToExpenseRatio: tripExpenseTotal > 0 ? Math.round((combinedMetrics.sales / tripExpenseTotal) * 10) / 10 : null,
    grossProfitToExpenseRatio: tripExpenseTotal > 0 ? Math.round((combinedMetrics.grossProfit / tripExpenseTotal) * 10) / 10 : null,
    tripExpenses,
    timelineDocs: [...duringDocs, ...followUpDocs]
  };

  // 全体KPIサマリー
  const totalSales = Math.round(scopedDocs.reduce((s, d) => s + d.sales, 0));
  const totalCogs = Math.round(scopedDocs.reduce((s, d) => s + d.cogs, 0));
  const totalGrossProfit = totalSales - totalCogs;
  const totalTravelDemoExpense = Math.round(scopedTravelExpenses.reduce((s, e) => s + e.amount, 0));

  return {
    kpi: {
      totalSales,
      totalCogs,
      totalGrossProfit,
      grossMarginPct: totalSales > 0 ? Math.round((totalGrossProfit / totalSales) * 1000) / 10 : null,
      clientCount: clientSummary.length,
      repeatClientCount: clientSummary.filter(c => c.isRepeat).length,
      docCount: scopedDocs.length,
      totalTravelDemoExpense,
      travelDemoExpenseCount: scopedTravelExpenses.length,
      netAfterTravelExpense: totalGrossProfit - totalTravelDemoExpense
    },
    clientSummary,
    regionSummary,
    prefectureSummary,
    tripCandidates,
    tripImpact,
    availableRegions: Array.from(new Set([...regionSummary.map(r => r.key)])),
    availablePrefectures: Array.from(new Set([...prefectureSummary.map(p => p.key)])),
    availableClients: clientSummary.map(c => c.clientName)
  };
}
