# PDF Studio Pro - Mobile & Tablet Apps (iOS & Android)

This folder contains the complete, 100% offline mobile implementation for PDF Studio Pro, designed for Apple iPads, iPhones, Android tablets, and Android smartphones.

---

## Option 1: Direct Offline PWA (Recommended - Zero Install Overhead)
The app is a fully compliant Progressive Web App (PWA). All processing libraries (`pdf-lib.min.js`) are bundled locally inside the project.

### On iOS (iPhone / iPad):
1. Connect to your desktop using the local offline server (`python mobile_server.py`) or host the `mobile_app` folder locally.
2. In Safari on your iPhone/iPad, open the URL (e.g. `http://192.168.1.17:8080`).
3. Tap the **Share** button (box with upward arrow) at the bottom or top of Safari.
4. Scroll down and tap **"Add to Home Screen"**.
5. The PDF Studio Pro icon will appear on your iOS home screen.
6. **Offline Access**: Once added, you can turn on Airplane Mode with zero Wi-Fi or cellular; the app works completely offline without network.

### On Android (Phones & Tablets):
1. In Google Chrome on your Android device, open the local URL (e.g. `http://192.168.1.17:8080`).
2. Tap the three dots menu (⋮) in the top-right corner.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The app installs as a native Android app, with its own icon in the app drawer.
5. Works 100% offline.

---

## Option 2: Building Native `.apk` (Android) & `.ipa` (iOS) via Capacitor
If you wish to distribute compiled native binaries (`.apk` / `.aab` for Google Play Store, or `.ipa` for Apple App Store / TestFlight):

### Prerequisites:
- Node.js (v18+)
- For Android: Android Studio & Android SDK
- For iOS: macOS computer with Xcode

### Build Steps:
```bash
# 1. Install Capacitor dependencies
npm install

# 2. Add Android platform
npx cap add android

# 3. Add iOS platform
npx cap add ios

# 4. Sync web assets into native projects
npx cap sync

# 5. Open Android project in Android Studio (to generate APK):
npx cap open android
# In Android Studio, click "Build" -> "Build Bundle(s) / APK(s)" -> "Build APK(s)"

# 6. Open iOS project in Xcode (to build iOS IPA):
npx cap open ios
# In Xcode, select your team/certificate and click "Product" -> "Archive"
```

---

## Features on Mobile & Tablet
1. **Fill Official PDF Forms**:
   - Touch-friendly fields for text inputs, checkboxes, and choice fields.
   - One-tap flattening for tamper-proof submission to authorities.
2. **Signature Support**:
   - Draw handwritten signature with touch / Apple Pencil / stylus on canvas pad.
   - OR upload existing signature image (.PNG / .JPG / transparent PNG) from Camera / Photo Library.
   - Choose placement: Bottom-Right (standard), Bottom-Left, Bottom-Center, Top-Right.
   - Set width, height, signer name stamp, and date.
3. **Merge Multiple PDFs**:
   - Combine multiple documents directly on phone/tablet storage.
4. **100% Client-Side Privacy**:
   - No data ever leaves the device.
