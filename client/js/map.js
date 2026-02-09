/**
 * map.js — Leaflet map with clean circular price pins
 *
 * Must register: window.Arbicart.map = { plotPrices(pricesByZip), centerOn(lat, lng) }
 */

window.Arbicart = window.Arbicart || {};

// ── Initialize Leaflet map (centered on Ithaca) ────────────────────
const mapInstance = L.map('map-container').setView([42.4440, -76.5019], 11);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(mapInstance);

// ── Inject clean pin styles ─────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .price-pin {
    background: none !important;
    border: none !important;
  }
  .pin-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', -apple-system, sans-serif;
    font-weight: 700;
    font-size: 12px;
    border-radius: 20px;
    padding: 5px 10px;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    transition: transform 150ms ease;
    animation: pinFade 0.25s ease-out;
    cursor: pointer;
  }
  .pin-badge:hover {
    transform: scale(1.08);
    box-shadow: 0 3px 10px rgba(0,0,0,0.2);
  }
  .pin-home {
    background: #0AAD0A;
    color: #fff;
  }
  .pin-cheapest {
    background: #003D29;
    color: #fff;
  }
  .pin-default {
    background: #FFFFFF;
    color: #343538;
    border: 1px solid #E8E9EB;
  }
  @keyframes pinFade {
    0% { opacity: 0; transform: translateY(-4px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .leaflet-popup-content-wrapper {
    border-radius: 12px !important;
    border: none !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important;
    font-family: 'Inter', -apple-system, sans-serif !important;
  }
  .leaflet-popup-tip {
    box-shadow: none !important;
  }
`;
document.head.appendChild(style);

// ── Compact circular pin factory ────────────────────────────────────
function createPricePin(total, isHome, isCheapest) {
  const cls = isHome ? 'pin-home' : isCheapest ? 'pin-cheapest' : 'pin-default';
  return L.divIcon({
    className: 'price-pin',
    html: `<div class="pin-badge ${cls}">$${total.toFixed(0)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [25, 12],
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
            <div style="text-align:center; padding: 6px 4px; font-family: 'Inter', sans-serif;">
              <div style="font-weight: 700; font-size: 13px; color: #343538; margin-bottom: 2px;">${data.neighborhood}</div>
              <div style="font-size: 22px; font-weight: 800; color: ${isCheapest ? '#003D29' : isHome ? '#0AAD0A' : '#343538'};">$${data.basketTotal.toFixed(2)}</div>
              <div style="font-size: 11px; color: #72767E; margin-top: 2px;">
                ${data.store || ''} · ${zip}
              </div>
            </div>
          `);
        markers.push(marker);
      }, i * 80);
    });

    setTimeout(() => {
      if (markers.length) {
        const group = L.featureGroup(markers);
        mapInstance.fitBounds(group.getBounds().pad(0.15));
      }
    }, Object.keys(pricesByZip).length * 80 + 200);
  },

  centerOn(lat, lng) {
    mapInstance.setView([lat, lng], 13, { animate: true });
  },
};
