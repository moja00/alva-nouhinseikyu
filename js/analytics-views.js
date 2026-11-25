/**
 * analytics-views.js
 * Alva-works ERP - 経営分析UIビューコントローラー
 *
 * 1. ロット別原価ビュー（財務会計タブ・在庫マスタタブ共通レンダリング）
 * 2. 出張・地域・取引先 統合分析ビュー（3セクション連動UI）
 *
 * ※ すべてのUI操作は document.addEventListener によるイベント委譲で処理します。
 */

// ==========================================================================
// 状態管理（ビュー別フィルタ・ソート・展開状態）
// ==========================================================================

const lotCostViewState = {
  itemFilter: 'all',
  procFilter: 'all',
  searchQuery: '',
  sortBy: 'date_desc'
};

const bizAnalyticsViewState = {
  activeSubTab: 'all', // 'all' | 'clients' | 'regions' | 'trips'
  includeZeroDocs: true,
  clientSortBy: 'sales_desc',
  clientSearch: '',
  expandedClients: new Set(),
  geoGranularity: 'region', // 'region' | 'prefecture'
  tripStart: '',
  tripEnd: '',
  followUpDays: 60,
  tripRegion: 'all',
  tripPrefecture: 'all',
  tripClient: 'all',
  initializedTripDefault: false
};

function fmtYenAnalytics(val, allowDashIfNull = false) {
  if (allowDashIfNull && (val === null || val === undefined || Number.isNaN(Number(val)))) {
    return '未設定 (-)';
  }
  const n = Math.round(Number(val) || 0);
  return `${n < 0 ? '-' : ''}¥${Math.abs(n).toLocaleString()}`;
}

function fmtPctAnalytics(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return '未設定 (-)';
  }
  return `${Number(val).toFixed(1)}%`;
}

