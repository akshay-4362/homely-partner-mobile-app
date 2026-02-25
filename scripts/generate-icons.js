#!/usr/bin/env node

/**
 * Icon Generation Script for Homelyo Professional App
 *
 * This script generates all required icon sizes from a master 1024x1024 icon.
 *
 * Prerequisites:
 * - Install Sharp: npm install sharp --save-dev
 * - Prepare master icon: assets/master-icon.png (1024x1024)
 *
 * Usage:
 * node scripts/generate-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Icon sizes configuration
const ICON_SIZES = {
  ios: [
    { size: 1024, name: 'icon-1024.png' },
    { size: 180, name: 'icon-180.png' },
    { size: 167, name: 'icon-167.png' },
    { size: 152, name: 'icon-152.png' },
    { size: 120, name: 'icon-120.png' },
    { size: 87, name: 'icon-87.png' },
    { size: 80, name: 'icon-80.png' },
    { size: 76, name: 'icon-76.png' },
    { size: 60, name: 'icon-60.png' },
    { size: 58, name: 'icon-58.png' },
    { size: 40, name: 'icon-40.png' },
    { size: 29, name: 'icon-29.png' },
    { size: 20, name: 'icon-20.png' },
  ],
  android: [
    { size: 1024, name: 'icon-1024.png' },
    { size: 512, name: 'icon-512.png' },
    { size: 384, name: 'icon-384.png' },
    { size: 256, name: 'icon-256.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 128, name: 'icon-128.png' },
    { size: 96, name: 'icon-96.png' },
  ],
  notification: [
    { size: 96, name: 'notification-icon-96.png' },
    { size: 72, name: 'notification-icon-72.png' },
    { size: 48, name: 'notification-icon-48.png' },
    { size: 36, name: 'notification-icon-36.png' },
    { size: 24, name: 'notification-icon-24.png' },
  ],
};

// Paths
const MASTER_ICON = path.join(__dirname, '../assets/master-icon.png');
const MASTER_NOTIFICATION = path.join(__dirname, '../assets/master-notification-icon.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/generated-icons');

/**
 * Generate icon at specific size
 */
async function generateIcon(inputPath, outputPath, size) {
  try {
    await sharp(inputPath)
      .resize(size, size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated: ${path.basename(outputPath)} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Failed to generate ${outputPath}:`, error.message);
  }
}

/**
 * Generate all icons
 */
async function generateAllIcons() {
  console.log('🎨 Starting icon generation...\n');

  // Check if master icon exists
  if (!fs.existsSync(MASTER_ICON)) {
    console.error(`❌ Master icon not found at: ${MASTER_ICON}`);
    console.log('\n📝 Please create a 1024x1024 PNG icon at:');
    console.log('   assets/master-icon.png');
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate iOS icons
  console.log('📱 Generating iOS icons...');
  for (const config of ICON_SIZES.ios) {
    const outputPath = path.join(OUTPUT_DIR, 'ios', config.name);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await generateIcon(MASTER_ICON, outputPath, config.size);
  }

  // Generate Android icons
  console.log('\n🤖 Generating Android icons...');
  for (const config of ICON_SIZES.android) {
    const outputPath = path.join(OUTPUT_DIR, 'android', config.name);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    await generateIcon(MASTER_ICON, outputPath, config.size);
  }

  // Generate notification icons (if master notification icon exists)
  if (fs.existsSync(MASTER_NOTIFICATION)) {
    console.log('\n🔔 Generating notification icons...');
    for (const config of ICON_SIZES.notification) {
      const outputPath = path.join(OUTPUT_DIR, 'notification', config.name);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      await generateIcon(MASTER_NOTIFICATION, outputPath, config.size);
    }
  } else {
    console.log('\n⚠️  Notification icon master not found, skipping...');
    console.log('   Create assets/master-notification-icon.png (96x96) for notification icons');
  }

  // Copy main icons to root assets for Expo
  console.log('\n📦 Copying main icons to assets...');
  const mainIconSource = path.join(OUTPUT_DIR, 'ios/icon-1024.png');
  const mainIconDest = path.join(__dirname, '../assets/icon.png');
  fs.copyFileSync(mainIconSource, mainIconDest);
  console.log('✅ Copied: assets/icon.png');

  if (fs.existsSync(MASTER_NOTIFICATION)) {
    const notifIconSource = path.join(OUTPUT_DIR, 'notification/notification-icon-96.png');
    const notifIconDest = path.join(__dirname, '../assets/notification-icon.png');
    fs.copyFileSync(notifIconSource, notifIconDest);
    console.log('✅ Copied: assets/notification-icon.png');
  }

  console.log('\n✨ Icon generation complete!');
  console.log(`\n📁 Generated icons saved to: ${OUTPUT_DIR}`);
  console.log('\n📝 Next steps:');
  console.log('1. Review generated icons in assets/generated-icons/');
  console.log('2. Test on devices: npx expo start');
  console.log('3. Build for production: eas build');
}

/**
 * Generate adaptive icon (Android)
 */
async function generateAdaptiveIcon() {
  console.log('\n🎨 Generating Android adaptive icon...');

  const foregroundSource = MASTER_ICON;
  const foregroundDest = path.join(__dirname, '../assets/adaptive-icon.png');

  // For adaptive icons, we need to scale down to 66% to fit safe zone
  const size = 1024;
  const safeSize = Math.round(size * 0.66);
  const padding = Math.round((size - safeSize) / 2);

  try {
    await sharp(foregroundSource)
      .resize(safeSize, safeSize, {
        kernel: sharp.kernel.lanczos3,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(foregroundDest);

    console.log('✅ Generated: assets/adaptive-icon.png');
  } catch (error) {
    console.error('❌ Failed to generate adaptive icon:', error.message);
  }
}

// Run the script
(async () => {
  try {
    await generateAllIcons();
    await generateAdaptiveIcon();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
