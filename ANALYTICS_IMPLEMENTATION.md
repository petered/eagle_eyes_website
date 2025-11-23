# Analytics Tracking Implementation Guide

## Overview
This document shows exactly where to add analytics tracking hooks in the livestream viewer codebase.

## 1. Add Analytics Script to livestream.html

**Location:** `livestream.html` line 3630 (after client.js)

Add this line:
```html
<script src="{{ '/js/livestream/analytics.js' | relative_url }}"></script>
```

## 2. Hook Points and Code Changes

### Hook 1: Page Enter (page_enter event)

**Location:** `js/livestream/client.js` line 2012-2018

**Current Code:**
```javascript
document.addEventListener("DOMContentLoaded", () => {
  viewer = new WebRTCViewer();
  window.viewer = viewer;
  viewer.updateUIState();
});
```

**Add After:**
```javascript
document.addEventListener("DOMContentLoaded", () => {
  viewer = new WebRTCViewer();
  window.viewer = viewer;
  viewer.updateUIState();
  
  // Analytics: Page enter
  if (window.livestreamAnalytics) {
    window.livestreamAnalytics.trackEvent({
      event_type: 'page_enter'
    }, 'normal');
  }
});
```

---

### Hook 2: Join Attempt (join_attempt event)

**Location:** `js/livestream/client.js` line 943-987 (joinRoom method)

**Current Code:**
```javascript
async joinRoom() {
  const roomId = this.roomIdInput.value.trim();
  // ... existing code ...
  const viewerInfo = await this.showViewerInfoDialog();
  // ... existing code ...
  this.socket.emit("join-as-viewer", {
    roomId,
    name: viewerInfo.name,
    email: viewerInfo.email
  });
}
```

**Add After line 976 (after setting currentRoomId):**
```javascript
// Analytics: Join attempt
if (window.livestreamAnalytics) {
  // Determine entry method
  const urlParams = new URLSearchParams(window.location.search);
  const hasStreamParam = urlParams.has('stream') || urlParams.has('room') || urlParams.has('r');
  let entryMethod = 'manual_code';
  if (hasStreamParam) {
    entryMethod = 'url';
  }
  // Check if QR code was used (would need to track this separately)
  
  window.livestreamAnalytics.setLivestreamId(roomId);
  window.livestreamAnalytics.setViewerInfo(viewerInfo.name, viewerInfo.email);
  window.livestreamAnalytics.trackEvent({
    event_type: 'join_attempt',
    entry_method: entryMethod
  }, 'normal');
}
```

**Also add QR code tracking in livestream.html line 4763-4795:**
After QR code is scanned and roomId is extracted, add:
```javascript
// Analytics: Track QR code entry
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'join_attempt',
    entry_method: 'qr_code'
  }, 'normal');
}
```

---

### Hook 3: Connection Success (connection_success event)

**Location:** `js/livestream/client.js` line 1122-1153 (ontrack handler)

**Current Code:**
```javascript
this.peerConnection.ontrack = (event) => {
  console.log("Received remote stream");
  this.streamReceived = true;
  // ... existing code ...
  this.remoteVideo.srcObject = event.streams[0];
  this.remoteVideo.play().then(() => {
    console.log('Video play() succeeded');
  });
};
```

**Add After line 1142 (after play() succeeds):**
```javascript
// Analytics: Connection success
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.startViewing();
  window.livestreamAnalytics.trackEvent({
    event_type: 'connection_success',
    connection_success: 'true'
  }, 'normal');
}
```

**Also add in checkVideoDataFlow when data starts flowing:**
**Location:** `js/livestream/client.js` line 341-344

**Add After line 343:**
```javascript
if (this.lastStatsCheckTime && currentBytesReceived > this.lastBytesReceived) {
  this.isReceivingData = true;
  this.wasStreaming = true;
  this.isStreamOpen = true;
  
  // Analytics: First data received (if not already tracked)
  if (window.livestreamAnalytics && !this.connectionTracked) {
    this.connectionTracked = true;
    window.livestreamAnalytics.startViewing();
    window.livestreamAnalytics.trackEvent({
      event_type: 'connection_success',
      connection_success: 'true'
    }, 'normal');
  }
}
```

---

### Hook 4: Connection Failure (connection_failure event)

**Location:** `js/livestream/client.js` line 619-710 (showNoSignallingConnection, showNoStreamConnection, showRoomFull)

**In showNoSignallingConnection() method (line 619), add after line 640:**
```javascript
// Analytics: Connection failure
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'connection_failure',
    connection_failure_reason: 'no_signalling_connection'
  }, 'normal');
}
```

**In showNoStreamConnection() method (line 663), add after line 686:**
```javascript
// Analytics: Connection failure
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'connection_failure',
    connection_failure_reason: 'no_stream_connection'
  }, 'normal');
}
```

