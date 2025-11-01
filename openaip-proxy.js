const express = require('express');
const cors = require('cors');
const app = express();

// Node.js 18+ has built-in fetch, no need for node-fetch

// OpenAIP API configuration
const OPENAIP_API_BASE = 'https://api.core.openaip.net/api';
const OPENAIP_API_KEY = 'b0e3bef31f5e57bc6c642e5c4069a4b9';

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json());

// OpenAIP Airspace Proxy Endpoint
app.get('/openaip/airspaces', async (req, res) => {
    try {
        const { bbox } = req.query;
        
        if (!bbox) {
            return res.status(400).json({ error: 'bbox parameter is required' });
        }

        // Forward request to OpenAIP API with format=geojson for compatibility
        const openaipUrl = `${OPENAIP_API_BASE}/airspaces?bbox=${bbox}&apiKey=${OPENAIP_API_KEY}&format=geojson`;
        
        console.log(`Proxying airspace request: ${openaipUrl}`);
        
        const response = await fetch(openaipUrl);
        
        if (!response.ok) {
            console.error(`OpenAIP API error: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ 
                error: `OpenAIP API error: ${response.statusText}` 
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// OpenAIP Airport Proxy Endpoint
app.get('/openaip/airports', async (req, res) => {
    try {
        const { bbox } = req.query;
        
        if (!bbox) {
            return res.status(400).json({ error: 'bbox parameter is required' });
        }

        // Forward request to OpenAIP API with format=geojson for compatibility
        const openaipUrl = `${OPENAIP_API_BASE}/airports?bbox=${bbox}&apiKey=${OPENAIP_API_KEY}&format=geojson`;
        
        console.log(`Proxying airport request: ${openaipUrl}`);
        
        const response = await fetch(openaipUrl);
        
        if (!response.ok) {
            console.error(`OpenAIP API error: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ 
                error: `OpenAIP API error: ${response.statusText}` 
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'openaip-proxy' });
});

const PORT = process.env.PORT || 8081; // Use 8081 since Jekyll is on 8080
app.listen(PORT, () => {
    console.log(`OpenAIP Proxy Server running on port ${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  GET /openaip/airspaces?bbox=...`);
    console.log(`  GET /openaip/airports?bbox=...`);
});

