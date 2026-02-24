#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Simple APK Build (No NDK Required)  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Find Java
# Try Homebrew first
if command -v brew &> /dev/null; then
    BREW_JAVA=$(brew --prefix openjdk@17 2>/dev/null)
    if [ ! -z "$BREW_JAVA" ]; then
        export JAVA_HOME="$BREW_JAVA/libexec/openjdk.jdk/Contents/Home"
        export PATH="$JAVA_HOME/bin:$PATH"
        echo -e "${GREEN}✓${NC} Found Java (Homebrew): $JAVA_HOME"
    fi
fi

# Fallback to system Java
if [ -z "$JAVA_HOME" ] && [ -d "/Library/Java/JavaVirtualMachines" ]; then
    JAVA_HOMES=$(ls -d /Library/Java/JavaVirtualMachines/*.jdk/Contents/Home 2>/dev/null)
    if [ ! -z "$JAVA_HOMES" ]; then
        export JAVA_HOME=$(echo "$JAVA_HOMES" | head -1)
        export PATH="$JAVA_HOME/bin:$PATH"
        echo -e "${GREEN}✓${NC} Found Java (System): $JAVA_HOME"
    fi
fi

# Verify Java is accessible
if ! command -v java &> /dev/null; then
    echo -e "${RED}✗${NC} Java not found in PATH"
    echo -e "${YELLOW}   Please install Java 17:${NC}"
    echo -e "${BLUE}   brew install openjdk@17${NC}"
    exit 1
fi

# Set Android Home
if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

echo -e "${GREEN}✓${NC} ANDROID_HOME: $ANDROID_HOME"
echo ""

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install --legacy-peer-deps

echo ""
echo -e "${BLUE}🧹 Cleaning...${NC}"
rm -rf android

echo ""
echo -e "${BLUE}📱 Generating Android code (without NDK)...${NC}"

# Generate with no-install flag to skip pod install
npx expo prebuild --platform android --clean --no-install

if [ ! -d "android" ]; then
    echo -e "${RED}✗${NC} Failed to generate Android code"
    exit 1
fi

# Modify gradle.properties to disable NDK completely
cat > android/gradle.properties << 'EOF'
# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx2048m
org.gradle.parallel=true
org.gradle.daemon=true
android.useAndroidX=true
android.enableJetifier=true

# Disable NDK
android.ndkVersion=
EXPO_NO_CAPABILITY_SYNC=1

# Use Hermes engine and new architecture (required by react-native-reanimated)
hermesEnabled=true
newArchEnabled=true
EOF

# Create simple local.properties
cat > android/local.properties << EOF
sdk.dir=$ANDROID_HOME
EOF

# Modify build.gradle to remove NDK requirement
if [ -f "android/build.gradle" ]; then
    # Comment out NDK version requirement
    sed -i '' 's/ndkVersion/\/\/ ndkVersion/g' android/build.gradle 2>/dev/null || true
fi

if [ -f "android/app/build.gradle" ]; then
    sed -i '' 's/ndkVersion/\/\/ ndkVersion/g' android/app/build.gradle 2>/dev/null || true
fi

echo -e "${GREEN}✓${NC} Configuration updated"
echo ""

echo -e "${BLUE}🚀 Building APK...${NC}"
echo -e "${YELLOW}   This will take 5-10 minutes...${NC}"
echo ""

cd android

# Build with Java explicitly set
JAVA_HOME="$JAVA_HOME" ./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       BUILD SUCCESSFUL! 🎉            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📦 APK Location:${NC}"
    echo -e "   ${GREEN}android/app/build/outputs/apk/release/app-release.apk${NC}"
    echo ""

    # Get APK size
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
        echo -e "${BLUE}📊 APK Size: ${GREEN}$APK_SIZE${NC}"
    fi
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║         BUILD FAILED! ⚠️              ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    exit 1
fi
