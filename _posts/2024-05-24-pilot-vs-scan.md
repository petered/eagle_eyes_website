---
layout: post
title: "Eagle Eyes Pilot or Eagle Eyes Scan: Which App Is Right For You?"
image: "/images/eagle_eyes_website_header_2.jpg"
date:   2024-05-24 12:00:00 -0800
author: Joep Maas
permalink: /blog/pilot-vs-scan
categories: jekyll update
---

We often get asked: _Which tool should I try first?_ The answer depends on your setup and workflow. Eagle Eyes Pilot and Eagle Eyes Scan are built for slightly different use cases. 

* [**Eagle Eyes Pilot**](https://www.eagleeyessearch.com/pilot) is a drone piloting app for search and rescue that runs on DJI Drone controllers like the RC-Pro/RC-Plus, or Android phones/tablets connected to headless DJI drone controllers. It aids the operator by providing live detections from a computer vision system, and syncing map objects, drone live-tracks, and captured drone photos with CalTopo. 

* [**Eagle Eyes Scan**](https://www.eagleeyessearch.com/scan) is a desktop application for Windows laptops/tablets and macOS laptops. It enables the operator to quickly review drone footage both when the drone is in the air and post-flight, aided by a computer vision system. It takes a variety of video and image formats as input, and can generate organized detection reports.

Both apps make use of the same offline computer vision system, offering real-time color and motion anomaly detection. 

This page breaks down the differences between the two apps and their use cases to help you decide which one fits your workflow best. The first factor to consider is whether your drone setup supports Pilot or Scan.


## Is Your Drone Compatible?

* **Eagle Eyes Scan** works with any drone that records standard footage and outputs an HDMI video stream. 

* **Eagle Eyes Pilot** works only with certain DJI drones and controllers. It's built on DJI's SDK, so if your drone isn't supported by the SDK, Pilot won't be compatible. See full compatibility details [here](https://www.eagleeyessearch.com/pilot-manual).

Our vision is to operate seamlessly with any drone. We started with supporting DJI drones because of their widespread use in public safety. As the industry landscape evolves, we are extending compatibility to other leading manufacturers. For example, we're now working on integrating location data of DJI and **Autel drones** into Eagle Eyes Scan so every detection can be plotted on a map. The table below shows what we currently support and what we are working on supporting.

### Use case comparison

<table>
  <thead>
    <tr>
      <th>Use case</th>
      <th>Eagle Eyes Pilot</th>
      <th>Eagle Eyes Scan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Drone piloting</td>
      <td rowspan="6" style="text-align: center; vertical-align: middle;">Supports select DJI series 3 drones*<br>(we recommend Eagle Eyes Scan for analyzing prerecorded footage)<br></td>
      <td>Not supported</td>
    </tr>
    <tr>
      <td>Run detector on prerecorded footage</td>
      <td>Works with any drone**</td>
    </tr>
    <tr>
      <td>Run detector on live video stream</td>
      <td>Works with any drone with a controller capable of outputting raw HDMI video (without control overlays)**</td>
    </tr>
    <tr>
      <td>Location data in prerecorded footage</td>
      <td>Works with most DJI drones (working on supporting Autel drones)</td>
    </tr>
    <tr>
      <td>Location data in live video stream</td>
      <td>Not supported yet (working on supporting DJI drones)</td>
    </tr>
    <tr>
      <td>CalTopo integration (drone live-tracking and sharing images)</td>
      <td>Not supported yet (working on supporting DJI drones)</td>
    </tr>
  </tbody>
</table>

\* Consult the Eagle Eyes Pilot manual for details.  
\** Eagle Eyes Scan uses DJI-specific file-naming conventions to group files. When using a non-DJI drone, we recommend consulting the [Eagle Eyes Scan manual](https://www.eagleeyessearch.com/scan-manual) before giving Eagle Eyes Scan a try.


## How Is Your Team Organized?

If your team's drone pilot is the only person reviewing the drone's video feed, Eagle Eyes Pilot is likely the better choice. It runs directly on the controller, flags visual anomalies in real-time, and integrates directly with CalTopo to help share findings instantly with the rest of your team.

In larger operations, a dedicated analyst may be on-site to review footage; this is where Eagle Eyes Scan shines. It runs on a laptop or workstation and is optimized for large displays, allowing the pilot to stay focused on flying the drone while the analyst monitors the feed from a trailer or command post. 

We designed Scan to help with the difficult task of scanning through large amounts of videos/imagery for small objects of interest, and compiling them into a format that's digestible to the search team. Aided by a computer vision system, the operator can scan through footage to quickly zoom in on, cross-reference, and annotate objects of interest. You can sort detections by e.g. proximity to a specific color, what detected colors are most unique, or how much the anomaly stood out relative to its surroundings.


## Do You Use CalTopo for Mapping?

When there is internet connectivity, Eagle Eyes Pilot offers real-time CalTopo integration. You can load CalTopo maps in the app, share your drone's live track with teammates, and drop images at the precise location they were spotted. This creates a shared situational picture between air and ground teams for faster coordination.

Eagle Eyes Scan doesn't support CalTopo yet, but it's on our roadmap.

## Do You Need Real-Time or Post-Flight Analysis?

Eagle Eyes Pilot is designed for fast field deployments. With the app pre-installed on the drone controller, you can launch within minutes and immediately gain situational awareness. The app points out anomalies of color and motion on the display, and integrates with CalTopo so you can livetrack the drone and use the map's features, such as search areas and locations of team members, as a reference during flight.

Eagle Eyes Scan can also process live video feeds. You will need to connect the controller to a computer running Scan using an HDMI cable and HDMI capture card (see the Scan manual for details). This setup allows for more accurate review on a larger screen.

Both apps can be used together during missions. For example, you can fly a grid using Pilot while monitoring the feed on the controller, then review the collected footage in more detail with Scan after landing.

Although both apps support pre-recorded footage, Scan is specifically optimized for after-action review and footage inspection. It's the better choice when there's time to comb through video with more scrutiny. 


## Our recommendation

* Use Pilot when flying with minimal crew and use Caltopo to stay connected to the ground crew. 

* Use Scan for detailed analysis and reporting during or after the mission.

Ultimately, the two apps are complementary, and we are working hard on integrating functionality.

## What's next?

At Eagle Eyes, our goal is to make drone operations in emergency response as seamless and effective as possible. We're continually working on making our software easier to use and more capable in the field.

### On the roadmap:

* CalTopo integration for Eagle Eyes Scan
* Expanded thermal sensor tuning options, including real-time thermal adjustment controls
* Improved map overlays to better show completed search coverage zones
* Adding more video and location sources to Scan to support remote use, including in helicopters
* Expanded thermal sensor tuning options, including real-time thermal adjustment controls
* Semi-autonomous flight planning capabilities for grid patterns and custom search areas
* Deeper workflow integration to reduce distractions and improve collaboration between teams, for example when it comes to sharing coordinates

We're always looking to improve Eagle Eyes based on real-world use. If you have a feature request or workflow idea, let us know at [info@eagleeyessearch.com](mailto:info@eagleeyessearch.com). 