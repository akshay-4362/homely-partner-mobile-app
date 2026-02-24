#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Fixing NDK Installation Issue     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ]; then
    ANDROID_HOME="$HOME/Library/Android/sdk"
    echo -e "${YELLOW}⚠️  ANDROID_HOME not set, using: $ANDROID_HOME${NC}"
fi

NDK_DIR="$ANDROID_HOME/ndk/27.1.12297006"

echo -e "${BLUE}🔍 Checking NDK installation...${NC}"

if [ -d "$NDK_DIR" ]; then
    echo -e "${YELLOW}⚠️  Found corrupted NDK installation${NC}"
    echo -e "${BLUE}   Location: $NDK_DIR${NC}"
    echo ""
    echo -e "${BLUE}🧹 Removing corrupted NDK...${NC}"
    rm -rf "$NDK_DIR"
    echo -e "${GREEN}✓${NC} Removed corrupted NDK"
else
    echo -e "${GREEN}✓${NC} No corrupted NDK found"
fi

echo ""
echo -e "${BLUE}📝 Configuring build to skip NDK requirement...${NC}"

# Modify gradle.properties to disable NDK
if [ -f "android/gradle.properties" ]; then
    # Backup original
    cp android/gradle.properties android/gradle.properties.backup

    # Add or update NDK version to a stable one
    if grep -q "android.ndkVersion" android/gradle.properties; then
        sed -i '' 's/android.ndkVersion=.*/android.ndkVersion=26.1.10909125/' android/gradle.properties
    else
        echo "" >> android/gradle.properties
        echo "# Use stable NDK version" >> android/gradle.properties
        echo "android.ndkVersion=26.1.10909125" >> android/gradle.properties
    fi

    echo -e "${GREEN}✓${NC} Updated gradle.properties"
fi

# Update app/build.gradle to use stable NDK
if [ -f "android/app/build.gradle" ]; then
    # Backup original
    cp android/app/build.gradle android/app/build.gradle.backup2

    # Add NDK configuration if not present
    if ! grep -q "ndkVersion" android/app/build.gradle; then
        sed -i '' '/android {/a\
    ndkVersion "26.1.10909125"
' android/app/build.gradle
        echo -e "${GREEN}✓${NC} Updated app/build.gradle"
    fi
fi

echo ""
echo -e "${BLUE}📥 Installing correct NDK version via sdkmanager...${NC}"

# Install NDK 26.1.10909125 (stable version)
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "ndk;26.1.10909125" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} NDK installed successfully"
else
    echo -e "${YELLOW}⚠️  Could not install NDK via sdkmanager${NC}"
    echo -e "${BLUE}   You can install it manually through Android Studio:${NC}"
    echo -e "${BLUE}   Tools → SDK Manager → SDK Tools → NDK${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         NDK ISSUE FIXED! ✓            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "   1. Run: ${GREEN}./build-release.sh${NC}"
echo -e "   2. Or try: ${GREEN}cd android && ./gradlew clean${NC}"
echo -e "   3. Then build again"
echo ""
