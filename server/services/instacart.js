/**
 * server/services/instacart.js — Instacart Developer Platform client
 * Agent/backend owns this file.
 *
 * Interface: { searchProducts(items, address) → [{name, price, unit, store, image}] }
 */

const INSTACART_API_KEY = process.env.INSTACART_API_KEY;
const BASE_URL = 'https://connect.instacart.com/v2';

/**
 * Search for products on Instacart via the Developer Platform API.
 * Throws if INSTACART_API_KEY is not set so the route can fall through.
 *
 * @param {string[]} items   - List of item names, e.g. ["milk", "eggs"]
 * @param {string}   address - Street address or ZIP code for store lookup
 * @returns {Promise<Array<{name, price, unit, store, image}>>}
 */
async function searchProducts(items, address) {
    if (!INSTACART_API_KEY) {
        throw new Error('INSTACART_API_KEY not set — skipping Instacart IDP');
    }

    const results = [];

    for (const item of items) {
        try {
            const res = await fetch(`${BASE_URL}/fulfillment/catalog/products/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${INSTACART_API_KEY}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: item,
                    location: { address_line_1: address },
                    limit: 5,
                }),
            });

            if (!res.ok) {
                console.warn(`Instacart search for "${item}" failed: ${res.status}`);
                continue;
            }

            const data = await res.json();

            // Normalize response to our standard shape
            const products = (data.products || data.items || []).slice(0, 3);
            for (const p of products) {
                results.push({
                    name: p.name || p.title || item,
                    price: parseFloat(p.price || p.unit_price || 0),
                    unit: p.unit || p.size || 'each',
                    store: p.retailer_name || p.store || 'Instacart',
                    image: p.image_url || p.thumbnail || null,
                });
            }
        } catch (err) {
            console.warn(`Instacart search error for "${item}":`, err.message);
        }
    }

    if (results.length === 0) {
        throw new Error('Instacart IDP returned no results');
    }

    return results;
}

module.exports = { searchProducts };
