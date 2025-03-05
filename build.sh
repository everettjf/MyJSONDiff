

APPNAME="MyJSONDiff"
# rustup target add x86_64-apple-darwin 


rm -rf src/out
rm -rf src-tauri/target


cd src
npm install
cd ..
npm install

npm run tauri build -- --bundles app --target universal-apple-darwin

# security find-identity -v -p codesigning
# security find-identity -v

rm "$APPNAME.pkg"
xcrun productbuild --sign "3rd Party Mac Developer Installer: Feng Zhu (SU4WK7V467)" --component "src-tauri/target/universal-apple-darwin/release/bundle/macos/$APPNAME.app" /Applications "$APPNAME.pkg"