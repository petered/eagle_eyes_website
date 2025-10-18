#!/usr/bin/env python3

import re

# Read the file
with open('faq.html', 'r') as f:
    content = f.read()

# Find all FAQ items and their IDs
faq_items = re.findall(r'<div class="faq-item" id="([^"]+)">', content)

print(f"Found FAQ items: {faq_items}")

# Fix each FAQ item's onclick handler
for faq_id in faq_items:
    # Find the onclick handler for this FAQ item and replace it
    pattern = rf'<div class="faq-item" id="{faq_id}">.*?<button class="faq-share-btn" onclick="[^"]*"'
    
    def replace_onclick(match):
        # Replace any onclick handler with the correct FAQ ID
        onclick_pattern = r'onclick="[^"]*"'
        new_onclick = f'onclick="event.stopPropagation(); shareFaqQuestion(\'{faq_id}\'); return false;"'
        return re.sub(onclick_pattern, new_onclick, match.group(0))
    
    content = re.sub(pattern, replace_onclick, content, flags=re.DOTALL)
    print(f"Fixed FAQ item: {faq_id}")

# Write the file back
with open('faq.html', 'w') as f:
    f.write(content)

print("Fixed all FAQ onclick handlers with correct IDs!")
