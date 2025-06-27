---
layout: post
title: "How StormPoint leveraged Eagle Eyes to Locate Hurricane Helene Survivors by Drone"
image: "images/stormpoint-banner.jpg"
date: 2025-05-03 09:00:00 -0800
author: Joep Maas
permalink: /blog/stormpoint-hurricane-helene
categories: case-study disaster-response
---

In September 2024, Hurricane Helene tore a destructive path across parts of Florida, Georgia, North Carolina, and Tennessee. A non-profit specializing in using drones for response efforts demonstrated how combining drone technology with specialized software can transform disaster relief.

Hurricane Helene caused widespread damage and flooding, leaving many people in hazardous conditions. Collapsed bridges and roads, filled with water and debris, made it hard for first responders to locate stranded people and deliver essential supplies. 

<a href="https://stormpoint.org/" target="_blank" rel="noopener">StormPoint</a>, a charitable nonprofit that uses drones for emergency response, quickly mobilized to survey the aftermath. Their goal was to locate stranded individuals, guide rescue efforts, and deliver aid to areas that ground vehicles couldn't reach.

![A collapsed bridge in Eastern Tennessee]({{ site.baseurl }}/images/stormpoint1.jpg)
*A collapsed bridge in Eastern Tennessee (Source: StormPoint)*

<br>
## The right tools for the job

StormPoint's teams used off-road vehicles, portable power stations, and Starlink to operate in even the most disrupted areas. Their fleet included DJI M30T, M3E and M3T drones for search and mapping.

Deliveries often required beyond-visual-line-of-sight (BVLOS) flights, demanding careful planning and airspace coordination. StormPoint worked with local emergency managers to avoid conflicts with helicopters and other drone teams. 

<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
  <div style="flex: 1; margin-right: 10px;">
    <img src="{{ site.baseurl }}/images/stormpoint2.jpg" alt="StormPoint field operations" style="width: 100%; height: auto;">
  </div>
  <div style="flex: 1; margin-left: 10px;">
    <img src="{{ site.baseurl }}/images/stormpoint3.jpg" alt="StormPoint mobile command unit" style="width: 100%; height: auto;">
  </div>
</div>
<div style="text-align: center; font-style: italic; margin-bottom: 20px;">
  StormPoint coordinated operations both in the field and from their mobile command unit (Source: StormPoint)
</div>

<br>
## Eagle Eyes in action

In a <a href="https://youtu.be/Y22zKInhP1Q?si=Ra4ba54q9IpaOOBr&t=1476" target="_blank" rel="noopener">webinar</a> hosted by DJI, Jeff Clementi, Operations Manager at StormPoint, explained how leveraging Eagle Eyes helped identify targets they might have otherwise missed. While StormPoint captured aerial footage, Matt Quinn of Great Lakes Drone Company used Eagle Eyes Scan to analyze the footage, add small descriptions to the detections, and generate useful reports for StormPoint to investigate. This allowed StormPoint to stay focused on continuous search and relief flights.

> "We were very, very fortunate to be able to use Eagle Eyes. It was incredibly helpful for us. The software was able to notice the smallest details... The reports it generates are really neat, containing pictures and coordinates of each detection."
> — Jeff Clementi, Operations Manager at StormPoint

![Eagle Eyes helped process imagery]({{ site.baseurl }}/images/Stormpoint4.png)
*Eagle Eyes helped StormPoint to sift through masses of drone imagery to find targets to investigate*

<br>
## Lessons learned

This is the first major case of Eagle Eyes being used in a disaster response scenario, as opposed to more typical Search and Rescue use. We learned the following:

* **Handling large volumes of detections:** Eagle Eyes detects non-natural objects in remote areas, but urban settings lead to more detections. We can reduce the workload of verifying detection by fine-tuning the detector and grouping different detections of the same object.

* **Collaborating across teams:** Disaster response is a mutual aid effort where different teams use different tools. There is a need for drone pilots to share their observations more easily with others, for example by integrating with other mapping and drone software.

* **Organizing drone footage:** With non-stop drones in the air, the amount of footage can quickly become overwhelming. There is a need for a better system to effectively organize and reference the footage, its associated flight tracks and their detections.

We are using what we've learned to make our products better. Eagle Eyes Pilot is an upcoming DJI piloting application that is now being tested with StormPoint. Drone pilots can mark objects during flight and send images and exact locations straight to CalTopo, so ground teams know exactly where to go. Along with Eagle Eyes' detection system, we hope this will cut down response times even more.

<br>
## Support StormPoint

StormPoint's dedication to saving lives and bringing relief hinges on partnerships, donations, and volunteer support. Consider making a donation through their <a href="https://stormpoint.org/" target="_blank" rel="noopener">website</a>. Funds will be used for supplies and equipment for our team to assist other first responders and local residents.

<br><br>

<!-- Webinar Caption & Embed -->
<div style="text-align: center; font-style: italic; margin-bottom: 10px;">
  Watch the webinar recording with StormPoint below (video starts at 24:36)
</div>
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-bottom: 20px;">
  <iframe src="https://www.youtube.com/embed/Y22zKInhP1Q?start=1476" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
<br>

