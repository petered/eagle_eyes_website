#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match the old structure
pattern = r'(<div class="faq-question">)\s*(<span class="faq-question-text">.*?</span>)\s*<div class="faq-question-actions">\s*(<button class="faq-share-btn".*?</button>)\s*(<span class="toggle-icon">\+</span>)\s*</div>\s*(</div>)'

# Replacement structure
replacement = r'\1\n                            \2\n                            \4\n                        \5\n                        \3'

# Replace all occurrences
updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(updated_content)

print("FAQ structure updated successfully!")