function safeEscAnalytics(str) {
  if (typeof escapeHtml === 'function') return escapeHtml(str);
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ==========================================================================
// 1. ロット別原価ビュー レンダリング（財務会計 & 在庫マスタ共通）
// ==========================================================================

function renderLotCostAnalyticsView(targetContainerId = null) {
  const targetIds = targetContainerId
    ? [targetContainerId]
    : ['accLotCostAnalyticsRoot', 'invLotCostAnalyticsRoot'];

  const containers = targetIds
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (containers.length === 0) return;

  console.log('【ロット別原価ビュー】集計・描画開始', { state: lotCostViewState, targets: containers.map(c => c.id) });

  try {
    const lots = typeof getInventoryLotList === 'function' ? getInventoryLotList() : [];
    const itemsMaster = typeof getItemMasterList === 'function' ? getItemMasterList(false) : [];
    const inventoryList = typeof getInventoryList === 'function' ? getInventoryList() : [];
    const serials = typeof getInventorySerialList === 'function' ? getInventorySerialList() : [];
    const docs = typeof getHistoryList === 'function' ? getHistoryList(false) : [];

    const data = buildLotCostAnalytics({ lots, itemsMaster, inventoryList, serials, docs });
    const q = lotCostViewState.searchQuery.trim().toLowerCase();

    // フィルタ適用
    let filteredRows = data.rows.filter(r => {
      if (lotCostViewState.itemFilter !== 'all' && r.itemId !== lotCostViewState.itemFilter) return false;
      if (lotCostViewState.procFilter !== 'all' && r.procurementType !== lotCostViewState.procFilter) return false;
      if (q) {
        const hay = `${r.lotNumber} ${r.itemName} ${r.sku} ${r.supplier} ${r.category} ${r.arrivalDate}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // ソート適用
    filteredRows = [...filteredRows].sort((a, b) => {
      switch (lotCostViewState.sortBy) {
        case 'date_asc':
          return (a.arrivalDate || '').localeCompare(b.arrivalDate || '') || a.lotNumber.localeCompare(b.lotNumber);
        case 'cost_desc':
          return b.landedUnitCost - a.landedUnitCost;
        case 'cost_asc':
          return a.landedUnitCost - b.landedUnitCost;
        case 'ratio_desc':
          return (b.costRatioPct ?? -1) - (a.costRatioPct ?? -1);
        case 'delta_desc':
          return Math.abs(b.prevDelta || 0) - Math.abs(a.prevDelta || 0);
        case 'date_desc':
        default:
          return (b.arrivalDate || '').localeCompare(a.arrivalDate || '') || b.lotNumber.localeCompare(a.lotNumber);
      }
    });

    const filteredTrends = data.itemTrends.filter(t => {
      if (lotCostViewState.itemFilter !== 'all' && t.itemId !== lotCostViewState.itemFilter) return false;
      if (q) {
        const hay = `${t.itemName} ${t.sku} ${t.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    // フィルタ後のKPI再集計（全品目表示時は合成セット行を除外して実入庫総額の二重計上を防止）
    const kpiSourceRows = lotCostViewState.itemFilter === 'all'
      ? filteredRows.filter(r => !r.isAssembledFromComponents)
      : filteredRows;
    const fAssembledCount = filteredRows.filter(r => r.isAssembledFromComponents).length;
    const fTotalLanded = kpiSourceRows.reduce((s, r) => s + r.totalLandedCost, 0);
    const fTotalAlloc = kpiSourceRows.reduce((s, r) => s + r.totalAllocatedCost, 0);
    const fTotalQty = kpiSourceRows.reduce((s, r) => s + r.qty, 0);
    const fLotCount = new Set(kpiSourceRows.map(r => r.lotNumber)).size;
    const fAllocRatio = fTotalLanded > 0 ? Math.round((fTotalAlloc / fTotalLanded) * 1000) / 10 : 0;
    const fRefRows = kpiSourceRows.filter(r => r.costRatioPct !== null && r.refSalesPrice > 0);
    const fRefSales = fRefRows.reduce((s, r) => s + r.refSalesPrice * r.qty, 0);
    const fRefCost = fRefRows.reduce((s, r) => s + r.totalLandedCost, 0);
    const fAvgCostRatio = fRefSales > 0 ? Math.round((fRefCost / fRefSales) * 1000) / 10 : null;

    // 品目ドロップダウン選択肢
    const itemOptionsHtml = [
      `<option value="all"${lotCostViewState.itemFilter === 'all' ? ' selected' : ''}>すべての品目（${data.itemTrends.length}品目）</option>`,
      ...data.itemTrends.map(t => {
        const label = `${t.sku ? `[${t.sku}] ` : ''}${t.itemName}（${t.lotCount}ロット）`;
        return `<option value="${safeEscAnalytics(t.itemId)}"${lotCostViewState.itemFilter === t.itemId ? ' selected' : ''}>${safeEscAnalytics(label)}</option>`;
      })
    ].join('');

    // 品目別ロット推移カードHTML
    const trendCardsHtml = filteredTrends.length === 0
      ? `<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 0.82rem; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">表示対象のロット原価推移データがありません。</div>`
      : filteredTrends.map(t => {
          const maxBarVal = Math.max(t.maxCost || 1, 1);
          const spreadBadge = t.lotCount >= 2 && t.costSpread > 0
            ? `<span style="background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 1px 7px; border-radius: 9999px; font-size: 0.68rem; font-weight: 700;">変動幅 ${fmtYenAnalytics(t.costSpread)}（${t.costSpreadPct.toFixed(1)}%）</span>`
            : `<span style="background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 1px 7px; border-radius: 9999px; font-size: 0.68rem; font-weight: 600;">${t.lotCount}ロット</span>`;

          const barsHtml = t.points.map(pt => {
            const totalPct = Math.max(6, Math.round((pt.landedUnitCost / maxBarVal) * 100));
            const compCost = Number(pt.componentUnitCost) || 0;
            const basePct = pt.landedUnitCost > 0 ? Math.min(100, Math.round((pt.baseUnitCost / pt.landedUnitCost) * 100)) : 100;
            const allocPct = pt.landedUnitCost > 0 ? Math.min(Math.max(0, 100 - basePct), Math.round((pt.allocatedUnitCost / pt.landedUnitCost) * 100)) : 0;
            const compPct = compCost > 0 ? Math.max(0, 100 - basePct - allocPct) : 0;
            let deltaTag = '<span style="color:#94a3b8; font-size:0.68rem;">初回</span>';
            if (pt.prevDelta !== null) {
              const isUp = pt.prevDelta > 0;
              const isDown = pt.prevDelta < 0;
              const color = isUp ? '#dc2626' : (isDown ? '#059669' : '#64748b');
              const bg = isUp ? '#fef2f2' : (isDown ? '#ecfdf5' : '#f1f5f9');
              const sign = isUp ? '+' : '';
              deltaTag = `<span style="background:${bg}; color:${color}; padding:1px 5px; border-radius:4px; font-size:0.68rem; font-weight:700;">${sign}${fmtYenAnalytics(pt.prevDelta)} (${sign}${(pt.prevDeltaPct || 0).toFixed(1)}%)</span>`;
            }
            const fxLabel = pt.procurementType === 'import' && pt.exchangeRate > 0
              ? `${safeEscAnalytics(pt.foreignCurrency)} @${pt.exchangeRate}`
              : (pt.procurementType === 'domestic' ? '国内仕入' : '輸入仕入');
            const compLots = Array.from(new Set((pt.componentBreakdown || []).map(c => c.lotNumber).filter(Boolean)));
            const compDetailText = (pt.componentBreakdown || [])
              .map(c => `${c.sku || c.name}×${c.qty}(${fmtYenAnalytics(c.subtotal)})`)
              .join(' + ');
            const assembledTag = pt.isAssembledFromComponents
              ? `<span style="display:inline-block; background:#ecfdf5; color:#047857; border:1px solid #86efac; font-size:0.62rem; font-weight:700; padding:0 5px; border-radius:4px; margin-left:4px;">🧩 組立</span>`
              : '';
            return `
              <div style="display: grid; grid-template-columns: 165px 1fr 120px 125px; gap: 8px; align-items: center; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.75rem;">
                <div>
                  <div style="font-weight: 700; color: #1e293b; font-family: monospace;">${safeEscAnalytics(pt.lotNumber)}${assembledTag}</div>
                  <div style="font-size: 0.67rem; color: #64748b;">${safeEscAnalytics(pt.arrivalDate || '未設定 (-)')} / ${pt.qty}${safeEscAnalytics(t.unit)} / ${fxLabel}</div>
                </div>
                <div>
                  <div style="height: 16px; background: #f1f5f9; border-radius: 4px; overflow: hidden; display: flex; width: 100%;">
                    <div style="width: ${totalPct}%; display: flex; height: 100%; transition: width 0.25s;">
                      <div style="width: ${basePct}%; background: #3b82f6; height: 100%;" title="本体単価: ${fmtYenAnalytics(pt.baseUnitCost)}"></div>
                      <div style="width: ${allocPct}%; background: #f59e0b; height: 100%;" title="諸掛按分単価: ${fmtYenAnalytics(pt.allocatedUnitCost)}"></div>
                      ${compPct > 0 ? `<div style="width: ${compPct}%; background: #10b981; height: 100%;" title="組合せ部品原価: ${safeEscAnalytics(compDetailText)}"></div>` : ''}
                    </div>
                  </div>
                  <div style="font-size: 0.65rem; color: #64748b; margin-top: 2px;">
                    本体 ${fmtYenAnalytics(pt.baseUnitCost)} ＋ 諸掛 ${fmtYenAnalytics(pt.allocatedUnitCost)}${compCost > 0 ? ` ＋ <span style="color:#047857; font-weight:700;">部品 ${fmtYenAnalytics(compCost)}</span> <span style="color:#94a3b8;">(${safeEscAnalytics(compLots.join(', '))})</span>` : ''}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 800; color: #0f172a; font-family: monospace;">${fmtYenAnalytics(pt.landedUnitCost)}</div>
                  <div style="font-size: 0.67rem; color: #64748b;">原価率 ${fmtPctAnalytics(pt.costRatioPct)}</div>
                </div>
                <div style="text-align: right;">${deltaTag}</div>
              </div>
            `;
          }).join('');

          return `
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${t.sku ? `<span style="background:#0f172a; color:#fff; font-family:monospace; font-size:0.68rem; font-weight:700; padding:1px 6px; border-radius:4px;">${safeEscAnalytics(t.sku)}</span>` : ''}
                    <strong style="font-size: 0.88rem; color: #0f172a;">${safeEscAnalytics(t.itemName)}</strong>
                    ${spreadBadge}
                  </div>
                  <div style="font-size: 0.72rem; color: #64748b; margin-top: 3px;">
                    累計入庫: <strong>${t.totalQty}${safeEscAnalytics(t.unit)}</strong> / 加重平均原価: <strong>${fmtYenAnalytics(t.weightedAvgCost)}</strong> / レンジ: ${fmtYenAnalytics(t.minCost)} 〜 ${fmtYenAnalytics(t.maxCost)} / 基準売価: <strong>${fmtYenAnalytics(t.refSalesPrice, true)}</strong>
                  </div>
                </div>
                <button type="button" class="btn btn-secondary btn-xs lot-cost-pick-item-btn" data-item-id="${safeEscAnalytics(t.itemId)}" style="font-size: 0.7rem; padding: 3px 8px;">
                  ${lotCostViewState.itemFilter === t.itemId ? '全品目に戻す' : 'この品目で絞込'}
                </button>
              </div>
              <div>${barsHtml}</div>
            </div>
          `;
        }).join('');

    // 詳細テーブル行HTML
    const tableRowsHtml = filteredRows.length === 0
      ? `<tr><td colspan="12" style="padding: 28px; text-align: center; color: #94a3b8;">条件に一致するロット明細がありません。</td></tr>`
      : filteredRows.map(r => {
          const procBadge = r.procurementType === 'domestic'
            ? `<span style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:1px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">国内</span>`
            : `<span style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0; padding:1px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">輸入 ${r.foreignCurrency && r.exchangeRate > 0 ? `${safeEscAnalytics(r.foreignCurrency)}@${r.exchangeRate}` : ''}</span>`;
          let deltaHtml = '<span style="color:#94a3b8;">-</span>';
          if (r.prevDelta !== null) {
            const isUp = r.prevDelta > 0;
            const isDown = r.prevDelta < 0;
            const color = isUp ? '#dc2626' : (isDown ? '#059669' : '#64748b');
            const sign = isUp ? '+' : '';
            deltaHtml = `<span style="color:${color}; font-weight:700; font-family:monospace;">${sign}${fmtYenAnalytics(r.prevDelta)}<br><small>(${sign}${(r.prevDeltaPct || 0).toFixed(1)}%)</small></span>`;
          }
          let ratioColor = '#0f172a';
          if (r.costRatioPct !== null) {
            if (r.costRatioPct >= 60) ratioColor = '#dc2626';
            else if (r.costRatioPct >= 40) ratioColor = '#d97706';
            else ratioColor = '#059669';
          }
          const snHtml = r.serialStats && r.serialStats.total > 0
            ? `<span style="font-size:0.7rem; color:#334155;">計${r.serialStats.total}<br><small style="color:#059669;">在庫${r.serialStats.inStock}</small> / <small style="color:#64748b;">出${r.serialStats.shipped}</small></span>`
            : `<span style="color:#94a3b8; font-size:0.72rem;">-</span>`;

          const compInfoHtml = r.isAssembledFromComponents
            ? `<div style="font-size: 0.65rem; color: #047857; margin-top: 2px;">🧩 組立セット（${safeEscAnalytics((r.componentBreakdown || []).map(c => `${c.sku || c.name}×${c.qty}[${c.lotNumber}]`).join(' + '))}）</div>`
            : '';

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;${r.isAssembledFromComponents ? ' background: #f0fdf4;' : ''}">
              <td style="padding: 8px 6px; font-family: monospace; font-weight: 700; color: #1e293b; white-space: nowrap;">
                ${safeEscAnalytics(r.lotNumber)}
                <div style="font-size: 0.68rem; color: #64748b; font-weight: 400;">${safeEscAnalytics(r.supplier)}</div>
              </td>
              <td style="padding: 8px 6px; white-space: nowrap; color: #334155;">
                ${safeEscAnalytics(r.arrivalDate || '未設定 (-)')}
                <div style="margin-top: 2px;">${procBadge}</div>
              </td>
              <td style="padding: 8px 6px;">
                ${r.sku ? `<span style="background:#1e293b; color:#fff; font-family:monospace; font-size:0.66rem; padding:1px 5px; border-radius:3px; margin-right:4px;">${safeEscAnalytics(r.sku)}</span>` : ''}
                <span style="font-weight: 600; color: #0f172a;">${safeEscAnalytics(r.itemName)}</span>
                ${compInfoHtml}
              </td>
              <td style="padding: 8px 6px; text-align: right; font-weight: 700; white-space: nowrap;">${r.qty} <small style="color:#64748b; font-weight:400;">${safeEscAnalytics(r.unit)}</small></td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #475569; white-space: nowrap;">
                ${r.foreignPrice > 0 ? `${safeEscAnalytics(r.foreignCurrency)} ${r.foreignPrice.toLocaleString()}` : '-'}
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #1d4ed8; white-space: nowrap;">${fmtYenAnalytics(r.baseUnitCost)}</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #b45309; white-space: nowrap;">
                +${fmtYenAnalytics(r.allocatedUnitCost)}
                ${r.componentUnitCost > 0 ? `<div style="font-size: 0.66rem; color: #047857; font-weight: 700;">+部品 ${fmtYenAnalytics(r.componentUnitCost)}</div>` : `<div style="font-size: 0.66rem; color: #94a3b8;">(${r.allocatedRatioPct.toFixed(1)}%)</div>`}
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 800; color: #0f172a; white-space: nowrap; background: #f8fafc;">
                ${fmtYenAnalytics(r.landedUnitCost)}
                <div style="font-size: 0.66rem; color: #64748b; font-weight: 400;">計 ${fmtYenAnalytics(r.totalLandedCost)}</div>
              </td>
              <td style="padding: 8px 6px; text-align: right; white-space: nowrap;">${deltaHtml}</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #334155; white-space: nowrap;">
                ${fmtYenAnalytics(r.refSalesPrice, true)}
                <div style="font-size: 0.65rem; color: #94a3b8;">${safeEscAnalytics(r.refSalesSource)}</div>
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 800; color: ${ratioColor}; white-space: nowrap;">
                ${fmtPctAnalytics(r.costRatioPct)}
                ${r.estGrossMarginPerUnit !== null ? `<div style="font-size: 0.66rem; color: #64748b; font-weight: 400;">粗利 ${fmtYenAnalytics(r.estGrossMarginPerUnit)}</div>` : ''}
              </td>
              <td style="padding: 8px 6px; text-align: center; white-space: nowrap;">${snHtml}</td>
            </tr>
          `;
        }).join('');

    const html = `
      <div class="lot-cost-analytics-wrapper" style="display: flex; flex-direction: column; gap: 14px;">
        <!-- ヘッダー説明＆凡例 -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a;">📦 ロット別 仕入原価・諸掛按分・原価率分析ビュー</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b;">
              入荷ロット台帳・商品マスタ・シリアル台帳・確定伝票からリアルタイム集計（本体単価＋諸掛按分＝確定実原価、前回ロット比と原価率を比較）
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; font-size: 0.72rem; color: #475569; flex-wrap: wrap;">
            <span><span style="display:inline-block; width:10px; height:10px; background:#3b82f6; border-radius:2px; margin-right:4px;"></span>本体仕入単価</span>
            <span><span style="display:inline-block; width:10px; height:10px; background:#f59e0b; border-radius:2px; margin-right:4px;"></span>諸掛按分単価</span>
            <span><span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:2px; margin-right:4px;"></span>直近入庫 組合せ部品原価（BOM）</span>
          </div>
        </div>

        <!-- KPIカード群 -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(175px, 1fr)); gap: 10px;">
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">対象ロット / 明細数</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${fLotCount} <small style="font-size:0.75rem; color:#64748b;">ロット (${kpiSourceRows.length}行${fAssembledCount > 0 && lotCostViewState.itemFilter === 'all' ? `＋組立${fAssembledCount}` : ''})</small></div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">総入荷数量: ${fTotalQty.toLocaleString()}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 8px; padding: 12px;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">確定実原価 総額</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace;">${fmtYenAnalytics(fTotalLanded)}</div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">うち諸掛按分: ${fmtYenAnalytics(fTotalAlloc)}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">平均 諸掛按分比率</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #b45309; margin-top: 2px; font-family: monospace;">${fAllocRatio.toFixed(1)}%</div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">運賃・関税・手数料等の構成比</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 12px;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">加重平均 原価率</div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #5b21b6; margin-top: 2px; font-family: monospace;">${fmtPctAnalytics(fAvgCostRatio)}</div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">基準売価が設定済の品目で算出</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #dc2626; border-radius: 8px; padding: 12px;">
            <div style="font-size: 0.72rem; color: #64748b; font-weight: 700;">最大ロット原価差</div>
            <div style="font-size: 1.15rem; font-weight: 800; color: #b91c1c; margin-top: 2px; font-family: monospace;">
              ${data.summary.maxSpreadItem ? fmtYenAnalytics(data.summary.maxSpreadItem.costSpread) : '未設定 (-)'}
            </div>
            <div style="font-size: 0.68rem; color: #64748b; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${data.summary.maxSpreadItem ? safeEscAnalytics(data.summary.maxSpreadItem.itemName) : '複数ロット品目なし'}
            </div>
          </div>
        </div>

        <!-- フィルタ＆ソートバー -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <select class="form-select lot-cost-filter-item" style="font-size: 0.8rem; width: auto; min-width: 210px;">
            ${itemOptionsHtml}
          </select>
          <select class="form-select lot-cost-filter-proc" style="font-size: 0.8rem; width: auto;">
            <option value="all"${lotCostViewState.procFilter === 'all' ? ' selected' : ''}>仕入区分: すべて</option>
            <option value="import"${lotCostViewState.procFilter === 'import' ? ' selected' : ''}>🌐 輸入仕入のみ</option>
            <option value="domestic"${lotCostViewState.procFilter === 'domestic' ? ' selected' : ''}>🇯🇵 国内仕入のみ</option>
          </select>
          <select class="form-select lot-cost-sort-by" style="font-size: 0.8rem; width: auto;">
            <option value="date_desc"${lotCostViewState.sortBy === 'date_desc' ? ' selected' : ''}>並び順: 入荷日（新しい順）</option>
            <option value="date_asc"${lotCostViewState.sortBy === 'date_asc' ? ' selected' : ''}>並び順: 入荷日（古い順）</option>
            <option value="cost_desc"${lotCostViewState.sortBy === 'cost_desc' ? ' selected' : ''}>並び順: 確定実原価（高い順）</option>
            <option value="cost_asc"${lotCostViewState.sortBy === 'cost_asc' ? ' selected' : ''}>並び順: 確定実原価（安い順）</option>
            <option value="ratio_desc"${lotCostViewState.sortBy === 'ratio_desc' ? ' selected' : ''}>並び順: 原価率（高い順）</option>
            <option value="delta_desc"${lotCostViewState.sortBy === 'delta_desc' ? ' selected' : ''}>並び順: 前回ロット比変動が大きい順</option>
          </select>
          <input type="text" class="form-input lot-cost-search-input" value="${safeEscAnalytics(lotCostViewState.searchQuery)}" placeholder="🔍 ロット番号・品名・仕入先で検索..." style="font-size: 0.8rem; flex: 1; min-width: 180px;">
          <button type="button" class="btn btn-secondary btn-sm lot-cost-reset-btn" style="font-size: 0.75rem;">リセット</button>
        </div>

        <!-- 品目別 ロット原価推移比較パネル -->
        <div>
          <div style="font-size: 0.84rem; font-weight: 800; color: #1e293b; margin-bottom: 8px;">📈 品目別 ロット間 原価推移・調達条件差の比較</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 10px;">
            ${trendCardsHtml}
          </div>
        </div>

        <!-- ロット別原価明細テーブル -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="padding: 10px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <strong style="font-size: 0.85rem; color: #0f172a;">📋 ロット別 原価・諸掛按分・原価率一覧（${filteredRows.length}件）</strong>
          </div>
          <div style="overflow-x: auto;">
            <table class="acc-table" style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
              <thead style="background: #f1f5f9; color: #334155;">
                <tr style="border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 8px 6px; text-align: left;">ロット番号 / 仕入先</th>
                  <th style="padding: 8px 6px; text-align: left;">入荷日 / 区分</th>
                  <th style="padding: 8px 6px; text-align: left;">対象品目</th>
                  <th style="padding: 8px 6px; text-align: right;">数量</th>
                  <th style="padding: 8px 6px; text-align: right;">外貨単価</th>
                  <th style="padding: 8px 6px; text-align: right;">本体円単価</th>
                  <th style="padding: 8px 6px; text-align: right;">諸掛按分/台</th>
                  <th style="padding: 8px 6px; text-align: right;">確定実原価/台</th>
                  <th style="padding: 8px 6px; text-align: right;">前回ロット比</th>
                  <th style="padding: 8px 6px; text-align: right;">基準販売単価</th>
                  <th style="padding: 8px 6px; text-align: right;">原価率</th>
                  <th style="padding: 8px 6px; text-align: center;">S/N台帳</th>
                </tr>
              </thead>
              <tbody>${tableRowsHtml}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    containers.forEach(c => {
      c.innerHTML = html;
    });
    console.log('【ロット別原価ビュー】描画完了', { lots: fLotCount, rows: filteredRows.length });
  } catch (err) {
    console.error('【ロット別原価ビュー】描画エラー:', err);
    containers.forEach(c => {
      c.innerHTML = `<div style="padding: 16px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">ロット別原価ビューの読み込み中にエラーが発生しました: ${safeEscAnalytics(err.message || err)}</div>`;
    });
  }
}
window.renderLotCostAnalyticsView = renderLotCostAnalyticsView;

// ==========================================================================
// 2. 出張・地域・取引先 統合分析ビュー レンダリング
// ==========================================================================

function renderBusinessAnalyticsView(period = null) {
  const container = document.getElementById('accBusinessAnalyticsRoot');
  if (!container) return;

  const activePeriod = period || (typeof currentAccGlobalPeriod !== 'undefined' ? currentAccGlobalPeriod : { preset: 'all', start: '', end: '' });
  console.log('【統合分析ビュー】集計・描画開始', { period: activePeriod, state: { ...bizAnalyticsViewState, expandedClients: bizAnalyticsViewState.expandedClients.size } });

  try {
    const docs = typeof getHistoryList === 'function' ? getHistoryList(false) : [];
    const clients = typeof getClientMasterList === 'function' ? getClientMasterList(false) : [];
    const expenses = typeof getExpenseList === 'function' ? getExpenseList() : [];
    const manualJournals = typeof getManualJournals === 'function' ? getManualJournals() : [];

    const data = buildBusinessAnalytics({
      docs,
      clients,
      expenses,
      manualJournals,
      period: activePeriod,
      includeZeroDocs: bizAnalyticsViewState.includeZeroDocs,
      tripStart: bizAnalyticsViewState.tripStart,
      tripEnd: bizAnalyticsViewState.tripEnd,
      followUpDays: bizAnalyticsViewState.followUpDays,
      filterRegion: bizAnalyticsViewState.tripRegion,
      filterPrefecture: bizAnalyticsViewState.tripPrefecture,
      filterClient: bizAnalyticsViewState.tripClient
    });

    // 初回のみ自動検出された最新出張期間を状態へ同期
    if (!bizAnalyticsViewState.initializedTripDefault && data.tripImpact.tripStart) {
      bizAnalyticsViewState.tripStart = data.tripImpact.tripStart;
      bizAnalyticsViewState.tripEnd = data.tripImpact.tripEnd;
      bizAnalyticsViewState.initializedTripDefault = true;
    }

    const periodBadgeText = (activePeriod && (activePeriod.start || activePeriod.end))
      ? `${activePeriod.start || '開始指定なし'} 〜 ${activePeriod.end || '終了指定なし'}`
      : '全期間（累計）';

    // --- Section 1: 取引先別 売上・粗利サマリー ---
    const clientQ = bizAnalyticsViewState.clientSearch.trim().toLowerCase();
    let filteredClients = data.clientSummary.filter(c => {
      if (bizAnalyticsViewState.tripRegion !== 'all' && c.region !== bizAnalyticsViewState.tripRegion) return false;
      if (bizAnalyticsViewState.tripPrefecture !== 'all' && c.prefecture !== bizAnalyticsViewState.tripPrefecture) return false;
      if (clientQ) {
        const hay = `${c.clientName} ${c.region} ${c.prefecture} ${c.endUsers.join(' ')} ${c.titles.join(' ')}`.toLowerCase();
        if (!hay.includes(clientQ)) return false;
      }
      return true;
    });

    filteredClients = [...filteredClients].sort((a, b) => {
      switch (bizAnalyticsViewState.clientSortBy) {
        case 'gp_desc': return b.grossProfit - a.grossProfit;
        case 'margin_desc': return (b.grossMarginPct ?? -999) - (a.grossMarginPct ?? -999);
        case 'count_desc': return b.docCount - a.docCount || b.sales - a.sales;
        case 'last_desc': return (b.lastDate || '').localeCompare(a.lastDate || '');
        case 'sales_desc':
        default: return b.sales - a.sales;
      }
    });

    const clientRowsHtml = filteredClients.length === 0
      ? `<tr><td colspan="9" style="padding: 24px; text-align: center; color: #94a3b8;">対象条件の取引先データがありません。</td></tr>`
      : filteredClients.map(c => {
          const isOpen = bizAnalyticsViewState.expandedClients.has(c.clientKey);
          const repeatBadge = c.isRepeat
            ? `<span style="background:#dbeafe; color:#1d4ed8; font-size:0.66rem; font-weight:700; padding:1px 6px; border-radius:9999px; margin-left:4px;">リピート ${c.docCount}回</span>`
            : '';
          const euHtml = c.endUsers.length > 0
            ? c.endUsers.slice(0, 4).map(eu => `<span style="display:inline-block; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; font-size:0.66rem; padding:1px 5px; border-radius:4px; margin:1px 2px 1px 0;">${safeEscAnalytics(eu)}</span>`).join('') +
              (c.endUsers.length > 4 ? `<span style="font-size:0.66rem; color:#64748b;"> +${c.endUsers.length - 4}件</span>` : '')
            : `<span style="color:#94a3b8; font-size:0.72rem;">未設定 (-)</span>`;

          const detailRowHtml = isOpen ? `
            <tr style="background: #f8fafc;">
              <td colspan="9" style="padding: 10px 14px; border-bottom: 2px solid #cbd5e1;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">
                  <div style="font-size: 0.75rem; font-weight: 700; color: #334155;">
                    📂 「${safeEscAnalytics(c.clientName)}」取引履歴・エンドユーザー展開（計 ${c.docs.length} 件 / 初回 ${safeEscAnalytics(c.firstDate || '-')} 〜 最終 ${safeEscAnalytics(c.lastDate || '-')}）
                  </div>
                  <button type="button" class="btn btn-secondary btn-xs biz-focus-client-trip-btn" data-client-name="${safeEscAnalytics(c.clientName)}" style="font-size: 0.7rem;">
                    🎯 この取引先で出張後追い分析を絞込
                  </button>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.74rem; background: #ffffff; border: 1px solid #e2e8f0;">
                  <thead>
                    <tr style="background: #f1f5f9; color: #475569; border-bottom: 1px solid #cbd5e1;">
                      <th style="padding: 5px 6px; text-align: left;">発行日</th>
                      <th style="padding: 5px 6px; text-align: left;">伝票番号</th>
                      <th style="padding: 5px 6px; text-align: left;">件名 / エンドユーザー</th>
                      <th style="padding: 5px 6px; text-align: right;">数量</th>
                      <th style="padding: 5px 6px; text-align: right;">売上(税抜)</th>
                      <th style="padding: 5px 6px; text-align: right;">原価</th>
                      <th style="padding: 5px 6px; text-align: right;">粗利額</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${c.docs.map(d => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 5px 6px; white-space: nowrap;">${safeEscAnalytics(d.issueDate || '-')}</td>
                        <td style="padding: 5px 6px; font-family: monospace; white-space: nowrap;">${safeEscAnalytics(d.docNumber)}</td>
                        <td style="padding: 5px 6px;">
                          ${safeEscAnalytics(d.title || '（件名なし）')}
                          ${d.endUsers.length > 0 ? `<span style="margin-left:6px; color:#15803d; font-size:0.68rem;">[EU: ${safeEscAnalytics(d.endUsers.join(', '))}]</span>` : ''}
                        </td>
                        <td style="padding: 5px 6px; text-align: right;">${d.totalQty}</td>
                        <td style="padding: 5px 6px; text-align: right; font-family: monospace;">${fmtYenAnalytics(d.sales)}</td>
                        <td style="padding: 5px 6px; text-align: right; font-family: monospace; color: #64748b;">${fmtYenAnalytics(d.cogs)}</td>
                        <td style="padding: 5px 6px; text-align: right; font-family: monospace; font-weight: 700; color: ${d.grossProfit >= 0 ? '#059669' : '#dc2626'};">${fmtYenAnalytics(d.grossProfit)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </td>
            </tr>
          ` : '';

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 6px;">
                <button type="button" class="biz-toggle-client-detail" data-client-key="${safeEscAnalytics(c.clientKey)}" style="background: none; border: none; padding: 0; cursor: pointer; text-align: left; font-weight: 700; color: #0f172a; font-size: 0.8rem;">
                  <span style="display:inline-block; width:14px; color:#2563eb;">${isOpen ? '▼' : '▶'}</span>${safeEscAnalytics(c.clientName)}
                </button>${repeatBadge}
              </td>
              <td style="padding: 8px 6px; white-space: nowrap; font-size: 0.74rem; color: #475569;">
                <span style="background:#f1f5f9; padding:1px 6px; border-radius:4px;">${safeEscAnalytics(c.region)}</span>
                <div style="font-size:0.68rem; color:#64748b; margin-top:2px;">${safeEscAnalytics(c.prefecture)}</div>
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; white-space: nowrap;">${fmtYenAnalytics(c.sales)}</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #64748b; white-space: nowrap;">${fmtYenAnalytics(c.cogs)}</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 800; color: ${c.grossProfit >= 0 ? '#059669' : '#dc2626'}; white-space: nowrap;">${fmtYenAnalytics(c.grossProfit)}</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 700; color: #334155; white-space: nowrap;">${fmtPctAnalytics(c.grossMarginPct)}</td>
              <td style="padding: 8px 6px; text-align: right; white-space: nowrap;">
                <strong>${c.docCount}件</strong><div style="font-size:0.68rem; color:#64748b;">計 ${c.totalQty}点</div>
              </td>
              <td style="padding: 8px 6px; white-space: nowrap; font-size: 0.74rem; color: #334155;">${safeEscAnalytics(c.lastDate || '未設定 (-)')}</td>
              <td style="padding: 8px 6px; max-width: 220px;">${euHtml}</td>
            </tr>
            ${detailRowHtml}
          `;
        }).join('');

    // --- Section 2: 地域（エリア・都道府県）別 売上・経費バランス ---
    const geoRows = bizAnalyticsViewState.geoGranularity === 'prefecture' ? data.prefectureSummary : data.regionSummary;
    const maxGeoScale = Math.max(1, ...geoRows.map(g => Math.max(g.grossProfit, g.totalExpense, g.sales * 0.5)));

    const geoRowsHtml = geoRows.length === 0
      ? `<tr><td colspan="10" style="padding: 24px; text-align: center; color: #94a3b8;">対象期間の地域別データがありません。</td></tr>`
      : geoRows.map(g => {
          const gpBarW = Math.min(100, Math.max(0, Math.round((Math.max(0, g.grossProfit) / maxGeoScale) * 100)));
          const expBarW = Math.min(100, Math.max(0, Math.round((g.totalExpense / maxGeoScale) * 100)));
          const isSelectedGeo =
            (bizAnalyticsViewState.geoGranularity === 'region' && bizAnalyticsViewState.tripRegion === g.key) ||
            (bizAnalyticsViewState.geoGranularity === 'prefecture' && bizAnalyticsViewState.tripPrefecture === g.key);

          return `
            <tr style="border-bottom: 1px solid #e2e8f0; background: ${isSelectedGeo ? '#eff6ff' : '#ffffff'};">
              <td style="padding: 8px 6px; font-weight: 700; white-space: nowrap;">
                <button type="button" class="biz-pick-geo-btn" data-geo-mode="${bizAnalyticsViewState.geoGranularity}" data-geo-key="${safeEscAnalytics(g.key)}" style="background:none; border:none; padding:0; cursor:pointer; font-weight:800; color:${isSelectedGeo ? '#1d4ed8' : '#0f172a'}; text-decoration: underline;">
                  ${safeEscAnalytics(g.label)}
                </button>
                ${bizAnalyticsViewState.geoGranularity === 'prefecture' && g.region !== g.label ? `<div style="font-size:0.66rem; color:#64748b; font-weight:400;">${safeEscAnalytics(g.region)}</div>` : ''}
              </td>
              <td style="padding: 8px 6px; text-align: right; white-space: nowrap; font-size: 0.74rem; color: #475569;">${g.clientCount}社 / ${g.docCount}件</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 700; white-space: nowrap;">${fmtYenAnalytics(g.sales)}</td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 800; color: ${g.grossProfit >= 0 ? '#059669' : '#dc2626'}; white-space: nowrap;">
                ${fmtYenAnalytics(g.grossProfit)}
                <div style="font-size:0.66rem; color:#64748b; font-weight:400;">${fmtPctAnalytics(g.grossMarginPct)}</div>
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; color: #b45309; font-weight: 700; white-space: nowrap;">
                ${fmtYenAnalytics(g.totalExpense)}
                <div style="font-size:0.66rem; color:#64748b; font-weight:400;">${g.expenseCount}件</div>
              </td>
              <td style="padding: 8px 6px; font-size: 0.7rem; color: #475569; white-space: nowrap;">
                旅費 ${fmtYenAnalytics(g.travelExpense)} / 車両 ${fmtYenAnalytics(g.vehicleExpense)}<br>交際 ${fmtYenAnalytics(g.entertainExpense)}
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; font-weight: 800; color: ${g.netContribution >= 0 ? '#047857' : '#dc2626'}; white-space: nowrap;">
                ${fmtYenAnalytics(g.netContribution)}
              </td>
              <td style="padding: 8px 6px; text-align: right; font-family: monospace; white-space: nowrap; color: #334155;">
                ${g.expenseToSalesPct !== null ? `${g.expenseToSalesPct.toFixed(1)}%` : '未設定 (-)'}
                <div style="font-size:0.66rem; color:#64748b;">${g.roiMultiple !== null ? `${g.roiMultiple.toFixed(1)}倍` : '-'}</div>
              </td>
              <td style="padding: 8px 6px; min-width: 140px;">
                <div style="display: flex; flex-direction: column; gap: 3px;">
                  <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:0.62rem; color:#059669; width:24px;">粗利</span>
                    <div style="flex:1; height:7px; background:#f1f5f9; border-radius:4px; overflow:hidden;"><div style="width:${gpBarW}%; height:100%; background:#10b981;"></div></div>
                  </div>
                  <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:0.62rem; color:#d97706; width:24px;">経費</span>
                    <div style="flex:1; height:7px; background:#f1f5f9; border-radius:4px; overflow:hidden;"><div style="width:${expBarW}%; height:100%; background:#f59e0b;"></div></div>
                  </div>
                </div>
              </td>
            </tr>
          `;
        }).join('');

    // --- Section 3: 出張期間と「直後〜後追い」売上の連動確認 ---
    const ti = data.tripImpact;
    const candidateOptionsHtml = [
      `<option value="">-- 経費発生期間から自動抽出された出張候補（${data.tripCandidates.length}件） --</option>`,
      ...data.tripCandidates.map(c => {
        const selected = (c.startDate === ti.tripStart && c.endDate === ti.tripEnd) ? ' selected' : '';
        return `<option value="${safeEscAnalytics(c.startDate)}|${safeEscAnalytics(c.endDate)}|${safeEscAnalytics(c.primaryRegion)}"${selected}>${safeEscAnalytics(c.label)}</option>`;
      })
    ].join('');

    const regionFilterOptionsHtml = [
      `<option value="all"${bizAnalyticsViewState.tripRegion === 'all' ? ' selected' : ''}>エリア: すべて</option>`,
      ...data.availableRegions.map(r => `<option value="${safeEscAnalytics(r)}"${bizAnalyticsViewState.tripRegion === r ? ' selected' : ''}>${safeEscAnalytics(r)}</option>`)
    ].join('');

    const prefFilterOptionsHtml = [
      `<option value="all"${bizAnalyticsViewState.tripPrefecture === 'all' ? ' selected' : ''}>都道府県: すべて</option>`,
      ...data.availablePrefectures.map(p => `<option value="${safeEscAnalytics(p)}"${bizAnalyticsViewState.tripPrefecture === p ? ' selected' : ''}>${safeEscAnalytics(p)}</option>`)
    ].join('');

    const clientFilterOptionsHtml = [
      `<option value="all"${bizAnalyticsViewState.tripClient === 'all' ? ' selected' : ''}>取引先: すべて</option>`,
      ...data.availableClients.map(cn => `<option value="${safeEscAnalytics(cn)}"${bizAnalyticsViewState.tripClient === cn ? ' selected' : ''}>${safeEscAnalytics(cn)}</option>`)
    ].join('');

    const timelineRowsHtml = ti.timelineDocs.length === 0
      ? `<tr><td colspan="8" style="padding: 20px; text-align: center; color: #94a3b8;">指定された出張期間および後追い期間（${ti.followUpDays}日間）に該当する売上伝票はありません。</td></tr>`
      : ti.timelineDocs.map(d => {
          const phaseBadge = d.phase === 'during'
            ? `<span style="background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; padding:1px 6px; border-radius:9999px; font-size:0.68rem; font-weight:700;">出張期間中</span>`
            : `<span style="background:#ecfdf5; color:#047857; border:1px solid #86efac; padding:1px 6px; border-radius:9999px; font-size:0.68rem; font-weight:700;">終了後 +${d.daysAfterTrip}日</span>`;
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 7px 6px; white-space: nowrap;">${phaseBadge}</td>
              <td style="padding: 7px 6px; white-space: nowrap;">${safeEscAnalytics(d.issueDate)}</td>
              <td style="padding: 7px 6px; font-family: monospace; white-space: nowrap;">${safeEscAnalytics(d.docNumber)}</td>
              <td style="padding: 7px 6px; font-weight: 700;">${safeEscAnalytics(d.clientName)}</td>
              <td style="padding: 7px 6px; font-size: 0.74rem; color: #475569; white-space: nowrap;">${safeEscAnalytics(d.prefecture)}</td>
              <td style="padding: 7px 6px; font-size: 0.74rem; color: #475569;">${safeEscAnalytics(d.endUsers.join(', ') || d.title || '-')}</td>
              <td style="padding: 7px 6px; text-align: right; font-family: monospace; font-weight: 700;">${fmtYenAnalytics(d.sales)}</td>
              <td style="padding: 7px 6px; text-align: right; font-family: monospace; font-weight: 800; color: ${d.grossProfit >= 0 ? '#059669' : '#dc2626'};">${fmtYenAnalytics(d.grossProfit)}</td>
            </tr>
          `;
        }).join('');

    const tripExpRowsHtml = ti.tripExpenses.length === 0
      ? `<tr><td colspan="5" style="padding: 16px; text-align: center; color: #94a3b8;">該当する出張期間内の移動・デモ関連経費はありません。</td></tr>`
      : ti.tripExpenses.map(e => `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 6px; white-space: nowrap;">${safeEscAnalytics(e.date)}</td>
            <td style="padding: 6px; white-space: nowrap;"><span style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:4px; font-size:0.68rem; font-weight:700;">${safeEscAnalytics(e.category)}</span></td>
            <td style="padding: 6px; white-space: nowrap; font-size: 0.72rem; color: #475569;">${safeEscAnalytics(e.prefecture)}</td>
            <td style="padding: 6px; font-size: 0.74rem;">${safeEscAnalytics(e.payee)}${e.note ? ` <span style="color:#64748b;">(${safeEscAnalytics(e.note)})</span>` : ''}</td>
            <td style="padding: 6px; text-align: right; font-family: monospace; font-weight: 700; color: #b45309; white-space: nowrap;">${fmtYenAnalytics(e.amount)}</td>
          </tr>
        `).join('');

    const showClients = bizAnalyticsViewState.activeSubTab === 'all' || bizAnalyticsViewState.activeSubTab === 'clients';
    const showRegions = bizAnalyticsViewState.activeSubTab === 'all' || bizAnalyticsViewState.activeSubTab === 'regions';
    const showTrips = bizAnalyticsViewState.activeSubTab === 'all' || bizAnalyticsViewState.activeSubTab === 'trips';

    const subTabBtn = (key, label) => {
      const active = bizAnalyticsViewState.activeSubTab === key;
      return `<button type="button" class="biz-subtab-btn" data-subtab="${key}" style="padding: 6px 12px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; border: 1px solid ${active ? '#2563eb' : '#cbd5e1'}; background: ${active ? '#2563eb' : '#ffffff'}; color: ${active ? '#ffffff' : '#334155'};">${label}</button>`;
    };

    const followUpPresetBtn = (days) => {
      const active = Number(bizAnalyticsViewState.followUpDays) === days;
      return `<button type="button" class="biz-followup-preset-btn" data-days="${days}" style="padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; border: 1px solid ${active ? '#059669' : '#cbd5e1'}; background: ${active ? '#ecfdf5' : '#ffffff'}; color: ${active ? '#047857' : '#475569'};">終了後 ${days}日</button>`;
    };

    const hasGeoOrClientFilter = bizAnalyticsViewState.tripRegion !== 'all' || bizAnalyticsViewState.tripPrefecture !== 'all' || bizAnalyticsViewState.tripClient !== 'all';

    container.innerHTML = `
      <div class="biz-analytics-wrapper" style="display: flex; flex-direction: column; gap: 16px;">
        <!-- ヘッダー＆サブビュー切替 -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="margin: 0; font-size: 1.02rem; font-weight: 800; color: #0f172a;">🗺️ 出張・地域・取引先 統合分析ビュー</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: #64748b;">
              集計対象期間: <strong style="color:#0369a1;">${safeEscAnalytics(periodBadgeText)}</strong>（上部グローバル期間と連動 / 出張後追い分析は期間外の売上も横断追跡）
            </p>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <label style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.76rem; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; cursor: pointer;">
              <input type="checkbox" class="biz-include-zero-chk"${bizAnalyticsViewState.includeZeroDocs ? ' checked' : ''}>
              ¥0伝票（デモ機・寄贈等）を含める
            </label>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${subTabBtn('all', 'すべて一覧')}
              ${subTabBtn('clients', '🏢 取引先別')}
              ${subTabBtn('regions', '🗾 地域・経費バランス')}
              ${subTabBtn('trips', '🚄 出張・後追い売上')}
            </div>
          </div>
        </div>

        <!-- 全体KPIサマリー -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px;">
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #2563eb; border-radius:8px; padding:12px;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">期間売上高（税抜）</div>
            <div style="font-size:1.25rem; font-weight:800; color:#0f172a; font-family:monospace; margin-top:2px;">${fmtYenAnalytics(data.kpi.totalSales)}</div>
            <div style="font-size:0.7rem; color:#64748b;">伝票 ${data.kpi.docCount}件 / 原価 ${fmtYenAnalytics(data.kpi.totalCogs)}</div>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #059669; border-radius:8px; padding:12px;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">粗利額 / 粗利率</div>
            <div style="font-size:1.25rem; font-weight:800; color:#047857; font-family:monospace; margin-top:2px;">${fmtYenAnalytics(data.kpi.totalGrossProfit)}</div>
            <div style="font-size:0.7rem; color:#059669; font-weight:700;">粗利率 ${fmtPctAnalytics(data.kpi.grossMarginPct)}</div>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #f59e0b; border-radius:8px; padding:12px;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">移動・デモ関連経費</div>
            <div style="font-size:1.25rem; font-weight:800; color:#b45309; font-family:monospace; margin-top:2px;">${fmtYenAnalytics(data.kpi.totalTravelDemoExpense)}</div>
            <div style="font-size:0.7rem; color:#64748b;">旅費・車両・交際費 計 ${data.kpi.travelDemoExpenseCount}件</div>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #7c3aed; border-radius:8px; padding:12px;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">移動経費控除後 貢献益</div>
            <div style="font-size:1.25rem; font-weight:800; color:${data.kpi.netAfterTravelExpense >= 0 ? '#5b21b6' : '#dc2626'}; font-family:monospace; margin-top:2px;">${fmtYenAnalytics(data.kpi.netAfterTravelExpense)}</div>
            <div style="font-size:0.7rem; color:#64748b;">粗利 − 移動/デモ関連経費</div>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-left:4px solid #0891b2; border-radius:8px; padding:12px;">
            <div style="font-size:0.72rem; color:#64748b; font-weight:700;">取引先数 / リピート</div>
            <div style="font-size:1.25rem; font-weight:800; color:#0e7490; margin-top:2px;">${data.kpi.clientCount}社 <small style="font-size:0.75rem; color:#64748b;">(リピート ${data.kpi.repeatClientCount}社)</small></div>
            <div style="font-size:0.7rem; color:#64748b;">2回以上取引のある顧客数</div>
          </div>
        </div>

        <!-- 共通エリア・取引先連動フィルタバー -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 0.76rem; font-weight: 700; color: #334155;">🎯 連動絞込:</span>
          <select class="form-select biz-filter-region" style="font-size: 0.78rem; width: auto;">${regionFilterOptionsHtml}</select>
          <select class="form-select biz-filter-pref" style="font-size: 0.78rem; width: auto;">${prefFilterOptionsHtml}</select>
          <select class="form-select biz-filter-client" style="font-size: 0.78rem; width: auto; max-width: 240px;">${clientFilterOptionsHtml}</select>
          ${hasGeoOrClientFilter ? `<button type="button" class="btn btn-secondary btn-xs biz-clear-scope-btn" style="font-size: 0.74rem; color: #dc2626; border-color: #fca5a5;">✕ 絞込解除</button>` : ''}
        </div>

        ${showClients ? `
        <!-- ① 取引先別 売上・粗利サマリー -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="padding: 12px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong style="font-size: 0.9rem; color: #0f172a;">① 取引先別 売上・粗利サマリー（${filteredClients.length}社）</strong>
              <span style="font-size: 0.72rem; color: #64748b; margin-left: 8px;">※取引先名をクリックすると複数回取引・エンドユーザー展開の内訳を展開できます</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <input type="text" class="form-input biz-client-search" value="${safeEscAnalytics(bizAnalyticsViewState.clientSearch)}" placeholder="🔍 取引先・エンドユーザー検索..." style="font-size: 0.78rem; width: 200px; padding: 4px 8px;">
              <select class="form-select biz-client-sort" style="font-size: 0.78rem; width: auto; padding: 4px 8px;">
                <option value="sales_desc"${bizAnalyticsViewState.clientSortBy === 'sales_desc' ? ' selected' : ''}>売上高 高い順</option>
                <option value="gp_desc"${bizAnalyticsViewState.clientSortBy === 'gp_desc' ? ' selected' : ''}>粗利額 高い順</option>
                <option value="margin_desc"${bizAnalyticsViewState.clientSortBy === 'margin_desc' ? ' selected' : ''}>粗利率 高い順</option>
                <option value="count_desc"${bizAnalyticsViewState.clientSortBy === 'count_desc' ? ' selected' : ''}>伝票件数 多い順</option>
                <option value="last_desc"${bizAnalyticsViewState.clientSortBy === 'last_desc' ? ' selected' : ''}>最終取引日 新しい順</option>
              </select>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="acc-table" style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
              <thead style="background: #f1f5f9; color: #334155;">
                <tr style="border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 8px 6px; text-align: left;">取引先名</th>
                  <th style="padding: 8px 6px; text-align: left;">エリア / 都道府県</th>
                  <th style="padding: 8px 6px; text-align: right;">売上高(税抜)</th>
                  <th style="padding: 8px 6px; text-align: right;">売上原価</th>
                  <th style="padding: 8px 6px; text-align: right;">粗利額</th>
                  <th style="padding: 8px 6px; text-align: right;">粗利率</th>
                  <th style="padding: 8px 6px; text-align: right;">件数 / 数量</th>
                  <th style="padding: 8px 6px; text-align: left;">最終取引日</th>
                  <th style="padding: 8px 6px; text-align: left;">エンドユーザー / 展開先</th>
                </tr>
              </thead>
              <tbody>${clientRowsHtml}</tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${showRegions ? `
        <!-- ② 地域（エリア・都道府県）別 売上・経費バランス -->
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden;">
          <div style="padding: 12px 14px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <strong style="font-size: 0.9rem; color: #0f172a;">② 地域（エリア・都道府県）別 売上・経費バランス</strong>
              <span style="font-size: 0.72rem; color: #64748b; margin-left: 8px;">※地域名をクリックすると取引先一覧・出張後追い分析をその地域へ連動絞り込みします</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button type="button" class="biz-geo-mode-btn" data-mode="region" style="padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; border: 1px solid ${bizAnalyticsViewState.geoGranularity === 'region' ? '#2563eb' : '#cbd5e1'}; background: ${bizAnalyticsViewState.geoGranularity === 'region' ? '#eff6ff' : '#ffffff'}; color: ${bizAnalyticsViewState.geoGranularity === 'region' ? '#1d4ed8' : '#475569'};">地方エリア別</button>
              <button type="button" class="biz-geo-mode-btn" data-mode="prefecture" style="padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 700; cursor: pointer; border: 1px solid ${bizAnalyticsViewState.geoGranularity === 'prefecture' ? '#2563eb' : '#cbd5e1'}; background: ${bizAnalyticsViewState.geoGranularity === 'prefecture' ? '#eff6ff' : '#ffffff'}; color: ${bizAnalyticsViewState.geoGranularity === 'prefecture' ? '#1d4ed8' : '#475569'};">都道府県別</button>
            </div>
          </div>
          <div style="overflow-x: auto;">
            <table class="acc-table" style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
              <thead style="background: #f1f5f9; color: #334155;">
                <tr style="border-bottom: 1px solid #cbd5e1;">
                  <th style="padding: 8px 6px; text-align: left;">${bizAnalyticsViewState.geoGranularity === 'prefecture' ? '都道府県' : '地方エリア'}</th>
                  <th style="padding: 8px 6px; text-align: right;">取引先 / 伝票</th>
                  <th style="padding: 8px 6px; text-align: right;">売上高(税抜)</th>
                  <th style="padding: 8px 6px; text-align: right;">粗利額 / 率</th>
                  <th style="padding: 8px 6px; text-align: right;">移動/デモ経費</th>
                  <th style="padding: 8px 6px; text-align: left;">経費内訳（旅費/車両/交際）</th>
                  <th style="padding: 8px 6px; text-align: right;">経費差引貢献益</th>
                  <th style="padding: 8px 6px; text-align: right;">経費率 / 回収倍率</th>
                  <th style="padding: 8px 6px; text-align: left;">粗利 vs 経費バランス</th>
                </tr>
              </thead>
              <tbody>${geoRowsHtml}</tbody>
            </table>
          </div>
        </div>
        ` : ''}

        ${showTrips ? `
        <!-- ③ 出張期間と「直後〜後追い」売上の連動確認 -->
        <div style="background: #ffffff; border: 1.5px solid #bfdbfe; border-radius: 10px; overflow: hidden;">
          <div style="padding: 12px 14px; background: linear-gradient(135deg, #eff6ff, #f8fafc); border-bottom: 1px solid #bfdbfe;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
              <div>
                <strong style="font-size: 0.92rem; color: #1e3a8a;">③ 出張期間と「直後〜後追い」売上の連動確認</strong>
                <span style="font-size: 0.72rem; color: #475569; margin-left: 8px;">出張期間中の売上と終了後 N 日間の後追い累計売上・粗利を出張経費と対比</span>
              </div>
              <div style="display: flex; gap: 4px; align-items: center; flex-wrap: wrap;">
                ${followUpPresetBtn(30)}
                ${followUpPresetBtn(60)}
                ${followUpPresetBtn(90)}
                ${followUpPresetBtn(180)}
              </div>
            </div>

            <!-- 出張期間＆後追い日数コントロール -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <select class="form-select biz-trip-candidate-select" style="font-size: 0.78rem; max-width: 380px;">
                ${candidateOptionsHtml}
              </select>
              <div style="display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px;">
                <span style="font-size: 0.72rem; color: #475569; font-weight: 700;">出張期間:</span>
                <input type="date" class="biz-trip-start-input" value="${safeEscAnalytics(ti.tripStart)}" style="border:none; font-size:0.78rem; outline:none;">
                <span style="color:#64748b;">〜</span>
                <input type="date" class="biz-trip-end-input" value="${safeEscAnalytics(ti.tripEnd)}" style="border:none; font-size:0.78rem; outline:none;">
              </div>
              <div style="display: inline-flex; align-items: center; gap: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px;">
                <span style="font-size: 0.72rem; color: #475569; font-weight: 700;">後追い:</span>
                <input type="number" class="biz-followup-days-input" min="0" max="365" value="${ti.followUpDays}" style="width: 56px; border: none; text-align: right; font-weight: 700; font-size: 0.8rem; outline: none;">
                <span style="font-size: 0.72rem; color: #475569;">日間（〜${safeEscAnalytics(ti.followUpEnd || '-')}）</span>
              </div>
            </div>
          </div>

          <!-- 出張経費 vs 期間中売上 vs 後追い累計 比較カード -->
          <div style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #92400e;">🎫 出張期間中の関連経費（${ti.tripDays}日間 / ${ti.tripExpenseCount}件）</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #b45309; font-family: monospace; margin-top: 3px;">${fmtYenAnalytics(ti.tripExpenseTotal)}</div>
                <div style="font-size: 0.69rem; color: #78350f; margin-top: 4px;">
                  旅費 ${fmtYenAnalytics(ti.tripExpenseBreakdown.travel)} / 車両 ${fmtYenAnalytics(ti.tripExpenseBreakdown.vehicle)} / 交際 ${fmtYenAnalytics(ti.tripExpenseBreakdown.entertain)}
                </div>
              </div>
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #1e40af;">📍 出張期間中の売上・粗利（${ti.during.docCount}件）</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #1d4ed8; font-family: monospace; margin-top: 3px;">${fmtYenAnalytics(ti.during.sales)}</div>
                <div style="font-size: 0.72rem; color: #1e3a8a; margin-top: 4px;">粗利: <strong>${fmtYenAnalytics(ti.during.grossProfit)}</strong>（原価 ${fmtYenAnalytics(ti.during.cogs)}）</div>
              </div>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #166534;">🚀 後追い期間の追加売上（終了後${ti.followUpDays}日 / ${ti.followUp.docCount}件）</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #15803d; font-family: monospace; margin-top: 3px;">${fmtYenAnalytics(ti.followUp.sales)}</div>
                <div style="font-size: 0.72rem; color: #166534; margin-top: 4px;">粗利: <strong>${fmtYenAnalytics(ti.followUp.grossProfit)}</strong>（${safeEscAnalytics(ti.followUpStart || '-')} 〜 ${safeEscAnalytics(ti.followUpEnd || '-')}）</div>
              </div>
              <div style="background: #f5f3ff; border: 1.5px solid #c4b5fd; border-radius: 8px; padding: 12px;">
                <div style="font-size: 0.72rem; font-weight: 700; color: #5b21b6;">🏆 期間中＋後追い 累計成果（計 ${ti.combined.docCount}件）</div>
                <div style="font-size: 1.3rem; font-weight: 800; color: #4c1d95; font-family: monospace; margin-top: 3px;">${fmtYenAnalytics(ti.combined.sales)}</div>
                <div style="font-size: 0.71rem; color: #5b21b6; margin-top: 4px;">
                  累計粗利 <strong>${fmtYenAnalytics(ti.combined.grossProfit)}</strong> / 経費差引 <strong style="color:${ti.netAfterTripExpense >= 0 ? '#047857' : '#dc2626'};">${fmtYenAnalytics(ti.netAfterTripExpense)}</strong>
                  ${ti.salesToExpenseRatio !== null ? `（売上 ${ti.salesToExpenseRatio.toFixed(1)}倍）` : ''}
                </div>
              </div>
            </div>

            <!-- タイムライン詳細（売上伝票 ＆ 出張経費） -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 12px;">
              <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; font-weight: 700; color: #0f172a;">
                  📄 連動売上タイムライン（出張中＋終了後 ${ti.followUpDays}日 / ${ti.timelineDocs.length}件）
                </div>
                <div style="max-height: 290px; overflow-y: auto;">
                  <table class="acc-table" style="width: 100%; border-collapse: collapse; font-size: 0.74rem;">
                    <thead style="position: sticky; top: 0; background: #f1f5f9;">
                      <tr style="border-bottom: 1px solid #cbd5e1;">
                        <th style="padding: 6px; text-align: left;">区分</th>
                        <th style="padding: 6px; text-align: left;">日付</th>
                        <th style="padding: 6px; text-align: left;">伝票番号</th>
                        <th style="padding: 6px; text-align: left;">取引先</th>
                        <th style="padding: 6px; text-align: left;">都道府県</th>
                        <th style="padding: 6px; text-align: left;">案件 / EU</th>
                        <th style="padding: 6px; text-align: right;">売上</th>
                        <th style="padding: 6px; text-align: right;">粗利</th>
                      </tr>
                    </thead>
                    <tbody>${timelineRowsHtml}</tbody>
                  </table>
                </div>
              </div>

              <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="padding: 8px 12px; background: #fffbeb; border-bottom: 1px solid #fde68a; font-size: 0.8rem; font-weight: 700; color: #92400e;">
                  🧾 対象出張期間の移動・デモ関連経費明細（${ti.tripExpenses.length}件）
                </div>
                <div style="max-height: 290px; overflow-y: auto;">
                  <table class="acc-table" style="width: 100%; border-collapse: collapse; font-size: 0.74rem;">
                    <thead style="position: sticky; top: 0; background: #fef3c7;">
                      <tr style="border-bottom: 1px solid #fde68a;">
                        <th style="padding: 6px; text-align: left;">日付</th>
                        <th style="padding: 6px; text-align: left;">科目</th>
                        <th style="padding: 6px; text-align: left;">推定地</th>
                        <th style="padding: 6px; text-align: left;">支払先・摘要</th>
                        <th style="padding: 6px; text-align: right;">金額</th>
                      </tr>
                    </thead>
                    <tbody>${tripExpRowsHtml}</tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;

    console.log('【統合分析ビュー】描画完了', {
      clients: filteredClients.length,
      geoRows: geoRows.length,
      tripStart: ti.tripStart,
      tripEnd: ti.tripEnd,
      timelineDocs: ti.timelineDocs.length
    });
  } catch (err) {
    console.error('【統合分析ビュー】描画エラー:', err);
    container.innerHTML = `<div style="padding: 16px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">統合分析ビューの読み込み中にエラーが発生しました: ${safeEscAnalytics(err.message || err)}</div>`;
  }
}
window.renderBusinessAnalyticsView = renderBusinessAnalyticsView;

// ==========================================================================
// 3. イベント委譲（クリック・変更・入力を document レベルで一元管理）
// ==========================================================================

document.addEventListener('click', (e) => {
  const target = e.target;
  if (!target || typeof target.closest !== 'function') return;

  // ロット原価：品目カードの絞込トグル
  const pickItemBtn = target.closest('.lot-cost-pick-item-btn');
  if (pickItemBtn) {
    const id = pickItemBtn.dataset.itemId || 'all';
    lotCostViewState.itemFilter = (lotCostViewState.itemFilter === id) ? 'all' : id;
    console.log('【ロット別原価ビュー】品目フィルタ切替:', lotCostViewState.itemFilter);
    renderLotCostAnalyticsView();
    return;
  }

  // ロット原価：リセット
  if (target.closest('.lot-cost-reset-btn')) {
    lotCostViewState.itemFilter = 'all';
    lotCostViewState.procFilter = 'all';
    lotCostViewState.searchQuery = '';
    lotCostViewState.sortBy = 'date_desc';
    console.log('【ロット別原価ビュー】フィルタリセット');
    renderLotCostAnalyticsView();
    return;
  }

  // 統合分析：サブタブ切替
  const subTabBtn = target.closest('.biz-subtab-btn');
  if (subTabBtn) {
    bizAnalyticsViewState.activeSubTab = subTabBtn.dataset.subtab || 'all';
    console.log('【統合分析ビュー】サブタブ切替:', bizAnalyticsViewState.activeSubTab);
    renderBusinessAnalyticsView();
    return;
  }

  // 統合分析：取引先ドリルダウン展開
  const toggleClientBtn = target.closest('.biz-toggle-client-detail');
  if (toggleClientBtn) {
    const key = toggleClientBtn.dataset.clientKey;
    if (key) {
      if (bizAnalyticsViewState.expandedClients.has(key)) bizAnalyticsViewState.expandedClients.delete(key);
      else bizAnalyticsViewState.expandedClients.add(key);
      console.log('【統合分析ビュー】取引先詳細展開トグル:', key);
      renderBusinessAnalyticsView();
    }
    return;
  }

  // 統合分析：取引先詳細から出張連動分析を絞り込み
  const focusClientBtn = target.closest('.biz-focus-client-trip-btn');
  if (focusClientBtn) {
    bizAnalyticsViewState.tripClient = focusClientBtn.dataset.clientName || 'all';
    console.log('【統合分析ビュー】取引先で出張後追い分析絞込:', bizAnalyticsViewState.tripClient);
    renderBusinessAnalyticsView();
    return;
  }

  // 統合分析：地域粒度切替（地方エリア / 都道府県）
  const geoModeBtn = target.closest('.biz-geo-mode-btn');
  if (geoModeBtn) {
    bizAnalyticsViewState.geoGranularity = geoModeBtn.dataset.mode === 'prefecture' ? 'prefecture' : 'region';
    console.log('【統合分析ビュー】地域表示粒度切替:', bizAnalyticsViewState.geoGranularity);
    renderBusinessAnalyticsView();
    return;
  }

  // 統合分析：地域・都道府県クリックによる連動絞り込み
  const pickGeoBtn = target.closest('.biz-pick-geo-btn');
  if (pickGeoBtn) {
    const mode = pickGeoBtn.dataset.geoMode;
    const key = pickGeoBtn.dataset.geoKey || 'all';
    if (mode === 'prefecture') {
      bizAnalyticsViewState.tripPrefecture = (bizAnalyticsViewState.tripPrefecture === key) ? 'all' : key;
      bizAnalyticsViewState.tripRegion = 'all';
    } else {
      bizAnalyticsViewState.tripRegion = (bizAnalyticsViewState.tripRegion === key) ? 'all' : key;
      bizAnalyticsViewState.tripPrefecture = 'all';
    }
    console.log('【統合分析ビュー】地域クリック連動絞込:', { mode, key });
    renderBusinessAnalyticsView();
    return;
  }

  // 統合分析：連動絞込リセット
  if (target.closest('.biz-clear-scope-btn')) {
    bizAnalyticsViewState.tripRegion = 'all';
    bizAnalyticsViewState.tripPrefecture = 'all';
    bizAnalyticsViewState.tripClient = 'all';
    console.log('【統合分析ビュー】連動絞込解除');
    renderBusinessAnalyticsView();
    return;
  }

  // 統合分析：後追い日数プリセット
  const followBtn = target.closest('.biz-followup-preset-btn');
  if (followBtn) {
    bizAnalyticsViewState.followUpDays = Math.max(0, Number(followBtn.dataset.days) || 60);
    console.log('【統合分析ビュー】後追い日数変更:', bizAnalyticsViewState.followUpDays);
    renderBusinessAnalyticsView();
    return;
  }
});

document.addEventListener('change', (e) => {
  const target = e.target;
  if (!target) return;

  if (target.classList.contains('lot-cost-filter-item')) {
    lotCostViewState.itemFilter = target.value || 'all';
    renderLotCostAnalyticsView();
  } else if (target.classList.contains('lot-cost-filter-proc')) {
    lotCostViewState.procFilter = target.value || 'all';
    renderLotCostAnalyticsView();
  } else if (target.classList.contains('lot-cost-sort-by')) {
    lotCostViewState.sortBy = target.value || 'date_desc';
    renderLotCostAnalyticsView();
  } else if (target.classList.contains('biz-include-zero-chk')) {
    bizAnalyticsViewState.includeZeroDocs = !!target.checked;
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-client-sort')) {
    bizAnalyticsViewState.clientSortBy = target.value || 'sales_desc';
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-filter-region')) {
    bizAnalyticsViewState.tripRegion = target.value || 'all';
    if (bizAnalyticsViewState.tripRegion !== 'all') bizAnalyticsViewState.tripPrefecture = 'all';
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-filter-pref')) {
    bizAnalyticsViewState.tripPrefecture = target.value || 'all';
    if (bizAnalyticsViewState.tripPrefecture !== 'all') bizAnalyticsViewState.tripRegion = 'all';
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-filter-client')) {
    bizAnalyticsViewState.tripClient = target.value || 'all';
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-trip-candidate-select')) {
    const val = String(target.value || '');
    if (val.includes('|')) {
      const [s, en] = val.split('|');
      bizAnalyticsViewState.tripStart = s || '';
      bizAnalyticsViewState.tripEnd = en || '';
      bizAnalyticsViewState.initializedTripDefault = true;
      console.log('【統合分析ビュー】出張候補期間を選択:', { start: s, end: en });
      renderBusinessAnalyticsView();
    }
  } else if (target.classList.contains('biz-trip-start-input')) {
    bizAnalyticsViewState.tripStart = target.value || '';
    bizAnalyticsViewState.initializedTripDefault = true;
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-trip-end-input')) {
    bizAnalyticsViewState.tripEnd = target.value || '';
    bizAnalyticsViewState.initializedTripDefault = true;
    renderBusinessAnalyticsView();
  } else if (target.classList.contains('biz-followup-days-input')) {
    bizAnalyticsViewState.followUpDays = Math.max(0, Math.min(365, Number(target.value) || 0));
    renderBusinessAnalyticsView();
  }
});

let analyticsSearchDebounceTimer = null;
document.addEventListener('input', (e) => {
  const target = e.target;
  if (!target) return;
  if (target.classList.contains('lot-cost-search-input')) {
    lotCostViewState.searchQuery = target.value || '';
    clearTimeout(analyticsSearchDebounceTimer);
    analyticsSearchDebounceTimer = setTimeout(() => {
      renderLotCostAnalyticsView();
      const inp = document.querySelector('.lot-cost-search-input');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }, 180);
  } else if (target.classList.contains('biz-client-search')) {
    bizAnalyticsViewState.clientSearch = target.value || '';
    clearTimeout(analyticsSearchDebounceTimer);
    analyticsSearchDebounceTimer = setTimeout(() => {
      renderBusinessAnalyticsView();
      const inp = document.querySelector('.biz-client-search');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }, 180);
  }
});
