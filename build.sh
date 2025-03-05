#!/bin/bash

APPNAME="MyJSONDiff"

# Clean any previous build artifacts
echo "Cleaning previous builds..."
rm -rf src/out
rm -rf src-tauri/target

# Make sure dependencies are installed
echo "Installing dependencies..."
cd src
npm install
cd ..
npm install

# Build the frontend
echo "Building frontend..."
npm run build

# Build the app with specific settings for TestFlight
echo "Building Tauri app for iOS/TestFlight..."
npm run tauri build -- --target universal-apple-darwin --bundles ios

echo "Build completed. The app package is ready for TestFlight distribution."
echo "Please upload the .ipa file from src-tauri/target/universal-apple-darwin/release/bundle/ios directory to App Store Connect."

# For macOS package (optional)
echo "Creating macOS installer package..."
rm -f "$APPNAME.pkg"
xcrun productbuild --sign "3rd Party Mac Developer Installer: Feng Zhu (SU4WK7V467)" \
  --component "src-tauri/target/universal-apple-darwin/release/bundle/macos/$APPNAME.app" \
  /Applications "$APPNAME.pkg"

echo "Build process completed."