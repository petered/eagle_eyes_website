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
        this.disconnectedTimer = null;
        this.disconnectedDelayMs = 2000; // 2 second delay before showing disconnected banner
        this.currentDroneData = null;
        this.currentDroneName = null;
        this.currentLivestreamId = null; // Current drone's livestream ID
        this.lastDroneUpdate = null; // Timestamp of last drone data update
        this.lastDroneTelemetryTimestamp = null; // Numeric timestamp from telemetry (ms)
        this.droneMapCenteringState = 'OFF'; // 'CONTINUOUS' or 'OFF'
        this.dronePopupRelativeTimer = null; // Interval for updating "Last Updated" relative text
        
        // Photo points storage
        this.photoPoints = []; // Array of { id, name, lat, lng, imageData, timestamp }
        this.photoPointMarkers = {}; // Map of photoPointId -> marker
        this.photoPointsControl = null;
        this.photoPointsPopup = null;
        
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
        this.photoPointsPopupResizeHandler = null;
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
        this.fullscreenMapControl = null;
        
        // Beta disclaimer tracking
        this.hasShownBetaDisclaimer = false;
        this.betaDisclaimerStorageKey = 'ee_beta_disclaimer_ack_v1';
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const acknowledged = window.localStorage.getItem(this.betaDisclaimerStorageKey);
                if (acknowledged === 'true') {
                    this.hasShownBetaDisclaimer = true;
                    console.log('Beta disclaimer already acknowledged (loaded from localStorage)');
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
            
            // Load photo points from storage (async)
            this.loadPhotoPointsFromStorage().catch(err => {
                console.error('Error loading photo points:', err);
            });
            
            // Load photo point from URL parameter if present
            setTimeout(() => {
                this.loadPhotoPointFromUrl();
            }, 1000);
            
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
    handleCaltopoFolderToggleClick() {
        this.toggleCaltopoFoldersExpand();
        if (!this.baseMapPopup) return;

        const contentEl = this.baseMapPopup.querySelector('.basemap-popup__content');
        const caltopoToggleRow = this.baseMapPopup.querySelector('#caltopoLayerToggle')?.closest('div');

        if (contentEl && caltopoToggleRow) {
            const scrollTarget = caltopoToggleRow.offsetTop - 12;
            contentEl.scrollTo({
                top: Math.max(scrollTarget, 0),
                behavior: 'smooth'
            });
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
        
        // Add photo points control fourth (below measurement control)
        this.addPhotoPointsControl();
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
    
    addPhotoPointsControl() {
        const PhotoPointsControl = L.Control.extend({
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
                container.id = 'photoPointsControl';
                container.style.display = 'block'; // Always visible
                
                const button = L.DomUtil.create('a', 'leaflet-control-photo-points', container);
                button.innerHTML = `<i class="bi bi-camera-fill" style="font-size: 20px; color: white; display: block; margin: auto;"></i>`;
                button.href = '#';
                button.role = 'button';
                button.title = 'Photo Points';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';
                button.style.width = '100%';
                button.style.height = '100%';

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                          .on(button, 'click', () => {
                              window.droneMap.showPhotoPointsPopup();
                          }, this);

                return container;
            }
        });
        this.photoPointsControl = new PhotoPointsControl();
        this.map.addControl(this.photoPointsControl);
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
                button.title = 'Map Layers';
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
                    " onmouseover="this.style.color='#374151'" onmouseout="this.style.color='#6b7280'" onclick="event.stopPropagation(); window.droneMap.handleCaltopoFolderToggleClick(); return false;" title="${this.isCaltopoFoldersExpanded ? 'Hide' : 'Show'} Folders">
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
            baseMapContent.addEventListener('wheel', (event) => {
                event.stopPropagation();
            }, { passive: false });
            baseMapContent.addEventListener('touchmove', (event) => {
                event.stopPropagation();
            }, { passive: false });
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
    
    showPhotoPointsPopup() {
        if (this.photoPointsPopup) {
            this.closePhotoPointsPopup();
        }
        
        const mapContainer = this.map ? this.map.getContainer() : null;
        if (!mapContainer) return;
        
        this.photoPointsPopup = document.createElement('div');
        this.photoPointsPopup.className = 'measurement-popup'; // Reuse measurement popup styles
        
        // Generate list of photo points
        const photoPointsList = this.photoPoints.length > 0
            ? this.photoPoints.map(pp => {
                const date = new Date(pp.timestamp);
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="photo-point-list-item" data-photo-point-id="${pp.id}" style="padding: 10px; margin-bottom: 8px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f3f4f6'; this.style.borderColor='#d1d5db'" onmouseout="this.style.background='#f9fafb'; this.style.borderColor='#e5e7eb'">
                        <div style="font-weight: 600; font-size: 12px; color: #374151; margin-bottom: 4px;">${pp.name}</div>
                        <div style="font-size: 10px; color: #6b7280;">${dateStr} ${timeStr}</div>
                        <div style="font-size: 10px; color: #6b7280;">${pp.lat.toFixed(6)}, ${pp.lng.toFixed(6)}</div>
                    </div>
                `;
            }).join('')
            : '<div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">No photo points yet</div>';
        
        this.photoPointsPopup.innerHTML = `
            <div class="measurement-popup__header">
                <div class="measurement-popup__title">Photo Points</div>
                <button id="closePhotoPointsBtn" class="measurement-popup__close" type="button" aria-label="Close photo points panel">×</button>
            </div>
            <div class="measurement-popup__content">
                <button id="addPhotoPointBtn" style="
                    width: 100%;
                    padding: 12px;
                    background: #28a745;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                    <i class="bi bi-camera-fill" style="font-size: 16px;"></i>
                    Add Photo Point
                </button>
                <div style="font-size: 11px; color: #6b7280; font-weight: 500; margin-bottom: 10px;">Existing Photo Points:</div>
                <div class="photo-points-list-container" style="max-height: 400px; overflow-y: auto; overflow-x: hidden; padding-right: 4px; margin-right: -2px;">
                    ${photoPointsList}
                </div>
            </div>
        `;
        
        mapContainer.appendChild(this.photoPointsPopup);

        // Add scrollable popup interactions to prevent map dragging (same as basemap popup)
        this.attachScrollablePopupInteractions(this.photoPointsPopup);

        // Add event listeners
        const closeButton = this.photoPointsPopup.querySelector('#closePhotoPointsBtn');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.closePhotoPointsPopup());
        }

        const addButton = this.photoPointsPopup.querySelector('#addPhotoPointBtn');
        if (addButton) {
            addButton.addEventListener('click', () => {
                this.closePhotoPointsPopup();
                this.addPhotoPoint();
            });
        }

        // Add click handlers for photo point list items
        const listItems = this.photoPointsPopup.querySelectorAll('.photo-point-list-item');
        listItems.forEach(item => {
            item.addEventListener('click', () => {
                const photoPointId = item.getAttribute('data-photo-point-id');
                this.zoomToPhotoPoint(photoPointId);
                this.closePhotoPointsPopup();
            });
        });

        // Handle resize with dynamic sizing
        if (this.photoPointsPopupResizeHandler) {
            window.removeEventListener('resize', this.photoPointsPopupResizeHandler);
            window.removeEventListener('orientationchange', this.photoPointsPopupResizeHandler);
        }
        this.photoPointsPopupResizeHandler = () => this.updatePhotoPointsPopupSizing();
        window.addEventListener('resize', this.photoPointsPopupResizeHandler);
        window.addEventListener('orientationchange', this.photoPointsPopupResizeHandler);
        this.updatePhotoPointsPopupSizing();
        requestAnimationFrame(() => this.updatePhotoPointsPopupSizing());
    }
    
    positionPhotoPointsPopup() {
        if (!this.photoPointsPopup || !this.map) return;
        
        const mapContainer = this.map.getContainer();
        const mapBounds = mapContainer.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // Mobile: center the popup
            const popupWidth = Math.min(320, window.innerWidth - 24);
            this.photoPointsPopup.style.position = 'absolute';
            this.photoPointsPopup.style.left = '50%';
            this.photoPointsPopup.style.top = '12px';
            this.photoPointsPopup.style.transform = 'translateX(-50%)';
            this.photoPointsPopup.style.width = `${popupWidth}px`;
            this.photoPointsPopup.style.maxWidth = `calc(100vw - 24px)`;
            this.photoPointsPopup.style.zIndex = '1000';
        } else {
            // Desktop: position to the right of controls
            const popupWidth = 320;
            const left = 60;
            const top = 10;
            
            this.photoPointsPopup.style.position = 'absolute';
            this.photoPointsPopup.style.left = `${left}px`;
            this.photoPointsPopup.style.top = `${top}px`;
            this.photoPointsPopup.style.width = `${popupWidth}px`;
            this.photoPointsPopup.style.transform = 'none';
            this.photoPointsPopup.style.maxWidth = 'none';
            this.photoPointsPopup.style.zIndex = '1000';
        }
    }

    updatePhotoPointsPopupSizing() {
        if (!this.photoPointsPopup) return;
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

        let desiredHeight = 300;
        const positiveCandidates = candidateHeights.filter(value => Number.isFinite(value) && value > 0);
        if (positiveCandidates.length > 0) {
            const smallestCandidate = Math.min(...positiveCandidates);
            if (smallestCandidate >= 180) {
                desiredHeight = Math.min(smallestCandidate, 500);
            } else {
                desiredHeight = Math.max(160, smallestCandidate);
            }
        } else if (containerHeight > 0) {
            const available = containerHeight - 24;
            desiredHeight = available >= 180 ? Math.min(available, 500) : Math.max(160, available);
        } else if (viewportHeight > 0) {
            const available = viewportHeight - 120;
            desiredHeight = available >= 180 ? Math.min(available, 500) : Math.max(160, available);
        }

        if (containerHeight > 0) {
            const containerCap = Math.max(160, containerHeight - 16);
            desiredHeight = Math.min(desiredHeight, containerCap);
        }

        const finalHeight = Math.max(160, desiredHeight);
        this.photoPointsPopup.style.maxHeight = `${finalHeight}px`;

        if (containerWidth > 0) {
            const widthAvailable = containerWidth - 16;
            if (widthAvailable > 0) {
                if (widthAvailable >= 200) {
                    const resolvedWidth = Math.min(widthAvailable, 320);
                    this.photoPointsPopup.style.width = `${resolvedWidth}px`;
                } else {
                    this.photoPointsPopup.style.width = '';
                }
            } else {
                this.photoPointsPopup.style.width = '';
            }
        } else {
            this.photoPointsPopup.style.width = '';
        }

        const computedStyle = window.getComputedStyle(this.photoPointsPopup);
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const headerEl = this.photoPointsPopup.querySelector('.measurement-popup__header');
        const contentEl = this.photoPointsPopup.querySelector('.measurement-popup__content');

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
            this.photoPointsPopup.style.top = `${computedTop}px`;
        }
    }

    closePhotoPointsPopup() {
        if (this.photoPointsPopupResizeHandler) {
            window.removeEventListener('resize', this.photoPointsPopupResizeHandler);
            window.removeEventListener('orientationchange', this.photoPointsPopupResizeHandler);
            this.photoPointsPopupResizeHandler = null;
        }
        if (this.photoPointsPopup) {
            this.photoPointsPopup.remove();
            this.photoPointsPopup = null;
        }
    }
    
    zoomToPhotoPoint(photoPointId) {
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (!photoPoint || !this.map) return;
        
        // Zoom to photo point
        this.map.setView([photoPoint.lat, photoPoint.lng], 18);
        
        // Open popup after a short delay to ensure map has moved
        setTimeout(() => {
            const marker = this.photoPointMarkers[photoPointId];
            if (marker) {
                marker.openPopup();
            }
        }, 500);
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
            padding: clamp(8px, 2vw, 20px);
            box-sizing: border-box;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
        `;

        const modalContent = document.createElement('div');
        // Calculate responsive max-height based on viewport
        const isLandscape = window.innerWidth > window.innerHeight;
        const maxHeightValue = isLandscape 
            ? `min(calc(100vh - clamp(16px, 4vw, 40px)), 90vh)`
            : `calc(100vh - clamp(16px, 4vw, 40px))`;
        
        modalContent.style.cssText = `
            background: white;
            border-radius: clamp(8px, 2vw, 10px);
            padding: 0;
            max-width: min(480px, calc(100vw - 32px));
            width: 100%;
            max-height: ${maxHeightValue};
            margin: clamp(8px, 2vw, 20px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            position: relative;
        `;

        modalContent.innerHTML = `
            <div style="
                background: #f59e0b;
                color: white;
                padding: clamp(12px, 3vw, 14px) clamp(12px, 3vw, 16px);
                font-weight: bold;
                font-size: clamp(14px, 4vw, 18px);
                text-align: center;
                text-transform: uppercase;
                flex-shrink: 0;
            ">
                ⚠️ NOTICE
            </div>
            <div style="
                padding: clamp(12px, 3vw, 16px);
                overflow-y: auto;
                flex: 1;
                min-height: 0;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
            ">
                <p style="margin: 0 0 clamp(10px, 2.5vw, 12px) 0; line-height: 1.6; color: #333; font-size: clamp(13px, 3.5vw, 14px); word-wrap: break-word; hyphens: auto;">
                    This is a <span style="
                        display: inline-block;
                        background-color: #ffc107;
                        color: #000;
                        font-size: clamp(0.65rem, 2vw, 0.7rem);
                        font-weight: 600;
                        padding: clamp(0.15rem, 1vw, 0.2rem) clamp(0.3rem, 1.5vw, 0.4rem);
                        border-radius: 4px;
                        margin: 0 2px;
                        vertical-align: middle;
                    ">BETA</span> release of the Eagle Eyes Viewer.
                </p>
                <p style="margin: 0 0 clamp(10px, 2.5vw, 12px) 0; line-height: 1.6; color: #333; font-size: clamp(13px, 3.5vw, 14px); word-wrap: break-word; hyphens: auto;">
                    Map and drone data may not always reflect real-time conditions. Eagle Eyes Search Inc. accepts no liability for actions taken based on this information.
                </p>
                <p style="margin: 0; line-height: 1.6; color: #333; font-size: clamp(13px, 3.5vw, 14px); word-wrap: break-word; hyphens: auto;">
                    Always refer to regulations for your local jurisdiction and consult official airspace sources for current information. <button id="betaLocalAirspaceAuthorityInfoBtn" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: clamp(14px, 3.5vw, 16px); padding: clamp(6px, 1.5vw, 8px); vertical-align: middle; font-weight: bold; min-width: clamp(32px, 8vw, 36px); min-height: clamp(32px, 8vw, 36px); touch-action: manipulation; display: inline-flex; align-items: center; justify-content: center;" title="View alternative airspace map">ℹ️</button>
                </p>
            </div>
            <div style="
                padding: clamp(12px, 3vw, 16px);
                display: flex;
                justify-content: center;
                flex-shrink: 0;
                border-top: 1px solid #e5e7eb;
            ">
                <button id="betaAcknowledgeBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: clamp(12px, 3vw, 14px) clamp(20px, 5vw, 24px);
                    border-radius: clamp(6px, 1.5vw, 8px);
                    cursor: pointer;
                    font-size: clamp(14px, 3.5vw, 16px);
                    font-weight: 600;
                    min-width: min(160px, calc(100% - 32px));
                    width: 100%;
                    max-width: 280px;
                    min-height: clamp(44px, 11vw, 48px);
                    transition: background 0.2s;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
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
                    // Ensure flag is set after successful save
                    this.hasShownBetaDisclaimer = true;
                    console.log('Beta disclaimer acknowledged and saved to localStorage');
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
    showFullscreenMapControl() {
        if (!this.map || this.fullscreenMapControl) return;

        const self = this;
        const FullscreenExitControl = L.Control.extend({
            options: {
                position: 'bottomright'
            },
            onAdd: function () {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control fullscreen-exit-control');
                container.style.width = '40px';
                container.style.height = '40px';
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.justifyContent = 'center';
                container.style.backgroundColor = 'rgba(44, 44, 44, 0.72)';
                container.style.borderRadius = '8px';
                container.style.border = '1px solid rgba(68, 68, 68, 0.85)';
                container.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.35)';
                container.style.cursor = 'pointer';
                container.style.margin = '0 10px 14px 0';
                container.title = 'Exit fullscreen mode';

                const icon = L.DomUtil.create('div', 'fullscreen-exit-icon', container);
                icon.style.width = '18px';
                icon.style.height = '18px';
                icon.style.background = "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23ffffff\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3\"/></svg>') no-repeat center";
                icon.style.backgroundSize = 'contain';

                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation)
                    .on(container, 'click', () => {
                        self.toggleFullscreen();
                    });
                
                return container;
            }
        });

        this.fullscreenMapControl = new FullscreenExitControl();
        this.fullscreenMapControl.addTo(this.map);
    }
    hideFullscreenMapControl() {
        if (this.fullscreenMapControl && this.map) {
            this.map.removeControl(this.fullscreenMapControl);
            this.fullscreenMapControl = null;
        }
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
        
        // Keep navbar visible - don't hide it
        if (enter) {
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
            
            console.log('Entered fallback fullscreen mode - navbar remains visible');
        } else {
            console.log('Exited fallback fullscreen mode');
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
        
        // Keep navbar visible - don't hide it
        if (isCurrentlyFullscreen) {
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
            
            console.log('Entered fullscreen - navbar remains visible');
        } else {
            console.log('Exited fullscreen');
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
                className: 'drone-popup',
                closeOnClick: false,
                autoClose: false
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

        this.updateDroneOverviewIndicator();
    }
    generateDronePopupContent(droneData = null, droneName = null, livestreamId = null, options = {}) {
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

        const nameHeader = options.hideHeader ? '' :
            (name
                ? `<strong style="font-size: 1.1em;">${name}</strong><br><br>`
                : `<strong style="font-size: 1.1em;">Drone Position</strong><br><br>`);

        // Add "View Livestream" button if this drone is streaming and it's not the current stream
        const currentViewingStream = window.viewer?.currentRoomId;
        const showLivestreamButton = streamId && streamId !== currentViewingStream;
        const livestreamButton = showLivestreamButton ?
            `<br><br><button onclick="window.viewer.switchToStream('${streamId}')" style="padding: 6px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; width: 100%;">View Livestream</button>` :
            '';
        
        // Photo point button removed - now available via camera widget
        const photoPointButton = '';

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
                <strong>🔋 Battery:</strong> ${batteryText}${lastUpdateText}${livestreamButton}${photoPointButton}
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

    // Capture screenshot from video element (returns PNG data URL)
    async captureVideoScreenshot() {
        const video = document.getElementById('remoteVideo');
        if (!video || video.readyState < 2) {
            console.error('Video not ready for screenshot');
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Add watermarks and overlays
        await this.addWatermarksToCanvas(ctx, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/png');
    }

    // Capture video screenshot and generate JPEG with EXIF GPS metadata directly
    async captureVideoScreenshotWithExif(photoPoint, altitude = null, lat = null, lng = null) {
        const video = document.getElementById('remoteVideo');
        if (!video) {
            console.error('Video element not found');
            return null;
        }
        if (video.readyState < 2) {
            console.error('Video not ready for screenshot, readyState:', video.readyState);
            return null;
        }

        // Get coordinates - use provided lat/lng, or fall back to this.currentLocation
        if (lat === null || lng === null) {
            const location = this.currentLocation || [0, 0];
            lat = location[0];
            lng = location[1];
        }

        // Ensure we have valid coordinates
        if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat === undefined || lng === undefined) {
            console.error('Invalid coordinates:', { lat, lng, currentLocation: this.currentLocation });
            return null;
        }

        // Update photoPoint with coordinates
        photoPoint.lat = lat;
        photoPoint.lng = lng;

        // Create canvas and capture video
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Add watermarks and overlays
        await this.addWatermarksToCanvas(ctx, canvas.width, canvas.height, photoPoint);

        // Convert to JPEG data URL and return
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        console.log('Photo point captured as JPEG');
        return jpegDataUrl;
    }
    
    // Add watermarks and text overlays to canvas
    async addWatermarksToCanvas(ctx, width, height, photoPoint = null) {
        // Get current drone data
        const droneName = this.currentDroneName || 'Unknown Drone';
        const [lat, lng] = this.currentLocation || [0, 0];
        const now = new Date();
        
        // Get bearing/heading from photoPoint if available, otherwise from current drone data
        const droneData = this.currentDroneData;
        const bearing = photoPoint?.bearing ?? droneData?.bearing ?? null;
        
        // Format timestamp
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const dateOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        const timeStr = now.toLocaleTimeString('en-US', timeOptions);
        const dateStr = now.toLocaleDateString('en-US', dateOptions);
        
        // Calculate watermark sizes (super small, proportional to image size)
        const logoSize = Math.max(30, Math.min(width, height) * 0.05); // 5% of smaller dimension, min 30px
        const textSize = Math.max(8, Math.min(width, height) * 0.012); // 1.2% of smaller dimension, min 8px
        const padding = Math.max(6, Math.min(width, height) * 0.008); // 0.8% padding, min 6px
        
        // Load and draw logo watermark (bottom left)
        try {
            // Load main logo
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                logoImg.onload = resolve;
                logoImg.onerror = reject;
                const logoPath = this.getAssetPath('/images/Eagle Eyes Logo.png');
                logoImg.src = logoPath.replace(/ /g, '%20'); // Encode spaces
            });
            
            // Load text logo
            const textLogoImg = new Image();
            textLogoImg.crossOrigin = 'anonymous';
            let textLogoLoaded = false;
            try {
                await new Promise((resolve, reject) => {
                    textLogoImg.onload = () => {
                        textLogoLoaded = true;
                        resolve();
                    };
                    textLogoImg.onerror = reject;
                    // Handle space in filename - use encodeURI or direct path
                    const textLogoPath = this.getAssetPath('/images/Eagle Eyes Search.png');
                    textLogoImg.src = textLogoPath.replace(/ /g, '%20'); // Encode spaces
                });
            } catch (err) {
                console.warn('Could not load text logo, will use text instead:', err);
            }
            
            // Draw logo in bottom left (no background)
            const logoX = padding;
            const logoY = height - logoSize - padding;
            const textLogoWidth = textLogoLoaded ? logoSize * 1.5 : logoSize * 2;
            
            // Draw logo image (no background)
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            
            // Draw text logo or text next to main logo (no background)
            if (textLogoLoaded) {
                const textLogoHeight = logoSize * 0.6; // Proportional to main logo
                ctx.drawImage(textLogoImg, logoX + logoSize + padding/2, logoY + (logoSize - textLogoHeight)/2, textLogoWidth, textLogoHeight);
            } else {
                // Fallback: draw text if image not available
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.font = `bold ${textSize * 0.7}px Arial, sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText('Eagle Eyes Viewer', logoX + logoSize + padding/2, logoY + logoSize/2);
            }
        } catch (err) {
            console.warn('Could not load logo for watermark:', err);
        }
        
        // Calculate line height for text
        const lineHeight = textSize * 1.4;
        // Calculate text height based on number of lines (drone name, coordinates, heading, timestamp)
        const numTextLines = bearing !== null ? 4 : 3;
        const textHeight = lineHeight * numTextLines;
        
        // Load QR code logo - smaller size
        let qrCodeWidth = 0;
        let qrCodeHeight = 0;
        let qrCodeImg = null;
        
        try {
            qrCodeImg = new Image();
            qrCodeImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                qrCodeImg.onload = () => {
                    console.log('QR Code logo loaded successfully, dimensions:', qrCodeImg.width, 'x', qrCodeImg.height);
                    resolve();
                };
                qrCodeImg.onerror = (err) => {
                    console.error('Failed to load QR Code logo:', err, qrCodeImg.src);
                    reject(err);
                };
                const qrCodePath = this.getAssetPath('/images/QR Code Logo.png');
                qrCodeImg.src = qrCodePath.replace(/ /g, '%20'); // Encode spaces
                console.log('Loading QR Code logo from:', qrCodeImg.src);
            });
            
            // Calculate QR code size - slightly bigger (35% of text height)
            const nativeAspectRatio = qrCodeImg.width / qrCodeImg.height;
            const minHeight = textHeight * 0.35; // 35% of text height - slightly bigger
            const maxHeight = Math.min(height * 0.09, qrCodeImg.height); // Cap at 9% of image height
            qrCodeHeight = Math.max(minHeight, maxHeight);
            qrCodeWidth = qrCodeHeight * nativeAspectRatio;
        } catch (err) {
            console.warn('Could not load QR code logo for watermark:', err);
        }
        
        // Position QR code in top left corner
        const qrCodeX = padding;
        const qrCodeY = padding;
        
        // Position text to the right of QR code (with padding)
        const textX = qrCodeX + qrCodeWidth + padding * 2;
        const textY = padding;
        
        // Prepare text lines - drone name first, then coordinates, then heading, then timestamp
        const textLines = [
            `Drone: ${droneName}`,
            `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        ];
        
        // Add heading if available (below coordinates, above time)
        if (bearing !== null) {
            textLines.push(`Heading: ${bearing.toFixed(1)}°`);
        }
        
        // Add timestamp last
        textLines.push(`${timeStr} ${dateStr}`);
        
        // Set font and alignment - left align so text starts to the right of QR code
        ctx.font = `${textSize}px Arial, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Draw text lines (no background, white font) - left aligned
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        textLines.forEach((line, index) => {
            ctx.fillText(line, textX, textY + (lineHeight * index));
        });
        
        // Draw QR code logo in top left corner
        if (qrCodeImg) {
            console.log('Drawing QR Code logo at top left:', qrCodeX, qrCodeY, 'size:', qrCodeWidth, 'x', qrCodeHeight);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(qrCodeImg, qrCodeX, qrCodeY, qrCodeWidth, qrCodeHeight);
        }
    }

    // Attach event handlers to photo point button in popup
    attachPhotoPointButtonHandlers(container) {
        const button = container.querySelector('.add-photo-point-btn');
        if (button) {
            // Remove any existing event listeners by cloning
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add hover effects via CSS classes
            newButton.addEventListener('mouseenter', () => {
                newButton.style.backgroundColor = '#218838';
            });
            newButton.addEventListener('mouseleave', () => {
                if (!newButton.disabled) {
                    newButton.style.backgroundColor = '#28a745';
                }
            });
            
            // Add click handler with immediate feedback
            let isProcessing = false;
            newButton.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                
                // Prevent double-clicks
                if (isProcessing) {
                    console.log('Already processing photo point');
                    return false;
                }
                
                isProcessing = true;
                console.log('Add Photo Point button clicked');
                
                // Immediate visual feedback
                newButton.disabled = true;
                newButton.style.opacity = '0.7';
                newButton.style.cursor = 'wait';
                const originalText = newButton.innerHTML;
                newButton.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
                
                try {
                    if (window.droneMap && typeof window.droneMap.addPhotoPoint === 'function') {
                        // Call immediately - don't await, let it handle the modal
                        window.droneMap.addPhotoPoint().catch(err => {
                            console.error('Error adding photo point:', err);
                            // Reset button on error
                            newButton.disabled = false;
                            newButton.style.opacity = '1';
                            newButton.style.cursor = 'pointer';
                            newButton.innerHTML = originalText;
                            isProcessing = false;
                        });
                    } else {
                        console.error('droneMap.addPhotoPoint not available', window.droneMap);
                        alert('Photo point feature not available');
                        // Reset button
                        newButton.disabled = false;
                        newButton.style.opacity = '1';
                        newButton.style.cursor = 'pointer';
                        newButton.innerHTML = originalText;
                        isProcessing = false;
                    }
                } catch (err) {
                    console.error('Error in addPhotoPoint:', err);
                    // Reset button on error
                    newButton.disabled = false;
                    newButton.style.opacity = '1';
                    newButton.style.cursor = 'pointer';
                    newButton.innerHTML = originalText;
                    isProcessing = false;
                }
                
                return false;
            });
        }
    }

    // Add photo point - main entry point
    async addPhotoPoint() {
        console.log('addPhotoPoint called');
        
        // Check if streaming
        if (!window.viewer || !window.viewer.getState || window.viewer.getState() !== 'STREAMING') {
            alert('Livestream must be connected and streaming to add a photo point.');
            // Reset button state
            this.resetPhotoPointButton();
            return;
        }

        // Show naming dialog IMMEDIATELY (before capturing)
        const name = await this.showPhotoPointNameDialog();
        console.log('Name from dialog:', name);
        if (!name) {
            // User cancelled - reset button state
            this.resetPhotoPointButton();
            return;
        }

        // Get current drone location first (needed for EXIF)
        if (!this.currentLocation || !Array.isArray(this.currentLocation) || this.currentLocation.length !== 2) {
            alert('Drone location not available.');
            // Reset button state
            this.resetPhotoPointButton();
            return;
        }

        const [lat, lng] = this.currentLocation;
        
        // Get current drone data for bearing/heading and altitude
        const droneData = this.currentDroneData;
        const bearing = droneData?.bearing || null;
        const altitude = droneData?.altitude_asl || droneData?.altitude_ahl || null;
        const droneName = this.currentDroneName || 'Unknown Drone';

        // Create photo point structure first (needed for watermark function)
        const photoPoint = {
            id: 'photo_' + Date.now(),
            name: name,
            lat: lat,
            lng: lng,
            imageData: null, // Will be set below
            timestamp: Date.now(),
            droneName: droneName,
            bearing: bearing
        };

        // Capture video and generate JPEG with EXIF metadata directly
        // Pass coordinates directly to avoid re-checking currentLocation
        const jpegWithExif = await this.captureVideoScreenshotWithExif(photoPoint, altitude, lat, lng);
        if (!jpegWithExif) {
            alert('Failed to capture screenshot with EXIF metadata. Please ensure video is playing.');
            // Reset button state
            this.resetPhotoPointButton();
            return;
        }

        // Store the JPEG with EXIF metadata
        photoPoint.imageData = jpegWithExif;
        console.log('Photo point created with EXIF GPS metadata embedded');

        // Add to storage
        this.photoPoints.push(photoPoint);
        this.savePhotoPointsToStorage();

        // Add marker to map
        this.addPhotoPointMarker(photoPoint);

        // Reset button state after successful creation
        this.resetPhotoPointButton();

        // Show success and share options
        this.showPhotoPointOptions(photoPoint);
    }
    
    // Reset photo point button state
    resetPhotoPointButton() {
        const button = document.querySelector('.add-photo-point-btn');
        if (button) {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.innerHTML = '<i class="bi bi-camera"></i> Add Photo Point';
        }
    }

    // Show naming dialog
    showPhotoPointNameDialog() {
        return new Promise((resolve) => {
            const modal = document.getElementById('photoPointNameModal');
            const input = document.getElementById('photoPointNameInput');
            const saveBtn = document.getElementById('photoPointNameSaveBtn');
            
            console.log('showPhotoPointNameDialog - modal:', modal, 'input:', input, 'saveBtn:', saveBtn);
            console.log('Bootstrap available:', typeof bootstrap !== 'undefined');
            
            if (!modal || !input || !saveBtn) {
                console.error('Modal elements not found');
                alert('Photo point naming dialog not available. Please refresh the page.');
                resolve(null);
                return;
            }

            if (typeof bootstrap === 'undefined') {
                console.error('Bootstrap not loaded');
                alert('Bootstrap not loaded. Please refresh the page.');
                resolve(null);
                return;
            }

            // Set default name
            input.value = 'EE_LivestreamPhoto' + (this.photoPoints.length + 1);
            
            // Get drone name and current time for info display
            const droneName = this.currentDroneName || 'Unknown Drone';
            const now = new Date();
            
            // Format time in local timezone
            const timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            const dateOptions = {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            
            const timeStr = now.toLocaleTimeString('en-US', timeOptions);
            const dateStr = now.toLocaleDateString('en-US', dateOptions);
            
            // Get simplified timezone name
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let timezoneDisplay = 'Unknown';
            
            // Map common IANA timezones to simple names
            const timezoneMap = {
                // Pacific
                'America/Vancouver': 'Pacific',
                'America/Los_Angeles': 'Pacific',
                'America/Tijuana': 'Pacific',
                'America/Santa_Isabel': 'Pacific',
                'America/Dawson': 'Pacific',
                'America/Whitehorse': 'Pacific',
                // Mountain
                'America/Denver': 'Mountain',
                'America/Phoenix': 'Mountain',
                'America/Boise': 'Mountain',
                'America/Edmonton': 'Mountain',
                'America/Yellowknife': 'Mountain',
                'America/Inuvik': 'Mountain',
                'America/Dawson_Creek': 'Mountain',
                'America/Fort_Nelson': 'Mountain',
                'America/Creston': 'Mountain',
                'America/Chihuahua': 'Mountain',
                'America/Mazatlan': 'Mountain',
                'America/Hermosillo': 'Mountain',
                'America/Shiprock': 'Mountain',
                // Central
                'America/Chicago': 'Central',
                'America/Mexico_City': 'Central',
                'America/Winnipeg': 'Central',
                'America/Regina': 'Central',
                'America/Swift_Current': 'Central',
                'America/Menominee': 'Central',
                'America/Indiana/Knox': 'Central',
                'America/Indiana/Tell_City': 'Central',
                'America/Indiana/Petersburg': 'Central',
                'America/Indiana/Marengo': 'Central',
                'America/Indiana/Winamac': 'Central',
                'America/North_Dakota/Center': 'Central',
                'America/North_Dakota/New_Salem': 'Central',
                'America/North_Dakota/Beulah': 'Central',
                'America/Rainy_River': 'Central',
                'America/Resolute': 'Central',
                'America/Rankin_Inlet': 'Central',
                'America/Merida': 'Central',
                'America/Monterrey': 'Central',
                'America/Bahia_Banderas': 'Central',
                'America/Belize': 'Central',
                'America/Costa_Rica': 'Central',
                'America/El_Salvador': 'Central',
                'America/Guatemala': 'Central',
                'America/Managua': 'Central',
                'America/Tegucigalpa': 'Central',
                // Eastern
                'America/New_York': 'Eastern',
                'America/Toronto': 'Eastern',
                'America/Montreal': 'Eastern',
                'America/Detroit': 'Eastern',
                'America/Indianapolis': 'Eastern',
                'America/Louisville': 'Eastern',
                'America/Kentucky/Louisville': 'Eastern',
                'America/Kentucky/Monticello': 'Eastern',
                'America/Indiana/Indianapolis': 'Eastern',
                'America/Indiana/Vincennes': 'Eastern',
                'America/Nipigon': 'Eastern',
                'America/Thunder_Bay': 'Eastern',
                'America/Iqaluit': 'Eastern',
                'America/Pangnirtung': 'Eastern',
                'America/Atikokan': 'Eastern',
                'America/Philadelphia': 'Eastern',
                'America/Boston': 'Eastern',
                'America/Pittsburgh': 'Eastern',
                'America/Cleveland': 'Eastern',
                'America/Cancun': 'Eastern',
                'America/Panama': 'Eastern',
                'America/Bogota': 'Eastern',
                'America/Port-au-Prince': 'Eastern',
                'America/Havana': 'Eastern',
                'America/Jamaica': 'Eastern',
                'America/Cayman': 'Eastern',
                'America/Nassau': 'Eastern',
                'America/Turks_and_Caicos': 'Eastern',
                // Atlantic
                'America/Halifax': 'Atlantic',
                'America/Glace_Bay': 'Atlantic',
                'America/Moncton': 'Atlantic',
                'America/Goose_Bay': 'Atlantic',
                'America/Blanc-Sablon': 'Atlantic',
                'America/Puerto_Rico': 'Atlantic',
                'America/St_Thomas': 'Atlantic',
                'America/Santo_Domingo': 'Atlantic',
                // Newfoundland
                'America/St_Johns': 'Newfoundland',
                // Alaska
                'America/Anchorage': 'Alaska',
                'America/Juneau': 'Alaska',
                'America/Sitka': 'Alaska',
                'America/Metlakatla': 'Alaska',
                'America/Yakutat': 'Alaska',
                'America/Nome': 'Alaska',
                // Hawaii
                'Pacific/Honolulu': 'Hawaii',
                'America/Adak': 'Hawaii-Aleutian',
                'Pacific/Midway': 'Hawaii-Aleutian'
            };
            
            timezoneDisplay = timezoneMap[timezone] || timezone.split('/').pop().replace(/_/g, ' ');
            
            // Update info div with drone name and timestamp
            const infoDiv = document.getElementById('photoPointInfo');
            if (infoDiv) {
                // Get the info button if it exists, or create it
                let infoBtn = infoDiv.querySelector('#photoPointInfoBtn');
                const infoText = `from drone: <strong>${droneName}</strong><br>taken at: ${timeStr} ${dateStr} (${timezoneDisplay})`;
                
                if (!infoBtn) {
                    // Create info button - grey clickable square
                    infoBtn = document.createElement('button');
                    infoBtn.type = 'button';
                    infoBtn.id = 'photoPointInfoBtn';
                    infoBtn.className = 'btn btn-sm';
                    infoBtn.style.cssText = 'background: #6c757d; border: 1px solid #5a6268; color: white; padding: 4px 6px; font-size: 0.75rem; line-height: 1; border-radius: 4px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-left: 8px; transition: all 0.2s;';
                    infoBtn.innerHTML = '<i class="bi bi-info" style="font-size: 0.8rem; font-weight: bold;"></i>';
                    infoBtn.title = 'Info';
                    infoBtn.onmouseover = function() {
                        this.style.background = '#5a6268';
                        this.style.borderColor = '#495057';
                    };
                    infoBtn.onmouseout = function() {
                        this.style.background = '#6c757d';
                        this.style.borderColor = '#5a6268';
                    };
                    infoBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const infoModal = document.getElementById('photoPointInfoModal');
                        if (infoModal) {
                            const bsModal = new bootstrap.Modal(infoModal);
                            bsModal.show();
                        }
                    });
                }
                
                // Set the text content and append button
                const textSpan = document.createElement('span');
                textSpan.innerHTML = infoText;
                infoDiv.innerHTML = '';
                infoDiv.appendChild(textSpan);
                infoDiv.appendChild(infoBtn);
            }
            
            // Get fresh reference to save button after potential DOM changes
            let currentSaveBtn = document.getElementById('photoPointNameSaveBtn');
            if (!currentSaveBtn) {
                console.error('Save button not found after refresh');
                resolve(null);
                return;
            }
            
            // Clear previous event listeners by cloning
            const newSaveBtn = currentSaveBtn.cloneNode(true);
            currentSaveBtn.parentNode.replaceChild(newSaveBtn, currentSaveBtn);
            
            // Show modal
            const bsModal = new bootstrap.Modal(modal, { backdrop: 'static', keyboard: true });
            bsModal.show();
            
            // Focus input after modal is shown
            setTimeout(() => {
                input.focus();
                input.select();
            }, 300);
            
            // Handle save
            const handleSave = () => {
                const name = input.value.trim();
                console.log('Save clicked, name:', name);
                if (name) {
                    bsModal.hide();
                    resolve(name);
                }
            };
            
            newSaveBtn.addEventListener('click', handleSave);
            
            // Remove old keypress listeners and add new one
            const handleKeyPress = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSave();
                }
            };
            input.removeEventListener('keypress', handleKeyPress); // Remove if exists
            input.addEventListener('keypress', handleKeyPress);
            
            // Handle cancel/close
            const handleClose = () => {
                console.log('Modal closed');
                resolve(null);
            };
            modal.removeEventListener('hidden.bs.modal', handleClose); // Remove if exists
            modal.addEventListener('hidden.bs.modal', handleClose, { once: true });
        });
    }

    // Add photo point marker to map
    addPhotoPointMarker(photoPoint) {
        if (!this.map) return;

        // Create photo icon (camera symbol)
        const photoIcon = L.divIcon({
            html: `<div style="background-color: #fff; border: 2px solid #28a745; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><i class="bi bi-camera-fill" style="color: #28a745; font-size: 18px;"></i></div>`,
            className: 'photo-point-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([photoPoint.lat, photoPoint.lng], {
            icon: photoIcon
        }).addTo(this.map);

        // Bind popup with photo point info
        marker.bindPopup(() => this.generatePhotoPointPopupContent(photoPoint), {
            maxWidth: 220,
            className: 'photo-point-popup'
        });

        this.photoPointMarkers[photoPoint.id] = marker;
    }

    // Generate popup content for photo point
    generatePhotoPointPopupContent(photoPoint) {
        // Format timestamp
        const timestamp = new Date(photoPoint.timestamp);
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        const dateOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        const timeStr = timestamp.toLocaleTimeString('en-US', timeOptions);
        const dateStr = timestamp.toLocaleDateString('en-US', dateOptions);
        
        // Get simplified timezone name
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezoneMap = {
            'America/Vancouver': 'Pacific',
            'America/Los_Angeles': 'Pacific',
            'America/Tijuana': 'Pacific',
            'America/Santa_Isabel': 'Pacific',
            'America/Dawson': 'Pacific',
            'America/Whitehorse': 'Pacific',
            'America/Denver': 'Mountain',
            'America/Phoenix': 'Mountain',
            'America/Boise': 'Mountain',
            'America/Edmonton': 'Mountain',
            'America/Chicago': 'Central',
            'America/Mexico_City': 'Central',
            'America/Winnipeg': 'Central',
            'America/Regina': 'Central',
            'America/New_York': 'Eastern',
            'America/Toronto': 'Eastern',
            'America/Montreal': 'Eastern',
            'America/Detroit': 'Eastern',
            'America/Halifax': 'Atlantic',
            'America/St_Johns': 'Newfoundland',
            'America/Anchorage': 'Alaska',
            'Pacific/Honolulu': 'Hawaii'
        };
        const timezoneDisplay = timezoneMap[timezone] || timezone.split('/').pop().replace(/_/g, ' ');
        
        // Get drone name from photo point metadata or use stored value
        const droneName = photoPoint.droneName || this.currentDroneName || 'Unknown Drone';
        
        // Format coordinates
        const latStr = photoPoint.lat.toFixed(6);
        const lngStr = photoPoint.lng.toFixed(6);
        
        // Detect if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         (window.innerWidth <= 768 && 'ontouchstart' in window);
        
        // Show "Share" button on mobile, "Copy to Clipboard" on desktop
        const shareButtonText = isMobile ? 'Share' : 'Copy to Clipboard';
        const shareButtonIcon = isMobile ? 'bi-share' : 'bi-clipboard';
        const shareButtonAction = isMobile ? `window.droneMap.sharePhotoPoint('${photoPoint.id}')` : `window.droneMap.copyPhotoPointUrlAndOpen('${photoPoint.id}')`;
        
        // Mobile-specific styles
        const containerStyle = isMobile 
            ? 'min-width: 150px; max-width: 90vw; width: auto;'
            : 'min-width: 180px; max-width: 220px;';
        const titleStyle = isMobile
            ? 'font-size: clamp(0.85rem, 4vw, 1rem); display: block; margin-bottom: 4px; word-wrap: break-word;'
            : 'font-size: 1em; display: block; margin-bottom: 6px;';
        const infoStyle = isMobile
            ? 'font-size: clamp(0.55rem, 2.5vw, 0.65rem); color: #6c757d; font-style: italic; margin-bottom: 4px; line-height: 1.2;'
            : 'font-size: 0.65rem; color: #6c757d; font-style: italic; margin-bottom: 6px; line-height: 1.3;';
        const imageStyle = isMobile
            ? 'width: 100%; max-width: 100%; border-radius: 4px; cursor: pointer; margin-bottom: 4px; display: block;'
            : 'width: 100%; max-width: 200px; border-radius: 4px; cursor: pointer; margin-bottom: 6px; display: block;';
        const buttonContainerStyle = isMobile
            ? 'display: flex; flex-direction: column; gap: 4px; width: 100%;'
            : 'display: flex; gap: 4px; flex-wrap: wrap;';
        const buttonStyle = isMobile
            ? 'padding: 6px 8px; background-color: var(--btn-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: clamp(0.7rem, 3vw, 0.75rem); width: 100%; touch-action: manipulation; -webkit-tap-highlight-color: rgba(0,0,0,0.1);'
            : 'padding: 4px 8px; background-color: var(--btn-color); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em; flex: 1; min-width: 60px;';
        
        return `
            <div style="${containerStyle}">
                <strong style="${titleStyle}">${photoPoint.name}</strong>
                <div style="${infoStyle}">
                    drone: <strong>${droneName}</strong><br>
                    ${timeStr} ${dateStr} (${timezoneDisplay})<br>
                    ${latStr}, ${lngStr}
                </div>
                <img src="${photoPoint.imageData}" style="${imageStyle}" onclick="event.stopPropagation(); window.droneMap.showPhotoFullscreen('${photoPoint.id}'); return false;" alt="Photo point thumbnail">
                <div style="${buttonContainerStyle}">
                    <button onclick="event.stopPropagation(); ${shareButtonAction}; return false;" style="${buttonStyle.replace('var(--btn-color)', '#007bff')}"><i class="bi ${shareButtonIcon}"></i> ${shareButtonText}</button>
                    <button onclick="event.stopPropagation(); window.droneMap.downloadPhotoPoint('${photoPoint.id}'); return false;" style="${buttonStyle.replace('var(--btn-color)', '#6c757d')}"><i class="bi bi-download"></i> Download</button>
                    <button onclick="event.stopPropagation(); window.droneMap.removePhotoPoint('${photoPoint.id}'); return false;" style="${buttonStyle.replace('var(--btn-color)', '#dc3545')}"><i class="bi bi-trash"></i> Remove</button>
                </div>
            </div>
        `;
    }

    // Show photo point options (after creation)
    showPhotoPointOptions(photoPoint) {
        console.log('showPhotoPointOptions called for photo point:', photoPoint.id);
        const modal = document.getElementById('photoPointShareModal');
        const shareBtn = document.getElementById('photoPointShareBtn');
        
        if (!modal || !shareBtn) {
            console.error('Modal or share button not found');
            return;
        }

        // Clear previous event listeners
        const newShareBtn = shareBtn.cloneNode(true);
        shareBtn.parentNode.replaceChild(newShareBtn, shareBtn);
        
        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Handle share - ensure we use the correct photo point ID
        newShareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Share button clicked in modal for photo point:', photoPoint.id);
            bsModal.hide();
            // Wait for modal to fully close, then share
            modal.addEventListener('hidden.bs.modal', () => {
                this.sharePhotoPoint(photoPoint.id);
            }, { once: true });
        }, { once: true });
    }

    // Show photo fullscreen
    showPhotoFullscreen(photoPointId) {
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (!photoPoint) return;

        // Create fullscreen modal
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: pointer;';
        
        // Create close button with visible outline
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.9); color: white; font-size: 32px; font-weight: bold; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 10001; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.5);';
        closeBtn.onmouseover = () => {
            closeBtn.style.background = 'rgba(0,0,0,0.7)';
            closeBtn.style.borderColor = 'rgba(255,255,255,1)';
            closeBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.7)';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.background = 'rgba(0,0,0,0.5)';
            closeBtn.style.borderColor = 'rgba(255,255,255,0.9)';
            closeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        };
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            modal.remove();
        };
        
        // Create download button with visible outline
        const downloadBtn = document.createElement('button');
        downloadBtn.innerHTML = '<i class="bi bi-download" style="font-size: 20px;"></i>';
        downloadBtn.style.cssText = 'position: absolute; top: 20px; right: 80px; background: rgba(0,0,0,0.5); border: 3px solid rgba(255,255,255,0.9); color: white; font-size: 20px; font-weight: bold; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; z-index: 10001; display: flex; align-items: center; justify-content: center; line-height: 1; padding: 0; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.5);';
        downloadBtn.onmouseover = () => {
            downloadBtn.style.background = 'rgba(0,0,0,0.7)';
            downloadBtn.style.borderColor = 'rgba(255,255,255,1)';
            downloadBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.7)';
        };
        downloadBtn.onmouseout = () => {
            downloadBtn.style.background = 'rgba(0,0,0,0.5)';
            downloadBtn.style.borderColor = 'rgba(255,255,255,0.9)';
            downloadBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
        };
        downloadBtn.onclick = (e) => {
            e.stopPropagation();
            this.downloadPhotoPoint(photoPointId);
        };
        
        const img = document.createElement('img');
        img.src = photoPoint.imageData;
        img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
        img.onclick = (e) => e.stopPropagation();
        
        modal.appendChild(closeBtn);
        modal.appendChild(downloadBtn);
        modal.appendChild(img);
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        };
        document.body.appendChild(modal);
    }

    // Create georeferenced image data URL (for storing in photoPoint)
    async createGeoreferencedImageDataUrl(photoPoint, altitude = null) {
        return new Promise((resolve, reject) => {
            // Check if piexif is available
            if (typeof piexif === 'undefined') {
                console.error('piexif library not loaded! Cannot add EXIF metadata.');
                resolve(null); // Return null instead of rejecting
                return;
            }

            // Get drone data for additional metadata
            const droneData = this.currentDroneData;
            const droneName = photoPoint.droneName || this.currentDroneName || 'Unknown Drone';
            if (altitude === null) {
                altitude = droneData?.altitude_asl || droneData?.altitude_ahl || null;
            }
            // Use bearing from photoPoint if available, otherwise from current drone data
            const bearing = photoPoint?.bearing ?? droneData?.bearing ?? null;
            const pitch = droneData?.pitch || null;
            const battery = droneData?.battery_percent || null;

            // Create image from data URL
            const img = new Image();
            img.onload = async () => {
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                // Re-add watermarks to ensure they're present
                await this.addWatermarksToCanvas(ctx, canvas.width, canvas.height, photoPoint);

                // Convert to JPEG data URL (base64) for EXIF support
                const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
                
                // Extract base64 data from data URL
                const base64Data = jpegDataUrl.split(',')[1];
                
                // Convert base64 to binary string for piexif
                const binaryString = atob(base64Data);
                
                try {
                    // Get timestamp from photo point
                    const timestamp = new Date(photoPoint.timestamp);
                    const year = timestamp.getFullYear();
                    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                    const day = String(timestamp.getDate()).padStart(2, '0');
                    const hours = String(timestamp.getHours()).padStart(2, '0');
                    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
                    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
                    const dateStr = `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;

                    // Prepare EXIF data
                    const zeroth = {};
                    const exif = {};
                    const gps = {};

                    // Basic image info
                    zeroth[piexif.ImageIFD.Make] = "Eagle Eyes";
                    zeroth[piexif.ImageIFD.Model] = droneName;
                    zeroth[piexif.ImageIFD.Software] = "Eagle Eyes Viewer";
                    zeroth[piexif.ImageIFD.DateTime] = dateStr;
                    zeroth[piexif.ImageIFD.ImageDescription] = `Eagle Eyes Photo Point: ${photoPoint.name}`;

                    // EXIF data
                    exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
                    exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;

                    // GPS data
                    const toDMS = (decimal) => {
                        const abs = Math.abs(decimal);
                        const deg = Math.floor(abs);
                        const minFloat = (abs - deg) * 60;
                        const min = Math.floor(minFloat);
                        const sec = (minFloat - min) * 60;
                        return [[deg, 1], [min, 1], [Math.round(sec * 100), 100]];
                    };

                    const latDMS = toDMS(photoPoint.lat);
                    const lngDMS = toDMS(photoPoint.lng);

                    // GPS Version ID (required)
                    gps[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
                    
                    // GPS Latitude (required)
                    gps[piexif.GPSIFD.GPSLatitudeRef] = photoPoint.lat >= 0 ? "N" : "S";
                    gps[piexif.GPSIFD.GPSLatitude] = latDMS;
                    
                    // GPS Longitude (required)
                    gps[piexif.GPSIFD.GPSLongitudeRef] = photoPoint.lng >= 0 ? "E" : "W";
                    gps[piexif.GPSIFD.GPSLongitude] = lngDMS;
                    
                    // GPS Altitude (optional)
                    if (altitude !== null) {
                        gps[piexif.GPSIFD.GPSAltitudeRef] = 0;
                        gps[piexif.GPSIFD.GPSAltitude] = [Math.round(altitude * 100), 100];
                    }
                    
                    // GPS Time Stamp
                    const gpsHours = timestamp.getUTCHours();
                    const gpsMinutes = timestamp.getUTCMinutes();
                    const gpsSeconds = timestamp.getUTCSeconds();
                    gps[piexif.GPSIFD.GPSTimeStamp] = [
                        [gpsHours, 1],
                        [gpsMinutes, 1],
                        [gpsSeconds, 1]
                    ];
                    
                    // GPS Date
                    const gpsDateStr = `${String(year).padStart(4, '0')}:${String(month).padStart(2, '0')}:${String(day).padStart(2, '0')}`;
                    gps[piexif.GPSIFD.GPSDateStamp] = gpsDateStr;
                    
                    // GPS Image Direction
                    if (bearing !== null && !isNaN(bearing)) {
                        const normalizedBearing = ((bearing % 360) + 360) % 360;
                        gps[piexif.GPSIFD.GPSImgDirectionRef] = "T";
                        gps[piexif.GPSIFD.GPSImgDirection] = [Math.round(normalizedBearing * 100), 100];
                    }

                    // Additional drone metadata in UserComment
                    let userComment = `Eagle Eyes Photo Point: ${photoPoint.name}\n`;
                    userComment += `Drone: ${droneName}\n`;
                    userComment += `Location: ${photoPoint.lat.toFixed(6)}, ${photoPoint.lng.toFixed(6)}\n`;
                    if (altitude !== null) userComment += `Altitude: ${altitude.toFixed(1)}m\n`;
                    if (bearing !== null) userComment += `Bearing: ${bearing.toFixed(1)}°\n`;
                    if (pitch !== null) userComment += `Pitch: ${pitch.toFixed(1)}°\n`;
                    if (battery !== null) userComment += `Battery: ${battery.toFixed(0)}%\n`;
                    exif[piexif.ExifIFD.UserComment] = userComment;

                    // Create EXIF string
                    const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
                    const exifStr = piexif.dump(exifObj);

                    // Insert EXIF into JPEG binary string
                    const jpegDataWithExif = piexif.insert(exifStr, binaryString);
                    
                    // Convert binary string back to base64 data URL
                    const jpegBase64 = btoa(jpegDataWithExif);
                    const jpegDataUrl = `data:image/jpeg;base64,${jpegBase64}`;
                    
                    // Verify EXIF was inserted
                    try {
                        const verifyExif = piexif.load(jpegDataWithExif);
                        if (!verifyExif.GPS || Object.keys(verifyExif.GPS).length === 0) {
                            console.warn('EXIF GPS data verification failed - GPS block is empty');
                        } else {
                            console.log('✓ Photo point created with EXIF GPS metadata verified');
                        }
                    } catch (verifyError) {
                        console.warn('Could not verify EXIF data:', verifyError);
                    }

                    resolve(jpegDataUrl);
                } catch (error) {
                    console.error('Error adding EXIF data:', error);
                    // Fallback: return original JPEG without EXIF
                    resolve(jpegDataUrl);
                }
            };
            img.onerror = () => {
                console.error('Failed to load image for EXIF processing');
                resolve(null);
            };
            img.src = photoPoint.imageData;
        });
    }

    // Create georeferenced image file for sharing/downloading
    async createGeoreferencedImageFile(photoPoint) {
        return new Promise((resolve, reject) => {
            // Get drone data for additional metadata
            const droneData = this.currentDroneData;
            const droneName = this.currentDroneName || 'Unknown Drone';
            const altitude = droneData?.altitude_asl || droneData?.altitude_ahl || null;
            // Use bearing from photoPoint if available, otherwise from current drone data
            const bearing = photoPoint?.bearing ?? droneData?.bearing ?? null;
            const pitch = droneData?.pitch || null;
            const battery = droneData?.battery_percent || null;

            // Create image from data URL
            const img = new Image();
            img.onload = () => {
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Convert to JPEG for EXIF support (PNG doesn't support EXIF)
                canvas.toBlob((blob) => {
                    // Read blob as array buffer, then convert to binary string for piexif
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            // Convert ArrayBuffer to binary string for piexif
                            const arrayBuffer = reader.result;
                            const bytes = new Uint8Array(arrayBuffer);
                            let binary = '';
                            for (let i = 0; i < bytes.length; i++) {
                                binary += String.fromCharCode(bytes[i]);
                            }

                            // Get timestamp from photo point
                            const timestamp = new Date(photoPoint.timestamp);
                            const year = timestamp.getFullYear();
                            const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                            const day = String(timestamp.getDate()).padStart(2, '0');
                            const hours = String(timestamp.getHours()).padStart(2, '0');
                            const minutes = String(timestamp.getMinutes()).padStart(2, '0');
                            const seconds = String(timestamp.getSeconds()).padStart(2, '0');
                            const dateStr = `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;

                            // Prepare EXIF data
                            const zeroth = {};
                            const exif = {};
                            const gps = {};

                            // Basic image info
                            zeroth[piexif.ImageIFD.Make] = "Eagle Eyes";
                            zeroth[piexif.ImageIFD.Model] = droneName;
                            zeroth[piexif.ImageIFD.Software] = "Eagle Eyes Viewer";
                            zeroth[piexif.ImageIFD.DateTime] = dateStr;
                            zeroth[piexif.ImageIFD.ImageDescription] = `Eagle Eyes Photo Point: ${photoPoint.name}`;

                            // EXIF data
                            exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
                            exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;

                            // GPS data
                            // Convert decimal degrees to degrees, minutes, seconds (DMS format for EXIF)
                            // EXIF requires rational numbers: [[degrees, 1], [minutes, 1], [seconds*100, 100]]
                            const toDMS = (decimal) => {
                                const abs = Math.abs(decimal);
                                const deg = Math.floor(abs);
                                const minFloat = (abs - deg) * 60;
                                const min = Math.floor(minFloat);
                                const sec = (minFloat - min) * 60;
                                // Return as EXIF rational format: [[numerator, denominator], ...]
                                return [[deg, 1], [min, 1], [Math.round(sec * 100), 100]];
                            };

                            const latDMS = toDMS(photoPoint.lat);
                            const lngDMS = toDMS(photoPoint.lng);

                            // GPS Version ID (required)
                            gps[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
                            
                            // GPS Latitude (required) - in DMS format as EXIF rationals
                            gps[piexif.GPSIFD.GPSLatitudeRef] = photoPoint.lat >= 0 ? "N" : "S";
                            gps[piexif.GPSIFD.GPSLatitude] = latDMS;
                            
                            // GPS Longitude (required) - in DMS format as EXIF rationals
                            gps[piexif.GPSIFD.GPSLongitudeRef] = photoPoint.lng >= 0 ? "E" : "W";
                            gps[piexif.GPSIFD.GPSLongitude] = lngDMS;
                            
                            // GPS Altitude (optional)
                            if (altitude !== null) {
                                gps[piexif.GPSIFD.GPSAltitudeRef] = 0; // 0 = above sea level, 1 = below sea level
                                gps[piexif.GPSIFD.GPSAltitude] = [Math.round(altitude * 100), 100]; // Rational: [meters*100, 100]
                            }
                            
                            // GPS Time Stamp (optional but recommended)
                            const gpsHours = timestamp.getUTCHours();
                            const gpsMinutes = timestamp.getUTCMinutes();
                            const gpsSeconds = timestamp.getUTCSeconds();
                            gps[piexif.GPSIFD.GPSTimeStamp] = [
                                [gpsHours, 1],
                                [gpsMinutes, 1],
                                [gpsSeconds, 1]
                            ];
                            
                            // GPS Date (optional but recommended)
                            const gpsDateStr = `${String(year).padStart(4, '0')}:${String(month).padStart(2, '0')}:${String(day).padStart(2, '0')}`;
                            gps[piexif.GPSIFD.GPSDateStamp] = gpsDateStr;
                            
                            // GPS Image Direction (optional but ideal) - camera/drone heading
                            if (bearing !== null && !isNaN(bearing)) {
                                // Normalize bearing to 0-360
                                const normalizedBearing = ((bearing % 360) + 360) % 360;
                                gps[piexif.GPSIFD.GPSImgDirectionRef] = "T"; // T = True North, M = Magnetic North
                                gps[piexif.GPSIFD.GPSImgDirection] = [Math.round(normalizedBearing * 100), 100]; // Rational: [degrees*100, 100]
                            }

                            // Additional drone metadata in UserComment
                            let userComment = `Eagle Eyes Photo Point: ${photoPoint.name}\n`;
                            userComment += `Drone: ${droneName}\n`;
                            userComment += `Location: ${photoPoint.lat.toFixed(6)}, ${photoPoint.lng.toFixed(6)}\n`;
                            if (altitude !== null) userComment += `Altitude: ${altitude.toFixed(1)}m\n`;
                            if (bearing !== null) userComment += `Bearing: ${bearing.toFixed(1)}°\n`;
                            if (pitch !== null) userComment += `Pitch: ${pitch.toFixed(1)}°\n`;
                            if (battery !== null) userComment += `Battery: ${battery.toFixed(0)}%\n`;
                            exif[piexif.ExifIFD.UserComment] = userComment;

                            // Create EXIF string
                            const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
                            const exifStr = piexif.dump(exifObj);

                            // Insert EXIF into JPEG binary string
                            const jpegDataWithExif = piexif.insert(exifStr, binary);
                            
                            // Verify EXIF was inserted by reading it back
                            try {
                                const verifyExif = piexif.load(jpegDataWithExif);
                                if (!verifyExif.GPS || Object.keys(verifyExif.GPS).length === 0) {
                                    console.warn('EXIF GPS data verification failed - GPS block is empty');
                                } else {
                                    console.log('EXIF GPS data verified:', {
                                        lat: verifyExif.GPS[piexif.GPSIFD.GPSLatitude],
                                        lng: verifyExif.GPS[piexif.GPSIFD.GPSLongitude],
                                        hasDirection: !!verifyExif.GPS[piexif.GPSIFD.GPSImgDirection]
                                    });
                                }
                            } catch (verifyError) {
                                console.warn('Could not verify EXIF data:', verifyError);
                            }

                            // Convert binary string back to ArrayBuffer
                            const jpegBytes = new Uint8Array(jpegDataWithExif.length);
                            for (let i = 0; i < jpegDataWithExif.length; i++) {
                                jpegBytes[i] = jpegDataWithExif.charCodeAt(i);
                            }

                            // Create blob and file
                            const finalBlob = new Blob([jpegBytes], { type: 'image/jpeg' });
                            const fileName = `EagleEyes_${photoPoint.name.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                            const file = new File([finalBlob], fileName, { type: 'image/jpeg' });
                            
                            resolve(file);
                        } catch (error) {
                            console.error('Error adding EXIF data:', error);
                            // Fallback: create file without EXIF
                            const fileName = `EagleEyes_${photoPoint.name.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                            const file = new File([blob], fileName, { type: 'image/jpeg' });
                            resolve(file);
                        }
                    };
                    reader.readAsArrayBuffer(blob);
                }, 'image/jpeg', 0.95); // Use JPEG with high quality
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = photoPoint.imageData;
        });
    }

    // Share photo point
    async sharePhotoPoint(photoPointId) {
        console.log('sharePhotoPoint called with ID:', photoPointId);
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (!photoPoint) {
            console.error('Photo point not found:', photoPointId);
            alert('Photo point not found');
            return;
        }

        // Detect if we're on mobile (touch device with small screen)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                         (window.innerWidth <= 768 && 'ontouchstart' in window);

        // Create georeferenced image file
        try {
            const georeferencedFile = await this.createGeoreferencedImageFile(photoPoint);
            
            // On mobile, use native share with the image file
            if (isMobile && navigator.share) {
                try {
                    await navigator.share({
                        title: `Eagle Eyes Photo Point: ${photoPoint.name}`,
                        text: `Check out this georeferenced photo from Eagle Eyes: ${photoPoint.name}`,
                        files: [georeferencedFile]
                    });
                    // Don't show toast on mobile when native share succeeds
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.log('Mobile share failed:', err);
                        // Fallback: trigger download
                        const url = URL.createObjectURL(georeferencedFile);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = georeferencedFile.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    }
                }
            } else {
                // Desktop: trigger download of the georeferenced image
                const url = URL.createObjectURL(georeferencedFile);
                const link = document.createElement('a');
                link.href = url;
                link.download = georeferencedFile.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Error creating georeferenced image:', error);
            alert('Failed to create georeferenced image for sharing');
        }
    }

    // Remove photo point
    removePhotoPoint(photoPointId) {
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (!photoPoint) return;

        // Confirm deletion
        if (!confirm(`Are you sure you want to remove photo point "${photoPoint.name}"?`)) {
            return;
        }

        // Remove marker from map
        const marker = this.photoPointMarkers[photoPointId];
        if (marker && this.map) {
            this.map.removeLayer(marker);
        }

        // Remove from storage
        this.photoPoints = this.photoPoints.filter(p => p.id !== photoPointId);
        delete this.photoPointMarkers[photoPointId];
        this.savePhotoPointsToStorage();
    }

    // Copy photo point URL to clipboard and open it
    async copyPhotoPointUrlAndOpen(photoPointId) {
        console.log('copyPhotoPointUrlAndOpen called with ID:', photoPointId);
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (!photoPoint) {
            console.error('Photo point not found:', photoPointId);
            alert('Photo point not found');
            return;
        }

        // Generate share URL - clean URL, force map view
        const currentUrl = new URL(window.location.href);
        // Remove all existing query parameters
        currentUrl.search = '';
        // Add only photo point parameters
        currentUrl.searchParams.set('photoPoint', photoPointId);
        currentUrl.searchParams.set('view', 'map'); // Force map view mode
        currentUrl.searchParams.set('zoom', '18');
        currentUrl.searchParams.set('lat', photoPoint.lat);
        currentUrl.searchParams.set('lng', photoPoint.lng);
        const shareUrl = currentUrl.toString();
        
        console.log('Share URL generated:', shareUrl);

        // Copy to clipboard
        try {
            await navigator.clipboard.writeText(shareUrl);
            console.log('URL copied to clipboard successfully');
            // Show toast notification
            this.showPhotoPointUrlCopiedToast();
        } catch (err) {
            console.log('Clipboard API failed, using fallback:', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile devices
            try {
                document.execCommand('copy');
                console.log('URL copied using fallback method');
                // Show toast notification
                this.showPhotoPointUrlCopiedToast();
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                alert('Failed to copy URL. Please copy manually: ' + shareUrl);
            }
            document.body.removeChild(textarea);
        }

        // Open the URL in a new tab/window
        window.open(shareUrl, '_blank');
    }

    // Copy photo point URL to clipboard
    copyPhotoPointUrl(url) {
        console.log('copyPhotoPointUrl called with URL:', url);
        navigator.clipboard.writeText(url).then(() => {
            console.log('URL copied to clipboard successfully');
            // Show toast notification
            this.showPhotoPointUrlCopiedToast();
        }).catch((err) => {
            console.log('Clipboard API failed, using fallback:', err);
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, 99999); // For mobile devices
            try {
                document.execCommand('copy');
                console.log('URL copied using fallback method');
                // Show toast notification
                this.showPhotoPointUrlCopiedToast();
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
                alert('Failed to copy URL. Please copy manually: ' + url);
            }
            document.body.removeChild(textarea);
        });
    }

    // Show toast notification for copied URL
    showPhotoPointUrlCopiedToast() {
        console.log('showPhotoPointUrlCopiedToast called');
        const toastElement = document.getElementById('photoPointUrlCopiedToast');
        if (!toastElement) {
            console.error('Toast element not found');
            // Fallback: show alert
            alert('URL copied to clipboard!');
            return;
        }
        
        console.log('Toast element found, showing...');
        
        // Remove the !important display:none from inline styles by removing the style attribute and re-adding
        toastElement.removeAttribute('style');
        
        // Use Bootstrap toast API if available
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            try {
                // Dispose any existing toast instance
                const existingToast = bootstrap.Toast.getInstance(toastElement);
                if (existingToast) {
                    existingToast.dispose();
                }
                
                // Set position and z-index before showing
                toastElement.style.position = 'fixed';
                toastElement.style.top = '80px';
                toastElement.style.right = '20px';
                toastElement.style.zIndex = '10005'; // Higher than Leaflet popups (1000)
                
                const toast = new bootstrap.Toast(toastElement, {
                    autohide: true,
                    delay: 2000 // 2 seconds as requested
                });
                toast.show();
                console.log('Bootstrap toast shown');
            } catch (err) {
                console.error('Error showing Bootstrap toast:', err);
                // Fallback: manual display
                this.showToastManually(toastElement);
            }
        } else {
            console.log('Bootstrap not available, using manual display');
            // Fallback: manual display
            this.showToastManually(toastElement);
        }
    }
    
    // Manual toast display fallback
    showToastManually(toastElement) {
        // Remove inline styles that might have !important
        toastElement.removeAttribute('style');
        
        // Set all styles fresh
        toastElement.style.cssText = 'position: fixed !important; top: 80px !important; right: 20px !important; z-index: 10005 !important; width: auto !important; min-width: 280px !important; display: block !important; opacity: 1 !important; visibility: visible !important;';
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
            toastElement.style.display = 'none';
        }, 2000);
    }

    // Download photo point with geotagging
    downloadPhotoPoint(photoPointId) {
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (!photoPoint) {
            console.error('Photo point not found:', photoPointId);
            return;
        }

        // Check if piexif is available
        if (typeof piexif === 'undefined') {
            console.error('piexif library not loaded! Cannot add EXIF metadata.');
            alert('Error: EXIF library not loaded. Please refresh the page.');
            return;
        }

        // Get drone data for additional metadata
        const droneData = this.currentDroneData;
        const droneName = this.currentDroneName || 'Unknown Drone';
        const altitude = droneData?.altitude_asl || droneData?.altitude_ahl || null;
        // Use bearing from photoPoint if available, otherwise from current drone data
        const bearing = photoPoint?.bearing ?? droneData?.bearing ?? null;
        const pitch = droneData?.pitch || null;
        const battery = droneData?.battery_percent || null;

        // Create image from data URL
        const img = new Image();
        img.onload = async () => {
            // Create canvas
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // Re-add watermarks to ensure they're present (in case imageData was stored without them)
            await this.addWatermarksToCanvas(ctx, canvas.width, canvas.height, photoPoint);

            // Convert to JPEG data URL (base64) for EXIF support
            // This approach is more reliable than toBlob for piexif
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            
            // Extract base64 data from data URL
            const base64Data = jpegDataUrl.split(',')[1];
            
            // Convert base64 to binary string for piexif
            // piexif.insert() can work with binary string or base64, but binary is more reliable
            const binaryString = atob(base64Data);
            
            try {
                // Get timestamp from photo point
                const timestamp = new Date(photoPoint.timestamp);
                const year = timestamp.getFullYear();
                const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                const day = String(timestamp.getDate()).padStart(2, '0');
                const hours = String(timestamp.getHours()).padStart(2, '0');
                const minutes = String(timestamp.getMinutes()).padStart(2, '0');
                const seconds = String(timestamp.getSeconds()).padStart(2, '0');
                const dateStr = `${year}:${month}:${day} ${hours}:${minutes}:${seconds}`;

                // Prepare EXIF data
                const zeroth = {};
                const exif = {};
                const gps = {};

                // Basic image info
                zeroth[piexif.ImageIFD.Make] = "Eagle Eyes";
                zeroth[piexif.ImageIFD.Model] = droneName;
                zeroth[piexif.ImageIFD.Software] = "Eagle Eyes Viewer";
                zeroth[piexif.ImageIFD.DateTime] = dateStr;
                zeroth[piexif.ImageIFD.ImageDescription] = `Eagle Eyes Photo Point: ${photoPoint.name}`;

                // EXIF data
                exif[piexif.ExifIFD.DateTimeOriginal] = dateStr;
                exif[piexif.ExifIFD.DateTimeDigitized] = dateStr;

                // GPS data
                // Convert decimal degrees to degrees, minutes, seconds (DMS format for EXIF)
                // EXIF requires rational numbers: [[degrees, 1], [minutes, 1], [seconds*100, 100]]
                const toDMS = (decimal) => {
                    const abs = Math.abs(decimal);
                    const deg = Math.floor(abs);
                    const minFloat = (abs - deg) * 60;
                    const min = Math.floor(minFloat);
                    const sec = (minFloat - min) * 60;
                    // Return as EXIF rational format: [[numerator, denominator], ...]
                    return [[deg, 1], [min, 1], [Math.round(sec * 100), 100]];
                };

                const latDMS = toDMS(photoPoint.lat);
                const lngDMS = toDMS(photoPoint.lng);

                // GPS Version ID (required)
                gps[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
                
                // GPS Latitude (required) - in DMS format as EXIF rationals
                gps[piexif.GPSIFD.GPSLatitudeRef] = photoPoint.lat >= 0 ? "N" : "S";
                gps[piexif.GPSIFD.GPSLatitude] = latDMS;
                
                // GPS Longitude (required) - in DMS format as EXIF rationals
                gps[piexif.GPSIFD.GPSLongitudeRef] = photoPoint.lng >= 0 ? "E" : "W";
                gps[piexif.GPSIFD.GPSLongitude] = lngDMS;
                
                // GPS Altitude (optional)
                if (altitude !== null) {
                    gps[piexif.GPSIFD.GPSAltitudeRef] = 0; // 0 = above sea level, 1 = below sea level
                    gps[piexif.GPSIFD.GPSAltitude] = [Math.round(altitude * 100), 100]; // Rational: [meters*100, 100]
                }
                
                // GPS Time Stamp (optional but recommended)
                const gpsHours = timestamp.getUTCHours();
                const gpsMinutes = timestamp.getUTCMinutes();
                const gpsSeconds = timestamp.getUTCSeconds();
                gps[piexif.GPSIFD.GPSTimeStamp] = [
                    [gpsHours, 1],
                    [gpsMinutes, 1],
                    [gpsSeconds, 1]
                ];
                
                // GPS Date (optional but recommended)
                const gpsDateStr = `${String(year).padStart(4, '0')}:${String(month).padStart(2, '0')}:${String(day).padStart(2, '0')}`;
                gps[piexif.GPSIFD.GPSDateStamp] = gpsDateStr;
                
                // GPS Image Direction (optional but ideal) - camera/drone heading
                if (bearing !== null && !isNaN(bearing)) {
                    // Normalize bearing to 0-360
                    const normalizedBearing = ((bearing % 360) + 360) % 360;
                    gps[piexif.GPSIFD.GPSImgDirectionRef] = "T"; // T = True North, M = Magnetic North
                    gps[piexif.GPSIFD.GPSImgDirection] = [Math.round(normalizedBearing * 100), 100]; // Rational: [degrees*100, 100]
                }

                // Additional drone metadata in UserComment
                let userComment = `Eagle Eyes Photo Point: ${photoPoint.name}\n`;
                userComment += `Drone: ${droneName}\n`;
                userComment += `Location: ${photoPoint.lat.toFixed(6)}, ${photoPoint.lng.toFixed(6)}\n`;
                if (altitude !== null) userComment += `Altitude: ${altitude.toFixed(1)}m\n`;
                if (bearing !== null) userComment += `Bearing: ${bearing.toFixed(1)}°\n`;
                if (pitch !== null) userComment += `Pitch: ${pitch.toFixed(1)}°\n`;
                if (battery !== null) userComment += `Battery: ${battery.toFixed(0)}%\n`;
                exif[piexif.ExifIFD.UserComment] = userComment;

                // Create EXIF string
                const exifObj = { "0th": zeroth, "Exif": exif, "GPS": gps };
                let exifStr;
                try {
                    exifStr = piexif.dump(exifObj);
                    console.log('EXIF data prepared:', {
                        hasGPS: !!gps && Object.keys(gps).length > 0,
                        gpsFields: Object.keys(gps),
                        lat: photoPoint.lat,
                        lng: photoPoint.lng
                    });
                } catch (dumpError) {
                    console.error('Error dumping EXIF data:', dumpError);
                    throw dumpError;
                }

                // Insert EXIF into JPEG binary string
                let jpegDataWithExif;
                try {
                    jpegDataWithExif = piexif.insert(exifStr, binaryString);
                    console.log('EXIF inserted into JPEG, new size:', jpegDataWithExif.length, 'original:', binaryString.length);
                } catch (insertError) {
                    console.error('Error inserting EXIF into JPEG:', insertError);
                    console.error('Error details:', {
                        exifStrLength: exifStr ? exifStr.length : 0,
                        binaryStringLength: binaryString ? binaryString.length : 0,
                        error: insertError.message || insertError
                    });
                    throw insertError;
                }
                
                // Verify EXIF was inserted by reading it back
                try {
                    const verifyExif = piexif.load(jpegDataWithExif);
                    if (!verifyExif.GPS || Object.keys(verifyExif.GPS).length === 0) {
                        console.error('EXIF GPS data verification failed - GPS block is empty!');
                        console.error('Available EXIF sections:', Object.keys(verifyExif));
                    } else {
                        console.log('✓ EXIF GPS data verified successfully:', {
                            lat: verifyExif.GPS[piexif.GPSIFD.GPSLatitude],
                            lng: verifyExif.GPS[piexif.GPSIFD.GPSLongitude],
                            hasDirection: !!verifyExif.GPS[piexif.GPSIFD.GPSImgDirection],
                            gpsFields: Object.keys(verifyExif.GPS)
                        });
                    }
                } catch (verifyError) {
                    console.error('Could not verify EXIF data:', verifyError);
                }

                // Convert binary string back to ArrayBuffer
                const jpegBytes = new Uint8Array(jpegDataWithExif.length);
                for (let i = 0; i < jpegDataWithExif.length; i++) {
                    jpegBytes[i] = jpegDataWithExif.charCodeAt(i);
                }

                // Create blob and download
                const finalBlob = new Blob([jpegBytes], { type: 'image/jpeg' });
                const url = URL.createObjectURL(finalBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `EagleEyes_${photoPoint.name.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error adding EXIF data:', error);
                console.error('Stack trace:', error.stack);
                // Fallback: download without EXIF (convert data URL to blob)
                const base64Data = jpegDataUrl.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const fallbackBlob = new Blob([byteArray], { type: 'image/jpeg' });
                const url = URL.createObjectURL(fallbackBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `EagleEyes_${photoPoint.name.replace(/[^a-z0-9]/gi, '_')}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                alert('Warning: Could not add EXIF metadata to image. Image downloaded without GPS data.');
            }
        };
        img.src = photoPoint.imageData;
    }

    // Load photo points from localStorage with IndexedDB fallback
    async loadPhotoPointsFromStorage() {
        try {
            const stored = localStorage.getItem('eagleEyesPhotoPoints');
            if (stored) {
                this.photoPoints = JSON.parse(stored);
                console.log('Loaded photo points from localStorage:', this.photoPoints.length);
                
                // If some points are missing imageData, try to load from IndexedDB
                const missingImages = this.photoPoints.filter(pp => !pp.imageData);
                if (missingImages.length > 0) {
                    console.log('Some photo points missing images, attempting to load from IndexedDB...');
                    try {
                        const indexedDBPoints = await this.loadPhotoPointsFromIndexedDB();
                        // Merge imageData from IndexedDB
                        indexedDBPoints.forEach(idbPoint => {
                            const localPoint = this.photoPoints.find(pp => pp.id === idbPoint.id);
                            if (localPoint && !localPoint.imageData && idbPoint.imageData) {
                                localPoint.imageData = idbPoint.imageData;
                            }
                        });
                        // Save merged data back
                        this.savePhotoPointsToStorage();
                    } catch (err) {
                        console.warn('Could not load from IndexedDB:', err);
                    }
                }
                
                // Recreate markers for all photo points
                this.photoPoints.forEach(photoPoint => {
                    this.addPhotoPointMarker(photoPoint);
                });
            } else {
                // No localStorage data, try IndexedDB
                console.log('No localStorage data, attempting IndexedDB...');
                try {
                    const indexedDBPoints = await this.loadPhotoPointsFromIndexedDB();
                    if (indexedDBPoints.length > 0) {
                        this.photoPoints = indexedDBPoints;
                        // Save to localStorage for faster access next time
                        this.savePhotoPointsToStorage();
                        // Recreate markers
                        this.photoPoints.forEach(photoPoint => {
                            this.addPhotoPointMarker(photoPoint);
                        });
                        console.log('Loaded photo points from IndexedDB:', this.photoPoints.length);
                    }
                } catch (err) {
                    console.warn('Could not load from IndexedDB:', err);
                }
            }
        } catch (e) {
            console.error('Failed to load photo points from storage:', e);
            // Try IndexedDB as last resort
            try {
                const indexedDBPoints = await this.loadPhotoPointsFromIndexedDB();
                if (indexedDBPoints.length > 0) {
                    this.photoPoints = indexedDBPoints;
                    this.photoPoints.forEach(photoPoint => {
                        this.addPhotoPointMarker(photoPoint);
                    });
                    console.log('Loaded photo points from IndexedDB (fallback):', this.photoPoints.length);
                }
            } catch (err) {
                console.error('Failed to load from IndexedDB:', err);
            }
        }
    }

    // Save photo points to localStorage with improved persistence
    savePhotoPointsToStorage() {
        try {
            const dataStr = JSON.stringify(this.photoPoints);
            const dataSize = new Blob([dataStr]).size;
            const maxSize = 4 * 1024 * 1024; // 4MB limit (leave room for other localStorage data)
            
            if (dataSize > maxSize) {
                console.warn('Photo points data too large for localStorage, attempting to compress...');
                // Try to save without imageData for very old points, keeping only recent ones with images
                const recentPhotoPoints = this.photoPoints.slice(-10); // Keep last 10 with full data
                const olderPhotoPoints = this.photoPoints.slice(0, -10).map(pp => ({
                    ...pp,
                    imageData: null // Remove image data from older points
                }));
                const compressedPoints = [...olderPhotoPoints, ...recentPhotoPoints];
                const compressedStr = JSON.stringify(compressedPoints);
                const compressedSize = new Blob([compressedStr]).size;
                
                if (compressedSize < maxSize) {
                    localStorage.setItem('eagleEyesPhotoPoints', compressedStr);
                    console.log('Saved compressed photo points to localStorage');
                } else {
                    // Still too large, keep only IDs and metadata
                    const minimalPoints = this.photoPoints.map(pp => ({
                        id: pp.id,
                        name: pp.name,
                        lat: pp.lat,
                        lng: pp.lng,
                        timestamp: pp.timestamp,
                        droneName: pp.droneName,
                        imageData: null // Remove all image data
                    }));
                    localStorage.setItem('eagleEyesPhotoPoints', JSON.stringify(minimalPoints));
                    console.log('Saved minimal photo points (without images) to localStorage due to size constraints');
                }
            } else {
                localStorage.setItem('eagleEyesPhotoPoints', dataStr);
                console.log('Saved photo points to localStorage, size:', (dataSize / 1024).toFixed(2), 'KB');
            }
            
            // Also try IndexedDB as backup for better persistence
            this.savePhotoPointsToIndexedDB(this.photoPoints).catch(err => {
                console.warn('Failed to save to IndexedDB (non-critical):', err);
            });
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                console.error('localStorage quota exceeded, attempting IndexedDB fallback...');
                // Try IndexedDB as fallback
                this.savePhotoPointsToIndexedDB(this.photoPoints).catch(err => {
                    console.error('Failed to save photo points to storage:', err);
                });
            } else {
                console.error('Failed to save photo points to storage:', e);
            }
        }
    }
    
    // Save photo points to IndexedDB for better persistence
    async savePhotoPointsToIndexedDB(photoPoints) {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB not supported'));
                return;
            }
            
            const request = indexedDB.open('EagleEyesPhotoPoints', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['photoPoints'], 'readwrite');
                const store = transaction.objectStore('photoPoints');
                
                // Clear existing data
                store.clear();
                
                // Add all photo points
                photoPoints.forEach((pp, index) => {
                    store.add(pp, pp.id);
                });
                
                transaction.oncomplete = () => {
                    console.log('Saved photo points to IndexedDB');
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('photoPoints')) {
                    const objectStore = db.createObjectStore('photoPoints', { keyPath: 'id' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }
    
    // Load photo points from IndexedDB (fallback)
    async loadPhotoPointsFromIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                resolve([]);
                return;
            }
            
            const request = indexedDB.open('EagleEyesPhotoPoints', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['photoPoints'], 'readonly');
                const store = transaction.objectStore('photoPoints');
                const getAllRequest = store.getAll();
                
                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result || []);
                };
                getAllRequest.onerror = () => reject(getAllRequest.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('photoPoints')) {
                    const objectStore = db.createObjectStore('photoPoints', { keyPath: 'id' });
                    objectStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    // Load photo point from URL parameter
    loadPhotoPointFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const photoPointId = urlParams.get('photoPoint');
        if (!photoPointId) return;

        // Check if we should force map view mode
        const viewMode = urlParams.get('view');
        if (viewMode === 'map') {
            // Switch to map view mode
            if (typeof window.setViewMode === 'function') {
                window.setViewMode('map');
            }
        }

        // Try to find photo point in storage
        const photoPoint = this.photoPoints.find(p => p.id === photoPointId);
        if (photoPoint && this.map) {
            // Get zoom level from URL or use default
            const zoom = parseInt(urlParams.get('zoom')) || 18;
            const lat = parseFloat(urlParams.get('lat')) || photoPoint.lat;
            const lng = parseFloat(urlParams.get('lng')) || photoPoint.lng;
            
            // Zoom to photo point
            this.map.setView([lat, lng], zoom);
            
            // Wait for map to finish loading, then open popup
            const openPopup = () => {
                const marker = this.photoPointMarkers[photoPointId];
                if (marker) {
                    // Ensure marker popup content is up to date
                    marker.setPopupContent(this.generatePhotoPointPopupContent(photoPoint));
                    marker.openPopup();
                } else {
                    // Marker might not exist yet, create it
                    this.addPhotoPointMarker(photoPoint);
                    setTimeout(() => {
                        const newMarker = this.photoPointMarkers[photoPointId];
                        if (newMarker) {
                            newMarker.openPopup();
                        }
                    }, 500);
                }
            };
            
            // Wait for map view to settle
            this.map.whenReady(() => {
                setTimeout(openPopup, 1000);
            });
            
            // Also try after a longer delay in case whenReady doesn't fire
            setTimeout(openPopup, 2000);
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
        const caltopoBtn = document.getElementById('caltopoBtn'); // Desktop (inside navbar-collapse)
        const caltopoBtnNavMobile = document.getElementById('caltopoBtnNavMobile'); // Mobile navbar (outside navbar-collapse)
        const caltopoBtnMobile = document.getElementById('caltopoBtnMobile'); // Offcanvas menu

        if (this.caltopoInfo && this.caltopoInfo.map_id && this.caltopoInfo.map_name) {
            // Update desktop button (inside navbar-collapse)
            if (caltopoBtn) {
                caltopoBtn.style.display = 'flex';
                const mapNameSpan = document.getElementById('caltopoMapName');
                if (mapNameSpan) {
                    mapNameSpan.textContent = this.caltopoInfo.map_name;
                }
            }

            // Update mobile navbar button (outside navbar-collapse)
            if (caltopoBtnNavMobile) {
                caltopoBtnNavMobile.style.display = 'flex';
                const mapNameSpanNavMobile = document.getElementById('caltopoMapNameNavMobile');
                if (mapNameSpanNavMobile) {
                    mapNameSpanNavMobile.textContent = this.caltopoInfo.map_name;
                }
            }

            // Update offcanvas mobile button
            if (caltopoBtnMobile) {
                caltopoBtnMobile.style.display = 'flex';
                const mapNameSpanMobile = document.getElementById('caltopoMapNameMobile');
                if (mapNameSpanMobile) {
                    mapNameSpanMobile.textContent = this.caltopoInfo.map_name;
                }
            }
        } else {
            // Hide all buttons
            if (caltopoBtn) caltopoBtn.style.display = 'none';
            if (caltopoBtnNavMobile) caltopoBtnNavMobile.style.display = 'none';
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
        
        // Clear disconnected timer
        if (this.disconnectedTimer) {
            clearTimeout(this.disconnectedTimer);
            this.disconnectedTimer = null;
        }
        this.hideDisconnectedOverlay();

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
        this.updateDroneOverviewIndicator();
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

        // Clear any existing timer
        if (this.disconnectedTimer) {
            clearTimeout(this.disconnectedTimer);
            this.disconnectedTimer = null;
        }

        if (isDisconnected) {
            // Wait 5 seconds before showing the disconnected banner
            this.disconnectedTimer = setTimeout(() => {
                this.showDisconnectedOverlay();
                this.disconnectedTimer = null;
            }, this.disconnectedDelayMs);
        } else {
            // Connection restored - hide immediately
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
            const droneData = this.extractDroneDataFromTelemetry(telemetryData);
            if (!droneData) continue;

            const latLng = [droneData.latitude, droneData.longitude];
            const droneName = telemetryData.drone_name || telemetryData.drone_id || 'Other Drone';
            const livestreamId = telemetryData.livestream_id || null;

            // Add red dot indicator if this drone is livestreaming
            const redDot = livestreamId ?
                '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 6px; height: 6px; background-color: red; border-radius: 50%; border: 1px solid white;"></div>' :
                '';

            if (!this.otherDroneMarkers[droneId]) {
                // Create new marker
                const yaw = typeof droneData.bearing === 'number' ? droneData.bearing : 0;
                const otherDroneIcon = L.divIcon({
                    html: `<div style="position: relative; width: 28px; height: 28px;"><img src="${this.getAssetPath('/images/livestream/map_other_drone_flyer_2.png')}" style="width: 28px; height: 28px; transform: rotate(${yaw}deg); transform-origin: center;">${redDot}</div>`,
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
                            const yawValue = typeof droneData.bearing === 'number' ? droneData.bearing : 0;
                            img.style.transform = `rotate(${yawValue}deg)`;
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

        this.updateDroneOverviewIndicator();
    }

    extractDroneDataFromTelemetry(telemetryData) {
        if (!telemetryData || !telemetryData.state) return null;
        const location = telemetryData.state.drone_gps_location;
        const pose = telemetryData.state.drone_pose;
        if (!location || !pose) return null;

        return {
            latitude: location.lat,
            longitude: location.lng,
            altitude_ahl: location.altitude_ahl_m,
            altitude_asl: location.altitude_asl_m,
            altitude_ellipsoid: location.altitude_ellipsoid_m,
            bearing: pose.yaw_deg,
            pitch: pose.pitch_deg,
            battery_percent: telemetryData.state?.misc?.battery_percent ?? null,
            timestamp: telemetryData.state?.timestamp ?? Date.now()
        };
    }

    getDroneOverviewEntries() {
        const entries = [];

        if (this.currentDroneData) {
            entries.push({
                id: 'current-drone',
                name: this.currentDroneName || 'Active Drone',
                telemetry: this.currentDroneData,
                livestreamId: this.currentLivestreamId || null,
                isCurrent: true,
                updatedAt: this.lastDroneUpdate ? this.lastDroneUpdate.getTime() : Date.now()
            });
        }

        Object.entries(this.otherDroneMarkers).forEach(([droneId, markerInfo]) => {
            const telemetryData = markerInfo.telemetryData;
            const droneData = this.extractDroneDataFromTelemetry(telemetryData);
            if (!droneData) return;
            entries.push({
                id: droneId,
                name: telemetryData.drone_name || telemetryData.drone_id || 'Other Drone',
                telemetry: droneData,
                livestreamId: telemetryData.livestream_id || null,
                isCurrent: false,
                updatedAt: droneData.timestamp || Date.now()
            });
        });

        return entries;
    }

    zoomToDrone(droneId) {
        if (!this.map) return false;

        if (droneId === 'current-drone' && this.currentLocation) {
            this.map.setView(this.currentLocation, 18, { animate: true });
            return true;
        }

        const markerInfo = this.otherDroneMarkers[droneId];
        const telemetry = markerInfo?.telemetryData;
        const location = telemetry?.state?.drone_gps_location;

        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            this.map.setView([location.lat, location.lng], 18, { animate: true });
            return true;
        }

        const entry = window.overviewState?.entries?.[droneId];
        const entryTelemetry = entry?.telemetry;
        if (entryTelemetry && typeof entryTelemetry.latitude === 'number' && typeof entryTelemetry.longitude === 'number') {
            this.map.setView([entryTelemetry.latitude, entryTelemetry.longitude], 18, { animate: true });
            return true;
        }

        return false;
    }

    updateDroneOverviewIndicator() {
        if (typeof window.updateDroneOverviewBadge !== 'function') return;
        const entries = this.getDroneOverviewEntries();
        window.updateDroneOverviewBadge(entries.length);
    }

    clearOtherDrones() {
        if (!this.map) return;

        for (const droneId in this.otherDroneMarkers) {
            this.map.removeLayer(this.otherDroneMarkers[droneId].marker);
        }
        this.otherDroneMarkers = {};
        this.updateDroneOverviewIndicator();
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