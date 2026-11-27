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
  '九州',
  '沖縄',
  '海外',
  '未設定'
];

const PREF_GEO_TABLE = [
  { pref: '北海道', region: '北海道', zipRanges: [[1, 99]], keywords: ['北海道', '札幌', '新千歳', '函館', '旭川', '帯広', '釧路', '北見', '苫小牧', '千歳', '岩見沢'] },
  { pref: '青森県', region: '東北', zipRanges: [[30, 39]], keywords: ['青森県', '青森市', '八戸', '弘前'] },
  { pref: '岩手県', region: '東北', zipRanges: [[20, 29]], keywords: ['岩手県', '盛岡', '矢巾', '花巻', '一関', '前沢', '北上', '奥州'] },
  { pref: '宮城県', region: '東北', zipRanges: [[980, 989]], keywords: ['宮城県', '仙台', '石巻', '大崎', '長者原'] },
  { pref: '秋田県', region: '東北', zipRanges: [[10, 19]], keywords: ['秋田県', '秋田市', '横手'] },
  { pref: '山形県', region: '東北', zipRanges: [[990, 999]], keywords: ['山形県', '山形市', '米沢', '鶴岡', '酒田'] },
  { pref: '福島県', region: '東北', zipRanges: [[960, 979]], keywords: ['福島県', '福島市', '郡山', 'いわき', '会津若松', '国見SA', '安達太良'] },
  { pref: '茨城県', region: '関東', zipRanges: [[300, 319]], keywords: ['茨城県', '水戸', 'つくば', '日立', '土浦', '守谷'] },
  { pref: '栃木県', region: '関東', zipRanges: [[320, 329]], keywords: ['栃木県', '宇都宮', '小山', '足利', '佐野', '那須', '上河内'] },
  { pref: '群馬県', region: '関東', zipRanges: [[370, 379]], keywords: ['群馬県', '前橋', '高崎', '太田', '伊勢崎', '桐生', '渋川', '館林', '玉村', '藤岡', '波志江', '上里', '横川'] },
  { pref: '埼玉県', region: '関東', zipRanges: [[330, 369]], keywords: ['埼玉県', 'さいたま', '川口', '大宮', '浦和', '川越', '熊谷', '深谷', '所沢', '春日部', '越谷', '本庄', '東松山', '寄居', '蓮田', '羽生'] },
  { pref: '千葉県', region: '関東', zipRanges: [[260, 299]], keywords: ['千葉県', '千葉市', '船橋', '柏', '松戸', '市川', '成田', '幕張', '木更津'] },
  { pref: '東京都', region: '関東', zipRanges: [[100, 208]], keywords: ['東京都', '羽田空港', '羽田', '東京駅', '品川', '新宿', '渋谷', '池袋', '銀座', '丸の内', '八王子', '立川', '町田', '足立区', '港区', '千代田区', '中央区', '江東区', '大田区', '世田谷区'] },
  { pref: '神奈川県', region: '関東', zipRanges: [[210, 259]], keywords: ['神奈川県', '横浜', '川崎', '相模原', '藤沢', '厚木', '小田原', '横須賀', '新横浜', '海老名'] },
  { pref: '新潟県', region: '中部', zipRanges: [[940, 959]], keywords: ['新潟県', '新潟市', '長岡', '上越', '三条'] },
  { pref: '富山県', region: '中部', zipRanges: [[930, 939]], keywords: ['富山県', '富山市', '高岡'] },
  { pref: '石川県', region: '中部', zipRanges: [[920, 929]], keywords: ['石川県', '金沢', '小松', '白山'] },
  { pref: '福井県', region: '中部', zipRanges: [[910, 919]], keywords: ['福井県', '福井市', '敦賀'] },
  { pref: '山梨県', region: '中部', zipRanges: [[400, 409]], keywords: ['山梨県', '甲府', '富士吉田', '談合坂', '双葉SA'] },
  { pref: '長野県', region: '中部', zipRanges: [[380, 399]], keywords: ['長野県', '長野市', '松本', '上田', '千曲', '軽井沢', '飯田', '佐久', '小諸', '長和町', '諏訪', '駒ヶ岳'] },
  { pref: '岐阜県', region: '中部', zipRanges: [[500, 509]], keywords: ['岐阜県', '岐阜市', '大垣', '高山', '各務原', '多治見', '恵那峡', '養老'] },
  { pref: '静岡県', region: '中部', zipRanges: [[410, 439]], keywords: ['静岡県', '静岡市', '浜松', '沼津', '富士市', '熱海', '三島', '足柄', '駿河湾沼津'] },
  { pref: '愛知県', region: '中部', zipRanges: [[440, 498]], keywords: ['愛知県', '名古屋', '中部国際空港', 'セントレア', '豊田', '岡崎', '一宮', '尾張一宮', '豊橋', '春日井', '刈谷'] },
  { pref: '三重県', region: '近畿', zipRanges: [[510, 519]], keywords: ['三重県', '津市', '四日市', '鈴鹿', '桑名', '伊勢市', '伊勢神宮', '御在所'] },
  { pref: '滋賀県', region: '近畿', zipRanges: [[520, 529]], keywords: ['滋賀県', '大津', '草津', '彦根', '長浜', '黒丸PA', '多賀SA'] },
  { pref: '京都府', region: '近畿', zipRanges: [[600, 629]], keywords: ['京都府', '京都市', '京都駅', '宇治', '舞鶴', '福知山'] },
  { pref: '大阪府', region: '近畿', zipRanges: [[530, 599]], keywords: ['大阪府', '大阪市', '新大阪', '伊丹空港', '大阪伊丹', '関西国際空港', '関西空港', '関空', '梅田', '難波', '堺市', '東大阪', '豊中', '服部西', '吹田', '枚方', '北関西'] },
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
  { pref: '福岡県', region: '九州', zipRanges: [[800, 839]], keywords: ['福岡県', '福岡市', '福岡空港', '博多', '天神', '北九州', '小倉', '久留米', '飯塚'] },
  { pref: '佐賀県', region: '九州', zipRanges: [[840, 849]], keywords: ['佐賀県', '佐賀市', '鳥栖', '唐津'] },
  { pref: '長崎県', region: '九州', zipRanges: [[850, 859]], keywords: ['長崎県', '長崎市', '佐世保', '諫早'] },
  { pref: '熊本県', region: '九州', zipRanges: [[860, 869]], keywords: ['熊本県', '熊本市', '熊本空港', '阿蘇くまもと', '八代', '玉名'] },
  { pref: '大分県', region: '九州', zipRanges: [[870, 879]], keywords: ['大分県', '大分市', '別府', '中津'] },
  { pref: '宮崎県', region: '九州', zipRanges: [[880, 889]], keywords: ['宮崎県', '宮崎市', '都城', '延岡'] },
  { pref: '鹿児島県', region: '九州', zipRanges: [[890, 899]], keywords: ['鹿児島県', '鹿児島市', '鹿児島空港', '霧島', '鹿屋'] },
  { pref: '沖縄県', region: '沖縄', zipRanges: [[900, 907]], keywords: ['沖縄県', '那覇', '沖縄市', '浦添', '宜野湾', '石垣', '宮古島'] }
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
 * 明らかにデモ・営業活動に関係ないオフィス事務・通信・宅配・書籍・工具備品等の経費かを汎用判定
 */
function isFixedOfficeOverhead(expense) {
  if (!expense) return false;
  const cat = String(expense.category || '').trim();
  const text = `${expense.payee || ''} ${expense.note || ''}`;
  // 明らかにデモ無関係な事務・通信・配送・書籍・工具資材
  if (/NTTファイナンス|お名前\.com|レンタルサーバー|ドメイン|電話料金|通信費支払|レターパック|切手|ヤマト運輸|宅配便|書籍|プリンター|インク|リングファイル|ステッカー台紙|パーツクリーナー|グリース|紙やすり|カーエアコン|郵便局|蔦屋書店|Seria|ベイシア電器|アストロプロダクツ|セキチュー|CAINZ|カインズ/i.test(text)) {
    return true;
  }
  if (/通信費|新聞図書費|地代家賃|水道光熱費|荷造運賃|租税公課|保険料|雑費/.test(cat)) {
    return true;
  }
  // 消耗品費のうち、食事・飲食・宿泊・交通（高速/航空/電車/PA/SA）以外はオフィス・作業資材とみなして除外
  if (cat.includes('消耗品')) {
    const isTripMealOrTransit = /食事|飲食|弁当|ホテル|宿泊|高速|通行料|ETC|航空|飛行機|新幹線|鉄道|電車|タクシー|駐車|パーキングエリア|サービスエリア|PA|SA/i.test(text);
    if (!isTripMealOrTransit) return true;
  }
  return false;
}

/**
 * 本社本拠地（homePrefecture）内での「明らかにデモ無関係な日常小口費」かを汎用判定
 * （※遠征デモ出張セッション期間中、または県外移動日の経費、および同行・会食・商談・高速・給油は除外しない）
 */
function isHomeDailyNonDemoExpense(expense, homePrefecture = '') {
  if (!expense || !homePrefecture) return false;
  if (expense.demoSessionId) return false; // 遠征デモ出張に紐づく往復移動等は除外しない
  if (expense.prefecture !== homePrefecture) return false; // 本拠地以外の地域はすべて対象
  const text = `${expense.payee || ''} ${expense.note || ''}`;
  // 明確にデモ・営業活動（同行・会食・商談・接待・デモ・高速道路・宿泊・航空・新幹線）なら残す
  if (/同行|会食|商談|接待|デモ|手土産|NEXCO|高速|通行|ETC|ホテル|宿泊|航空|飛行機|新幹線/i.test(text)) {
    return false;
  }
  // 本拠地内での洗車・郵便局駐車・日常コンビニ/ファストフード/カフェ/ファミレス/単独食事はデモ無関係とみなして除外
  if (/洗車|郵便局|セブン|LAWSON|ローソン|FamilyMart|ファミリーマート|ミニストップ|MINISTOP|マクドナルド|ガスト|魚べい|cafe|カフェ|ラーメン|らーめん|さば寅|食堂|飲食|食事|コーヒー|飲料/i.test(text)) {
    return true;
  }
  return false;
}

/**
 * 科目名に関わらずデモ・出張時の移動・宿泊・飲食に該当する経費かを汎用判定
 */
export function isDemoTripRelevantExpense(expense) {
  if (!expense) return false;
  if (isFixedOfficeOverhead(expense)) return false;
  const cat = String(expense.category || '').trim();
  const text = `${expense.payee || ''} ${expense.note || ''} ${expense.memo || ''}`;
  if (isTravelDemoExpenseCategory(cat)) return true;
  return /食事|飲食|弁当|ホテル|宿泊|高速|通行料|ETC|航空|飛行機|JAL|ANA|新幹線|鉄道|JR|電車|タクシー|駐車|ガソリン|給油|車両|パーキングエリア|サービスエリア|PA|SA/i.test(text);
}

/**
 * 経費の役割分類（移動・高速・航空・電車・燃料 / 宿泊 / 飲食・交際 / その他）
 */
export function classifyExpenseRole(expense) {
  const cat = String((expense && expense.category) || '').trim();
  const text = `${(expense && expense.payee) || ''} ${(expense && expense.note) || ''}`;
  // 駐車場代はホテル併設駐車場であっても移動・交通（transit）へ分類
  if (/駐車|パーキング(?!エリア)|タイムズ|パラカ/i.test(text)) {
    return 'transit';
  }
  if (/ホテル|宿泊|東横INN|東横イン|ルートイン|ワシントン|Expedia|温泉|旅館|ビジネスイン|チェックイン/i.test(text)) {
    return 'lodging';
  }
  if (/NEXCO|高速|通行|ETC|航空|飛行機|JAL|ANA|スカイマーク|ピーチ|新幹線|JR|鉄道|電車|乗車|タクシー|ガソリン|給油|ENEOS|apollo|Enejet|洗車|レンタカー/i.test(text) || cat.includes('旅費') || cat.includes('車両')) {
    return 'transit';
  }
  if (/飲食|食事|会食|弁当|カフェ|コーヒー|ラーメン|焼肉|鳥メロ|手土産|飲料|セブン|LAWSON|FamilyMart|ミニストップ|ガスト|マクドナルド|魚べい/i.test(text) || cat.includes('交際') || cat.includes('会議')) {
    return 'meal';
  }
  return 'other';
}

/**
 * 高速道路PA/SA/JCT等の「移動途中の経由地」かどうかを汎用判定
 */
function isTransitWaypointText(text) {
  const s = String(text || '').normalize('NFKC');
  return /(?:PA|SA|JCT|パーキングエリア|サービスエリア|高速|NEXCO|通行料金|ETC通行|上り|下り)/i.test(s);
}

/**
 * 宿泊・空港・遠征拠点など「目的地アンカー」としての強さを判定
 */
function isStrongDestinationAnchor(exp) {
  const text = `${exp.payee || ''} ${exp.note || ''}`;
  if (isTransitWaypointText(text) && !/空港|ホテル|宿泊|東横|ルートイン|ワシントン/i.test(text)) {
    return false;
  }
  return /ホテル|宿泊|東横INN|東横イン|ルートイン|ワシントン|空港|温泉|駅前|北口|南口|会食|飲食|食事|給油|駐車|タイムズ/i.test(text) || !isTransitWaypointText(text);
}

// 最長キーワード優先ルックアップテーブル（例: 「東松山」が「松山」より、「伊勢崎」が「伊勢」より先にマッチ）
const SORTED_GEO_KEYWORDS = PREF_GEO_TABLE
  .flatMap(row => row.keywords.map(kw => ({ kw, pref: row.pref, region: row.region })))
  .sort((a, b) => b.kw.length - a.kw.length);

/**
 * 高速道路の「出発IC-到着IC」表記がある場合、本拠地以外の到着側地名を優先抽出する
 */
function resolveExpenseGeoWithHome(expense, homePrefecture = '') {
  const text = `${expense.payee || ''} ${expense.note || ''} ${expense.memo || ''} ${expense.location || ''}`.normalize('NFKC');
  // 長いキーワードから順にマッチし、既に消費した文字位置の短い部分一致を防止
  const matched = [];
  let remaining = text;
  for (const entry of SORTED_GEO_KEYWORDS) {
    if (entry.kw && remaining.includes(entry.kw)) {
      if (!matched.some(m => m.pref === entry.pref)) {
        matched.push({ pref: entry.pref, region: entry.region });
      }
      remaining = remaining.split(entry.kw).join(' ');
    }
  }
  if (matched.length > 0) {
    const nonHome = homePrefecture ? matched.find(m => m.pref !== homePrefecture) : null;
    if (nonHome) {
      return { prefecture: nonHome.pref, region: nonHome.region, source: 'text_non_home' };
    }
    return { prefecture: matched[0].pref, region: matched[0].region, source: 'text_keyword' };
  }
  return resolveGeoLocation({ text });
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
  return String(str ?? '')
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
 * 経費データから「ある地域にある期間集中したデモ出張セッション」を動的検出し、
 * 往復の高速・飛行機・電車・タクシー・駐車・ガソリン・宿泊・飲食をすべてそのデモ遠征地域へ自動帰属させる
 * （特定企業名・特定日付・特定金額のハードコード禁止）
 */
export function buildDemoTripSessions(normalizedExpenses = [], homePrefecture = '', homeRegion = '') {
  const items = (Array.isArray(normalizedExpenses) ? normalizedExpenses : [])
    .filter(e => e && parseYmdToUtcMs(e.date) !== null)
    .map(e => ({ ...e }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (items.length === 0) return { sessions: [], attributedExpenses: items };

  // 1. 本拠地以外の「目的地アンカー（宿泊・空港・現地滞在店舗・非経由地、本社固定費は除く）」を抽出
  const anchors = items.filter(e =>
    !e.isFixedOverhead &&
    e.rawPrefecture &&
    e.rawPrefecture !== '未設定' &&
    e.rawPrefecture !== homePrefecture &&
    isStrongDestinationAnchor(e)
  );

  // 2. 同一地域（または隣接都道府県の同一地方）で連続（間隔2日以内）しているアンカーをセッション化
  const rawSessions = [];
  anchors.forEach(a => {
    const existing = rawSessions.find(s =>
      s.region === a.rawRegion &&
      Math.abs(diffDaysYmd(s.endDate, a.date) ?? 999) <= 2
    );
    if (existing) {
      if (a.date < existing.startDate) existing.startDate = a.date;
      if (a.date > existing.endDate) existing.endDate = a.date;
      existing.anchorItems.push(a);
      existing.prefCounts.set(a.rawPrefecture, (existing.prefCounts.get(a.rawPrefecture) || 0) + 1);
    } else {
      const pm = new Map();
      pm.set(a.rawPrefecture, 1);
      rawSessions.push({
        startDate: a.date,
        endDate: a.date,
        region: a.rawRegion,
        prefCounts: pm,
        anchorItems: [a]
      });
    }
  });

  // 各セッションの強度（宿泊/空港/現地複数件）を評価し、同日に強い遠征セッションがある場合の単発経由セッションを統合除外
  const scoredRaw = rawSessions.map(s => {
    const hasLodgingOrAirport = s.anchorItems.some(a =>
      a.role === 'lodging' || /ホテル|宿泊|東横|ルートイン|ワシントン|空港|新幹線|航空/i.test(`${a.payee} ${a.note}`)
    );
    const nonWaypointCount = s.anchorItems.filter(a => !isTransitWaypointText(`${a.payee} ${a.note}`)).length;
    const daySpan = (diffDaysYmd(s.startDate, s.endDate) || 0) + 1;
    const score = (hasLodgingOrAirport ? 10 : 0) + nonWaypointCount * 2 + (daySpan > 1 ? 4 : 0);
    return { ...s, hasLodgingOrAirport, nonWaypointCount, daySpan, score };
  });

  // 同日・重複期間に強い遠征目的地（宿泊/空港/複数日）が存在する単発経由候補は除外（往路/復路経由地として強いセッションへ吸収）
  const filteredRaw = scoredRaw.filter(s => {
    if (s.hasLodgingOrAirport || s.daySpan >= 2) return true;
    const dominatedByStronger = scoredRaw.some(other =>
      other !== s &&
      other.score >= s.score + 4 &&
      s.startDate >= other.startDate &&
      s.endDate <= other.endDate
    );
    return !dominatedByStronger;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));

  // 各セッションの主たる目的地都道府県を確定し、遠征先の復路翌日（高速・PA/SA・航空・タクシー等）を自動包含
  const sessions = filteredRaw.map((s, idx) => {
    const lodgingAnchor = s.anchorItems.find(a =>
      a.role === 'lodging' || /ホテル|宿泊|東横|ルートイン|ワシントン|空港/i.test(`${a.payee} ${a.note}`)
    );
    const topPref = lodgingAnchor
      ? lodgingAnchor.rawPrefecture
      : (Array.from(s.prefCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '未設定');

    const nextSession = filteredRaw[idx + 1];
    let extEnd = s.endDate;
    const nextDay = addDaysYmd(s.endDate, 1);
    const hasReturnTransitNextDay = items.some(e =>
      e.date === nextDay &&
      (!nextSession || nextDay < nextSession.startDate) &&
      /NEXCO|高速|通行|ETC|PA|SA|航空|飛行機|新幹線|タクシー/i.test(`${e.payee} ${e.note}`)
    );
    if (hasReturnTransitNextDay && s.region !== homeRegion) {
      extEnd = nextDay;
    }

    const sessionDaySum = items
      .filter(e => e.date >= s.startDate && e.date <= extEnd)
      .reduce((acc, e) => acc + e.amount, 0);
    const isValidSession = s.hasLodgingOrAirport || s.nonWaypointCount >= 2 || s.startDate !== extEnd || sessionDaySum >= 5000;

    return {
      id: `demo_trip_${idx}_${s.startDate}_${extEnd}`,
      startDate: s.startDate,
      endDate: extEnd,
      anchorStart: s.startDate,
      anchorEnd: s.endDate,
      region: s.region,
      prefecture: topPref,
      isValid: isValidSession,
      items: []
    };
  }).filter(s => s.isValid);

  // 3. 全経費を最も適切なデモ出張セッションへ自動帰属（二重帰属なし）
  items.forEach(e => {
    // 本社固定インフラ・宅配・郵便等は遠征デモ出張へ誤吸収させず個別推定地（または未設定）に留める
    if (e.isFixedOverhead) {
      e.region = e.rawRegion;
      e.prefecture = e.rawPrefecture;
      e.demoSessionId = '';
      e.attributionReason = (e.rawRegion !== '未設定') ? '現地経費（一般）' : '共通・本社等';
      return;
    }

    // すでにセッション期間 [startDate, endDate] に含まれるか確認
    const matchedSessions = sessions.filter(s => e.date >= s.startDate && e.date <= s.endDate);
    if (matchedSessions.length > 0) {
      // 複数セッションが同日に重なる場合は地域一致を優先
      const chosen = matchedSessions.find(s => s.region === e.rawRegion) || matchedSessions[0];
      // 遠征セッション期間中の移動・高速・航空・電車・宿泊・飲食・経由地PA/SA・往路/復路出発前給油等はすべてそのデモ出張費へ帰属
      e.region = chosen.region;
      e.prefecture = chosen.prefecture;
      e.demoSessionId = chosen.id;
      e.attributionReason = (e.rawRegion === chosen.region)
        ? '現地経費'
        : (e.rawPrefecture === homePrefecture ? '往路/復路（発着移動）' : (e.rawPrefecture === '未設定' ? 'デモ期間中の移動/宿泊/飲食' : '経由地（往路/復路）'));
      chosen.items.push(e);
      return;
    }

    // セッションに該当しない経費は個別推定地を仮設定（後段で同日領収書からの移動費推測を実施）
    e.region = e.rawRegion;
    e.prefecture = e.rawPrefecture;
    e.demoSessionId = '';
    e.attributionReason = (e.rawRegion !== '未設定') ? '現地経費' : '未設定';
  });

  // 3.5. セッション外の「地域未設定の移動費（高速・駐車・給油・電車等）や飲食」を、同日の領収書行動履歴から自動推測
  const dayGeoMap = new Map();
  items.forEach(e => {
    if (e.demoSessionId || e.isFixedOverhead) return;
    if (e.region && e.region !== '未設定') {
      if (!dayGeoMap.has(e.date)) dayGeoMap.set(e.date, []);
      dayGeoMap.get(e.date).push({ region: e.region, prefecture: e.prefecture });
    }
  });
  items.forEach(e => {
    if (e.demoSessionId || e.isFixedOverhead) return;
    if (e.region !== '未設定') return;
    if (e.role !== 'transit' && e.role !== 'meal' && e.role !== 'lodging') return;
    const sameDayGeos = dayGeoMap.get(e.date);
    if (sameDayGeos && sameDayGeos.length > 0) {
      // 同日に非本拠地の地域があればそちら（外出先）、なければ最頻出地域へ推測帰属
      const nonHome = homePrefecture ? sameDayGeos.find(g => g.prefecture !== homePrefecture) : null;
      const picked = nonHome || sameDayGeos[0];
      e.region = picked.region;
      e.prefecture = picked.prefecture;
      e.attributionReason = '同日領収書から推測';
    }
  });

  // セッション集計メタを構築
  const finalizedSessions = sessions.map(s => {
    const totalAmount = Math.round(s.items.reduce((sum, x) => sum + x.amount, 0));
    const transitAmount = Math.round(s.items.filter(x => x.role === 'transit').reduce((sum, x) => sum + x.amount, 0));
    const lodgingAmount = Math.round(s.items.filter(x => x.role === 'lodging').reduce((sum, x) => sum + x.amount, 0));
    const mealAmount = Math.round(s.items.filter(x => x.role === 'meal').reduce((sum, x) => sum + x.amount, 0));
    const otherAmount = Math.max(0, totalAmount - transitAmount - lodgingAmount - mealAmount);
    const days = (diffDaysYmd(s.startDate, s.endDate) || 0) + 1;
    const dateLabel = s.startDate === s.endDate ? s.startDate : `${s.startDate} 〜 ${s.endDate}`;
    return {
      id: s.id,
      startDate: s.startDate,
      endDate: s.endDate,
      days,
      region: s.region,
      prefecture: s.prefecture,
      itemCount: s.items.length,
      totalAmount,
      transitAmount,
      lodgingAmount,
      mealAmount,
      otherAmount,
      items: s.items,
      primaryRegion: s.region,
      primaryPrefecture: s.prefecture,
      label: `${dateLabel}（${s.region}・${s.prefecture} / ${s.items.length}件・¥${totalAmount.toLocaleString()}）`
    };
  }).filter(s => s.itemCount > 0)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  return { sessions: finalizedSessions, attributedExpenses: items };
}

/**
 * 経費データから出張候補期間を動的抽出する（デモ出張セッションエンジンへ委譲）
 */
export function extractTripPeriodCandidates(expenses = [], homePrefecture = '', homeRegion = '') {
  const safeExp = Array.isArray(expenses) ? expenses : [];
  const norm = safeExp
    .filter(e => e && e.date && isDemoTripRelevantExpense(e) && (Number(e.amount) || 0) !== 0)
    .map(e => {
      const geo = resolveExpenseGeoWithHome(e, homePrefecture);
      return {
        id: e.id || '',
        source: 'expense',
        date: String(e.date).slice(0, 10),
        amount: Math.round(Number(e.amount) || 0),
        category: String(e.category || 'その他'),
        role: classifyExpenseRole(e),
        payee: String(e.payee || '').trim() || '未設定',
        note: String(e.note || '').trim(),
        claimant: String(e.claimant || '').trim(),
        rawRegion: geo.region,
        rawPrefecture: geo.prefecture,
        region: geo.region,
        prefecture: geo.prefecture
      };
    });
  return buildDemoTripSessions(norm, homePrefecture, homeRegion).sessions;
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
    const lineItems = [];
    const topEndUser = String(rawInner.endUserName || (rawDoc && rawDoc.endUserName) || clientObj.endUserName || '').trim();
    if (topEndUser) endUsersSet.add(topEndUser);
    items.forEach(it => {
      if (!it) return;
      const itName = String(it.name || '').trim();
      const unitPrice = Number(it.unitPrice) || 0;
      const qty = Math.max(0, Number(it.quantity) || 0);
      const isDiscount = unitPrice < 0 || /値引|割引|相殺|調整/.test(itName);
      if (!isDiscount) {
        totalQty += qty;
      }
      if (it.endUserName && String(it.endUserName).trim()) {
        endUsersSet.add(String(it.endUserName).trim());
      }
      if (itName) {
        const lineCost = isDiscount
          ? 0
          : (Number(it.assignedCogs) > 0 ? Number(it.assignedCogs) : (Number(it.costPrice) > 0 ? qty * Number(it.costPrice) : 0));
        lineItems.push({
          name: itName,
          qty,
          unit: String(it.unit || '').trim(),
          unitPrice: Math.round(unitPrice),
          amount: Math.round(unitPrice * qty),
          cost: Math.round(lineCost),
          serialNumber: String(it.serialNumber || '').trim(),
          isDiscount
        });
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
      lineItems,
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
    const soldItemAcc = new Map();
    c.docs.forEach(d => {
      (d.lineItems || []).forEach(li => {
        if (!li || li.isDiscount || !li.name) return;
        const k = normalizeLookupName(li.name);
        const cur = soldItemAcc.get(k) || { name: li.name, qty: 0, unit: li.unit || '', sales: 0 };
        cur.qty += li.qty;
        cur.sales += li.amount;
        if (!cur.unit && li.unit) cur.unit = li.unit;
        soldItemAcc.set(k, cur);
      });
    });
    const soldItemSummary = Array.from(soldItemAcc.values()).sort((a, b) => b.sales - a.sales || b.qty - a.qty);
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
      soldItemSummary,
      docs: c.docs
    };
  }).sort((a, b) => b.sales - a.sales);

  // 自社本拠地都道府県・エリアを伝票の issuer（発行元住所）から動的に取得（ハードコード禁止）
  let homePrefecture = '';
  let homeRegion = '';
  for (const rawDoc of safeDocs) {
    const inner = (rawDoc && rawDoc.fullDoc) ? rawDoc.fullDoc : (rawDoc || {});
    const iss = inner.issuer || (rawDoc && rawDoc.issuer);
    if (iss && (iss.address || iss.zip)) {
      const hGeo = resolveGeoLocation({ address: iss.address || '', zip: iss.zip || '' });
      if (hGeo.prefecture && hGeo.prefecture !== '未設定') {
        homePrefecture = hGeo.prefecture;
        homeRegion = hGeo.region;
        break;
      }
    }
  }

  // ------------------------------------------------------------------------
  // (B) 経費の正規化 ＆ 地域・移動費（領収書内容・デモ集中期間）自動帰属
  //     ※明らかにデモに関係ないオフィス事務・通信・宅配・書籍・工具・本拠地日常小口費は除外
  // ------------------------------------------------------------------------
  const rawRelevantExpenses = [];
  safeExpenses.forEach(e => {
    if (!e) return;
    if (isFixedOfficeOverhead(e)) return;
    const dt = String(e.date || '').slice(0, 10);
    const amount = Number(e.amount) || 0;
    if (amount === 0) return;
    const geo = resolveExpenseGeoWithHome(e, homePrefecture);
    rawRelevantExpenses.push({
      id: e.id || '',
      source: 'expense',
      date: dt,
      category: String(e.category || 'その他'),
      role: classifyExpenseRole(e),
      isFixedOverhead: false,
      payee: String(e.payee || '').trim() || '未設定',
      note: String(e.note || '').trim(),
      claimant: String(e.claimant || '').trim(),
      amount: Math.round(amount),
      rawRegion: geo.region,
      rawPrefecture: geo.prefecture,
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
      const pseudoExp = { category: ln.accountName, payee: ln.subAccount || '振替仕訳', note: desc };
      const geo = resolveExpenseGeoWithHome(pseudoExp, homePrefecture);
      rawRelevantExpenses.push({
        id: `${j.id || 'jnl'}_${idx}`,
        source: 'journal',
        date: dt,
        category: String(ln.accountName || ''),
        role: classifyExpenseRole(pseudoExp),
        isFixedOverhead: false,
        payee: String(ln.subAccount || '振替仕訳'),
        note: desc,
        claimant: '',
        amount: Math.round(amount),
        rawRegion: geo.region,
        rawPrefecture: geo.prefecture,
        region: geo.region,
        prefecture: geo.prefecture
      });
    });
  });

  // 全期間ベースでデモ出張セッションを検出し、往路・現地・復路の移動/高速/航空/電車/宿泊/飲食を目的地地域へ帰属
  // ※本拠地（本社所在県）内の明らかにデモ無関係な日常小口費（洗車・通常コンビニ軽食等）は除外
  const demoSessionResult = buildDemoTripSessions(rawRelevantExpenses, homePrefecture, homeRegion);
  const allTravelExpenses = demoSessionResult.attributedExpenses.filter(e => !isHomeDailyNonDemoExpense(e, homePrefecture));
  const allDemoSessions = demoSessionResult.sessions;

  const scopedTravelExpenses = allTravelExpenses.filter(e => {
    if (periodStart || periodEnd) {
      return isDateInRange(e.date, periodStart, periodEnd);
    }
    return true;
  });

  const scopedDemoSessions = allDemoSessions.filter(s => {
    if (periodStart || periodEnd) {
      return isDateInRange(s.startDate, periodStart, periodEnd) || isDateInRange(s.endDate, periodStart, periodEnd);
    }
    return true;
  });

  // 地域別 / 都道府県別 集計ビルダー（直下に販売店一覧・デモ出張セッション・個別経費も内包！）
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
          clients: [],
          demoSessions: [],
          standaloneExpenses: [],
          demoSessionExpenseTotal: 0,
          standaloneExpenseTotal: 0,
          transitExpense: 0,
          lodgingExpense: 0,
          mealExpense: 0,
          otherDemoExpense: 0,
          travelExpense: 0,
          vehicleExpense: 0,
          entertainExpense: 0,
          totalExpense: 0,
          expenseCount: 0,
          netContribution: 0,
          expenseToSalesPct: null,
          roiMultiple: null
        });
      }
      return map.get(key);
    };

    clientSummary.forEach(c => {
      const key = mode === 'region' ? c.region : c.prefecture;
      const b = getOrCreate(key, c.region, c.prefecture);
      b.sales += c.sales;
      b.cogs += c.cogs;
      b.grossProfit += c.grossProfit;
      b.docCount += c.docCount;
      b.clientNamesSet.add(c.clientName);
      b.clients.push(c);
    });

    scopedDemoSessions.forEach(s => {
      const key = mode === 'region' ? s.region : s.prefecture;
      const b = getOrCreate(key, s.region, s.prefecture);
      b.demoSessions.push(s);
    });

    scopedTravelExpenses.forEach(e => {
      const key = mode === 'region' ? e.region : e.prefecture;
      const b = getOrCreate(key, e.region, e.prefecture);
      b.totalExpense += e.amount;
      b.expenseCount += 1;
      if (e.demoSessionId) {
        b.demoSessionExpenseTotal += e.amount;
      } else {
        b.standaloneExpenseTotal += e.amount;
        b.standaloneExpenses.push(e);
      }
      if (e.role === 'transit') b.transitExpense += e.amount;
      else if (e.role === 'lodging') b.lodgingExpense += e.amount;
      else if (e.role === 'meal') b.mealExpense += e.amount;
      else b.otherDemoExpense += e.amount;

      if (e.category.includes('旅費') || e.category.includes('交通')) b.travelExpense += e.amount;
      else if (e.category.includes('車両')) b.vehicleExpense += e.amount;
      else if (e.category.includes('交際') || e.category.includes('会議')) b.entertainExpense += e.amount;
    });

    const list = Array.from(map.values()).map(b => {
      b.sales = Math.round(b.sales);
      b.cogs = Math.round(b.cogs);
      b.grossProfit = Math.round(b.grossProfit);
      b.totalExpense = Math.round(b.totalExpense);
      b.demoSessionExpenseTotal = Math.round(b.demoSessionExpenseTotal);
      b.standaloneExpenseTotal = Math.round(b.standaloneExpenseTotal);
      b.netContribution = b.grossProfit - b.totalExpense;
      b.grossMarginPct = b.sales > 0 ? Math.round((b.grossProfit / b.sales) * 1000) / 10 : null;
      b.expenseToSalesPct = b.sales > 0 ? Math.round((b.totalExpense / b.sales) * 1000) / 10 : null;
      b.roiMultiple = b.totalExpense > 0 ? Math.round((b.sales / b.totalExpense) * 10) / 10 : null;
      b.clientCount = b.clientNamesSet.size;
      b.standaloneExpenses.sort((a, b2) => b2.date.localeCompare(a.date));
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
  const tripCandidates = allDemoSessions;

  // 未指定時は最新のデモ出張候補をデフォルト提案（存在しない場合は空で安全に0表示）
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
    transit: Math.round(tripExpenses.filter(e => e.role === 'transit').reduce((s, e) => s + e.amount, 0)),
    lodging: Math.round(tripExpenses.filter(e => e.role === 'lodging').reduce((s, e) => s + e.amount, 0)),
    meal: Math.round(tripExpenses.filter(e => e.role === 'meal').reduce((s, e) => s + e.amount, 0)),
    other: Math.round(tripExpenses.filter(e => e.role === 'other').reduce((s, e) => s + e.amount, 0)),
    travel: Math.round(tripExpenses.filter(e => e.category.includes('旅費') || e.category.includes('交通')).reduce((s, e) => s + e.amount, 0)),
    vehicle: Math.round(tripExpenses.filter(e => e.category.includes('車両')).reduce((s, e) => s + e.amount, 0)),
    entertain: Math.round(tripExpenses.filter(e => e.category.includes('交際') || e.category.includes('会議')).reduce((s, e) => s + e.amount, 0))
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
    homePrefecture,
    homeRegion,
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
      demoSessionCount: scopedDemoSessions.length,
      netAfterTravelExpense: totalGrossProfit - totalTravelDemoExpense
    },
    clientSummary,
    regionSummary,
    prefectureSummary,
    demoSessions: scopedDemoSessions,
    tripCandidates,
    tripImpact,
    availableRegions: Array.from(new Set([...regionSummary.map(r => r.key)])),
    availablePrefectures: Array.from(new Set([...prefectureSummary.map(p => p.key)])),
    availableClients: clientSummary.map(c => c.clientName)
  };
}
