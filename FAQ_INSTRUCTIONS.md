# FAQ Page - Instructions for Adding New Questions

## Overview
This document provides step-by-step instructions for adding new FAQ questions to the Eagle Eyes FAQ page while maintaining consistency with the existing structure, search functionality, keyword hashing, and share button functionality.

---

## Structure of an FAQ Item

Each FAQ question must follow this exact HTML structure:

```html
<div class="faq-item" id="unique-question-id">
    <div class="faq-question">
        <span class="faq-question-text">🔤 Your Question Here?</span>
        <div class="faq-actions">
            <span class="toggle-icon">+</span>
            <button class="faq-share-btn" onclick="event.stopPropagation(); shareFaqQuestion('unique-question-id'); return false;" title="Share this FAQ">
            </button>
        </div>
    </div>
    <div class="faq-answer">
        <p>Your answer content here...</p>
    </div>
</div>
```

---

## Step-by-Step Instructions

### Step 1: Create a Unique ID
Choose a unique, descriptive ID for your question using lowercase letters and hyphens.

**Examples:**
- `pricing` - for pricing questions
- `free-trial` - for free trial questions
- `beta-stable-same-device` - for questions about beta and stable versions
- `system-requirements` - for hardware requirements

**Rules:**
- Use lowercase only
- Separate words with hyphens (-)
- Keep it descriptive but concise
- Must be unique across all FAQ items

---

### Step 2: Add the FAQ Item HTML

Insert your new FAQ item in the appropriate location within the `<div class="faq-container">` section.

**Template:**
```html
<div class="faq-item" id="YOUR-UNIQUE-ID">
    <div class="faq-question">
        <span class="faq-question-text">🔤 Your Question Here?</span>
        <div class="faq-actions">
            <span class="toggle-icon">+</span>
            <button class="faq-share-btn" onclick="event.stopPropagation(); shareFaqQuestion('YOUR-UNIQUE-ID'); return false;" title="Share this FAQ">
            </button>
        </div>
    </div>
    <div class="faq-answer">
        <p>Your answer content here...</p>
        <!-- Add more paragraphs, links, images, etc. as needed -->
    </div>
</div>
```

**Important:**
- Replace `YOUR-UNIQUE-ID` in TWO places:
  1. In the `id="YOUR-UNIQUE-ID"` attribute
  2. In the `shareFaqQuestion('YOUR-UNIQUE-ID')` function call
- Add an emoji at the start of the question (optional but recommended for visual consistency)
- The share button code must be exactly as shown above

---

### Step 3: Add Search Metadata (Alternates & Tags)

After adding the HTML, you need to register the question with the search system for optimal ranking.

**Location:** Find the section with the comment `IMPORTANT: When adding NEW FAQs` (around line 570 in faq.html)

**Add your question metadata:**
```javascript
} else if (id === 'your-unique-id') {
    alternates = 'phrase one phrase two phrase three';
    tags = 'keyword1 keyword2 keyword3 keyword4';
}
```

**What are ALTERNATES?**
- 2-4 common ways users might ask this question
- Use natural language variations (5-10 words each)
- Think: "How else would someone search for this?"
- These boost the question when users search with similar phrasing

**What are TAGS?**
- 3-8 key concepts/keywords from the FAQ
- Single words or short 2-word phrases
- Include product names, technical terms, action words
- These help match specific keyword searches

**Example:**
```javascript
} else if (id === 'beta-stable-same-device') {
    alternates = 'run two versions same device multiple versions';
    tags = 'beta stable yellow blue logo dual install';
} else if (id === 'pricing') {
    alternates = 'cost price how much money';
    tags = 'pricing cost trial';
} else if (id === 'offline-support') {
    alternates = 'no wifi no internet no connection no signal';
    tags = 'offline network wifi internet connectivity';
}
```

**Tips for Metadata:**
- ALTERNATES: Focus on how people naturally ask the question
- TAGS: Focus on keywords they might type in the search box
- Include common variations and synonyms
- Think about what users would type to find this question
- Don't worry about perfect matches - the search system uses fuzzy matching

---

### Step 4: Test Your Changes

1. **Visual Test:**
   - View the FAQ page in your browser
   - Verify the question appears correctly
   - Click the question to ensure it expands/collapses properly
   - Check that the share button is visible to the right of the "+" toggle

2. **Share Button Test:**
   - Click the share button
   - Verify it copies the URL to clipboard
   - Check that the toast notification appears saying "Link copied to clipboard!"
   - The URL should be: `https://www.eagleeyessearch.com/faq/#your-unique-id`

3. **Search Test:**
   - Use the search box at the top of the FAQ page
   - Search for various keywords you added
   - Verify your question appears in the results
   - Try partial keywords and variations

