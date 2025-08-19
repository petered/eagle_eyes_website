---
layout: post
title: "Eagle Eyes Pilot: New Beta Release"
subtitle: "We’ve just dropped a new Beta release for Eagle Eyes Pilot, our app that runs on the drone controller, packed with new features."
image: "images/EEPilot_Quick_Actions_Menu.jpg"
date: 2025-08-19 09:00:00 -0800
author: Eagle Eyes Team
permalink: /blog/eagle-eyes-pilot-new-beta-release
categories: product-updates pilot releases
---
<br>
<br>
Today we're releasing the Beta of the next edition of Eagle Eyes Pilot—the drone app designed for search and rescue. This early version offers a preview of the new capabilities we're building. While you may notice the occasional hiccup, we encourage you to explore and share your feedback. 

Our main points of focus in this release were:

- **Unified situational awareness** for SAR drone pilots. Drone pilots can now see each other's drone locations in real-time as long as they're on the same wifi. You can also download Eagle Eyes Pilot on an android mobile phone or tablet, and open up Maps to see all drone locations on a map that's synced with CalTopo.

- **Simplified workflow** - Reduce the number of steps between a drone pilot showing up on site and actually getting the drone in the air. We do this by enabling a one-time "Setup" of the controller (... → Setup Controller) to configure a default map, name the drone, etc. 

- **Running quietly in the background** - We're enabling users to fly as they're accustomed to flying - in DJI Pilot 2 - while still integrating with CalTopo. While flying in DJI Pilot 2 you can now livetrack to caltopo, upload flight logs straight to caltopo, and download CalTopo areas to create mapping missions.

- **Interoperability with Eagle Eyes Scan** - You can now use Eagle Eyes Pilot (or DJI Pilot) and Scan together - transmitting live video and coordinates to a nearby laptop for analysis.

<style>
.download-card {
    background: #f8f9fa;
    border: 2px solid #e9ecef;
    border-radius: 8px;
    padding: 25px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    margin: 25px auto;
    max-width: 400px;
}

.download-card:hover {
    border-color: #007bff;
    background: #f0f8ff;
}

.download-icon {
    font-size: 32px;
    margin-bottom: 8px;
    display: block;
}

.download-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin: 0 0 4px 0;
}

.download-subtitle {
    color: #666;
    font-size: 12px;
    margin: 0;
    line-height: 1.2;
}
</style>

<div class="download-card" onclick="window.open('https://www.eagleeyessearch.com/download/', '_blank')">
    <div class="download-icon">📱</div>
    <h3 class="download-title">Download the new Eagle Eyes Pilot Beta here</h3>
</div>
<br>
<br>
# Detailed Release Notes
<br>
## Unified Situational Awareness

- **Airspace Deconfliction** - You can now see the live locations of other drone pilots who are on the same local wifi network as you.
- **Air-Ops mode** - Just install Eagle Eyes Pilot on your phone and click maps - you'll see all other pilot locations (overtop your CalTopo Map)

## Simplified Workflow

- **Default CalTopo map**: Many teams have a "Master" map that they just reuse for most of their operations. You can now set up a default map in "... → Setup Controller" and not have to connect to a CalTopo map each time you fly the drone.

- **Scan CalTopo QR code with drone** - Yes, you can now connect to a CalTopo map by scanning the map's QR code using the drone's camera. From the Piloting view (㆔ → Caltopo → Scan QR Code)

- **Easier licence activation via QR code** - We heard you - getting the license set up was a pain! We now have a much easier workflow for activating your Eagle Eyes license by just scanning a QR code with your phone.

- **RC Buttons finally work** - The buttons on the DJI RC-Pro (and most on the DJI-RC plus) now perform the same functions they do on DJI Pilot 2 - meaning you can Zoom-in/out, Gimbal down/level, adjust exposure with buttons. Then there's…

- **The magic button (Quick Actions)** - (Little circle on the top right of DJI controllers) - now brings up a full status overview and quick-options menu. CalTopo Map, wifi-status, drone/RC battery/storage levels, turn on/off nav beacon, etc etc - just press the magic button and it's one tap away. Very useful helper for pre-flight checklists.

- **CalTopo Tracking improvements** - The app now starts a new track when it makes sense to do so (based on distance/time since last track), and lets you start/stop/name tracks manually (e.g. to attach assignment-numbers to tracks). No internet? No problem - tracks will buffer locally and upload next time you're on the internet.

- **Downloads Offline Maps** - Need to make sure your drone team has maps reliably when you have no service? Download a .mbtiles file from CalTopo, get it on your RC - (Get LocalSend on your RC) - set up your team's controllers with it - then you'll always have offline maps.

- **Coordinate Systems** can be a pain to convert in the field. We now let you easily show/convert coordinate format between (Decimal Degrees (DD), Degrees Decimal Minutes (DDM), Degrees Minutes Seconds (DMS), Universal Transverse Mercator (UTM), Military Grid Reference System (MGRS), Ordinance Survey Grid (OS Grid - UK only), US National Grid (USNG) - and of course Vocal Coordinates (VC)

## Running Quietly in the Background

- **Live Tracking from DJI Pilot** - Let Eagle Eyes Pilot run quietly in the background - it'll share your drone's live location to your fellow pilots / air-ops managers and upload live tracks to CalTopo.

- **Upload DJI Flight Logs to CalTopo** via "... → Sync Flight Logs → (select) → CalTopo". Currently only works with DJI Flight logs (not EE-Pilot Flight logs) - yes, we're working on it.

## Interoperability with Eagle Eyes Scan

- **Clean HDMI out from Pilot** - Eagle Eyes Pilot now supports "Clean HDMI output" mode - meaning you can export clean HDMI for detection in Eagle Eyes Scan or display. From the pilot view: "㆔ → Livestreeaming → Clean HDMI Output"

- **Live drone coordinates from Pilot to Scan** - If your drone and laptop are on the same local network, you can transmit live drone coordinates and record them in Eagle Eyes Scan.

## Miscellaneous Improvements/Fixes

- **Crosshairs** - So you know exactly where the camera is centered.

- **Primary Flight Display** (That big circle at in your piloting screen) - Gives the pilot a one-glance overview of their current situation. Don't like it? Swipe it left to remove. Want it back? "㆔ → Quick Actions → Primary flight display:"

- **Double-tap to zoom** - Now works properly - double tap on the screen to zoom to that point.

- **Camera/Thermal Settings** - (Thermal Palette, exposure, etc) can be adjusted from "㆔ → Quick Actions → Camera Settings".

## Known Issues

- **Single crosshairs in split-view** - Should be one crosshair on each side.

- **Detector on split view** - Runs detections on full frame, not great especially when thermal pallet is red tint because it distracts detector. Really, detector should focus on visual in split. 