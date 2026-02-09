#!/usr/bin/env node

/**
 * scripts/scrape.js — Pre-scrape Instacart prices via Apify
 *
 * Run: node scripts/scrape.js
 *
 * Scrapes real prices for a standard basket of items across all
 * Ithaca-area ZIP codes, then writes results to data/prices.json.
 * Commit and push that file so the website serves instant results.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'rigelbytes~instacart-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

if (!APIFY_API_TOKEN) {
    console.error('❌ APIFY_API_TOKEN not set in .env');
    process.exit(1);
}

// ── All basket items to scrape ──────────────────────────────────
const ITEMS = [
    'milk', 'eggs', 'bread', 'butter', 'rice',
    'chicken breast', 'bananas', 'pasta', 'cheese', 'cereal',
    'coffee', 'yogurt', 'avocado', 'spinach', 'ramen',
    'frozen pizza', 'orange juice', 'potatoes', 'onions', 'salmon',
];

// ── ZIP codes with addresses for Apify geo-routing ──────────────
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

// ── Price extraction (same logic as apify.js service) ───────────
function extractPrice(product) {
    if (product.priceString) {
        const n = parseFloat(product.priceString.replace(/[^0-9.]/g, ''));
        if (!isNaN(n)) return n;
    }
    const deep = product.price?.viewSection?.itemCard?.priceString
        || product.price?.viewSection?.priceString;
    if (deep) {
        const n = parseFloat(deep.replace(/[^0-9.]/g, ''));
        if (!isNaN(n)) return n;
    }
    return 0;
}

// ── Scrape a single item for a single ZIP ───────────────────────
async function scrapeItem(item, zip, address) {
    console.log(`    🔍 Searching "${item}" in ${zip}...`);

    const runRes = await fetch(
        `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postalCode: zip,
                streetAddress: address,
                searchQuery: item,
            }),
        },
    );

    if (!runRes.ok) {
        const body = await runRes.text().catch(() => '');
        throw new Error(`Apify actor failed: ${runRes.status} ${body}`);
    }

    const runData = await runRes.json();
    const status = runData.data?.status;
    const datasetId = runData.data?.defaultDatasetId;

    if (status !== 'SUCCEEDED' || !datasetId) {
        throw new Error(`Apify run status: ${status}`);
    }

    const dataRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=5`,
    );
    const rawItems = await dataRes.json();
    const products = Array.isArray(rawItems) ? rawItems : [];

    if (products.length === 0) return null;

    // Take the best-priced result
    const best = products.reduce((a, b) =>
        extractPrice(a) > 0 && extractPrice(a) < extractPrice(b) ? a : b
    );

    return {
        name: best.name || item,
        searchQuery: item,
        price: extractPrice(best),
        store: best.retailerName || best.store || 'Instacart',
        image: best.imageUrl || null,
        unit: best.price?.viewSection?.itemCard?.pricingUnitString || best.size || 'each',
    };
}

// ── Scrape all items for a single ZIP (batched) ─────────────────
async function scrapeZip(zip, zipData) {
    console.log(`\n📍 Scraping ZIP ${zip} — ${zipData.neighborhood}`);

    const items = {};
    let basketTotal = 0;
    let store = 'Instacart';

    // Batch 3 at a time to avoid rate limits
    for (let i = 0; i < ITEMS.length; i += 3) {
        const batch = ITEMS.slice(i, i + 3);
        const results = await Promise.allSettled(
            batch.map((item) => scrapeItem(item, zip, zipData.address)),
        );

        for (const r of results) {
            if (r.status === 'fulfilled' && r.value && r.value.price > 0) {
                const p = r.value;
                items[p.searchQuery] = {
                    name: p.name,
                    price: p.price,
                    store: p.store,
                    image: p.image,
                    unit: p.unit,
                };
                basketTotal += p.price;
                store = p.store;
            }
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
    console.log('🛒 Arbicart Price Scraper');
    console.log(`📦 ${ITEMS.length} items × ${Object.keys(ZIPS).length} ZIP codes`);
    console.log('⏱️  This will take several minutes...\n');

    const pricesByZip = {};
    const zipEntries = Object.entries(ZIPS);

    for (const [zip, zipData] of zipEntries) {
        try {
            const result = await scrapeZip(zip, zipData);
            pricesByZip[zip] = result;
            console.log(`  ✅ ${zip}: $${result.basketTotal} (${result.itemCount} items from ${result.store})`);
        } catch (err) {
            console.error(`  ❌ ${zip}: ${err.message}`);
        }
    }

    // ── Write output ────────────────────────────────────────────
    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const output = {
        scrapedAt: new Date().toISOString(),
        itemsSearched: ITEMS,
        zipCount: Object.keys(pricesByZip).length,
        pricesByZip,
    };

    const outFile = path.join(outDir, 'prices.json');
    fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

    console.log(`\n✅ Done! Wrote ${outFile}`);
    console.log(`📊 ${Object.keys(pricesByZip).length}/${zipEntries.length} ZIPs scraped`);
    console.log('\nNext: git add data/prices.json && git commit && git push');
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
