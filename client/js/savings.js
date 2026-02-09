/**
 * savings.js — Savings calculation + neo-brutalist comparison card
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
        background: #FFD93D;
        border: 4px solid #000;
        box-shadow: 12px 12px 0px 0px #000;
        padding: 2rem;
        max-width: 600px;
        margin: 1.5rem auto;
        font-family: 'Space Grotesk', sans-serif;
        animation: stampIn 0.2s ease-out;
        position: relative;
      ">
        <!-- Rotated badge -->
        <div style="
          position: absolute;
          top: -14px;
          right: 16px;
          background: #FF6B6B;
          border: 4px solid #000;
          box-shadow: 4px 4px 0px 0px #000;
          padding: 0.3rem 0.8rem;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          transform: rotate(2deg);
        ">💸 SAVINGS</div>

        <h2 style="
          font-size: 1.2rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
          text-align: center;
        ">SAME GROCERIES · DIFFERENT NEIGHBORHOOD</h2>

        <!-- Price comparison boxes -->
        <div style="display: flex; justify-content: center; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <!-- Home ZIP -->
          <div style="
            background: #FFFFFF;
            border: 4px solid #000;
            box-shadow: 4px 4px 0px 0px #000;
            padding: 1rem 1.5rem;
            min-width: 140px;
            text-align: center;
          ">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.25rem;">
              🏠 ${homeData.neighborhood}
            </div>
            <div style="font-size: 1.8rem; font-weight: 700;">
              $${homeData.basketTotal.toFixed(2)}
            </div>
          </div>

          <!-- Arrow -->
          <div style="display: flex; align-items: center; font-size: 1.5rem; font-weight: 700;">→</div>

          <!-- Cheapest ZIP -->
          <div style="
            background: #C4B5FD;
            border: 4px solid #000;
            box-shadow: 4px 4px 0px 0px #000;
            padding: 1rem 1.5rem;
            min-width: 140px;
            text-align: center;
          ">
            <div style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.25rem;">
              💰 ${cheapestData.neighborhood}
            </div>
            <div style="font-size: 1.8rem; font-weight: 700;">
              $${cheapestTotal.toFixed(2)}
            </div>
          </div>
        </div>

        <!-- Big savings number -->
        <div style="
          background: #FFFFFF;
          border: 4px solid #000;
          box-shadow: 6px 6px 0px 0px #000;
          padding: 1.25rem;
          text-align: center;
        ">
          <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.25rem;">
            YOU'D SAVE
          </div>
          <div class="savings-amount" style="
            font-size: 3rem;
            font-weight: 700;
            -webkit-text-stroke: 2px #000;
            color: #FF6B6B;
            animation: savingsPop 0.3s ease-out;
          ">
            $${monthlySavings.toFixed(2)}<span style="font-size: 1rem; -webkit-text-stroke: 0; color: #000;">/MO</span>
          </div>
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 0.25rem;">
            ${pctSavings}% LESS PER TRIP · ~4 TRIPS/MONTH
          </div>
        </div>

        <p style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; text-align: center; margin-top: 1rem;">
          🛒 PRICES FROM INSTACART · FOR AWARENESS NOT ARBITRAGE
        </p>
      </div>
    `;

    // Inject keyframes (once)
    if (!document.getElementById('savings-animations')) {
      const style = document.createElement('style');
      style.id = 'savings-animations';
      style.textContent = `
        @keyframes stampIn {
          0% { opacity: 0; transform: scale(1.3); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes savingsPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
};
