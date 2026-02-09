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

document.addEventListener('DOMContentLoaded', () => {
    const compareBtn = document.querySelector('#compare-btn');
    const zipInput = document.querySelector('#zip-input');

    if (!compareBtn) {
        console.log('[app.js] #compare-btn not found yet — UI agent may not have built it');
        return;
    }

    compareBtn.addEventListener('click', async () => {
        // ── Gather basket items ───────────────────────────────────
        const items = window.Arbicart.basket?.getItems?.() || [];
        const zip = zipInput?.value?.trim() || '14850';

        if (items.length === 0) {
            showToast('🛒 Add some items to your basket first!');
            return;
        }

        // ── Loading state ─────────────────────────────────────────
        const originalText = compareBtn.textContent;
        compareBtn.textContent = '⏳ Fetching real prices… (1-2 min)';
        compareBtn.disabled = true;

        try {
            const itemNames = items.map((i) => i.name || i).join(',');
            const url = `/api/prices?items=${encodeURIComponent(itemNames)}&zip=${encodeURIComponent(zip)}`;
            const res = await fetch(url);

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error || `Server error ${res.status}`);
            }

            const data = await res.json();

            // ── Pass data to map module ─────────────────────────────
            if (window.Arbicart.map) {
                window.Arbicart.map.plotPrices(data.pricesByZip);
                const homeData = data.pricesByZip[data.homeZip];
                if (homeData) {
                    window.Arbicart.map.centerOn(homeData.lat, homeData.lng);
                }
            }

            // ── Pass data to savings module ─────────────────────────
            if (window.Arbicart.savings) {
                window.Arbicart.savings.showSavings(data.homeZip, data.pricesByZip);
            }

            // Scroll to map if it exists
            const mapSection = document.querySelector('#map-section');
            if (mapSection) {
                mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } catch (err) {
            console.error('Price fetch failed:', err);
            showToast(`❌ ${err.message || 'Something went wrong'}`);
        } finally {
            compareBtn.textContent = originalText || '🔍 Compare Prices';
            compareBtn.disabled = false;
        }
    });
});

/**
 * Simple toast notification (works even if UI agent hasn't built one).
 */
function showToast(message) {
    // Check if UI agent provides a toast
    if (window.Arbicart.toast) {
        window.Arbicart.toast(message);
        return;
    }

    // Minimal built-in fallback
    let toast = document.getElementById('arbicart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'arbicart-toast';
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            background: '#003D29',
            color: '#fff',
            fontSize: '0.85rem',
            fontFamily: "'Inter', -apple-system, sans-serif",
            fontWeight: '600',
            zIndex: '9999',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none',
        });
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}
