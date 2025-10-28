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

            // Add layer control with base maps and overlays
            const baseMaps = {
                "Satellite": satelliteLayer,
                "Google Hybrid": googleHybridLayer,
                "Terrain": terrainLayer,
                "Street": streetLayer
            };

            const overlays = {
                "Labels": satelliteLabelsLayer
            };

            this.layerControl = L.control.layers(baseMaps, overlays, {
                position: 'topleft'
            }).addTo(this.map);
            
            console.log('Layer control added:', this.layerControl);
            console.log('Base maps:', baseMaps);

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

            // Add scale bar (bottom left position)
            this.scaleControl = L.control.scale({
                position: 'bottomleft',
                metric: true,
                imperial: true,
                maxWidth: 150
            }).addTo(this.map);
            
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

            console.log('Drone map initialized with Leaflet');
            console.log('toggleMyLocation method available:', typeof this.toggleMyLocation === 'function');

        } catch (error) {
            console.error('Error initializing map:', error);
            this.fallbackToStaticMap();
        }
    }

    addCustomControls() {
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
                <button onclick="navigator.clipboard.writeText('${lat}, ${lng}').then(() => alert('Coordinates copied!'))" 
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

        // Remove existing markers
        if (this.myLocationMarker) {
            this.map.removeLayer(this.myLocationMarker);
        }
        if (this.myLocationCircle) {
            this.map.removeLayer(this.myLocationCircle);
        }

        // Create accuracy circle
        this.myLocationCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(this.map);

        // Create location marker with directional arrow
        const iconHtml = this.createLocationIcon(heading);
        this.myLocationMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                html: iconHtml,
                className: 'my-location-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);

        // Center map on user location if it's the first time
        if (!this.myLocationMarker) {
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
        // Create a blue dot with prominent directional arrow
        const rotation = heading !== null && heading !== undefined ? heading : 0;
        return `
            <div style="
                width: 20px;
                height: 20px;
                background-color: #007bff;
                border: 2px solid white;
                border-radius: 50%;
                position: relative;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">
                <div style="
                    position: absolute;
                    top: -15px;
                    left: 50%;
                    transform: translateX(-50%) rotate(${rotation}deg);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-bottom: 16px solid #007bff;
                    transform-origin: center bottom;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
                "></div>
                <div style="
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%) rotate(${rotation}deg);
                    width: 0;
                    height: 0;
                    border-left: 5px solid transparent;
                    border-right: 5px solid transparent;
                    border-bottom: 10px solid white;
                    transform-origin: center bottom;
                "></div>
                <div style="
                    position: absolute;
                    top: -9px;
                    left: 50%;
                    transform: translateX(-50%) rotate(${rotation}deg);
                    width: 0;
                    height: 0;
                    border-left: 3px solid transparent;
                    border-right: 3px solid transparent;
                    border-bottom: 6px solid #ff6b35;
                    transform-origin: center bottom;
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