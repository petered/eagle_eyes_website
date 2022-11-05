---
layout: default
---

<link rel="stylesheet" href="css/sliders.css">

# Eagle Eyes User Manual

__Contents__

* Getting Started
    - Trying out the app without a Drone
    - Running on the Drone
* About the automatic detection system
* Tips and tricks
* Troubleshooting

---

Welcome to the pre-release version of Eagle Eyes, and thank you for being one of
the first people to try out this tool.

__This is a pre-release for evaluation purposes - it has known and unknown bugs and is not yet recommended for use in live operations.  You should have another piloting app available (e.g. DJI-Go, DJI-Fly, Litchi) in case this app experiences errors.__

EagleEyes aims to facilitate the use of drones in Search and Rescue operations.
In additional to normal drone-piloting functionalities that you may be familiar 
with from apps like DJI Fly and Litchi, it has the following added functionalities:

1. Automatic detection of small unusual objects in video stream, based on colour and motion.
1. Ability to create and save "manual detections".
1. Storage, search, review, and sharing automatic/manual detections.
1. Ability to quickly inspect points of interest (double-tap to zoom)
1. Easy access to and sharing of coordinates (UTM or Lat/Long)
1. Detection on pre-recorded videos and phone's camera feed.

## Video Tutorials 


<div class="demo_container">
    <div class="spacer_cell"></div>
    <div class="demo_cell">
        <div class="caption">
            <b> Image-warping on live video </b>
            This is a screen recording from the EagleEyes app while flying the drone.   In this demo, EagleEyes uses pixel-warping to enhance a hard-to-see person.
        </div>
         <iframe src="https://drive.google.com/file/d/1a1RESg2Fp1_N822ChuDDpE1nlNLAgMXA/preview" width="100%" style="aspect-ratio:1.78" allow="autoplay"></iframe>
        <br/>
    </div>
</div>


## Getting Started 

### Trying out the app without a Drone
You can try out Eagle Eyes without connecting to a drone.  This is a good way to become familiar with the App.
From the __Connection Screen__, select one of the videos included in the App, or one from your device, and click 
__"Run on Video"__.  Or you can select 
__"Run on Phone"__ to run the app using your phone's
Camera and GPS instead of the Drone's.    This will take you to the __Piloting Screen__.

From the Piloting Screen, hold your finger on the "?" button on the upper-right to learn the controls.

Notes: 

* In "Video" mode, the GPS coordinates on the map are fake, and for demonstration purposes only.
* Some functions, like Tap-to-Zoom, record video, lift-off, etc, will only work on the real drone.


### Running on the Drone

Before flying in the field (where you may not have internet): 

* Download maps by clicking the "__"Maps"__" Button, scrolling to 
the area / zoom-level you're interested in, and waiting for the map-tiles to load.
The tiles should persist offline.
* Be sure you have at least 2GB of available storage on your phone (for storing maps and detections).
You can check this on Android with "Files -> (Scroll Down) -> Analyze Storage"
* Check that you are not in a restricted airspace.  Apps like B4UFly (USA) or Foreflight (worldwide) 
have maps of restricted airspace.
* Be aware of local legal requirements, like the US/Canadian requirements to register 250g+ drones 
and to maintain visual line-of-sight.  

If using a drone, connect to the controller as you would normally.  When a connection is established, the 
__"Run on Drone"__ should become active.  Click it to enter 
piloting mode.  Having trouble connecting?  Scroll to bottom for troubleshooting.

If you find something interesting, double-tap the video to zoom in for a closer look.
If you want to save it, click the __"Manual Detection"__ button, 
then hold your finger on a point of interest in the video, and release after 1s or more.
You'll then be prompted to optionally label and describe the finding, after which you can
choose to share the detection coordinates and/or images.

From the piloting screen, hold your finger on the "?" button on the upper-right to learn the controls.


## About the automatic detection system

The system is designed to look for small objects ("anomalies") whose colour stands out from the background, or 
which are moving when the rest of the frame is stationary.  

__The system is NOT a replacement for an attentive operator!__  

It is best treated as a "helper" which can point out things you may have missed, enabling the operator to look more closely.
Do not expect it to catch every object of interest.  

The system is expected to generate more false positives (boxes around objects
 that are not interesting) than true positives (boxes around real objects of interest). 
