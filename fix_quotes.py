#!/usr/bin/env python3
import re

# Read the FAQ file
with open('faq.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the escaped quotes
content = content.replace("onclick=\"shareFaqQuestion(\\'", "onclick=\"shareFaqQuestion('")
content = content.replace("\\')\"", "')\"")

# Write back
with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Quote escaping fixed!")
