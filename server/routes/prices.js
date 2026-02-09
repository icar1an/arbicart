/**
 * server/routes/prices.js — Price comparison API
 *
 * GET /api/prices?items=milk,eggs&zip=14850
 *
 * Currently uses hardcoded Ithaca-area mock data for instant responses.
 * Live Instacart/Apify scraping is available but disabled for the beta.
 */

const express = require('express');
const router = express.Router();
const cache = require('../cache');
const mock = require('../services/mock');

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
            return res.json(cache.get(cacheKey));
        }

        // ── Build price data for all Ithaca-area ZIPs ───────────
        const pricesByZip = {};
        const allZips = mock.getAllZips();

        // Ensure home ZIP is first
        const zipOrder = [homeZip, ...allZips.filter((z) => z !== homeZip)];

        for (const zip of zipOrder) {
            const result = mock.getPricesForZip(items, zip);
            if (result) {
                pricesByZip[zip] = result;
            }
        }

        const response = {
            homeZip,
            items,
            source: 'mock',
            pricesByZip,
        };

        // Cache for 15 minutes
        cache.set(cacheKey, response, 15 * 60 * 1000);

        res.json(response);
    } catch (err) {
        console.error('Price route error:', err);
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

module.exports = router;
