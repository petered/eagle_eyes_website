# Eagle Eyes Website Privacy & Analytics Updates

## Summary of Changes

This document summarizes all changes made to implement privacy consent and update analytics tracking.

---

## 1. Site-Wide Cookie Banner

**File:** `_includes/cookie-banner.html`

Added a site-wide cookie consent banner that:
- Appears in the bottom-right corner on all pages
- Has a light theme matching the site design
- Shows "Accept" button with blue gradient (matching "Ask a Question" button style)
- Shows "Essential Only" as a plain text link
- Includes "View Privacy Policy" link
- Has a confirmation step when clicking "Essential Only" ("Are you sure? Analytics help us prioritize features.")
- Stores consent in localStorage with key `eagle_eyes_cookie_consent`

**Included in layouts:**
- `_layouts/default.html`
- `_layouts/landing.html`
- `_layouts/page.html`

---

## 2. Download Page Updates

**File:** `download.html`

Changes:
- Added consent popup overlay before download (contextual consent)
- Removed `user_agent` from analytics payload (privacy improvement)
- Added `version` field to analytics payload (new feature)
- Popup only appears if user hasn't already accepted cookies site-wide
- After consent, sends analytics to DownloadsLogger Google Script

**Analytics payload now includes:**
- timestamp_iso
- timestamp_pacific
- version (e.g., "1.0.0")
- platform
- country
- city
- region
- consent_given

---

## 3. Livestream Page Updates

**File:** `livestream.html`

Changes:
- Added consent overlay before joining livestream (contextual consent)
- Removed `livestream_id` from payload - now sends `livestream_type` instead (privacy improvement)
- Removed `user_agent` from analytics payload (privacy improvement)
- Overlay only appears if user hasn't already accepted cookies site-wide
- After consent, sends analytics to LivestreamAnalyticsIngest Google Script

**Analytics payload now includes:**
- timestamp_iso
- timestamp_pacific
- event_type
- livestream_type (e.g., "instagram", "youtube", "tiktok") - derived client-side
- viewer_id
- consent_given
- (other fields as applicable)

---

## 4. Google Sheets Updates

### Downloads Google Sheet
**Sheet:** EagleEyes_Download_Events

Added new column:
- `version` - Tracks which version of the software was downloaded

### Mirada Analytics Google Sheet (NEW)
**Sheet ID:** `1LeesTI-zWz4g9AWk9vM8vCaTSp7PBmyDojCPa6Xz-fk`

New sheet created for tracking Mirada page analytics with columns:
- timestamp_iso
- timestamp_pacific
- event_type
- page_url
- referrer
- country
- city
- region
- consent_given
- viewer_id

---

## 5. Google Apps Script Updates

### DownloadsLogger Script
**Web App URL:** `https://script.google.com/macros/s/AKfycbz1MtPnQiNmL4y4Vk5qdanN0iv_GE3BQJzYH_KyHPlMG_4kQWsaq7WISA7Z-jHEySf8/exec`

Updated to:
- Accept `version` field in POST data
- Write version to the new column in the sheet

### LivestreamAnalyticsIngest Script
**Web App URL:** `https://script.google.com/macros/s/AKfycbxFPVazjGWDLPtTWqqiFgwQ_skRwmJDt6rWZCAmZaEg8-OS17ZY1zwcCHDUZjlFt_A/exec`

Updated to:
- Accept `livestream_type` directly from client (instead of computing from livestream_id)
- No longer receives or stores livestream_id

### MiradaAnalyticsIngest Script (NEW)
**Web App URL:** `https://script.google.com/macros/s/AKfycbyMsA_xnAfpbDbJ-PJPT1Il0PLlxQyBnBTc2XkSb5uPGRRorPVcsPODksOeBA8UUCmAFQ/exec`

New script created to:
- Receive analytics events from Mirada page
- Dynamically map headers from sheet (future-proof)
- Write events to Mirada Analytics Google Sheet

---

## 6. Privacy Improvements Summary

| Change | Before | After |
|--------|--------|-------|
| User Agent | Collected | Removed |
| Livestream ID | Collected (e.g., "IGLive123") | Only type (e.g., "instagram") |
| Consent | Implicit | Explicit with popup/overlay |
| Cookie Banner | None | Site-wide with confirmation step |

---

## 7. Files Modified

Website files:
- `_includes/cookie-banner.html` (new)
- `_layouts/default.html`
- `_layouts/landing.html`
- `_layouts/page.html`
- `download.html`
- `livestream.html`
- `next-step.html`

Google Scripts (external):
- DownloadsLogger
- LivestreamAnalyticsIngest
- MiradaAnalyticsIngest (new)

---

## 8. Still Pending

- [ ] Fix Publisher Distribution Map in dashboard
- [ ] Add analytics tracking code to Mirada page (in Scan 2v2 repo - will be separate PR)
- [ ] Create Mirada dashboard tab
- [ ] Test all analytics flows end-to-end
