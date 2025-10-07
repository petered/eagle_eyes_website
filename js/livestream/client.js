class WebRTCViewer {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.currentRoomId = null;
    this.currentPublisherName = null;
    this.isConnected = false;

    this.remoteVideo = document.getElementById("remoteVideo");
    this.statusElement = document.getElementById("status");
    this.roomIdInput = document.getElementById("roomIdInput");
    this.roomIdInputMobile = document.getElementById("roomIdInputMobile");
    this.videoContainer = document.getElementById("videoContainer");
    
    this.leaveBtn = document.getElementById("leaveBtn");
    this.leaveBtnMobile = document.getElementById("leaveBtnMobile");

    // History elements
    this.historyList = document.getElementById("historyList");
    this.historyListMobile = document.getElementById("historyListMobile");

    // Data channels
    this.coordinatesChannel = null;
    this.geojsonChannel = null;

    // Location data tracking
    this.coordinateHistory = [];
    this.currentLocation = null;
    this.lastCoordinateTime = null;
    this.staleDataCheckInterval = null;

    // GeoJSON chunking
    this.geojsonChunks = new Map(); // chunkId -> {chunks: [], total: number}
    this.currentGeojson = null;

    // WebRTC configuration
    this.defaultStunServers = [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun1.2.google.com:19302",
      "stun:stun1.3.google.com:19302",
      "stun:stun1.4.google.com:19302"
    ];

    this.rtcConfig = {
      iceServers: this.defaultStunServers.map(url => ({ urls: url })),
    };

    this.init();
  }

  async init() {
    // Fetch STUN servers
    await this.fetchStunServers();

    // Connect to signaling server
    this.socket = io("https://webrtc.simtim.dev");
    this.setupSocketListeners();

    // Check for room ID in URL
    this.checkURLForRoomId();

    // Setup UI event listeners
    this.roomIdInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.joinRoom();
    });
    this.roomIdInputMobile.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.joinRoom();
    });

    // Sync room inputs
    this.roomIdInput.addEventListener('input', (e) => this.roomIdInputMobile.value = e.target.value);
    this.roomIdInputMobile.addEventListener('input', (e) => this.roomIdInput.value = e.target.value);

    // Setup history functionality
    this.setupHistory();

    // Initialize coordinate displays once
    this.initializeCoordinateDisplays();
  }

  async fetchStunServers() {
    const LIST_URL = "https://raw.githubusercontent.com/pradt2/always-online-stun/master/valid_hosts.txt";

    try {
      const response = await fetch(LIST_URL);
      if (response.ok) {
        const body = await response.text();
        const servers = body.split('\n')
          .filter(line => line.trim())
          .slice(0, 10)
          .map(line => `stun:${line}`);
        if (servers.length > 0) {
          this.rtcConfig.iceServers = servers.map(url => ({ urls: url }));
          console.log(`Loaded ${servers.length} STUN servers`);
          return;
        }
      }
    } catch (error) {
      console.error("Failed to fetch STUN servers, using defaults:", error);
    }

    // Fallback to default servers
    this.rtcConfig.iceServers = this.defaultStunServers.map(url => ({ urls: url }));
  }

  checkURLForRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get("room") || urlParams.get("r");

    if (roomId) {
      this.roomIdInput.value = roomId;
      this.roomIdInputMobile.value = roomId;
      setTimeout(() => this.joinRoom(), 1000);
    }
  }

  setupSocketListeners() {
    this.socket.on("connect", () => {
      console.log("Connected to signaling server");
      this.updateStatus("waiting", "Not streaming");
      this.updateConnectionStatus("Connected to server");
    });

    this.socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
      this.updateStatus("error", "Disconnected from server");
      this.updateConnectionStatus("Disconnected");
      this.cleanup();
      if (window.droneMap) {
        window.droneMap.setDisconnected(true);
      }
    });

    this.socket.on("joined-as-viewer", (data) => {
      console.log("Joined room as viewer:", data);
      this.currentRoomId = data.roomId;
      this.currentPublisherName = data.publisherName;
      this.updateRoomId(data.roomId);
      this.updateViewerCount(data.viewerCount);
      this.leaveBtn.disabled = false;
      this.leaveBtnMobile.disabled = false;

      // Add to history
      this.addToHistory(data.roomId, data.publisherName);

      if (data.hasPublisher) {
        this.updateStatus("waiting", "Connecting to stream...");
        this.requestStream();
      } else {
        this.updateStatus("waiting", "Waiting for publisher...");
      }
    });

    this.socket.on("publisher-joined", (data) => {
      console.log("Publisher joined the room");
      this.currentPublisherName = data.publisherName;
      this.updateStatus("waiting", "Connecting to stream...");

      // Update history with publisher name
      if (this.currentRoomId) {
        this.addToHistory(this.currentRoomId, data.publisherName);
      }

      this.requestStream();
    });

    this.socket.on("publisher-left", () => {
      console.log("Publisher left the room");
      this.updateStatus("waiting", "Publisher disconnected");
      this.cleanup();
      if (window.droneMap) {
        window.droneMap.setDisconnected(true);
      }
    });

    this.socket.on("viewer-count-updated", (data) => {
      this.updateViewerCount(data.count);
    });

    this.socket.on("offer", async (data) => {
      if (this.peerConnection) await this.handleOffer(data.offer, data.senderId);
    });

    this.socket.on("answer", async (data) => {
      if (this.peerConnection) await this.peerConnection.setRemoteDescription(data.answer);
    });

    this.socket.on("ice-candidate", async (data) => {
      if (this.peerConnection) await this.peerConnection.addIceCandidate(data.candidate);
    });

    this.socket.on("error", (error) => {
      console.error("Server error:", error);
      this.updateStatus("error", `Error: ${error.message}`);
    });
  }

  async joinRoom() {
    const roomId = this.roomIdInput.value.trim();
    if (!roomId) {
      alert("Please enter a room ID");
      return;
    }

    // If already connected to a different room, reload page for clean state
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      const url = new URL(window.location);
      url.searchParams.set("room", roomId);
      window.location.href = url.toString();
      return;
    }

    this.updateStatus("connecting", "Joining...");
    this.socket.emit("join-as-viewer", { roomId });
  }

  leaveRoom() {
    if (this.currentRoomId) {
      this.socket.emit("leave-room", { roomId: this.currentRoomId });
    }

    // Clear all state and UI (don't keep last frame on manual leave)
    this.cleanup(false);
    this.currentRoomId = null;
    this.currentPublisherName = null;
    this.updateRoomId("Not connected");
    this.updateStatus("waiting", "Not streaming");
    this.updateViewerCount(0);
    this.updateConnectionStatus("Not connected");

    this.leaveBtn.disabled = true;
    this.leaveBtnMobile.disabled = true;

    this.roomIdInput.value = "";
    this.roomIdInputMobile.value = "";

    // Clear coordinate displays
    const coordTextMobile = document.getElementById("coordTextMobile");
    if (coordTextMobile) {
      coordTextMobile.innerHTML = "Waiting for location data...";
    }
    const coordTextDesktop = document.getElementById("coordTextDesktop");
    if (coordTextDesktop) {
      coordTextDesktop.innerHTML = "Waiting for location data...";
    }

    // Clear video and show placeholder
    this.remoteVideo.style.display = "none";
    const placeholder = this.videoContainer.querySelector(".placeholder");
    if (placeholder) {
      placeholder.style.display = "flex";
    }

    // Remove canvas if exists
    const oldCanvas = document.getElementById('lastFrameCanvas');
    if (oldCanvas) {
      oldCanvas.remove();
    }

    // Clear map data and disconnected state
    if (window.droneMap) {
      window.droneMap.clearData();
      window.droneMap.setDisconnected(false);
    }

    // Hide disconnected message
    if (window.hideDisconnectedMessage) {
      window.hideDisconnectedMessage();
    }

    // Clear location state
    this.coordinateHistory = [];
    this.currentLocation = null;
    this.lastCoordinateTime = null;
    this.currentGeojson = null;

    // Refresh history lists to remove highlight
    const history = this.getHistory();
    this.renderHistory(history);
    this.renderHistoryMobile(history);

    window.history.replaceState({}, document.title, window.location.pathname);
  }

  async requestStream() {
    if (!this.currentRoomId) return;
    console.log("Requesting stream...");
    this.createPeerConnection();
    this.socket.emit("request-stream", { roomId: this.currentRoomId });
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.ontrack = (event) => {
      console.log("Received remote stream");

      // Remove old canvas if exists
      const oldCanvas = document.getElementById('lastFrameCanvas');
      if (oldCanvas) {
        oldCanvas.remove();
      }

      this.remoteVideo.srcObject = event.streams[0];
      this.remoteVideo.style.display = "block";
      this.videoContainer.querySelector(".placeholder").style.display = "none";
      this.updateStatus("connected", "Streaming");
      this.updateConnectionStatus("Streaming");

      // Clear disconnected overlay when reconnecting
      if (window.droneMap) {
        window.droneMap.setDisconnected(false);
      }

      // Monitor video resolution changes
      this.setupResolutionMonitoring();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("ice-candidate", {
          roomId: this.currentRoomId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState);
      switch (this.peerConnection.connectionState) {
        case "connected":
          this.updateStatus("connected", "Streaming");
          this.updateConnectionStatus("Streaming");
          break;
        case "disconnected":
          this.updateStatus("waiting", "Stream disconnected");
          this.updateConnectionStatus("Connection lost");
          this.cleanup();
          if (window.droneMap) {
            window.droneMap.setDisconnected(true);
          }
          break;
        case "failed":
          this.updateStatus("error", "Connection failed");
          this.updateConnectionStatus("Connection failed");
          this.cleanup();
          if (window.droneMap) {
            window.droneMap.setDisconnected(true);
          }
          break;
        case "closed":
          this.updateStatus("waiting", "Not streaming");
          this.updateConnectionStatus("Connection closed");
          break;
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      if (channel.label === "drone_data") this.setupCoordinatesChannel(channel);
      if (channel.label === "geojson_data") this.setupGeojsonChannel(channel);
    };
  }

  async handleOffer(offer, senderId) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.socket.emit("answer", { roomId: this.currentRoomId, answer, targetId: senderId });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }

  setupCoordinatesChannel(channel) {
    channel.onopen = () => {
      this.startStaleDataCheck();
    };
    channel.onmessage = (event) => {
      try {
        this.handleLocationData(JSON.parse(event.data));
      } catch (error) {
        console.error("Error parsing location data:", error);
      }
    };
    channel.onclose = () => {
      this.stopStaleDataCheck();
    };
  }

  setupGeojsonChannel(channel) {
    channel.onopen = () => console.log("GeoJSON data channel opened");
    channel.onmessage = (event) => {
      try {
        const data = event.data;
        if (data.startsWith('{"type":"chunk"')) {
          this.handleGeojsonChunk(JSON.parse(data));
        } else {
          this.handleGeojsonData(JSON.parse(data));
        }
      } catch (error) {
        console.error("Error parsing GeoJSON data:", error);
      }
    };
  }

  handleLocationData(locationData) {
    const { pose, lastGPSTime } = locationData;
    const { latitude, longitude, altitude_ahl, altitude_asl, bearing, pitch, roll } = pose;

    this.currentLocation = { latitude, longitude, altitude_ahl, altitude_asl, bearing, pitch, roll, timestamp: lastGPSTime };
    this.lastCoordinateTime = Date.now();
    this.coordinateHistory.push({ longitude, latitude, timestamp: lastGPSTime });

    if (window.droneMap) {
      window.droneMap.updateDronePosition(this.currentLocation, this.currentPublisherName);
      window.droneMap.updateTrail(this.coordinateHistory);
      window.droneMap.setDataStale(false);
    }

    this.updateLocationDisplay();
  }

  handleGeojsonChunk(chunkData) {
    const { id, index, total, data } = chunkData;
    if (!this.geojsonChunks.has(id)) {
      this.geojsonChunks.set(id, { chunks: new Array(total), total });
    }
    const chunkSet = this.geojsonChunks.get(id);
    chunkSet.chunks[index] = data;

    const receivedChunks = chunkSet.chunks.filter((c) => c !== undefined);
    if (receivedChunks.length === total) {
      try {
        const geojson = JSON.parse(chunkSet.chunks.join(""));
        this.handleGeojsonData(geojson);
        this.geojsonChunks.delete(id);
      } catch (error) {
        console.error("Error reassembling chunked GeoJSON:", error);
      }
    }
  }

  handleGeojsonData(geojson) {
    this.currentGeojson = geojson;
    if (window.droneMap) {
      window.droneMap.updateGeojson(geojson);
    }
  }

  initializeCoordinateDisplays() {
    // Initialize mobile coordinate display
    const coordDisplay = document.getElementById("coordinateDisplay");
    if (coordDisplay) {
      coordDisplay.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div id="coordTextMobile" class="flex-grow-1" style="word-break: break-all;">Waiting for location data...</div>
          <button id="copyBtnMobile" class="btn btn-sm btn-outline-light ms-2" title="Copy coordinates">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      `;
      
      // Add click handler once
      const mobileBtn = document.getElementById("copyBtnMobile");
      if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
          if (this.currentLocation) {
            const { latitude, longitude } = this.currentLocation;
            const copyText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            this.copyCoordinates(copyText);
          }
        });
      }
    }
    
    // Initialize desktop coordinate display
    const coordStrip = document.getElementById("coordinateStrip");
    if (coordStrip) {
      coordStrip.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <div id="coordTextDesktop" class="flex-grow-1" style="word-break: break-all;">Waiting for location data...</div>
          <button id="copyBtnDesktop" class="btn btn-sm btn-outline-light ms-2" title="Copy coordinates">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      `;
      
      // Add click handler once
      const desktopBtn = document.getElementById("copyBtnDesktop");
      if (desktopBtn) {
        desktopBtn.addEventListener('click', () => {
          if (this.currentLocation) {
            const { latitude, longitude } = this.currentLocation;
            const copyText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            this.copyCoordinates(copyText);
          }
        });
      }
    }
  }

  updateLocationDisplay() {
    if (!this.currentLocation) return;
    const { latitude, longitude, altitude_ahl, altitude_asl, bearing } = this.currentLocation;

    const altAhlText = altitude_ahl != null ? altitude_ahl.toFixed(1) + "m" : "N/A";
    const altAslText = altitude_asl != null ? altitude_asl.toFixed(1) + "m" : "N/A";

    const displayText = `(${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°) <strong>AHL:</strong> ${altAhlText} <strong>ASL:</strong> ${altAslText} <strong>Bearing:</strong> ${bearing.toFixed(1)}°`;

    // Only update the text content, not the entire structure
    const coordTextMobile = document.getElementById("coordTextMobile");
    if (coordTextMobile) {
      coordTextMobile.innerHTML = displayText;
    }

    const coordTextDesktop = document.getElementById("coordTextDesktop");
    if (coordTextDesktop) {
      coordTextDesktop.innerHTML = displayText;
    }
  }

  copyCoordinates(coordinates) {
    navigator.clipboard.writeText(coordinates).then(() => {
      console.log('Coordinates copied to clipboard:', coordinates);
    }).catch(err => {
      console.error('Failed to copy coordinates:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = coordinates;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  }

  setupResolutionMonitoring() {
    let lastWidth = 0;
    let lastHeight = 0;
    
    const checkResolution = () => {
      if (this.remoteVideo.videoWidth !== lastWidth || this.remoteVideo.videoHeight !== lastHeight) {
        lastWidth = this.remoteVideo.videoWidth;
        lastHeight = this.remoteVideo.videoHeight;
        if (lastWidth > 0 && lastHeight > 0) {
          console.log(`Video resolution: ${lastWidth}x${lastHeight}`);
        }
      }
    };
    
    // Check initially when metadata loads
    this.remoteVideo.onloadedmetadata = checkResolution;
    
    // Monitor for resolution changes
    this.resolutionMonitor = setInterval(checkResolution, 1000);
  }

  startStaleDataCheck() {
    this.stopStaleDataCheck();
    this.staleDataCheckInterval = setInterval(() => {
      if (this.lastCoordinateTime) {
        const timeSinceLastUpdate = Date.now() - this.lastCoordinateTime;
        const isStale = timeSinceLastUpdate > 5000; // 5 seconds threshold

        if (window.droneMap) {
          window.droneMap.setDataStale(isStale);
        }
      }
    }, 2000); // Check every 2 seconds
  }

  stopStaleDataCheck() {
    if (this.staleDataCheckInterval) {
      clearInterval(this.staleDataCheckInterval);
      this.staleDataCheckInterval = null;
    }
  }

  cleanup(keepLastFrame = true) {
    // Capture last frame FIRST before closing anything (only if keepLastFrame is true)
    if (keepLastFrame && this.remoteVideo.srcObject && this.remoteVideo.videoWidth > 0) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = this.remoteVideo.videoWidth;
        canvas.height = this.remoteVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(this.remoteVideo, 0, 0);

        // Replace video with canvas showing last frame
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        canvas.id = 'lastFrameCanvas';

        // Insert canvas and hide video
        this.videoContainer.insertBefore(canvas, this.remoteVideo);
        this.remoteVideo.style.display = 'none';

        console.log('Captured last frame:', canvas.width, 'x', canvas.height);
      } catch (error) {
        console.error('Failed to capture last frame:', error);
      }
    }

    // Now close everything
    if (this.coordinatesChannel) this.coordinatesChannel.close();
    if (this.geojsonChannel) this.geojsonChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    if (this.resolutionMonitor) clearInterval(this.resolutionMonitor);
    this.stopStaleDataCheck();

    this.remoteVideo.srcObject = null;

    // Keep location data and map state on disconnect (unless explicitly cleared)
    this.lastCoordinateTime = null;
    this.geojsonChunks.clear();
  }

  updateStatus(type, message) {
    if(this.statusElement) {
        this.statusElement.classList.remove('connecting', 'waiting', 'connected', 'error');
        this.statusElement.classList.add(type);
        const textEl = this.statusElement.querySelector(".status-text");
        if (textEl) textEl.textContent = message;
    }
  }

  updateRoomId(roomId) {
    document.getElementById("roomIdDisplay").textContent = roomId;
    if (roomId && roomId !== "Not connected") {
      const url = new URL(window.location);
      url.searchParams.set("room", roomId);
      window.history.replaceState({}, document.title, url);
    }
  }

  updateConnectionStatus(status) {
    document.getElementById("connectionStatus").textContent = status;
  }

  updateViewerCount(count) {
    document.getElementById("viewerCount").textContent = count;
  }

  setupHistory() {
    this.loadHistory();
  }

  loadHistory() {
    const history = this.getHistory();
    this.renderHistory(history);
    this.renderHistoryMobile(history);
  }

  getHistory() {
    try {
      return JSON.parse(localStorage.getItem('eagleViewerHistory')) || [];
    } catch {
      return [];
    }
  }

  saveHistory(history) {
    localStorage.setItem('eagleViewerHistory', JSON.stringify(history));
  }

  addToHistory(roomId, publisherName) {
    if (!roomId) return;

    const history = this.getHistory();
    const name = publisherName || `Stream ${roomId.substring(0, 8)}`;

    // Remove existing entry for this room if it exists
    const filteredHistory = history.filter(h => h.roomId !== roomId);

    // Add new entry at the beginning
    filteredHistory.unshift({
      name,
      roomId,
      timestamp: Date.now()
    });

    // Keep only last 5 entries
    if (filteredHistory.length > 5) {
      filteredHistory.splice(5);
    }

    this.saveHistory(filteredHistory);
    this.renderHistory(filteredHistory);
    this.renderHistoryMobile(filteredHistory);
  }

  removeFromHistory(roomId) {
    const history = this.getHistory().filter(h => h.roomId !== roomId);
    this.saveHistory(history);
    this.renderHistory(history);
    this.renderHistoryMobile(history);
  }

  renderHistory(history) {
    if (history.length === 0) {
      this.historyList.innerHTML = '<div class="text-muted text-center px-3">No recent streams</div>';
      return;
    }

    this.historyList.innerHTML = history.map(item => {
      const isCurrent = this.currentRoomId === item.roomId;
      const bgClass = isCurrent ? 'bg-primary bg-opacity-25' : '';
      const textClass = isCurrent ? 'text-primary fw-bold' : '';

      return `
        <div class="d-flex align-items-center justify-content-between px-3 py-1 ${bgClass} rounded mx-2 mb-1">
          <button class="btn btn-link text-start p-0 flex-grow-1 text-decoration-none ${textClass}"
                  onclick="viewer.joinFromHistory('${item.roomId}')"
                  title="Join ${item.name}"
                  ${isCurrent ? 'disabled' : ''}>
            <div>
              <div class="text-truncate">${item.name}</div>
              <small class="text-muted">${item.roomId}</small>
            </div>
          </button>
          <button class="btn btn-sm btn-outline-danger ms-2"
                  onclick="viewer.removeFromHistory('${item.roomId}')"
                  title="Remove from history">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  renderHistoryMobile(history) {
    if (history.length === 0) {
      this.historyListMobile.innerHTML = '<div class="text-muted text-center">No recent streams</div>';
      return;
    }

    this.historyListMobile.innerHTML = history.map(item => {
      const isCurrent = this.currentRoomId === item.roomId;
      const bgClass = isCurrent ? 'bg-primary bg-opacity-25 border border-primary' : 'bg-dark';
      const textClass = isCurrent ? 'text-primary fw-bold' : 'text-white';

      return `
        <div class="d-flex align-items-center justify-content-between mb-2 p-2 ${bgClass} rounded">
          <button class="btn btn-link text-start p-0 flex-grow-1 text-decoration-none ${textClass}"
                  onclick="viewer.joinFromHistory('${item.roomId}')"
                  title="Join ${item.name}"
                  ${isCurrent ? 'disabled' : ''}>
            <div>
              <div class="text-truncate">${item.name}</div>
              <small class="text-muted">${item.roomId}</small>
            </div>
          </button>
          <button class="btn btn-sm btn-outline-danger ms-2"
                  onclick="viewer.removeFromHistory('${item.roomId}')"
                  title="Remove from history">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  joinFromHistory(roomId) {
    // Always reload page when joining from history for clean state
    const url = new URL(window.location);
    url.searchParams.set("room", roomId);
    window.location.href = url.toString();
  }
}

let viewer;

function joinRoom() {
  if (!viewer) return;
  viewer.joinRoom();
}

function leaveRoom() {
  if (!viewer) return;
  viewer.leaveRoom();
}

function copyCurrentCoordinates() {
  if (window.currentCoordinates && viewer) {
    viewer.copyCoordinates(window.currentCoordinates);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  viewer = new WebRTCViewer();
});
