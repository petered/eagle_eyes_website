// Global constants
const POLYGON_FILL_OPACITY = 0.05;

class DroneMap {
    constructor() {
        this.map = null;
        this.droneMarker = null;
        this.droneClickMarker = null;
        this.otherDroneMarkers = {}; // Map of droneId -> { marker, telemetryData }
        this.trailPolyline = null;
        this.geojsonLayer = null;
        this.currentLocation = null;
        this.trailCoordinates = [];
        this.caltopoInfo = null;
        
        // Caltopo layer toggle state
        this.isCaltopoLayerEnabled = true; // Default to enabled when present
        this.isCaltopoFoldersExpanded = false; // Whether folder sub-bullets are visible
        this.caltopoFolders = {}; // { folderName: { enabled: true, expanded: false, featureIds: [], features: {} } }
        this.caltopoFeatureToFolder = new Map(); // featureId -> folder name
        this.caltopoFeatureStates = new Map(); // featureId -> { enabled: true, name: string }
        this.latestGeojsonPayload = null; // Store latest GeoJSON payload for manual refreshes
        
        this.staleDataOverlay = null;
        this.isDataStale = false;
        this.gpsSignalOverlay = null;
        this.isGpsSignalLost = false;
        this.gpsSignalLossTimer = null;
        this.gpsSignalRestoreTimer = null;
        this.gpsSignalLossDelayMs = 4500; // Delay before showing "No GPS signal" banner
        this.gpsSignalRestoreDelayMs = 1500; // Delay before hiding after signal returns
        this.disconnectedOverlay = null;
        this.isDisconnected = false;
        this.currentDroneData = null;
        this.currentDroneName = null;
        this.currentLivestreamId = null; // Current drone's livestream ID
        this.lastDroneUpdate = null; // Timestamp of last drone data update
        this.lastDroneTelemetryTimestamp = null; // Numeric timestamp from telemetry (ms)
        this.droneMapCenteringState = 'OFF'; // 'CONTINUOUS' or 'OFF'
        this.dronePopupRelativeTimer = null; // Interval for updating "Last Updated" relative text
        
        // OpenAIP Airspace layer
        this.airspaceLayer = null;
        this.isAirspaceEnabled = false;
        this.airspaceAcknowledged = false;
        this.airspaceCache = new Map(); // Cache by bbox string
        this.airspaceDebounceTimer = null;
        this.airspaceFeatureIds = new Set(); // For deduplication by stable id
        this.airspaceProxyError = false; // Track if proxy is unreachable
        this.airspaceLoading = false; // Track if airspace is currently loading
        
        // Country to airspace authority URL mapping
        this.airspaceAuthorityUrls = {
            'CA': 'https://nrc.canada.ca/en/drone-tool-2/index.html', // Canada - DSST-2
            'US': 'https://faa.maps.arcgis.com/apps/webappviewer/index.html?id=9c2e4406710048e19806ebf6a06754ad', // USA - FAA UAS Facility Maps
            'GB': 'https://dronesafetymap.com/', // UK - NATS Drone Assist
            'AU': 'https://spatial.infrastructure.gov.au/portal/apps/experiencebuilder/experience/?id=5e871e08e09849308677bf4b9f45ccd9', // Australia - CASA AvSoft RPAS Maps
            'NZ': 'https://pilot.airshare-utm.io/info', // New Zealand - AirShare NZ
            // European countries (EASA Drone Zones)
            'AT': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Austria
            'BE': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Belgium
            'BG': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Bulgaria
            'HR': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Croatia
            'CY': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Cyprus
            'CZ': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Czech Republic
            'DK': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Denmark
            'EE': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Estonia
            'FI': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Finland
            'FR': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // France
            'DE': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Germany
            'GR': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Greece
            'HU': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Hungary
            'IE': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Ireland
            'IT': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Italy
            'LV': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Latvia
            'LT': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Lithuania
            'LU': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Luxembourg
            'MT': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Malta
            'NL': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Netherlands
            'PL': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Poland
            'PT': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Portugal
            'RO': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Romania
            'SK': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Slovakia
            'SI': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Slovenia
            'ES': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Spain
            'SE': 'https://www.easa.europa.eu/en/domains/civil-drones/naa', // Sweden
        };
        
        // OpenAIPAirspace (At Ground) layer (Class F airways and drone-relevant airspace)
        this.droneAirspaceLayer = null;
        this.isDroneAirspaceEnabled = false; // Disabled by default
        this.droneAirspaceAcknowledged = false; // Track acknowledgment for drone airspace
        this.isAirspaceAllExpanded = false; // Track if "Airspace (All)" sub-bullet is expanded
        this.droneAirspaceCache = new Map(); // Cache by bbox string
        this.droneAirspaceDebounceTimer = null;
        this.droneAirspaceFeatureIds = new Set(); // For deduplication by stable id
        this.droneAirspaceLoading = false; // Track if drone airspace is currently loading
        
        // Multi-hit popup state
        this.multiHitPopup = null; // Current multi-hit popup instance
        this.multiHitFeatures = []; // Array of features at click point
        this.multiHitCurrentIndex = 0; // Current feature index in pager
        this.multiHitOriginalLatLng = null; // Original click location to keep popup anchored
        this.highlightedAirspaceLayer = null; // Currently highlighted airspace layer
        
        // OpenSky ADS-B layer
        this.openSkyMarkerCluster = null;
        this.isOpenSkyEnabled = false;
        this.openSkyAcknowledged = false;
        this.openSkyUpdateInterval = null;
        this.openSkyAircraftData = new Map(); // icao24 -> aircraft data
        this.openSkyAircraftMarkers = new Map(); // icao24 -> marker
        this.openSkyAircraftTrails = new Map(); // icao24 -> { polyline, positions: [{lat, lng, timestamp}] }
        this.openSkyAircraftTracks = new Map(); // icao24 -> { polyline, isVisible: boolean }
        this.openSkyLoading = false;
        
        // OpenSky credits tracking
        this.openSkyCreditsUsed = 0;
        this.openSkyCreditsResetTime = Date.now();
        this.openSkyCreditsCounter = null; // DOM element for credits display
        
        // OpenAIP Airports/Heliports layer
        this.airportsLayer = null;
        this.airportsMarkerCluster = null;
        this.isAirportsEnabled = false;
        this.airportsAcknowledged = false; // Track acknowledgment for airports
        this.airportsCache = new Map(); // Cache by bbox string
        this.airportsDebounceTimer = null;
        this.airportsFeatureIds = new Set(); // For deduplication by _id
        this.airportsIndex = new Map(); // Index airports by name and ICAO for lookup
        
        // My location tracking
        this.myLocationMarker = null;
        this.myLocationCircle = null;
        this.watchId = null;
        
        // Airport radius circles
        this.airportRadiusCircles = [];
        this.isMyLocationVisible = false;
        
        // USA FAA Airspace layer
        this.faaAirspaceLayer = null;
        this.isFAAAirspaceEnabled = false;
        
        // USA FAA UAS Map layer
        this.faaUASMapLayer = null;
        this.isFAAUASMapEnabled = false;
        
        // Runways layer
        this.runwaysLayer = null;
        this.isRunwaysEnabled = false;
        
        // USA FAA Airports layer
        this.faaAirportsLayer = null;
        this.isFAAAirportsEnabled = false;
        
        this.faaLayersAcknowledged = {
            'runways': false,
            'uas': false,
            'airspace': false,
            'airports': false
        }; // Track acknowledgment for each USA FAA layer separately
        
        // Track loading state for each layer type
        this.layerLoadingStates = {
            'airspace': false,
            'droneAirspace': false,
            'faaAirports': false,
            'faaRunways': false,
            'faaUASMap': false,
            'faaAirspace': false
        };
        
        // Track whether airports was enabled before airspace layers were turned on
        // This helps us decide whether to auto-disable airports when airspace is turned off
        this.airportsWasEnabledBeforeAirspace = false;
        this.airportsWasEnabledBeforeDroneAirspace = false;
        this.myLocationAccuracy = null;
        this.isAutoLocationRequest = false; // Track if this is automatic initialization
        this.hasZoomedToUserLocation = false; // Track if we've already zoomed to user location
        this.baseMapPopupResizeHandler = null;
        
        // Measurement tool state
        this.measurementMode = false;
        this.measurementType = 'line'; // 'line', 'polygon', or 'radius'
        this.measurementPoints = [];
        this.measurementMarkers = [];
        this.measurementPolylines = [];
        this.measurementPolygon = null; // For polygon mode
        this.measurementRadiusCircle = null; // For radius mode
        this.measurementRadiusCenter = null; // For radius mode
        this.measurementRadius = 0; // Radius in meters
        this.measurementPopup = null;
        this.measurementUnit = 'NM'; // Default: Nautical Miles (for line mode)
        this.measurementAreaUnit = 'NM²'; // Default: Nautical Miles squared (for polygon mode)
        this.measurementTotalDistance = 0;
        this.measurementArea = 0; // Area in square meters
        this.isDraggingRadius = false; // Track if user is dragging to set radius
        this.measurementPopupResizeHandler = null;
        this.popupTouchActiveCount = 0;
        this.mapDraggingWasEnabledBeforePopup = null;
        
        // User-added coordinate markers (array to support multiple markers)
        this.coordinateMarkers = []; // Array of { marker, latlng, number }
        this.coordinateMarkerCounter = 0; // Counter for numbering markers

        // North arrow control
        this.northArrowMode = 'north'; // 'north' or 'user-facing'
        this.userHeading = null;
        this.northArrowControl = null;
        
        // Full screen control
        this.isFullscreen = false;
        this.fullscreenButton = null;
        this.fullscreenButtonExpandIcon = null;
        this.fullscreenButtonCloseIcon = null;
        
        // Beta disclaimer tracking
        this.hasShownBetaDisclaimer = false;
        this.betaDisclaimerStorageKey = 'ee_beta_disclaimer_ack_v1';
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const acknowledged = window.localStorage.getItem(this.betaDisclaimerStorageKey);
                if (acknowledged === 'true') {
                    this.hasShownBetaDisclaimer = true;
                }
            }
        } catch (error) {
            console.warn('Unable to access localStorage for beta disclaimer state:', error);
        }
        this.originalNavbarDisplay = null; // Store original navbar display value

        this.defaultCenter = [45.0, -100.0];
        this.defaultZoom = 3;

        this.init();
    }

    // Helper function to get the correct base path for assets
    getAssetPath(path) {
        // Get the current pathname and determine if we're on staging
        const currentPath = window.location.pathname;
        if (currentPath.includes('/eagle_eyes_website_staging/')) {
            return '/eagle_eyes_website_staging' + path;
        }
        return path;
    }

    init() {
        try {
            // Check if map container exists
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                console.error('Map container with id "map" not found');
                this.fallbackToStaticMap();
                return;
            }

            // Ensure map panel is visible for initialization
            const mapPanel = document.getElementById('map-panel');
            if (mapPanel) {
                const originalDisplay = mapPanel.style.display;
                mapPanel.style.display = 'flex';
                console.log('Made map panel visible for initialization');
                
                // Restore original display after a short delay
                setTimeout(() => {
                    if (originalDisplay) {
                        mapPanel.style.display = originalDisplay;
                    }
                }, 100);
            }

            console.log('Initializing map on container:', mapContainer);
            
            this.map = L.map('map', {
                tap: false,  // Fix for iOS Safari popup issues
                zoomControl: false,
                attributionControl: true
            }).setView(this.defaultCenter, this.defaultZoom);

            // Create custom panes for proper z-index ordering
            // Polygons should be below markers so markers are always clickable
            this.map.createPane('polygonPane');
            this.map.getPane('polygonPane').style.zIndex = 400; // Below markerPane (600)

            this.map.createPane('droneMarkerPane');
            this.map.getPane('droneMarkerPane').style.zIndex = 650; // Above markerPane and polygons

            // Create high-quality base map layers
            // Default basemap: Google Satellite
            const satelliteLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                maxZoom: 25,
                maxNativeZoom: 20,
                attribution: '© Google'
            });

            const satelliteLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 25,
                maxNativeZoom: 19,
                attribution: '© Esri, Maxar, Earthstar Geographics'
            });

            const googleHybridLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 25,
                maxNativeZoom: 20,
                attribution: '© Google'
            });

            const terrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 25,
                maxNativeZoom: 19,
                attribution: '© Esri, DeLorme, NAVTEQ'
            });

            const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 25,
                maxNativeZoom: 19,
                attribution: '© OpenStreetMap contributors'
            });

            // Additional basemaps
            const esriWorldImageryLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 25,
                maxNativeZoom: 19,
                attribution: '© Esri, Maxar, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community'
            });

            const esriWorldTopoLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 25,
                maxNativeZoom: 19,
                attribution: '© Esri, DeLorme, NAVTEQ'
            });

            const openTopoMapLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                maxZoom: 25,
                maxNativeZoom: 17,
                attribution: '© OpenTopoMap contributors, © OpenStreetMap contributors'
            });

            const cartoLightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 25,
                maxNativeZoom: 20,
                attribution: '© OpenStreetMap contributors, © CARTO'
            });

            const cartoDarkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 25,
                maxNativeZoom: 20,
                attribution: '© OpenStreetMap contributors, © CARTO'
            });

            const cyclOSMLayer = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
                maxZoom: 25,
                maxNativeZoom: 20,
                attribution: '© OpenStreetMap contributors, CyclOSM'
            });

            const usgsTopoLayer = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 25,
                maxNativeZoom: 16,
                attribution: '© USGS'
            });

            const humanitarianOSMLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 25,
                maxNativeZoom: 19,
                attribution: '© OpenStreetMap contributors, Humanitarian OSM'
            });

            // Add default satellite layer
            satelliteLayer.addTo(this.map);

            // Store base map layers
            // Default basemap (shown at top)
            this.defaultBaseMap = "Google Satellite";
            
            // Other basemaps (shown in dropdown)
            this.otherBaseMaps = {
                "Google Hybrid": googleHybridLayer,
                "Esri World Imagery": esriWorldImageryLayer,
                "Esri World Topo": esriWorldTopoLayer,
                "OpenStreetMap": streetLayer,
                "OpenTopoMap": openTopoMapLayer,
                "Carto Light": cartoLightLayer,
                "Carto Dark": cartoDarkLayer,
                "CyclOSM": cyclOSMLayer,
                "USGS Topo": usgsTopoLayer,
                "Humanitarian OSM": humanitarianOSMLayer
            };
            
            // Combine all basemaps for easy switching
            this.baseMaps = {
                "Google Satellite": satelliteLayer,
                ...this.otherBaseMaps
            };
            
            this.currentBaseMap = "Google Satellite";
            
            console.log('Base maps stored:', this.baseMaps);

            this.trailPolyline = L.polyline([], {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.8,
                pane: 'polygonPane'  // Use polygon pane for trail
            }).addTo(this.map);

            this.geojsonLayer = L.geoJSON(null, {
                pane: 'polygonPane',  // Use polygon pane for GeoJSON features
                style: {
                    fillColor: '#f59e0b',
                    fillOpacity: POLYGON_FILL_OPACITY,
                    color: '#f59e0b',
                    weight: 2
                }
            }).addTo(this.map);

                // Initialize USA FAA layers
                if (typeof L.esri !== 'undefined' && L.esri.featureLayer) {
                // Initialize USA FAA Airports layer
                this.faaAirportsLayer = L.esri.featureLayer({
                    url: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/arcgis/rest/services/US_Airport/FeatureServer/0',
                    pointToLayer: (feature, latlng) => {
                        // Create red airport marker (matching other airport markers)
                        return L.circleMarker(latlng, {
                            radius: 8,
                            fillColor: '#dc3545',
                            color: '#ffffff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        if (feature.properties) {
                            const props = feature.properties;
                            const name = props.NAME || props.name || 'Unnamed';
                            const ident = props.IDENT || props.ident || '';
                            const icaoId = props.ICAO_ID || props.icao_id || '';
                            const elevation = props.ELEVATION !== undefined ? props.ELEVATION : null;
                            const typeCode = props.TYPE_CODE || props.type_code || '';
                            const state = props.STATE || props.state || '';
                            const city = props.SERVCITY || props.servcity || '';
                            
                            // Create unique feature ID
                            const featureId = `faa-airport-${props.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                            
                            // Format elevation display
                            let elevationDisplay = 'N/A';
                            if (elevation !== null && elevation !== undefined) {
                                elevationDisplay = `${Math.round(elevation)} ft MSL`;
                            }
                            
                            // Build popup content with eye button for raw properties
                            const popupContent = `
                                <div style="min-width: 200px;">
                                    <div style="margin-bottom: 8px;">
                                        <strong>${name}</strong>
                                    </div>
                                    ${ident ? `<div style="margin-bottom: 4px; font-size: 12px;"><strong>IDENT:</strong> ${ident}</div>` : ''}
                                    ${icaoId ? `<div style="margin-bottom: 4px; font-size: 12px;"><strong>ICAO:</strong> ${icaoId}</div>` : ''}
                                    ${elevationDisplay !== 'N/A' ? `<div style="margin-bottom: 4px; font-size: 12px;"><strong>Elevation:</strong> ${elevationDisplay}</div>` : ''}
                                    ${typeCode ? `<div style="margin-bottom: 4px; font-size: 12px;"><strong>Type:</strong> ${typeCode}</div>` : ''}
                                    ${city && state ? `<div style="margin-bottom: 4px; font-size: 12px;"><strong>Location:</strong> ${city}, ${state}</div>` : ''}
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                                        <button onclick="event.stopPropagation(); window.droneMap.toggleRawProperties('${featureId}'); return false;" 
                                                style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; pointer-events: auto;">
                                            i
                                        </button>
                                        <pre id="${featureId}" style="display: none; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 10px; max-height: 300px; overflow-y: auto;">${JSON.stringify(props, null, 2)}</pre>
                                    </div>
                                </div>
                            `;
                            
                            layer.bindPopup(popupContent);
                            
                            // Store feature reference for multi-hit system
                            layer.feature = feature;
                            layer.faaLayerType = 'airports';
                        }
                    }
                });
                
                // Add loading event handlers for FAA Airports layer
                this.faaAirportsLayer.on('loading', () => {
                    this.layerLoadingStates.faaAirports = true;
                    this.showLoadingMessage('faaAirports');
                });
                this.faaAirportsLayer.on('load', () => {
                    this.layerLoadingStates.faaAirports = false;
                    this.hideLoadingMessage('faaAirports');
                });
                
                // Initialize USA FAA Airspace layer (filtered by VERTLIMITS_TXT containing "surface" or "SFC" OR (VERTLIMITS_TXT is null AND DISTVERTLOWER_VAL = 0), CLASS_CODE is not null, and CLASS_CODE is not "A" or "G")
                this.faaAirspaceLayer = L.esri.featureLayer({
                    url: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/Airspace/FeatureServer/0',
                    where: "(VERTLIMITS_TXT LIKE '%SURFACE%' OR VERTLIMITS_TXT LIKE '%SFC%' OR (VERTLIMITS_TXT IS NULL AND DISTVERTLOWER_VAL = 0)) AND CLASS_CODE IS NOT NULL AND CLASS_CODE <> 'A' AND CLASS_CODE <> 'G'",
                    style: (feature) => {
                        const props = feature.properties || {};
                        const classCode = props.CLASS_CODE || props.class_code || '';
                        const color = this.getFAAAirspaceClassCodeColor(classCode);
                        const codeUpper = String(classCode).toUpperCase().trim();
                        
                        // Class D should have dashed blue lines
                        const dashArray = (codeUpper === 'D') ? '5, 5' : null;
                        
                        return {
                            color: color,
                            weight: 1,
                            fillOpacity: 0.2,
                            fillColor: color,
                            dashArray: dashArray
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        if (feature.properties) {
                            const props = feature.properties;
                            const name = props.NAME_TXT || props.name_txt || props.NAME || props.name || 'Unnamed';
                            const classCode = props.CLASS_CODE || props.class_code || props.CLASS || props.class || 'Unknown';
                            const icaoTxt = props.ICAO_TXT || props.icao_txt || '';
                            const milCode = props.MIL_CODE || props.mil_code || '';
                            const vertLimitsTxt = props.VERTLIMITS_TXT || props.VERT_LIMITS_TXT || props.vert_limits_txt || '';
                            const distVertLowerVal = props.DISTVERTLOWER_VAL !== undefined ? props.DISTVERTLOWER_VAL : (props.distvertlower_val !== undefined ? props.distvertlower_val : null);
                            const distVertLowerCode = props.DISTVERTLOWER_CODE || props.distvertlower_code || '';
                            const distVertUpperVal = props.DISTVERTUPPER_VAL !== undefined ? props.DISTVERTUPPER_VAL : (props.distvertupper_val !== undefined ? props.distvertupper_val : null);
                            const distVertUpperCode = props.DISTVERTUPPER_CODE || props.distvertupper_code || '';
                            
                            // Create unique feature ID
                            const featureId = `faa-${props.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                            
                            // Format altitude display - use DISTVERTLOWER_VAL for lower (just the value)
                            let lowerDisplay = 'N/A';
                            if (distVertLowerVal !== null && distVertLowerVal !== undefined) {
                                lowerDisplay = `${distVertLowerVal}`;
                            }
                            
                            // Format altitude display - use DISTVERTUPPER_VAL for upper
                            let upperDisplay = 'N/A';
                            if (distVertUpperVal !== null && distVertUpperVal !== undefined) {
                                const upperCode = distVertUpperCode || 'FT';
                                upperDisplay = `${distVertUpperVal} ${upperCode}`;
                            }
                            
                            // Build popup content with eye button for raw properties (narrow popup)
                            const popupContent = `
                                <div style="min-width: 140px; max-width: 160px;">
                                    <div style="margin-bottom: 6px;">
                                        <strong style="font-size: 12px;">${name}</strong>
                                        ${icaoTxt ? `<br><span style="font-size: 10px; color: #666;">ICAO: ${icaoTxt}</span>` : ''}
                                        <br><span style="font-size: 11px; color: #666;">Class: ${classCode}</span>
                                        ${milCode ? `<br><span style="font-size: 10px; color: #666;">${milCode}</span>` : ''}
                                    </div>
                                    ${vertLimitsTxt ? `<div style="margin-bottom: 6px; font-size: 10px; color: #666; font-style: italic;">${vertLimitsTxt}</div>` : ''}
                                    <div style="margin-bottom: 6px; font-size: 10px; line-height: 1.3;">
                                        <div><strong>Lower:</strong> ${lowerDisplay}</div>
                                        <div><strong>Upper:</strong> ${upperDisplay}</div>
                                    </div>
                                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                                        <button onclick="event.stopPropagation(); window.droneMap.toggleRawProperties('${featureId}'); return false;" 
                                                style="background: #6c757d; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px; pointer-events: auto;">
                                            i
                                        </button>
                                        <pre id="${featureId}" style="display: none; margin-top: 6px; padding: 6px; background: #f5f5f5; border-radius: 3px; overflow-x: auto; font-size: 9px; max-height: 200px; overflow-y: auto;">${JSON.stringify(props, null, 2)}</pre>
                                    </div>
                                </div>
                            `;
                            
                            layer.bindPopup(popupContent);
                            
                            // Store feature reference for multi-hit system
                            layer.feature = feature;
                            layer.faaLayerType = 'airspace';
                        }
                    }
                });
                
                // Add loading event handlers for FAA Airspace layer
                this.faaAirspaceLayer.on('loading', () => {
                    this.layerLoadingStates.faaAirspace = true;
                    this.showLoadingMessage('faaAirspace');
                });
                this.faaAirspaceLayer.on('load', () => {
                    this.layerLoadingStates.faaAirspace = false;
                    this.hideLoadingMessage('faaAirspace');
                });
                
                // Initialize Runways layer
                this.runwaysLayer = L.esri.featureLayer({
                    url: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/RunwayArea/FeatureServer/0',
                    style: function(feature) {
                        return {
                            color: '#0066cc',
                            weight: 2,
                            fillOpacity: 0.2
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        if (feature.properties) {
                            // Create unique feature ID
                            const featureId = `runway-${feature.properties.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                            
                            // Build popup content with eye button for raw properties
                            const props = feature.properties;
                            const name = props.name || props.NAME || props.Runway || 'Runway Area';
                            const popupContent = `
                                <div style="min-width: 200px;">
                                    <div style="margin-bottom: 8px;">
                                        <strong>${name}</strong>
                                    </div>
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                                        <button onclick="event.stopPropagation(); window.droneMap.toggleRawProperties('${featureId}'); return false;" 
                                                style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; pointer-events: auto;">
                                            i
                                        </button>
                                        <pre id="${featureId}" style="display: none; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 10px; max-height: 300px; overflow-y: auto;">${JSON.stringify(props, null, 2)}</pre>
                                    </div>
                                </div>
                            `;
                            
                            layer.bindPopup(popupContent);
                            
                            // Store feature reference for multi-hit system
                            layer.feature = feature;
                            layer.faaLayerType = 'runways';
                        }
                    }
                });
                
                // Add loading event handlers for Runways layer
                this.runwaysLayer.on('loading', () => {
                    this.layerLoadingStates.faaRunways = true;
                    this.showLoadingMessage('faaRunways');
                });
                this.runwaysLayer.on('load', () => {
                    this.layerLoadingStates.faaRunways = false;
                    this.hideLoadingMessage('faaRunways');
                });
                
                // Initialize USA FAA UAS Map layer
                this.faaUASMapLayer = L.esri.featureLayer({
                    url: 'https://services6.arcgis.com/ssFJjBXIUyZDrSYZ/ArcGIS/rest/services/FAA_UAS_FacilityMap_Data/FeatureServer/0',
                    style: function(feature) {
                        return {
                            color: '#ff8800',
                            weight: 1,
                            fillOpacity: 0.15
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        if (feature.properties) {
                            // Create unique feature ID
                            const featureId = `faauas-${feature.properties.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                            
                            // Build popup content with eye button for raw properties
                            const props = feature.properties;
                            const name = props.name || props.NAME || props.Facility || 'UAS Facility Area';
                            const popupContent = `
                                <div style="min-width: 200px;">
                                    <div style="margin-bottom: 8px;">
                                        <strong>${name}</strong>
                                    </div>
                                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                                        <button onclick="event.stopPropagation(); window.droneMap.toggleRawProperties('${featureId}'); return false;" 
                                                style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; pointer-events: auto;">
                                            i
                                        </button>
                                        <pre id="${featureId}" style="display: none; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 10px; max-height: 300px; overflow-y: auto;">${JSON.stringify(props, null, 2)}</pre>
                                    </div>
                                </div>
                            `;
                            
                            layer.bindPopup(popupContent);
                            
                            // Store feature reference for multi-hit system
                            layer.feature = feature;
                            layer.faaLayerType = 'uas';
                        }
                    }
                });
                
                // Add loading event handlers for FAA UAS Map layer
                this.faaUASMapLayer.on('loading', () => {
                    this.layerLoadingStates.faaUASMap = true;
                    this.showLoadingMessage('faaUASMap');
                });
                this.faaUASMapLayer.on('load', () => {
                    this.layerLoadingStates.faaUASMap = false;
                    this.hideLoadingMessage('faaUASMap');
                });
            } else {
                console.warn('Esri Leaflet not loaded. FAA Airspace, FAA UAS Map, and Runways layers will not be available.');
            }

            this.addCustomControls();

            // Add scale bar (shifted right to make room for north arrow)
            this.scaleControl = L.control.scale({
                position: 'bottomleft',
                metric: true,
                imperial: true,
                maxWidth: 150
            }).addTo(this.map);

            // Add north arrow control
            this.addNorthArrowControl();
            
            // Add full screen control
            this.initFullscreenButton();
            
            console.log('Scale control added:', this.scaleControl);

            // Add long-press functionality for coordinate marker
            this.addLongPressHandler();

            // Add drag event listener to disable continuous centering when user pans
            this.map.on('dragstart', () => {
                if (this.droneMapCenteringState === 'CONTINUOUS') {
                    this.droneMapCenteringState = 'OFF';
                    console.log('Map centering disabled due to user drag');
                    this.updateRecenterButtonStyle();
                }
            });
            
            // Add zoom event listener to disable continuous centering when user zooms
            this.map.on('zoomstart', () => {
                if (this.droneMapCenteringState === 'CONTINUOUS') {
                    this.droneMapCenteringState = 'OFF';
                    console.log('Map centering disabled due to user zoom');
                    this.updateRecenterButtonStyle();
                }
            });
            
            // Add map move event listener for airspace auto-loading
            this.map.on('moveend', () => {
                if (this.isAirspaceEnabled) {
                    this.loadAirspaceDataDebounced();
                }
                if (this.isDroneAirspaceEnabled) {
                    this.loadDroneAirspaceDataDebounced();
                }
                // Don't close popup on map move - let user keep viewing selected feature
            });
            
            // Don't close popup on zoom - let user keep viewing selected feature
            
            // Add click handler for multi-hit popups
            this.map.on('click', (e) => {
                console.log('MAP CLICK EVENT FIRED - calling handleMapClick');
                this.handleMapClick(e);
            });
            
            // Handle double-click for completing polygon
            this.map.on('dblclick', (e) => {
                if (this.measurementMode && this.measurementType === 'polygon') {
                    this.completePolygon();
                }
            });
            
            // Initial load if layers are enabled
            if (this.isDroneAirspaceEnabled) {
                this.loadDroneAirspaceDataDebounced();
            }
            if (this.isAirspaceEnabled) {
                this.loadAirspaceDataDebounced();
            }
            
            // Note: Manual map rotation removed as it breaks Leaflet's coordinate system
            
            // Add fullscreen change event listeners
            this.addFullscreenEventListeners();

            console.log('Drone map initialized with Leaflet');
            console.log('toggleMyLocation method available:', typeof this.toggleMyLocation === 'function');
            
            // Automatically start location tracking on page load
            // This will try to center on user's location, with fallback to default view
            setTimeout(() => {
                this.isAutoLocationRequest = true;
                this.startLocationTracking();
            }, 500); // Small delay to ensure map is fully initialized

        } catch (error) {
            console.error('Error initializing map:', error);
            this.fallbackToStaticMap();
        }
    }
    addCustomControls() {
        // Add center on drone control first (top left)
        const centerControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.style.marginTop = '10px';
                container.style.marginLeft = '10px';
                container.style.marginBottom = '0px';
                container.style.width = '40px';
                container.style.height = '40px';
                
                const button = L.DomUtil.create('a', 'leaflet-control-center', container);
                button.innerHTML = `<img src="${this.getAssetPath('/images/livestream/map_drone_flyer.png')}" style="width: 20px; height: 20px; display: block; margin: auto;">`;
                button.href = '#';
                button.role = 'button';
                button.title = 'Center on Drone';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.width = '100%';
                button.style.height = '100%';

                // Store reference to button for later styling updates
                this.recenterButton = button;

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                          .on(button, 'click', this.centerOnDrone, this);

                return container;
            }
        });
        this.map.addControl(new centerControl());
        
        // Add custom base map switching control second (right below center control)
        this.addBaseMapControl();
        
        // Add measurement control third (below basemap control)
        this.addMeasurementControl();
    }
    
    addMeasurementControl() {
        const MeasurementControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                // Position ruler widget all the way to the left, same row
                container.style.marginTop = '10px'; // Same as other widgets
                container.style.marginLeft = '10px'; // All the way to the left
                container.style.marginBottom = '0px';
                container.style.width = '40px';
                container.style.height = '40px';
                
                const button = L.DomUtil.create('a', 'leaflet-control-measurement', container);
                
                // Use ruler.png image - same 20x20 size as drone icon
                button.innerHTML = `<img src="${this.getAssetPath('/images/livestream/ruler.png')}" style="width: 20px; height: 20px; display: block; margin: auto;">`;
                
                button.href = '#';
                button.role = 'button';
                button.title = 'Measure Distance';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.width = '100%';
                button.style.height = '100%';

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                          .on(button, 'click', () => {
                              window.droneMap.showMeasurementPopup();
                          }, this);

                return container;
            }
        });
        this.map.addControl(new MeasurementControl());
    }
    
    addBaseMapControl() {
        const BaseMapControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                // Position basemap widget all the way to the left, same as center on drone widget
                container.style.marginTop = '10px'; // Same as center on drone widget
                container.style.marginLeft = '10px'; // All the way to the left, same as center on drone widget
                container.style.marginBottom = '0px';
                container.style.width = '40px';
                container.style.height = '40px';
                
                const button = L.DomUtil.create('a', 'leaflet-control-basemap', container);
                
                // Create layers icon using image
                button.innerHTML = `<img src="${this.getAssetPath('/images/Map Layers (1).png')}" style="width: 20px; height: 20px; display: block; margin: auto;">`;
                
                button.href = '#';
                button.role = 'button';
                button.title = 'Base Maps';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.width = '100%';
                button.style.height = '100%';

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                          .on(button, 'click', () => {
                              window.droneMap.showBaseMapPopup();
                          }, this);

                return container;
            }
        });
        this.map.addControl(new BaseMapControl());
    }

    updateRecenterButtonStyle() {
        if (!this.recenterButton) return;

        if (this.droneMapCenteringState === 'CONTINUOUS') {
            // Active state: add prominent blue outline with glow effect
            this.recenterButton.style.outline = '3px solid #3b82f6';
            this.recenterButton.style.outlineOffset = '0px';
            this.recenterButton.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.2), 0 4px 8px rgba(59, 130, 246, 0.3)';
            this.recenterButton.title = 'Continuous Centering Active (click to disable)';
        } else {
            // Inactive state: remove outline and shadow
            this.recenterButton.style.outline = 'none';
            this.recenterButton.style.boxShadow = 'none';
            this.recenterButton.title = 'Center on Drone';
        }
    }
    showBaseMapPopup() {
        // Remove existing popup if it exists
        if (this.baseMapPopup) {
            this.closeBaseMapPopup();
        }
        
        // Create a custom DOM popup instead of using Leaflet popup
        const mapContainer = this.map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Create popup element
        this.baseMapPopup = document.createElement('div');
        this.baseMapPopup.className = 'basemap-popup';
        
        // Determine if "Other Basemaps" dropdown should be open
        const isOtherBasemapsOpen = Object.keys(this.otherBaseMaps).includes(this.currentBaseMap);
        
        this.baseMapPopup.innerHTML = `
            <div class="basemap-popup__content">
            <div class="basemap-popup__header">
                <span>Base Maps</span>
                <button id="basemapPopupClose" type="button" class="basemap-popup__close" aria-label="Close basemap panel">✕</button>
            </div>
            
            <!-- Default basemap (Google Satellite) -->
            <label style="display: block; margin: 8px 0; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; transition: color 0.2s;">
                <input type="radio" name="basemap" value="${this.defaultBaseMap}" 
                       ${this.currentBaseMap === this.defaultBaseMap ? 'checked' : ''} 
                       style="margin-right: 10px; accent-color: #3b82f6;">
                ${this.defaultBaseMap}
            </label>
            
            <!-- Other Basemaps dropdown button -->
            <div style="margin: 8px 0;">
                <button id="otherBasemapsToggle" type="button" style="
                    width: 100%;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 13px;
                    color: #374151;
                    font-weight: 500;
                    text-align: left;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';" onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb';">
                    <span>Other Basemaps</span>
                    <span style="font-size: 10px; color: #6b7280;">${isOtherBasemapsOpen ? '▼' : '▶'}</span>
                </button>
                <div id="otherBasemapsList" style="display: ${isOtherBasemapsOpen ? 'block' : 'none'}; margin-top: 8px; padding-left: 8px;">
                    ${Object.keys(this.otherBaseMaps).map(name => `
                <label style="display: block; margin: 8px 0; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; transition: color 0.2s;">
                    <input type="radio" name="basemap" value="${name}" 
                           ${name === this.currentBaseMap ? 'checked' : ''} 
                           style="margin-right: 10px; accent-color: #3b82f6;">
                    ${name}
                </label>
            `).join('')}
                </div>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; margin: 14px 0; padding-top: 14px;">
                <div style="font-weight: 600; margin-bottom: 14px; color: #1f2937; font-size: 15px; letter-spacing: -0.01em;">Map Layers</div>
                <!-- USA FFA Layers dropdown -->
                <div style="margin: 8px 0;">
                    <button id="faaLayersToggle" type="button" style="
                        width: 100%;
                        background: #f9fafb;
                        border: 1px solid #e5e7eb;
                        border-radius: 6px;
                        padding: 8px 12px;
                        cursor: pointer;
                        font-size: 13px;
                        color: #374151;
                        font-weight: 500;
                        text-align: left;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db';" onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb';">
                        <span>USA FFA Layers</span>
                        <span style="font-size: 10px; color: #6b7280;">▶</span>
                    </button>
                    <div id="faaLayersList" style="display: none; margin-top: 8px; padding-left: 8px;">
                        <label style="display: block; margin: 8px 0; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; transition: color 0.2s;">
                            <input type="checkbox" id="faaUASMapToggle" ${this.isFAAUASMapEnabled ? 'checked' : ''} 
                                   style="margin-right: 10px; accent-color: #3b82f6;">
                            USA FAA UAS Map
                </label>
                        <label style="display: block; margin: 8px 0; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; transition: color 0.2s;">
                            <input type="checkbox" id="faaAirspaceToggle" ${this.isFAAAirspaceEnabled ? 'checked' : ''} 
                                   style="margin-right: 10px; accent-color: #3b82f6;">
                            USA FAA Airspace<br>
                            <span style="margin-left: 24px; font-size: 11px; color: #6b7280;">(At Ground)</span>
                    </label>
                        <label style="display: block; margin: 8px 0; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; transition: color 0.2s;">
                    <input type="checkbox" id="faaAirportsToggle" ${this.isFAAAirportsEnabled ? 'checked' : ''} 
                                   style="margin-right: 10px; accent-color: #3b82f6;">
                    USA FAA Airports
                </label>
                        <label style="display: block; margin: 8px 0; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; transition: color 0.2s;">
                    <input type="checkbox" id="runwaysToggle" ${this.isRunwaysEnabled ? 'checked' : ''} 
                                   style="margin-right: 10px; accent-color: #3b82f6;">
                    USA FAA Runways
                </label>
                    </div>
                </div>
                
                ${this.caltopoInfo && this.caltopoInfo.map_id ? `
                <!-- Caltopo Map Data -->
                <div style="margin: 8px 0;">
                    <div style="display: flex; align-items: center; margin: 8px 0;">
                        <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; flex: 1; transition: color 0.2s;">
                            <input type="checkbox" id="caltopoLayerToggle" ${this.isCaltopoLayerEnabled ? 'checked' : ''} 
                                   style="margin-right: 10px; accent-color: #3b82f6;">
                            Caltopo Map Data
                </label>
                        ${Object.keys(this.caltopoFolders).length > 0 ? `
                        <button id="caltopoFoldersExpandBtn" type="button" style="
                            background: none;
                            border: none;
                            cursor: pointer;
                            padding: 4px 8px;
                            font-size: 12px;
                            color: #6b7280;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-left: 8px;
                            line-height: 1;
                            transition: color 0.2s;
                        " onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#6b7280'" onclick="event.stopPropagation(); window.droneMap.toggleCaltopoFoldersExpand(); return false;" title="${this.isCaltopoFoldersExpanded ? 'Hide' : 'Show'} Folders">
                            <span style="transform: rotate(${this.isCaltopoFoldersExpanded ? '180deg' : '0deg'}); transition: transform 0.2s; display: inline-block; font-size: 10px;">▼</span>
                        </button>
                        ` : ''}
                    </div>
                    ${this.isCaltopoFoldersExpanded && Object.keys(this.caltopoFolders).length > 0 ? Object.keys(this.caltopoFolders).sort().map(folderName => {
                        const folder = this.caltopoFolders[folderName];
                        // Sanitize folder name for HTML ID (remove spaces and special chars)
                        const safeFolderId = folderName.replace(/[^a-zA-Z0-9]/g, '_');
                        return `
                        <div style="margin: 4px 0;">
                            <div style="display: flex; align-items: center;">
                                <label style="display: flex; align-items: center; cursor: pointer; font-size: 13px; padding: 4px 0; color: #374151; font-weight: 500; flex: 1; margin-left: 24px; transition: color 0.2s;">
                                    <input type="checkbox" id="caltopoFolder-${safeFolderId}" data-folder-name="${folderName}" ${folder.enabled ? 'checked' : ''} 
                                           style="margin-right: 10px; accent-color: #3b82f6;">
                                    ${folderName} (${folder.featureIds.length})
                </label>
                                <button id="caltopoFolderExpand-${safeFolderId}" data-folder-name="${folderName}" type="button" style="
                                    background: none;
                                    border: none;
                                    cursor: pointer;
                                    padding: 4px 8px;
                                    font-size: 12px;
                                    color: #6b7280;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    margin-left: 4px;
                                    line-height: 1;
                                    transition: color 0.2s;
                                " onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#6b7280'" onclick="event.stopPropagation(); window.droneMap.toggleCaltopoFolderExpand('${folderName.replace(/'/g, "\\'")}'); return false;" title="${folder.expanded ? 'Hide' : 'Show'} Features">
                                    <span style="transform: rotate(${folder.expanded ? '180deg' : '0deg'}); transition: transform 0.2s; display: inline-block; font-size: 10px;">▼</span>
                                </button>
            </div>
                            ${folder.expanded ? folder.featureIds.map(featureId => {
                                const featureInfo = folder.features[featureId];
                                const featureState = this.caltopoFeatureStates.get(featureId);
                                const safeFeatureId = featureId.replace(/[^a-zA-Z0-9]/g, '_');
                                return `
                                <label style="display: block; margin: 2px 0 6px 48px; cursor: pointer; font-size: 12px; padding: 2px 0; color: #6b7280; font-weight: 500; transition: color 0.2s;">
                                    <input type="checkbox" id="caltopoFeature-${safeFeatureId}" data-feature-id="${featureId}" ${featureState?.enabled ? 'checked' : ''} 
                                           style="margin-right: 8px; accent-color: #3b82f6;">
                                    ${featureInfo?.name || 'Unnamed'} <span style="font-size: 10px; color: #9ca3af;">(${featureInfo?.type || 'Feature'})</span>
                                </label>
                                `;
                            }).join('') : ''}
                        </div>
                        `;
                    }).join('') : ''}
                </div>
                ` : ''}
                
                <!-- Local Airspace Map link -->
                <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #e5e7eb; margin-bottom: 0; padding-bottom: 0;">
                    <a href="#" id="localAirspaceMapLink" style="
                        display: block;
                        color: #3b82f6;
                        text-decoration: none;
                        font-size: 13px;
                        font-weight: 500;
                        padding: 6px 0;
                        cursor: pointer;
                        transition: color 0.2s;
                    " onmouseover="this.style.color='#2563eb'; this.style.textDecoration='underline'" onmouseout="this.style.color='#3b82f6'; this.style.textDecoration='none'">
                        Local Airspace Map
                    </a>
                </div>
            </div>
            </div>
        `;
        const baseMapContent = this.baseMapPopup.querySelector('.basemap-popup__content');
        if (baseMapContent) {
            baseMapContent.style.overflowY = 'auto';
            baseMapContent.style.webkitOverflowScrolling = 'touch';
        }
        
        // Add event listener for USA FAA Airports toggle
        const faaAirportsToggle = this.baseMapPopup.querySelector('#faaAirportsToggle');
        if (faaAirportsToggle) {
            faaAirportsToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            faaAirportsToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleFAAAirports(e.target.checked);
            });
        }

        // Add event listener for Runways toggle
        const runwaysToggle = this.baseMapPopup.querySelector('#runwaysToggle');
        if (runwaysToggle) {
            runwaysToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            runwaysToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleRunways(e.target.checked);
            });
        }

        // Add event listener for FAA UAS Map toggle
        const faaUASMapToggle = this.baseMapPopup.querySelector('#faaUASMapToggle');
        if (faaUASMapToggle) {
            faaUASMapToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            faaUASMapToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleFAAUASMap(e.target.checked);
            });
        }

        // Add event listener for FAA Airspace toggle
        const faaAirspaceToggle = this.baseMapPopup.querySelector('#faaAirspaceToggle');
        if (faaAirspaceToggle) {
            faaAirspaceToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            faaAirspaceToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleFAAAirspace(e.target.checked);
            });
        }

        // Add event listener for "Other Basemaps" toggle button
        const otherBasemapsToggle = this.baseMapPopup.querySelector('#otherBasemapsToggle');
        const otherBasemapsList = this.baseMapPopup.querySelector('#otherBasemapsList');
        if (otherBasemapsToggle && otherBasemapsList) {
            otherBasemapsToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            otherBasemapsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = otherBasemapsList.style.display !== 'none';
                otherBasemapsList.style.display = isOpen ? 'none' : 'block';
                const arrow = otherBasemapsToggle.querySelector('span:last-child');
                if (arrow) {
                    arrow.textContent = isOpen ? '▶' : '▼';
                }
            });
        }
        
        // Add event listener for "USA FFA Layers" toggle button
        const faaLayersToggle = this.baseMapPopup.querySelector('#faaLayersToggle');
        const faaLayersList = this.baseMapPopup.querySelector('#faaLayersList');
        if (faaLayersToggle && faaLayersList) {
            faaLayersToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            faaLayersToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = faaLayersList.style.display !== 'none';
                faaLayersList.style.display = isOpen ? 'none' : 'block';
                const arrow = faaLayersToggle.querySelector('span:last-child');
                if (arrow) {
                    arrow.textContent = isOpen ? '▶' : '▼';
                }
            });
        }
        
        // Add event listener for Local Airspace Map link
        const localAirspaceMapLink = this.baseMapPopup.querySelector('#localAirspaceMapLink');
        if (localAirspaceMapLink) {
            localAirspaceMapLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close the base map popup first
                this.closeBaseMapPopup();
                // Show the airspace authority info popup
                this.showAirspaceAuthorityInfoPopup(null);
            });
        }
        
        // Add event listener for Caltopo layer toggle
        const caltopoLayerToggle = this.baseMapPopup.querySelector('#caltopoLayerToggle');
        if (caltopoLayerToggle) {
            caltopoLayerToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            caltopoLayerToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleCaltopoLayer(e.target.checked);
            });
        }
        
        // Add event listener for Caltopo folders expand button
        const caltopoFoldersExpandBtn = this.baseMapPopup.querySelector('#caltopoFoldersExpandBtn');
        if (caltopoFoldersExpandBtn) {
            caltopoFoldersExpandBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }
        
        // Add event listeners for all Caltopo folder toggles
        const caltopoFolderToggles = this.baseMapPopup.querySelectorAll('[id^="caltopoFolder-"]');
        caltopoFolderToggles.forEach(folderToggle => {
            folderToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            folderToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                // Get the actual folder name from data attribute
                const folderName = e.target.getAttribute('data-folder-name');
                if (folderName) {
                    this.toggleCaltopoFolder(folderName, e.target.checked);
                } else {
                    console.error("No data-folder-name attribute found on toggle");
                }
            });
        });
        
        // Add event listeners for all Caltopo folder expand buttons
        const caltopoFolderExpandBtns = this.baseMapPopup.querySelectorAll('[id^="caltopoFolderExpand-"]');
        caltopoFolderExpandBtns.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        });
        
        // Add event listeners for all individual Caltopo feature toggles
        const caltopoFeatureToggles = this.baseMapPopup.querySelectorAll('[id^="caltopoFeature-"]');
        caltopoFeatureToggles.forEach(featureToggle => {
            featureToggle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            featureToggle.addEventListener('change', (e) => {
                e.stopPropagation();
                // Get the actual feature ID from data attribute
                const featureId = e.target.getAttribute('data-feature-id');
                if (featureId) {
                    this.toggleCaltopoFeature(featureId, e.target.checked);
                } else {
                    console.error("No data-feature-id attribute found on toggle");
                }
            });
        });

        // Add event listener for Airspace All expand button
        const airspaceAllExpandBtn = this.baseMapPopup.querySelector('#airspaceAllExpandBtn');
        if (airspaceAllExpandBtn) {
            airspaceAllExpandBtn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
        }

        const closeButton = this.baseMapPopup.querySelector('#basemapPopupClose');
        if (closeButton) {
            closeButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.closeBaseMapPopup();
            });
        }
        
        // Add event listeners to radio buttons
        const radioButtons = this.baseMapPopup.querySelectorAll('input[name="basemap"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            radio.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                if (e.target.checked) {
                    this.switchBaseMap(e.target.value);
                    // If switching to an "other" basemap, open the dropdown
                    if (Object.keys(this.otherBaseMaps).includes(e.target.value)) {
                        if (otherBasemapsList) {
                            otherBasemapsList.style.display = 'block';
                            const arrow = otherBasemapsToggle?.querySelector('span:last-child');
                            if (arrow) {
                                arrow.textContent = '▼';
                            }
                        }
                    }
                }
            });
        });
        
        // Prevent all clicks inside popup from reaching map
        this.baseMapPopup.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't call preventDefault() - it breaks checkbox/radio functionality
        });
        this.baseMapPopup.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        // Add to map container
        mapContainer.appendChild(this.baseMapPopup);
        this.attachScrollablePopupInteractions(this.baseMapPopup);
        
        // Ensure popup has pointer events enabled so it can be clicked
        this.baseMapPopup.style.pointerEvents = 'auto';
        this.baseMapPopup.style.zIndex = '2000';

        if (this.baseMapPopupResizeHandler) {
            window.removeEventListener('resize', this.baseMapPopupResizeHandler);
            window.removeEventListener('orientationchange', this.baseMapPopupResizeHandler);
        }
        this.baseMapPopupResizeHandler = () => {
            this.updateBaseMapPopupSizing();
        };
        window.addEventListener('resize', this.baseMapPopupResizeHandler);
        window.addEventListener('orientationchange', this.baseMapPopupResizeHandler);
        this.updateBaseMapPopupSizing();
        requestAnimationFrame(() => this.updateBaseMapPopupSizing());
        
        // Close popup when clicking outside (on map or anywhere else)
        // Use a small delay to avoid immediate closure from the click that opened it
        setTimeout(() => {
            let mouseDownPos = null;
            let mouseDownTime = 0;
            
            // Track mouse down to distinguish clicks from drags
            const mouseDownHandler = (e) => {
                // Don't track if clicking inside popup
                if (this.baseMapPopup && this.baseMapPopup.contains(e.target)) {
                    return;
                }
                mouseDownTime = Date.now();
                mouseDownPos = { x: e.clientX, y: e.clientY };
            };
            
            // Close handler - called on click
            const closeHandler = (e) => {
                // Don't close if clicking inside the popup itself
                if (this.baseMapPopup && this.baseMapPopup.contains(e.target)) {
                    mouseDownPos = null; // Reset
                    return;
                }
                
                // Don't close if clicking on modal overlays (check if target or parent has high z-index)
                if (e.target.closest('[style*="z-index: 10000"]')) {
                    return;
                }
                
                // Check if this was a quick click (not a drag)
                if (mouseDownPos) {
                    const clickDuration = Date.now() - mouseDownTime;
                    const distance = Math.sqrt(
                        Math.pow(e.clientX - mouseDownPos.x, 2) + 
                        Math.pow(e.clientY - mouseDownPos.y, 2)
                    );
                    
                    // If quick (< 300ms) and small movement (< 5px), treat as click
                    if (clickDuration < 300 && distance < 5) {
                        this.closeBaseMapPopup();
                        document.removeEventListener('click', closeHandler);
                        document.removeEventListener('mousedown', mouseDownHandler);
                        return;
                    }
                }
                
                // Reset for next interaction
                mouseDownPos = null;
            };
            
            // Track mouse down to detect drags
            document.addEventListener('mousedown', mouseDownHandler);
            
            // Listen for clicks on document (catches clicks anywhere including map)
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    closeBaseMapPopup() {
        if (this.baseMapPopupResizeHandler) {
            window.removeEventListener('resize', this.baseMapPopupResizeHandler);
            window.removeEventListener('orientationchange', this.baseMapPopupResizeHandler);
            this.baseMapPopupResizeHandler = null;
        }
        this.resetPopupTouchState();
        if (this.baseMapPopup) {
            this.baseMapPopup.remove();
            this.baseMapPopup = null;
        }
    }
    updateBaseMapPopupSizing() {
        if (!this.baseMapPopup) return;
        const mapContainer = this.map ? this.map.getContainer() : null;
        if (!mapContainer) return;

        const containerRect = mapContainer.getBoundingClientRect();
        const containerHeight = containerRect.height || mapContainer.clientHeight || 0;
        const containerWidth = containerRect.width || mapContainer.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;

        const candidateHeights = [];
        if (containerHeight > 0) {
            candidateHeights.push(containerHeight - 24);
        }
        if (viewportHeight > 0) {
            candidateHeights.push(viewportHeight - 80);
        }

        let desiredHeight = 260;
        const positiveCandidates = candidateHeights.filter(value => Number.isFinite(value) && value > 0);
        if (positiveCandidates.length > 0) {
            const smallestCandidate = Math.min(...positiveCandidates);
            if (smallestCandidate >= 200) {
                desiredHeight = Math.min(smallestCandidate, 520);
            } else {
                desiredHeight = Math.max(140, smallestCandidate);
            }
        } else if (containerHeight > 0) {
            const available = containerHeight - 24;
            desiredHeight = available >= 200 ? Math.min(available, 520) : Math.max(140, available);
        } else if (viewportHeight > 0) {
            const available = viewportHeight - 80;
            desiredHeight = available >= 200 ? Math.min(available, 520) : Math.max(140, available);
        }

        if (containerHeight > 0) {
            const containerCap = Math.max(140, containerHeight - 16);
            desiredHeight = Math.min(desiredHeight, containerCap);
        }

        const finalHeight = Math.max(140, desiredHeight);
        this.baseMapPopup.style.maxHeight = `${finalHeight}px`;

        if (containerWidth > 0) {
            const widthAvailable = containerWidth - 16;
            if (widthAvailable > 0) {
                const resolvedWidth = Math.min(widthAvailable, 420);
                this.baseMapPopup.style.maxWidth = `${resolvedWidth}px`;
                if (window.innerWidth <= 768) {
                    this.baseMapPopup.style.width = `${resolvedWidth}px`;
                } else {
                    this.baseMapPopup.style.width = '';
                }
            } else {
                this.baseMapPopup.style.maxWidth = '';
                this.baseMapPopup.style.width = '';
            }
        } else {
            this.baseMapPopup.style.maxWidth = '';
            if (window.innerWidth <= 768) {
                this.baseMapPopup.style.width = '';
            }
        }

        const computedStyle = window.getComputedStyle(this.baseMapPopup);
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const headingEl = this.baseMapPopup.querySelector('.basemap-popup__header');
        const contentEl = this.baseMapPopup.querySelector('.basemap-popup__content');

        if (contentEl) {
            const headerHeight = headingEl ? headingEl.getBoundingClientRect().height : 0;
            const extraSpacing = 16; // spacing for margins between sections
            const contentAvailable = Math.max(120, finalHeight - headerHeight - paddingTop - paddingBottom - extraSpacing);
            contentEl.style.maxHeight = `${contentAvailable}px`;
            contentEl.style.overflowY = 'auto';
            contentEl.style.webkitOverflowScrolling = 'touch';
        }

        if (containerHeight > 0) {
            const defaultTop = window.innerWidth <= 768 ? 12 : 52;
            const maxTop = Math.max(8, containerHeight - finalHeight - 12);
            const computedTop = Math.min(defaultTop, maxTop);
            this.baseMapPopup.style.top = `${computedTop}px`;
        }
    }
    attachScrollablePopupInteractions(popupElement) {
        if (!popupElement) return;

        const stopPropagation = (event) => {
            event.stopPropagation();
        };

        const onTouchStart = (event) => {
            const touchCount = event?.changedTouches ? event.changedTouches.length : 1;
            this.handlePopupTouchStart(touchCount);
            event.stopPropagation();
        };

        const onTouchMove = (event) => {
            event.stopPropagation();
        };

        const onTouchEnd = (event) => {
            const touchCount = event?.changedTouches ? event.changedTouches.length : 1;
            this.handlePopupTouchEnd(touchCount);
            event.stopPropagation();
        };

        const onTouchCancel = (event) => {
            const touchCount = event?.changedTouches ? event.changedTouches.length : 1;
            this.handlePopupTouchEnd(touchCount);
            event.stopPropagation();
        };

        popupElement.addEventListener('wheel', stopPropagation, { passive: false });
        popupElement.addEventListener('touchstart', onTouchStart, { passive: false });
        popupElement.addEventListener('touchmove', onTouchMove, { passive: false });
        popupElement.addEventListener('touchend', onTouchEnd, { passive: false });
        popupElement.addEventListener('touchcancel', onTouchCancel, { passive: false });
        popupElement.addEventListener('pointerdown', stopPropagation, { passive: false });
        popupElement.addEventListener('pointermove', stopPropagation, { passive: false });
        popupElement.addEventListener('pointerup', stopPropagation, { passive: false });
    }
    handlePopupTouchStart(touchCount = 1) {
        if (!this.map || !this.map.dragging) return;
        const count = Number.isFinite(touchCount) && touchCount > 0 ? touchCount : 1;
        if (this.popupTouchActiveCount === 0) {
            const dragging = this.map.dragging;
            const wasEnabled = typeof dragging.enabled === 'function' ? dragging.enabled() : true;
            this.mapDraggingWasEnabledBeforePopup = wasEnabled;
            if (wasEnabled && typeof dragging.disable === 'function') {
                dragging.disable();
            }
        }
        this.popupTouchActiveCount += count;
    }
    handlePopupTouchEnd(touchCount = 1) {
        if (!this.map || !this.map.dragging) return;
        const count = Number.isFinite(touchCount) && touchCount > 0 ? touchCount : 1;
        this.popupTouchActiveCount = Math.max(0, this.popupTouchActiveCount - count);
        if (this.popupTouchActiveCount === 0) {
            if (this.mapDraggingWasEnabledBeforePopup && typeof this.map.dragging.enable === 'function') {
                this.map.dragging.enable();
            }
            this.mapDraggingWasEnabledBeforePopup = null;
        }
    }
    resetPopupTouchState() {
        if (!this.map || !this.map.dragging) {
            this.popupTouchActiveCount = 0;
            this.mapDraggingWasEnabledBeforePopup = null;
            return;
        }
        if (this.popupTouchActiveCount > 0 && this.mapDraggingWasEnabledBeforePopup && typeof this.map.dragging.enable === 'function') {
            this.map.dragging.enable();
        }
        this.popupTouchActiveCount = 0;
        this.mapDraggingWasEnabledBeforePopup = null;
    }
    showMeasurementPopup() {
        if (this.measurementPopup) {
            this.closeMeasurementPopup();
        }

        const mapContainer = this.map ? this.map.getContainer() : null;
        if (!mapContainer) return;

        this.measurementPopup = document.createElement('div');
        this.measurementPopup.className = 'measurement-popup';

        const isLineMode = this.measurementType === 'line';
        const isPolygonMode = this.measurementType === 'polygon';
        const isRadiusMode = this.measurementType === 'radius';
        const unitOptions = (isLineMode || isRadiusMode) ? this.getLineUnitOptions() : this.getPolygonUnitOptions();
        const currentUnit = (isLineMode || isRadiusMode) ? this.measurementUnit : this.measurementAreaUnit;
        const instructions = isLineMode
            ? 'Click on the map to measure approximate distance between points.'
            : isPolygonMode
            ? 'Click on the map to draw a polygon for approximate measurement.'
            : 'Click on the map to set center point, then drag to set radius.';

        this.measurementPopup.innerHTML = `
            <div class="measurement-popup__header">
                <div class="measurement-popup__title">Measuring Tool</div>
                <button id="closeMeasurementBtn" class="measurement-popup__close" type="button" aria-label="Close measurement panel">×</button>
            </div>
            <div class="measurement-popup__content">
                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button id="lineModeBtn" style="
                        flex: 1;
                        padding: 8px 10px;
                        border: ${isLineMode ? '3px solid #93c5fd' : 'none'};
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 500;
                        transition: all 0.2s;
                        box-shadow: ${isLineMode ? '0 4px 8px rgba(59, 130, 246, 0.3), 0 0 0 3px rgba(147, 197, 253, 0.2)' : 'none'};
                        ${isLineMode ? 'background: #3b82f6; color: white;' : 'background: #314268; color: white;'}
                    " onmouseover="${isLineMode ? "this.style.background='#2563eb'" : "this.style.background='#253454'"}" onmouseout="${isLineMode ? "this.style.background='#3b82f6'" : "this.style.background='#314268'"}">Line</button>
                    <button id="polygonModeBtn" style="
                        flex: 1;
                        padding: 8px 10px;
                        border: ${isPolygonMode ? '3px solid #93c5fd' : 'none'};
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 500;
                        transition: all 0.2s;
                        box-shadow: ${isPolygonMode ? '0 4px 8px rgba(59, 130, 246, 0.3), 0 0 0 3px rgba(147, 197, 253, 0.2)' : 'none'};
                        ${isPolygonMode ? 'background: #3b82f6; color: white;' : 'background: #314268; color: white;'}
                    " onmouseover="${isPolygonMode ? "this.style.background='#2563eb'" : "this.style.background='#253454'"}" onmouseout="${isPolygonMode ? "this.style.background='#3b82f6'" : "this.style.background='#314268'"}">Polygon</button>
                </div>
                <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                    <button id="radiusModeBtn" style="
                        padding: 8px 10px;
                        border: ${isRadiusMode ? '3px solid #93c5fd' : 'none'};
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 11px;
                        font-weight: 500;
                        transition: all 0.2s;
                        box-shadow: ${isRadiusMode ? '0 4px 8px rgba(59, 130, 246, 0.3), 0 0 0 3px rgba(147, 197, 253, 0.2)' : 'none'};
                        ${isRadiusMode ? 'background: #3b82f6; color: white;' : 'background: #314268; color: white;'}
                    " onmouseover="${isRadiusMode ? "this.style.background='#2563eb'" : "this.style.background='#253454'"}" onmouseout="${isRadiusMode ? "this.style.background='#3b82f6'" : "this.style.background='#314268'"}">Radius</button>
                </div>
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 11px; color: #6b7280; font-weight: 500;">Unit:</label>
                    <select id="measurementUnit" style="width: 100%; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 11px; box-sizing: border-box; background: #ffffff; color: #374151; transition: border-color 0.2s;" onmouseover="this.style.borderColor='#d1d5db'" onmouseout="this.style.borderColor='#e5e7eb'">
                        ${unitOptions}
                    </select>
                </div>
                <div style="margin-bottom: 10px; padding: 8px; background: #eff6ff; border-radius: 6px; border-left: 3px solid #3b82f6;">
                    <div style="font-size: 10px; color: #374151; line-height: 1.5;">
                        ${instructions}
                    </div>
                </div>
                <div style="padding: 10px; background: #f9fafb; border-radius: 6px; text-align: center; border: 1px solid #e5e7eb;">
                    ${isRadiusMode ? '<div style="font-size: 10px; color: #6b7280; margin-bottom: 6px; font-weight: 500;">Radius</div>' : ''}
                    <div style="font-size: 20px; font-weight: 600; color: #3b82f6; letter-spacing: -0.02em;" id="measurementDistance">0.00</div>
                    <div style="font-size: 10px; color: #6b7280; margin-top: 4px; font-weight: 500;" id="measurementUnitLabel">${currentUnit}</div>
                </div>
                <div style="margin-top: 10px; text-align: left;">
                    <button id="undoMeasurementBtn" onclick="window.droneMap.undoLastMeasurement(); return false;"
                            style="background: transparent; border: 1px solid #e5e7eb; color: #6b7280; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 14px; width: auto; display: inline-flex; align-items: center; justify-content: center; transition: all 0.2s; font-weight: 500;"
                            onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db'; this.style.color='#374151'" onmouseout="this.style.background='transparent'; this.style.borderColor='#e5e7eb'; this.style.color='#6b7280'"
                            title="Undo Last Point">
                        ←
                    </button>
                </div>
            </div>
        `;

        const closeButton = this.measurementPopup.querySelector('#closeMeasurementBtn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closeMeasurementPopup());
        }

        const lineBtn = this.measurementPopup.querySelector('#lineModeBtn');
        if (lineBtn) {
            lineBtn.addEventListener('click', () => this.switchMeasurementType('line'));
        }
        const polygonBtn = this.measurementPopup.querySelector('#polygonModeBtn');
        if (polygonBtn) {
            polygonBtn.addEventListener('click', () => this.switchMeasurementType('polygon'));
        }
        const radiusBtn = this.measurementPopup.querySelector('#radiusModeBtn');
        if (radiusBtn) {
            radiusBtn.addEventListener('click', () => this.switchMeasurementType('radius'));
        }

        const unitSelect = this.measurementPopup.querySelector('#measurementUnit');
        if (unitSelect) {
            unitSelect.addEventListener('change', (e) => {
                if (this.measurementType === 'line' || this.measurementType === 'radius') {
                    this.measurementUnit = e.target.value;
                } else {
                    this.measurementAreaUnit = e.target.value;
                }
                this.updateMeasurementDisplay();
            });
        }

        this.measurementPopup.addEventListener('click', (e) => e.stopPropagation());
        this.measurementPopup.addEventListener('mousedown', (e) => e.stopPropagation());

        mapContainer.appendChild(this.measurementPopup);
        this.attachScrollablePopupInteractions(this.measurementPopup);

        if (this.measurementPopupResizeHandler) {
            window.removeEventListener('resize', this.measurementPopupResizeHandler);
            window.removeEventListener('orientationchange', this.measurementPopupResizeHandler);
        }
        this.measurementPopupResizeHandler = () => {
            this.updateMeasurementPopupSizing();
        };
        window.addEventListener('resize', this.measurementPopupResizeHandler);
        window.addEventListener('orientationchange', this.measurementPopupResizeHandler);
        this.updateMeasurementPopupSizing();
        requestAnimationFrame(() => this.updateMeasurementPopupSizing());

        this.measurementMode = true;
        this.measurementPoints = [];
        this.measurementMarkers = [];
        this.measurementPolylines = [];
        this.measurementPolygon = null;
        this.measurementRadiusCircle = null;
        this.measurementRadiusCenter = null;
        this.measurementRadius = 0;
        this.isDraggingRadius = false;
        this.measurementTotalDistance = 0;
        this.measurementArea = 0;
        this.updateMeasurementDisplay();
    }

    updateMeasurementPopupSizing() {
        if (!this.measurementPopup) return;
        const mapContainer = this.map ? this.map.getContainer() : null;
        if (!mapContainer) return;

        const containerRect = mapContainer.getBoundingClientRect();
        const containerHeight = containerRect.height || mapContainer.clientHeight || 0;
        const containerWidth = containerRect.width || mapContainer.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;

        const candidateHeights = [];
        if (containerHeight > 0) {
            candidateHeights.push(containerHeight - 24);
        }
        if (viewportHeight > 0) {
            candidateHeights.push(viewportHeight - 120);
        }

        let desiredHeight = 240;
        const positiveCandidates = candidateHeights.filter(value => Number.isFinite(value) && value > 0);
        if (positiveCandidates.length > 0) {
            const smallestCandidate = Math.min(...positiveCandidates);
            if (smallestCandidate >= 180) {
                desiredHeight = Math.min(smallestCandidate, 460);
            } else {
                desiredHeight = Math.max(160, smallestCandidate);
            }
        } else if (containerHeight > 0) {
            const available = containerHeight - 24;
            desiredHeight = available >= 180 ? Math.min(available, 460) : Math.max(160, available);
        } else if (viewportHeight > 0) {
            const available = viewportHeight - 120;
            desiredHeight = available >= 180 ? Math.min(available, 460) : Math.max(160, available);
        }

        if (containerHeight > 0) {
            const containerCap = Math.max(160, containerHeight - 16);
            desiredHeight = Math.min(desiredHeight, containerCap);
        }

        const finalHeight = Math.max(160, desiredHeight);
        this.measurementPopup.style.maxHeight = `${finalHeight}px`;

        if (containerWidth > 0) {
            const widthAvailable = containerWidth - 16;
            if (widthAvailable > 0) {
                if (widthAvailable >= 200) {
                    const resolvedWidth = Math.min(widthAvailable, 260);
                    this.measurementPopup.style.width = `${resolvedWidth}px`;
                } else {
                    this.measurementPopup.style.width = '';
                }
            } else {
                this.measurementPopup.style.width = '';
            }
        } else {
            this.measurementPopup.style.width = '';
        }

        const computedStyle = window.getComputedStyle(this.measurementPopup);
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const headerEl = this.measurementPopup.querySelector('.measurement-popup__header');
        const contentEl = this.measurementPopup.querySelector('.measurement-popup__content');

        if (contentEl) {
            const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
            const extraSpacing = 12;
            const contentAvailable = Math.max(120, finalHeight - headerHeight - paddingTop - paddingBottom - extraSpacing);
            contentEl.style.maxHeight = `${contentAvailable}px`;
            contentEl.style.overflowY = 'auto';
            contentEl.style.webkitOverflowScrolling = 'touch';
        }

        if (containerHeight > 0) {
            const defaultTop = window.innerWidth <= 768 ? 12 : 50;
            const maxTop = Math.max(8, containerHeight - finalHeight - 12);
            const computedTop = Math.min(defaultTop, maxTop);
            this.measurementPopup.style.top = `${computedTop}px`;
        }
    }
    
    getLineUnitOptions() {
        const units = [
            { value: 'NM', label: 'Nautical Miles' },
            { value: 'MI', label: 'Miles' },
            { value: 'KM', label: 'Kilometers' },
            { value: 'M', label: 'Meters' },
            { value: 'FT', label: 'Feet' }
        ];
        return units.map(u => `<option value="${u.value}" ${this.measurementUnit === u.value ? 'selected' : ''}>${u.label}</option>`).join('');
    }
    
    getPolygonUnitOptions() {
        const units = [
            { value: 'NM²', label: 'Nautical Miles²' },
            { value: 'MI²', label: 'Miles²' },
            { value: 'KM²', label: 'Kilometers²' },
            { value: 'M²', label: 'Meters²' },
            { value: 'FT²', label: 'Feet²' },
            { value: 'HA', label: 'Hectares' },
            { value: 'AC', label: 'Acres' }
        ];
        return units.map(u => `<option value="${u.value}" ${this.measurementAreaUnit === u.value ? 'selected' : ''}>${u.label}</option>`).join('');
    }
    
    switchMeasurementType(type) {
        if (this.measurementType === type) return;
        
        // Clear current measurements (including radius)
        this.clearMeasurements();
        this.clearRadius();
        
        // Switch type
        this.measurementType = type;
        
        // Rebuild popup
        this.showMeasurementPopup();
    }
    
    closeMeasurementPopup() {
        if (this.measurementPopupResizeHandler) {
            window.removeEventListener('resize', this.measurementPopupResizeHandler);
            window.removeEventListener('orientationchange', this.measurementPopupResizeHandler);
            this.measurementPopupResizeHandler = null;
        }
        this.resetPopupTouchState();
        if (this.measurementPopup) {
            this.measurementPopup.remove();
            this.measurementPopup = null;
        }
        
        // Disable measurement mode and clear all measurements
        this.measurementMode = false;
        this.clearMeasurements();
        this.clearRadius();
    }
    
    clearMeasurements() {
        // Remove all markers and polylines
        this.measurementMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.measurementPolylines.forEach(polyline => {
            this.map.removeLayer(polyline);
        });
        
        // Remove polygon if it exists
        if (this.measurementPolygon) {
            this.map.removeLayer(this.measurementPolygon);
            this.measurementPolygon = null;
        }
        
        // Remove radius circle if it exists
        if (this.measurementRadiusCircle) {
            this.map.removeLayer(this.measurementRadiusCircle);
            this.measurementRadiusCircle = null;
        }
        
        // Remove radius center marker if it exists
        if (this.measurementRadiusCenter) {
            this.map.removeLayer(this.measurementRadiusCenter);
            this.measurementRadiusCenter = null;
        }
        
        this.measurementPoints = [];
        this.measurementMarkers = [];
        this.measurementPolylines = [];
        this.measurementRadius = 0;
        this.isDraggingRadius = false;
        this.measurementTotalDistance = 0;
        this.measurementArea = 0;
    }
    
    updateMeasurementDisplay() {
        if (!this.measurementPopup) return;
        
        const distanceDiv = document.getElementById('measurementDistance');
        const unitLabelDiv = document.getElementById('measurementUnitLabel');
        
        if (distanceDiv && unitLabelDiv) {
            if (this.measurementType === 'line') {
            const convertedDistance = this.convertDistance(this.measurementTotalDistance, 'NM', this.measurementUnit);
            distanceDiv.textContent = convertedDistance.toFixed(2);
            unitLabelDiv.textContent = this.measurementUnit;
            } else if (this.measurementType === 'radius') {
                // Radius mode - convert from meters to selected unit
                const radiusM = this.measurementRadius;
                const radiusNM = radiusM / 1852; // Convert to nautical miles
                const convertedRadius = this.convertDistance(radiusNM, 'NM', this.measurementUnit);
                distanceDiv.textContent = convertedRadius.toFixed(2);
            unitLabelDiv.textContent = this.measurementUnit;
            } else {
                // Polygon mode - show area
                const convertedArea = this.convertArea(this.measurementArea, this.measurementAreaUnit);
                distanceDiv.textContent = convertedArea.toFixed(2);
                unitLabelDiv.textContent = this.measurementAreaUnit;
            }
        }
    }
    
    convertDistance(distanceNM, fromUnit, toUnit) {
        // Convert from NM to target unit
        const distanceM = distanceNM * 1852; // NM to meters
        
        switch (toUnit) {
            case 'NM':
                return distanceNM;
            case 'MI':
                return distanceNM * 1.15078; // NM to miles
            case 'KM':
                return distanceNM * 1.852; // NM to kilometers
            case 'M':
                return distanceM;
            case 'FT':
                return distanceM * 3.28084; // meters to feet
            default:
                return distanceNM;
        }
    }
    
    handleMeasurementClick(e) {
        if (!this.measurementMode) return;
        
        // Don't handle clicks on popups or controls
        const target = e.originalEvent?.target;
        if (target && (
            target.closest('.leaflet-popup') ||
            target.closest('.leaflet-control') ||
            target.closest('.multi-hit-popup')
        )) {
            return;
        }
        
        const latlng = e.latlng;
        
        if (this.measurementType === 'line') {
            this.handleLineMeasurementClick(latlng);
        } else if (this.measurementType === 'radius') {
            this.handleRadiusMeasurementClick(latlng);
        } else {
            this.handlePolygonMeasurementClick(latlng);
        }
    }
    
    handleLineMeasurementClick(latlng) {
        // Create small pin marker
        const pinIcon = L.divIcon({
            className: 'measurement-pin',
            html: '<div style="width: 8px; height: 8px; background: #ff0000; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        });
        
        const marker = L.marker(latlng, { icon: pinIcon }).addTo(this.map);
        this.measurementMarkers.push(marker);
        this.measurementPoints.push(latlng);
        
        // If we have at least 2 points, draw a line and calculate distance
        if (this.measurementPoints.length >= 2) {
            const lastPoint = this.measurementPoints[this.measurementPoints.length - 2];
            const currentPoint = this.measurementPoints[this.measurementPoints.length - 1];
            
            // Draw line
            const polyline = L.polyline([lastPoint, currentPoint], {
                color: '#ff0000',
                weight: 2,
                opacity: 0.7
            }).addTo(this.map);
            this.measurementPolylines.push(polyline);
            
            // Calculate distance in meters
            const distanceM = this.measurementPoints[this.measurementPoints.length - 2].distanceTo(currentPoint);
            // Convert to nautical miles
            const distanceNM = distanceM / 1852;
            
            // Add to total
            this.measurementTotalDistance += distanceNM;
            this.updateMeasurementDisplay();
        }
    }
    
    handlePolygonMeasurementClick(latlng) {
        // Create small pin marker
        const pinIcon = L.divIcon({
            className: 'measurement-pin',
            html: '<div style="width: 8px; height: 8px; background: #ff0000; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [8, 8],
            iconAnchor: [4, 4]
        });
        
        const marker = L.marker(latlng, { icon: pinIcon }).addTo(this.map);
        this.measurementMarkers.push(marker);
        this.measurementPoints.push(latlng);
        
        // Update polygon display
        this.updatePolygonDisplay();
    }
    
    handleRadiusMeasurementClick(latlng) {
        if (!this.measurementRadiusCenter) {
            // First click - set center point
            const centerIcon = L.divIcon({
                className: 'measurement-pin',
                html: '<div style="width: 10px; height: 10px; background: #ff0000; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
                iconSize: [10, 10],
                iconAnchor: [5, 5]
            });
            
            this.measurementRadiusCenter = L.marker(latlng, { icon: centerIcon }).addTo(this.map);
            this.isDraggingRadius = true;
            
            // Set up mouse move handler for dragging - store bound function for cleanup
            this._radiusDragHandler = this.handleRadiusDrag.bind(this);
            this.map.on('mousemove', this._radiusDragHandler);
            
            // Change cursor to indicate dragging
            this.map.getContainer().style.cursor = 'crosshair';
        } else if (this.isDraggingRadius) {
            // Second click after dragging - lock in the radius at current position
            const currentLatLng = latlng;
            const centerLatLng = this.measurementRadiusCenter.getLatLng();
            
            // Calculate final radius in meters
            const radiusM = centerLatLng.distanceTo(currentLatLng);
            this.measurementRadius = radiusM;
            
            // Update circle with final radius
            if (this.measurementRadiusCircle) {
                this.measurementRadiusCircle.setRadius(radiusM);
            } else {
                this.measurementRadiusCircle = L.circle(centerLatLng, {
                    radius: radiusM,
                    color: '#ff0000',
                    weight: 2,
                    opacity: 0.7,
                    fillColor: '#ff0000',
                    fillOpacity: 0.2
                }).addTo(this.map);
            }
            
            // Lock in the radius - stop dragging
            this.isDraggingRadius = false;
            this.map.getContainer().style.cursor = '';
            
            // Remove mouse move handler
            if (this._radiusDragHandler) {
                this.map.off('mousemove', this._radiusDragHandler);
                this._radiusDragHandler = null;
            }
            
            // Update display
            this.updateMeasurementDisplay();
        } else {
            // Click again when radius is locked - reset to start over
            this.clearRadius();
        }
    }
    
    handleRadiusDrag(e) {
        if (!this.isDraggingRadius || !this.measurementRadiusCenter) return;
        
        const currentLatLng = e.latlng;
        const centerLatLng = this.measurementRadiusCenter.getLatLng();
        
        // Calculate radius in meters
        const radiusM = centerLatLng.distanceTo(currentLatLng);
        this.measurementRadius = radiusM;
        
        // Update or create circle
        if (this.measurementRadiusCircle) {
            this.measurementRadiusCircle.setRadius(radiusM);
        } else {
            this.measurementRadiusCircle = L.circle(centerLatLng, {
                radius: radiusM,
                color: '#ff0000',
                weight: 2,
                opacity: 0.7,
                fillColor: '#ff0000',
                fillOpacity: 0.2
            }).addTo(this.map);
        }
        
        // Update display
        this.updateMeasurementDisplay();
    }
    
    clearRadius() {
        if (this.measurementRadiusCircle) {
            this.map.removeLayer(this.measurementRadiusCircle);
            this.measurementRadiusCircle = null;
        }
        if (this.measurementRadiusCenter) {
            this.map.removeLayer(this.measurementRadiusCenter);
            this.measurementRadiusCenter = null;
        }
        this.measurementRadius = 0;
        this.isDraggingRadius = false;
        this.map.getContainer().style.cursor = '';
        this.updateMeasurementDisplay();
        
        // Remove event listeners
        if (this._radiusDragHandler) {
            this.map.off('mousemove', this._radiusDragHandler);
            this._radiusDragHandler = null;
        }
    }
    
    updatePolygonDisplay() {
        // Remove existing polygon
        if (this.measurementPolygon) {
            this.map.removeLayer(this.measurementPolygon);
        }
        
        if (this.measurementPoints.length >= 2) {
            // Draw polygon outline
            const polygon = L.polygon(this.measurementPoints, {
                color: '#ff0000',
                weight: 2,
                opacity: 0.7,
                fillColor: '#ff0000',
                fillOpacity: 0.2
            }).addTo(this.map);
            
            this.measurementPolygon = polygon;
            
            // Calculate area if we have at least 3 points
            if (this.measurementPoints.length >= 3) {
                this.measurementArea = this.calculatePolygonArea(this.measurementPoints);
                this.updateMeasurementDisplay();
            }
        }
    }
    
    completePolygon() {
        if (this.measurementType === 'polygon' && this.measurementPoints.length >= 3) {
            // Close the polygon by connecting last point to first
            this.updatePolygonDisplay();
        }
    }
    
    calculatePolygonArea(points) {
        // Calculate area using spherical excess formula
        // This is accurate for lat/lng coordinates on Earth's surface
        if (points.length < 3) return 0;
        
        // Close the polygon if not already closed
        const closedPoints = [...points];
        if (closedPoints.length < 3 || 
            closedPoints[0].lat !== closedPoints[closedPoints.length - 1].lat || 
            closedPoints[0].lng !== closedPoints[closedPoints.length - 1].lng) {
            closedPoints.push(L.latLng(closedPoints[0].lat, closedPoints[0].lng));
        }
        
        const R = 6371000; // Earth radius in meters
        let area = 0;
        
        // Convert to radians and calculate spherical excess
        for (let i = 0; i < closedPoints.length - 1; i++) {
            const p1 = closedPoints[i];
            const p2 = closedPoints[i + 1];
            
            const lat1 = p1.lat * Math.PI / 180;
            const lon1 = p1.lng * Math.PI / 180;
            const lat2 = p2.lat * Math.PI / 180;
            const lon2 = p2.lng * Math.PI / 180;
            
            area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        }
        
        area = Math.abs(area * R * R / 2);
        return area;
    }
    
    convertArea(areaM2, toUnit) {
        // Convert from square meters to target unit
        switch (toUnit) {
            case 'M²':
                return areaM2;
            case 'KM²':
                return areaM2 / 1000000;
            case 'MI²':
                return areaM2 / 2589988.11; // square meters to square miles
            case 'NM²':
                return areaM2 / 3429904; // square meters to square nautical miles
            case 'FT²':
                return areaM2 * 10.7639; // square meters to square feet
            case 'HA':
                return areaM2 / 10000; // square meters to hectares
            case 'AC':
                return areaM2 / 4046.86; // square meters to acres
            default:
                return areaM2;
        }
    }
    
    undoLastMeasurement() {
        if (this.measurementType === 'radius') {
            // For radius mode, clear the entire radius
            this.clearRadius();
            return;
        }
        
        if (this.measurementPoints.length === 0) return;
        
        if (this.measurementType === 'line') {
        // Remove the last point
        this.measurementPoints.pop();
        
        // Remove the last marker
        const lastMarker = this.measurementMarkers.pop();
        if (lastMarker) {
            this.map.removeLayer(lastMarker);
        }
        
        // If we had a line to the last point, remove it and update distance
        if (this.measurementPoints.length > 0 && this.measurementPolylines.length > 0) {
            const lastPolyline = this.measurementPolylines.pop();
            if (lastPolyline) {
                this.map.removeLayer(lastPolyline);
                
                // Recalculate total distance
                if (this.measurementPoints.length >= 2) {
                    // Subtract the distance from the removed line
                    const secondLastPoint = this.measurementPoints[this.measurementPoints.length - 2];
                    const lastPoint = this.measurementPoints[this.measurementPoints.length - 1];
                    
                    const distanceM = secondLastPoint.distanceTo(lastPoint);
                    const distanceNM = distanceM / 1852;
                    this.measurementTotalDistance -= distanceNM;
                }
            }
        } else {
            // No line to remove, just reset distance to 0
            this.measurementTotalDistance = 0;
            }
        } else {
            // Polygon mode
            // Remove the last point
            this.measurementPoints.pop();
            
            // Remove the last marker
            const lastMarker = this.measurementMarkers.pop();
            if (lastMarker) {
                this.map.removeLayer(lastMarker);
            }
            
            // Update polygon display
            this.updatePolygonDisplay();
        }
        
        this.updateMeasurementDisplay();
    }
    switchBaseMap(mapName) {
        if (!this.baseMaps[mapName] || mapName === this.currentBaseMap) return;
        
        // Remove current base map
        Object.values(this.baseMaps).forEach(layer => {
            this.map.removeLayer(layer);
        });
        
        // Add new base map
        this.baseMaps[mapName].addTo(this.map);
        this.currentBaseMap = mapName;
        
        console.log(`Switched to ${mapName} base map`);
        
        // Don't close popup - let user click outside to close
    }

    // OpenAIP Airspace Layer Methods
    toggleAirspaceAllExpand() {
        this.isAirspaceAllExpanded = !this.isAirspaceAllExpanded;
        // Refresh popup if it's open to update the arrow and sub-bullet visibility
        if (this.baseMapPopup && this.baseMapPopup.parentElement) {
            this.showBaseMapPopup();
        }
    }

    toggleDroneAirspace(enabled) {
        console.log('Airspace (At Ground) layer has been removed; ignoring toggle request.');
        this.isDroneAirspaceEnabled = false;
    }

    toggleAirspace(enabled) {
        console.log('Airspace (All) layer has been removed; ignoring toggle request.');
        this.isAirspaceEnabled = false;
    }
    showAirspaceAcknowledgment() {
        // Get the map panel to append modal to it
        const mapPanel = document.getElementById('map-panel');
        if (!mapPanel) {
            console.warn('Map panel not found, cannot show airspace acknowledgment');
            return;
        }
        
        // Create modal overlay - positioned relative to map panel
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 0;
            max-width: 420px;
            width: calc(100% - 40px);
            margin: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            overflow: hidden;
        `;

        modalContent.innerHTML = `
            <div style="
                background: #dc3545;
                color: white;
                padding: 16px;
                font-weight: bold;
                font-size: 18px;
                text-align: center;
                text-transform: uppercase;
            ">
                ⚠️ WARNING
            </div>
            <div style="padding: 18px 16px;">
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Airspace layer may be incomplete or outdated.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Some restricted or controlled airspace may not be displayed.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Source: <a href="https://www.openaip.net/map#7.69/48.9067/-123.3034" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">OpenAIP</a> (open-source, community-maintained).
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    You can request updates or contribute directly via the <a href="https://www.openaip.net" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">OpenAIP website</a>.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Eagle Eyes Search Inc. makes no guarantee as to the accuracy, completeness, or reliability of the airspace data displayed in this map. We assume no liability for how this information is used.
                </p>
                <p style="margin: 0 0 0 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Always consult your official local airspace authority before flight. <button id="localAirspaceAuthorityInfoBtn" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 12px; padding: 0 4px; vertical-align: middle; font-weight: bold;" title="View alternative airspace map">ℹ️</button>
                </p>
            </div>
            <div style="padding: 12px 16px 16px; display: flex; justify-content: center;">
                <button id="airspaceAcknowledgeBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 10px 28px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    min-width: 180px;
                ">Acknowledge & Continue</button>
            </div>
        `;

        modal.appendChild(modalContent);
        mapPanel.appendChild(modal);

        // Handle local airspace authority info button
        const localAuthorityInfoBtn = modalContent.querySelector('#localAirspaceAuthorityInfoBtn');
        localAuthorityInfoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAirspaceAuthorityInfoPopup(modal);
        });

        // Handle acknowledge button
        const acknowledgeBtn = modalContent.querySelector('#airspaceAcknowledgeBtn');
        acknowledgeBtn.addEventListener('click', () => {
            // Determine which layer was being toggled based on toggle state
            const droneAirspaceToggle = document.querySelector('#droneAirspaceToggle');
            const airspaceToggle = document.querySelector('#airspaceToggle');
            const airportsToggle = document.querySelector('#airportsToggle');
            
            if (droneAirspaceToggle && droneAirspaceToggle.checked) {
                this.droneAirspaceAcknowledged = true;
                this.isDroneAirspaceEnabled = true; // Set the enabled flag
                // Now enable the drone airspace layer
                if (!this.map.hasLayer(this.droneAirspaceLayer)) {
                    this.droneAirspaceLayer.addTo(this.map);
                }
                this.loadDroneAirspaceDataDebounced();
                // Track whether airports was already enabled before we turn on airspace
                this.airportsWasEnabledBeforeDroneAirspace = this.isAirportsEnabled;
                // Auto-enable airports
                if (!this.isAirportsEnabled) {
                    this.airportsAcknowledged = true; // Already shown
                    this.toggleAirports(true);
                }
            } else if (airspaceToggle && airspaceToggle.checked) {
                this.airspaceAcknowledged = true;
                this.isAirspaceEnabled = true; // Set the enabled flag
                // Now enable the airspace layer
                if (!this.map.hasLayer(this.airspaceLayer)) {
                    this.airspaceLayer.addTo(this.map);
                }
                this.loadAirspaceDataDebounced();
                // Track whether airports was already enabled before we turn on airspace
                this.airportsWasEnabledBeforeAirspace = this.isAirportsEnabled;
                // Auto-enable airports
                if (!this.isAirportsEnabled) {
                    this.airportsAcknowledged = true; // Already shown
                    this.toggleAirports(true);
                }
            } else if (airportsToggle && airportsToggle.checked) {
                this.airportsAcknowledged = true;
                this.isAirportsEnabled = true; // Set the enabled flag
                // Now enable the airports layer
                if (!this.map.hasLayer(this.airportsMarkerCluster)) {
                    this.airportsMarkerCluster.addTo(this.map);
                }
                this.loadAirportsDataDebounced();
            }
            
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // User clicked outside, disable the layer that was being toggled
                const droneAirspaceToggle = document.querySelector('#droneAirspaceToggle');
                const airspaceToggle = document.querySelector('#airspaceToggle');
                const airportsToggle = document.querySelector('#airportsToggle');
                
                if (droneAirspaceToggle && droneAirspaceToggle.checked) {
                    this.isDroneAirspaceEnabled = false;
                    droneAirspaceToggle.checked = false;
                } else if (airspaceToggle && airspaceToggle.checked) {
                    this.isAirspaceEnabled = false;
                    airspaceToggle.checked = false;
                } else if (airportsToggle && airportsToggle.checked) {
                    this.isAirportsEnabled = false;
                    airportsToggle.checked = false;
                }
                
                modal.remove();
            }
        });
    }

    async handleLocalAirspaceAuthorityClick(modal) {
        let lat, lng;

        // Check if geolocation is available
        if (!navigator.geolocation) {
            this.showLocationAccessDeniedMessage(modal);
            return;
        }

        // Check if we already have location from the user's location marker
        if (this.myLocationMarker) {
            const latlng = this.myLocationMarker.getLatLng();
            lat = latlng.lat;
            lng = latlng.lng;
            console.log('Using existing location:', lat, lng);
            await this.openAirspaceAuthorityUrl(lat, lng);
            return;
        }

        // Always try to get location - browser will prompt if permission not granted
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                lat = position.coords.latitude;
                lng = position.coords.longitude;
                console.log('Location obtained:', lat, lng);
                await this.openAirspaceAuthorityUrl(lat, lng);
                // Close the modal/popup if it exists
                if (modal && modal.parentElement) {
                    modal.remove();
                }
                // Also close any backdrop
                const backdrop = document.querySelector('div[style*="background: rgba(0, 0, 0, 0.3)"]');
                if (backdrop && backdrop.parentElement) {
                    backdrop.remove();
                }
            },
            (error) => {
                console.error('Location access error:', error);
                this.showLocationAccessDeniedMessage(modal);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    async openAirspaceAuthorityUrl(lat, lng) {
        try {
            // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'EagleEyes-Viewer/1.0' // Required by Nominatim
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Reverse geocoding failed');
            }

            const data = await response.json();
            const countryCode = data.address?.country_code?.toUpperCase();

            if (countryCode && this.airspaceAuthorityUrls[countryCode]) {
                // Open the country-specific airspace authority URL
                window.open(this.airspaceAuthorityUrls[countryCode], '_blank', 'noopener,noreferrer');
            } else {
                // Country not in our mapping yet
                alert('We don\'t currently have an airspace map available for your location. Please consult your local aviation authority for official airspace information.');
            }
        } catch (error) {
            console.error('Error getting country from location:', error);
            alert('We don\'t currently have an airspace map available for your location. Please consult your local aviation authority for official airspace information.');
        }
    }

    showAirspaceAuthorityInfoPopup(parentModal) {
        // Get the map panel to append modal to it
        const mapPanel = document.getElementById('map-panel');
        if (!mapPanel) {
            console.warn('Map panel not found, cannot show airspace authority info');
            return;
        }
        
        // Create a small info popup - positioned relative to map panel
        const infoPopup = document.createElement('div');
        infoPopup.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 320px;
            width: calc(100% - 40px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            z-index: 10001;
            font-family: Arial, sans-serif;
        `;

        infoPopup.innerHTML = `
            <div style="margin-bottom: 18px;">
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Open an alternative airspace map for your location.
                </p>
                <p style="margin: 0 0 0 0; line-height: 1.6; color: #666; font-size: 12px; font-style: italic;">
                    Note: This map may not be the authoritative source. Always verify with official authorities.
                </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="openAirspaceMapBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    width: 100%;
                ">Open Local Map</button>
                <button id="openDJIMapBtn" style="
                    background: #314268;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    width: 100%;
                ">See DJI GEO Zone Map</button>
                <button id="cancelInfoBtn" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    width: 100%;
                ">Cancel</button>
            </div>
        `;

        // Create backdrop first - positioned relative to map panel
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 10000;
        `;
        mapPanel.appendChild(backdrop);
        mapPanel.appendChild(infoPopup);

        // Handle cancel button
        const cancelBtn = infoPopup.querySelector('#cancelInfoBtn');
        cancelBtn.addEventListener('click', () => {
            if (backdrop.parentElement) {
                backdrop.remove();
            }
            if (infoPopup.parentElement) {
                infoPopup.remove();
            }
        });

        // Handle DJI GEO Zone Map button
        const openDJIMapBtn = infoPopup.querySelector('#openDJIMapBtn');
        openDJIMapBtn.addEventListener('click', () => {
            window.open('https://fly-safe.dji.com/nfz/nfz-query', '_blank', 'noopener,noreferrer');
            if (backdrop.parentElement) {
                backdrop.remove();
            }
            if (infoPopup.parentElement) {
                infoPopup.remove();
            }
        });

        // Handle open local map button
        const openMapBtn = infoPopup.querySelector('#openAirspaceMapBtn');
        openMapBtn.addEventListener('click', async () => {
            // Don't close the popup yet - let handleLocalAirspaceAuthorityClick show messages in it if needed
            // We'll pass the infoPopup as the modal so messages can be shown there
            await this.handleLocalAirspaceAuthorityClick(infoPopup);
        });
        
        // Close on background click
        backdrop.addEventListener('click', () => {
            if (infoPopup.parentElement) {
                infoPopup.remove();
            }
            if (backdrop.parentElement) {
                backdrop.remove();
            }
        });
    }

    showLocationAccessDeniedMessage(modal) {
        if (!modal) return;
        
        // Try to find the modal content - it might be the modal itself or a child
        let modalContent = modal;
        if (modal.querySelector) {
            const whiteBg = modal.querySelector('div[style*="background: white"]');
            if (whiteBg) {
                modalContent = whiteBg;
            } else if (modal.style && modal.style.background) {
                // Modal itself might be the content
                modalContent = modal;
            }
        }
        
        // Check if message already exists to avoid duplicates
        const existingMessage = modalContent.querySelector ? modalContent.querySelector('#locationAccessDeniedMessage') : null;
        if (existingMessage) {
            return; // Message already shown
        }

            const errorMessage = document.createElement('div');
        errorMessage.id = 'locationAccessDeniedMessage';
            errorMessage.style.cssText = `
                background: #fff3cd;
                border: 1px solid #ffc107;
                color: #856404;
                padding: 12px;
                border-radius: 4px;
                margin-top: 12px;
                font-size: 13px;
            `;
        
        const messageText = document.createElement('div');
        messageText.textContent = 'Grant location access to display local data.';
        errorMessage.appendChild(messageText);
        
        // Insert the message - try different locations
        if (modalContent.querySelector) {
            // Try to insert after the last paragraph
            const lastParagraph = modalContent.querySelector('p:last-of-type');
            if (lastParagraph && lastParagraph.parentElement) {
                lastParagraph.parentElement.insertBefore(errorMessage, lastParagraph.nextSibling);
            } else {
                // Insert after the content div or at the end
                const buttonContainer = modalContent.querySelector('div[style*="display: flex; flex-direction: column"]');
                if (buttonContainer && buttonContainer.parentElement) {
                    buttonContainer.parentElement.insertBefore(errorMessage, buttonContainer.nextSibling);
                } else {
                    modalContent.appendChild(errorMessage);
                }
            }
        } else {
            modalContent.appendChild(errorMessage);
        }
    }

    loadAirspaceDataDebounced() { return; }

    loadDroneAirspaceDataDebounced() { return; }

    async loadDroneAirspaceData() {
            return;
    }

    getOpenAIPProxyUrl() {
        // Use localhost for development, production URL for production
        // Check if we're on localhost or production domain
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:8081';
        } else {
            // Production: use relative path (same pattern as FAQ backend)
            // The proxy should be deployed on the same domain
            // This will work if proxy is at /openaip-proxy or handled by reverse proxy
            return `${window.location.protocol}//${window.location.host}/openaip-proxy`;
        }
    }

    // ===== USA FAA Airports Layer Methods =====

    toggleFAAAirports(enabled) {
        if (!this.faaAirportsLayer) {
            console.warn('USA FAA Airports layer not available. Esri Leaflet may not be loaded.');
            return;
        }

        if (enabled && !this.faaLayersAcknowledged.airports) {
            // Show acknowledgment modal if not already acknowledged
            this.showFAAAirspaceAcknowledgment('airports');
            return; // Will enable after acknowledgment
        }

        this.isFAAAirportsEnabled = enabled;

        if (enabled) {
            // Add layer to map
            if (!this.map.hasLayer(this.faaAirportsLayer)) {
                this.faaAirportsLayer.addTo(this.map);
            }
        } else {
            // Remove layer from map
            if (this.map.hasLayer(this.faaAirportsLayer)) {
                this.map.removeLayer(this.faaAirportsLayer);
            }
        }
    }
    // ===== Runways Layer Methods =====

    toggleRunways(enabled) {
        if (!this.runwaysLayer) {
            console.warn('Runways layer not available. Esri Leaflet may not be loaded.');
            return;
        }

        if (enabled && !this.faaLayersAcknowledged.runways) {
            // Show acknowledgment modal if not already acknowledged
            this.showFAAAirspaceAcknowledgment('runways');
            return; // Will enable after acknowledgment
        }

        this.isRunwaysEnabled = enabled;

        if (enabled) {
            // Add layer to map
            if (!this.map.hasLayer(this.runwaysLayer)) {
                this.runwaysLayer.addTo(this.map);
            }
        } else {
            // Remove layer from map
            if (this.map.hasLayer(this.runwaysLayer)) {
                this.map.removeLayer(this.runwaysLayer);
            }
        }
    }

    // ===== USA FAA UAS Map Layer Methods =====

    toggleFAAUASMap(enabled) {
        if (!this.faaUASMapLayer) {
            console.warn('FAA UAS Map layer not available. Esri Leaflet may not be loaded.');
            return;
        }

        if (enabled && !this.faaLayersAcknowledged.uas) {
            // Show acknowledgment modal if not already acknowledged
            this.showFAAAirspaceAcknowledgment('uas');
            return; // Will enable after acknowledgment
        }

        this.isFAAUASMapEnabled = enabled;

        if (enabled) {
            // Add layer to map
            if (!this.map.hasLayer(this.faaUASMapLayer)) {
                this.faaUASMapLayer.addTo(this.map);
            }
        } else {
            // Remove layer from map
            if (this.map.hasLayer(this.faaUASMapLayer)) {
                this.map.removeLayer(this.faaUASMapLayer);
            }
        }
    }

    // ===== USA FAA Airspace Layer Methods =====

    toggleFAAAirspace(enabled) {
        if (!this.faaAirspaceLayer) {
            console.warn('FAA Airspace layer not available. Esri Leaflet may not be loaded.');
            return;
        }

        if (enabled && !this.faaLayersAcknowledged.airspace) {
            // Show acknowledgment modal if not already acknowledged
            this.showFAAAirspaceAcknowledgment('airspace');
            return; // Will enable after acknowledgment
        }

        this.isFAAAirspaceEnabled = enabled;

        if (enabled) {
            // Add layer to map
            if (!this.map.hasLayer(this.faaAirspaceLayer)) {
                this.faaAirspaceLayer.addTo(this.map);
            }
        } else {
            // Remove layer from map
            if (this.map.hasLayer(this.faaAirspaceLayer)) {
                this.map.removeLayer(this.faaAirspaceLayer);
            }
        }
    }
    // ===== Beta Disclaimer =====
    
    showBetaDisclaimer() {
        // Only show once per session
        if (this.hasShownBetaDisclaimer) {
            return;
        }
        
        // Mark as shown
        this.hasShownBetaDisclaimer = true;
        
        // Get the map panel to append modal to it
        const mapPanel = document.getElementById('map-panel');
        if (!mapPanel) {
            console.warn('Map panel not found, cannot show beta disclaimer');
            return;
        }
        
        // Create modal overlay - will be positioned relative to map panel
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 10px;
            box-sizing: border-box;
            overflow-y: auto;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 0;
            max-width: 480px;
            width: calc(100% - 40px);
            max-height: calc(100vh - 40px);
            margin: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;

        modalContent.innerHTML = `
            <div style="
                background: #f59e0b;
                color: white;
                padding: 14px 16px;
                font-weight: bold;
                font-size: clamp(16px, 4vw, 18px);
                text-align: center;
                text-transform: uppercase;
                flex-shrink: 0;
            ">
                ⚠️ NOTICE
            </div>
            <div style="padding: 16px; overflow-y: auto; flex: 1; min-height: 0;">
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: clamp(13px, 3.5vw, 14px); word-wrap: break-word;">
                    This is a <span style="
                        display: inline-block;
                        background-color: #ffc107;
                        color: #000;
                        font-size: 0.7rem;
                        font-weight: 600;
                        padding: 0.2rem 0.4rem;
                        border-radius: 4px;
                        margin: 0 2px;
                        vertical-align: middle;
                    ">BETA</span> release of the Eagle Eyes Viewer.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: clamp(13px, 3.5vw, 14px); word-wrap: break-word;">
                    Map and drone data may not always reflect real-time conditions. Eagle Eyes Search Inc. accepts no liability for actions taken based on this information.
                </p>
                <p style="margin: 0 0 0 0; line-height: 1.6; color: #333; font-size: clamp(13px, 3.5vw, 14px); word-wrap: break-word;">
                    Always refer to regulations for your local jurisdiction and consult official airspace sources for current information. <button id="betaLocalAirspaceAuthorityInfoBtn" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 14px; padding: 4px 6px; vertical-align: middle; font-weight: bold; min-width: 24px; min-height: 24px; touch-action: manipulation;" title="View alternative airspace map">ℹ️</button>
                </p>
            </div>
            <div style="padding: 12px 16px 16px; display: flex; justify-content: center; flex-shrink: 0; border-top: 1px solid #e5e7eb;">
                <button id="betaAcknowledgeBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: clamp(13px, 3.5vw, 14px);
                    font-weight: 600;
                    min-width: 160px;
                    width: 100%;
                    max-width: 280px;
                    transition: background 0.2s;
                    touch-action: manipulation;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'" ontouchstart="this.style.background='#218838'" ontouchend="this.style.background='#28a745'">Acknowledge & Continue</button>
            </div>
        `;

        modal.appendChild(modalContent);
        mapPanel.appendChild(modal);

        // Handle local airspace authority info button
        const localAuthorityInfoBtn = modalContent.querySelector('#betaLocalAirspaceAuthorityInfoBtn');
        localAuthorityInfoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAirspaceAuthorityInfoPopup(modal);
        });

        // Handle acknowledge button
        const acknowledgeBtn = modalContent.querySelector('#betaAcknowledgeBtn');
        acknowledgeBtn.addEventListener('click', () => {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(this.betaDisclaimerStorageKey, 'true');
                }
            } catch (error) {
                console.warn('Unable to persist beta disclaimer acknowledgment:', error);
            }
            modal.remove();
        });
    }
    
    // Check if map is visible and show beta disclaimer if needed
    checkMapVisibilityAndShowDisclaimer() {
        // Check if map container is visible
        const mapContainer = document.getElementById('map');
        const mapPanel = document.getElementById('map-panel');
        
        if (!mapContainer || !mapPanel) {
            return;
        }
        
        // Check if map panel is visible
        const mapPanelStyle = window.getComputedStyle(mapPanel);
        const isMapPanelVisible = mapPanelStyle.display !== 'none' && 
                                  mapPanelStyle.visibility !== 'hidden' &&
                                  mapPanelStyle.opacity !== '0';
        
        // Check if map container is visible
        const mapContainerStyle = window.getComputedStyle(mapContainer);
        const isMapContainerVisible = mapContainerStyle.display !== 'none' &&
                                      mapContainerStyle.visibility !== 'hidden' &&
                                      mapContainerStyle.opacity !== '0';
        
        // If map is visible and we haven't shown the disclaimer yet, show it
        if (isMapPanelVisible && isMapContainerVisible && !this.hasShownBetaDisclaimer) {
            // Small delay to ensure map is fully rendered
            setTimeout(() => {
                this.showBetaDisclaimer();
            }, 300);
        }
    }
    // ===== USA FAA Layers Disclaimer =====

    showFAAAirspaceAcknowledgment(layerType) {
        // Get the map panel to append modal to it
        const mapPanel = document.getElementById('map-panel');
        if (!mapPanel) {
            console.warn('Map panel not found, cannot show FAA airspace acknowledgment');
            return;
        }
        
        // Create modal overlay - positioned relative to map panel
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 0;
            max-width: 420px;
            width: calc(100% - 40px);
            margin: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            overflow: hidden;
        `;

        modalContent.innerHTML = `
            <div style="
                background: #dc3545;
                color: white;
                padding: 16px;
                font-weight: bold;
                font-size: 18px;
                text-align: center;
                text-transform: uppercase;
            ">
                ⚠️ WARNING
            </div>
            <div style="padding: 18px 16px;">
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Airspace layer may be incomplete or outdated.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Some restricted or controlled airspace may not be displayed.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Source: <a href="https://adds-faa.opendata.arcgis.com/" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">Federal Aviation Authority</a>.
                </p>
                <p style="margin: 0 0 12px 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Eagle Eyes Search Inc. makes no guarantee as to the accuracy, completeness, or reliability of the airspace data displayed in this map. We assume no liability for how this information is used.
                </p>
                <p style="margin: 0 0 0 0; line-height: 1.6; color: #333; font-size: 14px;">
                    Always consult your official local airspace authority before flight. <button id="faaLocalAirspaceAuthorityInfoBtn" style="background: none; border: none; color: #0066cc; cursor: pointer; font-size: 12px; padding: 0 4px; vertical-align: middle; font-weight: bold;" title="View alternative airspace map">ℹ️</button>
                </p>
            </div>
            <div style="padding: 12px 16px 16px; display: flex; justify-content: center;">
                <button id="faaAcknowledgeBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 10px 28px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    min-width: 180px;
                ">Acknowledge & Continue</button>
            </div>
        `;

        modal.appendChild(modalContent);
        mapPanel.appendChild(modal);

        // Handle local airspace authority info button
        const localAuthorityInfoBtn = modalContent.querySelector('#faaLocalAirspaceAuthorityInfoBtn');
        if (localAuthorityInfoBtn) {
        localAuthorityInfoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAirspaceAuthorityInfoPopup(modal);
        });
        }

        // Handle acknowledge button
        const acknowledgeBtn = modalContent.querySelector('#faaAcknowledgeBtn');
        acknowledgeBtn.addEventListener('click', () => {
            // Mark only this specific layer as acknowledged
            if (layerType === 'runways') {
                this.faaLayersAcknowledged.runways = true;
            } else if (layerType === 'uas') {
                this.faaLayersAcknowledged.uas = true;
            } else if (layerType === 'airspace') {
                this.faaLayersAcknowledged.airspace = true;
            } else if (layerType === 'airports') {
                this.faaLayersAcknowledged.airports = true;
            }
            
            // Enable the layer that was being toggled
            const runwaysToggle = document.querySelector('#runwaysToggle');
            const faaUASMapToggle = document.querySelector('#faaUASMapToggle');
            const faaAirspaceToggle = document.querySelector('#faaAirspaceToggle');
            const faaAirportsToggle = document.querySelector('#faaAirportsToggle');
            
            if (layerType === 'runways' && runwaysToggle && runwaysToggle.checked) {
                this.isRunwaysEnabled = true;
                if (!this.map.hasLayer(this.runwaysLayer)) {
                    this.runwaysLayer.addTo(this.map);
                }
            } else if (layerType === 'uas' && faaUASMapToggle && faaUASMapToggle.checked) {
                this.isFAAUASMapEnabled = true;
                if (!this.map.hasLayer(this.faaUASMapLayer)) {
                    this.faaUASMapLayer.addTo(this.map);
                }
            } else if (layerType === 'airspace' && faaAirspaceToggle && faaAirspaceToggle.checked) {
                this.isFAAAirspaceEnabled = true;
                if (!this.map.hasLayer(this.faaAirspaceLayer)) {
                    this.faaAirspaceLayer.addTo(this.map);
                }
            } else if (layerType === 'airports' && faaAirportsToggle && faaAirportsToggle.checked) {
                this.isFAAAirportsEnabled = true;
                if (!this.map.hasLayer(this.faaAirportsLayer)) {
                    this.faaAirportsLayer.addTo(this.map);
                }
            }
            
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // User clicked outside, disable the layer that was being toggled
                const runwaysToggle = document.querySelector('#runwaysToggle');
                const faaUASMapToggle = document.querySelector('#faaUASMapToggle');
                const faaAirspaceToggle = document.querySelector('#faaAirspaceToggle');
                const faaAirportsToggle = document.querySelector('#faaAirportsToggle');
                
                if (layerType === 'runways' && runwaysToggle) {
                    this.isRunwaysEnabled = false;
                    runwaysToggle.checked = false;
                } else if (layerType === 'uas' && faaUASMapToggle) {
                    this.isFAAUASMapEnabled = false;
                    faaUASMapToggle.checked = false;
                } else if (layerType === 'airspace' && faaAirspaceToggle) {
                    this.isFAAAirspaceEnabled = false;
                    faaAirspaceToggle.checked = false;
                } else if (layerType === 'airports' && faaAirportsToggle) {
                    this.isFAAAirportsEnabled = false;
                    faaAirportsToggle.checked = false;
                }
                
                modal.remove();
            }
        });
    }

    // ===== Airports/Heliports Layer Methods =====
    
    toggleAirports(enabled) {
        console.log('Airports/Heliports layer has been removed; ignoring toggle request.');
        this.isAirportsEnabled = false;
    }

    // ===== OpenSky ADS-B Aircraft Layer Methods =====
    
    toggleOpenSky(enabled) {
        if (this.openSkyUpdateInterval) {
            clearInterval(this.openSkyUpdateInterval);
            this.openSkyUpdateInterval = null;
        }
        this.isOpenSkyEnabled = false;
        console.log('OpenSky ADS-B layer has been removed; ignoring toggle request.');
    }
    
    getNextCreditsResetTime() {
        return new Date();
    }
    
    async fetchOpenSkyData() {
        return;
    }
    
    updateOpenSkyAircraft(states, timestamp) {
        const currentIcaos = new Set();
        const now = Date.now();
        
        // Don't clear markers - we'll update them in place
        // this.openSkyMarkerCluster.clearLayers(); // REMOVED to prevent clearing
        
        states.forEach(state => {
            // State vector format: [icao24, callsign, origin_country, time_position, last_contact, 
            //                       longitude, latitude, baro_altitude, on_ground, velocity, 
            //                       true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
            const [
                icao24, callsign, origin_country, time_position, last_contact,
                longitude, latitude, baro_altitude, on_ground, velocity,
                true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source
            ] = state;
            
            // Skip if no position data or aircraft is on ground
            if (latitude == null || longitude == null || on_ground) {
                return;
            }
            
            currentIcaos.add(icao24);
            
            const aircraftData = {
                callsign: callsign ? callsign.trim() : icao24,
                latitude,
                longitude,
                geo_altitude,
                baro_altitude,
                true_track,
                velocity,
                vertical_rate,
                origin_country,
                last_contact,
                timestamp
            };
            
            // Update aircraft position trail (disabled)
            this.updateAircraftTrail(icao24, latitude, longitude, now);
            
            // If this aircraft has a visible historical track, append new position to it
            this.appendToHistoricalTrack(icao24, latitude, longitude);
            
            // Create or update aircraft marker
            this.createOrUpdateOpenSkyAircraftMarker(icao24, aircraftData);
        });
        
        // Clean up trails for aircraft that are no longer present
        // But keep the trails visible for a while
        this.cleanupOldAircraftTrails(currentIcaos, now);
        
        console.log(`OpenSky: Rendered ${currentIcaos.size} aircraft markers`);
    }
    
    updateAircraftTrail(icao24, latitude, longitude, timestamp) {
        // Trail feature disabled per user request
        // Keeping structure for potential future re-enable
        return;
    }
    
    appendToHistoricalTrack(icao24, latitude, longitude) {
        // Check if this aircraft has a visible historical track
        const trackData = this.openSkyAircraftTracks.get(icao24);
        
        if (!trackData || !trackData.isVisible || !trackData.polyline) {
            return; // No track to append to
        }
        
        // Get current path
        const currentPath = trackData.path || [];
        
        // Check if this position is new (different from last position)
        const lastPos = currentPath[currentPath.length - 1];
        if (lastPos && lastPos[0] === latitude && lastPos[1] === longitude) {
            return; // Same position, don't add duplicate
        }
        
        // Append new position
        currentPath.push([latitude, longitude]);
        trackData.path = currentPath;
        
        // Update the polyline on the map
        trackData.polyline.setLatLngs(currentPath);
        
        console.log(`Appended position to track for ${icao24}, total positions: ${currentPath.length}`);
    }
    
    cleanupOldAircraftTrails(currentIcaos, now) {
        // Trail feature disabled per user request
        // Remove markers for aircraft no longer present
        const markersToRemove = [];
        this.openSkyAircraftMarkers.forEach((marker, icao24) => {
            if (!currentIcaos.has(icao24)) {
                // Remove marker from cluster
                this.openSkyMarkerCluster.removeLayer(marker);
                markersToRemove.push(icao24);
            }
        });
        
        // Clean up marker references
        markersToRemove.forEach(icao24 => {
            this.openSkyAircraftMarkers.delete(icao24);
        });
    }
    
    createOrUpdateOpenSkyAircraftMarker(icao24, aircraftData) {
        const { callsign, latitude, longitude, geo_altitude, true_track } = aircraftData;
        
        // Create aircraft icon (rotated based on heading)
        // The airplane emoji is oriented at ~45 degrees by default, so subtract 45 to compensate
        const rotation = true_track != null ? (true_track - 45) : -45;
        
        const aircraftIcon = L.divIcon({
            html: `<div style="transform: rotate(${rotation}deg); font-size: 24px; line-height: 1;">✈️</div>`,
            className: 'opensky-aircraft-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
        
        // Check if marker already exists
        let marker = this.openSkyAircraftMarkers.get(icao24);
        
        if (marker) {
            // Update existing marker position and icon
            marker.setLatLng([latitude, longitude]);
            marker.setIcon(aircraftIcon);
            
            // Update popup content only if popup is open
            // This prevents triggering popupclose event during routine updates
            if (marker.isPopupOpen()) {
                const popupContent = this.generateAircraftPopupContent(icao24, aircraftData);
                marker.setPopupContent(popupContent);
            }
        } else {
            // Create new marker
            marker = L.marker([latitude, longitude], {
                icon: aircraftIcon,
                title: callsign || icao24
            });
            
            // Bind popup with aircraft information
            const popupContent = this.generateAircraftPopupContent(icao24, aircraftData);
            marker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'aircraft-popup'
            });
            
            // Store marker
            this.openSkyAircraftMarkers.set(icao24, marker);
        }
        
        // Add marker to cluster (will update if already exists)
        this.openSkyMarkerCluster.addLayer(marker);
        
        // Store aircraft data
        this.openSkyAircraftData.set(icao24, aircraftData);
    }
    
    async toggleAircraftTrack(icao24) {
        console.log('OpenSky aircraft tracks have been removed; ignoring toggle request.');
    }
    
    async showAircraftTrack(icao24) {
        console.log('OpenSky aircraft tracks have been removed; ignoring track display request.');
    }
    
    hideAircraftTrack(icao24) {
        return;
    }
    
    hideAllAircraftTracks() {
        return;
    }
    
    showTrackPopup(icao24, latlng) {
        return;
    }
    
    removeAircraftTrack(icao24) {
        return;
    }
    generateAircraftPopupContent(icao24, data) {
        const {
            callsign, origin_country, geo_altitude, baro_altitude,
            velocity, vertical_rate, true_track, last_contact
        } = data;
        
        const altitudeText = geo_altitude != null ? `${geo_altitude.toFixed(0)} m` : 
                            baro_altitude != null ? `${baro_altitude.toFixed(0)} m (baro)` : 'N/A';
        const headingText = true_track != null ? `${true_track.toFixed(1)}°` : 'N/A';
        const velocityText = velocity != null ? `${velocity.toFixed(1)} m/s` : 'N/A';
        const verticalRateText = vertical_rate != null ? `${vertical_rate.toFixed(1)} m/s` : 'N/A';
        
        // Format last contact time
        let lastContactText = 'N/A';
        if (last_contact) {
            const lastContactDate = new Date(last_contact * 1000);
            const now = new Date();
            const secondsAgo = Math.floor((now - lastContactDate) / 1000);
            lastContactText = secondsAgo < 60 ? `${secondsAgo}s ago` : 
                            secondsAgo < 3600 ? `${Math.floor(secondsAgo / 60)}m ago` : 
                            `${Math.floor(secondsAgo / 3600)}h ago`;
        }
        
        // Check if track is currently shown
        const trackData = this.openSkyAircraftTracks.get(icao24);
        const trackButtonText = trackData?.isVisible ? 'Hide Aircraft Track' : 'Show Aircraft Track';
        const trackButtonBg = trackData?.isVisible ? '#dc3545' : '#314268';
        
        return `
            <div style="min-width: 200px;">
                <strong style="font-size: 1.1em;">${callsign || icao24}</strong><br><br>
                <strong>ICAO24:</strong> <a href="https://map.opensky-network.org/?icao=${icao24}" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">${icao24}</a><br>
                <strong>Country:</strong> ${origin_country || 'N/A'}<br>
                <strong>Altitude:</strong> ${altitudeText}<br>
                <strong>Heading:</strong> ${headingText}<br>
                <strong>Velocity:</strong> ${velocityText}<br>
                <strong>Vertical Rate:</strong> ${verticalRateText}<br>
                <strong>Last Contact:</strong> ${lastContactText}<br><br>
                <button onclick="window.droneMap.toggleAircraftTrack('${icao24}'); return false;" style="
                    background: ${trackButtonBg};
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    width: 100%;
                    margin-top: 4px;
                ">${trackButtonText}</button>
            </div>
        `;
    }
    
    showCreditsDisplay() { return; }
    
    updateCreditsDisplay() { return; }
    
    hideCreditsDisplay() { return; }
    
    showOpenSkyRateLimitWarning() { return; }
    
    showOpenSkyAcknowledgment() { return; }

    loadAirportsDataDebounced() {
        return;
    }

    getAirportTypeCategory(typeCode) {
        // Map OpenAIP airport type codes to display categories
        const typeMap = {
            0: 'Airport',
            2: 'Airfield Civil',
            3: 'International Airport',
            4: 'Heliport Military',
            5: 'Military Aerodrome',
            7: 'Heliport Civil',
            9: 'Airport or Airfield IFR',
            10: 'Water Aerodrome',
            11: 'Landing Strip',
            13: 'Altiport'
        };
        return typeMap[typeCode] || 'Airport'; // Generic fallback
    }
    getAirportIconSize(typeCode, runways) {
        // Determine icon size based on type and runway length
        let size = 'medium'; // Default
        
        // Check runway length if available
        if (runways && Array.isArray(runways) && runways.length > 0) {
            // Find longest runway
            let maxLength = 0;
            runways.forEach(rwy => {
                if (rwy.length && rwy.length.value) {
                    const lengthM = rwy.length.unit === 0 ? rwy.length.value : 
                                   (rwy.length.unit === 1 ? rwy.length.value * 0.3048 : 0); // Convert feet to meters if needed
                    maxLength = Math.max(maxLength, lengthM);
                }
            });
            
            if (maxLength >= 2500) {
                size = 'large';
            } else if (maxLength >= 1000) {
                size = 'medium';
            } else {
                size = 'small';
            }
        } else {
            // Use type-based sizing if no runway data
            if (typeCode === 3 || typeCode === 9) {
                // International Airport or IFR Airport
                size = 'large';
            } else if (typeCode === 0 || typeCode === 2 || typeCode === 5 || typeCode === 4 || typeCode === 7 || typeCode === 10) {
                // Airport, Airfield Civil, Military Aerodrome, Heliport Military, Heliport Civil, Water Aerodrome
                size = 'medium';
            } else if (typeCode === 11 || typeCode === 13) {
                // Landing Strip, Altiport
                size = 'small';
            } else {
                // Unknown type - default to medium to ensure airports match heliport visibility
                size = 'medium';
            }
        }
        
        return size;
    }

    createAirportIcon(typeCode, size, runways) {
        // Create icon based on type and size
        const category = this.getAirportTypeCategory(typeCode);
        const iconSize = this.getAirportIconSize(typeCode, runways);
        
        // Size definitions
        const sizes = {
            small: { width: 20, height: 20 },
            medium: { width: 28, height: 28 },
            large: { width: 36, height: 36 }
        };
        
        const { width, height } = sizes[iconSize] || sizes.medium;
        
        // Icon symbols - using single Unicode character symbols
        // One symbol per map point for better performance and compatibility
        let iconSymbol = '✈️'; // Default airport icon (U+2708 AIRPLANE)
        
        if (typeCode === 7 || typeCode === 4) {
            // Heliport Civil or Military
            iconSymbol = '🚁'; // Helicopter (U+1F681, single Unicode character)
        } else if (typeCode === 10) {
            // Water Aerodrome
            iconSymbol = '🛩️'; // Small Airplane (U+1F6E9, single Unicode character)
        } else {
            // Airport, Airfield, Landing Strip, Altiport, etc.
            iconSymbol = '✈️'; // Airplane (U+2708, single Unicode character)
        }
        
        // Create colored icon using DivIcon (could be replaced with SVG icons)
        return L.divIcon({
            className: 'airport-icon',
            html: `<div style="
                width: ${width}px;
                height: ${height}px;
                background-color: #dc3545;
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${Math.round(width * 0.6)}px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${iconSymbol}</div>`,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2],
            popupAnchor: [0, -height / 2]
        });
    }
    async loadAirportsData() {
            return;
        }
    showLoadingMessage(layerName, bannerId = null) {
        // Map layer names to display names
        const displayNames = {
            'airspace': 'Open AIP Airspace (All)',
            'droneAirspace': 'Open AIP Airspace (At Ground)',
            'faaAirports': 'USA FAA Airports',
            'faaRunways': 'USA FAA Runways',
            'faaUASMap': 'USA FAA UAS Map',
            'faaAirspace': 'USA FAA Airspace',
            'openSky': 'OpenSky ADS-B Aircraft'
        };
        const displayName = displayNames[layerName] || layerName;
        
        // Use provided bannerId or generate one from layerName
        const id = bannerId || `${layerName}Loading`;
        
        // Remove any existing loading message for this layer
        const existingDiv = document.getElementById(id);
        if (existingDiv) {
            existingDiv.remove();
        }
        
        // Get the map panel to append banner to it
        const mapPanel = document.getElementById('map-panel');
        if (!mapPanel) {
            console.warn('Map panel not found, cannot show loading message');
            return;
        }
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = id;
        loadingDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(13, 110, 253, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            z-index: 1999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
            max-width: 90%;
            text-align: center;
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        loadingDiv.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
            <span>Loading ${displayName}...</span>
        `;
        
        // Add spinning animation style if not already present
        if (!document.getElementById('airspaceLoadingStyle')) {
            const style = document.createElement('style');
            style.id = 'airspaceLoadingStyle';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        mapPanel.appendChild(loadingDiv);
    }
    
    hideLoadingMessage(layerName, bannerId = null) {
        const id = bannerId || `${layerName}Loading`;
        const loadingDiv = document.getElementById(id);
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    showAirspaceLoadingMessage(layerName = 'airspace') {
        this.showLoadingMessage(layerName, 'airspaceLoading');
    }
    
    hideAirspaceLoadingMessage() {
        this.hideLoadingMessage('airspace', 'airspaceLoading');
    }

    createAirportCircle(coordinates, radiusNM, properties) {
        // Convert NM to meters (1 NM = 1852 m)
        const radiusM = radiusNM * 1852;
        
        // Create a circle polygon approximation
        const center = [coordinates[1], coordinates[0]]; // [lat, lng]
        const points = 64; // Number of points in circle
        const circleCoords = [];
        
        for (let i = 0; i <= points; i++) {
            const angle = (i * 360 / points) * (Math.PI / 180);
            const lat = center[0] + (radiusM / 111320) * Math.cos(angle);
            const lng = center[1] + (radiusM / (111320 * Math.cos(center[0] * Math.PI / 180))) * Math.sin(angle);
            circleCoords.push([lng, lat]);
        }
        
        // Close the circle
        circleCoords.push(circleCoords[0]);

        // Mark as unknown radius if original properties didn't have radius
        const unknownRadius = !properties.radius || properties.radius === null;

        return {
            type: 'Feature',
            id: properties.id || `airport-${coordinates[0]}-${coordinates[1]}`,
            geometry: {
                type: 'Polygon',
                coordinates: [circleCoords]
            },
            properties: {
                ...properties,
                type: 'AIRPORT',
                radius: radiusNM,
                unknownRadius: unknownRadius
            }
        };
    }

    getDroneAirspaceStyle(feature) {
        // Style for drone airspace layer
        const props = feature.properties || {};
        const fillOpacity = 0.25;
        
        // Class C, F, and D get red, everything else gets orange
        const icaoClassNumeric = props.icaoClassNumeric;
        const icaoClass = props.icaoClass;
        let color = '#fd7e14'; // Default orange
        
        if (icaoClassNumeric !== undefined && icaoClassNumeric !== null) {
            if (icaoClassNumeric === 2 || icaoClassNumeric === 5 || icaoClassNumeric === 3) {
                // Class C (2), F (5), or D (3) - red
                color = '#dc3545';
            }
        } else if (icaoClass) {
            // Fallback to string ICAO class
            const classUpper = String(icaoClass).toUpperCase();
            if (classUpper === 'C' || classUpper === 'F' || classUpper === 'D') {
                color = '#dc3545';
            }
        }
        
        return {
            fillColor: color,
            fillOpacity: fillOpacity,
            color: color,
            weight: 2,
            opacity: 0.9
        };
    }

    getAirspaceStyle(feature) {
        const props = feature.properties || {};
        const fillOpacity = 0.25;
        let color = '#808080'; // Default gray for unclassified
        
        // Color by ICAO class for debugging visibility
        const icaoClassNumeric = props.icaoClassNumeric;
        const icaoClass = props.icaoClass;
        
        // Map ICAO class to colors:
        // Class A (0): red
        // Class B (1): orange
        // Class C (2): yellow
        // Class D (3): green
        // Class E (4): cyan
        // Class F (5): magenta
        // Class G (6): blue
        // Unclassified (8): gray
        
        if (icaoClassNumeric !== undefined && icaoClassNumeric !== null) {
            switch (icaoClassNumeric) {
                case 0: // Class A
                    color = '#dc3545'; // Red
                    break;
                case 1: // Class B
                    color = '#fd7e14'; // Orange
                    break;
                case 2: // Class C
                    color = '#ffc107'; // Yellow
                    break;
                case 3: // Class D
                    color = '#28a745'; // Green
                    break;
                case 4: // Class E
                    color = '#17a2b8'; // Cyan
                    break;
                case 5: // Class F
                    color = '#e83e8c'; // Magenta
                    break;
                case 6: // Class G
                    color = '#0066cc'; // Blue
                    break;
                case 8: // Unclassified
                    color = '#808080'; // Gray
                    break;
                default:
                    color = '#808080'; // Gray for unknown numeric classes
            }
        } else if (icaoClass) {
            // Fallback to string ICAO class if numeric not available
            const classUpper = String(icaoClass).toUpperCase();
            if (classUpper === 'A') color = '#dc3545';
            else if (classUpper === 'B') color = '#fd7e14';
            else if (classUpper === 'C') color = '#ffc107';
            else if (classUpper === 'D') color = '#28a745';
            else if (classUpper === 'E') color = '#17a2b8';
            else if (classUpper === 'F') color = '#e83e8c';
            else if (classUpper === 'G') color = '#0066cc';
            else color = '#808080';
        }

        return {
            fillColor: color,
            fillOpacity: fillOpacity,
            color: color,
            weight: 2,
            opacity: 0.9 // Darker outline
        };
    }
    highlightAirspaceLayer(leafletLayer, feature, isDroneAirspace) {
        // Unhighlight previous layer if any
        if (this.highlightedAirspaceLayer) {
            this.unhighlightAirspaceLayer();
        }
        
        // Set new highlighted layer with metadata
        this.highlightedAirspaceLayer = {
            layer: leafletLayer,
            feature: feature,
            isDroneAirspace: isDroneAirspace || false,
            isFaaLayer: leafletLayer?.faaLayerType !== undefined
        };
        
        // Apply highlight style (thicker border, brighter fill)
        if (leafletLayer && leafletLayer.setStyle) {
            const props = feature.properties || {};
            
            // Get base color based on layer type
            let baseColor = '#808080';
            if (isDroneAirspace) {
                baseColor = '#9333ea';
            } else if (props.icaoClassNumeric !== undefined) {
                baseColor = this.getAirspaceColor(props.icaoClassNumeric);
            } else if (leafletLayer.faaLayerType === 'runways') {
                baseColor = '#0066cc';
            } else if (leafletLayer.faaLayerType === 'uas') {
                baseColor = '#ff8800';
            } else if (leafletLayer.faaLayerType === 'airspace') {
                // Get color based on CLASS_CODE field
                const classCode = props.CLASS_CODE || props.class_code || props.CLASS || props.class || '';
                baseColor = this.getFAAAirspaceClassCodeColor(classCode);
            }
            
            // Store original style for restoration
            if (!leafletLayer._originalStyle) {
                const codeUpper = String(props.CLASS_CODE || props.class_code || '').toUpperCase().trim();
                const originalDashArray = (codeUpper === 'D') ? '5, 5' : null;
                
                leafletLayer._originalStyle = {
                    color: leafletLayer.options?.color || props.color || baseColor,
                    weight: leafletLayer.options?.weight || props.weight || 1,
                    fillOpacity: leafletLayer.options?.fillOpacity || props.fillOpacity || 0.2,
                    dashArray: leafletLayer.options?.dashArray || originalDashArray
                };
            }
            
            leafletLayer.setStyle({
                weight: 8, // Much thicker border so it shows through layers
                opacity: 1.0,
                fillOpacity: 0.6, // More opaque fill for visibility
                color: '#00d9ff', // Bright turquoise/cyan highlight color
                fillColor: baseColor,
                dashArray: null // No dash for highlight
            });
            
            // Bring to front to ensure it shows above other layers
            if (leafletLayer.bringToFront) {
                leafletLayer.bringToFront();
            }
        }
    }

    getAirspaceColor(icaoClassNumeric) {
        // Helper to get base color for airspace class
        switch (icaoClassNumeric) {
            case 0: return '#dc3545'; // Red
            case 1: return '#fd7e14'; // Orange
            case 2: return '#ffc107'; // Yellow
            case 3: return '#28a745'; // Green
            case 4: return '#17a2b8'; // Cyan
            case 5: return '#e83e8c'; // Magenta
            case 6: return '#0066cc'; // Blue
            case 8: return '#808080'; // Gray
            default: return '#808080';
        }
    }
    
    getFAAAirspaceColor(airspaceClass) {
        // Map FAA airspace CLASS values to colors (matching ICAO standard)
        const classUpper = String(airspaceClass).toUpperCase().trim();
        
        switch (classUpper) {
            case 'A': return '#dc3545'; // Red
            case 'B': return '#fd7e14'; // Orange
            case 'C': return '#ffc107'; // Yellow
            case 'D': return '#28a745'; // Green
            case 'E': return '#17a2b8'; // Cyan
            case 'F': return '#e83e8c'; // Magenta
            case 'G': return '#0066cc'; // Blue
            default: return '#808080'; // Gray for unknown/unclassified
        }
    }
    
    getFAAAirspaceClassCodeColor(classCode) {
        // Map FAA airspace CLASS_CODE values to colors based on user's specification
        // Class B = blue, Class C = magenta/purple, Class D = blue (dashed), Class E = magenta/blue (shaded)
        const codeUpper = String(classCode).toUpperCase().trim();
        
        switch (codeUpper) {
            case 'B': return '#0066cc'; // Blue
            case 'C': return '#e83e8c'; // Magenta/Purple
            case 'D': return '#0066cc'; // Blue (dashed - handled by style)
            case 'E': return '#e83e8c'; // Magenta (shaded - handled by fillOpacity)
            default: return '#808080'; // Gray for unknown/unclassified
        }
    }

    unhighlightAirspaceLayer() {
        if (this.highlightedAirspaceLayer) {
            const { layer, feature, isDroneAirspace, isFaaLayer } = this.highlightedAirspaceLayer;
            
            // Restore original style
            if (layer && layer.setStyle) {
                if (isFaaLayer && layer._originalStyle) {
                    // Restore original style for FAA layers
                    layer.setStyle(layer._originalStyle);
                } else if (isDroneAirspace) {
                    const style = this.getDroneAirspaceStyle(feature);
                    layer.setStyle(style);
                } else {
                    const style = this.getAirspaceStyle(feature);
                layer.setStyle(style);
                }
            }
            
            this.highlightedAirspaceLayer = null;
        }
    }

    formatAltitudeWithDatum(value, unit, referenceDatum) {
        // Format altitude with reference datum (MSL, GND, etc.)
        // Value should be raw value from OpenAIP, unit indicates original unit
        if (value === null || value === undefined || (typeof value === 'number' && !isFinite(value))) {
            return 'N/A';
        }
        
        // Handle ground/surface
        if (value === 'GND' || (value === 0 && referenceDatum === 0)) {
            return 'Ground/Surface';
        }
        
        let displayValue = value;
        let displayUnit = unit || 'FT';
        
        // Format based on original unit
        if (unit === 'M') {
            // Meters - show as-is
            displayValue = Math.round(value);
            displayUnit = 'M';
        } else if (unit === 'FT') {
            // Feet - show as-is
            displayValue = Math.round(value);
            displayUnit = 'FT';
        } else if (unit === 'FL') {
            // Flight level - value is already the FL number (e.g., 100 for FL100)
            displayValue = `FL${Math.round(value)}`;
            displayUnit = '';
        } else {
            // Default to feet if no unit specified
            displayValue = Math.round(value);
            displayUnit = 'FT';
        }
        
        // Add reference datum
        let datum = '';
        if (referenceDatum !== undefined) {
            if (referenceDatum === 0) datum = ' GND';
            else if (referenceDatum === 1) datum = ' MSL';
        }
        
        return `${displayValue} ${displayUnit}${datum}`.trim();
    }

    convertToFeet(value, unit) {
        // Convert to feet: meters→feet, FL→feet (×100), ground/surface = 0ft
        if (!value && value !== 0) return null;
        
        if (value === 'GND' || value === 'SFC' || value === 0 || value === '0') {
            return 0;
        }
        
        if (unit === 'FL' || (typeof value === 'string' && value.toString().includes('FL'))) {
            // Flight level: FL100 = 10,000 ft (100 ft per FL)
            const flStr = value.toString().replace('FL', '').trim();
            const fl = parseInt(flStr);
            if (!isNaN(fl)) {
                return fl * 100;
            }
        } else if (unit === 'M' || unit === 'meters' || unit === 'm') {
            // Meters to feet: 1m = 3.28084 ft
            return value * 3.28084;
        } else if (unit === 'FT' || unit === 'feet' || unit === 'ft') {
            return value;
        }
        
        // If no unit specified, assume feet
        return typeof value === 'number' ? value : null;
    }

    formatAltitude(value, unit) {
        const feet = this.convertToFeet(value, unit);
        if (feet === null) return 'N/A';
        if (feet === 0) return '0 ft (Ground/Surface)';
        return `${Math.round(feet)} ft`;
    }

    addLongPressHandler() {
        const LONG_PRESS_DURATION_MS = 1800;
        let pressTimer = null;
        let pressStartPos = null;
        let initialLatLng = null;
        
        const clearPressState = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            pressStartPos = null;
            initialLatLng = null;
        };
        
        this.map.on('mousedown', (e) => {
            clearPressState();
            pressTimer = window.setTimeout(() => {
                this.createCoordinateMarker(e.latlng);
                clearPressState();
            }, LONG_PRESS_DURATION_MS);
        });
        
        this.map.on('mouseup', clearPressState);
        this.map.on('mouseleave', clearPressState);
        this.map.on('mousemove', clearPressState);
        
        this.map.on('contextmenu', (e) => {
            if (e.originalEvent?.preventDefault) {
                e.originalEvent.preventDefault();
            }
            this.createCoordinateMarker(e.latlng);
        });
        
        const mapContainer = this.map.getContainer();
        if (!mapContainer) return;
        
        const isInteractiveMapTarget = (target) => {
            if (!target) return false;
            if (target.closest('.leaflet-control')) return false;
            return !!target.closest('.leaflet-container');
        };
        
        mapContainer.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1 || !isInteractiveMapTarget(event.target)) {
                clearPressState();
                return;
            }
            
            const touch = event.touches[0];
            pressStartPos = { x: touch.clientX, y: touch.clientY };
            
            const containerPoint = this.map.mouseEventToContainerPoint(touch);
            initialLatLng = this.map.containerPointToLatLng(containerPoint);
            
            clearPressState();
            pressTimer = window.setTimeout(() => {
                if (initialLatLng) {
                    this.createCoordinateMarker(initialLatLng);
                }
                clearPressState();
            }, LONG_PRESS_DURATION_MS);
        }, { passive: true });

        mapContainer.addEventListener('touchmove', (event) => {
            if (!pressTimer || !pressStartPos || event.touches.length !== 1) {
                return;
            }
            const touch = event.touches[0];
            const deltaX = Math.abs(touch.clientX - pressStartPos.x);
            const deltaY = Math.abs(touch.clientY - pressStartPos.y);
            
            if (deltaX > 14 || deltaY > 14) {
                clearPressState();
            }
        }, { passive: true });
        
        mapContainer.addEventListener('touchend', clearPressState, { passive: true });
        mapContainer.addEventListener('touchcancel', clearPressState, { passive: true });
    }
    async createCoordinateMarker(latlng) {
        // Increment counter and get marker number
        this.coordinateMarkerCounter++;
        const markerNumber = this.coordinateMarkerCounter;
        
        const lat = latlng.lat.toFixed(6);
        const lng = latlng.lng.toFixed(6);
        
        // Create a marker
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                html: `
                    <div style="
                        width: 20px;
                        height: 20px;
                        background-color: #ff6b35;
                        border: 3px solid white;
                        border-radius: 50%;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    "></div>
                `,
                className: 'coordinate-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);
        
        // Store coordinates in marker for radius functionality
        marker.latlng = latlng;
        marker.markerNumber = markerNumber;
        
        // Function to create popup content with elevation - compact and mobile-friendly
        const createPopupContent = (elevationText, displayNum) => {
            const displayNumber = displayNum || (this.coordinateMarkers.findIndex(m => m.marker === marker) + 1);
            return `
                <div style="padding: 4px; max-width: 180px; min-width: 140px;">
                    <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #333;">User Added Marker ${displayNumber}</div>
                    <div style="font-size: 10px; font-family: monospace; color: #555; margin-bottom: 6px; line-height: 1.4;">
                        ${lat}, ${lng}<br>
                        Elev: ${elevationText}
                </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                <button onclick="navigator.clipboard.writeText('${lat}, ${lng}').then(() => window.droneMap.showCopyToast())" 
                                style="background: #007bff; color: white; border: none; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%;">
                    Copy Coordinates
                </button>
                        <button onclick="window.droneMap.showAddRadiusDialog('User Added Marker ${displayNumber}', ${lat}, ${lng}); return false;" 
                                style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%;">
                    Add Radius
                </button>
                        <button onclick="window.droneMap.removeCoordinateMarker(${markerNumber})" 
                                style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%;">
                    Remove Marker
                </button>
                    </div>
            </div>
        `;
        };
        
        // Create popup with coordinates (elevation will be updated after fetch)
        const popup = L.popup({
            closeButton: true,
            autoClose: false,
            closeOnClick: false,
            className: 'user-marker-popup',
            maxWidth: 180
        }).setLatLng(latlng).setContent(createPopupContent('Loading...', this.coordinateMarkers.length + 1));
        
        marker.bindPopup(popup);
        
        // Add marker to array
        this.coordinateMarkers.push({ marker, latlng, number: markerNumber });
        
        // Renumber all markers to ensure sequential numbering
        this.renumberCoordinateMarkers();
        
        // Open popup for the new marker with correct number
        const finalDisplayNumber = this.coordinateMarkers.length;
        popup.setContent(createPopupContent('Loading...', finalDisplayNumber));
        marker.openPopup();
        
        // Fetch elevation using Open Elevation API (free, no API key required)
        // Source: https://api.open-elevation.com/api/v1/lookup
        // This API uses SRTM (Shuttle Radar Topography Mission) data for global elevation
        // SRTM is a NASA mission that provides elevation data for most of Earth's surface (between 60°N and 56°S)
        // The API returns elevation in meters above sea level (MSL)
        try {
            const elevationUrl = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
            const elevationResponse = await fetch(elevationUrl);
            if (elevationResponse.ok) {
                const elevationData = await elevationResponse.json();
                if (elevationData.results && elevationData.results.length > 0) {
                    const elevation = elevationData.results[0].elevation;
                    const isLikelySeaLevel = elevation < 0 && elevation > -50; // shallow negatives are usually ocean cells
                    const normalizedElevation = isLikelySeaLevel ? 0 : elevation;
                    const elevationDisplay = `${Math.round(normalizedElevation)} m (${Math.round(normalizedElevation * 3.28084)} ft) MSL${isLikelySeaLevel ? ' (approx.)' : ''}`;
                    
                    // Update popup with elevation if it's still open
                    if (marker && marker.isPopupOpen()) {
                        const displayNum = this.coordinateMarkers.findIndex(m => m.marker === marker) + 1;
                        marker.getPopup().setContent(createPopupContent(elevationDisplay, displayNum));
                    }
                } else {
                    // Update to N/A
                    if (marker && marker.isPopupOpen()) {
                        const displayNum = this.coordinateMarkers.findIndex(m => m.marker === marker) + 1;
                        marker.getPopup().setContent(createPopupContent('N/A', displayNum));
                    }
                }
            } else {
                // Update to N/A
                if (marker && marker.isPopupOpen()) {
                    const displayNum = this.coordinateMarkers.findIndex(m => m.marker === marker) + 1;
                    marker.getPopup().setContent(createPopupContent('N/A', displayNum));
                }
            }
        } catch (error) {
            console.error('Error fetching elevation:', error);
            // Update to N/A
            if (marker && marker.isPopupOpen()) {
                const displayNum = this.coordinateMarkers.findIndex(m => m.marker === marker) + 1;
                marker.getPopup().setContent(createPopupContent('N/A', displayNum));
            }
        }
    }
    renumberCoordinateMarkers() {
        // Renumber all markers sequentially based on their order in the array
        this.coordinateMarkers.forEach((markerData, index) => {
            const displayNumber = index + 1;
            // Update popup content (whether open or not) so it shows correct number when opened
            if (markerData.marker) {
                const popup = markerData.marker.getPopup();
                const currentContent = popup ? popup.getContent() : '';
                // Extract existing data from popup content (lat, lng, elevation)
                const lat = markerData.latlng.lat.toFixed(6);
                const lng = markerData.latlng.lng.toFixed(6);
                
                // Try to extract elevation from current content
                let elevationText = 'N/A';
                if (currentContent) {
                    const elevationMatch = currentContent.match(/Elev:\s*(.+?)</);
                    if (elevationMatch) {
                        elevationText = elevationMatch[1].trim();
                    } else {
                        // Check if it's still loading
                        if (currentContent.includes('Loading...')) {
                            elevationText = 'Loading...';
                        }
                    }
                }
                
                // Recreate popup content with new number
                const createPopupContent = (elevationText) => {
                    return `
                        <div style="padding: 4px; max-width: 180px; min-width: 140px;">
                            <div style="font-weight: 600; font-size: 12px; margin-bottom: 6px; color: #333;">User Added Marker ${displayNumber}</div>
                            <div style="font-size: 10px; font-family: monospace; color: #555; margin-bottom: 6px; line-height: 1.4;">
                                ${lat}, ${lng}<br>
                                Elev: ${elevationText}
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <button onclick="navigator.clipboard.writeText('${lat}, ${lng}').then(() => window.droneMap.showCopyToast())" 
                                        style="background: #007bff; color: white; border: none; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%;">
                                    Copy Coordinates
                                </button>
                                <button onclick="window.droneMap.showAddRadiusDialog('User Added Marker ${displayNumber}', ${lat}, ${lng}); return false;" 
                                        style="background: #28a745; color: white; border: none; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%;">
                                    Add Radius
                                </button>
                                <button onclick="window.droneMap.removeCoordinateMarker(${markerData.number})" 
                                        style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 3px; cursor: pointer; font-size: 11px; width: 100%;">
                                    Remove Marker
                                </button>
                            </div>
                        </div>
                    `;
                };
                if (popup) {
                    popup.setContent(createPopupContent(elevationText));
                }
            }
        });
    }
    
    removeCoordinateMarker(markerNumber) {
        // Find the marker by number
        const markerIndex = this.coordinateMarkers.findIndex(m => m.number === markerNumber);
        if (markerIndex !== -1) {
            const markerData = this.coordinateMarkers[markerIndex];
            
            // Remove marker from map
            if (markerData.marker) {
                this.map.removeLayer(markerData.marker);
            }
            
            // Remove from array
            this.coordinateMarkers.splice(markerIndex, 1);
            
            // Renumber remaining markers
            this.renumberCoordinateMarkers();
            
            console.log(`Coordinate marker ${markerNumber} removed`);
        } else {
            console.warn(`Marker ${markerNumber} not found`);
        }
    }
    
    addNorthArrowControl() {
        // Create custom north arrow control
        const self = this; // Capture DroneMap instance
        const NorthArrowControl = L.Control.extend({
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                container.style.marginBottom = '0px';
                container.style.width = '40px';
                container.style.height = '40px';
                
                const button = L.DomUtil.create('a', 'leaflet-control-north', container);
                // Use max-width and max-height to preserve aspect ratio
                button.innerHTML = `<img src="${self.getAssetPath('/images/north arrow (2).png')}" style="max-width: 20px; max-height: 30px; width: auto; height: auto; display: block; margin: auto; object-fit: contain;">`;
                button.href = '#';
                button.role = 'button';
                button.title = 'Reset to North Up';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.width = '100%';
                button.style.height = '100%';

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                          .on(button, 'click', () => {
                    window.droneMap.resetToNorthUp();
                          }, this);
                
                return container;
            },
            
            onRemove: function(map) {
                // Cleanup if needed
            }
        });
        
        this.northArrowControl = new NorthArrowControl({ position: 'bottomleft' });
        this.northArrowControl.addTo(this.map);
        
        console.log('North arrow control added:', this.northArrowControl);
        console.log('North arrow control container:', this.northArrowControl.getContainer());
        
        // Update arrow rotation based on current mode
        this.updateNorthArrowRotation();
    }
    initFullscreenButton() {
        const button = document.getElementById('fullscreenNavBtn');
        if (!button) {
            console.warn('Fullscreen navigation button not found in DOM');
            return;
        }

        this.fullscreenButton = button;
        this.fullscreenButtonExpandIcon = button.querySelector('.fullscreen-nav-icon-expand');
        this.fullscreenButtonCloseIcon = button.querySelector('.fullscreen-nav-icon-close');

        button.addEventListener('click', (event) => {
            event.preventDefault();
            this.toggleFullscreen();
        });

        button.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggleFullscreen();
            }
        });

        button.setAttribute('aria-pressed', this.isFullscreen ? 'true' : 'false');
        this.updateFullscreenIcon();
    }
    
    resetToNorthUp() {
        console.log('Reset map to north-up');
        
        // Only center on user's location if we're not already there
        if (this.isMyLocationVisible && this.myLocationMarker) {
            const latlng = this.myLocationMarker.getLatLng();
            const currentCenter = this.map.getCenter();
            const currentZoom = this.map.getZoom();
            
            // Check if we're already centered on user location at zoom 15
            const distance = currentCenter.distanceTo(latlng);
            const isAlreadyCentered = distance < 100 && currentZoom === 15; // Within 100 meters and same zoom
            
            if (!isAlreadyCentered) {
                this.map.invalidateSize();
                this.map.setView(latlng, 15, { animate: true });
                console.log('Centered on user location:', latlng, 'zoom level: 15');
            } else {
                console.log('Already centered on user location, skipping setView');
            }
        }
    }
    
    updateNorthArrowRotation() {
        if (!this.northArrowControl) return;
        
        const container = this.northArrowControl.getContainer();
        const arrow = container.querySelector('img');
        
        if (!arrow) return;
        
        // Always set to north-oriented mode (no rotation needed)
        arrow.style.transform = 'rotate(0deg)';
    }
    
    toggleFullscreen() {
        if (!this.isFullscreen) {
            // Enter fullscreen
            this.enterFullscreen();
        } else {
            // Exit fullscreen
            this.exitFullscreen();
        }
    }
    
    enterFullscreen() {
        const element = document.documentElement; // Full page
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        } else {
            console.warn('Fullscreen API not supported');
            // Fallback to old behavior
            this.fallbackFullscreen(true);
        }
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else {
            console.warn('Fullscreen API not supported');
            // Fallback to old behavior
            this.fallbackFullscreen(false);
        }
    }
    
    fallbackFullscreen(enter) {
        this.isFullscreen = enter;
        
        const navbar = document.querySelector('.navbar');
        const mobileOffcanvas = document.querySelector('.offcanvas');
        
        if (enter) {
            // Store original display value before hiding
            if (navbar && !this.originalNavbarDisplay) {
                const computedStyle = window.getComputedStyle(navbar);
                this.originalNavbarDisplay = computedStyle.display;
            }
            
            // Hide top bar
            if (navbar) {
                navbar.style.display = 'none';
            }
            if (mobileOffcanvas) {
                mobileOffcanvas.style.display = 'none';
            }
            
            // Zoom to user location if it's visible
            if (this.isMyLocationVisible && this.myLocationMarker) {
                const latlng = this.myLocationMarker.getLatLng();
                // Use longer timeout to ensure it runs after any view mode changes
                setTimeout(() => {
                    this.map.invalidateSize(); // Ensure map size is correct in fullscreen
                    this.map.setView(latlng, 15, { animate: false });
                    // Force another invalidate after setting view
                    setTimeout(() => {
                        this.map.invalidateSize();
                    }, 50);
                    console.log('Zoomed to user location in fallback fullscreen mode:', latlng);
                }, 300);
            }
            
            console.log('Entered fallback fullscreen mode - top bar hidden');
        } else {
            // Show top bar
            if (navbar) {
                // Restore original display or remove inline style to let CSS handle it
                if (this.originalNavbarDisplay) {
                    navbar.style.display = this.originalNavbarDisplay;
                    this.originalNavbarDisplay = null; // Reset after restore
                } else {
                    navbar.style.display = ''; // Remove inline style, let CSS handle it
                }
            }
            if (mobileOffcanvas) {
                mobileOffcanvas.style.display = 'block';
            }
            console.log('Exited fallback fullscreen mode - top bar shown');
        }
        
        this.updateFullscreenIcon();
    }
    
    addFullscreenEventListeners() {
        // Listen for fullscreen change events
        const fullscreenChangeEvents = [
            'fullscreenchange',
            'webkitfullscreenchange', 
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];
        
        fullscreenChangeEvents.forEach(eventName => {
            document.addEventListener(eventName, () => {
                this.handleFullscreenChange();
            });
        });
    }
    handleFullscreenChange() {
        // Check if we're currently in fullscreen
        const isCurrentlyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
        
        this.isFullscreen = isCurrentlyFullscreen;
        this.updateFullscreenIcon();
        
        // Hide/show navbar when entering/exiting fullscreen
        const navbar = document.querySelector('.navbar');
        const mobileOffcanvas = document.querySelector('.offcanvas');
        
        if (isCurrentlyFullscreen) {
            // Store original display value before hiding
            if (navbar && !this.originalNavbarDisplay) {
                const computedStyle = window.getComputedStyle(navbar);
                this.originalNavbarDisplay = computedStyle.display;
            }
            
            // Hide navbar and mobile offcanvas when entering fullscreen
            if (navbar) {
                navbar.style.display = 'none';
            }
            if (mobileOffcanvas) {
                mobileOffcanvas.style.display = 'none';
            }
            
            // Check if map is visible and show beta disclaimer if needed
            setTimeout(() => {
                this.checkMapVisibilityAndShowDisclaimer();
            }, 300);
            
            // Zoom to user location if it's visible
            if (this.isMyLocationVisible && this.myLocationMarker) {
                const latlng = this.myLocationMarker.getLatLng();
                console.log('Fullscreen: User location available, will zoom to:', latlng);
                // Use longer timeout to ensure it runs after any view mode changes
                setTimeout(() => {
                    this.map.invalidateSize(); // Ensure map size is correct in fullscreen
                    this.map.setView(latlng, 15, { animate: false });
                    // Force another invalidate after setting view and ensure zoom persists
                    setTimeout(() => {
                        this.map.invalidateSize();
                        // Double-check that we're still at the right zoom/location
                        const currentZoom = this.map.getZoom();
                        if (currentZoom < 10) {
                            console.log('Zoom was reset, re-zooming to user location');
                            this.map.setView(latlng, 15, { animate: false });
                        }
                    }, 100);
                    console.log('Zoomed to user location in fullscreen mode:', latlng, 'zoom: 15');
                }, 300);
            } else {
                console.log('Fullscreen: User location not available. isMyLocationVisible:', this.isMyLocationVisible, 'myLocationMarker:', this.myLocationMarker);
            }
            
            console.log('Entered fullscreen - navbar hidden');
        } else {
            // Show navbar and mobile offcanvas when exiting fullscreen
            if (navbar) {
                // Restore original display or remove inline style to let CSS handle it
                if (this.originalNavbarDisplay) {
                    navbar.style.display = this.originalNavbarDisplay;
                    this.originalNavbarDisplay = null; // Reset after restore
                } else {
                    navbar.style.display = ''; // Remove inline style, let CSS handle it
                }
            }
            if (mobileOffcanvas) {
                mobileOffcanvas.style.display = 'block';
            }
            console.log('Exited fullscreen - navbar shown');
        }
        
        console.log(`Fullscreen state changed: ${isCurrentlyFullscreen ? 'entered' : 'exited'}`);
    }
    
    updateFullscreenIcon() {
        if (!this.fullscreenButton) return;
        
        const expandIcon = this.fullscreenButtonExpandIcon;
        const closeIcon = this.fullscreenButtonCloseIcon;
        
        if (expandIcon) {
            expandIcon.style.display = this.isFullscreen ? 'none' : 'inline';
        }
        if (closeIcon) {
            closeIcon.style.display = this.isFullscreen ? 'inline' : 'none';
        }
        
        this.fullscreenButton.setAttribute('title', this.isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode');
        this.fullscreenButton.setAttribute('aria-pressed', this.isFullscreen ? 'true' : 'false');
    }
    


    showCopyToast() {
        const toast = document.getElementById('coordsCopiedToast');
        if (toast) {
            toast.textContent = 'Coordinates copied to clipboard';
            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 2000);
        }
    }

    fallbackToStaticMap() {
        const mapContainer = document.getElementById('map');
        mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; 
                        background: #374151; color: white; text-align: center; flex-direction: column; gap: 20px;">
                <div style="font-size: 2rem; opacity: 0.5;">🗺️</div>
                <div>
                    <div style="font-size: 1.1rem; font-weight: 500;">Map Unavailable</div>
                    <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 8px;">
                        Coordinate data will still be displayed below
                    </div>
                </div>
            </div>
        `;
    }
    updateDronePosition(location, droneName = null) {
        if (!this.map) return;

        const previousData = this.currentDroneData;
        const {
            latitude,
            longitude,
            altitude_ahl,
            altitude_asl,
            altitude_ellipsoid,
            bearing,
            pitch,
            battery_percent,
            timestamp
        } = location;

        const effectiveTimestamp = Number.isFinite(timestamp) ? Number(timestamp) : Date.now();
        const hasMeaningfulChange = !previousData ||
            previousData.latitude !== latitude ||
            previousData.longitude !== longitude ||
            previousData.altitude_ahl !== altitude_ahl ||
            previousData.altitude_asl !== altitude_asl ||
            previousData.altitude_ellipsoid !== altitude_ellipsoid ||
            previousData.bearing !== bearing ||
            previousData.pitch !== pitch ||
            previousData.battery_percent !== battery_percent;

        if (
            this.lastDroneTelemetryTimestamp === null ||
            effectiveTimestamp > this.lastDroneTelemetryTimestamp ||
            hasMeaningfulChange
        ) {
            this.lastDroneTelemetryTimestamp = effectiveTimestamp;
            this.lastDroneUpdate = new Date(effectiveTimestamp);
        }

        this.currentLocation = [latitude, longitude];
        this.currentDroneData = location;
        this.currentDroneName = droneName;

        // Add red dot indicator if livestreaming
        const redDot = this.currentLivestreamId ?
            '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background-color: red; border-radius: 50%; border: 1px solid white;"></div>' :
            '';

        if (!this.droneMarker) {
            const droneIcon = L.divIcon({
                html: `<div style="position: relative; width: 32px; height: 32px;"><img src="${this.getAssetPath('/images/livestream/map_drone_flyer.png')}" style="width: 32px; height: 32px; transform: rotate(${bearing}deg); transform-origin: center;">${redDot}</div>`,
                className: 'drone-marker',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            this.droneMarker = L.marker(this.currentLocation, {
                icon: droneIcon,
                interactive: false,
                pane: 'droneMarkerPane'  // Use dedicated pane to ensure it's always on top
            }).addTo(this.map);

            // Create invisible clickable circle marker
            this.droneClickMarker = L.circleMarker(this.currentLocation, {
                radius: 16,
                fillOpacity: 0,
                opacity: 0,
                interactive: true,
                pane: 'droneMarkerPane'  // Use dedicated pane to ensure it's always on top
            }).addTo(this.map);

            this.droneClickMarker.bindPopup(() => this.generateDronePopupContent(), {
                maxWidth: 300,
                className: 'drone-popup'
            });

            this.droneClickMarker.on('popupopen', () => {
                this.startDronePopupRelativeTimer();
            });
            this.droneClickMarker.on('popupclose', () => {
                if (!this.staleDataOverlay) {
                    this.stopDronePopupRelativeTimer();
                }
            });

            console.log('Created drone marker with icon');
        } else {
            this.droneMarker.setLatLng(this.currentLocation);
            this.droneClickMarker.setLatLng(this.currentLocation);

            // Update rotation and red dot by directly manipulating the existing elements
            const markerElement = this.droneMarker.getElement();
            if (markerElement) {
                const container = markerElement.querySelector('div');
                if (container) {
                    const img = container.querySelector('img');
                    if (img) {
                        img.style.transform = `rotate(${bearing}deg)`;
                    }

                    // Update red dot visibility
                    let existingDot = container.querySelector('div[style*="background-color: red"]');
                    if (this.currentLivestreamId && !existingDot) {
                        // Add red dot
                        container.innerHTML += redDot;
                    } else if (!this.currentLivestreamId && existingDot) {
                        // Remove red dot
                        existingDot.remove();
                    }
                }
            }

            // Update popup content if it's currently open
            // Don't use setPopupContent as it breaks iOS touch events
            if (this.droneClickMarker.isPopupOpen()) {
                const popup = this.droneClickMarker.getPopup();
                if (popup && popup._contentNode) {
                    popup._contentNode.innerHTML = this.generateDronePopupContent();
                    this.updateDronePopupRelativeTime();
                }
            }
        }

        if (this.trailCoordinates.length === 0) {
            // First position: center map and enable continuous centering
            this.map.setView(this.currentLocation, 15);
            this.droneMapCenteringState = 'CONTINUOUS';
            console.log('First drone position received, enabling CONTINUOUS centering');
            this.updateRecenterButtonStyle();
        } else if (this.droneMapCenteringState === 'CONTINUOUS') {
            // Continuously center on drone when in CONTINUOUS mode
            this.map.panTo(this.currentLocation);
        }
    }
    generateDronePopupContent(droneData = null, droneName = null, livestreamId = null) {
        // Use parameters if provided, otherwise fall back to current drone data
        const data = droneData || this.currentDroneData;
        const name = droneName || this.currentDroneName;
        const streamId = livestreamId !== null ? livestreamId : this.currentLivestreamId;

        if (!data) return 'Loading...';

        const { latitude, longitude, altitude_ahl, altitude_asl, altitude_ellipsoid, bearing, pitch, battery_percent } = data;

        // Format altitude displays with deltas (only for other drones)
        const isOtherDrone = droneData !== null;
        const currentDrone = this.currentDroneData;

        // Home altitude (no delta)
        const altAhlText = altitude_ahl != null ? altitude_ahl.toFixed(1) + 'm' : 'N/A';

        // Sea level altitude (with delta if both drones have ASL)
        let altAslText = 'N/A';
        if (altitude_asl != null) {
            altAslText = altitude_asl.toFixed(1) + 'm';
            if (isOtherDrone && currentDrone?.altitude_asl != null) {
                const delta = altitude_asl - currentDrone.altitude_asl;
                const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
                altAslText += ` (${deltaStr}m)`;
            }
        }

        // GPS/Ellipsoid altitude (with delta if both drones have Ellipsoid)
        let altEllipsoidText = 'N/A';
        if (altitude_ellipsoid != null) {
            altEllipsoidText = altitude_ellipsoid.toFixed(1) + 'm';
            if (isOtherDrone && currentDrone?.altitude_ellipsoid != null) {
                const delta = altitude_ellipsoid - currentDrone.altitude_ellipsoid;
                const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
                altEllipsoidText += ` (${deltaStr}m)`;
            }
        }

        const pitchText = pitch != null ? pitch.toFixed(1) + '°' : 'N/A';
        const batteryText = battery_percent != null ? battery_percent + '%' : 'N/A';

        const nameHeader = name
            ? `<strong style="font-size: 1.1em;">${name}</strong><br><br>`
            : `<strong style="font-size: 1.1em;">Drone Position</strong><br><br>`;

        // Add "View Livestream" button if this drone is streaming and it's not the current stream
        const currentViewingStream = window.viewer?.currentRoomId;
        const showLivestreamButton = streamId && streamId !== currentViewingStream;
        const livestreamButton = showLivestreamButton ?
            `<br><br><button onclick="window.viewer.switchToStream('${streamId}')" style="padding: 6px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">View Livestream</button>` :
            '';

        // Format last update timestamp
        let lastUpdateText = '';
        if (this.lastDroneUpdate) {
            const updateDateRaw = this.lastDroneUpdate;
            const updateDate = updateDateRaw instanceof Date ? updateDateRaw : new Date(updateDateRaw);
            const timestampMs = updateDate.getTime();
            const diffSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
            const relativeText = this.formatRelativeDurationWithSeconds(diffSeconds);

            // Format absolute time on separate line, e.g. "at 20:30:12 PST, Nov 8, 2025"
            const timeFormatter = new Intl.DateTimeFormat(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZoneName: 'short'
            });
            const dateFormatter = new Intl.DateTimeFormat(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            const timeParts = timeFormatter.formatToParts(updateDate);
            const timeZonePart = timeParts.find(part => part.type === 'timeZoneName');
            const timePart = timeParts.filter(part => ['hour', 'minute', 'second'].includes(part.type))
                .map(part => part.value).join(':');
            const timeZone = timeZonePart ? timeZonePart.value : '';
            const formattedDate = dateFormatter.format(updateDate);
            const absoluteLine = `at ${timePart} ${timeZone}, ${formattedDate}`;

            lastUpdateText = `
                <br><br>
                <strong>🕐 Last Updated:</strong>
                <span class="drone-last-updated" data-timestamp="${timestampMs}">${relativeText}</span>
                <br>
                <span class="drone-last-updated-absolute">${absoluteLine}</span>
            `;
        }

        return `
            <div style="min-width: 200px;">
                ${nameHeader}
                <strong>Latitude:</strong> ${latitude.toFixed(6)}°<br>
                <strong>Longitude:</strong> ${longitude.toFixed(6)}°<br>
                <strong>↑🏠 Altitude (home):</strong> ${altAhlText}<br>
                <strong>↑🌊 Altitude (sea):</strong> ${altAslText}<br>
                <strong>↑🛰️ Altitude (GPS):</strong> ${altEllipsoidText}<br>
                <strong>Bearing:</strong> ${bearing.toFixed(1)}°<br>
                <strong>Pitch:</strong> ${pitchText}<br>
                <strong>🔋 Battery:</strong> ${batteryText}${lastUpdateText}${livestreamButton}
            </div>
        `;
    }

    formatRelativeDurationWithSeconds(totalSeconds) {
        let secondsRemaining = Math.max(0, Math.floor(totalSeconds));
        const days = Math.floor(secondsRemaining / 86400);
        secondsRemaining %= 86400;
        const hours = Math.floor(secondsRemaining / 3600);
        secondsRemaining %= 3600;
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;

        const parts = [];
        if (days > 0) {
            parts.push(`${days} day${days === 1 ? '' : 's'}`);
        }
        if (hours > 0 || days > 0) {
            parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        }
        if (minutes > 0 || hours > 0 || days > 0) {
            parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
        }
        parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);

        return `${parts.join(' ')} ago`;
    }

    updateDronePopupRelativeTime() {
        const relativeElements = document.querySelectorAll('.drone-last-updated');
        if (!relativeElements.length) {
            if (!this.staleDataOverlay) {
                if (this.dronePopupRelativeTimer) {
                    this.stopDronePopupRelativeTimer();
                }
            }
            return;
        }

        relativeElements.forEach(element => {
            const timestampAttr = element.getAttribute('data-timestamp');
            if (!timestampAttr) {
                element.textContent = 'N/A';
                return;
            }
            const timestamp = Number(timestampAttr);
            if (!Number.isFinite(timestamp) || timestamp <= 0) {
                element.textContent = 'N/A';
                return;
            }
            const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
            element.textContent = this.formatRelativeDurationWithSeconds(diffSeconds);
        });
    }

    startDronePopupRelativeTimer() {
        if (this.dronePopupRelativeTimer) {
            return;
        }
        // Update immediately, then start interval
        this.updateDronePopupRelativeTime();
        this.dronePopupRelativeTimer = setInterval(() => {
            this.updateDronePopupRelativeTime();
        }, 1000);
    }

    stopDronePopupRelativeTimer() {
        if (this.dronePopupRelativeTimer) {
            clearInterval(this.dronePopupRelativeTimer);
            this.dronePopupRelativeTimer = null;
        }
    }

    updateTrail(coordinateHistory) {
        if (!this.trailPolyline) return;

        this.trailCoordinates = coordinateHistory.map(coord => [coord.latitude, coord.longitude]);
        this.trailPolyline.setLatLngs(this.trailCoordinates);
    }
    updateGeojson(geojsonData) {
        if (!this.geojsonLayer) return;

        // Store the raw payload so we can re-render on manual refresh requests
        this.latestGeojsonPayload = geojsonData;

        // Preserve previous folder and feature toggle states so we can reapply after refreshes
        const previousFolderStates = {};
        if (this.caltopoFolders && typeof this.caltopoFolders === 'object') {
            Object.entries(this.caltopoFolders).forEach(([folderName, folderData]) => {
                previousFolderStates[folderName] = {
                    enabled: folderData?.enabled !== undefined ? folderData.enabled : true,
                    expanded: folderData?.expanded || false
                };
            });
        }

        const previousFeatureStates = new Map();
        if (this.caltopoFeatureStates && typeof this.caltopoFeatureStates.forEach === 'function') {
            this.caltopoFeatureStates.forEach((state, featureId) => {
                previousFeatureStates.set(featureId, { ...state });
            });
        }

        // Parse the outer JSON structure
        let parsedData = geojsonData;
        let caltopoInfo = null;

        // Check if geojsonData has a 'geojson' field (string that needs parsing)
        if (geojsonData && typeof geojsonData === 'object' && geojsonData.geojson) {
            // Parse the inner geojson string
            try {
                parsedData = JSON.parse(geojsonData.geojson);
            } catch (e) {
                console.error('Error parsing inner geojson:', e);
                parsedData = geojsonData.geojson;
            }

            // Extract caltopo_info if present
            if (geojsonData.caltopo_info) {
                caltopoInfo = geojsonData.caltopo_info;
            }
        }

        // Update CalTopo info and UI
        this.caltopoInfo = caltopoInfo;
        this.updateCaltopoButton();

        // Log feature structure to analyze folder organization
        if (parsedData && parsedData.features && this.caltopoInfo && this.caltopoInfo.map_id) {
            console.log("🔍 CALTOPO FEATURE ANALYSIS:");
            console.log(`   Total features: ${parsedData.features.length}`);
            
            // Sample first 5 features to see their properties
            const sampleFeatures = parsedData.features.slice(0, 5);
            sampleFeatures.forEach((feature, idx) => {
                console.log(`   Feature ${idx + 1}:`, {
                    type: feature.geometry?.type,
                    properties: feature.properties
                });
            });
            
            // Check for common folder/group property names across all features
            const propertyNames = new Set();
            parsedData.features.forEach(feature => {
                if (feature.properties) {
                    Object.keys(feature.properties).forEach(key => propertyNames.add(key));
                }
            });
            const allPropertyNames = Array.from(propertyNames).sort();
            console.log(`   All property names found (${allPropertyNames.length}):`, allPropertyNames.join(', '));
            
            // Check for folder-like properties
            const folderProps = ['folder', 'folderPath', 'group', 'category', 'layer', 'class', 'type'];
            const foundFolderProps = folderProps.filter(prop => propertyNames.has(prop));
            console.log(`   Folder-like properties found:`, foundFolderProps.join(', ') || 'none');
            
            if (foundFolderProps.length > 0) {
                console.log("✅ FOLDERS DETECTED! We can organize features by:", foundFolderProps.join(', '));
                
                // Build folder structure (use first folder property found, typically "class")
                const folderPropName = foundFolderProps[0];
                const newCaltopoFolders = {};
                const newFeatureToFolder = new Map();
                const newFeatureStates = new Map();
                
                // Show sample values for each folder property
                foundFolderProps.forEach(propName => {
                    const uniqueValues = new Set();
                    parsedData.features.forEach(feature => {
                        if (feature.properties && feature.properties[propName]) {
                            uniqueValues.add(feature.properties[propName]);
                        }
                    });
                    console.log(`   📁 "${propName}" values:`, Array.from(uniqueValues).sort());
                });
                
                // Special analysis for features with class='Folder' to find custom folder names
                const folderFeatures = parsedData.features.filter(f => f.properties?.class === 'Folder');
                if (folderFeatures.length > 0) {
                    console.log(`   🔍 Found ${folderFeatures.length} custom folder(s), analyzing properties:`);
                    folderFeatures.forEach((feature, idx) => {
                        console.log(`      Folder ${idx + 1} ALL properties:`, feature.properties);
                        console.log(`      Folder ${idx + 1} title:`, feature.properties?.title);
                        console.log(`      Folder ${idx + 1} id:`, feature.id);
                    });
                    
                    // Now check which features have folderId pointing to these folders
                    console.log(`   🔗 Checking which features belong to custom folders:`);
                    parsedData.features.forEach((feature, idx) => {
                        if (feature.properties?.folderId) {
                            console.log(`      Feature ${idx + 1} (${feature.geometry?.type}) has folderId:`, feature.properties.folderId, 
                                       `class:`, feature.properties.class,
                                       `title:`, feature.properties.title);
                        }
                    });
                    
                    // Also show features WITHOUT folderId
                    const featuresWithoutFolder = parsedData.features.filter(f => 
                        f.properties?.class !== 'Folder' && !f.properties?.folderId
                    );
                    console.log(`   📍 Features without folderId (${featuresWithoutFolder.length}):`, 
                               featuresWithoutFolder.map(f => ({
                                   type: f.geometry?.type,
                                   class: f.properties?.class,
                                   title: f.properties?.title
                               })));
                }
                
                // Build folder ID to name mapping from custom folders (deduplicate)
                const folderIdToName = new Map();
                const seenFolderIds = new Set();
                folderFeatures.forEach(feature => {
                    const folderId = feature.id;
                    const folderName = feature.properties?.title || 'Unnamed Folder';
                    
                    // Skip if we've already seen this folder ID
                    if (folderId && !seenFolderIds.has(folderId)) {
                        folderIdToName.set(folderId, folderName);
                        seenFolderIds.add(folderId);
                    }
                });
                console.log("📋 Folder ID to name mapping (deduplicated):", Array.from(folderIdToName.entries()));
                console.log(`   (Found ${folderFeatures.length} folder features, ${seenFolderIds.size} unique folders)`);
                
                // Organize features by folder
                // Store original index in each feature for consistent ID generation
                parsedData.features.forEach((feature, idx) => {
                    feature._originalIndex = idx;
                });
                
                // Deduplicate features before organizing
                const seenFeatureIdsInOrg = new Set();
                
                parsedData.features.forEach((feature, idx) => {
                    const featureClass = feature.properties?.class;
                    
                    // Skip folder definition features themselves (don't render these as map objects)
                    if (featureClass === 'Folder') {
                        return;
                    }
                    
                    // Generate consistent feature ID
                    const featureId = feature.id || feature.properties?.id || `feature-${feature._originalIndex}`;
                    
                    // Skip if we've already processed this feature ID
                    if (seenFeatureIdsInOrg.has(featureId)) {
                        console.log(`   ⏭️ Skipping duplicate in folder organization: ${featureId}`);
                        return;
                    }
                    seenFeatureIdsInOrg.add(featureId);
                    
                    let folderName;
                    
                    // Check if feature belongs to a custom folder
                    if (feature.properties?.folderId && folderIdToName.has(feature.properties.folderId)) {
                        // Feature belongs to custom folder - use custom name
                        folderName = folderIdToName.get(feature.properties.folderId);
                        console.log(`   Feature ${featureId} belongs to custom folder "${folderName}"`);
                    } else {
                        // Root-level feature, use its class as category with proper naming
                        if (featureClass === 'Marker') {
                            folderName = 'Markers';
                        } else if (featureClass === 'Shape') {
                            folderName = 'Lines & Polygons';
                        } else {
                            folderName = featureClass || 'Uncategorized';
                        }
                    }
                    
                    if (!newCaltopoFolders[folderName]) {
                        const prevFolderState = previousFolderStates[folderName];
                        newCaltopoFolders[folderName] = {
                            enabled: prevFolderState ? prevFolderState.enabled : true,
                            expanded: prevFolderState ? prevFolderState.expanded : false,
                            featureIds: [],
                            features: {} // featureId -> { name, type }
                        };
                    }
                    
                    // Get feature name and type
                    const featureName = feature.properties?.title || 
                                       feature.properties?.description || 
                                       `Unnamed ${feature.geometry?.type || 'Feature'}`;
                    const featureType = feature.geometry?.type || 'Feature';
                    
                    newCaltopoFolders[folderName].featureIds.push(featureId);
                    newCaltopoFolders[folderName].features[featureId] = { name: featureName, type: featureType };
                    newFeatureToFolder.set(featureId, folderName);
                    
                    const prevFeatureState = previousFeatureStates.get(featureId);
                    const defaultEnabled = prevFeatureState ? prevFeatureState.enabled : newCaltopoFolders[folderName].enabled;
                    newFeatureStates.set(featureId, { enabled: defaultEnabled, name: featureName });
                });
                
                this.caltopoFolders = newCaltopoFolders;
                this.caltopoFeatureToFolder = newFeatureToFolder;
                this.caltopoFeatureStates = newFeatureStates;
                
                console.log("📂 Caltopo folders organized (after deduplication):", this.caltopoFolders);
                Object.keys(this.caltopoFolders).forEach(folderName => {
                    console.log(`   ${folderName}: ${this.caltopoFolders[folderName].featureIds.length} features`);
                });
            } else {
                console.log("ℹ️ No folder properties detected. Features cannot be organized.");
                this.caltopoFolders = {};
                this.caltopoFeatureToFolder = new Map();
                this.caltopoFeatureStates = new Map();
            }
        }

        this.geojsonLayer.clearLayers();

        // Configure styling and popups for GeoJSON features
        // For Caltopo data with folders, we need to track each feature layer
        const isCaltopoWithFolders = this.caltopoInfo && this.caltopoInfo.map_id && Object.keys(this.caltopoFolders).length > 0;
        
        // Filter out folder definition features (class='Folder') before rendering
        const filteredFeatures = parsedData.features ? parsedData.features.filter(f => f.properties?.class !== 'Folder') : [];
        
        console.log(`🎨 Rendering ${filteredFeatures.length} features (excluded ${(parsedData.features?.length || 0) - filteredFeatures.length} folder definitions)`);
        
        // If folders exist, render features individually and track them
        if (isCaltopoWithFolders) {
            const featureLayers = new Map();
            
            // Deduplicate by feature ID to avoid rendering duplicates
            const seenFeatureIds = new Set();
            
            filteredFeatures.forEach(feature => {
                // Generate consistent feature ID using _originalIndex
                const featureId = feature.id || feature.properties?.id || `feature-${feature._originalIndex}`;
                
                // Skip if already processed this feature
                if (seenFeatureIds.has(featureId)) {
                    console.log(`   ⏭️ Skipping duplicate feature ${featureId}`);
                    return;
                }
                seenFeatureIds.add(featureId);
                
                const folderName = this.caltopoFeatureToFolder.get(featureId);
                
                console.log(`   📍 Creating feature ${featureId} for folder "${folderName}"`, feature.properties?.title || feature.geometry?.type);
                
                // Create layer for this individual feature
                const featureGeoJSON = L.geoJSON(feature, {
                    style: (f) => {
                        const style = this.getFeatureStyle(f);
                        style.pane = 'polygonPane';
                        return style;
                    },
                    pointToLayer: (f, latlng) => this.createStyledMarker(f, latlng),
                    onEachFeature: (f, l) => this.configureFeaturePopup(f, l)
                });
                
                // Extract the actual Leaflet layers from the GeoJSON group
                const actualLayers = [];
                featureGeoJSON.eachLayer(l => {
                    actualLayers.push(l);
                    this.geojsonLayer.addLayer(l);
                });
                
                // Store the actual Leaflet layers (not the GeoJSON group)
                featureLayers.set(featureId, actualLayers);
                
                console.log(`      Stored ${actualLayers.length} actual layer(s) for feature ${featureId}`);
            });
            
            this.caltopoFeatureLayers = featureLayers;
            console.log(`📌 Stored ${featureLayers.size} feature layers (${filteredFeatures.length - featureLayers.size} duplicates skipped)`);
            console.log(`📌 Feature to folder mapping has ${this.caltopoFeatureToFolder.size} entries`);
        } else {
            // No folders, render normally
            const filteredData = {
                type: 'FeatureCollection',
                features: filteredFeatures
            };
            
            this.geojsonLayer = L.geoJSON(filteredData, {
            style: (feature) => {
                const style = this.getFeatureStyle(feature);
                style.pane = 'polygonPane';
                return style;
            },
            pointToLayer: (feature, latlng) => this.createStyledMarker(feature, latlng),
            onEachFeature: (feature, layer) => this.configureFeaturePopup(feature, layer)
            });
        }
        
        // Add to map based on toggle state (only if Caltopo data)
        if (this.caltopoInfo && this.caltopoInfo.map_id) {
            if (this.isCaltopoLayerEnabled) {
                this.geojsonLayer.addTo(this.map);
                // Apply folder visibility filters if folders exist
                if (Object.keys(this.caltopoFolders).length > 0) {
                    this.updateCaltopoFolderVisibility();
                }
            }
            // Refresh base map popup if it's open to show Caltopo toggle
            if (this.baseMapPopup && this.baseMapPopup.parentElement) {
                this.showBaseMapPopup();
            }
        } else {
            // Not Caltopo data, always add to map
            this.geojsonLayer.addTo(this.map);
        }
    }

    updateCaltopoButton() {
        const caltopoBtn = document.getElementById('caltopoBtn');
        const caltopoBtnMobile = document.getElementById('caltopoBtnMobile');

        if (this.caltopoInfo && this.caltopoInfo.map_id && this.caltopoInfo.map_name) {
            // Update desktop button
            if (caltopoBtn) {
                caltopoBtn.style.display = 'flex';
                const mapNameSpan = document.getElementById('caltopoMapName');
                if (mapNameSpan) {
                    mapNameSpan.textContent = this.caltopoInfo.map_name;
                }
            }

            // Update mobile button
            if (caltopoBtnMobile) {
                caltopoBtnMobile.style.display = 'flex';
                const mapNameSpanMobile = document.getElementById('caltopoMapNameMobile');
                if (mapNameSpanMobile) {
                    mapNameSpanMobile.textContent = this.caltopoInfo.map_name;
                }
            }
        } else {
            // Hide both buttons
            if (caltopoBtn) caltopoBtn.style.display = 'none';
            if (caltopoBtnMobile) caltopoBtnMobile.style.display = 'none';
        }
    }

    // ===== Caltopo Layer Toggle Methods =====
    
    toggleCaltopoLayer(enabled) {
        this.isCaltopoLayerEnabled = enabled;
        
        // Toggle visibility of the entire Caltopo GeoJSON layer
        if (!this.geojsonLayer || !this.caltopoInfo || !this.caltopoInfo.map_id) {
            return; // No Caltopo data present
        }
        
        if (enabled) {
            // Show Caltopo layer
            if (!this.map.hasLayer(this.geojsonLayer)) {
                this.geojsonLayer.addTo(this.map);
            }
            // Apply folder visibility if folders exist
            if (Object.keys(this.caltopoFolders).length > 0) {
                this.updateCaltopoFolderVisibility();
            }
        } else {
            // Hide Caltopo layer (but keep button visible)
            if (this.map.hasLayer(this.geojsonLayer)) {
                this.map.removeLayer(this.geojsonLayer);
            }
        }
    }
    
    toggleCaltopoFoldersExpand() {
        this.isCaltopoFoldersExpanded = !this.isCaltopoFoldersExpanded;
        if (this.baseMapPopup && this.baseMapPopup.parentElement) {
            this.showBaseMapPopup();
        }
    }
    
    toggleCaltopoFolderExpand(folderName) {
        if (!this.caltopoFolders[folderName]) {
            console.warn('Folder not found:', folderName);
            return;
        }
        
        this.caltopoFolders[folderName].expanded = !this.caltopoFolders[folderName].expanded;
        console.log(`Toggled folder "${folderName}" expand to ${this.caltopoFolders[folderName].expanded ? 'OPEN' : 'CLOSED'}`);
        
        if (this.baseMapPopup && this.baseMapPopup.parentElement) {
            this.showBaseMapPopup();
        }
    }
    
    toggleCaltopoFolder(folderName, enabled) {
        if (!this.caltopoFolders[folderName]) {
            console.warn('Folder not found:', folderName);
            return;
        }
        
        this.caltopoFolders[folderName].enabled = enabled;
        console.log(`Toggled folder "${folderName}" to ${enabled ? 'ON' : 'OFF'}`);
        
        // When enabling a folder, enable all its features
        // When disabling a folder, disable all its features
        this.caltopoFolders[folderName].featureIds.forEach(featureId => {
            const featureState = this.caltopoFeatureStates.get(featureId);
            if (featureState) {
                featureState.enabled = enabled;
            }
        });
        
        // Update visibility
        this.updateCaltopoFolderVisibility();
        
        // Refresh popup if open
        if (this.baseMapPopup && this.baseMapPopup.parentElement) {
            this.showBaseMapPopup();
        }
    }
    
    toggleCaltopoFeature(featureId, enabled) {
        const featureState = this.caltopoFeatureStates.get(featureId);
        if (!featureState) {
            console.warn('Feature not found:', featureId);
            return;
        }
        
        featureState.enabled = enabled;
        console.log(`Toggled feature "${featureState.name}" (${featureId}) to ${enabled ? 'ON' : 'OFF'}`);
        
        // Update visibility
        this.updateCaltopoFolderVisibility();
        
        // Refresh popup if open
        if (this.baseMapPopup && this.baseMapPopup.parentElement) {
            this.showBaseMapPopup();
        }
    }
    updateCaltopoFolderVisibility() {
        // Show/hide individual features based on their folder state
        if (!this.geojsonLayer || !this.caltopoFeatureLayers || !this.isCaltopoLayerEnabled) {
            console.log("⚠️ Cannot update folder visibility:", {
                hasLayer: !!this.geojsonLayer,
                hasFeatureLayers: !!this.caltopoFeatureLayers,
                layerEnabled: this.isCaltopoLayerEnabled
            });
            return;
        }
        
        console.log("🔄 Updating Caltopo folder visibility...");
        console.log("   Feature layers map size:", this.caltopoFeatureLayers.size);
        console.log("   Feature to folder map size:", this.caltopoFeatureToFolder.size);
        console.log("   Folders:", this.caltopoFolders);
        
        let shown = 0, hidden = 0;
        
        this.caltopoFeatureLayers.forEach((layers, featureId) => {
            const folderName = this.caltopoFeatureToFolder.get(featureId);
            const folder = this.caltopoFolders[folderName];
            const featureState = this.caltopoFeatureStates.get(featureId);
            const shouldShow = folder && folder.enabled && featureState && featureState.enabled;
            
            console.log(`   Feature ${featureId}: folder="${folderName}", folderEnabled=${folder?.enabled}, featureEnabled=${featureState?.enabled}, shouldShow=${shouldShow}, layerCount=${layers?.length || 0}`);
            
            // layers is an array of actual Leaflet layers
            if (Array.isArray(layers)) {
                layers.forEach((layer, layerIdx) => {
                    const hasLayerInGroup = this.geojsonLayer.hasLayer(layer);
                    const hasLayerOnMap = this.map.hasLayer(layer);
                    console.log(`      Layer ${layerIdx}: type=${layer.constructor.name}, inGroup=${hasLayerInGroup}, onMap=${hasLayerOnMap}`);
                    
                    if (shouldShow) {
                        // Try both methods to add layer
                        if (!hasLayerInGroup) {
                            this.geojsonLayer.addLayer(layer);
                            shown++;
                            console.log(`         ✅ Added layer to geojsonLayer group`);
                        }
                        if (!hasLayerOnMap) {
                            layer.addTo(this.map);
                            shown++;
                            console.log(`         ✅ Added layer directly to map`);
                        }
                    } else {
                        // Try both methods to remove layer
                        let removed = false;
                        if (hasLayerInGroup) {
                            this.geojsonLayer.removeLayer(layer);
                            hidden++;
                            removed = true;
                            console.log(`         ❌ Removed layer from geojsonLayer group`);
                        }
                        if (hasLayerOnMap) {
                            this.map.removeLayer(layer);
                            hidden++;
                            removed = true;
                            console.log(`         ❌ Removed layer directly from map`);
                        }
                        if (!removed) {
                            console.log(`         ⚠️ Layer not found in group or map, cannot remove`);
                        }
                    }
                });
            } else {
                console.warn(`   ⚠️ layers is not an array for feature ${featureId}:`, layers);
            }
        });
        
        console.log(`✅ Folder visibility updated: ${shown} shown, ${hidden} hidden`);
    }
    safeColorConversion(colorString, defaultColor = '#3b82f6') {
        if (!colorString) return defaultColor;
        
        try {
            // Handle different color formats
            if (colorString.startsWith('#')) {
                // Already a hex color
                return colorString;
            } else if (colorString.startsWith('rgb')) {
                // RGB format - convert to hex
                const matches = colorString.match(/\d+/g);
                if (matches && matches.length >= 3) {
                    const r = parseInt(matches[0]).toString(16).padStart(2, '0');
                    const g = parseInt(matches[1]).toString(16).padStart(2, '0');
                    const b = parseInt(matches[2]).toString(16).padStart(2, '0');
                    return `#${r}${g}${b}`;
                }
            } else if (/^[0-9A-Fa-f]{6}$/.test(colorString)) {
                // Hex without #
                return `#${colorString}`;
            } else if (/^[0-9A-Fa-f]{8}$/.test(colorString)) {
                // ARGB format - take RGB part
                return `#${colorString.slice(2)}`;
            }
            
            // Try to use the color as-is if it's a named color
            const testDiv = document.createElement('div');
            testDiv.style.color = colorString;
            if (testDiv.style.color) {
                return colorString;
            }
        } catch (error) {
            console.warn('Failed to parse color:', colorString, error);
        }
        
        return defaultColor;
    }

    safeColorConversionWithAlpha(colorString, alpha = 0.3, defaultColor = '#3b82f6') {
        const baseColor = this.safeColorConversion(colorString, defaultColor);
        
        // Convert hex to rgba
        if (baseColor.startsWith('#')) {
            const hex = baseColor.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        return baseColor;
    }

    getFeatureStyle(feature) {
        const props = feature.properties || {};
        const defaultStyle = {
            fillColor: '#f59e0b',
            fillOpacity: POLYGON_FILL_OPACITY,
            color: '#f59e0b',
            weight: 2
        };

        // Handle different color properties with priority
        let strokeColor = defaultStyle.color;
        let fillColor = defaultStyle.fillColor;

        // Check for various stroke color properties
        if (props.strokeColor) {
            strokeColor = this.safeColorConversion(props.strokeColor, defaultStyle.color);
        } else if (props.stroke) {
            strokeColor = this.safeColorConversion(props.stroke, defaultStyle.color);
        } else if (props.color) {
            strokeColor = this.safeColorConversion(props.color, defaultStyle.color);
        }

        // Check for fill color properties
        if (props.fillColor) {
            fillColor = this.safeColorConversion(props.fillColor, defaultStyle.fillColor);
        } else if (props.fill) {
            fillColor = this.safeColorConversion(props.fill, defaultStyle.fillColor);
        }

        return {
            fillColor: fillColor,
            fillOpacity: props.fillOpacity || defaultStyle.fillOpacity,
            color: strokeColor,
            weight: props.strokeWidth || props.weight || defaultStyle.weight,
            opacity: props.strokeOpacity || 1,
            dashArray: props.dashArray || null
        };
    }

    createStyledMarker(feature, latlng) {
        const props = feature.properties || {};
        const color = this.safeColorConversion(props.color || props.fill, '#000000');

        // Create a colored marker icon using CSS
        const coloredIcon = L.divIcon({
            html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50% 50% 50% 0; border: 2px solid ${this.safeColorConversion(props.strokeColor || props.stroke, '#ffffff')}; transform: rotate(-45deg);"></div>`,
            className: 'colored-marker',
            iconSize: [20, 20],
            iconAnchor: [10, 20]
        });

        return L.marker(latlng, { icon: coloredIcon });
    }

    configureFeaturePopup(feature, layer) {
        const props = feature.properties || {};
        
        // Always show popup if there's a title or description
        // For Caltopo features, title should be available
        if (props.title || props.description) {
            let popupContent = '<div style="word-wrap: break-word; max-width: 200px;">';
            if (props.title) {
                popupContent += `<strong>${props.title}</strong>`;
            }
            if (props.description) {
                if (props.title) popupContent += '<br>';
                popupContent += props.description;
            }
            popupContent += '</div>';
            
            layer.bindPopup(popupContent, {
                maxWidth: 250,
                className: 'custom-popup'
            });
        } else {
            // Even if no title/description, show geometry type
            const geomType = feature.geometry?.type || 'Feature';
            layer.bindPopup(`<div style="word-wrap: break-word; max-width: 200px;"><strong>${geomType}</strong></div>`, {
                maxWidth: 250,
                className: 'custom-popup'
            });
        }
    }

    centerOnDrone() {
        if (!this.map || !this.currentLocation) return;

        // Toggle state
        if (this.droneMapCenteringState === 'CONTINUOUS') {
            this.droneMapCenteringState = 'OFF';
            console.log('Map centering disabled (OFF mode)');
        } else {
            this.droneMapCenteringState = 'CONTINUOUS';
            this.map.panTo(this.currentLocation);
            console.log('Map centering enabled (CONTINUOUS mode)');
        }

        // Update button visual state
        this.updateRecenterButtonStyle();
    }

    clearTrail() {
        if (this.trailPolyline) {
            this.trailPolyline.setLatLngs([]);
        }
        this.trailCoordinates = [];
    }

    clearData() {
        this.stopDronePopupRelativeTimer();
        this.resetGpsSignalTracking();

        if (this.droneMarker) {
            this.map.removeLayer(this.droneMarker);
            this.droneMarker = null;
        }
        if (this.droneClickMarker) {
            this.map.removeLayer(this.droneClickMarker);
            this.droneClickMarker = null;
        }

        this.clearTrail();
        this.clearOtherDrones();

        if (this.geojsonLayer) {
            this.geojsonLayer.clearLayers();
        }
        
        // Clear OpenSky interval and trails
        if (this.openSkyUpdateInterval) {
            clearInterval(this.openSkyUpdateInterval);
            this.openSkyUpdateInterval = null;
        }
        
        // Remove all OpenSky trails
        if (this.openSkyAircraftTrails) {
            this.openSkyAircraftTrails.forEach((trail, icao24) => {
                if (trail.polyline && this.map.hasLayer(trail.polyline)) {
                    this.map.removeLayer(trail.polyline);
                }
            });
            this.openSkyAircraftTrails.clear();
        }
        
        // Remove all OpenSky historical tracks
        if (this.openSkyAircraftTracks) {
            this.openSkyAircraftTracks.forEach((track, icao24) => {
                if (track.polyline && this.map.hasLayer(track.polyline)) {
                    this.map.removeLayer(track.polyline);
                }
            });
            this.openSkyAircraftTracks.clear();
        }
        
        // Clear OpenSky data
        if (this.openSkyAircraftData) {
            this.openSkyAircraftData.clear();
        }
        if (this.openSkyAircraftMarkers) {
            this.openSkyAircraftMarkers.clear();
        }

        this.currentLocation = null;
        this.currentDroneData = null;
        this.currentDroneName = null;
        this.currentLivestreamId = null;
        this.lastDroneUpdate = null;
        this.lastDroneTelemetryTimestamp = null;
        this.caltopoInfo = null;
        this.updateCaltopoButton();
    }

    setDataStale(isStale) {
        if (this.isDataStale === isStale) return;

        this.isDataStale = isStale;

        if (isStale) {
            this.showStaleDataOverlay();
            // Make drone marker semi-transparent
            if (this.droneMarker) {
                const element = this.droneMarker.getElement();
                if (element) {
                    element.style.opacity = '0.5';
                }
            }
        } else {
            this.hideStaleDataOverlay();
            // Restore drone marker opacity
            if (this.droneMarker) {
                const element = this.droneMarker.getElement();
                if (element) {
                    element.style.opacity = '1';
                }
            }
        }
    }

    showStaleDataOverlay() {
        if (this.staleDataOverlay) return;

        const mapContainer = document.getElementById('map');
        this.staleDataOverlay = document.createElement('div');
        this.staleDataOverlay.className = 'stale-data-banner';
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(this.staleDataOverlay);
        this.updateStaleDataOverlayContent();
        this.startDronePopupRelativeTimer();
    }
    hideStaleDataOverlay() {
        if (this.staleDataOverlay) {
            this.staleDataOverlay.remove();
            this.staleDataOverlay = null;
        }
        if (!this.droneClickMarker || !this.droneClickMarker.isPopupOpen()) {
            this.stopDronePopupRelativeTimer();
        }
        this.updateGpsOverlayPosition();
    }
    setGpsSignalState(hasSignal) {
        if (hasSignal) {
            if (this.gpsSignalLossTimer) {
                clearTimeout(this.gpsSignalLossTimer);
                this.gpsSignalLossTimer = null;
            }
            if (!this.isGpsSignalLost && !this.gpsSignalOverlay) {
                return;
            }
            if (this.gpsSignalRestoreTimer) {
                clearTimeout(this.gpsSignalRestoreTimer);
            }
            this.gpsSignalRestoreTimer = setTimeout(() => {
                this.hideGpsSignalOverlay();
                this.isGpsSignalLost = false;
                this.gpsSignalRestoreTimer = null;
            }, this.gpsSignalRestoreDelayMs);
        } else {
            if (this.gpsSignalRestoreTimer) {
                clearTimeout(this.gpsSignalRestoreTimer);
                this.gpsSignalRestoreTimer = null;
            }
            if (!this.isGpsSignalLost && !this.gpsSignalLossTimer) {
                this.gpsSignalLossTimer = setTimeout(() => {
                    this.showGpsSignalOverlay();
                    this.isGpsSignalLost = true;
                    this.gpsSignalLossTimer = null;
                }, this.gpsSignalLossDelayMs);
            }
        }
    }
    showGpsSignalOverlay() {
        if (this.gpsSignalOverlay) return;
        const mapContainer = document.getElementById('map');
        if (!mapContainer) return;

        this.gpsSignalOverlay = document.createElement('div');
        this.gpsSignalOverlay.className = 'gps-signal-banner';
        this.gpsSignalOverlay.innerHTML = `
            <div class="gps-signal-banner__header">
                <i class="bi bi-geo-alt-slash"></i>
                <span>No GPS signal</span>
            </div>
            <div class="gps-signal-banner__meta">Waiting for valid drone coordinates…</div>
        `;
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(this.gpsSignalOverlay);
        this.updateGpsOverlayPosition();
    }
    hideGpsSignalOverlay() {
        if (this.gpsSignalOverlay) {
            this.gpsSignalOverlay.remove();
            this.gpsSignalOverlay = null;
        }
    }
    updateGpsOverlayPosition() {
        if (!this.gpsSignalOverlay) return;
        const baseOffset = this.staleDataOverlay ? this.staleDataOverlay.offsetHeight + 16 : 12;
        this.gpsSignalOverlay.style.top = `${baseOffset}px`;
        this.gpsSignalOverlay.style.right = '12px';
    }
    resetGpsSignalTracking() {
        if (this.gpsSignalLossTimer) {
            clearTimeout(this.gpsSignalLossTimer);
            this.gpsSignalLossTimer = null;
        }
        if (this.gpsSignalRestoreTimer) {
            clearTimeout(this.gpsSignalRestoreTimer);
            this.gpsSignalRestoreTimer = null;
        }
        this.isGpsSignalLost = false;
        this.hideGpsSignalOverlay();
    }

    updateStaleDataOverlayContent() {
        if (!this.staleDataOverlay) return;

        const timestampMs = this.lastDroneTelemetryTimestamp ||
            (this.lastDroneUpdate instanceof Date ? this.lastDroneUpdate.getTime() : null);

        let relativeText = 'N/A';
        if (timestampMs) {
            const diffSeconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
            relativeText = this.formatRelativeDurationWithSeconds(diffSeconds);
        }

        const timestampAttr = timestampMs ? ` data-timestamp="${timestampMs}"` : '';

        this.staleDataOverlay.innerHTML = `
            <div class="stale-data-banner__header">
                <i class="bi bi-exclamation-triangle"></i>
                <span>Location data not updating</span>
            </div>
            <div class="stale-data-banner__meta">
                Last update received:
                <span class="drone-last-updated"${timestampAttr}>${relativeText}</span>
            </div>
        `;
        this.updateGpsOverlayPosition();
    }

    setDisconnected(isDisconnected) {
        if (this.isDisconnected === isDisconnected) return;

        this.isDisconnected = isDisconnected;

        if (isDisconnected) {
            this.showDisconnectedOverlay();
        } else {
            this.hideDisconnectedOverlay();
        }
    }

    showDisconnectedOverlay() {
        // Use the shared overlay instead of creating a new one
        if (window.showDisconnectedMessage) {
            window.showDisconnectedMessage();
        }
    }

    hideDisconnectedOverlay() {
        // Use the shared overlay instead of creating a new one
        if (window.hideDisconnectedMessage) {
            window.hideDisconnectedMessage();
        }
    }

    updateOtherDrones(otherDronesData) {
        if (!this.map) return;

        const currentDroneIds = new Set(Object.keys(otherDronesData));

        // Remove markers for drones that no longer exist
        for (const droneId in this.otherDroneMarkers) {
            if (!currentDroneIds.has(droneId)) {
                this.map.removeLayer(this.otherDroneMarkers[droneId].marker);
                delete this.otherDroneMarkers[droneId];
            }
        }

        // Update or create markers for each drone
        for (const [droneId, telemetryData] of Object.entries(otherDronesData)) {
            const location = telemetryData.state?.drone_gps_location;
            const pose = telemetryData.state?.drone_pose;

            if (!location || !pose) continue;

            const latLng = [location.lat, location.lng];

            // Convert telemetry data to format expected by generateDronePopupContent
            const droneData = {
                latitude: location.lat,
                longitude: location.lng,
                altitude_ahl: location.altitude_ahl_m,
                altitude_asl: location.altitude_asl_m,
                altitude_ellipsoid: location.altitude_ellipsoid_m,
                bearing: pose.yaw_deg,
                pitch: pose.pitch_deg,
                battery_percent: telemetryData.state?.misc?.battery_percent
            };

            const droneName = telemetryData.drone_name || telemetryData.drone_id || 'Other Drone';
            const livestreamId = telemetryData.livestream_id || null;

            // Add red dot indicator if this drone is livestreaming
            const redDot = livestreamId ?
                '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background-color: red; border-radius: 50%; border: 1px solid white;"></div>' :
                '';

            if (!this.otherDroneMarkers[droneId]) {
                // Create new marker
                const otherDroneIcon = L.divIcon({
                    html: `<div style="position: relative; width: 28px; height: 28px;"><img src="${this.getAssetPath('/images/livestream/map_other_drone_flyer_2.png')}" style="width: 28px; height: 28px; transform: rotate(${pose.yaw_deg}deg); transform-origin: center;">${redDot}</div>`,
                    className: 'other-drone-marker',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                });

                const marker = L.marker(latLng, {
                    icon: otherDroneIcon,
                    pane: 'droneMarkerPane'  // Use dedicated pane to ensure it's always on top
                }).addTo(this.map);

                // Add popup using shared popup generation
                marker.bindPopup(() => this.generateDronePopupContent(droneData, droneName, livestreamId), {
                    maxWidth: 300,
                    className: 'drone-popup'
                });

                this.otherDroneMarkers[droneId] = { marker, telemetryData };
            } else {
                // Update existing marker
                const markerInfo = this.otherDroneMarkers[droneId];
                markerInfo.marker.setLatLng(latLng);
                markerInfo.telemetryData = telemetryData;

                // Update rotation and red dot
                const markerElement = markerInfo.marker.getElement();
                if (markerElement) {
                    const container = markerElement.querySelector('div');
                    if (container) {
                        const img = container.querySelector('img');
                        if (img) {
                            img.style.transform = `rotate(${pose.yaw_deg}deg)`;
                        }

                        // Update red dot visibility
                        let existingDot = container.querySelector('div[style*="background-color: red"]');
                        if (livestreamId && !existingDot) {
                            // Add red dot
                            container.innerHTML += redDot;
                        } else if (!livestreamId && existingDot) {
                            // Remove red dot
                            existingDot.remove();
                        }
                    }
                }

                // Update popup if open
                if (markerInfo.marker.isPopupOpen()) {
                    const popup = markerInfo.marker.getPopup();
                    if (popup && popup._contentNode) {
                        popup._contentNode.innerHTML = this.generateDronePopupContent(droneData, droneName, livestreamId);
                    }
                }
            }
        }
    }

    clearOtherDrones() {
        if (!this.map) return;

        for (const droneId in this.otherDroneMarkers) {
            this.map.removeLayer(this.otherDroneMarkers[droneId].marker);
        }
        this.otherDroneMarkers = {};
    }

    resize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    // My Location Tracking Methods
    toggleMyLocation() {
        console.log('toggleMyLocation called, isMyLocationVisible:', this.isMyLocationVisible);
        if (this.isMyLocationVisible) {
            // Hide location - stop tracking and remove markers
            this.stopLocationTracking();
        } else {
            // Start tracking and center once location is available
            this.startLocationTracking();
        }
    }

    startLocationTracking() {
        console.log('Starting location tracking...');
        
        if (!navigator.geolocation) {
            if (!this.isAutoLocationRequest) {
            alert('Geolocation is not supported by this browser.');
            }
            this.isAutoLocationRequest = false;
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        console.log('Requesting current position...');

        // Get current position first
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Current position received:', position);
                this.isAutoLocationRequest = false; // Reset flag after successful location
                this.onLocationSuccess(position);
            },
            (error) => {
                console.error('Error getting current position:', error);
                this.onLocationError(error);
            },
            options
        );

        // Start watching position for updates
        console.log('Starting position watch...');
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                console.log('Position update received:', position);
                this.isAutoLocationRequest = false; // Reset flag after successful location
                this.onLocationSuccess(position);
            },
            (error) => {
                console.error('Error watching position:', error);
                this.onLocationError(error);
            },
            options
        );

        this.isMyLocationVisible = true;
        this.updateLocationButton();
    }

    stopLocationTracking() {
        if (this.watchId) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        if (this.myLocationMarker) {
            this.map.removeLayer(this.myLocationMarker);
            this.myLocationMarker = null;
        }

        if (this.myLocationCircle) {
            this.map.removeLayer(this.myLocationCircle);
            this.myLocationCircle = null;
        }

        this.isMyLocationVisible = false;
        this.updateLocationButton();
    }

    onLocationSuccess(position) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const heading = position.coords.heading;

        this.myLocationAccuracy = accuracy;

        // Update or create accuracy circle
        if (this.myLocationCircle) {
            this.myLocationCircle.setLatLng([lat, lng]).setRadius(accuracy);
        } else {
            this.myLocationCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#007bff',
                fillColor: '#007bff',
                fillOpacity: 0.1,
                weight: 1
            }).addTo(this.map);
        }

        // Check if this is the first time we're showing location
        const isFirstTime = this.myLocationMarker === null;
        
        // Update or create location marker
        if (this.myLocationMarker) {
            // Update existing marker position
            this.myLocationMarker.setLatLng([lat, lng]);
        } else {
            // Create new marker
            const iconHtml = this.createLocationIcon();
            this.myLocationMarker = L.marker([lat, lng], {
                icon: L.divIcon({
                    html: iconHtml,
                    className: 'my-location-marker',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(this.map);
        }

        // Center and zoom map on user location if it's the first time (on page load)
        if (isFirstTime && !this.hasZoomedToUserLocation) {
            // Use a slight delay to ensure map is fully rendered
            setTimeout(() => {
                this.map.invalidateSize(); // Ensure map size is correct
                this.map.setView([lat, lng], 15, { animate: false });
                this.hasZoomedToUserLocation = true; // Mark that we've zoomed to user location
                // Force another invalidate after setting view to ensure it takes
                setTimeout(() => {
                    this.map.invalidateSize();
                }, 50);
                console.log('Centered and zoomed map on user location:', lat, lng, 'zoom level: 15');
            }, 100);
        }
    }
    onLocationError(error) {
        console.error('Location error:', error);
        const wasAutoRequest = this.isAutoLocationRequest;
        this.isAutoLocationRequest = false; // Reset flag
        
        // On page load, silently fail and keep default map view
        // Only show error if user manually clicked the button
        if (wasAutoRequest) {
            // This is from automatic initialization, just log and keep default view
            console.log('Location not available on page load, using default map view');
            this.stopLocationTracking(); // Clean up tracking state
            return;
        }
        
        let message = 'Unable to retrieve your location. ';
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += 'Location access denied by user. Please enable location permissions in your browser settings.';
                break;
            case error.POSITION_UNAVAILABLE:
                message += 'Location information unavailable. Please check your GPS settings.';
                break;
            case error.TIMEOUT:
                message += 'Location request timed out. Please try again.';
                break;
            default:
                message += 'An unknown error occurred.';
                break;
        }
        
        console.log('Location error message:', message);
        alert(message);
        this.stopLocationTracking();
    }

    createLocationIcon() {
        // Google Maps style location marker (simple blue dot, no orientation indicator) - smaller size
        return `
            <div class="google-maps-location-marker" style="
                position: relative;
                width: 16px;
                height: 16px;
            ">
                <!-- White outer ring (shadow effect) -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 16px;
                    height: 16px;
                    background-color: white;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                "></div>
                <!-- Blue center dot -->
                <div style="
                    position: absolute;
                    top: 1px;
                    left: 1px;
                    width: 14px;
                    height: 14px;
                    background-color: #4285f4;
                    border-radius: 50%;
                    z-index: 1;
                "></div>
            </div>
        `;
    }
    updateLocationButton() {
        const button = document.getElementById('myLocationBtn');
        if (button) {
            if (this.isMyLocationVisible) {
                button.innerHTML = '<i class="bi bi-geo-alt-fill"></i> Hide My Location';
                button.style.backgroundColor = '#6c757d'; // Gray when on
                button.style.borderColor = '#6c757d';
                button.style.color = '#fff';
            } else {
                button.innerHTML = '<i class="bi bi-geo-alt"></i> Show My Location';
                button.style.backgroundColor = '#314268'; // Match Share Livestream and Connect buttons
                button.style.borderColor = '#314268';
                button.style.color = 'white';
            }
        }
    }

    // Multi-hit popup methods
    handleMapClick(e) {
        console.log('=== handleMapClick called ===');
        console.log('Click location:', e.latlng);
        console.log('Container point:', e.containerPoint);
        
        // Check if measurement mode is active
        if (this.measurementMode) {
            this.handleMeasurementClick(e);
            return;
        }
        
        // Don't handle clicks on popups or controls
        const target = e.originalEvent?.target;
        console.log('Click target:', target);
        if (target && (
            target.closest('.leaflet-popup') ||
            target.closest('.leaflet-control') ||
            target.closest('.multi-hit-popup')
        )) {
            console.log('Skipping - click was on popup or control');
            return;
        }
        
        console.log('Processing map click...');
        // Close any existing popup first
        this.closeMultiHitPopup();
        
        // Collect all features at click point
        console.log('Collecting features at point...');
        const features = this.collectFeaturesAtPoint(e.latlng, e.containerPoint);
        console.log('Features collected:', features.length, features);
        
        if (features.length === 0) {
            console.log('No features found at click point');
            return; // No features at click point
        }
        
        // Order features according to rules
        const orderedFeatures = this.orderFeatures(features);
        console.log('Ordered features:', orderedFeatures.length, orderedFeatures);
        
        // Store features and show popup
        this.multiHitFeatures = orderedFeatures;
        this.multiHitCurrentIndex = 0;
        this.multiHitOriginalLatLng = e.latlng; // Store original click location
        console.log('Creating popup...');
        this.createMultiHitPopup(e.latlng);
    }
    collectFeaturesAtPoint(latlng, containerPoint) {
        console.log('=== collectFeaturesAtPoint called ===');
        console.log('LatLng:', latlng);
        console.log('Container point:', containerPoint);
        console.log('isAirportsEnabled:', this.isAirportsEnabled);
        console.log('airportsMarkerCluster exists:', !!this.airportsMarkerCluster);
        
        const features = [];
        const seenIds = new Set();
        const tolerance = 10; // pixels
        
        // Convert pixel tolerance to lat/lng difference (approximate)
        const point = this.map.latLngToContainerPoint(latlng);
        const tolerancePoint1 = this.map.containerPointToLatLng(
            L.point(point.x - tolerance, point.y - tolerance)
        );
        const tolerancePoint2 = this.map.containerPointToLatLng(
            L.point(point.x + tolerance, point.y + tolerance)
        );
        
        // Collect from drone airspace polygons (check first so they appear earlier in ordering)
        if (this.isDroneAirspaceEnabled && this.droneAirspaceLayer) {
            this.droneAirspaceLayer.eachLayer((layer) => {
                if (layer.feature) {
                    const feature = layer.feature;
                    const id = this.getFeatureStableId(feature);
                    
                    // Skip if already seen
                    if (seenIds.has(id)) return;
                    
                    // Check if point is in polygon (with tolerance)
                    if (this.isPointNearPolygon(latlng, feature.geometry, tolerancePoint1, tolerancePoint2)) {
                        seenIds.add(id);
                        features.push({
                            feature: feature,
                            layerType: 'airspace',
                            isDroneAirspace: true,
                            leafletLayer: layer,
                            drawOrder: features.length
                        });
                    }
                }
            });
        }
        
        // Collect from regular airspace polygons
        if (this.isAirspaceEnabled && this.airspaceLayer) {
            this.airspaceLayer.eachLayer((layer) => {
                if (layer.feature) {
                    const feature = layer.feature;
                    const id = this.getFeatureStableId(feature);
                    
                    // Skip if already seen
                    if (seenIds.has(id)) return;
                    
                    // Check if point is in polygon (with tolerance)
                    if (this.isPointNearPolygon(latlng, feature.geometry, tolerancePoint1, tolerancePoint2)) {
                        seenIds.add(id);
                        features.push({
                            feature: feature,
                            layerType: 'airspace',
                            isDroneAirspace: false,
                            leafletLayer: layer,
                            drawOrder: features.length
                        });
                    }
                }
            });
        }
        
        // Collect from airport markers
        console.log('Checking airport markers...');
        console.log('isAirportsEnabled:', this.isAirportsEnabled);
        console.log('airportsMarkerCluster exists:', !!this.airportsMarkerCluster);
        if (this.isAirportsEnabled && this.airportsMarkerCluster) {
            console.log('Collecting airport markers...');
            let airportMarkerCount = 0;
            let markerLayerCount = 0;
            this.airportsMarkerCluster.eachLayer((layer) => {
                markerLayerCount++;
                if (layer instanceof L.Marker) {
                    airportMarkerCount++;
                    const markerLatLng = layer.getLatLng();
                    console.log(`Marker ${airportMarkerCount}:`, {
                        latlng: markerLatLng,
                        hasProperties: !!layer.airportProperties,
                        properties: layer.airportProperties
                    });
                    
                    // Check if click is near marker
                    const markerPoint = this.map.latLngToContainerPoint(markerLatLng);
                    const distance = Math.sqrt(
                        Math.pow(containerPoint.x - markerPoint.x, 2) +
                        Math.pow(containerPoint.y - markerPoint.y, 2)
                    );
                    
                    console.log(`Marker ${airportMarkerCount} distance:`, distance, 'tolerance:', tolerance * 2);
                    
                    if (distance <= tolerance * 2) { // Larger tolerance for markers
                        console.log('✓ Found nearby airport marker:', distance, layer.airportProperties);
                        if (layer.airportProperties) {
                            const props = layer.airportProperties;
                            const id = props.id || props._id || `airport-${props.icaoCode || props.name}`;
                            
                            if (!seenIds.has(id)) {
                                seenIds.add(id);
                                console.log('Adding airport feature:', id, props.name);
                                // Create feature-like object for airport
                                features.push({
                                    feature: {
                                        type: 'Feature',
                                        properties: props,
                                        geometry: {
                                            type: 'Point',
                                            coordinates: [latlng.lng, latlng.lat]
                                        }
                                    },
                                    layerType: 'airport',
                                    airportType: this.getAirportCategory(props.typeCode),
                                    drawOrder: features.length
                                });
                            } else {
                                console.log('Skipping duplicate airport:', id);
                            }
                        } else {
                            console.log('⚠ Marker has no airportProperties');
                        }
                    } else {
                        console.log(`Marker ${airportMarkerCount} too far:`, distance);
                    }
                } else {
                    console.log('Layer is not a Marker:', layer.constructor.name);
                }
            });
            console.log('=== Airport marker summary ===');
            console.log('Total layers in cluster:', markerLayerCount);
            console.log('Marker instances found:', airportMarkerCount);
            console.log('Features collected from airports:', features.length);
        } else {
            console.log('Skipping airport markers - not enabled or cluster not found');
        }
        
        // Collect from USA FAA Runways layer
        if (this.isRunwaysEnabled && this.runwaysLayer) {
            this.runwaysLayer.eachLayer((layer) => {
                if (layer.feature) {
                    const feature = layer.feature;
                    const id = `runway-${feature.properties?.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                    
                    if (seenIds.has(id)) return;
                    
                    // Check if point is in polygon (with tolerance)
                    if (layer.feature.geometry && this.isPointNearPolygon(latlng, layer.feature.geometry, tolerancePoint1, tolerancePoint2)) {
                        seenIds.add(id);
                        features.push({
                            feature: layer.feature,
                            layerType: 'faa-runways',
                            leafletLayer: layer,
                            drawOrder: features.length
                        });
                    }
                }
            });
        }
        
        // Collect from USA FAA UAS Map layer
        if (this.isFAAUASMapEnabled && this.faaUASMapLayer) {
            this.faaUASMapLayer.eachLayer((layer) => {
                if (layer.feature) {
                    const feature = layer.feature;
                    const id = `faauas-${feature.properties?.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                    
                    if (seenIds.has(id)) return;
                    
                    // Check if point is in polygon (with tolerance)
                    if (layer.feature.geometry && this.isPointNearPolygon(latlng, layer.feature.geometry, tolerancePoint1, tolerancePoint2)) {
                        seenIds.add(id);
                        features.push({
                            feature: layer.feature,
                            layerType: 'faa-uas',
                            leafletLayer: layer,
                            drawOrder: features.length
                        });
                    }
                }
            });
        }
        
        // Collect from USA FAA Airspace layer
        if (this.isFAAAirspaceEnabled && this.faaAirspaceLayer) {
            this.faaAirspaceLayer.eachLayer((layer) => {
                if (layer.feature) {
                    const feature = layer.feature;
                    const id = `faa-${feature.properties?.OBJECTID || feature.id || Math.random().toString(36).substr(2, 9)}`;
                    
                    if (seenIds.has(id)) return;
                    
                    // Check if point is in polygon (with tolerance)
                    if (layer.feature.geometry && this.isPointNearPolygon(latlng, layer.feature.geometry, tolerancePoint1, tolerancePoint2)) {
                        seenIds.add(id);
                        features.push({
                            feature: layer.feature,
                            layerType: 'faa-airspace',
                            leafletLayer: layer,
                            drawOrder: features.length
                        });
                    }
                }
            });
        }
        
        // Don't collect test airport markers - they have their own popups
        
        console.log('=== collectFeaturesAtPoint summary ===');
        console.log('Total features collected:', features.length);
        console.log('Feature types:', features.map(f => f.layerType));
        console.log('Features:', features);
        
        return features;
    }

    isPointNearPolygon(point, geometry, tolerance1, tolerance2) {
        // First check exact point-in-polygon
        if (this.isPointInPolygon(point.lng, point.lat, geometry)) {
            return true;
        }
        
        // Then check if point is within tolerance box
        if (geometry.type === 'Polygon' && geometry.coordinates) {
            const rings = geometry.coordinates;
            const outerRing = rings[0];
            
            // Check if any point in tolerance box intersects polygon
            const testPoints = [
                { lng: point.lng, lat: point.lat },
                { lng: tolerance1.lng, lat: tolerance1.lat },
                { lng: tolerance2.lng, lat: tolerance2.lat },
                { lng: tolerance1.lng, lat: tolerance2.lat },
                { lng: tolerance2.lng, lat: tolerance1.lat }
            ];
            
            for (const testPoint of testPoints) {
                if (this.pointInRing(testPoint.lng, testPoint.lat, outerRing)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    getFeatureStableId(feature) {
        return feature.id || 
               feature.properties?._id || 
               feature.properties?.id || 
               this.generateStableId(feature);
    }

    getAirportCategory(typeCode) {
        // 10 = Water Aerodrome
        if (typeCode === 10) return 'water';
        // 4 = Heliport Military, 7 = Heliport Civil
        if (typeCode === 4 || typeCode === 7) return 'heliport';
        // Everything else is airport
        return 'airport';
    }

    orderFeatures(features) {
        // Ordering rules:
        // 1. Airspace polygons (sorted by altitude: highest first)
        // 2. Water aerodromes
        // 3. Airports
        // 4. Heliports
        // 5. Fallback circles
        
        const orderValue = (item) => {
            if (item.layerType === 'airspace') return 1;
            if (item.airportType === 'water') return 2;
            if (item.airportType === 'airport') return 3;
            if (item.airportType === 'heliport') return 4;
            if (item.feature?.properties?.isFallback) return 5;
            return 6; // Unknown
        };
        
        return features.sort((a, b) => {
            const orderA = orderValue(a);
            const orderB = orderValue(b);
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            // Within same group (airspace), sort by altitude (highest first)
            if (orderA === 1 && orderB === 1) {
                const upperA = a.feature?.properties?.upperLimitFt;
                const upperB = b.feature?.properties?.upperLimitFt;
                
                if (upperA !== undefined && upperB !== undefined) {
                    return upperB - upperA; // Descending order
                }
                if (upperA !== undefined && upperB === undefined) return -1;
                if (upperA === undefined && upperB !== undefined) return 1;
                
                const lowerA = a.feature?.properties?.lowerLimitFt;
                const lowerB = b.feature?.properties?.lowerLimitFt;
                
                if (lowerA !== undefined && lowerB !== undefined) {
                    return lowerB - lowerA; // Descending order
                }
            }
            
            // Within same group, preserve draw order
            return a.drawOrder - b.drawOrder;
        });
    }
    createMultiHitPopup(latlng) {
        if (this.multiHitFeatures.length === 0) return;
        
        // Create popup content for current feature
        const content = this.buildPopupContent(this.multiHitFeatures[this.multiHitCurrentIndex]);
        
        // Create Leaflet popup with fixed dimensions
        const isMobile = window.innerWidth < 768;
        const popupMaxWidth = isMobile ? 300 : 320;
        const popupMaxHeight = isMobile ? 270 : 300;
        
        this.multiHitPopup = L.popup({
            className: 'multi-hit-popup',
            closeButton: true,
            autoClose: false,
            closeOnClick: false,
            maxWidth: popupMaxWidth,
            maxHeight: popupMaxHeight
        })
        .setLatLng(latlng)
        .setContent(content)
        .openOn(this.map);
        
        // Set fixed width and height after popup is created
        const popupEl = this.multiHitPopup.getElement();
        if (popupEl) {
            // Use responsive width for mobile, fixed for desktop
            const isMobile = window.innerWidth < 768;
            const width = isMobile ? '280px' : '300px';
            const height = isMobile ? '250px' : '280px';
            
            popupEl.style.width = width;
            popupEl.style.height = height;
            popupEl.style.maxWidth = width;
            popupEl.style.maxHeight = height;
            popupEl.style.minWidth = width;
            popupEl.style.minHeight = height;
        }
        
        // Highlight the currently selected airspace layer (including USA FAA layers)
        const currentItem = this.multiHitFeatures[this.multiHitCurrentIndex];
        if ((currentItem.layerType === 'airspace' || 
             currentItem.layerType === 'faa-runways' || 
             currentItem.layerType === 'faa-uas' || 
             currentItem.layerType === 'faa-airspace') && 
            currentItem.leafletLayer) {
            this.highlightAirspaceLayer(currentItem.leafletLayer, currentItem.feature, currentItem.isDroneAirspace);
        }
        
        // Add event listeners to prevent clicks from propagating to map
        const popupElement = this.multiHitPopup.getElement();
        if (popupElement) {
            // Prevent all clicks inside popup from bubbling to map
            popupElement.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Prevent mousedown/touchstart events too
            popupElement.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            
            popupElement.addEventListener('touchstart', (e) => {
                e.stopPropagation();
            });
            
            // Add keyboard event listener
            popupElement.setAttribute('tabindex', '0');
            popupElement.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    this.navigatePopup(-1);
                    e.preventDefault();
                    e.stopPropagation();
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    this.navigatePopup(1);
                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    }

    findAssociatedAirport(airspaceName, airspaceCode) {
        // Find airport associated with airspace by name or ICAO code
        // Examples: "NANAIMO CZ" -> "NANAIMO", "CYVR TCA" -> "CYVR"
        if (!airspaceName) return null;
        
        const nameUpper = airspaceName.toUpperCase();
        let locationName = null;
        
        // Extract location name from airspace name (remove common suffixes)
        // Patterns: "LOCATION CZ", "LOCATION TCA", "LOCATION CTR", etc.
        const locationMatch = nameUpper.match(/^([A-Z\s]+?)\s+(CZ|TCA|CTR|ATZ|HTZ|AWY|CTA|TMA|FIR)$/);
        if (locationMatch) {
            locationName = locationMatch[1].trim();
        } else {
            // If no match, try using the whole name
            locationName = nameUpper;
        }
        
        // Try matching by ICAO code first (most reliable)
        if (airspaceCode) {
            const icaoUpper = String(airspaceCode).toUpperCase();
            const airport = this.airportsIndex.get(`ICAO:${icaoUpper}`);
            if (airport && airport.id) {
                return airport;
            }
        }
        
        // Try exact match on location name
        if (locationName) {
            const airport = this.airportsIndex.get(locationName);
            if (airport && airport.id) {
                return airport;
            }
        }
        
        // Try partial name match - airport name starts with location name
        // e.g., "NANAIMO" matches "NANAIMO AIRPORT", "NANAIMO HARBOUR", etc.
        if (locationName) {
            for (const [key, airport] of this.airportsIndex.entries()) {
                if (key.startsWith('ICAO:')) continue; // Skip ICAO entries
                const airportNameUpper = key;
                // Check if airport name starts with location name (most common pattern)
                if (airportNameUpper.startsWith(locationName) || locationName.startsWith(airportNameUpper)) {
                    return airport;
                }
                // Also check if airport name contains location name (e.g., "NANAIMO HARBOUR WATER AIRPORT")
                const words = locationName.split(/\s+/);
                if (words.length > 0 && airportNameUpper.includes(words[0])) {
                    return airport;
                }
            }
        }
        
        return null;
    }
    buildPopupContent(item) {
        const feature = item.feature;
        const props = feature.properties || {};
        const layerType = item.layerType || 'unknown';
        const airportType = item.airportType || null;
        
        // Determine layer name and type
        let layerName = 'Unknown';
        let typeLabel = '';
        
        const isDroneAirspace = item.isDroneAirspace || false;
        
        if (layerType === 'airspace') {
            layerName = isDroneAirspace ? 'Airspace (At Ground)' : 'Airspace (All)';
            typeLabel = props.type || props.typeCode || '';
        } else if (layerType === 'faa-runways') {
            layerName = 'USA FAA Runways';
            typeLabel = props.type || props.TYPE || '';
        } else if (layerType === 'faa-uas') {
            layerName = 'USA FAA UAS Map';
            typeLabel = props.type || props.TYPE || '';
        } else if (layerType === 'faa-airspace') {
            layerName = 'USA FAA airspace (At Ground)';
            typeLabel = props.CLASS_CODE || props.class_code || props.CLASS || props.class || props.TYPE || props.type || '';
        } else if (layerType === 'airport') {
            layerName = airportType === 'water' ? 'Water Aerodrome' : 
                       airportType === 'heliport' ? 'Heliport' : 'Airport';
            const typeCategory = this.getAirportTypeCategory(props.typeCode || props.type);
            typeLabel = typeCategory || '';
        }
        
        // Build content with fixed dimensions and scrollable content area
        // Use responsive width for mobile
        const isMobile = window.innerWidth < 768;
        const containerWidth = isMobile ? '280px' : '300px';
        const containerHeight = isMobile ? '250px' : '280px';
        
        let content = `
            <div style="font-family: Arial, sans-serif; width: ${containerWidth}; height: ${containerHeight}; display: flex; flex-direction: column; box-sizing: border-box; padding: 12px; padding-top: 16px;">
                <!-- Pager UI - fixed at top with spacing for close button -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; padding-right: 36px; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;">
                    <button onclick="event.stopPropagation(); window.droneMap.navigatePopup(-1); return false;" 
                            style="${this.multiHitCurrentIndex > 0 ? 'background: #007bff; color: white; cursor: pointer;' : 'background: #ccc; color: #666; cursor: not-allowed;'} border: none; padding: 6px 10px; border-radius: 4px; font-size: 16px; pointer-events: auto; min-width: 36px;" 
                            ${this.multiHitCurrentIndex <= 0 ? 'disabled' : ''}>
                        ↑
                    </button>
                    <span style="font-size: 13px; font-weight: 600; color: #333;">
                        ${this.multiHitCurrentIndex + 1} of ${this.multiHitFeatures.length}
                    </span>
                    <button onclick="event.stopPropagation(); window.droneMap.navigatePopup(1); return false;" 
                            style="${this.multiHitCurrentIndex < this.multiHitFeatures.length - 1 ? 'background: #007bff; color: white; cursor: pointer;' : 'background: #ccc; color: #666; cursor: not-allowed;'} border: none; padding: 6px 10px; border-radius: 4px; font-size: 16px; pointer-events: auto; min-width: 36px;" 
                            ${this.multiHitCurrentIndex >= this.multiHitFeatures.length - 1 ? 'disabled' : ''}>
                        ↓
                    </button>
                </div>
                
                <!-- Scrollable content area -->
                <div class="popup-scrollable-content" style="overflow-y: scroll; overflow-x: hidden; flex: 1; padding-right: 8px; padding-left: 2px; -webkit-overflow-scrolling: touch;">
                <!-- Title line -->
                    <div style="margin-bottom: 12px;">
                        <strong style="font-size: 13px; color: #666; word-wrap: break-word;">${layerName}</strong>
                        ${typeLabel ? `<span style="font-size: 12px; color: #999; margin-left: 8px; word-wrap: break-word;">(${typeLabel})</span>` : ''}
                </div>
                
                <!-- Name -->
                    <div style="margin-bottom: 10px;">
                        <strong style="font-size: 14px; color: #333; word-wrap: break-word; display: block; line-height: 1.4;">${
                        layerType === 'faa-runways' ? (props.name || props.NAME || props.Runway || 'Runway Area') :
                        layerType === 'faa-uas' ? (props.name || props.NAME || props.Facility || 'UAS Facility Area') :
                            layerType === 'faa-airspace' ? (props.NAME_TXT || props.name_txt || props.NAME || props.name || 'Unnamed Airspace') :
                        (props.name || 'Unknown')
                    }</strong>
                </div>
        `;
        
        // ICAO code for airports/heliports
        if (layerType === 'airport') {
            const icaoCodeDisplay = props.icaoCode || props.icao || props.code;
            if (icaoCodeDisplay) {
                content += `<div style="margin-bottom: 8px; font-size: 12px; word-wrap: break-word; line-height: 1.5;"><strong>ICAO Code:</strong> ${icaoCodeDisplay}</div>`;
            }
        }
        
        // ICAO class (for OpenAIP airspace only)
        if (layerType === 'airspace') {
        const icaoClass = props.icaoClass || (props.icaoClassNumeric !== undefined ? ['A','B','C','D','E','F','G',null,'Unclassified'][props.icaoClassNumeric] : null);
        if (icaoClass) {
            content += `<div style="margin-bottom: 8px; font-size: 12px; word-wrap: break-word; line-height: 1.5;"><strong>ICAO Class:</strong> ${icaoClass}</div>`;
            }
        }
        
        // Type label (for all layers)
        if (typeLabel) {
            content += `<div style="margin-bottom: 8px; font-size: 12px; word-wrap: break-word; line-height: 1.5;"><strong>Type:</strong> ${typeLabel}</div>`;
        }
        
        // Altitude limits (for OpenAIP airspace only)
        if (layerType === 'airspace') {
        const lowerLimit = this.formatAltitudeWithDatum(
            props.lowerLimitRaw !== undefined ? props.lowerLimitRaw : props.lowerLimit,
            props.lowerLimitUnit,
            props.lowerLimitReferenceDatum
        );
        const upperLimit = this.formatAltitudeWithDatum(
            props.upperLimitRaw !== undefined ? props.upperLimitRaw : props.upperLimit,
            props.upperLimitUnit,
            props.upperLimitReferenceDatum
        );
        
        if (lowerLimit !== 'N/A' || upperLimit !== 'N/A') {
            content += `
                <div style="margin-bottom: 8px; font-size: 12px; word-wrap: break-word; line-height: 1.5;">
                    <strong>Lower:</strong> ${lowerLimit}<br>
                    <strong>Upper:</strong> ${upperLimit}
                </div>
            `;
            }
        }
        
        // Additional properties for USA FAA layers
        if (layerType === 'faa-runways' || layerType === 'faa-uas' || layerType === 'faa-airspace') {
            // Show name if available
            const displayName = props.name || props.NAME || props.Facility || props.Runway || 'Unnamed';
            if (displayName && displayName !== props.name) {
                // Name was already shown in title, but show if different
            }
            
            // Show Lower and Upper for FAA airspace layers (use DISTVERTLOWER_VAL and DISTVERTUPPER_VAL)
            if (layerType === 'faa-airspace') {
                const distVertLowerVal = props.DISTVERTLOWER_VAL !== undefined ? props.DISTVERTLOWER_VAL : (props.distvertlower_val !== undefined ? props.distvertlower_val : null);
                const distVertUpperVal = props.DISTVERTUPPER_VAL !== undefined ? props.DISTVERTUPPER_VAL : (props.distvertupper_val !== undefined ? props.distvertupper_val : null);
                const distVertUpperCode = props.DISTVERTUPPER_CODE || props.distvertupper_code || 'FT';
                
                const lowerDisplay = (distVertLowerVal !== null && distVertLowerVal !== undefined) ? `${distVertLowerVal}` : 'N/A';
                const upperDisplay = (distVertUpperVal !== null && distVertUpperVal !== undefined) ? `${distVertUpperVal} ${distVertUpperCode}` : 'N/A';
                
                content += `
                    <div style="margin-bottom: 8px; font-size: 12px; word-wrap: break-word; line-height: 1.5;">
                        <strong>Lower:</strong> ${lowerDisplay}<br>
                        <strong>Upper:</strong> ${upperDisplay}
                    </div>
                `;
            }
            
            // Show any other relevant properties
            if (props.altitude || props.ALTITUDE) {
                content += `<div style="margin-bottom: 8px; font-size: 12px; word-wrap: break-word; line-height: 1.5;"><strong>Altitude:</strong> ${props.altitude || props.ALTITUDE}</div>`;
            }
        }
        
        // Associated airport link for airspace
        if (layerType === 'airspace') {
            const associatedAirport = this.findAssociatedAirport(props.name, props.code || props.icaoCode || props.icao);
            if (associatedAirport && associatedAirport.id) {
                const airportUrl = `https://www.openaip.net/data/airports/${associatedAirport.id}`;
                content += `
                    <div style="margin-top: 12px; margin-bottom: 8px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                        <div style="font-size: 12px; margin-bottom: 6px; word-wrap: break-word; line-height: 1.5;"><strong>Associated Airport:</strong> ${associatedAirport.name || 'Unknown'}</div>
                        <a href="${airportUrl}" target="_blank" rel="noopener noreferrer"
                           onclick="window.open('${airportUrl}', '_blank'); return false;"
                           style="font-size: 12px; font-weight: bold; color: #0066cc; text-decoration: underline; cursor: pointer; word-wrap: break-word; display: block; line-height: 1.5;">
                            View Airport on OpenAIP
                        </a>
                    </div>
                `;
            }
        }
        
        // Fallback circle note
        if (props.isFallback && props.fallbackRadiusNM !== undefined) {
            content += `
                <div style="margin-top: 10px; margin-bottom: 8px; font-style: italic; color: #666; font-size: 11px; word-wrap: break-word; line-height: 1.5;">
                    Default radius ${props.fallbackRadiusNM} NM used
                </div>
            `;
        }
        
        // Raw properties toggle
        const featureId = `feature-${this.getFeatureStableId(feature)}`;
        content += `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0;">
                <button onclick="event.stopPropagation(); window.droneMap.toggleRawProperties('${featureId}'); return false;" 
                        style="background: #6c757d; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; pointer-events: auto; min-width: 32px; min-height: 32px;">
                    i
                </button>
                <pre id="${featureId}" style="display: none; margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 10px; overflow-y: visible; word-wrap: break-word; white-space: pre-wrap; line-height: 1.4;">${JSON.stringify(props, null, 2)}</pre>
            </div>
                </div>
            </div>
        `;
        
        return content;
    }

    navigatePopup(direction) {
        if (this.multiHitFeatures.length <= 1) return;
        
        this.multiHitCurrentIndex += direction;
        
        // Don't wrap around - stay at boundaries
        if (this.multiHitCurrentIndex < 0) {
            this.multiHitCurrentIndex = 0;
        } else if (this.multiHitCurrentIndex >= this.multiHitFeatures.length) {
            this.multiHitCurrentIndex = this.multiHitFeatures.length - 1;
        }
        
        // Update popup content while keeping same position at original click location
        if (this.multiHitPopup && this.multiHitOriginalLatLng) {
            const content = this.buildPopupContent(this.multiHitFeatures[this.multiHitCurrentIndex]);
            // Keep popup at original click location
            this.multiHitPopup.setContent(content);
            this.multiHitPopup.setLatLng(this.multiHitOriginalLatLng);
            
            // Ensure fixed dimensions are maintained
            const popupEl = this.multiHitPopup.getElement();
            if (popupEl) {
                // Use responsive width for mobile, fixed for desktop
                const isMobile = window.innerWidth < 768;
                const width = isMobile ? '280px' : '300px';
                const height = isMobile ? '250px' : '280px';
                
                popupEl.style.width = width;
                popupEl.style.height = height;
                popupEl.style.maxWidth = width;
                popupEl.style.maxHeight = height;
                popupEl.style.minWidth = width;
                popupEl.style.minHeight = height;
            }
            
            // Update highlight for the newly selected layer (including USA FAA layers)
            const currentItem = this.multiHitFeatures[this.multiHitCurrentIndex];
            if ((currentItem.layerType === 'airspace' || 
                 currentItem.layerType === 'faa-runways' || 
                 currentItem.layerType === 'faa-uas' || 
                 currentItem.layerType === 'faa-airspace') && 
                currentItem.leafletLayer) {
                this.highlightAirspaceLayer(currentItem.leafletLayer, currentItem.feature, currentItem.isDroneAirspace);
            } else {
                // If switching to non-airspace, unhighlight previous
                this.unhighlightAirspaceLayer();
            }
        }
    }

    toggleRawProperties(featureId) {
        const pre = document.getElementById(featureId);
        const button = pre?.previousElementSibling;
        
        if (pre && button) {
            // Just toggle visibility, keep button as 'i'
            if (pre.style.display === 'none') {
                pre.style.display = 'block';
            } else {
                pre.style.display = 'none';
            }
        }
        
        // Ensure popup stays at original location
        if (this.multiHitPopup && this.multiHitOriginalLatLng) {
            this.multiHitPopup.setLatLng(this.multiHitOriginalLatLng);
        }
    }

    closeMultiHitPopup() {
        if (this.multiHitPopup) {
            this.map.closePopup(this.multiHitPopup);
            this.multiHitPopup = null;
            this.multiHitFeatures = [];
            this.multiHitCurrentIndex = 0;
            this.multiHitOriginalLatLng = null;
            this.unhighlightAirspaceLayer(); // Remove highlight when popup closes
        }
    }
    showAddRadiusDialog(airportName, lat, lng) {
        // Get the map panel to append modal to it
        const mapPanel = document.getElementById('map-panel');
        if (!mapPanel) {
            console.warn('Map panel not found, cannot show radius dialog');
            return;
        }
        
        // Create modal overlay - positioned relative to map panel
        const modal = document.createElement('div');
        modal.id = 'addRadiusModal';
        modal.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            margin: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #333;">${airportName === 'Coordinate Point' ? 'Add Radius Around Point' : 'Add Radius Around Airport'}</h2>
            ${airportName !== 'Coordinate Point' ? `<p style="margin: 0 0 16px 0; line-height: 1.5; color: #666; font-size: 14px;">
                Airport: <strong>${airportName}</strong>
            </p>` : ''}
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; font-size: 14px; color: #333;">Distance:</label>
                <input type="number" id="radiusValue" value="5" step="0.01" min="0.01" max="1000" 
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 6px; font-size: 14px; color: #333;">Unit:</label>
                <select id="radiusUnit" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
                    <option value="NM">Nautical Miles</option>
                    <option value="MI">Miles</option>
                    <option value="KM">Kilometers</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelRadiusBtn" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                ">Cancel</button>
                <button id="generateRadiusBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                ">Generate Radius</button>
            </div>
        `;

        modal.appendChild(modalContent);
        mapPanel.appendChild(modal);

        // Handle cancel button
        const cancelBtn = modalContent.querySelector('#cancelRadiusBtn');
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Handle generate button
        const generateBtn = modalContent.querySelector('#generateRadiusBtn');
        generateBtn.addEventListener('click', () => {
            const value = parseFloat(document.getElementById('radiusValue').value);
            const unit = document.getElementById('radiusUnit').value;
            
            if (isNaN(value) || value <= 0) {
                alert('Please enter a valid distance greater than 0.');
                return;
            }
            
            this.addAirportRadius(lat, lng, value, unit, airportName);
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    addAirportRadius(lat, lng, value, unit, airportName) {
        // Convert to nautical miles for consistent storage
        let radiusNM = value;
        if (unit === 'MI') {
            radiusNM = value / 1.15078; // Convert miles to NM
        } else if (unit === 'KM') {
            radiusNM = value / 1.852; // Convert kilometers to NM
        }
        
        // Convert NM to meters for Leaflet (1 NM = 1852 m)
        const radiusM = radiusNM * 1852;
        
        // Create circle
        const circle = L.circle([lat, lng], {
            radius: radiusM,
            color: '#ff0000',
            fillColor: '#ff0000',
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.8
        }).addTo(this.map);
        
        // Store reference with metadata
        this.airportRadiusCircles.push({
            circle: circle,
            airportName: airportName,
            radiusNM: radiusNM.toFixed(2),
            unit: unit,
            originalValue: value.toFixed(2),
            lat: lat,
            lng: lng
        });
        
        // Add popup to circle
        const radiusLabel = `${radiusNM.toFixed(2)} NM`;
        const circleIndex = this.airportRadiusCircles.length - 1;
        circle.bindPopup(`
            <div style="font-family: Arial, sans-serif; min-width: 200px;">
                <div style="margin-bottom: 8px;"><strong>Airport:</strong> ${airportName}</div>
                <div style="margin-bottom: 8px;"><strong>Radius:</strong> ${radiusLabel}</div>
                <button onclick="window.droneMap.removeAirportRadiusByIndex(${circleIndex}); return false;" 
                        style="background: #dc3545; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    Remove
                </button>
            </div>
        `);
        
        console.log(`Added radius circle: ${radiusLabel} around ${airportName}`);
    }
    
    removeAirportRadiusByIndex(index) {
        if (index >= 0 && index < this.airportRadiusCircles.length) {
            const radiusData = this.airportRadiusCircles[index];
            this.map.removeLayer(radiusData.circle);
            this.airportRadiusCircles.splice(index, 1);
            console.log(`Removed radius circle around ${radiusData.airportName}`);
        }
    }
    
    removeAirportRadius(index) {
        // Alias for backwards compatibility
        this.removeAirportRadiusByIndex(index);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Wait for the map container to be available
    const initMap = (retryCount = 0) => {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            try {
        window.droneMap = new DroneMap();
                console.log('DroneMap initialized successfully');
            } catch (error) {
                console.error('Failed to initialize DroneMap:', error);
            }
        } else if (retryCount < 50) { // Max 5 seconds of retries
            console.log(`Map container not found, retrying in 100ms... (attempt ${retryCount + 1})`);
            setTimeout(() => initMap(retryCount + 1), 100);
        } else {
            console.error('Failed to find map container after 5 seconds');
        }
    };
    
    // Start trying to initialize after a short delay
    setTimeout(() => initMap(), 100);
});