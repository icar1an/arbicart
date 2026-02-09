/**
 * server/routes/prices.js — Price comparison API
 *
 * GET /api/prices?items=milk,eggs&zip=14850
 *
 * Serves pre-scraped Instacart prices from data/prices.json.
 * Data is scraped via: node scripts/scrape.js
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'prices.json');

/**
 * Load pre-scraped price data from the JSON file.
 */
function loadPriceData() {
    if (!fs.existsSync(DATA_FILE)) {
        return null;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
}

/**
 * GET /api/prices?items=milk,eggs&zip=14850
 *
 * Filters pre-scraped data to only include the requested items,
 * and returns all ZIPs for comparison.
 */
router.get('/', (req, res) => {
    try {
        const itemsRaw = req.query.items || '';
        const homeZip = req.query.zip || '14850';
        const requestedItems = itemsRaw
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

        if (!requestedItems.length) {
            return res.status(400).json({ error: 'No items provided' });
        }

        // ── Load pre-scraped data ─────────────────────────────────
        const data = loadPriceData();
        if (!data || !data.pricesByZip) {
            return res.status(503).json({
                error: 'Price data not available. Run: node scripts/scrape.js',
            });
        }

        // ── Filter to requested items per ZIP ─────────────────────
        const pricesByZip = {};

        for (const [zip, zipData] of Object.entries(data.pricesByZip)) {
            const filteredItems = {};
            let basketTotal = 0;

            for (const item of requestedItems) {
                if (zipData.items[item]) {
                    filteredItems[item] = zipData.items[item];
                    basketTotal += zipData.items[item].price;
                }
            }

            // Only include this ZIP if it has at least some matching items
            if (Object.keys(filteredItems).length > 0) {
                pricesByZip[zip] = {
                    neighborhood: zipData.neighborhood,
                    lat: zipData.lat,
                    lng: zipData.lng,
                    store: zipData.store,
                    items: filteredItems,
                    basketTotal: Math.round(basketTotal * 100) / 100,
                };
            }
        }

        if (Object.keys(pricesByZip).length === 0) {
            return res.status(404).json({
                error: 'None of the requested items were found in our price data.',
                hint: 'Try items like: milk, eggs, bread, butter, rice',
                availableItems: data.itemsSearched,
            });
        }

        res.json({
            homeZip,
            items: requestedItems,
            source: 'pre-scraped',
            scrapedAt: data.scrapedAt,
            zipsReturned: Object.keys(pricesByZip).length,
            pricesByZip,
        });
    } catch (err) {
        console.error('Price route error:', err);
        res.status(500).json({ error: 'Failed to load prices' });
    }
});

module.exports = router;
