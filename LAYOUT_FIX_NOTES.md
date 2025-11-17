# Layout Fix Notes - Portrait/Landscape Switching

## Key Changes Made

### 1. Aspect Ratio Breakpoint
- **Changed from**: `1:1` (aspect ratio >= 1.0 for landscape)
- **Changed to**: `13/10` (1.3:1) - aspect ratio >= 1.3 for landscape
- **Portrait mode**: `@media (max-aspect-ratio: 13/10)` - activates when aspect ratio < 1.3
- **Landscape mode**: `@media (min-aspect-ratio: 13/10)` - activates when aspect ratio >= 1.3

### 2. Landscape Layout CSS
```css
@media (min-aspect-ratio: 13/10) {
  #video-panel {
    flex: 0 0 60%;
    height: 100%;
    max-width: 60%;
  }
  #map-panel {
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  #map {
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  /* Prevent video from taking full width even with full-view class */
  #video-panel.full-view {
    flex: 0 0 60% !important;
    max-width: 60% !important;
  }
}
```

### 3. Portrait Layout CSS
```css
@media (max-aspect-ratio: 13/10) {
  #video-panel {
    flex: 0 0 auto;
    width: 100%;
    aspect-ratio: 16 / 9;
    max-height: 70%;
  }
  #map-panel {
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
  }
  #map {
    width: 100%;
    height: 100%;
  }
}
```

### 4. JavaScript Changes in livestream.html

#### setViewMode() function - split mode handling:
- Check if streaming: `const isStreaming = window.viewer && window.viewer.getState && window.viewer.getState() === 'STREAMING';`
- Only show map if streaming
- Set `data-split-mode` attribute when streaming
- Call `map.invalidateSize()` twice with delays (100ms and 300ms) for landscape rendering

#### ensureMapVisibleInSplitMode() function:
- Only shows map when streaming
- Sets `data-split-mode` attribute
- Multiple `invalidateSize()` calls for proper Leaflet rendering

### 5. JavaScript Changes in client.js

#### showStreaming() function:
- Checks if in split mode: `const splitViewRadio = document.getElementById('split-view') || document.getElementById('split-view-mobile');`
- Sets `data-split-mode` attribute when in split mode
- Uses `display: flex !important` for landscape visibility
- Calls `map.invalidateSize()` twice (100ms and 300ms delays)
- Sets explicit visibility/opacity on map container

#### Functions that hide map (showNoStream, showRoomFull, etc.):
- Check for `data-split-mode` AND streaming state before hiding
- Only hide if: `!mapPanel.hasAttribute('data-force-show') && !(mapPanel.hasAttribute('data-split-mode') && isStreaming)`

## What Worked
- Portrait/landscape switching at 1.3:1 aspect ratio
- Video sizing correctly in both modes
- Map showing in portrait mode

## What Didn't Work
- Map not showing in landscape mode (even with all the fixes)
- Map showing when not streaming (fixed by checking streaming state)

## Next Steps
- Revert to last commit (4ecd98f)
- Re-implement layout fixes while ensuring map visibility in landscape
- May need to investigate Leaflet initialization timing or container dimensions

