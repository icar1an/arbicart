/**
 * savings.js — Savings calculation + animated comparison card
 * Agent/map owns this file.
 *
 * Must register: window.Arbicart.savings = { showSavings(homeZip, pricesByZip) }
 */

window.Arbicart = window.Arbicart || {};

window.Arbicart.savings = {
    /**
     * Build and display the savings comparison card.
     * @param {string} homeZip — The user's home ZIP code
     * @param {Object} pricesByZip — { "10001": { basketTotal, neighborhood, … }, … }
     */
    showSavings(homeZip, pricesByZip) {
        const section = document.getElementById('savings-section');
        if (!section) return;

        const homeData = pricesByZip[homeZip];
        if (!homeData) return;

        // Find cheapest ZIP
        let cheapestZip = null;
        let cheapestTotal = Infinity;
        Object.entries(pricesByZip).forEach(([zip, data]) => {
            if (data.basketTotal < cheapestTotal) {
                cheapestTotal = data.basketTotal;
                cheapestZip = zip;
            }
        });

        const cheapestData = pricesByZip[cheapestZip];
        const savings = homeData.basketTotal - cheapestTotal;
        const monthlySavings = savings * 4; // ~4 grocery trips/month
        const pctSavings = ((savings / homeData.basketTotal) * 100).toFixed(0);

        // Build the savings card
        section.innerHTML = `
      <div class="savings-card" style="
        background: linear-gradient(135deg, #C1F0DB 0%, #D9D4F5 50%, #FDDCB5 100%);
        border-radius: 24px;
        padding: 32px;
        max-width: 600px;
        margin: 24px auto;
        text-align: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        animation: fadeSlideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        font-family: 'Inter', sans-serif;
      ">
        <div style="font-size: 48px; margin-bottom: 8px;">💸</div>
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1D1D1F;">
          Same groceries, different neighborhood
        </h2>

        <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="
            background: rgba(255,255,255,0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 16px 24px;
            min-width: 140px;
          ">
            <div style="font-size: 12px; color: #6E6E73; margin-bottom: 4px;">🏠 ${homeData.neighborhood}</div>
            <div style="font-size: 28px; font-weight: 700; color: #1D1D1F;">$${homeData.basketTotal.toFixed(2)}</div>
          </div>
          <div style="display: flex; align-items: center; font-size: 24px;">→</div>
          <div style="
            background: rgba(255,255,255,0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 16px 24px;
            min-width: 140px;
          ">
            <div style="font-size: 12px; color: #6E6E73; margin-bottom: 4px;">💰 ${cheapestData.neighborhood}</div>
            <div style="font-size: 28px; font-weight: 700; color: #34C759;">$${cheapestTotal.toFixed(2)}</div>
          </div>
        </div>

        <div style="
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 20px;
          margin-top: 8px;
        ">
          <div style="font-size: 14px; color: #6E6E73; margin-bottom: 4px;">You'd save</div>
          <div class="savings-amount" style="font-size: 42px; font-weight: 700; color: #007AFF;">
            $${monthlySavings.toFixed(2)}<span style="font-size: 16px; font-weight: 500;">/mo</span>
          </div>
          <div style="font-size: 13px; color: #6E6E73; margin-top: 4px;">
            ${pctSavings}% less per trip · ~4 trips/month
          </div>
        </div>

        <p style="font-size: 11px; color: #8E8E93; margin-top: 16px;">
          🛒 Prices from Instacart · For awareness, not arbitrage
        </p>
      </div>
    `;

        // Inject animation keyframes (once)
        if (!document.getElementById('savings-animations')) {
            const style = document.createElement('style');
            style.id = 'savings-animations';
            style.textContent = `
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .savings-amount {
          animation: countPulse 0.8s ease-out;
        }
        @keyframes countPulse {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
            document.head.appendChild(style);
        }

        // Scroll savings card into view
        section.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};
