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
                opacity: 0.8
            }).addTo(this.map);

            this.geojsonLayer = L.geoJSON(null, {
                style: {
                    fillColor: '#f59e0b',
                    fillOpacity: POLYGON_FILL_OPACITY,
                    color: '#f59e0b',
                    weight: 2
                }
            }).addTo(this.map);

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
        `;
        
        // Add event listeners to radio buttons
        const radioButtons = this.baseMapPopup.querySelectorAll('input[name="basemap"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.switchBaseMap(e.target.value);
                }
            });
        });
        
        // Add to map container
        mapContainer.appendChild(this.baseMapPopup);
        
        // Prevent map clicks when popup is open
        this.map.getContainer().style.pointerEvents = 'none';
        this.baseMapPopup.style.pointerEvents = 'auto';
        
        // Close popup when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!this.baseMapPopup.contains(e.target)) {
                    this.closeBaseMapPopup();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    closeBaseMapPopup() {
        if (this.baseMapPopup) {
            this.baseMapPopup.remove();
            this.baseMapPopup = null;
            // Re-enable map clicks
            this.map.getContainer().style.pointerEvents = 'auto';
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
                
                // Add click and long-press handlers
                let pressTimer = null;
                let isLongPress = false;
                
                container.onmousedown = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    isLongPress = false;
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        window.droneMap.toggleUserFacingMode();
                    }, 500); // 500ms for long press
                };
                
                container.onmouseup = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                    if (!isLongPress) {
                        window.droneMap.resetToNorthUp();
                    }
                };
                
                container.onmouseleave = function(e) {
                    e.stopPropagation();
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                };
                
                // Touch events for mobile
                container.ontouchstart = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    isLongPress = false;
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        window.droneMap.toggleUserFacingMode();
                    }, 500);
                };
                
                container.ontouchend = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                    if (!isLongPress) {
                        window.droneMap.resetToNorthUp();
                    }
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
    
    toggleUserFacingMode() {
        if (this.northArrowMode === 'user-facing') {
            this.northArrowMode = 'north';
            console.log('Switched to north-oriented mode');
        } else {
            this.northArrowMode = 'user-facing';
            console.log('Switched to user-facing mode');
        }
        
        this.updateNorthArrowRotation();
        this.updateMapRotation();
    }
    
    resetToNorthUp() {
        if (this.northArrowMode === 'north') {
            // Reset map rotation to north-up
            this.applyMapRotation();
            console.log('Reset map to north-up');
        }
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
        
        // Remove existing classes
        container.classList.remove('north-oriented', 'user-facing');
        
        if (this.northArrowMode === 'north') {
            arrow.style.transform = 'rotate(0deg)';
            modeIndicator.textContent = 'N';
            modeIndicator.style.background = '#27ae60';
            container.classList.add('north-oriented');
            container.title = 'North-oriented mode (click to reset to north-up, long-press to switch to user-facing)';
            console.log('Set to north-oriented mode');
        } else {
            const rotation = this.userHeading !== null ? -this.userHeading : 0;
            arrow.style.transform = `rotate(${rotation}deg)`;
            modeIndicator.textContent = 'U';
            modeIndicator.style.background = '#3498db';
            container.classList.add('user-facing');
            container.title = 'User-facing mode (long-press to switch to north-oriented)';
            console.log('Set to user-facing mode, rotation:', rotation);
        }
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
                navbar.style.display = 'flex';
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
            if (this.northArrowMode === 'user-facing' && this.userHeading !== null) {
                // User-facing mode: rotate based on device heading
                tileContainer.style.transform = `rotate(${-this.userHeading}deg)`;
            } else {
                // North-up mode: always stay north-up (no rotation)
                tileContainer.style.transform = `rotate(0deg)`;
            }
        }
    }
    
    updateMapRotation() {
        this.applyMapRotation();
    }
    
    updateUserHeading(heading) {
        this.userHeading = heading;
        if (this.northArrowMode === 'user-facing') {
            this.updateNorthArrowRotation();
            this.updateMapRotation();
        }
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
                interactive: false
            }).addTo(this.map);

            // Create invisible clickable circle marker
            this.droneClickMarker = L.circleMarker(this.currentLocation, {
                radius: 16,
                fillOpacity: 0,
                opacity: 0,
                interactive: true
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
            style: (feature) => this.getFeatureStyle(feature),
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

                const marker = L.marker(latLng, { icon: otherDroneIcon }).addTo(this.map);

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
        
        // Update user heading for north arrow
        if (heading !== null && heading !== undefined) {
            this.updateUserHeading(heading);
        }

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
        
        // Update or create location marker with directional arrow
        if (this.myLocationMarker) {
            // Update existing marker position and rotation
            this.myLocationMarker.setLatLng([lat, lng]);
            this.updateLocationMarkerRotation(heading);
        } else {
            // Create new marker
            const iconHtml = this.createLocationIcon(heading);
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

    createLocationIcon(heading) {
        // Google Maps style location marker
        const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
        const rotation = hasHeading ? heading : 0;
        
        // If we have heading, show directional chevron; otherwise just the dot
        const chevronHtml = hasHeading ? `
            <div class="location-chevron" style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                margin-top: -22px;
                margin-left: -4px;
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 12px solid #4285f4;
                transform: translate(-50%, -100%) rotate(${rotation}deg);
                transform-origin: 50% 100%;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));
                z-index: 2;
            "></div>
        ` : '';
        
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
                <!-- Directional chevron (only shown when heading is available) -->
                ${chevronHtml}
            </div>
        `;
    }
    
    updateLocationMarkerRotation(heading) {
        if (!this.myLocationMarker) return;
        
        const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
        const rotation = hasHeading ? heading : 0;
        const markerElement = this.myLocationMarker.getElement();
        
        if (markerElement) {
            const chevron = markerElement.querySelector('.location-chevron');
            
            if (chevron) {
                if (hasHeading) {
                    // Show chevron and update rotation
                    chevron.style.display = 'block';
                    chevron.style.transform = `translate(-50%, -100%) rotate(${rotation}deg)`;
                } else {
                    // Hide chevron when no heading
                    chevron.style.display = 'none';
                }
            } else if (hasHeading) {
                // Chevron doesn't exist yet, recreate the icon with heading
                const iconHtml = this.createLocationIcon(heading);
                const icon = L.divIcon({
                    html: iconHtml,
                    className: 'my-location-marker',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                this.myLocationMarker.setIcon(icon);
            }
            
            console.log(`Updated user location marker rotation to ${rotation}deg (hasHeading: ${hasHeading})`);
        }
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