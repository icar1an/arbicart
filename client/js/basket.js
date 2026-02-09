/**
 * basket.js — Basket builder UI
 *
 * Registers: window.Arbicart.basket = { getItems() → [{name, qty}] }
 * Handles preset buttons, custom item add, and pill rendering.
 */

window.Arbicart = window.Arbicart || {};

const PRESETS = {
    college: ['ramen', 'eggs', 'rice', 'bananas', 'coffee', 'frozen pizza'],
    family: ['milk', 'eggs', 'bread', 'chicken breast', 'bananas', 'cheese', 'pasta', 'cereal'],
    health: ['avocado', 'spinach', 'salmon', 'quinoa', 'blueberries', 'yogurt'],
    basics: ['milk', 'eggs', 'bread', 'butter', 'rice'],
};

let items = [];

function renderPills() {
    const container = document.getElementById('basket-items');
    if (!container) return;

    container.innerHTML = items
        .map(
            (item, i) =>
                `<span class="basket-pill">
          ${item.name}
          <span class="remove-x" data-index="${i}">✕</span>
        </span>`,
        )
        .join('');

    // Attach remove handlers
    container.querySelectorAll('.remove-x').forEach((el) => {
        el.addEventListener('click', () => {
            items.splice(parseInt(el.dataset.index), 1);
            renderPills();
        });
    });
}

function addItem(name) {
    const cleaned = name.trim().toLowerCase();
    if (!cleaned) return;
    if (items.some((i) => i.name === cleaned)) return; // no dupes
    items.push({ name: cleaned, qty: 1 });
    renderPills();
}

function setPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    items = preset.map((name) => ({ name, qty: 1 }));
    renderPills();

    // Update active state on buttons
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
