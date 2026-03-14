#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      APK Installer for Android        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if adb is available
if ! command -v adb &> /dev/null; then
    echo -e "${RED}✗${NC} adb not found"
    echo -e "${YELLOW}   Please install Android SDK Platform Tools${NC}"
    exit 1
fi

# Find APK file
if [ -f "android/app/build/outputs/apk/debug/homelyo-partner-debug.apk" ]; then
    APK_PATH="android/app/build/outputs/apk/debug/homelyo-partner-debug.apk"
    APK_TYPE="Debug"
elif [ -f "android/app/build/outputs/apk/release/homelyo-partner-release.apk" ]; then
    APK_PATH="android/app/build/outputs/apk/release/homelyo-partner-release.apk"
    APK_TYPE="Release"
else
    echo -e "${RED}✗${NC} No APK found. Please build first:"
    echo -e "   ${YELLOW}./build-local.sh${NC} (for debug APK)"
    echo -e "   ${YELLOW}./build-release.sh${NC} (for release APK)"
    exit 1
fi

echo -e "${BLUE}📦 Found APK:${NC} $APK_TYPE"
echo -e "${BLUE}📍 Location:${NC} $APK_PATH"
echo ""

# Check for connected devices
echo -e "${BLUE}📱 Checking for connected devices...${NC}"
DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | xargs)

if [ "$DEVICES" -eq "0" ]; then
    echo -e "${RED}✗${NC} No devices found"
    echo ""
    echo -e "${YELLOW}Please:${NC}"
    echo -e "   1. Connect your Android phone via USB"
    echo -e "   2. Enable USB Debugging in Developer Options"
    echo -e "   3. Accept the USB debugging prompt on your phone"
    echo -e "   4. Run this script again"
    echo ""
    echo -e "${BLUE}💡 Alternatively, transfer the APK to your phone:${NC}"
    echo -e "   ${GREEN}$APK_PATH${NC}"
    echo -e "   And install it manually"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found $DEVICES device(s)"
echo ""

# List connected devices
echo -e "${BLUE}Connected devices:${NC}"
adb devices | grep "device$"
echo ""

# Install APK
echo -e "${BLUE}📲 Installing APK...${NC}"
adb install -r "$APK_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║      INSTALLATION SUCCESSFUL! 🎉      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}✓${NC} App installed on your device"
    echo -e "${BLUE}📱${NC} Open the Homelyo Partner app to start using it"
    echo ""
else
    echo ""
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     INSTALLATION FAILED! ⚠️           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Common issues:${NC}"
    echo -e "   • USB debugging not enabled"
    echo -e "   • USB debugging authorization not granted"
    echo -e "   • Device not properly connected"
    echo ""
    echo -e "${BLUE}Try:${NC}"
    echo -e "   1. Disconnect and reconnect USB cable"
    echo -e "   2. Accept USB debugging prompt on phone"
    echo -e "   3. Run: ${YELLOW}adb kill-server && adb start-server${NC}"
    echo -e "   4. Run this script again"
    exit 1
fi
