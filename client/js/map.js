/**
 * map.js — Leaflet map with emoji pins
 * Agent/map owns this file.
 *
 * Must register: window.Arbicart.map = { plotPrices(pricesByZip), centerOn(lat, lng) }
 */

window.Arbicart = window.Arbicart || {};

// ── Initialize Leaflet map ──────────────────────────────────────────
const mapInstance = L.map('map-container').setView([40.7580, -73.9855], 12); // NYC default

// CartoDB Voyager tiles — clean Apple Maps-like aesthetic
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(mapInstance);

// ── Inject CSS animations (we don't own the CSS file) ───────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes pinDrop {
    from { transform: scale(0) translateY(-20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
  .price-pin {
    background: none !important;
    border: none !important;
  }
  .leaflet-popup-content-wrapper {
    border-radius: 16px !important;
    font-family: 'Inter', sans-serif !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
  }
  .leaflet-popup-tip {
    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
  }
`;
document.head.appendChild(style);

// ── Custom emoji-pin marker factory ─────────────────────────────────
function createPricePin(total, isHome, isCheapest) {
    const emoji = isHome ? '📍' : isCheapest ? '💰' : '🏷️';
    const bgColor = isHome ? '#007AFF' : isCheapest ? '#34C759' : '#FFFFFF';
    const textColor = (isHome || isCheapest) ? '#FFFFFF' : '#1D1D1F';
    const glowColor = isCheapest ? '0 0 16px rgba(52,199,89,0.45)' : '0 2px 12px rgba(0,0,0,0.15)';

    return L.divIcon({
        className: 'price-pin',
        html: `<div style="
      background: ${bgColor};
      color: ${textColor};
      padding: 6px 12px;
      border-radius: 20px;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 14px;
      box-shadow: ${glowColor};
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      transform: scale(0);
      animation: pinDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    ">${emoji} $${total.toFixed(2)}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
    });
}

// ── Marker state ────────────────────────────────────────────────────
let markers = [];

// ── Public API ──────────────────────────────────────────────────────
window.Arbicart.map = {
    /**
     * Plot price pins for each ZIP on the map.
     * @param {Object} pricesByZip — { "10001": { basketTotal, lat, lng, neighborhood, medianIncome }, … }
     */
    plotPrices(pricesByZip) {
        // Clear old markers
        markers.forEach(m => mapInstance.removeLayer(m));
        markers = [];

        // Find cheapest ZIP
        let cheapestZip = null;
        let cheapestTotal = Infinity;
        Object.entries(pricesByZip).forEach(([zip, data]) => {
            if (data.basketTotal < cheapestTotal) {
                cheapestTotal = data.basketTotal;
                cheapestZip = zip;
            }
        });

        // Plot each ZIP with staggered pin-drop animation
        Object.entries(pricesByZip).forEach(([zip, data], i) => {
            setTimeout(() => {
                const isHome = (zip === Object.keys(pricesByZip)[0]); // first ZIP is home
                const isCheapest = (zip === cheapestZip);

                const icon = createPricePin(data.basketTotal, isHome, isCheapest);
                const marker = L.marker([data.lat, data.lng], { icon })
                    .addTo(mapInstance)
                    .bindPopup(`
            <div style="text-align:center; padding: 4px;">
              <strong>${data.neighborhood}</strong><br>
              <span style="font-size: 20px;">${isHome ? '🏠' : isCheapest ? '💰' : '🏪'}</span><br>
              <span style="font-size: 18px; font-weight: 700;">$${data.basketTotal.toFixed(2)}</span><br>
              <span style="color: #6E6E73; font-size: 12px;">Median income: $${(data.medianIncome / 1000).toFixed(0)}k</span>
            </div>
          `);
                markers.push(marker);
            }, i * 150); // stagger pin drops
        });

        // Fit bounds to show all markers after they've all appeared
        setTimeout(() => {
            if (markers.length) {
                const group = L.featureGroup(markers);
                mapInstance.fitBounds(group.getBounds().pad(0.1));
            }
        }, Object.keys(pricesByZip).length * 150 + 300);
    },

    /**
     * Smoothly pan & zoom to a location.
     */
    centerOn(lat, lng) {
        mapInstance.setView([lat, lng], 14, { animate: true });
    }
};
