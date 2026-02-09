---
description: Agent 3 — Leaflet Map & Savings Engine (branch agent/map)
---
// turbo-all

# Agent 3: Map — Leaflet Map & Savings Engine

You are building the **interactive map and savings comparison engine** for Arbicart, a whimsical grocery price comparison website. Your work is on the `agent/map` branch.

## Setup

1. cd to `/Users/sfw/Desktop/MY GITHUB/arbicart`
2. `git checkout agent/map`

## Your Files (YOU OWN THESE — implement them fully)

- `client/js/map.js` — Leaflet map with emoji-pin markers
- `client/js/savings.js` — Savings calculation + animated comparison card

## Design Context

The overall app has an **iOS-native / Apple Maps** aesthetic:
- Colors: Mint `#C1F0DB`, lavender `#D9D4F5`, peach `#FDDCB5`, white cards on `#F5F5F7`
- Font: Inter (already loaded)
- Round everything (20px radius), subtle shadows, bouncy animations
- EMOJI EVERYWHERE — pins should feel like iMessage bubbles on a map

## Step-by-Step

### 1. Implement `client/js/map.js`

Initialize Leaflet in `#map-container` and register on `window.Arbicart.map`:

```javascript
window.Arbicart = window.Arbicart || {};

const mapInstance = L.map('map-container').setView([40.7580, -73.9855], 12); // NYC default

// CartoDB Voyager tiles — clean Apple Maps-like aesthetic
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19
}).addTo(mapInstance);
```

**Custom emoji-pin markers** using `L.divIcon`:
```javascript
function createPricePin(total, isHome, isCheapest) {
  // Create a bubble-like marker that looks like an iMessage bubble
  // isHome → blue accent pin with "📍 $XX" 
  // isCheapest → green/mint pin with "💰 $XX" and a subtle glow
  // others → white pin with "🏷️ $XX"
  const emoji = isHome ? '📍' : isCheapest ? '💰' : '🏷️';
  const bgColor = isHome ? '#007AFF' : isCheapest ? '#34C759' : '#FFFFFF';
  const textColor = (isHome || isCheapest) ? '#FFFFFF' : '#1D1D1F';
  
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
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
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
```

Add a CSS animation for pin drops (inject via JS since we don't own the CSS file):
```javascript
const style = document.createElement('style');
style.textContent = `
  @keyframes pinDrop {
    from { transform: scale(0) translateY(-20px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }
  .price-pin { background: none !important; border: none !important; }
  .leaflet-popup-content-wrapper {
    border-radius: 16px !important;
    font-family: 'Inter', sans-serif !important;
  }
`;
document.head.appendChild(style);
```

**Register the map interface:**
```javascript
let markers = [];

window.Arbicart.map = {
  plotPrices(pricesByZip) {
    // Clear old markers
    markers.forEach(m => mapInstance.removeLayer(m));
    markers = [];
    
    // Find cheapest
    let cheapestZip = null;
    let cheapestTotal = Infinity;
    Object.entries(pricesByZip).forEach(([zip, data]) => {
      if (data.basketTotal < cheapestTotal) {
        cheapestTotal = data.basketTotal;
        cheapestZip = zip;
      }
    });
    
    // Plot each ZIP with staggered animation
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
              <span style="color: #6E6E73; font-size: 12px;">Median income: $${(data.medianIncome/1000).toFixed(0)}k</span>
            </div>
          `);
        markers.push(marker);
      }, i * 150); // stagger pin drops
    });
    
    // Fit bounds to show all markers
    setTimeout(() => {
      const group = L.featureGroup(markers);
      mapInstance.fitBounds(group.getBounds().pad(0.1));
    }, Object.keys(pricesByZip).length * 150 + 300);
  },
  
  centerOn(lat, lng) {
    mapInstance.setView([lat, lng], 12, { animate: true });
  }
};
```

### 2. Implement `client/js/savings.js`

Register on `window.Arbicart.savings`:

```javascript
window.Arbicart = window.Arbicart || {};

