# WEZEY REST API Documentation (v1)

**Base URL**: `http://127.0.0.1:8000/api/v1`  
**Shared Production URL**: `https://api.wezey.com/api/v1`

---

## 1. Authentication & Registration

### `POST /auth/check`
Check if a phone number or device is already registered.
- **Request**: `{ "phone_number": "+1234567890" }`
- **Response**: `{ "registered": true, "token": "...", "user": { ... }, "spoken_text": "Welcome back to Wezey. Main Menu." }`

### `POST /auth/register`
Complete 5-step voice registration.
- **Request**:
  ```json
  {
    "name": "John Carter",
    "phone_number": "+1234567890",
    "email": "john@wezey.com",
    "face_data": "data:image/jpeg;base64,...",
    "otp_code": "123456"
  }
  ```
- **Response**: 201 Created with Sanctum Bearer Token and User Profile.

### `POST /auth/login`
Authenticate via phone number & OTP.

### `POST /auth/logout`
Revoke current Sanctum token.

### `GET /auth/me`
Retrieve currently authenticated blind user profile and preferences.

---

## 2. OTP & Face Verification

### `POST /otp/send`
- **Request**: `{ "phone_number": "+1234567890", "purpose": "registration" }`
- **Response**: `{ "success": true, "message": "OTP sent successfully", "expires_in_seconds": 600 }`

### `POST /otp/verify`
- **Request**: `{ "phone_number": "+1234567890", "otp_code": "123456" }`

### `POST /face/enroll`
Enroll user face biometric template.

### `POST /face/verify`
1:1 Face match against enrolled template.

---

## 3. Social Media & Album

### `GET /feed`
Paginated social feed with pre-synthesized spoken narrations.
- **Response**:
  ```json
  {
    "success": true,
    "intro_speech": "John Carter's Social Feed. Scroll down to browse more posts and swipe right to open the album.",
    "data": [
      {
        "id": 1,
        "post_number": 33,
        "caption": "Enjoying a beautiful sunny day at the beach.",
        "ai_caption": "A bright sunny ocean shore...",
        "spoken_narration": "John Carter posted: Enjoying a beautiful sunny day at the beach.",
        "media_url": "...",
        "likes_count": 24,
        "comments_count": 2
      }
    ]
  }
  ```

### `POST /posts`
Create a new post with multipart photo upload, GPS coordinates, tagged users, and automatic AI caption generation.

### `POST /posts/{id}/like`
Toggle like status with spoken feedback (*"You liked this post"*).

### `POST /posts/{id}/comment`
Add comment to post.

### `GET /users/{userId}/album` & `GET /my-album`
Get author's album posts (*"John Carter's Album. There are 50 posts."*).

### `GET /posts/search/query?query={query}`
Voice search by date, post number (*"post number 33"*), author, or caption keyword.

---

## 4. Multimodal AI Assistant

### `POST /ai/ask`
Conversational voice assistant query.
- **Request**: `{ "question": "What can you do?", "language": "en" }`
- **Response**: `{ "answer": "...", "spoken_text": "..." }`

### `GET /ai/news?country=us`
Top 5 breaking news stories cleanly summarized for speech synthesis.

### `GET /ai/weather?latitude=25.7617&longitude=-80.1918`
Live temperature, rain probability, humidity, and condition speech readout.

### `POST /ai/travel`
Travel duration calculation between origin and destination via driving, bus, or walking.

### `POST /ai/visualize`
AI Surroundings Vision Scanner:
- **Request**: `{ "image": "base64/url...", "session_uuid": "..." }`
- **Response**:
  ```json
  {
    "description": "You are in a room with five people standing in front of you.",
    "spoken_text": "Photo captured successfully. You are in a room with five people standing in front of you. Please hold anywhere on the screen to ask a question based on this image."
  }
  ```

### `POST /ai/visualize/ask`
Contextual Q&A on previously captured surroundings photo (e.g. rain check, nearby restaurant Places check, shirts/clothing identification).

### `POST /ai/translate`
Change language preference via voice command (*"Please change to Malay language"*).
