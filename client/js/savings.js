/**
 * savings.js — Savings card with Instacart-style design
 *
 * Must register: window.Arbicart.savings = { showSavings(homeZip, pricesByZip) }
 */

window.Arbicart = window.Arbicart || {};

window.Arbicart.savings = {
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
    const monthlySavings = savings * 4;
    const pctSavings = ((savings / homeData.basketTotal) * 100).toFixed(0);

    section.innerHTML = `
      <div style="
        background: #FFFFFF;
        border: 1px solid #E8E9EB;
        border-radius: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        padding: 1.5rem;
        max-width: 600px;
        margin: 0 auto;
        font-family: 'Inter', -apple-system, sans-serif;
        animation: fadeIn 0.3s ease-out;
      ">
        <!-- Header -->
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
          <span style="
            background: #E8F5E9;
            color: #0AAD0A;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.25rem 0.6rem;
            border-radius: 100px;
            letter-spacing: 0.05em;
          ">💰 SAVINGS</span>
        </div>

        <h3 style="font-size: 1.1rem; font-weight: 700; color: #343538; margin-bottom: 1rem;">
          Same groceries, different neighborhood
        </h3>

        <!-- Price comparison -->
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <!-- Home ZIP -->
          <div style="
            flex: 1;
            min-width: 120px;
            background: #F6F7F8;
            border-radius: 12px;
            padding: 1rem;
            text-align: center;
          ">
            <div style="font-size: 0.7rem; font-weight: 600; color: #72767E; margin-bottom: 0.25rem;">
              📍 ${homeData.neighborhood}
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #343538;">
              $${homeData.basketTotal.toFixed(2)}
            </div>
          </div>

          <!-- Arrow -->
          <div style="font-size: 1.2rem; color: #72767E;">→</div>

          <!-- Cheapest ZIP -->
          <div style="
            flex: 1;
            min-width: 120px;
            background: #E8F5E9;
            border-radius: 12px;
            padding: 1rem;
            text-align: center;
          ">
            <div style="font-size: 0.7rem; font-weight: 600; color: #0AAD0A; margin-bottom: 0.25rem;">
              💰 ${cheapestData.neighborhood}
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #003D29;">
              $${cheapestTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <!-- Big savings -->
        <div style="
          background: linear-gradient(135deg, #003D29, #0AAD0A);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          color: #FFFFFF;
        ">
          <div style="font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; opacity: 0.8; margin-bottom: 0.25rem;">
            YOU'D SAVE
          </div>
          <div style="font-size: 2.5rem; font-weight: 800; margin-bottom: 0.15rem;">
            $${monthlySavings.toFixed(2)}<span style="font-size: 0.9rem; opacity: 0.7;">/mo</span>
          </div>
          <div style="font-size: 0.75rem; font-weight: 500; opacity: 0.7;">
            ${pctSavings}% less per trip · ~4 trips/month
          </div>
        </div>

        <p style="font-size: 0.7rem; color: #72767E; text-align: center; margin-top: 0.75rem;">
          Prices from Instacart · For awareness, not arbitrage
        </p>
      </div>
    `;

    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
};
