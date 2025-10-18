#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all existing faq-share-container divs
content = re.sub(r'<div class="faq-share-container">.*?</div>\s*', '', content, flags=re.DOTALL)

# Fix the onclick handlers to use the correct FAQ ID
# Pattern to match faq-actions with wrong onclick
pattern_wrong_onclick = re.compile(r'''
    (<div class="faq-actions">.*?<span class="toggle-icon">\+</span>.*?<button class="faq-share-btn" onclick="shareFaqQuestion\('pricing'\)" title="Share this FAQ".*?>)
''', re.DOTALL | re.VERBOSE)

# Find all FAQ items and their IDs
faq_items = re.findall(r'<div\s+class="faq-item"\s+id="([^"]+)"', content)

# For each FAQ item, fix the onclick handler
for faq_id in faq_items:
    # Pattern to match the faq-actions within this specific FAQ item
    pattern = re.compile(f'''
        (<div\s+class="faq-item"\s+id="{faq_id}">.*?<div\s+class="faq-actions">.*?<span\s+class="toggle-icon">\+</span>.*?<button\s+class="faq-share-btn"\s+onclick="shareFaqQuestion\\('pricing'\\\)"\s+title="Share this FAQ".*?>)
    ''', re.DOTALL | re.VERBOSE)
    
    # Replace with correct onclick
    content = re.sub(pattern, rf'''\1onclick="shareFaqQuestion('{faq_id}')" title="Share this FAQ"''', content)

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed all FAQ share buttons!")
