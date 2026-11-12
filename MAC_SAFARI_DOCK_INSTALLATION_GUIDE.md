# 🍏 macOS & iMac Installation Guide: Add PCM Smart PDF to Applications & Dock

**Architect & Copyright Owner:** PRAKASH CHAND MEHTA (`prakashcmehta@gmail.com`)  
**Application:** PCM Smart PDF (Desktop & Workstation Edition for macOS)

---

## 🎯 Why Safari Did Not Show "Add to Dock" Previously

When you open any file on a Mac by double-clicking `index.html`, Safari loads it using the file protocol:  
`file:///Users/.../mobile_app/index.html`

Apple's security architecture in macOS (macOS Sonoma, Sequoia, Ventura and later) **disables Service Workers and Web App Manifests over `file://` URLs**. As a result, the option to **"Add to Dock"** in Safari's File menu is greyed out or does not appear.

To install **PCM Smart PDF** as a genuine standalone macOS app that sits in your `/Applications` folder, Launchpad, and on your **Dock / Taskbar**, Safari must open the app via a local HTTP origin (`http://localhost:8080`).

---

## 🚀 2-Step 1-Click Installation on iMac / MacBook

### **Step 1: Launch the Local macOS Runner**
In your Google Drive synced folder or downloaded `PDF Smart Pro` folder on your iMac:
1. Double-click **`Launch_Mac_App.command`**.
   > *Tip:* If macOS shows a security prompt on first run ("unidentified developer"), simply **Right-Click** (or `Control + Click`) on `Launch_Mac_App.command` and select **Open**, then click **Open**.
2. A lightweight local server starts automatically and immediately opens Safari to:  
   `http://localhost:8080/mobile_app/index.html`

---

### **Step 2: Add to Dock & Applications in Safari**
Once the app loads in Safari:
1. In Safari's top Apple menu bar, click **File**.
2. Click **Add to Dock...** (or click the Safari **Share** button at the top right and choose **Add to Dock**).
3. A popup will show the app icon and title: **PCM Smart PDF**.
4. Click the blue **Add** button.

---

## 🎉 What Happens Next?
- **Dock / Taskbar Icon:** The official Indian Tricolor app icon is immediately pinned to your macOS Dock / Taskbar.
- **Applications Folder:** A native macOS application named `PCM Smart PDF.app` is placed in your `Applications` folder (`~/Applications/`).
- **Spotlight Search:** You can press `Cmd + Space`, type `PCM Smart PDF`, and press `Enter` to open it anytime.
- **Standalone Window:** When opened from the Dock, it runs in its own clean window without Safari browser address bars or tabs, looking and feeling 100% like a native Mac software program!
- **Zero Cloud Transmission:** All PDF processing, signature affixing, forms, redactions, and compression happen 100% offline inside your Mac's browser engine.

---

## 📋 Summary of New Features in this Release
1. **iLovePDF-Style Card Grid Homepage:** Clean presentation of all 31 tools with category filter pills (`All`, `Organize`, `Optimize`, `Convert`, `Edit`, `Security`, `Intelligence`, `Workflows`).
2. **Deactivated Onboarding Gate:** Zero blocking modals or OTP gates upon startup. Instant direct access to all PDF tools.
3. **Interactive 4-Corner Signature & Stamp Resizing:** Visual corner drag handles (NW, NE, SE, SW) with smooth real-time drag-and-drop.
4. **Enhanced Ink Contrast Isolation:** Genuine transparent ink that preserves signature stroke opacity without washing out.
5. **Sticky Notes & Margin Remarks:** Rich multi-line colored notes (Yellow, Blue, Green, Pink, Orange) with full PDF export.
