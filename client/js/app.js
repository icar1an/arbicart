/**
 * app.js — Main orchestrator
 * Agent/backend owns this file.
 * 
 * Wires together: basket → API → map → savings
 * 
 * Shared contract:
 *   window.Arbicart.basket  — { getItems() → [{name, qty}] }
 *   window.Arbicart.map     — { plotPrices(pricesByZip), centerOn(lat, lng) }
 *   window.Arbicart.savings — { showSavings(homeZip, pricesByZip) }
 */

window.Arbicart = window.Arbicart || {};

// Agent/backend implements this file