If you find all the false positives distracting, you can click the "H" button on the piloting screen to 
run detection silently in the background.  You can later see if you missed anything by going to the Detection 
Viewer screen (long click the __"Manual Detection"__ Button from the Piloting Screen or the 
__"Detections"__ from the Connection screen), and sorting by score.

We are continually working on improving the detection system. __You can help!__

If you feel the system missed something that it should have seen, or always detects something that it should 
just dismiss, you can create a manual detection (__"Manual Detection"__ Button), 
then send it with images to [info@eagleeyessearch.com](mailto:info@eagleeyessearch.com).  We will add it to the dataset and notify you when 
we release a model that solves this case.


## Tips and tricks

* The colour-based part of the automatic detection system works best when the background consists of
just a few colours (e.g. a green forest, and brown dirt) and the object of interest is of a different
colour than the surroundings.  Pointing the camera away from distractors (e.g. distant city-lights, 
houses, street signs, etc) can help to focus the system on the search.  The system may also perform better 
when the camera points downward so that it does not include sky in the frame, or glare from the sun.
* The motion-based part of automatic detection is only expected to work when the drone is stationary.
Stopping the drone and hovering in place can help to pick out moving objects.
* You can launch the drone without using the launch button.  On the controller, hold the left/right 
joysticks to the bottom-left/bottom-right respectively.  This should start the propellers - you can
then use the joysticks to command the drone to climb.   Certain models, like Mini2 can be "thrown" 
once the propellers start.  Others, like Air2S, cannot and will just fall if you do that.
* You can train yourself to deploy the drone efficiently.  Here is one suggested procedure that you can 
practice.  Once the muscle memory is there, you can do this while walking and thinking about other tasks.
  1. Start with drone zipped up in carrying case with shoulder strap.  
  2. Unzip case.
  3. Remove RC-controller, open phone-holder, remove phone-end of cable and unwind around holder 
  so it is ready to plug in.
  4. Plug in phone, snap into holder.
  5. Without turning RC-controller on, tuck it under left arm and hold it between arm and body. 
  6. If battery-change is needed on drone, remove battery from back of drone, insert into drone while it is face-down in case.
  7. Remove drone from case, remove gimbal and propeller protectors without looking at drone, put them back in case.
  8. Unfold propeller arms (front right, rear-right, front-left, rear-left), and turn on drone (listen for
  click and activation sound).
  9. Hold drone body between left index-finger and thumb.
  10. Now remove controller from under arm, turn on, hold it by top of phone-holder in left hand with ring-and-pinky 
  fingers, under drone.  Wait for it to connect.
  11. Hold drone level and activate propellers by pushing left/right joysticks to bottom-left/bottom-right respectively.
  Propellers should be spinning now.
  12. Point drone in whatever direction you want to call "forward".
  13. __If you have a Mini2__ - throw the drone in the air - it will start flying and orient itself in the forward direction. 
     __Don't do this with other drones - they will fall__.
  14. If you have another drone (eg. Air2S), press the left joystick UP with your right hand and let it go with your left hand.
  15. When you want to land, fly drone in front of you, hold out your right hand, and hold left joystick DOWN with left thumb
  so that it lands on your palm.  
  16. Once drone has landed in your palm, turn off RC-controller, tuck under arm again.
  17. Do the above steps 1-9 in reverse (without looking) to put drone back in case.  


## Troubleshooting

* __Cannot connect to Drone__ (__"Run on Drone"__ Button is greyed out)
  - Check that Controller is on and that the USB cable is firmly plugged into both the controller and phone.
  - Check that the drone is on.
  - Is __"Use Bridge App with IP:"__ checked?  If so, uncheck it.  Restart the app
  if the __"Run on Drone"__ Button still does not become active.
  - Is the trial-version expired?  If so, reactivate subscription.
  - Try restarting app after any of above steps.
  - Try connecting via DJI Fly / DJI Go app - if that fails, refer to DJI troubleshooting steps.  If it succeeds
  but you still cannot connect via EagleEyes, contact us at [info@eagleeyessearch.com](mailto:info@eagleeyessearch.com)
* __Other issues__ - please contact us at [info@eagleeyessearch.com](mailto:info@eagleeyessearch.com)