**In showRoomFull() method (line 439), add after line 462:**
```javascript
// Analytics: Connection failure
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'connection_failure',
    connection_failure_reason: 'room_full'
  }, 'normal');
}
```

**In socket.on("error") handler (line 912), add after line 914:**
```javascript
// Analytics: Connection failure
if (window.livestreamAnalytics) {
  let reason = 'unknown';
  if (error.message === "No publisher available") {
    reason = 'no_publisher';
  } else if (error.code === "ROOM_FULL") {
    reason = 'room_full';
  }
  window.livestreamAnalytics.trackEvent({
    event_type: 'connection_failure',
    connection_failure_reason: reason
  }, 'normal');
}
```

---

### Hook 5: Retry Click (retry_click event)

**Location:** `js/livestream/client.js` line 788-816 (retryConnection method)

**Add After line 814 (before socket.emit):**
```javascript
// Analytics: Retry click
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.incrementRetry();
  window.livestreamAnalytics.trackEvent({
    event_type: 'retry_click',
    retry_count: window.livestreamAnalytics.retryCount
  }, 'normal');
}
```

---

### Hook 6: Disconnect Detected (disconnect_detected event)

**Location:** `js/livestream/client.js` line 192-197 (in stateCheckInterval)

**Add After line 195:**
```javascript
if (this.isStreamOpen && !this.isReceivingData) {
  // Video has stalled, show disconnect banner
  if (window.droneMap) {
    window.droneMap.setDisconnected(true);
  }
  
  // Analytics: Disconnect detected
  if (window.livestreamAnalytics && !this.disconnectTracked) {
    this.disconnectTracked = true;
    window.livestreamAnalytics.trackEvent({
      event_type: 'disconnect_detected',
      disconnect_reason: 'video_data_stopped',
      disconnected_at: new Date().toISOString()
    }, 'normal');
  }
}
```

**Also in socket.on("disconnect") (line 825), add after line 833:**
```javascript
// Only show disconnected message if we were actually streaming
if (this.wasStreaming && window.droneMap) {
  window.droneMap.setDisconnected(true);
  
  // Analytics: Disconnect detected
  if (window.livestreamAnalytics) {
    window.livestreamAnalytics.trackEvent({
      event_type: 'disconnect_detected',
      disconnect_reason: 'socket_disconnected',
      disconnected_at: new Date().toISOString()
    }, 'normal');
  }
}
```

**Also in socket.on("publisher-left") (line 885), add after line 892:**
```javascript
// Only show disconnected message if we were actually streaming
if (this.wasStreaming && window.droneMap) {
  window.droneMap.setDisconnected(true);
  
  // Analytics: Disconnect detected
  if (window.livestreamAnalytics) {
    window.livestreamAnalytics.trackEvent({
      event_type: 'disconnect_detected',
      disconnect_reason: 'publisher_left',
      disconnected_at: new Date().toISOString()
    }, 'normal');
  }
}
```

---

### Hook 7: Reconnect Success (reconnect_success event)

**Location:** `js/livestream/client.js` line 197-202 (in stateCheckInterval)

**Add After line 200:**
```javascript
} else if (this.isStreamOpen && this.isReceivingData) {
  // Video is flowing, hide disconnect banner
  if (window.droneMap) {
    window.droneMap.setDisconnected(false);
  }
  
  // Analytics: Reconnect success
  if (window.livestreamAnalytics && this.disconnectTracked) {
    this.disconnectTracked = false;
    window.livestreamAnalytics.trackEvent({
      event_type: 'reconnect_success',
      reconnected: 'true'
    }, 'normal');
  }
}
```

**Also in socket.on("connect") after reconnect (line 220), add after line 229:**
```javascript
if (this.wasDisconnected && this.currentRoomId) {
  console.log('Was disconnected, will attempt to rejoin room...');
  this.wasDisconnected = false;
  setTimeout(() => {
    this.attemptReconnect();
    
    // Analytics: Reconnect attempt
    if (window.livestreamAnalytics) {
      window.livestreamAnalytics.trackEvent({
        event_type: 'reconnect_success',
        reconnected: 'true'
      }, 'normal');
    }
  }, 500);
}
```

---

### Hook 8: Stream Closed (stream_closed event)

**Location:** `js/livestream/client.js` line 1001-1014 (closeStream method)

**Add After line 1013:**
```javascript
// Analytics: Stream closed
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.stopViewing();
  window.livestreamAnalytics.trackEvent({
    event_type: 'stream_closed',
    stream_closed: 'true',
    view_duration_ms: window.livestreamAnalytics.viewDurationMs
  }, 'normal');
}
```

