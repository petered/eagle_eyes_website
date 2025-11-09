require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.OPENSKY_PROXY_PORT || 3001;

// OpenSky OAuth2 Configuration
const OPENSKY_CONFIG = {
    clientId: process.env.OPENSKY_CLIENT_ID || 'patrick@eagleeyessearch.com-api-client',
    clientSecret: process.env.OPENSKY_CLIENT_SECRET || 'PWwJRYt0XA5gzB8BkjTSQwEKez1xRhfi',
    tokenEndpoint: 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
    apiEndpoint: 'https://opensky-network.org/api'
};

// Token cache
let accessToken = null;
let tokenExpiry = null;

// Enable CORS for all routes
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Get or refresh OAuth2 access token
async function getAccessToken() {
    // Check if we have a valid cached token
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        console.log('Using cached OpenSky token');
        return accessToken;
    }
    
    console.log('🔑 Fetching new OpenSky OAuth2 token...');
    
    try {
        const response = await fetch(OPENSKY_CONFIG.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: OPENSKY_CONFIG.clientId,
                client_secret: OPENSKY_CONFIG.clientSecret
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to obtain access token:', response.status, errorText);
            return null;
        }
        
        const data = await response.json();
        
        // Cache token with 60-second buffer before expiry
        accessToken = data.access_token;
        tokenExpiry = Date.now() + ((data.expires_in - 60) * 1000);
        
        console.log('✅ OpenSky access token obtained, expires in', data.expires_in, 'seconds');
        
        return accessToken;
    } catch (error) {
        console.error('❌ Error fetching access token:', error);
        return null;
    }
}

// Proxy endpoint for OpenSky states/all
app.get('/opensky/states/all', async (req, res) => {
    try {
        // Get access token
        const token = await getAccessToken();
        
        if (!token) {
            return res.status(500).json({ error: 'Failed to authenticate with OpenSky' });
        }
        
        // Build OpenSky API URL with query parameters
        const { lamin, lomin, lamax, lomax } = req.query;
        
        if (!lamin || !lomin || !lamax || !lomax) {
            return res.status(400).json({ error: 'Missing required parameters: lamin, lomin, lamax, lomax' });
        }
        
        const url = `${OPENSKY_CONFIG.apiEndpoint}/states/all?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
        
        console.log('📡 Fetching from OpenSky:', url);
        
        // Make authenticated request to OpenSky
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📥 OpenSky response:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenSky API error:', response.status, errorText);
            return res.status(response.status).json({ error: errorText });
        }
        
        const data = await response.json();
        
        // Return data to client
        res.json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal proxy error', details: error.message });
    }
});

// Proxy endpoint for OpenSky tracks/all
app.get('/opensky/tracks/all', async (req, res) => {
    try {
        // Get access token
        const token = await getAccessToken();
        
        if (!token) {
            return res.status(500).json({ error: 'Failed to authenticate with OpenSky' });
        }
        
        // Build OpenSky API URL with query parameters
        const { icao24, time } = req.query;
        
        if (!icao24) {
            return res.status(400).json({ error: 'Missing required parameter: icao24' });
        }
        
        const timeParam = time || '0';
        const url = `${OPENSKY_CONFIG.apiEndpoint}/tracks/all?icao24=${icao24}&time=${timeParam}`;
        
        console.log('📡 Fetching track from OpenSky:', url);
        
        // Make authenticated request to OpenSky
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📥 OpenSky track response:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenSky API error:', response.status, errorText);
            return res.status(response.status).json({ error: errorText });
        }
        
        const data = await response.json();
        
        // Return data to client
        res.json(data);
        
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Internal proxy error', details: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'OpenSky Proxy' });
});

app.listen(PORT, () => {
    console.log(`✅ OpenSky proxy server running on http://localhost:${PORT}`);
    console.log(`   - States endpoint: http://localhost:${PORT}/opensky/states/all`);
    console.log(`   - Tracks endpoint: http://localhost:${PORT}/opensky/tracks/all`);
});

