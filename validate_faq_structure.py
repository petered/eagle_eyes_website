#!/usr/bin/env python3
"""
Validates the FAQ structure to ensure all items follow the correct pattern.
Checks for:
- Proper ID usage
- Share button structure
- Keyword registration
- Duplicate IDs
"""

import re

# Read the file
with open('faq.html', 'r') as f:
    content = f.read()

print("🔍 Validating FAQ Structure...\n")
print("=" * 60)

# Find all FAQ items
faq_items = re.findall(r'<div class="faq-item" id="([^"]+)">', content)
print(f"\n✅ Found {len(faq_items)} FAQ items")

# Check for duplicate IDs
duplicates = set([item for item in faq_items if faq_items.count(item) > 1])
if duplicates:
    print(f"\n❌ DUPLICATE IDs FOUND: {duplicates}")
else:
    print("✅ No duplicate IDs found")

# Find share buttons and their IDs
share_buttons = re.findall(r'shareFaqQuestion\([\'"]([^\'"]+)[\'"]\)', content)
print(f"\n✅ Found {len(share_buttons)} share buttons")

# Check if all FAQ items have share buttons
missing_share = set(faq_items) - set(share_buttons)
if missing_share:
    print(f"\n❌ FAQ items missing share buttons: {missing_share}")
else:
    print("✅ All FAQ items have share buttons")

# Check if all share buttons reference valid FAQ items
invalid_share = set(share_buttons) - set(faq_items)
if invalid_share:
    print(f"\n❌ Share buttons with invalid IDs: {invalid_share}")
else:
    print("✅ All share buttons reference valid FAQ IDs")

# Extract search metadata (alternates and tags)
metadata_ids = re.findall(r"} else if \(id === '([^']+)'\)", content)
metadata_ids = list(set(metadata_ids))  # Remove duplicates

if metadata_ids:
    print(f"\n✅ Found {len(metadata_ids)} entries with search metadata (alternates/tags)")
    
    # Check if all FAQ items have metadata
    missing_metadata = set(faq_items) - set(metadata_ids)
    if missing_metadata:
        print(f"\n⚠️  FAQ items without search metadata (will still work but may rank lower):")
        for item in sorted(missing_metadata):
            print(f"     - {item}")
    else:
        print("✅ All FAQ items have search metadata")
    
    # Check if all metadata entries reference valid FAQ items
    invalid_metadata = set(metadata_ids) - set(faq_items)
    if invalid_metadata:
        print(f"\n❌ Metadata entries without FAQ items: {invalid_metadata}")
    else:
        print("✅ All metadata entries match FAQ items")
else:
    print("\n⚠️  No search metadata found (FAQ search may not work optimally)")

# Check for old-style share containers
old_containers = content.count('<div class="faq-share-container">')
if old_containers > 0:
    print(f"\n❌ Found {old_containers} old-style share containers (should be removed)")
else:
    print("\n✅ No old-style share containers found")

# Check for proper share button structure
correct_pattern = r'<button class="faq-share-btn" onclick="event\.stopPropagation\(\); shareFaqQuestion\('
correct_buttons = len(re.findall(correct_pattern, content))
print(f"\n✅ {correct_buttons} share buttons have correct onclick structure")

# Summary
print("\n" + "=" * 60)
print("\n📊 VALIDATION SUMMARY:")
print(f"   Total FAQ Items: {len(faq_items)}")
print(f"   Total Share Buttons: {len(share_buttons)}")
print(f"   Total Search Metadata Entries: {len(metadata_ids) if metadata_ids else 0}")
print(f"   Correct Button Structure: {correct_buttons}")

issues = []
warnings = []
if duplicates:
    issues.append(f"Duplicate IDs: {len(duplicates)}")
if missing_share:
    issues.append(f"Missing share buttons: {len(missing_share)}")
if invalid_share:
    issues.append(f"Invalid share button IDs: {len(invalid_share)}")
if metadata_ids and missing_metadata:
    warnings.append(f"FAQs without search metadata: {len(missing_metadata)}")
if old_containers > 0:
    issues.append(f"Old share containers: {old_containers}")

if issues:
    print(f"\n❌ ISSUES FOUND: {', '.join(issues)}")
    print("\nPlease fix the issues above before deploying.")
elif warnings:
    print(f"\n⚠️  WARNINGS: {', '.join(warnings)}")
    print("\nFAQ structure is correct, but some items could benefit from search metadata.")
else:
    print("\n✅ All validations passed! FAQ structure is perfect.")

print("\n" + "=" * 60)

