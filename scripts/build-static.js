#!/usr/bin/env node
/**
 * build-static.js — Bake price data for static GitHub Pages deployment
 *
 * Reads data/prices.json and writes a pre-filtered version to client/data/prices.json
 * that mirrors the /api/prices response format, so app.js can load it directly.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'prices.json');
const OUT_DIR = path.join(__dirname, '..', 'client', 'data');
const OUT_FILE = path.join(OUT_DIR, 'prices.json');

const ITEMS = ['milk', 'eggs', 'bread', 'butter', 'rice'];

function build() {
    console.log('📦 Building static price data...');

    if (!fs.existsSync(DATA_FILE)) {
        console.error('❌ No data/prices.json found. Run: node scripts/scrape.js first');
        process.exit(1);
    }

    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

    // Filter to requested items (same logic as server/routes/prices.js)
    const pricesByZip = {};
    for (const [zip, zipData] of Object.entries(raw.pricesByZip)) {
        const filteredItems = {};
        let basketTotal = 0;

        for (const item of ITEMS) {
            if (zipData.items[item]) {
                filteredItems[item] = zipData.items[item];
                basketTotal += zipData.items[item].price;
            }
        }

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

    const output = {
        homeZip: '14850',
        items: ITEMS,
        source: 'pre-scraped',
        scrapedAt: raw.scrapedAt,
        zipsReturned: Object.keys(pricesByZip).length,
        pricesByZip,
    };

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
    console.log(`✅ Wrote ${OUT_FILE} (${Object.keys(pricesByZip).length} ZIPs, ${ITEMS.length} items)`);
}

build();
