---
layout: post
title: "Computer vision tools for drones in search and rescue"
image: "/images/shaggy_peak_orange_before.jpg"
date:   2023-03-15 16:46:00 -0800
author: Peter O'Connor
permalink: /blog/comparison
categories: jekyll update
---

As the daylight starts to fade, two hikers huddle under a tree somewhere in the wilderness of Beus Canyon, Utah.
What started as a simple day hike has turned into a desperate situation.  For hours, these two have been searching 
for a way out.  They are cold, they are lost, and 
the sun is setting fast.  Suddenly, the familiar buzz of a drone appears overhead.  That sound, normally an 
irritating reminder of the gradual encroachment of technology into nature, now comes as a welcome relief. 
After hours stuck in the steep, snowy cliffs, Weber County Search and Rescue has come to bring these hikers home.

[Stories like this](https://www.fox13now.com/news/local-news/stranded-hikers-spotted-by-drone-rescued-by-sar-volunteers-and-helicopter){:target="_blank"}
are becoming increasingly common as more Search and Rescue (SAR) teams use drones to locate missing persons, scan terrain
for accessibility, and view hard-to-reach areas during a search.

Having an eye in the sky is useful, but it's only half the battle.
One thing immediately becomes obvious once you start using drones to find people in a wilderness setting: 
It's harder than you'd think.  People often appear as tiny blotches of 
pixels, partly obscured by foliage, in an environment that is full of 
different objects and colours.  For a human scanning over these images, 
it is very easy to miss things that may be critical to the search.


As one SAR-drone operator put it:

> *You're looking for "just-noticeable differences" - things just on the edge of your perception*


Take this image for example, taken from a drone east of Albuquerque, New Mexico. 
This image contains a person.  Give yourself 10 seconds to find them.

<img src="{{ '/images/demos/image_1.jpg' | relative_url }}" alt="Missing Person" width="100%"/>

If you found them, congratulations, you're better than most!  If not, don't worry, you're in good company, and 
you will find the answer at the end of this article.

This gives just a glimpse of the difficulty that SAR drone-operators face. In a real operation, the operator
may have to scan through video like this for hours at a time, not even knowing whether the subject is 
there in the first place. 

Enter computer vision.  In the last few years, a number of tools have been developed to scan drone 
images and videos for objects of interest during a search and rescue operation.  

In this article - we will give a brief introduction and comparison of currently available tools for drones in search and rescue to help locate missing persons: **Loc8**, **Searchlight**, **SARUAV**, and of course - **Eagle Eyes**.  These are just the commercial tools available now - there are a whole slew of experimental prototypes from the academic literature, 
and those might just be the subject for another article one day.

_Before we start, a disclaimer:  As the author of one of these tools (Eagle Eyes), I cannot claim to be unbiased.
However, I do my best to give everyone a fair shake in this post - we are after all working towards the same 
objective: To help Search and Rescue teams to find people more effectively. If any of the publishers or users 
of these tools spot any inaccuracies, feel free to reach out to **info@eagleeyessearch.com**, and I will 
correct them._


## The Lineup

Let's introduce the contenders. 

|-----------------------------------------------------------------------------|-------------|
| <img src="{{ '/images/blog/loc8logo.png' | relative_url }}" alt="Loc8" width="100"/>               | **<a href="https://www.usri.ca/" target="_blank">Loc8</a>** is a software tool that scans through drone images for small objects of particular colours.  It is probably the most widely used computer vision tool by SAR teams today. |
| <img src="{{ '/images/blog/searchlightlogo.png' | relative_url }}" alt="SearchLight" width="100"/> | **<a href="https://www.sartechnology.ca/sartechnology/searchlight/Searchlight.html" target="_blank">SearchLight</a>** is an online tool to which you can submit images for scanning.  It uses an object-detection model that looks for people, crashed aircraft, vehicles, etc. in images. |
| <img src="{{ '/images/blog/saruavlogo.png' | relative_url }}" alt="SARUAV" width="100"/>           | **<a href="https://www.saruav.pl/" target="_blank">SARUAV</a>** is a startup that emerged from a 7 year industry-university co-op in Poland.  The tool has been used by a few SAR teams in Poland and Germany, and may be behind the <a href="https://www.mdpi.com/2072-4292/13/23/4903" target="_blank">first successful rescue</a> of a person using a computer vision system.  It uses a deep "object-detection" based approach similar to Searchlight. |
| <img src="{{ '/images/blog/eaglelogo.png' | relative_url }}" alt="EagleEyes" width="100"/>         | **<a href="https://www.eagleeyessearch.com/" target="_blank">Eagle Eyes</a>** is a new tool on the market.  It finds small "unusual" objects in both live streaming video from the drone, and recordings after the fact, using colour and motion.  It consists of _Eagle Eyes Pilot_ - a drone-piloting app with live detection, and _Eagle Eyes Scan_ - a tool for detection on video/images. |


## The Basics


| Feature                         | Loc8                                      | SearchLight                               | SARUAV                  | EagleEyes                 |
|---------------------------------|-------------------------------------------|-------------------------------------------|-------------------------|---------------------------|
| **Input format**                | Images                                    | Images                                    | Nadir Images            | Images/Videos             |
| **Live detection while flying** | ❌                                         | ❌                                         | ❌                       | ✅                         |
| **Thermal**                     | ✅ (with RDT kit)                          | ❌                                         | ❌                       | ⏳                         |
| **Works offline**               | ✅                                         | ❌                                         | ✅                       | ✅                         |
| **Platform**                    | Windows                                   | Web Browser                               | Windows                 | Windows/Mac/Android       |
| **Approach**                    | Colour-Filter                             | Deep-person-detection                     | Deep-person-detection   | Colour/Motion-Anomaly     |
| **Cost (USD/year)**             | $699 / $1199 <br/>(Visual/Visual+Thermal) | $588 / $1140 <br/>(Non-profit / profit) | (Unknown: contact them) | Free during alpha-testing |



## Input format 

All of these tools can take set of images as input.  SARUAV specifies that these images should 
be in the "Nadir" view - (ie looking down).  Eagle Eyes also accepts videos.  

For Search and Rescue purposes, a collection of overlapping images is often better than videos. 
Images usually have higher resolution, meaning it's possible to see smaller or more distant objects. 
Moreover, the standard 30 frames per second of video is often more than necessary to capture what needs
to be seen - good coverage of each point on the terrain from a few different viewpoints.

However there are a few advantages to video.  For one - motion can be a powerful cue when the subject is conscious and 
able to move.  They may be walking or waving in response to the sound of the drone.  This is especially important
when the colours that the person is wearing are similar to the colours of the surrounding terrain. 

A second advantage of video comes when flying over forest or dense foliage.  In these cases, you often 
get only very brief glimpses of things under the tree canopy.  With video, you are much more likely to capture 
these fleeting glimpses than with a series of images spaced several seconds apart.



## Live Detection while Flying

Of these tools - only **Eagle Eyes** offers live detection while flying.  You operate the drone as normal,
using the **Eagle Eyes Pilot** app on your mobile device.  The app displays the live video feed, along with
boxes around any objects deemed sufficiently "unusual" by the computer vision system.

<p align="center">
  <img src="{{ '/images/blog/eagle-eyes-pilot-screenshot.jpg' | relative_url }}" alt="Eagle Eyes Pilot" width="60%">
  <br/>
  The Eagle Eyes Pilot app shows a detection box over the live video feed.
    <br/>
  Here, the app detects a test dummy based on the red snowpants.
</p>



## Thermal

Thermal imagery can be a powerful tool for SAR, but its usefulness greatly depends on environment.  It performs
best on cold, cloudy days, when there is little temperature variation in the environment, 
and the body heat of a person stands out clearly.  It can be nearly useless in hot, sunny environments, where 
the temperature variation between hot rocks and cool shadows can easily drown out the heat signature of a person.

Unmanned Systems Research (the creators of Loc8) have also released the Radiometric Data Toolset (RDT) , 
a separate tool for detecting people (and in general, warm objects), in thermal imagery, by looking for small 
patches of heat.  It scans through thermal images collected from DJI M300 or M30T drones.

Eagle Eyes allows the user to view thermal imagery both live via the piloting app, and after the fact in the
video recording.  It allows the user to easily switch between visual and thermal imagery to verify 
a suspected detection in one modality against the other.  At time of writing, Eagle Eyes does not yet do 
automatic detection from thermal imagery, but it is in the pipeline. 


| Loc8 (RDT Kit)                                                                                    | Eagle Eyes                                                                                                                              |
|---------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------|
| <img src="{{ '/images/blog/usr-rdt-screenshot.png' | relative_url }}" alt="Loc8" width="500px"/>                         | <img src="{{ '/images/blog/eagle-eyes-pilot-thermal.png' | relative_url }}" alt="Eagle Eyes Pilot" width="500px"/>                                             |
| A screenshot from Loc8's Radiometric Data Toolset, showing the detection of a hand-warmer packet. | Eagle Eyes Pilot showing displays thermal imagery from a DJI ME2 Thermal Drone.  The heat-blob near the edge of the forest is a person. |


## Platform

_Searchlight_ is a web-based tool, and can be used on any platform with a web browser, but requires an internet connection.  
_Loc8_ and _SARUAV_ are Windows-only tools.  
_Eagle Eyes Scan_, the tool from Eagle Eyes for scanning through recorded images and video, 
is available for MacOS and Windows.  
_Eagle Eyes Pilot_, the tool from Eagle Eyes for piloting drones is available for Android devices


## Offline Detection

In Search and Rescue - offline operation is important.  SAR teams are often
operating far from urban centers, or in areas where mountainous terrain makes for poor cell signal.
Of the above tools, only **Searchlight** requires an internet connection.  In Searchlight you upload 
images to an online portal for processing.

## Approach to Detection

In this section I'll go over the general approach to detection taken by each tool, and link to a 
video demo from each tool's creator - providing a sprinkling of my own commentary at the end.

### Loc8

**Loc8** is based on colour-filtering.  In the original version, you specify a "box" in colour space, 
either using a colour-picker or providing a sample image (e.g. a cropped image of blue jeans, showing a 
sampling of the shades of blue that one might expect to find.).  A more recent "G2" version adds the 
"Multichannel Dynamic Algorithm Search" (MDAS) which allows for multiple colour filters to be run in parallel, 
meaning you don't need a prior idea of what colour to look for (though it helps to have one).  

<p align="center">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/cWFCKFH7LZo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</p>

**Comments** Unlike the other tools here, Loc8 provides a lot of "knobs" that the operator can tune when 
deciding what to search for.  This can be a strength, especially when you know what colour you're looking 
for (e.g. from a report of a missing person wearing a specific colour of clothing).  However it can also be 
a distraction, especially in a time-critical situation where you don't have time to be tweaking parameters.

That said, the tool clearly has a history of use in the field, and is currently used by several SAR teams 
around the world.  


## Searchlight


**Searchlight** uses a deep-learning based approach.  The model has been trained on images 
of downed aircraft, hikers, etc.  You are able to chose what type of object you are looking for, or search 
by colour-palette, and you can define a "confidence threshold".  The tool uses a web-based interface, 
where you can submit a folder of images for processing.  This, as mentioned before, has the disadvantage 
that you need an internet connection to use it.  

<p align="center">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/Npqn1aYdf3Y" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</p>


**Comments** On the plus side, the web-based interface means nothing needs to be installed on the user's machine.
However, there seems to be some significant drawbacks to this tool.  First, the need for an internet connection can prevent 
the tool from being used in the field.  Second, the need to upload images presents a legal problem for SAR teams who 
often are required to keep images private - as they are often property of the local police force and may be evidence 
in an investigation.  Third is the lack of compelling demos.  The images shown in the demos and website 
are high-res images of objects that would be easily found by eye anyway - it is not clear how the tool performs in 
the more realistic scenarios where the object is just a small blob of pixels in a large image.


### SARUAV

This demo video shows the SAR-UAV system.  It shows a mock SAR operation, where the drone is first
launched to fly a path of the search area, take a series of images, then run them through the detection system.

<p align="center">
  <iframe width="560" height="315" src="https://www.youtube.com/embed/4PimBq7YdoM" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</p>

**Comments**: The provided video appears to demonstrate the software being used in the field by a real SAR team.
Based on [this paper](https://www.mdpi.com/2072-4292/13/23/4903#B21-remotesensing-13-04903){:target="_blank"}
it appears that the software has directly contributed to the rescue of a person.  However, there are few demos available
online, and it is hard to judge based on the limited evidence whether SARUAV is a complete, deployable tool.



### EagleEyes

Eagle Eyes scans a video-stream for colour-anomalies and isolated moving objects.  The app comes in two forms.
_Eagle Eyes Pilot_ is an Android app for piloting the drone, showing detection on the live video stream, and
_Eagle Eyes Scan_ is a Windows/MacOS desktop app which runs the detection algorithm offline on recorded video. 
The algorithm is more of a "black box" than Loc8, presenting the user with just a single threshold to tune.  It looks 
for colour-and-motion anomalies - things that just "don't fit in" to the scene. Eagle Eyes presents the user with a
ranked list of detections, linked to the GPS coordinates of the drone at the time of detection.

<p align="center">
  <iframe src="https://streamable.com/e/710hvk" width="560" height="315" frameborder="0" allowfullscreen></iframe>
</p>

**Comments**: The demos make it clear that Eagle Eyes definitely finds things that would be difficult to find by eye.
The tool appears to be easier to get started with than Loc8, but is less customizable, which may matter in situations where
you have a specific idea of what you are looking for.  Some demos show that the system also produces false-positives,
which the operator needs to dismiss manually.


## But how well do they actually work?

Currently, there is simply no way to make an apples-to-apples comparison between these tools.  For now
the best you can do is to judge for yourself based on the above videos.

The tools obviously have their various advantages and drawbacks, but at the same time, they are all 
performing a similar task - finding people in the wilderness - and they should be comparable in principle.

In the world of computer vision - you compare things by having a standard dataset, defining a scoring function, 
and then comparing the scores of different models on that dataset.  Setting up a proper benchmark for comparison 
is a non-trivial task, with a lot of gotchas, and may well be the subject of a future blog post.

<!--
In the meantime, here are some things that we would have to consider even if we did have a dataset 
and a formal way to compare models:

* When the dataset is public, models can be "tuned" to perform well on it, without necessarily 
  generalizing well to other datasets.  This is especially the case for models trained with machine-
  learning techniques.  
* Different models have different expectations - fort example SARUAV expects input in "nadir-view" 
  (looking down) while EagleEyes and Loc8 do not expect any particular camera orientation.  A model's 
  mileage may vary greatly depending on how well the actual camera footage matches these expectations.
* We need to be careful that we are comparing apples to apples.  For example, SARUAV is a tool for 
  finding people, while EagleEyes is a tool for finding anything that doesn't fit in to the background.
* Detection models often have thresholds which can be tuned depending on the users tolerance for false-positives.
  A user trying to do a hasty search with minimal distractions may set a high threshold, whereas a user 
  performing a recovery operation where time is not a critical factor may set a lower threshold and take 
  the time to look through more false-positives.  A good scoring system should use a threshold-independent
  scoring function like the [Area Under the Curve (AUC) score](https://developers.google.com/machine-learning/crash-course/classification/roc-and-auc#:~:text=AUC%20represents%20the%20probability%20that,has%20an%20AUC%20of%201.0.){:target="_blank"}.
-->

## Conclusions


**Loc8** is an impressive and fairly mature tool with a record of use in the field.  It can require extensive 
tuning to work well in a given environment, but can provide impressive results when the filters are tuned appropriately.

**Searchlight** and **SARUAV** both may have use, but really need more compelling demos to show their value.

**Eagle Eyes** is the only tool that works live, while flying the drone, and may or may not be an improvement over Loc8
when scanning recorded images and video.  While it has fewer customization options than Loc8, it appears 
to be significantly easier to use for scanning video.

Currently, since there is no way to do an apples-to-apples comparison between these models, you will have to try these 
different tools for yourself to see what suits you best.  Fortunately, for **Eagle 
Eyes** - you can try it for free if you sign up as an alpha-tester.  [Click here](https://forms.gle/C6zmhQBYRPzKUJ6G7) 
to request a free trial of the Eagle Eyes software.  


## So where was that person?

In case you did not find the person in that picture at the top of this article - no problem, Eagle Eyes has your back:

<img src="{{ '/images/demos/image_1_boxed.jpg' | relative_url }}" alt="Missing Person" width="100%"/>
