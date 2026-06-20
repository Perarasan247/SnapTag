# SnapTag — Photo & Video Capture with Tags, Notes & S3 Upload

SnapTag is a production-ready Expo React Native application (iOS + Android + Web) that allows users to instantly capture photos/videos, assign categories/tags and descriptive notes, record silent GPS geotags, and upload them to AWS S3. It is designed with premium aesthetics, animations, and non-blocking background retry flows.

---

## Features

1.  **Instant Camera Viewfinder:** Boots directly to a full-screen edge-to-edge camera. Supports tap capture (photo) and hold capture (video), a recording timer, flash, and camera rotation.
2.  **Tag & Notes Editor:** Promptly requests descriptive info post-capture. Auto-fills inputs via horizontally scrollable quick-tag chips.
3.  **Silent Geotagging:** Background location retrieval silently stamps GPS coordinates (latitude, longitude, altitude) to metadata.
4.  **Device Integration:** Saves all media directly to the device's gallery (`expo-media-library`) and persists logs locally in `AsyncStorage`.
5.  **AWS S3 Uploader:** Performs direct binary media and metadata uploads. Incorporates custom progress trackers and auto-appends records to S3's master `metadata/index.json`.
6.  **Auto-Retry Sync:** Automatically scans for and retries pending or failed uploads in the background on startup or manually via the Library view.
7.  **Library Browser:** Features scrollable category filtering, upload status icons (pending, uploading, failed, completed), and a comprehensive detail overlay supporting video playback and local deletion.

---

## Getting Started

### 1. Prerequisites
Ensure you have Node.js and NPM installed on your machine:
*   **Node.js**: `v18.x` or higher (`v24.x` recommended)
*   **NPM**: `v9.x` or higher

To test on physical mobile devices, install the **Expo Go** app from the Google Play Store or Apple App Store.

---

## 2. Configuration (`.env`)

Duplicate the environment configuration template:
```bash
cp .env.example .env
```

Open `.env` and fill in your AWS credentials for client-side signing:
```env
EXPO_PUBLIC_AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
# Optional: (Needed only if using temporary credentials or IAM session role tokens)
EXPO_PUBLIC_AWS_SESSION_TOKEN=YOUR_AWS_SESSION_TOKEN

# S3 Configuration
EXPO_PUBLIC_S3_BUCKET=alix-aiml
EXPO_PUBLIC_S3_REGION=us-east-1
```

*For S3 bucket permission setups, CORS configurations, and SNS/SQS event structures, refer to [README_AWS_SETUP.md](./README_AWS_SETUP.md).*

---

## 3. Running the Project

Follow these commands to install dependencies and run the development server:

### Step 1: Navigate to the project folder
```bash
cd snaptag
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Start the Expo CLI Server
```bash
npm start
```
This opens the Expo Developer terminal. You can press `w` to start the **Web** version, or scan the QR code using your phone camera (iOS) or **Expo Go** app (Android) to test on a physical device.

### Specific Run Scripts:
*   **iOS Simulator:** `npm run ios`
*   **Android Emulator:** `npm run android`
*   **Web Browser:** `npm run web`
