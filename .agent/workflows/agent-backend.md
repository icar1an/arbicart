---
description: Agent 2 — Express Server & Instacart Integration (branch agent/backend)
---
// turbo-all

# Agent 2: Backend — Express Server & Instacart Integration

You are building the **backend server and Instacart data integration** for Arbicart, a grocery price comparison website. Your work is on the `agent/backend` branch.

## Setup

1. cd to `/Users/sfw/Desktop/MY GITHUB/arbicart`
2. `git checkout agent/backend`

## Your Files (YOU OWN THESE — implement them fully)

- `server/index.js` — Express server entry point
- `server/routes/prices.js` — Price comparison API endpoint
- `server/services/instacart.js` — Instacart Developer Platform client
- `server/services/apify.js` — Apify scraper fallback client
- `server/cache.js` — In-memory TTL cache
- `client/js/app.js` — Frontend orchestrator (wires basket → API → map → savings)

## Context

Arbicart compares grocery prices across ZIP codes using real Instacart data. The user may or may not have API keys ready yet, so build gracefully:
1. **Try Instacart IDP** (if `INSTACART_API_KEY` is set in `.env`)
2. **Fall back to Apify** (if `APIFY_API_TOKEN` is set in `.env`)
3. **Fall back to realistic mock data** (if neither key is available — for demo/development)

## Step-by-Step

### 1. Implement `server/cache.js`
Simple in-memory cache with TTL:
```javascript
class Cache {
  constructor() { this.store = new Map(); }
  get(key) { /* return value if not expired, else delete + return null */ }
  set(key, value, ttlMs = 15 * 60 * 1000) { /* store with expiry timestamp */ }
  has(key) { /* check if key exists and not expired */ }
}
module.exports = new Cache();
```

### 2. Implement `server/services/apify.js`
Use the Apify Instacart scraper actor. The actor ID for the Instacart Product Search Scraper is typically something like `epctex/instacart-scraper`.

```javascript
// POST https://api.apify.com/v2/acts/{actorId}/runs?token={APIFY_API_TOKEN}
// Body: { "searchTerms": ["milk", "eggs"], "streetAddress": "123 Main St, New York, NY 10001" }
// Then poll for results
```

Export: `async function searchProducts(items, address) → [{name, price, unit, store, image}]`

If the actor format doesn't match, normalize the response to the standard shape.

### 3. Implement `server/services/instacart.js`
Stub for the Instacart Developer Platform API. Since the developer may not have access yet:
```javascript
// Base URL: https://connect.instacart.com/v2 (or similar — check docs)
// Headers: { 'Authorization': `Bearer ${INSTACART_API_KEY}`, 'Content-Type': 'application/json' }
// Endpoints: product search, catalog lookup
```

Export: `async function searchProducts(items, address) → [{name, price, unit, store, image}]`

If the key isn't set, throw a clear error so the route can fall through to Apify or mock.

### 4. Create mock data fallback
Create `server/services/mock.js` — returns realistic NYC grocery prices that vary by ZIP code. This is ONLY for development when no API keys are available.

Include ~10 NYC ZIP codes with slightly different prices:
- 10001 (Midtown), 10002 (Lower East Side), 10003 (East Village), 10010 (Gramercy)
- 10019 (Hell's Kitchen), 10025 (Upper West Side), 10029 (East Harlem)
- 10034 (Inwood), 10451 (South Bronx), 10301 (Staten Island)

Each ZIP should have: `{ zipCode, neighborhood, lat, lng, medianIncome, prices: { "milk": 4.29, "eggs": 5.99, ... } }`

Price variation: cheaper ZIPs (lower income areas) should be 10-25% cheaper on many items.

### 5. Implement `server/routes/prices.js`
```
GET /api/prices?items=milk,eggs,bread&zip=10001
```

Logic:
1. Parse items + zip from query
2. Check cache for this query key
3. If miss: resolve ZIP to address, determine nearby ZIPs (hardcode a mapping of ZIP → nearby ZIPs, or just use the full list)
4. Call the active service (instacart → apify → mock) for each ZIP
5. Cache the result
6. Return:
```json
{
  "homeZip": "10001",
  "pricesByZip": {
    "10001": {
      "neighborhood": "Midtown",
      "lat": 40.7484,
      "lng": -73.9967,
      "medianIncome": 85000,
      "items": { "milk": { "price": 5.49, "store": "Key Food" }, ... },
      "basketTotal": 47.85
    },
    "10029": {
      "neighborhood": "East Harlem",
      "lat": 40.7918,
      "lng": -73.9440,
      "medianIncome": 32000,
      "items": { "milk": { "price": 3.99, "store": "Associated" }, ... },
      "basketTotal": 36.20
    }
  }
}
```

### 6. Implement `server/index.js`
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pricesRouter = require('./routes/prices');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/api', pricesRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🛒 Arbicart server running on http://localhost:${PORT}`));
```

### 7. Implement `client/js/app.js`
This is the frontend orchestrator. It wires together basket → API → map → savings.

```javascript
window.Arbicart = window.Arbicart || {};

document.addEventListener('DOMContentLoaded', () => {
  const compareBtn = document.querySelector('#compare-btn'); // or whatever the UI agent names it
  const zipInput = document.querySelector('#zip-input');
  
  if (compareBtn) {
    compareBtn.addEventListener('click', async () => {
      const items = window.Arbicart.basket?.getItems() || [];
      const zip = zipInput?.value || '10001';
      
      if (items.length === 0) { /* show friendly error */ return; }
      
      // Show loading state
      compareBtn.textContent = '🔄 Comparing...';
      compareBtn.disabled = true;
      
      try {
        const itemNames = items.map(i => i.name).join(',');
        const res = await fetch(`/api/prices?items=${encodeURIComponent(itemNames)}&zip=${encodeURIComponent(zip)}`);
        const data = await res.json();
        
        // Pass data to map and savings modules
        if (window.Arbicart.map) {
          window.Arbicart.map.plotPrices(data.pricesByZip);
          const homeData = data.pricesByZip[data.homeZip];
          if (homeData) window.Arbicart.map.centerOn(homeData.lat, homeData.lng);
        }
        if (window.Arbicart.savings) {
          window.Arbicart.savings.showSavings(data.homeZip, data.pricesByZip);
        }
      } catch (err) {
        console.error('Price fetch failed:', err);
      } finally {
        compareBtn.textContent = '🔍 Compare Prices';
        compareBtn.disabled = false;
      }
    });
  }
});
```

### 8. Commit and push
```bash
git add -A
git commit -m "feat(backend): express server, instacart/apify integration, price comparison API"
git push origin agent/backend
```

## CRITICAL RULES
- Do NOT modify `client/css/styles.css` or `client/index.html`
- Do NOT modify `client/js/basket.js`, `client/js/map.js`, or `client/js/savings.js`
- You MAY modify `client/js/app.js` (you own it)
- The mock fallback must feel realistic — use actual NYC ZIP codes, real neighborhood names, and plausible price ranges
- Handle errors gracefully — never crash the server
