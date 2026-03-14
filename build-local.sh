#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Homelyo Partner - Local APK Builder     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}⚠️  This script is optimized for macOS${NC}"
    echo -e "${YELLOW}   Continuing anyway...${NC}"
    echo ""
fi

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Java
if command_exists java; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} Java: $JAVA_VERSION"
else
    echo -e "${RED}✗${NC} Java not found. Please install JDK 17+"
    echo -e "${YELLOW}   Download from: https://www.oracle.com/java/technologies/downloads/${NC}"
    exit 1
fi

# Check ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
    # Try common locations
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        echo -e "${YELLOW}⚠${NC}  ANDROID_HOME not set, using: $ANDROID_HOME"
    else
        echo -e "${RED}✗${NC} ANDROID_HOME not set"
        echo -e "${YELLOW}   Please install Android Studio and set ANDROID_HOME${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} ANDROID_HOME: $ANDROID_HOME"
fi

echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf android ios

echo ""
echo -e "${BLUE}📱 Generating native Android code...${NC}"
npx expo prebuild --platform android --clean

# Check if android folder was created
if [ ! -d "android" ]; then
    echo -e "${RED}✗${NC} Failed to generate Android code"
    exit 1
fi

echo -e "${GREEN}✓${NC} Native code generated successfully"

echo ""
echo -e "${BLUE}🔑 Setting up build configuration...${NC}"

# Create gradle.properties if it doesn't exist
if [ ! -f "android/gradle.properties" ]; then
    cat > android/gradle.properties << 'EOF'
# Project-wide Gradle settings
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
android.useAndroidX=true
android.enableJetifier=true

# Increase timeout
org.gradle.daemon=true
org.gradle.configureondemand=true
EOF
fi

# Create local.properties
cat > android/local.properties << EOF
sdk.dir=$ANDROID_HOME
EOF

echo -e "${GREEN}✓${NC} Build configuration created"

echo ""
echo -e "${BLUE}🚀 Building APK...${NC}"
echo -e "${YELLOW}   This may take 5-10 minutes...${NC}"
echo ""

cd android

# Build debug APK (faster, for testing)
echo -e "${BLUE}   Building debug APK...${NC}"
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          BUILD SUCCESSFUL! 🎉         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📦 APK Location:${NC}"
    echo -e "   ${GREEN}android/app/build/outputs/apk/debug/homelyo-partner-debug.apk${NC}"
    echo ""
    echo -e "${BLUE}📱 To install on device:${NC}"
    echo -e "   1. Connect your Android phone via USB"
    echo -e "   2. Enable USB debugging"
    echo -e "   3. Run: ${YELLOW}adb install app/build/outputs/apk/debug/homelyo-partner-debug.apk${NC}"
    echo ""
    echo -e "${BLUE}💡 Or transfer APK to phone and install manually${NC}"
    echo ""

    # Get APK size
    APK_SIZE=$(du -h app/build/outputs/apk/debug/homelyo-partner-debug.apk | cut -f1)
    echo -e "${BLUE}📊 APK Size: ${GREEN}$APK_SIZE${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║          BUILD FAILED! ⚠️             ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Check the error messages above for details${NC}"
    exit 1
fi
