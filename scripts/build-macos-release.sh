#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/macos/ClawAgentManager"
BUILD_DIR="$APP_DIR/.build/release"
OUT_DIR="$HOME/Desktop/ClawAgentManager Builds"

mkdir -p "$OUT_DIR"

# Versioning
VERSION_FILE="$ROOT_DIR/VERSION.txt"
if [[ ! -f "$VERSION_FILE" ]]; then
  echo "0.1.0" > "$VERSION_FILE"
fi

VERSION=$(cat "$VERSION_FILE")
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "$NEW_VERSION" > "$VERSION_FILE"

# Build
cd "$APP_DIR"
swift build -c release

# Package as a basic .app bundle placeholder (SwiftPM binary)
APP_NAME="ClawAgentManager"
APP_BUNDLE="$OUT_DIR/$APP_NAME-$NEW_VERSION.app"
BIN_PATH="$BUILD_DIR/$APP_NAME"

rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"
cp "$BIN_PATH" "$APP_BUNDLE/Contents/MacOS/$APP_NAME"

# Minimal Info.plist
cat > "$APP_BUNDLE/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>$APP_NAME</string>
  <key>CFBundleIdentifier</key><string>ai.openclaw.claw-agent-manager</string>
  <key>CFBundleName</key><string>$APP_NAME</string>
  <key>CFBundleShortVersionString</key><string>$NEW_VERSION</string>
  <key>CFBundleVersion</key><string>$NEW_VERSION</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>LSMinimumSystemVersion</key><string>14.0</string>
</dict>
</plist>
EOF

# Copy app icon if available
ICON_ICNS="$APP_DIR/Sources/ClawAgentManager/Resources/AppIcon.icns"
if [[ -f "$ICON_ICNS" ]]; then
  cp "$ICON_ICNS" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"
fi

# Update Info.plist inside SwiftPM bundle if present
INFO_PLIST="$APP_DIR/Info.plist"
if [[ -f "$INFO_PLIST" ]]; then
  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $NEW_VERSION" "$INFO_PLIST" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_VERSION" "$INFO_PLIST" 2>/dev/null || true
fi

echo "Built $APP_BUNDLE"
