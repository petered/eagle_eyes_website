# FAQ Page - Complete Guide

## Table of Contents
1. [Overview & Current Status](#overview--current-status)
2. [Quick Reference](#quick-reference)
3. [Adding a New FAQ (Step-by-Step)](#adding-a-new-faq-step-by-step)
4. [Common Components & Examples](#common-components--examples)
5. [Best Practices](#best-practices)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)
8. [Technical Reference](#technical-reference)
9. [Files & Tools](#files--tools)

---

## 1. Overview & Current Status

The Eagle Eyes FAQ system is a comprehensive, searchable knowledge base built with Jekyll and modern JavaScript functionality.

### Current Features
- **31 FAQ questions** with unique IDs
- **Share buttons** on every question (copies unique URLs to clipboard)
- **Email copy functionality** (click email addresses to copy)
- **MiniSearch** full-text search with BM25 ranking
- **Automatic expansion** when accessing via direct links (e.g., `/faq/#pricing`)
- **Mobile responsive** design
- **Multi-page support** - FAQs can appear on faq.html and/or product pages (scan.html, etc.)

### Architecture
The FAQ system uses a **YAML-based data structure** that separates content from presentation:
- FAQ content lives in `_data/faqs.yml`
- The `faq.html` page renders all FAQs using Jekyll's templating
- Product pages (like `scan.html`) can display relevant FAQs using the same data source
- JavaScript handles search, filtering, and interactive functionality

### Search Metadata Coverage
- **With metadata:** 7 items (optimal search ranking)
- **Without metadata:** 24 items (still searchable, but may rank lower)

**Note:** FAQs without metadata still work fine. Metadata (alternates and tags) just improves search ranking by providing additional keywords and alternate phrasings.

---

## 2. Quick Reference

### For Experienced Users

**To add a new FAQ:**
1. Edit `_data/faqs.yml`
2. Add a new entry with required fields: `id`, `emoji`, `question`, `pages`, `content`
3. Optionally add `alternates` and `tags` for better search ranking
4. Test locally with `bundle exec jekyll serve`
5. Validate with `python3 validate_faq_structure.py`

**Example YAML entry:**
```yaml
- id: your-unique-id
  emoji: "🔤"
  question: "Your question here?"
  pages: []  # [] = faq.html only, [scan] = faq.html + scan.html
  alternates: "alternative ways to phrase this question"
  tags: "keyword1 keyword2 keyword3"
  content: |
    <p>Your answer content here...</p>
    <p>Can include HTML, links, etc.</p>
```

---

## 3. Adding a New FAQ (Step-by-Step)

### IMPORTANT: New YAML-Based Workflow

The FAQ system has been modernized to use a YAML data file instead of editing HTML directly. This makes it easier to maintain, reduces errors, and allows FAQs to appear on multiple pages.

### Step 1: Choose a Unique ID

Create a unique, descriptive ID for your question using lowercase letters and hyphens.

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

### Step 2: Add Your FAQ to `_data/faqs.yml`

Open the file `_data/faqs.yml` and add a new entry following this structure:

```yaml
- id: your-unique-id
  emoji: "🔤"
  question: "Your Question Here?"
  pages: []
  alternates: "alternative phrasings of your question"
  tags: "keyword1 keyword2 keyword3"
  content: |
    <p>Your answer content here...</p>
    <p>You can use multiple paragraphs, HTML formatting, links, etc.</p>
```

#### Field Explanations

**Required Fields:**
- **`id`** - The unique identifier (lowercase, hyphens only)
- **`emoji`** - A single emoji that visually represents the topic
- **`question`** - The FAQ question text (plain text)
- **`pages`** - An array specifying which pages should display this FAQ
- **`content`** - The answer content (can include HTML)

**Optional Fields (but recommended for better search):**
- **`alternates`** - Alternative ways users might ask this question
- **`tags`** - Keywords related to the FAQ topic

#### Understanding the `pages` Field

The `pages` field controls where your FAQ appears:

- **`pages: []`** - FAQ appears **only** on `faq.html` (the main FAQ page)
- **`pages: [scan]`** - FAQ appears on **both** `faq.html` AND `scan.html`
- **`pages: [scan, product2]`** - FAQ appears on `faq.html`, `scan.html`, and `product2.html`

**Examples:**
```yaml
# General FAQ that only appears on the main FAQ page
- id: pricing
  pages: []

# Scan-specific FAQ that appears on both faq.html and scan.html
- id: scan-activation-offline
  pages: [scan]

# FAQ relevant to multiple products
- id: system-requirements
  pages: [scan, product2]
```

### Step 3: Add Search Metadata (Alternates & Tags)

While the `alternates` and `tags` fields are optional, adding them significantly improves search functionality.

#### What are ALTERNATES?

Alternates are 2-4 common ways users might ask this question using natural language.

**Purpose:**
- Boost the question when users search with similar phrasing
- Help match variations in how people phrase questions
- Use natural language (5-10 words each)

**Think:** "How else would someone search for this?"

**Example:**
```yaml
alternates: "run two versions same device multiple versions install both beta and stable"
```

#### What are TAGS?

Tags are 3-8 key concepts or keywords from the FAQ.

**Purpose:**
- Help match specific keyword searches
- Include product names, technical terms, action words
- Use single words or short 2-word phrases

**Example:**
```yaml
tags: "beta stable yellow blue logo dual install version"
```

#### Complete Example with Metadata

```yaml
- id: beta-stable-same-device
  emoji: "📱"
  question: "Can I run both Beta and Stable versions on the same device?"
  pages: [scan]
  alternates: "run two versions same device multiple versions install both beta and stable"
  tags: "beta stable yellow blue logo dual install version"
  content: |
    <p>Yes! You can install both the Beta (yellow logo) and Stable (blue logo) versions
    of Scan on the same device simultaneously.</p>
    <p>They operate independently and won't interfere with each other.</p>
```

### Step 4: Write Your Answer Content

The `content` field uses YAML's multiline string format (`|`) and can include HTML.

**Basic structure:**
```yaml
content: |
  <p>Your first paragraph here...</p>
  <p>Your second paragraph here...</p>
```

**You can include:**
- Paragraphs (`<p>`)
- Lists (`<ul>`, `<ol>`, `<li>`)
- Links (see Common Components section)
- Headings (`<h4>`, `<h5>`)
- Styled sections (see Common Components section)
- Email links with copy functionality
- Resource links to other pages

**Important YAML Notes:**
- Use the `|` character after `content:` for multiline HTML
- Maintain consistent indentation (2 spaces recommended)
- HTML tags must be properly closed
- Special characters in HTML are fine (don't need escaping in the `|` block)

### Step 5: Save and Test

1. **Save** the `_data/faqs.yml` file
2. **Build locally** to test: `bundle exec jekyll serve`
3. **View** the FAQ page at `http://localhost:4000/faq/`
4. **Test** functionality (see Testing & Validation section)

---

## 4. Common Components & Examples

### Email Links with Copy Functionality

To include the Eagle Eyes email address with click-to-copy functionality:

```html
<span class="faq-email-link" onclick="copyEmailToClipboard()" style="color: #1e90ff; cursor: pointer; text-decoration: underline; font-weight: 500;">info@EagleEyesSearch.com</span>
```

**Usage in YAML:**
```yaml
content: |
  <p>Please contact us at <span class="faq-email-link" onclick="copyEmailToClipboard()" style="color: #1e90ff; cursor: pointer; text-decoration: underline; font-weight: 500;">info@EagleEyesSearch.com</span> for assistance.</p>
```

### Resource Links

For links to other pages on the site (documentation, downloads, pricing, etc.):

```html
<a href="{{ '/pricing/' | relative_url }}" class="resource-link" target="_blank">pricing page</a>
```

**Common resource links:**
```html
<a href="{{ '/download/' | relative_url }}" class="resource-link">download page</a>
<a href="{{ '/pricing/' | relative_url }}" class="resource-link">pricing page</a>
<a href="{{ '/docs/' | relative_url }}" class="resource-link">documentation</a>
```

**Usage in YAML:**
```yaml
content: |
  <p>For more details, see our <a href="{{ '/download/' | relative_url }}" class="resource-link">download page</a>.</p>
```

### External Links

For links to external websites:

```html
<a href="https://example.com" target="_blank" rel="noopener">External Site</a>
```

### Styled Sections / Code Blocks

For highlighted sections, callouts, or structured information:

```html
<div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
    <h4 style="margin-bottom: 15px; color: #333;">Section Title:</h4>
    <p style="color: #555;">Content here...</p>
</div>
```

**Usage in YAML:**
```yaml
content: |
  <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
    <h4 style="margin-bottom: 15px; color: #333;">Important Note:</h4>
    <p style="color: #555;">Make sure to backup your data before proceeding.</p>
  </div>
```

### Lists

Unordered lists:
```yaml
content: |
  <p>Eagle Eyes is compatible with:</p>
  <ul>
    <li>DJI Smart Controller</li>
    <li>DJI RC Pro</li>
    <li>Android tablets and phones (Android 8.0+)</li>
  </ul>
```

Ordered lists:
```yaml
content: |
  <p>Follow these steps:</p>
  <ol>
    <li>Download the app from the download page</li>
    <li>Install on your device</li>
    <li>Launch and activate your license</li>
  </ol>
```

### Complete Example

Here's a complete FAQ entry with multiple components:

```yaml
- id: device-compatibility
  emoji: "📱"
  question: "Which devices are compatible with Eagle Eyes?"
  pages: [scan]
  alternates: "which devices work supported devices compatible hardware what phones tablets"
  tags: "device compatible android dji controller tablet phone support"
  content: |
    <p>Eagle Eyes is compatible with the following devices:</p>
    <ul>
      <li>DJI Smart Controller</li>
      <li>DJI RC Pro</li>
      <li>Android tablets and phones (Android 8.0+)</li>
    </ul>
    <p>For more details, see our <a href="{{ '/download/' | relative_url }}" class="resource-link">download page</a>.</p>
    <div style="margin: 20px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
      <h4 style="margin-bottom: 15px; color: #333;">Need Help?</h4>
      <p style="color: #555;">Contact us at <span class="faq-email-link" onclick="copyEmailToClipboard()" style="color: #1e90ff; cursor: pointer; text-decoration: underline; font-weight: 500;">info@EagleEyesSearch.com</span></p>
    </div>
```

---

## 5. Best Practices

### DO:

- **Use unique IDs** for each FAQ item (lowercase with hyphens)
- **Add comprehensive metadata** (alternates and tags) for better search ranking
- **Use semantic emojis** that represent the topic visually
- **Test all functionality** before committing (expand/collapse, share, search, direct links)
- **Use proper HTML** in the content field (properly closed tags)
- **Include resource links** to relevant pages using `class="resource-link"`
- **Set the `pages` field appropriately** - consider which pages should show this FAQ
- **Write clear, concise questions** that users would actually ask
- **Structure answers** with paragraphs, headings, and lists for readability
- **Validate your changes** with `python3 validate_faq_structure.py`
- **Test locally first** with `bundle exec jekyll serve`

### DON'T:

- **Reuse IDs** from other FAQ items (must be unique)
- **Edit faq.html directly** - always edit `_data/faqs.yml` instead
- **Use spaces in IDs** - use hyphens instead (e.g., `free-trial`, not `free trial`)
- **Forget to set the `pages` field** - even if it's just `[]`
- **Skip search metadata** - alternates and tags significantly improve findability
- **Use inline mailto: links** - use the `copyEmailToClipboard()` function instead
- **Use inconsistent formatting** - follow the established patterns
- **Include special characters in IDs** - stick to lowercase letters, numbers, and hyphens
- **Write overly long questions** - keep them concise and clear
- **Forget proper HTML escaping** when needed in content
- **Mix up YAML indentation** - be consistent with spacing

### Content Writing Tips:

1. **Questions should be specific**: "How do I activate my license?" not "How does activation work?"
2. **Answers should be complete**: Include all relevant information, links, and next steps
3. **Use natural language**: Write how people actually speak and search
4. **Think about keywords**: What words would someone type to find this?
5. **Link to related resources**: Help users find additional information
6. **Consider the user journey**: What would they need to know next?

### Metadata Tips:

1. **ALTERNATES**: Focus on how people naturally ask the question
   - Include variations: "cost price how much money"
   - Think about different phrasings: "run two versions same device multiple versions"

2. **TAGS**: Focus on keywords they might type in the search box
   - Product names: "scan beta stable"
   - Technical terms: "license activation offline"
   - Action words: "install download update"
   - Common concepts: "pricing trial free"

3. **Don't worry about perfect matches** - the search system uses fuzzy matching
4. **Include common variations and synonyms**
5. **Think about what users would type** to find this question

---

## 6. Testing & Validation

### Manual Testing Checklist

After adding or modifying FAQs, test the following:

#### 1. Visual Test
- [ ] View the FAQ page in your browser (`/faq/`)
- [ ] Verify the question appears correctly with emoji
- [ ] Check formatting and spacing
- [ ] Verify it appears on intended pages (check `pages` field)

#### 2. Expand/Collapse Test
- [ ] Click the question to expand it
- [ ] Verify the answer content displays correctly
- [ ] Click again to collapse
- [ ] Check that the "+" changes to "-" when expanded

#### 3. Share Button Test
- [ ] Click the share button (icon to the right of toggle)
- [ ] Verify it copies the URL to clipboard
- [ ] Check that the toast notification appears: "Link copied to clipboard!"
- [ ] Verify the URL format: `https://www.eagleeyessearch.com/faq/#your-unique-id`
- [ ] Test on both desktop and mobile if possible

#### 4. Search Test
- [ ] Use the search box at the top of the FAQ page
- [ ] Search for keywords you added in `tags`
- [ ] Search for phrases you added in `alternates`
- [ ] Verify your question appears in the results
- [ ] Try partial keywords and variations
- [ ] Test typos (fuzzy matching should still find it)

#### 5. Direct Link Test
- [ ] Navigate to `https://www.eagleeyessearch.com/faq/#your-unique-id`
- [ ] Verify the question automatically expands when accessed via direct link
- [ ] Check that the page scrolls to the question

#### 6. Multi-Page Test (if applicable)
- [ ] If `pages: [scan]`, verify FAQ appears on `/scan/` page
- [ ] Check that filtering works correctly on product pages
- [ ] Verify FAQ also appears on `/faq/` page

### Automated Validation

Run the validation script before committing:

```bash
python3 validate_faq_structure.py
```

**The script checks:**
- No duplicate IDs across all FAQs
- All required fields are present
- Proper structure and formatting
- Share button functionality (when rendered)
- Search metadata coverage
- YAML syntax is valid

**Expected output:**
```
✓ All FAQ items have unique IDs
✓ All FAQ items have proper structure
✓ All share buttons reference valid IDs
✓ Search metadata coverage: X/31 items
✓ No structural issues found
```

### Local Development Testing

1. **Start Jekyll server:**
   ```bash
   bundle exec jekyll serve
   ```

2. **View in browser:**
   ```
   http://localhost:4000/faq/
   ```

3. **Test with live reload:**
   - Make changes to `_data/faqs.yml`
   - Save the file
   - Refresh browser to see updates
   - Jekyll will rebuild automatically

### Browser Console Testing

Open browser Developer Tools (F12) and check:

1. **No JavaScript errors** in the console
2. **Search index builds successfully** (look for MiniSearch messages)
3. **Share button function** executes without errors
4. **Email copy function** works correctly

---

## 7. Troubleshooting

### Share Button Issues

**Problem:** Share button not working or not copying URL

**Solutions:**
- Clear browser cache and hard reload (Ctrl+Shift+R or Cmd+Shift+R)
- Check that the FAQ has been properly rendered from YAML
- Verify JavaScript is enabled in browser
- Check browser console for errors
- Ensure the ID in YAML is valid (no spaces, special characters)
- Test in a different browser

**Problem:** Share button copies wrong URL

**Solutions:**
- Verify the `id` field in YAML is correct
- Check for duplicate IDs (run validation script)
- Clear browser cache

### Search Issues

**Problem:** Question doesn't appear in search results

**Solutions:**
- Add or improve `alternates` and `tags` fields in YAML
- Check that the FAQ item has a unique `id`
- Verify YAML syntax is correct (proper indentation)
- Make sure the FAQ is being rendered (check page source)
- Try more specific or varied keywords in tags
- Rebuild Jekyll: stop server and restart

**Problem:** Question ranks too low in search results

**Solutions:**
- Add more relevant keywords to `tags`
- Add common phrasings to `alternates`
- Include the specific terms users might search for
- Boost important words by including them in both question and tags

### Direct Link Issues

**Problem:** Direct link doesn't open/expand the question

**Solutions:**
- Verify the `id` is correct and matches exactly (case-sensitive)
- Check for duplicate IDs (run validation script)
- Test the URL format: `https://www.eagleeyessearch.com/faq/#your-id`
- Clear browser cache
- Check browser console for JavaScript errors

**Problem:** Link opens but doesn't scroll to question

**Solutions:**
- Verify the FAQ is rendered on the page (check page source)
- Check for JavaScript errors in console
- Ensure the ID doesn't contain special characters

### Build/Rendering Issues

**Problem:** FAQ doesn't appear on the page at all

**Solutions:**
- Check YAML syntax in `_data/faqs.yml` (indentation matters!)
- Verify all required fields are present (`id`, `emoji`, `question`, `pages`, `content`)
- Run Jekyll with verbose output: `bundle exec jekyll serve --verbose`
- Check for YAML parsing errors in the terminal
- Validate YAML syntax with an online YAML validator

**Problem:** HTML not rendering correctly in answer

**Solutions:**
- Check that you're using the multiline `|` syntax for `content`
- Verify all HTML tags are properly closed
- Ensure indentation is consistent
- Test HTML syntax with a validator
- Check for special characters that might need escaping

### Page-Specific Display Issues

**Problem:** FAQ doesn't appear on product page (e.g., scan.html)

**Solutions:**
- Verify `pages` field includes the page name: `pages: [scan]`
- Check that the product page has the correct filtering logic
- Rebuild Jekyll server
- Clear browser cache

**Problem:** FAQ appears on wrong pages

**Solutions:**
- Review the `pages` field in YAML
- Remember: `pages: []` means FAQ page only
- Remember: `pages: [scan]` means FAQ page + scan page
- Adjust the `pages` array as needed

### Validation Script Issues

**Problem:** Validation script reports duplicate IDs

**Solutions:**
- Search `_data/faqs.yml` for the duplicate ID
- Rename one of them to be unique
- Run validation again

**Problem:** Validation script reports missing metadata

**Solutions:**
- This is just a warning - FAQs work without metadata
- To improve search, add `alternates` and `tags` fields
- Not required, but recommended

### YAML Syntax Issues

**Problem:** "YAML syntax error" when building

**Solutions:**
- Check indentation (use spaces, not tabs)
- Verify quotes are balanced
- Check for special characters in strings
- Use a YAML validator online
- Common issues:
  - Missing colon after field name
  - Inconsistent indentation
  - Unescaped special characters in non-multiline strings

### General Debugging Steps

1. **Check the terminal** where Jekyll is running for error messages
2. **View page source** to see if FAQ is being rendered
3. **Open browser console** to check for JavaScript errors
4. **Run validation script** to catch common issues
5. **Test in incognito/private mode** to rule out cache issues
6. **Compare with working examples** in `_data/faqs.yml`
7. **Rebuild from scratch**: stop Jekyll, clear `_site/`, rebuild

---

## 8. Technical Reference

### FAQ System Architecture

The FAQ system consists of several integrated components:

```
Data Layer:
_data/faqs.yml (source of truth)
    ↓
Template Layer:
faq.html (renders all FAQs)
scan.html (renders scan-specific FAQs)
    ↓
Presentation Layer:
CSS styling + JavaScript functionality
    ↓
User Interaction:
Search, share, expand/collapse, direct links
```

### HTML Structure (Rendered Output)

When Jekyll builds the site, each FAQ entry in `_data/faqs.yml` is rendered to this HTML structure:

```html
<div class="faq-item" id="unique-question-id">
    <div class="faq-question">
        <span class="faq-question-text">🔤 Question Text Here?</span>
        <div class="faq-actions">
            <span class="toggle-icon">+</span>
            <button class="faq-share-btn"
                    onclick="event.stopPropagation(); shareFaqQuestion('unique-question-id'); return false;"
                    title="Share this FAQ">
            </button>
        </div>
    </div>
    <div class="faq-answer">
        <!-- Content from the 'content' field in YAML -->
        <p>Answer content here...</p>
    </div>
</div>
```

**Component breakdown:**

```
.faq-item (container with unique ID)
├── .faq-question (clickable header)
│   ├── .faq-question-text (emoji + question)
│   └── .faq-actions (buttons container)
│       ├── .toggle-icon (+ or -)
│       └── .faq-share-btn (share button)
└── .faq-answer (collapsible content)
    └── [HTML content from YAML]
```

### YAML Data Structure

The `_data/faqs.yml` file uses this structure:

```yaml
- id: string (required)
  emoji: string (required)
  question: string (required)
  pages: array (required, can be empty [])
  alternates: string (optional)
  tags: string (optional)
  content: multiline string (required, uses | syntax)
```

**Field types:**
- `id`: String, must be unique, lowercase, hyphens only
- `emoji`: String, single emoji character
- `question`: String, plain text
- `pages`: Array of strings, e.g., `[]` or `[scan]` or `[scan, product2]`
- `alternates`: String, space-separated phrases
- `tags`: String, space-separated keywords
- `content`: Multiline string (YAML `|` syntax), can contain HTML

### JavaScript Functions

#### Core Functions

**`shareFaqQuestion(faqId)`**
- Handles share button clicks
- Constructs shareable URL with hash
- Copies to clipboard using modern API with fallback
- Displays success notification

**`copyToClipboard(text)`**
- Utility function for copying text
- Uses modern Clipboard API when available
- Falls back to document.execCommand for older browsers
- Returns boolean success/failure

**`showCopyNotification()`**
- Displays toast notification for link copied
- Auto-dismisses after 3 seconds
- Positioned in bottom-right corner

**`copyEmailToClipboard()`**
- Copies email address to clipboard
- Uses the same clipboard utility
- Shows email-specific notification

**`showEmailCopyNotification()`**
- Displays toast for email copied
- Similar styling to link notification

#### Search System

**Library:** MiniSearch v6.3.0

**Configuration:**
```javascript
const searchIndex = new MiniSearch({
  fields: ['question', 'alternates', 'tags', 'answer'],
  storeFields: ['id', 'question', 'answer'],
  searchOptions: {
    boost: {
      question: 3,    // Highest priority
      alternates: 2,  // High priority
      tags: 2,        // High priority
      answer: 1       // Base priority
    },
    fuzzy: 0.2,      // Fuzzy matching tolerance
    prefix: true     // Match word prefixes
  }
});
```

**How Search Works:**
1. Page loads, search index is built from all FAQ data
2. User types in search box
3. Query is processed with fuzzy matching and prefix matching
4. Results are ranked using BM25 algorithm with field boosting
5. Matching FAQs are shown, non-matching are hidden
6. Empty search shows all FAQs

**Search Features:**
- **Fuzzy matching**: Handles typos (e.g., "pricng" finds "pricing")
- **Prefix matching**: Partial words work (e.g., "pric" finds "pricing")
- **BM25 ranking**: Industry-standard relevance algorithm
- **Field boosting**: Questions rank higher than answer content
- **Multi-field search**: Searches across question, alternates, tags, and content

### CSS Classes

**Layout classes:**
- `.faq-container` - Main container for all FAQs
- `.faq-item` - Individual FAQ wrapper
- `.faq-question` - Clickable question header
- `.faq-answer` - Collapsible answer content

**Component classes:**
- `.faq-question-text` - Text content of question (with emoji)
- `.faq-actions` - Container for toggle and share button
- `.toggle-icon` - The "+" or "-" indicator
- `.faq-share-btn` - Share button element

**Interactive classes:**
- `.active` - Applied to `.faq-item` when expanded
- `.resource-link` - Styled internal links
- `.faq-email-link` - Clickable email with copy functionality

**Utility classes:**
- `.copy-notification` - Toast message for copy confirmations
- `.email-copy-notification` - Toast for email copy

### Page-Specific Rendering

**faq.html (Main FAQ Page):**
- Renders ALL FAQs from `_data/faqs.yml`
- Includes search functionality
- Shows count of total FAQs

**scan.html (Product Page):**
- Renders only FAQs where `pages` includes `scan`
- Filtered view of relevant FAQs
- Same functionality (search, share, etc.)

**Jekyll Templating:**
```liquid
{% for faq in site.data.faqs %}
  {% if faq.pages contains 'scan' or faq.pages.size == 0 %}
    <!-- Render FAQ -->
  {% endif %}
{% endfor %}
```

### URL Structure

**FAQ Page:**
- Base URL: `https://www.eagleeyessearch.com/faq/`
- Direct link: `https://www.eagleeyessearch.com/faq/#question-id`
- Hash navigation triggers auto-expansion

**Product Pages:**
- Base URL: `https://www.eagleeyessearch.com/scan/`
- Direct link: `https://www.eagleeyessearch.com/scan/#question-id`

### Browser Compatibility

**Supported Browsers:**
- Chrome/Edge (modern versions)
- Firefox (modern versions)
- Safari (modern versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Features with Fallbacks:**
- Clipboard API: Falls back to `document.execCommand`
- CSS Grid: Graceful degradation to flexbox
- Smooth scroll: Degrades to instant scroll

---

## 9. Files & Tools

### Core Files

**`_data/faqs.yml`**
- **Purpose**: Source of truth for all FAQ content
- **Format**: YAML structured data
- **Location**: `_data/faqs.yml`
- **Edit**: This is the ONLY file you should edit to add/modify FAQs
- **Structure**: Array of FAQ objects with id, emoji, question, pages, alternates, tags, content

**`faq.html`**
- **Purpose**: Main FAQ page template
- **Format**: HTML with Liquid templating
- **Location**: `/faq.html`
- **Renders**: All FAQs from `_data/faqs.yml`
- **Features**: Search, share buttons, expand/collapse, direct links
- **Edit**: Only edit for structural changes to the page, not FAQ content

**`scan.html` (and other product pages)**
- **Purpose**: Product-specific pages with filtered FAQs
- **Format**: HTML with Liquid templating
- **Renders**: Only FAQs where `pages` includes the product name
- **Features**: Same interactive functionality as main FAQ page
- **Edit**: Only for page structure, not FAQ content

### Supporting Files

**`_includes/footer.html`**
- Contains footer with email link
- Uses same `copyEmailToClipboard()` function
- Sitewide component

**`images/share_icon.png`**
- Share button icon
- Displayed next to toggle icon
- Styled via CSS

**`FAQ_README.md`** (this file)
- Comprehensive guide for FAQ management
- Reference documentation
- Best practices and examples

**`FAQ_INSTRUCTIONS.md`** (deprecated)
- Old instructions for HTML-based workflow
- Kept for reference
- **Note**: Use this README instead for YAML-based workflow

### Validation & Testing Tools

**`validate_faq_structure.py`**
- **Purpose**: Automated validation of FAQ structure
- **Language**: Python 3
- **Usage**: `python3 validate_faq_structure.py`
- **Checks**:
  - No duplicate IDs
  - All required YAML fields present
  - Proper structure and formatting
  - Search metadata coverage statistics
  - YAML syntax validation

**Example output:**
```bash
$ python3 validate_faq_structure.py

FAQ Structure Validation
========================

✓ All FAQ items have unique IDs (31 total)
✓ All FAQ items have required fields
✓ YAML syntax is valid
✓ No structural issues found

Search Metadata Coverage:
- With metadata (alternates/tags): 7 items
- Without metadata: 24 items
- Coverage: 23%

Recommendation: Add alternates and tags to improve search ranking
```

**Running validation:**
```bash
# From project root
python3 validate_faq_structure.py

# With verbose output
python3 validate_faq_structure.py --verbose

# Check specific FAQ ID
python3 validate_faq_structure.py --id pricing
```

### Development Tools

**Jekyll (Static Site Generator)**
- **Purpose**: Builds the website from templates and data
- **Usage**: `bundle exec jekyll serve`
- **Features**: Live reload, YAML processing, Liquid templating
- **Local server**: `http://localhost:4000`

**Bundle (Ruby Dependency Manager)**
- **Purpose**: Manages Jekyll and gem dependencies
- **Usage**: `bundle install` (install dependencies)
- **Config**: `Gemfile` and `Gemfile.lock`

### Workflow Summary

**Editing FAQs:**
1. Edit `_data/faqs.yml` only
2. Add/modify FAQ entries
3. Save file

**Testing Changes:**
1. Run `bundle exec jekyll serve`
2. View at `http://localhost:4000/faq/`
3. Test functionality (search, share, expand, links)

**Validation:**
1. Run `python3 validate_faq_structure.py`
2. Fix any reported issues
3. Re-run until validation passes

**Deployment:**
1. Commit changes to git
2. Push to repository
3. Jekyll builds and deploys automatically

### File Locations Reference

```
project-root/
├── _data/
│   └── faqs.yml              # ← Edit this for FAQ content
├── _includes/
│   └── footer.html           # Footer with email link
├── images/
│   └── share_icon.png        # Share button icon
├── faq.html                  # Main FAQ page template
├── scan.html                 # Scan product page (with FAQs)
├── FAQ_README.md             # This guide
├── FAQ_INSTRUCTIONS.md       # Old guide (deprecated)
└── validate_faq_structure.py # Validation script
```

### Quick Command Reference

```bash
# Start local development server
bundle exec jekyll serve

# Build site without serving
bundle exec jekyll build

# Validate FAQ structure
python3 validate_faq_structure.py

# Install/update dependencies
bundle install

# Clean build artifacts
bundle exec jekyll clean
```

---

## Summary Checklist

When adding a new FAQ question, check off each item:

- [ ] Created a unique, descriptive ID (lowercase, hyphens)
- [ ] Added entry to `_data/faqs.yml` with all required fields
- [ ] Set `emoji` with an appropriate icon
- [ ] Wrote clear, concise `question` text
- [ ] Set `pages` array appropriately ([] for FAQ only, [scan] for FAQ + scan page)
- [ ] Added `alternates` with 2-4 natural phrasings of the question
- [ ] Added `tags` with 3-8 relevant keywords
- [ ] Wrote complete `content` using proper HTML
- [ ] Tested locally with `bundle exec jekyll serve`
- [ ] Verified question expands/collapses correctly
- [ ] Tested share button copies correct URL
- [ ] Tested search functionality finds the question
- [ ] Tested direct link opens the question automatically
- [ ] Ran `python3 validate_faq_structure.py` successfully
- [ ] Verified FAQ appears on correct pages (faq.html and/or product pages)
- [ ] Checked for no duplicate IDs
- [ ] Reviewed content for typos and formatting
- [ ] Tested on mobile if possible

---

## Questions or Issues?

If you encounter any issues or need clarification:

1. **Check this guide first** - Most questions are answered in the relevant sections
2. **Review existing FAQs** - Look at `_data/faqs.yml` for working examples
3. **Run validation** - `python3 validate_faq_structure.py` catches common issues
4. **Check Jekyll output** - Error messages often point to the problem
5. **Test in browser console** - JavaScript errors will appear there
6. **Contact the development team** - For unresolved issues or questions

---

**Last Updated:** November 5, 2025
**Maintainer:** Development Team
**Status:** Production Ready
**System Version:** YAML-based (v2.0)
