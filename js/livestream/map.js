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
        this.staleDataOverlay = null;
        this.isDataStale = false;
        this.disconnectedOverlay = null;
        this.isDisconnected = false;
        this.currentDroneData = null;
        this.currentDroneName = null;
        this.currentLivestreamId = null; // Current drone's livestream ID
        this.droneMapCenteringState = 'OFF'; // 'CONTINUOUS' or 'OFF'
        
        // OpenAIP Airspace layer
        this.airspaceLayer = null;
        this.isAirspaceEnabled = false;
        this.airspaceAcknowledged = false;
        this.airspaceCache = new Map(); // Cache by bbox string
        this.airspaceDebounceTimer = null;
        this.airspaceFeatureIds = new Set(); // For deduplication by stable id
        this.airspaceProxyError = false; // Track if proxy is unreachable
        this.airspaceLoading = false; // Track if airspace is currently loading
        
        // Airspace for Drones layer (Class F airways and drone-relevant airspace)
        this.droneAirspaceLayer = null;
        this.isDroneAirspaceEnabled = false; // Disabled by default
        this.droneAirspaceAcknowledged = false; // Track acknowledgment for drone airspace
        this.droneAirspaceCache = new Map(); // Cache by bbox string
        this.droneAirspaceDebounceTimer = null;
        this.droneAirspaceFeatureIds = new Set(); // For deduplication by stable id
        
        // Multi-hit popup state
        this.multiHitPopup = null; // Current multi-hit popup instance
        this.multiHitFeatures = []; // Array of features at click point
        this.multiHitCurrentIndex = 0; // Current feature index in pager
        this.multiHitOriginalLatLng = null; // Original click location to keep popup anchored
        this.highlightedAirspaceLayer = null; // Currently highlighted airspace layer
        
        // OpenAIP Airports/Heliports layer
        this.airportsLayer = null;
        this.airportsMarkerCluster = null;
        this.isAirportsEnabled = false;
        this.airportsCache = new Map(); // Cache by bbox string
        this.airportsDebounceTimer = null;
        this.airportsFeatureIds = new Set(); // For deduplication by _id
        
        // My location tracking
        this.myLocationMarker = null;
        this.myLocationCircle = null;
        this.watchId = null;
        this.isMyLocationVisible = false;
        this.myLocationAccuracy = null;

        // North arrow control
        this.northArrowMode = 'north'; // 'north' or 'user-facing'
        this.userHeading = null;
        this.northArrowControl = null;
        
        // Full screen control
        this.isFullscreen = false;
        this.fullscreenControl = null;
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
                zoomControl: true,
                attributionControl: true
            }).setView(this.defaultCenter, this.defaultZoom);

            // Create custom panes for proper z-index ordering
            // Polygons should be below markers so markers are always clickable
            this.map.createPane('polygonPane');
            this.map.getPane('polygonPane').style.zIndex = 400; // Below markerPane (600)

            this.map.createPane('droneMarkerPane');
            this.map.getPane('droneMarkerPane').style.zIndex = 650; // Above markerPane and polygons

            // Create high-quality base map layers
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

            // Add default satellite layer
            satelliteLayer.addTo(this.map);

            // Store base map layers for custom control
            this.baseMaps = {
                "Satellite": satelliteLayer,
                "Google Hybrid": googleHybridLayer,
                "Terrain": terrainLayer,
                "Street": streetLayer
            };
            
            this.currentBaseMap = "Satellite";
            
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

            // Initialize OpenAIP airspace layer
            // Note: No onEachFeature for popups - using multi-hit popup system instead
            this.airspaceLayer = L.geoJSON(null, {
                pane: 'polygonPane',
                style: this.getAirspaceStyle.bind(this)
            });
            
            // Initialize Airspace for Drones layer (Class F airways and drone-relevant)
            this.droneAirspaceLayer = L.geoJSON(null, {
                pane: 'polygonPane',
                style: this.getDroneAirspaceStyle.bind(this)
            });
            
            // Add to map if enabled by default
            if (this.isDroneAirspaceEnabled) {
                this.droneAirspaceLayer.addTo(this.map);
            }
            
            // Initialize OpenAIP airports marker cluster layer
            this.airportsMarkerCluster = L.markerClusterGroup({
                maxClusterRadius: 80, // Cluster radius in pixels
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: true,
                zoomToBoundsOnClick: true,
                chunkedLoading: true
            });
            
            // Add map move event listener for airports auto-loading
            this.map.on('moveend', () => {
                if (this.isAirportsEnabled) {
                    this.loadAirportsDataDebounced();
                }
            });

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
            this.addFullscreenControl();
            
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
                this.handleMapClick(e);
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

        } catch (error) {
            console.error('Error initializing map:', error);
            this.fallbackToStaticMap();
        }
    }

    addCustomControls() {
        // Add custom base map switching control first (so it appears above)
        this.addBaseMapControl();
        
        // Add center on drone control
        const centerControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'leaflet-control-center', container);
                button.innerHTML = `<img src="${this.getAssetPath('/images/livestream/map_drone_flyer.png')}" style="width: 20px; height: 20px; display: block; margin: auto;">`;
                button.href = '#';
                button.role = 'button';
                button.title = 'Center on Drone';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';

                // Store reference to button for later styling updates
                this.recenterButton = button;

                L.DomEvent.on(button, 'click', L.DomEvent.stop)
                          .on(button, 'click', this.centerOnDrone, this);

                return container;
            }
        });
        this.map.addControl(new centerControl());
    }
    
    addBaseMapControl() {
        const BaseMapControl = L.Control.extend({
            options: {
                position: 'topleft'
            },
            onAdd: (map) => {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const button = L.DomUtil.create('a', 'leaflet-control-basemap', container);
                
                // Create layers icon using image
                button.innerHTML = `
                    <div style="
                        width: 20px;
                        height: 20px;
                        background: url('${this.getAssetPath('/images/Map Layers (1).png')}') no-repeat center;
                        background-size: 20px 20px;
                        display: block;
                        margin: auto;
                    "></div>
                `;
                
                button.href = '#';
                button.role = 'button';
                button.title = 'Base Maps';
                button.style.display = 'flex';
                button.style.alignItems = 'center';
                button.style.justifyContent = 'center';

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
            // Active state: add outline
            this.recenterButton.style.outline = '1px solid #3b82f6';
            this.recenterButton.style.outlineOffset = '-1px';
            this.recenterButton.title = 'Continuous Centering Active (click to disable)';
        } else {
            // Inactive state: remove outline
            this.recenterButton.style.outline = 'none';
            this.recenterButton.title = 'Center on Drone';
        }
    }
    
    showBaseMapPopup() {
        // Remove existing popup if it exists
        if (this.baseMapPopup) {
            this.baseMapPopup.remove();
        }
        
        // Create a custom DOM popup instead of using Leaflet popup
        const mapContainer = this.map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();
        
        // Create popup element
        this.baseMapPopup = document.createElement('div');
        this.baseMapPopup.style.cssText = `
            position: absolute;
            top: 50px;
            left: 10px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            padding: 12px;
            min-width: 180px;
            z-index: 2000;
            font-family: Arial, sans-serif;
        `;
        
        this.baseMapPopup.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 12px; color: #000; font-size: 14px; text-shadow: 1px 1px 2px rgba(255,255,255,0.8);">Base Maps</div>
            ${Object.keys(this.baseMaps).map(name => `
                <label style="display: block; margin: 6px 0; cursor: pointer; font-size: 13px; padding: 2px 0; color: #000; font-weight: 500;">
                    <input type="radio" name="basemap" value="${name}" 
                           ${name === this.currentBaseMap ? 'checked' : ''} 
                           style="margin-right: 8px;">
                    ${name}
                </label>
            `).join('')}
            <div style="border-top: 1px solid #ddd; margin: 12px 0; padding-top: 12px;">
                <label style="display: block; margin: 6px 0; cursor: pointer; font-size: 13px; padding: 2px 0; color: #000; font-weight: 500;">
                    <input type="checkbox" id="droneAirspaceToggle" ${this.isDroneAirspaceEnabled ? 'checked' : ''} 
                           style="margin-right: 8px;">
                    Airspace for Drones
                </label>
                <label style="display: block; margin: 6px 0; cursor: pointer; font-size: 13px; padding: 2px 0; color: #000; font-weight: 500;">
                    <input type="checkbox" id="airspaceToggle" ${this.isAirspaceEnabled ? 'checked' : ''} 
                           style="margin-right: 8px;">
                    All OpenAIP Airspace
                </label>
                <label style="display: block; margin: 6px 0; cursor: pointer; font-size: 13px; padding: 2px 0; color: #000; font-weight: 500;">
                    <input type="checkbox" id="airportsToggle" ${this.isAirportsEnabled ? 'checked' : ''} 
                           style="margin-right: 8px;">
                    Airports/Heliports
                </label>
            </div>
        `;
        
        // Add event listener for airspace toggle
        const airspaceToggle = this.baseMapPopup.querySelector('#airspaceToggle');
        if (airspaceToggle) {
            airspaceToggle.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                this.toggleAirspace(e.target.checked);
            });
        }
        
        // Add event listener for drone airspace toggle
        const droneAirspaceToggle = this.baseMapPopup.querySelector('#droneAirspaceToggle');
        if (droneAirspaceToggle) {
            droneAirspaceToggle.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                this.toggleDroneAirspace(e.target.checked);
            });
        }
        
        // Add event listener for airports toggle
        const airportsToggle = this.baseMapPopup.querySelector('#airportsToggle');
        if (airportsToggle) {
            airportsToggle.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                this.toggleAirports(e.target.checked);
            });
        }
        
        // Add event listeners to radio buttons
        const radioButtons = this.baseMapPopup.querySelectorAll('input[name="basemap"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document
                if (e.target.checked) {
                    this.switchBaseMap(e.target.value);
                }
            });
        });
        
        // Add to map container
        mapContainer.appendChild(this.baseMapPopup);
        
        // Ensure popup has pointer events enabled so it can be clicked
        this.baseMapPopup.style.pointerEvents = 'auto';
        this.baseMapPopup.style.zIndex = '2000';
        
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
        if (this.baseMapPopup) {
            this.baseMapPopup.remove();
            this.baseMapPopup = null;
        }
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
    toggleDroneAirspace(enabled) {
        if (enabled) {
            // Show acknowledgment modal if not already acknowledged
            if (!this.droneAirspaceAcknowledged) {
                this.showAirspaceAcknowledgment();
                return; // Will enable after acknowledgment
            }
        }
        
        this.isDroneAirspaceEnabled = enabled;
        
        if (enabled) {
            // Add layer to map
            if (!this.map.hasLayer(this.droneAirspaceLayer)) {
                this.droneAirspaceLayer.addTo(this.map);
            }
            
            // Load drone airspace data for current view
            this.loadDroneAirspaceDataDebounced();
        } else {
            // Remove layer from map
            if (this.map.hasLayer(this.droneAirspaceLayer)) {
                this.map.removeLayer(this.droneAirspaceLayer);
            }
            // Clear cache
            this.droneAirspaceCache.clear();
            this.droneAirspaceFeatureIds.clear();
        }
    }

    toggleAirspace(enabled) {
        if (enabled) {
            // Show acknowledgment modal if not already acknowledged
            if (!this.airspaceAcknowledged) {
                this.showAirspaceAcknowledgment();
                return; // Will enable after acknowledgment
            }
        }
        
        this.isAirspaceEnabled = enabled;
        
        if (enabled) {
            // Add layer to map
            if (!this.map.hasLayer(this.airspaceLayer)) {
                this.airspaceLayer.addTo(this.map);
            }
            
            // Load airspace data for current view
            this.loadAirspaceDataDebounced();
        } else {
            // Remove layer from map
            if (this.map.hasLayer(this.airspaceLayer)) {
                this.map.removeLayer(this.airspaceLayer);
            }
            // Clear cache and error state
            this.airspaceCache.clear();
            this.airspaceFeatureIds.clear();
            this.airspaceProxyError = false;
            this.hideProxyErrorMessage();
        }
    }

    showAirspaceAcknowledgment() {
        // Create modal overlay
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
            font-family: Arial, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 500px;
            margin: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;

        modalContent.innerHTML = `
            <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">Airspace Data Disclaimer</h2>
            <p style="margin: 0 0 16px 0; line-height: 1.6; color: #555;">
                The following airspace data is incomplete. This is an open source airspace data provided by 
                <a href="https://www.openaip.net/" target="_blank" style="color: #0066cc;">OpenAIP</a>.
            </p>
            <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: flex-end;">
                <button id="airspaceAcknowledgeBtn" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                ">Acknowledge</button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Handle acknowledge button
        const acknowledgeBtn = modalContent.querySelector('#airspaceAcknowledgeBtn');
        acknowledgeBtn.addEventListener('click', () => {
            // Determine which layer was being toggled based on toggle state
            const droneAirspaceToggle = document.querySelector('#droneAirspaceToggle');
            const airspaceToggle = document.querySelector('#airspaceToggle');
            
            if (droneAirspaceToggle && droneAirspaceToggle.checked) {
                this.droneAirspaceAcknowledged = true;
                this.isDroneAirspaceEnabled = true; // Set the enabled flag
                // Now enable the drone airspace layer
                if (!this.map.hasLayer(this.droneAirspaceLayer)) {
                    this.droneAirspaceLayer.addTo(this.map);
                }
                this.loadDroneAirspaceDataDebounced();
            } else if (airspaceToggle && airspaceToggle.checked) {
                this.airspaceAcknowledged = true;
                this.isAirspaceEnabled = true; // Set the enabled flag
                // Now enable the airspace layer
                if (!this.map.hasLayer(this.airspaceLayer)) {
                    this.airspaceLayer.addTo(this.map);
                }
                this.loadAirspaceDataDebounced();
            }
            
            document.body.removeChild(modal);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                // User clicked outside, disable the layer that was being toggled
                const droneAirspaceToggle = document.querySelector('#droneAirspaceToggle');
                const airspaceToggle = document.querySelector('#airspaceToggle');
                
                if (droneAirspaceToggle && droneAirspaceToggle.checked) {
                    this.isDroneAirspaceEnabled = false;
                    droneAirspaceToggle.checked = false;
                } else if (airspaceToggle && airspaceToggle.checked) {
                    this.isAirspaceEnabled = false;
                    airspaceToggle.checked = false;
                }
                
                document.body.removeChild(modal);
            }
        });
    }

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

    loadDroneAirspaceDataDebounced() {
        // Clear existing timer
        if (this.droneAirspaceDebounceTimer) {
            clearTimeout(this.droneAirspaceDebounceTimer);
        }

        // Set new timer (300ms debounce)
        this.droneAirspaceDebounceTimer = setTimeout(() => {
            this.loadDroneAirspaceData();
        }, 300);
    }

    async loadDroneAirspaceData() {
        if (!this.isDroneAirspaceEnabled || !this.map) return;

        const bounds = this.map.getBounds();
        const rawBbox = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };
        const normalized = this.normalizeBbox(
            rawBbox.west,
            rawBbox.south,
            rawBbox.east,
            rawBbox.north
        );
        const bbox = `${normalized.west},${normalized.south},${normalized.east},${normalized.north}`;
        
        // Check cache
        if (this.droneAirspaceCache.has(bbox)) {
            return;
        }

        const proxyBase = this.getOpenAIPProxyUrl();
        const airspaceUrl = `${proxyBase}/openaip/airspaces?bbox=${bbox}&format=geojson`;

        try {
            const airspaceResponse = await fetch(airspaceUrl).catch(err => {
                console.error('Proxy fetch error for drone airspace:', err);
                return null;
            });

            if (!airspaceResponse || !airspaceResponse.ok) {
                return;
            }

            let airspaceData;
            try {
                airspaceData = await airspaceResponse.json();
            } catch (jsonError) {
                console.error('Failed to parse drone airspace JSON:', jsonError);
                return;
            }
            
            if (airspaceData) {
                let featureArray = null;
                
                // Handle different response formats
                if (airspaceData.type === 'FeatureCollection' && Array.isArray(airspaceData.features)) {
                    featureArray = airspaceData.features;
                } else if (airspaceData.items && Array.isArray(airspaceData.items)) {
                    featureArray = airspaceData.items.map(item => this.convertOpenAIPItemToGeoJSON(item));
                } else if (Array.isArray(airspaceData)) {
                    featureArray = airspaceData;
                } else if (Array.isArray(airspaceData.features)) {
                    featureArray = airspaceData.features;
                }
                
                if (featureArray) {
                    const features = [];
                    
                    featureArray.forEach(feature => {
                        // Ensure properties exist
                        if (!feature.properties) {
                            feature.properties = {};
                        }
                        
                        const props = feature.properties;
                        
                        // Normalize properties (same as regular airspace)
                        if (props.icaoClass !== undefined && props.icaoClassNumeric === undefined) {
                            const icaoClassMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'Unclassified': 8 };
                            if (typeof props.icaoClass === 'string') {
                                props.icaoClassNumeric = icaoClassMap[props.icaoClass] !== undefined ? icaoClassMap[props.icaoClass] : null;
                            }
                        }
                        
                        // Ensure altitude limits are in feet
                        if (props.lowerLimit && props.lowerLimitFt === undefined) {
                            if (props.lowerLimitUnit === 'M') {
                                props.lowerLimitFt = props.lowerLimit * 3.28084;
                            } else if (props.lowerLimitUnit === 'FL') {
                                props.lowerLimitFt = props.lowerLimit * 100;
                            } else if (props.lowerLimitUnit === 'FT' || props.lowerLimitUnit === undefined) {
                                props.lowerLimitFt = props.lowerLimit;
                            }
                        }
                        
                        if (props.upperLimit && props.upperLimitFt === undefined) {
                            if (props.upperLimitUnit === 'M') {
                                props.upperLimitFt = props.upperLimit * 3.28084;
                            } else if (props.upperLimitUnit === 'FL') {
                                props.upperLimitFt = props.upperLimit * 100;
                            } else if (props.upperLimitUnit === 'FT' || props.upperLimitUnit === undefined) {
                                props.upperLimitFt = props.upperLimit;
                            }
                        }
                        
                        // Apply drone airspace filter
                        if (this.filterDroneAirspace(feature)) {
                            features.push(feature);
                        }
                    });
                    
                    // Deduplicate by stable ID
                    const uniqueFeatures = [];
                    features.forEach(feature => {
                        const id = feature.id || this.generateStableId(feature);
                        if (!this.droneAirspaceFeatureIds.has(id)) {
                            this.droneAirspaceFeatureIds.add(id);
                            uniqueFeatures.push(feature);
                        }
                    });
                    
                    // Add features to layer
                    if (uniqueFeatures.length > 0) {
                        setTimeout(() => {
                            this.droneAirspaceLayer.addData({
                                type: 'FeatureCollection',
                                features: uniqueFeatures
                            });
                        }, 0);
                    }
                    
                    // Cache the bbox
                    this.droneAirspaceCache.set(bbox, true);
                    
                    console.log(`=== Drone Airspace Load Summary ===`);
                    console.log(`Features fetched: ${featureArray.length}`);
                    console.log(`Drone airspace features rendered: ${uniqueFeatures.length}`);
                }
            }
        } catch (error) {
            console.error('Error loading drone airspace data:', error);
        }
    }

    getOpenAIPProxyUrl() {
        // Always use localhost:8081 proxy (as per requirements)
        return 'http://localhost:8081';
    }

    // ===== Airports/Heliports Layer Methods =====
    
    toggleAirports(enabled) {
        this.isAirportsEnabled = enabled;
        
        if (enabled) {
            // Add cluster layer to map if not already added
            if (!this.map.hasLayer(this.airportsMarkerCluster)) {
                this.airportsMarkerCluster.addTo(this.map);
            }
            
            // Load airport data for current view
            this.loadAirportsDataDebounced();
        } else {
            // Remove cluster layer from map
            if (this.map.hasLayer(this.airportsMarkerCluster)) {
                this.map.removeLayer(this.airportsMarkerCluster);
                this.airportsMarkerCluster.clearLayers();
            }
            // Clear cache
            this.airportsCache.clear();
            this.airportsFeatureIds.clear();
        }
    }

    loadAirportsDataDebounced() {
        // Clear existing timer
        if (this.airportsDebounceTimer) {
            clearTimeout(this.airportsDebounceTimer);
        }

        // Set new timer (300ms debounce)
        this.airportsDebounceTimer = setTimeout(() => {
            this.loadAirportsData();
        }, 300);
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
            } else if (typeCode === 0 || typeCode === 2 || typeCode === 5) {
                // Airport, Airfield Civil, Military Aerodrome
                size = 'medium';
            } else if (typeCode === 11 || typeCode === 13) {
                // Landing Strip, Altiport
                size = 'small';
            }
            // Heliports and Water Aerodromes default to medium
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
        let iconSymbol = '✈'; // Default airport icon (U+2708 AIRPLANE)
        
        if (typeCode === 7 || typeCode === 4) {
            // Heliport Civil or Military
            iconSymbol = '🚁'; // Helicopter (U+1F681, single Unicode character)
        } else if (typeCode === 10) {
            // Water Aerodrome
            iconSymbol = '⚓'; // Anchor (U+2693, single Unicode character)
        } else {
            // Airport, Airfield, Landing Strip, Altiport, etc.
            iconSymbol = '✈'; // Airplane (U+2708, single Unicode character)
        }
        
        // Create colored icon using DivIcon (could be replaced with SVG icons)
        return L.divIcon({
            className: 'airport-icon',
            html: `<div style="
                width: ${width}px;
                height: ${height}px;
                background-color: #0066cc;
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
        if (!this.isAirportsEnabled || !this.map) return;

        const bounds = this.map.getBounds();
        const rawBbox = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };
        const normalized = this.normalizeBbox(
            rawBbox.west,
            rawBbox.south,
            rawBbox.east,
            rawBbox.north
        );
        const bbox = `${normalized.west},${normalized.south},${normalized.east},${normalized.north}`;
        
        // Check cache
        if (this.airportsCache.has(bbox)) {
            return;
        }

        const proxyBase = this.getOpenAIPProxyUrl();
        const airportUrl = `${proxyBase}/openaip/airports?bbox=${bbox}`;

        try {
            const airportResponse = await fetch(airportUrl).catch(err => {
                console.error('Proxy unreachable for airports:', err);
                return null;
            });

            if (!airportResponse || !airportResponse.ok) {
                console.warn('Airport proxy error:', airportResponse?.status);
                return;
            }

            let airportData;
            try {
                airportData = await airportResponse.json();
            } catch (jsonError) {
                console.error('Failed to parse airport JSON:', jsonError);
                return;
            }

            let featureArray = null;
            let fetchedCount = 0;
            
            // Handle different response formats
            if (airportData.type === 'FeatureCollection' && Array.isArray(airportData.features)) {
                featureArray = airportData.features;
                fetchedCount = featureArray.length;
            } else if (airportData.items && Array.isArray(airportData.items)) {
                featureArray = airportData.items.map(item => this.convertOpenAIPAirportToGeoJSON(item));
                fetchedCount = airportData.items.length;
            }

            if (!featureArray || featureArray.length === 0) {
                console.log('No airport features found');
                return;
            }

            // Deduplicate by _id
            const uniqueAirports = [];
            const dedupedIds = new Set();
            
            featureArray.forEach(airport => {
                const id = airport.properties?._id || airport.id || airport.properties?.id;
                if (id && !dedupedIds.has(id) && !this.airportsFeatureIds.has(id)) {
                    dedupedIds.add(id);
                    this.airportsFeatureIds.add(id);
                    uniqueAirports.push(airport);
                }
            });

            // Create markers for each airport
            const markers = [];
            let sampleAirport = null;

            uniqueAirports.forEach(airport => {
                if (airport.geometry && airport.geometry.type === 'Point') {
                    const props = airport.properties || {};
                    const coords = airport.geometry.coordinates;
                    const latlng = [coords[1], coords[0]];

                    // Create icon based on type and size
                    const typeCode = props.typeCode || props.type;
                    const icon = this.createAirportIcon(typeCode, null, props.runways);
                    
                    // Create marker
                    const marker = L.marker(latlng, { icon: icon });
                    
                    // Store properties for multi-hit popup system
                    // Note: Not binding popup here - using multi-hit popup system instead
                    
                    // Store properties in marker for reference
                    marker.airportProperties = props;
                    
                    markers.push(marker);
                    
                    // Capture first airport as sample
                    if (!sampleAirport) {
                        sampleAirport = props;
                    }
                }
            });

            // Add markers to cluster group
            if (markers.length > 0) {
                this.airportsMarkerCluster.addLayers(markers);
            }

            // Cache the bbox
            this.airportsCache.set(bbox, true);

            // Diagnostics
            console.log(`=== Airports Load Summary ===`);
            console.log(`Airports fetched: ${fetchedCount}`);
            console.log(`Airports deduplicated: ${uniqueAirports.length}`);
            console.log(`Airports rendered: ${markers.length}`);
            if (sampleAirport) {
                // Create SkyVector URL for sample airport (for debugging)
                let sampleSkyVectorUrl = null;
                if (sampleAirport.icaoCode || sampleAirport.icao || sampleAirport.code) {
                    const icao = sampleAirport.icaoCode || sampleAirport.icao || sampleAirport.code;
                    let url = `https://skyvector.com/airport/${icao}`;
                    if (sampleAirport.name && sampleAirport.name !== 'Unknown') {
                        const nameSlug = sampleAirport.name
                            .trim()
                            .replace(/[^\w\s-]/g, '')
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-')
                            .replace(/^-+|-+$/g, '');
                        if (nameSlug) {
                            url = `https://skyvector.com/airport/${icao}/${nameSlug}`;
                        }
                    }
                    sampleSkyVectorUrl = url;
                }
                
                console.log('Sample airport properties:', {
                    name: sampleAirport.name,
                    icaoCode: sampleAirport.icaoCode || sampleAirport.icao || sampleAirport.code,
                    iataCode: sampleAirport.iata,
                    skyVectorUrl: sampleSkyVectorUrl,
                    elevation: sampleAirport.elevation,
                    frequencies: sampleAirport.radioFrequencies,
                    runways: sampleAirport.runways,
                    type: sampleAirport.typeCode
                });
            }
        } catch (error) {
            console.error('Error loading airport data:', error);
        }
    }

    createAirportPopup(props) {
        const name = props.name || 'Unknown';
        const icaoCode = props.icaoCode || props.icao || props.code || null;
        const iataCode = props.iata || null;
        const typeCode = props.typeCode || props.type;
        const country = props.country || null;
        
        // Format elevation
        let elevation = 'N/A';
        if (props.elevation) {
            if (typeof props.elevation === 'object') {
                const elevValue = props.elevation.value || props.elevation;
                const elevUnit = props.elevation.unit === 0 ? 'M' : 'FT';
                elevation = `${elevValue} ${elevUnit}`;
            } else {
                elevation = `${props.elevation} FT`; // Assume feet if just a number
            }
        }
        
        // Get airport type category
        const typeCategory = this.getAirportTypeCategory(typeCode);
        
        // Extract all frequencies
        let frequencies = [];
        if (props.radioFrequencies && Array.isArray(props.radioFrequencies)) {
            frequencies = props.radioFrequencies.map(freq => {
                const f = freq.frequency || freq.value;
                const unit = freq.unit || 'MHz';
                return f ? `${f} ${unit}` : null;
            }).filter(f => f !== null);
        }
        
        // Extract runway information
        let runways = [];
        if (props.runways && Array.isArray(props.runways)) {
            runways = props.runways.map(rwy => {
                const length = rwy.length;
                const designator = rwy.designator || rwy.designator1 || null;
                if (length && length.value) {
                    const lengthValue = length.value;
                    const lengthUnit = length.unit === 0 ? 'M' : 'FT';
                    return {
                        designator: designator,
                        length: `${lengthValue} ${lengthUnit}`
                    };
                }
                return null;
            }).filter(r => r !== null);
        }
        
        // Traffic type (VFR/IFR)
        const trafficType = props.trafficType || props.traffic || null;

        let popupContent = `
            <div style="font-family: Arial, sans-serif; min-width: 200px;">
                <div style="font-size: 12px; line-height: 1.6;">
        `;
        
        // SkyVector link FIRST (if ICAO code exists)
        if (icaoCode) {
            // Create airport name slug matching SkyVector format
            // Examples: 
            // "Vancouver International Airport" -> "Vancouver-International-Airport"
            // "Victoria International Airport" -> "Victoria-International-Airport"
            let skyVectorUrl = `https://skyvector.com/airport/${icaoCode}`;
            
            if (name && name !== 'Unknown') {
                // Create URL-friendly slug from airport name
                // Preserve capitalization like SkyVector does
                const nameSlug = name
                    .trim()
                    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens and spaces
                    .replace(/\s+/g, '-') // Replace spaces with hyphens
                    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
                    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
                
                if (nameSlug) {
                    // Format: https://skyvector.com/airport/{ICAO}/{Name-Slug}
                    skyVectorUrl = `https://skyvector.com/airport/${icaoCode}/${nameSlug}`;
                }
            }
            
            // Create clickable SkyVector link with proper styling
            // Ensure it's clickable and opens in new tab
            popupContent += `
                <div style="margin-bottom: 12px;">
                    <a href="${skyVectorUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       onclick="window.open('${skyVectorUrl}', '_blank'); return false;"
                       style="font-size: 14px; font-weight: bold; color: #0066cc; text-decoration: underline; cursor: pointer; display: inline-block; pointer-events: auto;">
                        View on SkyVector
                    </a>
                </div>
            `;
        }
        
        // Airport name
        popupContent += `<div style="margin-bottom: 8px;"><strong style="font-size: 14px;">${name}</strong></div>`;
        
        // Type
        popupContent += `<div><strong>Type:</strong> ${typeCategory}</div>`;
        
        // ICAO and IATA codes
        if (icaoCode) {
            popupContent += `<div><strong>ICAO:</strong> ${icaoCode}</div>`;
        }
        if (iataCode) {
            popupContent += `<div><strong>IATA:</strong> ${iataCode}</div>`;
        }
        
        // Country
        if (country) {
            popupContent += `<div><strong>Country:</strong> ${country}</div>`;
        }
        
        // Elevation
        popupContent += `<div><strong>Elevation:</strong> ${elevation}</div>`;
        
        // Frequencies
        if (frequencies.length > 0) {
            if (frequencies.length === 1) {
                popupContent += `<div><strong>Frequency:</strong> ${frequencies[0]}</div>`;
            } else {
                popupContent += `<div><strong>Frequencies:</strong> ${frequencies.join(', ')}</div>`;
            }
        }
        
        // Runways
        if (runways.length > 0) {
            const runwayInfo = runways.map(rwy => {
                const desig = rwy.designator ? `${rwy.designator}: ` : '';
                return `${desig}${rwy.length}`;
            }).join(', ');
            popupContent += `<div><strong>Runway(s):</strong> ${runwayInfo}</div>`;
        }
        
        // Traffic type
        if (trafficType) {
            popupContent += `<div><strong>Traffic:</strong> ${trafficType}</div>`;
        }
        
        // Fallback radius note (if applicable)
        if (props.isFallback && props.fallbackRadiusNM !== undefined) {
            popupContent += `<div style="margin-top: 8px; font-style: italic; color: #666; font-size: 11px;">Default radius ${props.fallbackRadiusNM} NM used.</div>`;
        }

        popupContent += `</div></div>`;
        return popupContent;
    }

    convertOpenAIPAirportToGeoJSON(item) {
        // Convert OpenAIP airport to GeoJSON Point feature
        // Airports might have different structure than airspaces
        const icaoCode = item.icao || item.ident || item.code || null;
        const props = {
            name: item.name || 'Unknown',
            icaoCode: icaoCode, // Set icaoCode field as specified
            icao: icaoCode, // Also keep icao for backwards compatibility
            code: icaoCode, // Also keep code for backwards compatibility
            iata: item.iata || null,
            id: item._id || item.id,
            country: item.country || null,
            type: 'AIRPORT',
            typeCode: item.type, // Store airport type code
            elevation: item.elevation || null,
            radioFrequencies: item.radioFrequencies || item.frequencies || null,
            runways: item.runways || null,
            trafficType: item.trafficType || item.traffic || null, // VFR/IFR
            notes: item.notes || null
        };
        
        // Airport geometry might be a Point or we need to construct it
        let geometry = item.geometry;
        if (!geometry && item.latitude && item.longitude) {
            geometry = {
                type: 'Point',
                coordinates: [item.longitude, item.latitude]
            };
        }
        
        return {
            type: 'Feature',
            id: item._id || item.id,
            geometry: geometry,
            properties: props
        };
    }

    convertOpenAIPItemToGeoJSON(item) {
        // Convert OpenAIP API item format to GeoJSON Feature
        // OpenAIP format: { _id, name, type (numeric), icaoClass (numeric), geometry, upperLimit/lowerLimit (objects) }
        // GeoJSON format: { type: "Feature", id, geometry, properties: {...} }
        
        const props = {};
        
        // Map basic properties
        props.name = item.name || 'Unknown';
        props.id = item._id || item.id;
        
        // Convert numeric type to string (OpenAIP uses numeric codes)
        // Map OpenAIP type codes to labels (include at least: 1,2,3,4,5,6,7,13,20,26,36)
        const typeMap = {
            0: 'AWY',   // Airway
            1: 'TYPE_1',
            2: 'TYPE_2',
            3: 'TYPE_3',
            4: 'CTR',   // Control Zone
            5: 'TYPE_5',
            6: 'TYPE_6',
            7: 'TYPE_7',
            13: 'ATZ',  // Aerodrome Traffic Zone
            20: 'HTZ',  // Heliport Traffic Zone
            26: 'TYPE_26',
            36: 'TYPE_36'
        };
        if (item.type !== undefined) {
            props.type = typeMap[item.type] || `TYPE_${item.type}`;
            props.typeCode = item.type; // Keep original numeric for filtering
        }
        
        // Convert numeric ICAO class to letter (0=A, 1=B, 2=C, 3=D, 4=E, 5=F, 6=G, 8=Unclassified)
        if (item.icaoClass !== undefined) {
            const icaoClasses = ['A', 'B', 'C', 'D', 'E', 'F', 'G', null, 'Unclassified'];
            props.icaoClass = icaoClasses[item.icaoClass] || null;
            props.icaoClassNumeric = item.icaoClass; // Keep numeric for filtering
        }
        
        // Convert altitude limits
        // OpenAIP format: { value: number, unit: number (0=M, 1=FT, 2=FL), referenceDatum: number }
        // unit: 0 = meters, 1 = feet, 2 = flight level
        // referenceDatum: 0 = ground/surface, 1 = MSL
        // Normalize to feet: meters × 3.28084, FL × 100, ground/surface = 0 ft
        if (item.upperLimit) {
            props.upperLimitRaw = item.upperLimit.value;
            props.upperLimitReferenceDatum = item.upperLimit.referenceDatum; // 0 = GND, 1 = MSL
            let upperLimitFt = item.upperLimit.value;
            
            if (item.upperLimit.unit === 0) {
                // Meters to feet
                props.upperLimitUnit = 'M';
                upperLimitFt = item.upperLimit.value * 3.28084;
            } else if (item.upperLimit.unit === 1) {
                props.upperLimitUnit = 'FT';
                upperLimitFt = item.upperLimit.value;
            } else if (item.upperLimit.unit === 2) {
                // Flight level to feet
                props.upperLimitUnit = 'FL';
                upperLimitFt = item.upperLimit.value * 100;
            }
            
            props.upperLimit = upperLimitFt;
            props.upperLimitFt = upperLimitFt; // Store in feet for filtering
        } else {
            // Missing upper limit = Infinity
            props.upperLimit = Infinity;
            props.upperLimitFt = Infinity;
            props.upperLimitUnit = null;
        }
        
        if (item.lowerLimit) {
            props.lowerLimitRaw = item.lowerLimit.value;
            props.lowerLimitReferenceDatum = item.lowerLimit.referenceDatum; // 0 = GND, 1 = MSL
            let lowerLimitFt = item.lowerLimit.value;
            
            if (item.lowerLimit.unit === 0) {
                // Meters to feet
                props.lowerLimitUnit = 'M';
                lowerLimitFt = item.lowerLimit.value * 3.28084;
            } else if (item.lowerLimit.unit === 1) {
                props.lowerLimitUnit = 'FT';
                lowerLimitFt = item.lowerLimit.value;
            } else if (item.lowerLimit.unit === 2) {
                // Flight level to feet
                props.lowerLimitUnit = 'FL';
                lowerLimitFt = item.lowerLimit.value * 100;
            }
            
            // Ground/surface = 0 feet (regardless of value if referenceDatum is ground/surface)
            if (item.lowerLimit.referenceDatum === 0) {
                lowerLimitFt = 0;
            }
            
            props.lowerLimit = lowerLimitFt;
            props.lowerLimitFt = lowerLimitFt; // Store in feet for filtering
        } else {
            // Missing lower limit = 0 feet
            props.lowerLimit = 0;
            props.lowerLimitFt = 0;
            props.lowerLimitUnit = null;
        }
        
        // Also handle upper limit ground/surface
        if (item.upperLimit && item.upperLimit.referenceDatum === 0) {
            props.upperLimitFt = 0;
            props.upperLimit = 0;
        }
        
        // Extract airport code / identifier (might be in different fields)
        props.code = item.icao || item.ident || item.code || item.identifier || null;
        
        // Extract frequency (might be in radioFrequencies array or similar)
        if (item.radioFrequencies && Array.isArray(item.radioFrequencies) && item.radioFrequencies.length > 0) {
            // Take the first frequency
            const freq = item.radioFrequencies[0];
            props.frequency = freq.frequency || freq.value || null;
            props.frequencyUnit = freq.unit || 'MHz';
        } else if (item.frequency) {
            props.frequency = item.frequency;
        }
        
        // Copy other properties that might be useful
        props.country = item.country;
        props.elevation = item.elevation;
        
        // Log raw item for debugging if it's an airport-type feature
        if (item.name && (item.name.includes('VANCOUVER') || props.code)) {
            console.log('Airport item data:', item);
        }
        
        return {
            type: 'Feature',
            id: item._id || item.id,
            geometry: item.geometry || null,
            properties: props
        };
    }

    normalizeBbox(west, south, east, north) {
        // Normalize longitude to -180 to 180 range
        const normalizeLon = (lon) => {
            lon = lon % 360;
            if (lon > 180) lon -= 360;
            if (lon < -180) lon += 360;
            return lon;
        };
        
        let w = normalizeLon(west);
        let e = normalizeLon(east);
        let s = Math.max(-90, Math.min(90, south)); // Clamp latitude to -90..90
        let n = Math.max(-90, Math.min(90, north));
        
        // If west > east, we're crossing the date line
        // For now, we'll clamp to a reasonable range
        // If the bounding box is too large (covers most of the world), use a default
        const lonRange = e - w;
        if (lonRange > 350 || w > e) {
            // Bounding box is too large or crosses date line - use current map center with reasonable range
            const center = this.map.getCenter();
            w = Math.max(-180, center.lng - 10);
            e = Math.min(180, center.lng + 10);
            s = Math.max(-90, center.lat - 10);
            n = Math.min(90, center.lat + 10);
        }
        
        return { west: w, south: s, east: e, north: n };
    }

    async loadAirspaceData() {
        if (!this.isAirspaceEnabled || !this.map) return;

        const bounds = this.map.getBounds();
        const rawBbox = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };
        const normalized = this.normalizeBbox(
            rawBbox.west,
            rawBbox.south,
            rawBbox.east,
            rawBbox.north
        );
        const bbox = `${normalized.west},${normalized.south},${normalized.east},${normalized.north}`;
        
        console.log('Bbox normalization:', {
            raw: rawBbox,
            normalized: normalized,
            bboxString: bbox
        });
        
        // Check cache
        if (this.airspaceCache.has(bbox)) {
            return;
        }
        
        // Show loading indicator
        this.airspaceLoading = true;
        this.showAirspaceLoadingMessage();

        const proxyBase = this.getOpenAIPProxyUrl();
        // Request GeoJSON format for airspaces
        const airspaceUrl = `${proxyBase}/openaip/airspaces?bbox=${bbox}&format=geojson`;
        const airportUrl = `${proxyBase}/openaip/airports?bbox=${bbox}`;

        console.log('Fetching airspace data from:', airspaceUrl);
        console.log('Fetching airport data from:', airportUrl);

        try {
            const [airspaceResponse, airportResponse] = await Promise.all([
                fetch(airspaceUrl).catch(err => {
                    console.error('Proxy fetch error for airspace:', err);
                    return null;
                }),
                fetch(airportUrl).catch(err => {
                    console.error('Proxy fetch error for airports:', err);
                    return null;
                })
            ]);

            // Check if proxy is unreachable - only show error if airspace layer is enabled
            // and we got no response (network error, not just HTTP error)
            if (this.isAirspaceEnabled) {
                if (!airspaceResponse && !airportResponse) {
                    // Both failed - proxy is likely unreachable
                    this.airspaceProxyError = true;
                    this.showProxyErrorMessage();
                    return;
                } else if (airspaceResponse) {
                    // Got a response (even if HTTP error) - proxy is reachable
                    this.airspaceProxyError = false;
                    this.hideProxyErrorMessage();
                } else if (!airspaceResponse && airportResponse) {
                    // Airport worked but airspace didn't - proxy might be partially working
                    // Show error since airspace is what we need
                    this.airspaceProxyError = true;
                    this.showProxyErrorMessage();
                    return;
                }
            }

            // Check for HTTP errors
            if (airspaceResponse && !airspaceResponse.ok) {
                console.warn(`Airspace proxy error: ${airspaceResponse.status}`);
                // Don't set error for HTTP errors (4xx/5xx) - proxy is reachable, just had an issue
                // Only show error if it's a connection failure
                return;
            }
            if (airportResponse && !airportResponse.ok) {
                console.warn(`Airport proxy error: ${airportResponse.status}`);
            }

            const features = [];
            let dataLoadedSuccessfully = false;

            // Process airspace data
            if (airspaceResponse && airspaceResponse.ok) {
                let airspaceData;
                try {
                    airspaceData = await airspaceResponse.json();
                } catch (jsonError) {
                    const text = await airspaceResponse.text();
                    console.error('Failed to parse airspace JSON:', jsonError);
                    console.error('Response text:', text.substring(0, 500));
                    airspaceData = null;
                }
                
                if (airspaceData) {
                    console.log('Airspace data received:', {
                        type: airspaceData.type,
                        featureCount: airspaceData.features ? airspaceData.features.length : 0,
                        hasFeatures: !!airspaceData.features,
                        keys: Object.keys(airspaceData),
                        fullData: airspaceData, // Log full response to see structure
                        sampleFeature: airspaceData.features && airspaceData.features.length > 0 ? airspaceData.features[0] : null
                    });
                    
                    // Handle different response formats
                    // Prioritize GeoJSON FeatureCollection (if OpenAIP supports format=geojson)
                    let featureArray = null;
                    
                    // Standard GeoJSON FeatureCollection (preferred format)
                    if (airspaceData.type === 'FeatureCollection' && Array.isArray(airspaceData.features)) {
                        featureArray = airspaceData.features;
                        console.log(`Using GeoJSON FeatureCollection format (${featureArray.length} features)`);
                    }
                    // OpenAIP paginated format: { items: [...], totalCount: ... }
                    // Fallback for when format=geojson is not supported
                    else if (airspaceData.items && Array.isArray(airspaceData.items)) {
                        // Convert OpenAIP format to GeoJSON Features
                        featureArray = airspaceData.items.map(item => this.convertOpenAIPItemToGeoJSON(item));
                        console.log(`Converted ${featureArray.length} OpenAIP items to GeoJSON features`);
                    }
                    // If it's an array directly
                    else if (Array.isArray(airspaceData)) {
                        featureArray = airspaceData;
                    }
                    // If features array exists but no type
                    else if (Array.isArray(airspaceData.features)) {
                        featureArray = airspaceData.features;
                    }
                    // Check for data property that might contain features
                    else if (airspaceData.data && Array.isArray(airspaceData.data)) {
                        featureArray = airspaceData.data;
                    }
                    // Check for airspaces property
                    else if (airspaceData.airspaces && Array.isArray(airspaceData.airspaces)) {
                        featureArray = airspaceData.airspaces;
                    }
                    
                    if (featureArray) {
                        let beforeFilterCount = featureArray.length;
                        let afterFilterCount = 0;
                        
                        // Track diagnostic features
                        let firstCTR = null;
                        let firstATZ = null;
                        let firstClassF = null;
                        
                        // Filter and process airspaces - use actual geometry (don't replace with circles)
                        featureArray.forEach(feature => {
                            // Ensure properties exist and have correct structure
                            if (!feature.properties) {
                                feature.properties = {};
                            }
                            
                            // If feature comes from GeoJSON (not converted from OpenAIP), we need to ensure
                            // it has the properties we need for filtering
                            const props = feature.properties;
                            
                            // Check if we need to convert OpenAIP format properties
                            // GeoJSON from OpenAIP API might have different property names
                            if (props.icaoClass !== undefined && props.icaoClassNumeric === undefined) {
                                // Convert ICAO class letter to numeric if needed
                                const icaoClassMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'Unclassified': 8 };
                                if (typeof props.icaoClass === 'string') {
                                    props.icaoClassNumeric = icaoClassMap[props.icaoClass] !== undefined ? icaoClassMap[props.icaoClass] : null;
                                }
                            }
                            
                            // Ensure altitude limits are in feet for filtering
                            if (props.lowerLimit && props.lowerLimitFt === undefined) {
                                // Try to convert if unit info is available
                                if (props.lowerLimitUnit === 'M') {
                                    props.lowerLimitFt = props.lowerLimit * 3.28084;
                                } else if (props.lowerLimitUnit === 'FL') {
                                    props.lowerLimitFt = props.lowerLimit * 100;
                                } else if (props.lowerLimitUnit === 'FT' || props.lowerLimitUnit === undefined) {
                                    props.lowerLimitFt = props.lowerLimit;
                                }
                            }
                            
                            if (props.upperLimit && props.upperLimitFt === undefined) {
                                // Try to convert if unit info is available
                                if (props.upperLimitUnit === 'M') {
                                    props.upperLimitFt = props.upperLimit * 3.28084;
                                } else if (props.upperLimitUnit === 'FL') {
                                    props.upperLimitFt = props.upperLimit * 100;
                                } else if (props.upperLimitUnit === 'FT' || props.upperLimitUnit === undefined) {
                                    props.upperLimitFt = props.upperLimit;
                                }
                            }
                            
                            if (this.filterAirspace(feature)) {
                                // Capture diagnostics for first instances
                                if (!firstCTR && (props.typeCode === 4 || props.type === 'CTR')) {
                                    firstCTR = { properties: props };
                                }
                                if (!firstATZ && (props.typeCode === 13 || props.type === 'ATZ')) {
                                    firstATZ = { properties: props };
                                }
                                if (!firstClassF && props.icaoClassNumeric === 5) {
                                    firstClassF = { properties: props };
                                }
                                
                                features.push(feature); // Use actual geometry, don't convert to circle
                                afterFilterCount++;
                            }
                        });
                        
                        console.log(`Airspace filtering: ${beforeFilterCount} features before, ${afterFilterCount} after`);
                        
                        // Mark as successfully loaded if we got features (even if none passed filter)
                        if (beforeFilterCount > 0) {
                            dataLoadedSuccessfully = true;
                        }
                        
                        // Diagnostics logging
                        if (firstCTR) {
                            console.log('First CTR feature:', firstCTR);
                        }
                        if (firstATZ) {
                            console.log('First ATZ feature:', firstATZ);
                        }
                        if (firstClassF) {
                            console.log('First Class F feature:', firstClassF);
                        }
                    } else {
                        console.warn('Airspace data format unexpected - no features array found:', {
                            hasType: !!airspaceData.type,
                            type: airspaceData.type,
                            hasFeatures: !!airspaceData.features,
                            hasItems: !!airspaceData.items,
                            isArray: Array.isArray(airspaceData),
                            hasData: !!airspaceData.data,
                            hasAirspaces: !!airspaceData.airspaces,
                            allKeys: Object.keys(airspaceData)
                        });
                    }
                }
            } else {
                console.log('No airspace response or response not OK:', {
                    hasResponse: !!airspaceResponse,
                    ok: airspaceResponse?.ok,
                    status: airspaceResponse?.status,
                    statusText: airspaceResponse?.statusText
                });
            }

            // DEBUGGING MODE: Disabled airport processing
            // Not processing airport data for fallback circles
            
            // Deduplicate by stable ID
            const uniqueFeatures = [];
            features.forEach(feature => {
                const id = feature.id || this.generateStableId(feature);
                if (!this.airspaceFeatureIds.has(id)) {
                    this.airspaceFeatureIds.add(id);
                    uniqueFeatures.push(feature);
                }
            });
            
            // DEBUGGING MODE: Disabled fallback circle logic
            // Not creating airport circles - only showing actual airspace polygons

            // Add features to layer
            if (uniqueFeatures.length > 0) {
                // Use setTimeOut to ensure rendering happens asynchronously
                setTimeout(() => {
                    this.airspaceLayer.addData({
                        type: 'FeatureCollection',
                        features: uniqueFeatures
                    });
                    
                    // Hide loading indicator AFTER rendering is complete
                    this.airspaceLoading = false;
                    this.hideAirspaceLoadingMessage();
                }, 0);
            } else {
                // No features to render, hide loading immediately
                this.airspaceLoading = false;
                this.hideAirspaceLoadingMessage();
            }

            // Cache the bbox
            this.airspaceCache.set(bbox, true);
            
            // Clear error if we successfully loaded data
            if (dataLoadedSuccessfully || uniqueFeatures.length > 0) {
                this.airspaceProxyError = false;
                this.hideProxyErrorMessage();
            }
            
            // Calculate totals for logging
            const airspacesFetched = airspaceData ? 
                (airspaceData.items ? airspaceData.items.length : 
                 (airspaceData.features ? airspaceData.features.length : 0)) : 0;
            const airspacesRendered = uniqueFeatures.length;
            
            // DEBUGGING MODE: Comprehensive logging
            console.log(`=== Airspace Load Summary (DEBUG MODE - No Filtering) ===`);
            console.log(`Airspaces fetched: ${airspacesFetched}`);
            console.log(`Airspaces rendered: ${airspacesRendered}`);
            
            // Log first few feature objects for structure inspection
            console.log(`First ${Math.min(3, uniqueFeatures.length)} feature objects:`);
            uniqueFeatures.slice(0, 3).forEach((feature, idx) => {
                console.log(`Feature ${idx + 1}:`, {
                    id: feature.id,
                    geometry: {
                        type: feature.geometry?.type,
                        coordinatesCount: feature.geometry?.coordinates?.length || 0
                    },
                    properties: feature.properties
                });
            });
            
            // Count by ICAO class for visibility
            const classCounts = {};
            uniqueFeatures.forEach(f => {
                const icaoClass = f.properties?.icaoClassNumeric !== undefined ? 
                    f.properties.icaoClassNumeric : 
                    (f.properties?.icaoClass || 'unknown');
                classCounts[icaoClass] = (classCounts[icaoClass] || 0) + 1;
            });
            console.log('Airspaces by ICAO class:', classCounts);
        } catch (error) {
            console.error('Error loading airspace data:', error);
            
            // Hide loading indicator on error
            this.airspaceLoading = false;
            this.hideAirspaceLoadingMessage();
            
            // Only show error if it's a network/connection error, not parsing or other errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                // Network error - proxy is unreachable
                this.airspaceProxyError = true;
                this.showProxyErrorMessage();
            } else {
                // Other error (parsing, etc.) - don't show proxy error
                console.warn('Non-network error, not showing proxy error banner');
            }
        }
    }

    generateStableId(feature) {
        // Generate stable ID from geometry coordinates (rounded for stability)
        if (feature.geometry && feature.geometry.coordinates) {
            const coords = JSON.stringify(feature.geometry.coordinates)
                .replace(/(\d+\.\d{4})\d+/g, '$1'); // Round to 4 decimals
            return `${feature.geometry.type}-${coords}`;
        }
        return `feature-${Math.random()}`;
    }

    /**
     * Check if a point is inside a polygon using ray casting algorithm
     * @param {number} lon - Point longitude
     * @param {number} lat - Point latitude
     * @param {Object} geometry - GeoJSON geometry (Polygon or MultiPolygon)
     * @returns {boolean} True if point is inside polygon
     */
    isPointInPolygon(lon, lat, geometry) {
        if (!geometry || !geometry.coordinates) return false;
        
        if (geometry.type === 'Polygon') {
            // Polygon: coordinates is array of rings [[[lon, lat], ...]]
            const rings = geometry.coordinates;
            // First ring is outer boundary, others are holes
            const outerRing = rings[0];
            const isInsideOuter = this.pointInRing(lon, lat, outerRing);
            if (!isInsideOuter) return false;
            
            // Check if point is inside any hole (if so, it's outside the polygon)
            for (let i = 1; i < rings.length; i++) {
                if (this.pointInRing(lon, lat, rings[i])) {
                    return false; // Point is in a hole
                }
            }
            return true;
        } else if (geometry.type === 'MultiPolygon') {
            // MultiPolygon: coordinates is array of polygons [[[[lon, lat], ...]]]
            for (let poly of geometry.coordinates) {
                if (this.isPointInPolygon(lon, lat, {
                    type: 'Polygon',
                    coordinates: poly
                })) {
                    return true; // Point is in at least one polygon
                }
            }
            return false;
        }
        
        return false;
    }

    /**
     * Ray casting algorithm to check if point is inside a ring (polygon boundary)
     * @param {number} lon - Point longitude
     * @param {number} lat - Point latitude
     * @param {Array} ring - Array of [lon, lat] coordinate pairs
     * @returns {boolean} True if point is inside ring
     */
    pointInRing(lon, lat, ring) {
        if (!ring || ring.length < 3) return false;
        
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];
            
            const intersect = ((yi > lat) !== (yj > lat)) &&
                (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    filterDroneAirspace(feature) {
        // Filter for drone-relevant airspace:
        // - Class F airways (AWY) - like CYA102(M) example
        // - Class F airspace that goes from ground/surface
        const props = feature.properties || {};
        const icaoClassNumeric = props.icaoClassNumeric;
        const typeCode = props.typeCode;
        const type = (props.type || '').toUpperCase();
        
        // Must be ICAO Class F (numeric 5)
        if (icaoClassNumeric !== 5) {
            return false;
        }
        
        // Check if it's an airway (AWY, type code 0)
        // Or other Class F airspace types relevant to drones
        if (typeCode === 0 || type === 'AWY' || type.includes('AWY')) {
            return true;
        }
        
        // Also include other Class F airspace that starts at ground/surface
        const lowerLimitReferenceDatum = props.lowerLimitReferenceDatum;
        if (lowerLimitReferenceDatum === 0) { // Ground/Surface
            return true;
        }
        
        return false;
    }

    filterAirspace(feature) {
        // DEBUGGING MODE: Show all airspace, no filtering
        // Temporarily disabled all filtering to inspect all available data
        return true;
    }

    showProxyErrorMessage() {
        // Show error message overlay if not already shown
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
            max-width: 90%;
            text-align: center;
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
    
    showAirspaceLoadingMessage() {
        // Remove any existing loading message
        this.hideAirspaceLoadingMessage();
        
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'airspaceLoading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 70px;
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
            <span>Loading airspace data...</span>
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
        
        document.body.appendChild(loadingDiv);
    }
    
    hideAirspaceLoadingMessage() {
        const loadingDiv = document.getElementById('airspaceLoading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
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
        // Style for drone airspace layer - distinct color to differentiate
        const fillOpacity = 0.25;
        const color = '#9333ea'; // Purple/violet color for drone airspace
        
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
            isDroneAirspace: isDroneAirspace || false
        };
        
        // Apply highlight style (thicker border, brighter fill)
        if (leafletLayer && leafletLayer.setStyle) {
            const props = feature.properties || {};
            const baseColor = isDroneAirspace ? '#9333ea' : (props.icaoClassNumeric !== undefined ? 
                this.getAirspaceColor(props.icaoClassNumeric) : '#808080');
            
            leafletLayer.setStyle({
                weight: 8, // Much thicker border so it shows through layers
                opacity: 1.0,
                fillOpacity: 0.6, // More opaque fill for visibility
                color: '#00d9ff', // Bright turquoise/cyan highlight color
                fillColor: baseColor
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

    unhighlightAirspaceLayer() {
        if (this.highlightedAirspaceLayer) {
            const { layer, feature, isDroneAirspace } = this.highlightedAirspaceLayer;
            
            // Restore original style
            if (layer && layer.setStyle) {
                const style = isDroneAirspace ? 
                    this.getDroneAirspaceStyle(feature) : 
                    this.getAirspaceStyle(feature);
                layer.setStyle(style);
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
        let pressTimer = null;
        let isLongPress = false;
        
        this.map.on('mousedown', (e) => {
            // Start timer for long press (800ms)
            pressTimer = setTimeout(() => {
                isLongPress = true;
                this.createCoordinateMarker(e.latlng);
            }, 800);
        });
        
        this.map.on('mouseup', () => {
            // Clear timer if mouse is released before long press
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        
        this.map.on('mousemove', () => {
            // Clear timer if mouse moves during press
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        
        // Handle touch events for mobile
        this.map.on('touchstart', (e) => {
            const touch = e.originalEvent.touches[0];
            const latlng = this.map.containerPointToLatLng(this.map.mouseEventToContainerPoint(touch));
            
            pressTimer = setTimeout(() => {
                isLongPress = true;
                this.createCoordinateMarker(latlng);
            }, 800);
        });
        
        this.map.on('touchend', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
        
        this.map.on('touchmove', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
    }
    
    createCoordinateMarker(latlng) {
        // Remove any existing coordinate marker
        if (this.coordinateMarker) {
            this.map.removeLayer(this.coordinateMarker);
        }
        
        const lat = latlng.lat.toFixed(6);
        const lng = latlng.lng.toFixed(6);
        
        // Create a temporary marker
        this.coordinateMarker = L.marker(latlng, {
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
        
        // Create popup with coordinates
        const popup = L.popup({
            closeButton: true,
            autoClose: false,
            closeOnClick: false
        }).setLatLng(latlng).setContent(`
            <div style="text-align: center; min-width: 200px;">
                <strong>Coordinates</strong><br>
                <div style="font-family: monospace; margin: 8px 0;">
                    Lat: ${lat}<br>
                    Lng: ${lng}
                </div>
                <button onclick="navigator.clipboard.writeText('${lat}, ${lng}').then(() => window.droneMap.showCopyToast())" 
                        style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 8px;">
                    Copy Coordinates
                </button>
                <button onclick="window.droneMap.removeCoordinateMarker()" 
                        style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Remove Marker
                </button>
            </div>
        `);
        
        this.coordinateMarker.bindPopup(popup).openPopup();
    }
    
    removeCoordinateMarker() {
        if (this.coordinateMarker) {
            this.map.removeLayer(this.coordinateMarker);
            this.coordinateMarker = null;
            console.log('Coordinate marker removed');
        }
    }
    
    addNorthArrowControl() {
        // Create custom north arrow control
        const NorthArrowControl = L.Control.extend({
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'north-arrow-control');
                container.style.cssText = `
                    background: linear-gradient(135deg, #ffffff, #f8f9fa);
                    border: 2px solid #2c3e50;
                    border-radius: 4px;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    position: relative;
                    margin-bottom: 5px;
                    font-family: Arial, sans-serif;
                `;
                
                // Create the main arrow element (pointing up)
                const arrow = L.DomUtil.create('div', 'north-arrow', container);
                arrow.style.cssText = `
                    width: 0;
                    height: 0;
                    border-left: 5px solid transparent;
                    border-right: 5px solid transparent;
                    border-bottom: 12px solid #e74c3c;
                    transition: transform 0.3s ease;
                    transform-origin: center bottom;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                `;
                
                // Add "N" label below arrow
                const label = L.DomUtil.create('div', 'north-label', container);
                label.textContent = 'N';
                label.style.cssText = `
                    font-size: 8px;
                    font-weight: bold;
                    color: #2c3e50;
                    margin-top: 1px;
                    text-shadow: 0 1px 2px rgba(255,255,255,0.8);
                `;
                
                // Add mode indicator
                const modeIndicator = L.DomUtil.create('div', 'mode-indicator', container);
                modeIndicator.style.cssText = `
                position: absolute;
                    top: -4px;
                    right: -4px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    background: #27ae60;
                    border: 1px solid white;
                    font-size: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
                `;
                modeIndicator.textContent = 'N';
                
                // Add hover effects
                container.onmouseover = function(e) {
                    e.stopPropagation();
                    this.style.background = 'linear-gradient(135deg, #ffffff, #e8f4fd)';
                    this.style.transform = 'scale(1.05)';
                    this.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
                };
                container.onmouseout = function(e) {
                    e.stopPropagation();
                    this.style.background = 'linear-gradient(135deg, #ffffff, #f8f9fa)';
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                };
                
                // Add click handler only (no long-press)
                container.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.droneMap.resetToNorthUp();
                };
                
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
    
    addFullscreenControl() {
        // Create custom full screen control
        const FullscreenControl = L.Control.extend({
            onAdd: function(map) {
                const container = L.DomUtil.create('div', 'fullscreen-control');
                container.style.cssText = `
                    background-color: rgba(44, 44, 44, 0.6);
                border: 1px solid #444;
                border-radius: 4px;
                    width: 40px;
                    height: 40px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                    position: relative;
                    margin-bottom: 5px;
                    font-family: Arial, sans-serif;
                `;
                
                // Create the fullscreen icon
                const icon = L.DomUtil.create('div', 'fullscreen-icon', container);
                icon.style.cssText = `
                    width: 16px;
                    height: 16px;
                    position: relative;
                `;
                
                // Create expand icon (default state)
                const expandIcon = L.DomUtil.create('div', 'expand-icon', icon);
                expandIcon.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>') no-repeat center;
                    background-size: contain;
                    opacity: 1;
                    transition: opacity 0.3s ease;
                `;
                
                // Create close icon (fullscreen state)
                const closeIcon = L.DomUtil.create('div', 'close-icon', icon);
                closeIcon.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>') no-repeat center;
                    background-size: contain;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                `;
                
                // Add hover effects
                container.onmouseover = function() {
                    this.style.backgroundColor = 'rgba(60, 60, 60, 0.7)';
                    this.style.transform = 'scale(1.05)';
                    this.style.boxShadow = '0 3px 8px rgba(0,0,0,0.4)';
                };
                container.onmouseout = function() {
                    this.style.backgroundColor = 'rgba(44, 44, 44, 0.6)';
                    this.style.transform = 'scale(1)';
                    this.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
                };
                
                // Add click handler
                container.onclick = function() {
                    window.droneMap.toggleFullscreen();
                };
                
                // Store references for icon switching
                container.expandIcon = expandIcon;
                container.closeIcon = closeIcon;
                
                return container;
            },
            
            onRemove: function(map) {
                // Cleanup if needed
            }
        });
        
        this.fullscreenControl = new FullscreenControl({ position: 'bottomright' });
        this.fullscreenControl.addTo(this.map);
        
        console.log('Fullscreen control added:', this.fullscreenControl);
    }
    
    resetToNorthUp() {
        // Reset map rotation to north-up
        this.applyMapRotation();
        console.log('Reset map to north-up');
    }
    
    updateNorthArrowRotation() {
        console.log('updateNorthArrowRotation called, northArrowControl:', this.northArrowControl);
        if (!this.northArrowControl) return;
        
        const container = this.northArrowControl.getContainer();
        console.log('North arrow container:', container);
        const arrow = container.querySelector('.north-arrow');
        const modeIndicator = container.querySelector('.mode-indicator');
        
        console.log('Arrow element:', arrow, 'Mode indicator:', modeIndicator);
        
        if (!arrow || !modeIndicator) return;
        
        // Always set to north-oriented mode
        arrow.style.transform = 'rotate(0deg)';
        modeIndicator.textContent = 'N';
        modeIndicator.style.background = '#27ae60';
        container.classList.remove('user-facing');
        container.classList.add('north-oriented');
        container.title = 'North-oriented mode (click to reset to north-up)';
        console.log('Set to north-oriented mode');
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
        if (!this.fullscreenControl) return;
        
        const container = this.fullscreenControl.getContainer();
        const expandIcon = container.expandIcon;
        const closeIcon = container.closeIcon;
        
        if (this.isFullscreen) {
            // Show close icon, hide expand icon
            expandIcon.style.opacity = '0';
            closeIcon.style.opacity = '1';
            container.title = 'Exit fullscreen mode';
        } else {
            // Show expand icon, hide close icon
            expandIcon.style.opacity = '1';
            closeIcon.style.opacity = '0';
            container.title = 'Enter fullscreen mode';
        }
    }
    
    
    applyMapRotation() {
        const mapContainer = this.map.getContainer();
        const tileContainer = mapContainer.querySelector('.leaflet-tile-container');
        
        if (tileContainer) {
            // Always stay north-up (no rotation)
            tileContainer.style.transform = `rotate(0deg)`;
        }
    }
    
    updateMapRotation() {
        this.applyMapRotation();
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

        const { latitude, longitude, altitude_ahl, altitude_asl, bearing, pitch, roll } = location;
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
                <strong>🔋 Battery:</strong> ${batteryText}${livestreamButton}
            </div>
        `;
    }

    updateTrail(coordinateHistory) {
        if (!this.trailPolyline) return;

        this.trailCoordinates = coordinateHistory.map(coord => [coord.latitude, coord.longitude]);
        this.trailPolyline.setLatLngs(this.trailCoordinates);
    }

    updateGeojson(geojsonData) {
        if (!this.geojsonLayer) return;

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

        this.geojsonLayer.clearLayers();

        // Configure styling and popups for GeoJSON features
        this.geojsonLayer = L.geoJSON(parsedData, {
            style: (feature) => {
                const style = this.getFeatureStyle(feature);
                // Ensure polygon/line features use the polygonPane
                style.pane = 'polygonPane';
                return style;
            },
            pointToLayer: (feature, latlng) => this.createStyledMarker(feature, latlng),
            onEachFeature: (feature, layer) => this.configureFeaturePopup(feature, layer)
        }).addTo(this.map);
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

        this.currentLocation = null;
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
        this.staleDataOverlay.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(220, 53, 69, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        this.staleDataOverlay.innerHTML = `
            <i class="bi bi-exclamation-triangle"></i>
            <span>Location data not updating</span>
        `;
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(this.staleDataOverlay);
    }

    hideStaleDataOverlay() {
        if (this.staleDataOverlay) {
            this.staleDataOverlay.remove();
            this.staleDataOverlay = null;
        }
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
            this.stopLocationTracking();
        } else {
            this.startLocationTracking();
        }
    }

    startLocationTracking() {
        console.log('Starting location tracking...');
        
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by this browser.');
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
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(this.map);
        }

        // Center map on user location if it's the first time
        if (isFirstTime) {
            this.map.setView([lat, lng], 15);
        }
    }

    onLocationError(error) {
        console.error('Location error:', error);
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
        // Google Maps style location marker (simple blue dot, no orientation indicator)
        return `
            <div class="google-maps-location-marker" style="
                position: relative;
                width: 24px;
                height: 24px;
            ">
                <!-- White outer ring (shadow effect) -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 24px;
                    height: 24px;
                    background-color: white;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                "></div>
                <!-- Blue center dot -->
                <div style="
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 20px;
                    height: 20px;
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
                button.style.backgroundColor = '#ffc107';
                button.style.borderColor = '#ffc107';
                button.style.color = '#000';
            } else {
                button.innerHTML = '<i class="bi bi-geo-alt"></i> Show My Location';
                button.style.backgroundColor = '#314268';
                button.style.borderColor = '#314268';
                button.style.color = 'white';
            }
        }
    }

    // Multi-hit popup methods
    handleMapClick(e) {
        // Don't handle clicks on popups or controls
        const target = e.originalEvent?.target;
        if (target && (
            target.closest('.leaflet-popup') ||
            target.closest('.leaflet-control') ||
            target.closest('.multi-hit-popup')
        )) {
            return;
        }
        
        // Close any existing popup first
        this.closeMultiHitPopup();
        
        // Collect all features at click point
        const features = this.collectFeaturesAtPoint(e.latlng, e.containerPoint);
        
        if (features.length === 0) {
            return; // No features at click point
        }
        
        // Order features according to rules
        const orderedFeatures = this.orderFeatures(features);
        
        // Store features and show popup
        this.multiHitFeatures = orderedFeatures;
        this.multiHitCurrentIndex = 0;
        this.multiHitOriginalLatLng = e.latlng; // Store original click location
        this.createMultiHitPopup(e.latlng);
    }

    collectFeaturesAtPoint(latlng, containerPoint) {
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
        if (this.isAirportsEnabled && this.airportsMarkerCluster) {
            this.airportsMarkerCluster.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    // Check if click is near marker
                    const markerPoint = this.map.latLngToContainerPoint(layer.getLatLng());
                    const distance = Math.sqrt(
                        Math.pow(containerPoint.x - markerPoint.x, 2) +
                        Math.pow(containerPoint.y - markerPoint.y, 2)
                    );
                    
                    if (distance <= tolerance * 2) { // Larger tolerance for markers
                        if (layer.airportProperties) {
                            const props = layer.airportProperties;
                            const id = props.id || props._id || `airport-${props.icaoCode || props.name}`;
                            
                            if (!seenIds.has(id)) {
                                seenIds.add(id);
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
                            }
                        }
                    }
                }
            });
        }
        
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
        
        // Create Leaflet popup
        this.multiHitPopup = L.popup({
            className: 'multi-hit-popup',
            closeButton: true,
            autoClose: false,
            closeOnClick: false,
            maxWidth: 450,
            maxHeight: 500
        })
        .setLatLng(latlng)
        .setContent(content)
        .openOn(this.map);
        
        // Highlight the currently selected airspace layer
        const currentItem = this.multiHitFeatures[this.multiHitCurrentIndex];
        if (currentItem.layerType === 'airspace' && currentItem.leafletLayer) {
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
            layerName = isDroneAirspace ? 'Airspace for Drones' : 'All OpenAIP Airspace';
            typeLabel = props.type || props.typeCode || '';
        } else if (layerType === 'airport') {
            layerName = airportType === 'water' ? 'Water Aerodrome' : 
                       airportType === 'heliport' ? 'Heliport' : 'Airport';
            const typeCategory = this.getAirportTypeCategory(props.typeCode || props.type);
            typeLabel = typeCategory || '';
        }
        
        // Build content
        let content = `
            <div style="font-family: Arial, sans-serif; min-width: 250px; max-height: 450px; overflow-y: auto; overflow-x: hidden;">
                <!-- Pager UI -->
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #ddd;">
                    <button onclick="event.stopPropagation(); window.droneMap.navigatePopup(-1); return false;" 
                            style="${this.multiHitCurrentIndex > 0 ? 'background: #007bff; color: white; cursor: pointer;' : 'background: #ccc; color: #666; cursor: not-allowed;'} border: none; padding: 4px 12px; border-radius: 4px; font-size: 16px; pointer-events: auto;" 
                            ${this.multiHitCurrentIndex <= 0 ? 'disabled' : ''}>
                        ↑
                    </button>
                    <span style="font-size: 13px; font-weight: 600; color: #333;">
                        ${this.multiHitCurrentIndex + 1} of ${this.multiHitFeatures.length}
                    </span>
                    <button onclick="event.stopPropagation(); window.droneMap.navigatePopup(1); return false;" 
                            style="${this.multiHitCurrentIndex < this.multiHitFeatures.length - 1 ? 'background: #007bff; color: white; cursor: pointer;' : 'background: #ccc; color: #666; cursor: not-allowed;'} border: none; padding: 4px 12px; border-radius: 4px; font-size: 16px; pointer-events: auto;" 
                            ${this.multiHitCurrentIndex >= this.multiHitFeatures.length - 1 ? 'disabled' : ''}>
                        ↓
                    </button>
                </div>
                
                <!-- Title line -->
                <div style="margin-bottom: 10px;">
                    <strong style="font-size: 13px; color: #666;">${layerName}</strong>
                    ${typeLabel ? `<span style="font-size: 12px; color: #999; margin-left: 8px;">(${typeLabel})</span>` : ''}
                </div>
                
                <!-- Name -->
                <div style="margin-bottom: 8px;">
                    <strong style="font-size: 14px; color: #333;">${props.name || 'Unknown'}</strong>
                </div>
        `;
        
        // ICAO code for airports/heliports
        if (layerType === 'airport') {
            const icaoCodeDisplay = props.icaoCode || props.icao || props.code;
            if (icaoCodeDisplay) {
                content += `<div style="margin-bottom: 6px; font-size: 12px;"><strong>ICAO Code:</strong> ${icaoCodeDisplay}</div>`;
            }
        }
        
        // ICAO class
        const icaoClass = props.icaoClass || (props.icaoClassNumeric !== undefined ? ['A','B','C','D','E','F','G',null,'Unclassified'][props.icaoClassNumeric] : null);
        if (icaoClass) {
            content += `<div style="margin-bottom: 6px; font-size: 12px;"><strong>ICAO Class:</strong> ${icaoClass}</div>`;
        }
        
        // Type label (for airspace)
        if (layerType === 'airspace' && typeLabel) {
            content += `<div style="margin-bottom: 6px; font-size: 12px;"><strong>Type:</strong> ${typeLabel}</div>`;
        }
        
        // Altitude limits
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
                <div style="margin-bottom: 6px; font-size: 12px;">
                    <strong>Lower:</strong> ${lowerLimit}<br>
                    <strong>Upper:</strong> ${upperLimit}
                </div>
            `;
        }
        
        // SkyVector link for airports/heliports  
        const icaoCode = props.icaoCode || props.icao || props.code;
        if (icaoCode && layerType === 'airport') {
            let skyVectorUrl = `https://skyvector.com/airport/${icaoCode}`;
            if (props.name && props.name !== 'Unknown') {
                const nameSlug = props.name
                    .trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
                if (nameSlug) {
                    skyVectorUrl = `https://skyvector.com/airport/${icaoCode}/${nameSlug}`;
                }
            }
            
            content += `
                <div style="margin-bottom: 10px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                    <a href="${skyVectorUrl}" target="_blank" rel="noopener noreferrer"
                       onclick="window.open('${skyVectorUrl}', '_blank'); return false;"
                       style="font-size: 13px; font-weight: bold; color: #0066cc; text-decoration: underline; cursor: pointer;">
                        View on SkyVector
                    </a>
                </div>
            `;
        }
        
        // Fallback circle note
        if (props.isFallback && props.fallbackRadiusNM !== undefined) {
            content += `
                <div style="margin-top: 8px; font-style: italic; color: #666; font-size: 11px;">
                    Default radius ${props.fallbackRadiusNM} NM used
                </div>
            `;
        }
        
        // Raw properties toggle
        const featureId = `feature-${this.getFeatureStableId(feature)}`;
        content += `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
                <button onclick="event.stopPropagation(); window.droneMap.toggleRawProperties('${featureId}'); return false;" 
                        style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; pointer-events: auto;">
                    Show raw properties
                </button>
                <pre id="${featureId}" style="display: none; margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; overflow-x: auto; font-size: 10px; overflow-y: visible;">${JSON.stringify(props, null, 2)}</pre>
            </div>
        `;
        
        content += `</div>`;
        
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
            
            // Update highlight for the newly selected layer
            const currentItem = this.multiHitFeatures[this.multiHitCurrentIndex];
            if (currentItem.layerType === 'airspace' && currentItem.leafletLayer) {
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
            if (pre.style.display === 'none') {
                pre.style.display = 'block';
                button.textContent = 'Hide raw properties';
            } else {
                pre.style.display = 'none';
                button.textContent = 'Show raw properties';
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