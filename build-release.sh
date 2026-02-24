#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Homelyo Pro - Release APK Builder   ║${NC}"
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

# Check if android folder exists
if [ ! -d "android" ]; then
    echo -e "${YELLOW}⚠️  Android folder not found. Running prebuild...${NC}"
    echo ""
    npx expo prebuild --platform android --clean
fi

cd android

# Check if keystore exists
if [ ! -f "app/homelyo-release-key.keystore" ]; then
    echo -e "${YELLOW}⚠️  Release keystore not found.${NC}"
    echo -e "${BLUE}   Creating new keystore...${NC}"
    echo ""
    echo -e "${YELLOW}   Please provide the following information:${NC}"
    echo ""

    # Generate keystore
    keytool -genkeypair -v \
        -storetype PKCS12 \
        -keystore app/homelyo-release-key.keystore \
        -alias homelyo-key \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass homelyo123 \
        -keypass homelyo123 \
        -dname "CN=Homelyo, OU=Mobile, O=Homelyo, L=Bangalore, ST=Karnataka, C=IN"

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} Keystore created successfully"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Save these credentials:${NC}"
        echo -e "   Keystore password: ${GREEN}homelyo123${NC}"
        echo -e "   Key alias: ${GREEN}homelyo-key${NC}"
        echo -e "   Key password: ${GREEN}homelyo123${NC}"
        echo ""
    else
        echo -e "${RED}✗${NC} Failed to create keystore"
        exit 1
    fi
fi

# Create signing config in build.gradle
echo -e "${BLUE}🔑 Configuring signing...${NC}"

# Backup original build.gradle
cp app/build.gradle app/build.gradle.backup

# Add signing config if not already present
if ! grep -q "signingConfigs" app/build.gradle; then
    # Insert signing config after android {
    sed -i '' '/android {/a\
\    signingConfigs {\
\        release {\
\            storeFile file("homelyo-release-key.keystore")\
\            storePassword "homelyo123"\
\            keyAlias "homelyo-key"\
\            keyPassword "homelyo123"\
\        }\
\    }
' app/build.gradle

    # Add signing config to release build type
    sed -i '' '/buildTypes {/,/release {/a\
\            signingConfig signingConfigs.release
' app/build.gradle
fi

echo -e "${GREEN}✓${NC} Signing configured"
echo ""

echo -e "${BLUE}🚀 Building release APK...${NC}"
echo -e "${YELLOW}   This may take 10-15 minutes...${NC}"
echo ""

# Build release APK
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║     RELEASE BUILD SUCCESSFUL! 🎉      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📦 APK Location:${NC}"
    echo -e "   ${GREEN}android/app/build/outputs/apk/release/app-release.apk${NC}"
    echo ""

    # Get APK size
    APK_SIZE=$(du -h app/build/outputs/apk/release/app-release.apk | cut -f1)
    echo -e "${BLUE}📊 APK Size: ${GREEN}$APK_SIZE${NC}"
    echo ""

    echo -e "${BLUE}📱 Next Steps:${NC}"
    echo -e "   1. Test the APK on your device"
    echo -e "   2. If all works, upload to Play Store"
    echo -e "   3. Or share directly with testers"
    echo ""
    echo -e "${YELLOW}⚠️  Keep your keystore safe! You'll need it for updates.${NC}"
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
