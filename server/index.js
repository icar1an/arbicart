/**
 * server/index.js — Express server entry
 * Agent/backend owns this file.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pricesRouter = require('./routes/prices');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'client')));

// API routes
app.use('/api/prices', pricesRouter);

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🛒 Arbicart server running on http://localhost:${PORT}`);

    // Log which data source will be used
    if (process.env.INSTACART_API_KEY) {
        console.log('   📡 Instacart IDP key detected');
    } else if (process.env.APIFY_API_TOKEN) {
        console.log('   📡 Apify token detected');
    } else {
        console.log('   🎭 No API keys — using mock data');
    }
});
