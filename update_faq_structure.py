#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match FAQ items with share buttons
pattern = r'(<div class="faq-item" id="[^"]+">)\s*(<div class="faq-question">.*?</div>)\s*(<button class="faq-share-btn"[^>]*>.*?</button>)\s*(<div class="faq-answer">)'

# Replacement structure with share container
replacement = r'\1\n                        \2\n                        <div class="faq-share-container">\n                            \3\n                        </div>\n                        \4'

# Replace all occurrences
updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("FAQ structure updated successfully!")
