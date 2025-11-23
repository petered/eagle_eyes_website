/**
 * Analytics Tracking for Livestream Viewer
 * Tracks viewer interactions only (not publisher)
 */

class LivestreamAnalytics {
  constructor() {
    console.log('[Analytics] Constructor called');
    this.endpoint = 'https://script.google.com/macros/s/AKfycbz1ei8BC0EN5JMoYfFn-LIw5OeVTmL1UYME_wPTYWqIM3fdpCW-A8bekxngDG5FE1yX/exec';
    
    // Throttling: max 1 event per second
    this.lastSentTime = 0;
    this.throttleMs = 1000;
    this.pendingEvent = null;
    this.throttleTimer = null;
    
    // Heartbeat batching for low-priority events
    this.heartbeatInterval = null;
    this.heartbeatQueue = [];
    this.heartbeatIntervalMs = 10000; // 10 seconds
    
    // Session tracking
    this.sessionId = this.generateSessionId();
    this.viewStartTime = null;
    this.viewDurationMs = 0;
    this.lastHeartbeatTime = Date.now();
    
    // State tracking
    this.currentLivestreamId = null;
    this.currentViewerId = this.generateViewerId();
    this.currentViewerName = null;
    this.currentViewerEmail = null;
    this.currentViewMode = 'split';
    this.currentBaseMap = null;
    this.currentAirspaceLayers = [];
    this.currentCaltopoLayers = [];
    this.viewModeStartTime = Date.now();
    this.baseMapStartTime = null;
    this.airspaceStartTime = null;
    this.caltopoStartTime = null;
    
    // Counters
    this.retryCount = 0;
    this.tryAgainCount = 0;
    this.photoPointsAdded = 0;
    this.photoPointsShared = 0;
    this.photoPointsDownloaded = 0;
    this.rulerUsed = false;
    this.rulerMeasurement = '';
    
    // Device detection
    this.deviceInfo = this.detectDevice();
    
    // Start heartbeat
    this.startHeartbeat();
    
    console.log('[Analytics] Analytics initialized');
  }
  
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateViewerId() {
    // Try to get from localStorage, or generate new one
    let viewerId = localStorage.getItem('eagle_eyes_viewer_id');
    if (!viewerId) {
      viewerId = 'viewer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eagle_eyes_viewer_id', viewerId);
    }
    return viewerId;
  }
  
  detectDevice() {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\b(?!Mobile)\w{2,})/i.test(ua) || 
                     (window.innerWidth >= 768 && window.innerWidth <= 1024 && isMobile);
    const isPhone = isMobile && !isTablet;
    const isDesktop = !isMobile && !isTablet;
    
    // Browser detection
    let browserName = 'Unknown';
    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) browserName = 'Chrome';
    else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browserName = 'Safari';
    else if (ua.indexOf('Firefox') > -1) browserName = 'Firefox';
    else if (ua.indexOf('Edg') > -1) browserName = 'Edge';
    else if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) browserName = 'Opera';
    
    return {
      type: isMobile ? (isPhone ? 'phone' : 'tablet') : 'desktop',
      category: isMobile ? 'mobile' : (isTablet ? 'tablet' : 'desktop'),
      isPhone,
      isTablet,
      isDesktop,
      browserName,
      userAgent: ua,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
  }
  
  getTimestampISO() {
    return new Date().toISOString();
  }
  
  getTimestampPacific() {
    try {
      const date = new Date();
      
      // Format date in Pacific timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Get the formatted parts
      const parts = formatter.formatToParts(date);
      
      // Extract date/time components
      const year = parts.find(p => p.type === 'year').value;
      const month = parts.find(p => p.type === 'month').value;
      const day = parts.find(p => p.type === 'day').value;
      const hour = parts.find(p => p.type === 'hour').value;
      const minute = parts.find(p => p.type === 'minute').value;
      const second = parts.find(p => p.type === 'second').value;
      
      // Get timezone abbreviation (PST or PDT)
      const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        timeZoneName: 'short'
      });
      
      const tzParts = tzFormatter.formatToParts(date);
      const tzAbbr = tzParts.find(p => p.type === 'timeZoneName').value;
      
      // Return formatted string: "YYYY-MM-DD HH:MM:SS TZ"
      return `${year}-${month}-${day} ${hour}:${minute}:${second} ${tzAbbr}`;
    } catch (err) {
      console.error('[Analytics] Error in getTimestampPacific:', err);
      // Fallback to ISO string if Pacific time formatting fails
      return new Date().toISOString();
    }
  }
  
  getPagePath() {
    return window.location.pathname + window.location.search;
  }
  
  // Get country/region from IP (placeholder - would need geolocation service)
  async getViewerLocation() {
    // In a real implementation, you'd call a geolocation service
    // For now, return empty strings as per requirements
    return { country: '', region: '' };
  }
  
  // Throttled send - ensures max 1 event per second
  sendEventThrottled(eventData) {
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    
    console.log('[Analytics] sendEventThrottled called:', {
      event_type: eventData.event_type,
      timeSinceLastSend,
      throttleMs: this.throttleMs,
      canSendImmediately: timeSinceLastSend >= this.throttleMs
    });
    
    if (timeSinceLastSend >= this.throttleMs) {
      // Can send immediately
      console.log('[Analytics] Sending immediately (no throttle)');
      this.sendEvent(eventData);
      this.lastSentTime = now;
      this.pendingEvent = null;
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
        this.throttleTimer = null;
      }
    } else {
      // Queue for later (replace any pending event)
      console.log('[Analytics] Throttling - queuing event, delay:', this.throttleMs - timeSinceLastSend, 'ms');
      this.pendingEvent = eventData;
      if (!this.throttleTimer) {
        const delay = this.throttleMs - timeSinceLastSend;
        this.throttleTimer = setTimeout(() => {
          console.log('[Analytics] Throttle timer fired, sending queued event');
          if (this.pendingEvent) {
            this.sendEvent(this.pendingEvent);
            this.lastSentTime = Date.now();
            this.pendingEvent = null;
          }
          this.throttleTimer = null;
        }, delay);
      }
    }
  }
  
  // Queue low-priority event for heartbeat batching
  queueForHeartbeat(eventData) {
    this.heartbeatQueue.push(eventData);
  }
  
  // Send event immediately (for high-priority events)
  sendEvent(eventData) {
    try {
      console.log('[Analytics] sendEvent triggered for:', eventData.event_type);
      // Build complete payload with all required fields
      const payload = {
      timestamp_iso: this.getTimestampISO(),
      timestamp_pacific: this.getTimestampPacific(),
      origin: window.location.origin,
      event_type: eventData.event_type || '',
      livestream_id: eventData.livestream_id || this.currentLivestreamId || '',
      viewer_id: this.currentViewerId,
      viewer_name: eventData.viewer_name || this.currentViewerName || '',
      viewer_email: eventData.viewer_email || this.currentViewerEmail || '',
      viewer_country: eventData.viewer_country || '',
      viewer_region: eventData.viewer_region || '',
      publisher_country: eventData.publisher_country || '',
      publisher_region: eventData.publisher_region || '',
      session_id: this.sessionId,
      entry_method: eventData.entry_method || '',
      connection_success: eventData.connection_success || '',
      connection_failure_reason: eventData.connection_failure_reason || '',
      retry_count: eventData.retry_count !== undefined ? eventData.retry_count : this.retryCount,
      disconnect_reason: eventData.disconnect_reason || '',
      disconnected_at: eventData.disconnected_at || '',
      reconnected: eventData.reconnected || '',
      try_again_count: eventData.try_again_count !== undefined ? eventData.try_again_count : this.tryAgainCount,
      stream_closed: eventData.stream_closed || '',
      view_duration_ms: eventData.view_duration_ms !== undefined ? eventData.view_duration_ms : this.viewDurationMs,
      viewer_count: eventData.viewer_count !== undefined ? eventData.viewer_count : '',
      view_mode: eventData.view_mode || this.currentViewMode,
      view_mode_duration_ms: eventData.view_mode_duration_ms || '',
      base_map_layer: eventData.base_map_layer || this.currentBaseMap || '',
      base_map_layer_duration_ms: eventData.base_map_layer_duration_ms || '',
      airspace_layer: eventData.airspace_layer || '',
      airspace_layer_duration_ms: eventData.airspace_layer_duration_ms || '',
      caltopo_layer: eventData.caltopo_layer || '',
      caltopo_layer_duration_ms: eventData.caltopo_layer_duration_ms || '',
      ruler_used: eventData.ruler_used || (this.rulerUsed ? 'true' : 'false'),
      ruler_measurement: eventData.ruler_measurement || this.rulerMeasurement,
      photo_points_added: eventData.photo_points_added !== undefined ? eventData.photo_points_added : this.photoPointsAdded,
      photo_points_shared: eventData.photo_points_shared !== undefined ? eventData.photo_points_shared : this.photoPointsShared,
      photo_points_downloaded: eventData.photo_points_downloaded !== undefined ? eventData.photo_points_downloaded : this.photoPointsDownloaded,
      device_type: this.deviceInfo.type,
      device_category: this.deviceInfo.category,
      browser_name: this.deviceInfo.browserName,
      page_path: this.getPagePath(),
      user_agent: this.deviceInfo.userAgent,
      details: eventData.details || ''
    };
    
      // Send POST request
      console.log('[Analytics] Sending POST request to:', this.endpoint);
      console.log('[Analytics] Payload:', JSON.stringify(payload, null, 2));
      fetch(this.endpoint, {
        method: 'POST',
        mode: 'no-cors', // Google Apps Script doesn't support CORS
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).then(() => {
        console.log('[Analytics] POST request sent successfully');
      }).catch(err => {
        console.error('[Analytics] POST request failed:', err);
        // Silently fail - don't affect user experience
      });
    } catch (err) {
      console.error('[Analytics] Error in sendEvent:', err);
      console.error('[Analytics] Error stack:', err.stack);
    }
  }
  
  // Main tracking function
  trackEvent(eventData, priority = 'normal') {
    console.log('[Analytics] trackEvent called:', eventData.event_type, 'priority:', priority);
    if (priority === 'low') {
      // Queue for heartbeat batching
      this.queueForHeartbeat(eventData);
    } else {
      // Send immediately with throttling
      this.sendEventThrottled(eventData);
    }
  }
  
  // Heartbeat - sends queued low-priority events and updates view duration
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      // Update view duration if streaming
      if (this.viewStartTime) {
        this.viewDurationMs = now - this.viewStartTime;
      }
      
      // Update durations for layers/view modes
      if (this.viewModeStartTime) {
        const viewModeDuration = now - this.viewModeStartTime;
        // This will be included in next heartbeat event
      }
      
      // Send all queued low-priority events in one batch
      if (this.heartbeatQueue.length > 0) {
        // Merge all queued events into one
        const mergedEvent = {
          event_type: 'heartbeat_batch',
          view_duration_ms: this.viewDurationMs,
          view_mode: this.currentViewMode,
          base_map_layer: this.currentBaseMap || '',
          ...this.heartbeatQueue.reduce((acc, evt) => ({ ...acc, ...evt }), {})
        };
        
        this.sendEventThrottled(mergedEvent);
        this.heartbeatQueue = [];
      } else if (this.viewStartTime) {
        // Send heartbeat even if no queued events (to track duration)
        this.sendEventThrottled({
          event_type: 'heartbeat',
          view_duration_ms: this.viewDurationMs
        });
      }
      
      this.lastHeartbeatTime = now;
    }, this.heartbeatIntervalMs);
  }
  
  // Update state tracking
  setLivestreamId(id) {
    this.currentLivestreamId = id;
  }
  
  setViewerInfo(name, email) {
    this.currentViewerName = name || '';
    this.currentViewerEmail = email || '';
  }
  
  startViewing() {
    this.viewStartTime = Date.now();
    this.viewDurationMs = 0;
  }
  
  stopViewing() {
    if (this.viewStartTime) {
      this.viewDurationMs = Date.now() - this.viewStartTime;
      this.viewStartTime = null;
    }
  }
  
  setViewMode(mode) {
    const now = Date.now();
    if (this.viewModeStartTime) {
      // Calculate duration for previous mode
      const duration = now - this.viewModeStartTime;
      // Queue view mode change for heartbeat
      this.queueForHeartbeat({
        event_type: 'view_mode_change',
        view_mode: this.currentViewMode,
        view_mode_duration_ms: duration
      });
    }
    this.currentViewMode = mode;
    this.viewModeStartTime = now;
  }
  
  setBaseMap(layerName) {
    const now = Date.now();
    if (this.baseMapStartTime && this.currentBaseMap) {
      const duration = now - this.baseMapStartTime;
      this.queueForHeartbeat({
        event_type: 'base_map_change',
        base_map_layer: this.currentBaseMap,
        base_map_layer_duration_ms: duration
      });
    }
    this.currentBaseMap = layerName;
    this.baseMapStartTime = now;
  }
  
  incrementRetry() {
    this.retryCount++;
  }
  
  incrementTryAgain() {
    this.tryAgainCount++;
  }
  
  incrementPhotoPoint() {
    this.photoPointsAdded++;
  }
  
  incrementPhotoPointShared() {
    this.photoPointsShared++;
  }
  
  incrementPhotoPointDownloaded() {
    this.photoPointsDownloaded++;
  }
  
  setRulerUsed(used, measurement = '') {
    this.rulerUsed = used;
    if (measurement) {
      this.rulerMeasurement = measurement;
    }
  }
  
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }
  }
}

