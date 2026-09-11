# iOS App Store Release & Build Guide (Speaxa)

This document contains the proven, reproducible method for building and distributing Flutter iOS apps to App Store Connect without beta version, SDK mismatch, or missing dSYM errors.

---

## 1. Golden Rule for App Store Validation
Apple App Store Connect strictly enforces that all submissions are built using the official public release (GM) version of Xcode and the SDK corresponding to the release timeline (e.g. **Xcode 26.0.1 GM `17A400` / iOS 26.0 SDK** on `macos-15` runners).

**Never** patch Mach-O binary headers locally or upload builds made with local Preview/Beta toolchains. Always compile the release `.xcarchive` on GitHub Actions runners with official GM toolchains.

---

## 2. Standard GitHub Actions Workflow (`.github/workflows/build_teacher_ios_gm.yml`)

```yaml
name: Build iOS with Official Xcode GM

on:
  workflow_dispatch:
  push:
    paths:
      - '.github/workflows/build_teacher_ios_gm.yml'
      - 'speaxa_teacher/ios/**'
      - 'speaxa_teacher/pubspec.yaml'

jobs:
  build:
    name: Build Native iOS XCArchive (Official Xcode 26 GM)
    runs-on: macos-15
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Select Xcode 26 GM
        uses: maxim-lobanov/setup-xcode@v1
        with:
          xcode-version: '26.0.1'

      - name: Verify Xcode Version
        run: |
          xcodebuild -version
          xcodebuild -showsdks

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
          cache: true

      - name: Build iOS Archive with Flutter
        run: |
          cd speaxa_teacher
          flutter pub get
          flutter build ipa --release --no-codesign

      - name: Zip XCArchive
        run: |
          cd speaxa_teacher
          if [ -d "build/ios/archive/Runner.xcarchive" ]; then
            zip -r -y ../speaxa-teacher-official-gm.xcarchive.zip build/ios/archive/Runner.xcarchive
          fi

      - name: Upload Compiled Artifact
        uses: actions/upload-artifact@v4
        with:
          name: speaxa-teacher-official-gm-xcarchive
          path: speaxa-teacher-official-gm.*.zip
          retention-days: 7
```

---

## 3. Flutter Plugin Registration Best Practice
In `ios/Runner/GeneratedPluginRegistrant.m`, use dynamic runtime plugin registration with `NSClassFromString` and `performSelector:` rather than static `@import` or `#import <module/header.h>`. This eliminates compile-time header/module resolution errors across mixed Swift/Objective-C CocoaPods and Swift Package Manager environments.

---

## 4. Distribution & App Store Submission Checklist
1. **Download & Open Archive in Xcode Organizer:**
   - Artifact `.xcarchive` is placed in `~/Library/Developer/Xcode/Archives/YYYY-MM-DD/`.
   - Team set to `SJQWNCMBX9` (SAHIL KHAN).
   - Build number incremented (e.g., `22`).
2. **Xcode Organizer Upload:**
   - Click **Distribute App** ➔ **App Store Connect** ➔ **Upload**.
   - If third-party frameworks (Firebase, Google Ads, etc.) trigger missing dSYM warnings, uncheck **"Upload your app's symbols"** during the distribution options step.
3. **App Store Connect Version In-Flight Page:**
   - Go to App Store Connect version page (`/distribution/ios/version/inflight`).
   - In the **Build** section, remove any previous rejected/errored build with the **`-` (Remove)** icon.
   - Select the newly uploaded GM build (e.g. Build 22).
   - Click **Save** in the top right corner. The red error banner will immediately disappear.
   - Click **Add for Review** / **Submit to App Review**.
