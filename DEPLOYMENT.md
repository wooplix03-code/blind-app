# WEZEY Production Deployment & Integration Guide

---

## 1. Android & iOS Mobile Builds (Capacitor)

The mobile application is packaged using Capacitor for Android and iOS native compilation.

### Step 1: Build the Web Assets
```bash
cd mobile
npm run build
```

### Step 2: Add Native Platforms
```bash
npx cap add android
npx cap add ios
npx cap sync
```

### Step 3: Android APK & AAB Generation
- Open Android Studio:
  ```bash
  npx cap open android
  ```
- Build signed APK: **Build > Build Bundle(s) / APK(s) > Build APK(s)**
- Build Google Play Release AAB: **Build > Generate Signed Bundle / APK > Android App Bundle**
- Required Permissions in `AndroidManifest.xml`:
  - `android.permission.RECORD_AUDIO` (Voice commands)
  - `android.permission.CAMERA` (Face capture & Surroundings scanner)
  - `android.permission.ACCESS_FINE_LOCATION` (GPS Geocoding)
  - `android.permission.INTERNET` (REST API communication)

### Step 4: iOS App Store Build
- Open Xcode:
  ```bash
  npx cap open ios
  ```
- Configure Signing & Capabilities with your Apple Developer Team.
- `Info.plist` Privacy Keys:
  - `NSMicrophoneUsageDescription`: "Wezey requires microphone access to enable voice-first navigation and audio commands."
  - `NSCameraUsageDescription`: "Wezey requires camera access to assist blind users with surroundings visualization and face verification."
  - `NSLocationWhenInUseUsageDescription`: "Wezey uses your location to tag posts and provide local weather and travel directions."

---

## 2. Laravel Backend & Database Deployment

1. **Environment Configuration**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
2. **Database Migrations & Seeding (MySQL)**:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=wezey_prod
   DB_USERNAME=wezey_user
   DB_PASSWORD=your_secure_password
   ```
   Run migrations:
   ```bash
   php artisan migrate --force --seed
   ```

3. **Storage & AWS S3**:
   ```env
   FILESYSTEM_DISK=s3
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_DEFAULT_REGION=us-east-1
   AWS_BUCKET=wezey-media-vault
   ```

4. **Background Queue & Schedule Workers**:
   ```bash
   php artisan queue:work --tries=3
   ```

---

## 3. Existing Website Integration (https://www.wezey.com)

- The backend exposes shared API endpoints under `/api/v1` and legacy bridge `/api/health`.
- Both the web application at https://www.wezey.com and the mobile apps authenticate against the unified `users` table via Laravel Sanctum tokens.
- Media uploaded from mobile or web is stored in AWS S3 and referenced in the shared MySQL database, ensuring instant cross-platform synchronization of posts, albums, comments, and profile information.
