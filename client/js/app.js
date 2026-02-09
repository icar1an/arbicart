/**
 * app.js — Main orchestrator for pre-scraped price data
 *
 * Auto-loads data from /api/prices on page load.
 * No basket building needed — items are pre-defined.
 *
 * Shared contract:
 *   window.Arbicart.map     — { plotPrices(pricesByZip), centerOn(lat, lng) }
 *   window.Arbicart.savings — { showSavings(homeZip, pricesByZip) }
 */

window.Arbicart = window.Arbicart || {};

document.addEventListener('DOMContentLoaded', async () => {
    const zipSelect = document.getElementById('zip-input');
    const compareBtn = document.getElementById('compare-btn');

    // ── Load price data — try API first (local dev), fall back to static JSON (GitHub Pages)
    let priceData = null;

    try {
        const res = await fetch('/api/prices?items=milk,eggs,bread,butter,rice&zip=14850');
        if (!res.ok) throw new Error(`API error ${res.status}`);
        priceData = await res.json();
    } catch (_apiErr) {
        // No API available (static hosting) — load baked JSON
        try {
            const res = await fetch('data/prices.json');
            if (!res.ok) throw new Error(`Static file error ${res.status}`);
            priceData = await res.json();
        } catch (err) {
            console.error('Failed to load price data:', err);
            showToast('❌ Could not load price data');
            return;
        }
    }

    if (!priceData?.pricesByZip || Object.keys(priceData.pricesByZip).length === 0) {
        showToast('📭 No price data available. Run: node scripts/scrape.js');
        return;
    }

    // ── Populate ZIP dropdown ──────────────────────────────────
    const sortedZips = Object.entries(priceData.pricesByZip)
        .sort((a, b) => a[1].basketTotal - b[1].basketTotal);

    zipSelect.innerHTML = sortedZips
        .map(([zip, data]) => {
            const label = `${data.neighborhood} — $${data.basketTotal.toFixed(2)} (${data.store})`;
            return `<option value="${zip}" ${zip === '14850' ? 'selected' : ''}>${label}</option>`;
        })
        .join('');

    // ── Render price table ─────────────────────────────────────
    renderPriceTable(priceData.pricesByZip, priceData.items);

    // ── Render receipt for initial ZIP ──────────────────────────
    const initialZip = priceData.homeZip || '14850';
    renderReceipt(initialZip, priceData.pricesByZip, priceData.items);

    // ── Auto-show map + savings on load ─────────────────────────
    showResults(initialZip, priceData.pricesByZip);

    // ── Compare button — re-center on selected ZIP ─────────────
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            const selectedZip = zipSelect.value;
            renderReceipt(selectedZip, priceData.pricesByZip, priceData.items);
            showResults(selectedZip, priceData.pricesByZip);
            const mapSection = document.getElementById('map-section');
            if (mapSection) {
                mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // Also update receipt when dropdown changes
    if (zipSelect) {
        zipSelect.addEventListener('change', () => {
            const selectedZip = zipSelect.value;
            renderReceipt(selectedZip, priceData.pricesByZip, priceData.items);
        });
    }
});

/**
 * Render receipt-style item list in overview card.
 */
function renderReceipt(zip, pricesByZip, items) {
    const container = document.getElementById('receipt-container');
    if (!container) return;

    const data = pricesByZip[zip];
    if (!data || !data.items) {
        container.innerHTML = '';
        return;
    }

    const itemList = items || ['milk', 'eggs', 'bread', 'butter', 'rice'];

    const lines = itemList.map(item => {
        const d = data.items[item];
        if (!d) return `<div class="receipt-line"><span class="receipt-item">—</span><span class="receipt-dots"></span><span class="receipt-price">—</span></div>`;
        const name = d.name || item;
        return `<div class="receipt-line"><span class="receipt-item">${name.toUpperCase()}</span><span class="receipt-dots"></span><span class="receipt-price">$${d.price.toFixed(2)}</span></div>`;
    }).join('');

    container.innerHTML = `
        <div class="receipt">
            <div class="receipt-store">${data.store} · ${data.neighborhood}</div>
            <div class="receipt-divider"></div>
            ${lines}
            <div class="receipt-divider"></div>
            <div class="receipt-total-line">
                <span class="receipt-total-label">BASKET TOTAL</span>
                <span class="receipt-dots"></span>
                <span class="receipt-total-price">$${data.basketTotal.toFixed(2)}</span>
            </div>
        </div>
    `;
}

/**
 * Show map pins and savings card for a given home ZIP.
 */
function showResults(homeZip, pricesByZip) {
    if (window.Arbicart.map) {
        window.Arbicart.map.plotPrices(pricesByZip);
        const homeData = pricesByZip[homeZip];
        if (homeData) {
            window.Arbicart.map.centerOn(homeData.lat, homeData.lng);
        }
    }

    if (window.Arbicart.savings) {
        window.Arbicart.savings.showSavings(homeZip, pricesByZip);
    }
}

/**
 * Render a clean price comparison table.
 */
function renderPriceTable(pricesByZip, items) {
    const container = document.getElementById('price-table-container');
    if (!container) return;

    const zips = Object.entries(pricesByZip)
        .filter(([, d]) => d.items && Object.keys(d.items).length > 0)
        .sort((a, b) => a[1].basketTotal - b[1].basketTotal);

    if (zips.length === 0) return;

    // Find cheapest price per item across all ZIPs
    const cheapestByItem = {};
    (items || ['milk', 'eggs', 'bread', 'butter', 'rice']).forEach(item => {
        let min = Infinity;
        zips.forEach(([, data]) => {
            if (data.items[item]?.price < min) min = data.items[item].price;
        });
        cheapestByItem[item] = min;
    });

    const cheapestBasket = zips[0][1].basketTotal;
    const expensiveBasket = zips[zips.length - 1][1].basketTotal;

    container.innerHTML = `
    <div class="price-table-card">
      <div class="price-table-header">
        <span>🏪 Price comparison by neighborhood</span>
        <span class="price-table-spread">Spread: $${(expensiveBasket - cheapestBasket).toFixed(2)}</span>
      </div>
      <div class="price-table-scroll">
      <table class="price-table">
        <thead>
          <tr>
            <th class="pt-cell pt-head-zip">Neighborhood</th>
            ${(items || ['milk', 'eggs', 'bread', 'butter', 'rice']).map(i =>
        `<th class="pt-cell pt-head-item">${i}</th>`
    ).join('')}
            <th class="pt-cell pt-head-total">Basket</th>
          </tr>
        </thead>
        <tbody>
          ${zips.map(([zip, data], idx) => {
        const isCheapest = idx === 0;
        const rowClass = isCheapest ? 'pt-row-cheapest' : '';
        return `
              <tr class="pt-row ${rowClass}">
                <td class="pt-cell pt-cell-zip">
                  <div class="pt-neighborhood">${data.neighborhood}</div>
                  <div class="pt-store">${data.store} · ${zip}</div>
                </td>
                ${(items || ['milk', 'eggs', 'bread', 'butter', 'rice']).map(item => {
            const itemData = data.items[item];
            if (!itemData) return '<td class="pt-cell pt-cell-price pt-na">—</td>';
            const isBest = itemData.price <= cheapestByItem[item];
            return `<td class="pt-cell pt-cell-price ${isBest ? 'pt-best' : ''}" title="${itemData.name}">$${itemData.price.toFixed(2)}</td>`;
        }).join('')}
                <td class="pt-cell pt-cell-total ${isCheapest ? 'pt-total-best' : ''}">$${data.basketTotal.toFixed(2)}</td>
              </tr>`;
    }).join('')}
        </tbody>
      </table>
      </div>
      <div class="price-table-footer">
        Prices from Instacart · Last updated: ${new Date().toLocaleDateString()}
      </div>
    </div>
  `;
}

/**
 * Simple toast notification.
 */
function showToast(message) {
    if (window.Arbicart.toast) {
        window.Arbicart.toast(message);
        return;
    }

    let toast = document.getElementById('arbicart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'arbicart-toast';
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.85rem 1.75rem',
            borderRadius: '0',
            background: '#003D29',
            color: '#fff',
            fontSize: '0.85rem',
            fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            zIndex: '9999',
            border: '4px solid #000',
            boxShadow: '6px 6px 0px 0px #000',
            transition: 'opacity 0.15s ease-linear',
            pointerEvents: 'none',
        });
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}
