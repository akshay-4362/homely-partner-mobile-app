#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Build Prerequisites Checker          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
echo -e "${BLUE}Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found"
    echo -e "${YELLOW}   Install from: https://nodejs.org${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Java
echo ""
echo -e "${BLUE}Checking Java...${NC}"
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
    echo -e "${GREEN}✓${NC} Java: $JAVA_VERSION"

    # Check Java home
    if [ ! -z "$JAVA_HOME" ]; then
        echo -e "${GREEN}✓${NC} JAVA_HOME: $JAVA_HOME"
    else
        echo -e "${YELLOW}⚠️  JAVA_HOME not set${NC}"
        # Try to find Java
        if [ -d "/Library/Java/JavaVirtualMachines" ]; then
            JAVA_HOMES=$(ls -d /Library/Java/JavaVirtualMachines/*.jdk/Contents/Home 2>/dev/null | head -1)
            if [ ! -z "$JAVA_HOMES" ]; then
                echo -e "${YELLOW}   Found Java at: $JAVA_HOMES${NC}"
                echo -e "${YELLOW}   Add to ~/.zshrc:${NC}"
                echo -e "${BLUE}   export JAVA_HOME=$JAVA_HOMES${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}✗${NC} Java not found"
    echo ""
    echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║     Java Installation Required         ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Install Java via Homebrew:${NC}"
    echo ""
    echo -e "${GREEN}# 1. Install Homebrew (if not installed)${NC}"
    echo -e "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    echo -e "${GREEN}# 2. Install Java 17${NC}"
    echo -e "   brew install openjdk@17"
    echo ""
    echo -e "${GREEN}# 3. Link Java${NC}"
    echo -e "   sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk"
    echo ""
    echo -e "${GREEN}# 4. Set environment${NC}"
    echo -e "   echo 'export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home' >> ~/.zshrc"
    echo -e "   echo 'export PATH=\"\$JAVA_HOME/bin:\$PATH\"' >> ~/.zshrc"
    echo -e "   source ~/.zshrc"
    echo ""
    echo -e "${BLUE}Or download from Oracle:${NC}"
    echo -e "   https://www.oracle.com/java/technologies/downloads/#java17"
    echo ""
    exit 1
fi

# Check Android SDK
echo ""
echo -e "${BLUE}Checking Android SDK...${NC}"
if [ ! -z "$ANDROID_HOME" ]; then
    echo -e "${GREEN}✓${NC} ANDROID_HOME: $ANDROID_HOME"

    # Check if directory exists
    if [ -d "$ANDROID_HOME" ]; then
        echo -e "${GREEN}✓${NC} Android SDK directory exists"
    else
        echo -e "${RED}✗${NC} Android SDK directory not found"
    fi
else
    echo -e "${YELLOW}⚠️  ANDROID_HOME not set${NC}"

    # Check common locations
    if [ -d "$HOME/Library/Android/sdk" ]; then
        echo -e "${YELLOW}   Found Android SDK at: $HOME/Library/Android/sdk${NC}"
        echo -e "${YELLOW}   Add to ~/.zshrc:${NC}"
        echo -e "${BLUE}   export ANDROID_HOME=\$HOME/Library/Android/sdk${NC}"
        echo -e "${BLUE}   export PATH=\$PATH:\$ANDROID_HOME/platform-tools${NC}"
    else
        echo -e "${RED}✗${NC} Android SDK not found"
        echo -e "${YELLOW}   Install Android Studio: https://developer.android.com/studio${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Check Complete          ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Summary
if command -v java &> /dev/null && [ ! -z "$ANDROID_HOME" ]; then
    echo -e "${GREEN}✅ All prerequisites met!${NC}"
    echo ""
    echo -e "${BLUE}Ready to build! Run:${NC}"
    echo -e "   ${GREEN}./build-simple.sh${NC}"
else
    echo -e "${YELLOW}⚠️  Some prerequisites missing${NC}"
    echo -e "${YELLOW}   Follow the instructions above to install${NC}"
fi
echo ""
