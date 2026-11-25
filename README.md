# WEZEY – AI-Powered Accessibility & Social Media Platform

> **Voice-First, Full-Screen Accessible Social Network & Visual AI Assistant for the Blind and Visually Impaired.**

---

## 🌟 Executive Summary

**WEZEY** is an end-to-end, production-grade accessibility platform designed from the ground up for blind and visually impaired users. Rather than bolting accessibility onto a traditional screen-based UI, WEZEY is completely voice-guided and operable across the entire touchscreen through global gesture navigation, acoustic feedback cues, and multimodal vision AI.

---

## 📱 System Components

| Component | Technology | Local URL / Status |
| :--- | :--- | :--- |
| **Mobile Application** | React 19, TypeScript, Ionic, Capacitor | `http://127.0.0.1:3000` (LIVE) |
| **Backend REST APIs** | Laravel 12, PHP 8.2, Sanctum | `http://127.0.0.1:8000/api/v1` (LIVE) |
| **Database** | MySQL / SQLite (25 Tables Migrated & Seeded) | Connected |
| **Admin Dashboard** | Laravel Blade, Bootstrap 5 | `http://127.0.0.1:8000/admin` (LIVE) |
| **Public Website Bridge** | Shared REST sync with https://www.wezey.com | Configured |

---

## 🔑 Default Credentials

- **Admin Portal**:
  - URL: `http://127.0.0.1:8000/admin/login`
  - Email: `admin@wezey.com`
  - Password: `admin123`
- **Seeded Blind Users**:
  - **John Carter**: Phone `+1234567890` (Pass: `wezey123` / OTP: `123456`)
  - **Emma Watson**: Phone `+1234567891` (Pass: `wezey123` / OTP: `123456`)
  - **Michael Chang**: Phone `+1234567892` (Pass: `wezey123` / OTP: `123456`)

---

## 🎯 Core Accessibility & Voice-First Features

### 1. Global Full-Screen Gesture Navigation
No need to locate buttons or icons. Gestures work anywhere on the screen:
- 👈 **Swipe Left**: Go back / Return to previous screen (or Social Feed from Menu)
- 👉 **Swipe Right**: Designated Next screen (or open Author Album from Feed)
- 👆 **Swipe Up**: Open Visualization Page (Surroundings AI scanner)
- 👇 **Swipe Down**: Open User Profile
- 🎙️ **Press and Hold Anywhere**: Activate Voice Assistant ("*How can I help?*")
- ✋ **Release Finger**: Stop recording and immediately process voice command
- 👆 **Single Tap**: Execute current step action

### 2. Voice-First 5-Step Registration
- **Step 1**: Voice asks for full name -> confirms "*Name completed.*"
- **Step 2**: Voice asks for phone number -> confirms "*Phone number completed.*"
- **Step 3**: Voice asks for email address -> confirms "*Email address completed.*"
- **Step 4**: Camera opens -> captures face biometrics -> "*Face captured successfully.*"
- **Step 5**: Single tap anywhere -> "*Account registration completed.*"
- Built-in **5-second no-response repeat logic** with 3-attempt safety timeout.

### 3. Social Feed with Auto Post Reader
- Spoken entrance greeting: "*John Carter's Social Feed. Scroll down to browse more posts and swipe right to open the album.*"
- **Automatic Post Reading**: When scrolling, the newly visible post is read aloud immediately (*"John Carter posted: Enjoying a beautiful sunny day at the beach."*), cutting off prior audio immediately to prevent overlap.
- Author Album: Accessible via swipe right from feed.
- Post Search: Voice search by date, post number (*"post number 33"*), caption, or author.

### 4. 5-Step Guided Create Post
- **Step 1**: Voice guidance with camera blur check & upload status (*"Photo captured", "Uploading photo", "Upload completed"*).
- **Step 2**: Voice-based user tagging (*"Swipe left for yes or swipe right for no"*).
- **Step 3**: Automatic GPS geocoding (*"Your current location is South Beach, Miami. Location completed."*).
- **Step 4**: Multimodal Vision AI generates a concise caption (< 20 words).
- **Step 5**: Single tap to publish.

### 5. Multimodal AI Visualization Module
- Tap anywhere to capture surroundings.
- Vision AI analyzes the environment and narrates a concise ~20-word safety summary:
  > *"You are in a well-lit room with people standing in front of you and an open pathway ahead."*
- Contextual Follow-up Q&A:
  - *"Is it going to rain soon?"* -> checks live GPS weather.
  - *"Is there a restaurant in front of me?"* -> combines scene analysis with nearby Places API.
  - *"Are those people wearing orange shirts?"* -> inspects visible clothing evidence.

### 6. Voice Language Switcher
- Speak *"Please change to Malay language"* -> System confirms: *"Your preferred language has been changed to Malay."*
- Supported: English (en), Malay (ms), Spanish (es), French (fr), German (de), Hindi (hi), Chinese (zh), Arabic (ar).

---

## 🚀 Running the Project

### Start Backend:
```bash
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

### Start Mobile App:
```bash
cd mobile
npm run dev -- --host 127.0.0.1 --port 3000
```
Open **`http://127.0.0.1:3000`** in Chrome/Edge or Mobile Safari to experience the full platform with interactive speech synthesis and touch gesture engine.
