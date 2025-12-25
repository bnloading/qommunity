# 🚀 Skool.com-Inspired Full-Stack Platform

## Complete Implementation Guide

A production-ready Skool.com-inspired educational platform with Stripe payments, real-time chat, communities, dark mode, and comprehensive analytics.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [API Reference](#api-reference)
7. [Database Models](#database-models)
8. [File Upload Configuration](#file-upload-configuration)
9. [Stripe Integration](#stripe-integration)
10. [Socket.io Chat Implementation](#socketio-chat-implementation)
11. [Deployment Guide](#deployment-guide)
12. [Testing Checklist](#testing-checklist)
13. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  Pages: Courses, Communities, Profile, Dashboard, Chat  │
└──────────────────────────┬──────────────────────────────┘
                           │
                    HTTP API + Socket.io
                           │
┌──────────────────────────▼──────────────────────────────┐
│                  Backend (Node.js/Express)              │
│  Routes: courses, community, profile, payments, chat    │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    MongoDB          Stripe API          Multer Storage
    (Database)       (Payments)          (Files/Avatars)
```

---

## ✨ Features

### 1. Authentication & Profile

- ✅ JWT-based authentication (access + refresh tokens)
- ✅ User registration and login
- ✅ Profile page with editable details
- ✅ Avatar/profile picture upload
- ✅ User bio, location, social links
- ✅ Follow/unfollow system
- ✅ Teaching statistics dashboard for instructors

### 2. Courses

- ✅ Browse all published courses
- ✅ Tier-based pricing (Free/Basic/Premium)
- ✅ Course filtering (category, level, price)
- ✅ Course search
- ✅ Course cards with instructor info
- ✅ Only paid users can create courses
- ✅ Lesson management with video uploads
- ✅ Student enrollment tracking
- ✅ Course analytics dashboard

### 3. Communities

- ✅ Create communities (teachers only)
- ✅ Join/leave communities
- ✅ Community categories
- ✅ Community member management
- ✅ Community search and filtering
- ✅ Premium communities with fees
- ✅ Community member roles (admin, moderator, member)
- ✅ Community rules and descriptions

### 4. Real-Time Chat

- ✅ Socket.io integration
- ✅ Community-based chat rooms
- ✅ Message storage in MongoDB
- ✅ User presence tracking
- ✅ Message notifications
- ✅ Edit and delete messages
- ✅ Message replies

### 5. Payments

- ✅ Stripe integration
- ✅ Course tier checkout
- ✅ Webhook verification
- ✅ Payment history tracking
- ✅ Access control by tier
- ✅ Revenue calculation
- ✅ Student count tracking per tier

### 6. Analytics & Dashboard

- ✅ Student dashboard: purchased courses, progress
- ✅ Instructor dashboard: student count, revenue, tier breakdown
- ✅ Admin dashboard: users, courses, payments, communities
- ✅ Revenue tracking per course
- ✅ Student enrollment statistics
- ✅ Course performance metrics

### 7. UI/UX

- ✅ Dark/Light mode toggle
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Card-based layout with smooth animations
- ✅ Sidebar navigation
- ✅ Clean, minimal design inspired by Skool.com
- ✅ Tailwind CSS utility classes
- ✅ Lucide React icons

---

## 🛠️ Tech Stack

### Frontend

```
React 18          - UI framework
Tailwind CSS      - Styling
Axios             - HTTP client
Socket.io Client  - Real-time chat
React Router v6   - Navigation
Redux Toolkit     - State management
Lucide React      - Icons
```

### Backend

```
Node.js           - Runtime
Express.js        - Web framework
MongoDB           - Database
Mongoose          - ODM
JWT               - Authentication
Stripe            - Payments
Socket.io         - Real-time communication
Multer            - File uploads
Nodemailer        - Email sending
```

---

## 🚀 Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables (.env)

Create `.env` file in backend root:

```env
# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRE=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLIC_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Admin
ADMIN_EMAIL=admin@edtech.com
ADMIN_PASSWORD=admin123456
```

### 3. Multer Configuration (middleware/upload.js)

```javascript
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directories if they don't exist
const uploadDirs = [
  "uploads/profiles",
  "uploads/courses",
  "uploads/communities",
  "uploads/lessons",
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.path.includes("avatar")) {
      cb(null, "uploads/profiles/");
    } else if (req.path.includes("community")) {
      cb(null, "uploads/communities/");
    } else if (req.path.includes("course")) {
      cb(null, "uploads/courses/");
    } else if (req.path.includes("lesson")) {
      cb(null, "uploads/lessons/");
    } else {
      cb(null, "uploads/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "application/pdf",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type"), false);
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});
```

### 4. Start Backend Server

```bash
npm run dev
# Server runs on http://localhost:5000
```

---

## 🎨 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Environment Variables (.env.local)

Create `.env.local` file in frontend root:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_STRIPE_KEY=pk_test_your_stripe_public_key
```

### 3. Tailwind Configuration

Ensure `tailwind.config.js` has dark mode enabled:

```javascript
module.exports = {
  darkMode: "class", // Class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: "#1D4ED8",
        secondary: "#9333EA",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
```

### 4. Start Frontend Server

```bash
npm start
# App runs on http://localhost:3000
```

---

## 📡 API Reference

### Authentication Routes

```
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123"
}

POST /api/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}

GET /api/auth/me
Headers: { Authorization: "Bearer {token}" }
```

### Profile Routes

```
GET /api/profile/me
GET /api/profile/:userId

PUT /api/profile/update/info
{
  "firstName": "Jane",
  "lastName": "Doe",
  "bio": "Student",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "country": "USA",
  "dateOfBirth": "1990-01-01"
}

POST /api/profile/upload/avatar
Form-Data: { profilePicture: <file> }

PUT /api/profile/update/settings
{
  "emailNotifications": true,
  "pushNotifications": true,
  "privateMessages": true,
  "darkMode": true
}

GET /api/profile/stats/teaching

POST /api/profile/follow/:userId
POST /api/profile/unfollow/:userId
```

### Courses Routes

```
GET /api/courses?category=programming&level=beginner&search=React&page=1&limit=12&sort=newest

GET /api/courses/:id

POST /api/courses (teachers/admins only)
{
  "title": "React Mastery",
  "description": "Learn React",
  "category": "programming",
  "level": "beginner",
  "tiers": [
    {
      "name": "free",
      "price": 0,
      "description": "Free access",
      "features": ["Intro videos"]
    },
    {
      "name": "premium",
      "price": 99,
      "description": "Full access",
      "features": ["All videos", "Project"]
    }
  ]
}
```

### Community Routes

```
GET /api/community?category=programming&search=React&page=1&limit=12

GET /api/community/:communityId

POST /api/community/create (teachers/admins only)
Form-Data: {
  "name": "React Developers",
  "description": "React community",
  "category": "programming",
  "isPremium": false,
  "premiumPrice": 0,
  "rules": ["Be respectful", "No spam"],
  "thumbnail": <file>
}

POST /api/community/:communityId/join
POST /api/community/:communityId/leave

GET /api/community/user/joined

PUT /api/community/:communityId
DELETE /api/community/:communityId
```

### Payments Routes

```
POST /api/payments/checkout
{
  "courseId": "course_id",
  "tier": "premium"
}

POST /api/payments/verify
{
  "sessionId": "cs_test_..."
}

GET /api/payments/history

GET /api/payments/access/:courseId

POST /api/payments/webhook
# Stripe sends webhook events
```

### Analytics Routes

```
GET /api/analytics/instructor/dashboard

GET /api/analytics/instructor/course/:courseId

GET /api/analytics/student/courses

GET /api/analytics/admin/overview (admin only)
```

### Chat Routes

```
GET /api/chat/messages/:communityId

POST /api/chat/send
{
  "community": "community_id",
  "content": "Hello!",
  "messageType": "text"
}

PUT /api/chat/:messageId
DELETE /api/chat/:messageId
```

---

## 💾 Database Models

### User Model

```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: ["student", "teacher", "admin"],
  profilePicture: String,
  bio: String,
  phone: String,
  dateOfBirth: Date,
  address: String,
  city: String,
  country: String,
  enrolledCourses: [ObjectId], // References to Course
  teachingCourses: [ObjectId], // References to Course
  followers: [ObjectId], // References to User
  following: [ObjectId], // References to User
  joinedGroups: [ObjectId], // References to Community
  settings: {
    emailNotifications: Boolean,
    pushNotifications: Boolean,
    privateMessages: Boolean,
    darkMode: Boolean
  },
  socialLinks: {
    twitter: String,
    linkedin: String,
    github: String,
    website: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Course Model

```javascript
{
  title: String,
  slug: String (unique),
  description: String,
  thumbnail: String,
  instructor: ObjectId (User),
  category: String,
  level: ["beginner", "intermediate", "advanced"],
  tiers: [
    {
      name: ["free", "basic", "premium"],
      price: Number,
      description: String,
      features: [String],
      studentCount: Number
    }
  ],
  accessList: [
    {
      user: ObjectId,
      tier: String,
      purchasedAt: Date,
      transactionId: String
    }
  ],
  lessons: [ObjectId], // References to Lesson
  students: [
    {
      user: ObjectId,
      tier: String,
      enrolledAt: Date,
      progress: Number (0-100)
    }
  ],
  rating: Number (0-5),
  totalRevenue: Number,
  tags: [String],
  isPublished: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Community Model

```javascript
{
  name: String,
  slug: String (unique),
  description: String,
  thumbnail: String,
  creator: ObjectId (User),
  members: [
    {
      user: ObjectId,
      joinedAt: Date,
      role: ["member", "moderator", "admin"]
    }
  ],
  category: String,
  isPremium: Boolean,
  premiumPrice: Number,
  maxMembers: Number (optional),
  tags: [String],
  rules: [String],
  messageCount: Number,
  lastActivityAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model

```javascript
{
  sender: ObjectId (User),
  room: String,
  community: ObjectId (Community),
  recipient: ObjectId (User),
  content: String,
  messageType: ["text", "file", "image"],
  fileUrl: String,
  likes: [ObjectId], // User IDs
  replies: [
    {
      sender: ObjectId,
      content: String,
      createdAt: Date
    }
  ],
  isEdited: Boolean,
  editedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📁 File Upload Configuration

### Profile Picture Upload

```javascript
// Frontend
const handleProfilePictureUpload = async (file) => {
  const formData = new FormData();
  formData.append("profilePicture", file);

  const response = await axios.post(
    `${API_URL}/profile/upload/avatar`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};
```

### Directory Structure

```
backend/
  uploads/
    profiles/         # User avatars
    courses/          # Course thumbnails
    communities/      # Community thumbnails
    lessons/          # Video files & attachments
```

### File Size Limits

- Profile Pictures: 10MB
- Course Thumbnails: 5MB
- Community Thumbnails: 5MB
- Lesson Videos: 500MB
- Attachments: 100MB

---

## 💳 Stripe Integration

### Setup Steps

1. **Get Stripe Keys**

   - Go to https://stripe.com
   - Create account
   - Navigate to Developers → API Keys
   - Copy Secret Key and Publishable Key

2. **Add to .env**

   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLIC_KEY=pk_test_...
   ```

3. **Create Webhook Endpoint**
   - In Stripe Dashboard: Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/payments/webhook`
   - Select events: `checkout.session.completed`, `charge.refunded`
   - Copy signing secret to `.env`

### Checkout Flow

```javascript
// Frontend
const handleCheckout = async (courseId, tier) => {
  const response = await axios.post(
    `${API_URL}/payments/checkout`,
    { courseId, tier },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Redirect to Stripe
  const stripe = window.Stripe(STRIPE_PUBLIC_KEY);
  stripe.redirectToCheckout({ sessionId: response.data.sessionId });
};
```

### Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Auth Required: 4000 0025 0000 3155
```

---

## 🔌 Socket.io Chat Implementation

### Server Setup (server.js)

```javascript
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a community room
  socket.on("join_room", (data) => {
    socket.join(`community_${data.communityId}`);
  });

  // Send message
  socket.on("send_message", (data) => {
    io.to(`community_${data.communityId}`).emit("receive_message", data);
  });

  // User typing
  socket.on("user_typing", (data) => {
    socket.to(`community_${data.communityId}`).emit("user_typing", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
```

### Frontend Implementation

```javascript
import { useEffect, useState } from "react";
import io from "socket.io-client";

const ChatComponent = ({ communityId }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);

    newSocket.emit("join_room", { communityId });

    newSocket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [communityId]);

  const sendMessage = (content) => {
    socket.emit("send_message", { communityId, content });
  };

  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={idx}>{msg.content}</div>
      ))}
      <input
        onKeyPress={(e) => {
          if (e.key === "Enter") sendMessage(e.target.value);
        }}
      />
    </div>
  );
};
```

---

## 🌐 Deployment Guide

### Frontend Deployment (Vercel)

1. **Push to GitHub**

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/username/skool-frontend.git
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to https://vercel.com
   - Sign in with GitHub
   - Click "New Project"
   - Select repository
   - Add environment variables:
     ```
     REACT_APP_API_URL=https://your-backend.com/api
     REACT_APP_SOCKET_URL=https://your-backend.com
     REACT_APP_STRIPE_KEY=pk_live_your_key
     ```
   - Click "Deploy"

### Backend Deployment (Render)

1. **Push to GitHub** (same as frontend)

2. **Deploy on Render**

   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect GitHub
   - Fill in details:
     - Name: skool-api
     - Region: Closest to you
     - Branch: main
     - Build Command: `npm install`
     - Start Command: `node src/server.js`
   - Add Environment Variables (from .env file)
   - Click "Create Web Service"

3. **Update Frontend .env**

   ```env
   REACT_APP_API_URL=https://skool-api.onrender.com/api
   REACT_APP_SOCKET_URL=https://skool-api.onrender.com
   ```

4. **Update Stripe Webhook**
   - In Stripe Dashboard
   - Update webhook endpoint to: `https://skool-api.onrender.com/api/payments/webhook`

---

## ✅ Testing Checklist

### Authentication

- [ ] Register new account
- [ ] Login successfully
- [ ] Logout successfully
- [ ] Reset password via email
- [ ] Verify email address

### Profile

- [ ] Upload profile picture
- [ ] Edit profile information
- [ ] Toggle dark/light mode
- [ ] Follow/unfollow user
- [ ] View teaching statistics

### Courses

- [ ] View all courses list
- [ ] Filter by category
- [ ] Filter by level
- [ ] Search for courses
- [ ] View course details
- [ ] See instructor info

### Payments

- [ ] Start checkout process
- [ ] Complete payment with test card (4242...)
- [ ] Verify payment in dashboard
- [ ] Check course access granted
- [ ] View payment history
- [ ] Verify receipt email

### Communities

- [ ] Create new community (teachers)
- [ ] Join community
- [ ] Leave community
- [ ] Send message in community chat
- [ ] Receive real-time messages
- [ ] View community members

### Analytics

- [ ] View student dashboard
- [ ] View instructor dashboard
- [ ] Check revenue calculations
- [ ] Check student count
- [ ] View course-specific analytics

### Dark Mode

- [ ] Toggle dark mode
- [ ] Verify all pages show dark colors
- [ ] Refresh page - dark mode persists
- [ ] Mobile responsive

---

## 🐛 Troubleshooting

### "Cannot find module 'routes/profile'"

- Ensure `/backend/src/routes/profile.js` exists
- Check spelling matches the import statement

### "Stripe Key not found"

- Add `REACT_APP_STRIPE_KEY` to `.env.local`
- Verify it's the public key (starts with `pk_`)

### "Cannot upload avatar"

- Check `/backend/uploads/profiles` folder exists
- Verify file size < 10MB
- Check file is image (jpg, png, webp)

### "Socket.io not connecting"

- Ensure backend Socket.io is configured
- Check `REACT_APP_SOCKET_URL` in frontend .env
- Verify CORS is enabled on server

### "Dark mode not persisting"

- Check localStorage is enabled
- Verify ThemeContext is wrapping app
- Check browser console for errors

### "Courses page shows empty"

- Ensure courses exist in MongoDB
- Check `isPublished: true` for courses
- Verify course has `tiers` array

---

## 📱 Mobile Responsiveness

All components are built with Tailwind CSS responsive classes:

```javascript
// Example responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {courses.map((course) => (
    <CourseCard key={course._id} course={course} />
  ))}
</div>
```

- Mobile: 1 column
- Tablet (md): 2 columns
- Desktop (lg): 3 columns

---

## 📚 Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Socket.io Guide](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/)

---

## 🎉 Success!

You now have a fully functional Skool.com-inspired platform with:

✅ User authentication  
✅ Course marketplace with tiers  
✅ Community management  
✅ Real-time chat  
✅ Stripe payments  
✅ Comprehensive analytics  
✅ Dark mode  
✅ Responsive design

**Happy building! 🚀**

---

_Last updated: November 14, 2024_
_Version: 1.0.0_
