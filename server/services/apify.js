/**
 * server/services/apify.js — Apify Instacart scraper client (fallback)
 *
 * Uses the rigelbytes/instacart-scraper actor.
 * Input:  { postalCode, streetAddress, searchQuery }
 * Output: [{ name, priceString, imageUrl, url, ... }]
 *
 * Interface: { searchProducts(items, zip, address) → [{name, price, unit, store, image}] }
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'rigelbytes~instacart-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

/**
 * Extract a numeric price from various Instacart response shapes.
 *  - priceString: "$3.99"
 *  - price.viewSection.itemCard.priceString: "$3.79"
 */
function extractPrice(product) {
    // Direct top-level priceString (e.g. "$3.99")
    if (product.priceString) {
        const n = parseFloat(product.priceString.replace(/[^0-9.]/g, ''));
        if (!isNaN(n)) return n;
    }
    // Deep nested price from GraphQL response
    const deep = product.price?.viewSection?.itemCard?.priceString
        || product.price?.viewSection?.priceString;
    if (deep) {
        const n = parseFloat(deep.replace(/[^0-9.]/g, ''));
        if (!isNaN(n)) return n;
    }
    return 0;
}

/**
 * Search for products using the Apify Instacart scraper actor.
 * Runs ONE actor call per search query (item).
 *
 * @param {string}   searchQuery - Item to search (e.g. "milk")
 * @param {string}   zip         - Postal / ZIP code
 * @param {string}   address     - Street address
 * @returns {Promise<Array<{name, price, unit, store, image}>>}
 */
async function searchSingle(searchQuery, zip, address) {
    const runRes = await fetch(
        `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}&waitForFinish=180`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postalCode: zip,
                streetAddress: address,
                searchQuery,
            }),
        },
    );

    if (!runRes.ok) {
        const body = await runRes.text().catch(() => '');
        throw new Error(`Apify actor start failed: ${runRes.status} ${body}`);
    }

    const runData = await runRes.json();
    const status = runData.data?.status;
    const datasetId = runData.data?.defaultDatasetId;

    if (status !== 'SUCCEEDED' || !datasetId) {
        throw new Error(`Apify run did not succeed: ${status}`);
    }

    // Fetch dataset items
    const dataRes = await fetch(
        `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_API_TOKEN}&limit=10`,
    );
    const rawItems = await dataRes.json();

    return (Array.isArray(rawItems) ? rawItems : []).map((p) => ({
        name: p.name || 'Unknown',
        price: extractPrice(p),
        unit: p.price?.viewSection?.itemCard?.pricingUnitString || p.size || 'each',
        store: p.retailerName || p.store || 'Instacart',
        image: p.imageUrl || null,
    }));
}

/**
 * Search for multiple items across a single ZIP code.
 * Runs items in parallel (max 3 concurrent to stay under rate limits).
 *
 * @param {string[]} items   - List of search queries
 * @param {string}   zip     - Postal / ZIP code
 * @param {string}   address - Street address
 * @returns {Promise<Array<{name, price, unit, store, image}>>}
 */
async function searchProducts(items, zip, address) {
    if (!APIFY_API_TOKEN) {
        throw new Error('APIFY_API_TOKEN not set — skipping Apify');
    }

    const results = [];
    // Run up to 3 at a time to avoid hammering Apify
    const batchSize = 3;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
            batch.map((item) => searchSingle(item, zip, address)),
        );
        for (const r of batchResults) {
            if (r.status === 'fulfilled' && r.value.length > 0) {
                // Take only the top result per search query
                results.push(r.value[0]);
            }
        }
    }

    if (results.length === 0) {
        throw new Error('Apify returned no results with prices');
    }

    return results;
}

module.exports = { searchProducts };
