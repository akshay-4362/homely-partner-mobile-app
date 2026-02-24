# ☕ Install Java for Android Builds

## Issue
Your Mac can't find Java, which is required for Android builds.

## Quick Fix - Install Java via Homebrew

### **Step 1: Install Homebrew (if not installed)**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### **Step 2: Install Java 17**
```bash
brew install openjdk@17
```

### **Step 3: Link Java**
```bash
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
```

### **Step 4: Set Environment Variables**
Add to `~/.zshrc`:
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

Apply:
```bash
source ~/.zshrc
```

### **Step 5: Verify**
```bash
java -version
# Should show: openjdk version "17.x.x"
```

---

## Alternative - Download from Oracle

### **Step 1: Download**
Visit: https://www.oracle.com/java/technologies/downloads/#java17

Download: **macOS ARM64 DMG Installer** (for M1/M2 Mac)
Or: **macOS x64 DMG Installer** (for Intel Mac)

### **Step 2: Install**
1. Open downloaded `.dmg` file
2. Run the installer
3. Follow installation prompts

### **Step 3: Set Environment Variables**
Add to `~/.zshrc`:
```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
```

Apply:
```bash
source ~/.zshrc
```

### **Step 4: Verify**
```bash
java -version
# Should show: java version "17.x.x"
```

---

## After Java Installation

Once Java is installed, run:

```bash
# Try the simple build script
./build-simple.sh
```

This script will:
- ✅ Auto-detect Java
- ✅ Build without NDK
- ✅ Create APK in ~5 minutes

---

## Check Your System

### **Check if Java is installed:**
```bash
java -version
```

### **Check Java installation location:**
```bash
/usr/libexec/java_home -V
```

### **Check JAVA_HOME:**
```bash
echo $JAVA_HOME
```

---

## Quick Install Command

Copy and paste this entire block:

```bash
# Install Homebrew if needed
which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Java 17
brew install openjdk@17

# Link Java
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# Add to .zshrc
echo 'export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc

# Reload
source ~/.zshrc

# Verify
java -version
```

---

**Once Java is installed, run `./build-simple.sh` to build your APK!** 🚀
