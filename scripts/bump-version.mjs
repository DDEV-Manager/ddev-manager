#!/usr/bin/env node

/**
 * Version bump script for DDEV Manager
 *
 * Updates version in both package.json and src-tauri/tauri.conf.json
 *
 * Usage:
 *   pnpm version:bump patch     # 0.1.0 -> 0.1.1
 *   pnpm version:bump minor     # 0.1.0 -> 0.2.0
 *   pnpm version:bump major     # 0.1.0 -> 1.0.0
 *   pnpm version:bump 1.2.3     # Set specific version
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const PACKAGE_JSON = resolve(rootDir, "package.json");
const TAURI_CONF = resolve(rootDir, "src-tauri/tauri.conf.json");

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(currentVersion, type) {
  const { major, minor, patch } = parseVersion(currentVersion);

  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      // If type is a version string, validate and return it
      parseVersion(type); // Throws if invalid
      return type;
  }
}

function readJSON(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function writeJSON(filePath, data) {
  const content = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(filePath, content, "utf-8");
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage: pnpm version:bump <type>

Arguments:
  type    Version bump type: major, minor, patch, or specific version (e.g., 1.2.3)

Examples:
  pnpm version:bump patch     # 0.1.0 -> 0.1.1
  pnpm version:bump minor     # 0.1.0 -> 0.2.0
  pnpm version:bump major     # 0.1.0 -> 1.0.0
  pnpm version:bump 1.2.3     # Set specific version

After bumping, remember to:
  1. git add -A
  2. git commit -m "chore: release vX.X.X"
  3. git tag vX.X.X
  4. git push && git push --tags
`);
    process.exit(0);
  }

  const bumpType = args[0];

  // Read current versions
  const packageJson = readJSON(PACKAGE_JSON);
  const tauriConf = readJSON(TAURI_CONF);

  const currentVersion = packageJson.version;

  // Check versions are in sync
  if (packageJson.version !== tauriConf.version) {
    console.error(
      `Warning: Versions are out of sync!\n` +
        `  package.json: ${packageJson.version}\n` +
        `  tauri.conf.json: ${tauriConf.version}\n`
    );
  }

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`Bumping version: ${currentVersion} -> ${newVersion}\n`);

  // Update package.json
  packageJson.version = newVersion;
  writeJSON(PACKAGE_JSON, packageJson);
  console.log(`  Updated package.json`);

  // Update tauri.conf.json
  tauriConf.version = newVersion;
  writeJSON(TAURI_CONF, tauriConf);
  console.log(`  Updated src-tauri/tauri.conf.json`);

  console.log(`
Done! Next steps:
  git add -A
  git commit -m "chore: release v${newVersion}"
  git tag v${newVersion}
  git push && git push --tags
`);
}

main();
