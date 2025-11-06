---
layout: post
title: "Eagle Eyes Pilot or Eagle Eyes Scan: Which App Is Right For You?"
image: "/images/blog/image_1.jpg"
date:   2025-05-24 12:00:00 -0800
author: Eagle Eyes Team
permalink: /blog/pilot-vs-scan
categories: jekyll update
---
<style>
.blog-media-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  height: 0;
  overflow: hidden;
  margin-bottom: 15px;
}

.blog-media-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.blog-image-container {
  margin: 20px 0;
  text-align: center;
}

.blog-image-container img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.blog-media-container, .blog-image-container {
  margin-left: auto;
  margin-right: auto;
}

@media (min-width: 1024px) {
  .blog-media-container, .blog-image-container {
    max-width: 90%;
  }
}
</style>

<br>
We often get asked: _Which tool should I try first?_ The answer depends on your setup and workflow. Eagle Eyes Pilot and Eagle Eyes Scan are built for slightly different use cases. 
<br>
<br>

* [**Eagle Eyes Pilot**](https://www.eagleeyessearch.com/pilot) is a drone piloting app for search and rescue that runs on DJI Drone controllers like the RC-Pro/RC-Plus, or Android phones/tablets connected to headless DJI drone controllers. It aids the operator by showing live detections directly on the controller display, and syncing map objects, drone live-tracks, and captured drone photos with CalTopo. 

* [**Eagle Eyes Scan**](https://www.eagleeyessearch.com/scan) is a desktop application for Windows laptops/tablets and macOS laptops. It lets the operator quickly review drone footage both in-flight and post-flight, with support from a computer vision system. It takes a variety of video and image formats as input, and can generate organized detection reports.

Both apps make use of the same offline computer vision system, offering real-time color and motion anomaly detection. 

<br>
This page breaks down the differences between the two apps and their use cases to help you decide which one fits your workflow best.

<br>
## Is Your Drone Compatible?

The first factor to consider is whether your drone setup supports Pilot or Scan.

* **Eagle Eyes Scan** works with most drones to analyze prerecorded footage or live feeds. When using Scan for live missions, getting live location data is only supported in combination with Eagle Eyes Pilot (compatible DJI drones only). We have a special [section on Autel drones](https://www.eagleeyessearch.com/faq/#autel-compatibility).

* **Eagle Eyes Pilot** works only with certain DJI drones and controllers. It's built on DJI's SDK, so if your drone isn't supported by the SDK, Pilot won't be compatible. See full [compatibility details](https://www.eagleeyessearch.com/faq/#compatibility-overview).

Our vision is to operate seamlessly with any drone. We started with supporting DJI drones because of their widespread use in public safety. We're actively working to extend compatibility beyond DJI to other leading manufacturers as the industry evolves.

<br>
## How Is Your Team Organized?

If your team’s drone pilot is the only person reviewing the drone’s video feed, Eagle Eyes Pilot is likely the better choice. It runs directly on the controller, flags visual anomalies in real-time, and integrates directly with CalTopo to help share findings instantly with the rest of your team.

Larger drone teams might have a dedicated person on-site to review live footage; this is where Eagle Eyes Scan excels. It runs on a laptop or workstation and is optimized for large displays, allowing the pilot to stay focused on flying the drone while the analyst monitors the feed from a trailer or command post. 

We designed Scan to help with the difficult task of scanning through large amounts of videos/imagery for small objects of interest, and compiling them into a format that's digestible to the search team. Aided by a computer vision system, the operator can scan through footage to quickly zoom in on, cross-reference, and annotate objects of interest. You can sort detections by e.g. proximity to a specific color, what detected colors are most unique, or how much the anomaly stood out relative to its surroundings.

<div class="blog-image-container">
<img src="/images/blog/three-ways-to-use-eagle-eyes.png" alt="Three ways to use Eagle Eyes"/>
</div>

<br>
## Do You Use CalTopo for Mapping?

When there is internet connectivity, Eagle Eyes Pilot offers real-time CalTopo integration. You can load CalTopo maps in the app, share your drone’s live track with teammates, and drop images at the precise location they were spotted. This creates a shared situational picture between air and ground teams for faster coordination.

Eagle Eyes Scan doesn't support CalTopo yet, but it's on our roadmap. We're also working on integrating live location data of DJI and Autel drones into Eagle Eyes Scan so every detection can be plotted on a map.

<div class="blog-media-container">
<iframe src="https://www.youtube.com/embed/FxZj-JOn8XQ" allowfullscreen></iframe>
</div>

<br>
## Do You Need Real-Time or Post-Flight Analysis?

Eagle Eyes Pilot is designed for fast field deployments. With the app pre-installed on the drone controller, you can launch within minutes and immediately gain situational awareness. The app points out anomalies of color and motion on the display, and integrates with CalTopo so you can livetrack the drone and use the map’s features, such as search areas and locations of team members, as a reference during flight.

Eagle Eyes Scan can also process live video feeds. You will need to connect the controller to a computer running Scan using an HDMI cable and HDMI capture card (see the Scan manual for details). This setup allows for more accurate review on a larger screen.

Both apps can be used together during missions. For example, you can fly a grid using Pilot while monitoring the feed on the controller, then review the collected footage in more detail with Scan after landing. Scan is optimized for after-action review and footage inspection. It's the better choice when there's time to comb through video or imagery with more scrutiny.

<div class="blog-media-container">
<iframe src="https://www.youtube.com/embed/SoLpsUBJoVo" allowfullscreen></iframe>
</div>

<br>
## Our recommendation

* Use **Pilot** when flying with minimal crew and use Caltopo to stay connected to the ground crew. 

* Use **Scan** for detailed analysis and reporting during or after the mission.

<br>
The two applications are designed to complement each other, and we're continuing to integrate their capabilities for seamless live operations. In the latest beta release, Eagle Eyes Pilot can transmit live GPS coordinates to Eagle Eyes Scan, allowing operators working with a live feed in Eagle Eyes Scan track the drone and geolocate detections in real time as they appear in Eagle Eyes Scan.

<div class="blog-media-container">
<iframe src="https://www.youtube.com/embed/cwZ4tvBRdjA" allowfullscreen></iframe>
</div>

<br>
## What's next?

At Eagle Eyes, our goal is to make drone operations in emergency response as seamless and effective as possible. We're continually working on making our software easier to use and more capable in the field.

<br>
On the roadmap:

* Livestreaming from Eagle Eyes Pilot over wifi and the internet - now available in our newest Eagle Eyes Pilot Beta
* Integrating DJI and Autel location data into Scan to track the drone and plot detections directly on a map.
* CalTopo integration for Eagle Eyes Scan;
* Expanded thermal tuning with real-time controls.
* Improved map overlays for clearer visualization of search coverage.
* Adding more video sources to Scan to support remote use, including in helicopters;
* Semi-autonomous flight planning capabilities for grid patterns and custom search areas;
* Deeper workflow integration to minimize distractions and streamline team coordination, such as easier sharing of coordinates.

<div class="blog-media-container">
<iframe src="https://www.youtube.com/embed/5C5rXdrCVVU" allowfullscreen></iframe>
</div>

<br>
We're always looking to improve Eagle Eyes based on real-world use. If you have a feature request or workflow idea, let us know at [info@eagleeyessearch.com](mailto:info@eagleeyessearch.com). 

<br>
<br>