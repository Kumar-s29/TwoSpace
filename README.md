# TwoSpace 💖

> A private, distraction-free digital space for exactly two people.

TwoSpace is a mobile application designed for couples, close friends, or partners who want a dedicated digital home. Away from the algorithms, advertisements, and public pressure of traditional social networks, TwoSpace offers a secure and real-time private environment to share timeline moments, sealed future wishes, collaborative memory capsules, and daily checks.

---

## 🚀 TwoSpace Feature Map

Here is the complete feature map detailing what has been built:

| Phase | Feature Categories | Description |
| :--- | :--- | :--- |
| **Phases 1–6** | **Core Essentials** | Auth, user/room schemas, shared real-time timeline, sealed timed wishes, memory capsules, photo uploads, audio recordings, and standalone APK builds. |
| **Phase 7A** | **Interactive Layouts & Media** | Re-designed tab bar navigation, dedicated wishes countdown/details view, and rich multimedia integration (photos/audio) inside memory capsules. |
| **Phase 7B** | **Timeline Actions** | Inline emoji reactions for timeline posts, post editing with edited indicators, and timestamps. |
| **Phase 7C** | **Song Sharing & Pinned Memories** | Embed Spotify or Apple Music links directly into the timeline with custom cards, and pin important memories to the top of the feed. |
| **Phase 7D** | **Shared Journal & Throwbacks** | "On This Day" throwbacks showing shared memories from 1 year/6 months/1 month ago, and a collaborative daily journal page. |
| **Phase 7E** | **Daily Check-In Prompts** | Deterministic check-in question selected daily at midnight from a bank of 60+ prompts, custom check-in overrides, and locked answer reveals until both partners reply. |
| **Phase 7F** | **Shared Bucket List & Milestones** | Interactive shared bucket list with timeline celebrations upon completion, milestone/anniversary tracking with emoji badges, countdown trackers, and recurring annual reminders. |

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | - | JavaScript Runtime |
| **Express** | 4.19.2 | Core REST API Router |
| **MongoDB Atlas** | Atlas | Cloud-hosted database storage |
| **Mongoose** | 8.4.1 | Schema structure and modeling |
| **Socket.io** | 4.7.5 | WebSockets for real-time instant sync |
| **Expo Server SDK** | 3.10.0 | Sending push notifications |
| **node-cron** | 3.0.3 | Schedulers for timed wishes, throwbacks, check-ins, and milestones |
| **Cloudinary** | 2.3.1 | Storage for images and voice notes |
| **Helmet** | 7.1.0 | Securing HTTP headers |
| **express-rate-limit**| 7.3.1 | Security rate limiting on authentication routes |
| **JWT & bcryptjs** | - | Secure session auth and password hashing (12 salt rounds) |

### Frontend
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React Native** | 0.74.2 | Cross-platform mobile development |
| **Expo** | 51.0.14 | Build tooling and native API wrapper |
| **React Navigation** | ^6.5.20 | Stack and bottom tab navigation |
| **AsyncStorage** | 1.23.1 | Local authentication token storage |
| **Socket.io Client** | ^4.7.5 | Receiving real-time event updates |
| **expo-notifications**| ~0.28.19 | Push notifications permissions and reception |
| **expo-image-picker** | ~15.1.0 | Image capturing and picker actions |
| **expo-av** | ~14.0.7 | Audio recordings and voice notes playback |
| **dayjs** | ^1.11.11 | Clean relative and absolute date formatting |

---

## 📂 Project Structure

```
TwoSpace/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── data/
│   │   └── questions.js        # Daily check-in question bank
│   ├── middleware/
│   │   └── auth.js             # JWT verification middleware
│   ├── models/
│   │   ├── User.js             # User profiles & push tokens
│   │   ├── Room.js             # Two-person room & invite code
│   │   ├── Post.js             # Timeline, songs, replies & reactions
│   │   ├── Capsule.js          # Shared memory capsules
│   │   ├── Journal.js          # Daily shared journal entries
│   │   ├── CheckIn.js          # Daily questions and replies
│   │   ├── BucketItem.js       # Bucket list items
│   │   └── Milestone.js        # Milestones & anniversary items
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rooms.js
│   │   ├── posts.js
│   │   ├── notifications.js    # Registering push tokens
│   │   ├── journal.js
│   │   ├── checkin.js
│   │   ├── bucketlist.js
│   │   └── milestones.js
│   └── utils/
│       ├── notify.js           # Push notifications delivery wrapper
│       ├── scheduler.js        # Scheduled checkins, milestones, and locks
│       └── upload.js           # Cloudinary file uploading helper
└── frontend/
    ├── App.js                  # App navigator and push notification handler
    ├── app.json                # Expo setup and EAS configuration
    ├── eas.json                # Expo build setup
    ├── context/
    │   └── AuthContext.js      # Global state for Auth & Socket.io
    ├── services/
    │   └── api.js              # Base API wrappers & axios-like fetch calls
    ├── screens/
    │   ├── SplashScreen.js     # Custom splash page
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   ├── SetupScreen.js      # Invite code generator/join view
    │   ├── TimelineScreen.js   # Shared timeline & song/post view
    │   ├── NewPostScreen.js    # Post creator, voice recorder & mood tags
    │   ├── WishScreen.js       # Sealed wish creation modal
    │   ├── WishesScreen.js     # Timed wishes lists (sealed vs unlocked)
    │   ├── CapsuleScreen.js    # Capsule list & creation modal
    │   ├── CapsuleDetailScreen.js # Sealed capsule view & item contributions
    │   ├── JournalScreen.js    # Collaborative daily journal
    │   ├── MoreScreen.js       # Main hub stack options
    │   ├── BucketListScreen.js # Shared bucket lists
    │   ├── MilestonesScreen.js # Anniversary tracking with countdowns
    │   └── SettingsScreen.js   # Room configuration and settings
    ├── components/
    │   ├── PostCard.js
    │   ├── LockedWishCard.js
    │   └── MoodPicker.js
    └── assets/
        ├── icon.png
        └── splash.png
```

