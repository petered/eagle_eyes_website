#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all FAQ items and their IDs
faq_items = re.findall(r'<div\s+class="faq-item"\s+id="([^"]+)"', content)

# Fix each share button onclick handler
for faq_id in faq_items:
    # Pattern to match the share button for this FAQ item
    pattern = f'<button class="faq-share-btn" onclick="shareFaqQuestion\\(\'{faq_id}\'\\)" title="Share this FAQ">'
    replacement = f'<button class="faq-share-btn" onclick="event.stopPropagation(); shareFaqQuestion(\'{faq_id}\'); return false;" title="Share this FAQ">'
    
    content = re.sub(pattern, replacement, content)

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all onclick handlers!")
