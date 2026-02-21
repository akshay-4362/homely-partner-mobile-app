# Build Instructions for urban-mobile-professional

## Development Setup (No Build Required)

### Option 1: Use Expo Go App (Recommended for Development)

1. Install Expo Go on your Android/iOS device:
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent
   - iOS: https://apps.apple.com/app/expo-go/id982107779

2. Start the development server:
   ```bash
   cd urban-mobile-professional
   npm start
   ```

3. Scan the QR code with your device to open the app

**Note**: All code changes are live-reloaded instantly

---

## Production Builds

### Local Android Build (Requires Java)

1. **Install Java 17**:
   ```bash
   brew install --cask temurin@17
   ```

2. **Verify Java installation**:
   ```bash
   java -version
   # Should show: openjdk version "17.x.x"
   ```

3. **Set JAVA_HOME** (add to ~/.zshrc or ~/.bashrc):
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   ```

4. **Build Android APK**:
   ```bash
   cd urban-mobile-professional
   npx expo run:android --variant release
   ```

### Cloud Build with EAS (No Java needed)

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Configure EAS**:
   ```bash
   cd urban-mobile-professional
   eas build:configure
   ```

3. **Build for Android**:
   ```bash
   eas build --platform android
   ```

4. **Build for iOS** (requires Apple Developer account):
   ```bash
   eas build --platform ios
   ```

---

## Current Status

✅ **Backend**: All credit system updates complete
✅ **Frontend**: Credit UI updated (₹50,000 package, dual deduction)
✅ **TypeScript**: No build errors
❌ **Java**: Not installed (needed for local Android builds only)

## What Works Now

- Development with Expo Go ✓
- TypeScript compilation ✓
- All features implemented ✓
- Code is ready to run ✓

## Next Steps

Choose one:
1. Install Java (see above) for local Android builds
2. Use Expo Go for development testing
3. Use EAS Build for production APKs
