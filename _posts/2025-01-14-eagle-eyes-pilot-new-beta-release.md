---
layout: post
title: "New features in Eagle Eyes Pilot 1.4.0 Beta"
image: "images/EEPilot_Quick_Actions_Menu.jpg"
date: 2025-08-19 09:00:00 -0800
author: Eagle Eyes Team
permalink: /blog/eagle-eyes-pilot-new-beta-release
categories: product-updates pilot releases
---
<br>
<br>
We've just dropped a new Beta release for Eagle Eyes Pilot, our app that runs on the drone controller. This early version offers a preview of the new capabilities we're building. Keep in mind this is a Beta version, so you may experience the occasional hiccup. You can always install the Beta alongside the current version of Eagle Eyes Pilot 1.3.1 (also available from the button above).  

<style>
.download-button {
    background: #007bff;
    color: white !important;
    border: none;
    border-radius: 8px;
    padding: 25px 15px;
    font-size: 16px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s ease;
    margin: 40px 0;
    line-height: 1.2;
    width: auto;
}

.download-button:hover {
    background: #0056b3;
    color: white;
    text-decoration: none;
}

.download-button-container {
    text-align: center;
    margin: 25px 0;
}

/* Simple bullet point styling - let default CSS handle it */
</style>

<div class="download-button-container">
    <a href="https://www.eagleeyessearch.com/download/" target="_blank" class="download-button">Download Eagle Eyes Pilot 1.4.0 Beta</a>
</div>

## Quick setup and improved CalTopo integration
We want to reduce the number of steps between a drone pilot showing up on site and actually getting the drone in the air. We enable a one-time "Setup" of the controller, where you can set a default CalTopo "master" map, name the drone and load an .mbtiles file from CalTopo to always have access to detailed offline maps.

<div style="max-width: 80%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/KYztoarEkoU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

