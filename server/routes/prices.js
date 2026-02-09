/**
 * server/routes/prices.js — Price comparison endpoint
 * Agent/backend owns this file.
 *
 * GET /api/prices?items=milk,eggs,bread&zip=10001
 * Returns: { homeZip, pricesByZip: { "10001": {...}, "10002": {...} } }
 */

const { Router } = require('express');
const cache = require('../cache');
const instacart = require('../services/instacart');
const apify = require('../services/apify');
const mock = require('../services/mock');

const router = Router();

// ── Nearby ZIP mapping ────────────────────────────────────────
// For simplicity we always compare across all known NYC ZIPs.
// A production version would use geo-distance.
const ALL_ZIPS = mock.getAllZips();

// ── Resolve ZIP → street address (simple mapping) ─────────────
const ZIP_TO_ADDRESS = {
    '10001': '350 5th Ave, New York, NY 10001',
    '10002': '100 Rivington St, New York, NY 10002',
    '10003': '51 Astor Pl, New York, NY 10003',
    '10010': '225 Park Ave S, New York, NY 10010',
    '10019': '300 W 57th St, New York, NY 10019',
    '10025': '2170 Broadway, New York, NY 10025',
    '10029': '1901 1st Ave, New York, NY 10029',
    '10034': '4790 Broadway, New York, NY 10034',
    '10451': '300 E 149th St, Bronx, NY 10451',
    '10301': '150 Bay St, Staten Island, NY 10301',
};

/**
 * Determine which data source to use and fetch prices for every ZIP.
 * Falls through: Instacart IDP → Apify → Mock
 */
async function fetchPricesAllZips(items, homeZip) {
    const pricesByZip = {};

    // ── Try live data sources for the home ZIP first ────────────
    let useLive = false;
    const address = ZIP_TO_ADDRESS[homeZip] || `${homeZip}, New York, NY`;

    // Try Instacart IDP
    try {
        const results = await instacart.searchProducts(items, address);
        if (results && results.length) {
            useLive = true;
            console.log('📡 Using Instacart IDP');
            // For live data we only get home ZIP results — other ZIPs use mock
            pricesByZip[homeZip] = buildZipResult(items, results, homeZip);
        }
    } catch (_) {
        // fall through
    }

    // Try Apify
    if (!useLive) {
        try {
            const results = await apify.searchProducts(items, address);
            if (results && results.length) {
                useLive = true;
                console.log('📡 Using Apify scraper');
                pricesByZip[homeZip] = buildZipResult(items, results, homeZip);
            }
        } catch (_) {
            // fall through
        }
    }

    if (!useLive) {
        console.log('🎭 Using mock data (no API keys configured)');
    }

    // ── Fill remaining ZIPs with mock data ──────────────────────
    for (const zip of ALL_ZIPS) {
        if (pricesByZip[zip]) continue; // already populated by live source
        const result = mock.getPricesForZip(items, zip);
        if (result) pricesByZip[zip] = result;
    }

    return pricesByZip;
}

/**
 * Build a ZIP result object from live API results.
 */
function buildZipResult(items, results, zip) {
    const zipMeta = mock.ZIPS[zip] || {
        neighborhood: 'Unknown',
        lat: 40.7128,
        lng: -74.0060,
        medianIncome: 50000,
    };

    const itemPrices = {};
    let basketTotal = 0;

    for (const item of items) {
        // Find best match in results
        const match = results.find(
            (r) => r.name.toLowerCase().includes(item.toLowerCase()),
        ) || results[0];

        const price = match?.price || 3.99;
        itemPrices[item] = {
            price,
            store: match?.store || 'Instacart',
        };
        basketTotal += price;
    }

    return {
        neighborhood: zipMeta.neighborhood,
        lat: zipMeta.lat,
        lng: zipMeta.lng,
        medianIncome: zipMeta.medianIncome,
        items: itemPrices,
        basketTotal: Math.round(basketTotal * 100) / 100,
    };
}

// ── GET /api/prices ───────────────────────────────────────────
router.get('/prices', async (req, res) => {
    try {
        const { items: rawItems, zip } = req.query;

        if (!rawItems) {
            return res.status(400).json({ error: 'Missing "items" query param (comma-separated)' });
        }

        const items = rawItems
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean);

        if (items.length === 0) {
            return res.status(400).json({ error: 'No valid items provided' });
        }

        const homeZip = zip || '10001';

        // ── Cache lookup ──────────────────────────────────────────
        const cacheKey = `prices:${items.sort().join(',')}:${homeZip}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // ── Fetch prices ──────────────────────────────────────────
        const pricesByZip = await fetchPricesAllZips(items, homeZip);

        const result = { homeZip, pricesByZip };

        // Cache for 15 minutes
        cache.set(cacheKey, result);

        return res.json(result);
    } catch (err) {
        console.error('Price endpoint error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
