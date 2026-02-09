/**
 * server/services/mock.js — Realistic Ithaca-area mock data for development
 *
 * Used when neither INSTACART_API_KEY nor APIFY_API_TOKEN is available.
 * Prices vary by ZIP code — lower-income areas tend to be cheaper.
 */

// ── Base prices (Collegetown baseline) ────────────────────────
const BASE_PRICES = {
    'milk': 4.79,
    'eggs': 5.99,
    'bread': 4.49,
    'butter': 5.29,
    'chicken breast': 8.99,
    'ground beef': 7.49,
    'rice': 3.99,
    'pasta': 2.49,
    'bananas': 0.79,
    'apples': 2.29,
    'orange juice': 4.99,
    'cheese': 5.49,
    'yogurt': 1.69,
    'cereal': 4.99,
    'coffee': 9.99,
    'sugar': 3.49,
    'flour': 3.99,
    'olive oil': 7.99,
    'tomatoes': 3.29,
    'potatoes': 4.49,
    'onions': 2.49,
    'garlic': 1.29,
    'lettuce': 2.99,
    'frozen pizza': 6.99,
    'ice cream': 5.99,
    'ramen': 0.99,
    'avocado': 2.49,
    'spinach': 3.49,
    'salmon': 12.99,
    'quinoa': 5.99,
    'blueberries': 4.99,
};

// ── Store names per area ──────────────────────────────────────
const STORES = {
    '14850': 'Wegmans Ithaca',
    '14853': 'Collegetown Market',
    '14882': 'Tops Lansing',
    '14886': 'Trumansburg Grocery',
    '14867': 'P&C Fresh Newfield',
    '14817': 'Brooktondale Market',
    '14830': 'Tops Corning',
    '14845': 'Horseheads Wegmans',
    '14901': 'Tops Elmira',
    '13045': 'Tops Cortland',
};

// ── ZIP code data ─────────────────────────────────────────────
// priceMult: multiplier relative to base prices
const ZIPS = {
    '14850': {
        neighborhood: 'Ithaca (Downtown)',
        lat: 42.4440,
        lng: -76.5019,
        medianIncome: 32000,
        priceMult: 1.0,
    },
    '14853': {
        neighborhood: 'Collegetown / Cornell',
        lat: 42.4430,
        lng: -76.4856,
        medianIncome: 28000,
        priceMult: 1.05,
    },
    '14882': {
        neighborhood: 'Lansing',
        lat: 42.5722,
        lng: -76.5290,
        medianIncome: 62000,
        priceMult: 0.88,
    },
    '14886': {
        neighborhood: 'Trumansburg',
        lat: 42.5429,
        lng: -76.6608,
        medianIncome: 48000,
        priceMult: 0.82,
    },
    '14867': {
        neighborhood: 'Newfield',
        lat: 42.3579,
        lng: -76.5933,
        medianIncome: 52000,
        priceMult: 0.85,
    },
    '14817': {
        neighborhood: 'Brooktondale',
        lat: 42.3880,
        lng: -76.3960,
        medianIncome: 44000,
        priceMult: 0.80,
    },
    '14830': {
        neighborhood: 'Corning',
        lat: 42.1428,
        lng: -77.0547,
        medianIncome: 38000,
        priceMult: 0.78,
    },
    '14845': {
        neighborhood: 'Horseheads',
        lat: 42.1670,
        lng: -76.8205,
        medianIncome: 55000,
        priceMult: 0.83,
    },
    '14901': {
        neighborhood: 'Elmira',
        lat: 42.0898,
        lng: -76.8077,
        medianIncome: 30000,
        priceMult: 0.75,
    },
    '13045': {
        neighborhood: 'Cortland',
        lat: 42.6012,
        lng: -76.1805,
        medianIncome: 35000,
        priceMult: 0.77,
    },
};

// ── Tiny deterministic jitter so prices feel real ─────────────
function jitter(base, seed) {
    const hash = (seed.charCodeAt(0) * 31 + seed.charCodeAt(seed.length - 1)) % 100;
    const factor = 0.95 + (hash / 100) * 0.10; // ±5%
    return Math.round(base * factor * 100) / 100;
}

/**
 * Return mock price data for a specific ZIP code and list of items.
 */
function getPricesForZip(items, zip) {
    const zipData = ZIPS[zip];
    if (!zipData) return null;

    const priced = {};
    let basketTotal = 0;

    for (const item of items) {
        const key = item.toLowerCase().trim();
        const basePrice = BASE_PRICES[key] || 3.99;
        const price = jitter(basePrice * zipData.priceMult, key + zip);
        priced[item] = {
            price,
            store: STORES[zip] || 'Local Grocery',
        };
        basketTotal += price;
    }

    return {
        neighborhood: zipData.neighborhood,
        lat: zipData.lat,
        lng: zipData.lng,
        medianIncome: zipData.medianIncome,
        items: priced,
        basketTotal: Math.round(basketTotal * 100) / 100,
    };
}

function getAllZips() {
    return Object.keys(ZIPS);
}

module.exports = { getPricesForZip, getAllZips, ZIPS };
