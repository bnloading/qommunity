# 🎓 Skool Platform - Full-Stack Education Community ⭐

A comprehensive full-stack platform inspired by Skool.com with support for courses, communities, real-time chat, and Stripe payments with tier-based access control.

> **Latest Updates**: ✅ Stripe Payments, ✅ Dark/Light Mode, ✅ Instructor Analytics, ✅ Course Tiers

---

## ✨ Key Features

### 🔐 Authentication & User Management

- JWT-based authentication (access + refresh tokens)
- User roles: Student, Teacher, Admin
- Profile settings with **dark/light mode toggle** ⭐ NEW
- Email verification & password reset
- Social links and profile customization

### 📚 Courses & Learning

- Create and manage courses
- **Tier-based pricing** (Free, Basic, Premium) ⭐ NEW
- Video lessons with attachments
- Student progress tracking
- Course ratings and reviews
- Analytics dashboard for instructors ⭐ NEW

### 💳 Payments & Stripe Integration ⭐ NEW

- Stripe checkout for course purchases
- Tier-based access control
- Webhook support for payment verification
- Revenue tracking per course
- Student enrollment management

### 👥 Community & Real-time Chat

- Join communities
- Socket.io real-time messaging
- Message history stored in MongoDB
- Notifications for new messages
- Community member management

### 📊 Analytics & Dashboard ⭐ NEW

- **Student dashboard**: Purchased courses, progress
- **Instructor dashboard**: Student count, revenue, earnings
- **Admin overview**: Platform statistics, top instructors
- Detailed course analytics
- Enrollment tracking

### 🎨 UI/UX

- **Dark/Light mode toggle** ⭐ NEW
- Responsive design (mobile, tablet, desktop)
- Tailwind CSS styling
- Card-based layouts with soft shadows
- Material-UI icons
- Smooth transitions and animations

---

## 🛠️ Tech Stack

### Backend

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **JWT** Authentication
- **Stripe** API ⭐ NEW
- **Socket.io** Real-time
- **Multer** File uploads
- **Nodemailer** Email
- **Helmet** + **Rate Limiting** Security

### Frontend

- **React.js** 18
- **Tailwind CSS**
- **Redux Toolkit**
- **Axios**
- **Material-UI Icons**
- **Socket.io Client**
- **React Router** v6

---

## 🚀 Quick Start

### Prerequisites

- Node.js v14+ and npm
- MongoDB (Atlas or local)
- Stripe account
- Gmail account

### 1️⃣ Backend Setup (5 minutes)

```bash
cd backend
npm install

# Create .env file
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/skool
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

npm run dev  # Runs on http://localhost:5000
```

### 2️⃣ Frontend Setup (5 minutes)

```bash
cd frontend
npm install

# Create .env.local
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_STRIPE_KEY=pk_test_...

npm start  # Runs on http://localhost:3000
```

**That's it! Your platform is live! 🎉**

---

## 📁 What's New (Latest Updates)

### Backend

✅ **src/models/User.js** - Added `settings.darkMode` field  
✅ **src/models/Course.js** - Added tier system (`free`, `basic`, `premium`)  
✅ **src/models/Payment.js** - Stripe integration fields  
✅ **src/routes/payments.js** - Complete Stripe checkout & webhook handling  
✅ **src/routes/analytics.js** - Instructor & admin dashboards  
✅ **src/server.js** - Registered new routes

### Frontend

✅ **src/context/ThemeContext.js** - Dark/Light mode management  
✅ **src/App.js** - ThemeProvider wrapper  
✅ **src/components/Sidebar.js** - Dark mode toggle button  
✅ **src/components/CourseCheckout.js** - Stripe modal component  
✅ **src/pages/InstructorDashboard.js** - Analytics & revenue tracking  
✅ **.env.local** - API configuration

---

## 💳 Stripe Payment Flow

```
1. User selects course tier
   ↓
2. Click "Checkout" → Opens CourseCheckout modal
   ↓
3. Modal calls POST /api/payments/checkout
   ↓
4. Backend creates Stripe session
   ↓
5. User redirected to Stripe checkout page
   ↓
6. Payment successful → Webhook triggered
   ↓
7. Backend grants course access
   ↓
8. User can access course content
```

**Test Card**: `4242 4242 4242 4242` (any future expiry, any CVC)

---

## 🌓 Dark Mode Implementation

```javascript
// Sidebar.js
import { useTheme } from "../context/ThemeContext";

const { darkMode, toggleDarkMode } = useTheme();

// Tailwind classes
<div className="bg-white dark:bg-gray-900">
  <p className="text-gray-900 dark:text-white">Content</p>
</div>

// Toggle button
<button onClick={toggleDarkMode}>
  {darkMode ? "Light Mode" : "Dark Mode"}
</button>
```

**Features:**

- Persists to localStorage
- Syncs with backend user settings
- Smooth transitions
- All pages supported

---

## 📱 API Endpoints