- **Easier licence activation via QR code** - We heard you - getting the license set up was a pain! We now have a much easier workflow for activating your Eagle Eyes license by just scanning a QR code with your phone.
- **Default CalTopo map**: Many teams have a "Master" map that they just reuse for most of their operations. You can now set up a default map in "... → Setup Controller" and not have to connect to a CalTopo map each time you fly the drone.
- 🎥 **[Scan CalTopo QR code with drone](https://youtu.be/sRl4Z12AUqM)** - Yes, you can now connect to a CalTopo map by scanning the map's QR code using the drone's camera. From the Piloting view (㆔ → Caltopo → Scan QR Code)
- 🎥 **[Download maps pre-flight for offline use on the controller](https://youtu.be/d3JGNzw3KJs)** - Need to make sure your drone team has maps reliably when you have no service? Download a .mbtiles file from CalTopo, get it on your RC - (Get [LocalSend](https://localsend.org/) on your RC) - set up your team's controllers with it - then you'll always have offline maps.
- **CalTopo Tracking improvements** - The app now starts a new track when it makes sense to do so (based on distance/time since last track), and lets you start/stop/name tracks manually (e.g. to attach assignment-numbers to tracks). No internet? No problem - tracks will buffer locally and upload next time you're on the internet.
<br>
<br>

## AirOps view: Seeing other drones' live locations
Pilots, as well as users that install Eagle Eyes Pilot on a separate Android, can see the location of all drones on the same Wi-Fi network, overlaid on a CalTopo map with near-zero latency. This works even when flying in DJI Pilot 2 with EE Pilot running in the background.

<div style="max-width: 80%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/__i8BL0HGOU?si=6cIc7oNUkzBOVafn" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

- **Airspace Deconfliction** - You can now see the live locations of other drone pilots who are on the same local wifi network as you.
- **Air-Ops mode** - Just install Eagle Eyes Pilot on your phone and click maps - you'll see all other pilot locations (overtop your CalTopo Map)

<br>
<br>
## Improved flight experience for pilots
Eagle Eyes Pilot now supports most controller button functions from DJI Pilot 2. We’ve also added a quick-options menu for easy access to key information and expanded support for more coordinate systems.

<div style="max-width: 80%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/q43-4tggtLw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

- **RC Buttons finally work** - The buttons on the DJI RC-Pro (and most on the DJI-RC plus) now perform the same functions they do on DJI Pilot 2 - meaning you can Zoom-in/out, Gimbal down/level, adjust exposure with buttons. Then there's…
- **The magic button (Quick Actions)** - (Little circle on the top right of DJI controllers) - now brings up a full status overview and quick-options menu. CalTopo Map, wifi-status, drone/RC battery/storage levels, turn on/off nav beacon, etc etc - just press the magic button and it's one tap away. Very useful helper for pre-flight checklists.
- **Coordinate Systems** can be a pain to convert in the field. We now let you easily show/convert coordinate format between (Decimal Degrees (DD), Degrees Decimal Minutes (DDM), Degrees Minutes Seconds (DMS), Universal Transverse Mercator (UTM), Military Grid Reference System (MGRS), Ordinance Survey Grid (OS Grid - UK only), US National Grid (USNG) - and of course Vocal Coordinates (VC)

<br>
<br>
## CalTopo integration for teams flying with DJI Pilot 2 
Some teams prefer to stick with the native DJI Piloting apps, and we aim to support that as much as possible. We've added some new features that enable Eagle Eyes Pilot to function as more of a "background app", enabling the user to benefit from the CalTopo integration, computer vision, and airspace deconfliction features that we provide, while still flying in DJI Pilot 2. 

<div style="max-width: 80%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/gos2qwe04_Q" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

- **Live Tracking from DJI Pilot** - Let Eagle Eyes Pilot run quietly in the background - it'll share your drone's live location to your fellow pilots / air-ops managers and upload live tracks to CalTopo.
- 🎥 **[Fly with DJI Pilot 2 and sync tracks to CalTopo post flight](https://youtu.be/kL0-SSLd23c)** via "... → Sync Flight Logs → (select) → CalTopo". Currently only works with DJI Flight logs (not EE-Pilot Flight logs) - yes, we're working on it.
- 🎥 **[Convert CalTopo search areas into DJI Pilot 2 flight mission](https://youtu.be/0i_ph36RUqE?si=AkWor4C4fnHVTb84)**: Eagle Eyes Pilot now includes a free feature that lets you turn any CalTopo search area polygon into a flight mission that can be loaded directly into the DJI Pilot 2 mission planner. From your drone controller, Eagle Eyes Pilot syncs with your CalTopo map so you can simply select the search area, download the KML to the controller, and upload it into DJI's flight planner. The entire process is wireless, handled right on the controller, and available for free!

<br>
<br>
## Interoperability with Eagle Eyes Scan:
You can now use Eagle Eyes Pilot (or DJI Pilot) and Scan together - transmitting live video and coordinates to a nearby laptop for analysis.

<div style="max-width: 80%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/cwZ4tvBRdjA" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

- **Clean HDMI out from Pilot** - Eagle Eyes Pilot now supports "Clean HDMI output" mode - meaning you can export clean HDMI for detection in Eagle Eyes Scan or display. From the pilot view: "㆔ → Livestreeaming → Clean HDMI Output"
- **Live drone coordinates from Pilot to Scan** - If your drone and laptop are on the same local network, you can transmit live drone coordinates and record them in Eagle Eyes Scan.

<br>
<br>
## Miscellaneous Improvements/Fixes

- **Crosshairs** - So you know exactly where the camera is centered.
- **Primary Flight Display** (That big circle at in your piloting screen) - Gives the pilot a one-glance overview of their current situation. Don't like it? Swipe it left to remove. Want it back? "㆔ → Quick Actions → Primary flight display:"
- **Double-tap to zoom** - Now works properly - double tap on the screen to zoom to that point.
- **Camera/Thermal Settings** - (Thermal Palette, exposure, etc) can be adjusted from "㆔ → Quick Actions → Camera Settings".

<br>
<br>
## Known Issues

- **Single crosshairs in split-view** - Should be one crosshair on each side.
- **Detector on split view** - Runs detections on full frame, not great especially when thermal pallet is red tint because it distracts detector. Really, detector should focus on visual in split.

<br>
<br> 