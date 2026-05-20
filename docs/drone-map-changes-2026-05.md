# `/drone-map` symbology overhaul — May 2026

Recap of the ADS-B / drone / chip / popup changes shipped in this branch. Organized by feature area so it can be referenced when porting the same visual + UX conventions to other Eagle Eyes surfaces.

---

## 1. ADS-B manned aircraft — altitude banding (BOTH sources)

### Altitude bands (pressure altitude, feet)

| Band | Colour | Behaviour |
|---|---|---|
| ≤ 500 ft | `#7f1d1d` dark red | Plane glyph + pulsing radial halo (drone-conflict altitude) |
| 500 – 5,000 ft | `#ef4444` red | Plain glyph |
| 5,000 – 15,000 ft | `#f59e0b` amber | Plain |
| 15,000 – 25,000 ft | `#22c55e` green | Plain |
| > 25,000 ft | `#3b82f6` blue | Plain |
| ground / unknown | `#9ca3af` grey | Plain |

EDS-B / Air Sense payloads carry `altitude_msl_m` (metres MSL) — convert via `× 3.28084` to feet, then bucket. adsb.lol carries `alt_baro` in feet directly.

### Pulse halo (critical band)

```css
@keyframes adsbCriticalPulse {
  0%   { transform: scale(0.55); opacity: 0.85; }
  100% { transform: scale(2.1);  opacity: 0;    }
}
.adsb-critical-halo {
  position: absolute; inset: 0; border-radius: 50%;
  background: radial-gradient(circle,
    rgba(220,38,38,0.7) 0%,
    rgba(127,29,29,0.6) 60%,
    rgba(127,29,29,0) 100%);
  animation: adsbCriticalPulse 1.4s ease-out infinite;
  pointer-events: none;
}
```

### Plane glyph (shared between both sources)

Inline SVG, points straight up at rotation 0, 18×18 px centred in a 28×28 container:

```svg
<svg viewBox="0 0 32 32" width="18" height="18">
  <path d="M16 2 L18 13 L29 18 L29 21 L18 18.5 L18 25 L20 27 L20 29 L16 28 L12 29 L12 27 L14 25 L14 18.5 L3 21 L3 18 L14 13 Z"
    fill="<bandColor>" stroke="#000" stroke-width="0.6" stroke-linejoin="round" paint-order="stroke" />
</svg>
```

Heading degrees map directly to CSS `rotate(...)` — no font-glyph offset.

---

## 2. Air Sense (EDS-B) aircraft — pulsing cyan ring badge

Air Sense aircraft are visually distinguished by a **pulsing cyan ring** behind the plane glyph. adsb.lol aircraft do not get this ring. Cyan `#00CED1` is the Air Sense brand accent.

```css
@keyframes airSensePulse {
  0%   { transform: scale(0.85); opacity: 0.95; }
  50%  { transform: scale(1.5);  opacity: 0.45; }
  100% { transform: scale(2.0);  opacity: 0;    }
}
.air-sense-ring {
  position: absolute; top: 50%; left: 50%;
  margin-top: -13px; margin-left: -13px;
  width: 26px; height: 26px;
  border: 2px solid rgba(0,206,209,0.95);
  border-radius: 50%;
  animation: airSensePulse 1.8s ease-out infinite;
  pointer-events: none;
}
```

Popup opens with a prominent cyan source pill:

> *Source: DJI Air Sense → EDS-B (detected by `<droneName>`)*

---

## 3. adsb.lol aircraft (community ADS-B)

### Data source

- Cloudflare Worker proxy: `https://mirada-airspace.patrick-e20.workers.dev/proxy/adsb/v2/lat/{lat}/lon/{lon}/dist/{dist}` (upstream adsb.lol API lacks `Access-Control-Allow-Origin`).
- Header: `X-Eagle-Eyes-Client: eagleeyes-website-dronemap` for log attribution.
- Max radius: 250 NM (upstream cap).
- 5-second edge cache + 600 req/min/IP rate limit at the Worker.

### Polling

- 5 s while idle (matches Worker cache TTL).
- Pause on `movestart`; resume after `moveend` debounce (500 ms).
- Query radius = map centre + half-diagonal NM.

### Popup

