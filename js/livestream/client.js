class WebRTCViewer {
  constructor() {
    this.socket = null;
    this.peerConnection = null;
    this.currentRoomId = null; // Also used as streamId
    this.currentPublisherName = null;
    this.wasStreaming = false; // Track if we were actually streaming
    this.streamReceived = false; // Track if we've received a stream
    this.isRoomFull = false; // Track if room is full (viewer limit reached)

    // WebRTC stats tracking for reliable video data detection
    this.lastBytesReceived = 0; // Track bytes from previous stats check
    this.lastStatsCheckTime = null; // Timestamp of last stats check
    this.isReceivingData = false; // True if bytes are actively increasing (ground truth from WebRTC)
    this.isStreamOpen = false; // True when user has entered streaming view (persists during disconnects)

    // State machine timing
    this.signallingConnectionStartTime = null; // When we started signalling connection
    this.streamingConnectionStartTime = null; // When we started streaming connection
    this.stateCheckInterval = null; // Interval to check state every 500ms
    this.SIGNALLING_TIMEOUT = 5000; // 5 seconds timeout for signalling
    this.STREAMING_TIMEOUT = 5000; // 5 seconds timeout for streaming
    this.VIDEO_STALL_TIMEOUT = 5000; // 5 seconds timeout for video stall detection

    this.remoteVideo = document.getElementById("remoteVideo");
    this.statusElement = document.getElementById("status");
    this.roomIdInput = document.getElementById("roomIdInput");
    this.roomIdInputMobile = document.getElementById("roomIdInputMobile");
    this.videoContainer = document.getElementById("videoContainer");

    this.leaveBtn = document.getElementById("leaveBtn");
    this.leaveBtnMobile = document.getElementById("leaveBtnMobile");
    this.leaveBtnDesktop = document.getElementById("leaveBtnDesktop");

    // History elements
    this.historyList = document.getElementById("historyList");
    this.historyListMobile = document.getElementById("historyListMobile");

    // Data channels
    this.coordinatesChannel = null;
    this.geojsonChannel = null;
    this.otherDronesChannel = null;

    // Location data tracking
    this.otherDrones = {}; // Map of droneId -> telemetry data
    this.coordinateHistory = [];
    this.currentLocation = null;
    this.lastCoordinateTime = null;
    this.staleDataCheckInterval = null;

    // Viewer tracking
    this.viewerList = []; // Array of {name: String | undefined, email: String | undefined}
    this.currentViewerInfo = { name: undefined, email: undefined }; // Store current viewer's info for reconnection

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

  validateAndFormatRoomId(input) {
    // Crockford Base32 valid characters: 0-9, A-Z (excluding I, L, O, U)
    const validChars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
    let result = '';
    let showToast = false;
    let toastMessage = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i].toUpperCase();

      // Handle special character substitutions per Crockford spec
      if (char === 'I') {
        result += '1';
        if (!showToast) {
          showToast = true;
          toastMessage = 'I is not valid, did you mean 1?';
        }
      } else if (char === 'L') {
        result += '1';
        if (!showToast) {
          showToast = true;
          toastMessage = 'L is not valid, did you mean 1?';
        }
      } else if (char === 'O') {
        result += '0';
        if (!showToast) {
          showToast = true;
          toastMessage = 'O is not valid, did you mean 0?';
        }
      } else if (char === 'U') {
        result += 'V';
        if (!showToast) {
          showToast = true;
          toastMessage = 'U is not valid, did you mean V?';
        }
      } else if (validChars.includes(char)) {
        // Valid character, keep it (already uppercase)
        result += char;
      }
      // Invalid characters are silently ignored
    }

    if (showToast) {
      this.showToast(toastMessage);
    }

    return result;
  }

  showToast(message) {
    const toast = document.getElementById('roomIdToast');
    if (!toast) return;

    // Clear any existing timeout
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    toast.textContent = message;
    toast.style.display = 'block';

    // Auto-hide after 2.5 seconds
    this.toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 2500);
  }

  async init() {
    // Fetch STUN servers
    await this.fetchStunServers();

    // Connect to signaling server
    this.socket = io("https://webrtc.eagleeyessearch.com");
    // this.socket = io("http://localhost:3000");
    this.setupSocketListeners();

    // Check for room ID in URL
    this.checkURLForRoomId();

    // Setup UI event listeners
    // Note: Keypress listeners removed - now using modal-based join functionality
    // this.roomIdInput.addEventListener("keypress", (e) => {
    //   if (e.key === "Enter") this.joinRoom();
    // });
    // this.roomIdInputMobile.addEventListener("keypress", (e) => {
    //   if (e.key === "Enter") this.joinRoom();
    // });

    // Sync room inputs with validation
    this.roomIdInput.addEventListener('input', (e) => {
      const validated = this.validateAndFormatRoomId(e.target.value);
      e.target.value = validated;
      this.roomIdInputMobile.value = validated;
    });
    this.roomIdInputMobile.addEventListener('input', (e) => {
      const validated = this.validateAndFormatRoomId(e.target.value);
      e.target.value = validated;
      this.roomIdInput.value = validated;
    });

    // Setup history functionality
    this.setupHistory();

    // Initialize coordinate displays once
    this.initializeCoordinateDisplays();

    // Start state check interval - check stats and update UI
    this.stateCheckInterval = setInterval(async () => {
      // Check video data flow using WebRTC stats
      await this.checkVideoDataFlow();

      // Update UI based on current state
      this.updateUIState();

      // Check if video has stalled (user is in streaming view but data stopped)
      if (this.isStreamOpen && !this.isReceivingData) {
        // Video has stalled, show disconnect banner
        if (window.droneMap) {
          window.droneMap.setDisconnected(true);
        }
      } else if (this.isStreamOpen && this.isReceivingData) {
        // Video is flowing, hide disconnect banner
        if (window.droneMap) {
          window.droneMap.setDisconnected(false);
        }
      }
    }, 500);

    // Setup page visibility handling for mobile reconnection
    this.setupVisibilityHandling();
  }

  setupVisibilityHandling() {
    // Listen for socket disconnect events
    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      // Mark that we were disconnected if we're in a room
      if (this.currentRoomId) {
        console.log('Marking as disconnected, will reconnect when possible');
        this.wasDisconnected = true;
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket reconnected');
      // If we were disconnected and we're in a room, try to reconnect after a delay
      if (this.wasDisconnected && this.currentRoomId) {
        console.log('Was disconnected, will attempt to rejoin room...');
        this.wasDisconnected = false;
        setTimeout(() => {
          this.attemptReconnect();
        }, 500);
      }
    });
  }

  attemptReconnect() {
    if (!this.currentRoomId) {
      return;
    }

    console.log('Attempting reconnect...');
    console.log('Socket connected:', this.socket.connected);
    console.log('Peer state:', this.peerConnection?.connectionState);

    // If socket is not connected, reconnect it first
    if (!this.socket.connected) {
      console.log('Reconnecting socket...');
      this.socket.connect();
      return; // Wait for socket to connect, then it will trigger this again
    }

    // Check if peer connection needs reconnecting
    const needsReconnect = !this.peerConnection ||
                           this.peerConnection.connectionState === 'disconnected' ||
                           this.peerConnection.connectionState === 'failed' ||
                           this.peerConnection.connectionState === 'closed';

    if (needsReconnect) {
      console.log('Reconnecting peer connection...');
      this.updateStatus("connecting", "Reconnecting...");

      // Clean up old peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Reset timers and rejoin the room with stored viewer info
      this.signallingConnectionStartTime = Date.now();
      this.streamingConnectionStartTime = null;
      this.socket.emit("join-as-viewer", {
        roomId: this.currentRoomId,
        name: this.currentViewerInfo.name,
        email: this.currentViewerInfo.email
      });
    } else {
      console.log('Connection still active, no reconnect needed');
    }
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
    // Support 'stream' as primary, but also accept 'room' and 'r' for backwards compatibility
    const roomId = urlParams.get("stream") || urlParams.get("room") || urlParams.get("r");

    if (roomId) {
      this.roomIdInput.value = roomId;
      this.roomIdInputMobile.value = roomId;
      setTimeout(() => this.joinRoom(), 1000);
    }
  }

  // State detection methods
  isSignallingConnected() {
    return this.peerConnection !== null;
  }

  async checkVideoDataFlow() {
    // Use WebRTC stats to reliably detect if video data is flowing
    if (!this.peerConnection) {
      this.isReceivingData = false;
      return false;
    }

    try {
      const stats = await this.peerConnection.getStats();
      let currentBytesReceived = 0;

      // Find inbound video track stats
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          currentBytesReceived = report.bytesReceived || 0;
        }
      });

      const now = Date.now();

      // Check if bytes have increased since last check
      if (this.lastStatsCheckTime && currentBytesReceived > this.lastBytesReceived) {
        this.isReceivingData = true;
        this.wasStreaming = true; // Mark that we've successfully received video data
        this.isStreamOpen = true; // User has entered the streaming view
      } else if (this.lastStatsCheckTime) {
        // No new bytes received
        this.isReceivingData = false;
      }

      this.lastBytesReceived = currentBytesReceived;
      this.lastStatsCheckTime = now;

      return this.isReceivingData;
    } catch (error) {
      console.error('Error checking video data flow:', error);
      this.isReceivingData = false;
      return false;
    }
  }

  isStreaming() {
    // Use WebRTC stats to determine if we're actually receiving video data
    return this.streamReceived && this.isReceivingData;
  }

  timeSince(startTime) {
    if (!startTime) return Infinity;
    return Date.now() - startTime;
  }

  getState() {
    // If user has entered streaming view, keep showing it even during disconnects
    if (this.isStreamOpen) {
      return 'STREAMING';
    }

    if (!this.currentRoomId) {
      return 'NO_STREAM';
    }

    // Check if room is full before other state checks
    if (this.isRoomFull) {
      return 'ROOM_FULL';
    }

    if (!this.isSignallingConnected()) {
      if (this.timeSince(this.signallingConnectionStartTime) < this.SIGNALLING_TIMEOUT) {
        return 'ATTEMPTING_SIGNALLING_CONNECTION';
      }
      return 'NO_SIGNALLING_CONNECTION';
    }

    if (!this.isStreaming()) {
      if (this.timeSince(this.streamingConnectionStartTime) < this.STREAMING_TIMEOUT) {
        return 'ATTEMPTING_STREAM_CONNECTION';
      }
      return 'NO_STREAM_CONNECTION';
    }

    return 'STREAMING';
  }

  // Centralized UI state management
  updateUIState() {
    const state = this.getState();
    console.log('Current state:', state, {
      streamId: this.currentRoomId,
      signallingConnected: this.isSignallingConnected(),
      streaming: this.isStreaming(),
      signallingTime: this.timeSince(this.signallingConnectionStartTime),
      streamingTime: this.timeSince(this.streamingConnectionStartTime)
    });

    switch(state) {
      case 'NO_STREAM':
        this.showNoStream();
        break;
      case 'ROOM_FULL':
        this.showRoomFull();
        break;
      case 'ATTEMPTING_SIGNALLING_CONNECTION':
        this.showAttemptingSignalling();
        break;
      case 'NO_SIGNALLING_CONNECTION':
        this.showNoSignallingConnection();
        break;
      case 'ATTEMPTING_STREAM_CONNECTION':
        this.showAttemptingStream();
        break;
      case 'NO_STREAM_CONNECTION':
        this.showNoStreamConnection();
        break;
      case 'STREAMING':
        this.showStreaming();
        break;
    }
  }

  showRoomFull() {
    console.log('State: ROOM_FULL');

    // Hide landing page, connecting state, and other error states
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    const connectingDetails = document.getElementById('connectingDetails');
    const videoLoadingDetails = document.getElementById('videoLoadingDetails');
    const noStreamDetails = document.getElementById('noStreamDetails');
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    if (placeholderTitle) placeholderTitle.style.display = 'none';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'none';
    if (connectingDetails) connectingDetails.style.display = 'none';
    if (videoLoadingDetails) videoLoadingDetails.style.display = 'none';
    if (noStreamDetails) noStreamDetails.style.display = 'none';
    if (connectedNoStreamDetails) connectedNoStreamDetails.style.display = 'none';

    // Show room full details
    const roomFullDetails = document.getElementById('roomFullDetails');
    const roomFullRoomId = document.getElementById('roomFullRoomId');
    if (roomFullDetails && roomFullRoomId && this.currentRoomId) {
      roomFullRoomId.textContent = this.currentRoomId;
      roomFullDetails.style.display = 'block';
    }

    // Hide video, show placeholder
    this.remoteVideo.style.display = 'none';
    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    // Hide map panel, coordinate strip, expand video panel
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');
    if (mapPanel) mapPanel.style.display = 'none';
    if (videoPanel) {
      videoPanel.classList.remove('col-lg-8');
      videoPanel.classList.add('col-12');
    }
    if (coordStripContainer) coordStripContainer.style.display = 'none';
  }

  showNoStream() {
    console.log('State: NO_STREAM');

    // Show placeholder elements
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    if (placeholderTitle) placeholderTitle.style.display = 'block';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'inline-block';

    // Hide all error messages and connection states
    const connectingDetails = document.getElementById('connectingDetails');
    const noStreamDetails = document.getElementById('noStreamDetails');
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    const roomFullDetails = document.getElementById('roomFullDetails');
    if (connectingDetails) connectingDetails.style.display = 'none';
    if (noStreamDetails) noStreamDetails.style.display = 'none';
    if (connectedNoStreamDetails) connectedNoStreamDetails.style.display = 'none';
    if (roomFullDetails) roomFullDetails.style.display = 'none';

    // Hide video, show placeholder
    this.remoteVideo.style.display = 'none';
    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    // Hide map panel, coordinate strip, expand video panel
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');
    if (mapPanel) mapPanel.style.display = 'none';
    if (videoPanel) {
      videoPanel.classList.remove('col-lg-8');
      videoPanel.classList.add('col-12');
    }
    if (coordStripContainer) coordStripContainer.style.display = 'none';
  }

  showAttemptingSignalling() {
    console.log('State: ATTEMPTING_SIGNALLING_CONNECTION');

    // Hide landing page elements
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    if (placeholderTitle) placeholderTitle.style.display = 'none';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'none';

    // Show connecting details
    const connectingDetails = document.getElementById('connectingDetails');
    const connectingRoomId = document.getElementById('connectingRoomId');
    const connectingRoomIdInline = document.getElementById('connectingRoomIdInline');
    const connectingTimeoutWarning = document.getElementById('connectingTimeoutWarning');

    if (connectingDetails && connectingRoomId && this.currentRoomId) {
      connectingRoomId.textContent = this.currentRoomId;
      if (connectingRoomIdInline) {
        connectingRoomIdInline.textContent = this.currentRoomId;
      }
      connectingDetails.style.display = 'block';

      // Show timeout warning if connection is taking longer than 5 seconds
      if (connectingTimeoutWarning) {
        const timeElapsed = this.timeSince(this.signallingConnectionStartTime);
        if (timeElapsed > 5000) {
          connectingTimeoutWarning.style.display = 'block';
        } else {
          connectingTimeoutWarning.style.display = 'none';
        }
      }
    }

    // Hide other messages
    const noStreamDetails = document.getElementById('noStreamDetails');
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    const videoLoadingDetails = document.getElementById('videoLoadingDetails');
    const roomFullDetails = document.getElementById('roomFullDetails');
    if (noStreamDetails) noStreamDetails.style.display = 'none';
    if (connectedNoStreamDetails) connectedNoStreamDetails.style.display = 'none';
    if (videoLoadingDetails) videoLoadingDetails.style.display = 'none';
    if (roomFullDetails) roomFullDetails.style.display = 'none';

    // Hide video, show placeholder
    this.remoteVideo.style.display = 'none';
    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    // Hide map panel, coordinate strip, expand video panel
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');
    if (mapPanel) mapPanel.style.display = 'none';
    if (videoPanel) {
      videoPanel.classList.remove('col-lg-8');
      videoPanel.classList.add('col-12');
    }
    if (coordStripContainer) coordStripContainer.style.display = 'none';
  }

  showAttemptingStream() {
    console.log('State: ATTEMPTING_STREAM_CONNECTION');

    // Hide landing page, connecting state, and error states
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    const connectingDetails = document.getElementById('connectingDetails');
    const noStreamDetails = document.getElementById('noStreamDetails');
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    const roomFullDetails = document.getElementById('roomFullDetails');
    if (placeholderTitle) placeholderTitle.style.display = 'none';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'none';
    if (connectingDetails) connectingDetails.style.display = 'none';
    if (noStreamDetails) noStreamDetails.style.display = 'none';
    if (connectedNoStreamDetails) connectedNoStreamDetails.style.display = 'none';
    if (roomFullDetails) roomFullDetails.style.display = 'none';

    // Show video loading details
    const videoLoadingDetails = document.getElementById('videoLoadingDetails');
    const videoLoadingRoomId = document.getElementById('videoLoadingRoomId');
    if (videoLoadingDetails && videoLoadingRoomId && this.currentRoomId) {
      videoLoadingRoomId.textContent = this.currentRoomId;
      videoLoadingDetails.style.display = 'block';
    }

    // Hide video, show placeholder
    this.remoteVideo.style.display = 'none';
    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    // Hide map panel, coordinate strip, expand video panel
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');
    if (mapPanel) mapPanel.style.display = 'none';
    if (videoPanel) {
      videoPanel.classList.remove('col-lg-8');
      videoPanel.classList.add('col-12');
    }
    if (coordStripContainer) coordStripContainer.style.display = 'none';
  }

  showNoSignallingConnection() {
    console.log('State: NO_SIGNALLING_CONNECTION');

    // Hide landing page and connecting state
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    const connectingDetails = document.getElementById('connectingDetails');
    const videoLoadingDetails = document.getElementById('videoLoadingDetails');
    const roomFullDetails = document.getElementById('roomFullDetails');
    if (placeholderTitle) placeholderTitle.style.display = 'none';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'none';
    if (connectingDetails) connectingDetails.style.display = 'none';
    if (videoLoadingDetails) videoLoadingDetails.style.display = 'none';
    if (roomFullDetails) roomFullDetails.style.display = 'none';

    // Show connection failed details
    const noStreamDetails = document.getElementById('noStreamDetails');
    const attemptedRoomId = document.getElementById('attemptedRoomId');
    if (noStreamDetails && attemptedRoomId && this.currentRoomId) {
      attemptedRoomId.textContent = this.currentRoomId;
      noStreamDetails.style.display = 'block';
    }

    // Hide connected-no-stream warning
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    if (connectedNoStreamDetails) connectedNoStreamDetails.style.display = 'none';

    // Hide video, show placeholder
    this.remoteVideo.style.display = 'none';
    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    // Hide map panel, coordinate strip, expand video panel
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');
    if (mapPanel) mapPanel.style.display = 'none';
    if (videoPanel) {
      videoPanel.classList.remove('col-lg-8');
      videoPanel.classList.add('col-12');
    }
    if (coordStripContainer) coordStripContainer.style.display = 'none';
  }

  showNoStreamConnection() {
    console.log('State: NO_STREAM_CONNECTION');

    // Hide landing page, connecting state, and connection error
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    const connectingDetails = document.getElementById('connectingDetails');
    const videoLoadingDetails = document.getElementById('videoLoadingDetails');
    const noStreamDetails = document.getElementById('noStreamDetails');
    const roomFullDetails = document.getElementById('roomFullDetails');
    if (placeholderTitle) placeholderTitle.style.display = 'none';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'none';
    if (connectingDetails) connectingDetails.style.display = 'none';
    if (videoLoadingDetails) videoLoadingDetails.style.display = 'none';
    if (noStreamDetails) noStreamDetails.style.display = 'none';
    if (roomFullDetails) roomFullDetails.style.display = 'none';

    // Show connected-no-stream warning
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    const noDataRoomId = document.getElementById('noDataRoomId');
    if (connectedNoStreamDetails && noDataRoomId && this.currentRoomId) {
      noDataRoomId.textContent = this.currentRoomId;
      connectedNoStreamDetails.style.display = 'block';
    }

    // Make sure retry button is enabled
    const retryBtn = document.getElementById('connectedNoStreamRetryBtn');
    if (retryBtn) {
      retryBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Retry Connection';
      retryBtn.disabled = false;
    }

    // Hide video, show placeholder
    this.remoteVideo.style.display = 'none';
    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'flex';

    // Hide map panel, coordinate strip, expand video panel
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');
    if (mapPanel) mapPanel.style.display = 'none';
    if (videoPanel) {
      videoPanel.classList.remove('col-lg-8');
      videoPanel.classList.add('col-12');
    }
    if (coordStripContainer) coordStripContainer.style.display = 'none';
  }

  showStreaming() {
    console.log('State: STREAMING');

    // Hide all error messages and states
    const placeholderTitle = document.getElementById('placeholderTitle');
    const placeholderConnectBtn = document.getElementById('placeholderConnectBtn');
    const connectingDetails = document.getElementById('connectingDetails');
    const videoLoadingDetails = document.getElementById('videoLoadingDetails');
    const noStreamDetails = document.getElementById('noStreamDetails');
    const connectedNoStreamDetails = document.getElementById('connectedNoStreamDetails');
    const roomFullDetails = document.getElementById('roomFullDetails');
    if (placeholderTitle) placeholderTitle.style.display = 'none';
    if (placeholderConnectBtn) placeholderConnectBtn.style.display = 'none';
    if (connectingDetails) connectingDetails.style.display = 'none';
    if (videoLoadingDetails) videoLoadingDetails.style.display = 'none';
    if (noStreamDetails) noStreamDetails.style.display = 'none';
    if (connectedNoStreamDetails) connectedNoStreamDetails.style.display = 'none';
    if (roomFullDetails) roomFullDetails.style.display = 'none';

    // Show video or last frame canvas if it exists
    const lastFrameCanvas = document.getElementById('lastFrameCanvas');
    if (lastFrameCanvas) {
      // Show canvas with last frame, keep video hidden
      lastFrameCanvas.style.display = 'block';
      this.remoteVideo.style.display = 'none';
    } else {
      // Show live video
      this.remoteVideo.style.display = 'block';
    }

    const placeholder = this.videoContainer.querySelector('.placeholder');
    if (placeholder) placeholder.style.display = 'none';

    // Show map panel, coordinate strip, restore normal layout
    const mapPanel = document.getElementById('map-panel');
    const videoPanel = document.getElementById('video-panel');
    const coordStripContainer = document.getElementById('coordinateStripContainer');

    console.log('Map panel element:', mapPanel);
    console.log('Showing map panel');
    if (mapPanel) {
      mapPanel.style.display = '';  // Remove inline style to use CSS default (flex)
      console.log('Map panel display after setting:', mapPanel.style.display);
    }

    if (videoPanel) {
      videoPanel.classList.remove('col-12');
      // Ensure the original column class is present
      if (!videoPanel.classList.contains('col-lg-8')) {
        videoPanel.classList.add('col-lg-8');
      }
      console.log('Removed col-12 from video panel, added col-lg-8');
    }

    if (coordStripContainer) {
      coordStripContainer.style.display = 'flex';
      console.log('Set coordinate strip to flex');
    }

    // Force map resize after showing
    if (window.droneMap && window.droneMap.map) {
      setTimeout(() => {
        console.log('Resizing map');
        window.droneMap.resize();
      }, 100);
    }
  }

  retryConnection() {
    console.log('Retrying connection to:', this.currentRoomId);

    // Clear existing peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear video srcObject to prevent spurious events
    if (this.remoteVideo.srcObject) {
      this.remoteVideo.srcObject = null;
    }

    // Reset state, timers, and stats tracking
    this.streamReceived = false;
    this.isRoomFull = false; // Reset room full flag on retry
    this.signallingConnectionStartTime = Date.now();
    this.streamingConnectionStartTime = null;
    this.lastBytesReceived = 0;
    this.lastStatsCheckTime = null;
    this.isReceivingData = false;

    // Rejoin the room from scratch to get fresh signaling and ICE candidates
    // This is important when network changes (e.g., switching WiFi)
    if (this.currentRoomId) {
      this.socket.emit("join-as-viewer", { roomId: this.currentRoomId });
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
      // Only show disconnected message if we were actually streaming
      if (this.wasStreaming && window.droneMap) {
        window.droneMap.setDisconnected(true);
      }
    });

    this.socket.on("joined-as-viewer", (data) => {
      console.log("Joined room as viewer:", data);
      this.currentRoomId = data.roomId;
      this.currentPublisherName = data.publisherName;
      this.updateRoomId(data.roomId);
      this.updateViewerList(data.viewers || []);
      this.leaveBtn.disabled = false;
      this.leaveBtnMobile.disabled = false;
      if (this.leaveBtnDesktop) {
        console.log('Enabling desktop leave button');
        this.leaveBtnDesktop.disabled = false;
      } else {
        console.warn('Desktop leave button not found!');
      }

      // Add to history
      this.addToHistory(data.roomId, data.publisherName);

      // Reset stream received flag
      this.streamReceived = false;

      if (data.hasPublisher) {
        // Start streaming connection timer
        this.streamingConnectionStartTime = Date.now();
        this.updateStatus("waiting", "Connecting to stream...");
        this.requestStream();
      } else {
        // No publisher - clear timers and show failure
        this.signallingConnectionStartTime = null;
        this.streamingConnectionStartTime = null;
        this.updateStatus("error", "Stream not found");
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
      // Only show disconnected message if we were actually streaming
      if (this.wasStreaming && window.droneMap) {
        window.droneMap.setDisconnected(true);
      }
    });

    this.socket.on("viewers-updated", (data) => {
      // data is now an array of viewer objects: [{name, email}, ...]
      this.updateViewerList(data);
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

      // If error is "No publisher available", show connection failed
      if (error.message === "No publisher available") {
        // Clear timeout timer and interval
        this.connectionAttemptStartTime = null;
        if (this.connectionTimeoutInterval) {
          clearInterval(this.connectionTimeoutInterval);
          this.connectionTimeoutInterval = null;
        }
        // Show connection failed
        this.showConnectionFailed();
      }

      // If error code is ROOM_FULL, show room full state
      if (error.code === "ROOM_FULL") {
        // Clear timeout timer and interval
        this.connectionAttemptStartTime = null;
        if (this.connectionTimeoutInterval) {
          clearInterval(this.connectionTimeoutInterval);
          this.connectionTimeoutInterval = null;
        }
        // Set room full flag and update UI state
        this.isRoomFull = true;
        this.updateUIState();
      }
    });
  }

  async joinRoom() {
    const roomId = this.roomIdInput.value.trim();
    if (!roomId) {
      alert("Please enter a stream ID");
      return;
    }

    // If already connected to a different room, reload page for clean state
    if (this.currentRoomId && this.currentRoomId !== roomId) {
      const url = new URL(window.location);
      // Remove old 'room' parameter for clean URLs
      url.searchParams.delete("room");
      url.searchParams.delete("r");
      url.searchParams.set("stream", roomId);
      window.location.href = url.toString();
      return;
    }

    // If currently in a room, leave it first (without reloading page)
    if (this.currentRoomId) {
      this.socket.emit("leave-room", { roomId: this.currentRoomId });
    }

    // Show viewer info dialog and wait for user input
    const viewerInfo = await this.showViewerInfoDialog();

    // Store viewer info for reconnection
    this.currentViewerInfo = {
      name: viewerInfo.name,
      email: viewerInfo.email
    };

    // Set stream ID and start signalling connection timer
    this.currentRoomId = roomId;
    this.isRoomFull = false; // Reset room full flag when joining new room
    this.signallingConnectionStartTime = Date.now();
    this.streamingConnectionStartTime = null; // Reset streaming timer

    this.updateStatus("connecting", "Joining...");
    this.socket.emit("join-as-viewer", {
      roomId,
      name: viewerInfo.name,
      email: viewerInfo.email
    });
  }

  switchToStream(streamId) {
    console.log('Switching to stream:', streamId);

    // Always reload page when switching streams for clean state
    const url = new URL(window.location);
    // Remove old 'room' parameter for clean URLs
    url.searchParams.delete("room");
    url.searchParams.delete("r");
    url.searchParams.set("stream", streamId);
    window.location.href = url.toString();
  }

  closeStream() {
    console.log('Closing stream');
    // Exit streaming view and clear room ID to return to NO_STREAM state
    this.isStreamOpen = false;
    this.currentRoomId = null;

    // Hide disconnect message
    if (window.hideDisconnectedMessage) {
      window.hideDisconnectedMessage();
    }

    // Let leaveRoom handle the rest
    this.leaveRoom();
  }

  leaveRoom() {
    if (this.currentRoomId) {
      this.socket.emit("leave-room", { roomId: this.currentRoomId });
    }

    // Clear state timers and stats tracking
    this.signallingConnectionStartTime = null;
    this.streamingConnectionStartTime = null;
    this.lastBytesReceived = 0;
    this.lastStatsCheckTime = null;
    this.isReceivingData = false;
    this.isStreamOpen = false; // Exit streaming view

    // Clear all state and UI (don't keep last frame on manual leave)
    this.cleanup(false);
    this.currentRoomId = null;
    this.currentPublisherName = null;
    this.wasStreaming = false; // Reset streaming flag
    this.streamReceived = false; // Reset stream received flag
    this.updateRoomId("Not connected");
    this.updateStatus("waiting", "Not streaming");
    this.updateViewerList([]);
    this.updateConnectionStatus("Not connected");

    this.leaveBtn.disabled = true;
    this.leaveBtnMobile.disabled = true;
    if (this.leaveBtnDesktop) this.leaveBtnDesktop.disabled = true;

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

    // Remove pointer cursor when no location data
    const coordStripContainer = document.getElementById("coordinateStripContainer");
    if (coordStripContainer) {
      coordStripContainer.style.cursor = "default";
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
    this.otherDrones = {};

    // Clear no-data timeout
    if (this.noDataTimeout) {
      clearTimeout(this.noDataTimeout);
      this.noDataTimeout = null;
    }

    // Update UI state
    this.updateUIState();

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

      // Mark that we've received a stream
      this.streamReceived = true;

      // Remove old canvas if exists
      const oldCanvas = document.getElementById('lastFrameCanvas');
      if (oldCanvas) {
        oldCanvas.remove();
      }

      this.remoteVideo.srcObject = event.streams[0];

      // Explicitly play the video
      this.remoteVideo.play().then(() => {
        console.log('Video play() succeeded');
      }).catch(err => {
        console.error('Video play() failed:', err);
      });

      this.updateStatus("connected", "Loading video...");
      this.updateConnectionStatus("Loading video...");

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
          // Note: wasStreaming will be set to true when we actually receive data

          // Start timeout to detect if no video data arrives
          if (this.noDataTimeout) clearTimeout(this.noDataTimeout);
          this.noDataTimeout = setTimeout(() => {
            console.log("No video data received within 10 seconds");
            this.updateUIState();
          }, 10000);

          // Update UI state
          this.updateUIState();
          break;
        case "disconnected":
          console.log("Peer connection disconnected, attempting reconnect...");
          this.updateStatus("connecting", "Reconnecting...");
          this.updateConnectionStatus("Reconnecting...");

          // Attempt to reconnect automatically
          setTimeout(() => {
            if (this.currentRoomId && this.peerConnection?.connectionState !== 'connected') {
              console.log("Attempting to reconnect after disconnect...");
              this.attemptReconnect();
            }
          }, 1000);
          break;
        case "failed":
          console.log("Peer connection failed, attempting reconnect...");
          this.updateStatus("connecting", "Reconnecting...");
          this.updateConnectionStatus("Reconnecting...");

          // Attempt to reconnect automatically
          setTimeout(() => {
            if (this.currentRoomId && this.peerConnection?.connectionState !== 'connected') {
              console.log("Attempting to reconnect after failure...");
              this.attemptReconnect();
            }
          }, 1000);
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
      if (channel.label === "telemetry_drone_data") this.setupOtherDronesChannel(channel);
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

  setupOtherDronesChannel(channel) {
    this.otherDronesChannel = channel;
    channel.onopen = () => console.log("Other drones data channel opened");
    channel.onmessage = (event) => {
      try {
        this.handleOtherDronesData(JSON.parse(event.data));
      } catch (error) {
        console.error("Error parsing other drones data:", error);
      }
    };
    channel.onclose = () => {
      console.log("Other drones channel closed");
      this.otherDrones = {};
      if (window.droneMap) {
        window.droneMap.clearOtherDrones();
      }
    };
  }

  handleOtherDronesData(data) {
    // Data is a JSON object with droneId keys mapping to DroneTelemetryData
    this.otherDrones = data;

    if (window.droneMap) {
      window.droneMap.updateOtherDrones(data);
    }
  }

  handleLocationData(data) {
    // Support both old LocationData format and new DroneTelemetryData format
    let locationData;
    let livestreamId = null;

    if (data.type === 'drone_telemetry') {
      // New DroneTelemetryData format
      const telemetryData = data;
      const droneLocation = telemetryData.state.drone_gps_location;
      const dronePose = telemetryData.state.drone_pose;

      if (!droneLocation || !dronePose) {
        console.warn('Telemetry data missing location or pose');
        return;
      }

      // Extract livestream ID if present
      livestreamId = telemetryData.livestream_id || null;

      locationData = {
        latitude: droneLocation.lat,
        longitude: droneLocation.lng,
        altitude_ahl: droneLocation.altitude_ahl_m,
        altitude_asl: droneLocation.altitude_asl_m,
        altitude_ellipsoid: droneLocation.altitude_ellipsoid_m,
        bearing: dronePose.yaw_deg,
        pitch: dronePose.pitch_deg,
        roll: dronePose.roll_deg,
        battery_percent: telemetryData.state?.misc?.battery_percent,
        timestamp: telemetryData.timestamp_epoch_ms
      };
    } else if (data.pose) {
      // Old LocationData format (backward compatibility)
      const { pose, lastGPSTime } = data;
      const { latitude, longitude, altitude_ahl, altitude_asl, bearing, pitch, roll } = pose;
      locationData = {
        latitude,
        longitude,
        altitude_ahl,
        altitude_asl,
        bearing,
        pitch,
        roll,
        timestamp: lastGPSTime
      };
    } else {
      console.error('Unknown location data format:', data);
      return;
    }

    this.currentLocation = locationData;
    this.lastCoordinateTime = Date.now();
    this.coordinateHistory.push({
      longitude: locationData.longitude,
      latitude: locationData.latitude,
      timestamp: locationData.timestamp
    });

    if (window.droneMap) {
      // Update livestream ID in map
      window.droneMap.currentLivestreamId = livestreamId;

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
      coordStrip.innerHTML = `<div id="coordTextDesktop">Waiting for location data...</div>`;
    }
  }

  updateLocationDisplay() {
    if (!this.currentLocation) return;
    const { latitude, longitude, altitude_ahl, altitude_asl, altitude_ellipsoid, bearing } = this.currentLocation;

    const altAhlText = altitude_ahl != null ? altitude_ahl.toFixed(1) + "m" : "N/A";

    // Show ASL if available, otherwise show Ellipsoid with GPS label
    let altSecondText, altSecondLabel;
    if (altitude_asl != null) {
      altSecondText = altitude_asl.toFixed(1) + "m";
      altSecondLabel = "🌊";  // Wave emoji for sea level
    } else if (altitude_ellipsoid != null) {
      altSecondText = altitude_ellipsoid.toFixed(1) + "m";
      altSecondLabel = "🛰️";  // Satellite for GPS/Ellipsoid
    } else {
      altSecondText = "N/A";
      altSecondLabel = "🌊";
    }

    // Format latitude/longitude with N/S/E/W
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    const latFormatted = `${Math.abs(latitude).toFixed(5)}°${latDir}`;
    const lonFormatted = `${Math.abs(longitude).toFixed(5)}°${lonDir}`;

    // Compact display for coordinate strip
    const compactText = `🌐 ${latFormatted},${lonFormatted}  ↑🏠 ${altAhlText}  ↑${altSecondLabel} ${altSecondText}  🧭${bearing.toFixed(0)}°`;

    // Detailed display for mobile sidebar
    const detailedText = `(${latitude.toFixed(6)}°, ${longitude.toFixed(6)}°) <strong>Altitude (home):</strong> ${altAhlText} <strong>Altitude (${altitude_asl != null ? 'sea' : 'GPS'}):</strong> ${altSecondText} <strong>Bearing:</strong> ${bearing.toFixed(1)}°`;

    // Update mobile display (in sidebar)
    const coordTextMobile = document.getElementById("coordTextMobile");
    if (coordTextMobile) {
      coordTextMobile.innerHTML = detailedText;
    }

    // Update desktop coordinate strip (compact format)
    const coordTextDesktop = document.getElementById("coordTextDesktop");
    if (coordTextDesktop) {
      coordTextDesktop.innerHTML = compactText;
    }

    // Enable pointer cursor when we have location data
    const coordStripContainer = document.getElementById("coordinateStripContainer");
    if (coordStripContainer) {
      coordStripContainer.style.cursor = "pointer";
    }
  }

  copyCoordinates(coordinates) {
    navigator.clipboard.writeText(coordinates).then(() => {
      console.log('Coordinates copied to clipboard:', coordinates);
      this.showCopyToast();
    }).catch(err => {
      console.error('Failed to copy coordinates:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = coordinates;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showCopyToast();
    });
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
    if (this.otherDronesChannel) this.otherDronesChannel.close();
    if (this.peerConnection) this.peerConnection.close();
    if (this.resolutionMonitor) clearInterval(this.resolutionMonitor);
    this.stopStaleDataCheck();

    this.remoteVideo.srcObject = null;

    // Keep location data and map state on disconnect (unless explicitly cleared)
    this.lastCoordinateTime = null;
    this.otherDrones = {};
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
      // Remove old 'room' parameter for clean URLs
      url.searchParams.delete("room");
      url.searchParams.delete("r");
      url.searchParams.set("stream", roomId);
      window.history.replaceState({}, document.title, url);
    }
  }

  updateConnectionStatus(status) {
    document.getElementById("connectionStatus").textContent = status;
  }

  updateViewerList(viewerList) {
    // viewerList is an array of {name: String | undefined, email: String | undefined}
    this.viewerList = viewerList || [];
    console.log('Viewer list updated:', this.viewerList);
    const count = this.viewerList.length;
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
      // Clear datalist
      const datalist = document.getElementById('streamHistoryDatalist');
      if (datalist) datalist.innerHTML = '';
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
                  title="Connect to ${item.name}"
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

    // Update datalist for autocomplete in modal
    const datalist = document.getElementById('streamHistoryDatalist');
    if (datalist) {
      datalist.innerHTML = history.map(item =>
        `<option value="${item.roomId}">${item.name}</option>`
      ).join('');
    }
  }

  renderHistoryMobile(history) {
    if (history.length === 0) {
      this.historyListMobile.innerHTML = '<div class="text-muted text-center">No recent streams</div>';
      // Clear datalist
      const datalist = document.getElementById('streamHistoryDatalist');
      if (datalist) datalist.innerHTML = '';
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
                  title="Connect to ${item.name}"
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

    // Update datalist for autocomplete in modal
    const datalist = document.getElementById('streamHistoryDatalist');
    if (datalist) {
      datalist.innerHTML = history.map(item =>
        `<option value="${item.roomId}">${item.name}</option>`
      ).join('');
    }
  }

  joinFromHistory(roomId) {
    // Always reload page when joining from history for clean state
    const url = new URL(window.location);
    // Remove old 'room' parameter for clean URLs
    url.searchParams.delete("room");
    url.searchParams.delete("r");
    url.searchParams.set("stream", roomId);
    window.location.href = url.toString();
  }

  showViewerInfoDialog() {
    return new Promise((resolve) => {
      const dialog = document.getElementById('viewerInfoDialog');
      const form = document.getElementById('viewerInfoForm');
      const nameInput = document.getElementById('viewerNameInput');
      const emailInput = document.getElementById('viewerEmailInput');

      if (!dialog || !form || !nameInput || !emailInput) {
        // If dialog elements not found, resolve with empty values
        resolve({ name: undefined, email: undefined });
        return;
      }

      // Load saved viewer info from localStorage
      try {
        const savedInfo = localStorage.getItem('viewerInfo');
        if (savedInfo) {
          const { name, email } = JSON.parse(savedInfo);
          nameInput.value = name || '';
          emailInput.value = email || '';
        } else {
          nameInput.value = '';
          emailInput.value = '';
        }
      } catch (e) {
        console.error('Failed to load viewer info from localStorage:', e);
        nameInput.value = '';
        emailInput.value = '';
      }

      // Show dialog
      dialog.style.display = 'flex';

      // Focus on name input
      setTimeout(() => nameInput.focus(), 100);

      // Handle form submit
      const handleSubmit = (e) => {
        e.preventDefault();

        // Check if fields have values (empty fields are optional)
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();

        // Only validate if fields have values
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        // Save to localStorage for next time
        try {
          localStorage.setItem('viewerInfo', JSON.stringify({
            name: name || undefined,
            email: email || undefined
          }));
        } catch (e) {
          console.error('Failed to save viewer info to localStorage:', e);
        }

        // Hide dialog
        dialog.style.display = 'none';

        // Send null/undefined for empty or whitespace-only values
        resolve({
          name: name || undefined,
          email: email || undefined
        });

        // Clean up event listener
        form.removeEventListener('submit', handleSubmit);
      };

      form.addEventListener('submit', handleSubmit);
    });
  }

  showViewerListDialog() {
    const dialog = document.getElementById('viewerListDialog');
    if (!dialog) return;

    // Populate viewer list
    const listContainer = document.getElementById('viewerListContainer');
    if (!listContainer) return;

    console.log('Showing viewer list dialog. Current viewers:', JSON.stringify(this.viewerList));

    if (this.viewerList.length === 0) {
      listContainer.innerHTML = '<div class="text-muted text-center">No viewers</div>';
    } else {
      listContainer.innerHTML = this.viewerList.map((viewer) => {
        console.log('Processing viewer:', JSON.stringify(viewer));
        const name = viewer.name || 'Anonymous';
        const email = viewer.email || '';
        const emailText = email ? `<div class="text-muted small">${email}</div>` : '';

        return `
          <div class="viewer-item" style="padding: 12px; border-bottom: 1px solid #444;">
            <div style="font-weight: 500;">${name}</div>
            ${emailText}
          </div>
        `;
      }).join('');
    }

    dialog.style.display = 'flex';
  }

  hideViewerListDialog() {
    const dialog = document.getElementById('viewerListDialog');
    if (dialog) {
      dialog.style.display = 'none';
    }
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
  window.viewer = viewer; // Expose globally for coordinate dialog

  // Set initial UI state (will show landing page)
  viewer.updateUIState();
});