### 🔐 Authentication

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PATCH  /api/auth/reset-password
```

### 💳 Payments ⭐ NEW

```
POST   /api/payments/checkout         - Create Stripe session
POST   /api/payments/verify           - Verify & grant access
POST   /api/payments/webhook          - Stripe webhook
GET    /api/payments/history          - Payment history
GET    /api/payments/access/:courseId - Check access
```

### 📊 Analytics ⭐ NEW

```
GET    /api/analytics/instructor/dashboard        - Instructor stats
GET    /api/analytics/instructor/course/:courseId - Course details
GET    /api/analytics/student/courses             - Student courses
GET    /api/analytics/admin/overview              - Admin stats
```

### 📚 Courses

```
GET    /api/courses
POST   /api/courses
GET    /api/courses/:id
PATCH  /api/courses/:id
```

### 👥 Users

```
GET    /api/users/:id
PATCH  /api/users/:id
PATCH  /api/users/settings  - Update darkMode, etc
```

### 💬 Chat & Posts

```
GET    /api/chat/messages/:room
POST   /api/chat/messages
GET    /api/posts
POST   /api/posts
GET    /api/groups
POST   /api/groups
```

---

## 🧪 Testing Guide

### 1. Register & Login

```bash
# Postman: POST http://localhost:5000/api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher"
}

# Login
{
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Create Course with Tiers

```bash
# POST http://localhost:5000/api/courses
{
  "title": "React Mastery",
  "description": "Learn React in 30 days",
  "thumbnail": "https://...",
  "category": "programming",
  "level": "intermediate",
  "tiers": [
    {
      "name": "free",
      "price": 0,
      "features": ["Intro lessons"]
    },
    {
      "name": "basic",
      "price": 29,
      "features": ["All lessons", "Q&A"]
    },
    {
      "name": "premium",
      "price": 99,
      "features": ["All lessons", "Q&A", "Certificate", "1-on-1"]
    }
  ]
}
```

### 3. Test Stripe Checkout

```bash
# In frontend: Click course → Select tier → "Checkout"
# Use test card: 4242 4242 4242 4242
# Expiry: Any future date
# CVC: Any 3 digits
# Click "Pay" → Success!
```

### 4. Check Analytics

```bash
# GET http://localhost:5000/api/analytics/instructor/dashboard
# Returns: totalCourses, totalStudents, totalRevenue, courses[]

# GET http://localhost:5000/api/analytics/instructor/course/:courseId
# Returns: students[], statistics, tierBreakdown, recentPayments
```

---

## 🌍 Deployment

### Frontend (Vercel - Recommended)

```bash
git push origin main
# Auto-deploys from GitHub
# Add env vars in Vercel dashboard
```

### Backend (Render or Railway)

**Render:**

1. Go to render.com
2. Create Web Service
3. Connect GitHub
4. Set Environment Variables:
   ```
   MONGODB_URI=...
   JWT_SECRET=...
   STRIPE_SECRET_KEY=...
   STRIPE_WEBHOOK_SECRET=...
   CLIENT_URL=https://your-frontend-url
   ```
5. Deploy

**Railway:**

1. Go to railway.app
2. Connect GitHub
3. Set same env vars
4. Deploy

---

## 🔒 Security Checklist

- ✅ JWT tokens with short expiry
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configuration
- ✅ Input validation
- ✅ Helmet security headers
- ✅ Stripe webhook verification
- ✅ MongoDB indexes
- ✅ HTTPS enforced in production

---

## 📊 Database Schema Overview

### User

```javascript
{
  firstName, lastName, email, password,
  role: "student|teacher|admin",
  profilePicture, bio, socialLinks,
  enrolledCourses: [courseId],
  teachingCourses: [courseId],
  followers, following, joinedGroups,
  settings: { darkMode, emailNotifications },
  createdAt, updatedAt
}
```

### Course

```javascript
{
  title, slug, description, thumbnail,
  instructor: userId,
  category, level,
  tiers: [
    { name: "free|basic|premium", price, features[], studentCount }
  ],
  accessList: [{ user, tier, purchasedAt }],
  lessons: [lessonId],
  students: [{ user, tier, progress }],
  totalRevenue,
  rating, tags,
  createdAt, updatedAt
}
```

### Payment

```javascript
{
  student: userId,
  course: courseId,
  tier: "free|basic|premium",
  amount, currency,
  paymentMethod: "stripe",
  transactionId, stripeSessionId,
  status: "pending|completed|failed|refunded",
  userEmail,
  createdAt, completedAt
}
```

### Message

```javascript
{
  sender: userId,
  room: "course-123",
  content, messageType: "text|file|image",
  fileUrl,
  likes: [userId],
  replies: [{ sender, content, createdAt }],
  createdAt, updatedAt
}
```

---

## 🚨 Common Issues & Solutions

| Issue                    | Solution                                     |
| ------------------------ | -------------------------------------------- |
| MongoDB won't connect    | Check connection string, verify IP whitelist |
| Stripe webhook failing   | Verify webhook signing secret matches        |
| Dark mode not persisting | Clear localStorage & browser cache           |
| Frontend can't reach API | Check `.env.local` has correct API URL       |
| Port 5000 already in use | `lsof -i :5000` → `kill -9 PID`              |
| Module not found errors  | Delete `node_modules`, run `npm install`     |
| Email not sending        | Use Gmail app password, verify SMTP config   |

---

## 📚 Resources

- [Stripe API Docs](https://stripe.com/docs/api)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [JWT.io](https://jwt.io)
- [Socket.io Docs](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [Redux Toolkit](https://redux-toolkit.js.org)

---

## 🙏 Credits

- Inspired by [Skool.com](https://skool.com)
- Built with ❤️ using modern web technologies
- Community-driven development

---

## 📝 License

MIT License - Feel free to use for learning and development!

---

**Made with ❤️ for educators and students**

**⭐ Star this repo if you find it helpful!**
