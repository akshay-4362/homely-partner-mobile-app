# 🎨 Icon & Loader Setup Guide

## ✅ What's Been Added

### 1. **Icon Source Files**
- `assets/icon-source.svg` - App icon design (1024x1024)
- `assets/splash-source.svg` - Splash screen design (1284x2778)

### 2. **Loading Components**
- `src/components/common/LoadingSpinner.tsx` - In-app loading spinner
- `src/components/common/SplashLoader.tsx` - Animated splash/loading screen

---

## 📱 Step 1: Generate PNG Icons from SVG

You need to convert the SVG files to PNG format. Here are your options:

### **Option A: Online Converter (Easiest)**

1. Go to https://svgtopng.com or https://cloudconvert.com/svg-to-png
2. Upload `assets/icon-source.svg`
3. Set size to **1024x1024**
4. Download and save as `assets/icon.png`

5. Upload `assets/splash-source.svg`
6. Set size to **1284x2778**
7. Download and save as `assets/splash-icon.png`

8. For Android adaptive icon:
   - Upload `assets/icon-source.svg` again
   - Set size to **1024x1024**
   - Download and save as `assets/adaptive-icon.png`

### **Option B: Using ImageMagick (Command Line)**

```bash
# Install ImageMagick if not installed
brew install imagemagick

# Convert icon
convert assets/icon-source.svg -resize 1024x1024 assets/icon.png

# Convert splash
convert assets/splash-source.svg -resize 1284x2778 assets/splash-icon.png

# Convert adaptive icon
convert assets/icon-source.svg -resize 1024x1024 assets/adaptive-icon.png
```

### **Option C: Use Figma/Photoshop**
1. Open the SVG in Figma or Photoshop
2. Export as PNG at the required sizes

---

## 📱 Step 2: Rebuild Native App

After updating the icons, you need to rebuild:

```bash
# Prebuild to update native files with new icons
npm run prebuild:clean

# Build new APK with updated icons
npm run build:apk
```

---

## 🎨 Step 3: Use Loading Components

### **LoadingSpinner - For API Calls**

```tsx
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// As overlay during API calls
<LoadingSpinner
  visible={loading}
  text="Loading bookings..."
  overlay={true}
/>

// Inline in screen
{loading && <LoadingSpinner text="Please wait..." />}
```

### **SplashLoader - For App Launch**

```tsx
import { SplashLoader } from '../components/common/SplashLoader';

// In your App.tsx or root component
const [appReady, setAppReady] = useState(false);

if (!appReady) {
  return <SplashLoader visible={!appReady} />;
}

return <YourApp />;
```

---

## 🎯 Current Icon Configuration

Your `app.json` is already configured:

```json
{
  "icon": "./assets/icon.png",           // Home screen icon
  "splash": {
    "image": "./assets/splash-icon.png", // Launch screen
    "backgroundColor": "#6366F1"
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png", // Android adaptive icon
      "backgroundColor": "#6366F1"
    }
  }
}
```

---

## 🎨 Icon Specifications

### **App Icon (`icon.png`)**
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Used for: iOS/Android home screen

### **Splash Screen (`splash-icon.png`)**
- Size: 1284x2778 pixels (iPhone 14 Pro Max)
- Format: PNG with transparency
- Background: #6366F1 (configured in app.json)

### **Adaptive Icon (`adaptive-icon.png`)**
- Size: 1024x1024 pixels
- Format: PNG with transparency
- Android only: System crops this into various shapes

---

## 🚀 Quick Start

```bash
# 1. Convert SVG to PNG (use Option A, B, or C above)

# 2. Rebuild native app
npm run prebuild:clean

# 3. Build new APK
npm run build:apk

# 4. Test the new icon on your device!
```

---

## 💡 Tips

1. **Icon Colors**: The current design uses your brand color (#6366F1). Edit the SVG files to match your exact brand colors.

2. **Simple is Better**: App icons should be recognizable at small sizes. The house icon is clear and professional.

3. **Test on Device**: Always test how icons look on actual devices, not just in the simulator.

4. **Consistency**: Use the same design language across icon, splash screen, and in-app UI.

---

## 🎨 Customization

To customize the icon design:

1. Open `assets/icon-source.svg` in a text editor or Figma
2. Modify colors, shapes, or text
3. Save and regenerate PNG files
4. Rebuild app

---

## 📦 What's Included

✅ Professional house icon design
✅ Gradient background (#6366F1 brand color)
✅ Clean, modern aesthetic
✅ Animated loading components
✅ Splash screen with branding
✅ Ready for production

---

Need help customizing? Just ask!
