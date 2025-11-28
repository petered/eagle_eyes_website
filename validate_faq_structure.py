#!/usr/bin/env python3
"""
Validates the FAQ structure to ensure all items follow the correct pattern.
Checks for:
- Proper ID usage
- Duplicate IDs
- Duplicate emoji symbols
- Required fields
- Search metadata coverage
- YAML syntax validation
"""

import yaml
import sys
from collections import Counter

print("🔍 Validating FAQ Structure...\n")
print("=" * 60)

# Read the YAML file
try:
    with open('_data/faqs.yml', 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
except FileNotFoundError:
    print("❌ ERROR: _data/faqs.yml not found!")
    print("   Make sure you're running this script from the project root directory.")
    sys.exit(1)
except yaml.YAMLError as e:
    print(f"❌ ERROR: YAML syntax error in _data/faqs.yml")
    print(f"   {e}")
    sys.exit(1)

if not data or 'faqs' not in data:
    print("❌ ERROR: No 'faqs' key found in _data/faqs.yml")
    sys.exit(1)

faqs = data['faqs']
print(f"\n✅ Found {len(faqs)} FAQ items")
print(f"✅ YAML syntax is valid")

# Check for duplicate IDs
ids = [faq.get('id', '') for faq in faqs]
duplicate_ids = {k: v for k, v in Counter(ids).items() if v > 1}
if duplicate_ids:
    print(f"\n❌ DUPLICATE IDs FOUND:")
    for faq_id, count in duplicate_ids.items():
        print(f"   - '{faq_id}' appears {count} times")
        # Find which FAQs have this ID
        matching_faqs = [i for i, f in enumerate(faqs) if f.get('id') == faq_id]
        for idx in matching_faqs:
            question = faqs[idx].get('question', 'N/A')[:50]
            print(f"     → FAQ #{idx + 1}: {question}...")
else:
    print("✅ No duplicate IDs found")

# Check for duplicate emojis
emojis = []
emoji_to_faqs = {}
for i, faq in enumerate(faqs):
    emoji = faq.get('emoji', '')
    if emoji:  # Only check non-empty emojis
        emojis.append(emoji)
        if emoji not in emoji_to_faqs:
            emoji_to_faqs[emoji] = []
        emoji_to_faqs[emoji].append((i, faq.get('id', ''), faq.get('question', '')[:50]))

duplicate_emojis = {k: v for k, v in Counter(emojis).items() if v > 1}
if duplicate_emojis:
    print(f"\n❌ DUPLICATE EMOJI SYMBOLS FOUND:")
    for emoji, count in duplicate_emojis.items():
        print(f"   - Emoji '{emoji}' is used {count} times")
        # Show which FAQs use this emoji
        for idx, faq_id, question in emoji_to_faqs[emoji]:
            print(f"     → FAQ #{idx + 1} (id: '{faq_id}'): {question}...")
    print(f"\n   ⚠️  Each FAQ must have a unique emoji symbol!")
    print(f"   Please change one of the duplicate emojis to a different symbol.")
else:
    print("✅ No duplicate emoji symbols found")

# Check required fields
required_fields = ['id', 'emoji', 'question', 'pages', 'content']
missing_fields = []
for i, faq in enumerate(faqs):
    faq_id = faq.get('id', f'FAQ #{i + 1}')
    for field in required_fields:
        if field not in faq:
            missing_fields.append((faq_id, field))

if missing_fields:
    print(f"\n❌ MISSING REQUIRED FIELDS:")
    for faq_id, field in missing_fields:
        print(f"   - FAQ '{faq_id}' is missing required field: '{field}'")
else:
    print("✅ All FAQ items have required fields")

# Check search metadata (REQUIRED)
has_metadata = 0
missing_metadata = []
for i, faq in enumerate(faqs):
    faq_id = faq.get('id', f'FAQ #{i + 1}')
    question = faq.get('question', 'N/A')[:60]
    
    # Check if search section exists
    if 'search' not in faq:
        missing_metadata.append((faq_id, question, 'search section', 'alternates', 'tags'))
        continue
    
    search = faq.get('search', {})
    has_alternates = 'alternates' in search and search.get('alternates', '').strip()
    has_tags = 'tags' in search and search.get('tags', '').strip()
    
    if has_alternates and has_tags:
        has_metadata += 1
    else:
        missing_parts = []
        if not has_alternates:
            missing_parts.append('alternates')
        if not has_tags:
            missing_parts.append('tags')
        missing_metadata.append((faq_id, question, None, missing_parts))

if missing_metadata:
    print(f"\n❌ MISSING SEARCH METADATA (REQUIRED):")
    print(f"   Search metadata (alternates and tags) is required for all FAQs to ensure")
    print(f"   optimal search functionality. FAQs without metadata will rank lower in search results.")
    print(f"\n   FAQs missing search metadata:")
    for item in missing_metadata:
        if len(item) == 4 and item[2] == 'search section':
            faq_id, question, _, _ = item
            print(f"   - FAQ '{faq_id}': {question}...")
            print(f"     ❌ Missing entire 'search' section")
            print(f"     → Add: search:\n         alternates: \"...\"\n         tags: \"...\"")
        else:
            faq_id, question, _, missing_parts = item
            print(f"   - FAQ '{faq_id}': {question}...")
            print(f"     ❌ Missing: {', '.join(missing_parts)}")
            if 'alternates' in missing_parts:
                print(f"     → Add 'alternates' field with 2-4 natural phrasings of the question")
            if 'tags' in missing_parts:
                print(f"     → Add 'tags' field with 3-8 relevant keywords")
    print(f"\n   📖 See FAQ_README.md section 'Step 3: Add Search Metadata' for examples")
    print(f"   Example format:")
    print(f"     search:")
    print(f"       alternates: \"buy license purchase order payment credit card\"")
    print(f"       tags: \"purchase buy license payment credit-card stripe\"")
else:
    print(f"\n✅ All FAQ items have search metadata (alternates and tags)")

# Summary
print("\n" + "=" * 60)
print("\n📊 VALIDATION SUMMARY:")
print(f"   Total FAQ Items: {len(faqs)}")
print(f"   Unique IDs: {len(set(ids))}")
print(f"   Unique Emojis: {len(set([e for e in emojis if e]))}")
print(f"   Search Metadata Coverage: {has_metadata}/{len(faqs)} ({100*has_metadata//len(faqs) if faqs else 0}%)")

issues = []
if duplicate_ids:
    issues.append(f"Duplicate IDs: {len(duplicate_ids)}")
if duplicate_emojis:
    issues.append(f"Duplicate emoji symbols: {len(duplicate_emojis)}")
if missing_fields:
    issues.append(f"Missing required fields: {len(missing_fields)}")
if missing_metadata:
    issues.append(f"Missing search metadata: {len(missing_metadata)}")

if issues:
    print(f"\n❌ ISSUES FOUND: {', '.join(issues)}")
    print("\nPlease fix the issues above before deploying.")
    print("\n💡 TIP: Run this script before committing to catch issues early!")
    sys.exit(1)
else:
    print("\n✅ All validations passed! FAQ structure is perfect.")
    print(f"   ✓ All {len(faqs)} FAQs have unique IDs")
    print(f"   ✓ All {len(faqs)} FAQs have unique emojis")
    print(f"   ✓ All {len(faqs)} FAQs have required fields")
    print(f"   ✓ All {len(faqs)} FAQs have search metadata")
    sys.exit(0)

print("\n" + "=" * 60)
