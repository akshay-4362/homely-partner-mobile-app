# Splash Screen Design Guide - Homelyo Professional

## Overview

A splash screen is the first screen users see when launching your app. It should be:
- **Fast**: Displays instantly while app loads
- **Branded**: Matches your app identity
- **Simple**: Minimal design for quick recognition

## Design Specifications

### Master Splash Image
- **Size**: 1242x2436 px (iPhone 13 Pro Max resolution)
- **Format**: PNG with transparency
- **Aspect Ratio**: 9:19.5 (fits most modern devices)
- **Safe Area**: Keep logo/text within center 60% of screen

### Background
- **Color**: #6366F1 (brand indigo)
- **Style**: Solid color or subtle gradient
- **Alternative**: Light background (#F7F8FC) for minimal look

### Logo/Icon
- **Position**: Centered vertically and horizontally
- **Size**: Max 40% of screen height (972px)
- **Style**: White or colored logo with shadow
- **Spacing**: Minimum 80px from screen edges

## Design Concepts

### Concept 1: Centered Icon (Recommended)
```
┌─────────────────────┐
│                     │
│                     │
│                     │
│      [ICON]         │  ← App icon (400x400)
│    Homelyo Pro      │  ← App name (optional)
│                     │
│                     │
│                     │
└─────────────────────┘
Background: #6366F1 gradient
```

**Pros**: Clean, fast-loading, modern
**Cons**: May feel plain

### Concept 2: Logo + Tagline
```
┌─────────────────────┐
│                     │
│                     │
│      [LOGO]         │  ← Logo (500x500)
│                     │
│   Professional      │  ← Tagline
│  Service Partner    │
│                     │
│                     │
└─────────────────────┘
Background: Gradient or solid
```

**Pros**: More informative, branded
**Cons**: Slightly more complex

### Concept 3: Minimalist
```
┌─────────────────────┐
│                     │
│                     │
│                     │
│         H           │  ← Large "H" icon
│                     │
│                     │
│                     │
│                     │
└─────────────────────┘
Background: White (#FFFFFF)
Icon: Indigo (#6366F1)
```

**Pros**: Ultra-fast loading, modern
**Cons**: Less recognizable initially

## Technical Setup

### Current Configuration (app.json)

```json
{
  "splash": {
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#6366F1"
  }
}
```

### Resize Modes

**contain** (Current):
- Image scaled to fit within screen
- Maintains aspect ratio
- May show background color on sides
- ✅ **Recommended** for centered logos

**cover**:
- Image fills entire screen
- May crop edges
- No background color visible
- Use for full-screen images

**native**:
- Platform-specific behavior
- iOS: scales to fill
- Android: uses backgroundColor

## Expo Splash Screen Configuration

### Using expo-splash-screen

The app uses `expo-splash-screen` for native splash behavior:

```javascript
// In App.tsx (already implemented)
import * as SplashScreen from 'expo-splash-screen';

// Keep splash visible while loading
SplashScreen.preventAutoHideAsync();

// Hide splash when ready
await SplashScreen.hideAsync();
```

### Auto-Hide Configuration

In `app.json`:
```json
{
  "splash": {
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#6366F1"
  },
  "plugins": [
    [
      "expo-splash-screen",
      {
        "image": "./assets/splash-icon.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#6366F1"
      }
    ]
  ]
}
```

## Platform-Specific Considerations

### iOS
- Supports static images only
- Shows during app cold start
- Can't show animations (without custom native code)
- Uses launch storyboard

### Android
- Supports static images and colors
- Shows during app cold start
- Can use vector drawables
- Uses splash activity theme

### Dark Mode Support

Add dark mode splash variant:

```json
{
  "splash": {
    "image": "./assets/splash-icon.png",
    "resizeMode": "contain",
    "backgroundColor": "#6366F1",
    "dark": {
      "image": "./assets/splash-icon-dark.png",
      "backgroundColor": "#1E293B"
    }
  }
}
```

## Creating Your Splash Screen

### Option 1: Use Icon Generator
Most icon generators also create splash screens:
- Upload your logo
- Select splash screen option
- Download generated files

### Option 2: Design in Figma/Canva

**Steps**:
1. Create 1242x2436 canvas
2. Fill background with #6366F1
3. Add logo centered (max 972px height)
4. Add optional text below logo
5. Export as PNG

### Option 3: Use Existing Icon

If icon is good enough for splash:
```bash
# Copy icon to splash
cp assets/icon.png assets/splash-icon.png
```

Then app.json will show icon on colored background.

## Splash Screen Best Practices

### DO:
✅ Keep it simple (logo + background)
✅ Use brand colors
✅ Make it recognizable
✅ Test on multiple device sizes
✅ Optimize file size (<200KB)
✅ Use PNG format
✅ Match app icon style

### DON'T:
❌ Add loading indicators (Apple rejects)
❌ Use complex animations (slow)
❌ Include progress bars
❌ Add text beyond brand name
❌ Use photos or detailed imagery
❌ Make it too busy

## File Sizes & Performance

**Target Sizes**:
- Splash image: <200KB
- App icon: <50KB
- Notification icon: <10KB

**Optimization**:
```bash
# Using ImageOptim (Mac)
imageoptim assets/splash-icon.png

# Using TinyPNG (Web)
# Upload to tinypng.com

# Using sharp (Node.js)
sharp('splash.png')
  .png({ quality: 80, compressionLevel: 9 })
  .toFile('splash-optimized.png');
```

## Testing Your Splash Screen

### Local Testing
```bash
# Clear cache and restart
npx expo start --clear

# Test on iOS
npx expo run:ios

# Test on Android
npx expo run:android
```

### Things to Check:
- [ ] Appears immediately on launch
- [ ] Doesn't flicker or jump
- [ ] Logo is centered and visible
- [ ] Background color matches app theme
- [ ] Works on different screen sizes
- [ ] Transitions smoothly to app
- [ ] File size is optimized

### Device Resolutions to Test

**iOS**:
- iPhone SE: 640x1136
- iPhone 8: 750x1334
- iPhone 13: 1170x2532
- iPhone 13 Pro Max: 1284x2778
- iPad: 1620x2160

**Android**:
- Small: 320x480
- Medium: 480x800
- Large: 720x1280
- XLarge: 1080x1920
- Tablet: 1200x1920

## Advanced: Animated Splash

For animated splash screens (requires custom native code):

### Option 1: Lottie Animation
```bash
npm install lottie-react-native
```

Then create custom splash component with animation.

### Option 2: React Native Bootlash
```bash
npm install react-native-bootsplash
```

More control over splash timing and transitions.

**Note**: These require ejecting from Expo managed workflow or using custom dev client.

## Placeholder Implementation

Current placeholder:
- **File**: `assets/splash-icon.png`
- **Size**: ~10KB placeholder
- **Background**: #6366F1

Replace with professional splash screen following this guide.

## Quick Start Checklist

- [ ] Design master splash image (1242x2436)
- [ ] Keep logo within center 60% of canvas
- [ ] Use brand color #6366F1 as background
- [ ] Export as PNG
- [ ] Save as `assets/splash-icon.png`
- [ ] Test on device: `npx expo start`
- [ ] Optimize file size (<200KB)
- [ ] Create dark mode variant (optional)

## Resources

**Design Tools**:
- Figma: figma.com (free)
- Canva: canva.com (free tier)
- Sketch: sketch.com (Mac only)

**Icon Generators** (include splash):
- MakeAppIcon: makeappicon.com
- AppIconMaker: appiconmaker.co
- EasyAppIcon: easyappicon.com

**Stock Assets**:
- Unsplash: unsplash.com (free photos)
- Flaticon: flaticon.com (icons)
- Undraw: undraw.co (illustrations)

---

**Estimated Time**: 30 minutes - 1 hour
**Cost**: Free with design tools or $10-30 for hired designer
