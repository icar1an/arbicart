/**
 * server/services/apify.js — Apify Instacart scraper client (fallback)
 * Agent/backend owns this file.
 *
 * Interface: { searchProducts(items, address) → [{name, price, unit, store, image}] }
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'epctex~instacart-scraper';
const APIFY_BASE = 'https://api.apify.com/v2';

/**
 * Search for products using the Apify Instacart scraper actor.
 * Throws if APIFY_API_TOKEN is not set so the route can fall through.
 *
 * @param {string[]} items   - List of item names
 * @param {string}   address - Street address for location context
 * @returns {Promise<Array<{name, price, unit, store, image}>>}
 */
async function searchProducts(items, address) {
    if (!APIFY_API_TOKEN) {
        throw new Error('APIFY_API_TOKEN not set — skipping Apify');
    }

    // Start the actor run
    const runRes = await fetch(
        `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                searchTerms: items,
                streetAddress: address,
            }),
        },
    );

    if (!runRes.ok) {
        throw new Error(`Apify actor start failed: ${runRes.status}`);
    }

    const runData = await runRes.json();
    const runId = runData.data?.id;
    if (!runId) throw new Error('Apify did not return a run ID');

    // Poll until the run finishes (max ~2 minutes)
    const maxAttempts = 24;
    const pollInterval = 5000;
    let status = 'RUNNING';

    for (let i = 0; i < maxAttempts && status === 'RUNNING'; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));

        const statusRes = await fetch(
            `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`,
        );
        const statusData = await statusRes.json();
        status = statusData.data?.status || 'FAILED';
    }

    if (status !== 'SUCCEEDED') {
        throw new Error(`Apify run did not succeed: ${status}`);
    }

    // Fetch the dataset results
    const datasetRes = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`,
    );
    const rawItems = await datasetRes.json();

    // Normalize to our standard shape
    return (Array.isArray(rawItems) ? rawItems : []).map((p) => ({
        name: p.name || p.title || p.productName || 'Unknown',
        price: parseFloat(p.price || p.currentPrice || p.salePrice || 0),
        unit: p.unit || p.size || 'each',
        store: p.store || p.storeName || p.retailer || 'Instacart',
        image: p.image || p.imageUrl || p.thumbnailUrl || null,
    }));
}

module.exports = { searchProducts };
