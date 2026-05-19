# TwoSpace

> A private, distraction-free digital space for exactly two people.

## What is TwoSpace

TwoSpace is a mobile app built for two people who want a shared digital space — away from the noise of social media. There are no algorithms deciding what you see, no followers to impress, and no public feed. Just you, one other person, and a shared timeline that grows together over time. Every post, photo, mood check-in, and memory lives only between the two of you.

## Features

- 🔒 Private two-person space
- 💬 Shared timeline (oldest first)
- 🌤 Mood check-ins (Good / Okay / Low)
- ⏰ Timed Wishes (sealed until unlock date)
- 📦 Memory Capsules (collaborative sealed collections)
- 📷 Photo sharing via Cloudinary
- 🔔 Push notifications
- ⚡ Real-time updates via Socket.io
- 🎨 Animated splash screen
- 📱 Standalone Android APK

## Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | - | Runtime |
| Express | 4.19.2 | API framework |
| MongoDB | Atlas | Database |
| Mongoose | 8.4.1 | ODM |
| JWT | 9.0.2 | Authentication |
| bcryptjs | 2.4.3 | Password hashing |
| Socket.io | 4.7.5 | Real-time updates |
| node-cron | 3.0.3 | Wish unlock scheduler |
| Cloudinary | 2.3.1 | Photo storage |
| Expo Server SDK | 3.10.0 | Push notifications |
| Helmet | 7.1.0 | Security headers |
| express-rate-limit | 7.3.1 | Rate limiting |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.74.2 | Mobile framework |
| Expo | ~51.0.14 | Build tooling |
| React Navigation | 6 | Screen navigation |
| AsyncStorage | 1.23.1 | Token storage |
| Socket.io Client | 4.7.5 | Real-time |
| dayjs | 1.11.11 | Date formatting |
| expo-notifications | ~0.28.9 | Push notifications |
| expo-image-picker | ~15.0.7 | Photo selection |
| expo-clipboard | - | Copy invite link |

### Infrastructure

| Service | Purpose | Cost |
|---|---|---|
| Render.com | Backend hosting | Free tier |
| MongoDB Atlas | Database | Free M0 tier |
| Cloudinary | Media storage | Free tier |
| Expo EAS | APK builds + OTA | Free tier |

## Project Structure

```
TwoSpace/
├── backend/
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Room.js
│   │   ├── Post.js
│   │   └── Capsule.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── rooms.js
│   │   ├── posts.js
│   │   └── notifications.js
│   ├── middleware/
│   │   └── auth.js
│   └── utils/
│       ├── notify.js
│       ├── scheduler.js
│       └── upload.js
└── frontend/
    ├── App.js
    ├── app.json
    ├── eas.json
    ├── context/
    │   └── AuthContext.js
    ├── services/
    │   └── api.js
    ├── screens/
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   ├── SetupScreen.js
    │   ├── TimelineScreen.js
    │   ├── NewPostScreen.js
    │   ├── WishScreen.js
    │   ├── SettingsScreen.js
    │   ├── CapsuleScreen.js
    │   ├── CapsuleDetailScreen.js
    │   └── SplashScreen.js
    ├── components/
    │   ├── PostCard.js
    │   ├── LockedWishCard.js
    │   └── MoodPicker.js
    └── assets/
        ├── icon.png
        └── splash.png
```

## API Endpoints

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Rooms

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/rooms/create-invite | Generate invite link |
| POST | /api/rooms/join/:token | Join via invite |
| GET | /api/rooms/my-room | Get room + partner |
| POST | /api/rooms/archive | Archive space |
| DELETE | /api/rooms/close | Delete space |

### Posts

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/posts | Get timeline |
| POST | /api/posts | Create post |
| POST | /api/posts/timed-wish | Create timed wish |
| POST | /api/posts/upload-image | Upload photo |
| POST | /api/posts/:id/reply | Add reply |
| GET | /api/posts/:id/replies | Get replies |
| DELETE | /api/posts/:id | Delete post |

### Capsules

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/posts/capsule/create | Create capsule |
| GET | /api/posts/capsule/my-capsules | List capsules |
| POST | /api/posts/capsule/:id/add | Add memory |
| GET | /api/posts/capsule/:id | Get capsule |
| POST | /api/posts/capsule/:id/confirm | Confirm seal |

## Environment Variables

### Backend (`.env`)

```
MONGODB_URI=
JWT_SECRET=
PORT=5000
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLIENT_URL=
```

### Frontend (`.env`)

```
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_DEEP_LINK_SCHEME=twospace
```

## Local Development Setup

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (free)
- Cloudinary account (free)
- Expo Go app on your phone

### Backend

```bash
cd backend
npm install
# Fill in .env with your values
npm run dev
```

### Frontend

```bash
cd frontend
npm install
# Fill in .env with your API URL
npx expo start
```

## Deployment

### Backend — Render.com

1. Push to GitHub
2. Connect repo to Render.com
3. Set environment variables
4. Deploy as Web Service

### Frontend — EAS Build

```bash
# Build APK
eas build --platform android --profile preview

# Push OTA update (JS changes only)
eas update --branch preview --message "description"
```

## Security

- JWT authentication on all protected routes
- Bcrypt password hashing (salt rounds: 12)
- Room isolation — posts filtered by roomId
- Sealed post content never sent via API
- One-time invite tokens with 48hr expiry
- Helmet.js security headers
- Rate limiting on auth routes

## Live App

- **API:** https://twospace-4q7l.onrender.com
- **Database:** MongoDB Atlas
- **Build:** EAS Build (Expo)

---

*TwoSpace — Your private space.*
