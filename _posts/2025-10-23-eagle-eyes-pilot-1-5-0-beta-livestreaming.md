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
<li>Wireless livestreaming from your DJI drone to up to three remote devices</li>
<li>Major upgrades to multi-drone airspace coordination and the AirOps map</li>
<li>Full support for CalTopo service accounts for faster, easier map access</li>
<li>A long list of fixes, performance improvements, and expanded capabilities</li>
</ul>

You can install the Beta <img src="{{ '/images/eagle-eyes-beta-logo.png' | relative_url }}" alt="Beta badge" style="height: 26px; vertical-align: middle; margin: 0 4px;"> alongside the latest Stable <img src="{{ '/images/Eagle Eyes Logo.png' | relative_url }}" alt="Stable badge" style="height: 26px; vertical-align: middle; margin: 0 4px;"> version on the same device. Our licenses are per-device, so running multiple versions of Eagle Eyes Pilot on the same device won't use an additional license.

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

This first beta release of Eagle Eyes Livestreaming works only while flying your DJI drone in Eagle Eyes Pilot, and supports up to three remote viewers. That means three separate devices can watch the drone's live stream at the same time.

It performs best when:

- The drone controller and viewing devices are on the same mobile hotspot, or
- On separate Wi-Fi networks (Starlink-to-Starlink, or Starlink-to-home internet)

Outside these two configurations, mileage may vary. We've observed that some mobile data networks may not relay livestream data reliably between different providers or hotspots, which can prevent the stream from connecting across networks. This means that if your drone controller is hosting the livestream via a mobile data hotspot, and a viewer attempts to connect using a device on another mobile network or provider, the stream may not be accessible unless both are on the same hotspot. When connected to a Wi-Fi, Starlink, or home or office internet connection (non-mobile data), the livestream should work. Feedback on how this works in your environment is greatly appreciated.

To start a livestream, tap the Livestream icon <img src="{{ '/images/livestream.png' | relative_url }}" alt="Livestream icon" style="height: 20px; vertical-align: middle; margin: 0 4px;"> on the top bar in the EE Piloting view, or go to:

<span style="font-size: 1.5em;">☰</span> → Livestreaming → Livestreaming (Beta)

Then scan the QR code shown on the controller screen to open EagleEyesSearch.com/livestream on any device and pump the feed. You can also share a short alpha numeric code or a link to let others join the livestream remotely.

Once live, each drone stream appears on a shared map with real-time position and altitude, alongside synced CalTopo map objects. Viewers can click between drone feeds, enabling both on-site and remote situational awareness and coordination, whether you're beside the pilot or in a remote operations center miles away.

▶️ Watch this 9-minute walkthrough video:

<div style="max-width: 80%; margin: 20px auto;">
<div style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%; overflow: hidden;">
<iframe src="https://www.youtube.com/embed/2U1mS0QmBrU" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px;"></iframe>
</div>
</div>

<br>
## Airspace coordination across networks

In our last 1.4.0 beta release, we introduced the AirOps map view, letting pilots on the same local Wi-Fi network see each other's live location via Location Broadcast. It's designed for quick coordination between pilots flying in shared airspace. In addition to providing situational awareness to pilots, the AirOps map can also be run on an Android tablet by an AirOps supervisor to assist with incident airspace coordination.

In this 1.5.0 release, we've taken it a step further. Now, drones on separate networks can appear together on the shared AirOps map, as long as they're connected to the same CalTopo map via Eagle Eyes Pilot.

So whether your drones are flying in different locations or all on separate hotspots, anyone using the Livestream Viewer or AirOps map can now see all active drones in real-time, all in one place.

<br>
<br>
## CalTopo service account integration

No more repeated logins. Eagle Eyes Pilot now supports <a href="https://training.caltopo.com/all_users/team-accounts/teamapi" target="_blank">CalTopo service accounts</a>, letting you link each of your team's drone controllers to your CalTopo account once during setup, no sign-ins required after that. You can set a default map the controller will always connect to, and instantly switch to a new map by scanning the CalTopo QR code with the drone's camera without needing to sign into CalTopo on the drone controller again. From that moment on, your drone will live track into that map.

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
<br>
## Feedback or suggestions?

Have feedback or feature ideas for Eagle Eyes? We're all ears. Contact us at: 📬 <a href="mailto:info@EagleEyesSearch.com">info@EagleEyesSearch.com</a>

If you spot a bug or something doesn't work as expected, please let us know <a href="https://airtable.com/appJqr3HbUtXoYxDd/pagYfPZ2HSHovHmHp/edit" target="_blank">here</a> 🛠️

This is our first public version of wireless livestreaming, expect quirks, share your feedback from field tests, and help shape what's next.