---

## 📡 API Endpoints

### Authentication
* `POST /api/auth/register` - Registers a new user account.
* `POST /api/auth/login` - Authenticates a user and returns a JWT token.
* `GET /api/auth/me` - Fetches the authenticated user's profile.

### Rooms
* `POST /api/rooms/create-invite` - Generates a secure invite code valid for 48 hours.
* `POST /api/rooms/join/:token` - Joins a room using an invite code token.
* `GET /api/rooms/my-room` - Retrieves room information and partner profiles.
* `POST /api/rooms/archive` - Archives the current room.
* `DELETE /api/rooms/close` - Permanently closes and deletes the room and all its posts.

### Timeline Posts & Media
* `GET /api/posts?page=&limit=` - Fetches paginated timeline posts.
* `POST /api/posts` - Publishes a standard post, voice note, or music card.
* `PUT /api/posts/:id` - Edits an existing post's text.
* `DELETE /api/posts/:id` - Deletes a post (creator-only).
* `POST /api/posts/upload-image` - Uploads a photo to Cloudinary.
* `POST /api/posts/upload-audio` - Uploads audio to Cloudinary.
* `POST /api/posts/timed-wish` - Creates a sealed timed wish.
* `POST /api/posts/:id/react` - Add or update emoji reactions.
* `POST /api/posts/:id/pin` - Toggle the pinned status of a post.
* `POST /api/posts/:id/reply` - Add a reply/comment to a post.
* `GET /api/posts/:id/replies` - Fetches all comments/replies for a post.

### Memory Capsules
* `POST /api/posts/capsule/create` - Creates a new capsule container.
* `GET /api/posts/capsule/my-capsules` - Fetches all sealed and open capsules in the room.
* `GET /api/posts/capsule/:id` - Fetches a specific capsule's contents.
* `POST /api/posts/capsule/:id/add` - Contributes a post/media item to an unsealed capsule.
* `POST /api/posts/capsule/:id/confirm` - Confirms and seals the capsule.

### Shared Journal
* `GET /api/journal/today` - Fetches today's journal entry page.
* `GET /api/journal?page=` - Fetches historical journal pages.
* `POST /api/journal/add` - Appends a text entry to today's journal page.
* `GET /api/journal/on-this-day` - Retrieves past memory throwback highlights.

### Daily Check-in Questions
* `GET /api/checkin/today` - Fetches today's question and completed answers.
* `POST /api/checkin/answer` - Submits a reply for today's check-in question.
* `POST /api/checkin/custom` - Overrides today's standard question with a custom prompt.
* `GET /api/checkin/history?page=` - Fetches history of answered check-ins.

### Shared Bucket List
* `GET /api/bucketlist` - Fetches all items on the shared bucket list.
* `POST /api/bucketlist` - Adds a new item to the bucket list.
* `PATCH /api/bucketlist/:id/toggle` - Toggles item completion status.
* `POST /api/bucketlist/:id/celebrate` - Publishes a celebration card to the timeline.
* `DELETE /api/bucketlist/:id` - Deletes a bucket list item (creator-only).

### Milestones & Anniversaries
* `GET /api/milestones` - Fetches all milestone events.
* `POST /api/milestones` - Creates a new milestone event.
* `DELETE /api/milestones/:id` - Deletes a milestone event.

### Push Notifications
* `POST /api/notifications/token` - Registers or updates the user's Expo push token.

---

## 🔒 Security Measures

* **JWT Verification**: Strict validation on all protected routes.
* **Bcrypt Hashing**: User passwords hashed with 12 salt rounds.
* **Room Isolation**: Complete MongoDB isolation where queries are strictly filtered by `roomId`.
* **Sealed Integrity**: Content of sealed wishes and memory capsules is never sent via APIs until the unlock time passes.
* **Rate Limiting**: Rate limit of 10 requests per 15 minutes on authentication endpoints to prevent brute force.
* **Helmet.js Integration**: Protects Express headers against common vulnerabilities.

---

## 💻 Local Development Setup

### Prerequisites
* Node.js (v18+)
* MongoDB database (local or Atlas free instance)
* Cloudinary account (free tier)
* Expo Go application installed on your Android/iOS physical device

### 1. Setup Backend
```bash
cd backend
npm install
```
Create a `.env` file in `backend/` and complete these parameters:
```env
MONGODB_URI=your_mongodb_connection_uri
JWT_SECRET=your_jwt_signing_secret
PORT=5000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLIENT_URL=*
```
Run the backend:
```bash
npm run dev
```

### 2. Setup Frontend
```bash
cd ../frontend
npm install
```
Create a `.env` file in `frontend/` and configure:
```env
EXPO_PUBLIC_API_URL=http://your_local_ip_address:5000/api
EXPO_PUBLIC_DEEP_LINK_SCHEME=twospace
```
Run Expo:
```bash
npx expo start
```
Scan the QR code with your Expo Go application to launch the app!

---

*TwoSpace — Your private space.*