4. **Direct Link Test:**
   - Navigate to `https://www.eagleeyessearch.com/faq/#your-unique-id`
   - Verify the question automatically expands when accessed via direct link

---

## Complete Example

Here's a complete example of adding a new FAQ question about "Device Compatibility":

### 1. Choose ID: `device-compatibility`

### 2. Add HTML:
```html
<div class="faq-item" id="device-compatibility">
    <div class="faq-question">
        <span class="faq-question-text">📱 Which devices are compatible with Eagle Eyes?</span>
        <div class="faq-actions">
            <span class="toggle-icon">+</span>
            <button class="faq-share-btn" onclick="event.stopPropagation(); shareFaqQuestion('device-compatibility'); return false;" title="Share this FAQ">
            </button>
        </div>
    </div>
    <div class="faq-answer">
        <p>Eagle Eyes is compatible with the following devices:</p>
        <ul>
            <li>DJI Smart Controller</li>
            <li>DJI RC Pro</li>
            <li>Android tablets and phones (Android 8.0+)</li>
        </ul>
        <p>For more details, see our <a href="/download/" class="resource-link">download page</a>.</p>
    </div>
</div>
```

### 3. Add Search Metadata:
```javascript
// Find the section marked "IMPORTANT: When adding NEW FAQs"
// Add this entry:

} else if (id === 'device-compatibility') {
    alternates = 'which devices work supported devices compatible hardware what phones tablets';
    tags = 'device compatible android dji controller tablet phone support';
}
```

---

## Common Components

### Email Links with Copy Functionality
If you need to include the Eagle Eyes email address:
```html
<span class="faq-email-link" onclick="copyEmailToClipboard()" style="color: #1e90ff; cursor: pointer; text-decoration: underline; font-weight: 500;">info@EagleEyesSearch.com</span>
```

### Resource Links
For links to documentation, downloads, etc.:
```html
<a href="{{ '/pricing/' | relative_url }}" class="resource-link" target="_blank">pricing page</a>
```

### Code Blocks or Highlighted Sections
```html
<div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
    <h4 style="margin-bottom: 15px; color: #333;">Section Title:</h4>
    <p style="color: #555;">Content here...</p>
</div>
```

---

## Important Notes

### DO:
✅ Use a unique ID for each FAQ item
✅ Include the share button with the exact onclick code shown
✅ Add comprehensive keywords for search functionality
✅ Test all functionality before committing
✅ Use proper HTML escaping for special characters
✅ Add emoji icons to questions for visual consistency
✅ Use `class="resource-link"` for external links

### DON'T:
❌ Reuse IDs from other FAQ items
❌ Modify the share button structure or onclick handler
❌ Forget to add keywords to the faqKeywords object
❌ Remove or change the `.faq-actions` structure
❌ Use spaces in IDs (use hyphens instead)
❌ Forget the `event.stopPropagation()` in the share button
❌ Use inline mailto: links for the email address (use the copyEmailToClipboard function instead)

---

## Troubleshooting

### Share button not working:
- Verify the onclick handler is exactly: `onclick="event.stopPropagation(); shareFaqQuestion('your-id'); return false;"`
- Check that the ID in the onclick matches the `id` attribute of the `.faq-item`
- Clear browser cache and reload

### Question doesn't appear in search:
- Verify you added keywords to the `faqKeywords` object
- Check that the FAQ item has the correct `id` attribute
- Make sure keywords are in lowercase
- Try more specific or varied keywords

### Direct link doesn't open question:
- Verify the `id` attribute matches exactly (case-sensitive)
- Check that there are no duplicate IDs on the page
- Test the URL format: `https://www.eagleeyessearch.com/faq/#your-id`

---

## File Locations

- **FAQ Page:** `/faq.html`
- **Footer (for email links):** `/_includes/footer.html`
- **Share Icon:** `/images/share_icon.png`
- **Search Keywords:** Inside `faq.html`, in the JavaScript section with `const faqKeywords = {`

---

## Summary Checklist

When adding a new FAQ question, check off each item:

- [ ] Created a unique, descriptive ID using lowercase and hyphens
- [ ] Added the complete FAQ HTML structure with correct ID
- [ ] Included share button with proper onclick handler
- [ ] Added the ID to both the `id` attribute AND the `shareFaqQuestion()` call
- [ ] Added comprehensive keywords to the `faqKeywords` object
- [ ] Added an emoji to the question (optional but recommended)
- [ ] Tested the question expands/collapses correctly
- [ ] Tested the share button copies the correct URL
- [ ] Tested search functionality finds the question
- [ ] Tested direct link opens the question automatically
- [ ] Verified no duplicate IDs exist on the page

---

## Questions or Issues?

If you encounter any issues or need clarification, contact the development team or refer to existing FAQ items as examples.

**Last Updated:** October 18, 2025

