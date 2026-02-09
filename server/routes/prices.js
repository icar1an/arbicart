/**
 * server/routes/prices.js — Price comparison API (Apify-only)
 *
 * GET /api/prices?items=milk,eggs&zip=14850
 *
 * Uses Apify's rigelbytes/instacart-scraper for real Instacart prices.
 * Searches the home ZIP plus nearby comparison ZIPs.
 */

const express = require('express');
const router = express.Router();
const cache = require('../cache');
const apify = require('../services/apify');

/**
 * ZIP → address mapping for Ithaca region.
 * Apify's Instacart scraper needs a street address for geo-routing.
 */
const ZIP_DATA = {
    '14850': { address: '301 E State St, Ithaca, NY 14850', neighborhood: 'Ithaca (Downtown)', lat: 42.4440, lng: -76.5019 },
    '14853': { address: '104 Dryden Rd, Ithaca, NY 14853', neighborhood: 'Collegetown', lat: 42.4430, lng: -76.4856 },
    '14882': { address: '2309 N Triphammer Rd, Ithaca, NY 14882', neighborhood: 'Lansing', lat: 42.5722, lng: -76.5290 },
    '14886': { address: '56 E Main St, Trumansburg, NY 14886', neighborhood: 'Trumansburg', lat: 42.5429, lng: -76.6608 },
    '14830': { address: '40 Centerway, Corning, NY 14830', neighborhood: 'Corning', lat: 42.1428, lng: -77.0547 },
    '14845': { address: '1400 County Rd 64, Horseheads, NY 14845', neighborhood: 'Horseheads', lat: 42.1670, lng: -76.8205 },
    '14901': { address: '100 N Main St, Elmira, NY 14901', neighborhood: 'Elmira', lat: 42.0898, lng: -76.8077 },
    '13045': { address: '3980 NY-281, Cortland, NY 13045', neighborhood: 'Cortland', lat: 42.6012, lng: -76.1805 },
};

/**
 * Pick comparison ZIPs: always include home + 3 nearby ZIPs.
 * Limits API calls (each ZIP triggers Apify actor runs).
 */
function getComparisonZips(homeZip) {
    const allZips = Object.keys(ZIP_DATA);
    const homeIdx = allZips.indexOf(homeZip);

    // Always include home ZIP
    const selected = [homeZip];

    // Add up to 3 other ZIPs for comparison
    const others = allZips.filter((z) => z !== homeZip);
    // Pick spread: first, middle, last for geographic variety
    if (others.length >= 3) {
        selected.push(others[0], others[Math.floor(others.length / 2)], others[others.length - 1]);
    } else {
        selected.push(...others);
    }

    return selected;
}

/**
 * Fetch prices for a single ZIP code using Apify.
 */
async function fetchZipPrices(items, zip) {
    const zipInfo = ZIP_DATA[zip];
    if (!zipInfo) return null;

    try {
        const products = await apify.searchProducts(items, zip, zipInfo.address);

        const priced = {};
        let basketTotal = 0;
        for (const p of products) {
            priced[p.name.toLowerCase()] = {
                price: p.price,
                store: p.store,
                image: p.image,
            };
            basketTotal += p.price;
        }

        return {
            neighborhood: zipInfo.neighborhood,
            lat: zipInfo.lat,
            lng: zipInfo.lng,
            store: products[0]?.store || 'Instacart',
            items: priced,
            basketTotal: Math.round(basketTotal * 100) / 100,
        };
    } catch (err) {
        console.error(`[Apify] Failed for ZIP ${zip}:`, err.message);
        return null;
    }
}

/**
 * GET /api/prices?items=milk,eggs&zip=14850
 */
router.get('/', async (req, res) => {
    try {
        const itemsRaw = req.query.items || '';
        const homeZip = req.query.zip || '14850';
        const items = itemsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        if (!items.length) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // ── Check cache ─────────────────────────────────────────
        const cacheKey = `prices:${homeZip}:${items.sort().join(',')}`;
        if (cache.has(cacheKey)) {
            console.log(`[Cache HIT] ${cacheKey}`);
            return res.json(cache.get(cacheKey));
        }

        console.log(`[Apify] Fetching real prices for ${items.length} items across multiple ZIPs...`);

        // ── Fetch prices for comparison ZIPs ────────────────────
        const zipsToQuery = getComparisonZips(homeZip);
        const results = await Promise.allSettled(
            zipsToQuery.map((zip) => fetchZipPrices(items, zip)),
        );

        const pricesByZip = {};
        results.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value) {
                pricesByZip[zipsToQuery[i]] = r.value;
            }
        });

        if (Object.keys(pricesByZip).length === 0) {
            return res.status(502).json({
                error: 'Could not fetch prices from any ZIP code. Apify may be rate-limited or the scraper may be unavailable.',
            });
        }

        const response = {
            homeZip,
            items,
            source: 'apify',
            zipsQueried: zipsToQuery.length,
            zipsReturned: Object.keys(pricesByZip).length,
            pricesByZip,
        };

        // Cache for 30 minutes (Apify is expensive, data doesn't change fast)
        cache.set(cacheKey, response, 30 * 60 * 1000);

        res.json(response);
    } catch (err) {
        console.error('Price route error:', err);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

module.exports = router;
