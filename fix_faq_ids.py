#!/usr/bin/env python3

import re

# Read the file
with open('faq.html', 'r') as f:
    content = f.read()

# Define the correct FAQ ID mappings
faq_mappings = {
    'pricing': 'pricing',
    'beta-stable-same-device': 'beta-stable-same-device', 
    'license-sharing': 'license-sharing',
    'system-requirements': 'system-requirements',
    'pilot': 'pilot',
    'livestreaming': 'livestreaming',
    'pilot-scan-together': 'pilot-scan-together',
    'dji-eagle-eyes-simultaneous': 'dji-eagle-eyes-simultaneous',
    'other-pilot-apps': 'other-pilot-apps',
    'switch-dji-eagle-eyes': 'switch-dji-eagle-eyes',
    'drone-telemetry': 'drone-telemetry',
    'mac-ios': 'mac-ios',
    'offline': 'offline',
    'gps-video-recording': 'gps-video-recording',
    'detector-explanation': 'detector-explanation',
    'coordinates': 'coordinates',
    'gimbal-recalibrate': 'gimbal-recalibrate',
    'feedback': 'feedback',
    'full-res-photos': 'full-res-photos',
    'controller-setup': 'controller-setup',
    'scan-license-activation': 'scan-license-activation',
    'caltopo-connection': 'caltopo-connection',
    'offline-tracking': 'offline-tracking',
    'marker-drop': 'marker-drop',
    'app-store': 'app-store',
    'privacy': 'privacy'
}

# Fix each FAQ item
for faq_id, correct_id in faq_mappings.items():
    # Find the FAQ item with this ID
    pattern = rf'<div class="faq-item" id="{faq_id}">.*?<button class="faq-share-btn" onclick="[^"]*"'
    
    def replace_onclick(match):
        return match.group(0).replace('onclick="event.stopPropagation(); shareFaqQuestion(\'pricing\'); return false;"', f'onclick="event.stopPropagation(); shareFaqQuestion(\'{correct_id}\'); return false;"')
    
    content = re.sub(pattern, replace_onclick, content, flags=re.DOTALL)

# Write the file back
with open('faq.html', 'w') as f:
    f.write(content)

print("Fixed all FAQ onclick handlers with correct IDs!")
