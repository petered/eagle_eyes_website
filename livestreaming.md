---
layout: default
---

Launch Livestream: 

1) **MacOS**: Install [Local RTMP Server](https://github.com/sallar/mac-local-rtmp-server/releases) and Launch the app - there should be a red camera icon on the menu-bar.  **Windows**: Install Monaserver (instructions coming...)

2) Turn on your drone, and connect the controller to the same WIFI network as your computer
   - One option is to start a hotspot from your phone, and connect both your computer and the drone to that hotspot
   - Another option is to connect both your computer and the drone-piloting-device to a WIFI network (e.g. portable hotspot)

3) Open the DJI Fly app on your phone/smart-controller, enter piloting screen, and click the "..." button in the top right
   then "Transmission" -> "Live Streaming Platforms" -> "RTMP" -> and enter "rtmp://{this_machine_local_ip}:1935/live"
   
4) Click "Ok" below to start the stream.  

Please allow up to 10 seconds for the stream to start.