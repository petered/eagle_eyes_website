class DroneMap {
    constructor() {
        this.map = null;
        this.droneMarker = null;
        this.droneClickMarker = null;
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
        this.droneMapCenteringState = 'OFF'; // 'CONTINUOUS' or 'OFF'

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
            this.map = L.map('map', {
                tap: false  // Fix for iOS Safari popup issues
            }).setView(this.defaultCenter, this.defaultZoom);

            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                maxZoom: 19,
                attribution: '© Esri, Maxar, Earthstar Geographics'
            }).addTo(this.map);

            this.trailPolyline = L.polyline([], {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.8
            }).addTo(this.map);

            this.geojsonLayer = L.geoJSON(null, {
                style: {
                    fillColor: '#f59e0b',
                    fillOpacity: 0.3,
                    color: '#f59e0b',
                    weight: 2
                }
            }).addTo(this.map);

            this.addCustomControls();

            // Add scale bar (top right)
            L.control.scale({
                position: 'topright',
                metric: true,
                imperial: true,
                maxWidth: 150
            }).addTo(this.map);

            // Add context menu for copying coordinates
            this.addContextMenu();

            // Add drag event listener to disable continuous centering when user pans
            this.map.on('dragstart', () => {
                if (this.droneMapCenteringState === 'CONTINUOUS') {
                    this.droneMapCenteringState = 'OFF';
                    console.log('Map centering disabled due to user drag');
                    this.updateRecenterButtonStyle();
                }
            });

            console.log('Drone map initialized with Leaflet');

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

    addContextMenu() {
        this.contextMenu = null;

        this.map.on('contextmenu', (e) => {
            // Remove any existing context menu
            this.removeContextMenu();

            const lat = e.latlng.lat.toFixed(5);
            const lng = e.latlng.lng.toFixed(5);
            const coordText = `${lat}, ${lng}`;

            // Create context menu
            this.contextMenu = L.DomUtil.create('div', 'leaflet-context-menu');
            this.contextMenu.style.cssText = `
                position: absolute;
                background-color: #2c2c2c;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 0;
                z-index: 1001;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                min-width: 200px;
            `;

            const menuItem = L.DomUtil.create('div', '', this.contextMenu);
            menuItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                color: #fff;
                font-size: 13px;
                transition: background-color 0.2s;
            `;
            menuItem.innerHTML = `Copy '${coordText}'`;
            menuItem.title = coordText;

            menuItem.onmouseover = () => {
                menuItem.style.backgroundColor = '#3c3c3c';
            };
            menuItem.onmouseout = () => {
                menuItem.style.backgroundColor = 'transparent';
            };

            menuItem.onclick = () => {
                navigator.clipboard.writeText(coordText).then(() => {
                    console.log('Coordinates copied:', coordText);
                    this.showCopyToast();
                }).catch(err => {
                    console.error('Failed to copy coordinates:', err);
                });
                this.removeContextMenu();
            };

            // Position the menu at the click location
            const mapContainer = this.map.getContainer();
            mapContainer.appendChild(this.contextMenu);

            const point = this.map.latLngToContainerPoint(e.latlng);
            this.contextMenu.style.left = point.x + 'px';
            this.contextMenu.style.top = point.y + 'px';

            // Close menu on any click outside
            setTimeout(() => {
                document.addEventListener('click', this.removeContextMenu.bind(this), { once: true });
            }, 100);
        });
    }

    removeContextMenu() {
        if (this.contextMenu && this.contextMenu.parentNode) {
            this.contextMenu.parentNode.removeChild(this.contextMenu);
            this.contextMenu = null;
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

        if (!this.droneMarker) {
            const droneIcon = L.divIcon({
                html: `<img src="${this.getAssetPath('/images/livestream/map_drone_flyer.png')}" style="width: 32px; height: 32px; transform: rotate(${bearing}deg); transform-origin: center;">`,
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

            // Update rotation by directly manipulating the existing image element
            const markerElement = this.droneMarker.getElement();
            if (markerElement) {
                const img = markerElement.querySelector('img');
                if (img) {
                    img.style.transform = `rotate(${bearing}deg)`;
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

    generateDronePopupContent() {
        if (!this.currentDroneData) return 'Loading...';

        const { latitude, longitude, altitude_ahl, altitude_asl, bearing, pitch, roll } = this.currentDroneData;

        const altAhlText = altitude_ahl != null ? altitude_ahl.toFixed(1) + 'm' : 'N/A';
        const altAslText = altitude_asl != null ? altitude_asl.toFixed(1) + 'm' : 'N/A';
        const pitchText = pitch != null ? pitch.toFixed(1) + '°' : 'N/A';
        const rollText = roll != null ? roll.toFixed(1) + '°' : 'N/A';

        const nameHeader = this.currentDroneName
            ? `<strong style="font-size: 1.1em;">${this.currentDroneName}</strong><br><br>`
            : `<strong style="font-size: 1.1em;">Drone Position</strong><br><br>`;

        return `
            <div style="min-width: 200px;">
                ${nameHeader}
                <strong>Latitude:</strong> ${latitude.toFixed(6)}°<br>
                <strong>Longitude:</strong> ${longitude.toFixed(6)}°<br>
                <strong>Altitude (home):</strong> ${altAhlText}<br>
                <strong>Altitude (GPS):</strong> ${altAslText}<br>
                <strong>Bearing:</strong> ${bearing.toFixed(1)}°<br>
                <strong>Pitch:</strong> ${pitchText}<br>
                <strong>Roll:</strong> ${rollText}
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
            fillOpacity: 0.3,
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

    resize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.droneMap = new DroneMap();
    }, 500);
});