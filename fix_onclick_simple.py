#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update all onclick handlers to use simple format
content = re.sub(
    r'onclick="shareFaqQuestion\(event, \'([^\']+)\'\)"',
    r'onclick="shareFaqQuestion(\'\1\')"',
    content
)

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Onclick handlers updated to simple format!")
