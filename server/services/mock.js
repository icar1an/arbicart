/**
 * server/services/mock.js — Realistic NYC mock data for development
 * Agent/backend owns this file.
 *
 * Used when neither INSTACART_API_KEY nor APIFY_API_TOKEN is available.
 * Prices vary by ZIP code — lower-income neighborhoods are 10-25% cheaper.
 */

// ── Base prices (Midtown baseline) ────────────────────────────
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
};

// ── Store names per neighborhood ──────────────────────────────
const STORES = {
    '10001': 'Morton Williams',
    '10002': 'Essex Market',
    '10003': 'Trader Joe\'s',
    '10010': 'Whole Foods',
    '10019': 'Westside Market',
    '10025': 'Fairway Market',
    '10029': 'Associated',
    '10034': 'Key Food',
    '10451': 'Fine Fare',
    '10301': 'ShopRite',
};

// ── ZIP code data ─────────────────────────────────────────────
// priceMult: multiplier relative to base prices
// Lower-income areas have lower multipliers (cheaper groceries)
const ZIPS = {
    '10001': {
        neighborhood: 'Midtown',
        lat: 40.7484,
        lng: -73.9967,
        medianIncome: 85000,
        priceMult: 1.0,
    },
    '10002': {
        neighborhood: 'Lower East Side',
        lat: 40.7157,
        lng: -73.9863,
        medianIncome: 42000,
        priceMult: 0.82,
    },
    '10003': {
        neighborhood: 'East Village',
        lat: 40.7317,
        lng: -73.9893,
        medianIncome: 78000,
        priceMult: 0.95,
    },
    '10010': {
        neighborhood: 'Gramercy',
        lat: 40.7390,
        lng: -73.9826,
        medianIncome: 105000,
        priceMult: 1.08,
    },
    '10019': {
        neighborhood: 'Hell\'s Kitchen',
        lat: 40.7654,
        lng: -74.0001,
        medianIncome: 72000,
        priceMult: 0.93,
    },
    '10025': {
        neighborhood: 'Upper West Side',
        lat: 40.7990,
        lng: -73.9680,
        medianIncome: 95000,
        priceMult: 1.04,
    },
    '10029': {
        neighborhood: 'East Harlem',
        lat: 40.7918,
        lng: -73.9440,
        medianIncome: 32000,
        priceMult: 0.76,
    },
    '10034': {
        neighborhood: 'Inwood',
        lat: 40.8677,
        lng: -73.9212,
        medianIncome: 38000,
        priceMult: 0.78,
    },
    '10451': {
        neighborhood: 'South Bronx',
        lat: 40.8200,
        lng: -73.9237,
        medianIncome: 25000,
        priceMult: 0.75,
    },
    '10301': {
        neighborhood: 'Staten Island',
        lat: 40.6433,
        lng: -74.0770,
        medianIncome: 55000,
        priceMult: 0.88,
    },
};

// ── Tiny deterministic jitter so prices feel real ─────────────
function jitter(base, seed) {
    // simple hash-like jitter ±5%
    const hash = (seed.charCodeAt(0) * 31 + seed.charCodeAt(seed.length - 1)) % 100;
    const factor = 0.95 + (hash / 100) * 0.10; // 0.95 – 1.05
    return Math.round(base * factor * 100) / 100;
}

/**
 * Return mock price data for a specific ZIP code and list of items.
 *
 * @param {string[]} items - Item names to price
 * @param {string}   zip   - 5-digit ZIP code
 * @returns {{ neighborhood, lat, lng, medianIncome, items: Object, basketTotal: number }}
 */
function getPricesForZip(items, zip) {
    const zipData = ZIPS[zip];
    if (!zipData) return null;

    const priced = {};
    let basketTotal = 0;

    for (const item of items) {
        const key = item.toLowerCase().trim();
        const basePrice = BASE_PRICES[key] || 3.99; // default for unknown items
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

/**
 * Get all available ZIP codes.
 */
function getAllZips() {
    return Object.keys(ZIPS);
}

module.exports = { getPricesForZip, getAllZips, ZIPS };
