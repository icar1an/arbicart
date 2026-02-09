#!/usr/bin/env node

/**
 * scripts/scrape.js — Pre-scrape Instacart prices via Apify
 *
 * Run: node scripts/scrape.js
 *
 * Budget-aware: only scrapes ZIPs with missing data.
 * Merges new results into existing data/prices.json.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'rigelbytes~instacart-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';
const DATA_FILE = path.join(__dirname, '..', 'data', 'prices.json');

if (!APIFY_API_TOKEN) {
    console.error('❌ APIFY_API_TOKEN not set in .env');
    process.exit(1);
}

// ── Items to scrape (keep small to save budget) ─────────────────
const ITEMS = ['milk', 'eggs', 'bread', 'butter', 'rice'];

// ── ZIP codes with addresses ────────────────────────────────────
const ZIPS = {
    '14850': { address: '301 E State St, Ithaca, NY 14850', neighborhood: 'Ithaca (Downtown)', lat: 42.4440, lng: -76.5019 },
    '14853': { address: '104 Dryden Rd, Ithaca, NY 14853', neighborhood: 'Collegetown', lat: 42.4430, lng: -76.4856 },
    '14882': { address: '2309 N Triphammer Rd, Ithaca, NY 14882', neighborhood: 'Lansing', lat: 42.5722, lng: -76.5290 },
    '14886': { address: '56 E Main St, Trumansburg, NY 14886', neighborhood: 'Trumansburg', lat: 42.5429, lng: -76.6608 },
    '14830': { address: '40 Centerway, Corning, NY 14830', neighborhood: 'Corning', lat: 42.1428, lng: -77.0547 },
    '14845': { address: '1400 County Rd 64, Horseheads, NY 14845', neighborhood: 'Horseheads', lat: 42.1670, lng: -76.8205 },
    '14901': { address: '100 N Main St, Elmira, NY 14901', neighborhood: 'Elmira', lat: 42.0898, lng: -76.8077 },
    '13045': { address: '3980 NY-281, Cortland, NY 13045', neighborhood: 'Cortland', lat: 42.6012, lng: -76.1805 },
};

// ── Load existing data to skip ZIPs that already have results ───
function loadExisting() {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

// ── Price extraction ────────────────────────────────────────────
function extractPrice(product) {
    if (product.priceString) {
        const n = parseFloat(product.priceString.replace(/[^0-9.]/g, ''));
        if (!isNaN(n) && n > 0) return n;
    }
    const deep = product.price?.viewSection?.itemCard?.priceString
        || product.price?.viewSection?.priceString;
    if (deep) {
        const n = parseFloat(deep.replace(/[^0-9.]/g, ''));
        if (!isNaN(n) && n > 0) return n;
    }
    // Try numeric price field directly
    if (typeof product.price === 'number' && product.price > 0) return product.price;
    return 0;
}

// ── Scrape single item ─────────────────────────────────────────
async function scrapeItem(item, zip, address) {
    const res = await fetch(
        `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postalCode: zip, streetAddress: address, searchQuery: item }),
        },
    );

    if (!res.ok) throw new Error(`Apify ${res.status}`);
    const run = await res.json();
    if (run.data?.status !== 'SUCCEEDED' || !run.data?.defaultDatasetId) {
        throw new Error(`Run ${run.data?.status}`);
    }

    const dataRes = await fetch(
        `${APIFY_BASE}/datasets/${run.data.defaultDatasetId}/items?token=${APIFY_API_TOKEN}&limit=5`,
    );
    const products = await dataRes.json();
    if (!Array.isArray(products) || products.length === 0) return null;

    // Find best priced item
    for (const p of products) {
        const price = extractPrice(p);
        if (price > 0) {
            return {
                name: p.name || item,
                searchQuery: item,
                price,
                store: p.retailerName || p.store || 'Instacart',
                image: p.imageUrl || null,
                unit: p.price?.viewSection?.itemCard?.pricingUnitString || p.size || 'each',
            };
        }
    }
    return null;
}

// ── Scrape a ZIP ────────────────────────────────────────────────
async function scrapeZip(zip, zipData) {
    console.log(`\n📍 ${zip} — ${zipData.neighborhood}`);
    const items = {};
    let basketTotal = 0;
    let store = 'Instacart';

    // Scrape one item at a time to minimize waste on rate limits
    for (const item of ITEMS) {
        try {
            process.stdout.write(`  🔍 ${item}... `);
            const result = await scrapeItem(item, zip, zipData.address);
            if (result && result.price > 0) {
                items[item] = { name: result.name, price: result.price, store: result.store, image: result.image, unit: result.unit };
                basketTotal += result.price;
                store = result.store;
                console.log(`$${result.price} ✅`);
            } else {
                console.log('no price ⚠️');
            }
        } catch (err) {
            console.log(`error: ${err.message} ❌`);
        }
    }

    return {
        neighborhood: zipData.neighborhood,
        lat: zipData.lat,
        lng: zipData.lng,
        store,
        items,
        basketTotal: Math.round(basketTotal * 100) / 100,
        itemCount: Object.keys(items).length,
    };
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
    const existing = loadExisting();
    const existingPrices = existing?.pricesByZip || {};

    // Skip ZIPs that already have 3+ items
    const zipsToScrape = Object.entries(ZIPS).filter(([zip]) => {
        const data = existingPrices[zip];
        if (data && data.itemCount >= 3) {
            console.log(`⏭️  Skipping ${zip} (${data.neighborhood}) — already has ${data.itemCount} items`);
            return false;
        }
        return true;
    });

    const totalRuns = zipsToScrape.length * ITEMS.length;
    console.log(`\n🛒 Arbicart Scraper (budget-aware)`);
    console.log(`📦 ${ITEMS.length} items × ${zipsToScrape.length} ZIPs = ~${totalRuns} actor runs`);
    console.log(`💰 Estimated cost: ~$${(totalRuns * 0.05).toFixed(2)}-$${(totalRuns * 0.10).toFixed(2)}`);
    console.log(`⏱️  Est. time: ~${Math.ceil(totalRuns * 1.5)} min\n`);

    for (const [zip, zipData] of zipsToScrape) {
        const result = await scrapeZip(zip, zipData);
        existingPrices[zip] = result;
        console.log(`  📊 ${zip}: $${result.basketTotal} (${result.itemCount}/${ITEMS.length} items)`);
    }

    // Merge and write
    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const output = {
        scrapedAt: new Date().toISOString(),
        itemsSearched: [...new Set([...(existing?.itemsSearched || []), ...ITEMS])],
        zipCount: Object.keys(existingPrices).length,
        pricesByZip: existingPrices,
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(output, null, 2));
    console.log(`\n✅ Wrote ${DATA_FILE}`);
    console.log(`📊 ${Object.keys(existingPrices).length} total ZIPs in dataset`);
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
