#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove "SHARE" text from all share buttons
pattern = re.compile(r'<button class="faq-share-btn"[^>]*>\s*SHARE\s*</button>', re.DOTALL)
content = re.sub(pattern, '<button class="faq-share-btn" onclick="shareFaqQuestion(\'faq-id\')" title="Share this FAQ">\n                                </button>', content)

# Fix the onclick handlers to use the correct FAQ IDs
faq_items = re.findall(r'<div\s+class="faq-item"\s+id="([^"]+)"', content)

for faq_id in faq_items:
    # Replace the generic onclick with the specific FAQ ID
    content = re.sub(
        f'<button class="faq-share-btn" onclick="shareFaqQuestion\\(\'faq-id\'\\)" title="Share this FAQ">',
        f'<button class="faq-share-btn" onclick="shareFaqQuestion(\'{faq_id}\')" title="Share this FAQ">',
        content
    )

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Removed SHARE text from all buttons!")
