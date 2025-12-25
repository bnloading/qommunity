# Quick Start Guide

## 🚀 Get Your Platform Running in 5 Minutes

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier)
- Stripe account (test mode)

---

## Step 1: Clone & Install (2 minutes)

```bash
# Navigate to your project directory
cd C:\Users\Nur\Desktop\Code\skool

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Step 2: Configure Environment Variables (2 minutes)

### Backend `.env`

Already configured! Just verify:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CLIENT_URLS=http://localhost:3000,http://localhost:3001
```

### Frontend `.env`

Already configured! Just verify:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## Step 3: Start Both Servers (1 minute)

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

✅ Backend runs on `http://localhost:5000`

### Terminal 2: Frontend

```bash
cd frontend
npm start
```

✅ Frontend runs on `http://localhost:3000` (or `3001`)

---

## Step 4: Test Core Features (1-2 minutes)

### 1. Registration

- Go to http://localhost:3000/register
- Create an account
- You'll receive a JWT token

### 2. Browse Courses

- Click "Courses" in sidebar
- View course listings
- Click on a course for details

### 3. Join a Community

- Click "Communities" in sidebar
- Join a community

### 4. Real-Time Chat

- Click "Chat" in sidebar
- Select your joined community
- Send a message (see it appear in real-time!)

### 5. Dark Mode

- Click the moon icon in navbar
- Theme switches instantly

### 6. Admin Dashboard (if admin role)

- Login as admin
- Go to Admin Dashboard
- View platform analytics

---

## 🎉 You're All Set!

### What You Have Now:

✅ **Full Authentication**: Register, login, JWT tokens  
✅ **Real-Time Chat**: Socket.io messaging per community  
✅ **Payment Integration**: Stripe ready (use test card: `4242 4242 4242 4242`)  
✅ **Admin Analytics**: Platform-wide stats  
✅ **Dark/Light Mode**: Theme toggle  
✅ **Payment Gate**: Must pay before creating courses/communities

---

## Testing Payment Flow

### 1. Make a Test Payment

```bash
# Use Stripe test card
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

### 2. Create Content

- After payment, try creating a course
- Payment gate will allow it

---

## Quick Commands

### Backend

```bash
npm run dev          # Start with nodemon (auto-restart)
npm start            # Start normally
```

### Frontend

```bash
npm start            # Start dev server
npm run build        # Build for production
```

---

## Testing Endpoints

### Health Check

```bash
curl http://localhost:5000/api/health
```

### Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### CORS Test

```bash
curl -X OPTIONS http://localhost:5000/api/auth/register \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -i
```

Look for: `Access-Control-Allow-Origin: http://localhost:3001`

---

## 📁 Project Structure at a Glance

```
skool/
├── backend/
│   ├── src/
│   │   ├── middleware/     # Auth, payment gate, uploads
│   │   ├── models/         # User, Course, Community, Payment
│   │   ├── routes/         # Auth, courses, chat, payments
│   │   └── server.js       # Express + Socket.io
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Navbar, Sidebar, Cards
│   │   ├── pages/          # Home, Courses, Chat, Admin
│   │   ├── context/        # Auth, Theme
│   │   └── redux/          # State management
│   └── .env
│
├── DEPLOYMENT_GUIDE.md     # Production deployment
└── README.md               # Full documentation
```

---

## 🐛 Troubleshooting

### Backend Won't Start

- **Port busy**: Kill process on port 5000
- **MongoDB error**: Check `MONGODB_URI` connection string

### Frontend Won't Start

- **Port busy**: Will auto-ask to use 3001
- **API error**: Verify `REACT_APP_API_URL` is correct

### Chat Not Working

- Ensure backend is running
- Check browser console for Socket.io errors
- Verify `REACT_APP_SOCKET_URL` matches backend

### Payment Fails

- Use Stripe test card: `4242 4242 4242 4242`
- Check `STRIPE_SECRET_KEY` is set
- Ensure webhook endpoint is accessible

---

## 🎯 What's Next?

1. **Test all features** (10-15 minutes)
2. **Review code** in key files:

   - `backend/src/server.js` - CORS + Socket.io
   - `backend/src/middleware/paymentGate.js` - Payment verification
   - `frontend/src/pages/Chat.js` - Real-time messaging
   - `frontend/src/pages/AdminDashboard.js` - Analytics

3. **Deploy to production**:
   - Read `DEPLOYMENT_GUIDE.md`
   - Deploy backend to Render/Railway
   - Deploy frontend to Vercel

---

## 📚 Documentation

- **Full Setup**: See `README.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`

---

## ✨ Key Features Working

✅ User registration with JWT  
✅ Multi-origin CORS support  
✅ Real-time Socket.io chat  
✅ Stripe payment integration  
✅ Payment gate for content creation  
✅ Admin analytics dashboard  
✅ Dark/light mode toggle  
✅ Responsive design

---

**Happy Coding! 🚀**

Need help? Check the full documentation in `README.md` or `DEPLOYMENT_GUIDE.md`.
