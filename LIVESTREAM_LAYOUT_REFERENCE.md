# Livestream Layout System Reference

## 🎯 **Goal: Aspect Ratio-Based Layout System**

### **📐 Core Principle:**
Layout direction should be determined by **viewport aspect ratio**, not device type or screen size.

### **🔄 Layout Rules:**
- **Aspect ratio ≥ 1:1** (landscape): Video left, map right
- **Aspect ratio < 1:1** (portrait): Video top, map bottom
- **Applies to ALL devices** - mobile, tablet, desktop

### **📱 Device Behavior:**

#### **Desktop Browser:**
- **Wide window (landscape)**: Video left (60%), Map right (40%)
- **Tall window (portrait)**: Video top (60%), Map bottom (40%)
- **Window resize**: Layout updates automatically based on new aspect ratio

#### **Mobile/Tablet:**
- **Landscape orientation**: Video left, map right
- **Portrait orientation**: Video top, map bottom
- **Orientation change**: Layout switches instantly

### **🎨 Responsive Sizing (Proportions Only):**
- **Large screens (≥1200px)**: 60/40 split
- **Medium screens (768px-1199px)**: 65/35 split  
- **Small screens (≤767px)**: 70/30 split
- **Sizing only affects proportions**, not layout direction

### **🔧 Implementation Requirements:**

#### **CSS Media Queries:**
```css
/* Landscape layout (aspect ratio >= 1:1) */
@media (min-aspect-ratio: 1/1) {
  #main-content { flex-direction: row !important; }
  #video-panel { flex: 0 0 60% !important; }
  #map-panel { flex: 0 0 40% !important; }
}

/* Portrait layout (aspect ratio < 1:1) */
@media (max-aspect-ratio: 1/1) {
  #main-content { flex-direction: column !important; }
  #video-panel { flex: 0 0 60% !important; }
  #map-panel { flex: 0 0 40% !important; }
}
```

#### **JavaScript Logic:**
- **Aspect ratio detection**: `window.innerWidth >= window.innerHeight`
- **No device width detection**: Pure aspect ratio only
- **Clear inline styles**: Let CSS handle layout
- **Debug logging**: Show aspect ratio and layout decisions

### **❌ What We're Avoiding:**
- Device width breakpoints for layout direction
- Orientation-based CSS that conflicts with aspect ratio
- Complex JavaScript that overrides CSS
- Inline styles that fight with CSS media queries

### **✅ Success Criteria:**
1. **Desktop browser** in landscape shows video left, map right
2. **Desktop browser** in portrait shows video top, map bottom  
3. **Mobile/tablet** follows same aspect ratio rules
4. **Map displays properly** in all layouts
5. **Layout changes instantly** on window resize/orientation change

### **🔍 Debug Information:**
Console should show:
- Window dimensions and aspect ratio
- Layout direction being applied
- CSS media query matches
- No conflicting inline styles

---

**Last Updated**: Current session
**Status**: Implementation in progress