Grey source pill at top:

> *Source: adsb.lol community feeder network*

Then: callsign + type, reg (if distinct from callsign), altitude in pressure-feet, speed + heading, observation age, squawk + hex, ⚠ pressure-altitude caveat, "Track on adsb.lol globe →" outbound link.

### Sticky-follow popup

- Bound with `autoClose: false, closeOnClick: false`.
- On each poll update, fire both `marker.setLatLng()` AND `popup.setLatLng()` so the popup tracks the aircraft on screen while open.

---

## 4. ADS-B dedup (adsb.lol fades when Air Sense covers the same aircraft)

When the same ICAO hex is heard via both sources, the adsb.lol marker fades. Air Sense always wins visually.

```css
.adsb-lol-marker-shadowed {
  opacity: 0.28;
  filter: grayscale(0.85) saturate(0.6);
  transition: opacity 0.4s ease, filter 0.4s ease;
}
```

- Faded marker stays clickable.
- Popup carries an inline note: *"Also being heard via DJI Air Sense — see the brighter Air Sense marker for full detection details."*
- Match check is case-insensitive on the 24-bit ICAO hex, comparing against `mqttAircraftMarkers` keys (which are `<droneId>:<aircraftId>`).
- Re-evaluated on every adsb.lol poll (5 s lag worst case).

---

## 5. EDS-B drone markers — Lucide drone glyph

Replaces the old solid red dot with the canonical Lucide `drone` glyph (quadcopter, 4 propellers). Rendered black with stacked-white drop-shadow halo for legibility on any basemap, with the pulsing red ring still animating around it.

```css
.drone-location-drone {
  position: absolute; top: 50%; left: 50%;
  margin-top: -11px; margin-left: -11px;
  width: 22px; height: 22px;
  color: #000;
  filter: drop-shadow(0 0 1.5px #fff)
          drop-shadow(0 0 1.5px #fff)
          drop-shadow(0 1px 1px rgba(0,0,0,0.55));
}

@keyframes dronePulse {
  0%   { transform: scale(0.85); opacity: 0.9; }
  50%  { transform: scale(1.7);  opacity: 0.35; }
  100% { transform: scale(2.2);  opacity: 0; }
}
.drone-location-pulse {
  position: absolute; top: 50%; left: 50%;
  margin-top: -13px; margin-left: -13px;
  width: 26px; height: 26px;
  border: 2px solid rgba(255,0,0,0.9);
  border-radius: 50%;
  animation: dronePulse 1.5s ease-out infinite;
  pointer-events: none;
}
```

Lucide drone SVG path comes from `github.com/lucide-icons/lucide/main/icons/drone.svg`.

---

## 6. Z-order (Leaflet custom panes)

Aircraft above drones above all other markers. Polygons (default `overlayPane`, z=400) stay underneath.

```js
map.createPane('dronePane');
map.getPane('dronePane').style.zIndex = 650;
map.createPane('aircraftPane');
map.getPane('aircraftPane').style.zIndex = 660;
```

- EDS-B drones → `pane: 'dronePane'`
- Air Sense aircraft → `pane: 'aircraftPane'`
- adsb.lol aircraft → `pane: 'aircraftPane'`

---

## 7. NOTAM / METAR / TAF chips

All three rendered as chip-style DivIcons. Label is always the literal type word in all caps; background colour encodes severity (NOTAM) / flight category (METAR) / brand (TAF).

| Type | Label | Background colour by |
|---|---|---|
| NOTAM | `NOTAM` | severity: high `#dc2626`, medium `#ea580c`, low `#9ca3af` |
| METAR | `METAR` | flight category: VFR `#16a34a`, MVFR `#2563eb`, IFR `#dc2626`, LIFR `#a855f7` |
| TAF | `TAF` | always `#0ea5e9` |

Chip CSS pattern:

```html
<div style="background:<color>;color:#fff;border:1px solid #fff;border-radius:3px;
            padding:1px 5px;font:11px sans-serif;font-weight:600;
            box-shadow:0 1px 3px rgba(0,0,0,0.5);white-space:nowrap;">NOTAM</div>
```

iconAnchor positioning so a co-located trio at one station doesn't overlap:

