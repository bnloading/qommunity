# 🚀 Skool-like Course Marketplace Implementation Plan

## Overview

Transform the platform into a Skool-style course marketplace with:

- **Clerk Authentication** (no roles)
- **3 Subscription Tiers**: Free, Basic, Premium
- **Course Discovery** home page (like Skool's community page)
- **Video uploads** for course content
- **Stripe payments** for courses and subscriptions
- **No community features** - focus on courses only

---

## 📋 Implementation Steps

### Phase 1: Clerk Authentication Setup

#### Backend Changes:

1. **Remove JWT middleware**, replace with Clerk webhook verification
2. **Update auth routes** to use Clerk user IDs
3. **Add Clerk webhook** endpoint for user sync

#### Frontend Changes:

1. Install: `npm install @clerk/clerk-react`
2. Replace Redux auth with Clerk
3. Update all components to use Clerk hooks

#### Environment Variables:

```env
# Backend
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Frontend
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

### Phase 2: Database Schema Changes

#### User Model Updates:

```javascript
{
  clerkId: String (unique, required), // Clerk user ID
  email: String,
  firstName: String,
  lastName: String,
  profilePicture: String,

  // REMOVE: role field

  // ADD: Subscription system
  subscriptionTier: {
    type: String,
    enum: ['free', 'basic', 'premium'],
    default: 'free'
  },
  subscriptionId: String, // Stripe subscription ID
  subscriptionStatus: String, // active, canceled, past_due

  // Track purchased courses
  purchasedCourses: [{
    course: { type: ObjectId, ref: 'Course' },
    purchaseDate: Date,
    amount: Number,
    stripePaymentId: String
  }],

  createdCourses: [{ type: ObjectId, ref: 'Course' }]
}
```

#### Course Model Updates:

```javascript
{
  title: String,
  description: String,
  thumbnail: String, // Image upload
  category: String,
  price: Number,

  instructor: {
    clerkId: String,
    name: String,
    profilePicture: String
  },

  lessons: [{
    title: String,
    description: String,
    videoUrl: String, // Video upload
    duration: Number,
    order: Number
  }],

  enrolledUsers: [String], // Clerk IDs of users who purchased
  rating: Number,
  reviews: [{
    user: String, // Clerk ID
    rating: Number,
    comment: String
  }]
}
```

---

### Phase 3: Subscription Tiers Logic

#### Access Control:

**Free Tier:**

- Browse all courses
- View course details (title, description, thumbnail)
- Cannot view lessons or videos
- See "Upgrade to unlock" messages

**Basic Tier** ($9.99/month):

- Browse all courses
- Purchase individual courses
- View purchased course lessons
- Cannot create courses

**Premium Tier** ($29.99/month):

- All Basic features
- Create unlimited courses
- Upload videos and images
- Access all courses (no per-course payment needed)
- Analytics dashboard

---

### Phase 4: API Endpoints

#### Auth Endpoints (Clerk):

```
POST /api/webhooks/clerk - Sync user from Clerk
GET  /api/users/me - Get current user (from Clerk session)
```

#### Subscription Endpoints:

```
POST /api/subscriptions/checkout - Create Stripe subscription checkout
POST /api/subscriptions/portal - Access billing portal
POST /api/webhooks/stripe - Handle subscription updates
GET  /api/subscriptions/status - Get user subscription
```

#### Course Endpoints:

```
GET  /api/courses - List all courses (filtered by category)
GET  /api/courses/:id - Get course details
POST /api/courses - Create course (Premium only)
PUT  /api/courses/:id - Update course (Creator only)

POST /api/courses/:id/purchase - Buy individual course
GET  /api/courses/:id/access - Check if user has access
GET  /api/courses/my-purchases - Get user's purchased courses
```

#### Video Upload:

```
POST /api/courses/:id/lessons/:lessonId/video - Upload lesson video
POST /api/courses/:id/thumbnail - Upload course thumbnail
```

---

### Phase 5: Frontend Structure

#### Pages:

```
/                    - Course Discovery (Home)
/course/:id          - Course Detail Page
/course/:id/learn    - Course Player (for enrolled users)
/create-course       - Course Builder (Premium only)
/my-courses          - Purchased Courses
/profile             - User Profile + Subscription Status
/pricing             - Subscription Plans
/sign-in             - Clerk Sign In
/sign-up             - Clerk Sign Up
```

#### Key Components:

```
<ClerkProvider>      - Wrap app
<CourseCard>         - Discovery card with ranking
<CoursePlayer>       - Video player for lessons
<CourseBuilder>      - Create/edit courses
<SubscriptionBadge>  - Show Free/Basic/Premium
<PricingPlans>       - Upgrade modal
<VideoUploader>      - Video upload component
```

---

### Phase 6: Stripe Integration

#### Subscription Products:

```javascript
// Create in Stripe Dashboard
Basic: {
  priceId: 'price_basic_...',
  amount: 999, // $9.99
  interval: 'month'
}

Premium: {
  priceId: 'price_premium_...',
  amount: 2999, // $29.99
  interval: 'month'
}
```

#### Course Purchase:

```javascript
// One-time payment for individual course
{
  priceId: 'price_course_{courseId}',
  amount: course.price * 100,
  mode: 'payment'
}
```

#### Webhooks to Handle:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `payment_intent.succeeded` (course purchase)

---

### Phase 7: Video Upload System

#### Backend Setup:

```javascript
// Use Multer for uploads
const storage = multer.diskStorage({
  destination: "uploads/videos/",
  filename: (req, file, cb) => {
    cb(null, `video-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files allowed"));
    }
  },
});
```

#### Frontend Upload:

```javascript
// Use chunked upload for large files
<VideoUploader
  onUpload={handleVideoUpload}
  maxSize={500} // MB
  accept="video/*"
  showProgress
/>
```

---

## 🎨 UI/UX Design (Skool-style)

### Home Page Layout:

```
┌─────────────────────────────────────────┐
│         Discover Courses                │
│     or create your own (Premium)        │
│                                         │
│  [🔍 Search for anything.............]  │
│                                         │
│  [All] [Programming] [Business]...      │
│                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │  #1  │  │  #2  │  │  #3  │         │
│  │Course│  │Course│  │Course│         │
│  │ Card │  │ Card │  │ Card │         │
│  └──────┘  └──────┘  └──────┘         │
└─────────────────────────────────────────┘
```

### Course Card:

```
┌────────────────────────┐
│  [#1 Badge]            │
│  [Course Thumbnail]    │
│  ┌────┐ Course Title   │
│  │Icon│ Instructor     │
│  └────┘ 1,234 students │
│  Description preview... │
│  ⭐ 4.8  💰 $49.99     │
│  [Enroll Now] or 🔒    │
└────────────────────────┘
```

---

## 🔐 Access Control Logic

### Course Access Check:

```javascript
function canAccessCourse(user, course) {
  // Premium users access everything
  if (user.subscriptionTier === "premium") {
    return true;
  }

  // Check if user purchased this course
  const purchased = user.purchasedCourses.find(
    (p) => p.course.toString() === course._id.toString()
  );

  return purchased !== undefined;
}
```

### Create Course Check:

```javascript
function canCreateCourse(user) {
  // Only Basic and Premium can create
  return ["basic", "premium"].includes(user.subscriptionTier);
}
```

---

## 📦 Installation Commands

### Backend:

```bash
cd backend
npm install @clerk/clerk-sdk-node
npm install multer
npm install stripe
npm install svix  # For Clerk webhook verification
```

### Frontend:

```bash
cd frontend
npm install @clerk/clerk-react
npm install react-player  # For video playback
npm install react-dropzone  # For file uploads
```

---

## 🔄 Migration Steps

### Step 1: Backup

```bash
mongodump --uri="mongodb://..." --out=backup/
```

### Step 2: Update Database

```javascript
// Migration script
db.users.updateMany(
  {},
  {
    $set: {
      subscriptionTier: "free",
      purchasedCourses: [],
    },
    $unset: {
      role: "",
      teachingCourses: "",
      enrolledCourses: "",
    },
  }
);
```

### Step 3: Test Locally

1. Set up Clerk test account
2. Configure Stripe test mode
3. Test all flows

### Step 4: Deploy

1. Update environment variables
2. Run migrations
3. Deploy backend + frontend
4. Set up webhooks

---

## 🧪 Testing Checklist

- [ ] User can sign up with Clerk
- [ ] Free user can browse courses
- [ ] Free user sees "Upgrade" on course click
- [ ] Basic user can purchase individual course
- [ ] Premium user can create course
- [ ] Premium user can upload videos
- [ ] Course purchase unlocks lessons
- [ ] Subscription webhook updates user
- [ ] Video uploads work
- [ ] Course discovery page looks like Skool

---

## 📝 Notes

- Use Clerk's built-in user management (no custom auth)
- Store videos in `/uploads/videos/` (later migrate to S3/Cloudinary)
- Subscription status synced via Stripe webhooks
- No roles - everything based on subscription tier
- Course creators don't need special permission (just Premium)

---

## 🚀 Ready to Start?

Run the following commands to begin:

```bash
# Terminal 1 - Backend
cd backend
npm install @clerk/clerk-sdk-node stripe multer svix
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install @clerk/clerk-react react-player react-dropzone
npm start
```

Let's build an amazing course platform! 🎓
