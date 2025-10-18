#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match FAQ questions that don't have the new structure yet
# This matches the old structure where toggle-icon is directly in faq-question
pattern_old_structure = re.compile(r'''
    (<span\s+class="faq-question-text">.*?</span>)\s*
    (<span\s+class="toggle-icon">\+</span>)
''', re.DOTALL | re.VERBOSE)

# Replacement to add faq-actions wrapper around toggle-icon and share button
replacement_new_structure = r'''\1
                            <div class="faq-actions">
                                \2
                                <button class="faq-share-btn" onclick="shareFaqQuestion('{faq_id}')" title="Share this FAQ" style="background: red; color: white; border: 2px solid black; padding: 10px; margin-left: 10px;">
                                    SHARE
                                </button>
                            </div>'''

# First, let's find all FAQ items and their IDs
faq_items = re.findall(r'<div\s+class="faq-item"\s+id="([^"]+)"', content)

# For each FAQ item, apply the transformation
for faq_id in faq_items:
    # Create a specific pattern for this FAQ item
    pattern_specific = re.compile(f'''
        (<div\s+class="faq-item"\s+id="{faq_id}">.*?<div\s+class="faq-question">.*?<span\s+class="faq-question-text">.*?</span>)\s*
        (<span\s+class="toggle-icon">\+</span>)
        (.*?</div>.*?<div\s+class="faq-answer">)
    ''', re.DOTALL | re.VERBOSE)
    
    # Apply the transformation
    content = re.sub(pattern_specific, rf'''\1
                            <div class="faq-actions">
                                \2
                                <button class="faq-share-btn" onclick="shareFaqQuestion('{faq_id}')" title="Share this FAQ" style="background: red; color: white; border: 2px solid black; padding: 10px; margin-left: 10px;">
                                    SHARE
                                </button>
                            </div>
                        \3''', content)

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Updated {len(faq_items)} FAQ items with share buttons!")