- METAR: `[40, 8]` — chip 40 px LEFT of station
- TAF: `[-12, 8]` — chip 12 px RIGHT of station
- NOTAM: `[25, 26]` — chip ABOVE station

Per-marker click handlers fire `handleCanadianMapClick(marker.getLatLng(), originalEvent)` + `L.DomEvent.stopPropagation(ev)` because the unified hit-test radius misses chip-style markers (their `iconAnchor` puts the visible chip well outside the 18 px hit window).

### Zoom-based opacity

```css
.can-metar-chip, .can-taf-chip, .can-notam-chip {
  opacity: var(--can-chip-opacity, 1);
  transition: opacity 0.25s ease-out;
}
.can-metar-chip.can-marker-selected,
.can-taf-chip.can-marker-selected,
.can-notam-chip.can-marker-selected { opacity: 1; }
```

JS, on `zoomend`:

- ≤ zoom 6: opacity 0.18 (faint, lets airspace polygons read through)
- 6 → 12: linear interpolation
- ≥ zoom 12: opacity 1.0
- The currently-selected chip overrides to opacity 1 regardless of zoom.

---

## 8. Stacked-popup cycling

### Geometry

- L.popup options pinned: `minWidth: 300, maxWidth: 300` — popup width never changes between cycles.
- Content wrapped in `.can-stacked-body` (max-height 220 px, internal `overflow-y: auto`, font-size 11.5 px).
- Nav row (`.can-stacked-nav` with prev / counter / next) sits OUTSIDE the scroll frame so buttons stay in the same screen position across all cycles.
- Webkit scrollbar styled subtle (6 px translucent).

### Per-feature highlight strategy (the thing the popup is describing)

| Feature type | Highlight |
|---|---|
| Polygon / Polyline (`getLatLngs` exists) | `setStyle({ color: '#06b6d4', weight: 4, opacity: 1, fillColor: '#06b6d4', fillOpacity: 0.18 })` + `bringToFront()` |
| CircleMarker dot (e.g. aerodromes) | `setStyle` to bump weight 3 + cyan outline + 35% cyan fill — the dot itself highlights |
| DivIcon chip (METAR/TAF/NOTAM) | Add `.can-marker-selected` class to `marker._icon`; CSS adds 2 px cyan outline + cyan glow + retains the chip's original drop-shadow |
| PMTiles features (vector tiles, no DOM equivalent) | Set module-level `canSelectedRef = { defKey, key }` + call `layer.rerenderTiles()` — per-feature symbolizer recolours the matched feature to cyan |

Cleanup function reverts each path on cycle / dismiss.

---

## 9. Attribution dialog updates

The "ⓘ Map data sources & attributions" dialog (opened from the EDS-B info card) gained:

- **DJI Air Sense ADS-B detected manned aircraft** entry under Live overlays — explicit explanation of the broadcast → Air Sense receiver → EDS-B chain.
- **Aircraft altitude colours** section — visual legend with a dot for each band, the critical-band swatch animates with the same `adsbCriticalPulse` keyframes, a separate animated swatch shows the pulsing cyan Air Sense ring, plus the ±1,000 ft pressure-altitude caveat.

---

## 10. Conventions to preserve when porting elsewhere

Things that should stay consistent across surfaces so operators flipping between them aren't confused:

1. **Altitude band thresholds + colours** — the whole point of the band scheme is at-a-glance cross-surface recognition.
2. **Cyan ring on Air Sense aircraft, no ring on adsb.lol aircraft** — primary visual cue distinguishing the two sources.
3. **adsb.lol marker fades when its hex matches an Air Sense detection** — same dedup logic everywhere.
4. **Aircraft on top of drones on top of all other markers** — pane convention.
5. **Critical-altitude pulsing halo at ≤500 ft** — always 1.4 s loop, same gradient.
6. **NOTAM / METAR / TAF chip styling + label-as-type** — same colour palette and the literal type word as the label.

Things that are website-specific and can diverge:

- The Share Map View URL hash format
- The exact attribution dialog markup (use a native modal in a React/Tauri app instead)
- The Analytics + consent banner

If you ship a different visual language for any of the items in the "preserve" list, drone operators flipping between the surfaces will get confused.
