/**
 * map.js — Leaflet map with neo-brutalist emoji pins
 *
 * Must register: window.Arbicart.map = { plotPrices(pricesByZip), centerOn(lat, lng) }
 */

window.Arbicart = window.Arbicart || {};

// ── Initialize Leaflet map (centered on Ithaca) ────────────────────
const mapInstance = L.map('map-container').setView([42.4440, -76.5019], 11);

// Stamen Toner Lite — high contrast, brutalist-friendly tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(mapInstance);

// ── Inject neo-brutalist pin styles ─────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  @keyframes pinStamp {
    0% { transform: scale(1.4); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  .price-pin {
    background: none !important;
    border: none !important;
  }
  .leaflet-popup-content-wrapper {
    border-radius: 0 !important;
    border: 4px solid #000 !important;
    box-shadow: 6px 6px 0px 0px #000 !important;
    font-family: 'Space Grotesk', sans-serif !important;
  }
  .leaflet-popup-tip {
    display: none !important;
  }
`;
document.head.appendChild(style);

// ── Custom neo-brutalist pin factory ────────────────────────────────
function createPricePin(total, isHome, isCheapest) {
  const emoji = isHome ? '📍' : isCheapest ? '💰' : '🏷️';
  const bgColor = isHome ? '#FF6B6B' : isCheapest ? '#FFD93D' : '#FFFFFF';

  return L.divIcon({
    className: 'price-pin',
    html: `<div style="
      background: ${bgColor};
      color: #000;
      padding: 6px 12px;
      border: 4px solid #000;
      box-shadow: 4px 4px 0px 0px #000;
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 4px;
      animation: pinStamp 0.2s ease-out;
    ">${emoji} $${total.toFixed(2)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// ── Marker state ────────────────────────────────────────────────────
let markers = [];

// ── Public API ──────────────────────────────────────────────────────
window.Arbicart.map = {
  plotPrices(pricesByZip) {
    markers.forEach((m) => mapInstance.removeLayer(m));
    markers = [];

    let cheapestZip = null;
    let cheapestTotal = Infinity;
    Object.entries(pricesByZip).forEach(([zip, data]) => {
      if (data.basketTotal < cheapestTotal) {
        cheapestTotal = data.basketTotal;
        cheapestZip = zip;
      }
    });

    Object.entries(pricesByZip).forEach(([zip, data], i) => {
      setTimeout(() => {
        const isHome = zip === Object.keys(pricesByZip)[0];
        const isCheapest = zip === cheapestZip;

        const icon = createPricePin(data.basketTotal, isHome, isCheapest);
        const marker = L.marker([data.lat, data.lng], { icon })
          .addTo(mapInstance)
          .bindPopup(`
            <div style="text-align:center; padding: 8px; font-family: 'Space Grotesk', sans-serif;">
              <strong style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em;">${data.neighborhood}</strong><br>
              <span style="font-size: 24px;">${isHome ? '🏠' : isCheapest ? '💰' : '🏪'}</span><br>
              <span style="font-size: 22px; font-weight: 700;">$${data.basketTotal.toFixed(2)}</span><br>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em;">
                Income: $${(data.medianIncome / 1000).toFixed(0)}k
              </span>
            </div>
          `);
        markers.push(marker);
      }, i * 100);
    });

    setTimeout(() => {
      if (markers.length) {
        const group = L.featureGroup(markers);
        mapInstance.fitBounds(group.getBounds().pad(0.1));
      }
    }, Object.keys(pricesByZip).length * 100 + 200);
  },

  centerOn(lat, lng) {
    mapInstance.setView([lat, lng], 13, { animate: true });
  },
};
