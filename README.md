# 🛒 Arbicart

**Arbitrage + Instacart.** See how much you'd save on groceries if you lived in a different neighborhood.

Arbicart pulls **real** grocery prices from Instacart across nearby ZIP codes and shows the price difference on a whimsical, emoji-filled map — like Apple Maps meets iMessage.

> ⚠️ This is an **awareness tool**. It shows price differences but does not facilitate purchases.

## Quick Start

```bash
cp .env.example .env       # Add your API keys
npm install
npm run dev                 # http://localhost:3000
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, Leaflet.js |
| Backend | Node.js + Express |
| Data | Instacart Developer Platform / Apify |
| Map tiles | CartoDB Voyager |
