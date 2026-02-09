/**
 * basket.js — Basket builder with receipt-format display
 *
 * Must register: window.Arbicart.basket = { getItems() → [{name, qty}] }
 */

window.Arbicart = window.Arbicart || {};

const PRESETS = {
    college: ['ramen', 'eggs', 'rice', 'bananas', 'coffee', 'frozen pizza'],
    family: ['milk', 'eggs', 'bread', 'chicken breast', 'bananas', 'cheese', 'pasta', 'cereal'],
    health: ['avocado', 'spinach', 'salmon', 'quinoa', 'blueberries', 'yogurt'],
    basics: ['milk', 'eggs', 'bread', 'butter', 'rice'],
};

let items = [];

/**
 * Render items as a receipt-style list
 */
function renderReceipt() {
    const container = document.getElementById('basket-items');
    if (!container) return;

    if (items.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
    <div class="receipt-card">
      <div class="receipt-header">
        <span>🧾 Your basket</span>
        <span>${items.length} item${items.length !== 1 ? 's' : ''}</span>
      </div>
      <ul class="receipt-items">
        ${items
            .map(
                (item, i) => `
          <li class="receipt-item">
            <span class="receipt-item-name">${item.name}</span>
            <button class="receipt-item-remove" data-index="${i}" aria-label="Remove ${item.name}">✕</button>
          </li>`,
            )
            .join('')}
      </ul>
      <div class="receipt-footer">
        <span>Ready to compare</span>
        <span>📍 Enter ZIP below</span>
      </div>
    </div>
  `;

    // Attach remove handlers
    container.querySelectorAll('.receipt-item-remove').forEach((el) => {
        el.addEventListener('click', () => {
            items.splice(parseInt(el.dataset.index), 1);
            renderReceipt();
        });
    });
}

function addItem(name) {
    const cleaned = name.trim().toLowerCase();
    if (!cleaned) return;
    if (items.some((i) => i.name === cleaned)) return;
    items.push({ name: cleaned, qty: 1 });
    renderReceipt();
}

function setPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    items = preset.map((name) => ({ name, qty: 1 }));
    renderReceipt();

    document.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => setPreset(btn.dataset.preset));
    });

    // Add item
    const addBtn = document.getElementById('add-item-btn');
    const input = document.getElementById('item-input');

    if (addBtn && input) {
        addBtn.addEventListener('click', () => {
            addItem(input.value);
            input.value = '';
            input.focus();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addItem(input.value);
                input.value = '';
            }
        });
    }

    // Default: load "basics" preset
    setPreset('basics');
});

// Register on the shared namespace
window.Arbicart.basket = {
    getItems: () => [...items],
};
