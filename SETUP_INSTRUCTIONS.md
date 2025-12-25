# 🚀 Quick Setup Instructions

## You need to configure Clerk Authentication

### Step 1: Create a Clerk Account

1. Go to https://clerk.com
2. Sign up for a free account
3. Create a new application

### Step 2: Get your API Keys

1. In your Clerk Dashboard, go to **API Keys**
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

### Step 3: Update Environment Variables

#### Backend (.env file):

```env
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

#### Frontend (.env file):

```env
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

### Step 4: Configure Clerk Webhooks

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. URL: `http://localhost:5000/api/webhooks/clerk` (or your backend URL)
4. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the **Signing Secret** and add it to backend `.env` as `CLERK_WEBHOOK_SECRET`

### Step 5: Set up Stripe for Payments

1. Go to https://stripe.com
2. Get your API keys from Dashboard
3. Create two products with recurring prices:
   - **Basic** - $9.99/month
   - **Premium** - $29.99/month
4. Copy the Price IDs and update backend `.env`:

```env
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET
STRIPE_BASIC_PRICE_ID=price_xxx (from Stripe Dashboard)
STRIPE_PREMIUM_PRICE_ID=price_yyy (from Stripe Dashboard)
```

### Step 6: Run the Application

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

### Step 7: Replace App.js

1. Delete `frontend/src/App.js`
2. Rename `frontend/src/App_new.js` to `App.js`

---

## 📝 What's Changed?

✅ **Authentication**: JWT removed, Clerk integrated
✅ **User Model**: Added `clerkId`, `subscriptionTier` (free/basic/premium), `purchasedCourses`
✅ **Course Model**: Added `lessons` with video support, `enrolledUsers` with Clerk IDs
✅ **New Routes**: `/api/webhooks/*`, `/api/subscriptions/*`
✅ **Middleware**: Clerk authentication, course access control

---

## 🎯 Next Steps After Setup:

1. Update Home page to show courses (not posts)
2. Add video upload functionality
3. Create course builder UI
4. Update Profile page to show subscription badge
5. Add Pricing page

---

## ⚠️ Important Notes:

- Make sure to use the test keys (pk*test*_ and sk*test*_)
- Webhooks need a public URL (use ngrok for local testing)
- Users will be automatically created in MongoDB when they sign up with Clerk
- Premium users get access to all courses
- Basic users need to purchase individual courses

---

## 🔗 Useful Links:

- Clerk Docs: https://clerk.com/docs
- Stripe Docs: https://stripe.com/docs
- Ngrok (for webhook testing): https://ngrok.com

Let me know when you're ready to continue! 🚀
