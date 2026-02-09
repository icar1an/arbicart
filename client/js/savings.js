/**
 * savings.js — Savings card with Neo-brutalist Instacart design
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
        border: 4px solid #000;
        box-shadow: 8px 8px 0px 0px #000;
        padding: 1.75rem;
        height: 100%;
        font-family: 'Space Grotesk', -apple-system, sans-serif;
        animation: fadeIn 0.2s ease-out;
        display: flex;
        flex-direction: column;
        justify-content: center;
      ">
        <!-- Header badge -->
        <div style="margin-bottom: 1.25rem;">
          <span style="
            display: inline-block;
            background: #0AAD0A;
            color: #fff;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 0.35rem 0.75rem;
            border: 3px solid #000;
            box-shadow: 3px 3px 0px 0px #000;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            transform: rotate(-2deg);
          ">💰 SAVINGS</span>
        </div>

        <h3 style="
          font-size: 1.25rem;
          font-weight: 700;
          color: #000;
          margin-bottom: 1.25rem;
          text-transform: uppercase;
          letter-spacing: -0.01em;
        ">
          Same groceries, different neighborhood
        </h3>

        <!-- Price comparison -->
        <div style="display: flex; align-items: stretch; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <!-- Home ZIP -->
          <div style="
            flex: 1;
            min-width: 120px;
            background: #F6F7F8;
            border: 4px solid #000;
            box-shadow: 4px 4px 0px 0px #000;
            padding: 1rem;
            text-align: center;
          ">
            <div style="
              font-size: 0.7rem;
              font-weight: 700;
              color: #000;
              margin-bottom: 0.35rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            ">
              📍 ${homeData.neighborhood}
            </div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #000;">
              $${homeData.basketTotal.toFixed(2)}
            </div>
          </div>

          <!-- Arrow -->
          <div style="
            font-size: 1.8rem;
            color: #000;
            font-weight: 700;
            display: flex;
            align-items: center;
          ">→</div>

          <!-- Cheapest ZIP -->
          <div style="
            flex: 1;
            min-width: 120px;
            background: #E8F5E9;
            border: 4px solid #000;
            box-shadow: 4px 4px 0px 0px #000;
            padding: 1rem;
            text-align: center;
          ">
            <div style="
              font-size: 0.7rem;
              font-weight: 700;
              color: #003D29;
              margin-bottom: 0.35rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            ">
              💰 ${cheapestData.neighborhood}
            </div>
            <div style="font-size: 1.8rem; font-weight: 700; color: #003D29;">
              $${cheapestTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <!-- Big savings -->
        <div style="
          background: #003D29;
          border: 4px solid #000;
          box-shadow: 6px 6px 0px 0px #000;
          padding: 1.5rem;
          text-align: center;
          color: #FFFFFF;
          position: relative;
          overflow: hidden;
        ">
          <div style="
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            opacity: 0.8;
            margin-bottom: 0.35rem;
          ">
            YOU'D SAVE
          </div>
          <div style="font-size: 2.8rem; font-weight: 700; margin-bottom: 0.2rem;">
            $${monthlySavings.toFixed(2)}<span style="font-size: 0.9rem; opacity: 0.7;">/MO</span>
          </div>
          <div style="
            font-size: 0.8rem;
            font-weight: 700;
            opacity: 0.7;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          ">
            ${pctSavings}% less per trip · ~4 trips/month
          </div>
        </div>

        <p style="
          font-size: 0.7rem;
          color: #000;
          text-align: center;
          margin-top: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        ">
          Prices from Instacart · For awareness, not arbitrage
        </p>
      </div>
    `;

  },
};