window.Arbicart.savings = {
  showSavings(homeZip, pricesByZip) {
    const section = document.getElementById('savings-section');
    if (!section) return;
    
    const homeData = pricesByZip[homeZip];
    if (!homeData) return;
    
    // Find cheapest ZIP
    let cheapestZip = null;
    let cheapestTotal = Infinity;
    Object.entries(pricesByZip).forEach(([zip, data]) => {
      if (data.basketTotal < cheapestTotal) {
        cheapestTotal = data.basketTotal;
        cheapestZip = zip;
      }
    });
    
    const cheapestData = pricesByZip[cheapestZip];
    const savings = homeData.basketTotal - cheapestTotal;
    const monthlySavings = savings * 4; // ~4 grocery trips/month
    const pctSavings = ((savings / homeData.basketTotal) * 100).toFixed(0);
    
    // Build the savings card
    section.innerHTML = `
      <div class="savings-card" style="
        background: linear-gradient(135deg, #C1F0DB 0%, #D9D4F5 50%, #FDDCB5 100%);
        border-radius: 24px;
        padding: 32px;
        max-width: 600px;
        margin: 24px auto;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        animation: fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        font-family: 'Inter', sans-serif;
      ">
        <div style="font-size: 48px; margin-bottom: 8px;">💸</div>
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1D1D1F;">
          Same groceries, different neighborhood
        </h2>
        
        <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="
            background: rgba(255,255,255,0.7);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 16px 24px;
            min-width: 140px;
          ">
            <div style="font-size: 12px; color: #6E6E73; margin-bottom: 4px;">🏠 ${homeData.neighborhood}</div>
            <div style="font-size: 28px; font-weight: 700; color: #1D1D1F;">$${homeData.basketTotal.toFixed(2)}</div>
          </div>
          <div style="display: flex; align-items: center; font-size: 24px;">→</div>
          <div style="
            background: rgba(255,255,255,0.7);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 16px 24px;
            min-width: 140px;
          ">
            <div style="font-size: 12px; color: #6E6E73; margin-bottom: 4px;">💰 ${cheapestData.neighborhood}</div>
            <div style="font-size: 28px; font-weight: 700; color: #34C759;">$${cheapestTotal.toFixed(2)}</div>
          </div>
        </div>
        
        <div style="
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 20px;
          margin-top: 8px;
        ">
          <div style="font-size: 14px; color: #6E6E73; margin-bottom: 4px;">You'd save</div>
          <div class="savings-amount" style="font-size: 42px; font-weight: 700; color: #007AFF;">
            $${monthlySavings.toFixed(2)}<span style="font-size: 16px; font-weight: 500;">/mo</span>
          </div>
          <div style="font-size: 13px; color: #6E6E73; margin-top: 4px;">
            ${pctSavings}% less per trip · ~4 trips/month
          </div>
        </div>
        
        <p style="font-size: 11px; color: #8E8E93; margin-top: 16px;">
          🛒 Prices from Instacart · For awareness, not arbitrage
        </p>
      </div>
    `;
    
    // Inject animation keyframes
    if (!document.getElementById('savings-animations')) {
      const style = document.createElement('style');
      style.id = 'savings-animations';
      style.textContent = `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .savings-amount {
          animation: countPulse 0.8s ease-out;
        }
        @keyframes countPulse {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Scroll savings card into view
    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
};
```

### 3. Commit and push
```bash
git add -A
git commit -m "feat(map): leaflet map with emoji pins, savings comparison card"
git push origin agent/map
```

## CRITICAL RULES
- Do NOT modify `client/css/styles.css` or `client/index.html`
- Do NOT modify `client/js/basket.js` or `client/js/app.js`
- Do NOT modify anything under `server/`
- You CAN inject CSS via JavaScript (`document.head.appendChild(style)`) for your animation keyframes
- Make the map feel ALIVE — staggered pin drops, smooth panning, bouncy popups
- The savings card should be the emotional climax of the app — make it gorgeous
