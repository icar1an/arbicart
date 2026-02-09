---
description: Agent 1 — Design System & Basket Builder (branch agent/ui)
---
// turbo-all

# Agent 1: UI — Design System & Basket Builder

You are building the **frontend design system and basket builder** for Arbicart, a whimsical grocery price comparison website. Your work is on the `agent/ui` branch.

## Setup

1. cd to `/Users/sfw/Desktop/MY GITHUB/arbicart`
2. `git checkout agent/ui`

## Your Files (YOU OWN THESE — implement them fully)

- `client/css/styles.css` — Full design system
- `client/js/basket.js` — Basket builder logic
- `client/index.html` — Build out the header + basket section (keep the map-section and savings-section divs as-is for agent/map)

## Design Personality

**Apple Maps meets iMessage group chat meets a cute budgeting app.**

- **Colors**: Mint `#C1F0DB`, lavender `#D9D4F5`, peach `#FDDCB5`, white cards on `#F5F5F7` background
- **Typography**: Inter 400/500/600/700, large friendly sizes, ZERO serifs
- **Cards**: 20px rounded corners, subtle `box-shadow: 0 2px 16px rgba(0,0,0,0.06)`, slight glassmorphism (backdrop-filter: blur) on overlays
- **Emoji**: FIRST-CLASS UI element — section headers, basket items, preset labels, everything
- **Animations**: CSS `transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)` for bouncy card entrances, pulse on interactive elements, smooth add/remove
- **Vibe**: NOT a Bloomberg terminal. Think cute, approachable, fun. Like if Apple designed a grocery savings app.

## Step-by-Step

### 1. Build `client/css/styles.css`
The file already has design tokens (`:root` vars). Build upon them:
- Full reset + base styles
- `.card` — rounded white card with shadow, hover lift
- `.pill` / `.tag` — small rounded label (used for basket presets)
- `.btn` — rounded button with gradient/glow, bouncy hover
- `.basket-item` — row style for individual grocery items
- `.emoji-badge` — large emoji with subtle background circle
- Header styles, responsive grid, section spacing
- Map container: full-width, `min-height: 400px`, rounded corners
- Savings card: prominent, maybe gradient border, animated number
- Mobile responsive: stack vertically below 768px
- Micro-animations: `@keyframes slideUp`, `@keyframes pulse`, `@keyframes fadeIn`

### 2. Build out `client/index.html`
Fill in the `#app-header` and `#basket-section` areas:
- **Header**: Big "🛒 Arbicart" title, subtitle "See how much you'd save in a different neighborhood", ZIP code input field with a cute 📍 icon
- **Basket section**: 
  - Preset basket pills: "College Student 🍜", "Family of 4 🏠", "Health Nut 🥑", "Essentials 🧻"
  - Custom basket area: item name input + "Add" button
  - Basket display: list of items with emoji, name, quantity stepper (+/-), remove button
  - "Compare Prices 🔍" action button at the bottom
- Keep `#map-section`, `#map-container`, `#savings-section`, `#app-footer` exactly as they are (agent/map owns those)
- Keep all `<script>` tags exactly as they are

### 3. Implement `client/js/basket.js`
Register on `window.Arbicart.basket`:
```javascript
window.Arbicart.basket = {
  getItems()  // → [{name: "Milk", qty: 2, emoji: "🥛"}, ...]
};
```

Features:
- Preset baskets — clicking a preset pill populates the basket with predefined items
- Preset data (hardcode these):
  - "College Student 🍜": ramen, eggs, bread, bananas, peanut butter, rice, frozen pizza
  - "Family of 4 🏠": milk, eggs, bread, chicken breast, pasta, cereal, apples, yogurt, cheese, juice
  - "Health Nut 🥑": avocado, quinoa, salmon, spinach, blueberries, almond milk, sweet potato
  - "Essentials 🧻": toilet paper, paper towels, dish soap, laundry detergent, trash bags, sponges
- Each item has: `{ name, qty, emoji }` — assign fun emojis to each item
- Custom item add: text input → add to basket with default emoji 🛒
- Quantity stepper: +/- buttons, min 1
- Remove item: X button with slide-out animation
- Render into `#basket-section`
- Animate item additions (slideUp) and removals (slideOut)

### 4. Generate hero images if time allows
Use the `generate_image` tool to create:
- A fun grocery basket illustration for the header area

### 5. Commit and push
```bash
git add -A
git commit -m "feat(ui): design system, basket builder, whimsical layout"
git push origin agent/ui
```

## CRITICAL RULES
- Do NOT modify any files under `server/`
- Do NOT modify `client/js/app.js`, `client/js/map.js`, or `client/js/savings.js`
- DO keep the existing `<script>` tags and section containers in `index.html`
- Make it BEAUTIFUL. The user explicitly said they want whimsy, not utility.
