# FAQ Page - Quick Reference

## 📋 Overview

The Eagle Eyes FAQ page (`/faq.html`) is fully set up with:
- ✅ **31 FAQ questions** with unique IDs
- ✅ **Share buttons** on every question (copies unique URLs to clipboard)
- ✅ **Email copy functionality** (click email addresses to copy)
- ✅ **MiniSearch** full-text search with BM25 ranking
- ✅ **Automatic expansion** when accessing via direct links (e.g., `/faq/#pricing`)
- ✅ **Mobile responsive** design

---

## 🚀 Quick Start - Adding a New FAQ

### 1. Read the Instructions
👉 **See [FAQ_INSTRUCTIONS.md](./FAQ_INSTRUCTIONS.md)** for complete step-by-step guide

### 2. Follow This Pattern

```html
<div class="faq-item" id="your-unique-id">
    <div class="faq-question">
        <span class="faq-question-text">🔤 Your Question Here?</span>
        <div class="faq-actions">
            <span class="toggle-icon">+</span>
            <button class="faq-share-btn" onclick="event.stopPropagation(); shareFaqQuestion('your-unique-id'); return false;" title="Share this FAQ">
            </button>
        </div>
    </div>
    <div class="faq-answer">
        <p>Your answer here...</p>
    </div>
</div>
```

### 3. Add Search Metadata

Find the section marked `IMPORTANT: When adding NEW FAQs` (around line 570) and add:

```javascript
} else if (id === 'your-unique-id') {
    alternates = 'alternative ways to ask this question';
    tags = 'keyword1 keyword2 keyword3';
}
```

### 4. Validate Your Changes

```bash
python3 validate_faq_structure.py
```

---

## 🛠️ Tools Provided

### 1. FAQ_INSTRUCTIONS.md
Complete guide for adding new FAQ questions with:
- Detailed structure explanation
- Step-by-step instructions
- Complete working example
- Troubleshooting guide
- Best practices

### 2. validate_faq_structure.py
Validation script that checks:
- No duplicate IDs
- All FAQ items have share buttons
- Share buttons reference valid IDs
- Proper onclick structure
- Search metadata coverage
- No leftover duplicate containers

**Run it before committing:**
```bash
python3 validate_faq_structure.py
```

---

## ✨ Key Features

### Share Buttons
- Custom icon (`images/share_icon.png`)
- Positioned to the right of the "+" toggle
- Copies unique URL (e.g., `https://www.eagleeyessearch.com/faq/#pricing`)
- Shows toast notification: "Link copied to clipboard!"
- Works on both desktop and mobile

### Email Links
- All instances of `info@EagleEyesSearch.com` are clickable
- Click to copy email to clipboard
- Shows toast notification: "Email copied to clipboard!"
- Located in:
  - FAQ answers
  - "No results" search message
  - Footer (sitewide)

### Search System
- MiniSearch library with BM25 ranking
- Searches question text, alternates, tags, and answers
- Fuzzy matching for typos
- Query expansion for common concepts
- Real-time results as you type

### Direct Links
- Each FAQ has unique URL: `/faq/#question-id`
- Automatically expands when accessed via direct link
- Perfect for sharing specific questions

---

## 📝 Current Status

### FAQ Items: 31
All properly structured with share buttons ✅

### Search Metadata Coverage
- **With metadata:** 7 items (optimal search ranking)
- **Without metadata:** 24 items (still searchable, but may rank lower)

**Note:** FAQs without metadata still work fine. Metadata just improves search ranking.

---

## 🎯 Best Practices

### When Adding a New FAQ:

1. **Choose a descriptive, unique ID**
   - Use lowercase
   - Separate words with hyphens
   - Examples: `pricing`, `free-trial`, `system-requirements`

2. **Copy the exact structure**
   - Don't modify the share button code
   - Keep `event.stopPropagation()` in onclick
   - Use the same class names

3. **Add search metadata**
   - Helps users find your question
   - Think about how people will search for it
   - Include variations and synonyms

4. **Test everything**
   - Click the question (expands/collapses)
   - Click the share button (copies URL)
   - Search for your question
   - Access via direct link

5. **Run validation**
   ```bash
   python3 validate_faq_structure.py
   ```

---

## 🔧 Troubleshooting

### Share button not working?
- Check the onclick handler matches the pattern
- Verify the ID is unique
- Clear browser cache

### Question not appearing in search?
- Add metadata (alternates & tags)
- Check the FAQ item has a unique ID
- Try more keywords in tags

### Direct link doesn't open?
- Verify ID is correct (case-sensitive)
- Check for no duplicate IDs
- Test URL format: `/faq/#your-id`

### Need help?
See [FAQ_INSTRUCTIONS.md](./FAQ_INSTRUCTIONS.md) for detailed troubleshooting.

---

## 📦 Files

- **faq.html** - Main FAQ page
- **FAQ_INSTRUCTIONS.md** - Complete guide for adding FAQs
- **validate_faq_structure.py** - Validation script
- **FAQ_README.md** - This file (quick reference)
- **_includes/footer.html** - Footer with email link
- **images/share_icon.png** - Share button icon

---

## 📊 Technical Details

### Structure Components
```
.faq-item (ID: unique-question-id)
├── .faq-question
│   ├── .faq-question-text (the question)
│   └── .faq-actions
│       ├── .toggle-icon (the "+")
│       └── .faq-share-btn (share button)
└── .faq-answer (the answer content)
```

### JavaScript Functions
- `shareFaqQuestion(faqId)` - Handles share button clicks
- `copyToClipboard(text)` - Copies text with modern/fallback APIs
- `showCopyNotification()` - Displays toast notification
- `copyEmailToClipboard()` - Copies email address
- `showEmailCopyNotification()` - Email-specific notification

### Search System
- **Library:** MiniSearch v6.3.0
- **Algorithm:** BM25 ranking
- **Fields indexed:** question, alternates, tags, answer
- **Boost weights:** question (3x), alternates (2x), tags (2x), answer (1x)
- **Fuzzy matching:** 0.2 tolerance

---

## ✅ Validation Checklist

Before deploying changes:

- [ ] All new FAQ items have unique IDs
- [ ] Share buttons added with correct onclick
- [ ] Search metadata added (optional but recommended)
- [ ] `python3 validate_faq_structure.py` passes
- [ ] Tested: question expands/collapses
- [ ] Tested: share button copies correct URL
- [ ] Tested: search finds the question
- [ ] Tested: direct link opens the question
- [ ] No duplicate IDs
- [ ] No old share containers

---

**Last Updated:** October 18, 2025  
**Maintainer:** Development Team  
**Status:** ✅ Production Ready
ok