// Global instance
let livestreamAnalytics = null;

// Initialize on page load
if (typeof window !== 'undefined') {
  try {
    // Initialize immediately if DOM is already loaded, otherwise wait
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        try {
          console.log('[Analytics] DOMContentLoaded - initializing analytics');
          livestreamAnalytics = new LivestreamAnalytics();
          window.livestreamAnalytics = livestreamAnalytics;
          
          // Fire page_visit event immediately
          if (window.livestreamAnalytics) {
            console.log('[Analytics] Firing page_visit event');
            window.livestreamAnalytics.trackEvent({
              event_type: 'page_visit'
            }, 'normal');
          }
        } catch (err) {
          console.error('[Analytics] Error during initialization:', err);
        }
      });
    } else {
      // DOM already loaded, initialize immediately
      try {
        console.log('[Analytics] DOM already loaded - initializing analytics immediately');
        livestreamAnalytics = new LivestreamAnalytics();
        window.livestreamAnalytics = livestreamAnalytics;
        
        // Fire page_visit event immediately
        if (window.livestreamAnalytics) {
          console.log('[Analytics] Firing page_visit event');
          window.livestreamAnalytics.trackEvent({
            event_type: 'page_visit'
          }, 'normal');
        }
      } catch (err) {
        console.error('[Analytics] Error during immediate initialization:', err);
      }
    }
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (livestreamAnalytics) {
        livestreamAnalytics.cleanup();
      }
    });
  } catch (err) {
    console.error('[Analytics] Fatal error setting up analytics:', err);
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LivestreamAnalytics;
}

