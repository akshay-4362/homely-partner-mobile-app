#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Installing Java 17 for macOS      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${BLUE}📦 Installing Homebrew first...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

    # Add Homebrew to PATH for Apple Silicon
    if [ -f "/opt/homebrew/bin/brew" ]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
fi

echo -e "${BLUE}📥 Installing Java 17...${NC}"
brew install openjdk@17

# Link Java
echo -e "${BLUE}🔗 Linking Java...${NC}"
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk 2>/dev/null || \
sudo ln -sfn /usr/local/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Add to .zshrc
echo -e "${BLUE}⚙️  Configuring environment...${NC}"

# Remove old Java entries
sed -i '' '/JAVA_HOME/d' ~/.zshrc 2>/dev/null
sed -i '' '/Android/d' ~/.zshrc 2>/dev/null

# Add new configuration
cat >> ~/.zshrc << 'EOF'

# Java
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
EOF

# Reload
source ~/.zshrc

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Java Installed Successfully!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Verify
echo -e "${BLUE}Verifying installation...${NC}"
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"

java -version

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "   1. Close this terminal and open a new one"
echo -e "   2. Or run: ${GREEN}source ~/.zshrc${NC}"
echo -e "   3. Then run: ${GREEN}./build-simple.sh${NC}"
echo ""
