# Airspace & Airports Layer Implementation Guide

Complete documentation for reimplementing the OpenAIP airspace and airports/heliports layers from scratch.

## Table of Contents
1. [Critical Infrastructure Information](#critical-infrastructure-information)
2. [Overview](#overview)
3. [Data Sources](#data-sources)
4. [Proxy Server Setup](#proxy-server-setup)
5. [Architecture](#architecture)
6. [Step-by-Step Implementation](#step-by-step-implementation)
7. [Key Concepts](#key-concepts)
8. [Code Examples](#code-examples)

---

## Critical Infrastructure Information

### OpenAIP API Configuration

**Base URL:**
```
https://api.core.openaip.net/api
```

**API Key:**
```
b0e3bef31f5e57bc6c642e5c4069a4b9
```

**Direct API Endpoints (DO NOT USE FROM BROWSER - CORS blocked):**
```
GET https://api.core.openaip.net/api/airspaces?bbox={bbox}&apiKey={key}&format=geojson
GET https://api.core.openaip.net/api/airports?bbox={bbox}&apiKey={key}&format=geojson
```

**Parameters:**
- `bbox`: Comma-separated string `"west,south,east,north"` (e.g., `"-123,48,-122,49"`)
- `apiKey`: Required authentication key (above)
- `format`: Optional, `"geojson"` to request GeoJSON format

**Example Direct API Call:**
```bash
curl "https://api.core.openaip.net/api/airspaces?bbox=-123.5,48.0,-122.5,49.0&apiKey=b0e3bef31f5e57bc6c642e5c4069a4b9&format=geojson"
```

### Proxy Server Configuration

**Why a Proxy is Required:**
- OpenAIP API blocks direct browser requests (CORS policy)
- API key must be kept server-side (security)
- Browser cannot include API key in requests

**Proxy Server Location:**
```
http://localhost:8081
```

**Proxy Endpoints:**
```
GET http://localhost:8081/openaip/airspaces?bbox={bbox}
GET http://localhost:8081/openaip/airports?bbox={bbox}
GET http://localhost:8081/health
```

**Port Configuration:**
- Proxy runs on port **8081**
- Jekyll/static site runs on port **8080** (avoid conflict)
- If 8081 is in use, change PORT environment variable

**Complete Proxy Server Code:**

File: `openaip-proxy.js`
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

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

        // Forward request to OpenAIP API with format=geojson
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

        // Forward request to OpenAIP API with format=geojson
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

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`OpenAIP Proxy Server running on port ${PORT}`);
    console.log(`Endpoints:`);
    console.log(`  GET /openaip/airspaces?bbox=...`);
    console.log(`  GET /openaip/airports?bbox=...`);
    console.log(`  GET /health`);
});
```

**Package.json for Proxy:**
File: `openaip-proxy-package.json`
```json
{
  "name": "openaip-proxy",
  "version": "1.0.0",
  "description": "OpenAIP API Proxy Server",
  "main": "openaip-proxy.js",
  "scripts": {
    "start": "node openaip-proxy.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

**Installing and Running the Proxy:**

```bash
# Install dependencies
npm install express cors

# Or use package.json
npm install

# Start the proxy server
node openaip-proxy.js

# Or using npm script
npm start
```

**Verify Proxy is Running:**
```bash
# Test health endpoint
curl http://localhost:8081/health

# Test airspace endpoint (example bbox for Vancouver area)
curl "http://localhost:8081/openaip/airspaces?bbox=-123.5,48.0,-122.5,49.0"
```

**Frontend Configuration:**

In your JavaScript map code:
```javascript
// Always use proxy, never call OpenAIP directly
getOpenAIPProxyUrl() {
    return 'http://localhost:8081';
}

// Construct URLs
const proxyBase = this.getOpenAIPProxyUrl();
const airspaceUrl = `${proxyBase}/openaip/airspaces?bbox=${bbox}&format=geojson`;
const airportUrl = `${proxyBase}/openaip/airports?bbox=${bbox}`;
```

**Important Notes:**
- ✅ Proxy must be running before using airspace layer
- ✅ API key is stored server-side only (never in browser code)
- ✅ Proxy adds API key automatically to OpenAIP requests
- ✅ Proxy enables CORS so browser can fetch data
- ✅ Port 8081 avoids conflict with Jekyll on 8080
- ❌ Never expose API key in frontend JavaScript
- ❌ Cannot call OpenAIP API directly from browser

---

## Overview

The airspace layer displays aviation airspace polygons on a Leaflet map using data from OpenAIP API. The system:
- Fetches airspace data from a proxy server (localhost:8081)
- Filters airspace by type and altitude (0-500 ft)
- Displays polygons with color-coded styling
- Shows popups with airspace details
- Automatically reloads when map view changes
- Creates fallback circles for airports when no matching airspace exists

---

## Proxy Server Setup

### Prerequisites
- Node.js 18+ (has built-in `fetch`, no need for node-fetch)
- npm or yarn package manager

### Installation Steps

1. **Create proxy server file:**
   - Create `openaip-proxy.js` with code from [Critical Infrastructure](#critical-infrastructure-information) section
   - Create `package.json` (or rename `openaip-proxy-package.json` to `package.json`)

2. **Install dependencies:**
   ```bash
   npm install express cors
   ```

3. **Start proxy server:**
   ```bash
   node openaip-proxy.js
   ```

4. **Verify it's running:**
   - Check console output: "OpenAIP Proxy Server running on port 8081"
   - Test: `curl http://localhost:8081/health`
   - Should return: `{"status":"ok","service":"openaip-proxy"}`

5. **Keep proxy running:**
   - Proxy must be running while testing/using the airspace layer
   - Run in a separate terminal window
   - Consider using PM2 or similar for production: `pm2 start openaip-proxy.js`

### Troubleshooting Proxy

**Port already in use:**
```bash
# Find process using port 8081
lsof -i :8081
# Kill it or change PORT environment variable
PORT=8082 node openaip-proxy.js
```

**Dependencies not found:**
```bash
# Make sure you're in the directory with package.json
cd /path/to/project
npm install
```

**CORS errors in browser:**
- Verify proxy has `app.use(cors())` middleware
- Check proxy is actually running on port 8081
- Verify you're calling `localhost:8081`, not the OpenAIP API directly

---

## Data Sources

### Frontend API Endpoints (What Your JavaScript Calls)

All data comes through the proxy server on `localhost:8081`:

```
GET http://localhost:8081/openaip/airspaces?bbox=west,south,east,north
GET http://localhost:8081/openaip/airports?bbox=west,south,east,north
GET http://localhost:8081/health
```

**Example Request from Browser:**
```javascript
const bbox = "-123.5,48.0,-122.5,49.0"; // Vancouver area
const url = `http://localhost:8081/openaip/airspaces?bbox=${bbox}`;
const response = await fetch(url);
const data = await response.json();
```

**Note:** The proxy automatically:
- Adds `apiKey=b0e3bef31f5e57bc6c642e5c4069a4b9` to OpenAIP request
- Adds `format=geojson` parameter
- Handles CORS headers
- Returns data directly to browser

### Response Formats

**Airspaces (with format=geojson):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "12345",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon, lat], ...]]
      },
      "properties": {
        "name": "VANCOUVER",
        "type": 4,
        "icaoClass": 5,
        "lowerLimit": { "value": 0, "unit": 1, "referenceDatum": 0 },
        "upperLimit": { "value": 500, "unit": 1, "referenceDatum": 1 }
      }
    }
  ]
}
```

**Airspaces (fallback paginated format):**
```json
{
  "items": [
    {
      "_id": "12345",
      "name": "VANCOUVER",
      "type": 4,
      "icaoClass": 5,
      "geometry": { "type": "Polygon", "coordinates": [...] },
      "lowerLimit": { "value": 0, "unit": 1, "referenceDatum": 0 },
      "upperLimit": { "value": 500, "unit": 1, "referenceDatum": 1 }
    }
  ]
}
```

**Airports:**
Similar structure to airspaces but as Point geometries.

---

## Architecture

### Core Components

1. **Leaflet GeoJSON Layer** - Displays polygons on map
2. **Filter Function** - Determines which airspaces to show
3. **Data Converter** - Transforms OpenAIP format to GeoJSON
4. **Styling Function** - Assigns colors based on airspace type
5. **Popup Handler** - Creates popup content for each feature
6. **Cache System** - Prevents duplicate fetches for same bbox
7. **Debounce System** - Limits API calls during map movement

### Flow Diagram

```
User pans map
  ↓
map.on('moveend') triggered
  ↓
loadAirspaceDataDebounced() (300ms delay)
  ↓
Get map bounds → normalize bbox
  ↓
Check cache (skip if already loaded)
  ↓
Fetch from proxy: /openaip/airspaces?bbox=...
  ↓
Parse JSON response
  ↓
Convert to GeoJSON features (if needed)
  ↓
Filter features (type + altitude)
  ↓
Add to Leaflet layer: airspaceLayer.addData()
  ↓
Leaflet renders polygons with styling
  ↓
User clicks feature → popup shows
```

---

## Step-by-Step Implementation

### 1. Initialize the GeoJSON Layer

```javascript
// In map initialization
this.airspaceLayer = L.geoJSON(null, {
    pane: 'polygonPane',  // Use custom pane for z-index control
    style: this.getAirspaceStyle.bind(this),
    onEachFeature: this.onEachAirspaceFeature.bind(this)
});

// Create custom pane if needed
this.map.createPane('polygonPane');
this.map.getPane('polygonPane').style.zIndex = 400;
```

**Key points:**
- Start with `null` - data added later via `addData()`
- `style` function called for each feature to set colors
- `onEachFeature` function called to add popups
- Custom pane ensures proper z-index (polygons below markers)

---

### 2. Set Up Map Move Listener

```javascript
// Listen for map movement
this.map.on('moveend', () => {
    if (this.isAirspaceEnabled) {
        this.loadAirspaceDataDebounced();
    }
});
```

**Key points:**
- `moveend` fires after pan/zoom completes
- Only load if airspace layer is enabled
- Use debounced version to limit API calls

---

### 3. Debounce Function

```javascript
loadAirspaceDataDebounced() {
    // Clear existing timer
    if (this.airspaceDebounceTimer) {
        clearTimeout(this.airspaceDebounceTimer);
    }
    
    // Set new timer (300ms debounce)
    this.airspaceDebounceTimer = setTimeout(() => {
        this.loadAirspaceData();
    }, 300);
}
```

**Key points:**
- 300ms delay prevents excessive API calls
- Each new pan cancels previous timer
- Only final pan triggers actual load

---

### 4. Get Map Bounds and Normalize

```javascript
async loadAirspaceData() {
    if (!this.isAirspaceEnabled || !this.map) return;
    
    const bounds = this.map.getBounds();
    const bbox = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth()
    };
    
    // Normalize bbox (clamp longitude to -180..180, latitude to -90..90)
    const normalized = this.normalizeBbox(
        bbox.west, bbox.south, bbox.east, bbox.north
    );
    
    const bboxString = `${normalized.west},${normalized.south},${normalized.east},${normalized.north}`;
    
    // Check cache
    if (this.airspaceCache.has(bboxString)) {
        return; // Already loaded this area
    }
    
    // ... fetch data
}
```

**Normalize function:**
```javascript
normalizeBbox(west, south, east, north) {
    // Normalize longitude to -180 to 180
    const normalizeLon = (lon) => {
        lon = lon % 360;
        if (lon > 180) lon -= 360;
        if (lon < -180) lon += 360;
        return lon;
    };
    
    let w = normalizeLon(west);
    let e = normalizeLon(east);
    let s = Math.max(-90, Math.min(90, south));
    let n = Math.max(-90, Math.min(90, north));
    
    // Handle date line crossing or huge bboxes
    const lonRange = e - w;
    if (lonRange > 350 || w > e) {
        // Use map center with default range
        const center = this.map.getCenter();
        w = Math.max(-180, center.lng - 10);
        e = Math.min(180, center.lng + 10);
        s = Math.max(-90, center.lat - 10);
        n = Math.min(90, center.lat + 10);
    }
    
    return { west: w, south: s, east: e, north: n };
}
```

---

### 5. Fetch Data from Proxy

```javascript
// Configuration
const proxyBase = 'http://localhost:8081';
const airspaceUrl = `${proxyBase}/openaip/airspaces?bbox=${bboxString}`;
// Note: format=geojson is added by proxy, not needed in frontend URL

try {
    const response = await fetch(airspaceUrl);
    
    // Check for network errors (proxy unreachable)
    if (!response) {
        this.airspaceProxyError = true;
        this.showProxyErrorMessage();
        return;
    }
    
    // Check for HTTP errors
    if (!response.ok) {
        console.warn(`Proxy HTTP error: ${response.status}`);
        // Don't show banner for HTTP errors (proxy is reachable, just had an issue)
        return;
    }
    
    const data = await response.json();
    
    // Clear error on successful load
    this.airspaceProxyError = false;
    this.hideProxyErrorMessage();
    
    // ... process data
} catch (error) {
    console.error('Fetch error:', error);
    
    // Only show banner for network errors (proxy unreachable)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
        this.airspaceProxyError = true;
        this.showProxyErrorMessage();
    }
}
```

**Complete Fetch with Error Handling:**
```javascript
async loadAirspaceData() {
    if (!this.isAirspaceEnabled || !this.map) return;
    
    // Get bbox...
    const bbox = `${west},${south},${east},${north}`;
    
    // Check cache
    if (this.airspaceCache.has(bbox)) {
        return;
    }
    
    const proxyBase = 'http://localhost:8081';
    const airspaceUrl = `${proxyBase}/openaip/airspaces?bbox=${bbox}`;
    const airportUrl = `${proxyBase}/openaip/airports?bbox=${bbox}`;
    
    try {
        // Fetch both endpoints in parallel
        const [airspaceResponse, airportResponse] = await Promise.all([
            fetch(airspaceUrl).catch(err => {
                console.error('Proxy fetch error for airspace:', err);
                return null; // Return null on network error
            }),
            fetch(airportUrl).catch(err => {
                console.error('Proxy fetch error for airports:', err);
                return null;
            })
        ]);
        
        // Error handling
        if (this.isAirspaceEnabled) {
            if (!airspaceResponse && !airportResponse) {
                // Both failed - proxy unreachable
                this.airspaceProxyError = true;
                this.showProxyErrorMessage();
                return;
            } else if (airspaceResponse) {
                // Got response - proxy reachable
                this.airspaceProxyError = false;
                this.hideProxyErrorMessage();
            } else if (!airspaceResponse && airportResponse) {
                // Airports work but airspace doesn't - still show error
                this.airspaceProxyError = true;
                this.showProxyErrorMessage();
                return;
            }
        }
        
        // Process responses...
        if (airspaceResponse && airspaceResponse.ok) {
            const data = await airspaceResponse.json();
            // ... process data
        }
    } catch (error) {
        console.error('Error loading airspace data:', error);
    }
}
```

**Error handling:**
- Network errors → show red banner: "OpenAIP proxy server unreachable"
- HTTP errors (4xx/5xx) → log but don't show banner (proxy is reachable)
- Clear banner when data loads successfully

---

### 6. Parse Response Format

```javascript
let featureArray = null;

// Priority 1: GeoJSON FeatureCollection
if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    featureArray = data.features;
}
// Priority 2: OpenAIP paginated format
else if (data.items && Array.isArray(data.items)) {
    featureArray = data.items.map(item => this.convertOpenAIPItemToGeoJSON(item));
}
// Priority 3: Direct array
else if (Array.isArray(data)) {
    featureArray = data;
}
// Priority 4: Features array without type
else if (Array.isArray(data.features)) {
    featureArray = data.features;
}
```

---

### 7. Convert OpenAIP Format to GeoJSON

```javascript
convertOpenAIPItemToGeoJSON(item) {
    const props = {};
    
    // Basic properties
    props.name = item.name || 'Unknown';
    props.id = item._id || item.id;
    
    // Map type code to string
    const typeMap = {
        0: 'AWY', 4: 'CTR', 13: 'ATZ', 20: 'HTZ'
        // Add more as needed
    };
    if (item.type !== undefined) {
        props.type = typeMap[item.type] || `TYPE_${item.type}`;
        props.typeCode = item.type; // Keep numeric for filtering
    }
    
    // Map ICAO class to letter
    // 0=A, 1=B, 2=C, 3=D, 4=E, 5=F, 6=G, 8=Unclassified
    const icaoClasses = ['A', 'B', 'C', 'D', 'E', 'F', 'G', null, 'Unclassified'];
    if (item.icaoClass !== undefined) {
        props.icaoClass = icaoClasses[item.icaoClass] || null;
        props.icaoClassNumeric = item.icaoClass; // Keep numeric
    }
    
    // Convert altitude limits to feet
    if (item.lowerLimit) {
        let lowerLimitFt = item.lowerLimit.value;
        
        // Unit conversion
        if (item.lowerLimit.unit === 0) {
            // Meters → feet
            props.lowerLimitUnit = 'M';
            lowerLimitFt = item.lowerLimit.value * 3.28084;
        } else if (item.lowerLimit.unit === 1) {
            // Already feet
            props.lowerLimitUnit = 'FT';
        } else if (item.lowerLimit.unit === 2) {
            // Flight level → feet (FL × 100)
            props.lowerLimitUnit = 'FL';
            lowerLimitFt = item.lowerLimit.value * 100;
        }
        
        // Ground/surface = 0 feet
        if (item.lowerLimit.referenceDatum === 0) {
            lowerLimitFt = 0;
        }
        
        props.lowerLimitFt = lowerLimitFt;
        props.lowerLimitRaw = item.lowerLimit.value; // Keep original for display
        props.lowerLimitReferenceDatum = item.lowerLimit.referenceDatum;
    } else {
        props.lowerLimitFt = 0; // Missing = 0
    }
    
    // Same for upperLimit (but missing = Infinity)
    if (item.upperLimit) {
        let upperLimitFt = item.upperLimit.value;
        if (item.upperLimit.unit === 0) {
            upperLimitFt = item.upperLimit.value * 3.28084;
        } else if (item.upperLimit.unit === 2) {
            upperLimitFt = item.upperLimit.value * 100;
        }
        if (item.upperLimit.referenceDatum === 0) {
            upperLimitFt = 0;
        }
        props.upperLimitFt = upperLimitFt;
        props.upperLimitRaw = item.upperLimit.value;
        props.upperLimitReferenceDatum = item.upperLimit.referenceDatum;
    } else {
        props.upperLimitFt = Infinity; // Missing = Infinity
    }
    
    // Extract other properties
    props.code = item.icao || item.ident || null;
    props.frequency = item.radioFrequencies?.[0]?.frequency || null;
    
    return {
        type: 'Feature',
        id: item._id || item.id,
        geometry: item.geometry,
        properties: props
    };
}
```

**Key conversions:**
- **Meters → Feet**: `value × 3.28084`
- **Flight Level → Feet**: `value × 100` (FL100 = 10,000 ft)
- **Ground/Surface**: Always `0 ft` regardless of value
- **Missing lower**: `0 ft`
- **Missing upper**: `Infinity`

---

### 8. Filter Airspace

```javascript
filterAirspace(feature) {
    const props = feature.properties || {};
    const type = (props.type || '').toUpperCase();
    const name = (props.name || '').toUpperCase();
    const typeCode = props.typeCode;
    const icaoClassNumeric = props.icaoClassNumeric;
    
    // ALWAYS show Class F (ICAO class 5)
    if (icaoClassNumeric === 5) {
        return true;
    }
    
    // Check type filters
    let passesTypeFilter = false;
    
    // Include: Restricted, Prohibited, Danger
    const restrictedTypes = ['RESTRICTED', 'PROHIBITED', 'DANGER'];
    if (restrictedTypes.some(r => type.includes(r) || name.includes(r))) {
        passesTypeFilter = true;
    }
    
    // Include: CTR (4), ATZ (13), HTZ (20)
    const includedTypeCodes = [4, 13, 20];
    if (includedTypeCodes.includes(typeCode)) {
        passesTypeFilter = true;
    }
    
    // Include: Class B, C, D, E (1, 2, 3, 4)
    if ([1, 2, 3, 4].includes(icaoClassNumeric)) {
        passesTypeFilter = true;
    }
    
    if (!passesTypeFilter) {
        return false;
    }
    
    // Altitude filter: must intersect 0-500 ft
    const lowerLimitFt = props.lowerLimitFt ?? 0;
    const upperLimitFt = props.upperLimitFt ?? Infinity;
    
    // Feature passes if: highFt >= 0 AND lowFt <= 500
    const intersects = upperLimitFt >= 0 && lowerLimitFt <= 500;
    
    return intersects;
}
```

**Filter logic:**
1. **Class F**: Always show (bypass altitude)
2. **Restricted/Prohibited/Danger**: Show if name/type matches
3. **CTR/ATZ/HTZ**: Show if type code matches
4. **Class B/C/D/E**: Show if ICAO class matches
5. **Altitude**: Must intersect 0-500 ft (except Class F)

---

### 9. Style Airspace Polygons

```javascript
getAirspaceStyle(feature) {
    const props = feature.properties || {};
    const type = (props.type || '').toUpperCase();
    
    const fillOpacity = 0.25; // 25% opacity
    let color = '#0066cc'; // Default blue
    
    // Color rules:
    if (type.includes('RESTRICTED') || 
        type.includes('PROHIBITED') || 
        type.includes('DANGER')) {
        color = '#dc3545'; // Red
    } else if (props.unknownRadius === true) {
        color = '#ffc107'; // Yellow (fallback circles)
    }
    
    return {
        fillColor: color,
        fillOpacity: fillOpacity,
        color: color,        // Outline color
        weight: 2,           // Outline width
        opacity: 0.9         // Outline opacity (darker)
    };
}
```

**Color scheme:**
- **Red**: Restricted, Prohibited, Danger
- **Yellow**: Unknown radius (fallback circles)
- **Blue**: Everything else

---

### 10. Create Popups

```javascript
onEachAirspaceFeature(feature, layer) {
    const props = feature.properties || {};
    const name = props.name || 'Unknown';
    const code = props.code || null;
    const icaoClass = props.icaoClass || 'N/A';
    
    // Format altitude with original units and datum
    const lowerLimit = this.formatAltitudeWithDatum(
        props.lowerLimitRaw ?? props.lowerLimit,
        props.lowerLimitUnit,
        props.lowerLimitReferenceDatum
    );
    const upperLimit = this.formatAltitudeWithDatum(
        props.upperLimitRaw ?? props.upperLimit,
        props.upperLimitUnit,
        props.upperLimitReferenceDatum
    );
    
    let popupContent = `
        <div style="font-family: Arial, sans-serif; min-width: 200px;">
            <strong>${name}</strong>
            <div>ICAO Class: ${icaoClass}</div>
            <div>Lower: ${lowerLimit}</div>
            <div>Upper: ${upperLimit}</div>
    `;
    
    if (code) {
        popupContent += `<div>Code: ${code}</div>`;
    }
    
    if (props.frequency) {
        popupContent += `<div>Frequency: ${props.frequency}</div>`;
    }
    
    // Fallback circle note
    if (props.isFallback && props.fallbackRadiusNM) {
        popupContent += `
            <div style="font-style: italic; color: #666;">
                Default radius ${props.fallbackRadiusNM} NM used. No matching airspace found.
            </div>
        `;
    }
    
    // SkyVector link
    if (code) {
        popupContent += `
            <div><a href="https://skyvector.com/airport/${code}" target="_blank">
                View on SkyVector
            </a></div>
        `;
    }
    
    popupContent += `</div>`;
    
    layer.bindPopup(popupContent);
}
```

**Format altitude function:**
```javascript
formatAltitudeWithDatum(value, unit, referenceDatum) {
    if (value == null || !isFinite(value)) return 'N/A';
    
    if (value === 0 && referenceDatum === 0) {
        return 'Ground/Surface';
    }
    
    let displayValue = value;
    let displayUnit = unit || 'FT';
    
    if (unit === 'M') {
        displayValue = Math.round(value);
        displayUnit = 'M';
    } else if (unit === 'FT') {
        displayValue = Math.round(value);
        displayUnit = 'FT';
    } else if (unit === 'FL') {
        displayValue = `FL${Math.round(value)}`;
        displayUnit = '';
    }
    
    // Add reference datum
    let datum = '';
    if (referenceDatum === 0) datum = ' GND';
    else if (referenceDatum === 1) datum = ' MSL';
    
    return `${displayValue} ${displayUnit}${datum}`.trim();
}
```

---

### 11. Add Features to Layer

```javascript
// After filtering
const filteredFeatures = featureArray.filter(f => this.filterAirspace(f));

// Deduplicate by ID
const uniqueFeatures = [];
const seenIds = new Set();

filteredFeatures.forEach(feature => {
    const id = feature.id || feature.properties?.id;
    if (id && !seenIds.has(id)) {
        seenIds.add(id);
        uniqueFeatures.push(feature);
    }
});

// Add to layer
if (uniqueFeatures.length > 0) {
    this.airspaceLayer.addData({
        type: 'FeatureCollection',
        features: uniqueFeatures
    });
}

// Cache the bbox
this.airspaceCache.set(bboxString, true);
```

**Key points:**
- `addData()` adds features incrementally (doesn't clear existing)
- Deduplicate to avoid showing same feature twice
- Cache prevents reloading same bbox

---

### 12. Toggle Layer On/Off

```javascript
toggleAirspace(enabled) {
    this.isAirspaceEnabled = enabled;
    
    if (enabled) {
        // Show acknowledgment modal first time
        if (!this.airspaceAcknowledged) {
            this.showAirspaceAcknowledgment();
            return;
        }
        
        // Add layer to map
        if (!this.map.hasLayer(this.airspaceLayer)) {
            this.airspaceLayer.addTo(this.map);
        }
        
        // Load data for current view
        this.loadAirspaceDataDebounced();
    } else {
        // Remove layer from map
        if (this.map.hasLayer(this.airspaceLayer)) {
            this.map.removeLayer(this.airspaceLayer);
        }
        // Clear cache
        this.airspaceCache.clear();
    }
}
```

---

### 13. Error Banner

```javascript
showProxyErrorMessage() {
    if (document.getElementById('airspaceProxyError')) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'airspaceProxyError';
    errorDiv.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(220, 53, 69, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        z-index: 2000;
    `;
    errorDiv.textContent = 'OpenAIP proxy server unreachable. Airspace layer disabled.';
    document.body.appendChild(errorDiv);
}

hideProxyErrorMessage() {
    const errorDiv = document.getElementById('airspaceProxyError');
    if (errorDiv) {
        errorDiv.remove();
    }
}
```

**Show banner when:**
- Network error (proxy unreachable)
- Airspace request fails (even if airports work)
- Hide banner when data loads successfully

---

## Key Concepts

### 1. Leaflet GeoJSON Layer
- Created with `L.geoJSON(null, options)` - start empty
- Add data with `layer.addData(featureCollection)`
- Style function called for each feature
- onEachFeature called to attach popups/events

### 2. Coordinate Systems
- **Leaflet**: `[lat, lng]` (latitude first!)
- **GeoJSON**: `[lon, lat]` (longitude first!)
- **OpenAIP**: `[lon, lat]` (matches GeoJSON)

### 3. Bounding Box Format
- **Leaflet bounds**: `{getWest(), getSouth(), getEast(), getNorth()}`
- **API format**: `"west,south,east,north"` (comma-separated string)
- Normalize: clamp lon to -180..180, lat to -90..90

### 4. Caching Strategy
- Cache key: bbox string (e.g., `"-123,48,-122,49"`)
- Cache value: `true` (just track if loaded)
- Check before fetch, set after successful load
- Clear cache when layer disabled

### 5. Debouncing
- Purpose: Limit API calls during rapid panning
- Implementation: setTimeout with 300ms delay
- Each new pan cancels previous timer
- Only final pan triggers actual fetch

### 6. Deduplication
- Track feature IDs in Set
- Skip features already seen
- Use feature.id or feature.properties.id

---

## Complete Infrastructure Checklist

Before starting implementation, ensure you have:

- [ ] **Node.js 18+ installed** - Check with `node --version`
- [ ] **Proxy server created** - File `openaip-proxy.js` exists
- [ ] **Proxy dependencies installed** - Run `npm install express cors`
- [ ] **Proxy server running** - `node openaip-proxy.js` on port 8081
- [ ] **Proxy health check works** - `curl http://localhost:8081/health` returns OK
- [ ] **API key in proxy** - Verify `OPENAIP_API_KEY = 'b0e3bef31f5e57bc6c642e5c4069a4b9'`
- [ ] **Frontend calls proxy** - Never calls OpenAIP API directly
- [ ] **Leaflet library loaded** - `<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`
- [ ] **Map initialized** - Have a working Leaflet map before adding airspace

## Simple Minimal Implementation

Here's the absolute simplest version (assumes proxy is running):

```javascript
// 1. Initialize layer
this.airspaceLayer = L.geoJSON(null, {
    style: (feature) => ({
        fillColor: '#0066cc',
        fillOpacity: 0.25,
        color: '#0066cc',
        weight: 2
    }),
    onEachFeature: (feature, layer) => {
        layer.bindPopup(feature.properties.name || 'Unknown');
    }
});

// 2. Load data
async function loadAirspace(bbox) {
    // IMPORTANT: Use proxy, NOT OpenAIP API directly
    const proxyUrl = 'http://localhost:8081';
    const url = `${proxyUrl}/openaip/airspaces?bbox=${bbox}`;
    
    // Verify proxy is running first
    try {
        const healthCheck = await fetch(`${proxyUrl}/health`);
        if (!healthCheck.ok) {
            console.error('Proxy server not responding!');
            return;
        }
    } catch (err) {
        console.error('Cannot reach proxy server! Make sure it\'s running on port 8081');
        return;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
        console.error(`Proxy error: ${response.status}`);
        return;
    }
    
    const data = await response.json();
    
    // Filter (simple version)
    const filtered = data.features.filter(f => {
        const props = f.properties;
        // Show Class F always, or if intersects 0-500ft
        if (props.icaoClass === 5) return true;
        const low = props.lowerLimitFt || 0;
        const high = props.upperLimitFt || Infinity;
        return high >= 0 && low <= 500;
    });
    
    // Add to layer
    this.airspaceLayer.addData({
        type: 'FeatureCollection',
        features: filtered
    });
}

// 3. Listen for map movement
map.on('moveend', () => {
    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    loadAirspace(bbox);
});
```

---

## Important Notes

1. **Always normalize bbox** - Longitude can wrap, latitude must be -90..90
2. **Handle multiple response formats** - OpenAIP may return GeoJSON or paginated format
3. **Convert altitude units** - Meters × 3.28084, FL × 100, Ground = 0
4. **Class F always shows** - Bypass all filters for ICAO class 5
5. **Use debouncing** - Don't fetch on every pixel of map movement
6. **Cache by bbox** - Prevent duplicate loads of same area
7. **Show error banner** - User needs feedback when proxy fails
8. **Clear layer on disable** - Don't leave stale data when toggled off

---

## Testing Checklist

- [ ] Layer appears when toggled on
- [ ] Data reloads when panning map
- [ ] Class F airspace shows (bypass altitude)
- [ ] Restricted/Danger airspace shows in red
- [ ] Popups show correct altitude with units
- [ ] Error banner appears when proxy down
- [ ] No duplicate features when panning same area
- [ ] Performance acceptable (debouncing works)

---

## UI Integration

### Base Map Widget Toggle

The airspace layer is toggled through a custom base map widget. Here's how to integrate:

**HTML Structure (in base map popup):**
```html
<div style="border-top: 1px solid #ddd; margin: 12px 0; padding-top: 12px;">
    <label style="display: block; margin: 6px 0; cursor: pointer;">
        <input type="checkbox" id="airspaceToggle" 
               style="margin-right: 8px;">
        Airspace
    </label>
</div>
```

**JavaScript Event Handler:**
```javascript
const airspaceToggle = document.querySelector('#airspaceToggle');
if (airspaceToggle) {
    airspaceToggle.addEventListener('change', (e) => {
        this.toggleAirspace(e.target.checked);
    });
}
```

**Toggle Function:**
```javascript
toggleAirspace(enabled) {
    this.isAirspaceEnabled = enabled;
    
    if (enabled) {
        // Show acknowledgment modal if first time
        if (!this.airspaceAcknowledged) {
            this.showAirspaceAcknowledgment();
            return; // Will enable after acknowledgment
        }
        
        // Add layer to map
        if (!this.map.hasLayer(this.airspaceLayer)) {
            this.airspaceLayer.addTo(this.map);
        }
        
        // Load data for current view
        this.loadAirspaceDataDebounced();
    } else {
        // Remove layer from map
        if (this.map.hasLayer(this.airspaceLayer)) {
            this.map.removeLayer(this.airspaceLayer);
        }
        // Clear cache
        this.airspaceCache.clear();
        this.airspaceFeatureIds.clear();
    }
}
```

### Acknowledgment Modal

Show disclaimer modal before first use:

```javascript
showAirspaceAcknowledgment() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 500px;
        margin: 20px;
    `;

    modalContent.innerHTML = `
        <h2>Airspace Data Disclaimer</h2>
        <p>The following airspace data is incomplete. This is an open source 
           airspace data provided by 
           <a href="https://www.openaip.net/" target="_blank">OpenAIP</a>.</p>
        <button id="airspaceAcknowledgeBtn">Acknowledge</button>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Handle acknowledge
    modalContent.querySelector('#airspaceAcknowledgeBtn')
        .addEventListener('click', () => {
            this.airspaceAcknowledged = true;
            document.body.removeChild(modal);
            
            // Enable layer
            if (!this.map.hasLayer(this.airspaceLayer)) {
                this.airspaceLayer.addTo(this.map);
            }
            this.loadAirspaceDataDebounced();
        });
}
```

### Error Banner Implementation

```javascript
showProxyErrorMessage() {
    if (document.getElementById('airspaceProxyError')) return;
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'airspaceProxyError';
    errorDiv.style.cssText = `
        position: fixed;
        top: 70px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(220, 53, 69, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    `;
    errorDiv.textContent = 'OpenAIP proxy server unreachable. Airspace layer disabled.';
    document.body.appendChild(errorDiv);
}

hideProxyErrorMessage() {
    const errorDiv = document.getElementById('airspaceProxyError');
    if (errorDiv) {
        errorDiv.remove();
    }
}
```

---

## Debugging Tips

1. **Check console logs** - Log bbox, feature counts, filter results
2. **Inspect feature properties** - Log first feature to verify field names
3. **Verify geometry** - Ensure coordinates are valid GeoJSON format
4. **Test filter logic** - Log before/after filter counts
5. **Check cache** - Log cache hits/misses
6. **Network tab** - Verify API calls and responses
7. **Verify proxy running** - Check `curl http://localhost:8081/health`
8. **Check API key** - Verify key is correct in proxy server
9. **Test direct API** - Use curl to test OpenAIP API directly (outside browser)
10. **Inspect response format** - Log raw response to see structure

### Common Issues and Solutions

**Issue: "Proxy unreachable" banner shows but proxy is running**
- Check proxy is actually listening on port 8081: `lsof -i :8081`
- Verify no firewall blocking localhost:8081
- Check browser console for CORS errors

**Issue: No airspace showing**
- Check filter logic - verify features are passing filter
- Log filtered feature count
- Check if features have valid geometry
- Verify bbox is correct (not too large/small)

**Issue: Class F not showing**
- Verify `icaoClassNumeric === 5` check is first in filter
- Log feature properties to see actual ICAO class values
- Check if Class F features are in response at all

**Issue: Duplicate features**
- Ensure deduplication by ID is working
- Check cache isn't adding same features multiple times
- Verify feature.id is stable

**Issue: Performance problems**
- Increase debounce delay (300ms → 500ms)
- Limit bbox size (clamp to reasonable range)
- Reduce feature count in view (zoom in)
- Check if too many features being rendered

---

## Complete File Structure

```
project/
├── openaip-proxy.js          # Proxy server (Node.js)
├── package.json               # Proxy dependencies
├── js/
│   └── livestream/
│       └── map.js            # Map class with airspace layer
└── livestream.html           # HTML with Leaflet includes
```

---

## Quick Reference: All Critical Values

### API Configuration
```
OpenAIP Base URL: https://api.core.openaip.net/api
API Key: b0e3bef31f5e57bc6c642e5c4069a4b9
Proxy URL: http://localhost:8081
Proxy Port: 8081
```

### Endpoints
```
Proxy Airspaces: http://localhost:8081/openaip/airspaces?bbox={bbox}
Proxy Airports:  http://localhost:8081/openaip/airports?bbox={bbox}
Health Check:    http://localhost:8081/health
```

### Leaflet Configuration
```
Library: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
CSS:     https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
Pane:    'polygonPane' (z-index: 400)
```

### Filter Rules
```
Class F: Always show (bypass altitude)
Restricted/Prohibited/Danger: Show if intersects 0-500 ft
CTR/ATZ/HTZ: Show if intersects 0-500 ft
Class B/C/D/E: Show if intersects 0-500 ft
Altitude intersection: highFt >= 0 AND lowFt <= 500
```

### Styling
```
Red (#dc3545):   Restricted/Prohibited/Danger
Yellow (#ffc107): Unknown radius (fallback circles)
Blue (#0066cc):  Everything else
Fill Opacity:    0.25 (25%)
Outline Opacity: 0.9 (90%)
Outline Weight:  2px
```

### Timing
```
Debounce delay: 300ms
Cache: By bbox string
Map event: 'moveend'
```

---

End of Guide

