---
layout: post
title: "Eagle Eyes Pilot 1.5.0 Beta - Livestreaming has arrived"
image: "images/blog/ee-livestream.png"
date: 2025-11-19 09:00:00 -0800
author: Eagle Eyes Team
permalink: /blog/eagle-eyes-pilot-1-5-0-beta-livestreaming
categories: product-updates pilot livestreaming
published: true
---
<br>
<br>
Eagle Eyes Pilot version 1.5.0 Beta is now live. This release includes:

<ul style="margin-left: 30px; margin-top: 10px; margin-bottom: 20px;">
<li>Wireless livestreaming from your DJI drone to up to three remote devices (viewers)</li>
<li>Full support for CalTopo service accounts for faster, easier map access</li>
<li>A long list of fixes, performance improvements, and expanded capabilities</li>
</ul>

You can install Eagle Eyes Pilot Beta <img src="{{ '/images/eagle-eyes-beta-logo.png' | relative_url }}" alt="Beta badge" style="height: 26px; vertical-align: middle; margin: 0 4px;"> alongside the latest Stable <img src="{{ '/images/Eagle Eyes Logo.png' | relative_url }}" alt="Stable badge" style="height: 26px; vertical-align: middle; margin: 0 4px;"> version on the same device. Our licenses are per-device, so running multiple versions of Eagle Eyes Pilot on the same device won't use an additional license.

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
    <a href="https://www.eagleeyessearch.com/download/" target="_blank" class="download-button">Download Eagle Eyes Pilot 1.5.0 Beta</a>
</div>

## Livestreaming

The <a href="https://www.eagleeyessearch.com/livestream/" target="_blank">Eagle Eyes Viewer</a> allows multiple drones to stream their live video and telemetry to remote observers. Once a drone pilot activates livestreaming from Eagle Eyes Pilot and shares the livestream link via QR code or unique join code, each drone appears on viewers devices, displayed on a shared map with real-time position, altitude, and synced CalTopo map objects. Viewers can then easily switch between drone livestreams and share the stream onto others, enabling situational awareness and coordination whether you're beside the pilot or monitoring from a remote operations center.

<strong>See this video for a ~4 minute walk through of the Eagle Eyes live streaming feature:</strong>

<div style="max-width: 95%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/2U1mS0QmBrU?start=267" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

This first beta release of Eagle Eyes Livestreaming is still in early stages, so do not expect perfection. Some network configurations and mobile data plans may not connect, though generally, if you're on Starlink or streaming locally via mobile hotspot, it works pretty well. Livestreaming works exclusively while flying your DJI drone in Eagle Eyes Pilot and supports up to three remote viewers. This means three separate devices can watch the live stream simultaneously.

For now, Livestreaming comes at no additional cost. We aim to keep it as affordable as possible in the future, though it may be the case that for some configurations we have to introduce additional billing to make it work. The diagram below outlines the various network configurations we've tested with Eagle Eyes Livestreaming and their reliability. For more details on livestreaming see our <a href="https://www.eagleeyessearch.com/faq/#livestreaming" target="_blank">FAQ</a>.

<div style="max-width: 50%; margin: 20px auto; text-align: center;">
<img src="{{ '/images/livestream_network_configs (1).png' | relative_url }}" alt="Livestream network configurations" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>

<br>
<br>
## CalTopo service account integration

No more repeated logins. Eagle Eyes Pilot now supports <a href="https://training.caltopo.com/all_users/team-accounts/teamapi" target="_blank">CalTopo service accounts</a>, letting you link each of your team's drone controllers to your CalTopo account once during setup, no sign-ins required after that. You can set a default map the controller will always connect to, and instantly switch to a new map by scanning the CalTopo QR code with the drone's camera without needing to sign into CalTopo on the drone controller again. From that moment on, your drone will live track into that map.

<div style="max-width: 95%; margin: 20px auto; text-align: center;">
<img src="{{ '/images/CalTopo_QR _code_drone_scan.png' | relative_url }}" alt="CalTopo QR code drone scan" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>

<br>
<br>
## Field-focused improvements since 1.3.1

This release includes dozens of practical upgrades based on field feedback. A few highlights:

**In the app:**

- Quick Actions (C3 button) now shows real-time status for drone, map, and Wi-Fi
- Infrared spotlight and night mode control added for M4T
- Flight logs now sync to <a href="https://airdata.com/features#tab-panel-3" target="_blank">AirData</a> on all <a href="https://www.eagleeyessearch.com/faq/#compatibility-overview" target="_blank">supported drones</a>, including M4T
- Tap the top coordinates bar to view laser rangefinder coordinates (if available)
- RC controller button behavior better aligned with DJI Pilot 2

**On the map side:**

- EE Pilot now stores drone tracks when flying without internet connection and automatically uploads the tracks to CalTopo when back online
- Support for USNG, MGRS, OSGrid coordinate systems
- Can upload historical flight logs to CalTopo (whether flown in DJI Pilot or EE Pilot)
- Live track logging continues in CalTopo even when flying in DJI Pilot 2 or switching back and forth between EE Pilot and DJI Pilot 2 mid-mission
- Download MBTiles from CalTopo and save in EE Pilot to guarantee maps when offline
- Filter map objects in EE Pilot map to see only what you need to while flying
- All drone tracks now go into a single "Drone Ops" folder in your CalTopo map

<br>
<div style="max-width: 95%; margin: 20px auto 10px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/AcoXas2zgsY" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

<br>
## Feedback or suggestions?

Have feedback or feature ideas for Eagle Eyes? We're all ears. Contact us at: 📬 <a href="mailto:info@EagleEyesSearch.com">info@EagleEyesSearch.com</a>

If you spot a bug or something doesn't work as expected, please let us know <a href="https://airtable.com/appJqr3HbUtXoYxDd/pagYfPZ2HSHovHmHp/edit" target="_blank">here</a> 🛠️

This is our first public version of wireless livestreaming, expect quirks, share your feedback from field tests, and help shape what's next.