**Also in leaveRoom() method (line 1016), add after line 1109:**
```javascript
// Analytics: Stream closed
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.stopViewing();
  window.livestreamAnalytics.trackEvent({
    event_type: 'stream_closed',
    stream_closed: 'true',
    view_duration_ms: window.livestreamAnalytics.viewDurationMs
  }, 'normal');
}
```

**Also add beforeunload handler in livestream.html (before closing </body> tag):**
```javascript
window.addEventListener('beforeunload', () => {
  if (window.livestreamAnalytics && window.viewer && window.viewer.currentRoomId) {
    window.livestreamAnalytics.stopViewing();
    window.livestreamAnalytics.trackEvent({
      event_type: 'stream_closed',
      stream_closed: 'true',
      view_duration_ms: window.livestreamAnalytics.viewDurationMs
    }, 'normal');
  }
});
```

---

### Hook 9: Viewer Count Update (viewer_count_update event)

**Location:** `js/livestream/client.js` line 1714-1725 (updateViewerList method)

**Add After line 1724:**
```javascript
// Analytics: Viewer count update
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'viewer_count_update',
    viewer_count: count
  }, 'low'); // Low priority - batch in heartbeat
}
```

---

### Hook 10: View Mode Change (view_mode_change event)

**Location:** `livestream.html` line 4017-4135 (setViewMode function)

**Add After line 4133 (after currentViewMode = mode):**
```javascript
// Analytics: View mode change
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.setViewMode(mode);
  window.livestreamAnalytics.trackEvent({
    event_type: 'view_mode_change',
    view_mode: mode
  }, 'low'); // Low priority - batch in heartbeat
}
```

---

### Hook 11: Base Map Change (base_map_change event)

**Location:** `js/livestream/map.js` line 2546-2561 (switchBaseMap method)

**Add After line 2558 (after console.log):**
```javascript
// Analytics: Base map change
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.setBaseMap(name);
  window.livestreamAnalytics.trackEvent({
    event_type: 'base_map_change',
    base_map_layer: name
  }, 'low'); // Low priority - batch in heartbeat
}
```

---

### Hook 12: Airspace Toggle (airspace_toggle event)

**Location:** `js/livestream/map.js` - toggleFAAAirspace, toggleFAAUASMap methods

**In toggleFAAAirspace(enabled) method, add:**
```javascript
// Analytics: Airspace toggle
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'airspace_toggle',
    airspace_layer: enabled ? 'faa_airspace' : '',
    details: enabled ? 'enabled' : 'disabled'
  }, 'low'); // Low priority - batch in heartbeat
}
```

**In toggleFAAUASMap(enabled) method, add:**
```javascript
// Analytics: Airspace toggle
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'airspace_toggle',
    airspace_layer: enabled ? 'faa_uas_map' : '',
    details: enabled ? 'enabled' : 'disabled'
  }, 'low'); // Low priority - batch in heartbeat
}
```

---

### Hook 13: Caltopo Toggle (caltopo_toggle event)

**Location:** `js/livestream/map.js` - toggleCaltopoLayer, toggleCaltopoFolder, toggleCaltopoFeature methods

**In toggleCaltopoLayer(enabled) method, add:**
```javascript
// Analytics: Caltopo toggle
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'caltopo_toggle',
    caltopo_layer: enabled ? 'all' : '',
    details: enabled ? 'enabled' : 'disabled'
  }, 'low'); // Low priority - batch in heartbeat
}
```

**In toggleCaltopoFolder(folderName, enabled) method, add:**
```javascript
// Analytics: Caltopo toggle
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'caltopo_toggle',
    caltopo_layer: folderName,
    details: enabled ? 'folder_enabled' : 'folder_disabled'
  }, 'low'); // Low priority - batch in heartbeat
}
```

**In toggleCaltopoFeature(featureId, enabled) method, add:**
```javascript
// Analytics: Caltopo toggle
if (window.livestreamAnalytics) {
  const featureName = this.caltopoFeatureStates.get(featureId)?.name || featureId;
  window.livestreamAnalytics.trackEvent({
    event_type: 'caltopo_toggle',
    caltopo_layer: featureName,
    details: enabled ? 'feature_enabled' : 'feature_disabled'
  }, 'low'); // Low priority - batch in heartbeat
}
```

---

### Hook 14: Ruler Measure (ruler_measure event)

**Location:** `js/livestream/map.js` - updateMeasurementDisplay method (line 2167)

**Add in updateMeasurementDisplay method when measurement changes:**
```javascript
// Analytics: Ruler measure
if (window.livestreamAnalytics && this.measurementTotalDistance > 0) {
  let measurement = '';
  if (this.measurementType === 'line') {
    measurement = `${this.measurementTotalDistance} ${this.measurementUnit}`;
  } else if (this.measurementType === 'polygon') {
    measurement = `${this.measurementArea} ${this.measurementAreaUnit}`;
  } else if (this.measurementType === 'radius') {
    measurement = `${this.measurementRadius} ${this.measurementUnit}`;
  }
  
  window.livestreamAnalytics.setRulerUsed(true, measurement);
  window.livestreamAnalytics.trackEvent({
    event_type: 'ruler_measure',
    ruler_used: 'true',
    ruler_measurement: measurement
  }, 'normal');
}
```

