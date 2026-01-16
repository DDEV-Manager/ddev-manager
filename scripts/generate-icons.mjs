#!/usr/bin/env node

/**
 * Generate all Tauri app icons from the source SVG logo.
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * Requires: @resvg/resvg-js and png-to-ico (installed temporarily)
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const iconsDir = join(rootDir, "src-tauri/icons");
const svgPath = join(rootDir, "public/logo.svg");

// Check if source SVG exists
if (!existsSync(svgPath)) {
  console.error("Error: public/logo.svg not found");
  process.exit(1);
}

console.log("Installing temporary dependencies...");
execSync("pnpm add -D @resvg/resvg-js png-to-ico", { cwd: rootDir, stdio: "inherit" });

// Dynamic imports after installation
const { Resvg } = await import("@resvg/resvg-js");
const { default: pngToIco } = await import("png-to-ico");

// Read the SVG file
const svgContent = readFileSync(svgPath, "utf8");

// Icon sizes needed for Tauri
const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
  // Windows Store logos
  { name: "Square30x30Logo.png", size: 30 },
  { name: "Square44x44Logo.png", size: 44 },
  { name: "Square71x71Logo.png", size: 71 },
  { name: "Square89x89Logo.png", size: 89 },
  { name: "Square107x107Logo.png", size: 107 },
  { name: "Square142x142Logo.png", size: 142 },
  { name: "Square150x150Logo.png", size: 150 },
  { name: "Square284x284Logo.png", size: 284 },
  { name: "Square310x310Logo.png", size: 310 },
  { name: "StoreLogo.png", size: 50 },
];

console.log("\nGenerating PNG icons...");

// Generate PNGs
for (const { name, size } of sizes) {
  const resvg = new Resvg(svgContent, {
    fitTo: {
      mode: "width",
      value: size,
    },
    background: "rgba(0, 0, 0, 0)",
  });

  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  writeFileSync(join(iconsDir, name), pngBuffer);
  console.log(`  Generated ${name} (${size}x${size})`);
}

// Generate macOS .icns file
console.log("\nGenerating macOS icon.icns...");
const iconsetDir = join(iconsDir, "icon.iconset");
mkdirSync(iconsetDir, { recursive: true });

// Create iconset with required sizes
const iconsetSizes = [
  { src: "32x32.png", dest: "icon_16x16@2x.png" },
  { src: "32x32.png", dest: "icon_32x32.png" },
  { src: "128x128.png", dest: "icon_64x64@2x.png" },
  { src: "128x128.png", dest: "icon_128x128.png" },
  { src: "128x128@2x.png", dest: "icon_128x128@2x.png" },
  { src: "128x128@2x.png", dest: "icon_256x256.png" },
  { src: "icon.png", dest: "icon_256x256@2x.png" },
  { src: "icon.png", dest: "icon_512x512.png" },
];

for (const { src, dest } of iconsetSizes) {
  const srcPath = join(iconsDir, src);
  const destPath = join(iconsetDir, dest);
  writeFileSync(destPath, readFileSync(srcPath));
}

try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${join(iconsDir, "icon.icns")}"`, {
    stdio: "inherit",
  });
  console.log("  Generated icon.icns");
} catch {
  console.log("  Skipped icon.icns (iconutil not available - macOS only)");
}

// Clean up iconset directory
rmSync(iconsetDir, { recursive: true, force: true });

// Generate Windows .ico file
console.log("\nGenerating Windows icon.ico...");
const pngs = [
  readFileSync(join(iconsDir, "32x32.png")),
  readFileSync(join(iconsDir, "128x128.png")),
  readFileSync(join(iconsDir, "128x128@2x.png")),
];

const icoBuffer = await pngToIco(pngs);
writeFileSync(join(iconsDir, "icon.ico"), icoBuffer);
console.log("  Generated icon.ico");

// Remove temporary dependencies
console.log("\nCleaning up temporary dependencies...");
execSync("pnpm remove @resvg/resvg-js png-to-ico", { cwd: rootDir, stdio: "inherit" });

console.log("\nAll icons generated successfully!");