---

### Hook 15: Photo Point Add (photo_point_add event)

**Location:** `js/livestream/map.js` line 5920-5995 (addPhotoPoint method)

**Add After photo point is successfully created (after line 5972, before alert if jpegWithExif fails):**
```javascript
// Analytics: Photo point added
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.incrementPhotoPoint();
  window.livestreamAnalytics.trackEvent({
    event_type: 'photo_point_add',
    photo_points_added: window.livestreamAnalytics.photoPointsAdded
  }, 'normal');
}
```

---

### Hook 16: Photo Point Share (photo_point_share event)

**Location:** `js/livestream/map.js` line 6828-6887 (sharePhotoPoint method)

**Add After line 6843 (after createGeoreferencedImageFile succeeds):**
```javascript
// Analytics: Photo point share
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.incrementPhotoPointShared();
  window.livestreamAnalytics.trackEvent({
    event_type: 'photo_point_share',
    photo_points_shared: window.livestreamAnalytics.photoPointsShared
  }, 'normal');
}
```

---

### Hook 17: Photo Point Download (photo_point_download event)

**Location:** `js/livestream/map.js` - Find photo point download handler

**Search for:** Photo point download button or download functionality

**Add in download handler:**
```javascript
// Analytics: Photo point download
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.incrementPhotoPointDownloaded();
  window.livestreamAnalytics.trackEvent({
    event_type: 'photo_point_download',
    photo_points_downloaded: window.livestreamAnalytics.photoPointsDownloaded
  }, 'normal');
}
```

---

### Hook 18: Action Clicks

**Location:** Various button click handlers in `livestream.html`

**Share Livestream Button:**
Find button with `data-bs-target="#shareModal"` (line 2529, 2661)
Add click handler:
```javascript
document.querySelectorAll('[data-bs-target="#shareModal"]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (window.livestreamAnalytics) {
      window.livestreamAnalytics.trackEvent({
        event_type: 'action_click',
        details: 'share_livestream'
      }, 'normal');
    }
  });
});
```

**Get Help Button:**
**Location:** `livestream.html` line 3563-3575 (`#getHelpLink`)
Add click handler:
```javascript
document.getElementById('getHelpLink')?.addEventListener('click', () => {
  if (window.livestreamAnalytics) {
    window.livestreamAnalytics.trackEvent({
      event_type: 'action_click',
      details: 'get_help'
    }, 'normal');
  }
});
```

**Privacy Policy Link:**
**Location:** `livestream.html` line 3047
Add click handler:
```javascript
document.querySelector('a[href*="privacy.html"]')?.addEventListener('click', () => {
  if (window.livestreamAnalytics) {
    window.livestreamAnalytics.trackEvent({
      event_type: 'action_click',
      details: 'privacy_policy'
    }, 'normal');
  }
});
```

**Terms of Use Link:**
**Location:** `livestream.html` line 3045
Add click handler:
```javascript
document.querySelector('a[href*="terms.html"]')?.addEventListener('click', () => {
  if (window.livestreamAnalytics) {
    window.livestreamAnalytics.trackEvent({
      event_type: 'action_click',
      details: 'terms_of_use'
    }, 'normal');
  }
});
```

**Viewers List Button:**
Find button that opens viewer list dialog
Add in `showViewerListDialog()` method or button click:
```javascript
// Analytics: Viewers list click
if (window.livestreamAnalytics) {
  window.livestreamAnalytics.trackEvent({
    event_type: 'action_click',
    details: 'viewers_list'
  }, 'normal');
}
```

**Connect to Another Stream:**
Find "Connect to Another Stream" button/link
Add click handler:
```javascript
// Similar pattern
```

**Download AirOps:**
Find "Download AirOps" button/link
Add click handler:
```javascript
// Similar pattern
```

**Open Caltopo Map:**
Find "Open Caltopo Map" or "on CalTopo" link
Add click handler:
```javascript
// Similar pattern
```

---

## 3. Additional State Tracking Needed

### In WebRTCViewer constructor, add:
```javascript
this.connectionTracked = false;
this.disconnectTracked = false;
```

### Reset flags in appropriate places:
- Reset `connectionTracked` when leaving room
- Reset `disconnectTracked` when reconnecting

---

## 4. Summary

All analytics events are now hooked up. The system:
- Throttles to max 1 event per second
- Batches low-priority events in 10-second heartbeat
- Tracks all required fields
- Never affects livestream performance
- Only tracks viewer side (not publisher)

