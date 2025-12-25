# EdTech Platform - Complete Setup Guide

## 🚀 Quick Start Instructions

### Step 1: Install Dependencies

#### Backend Setup

```bash
cd backend
npm install
```

#### Frontend Setup

```bash
cd frontend
npm install
```

---

## 🔧 Environment Configuration

### Backend Configuration

1. Create `.env` file in `backend/` folder:

```bash
cd backend
cp .env.example .env
```

2. Edit `backend/.env` with your settings:

```
MONGODB_URI=mongodb://localhost:27017/edtech
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=7d
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLIC_KEY=pk_test_your_key
```

### Frontend Configuration

1. Create `.env` file in `frontend/` folder:

```bash
cd frontend
cp .env.example .env
```

2. Edit `frontend/.env`:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

---

## 📦 MongoDB Setup

### Option 1: Local MongoDB

```bash
# Install MongoDB from https://www.mongodb.com/try/download/community
# Then run:
mongod
```

### Option 2: MongoDB Atlas (Cloud)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster
4. Get connection string
5. Update `MONGODB_URI` in `.env`:

```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/edtech?retryWrites=true&w=majority
```

---

## ▶️ Running the Application

### Terminal 1 - Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**

```
✓ MongoDB connected
✓ Server running on port 5000
```

### Terminal 2 - Frontend Application

```bash
cd frontend
npm start
```

The app will automatically open at `http://localhost:3000`

---

## 🔑 Test Login Credentials

After registration, use any account you create or:

**Admin Account:**

- Email: `admin@edtech.com`
- Password: `admin123456`

---

## 📚 Project Features

### ✅ Authentication

- User Registration (Student/Teacher)
- JWT Login/Logout
- Password hashing with bcrypt

### ✅ User Roles

- **Student**: Enroll in courses, submit assignments
- **Teacher**: Create courses, grade assignments, mark attendance
- **Admin**: Manage users, courses, view reports

### ✅ Core Features

- **Courses**: Create, read, update, delete courses with lessons
- **Assignments**: Create assignments, student submissions, grading
- **Attendance**: Mark attendance, view attendance records
- **Announcements**: Post announcements with priority levels
- **Chat**: Real-time messaging with Socket.io (Socket.io included, not yet implemented in UI)
- **Payments**: Stripe integration ready

---

## 🌳 Project Structure

```
skool/
├── backend/
│   ├── src/
│   │   ├── models/              # MongoDB Schemas
│   │   │   ├── User.js
│   │   │   ├── Course.js
│   │   │   ├── Assignment.js
│   │   │   ├── Attendance.js
│   │   │   ├── Announcement.js
│   │   │   ├── Message.js
│   │   │   └── Payment.js
│   │   ├── middleware/          # Express Middleware
│   │   │   └── auth.js
│   │   ├── routes/              # API Endpoints
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── courses.js
│   │   │   ├── assignments.js
│   │   │   ├── attendance.js
│   │   │   ├── announcements.js
│   │   │   └── chat.js
│   │   └── server.js            # Express App
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # Page Components
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── Courses.js
│   │   │   ├── CourseDetail.js
│   │   │   ├── Assignments.js
│   │   │   ├── Attendance.js
│   │   │   ├── Announcements.js
│   │   │   ├── Chat.js
│   │   │   └── AdminDashboard.js
│   │   ├── components/          # Reusable Components
│   │   │   ├── Navbar.js
│   │   │   └── PrivateRoute.js
│   │   ├── redux/               # State Management
│   │   │   ├── slices/
│   │   │   │   └── authSlice.js
│   │   │   └── store.js
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## 📡 API Endpoints

### Authentication

```
POST   /api/auth/register    - Register user
POST   /api/auth/login       - Login user
GET    /api/auth/me          - Get current user
```

### Users

```
GET    /api/users            - Get all users (admin)
GET    /api/users/:id        - Get user by ID
PUT    /api/users/:id        - Update user
DELETE /api/users/:id        - Delete user (admin)
```

### Courses

```
GET    /api/courses          - Get all courses
GET    /api/courses/:id      - Get course details
POST   /api/courses          - Create course (teacher)
PUT    /api/courses/:id      - Update course
DELETE /api/courses/:id      - Delete course
POST   /api/courses/:id/enroll - Enroll student
```

### Assignments

```
GET    /api/assignments      - Get all assignments
GET    /api/assignments/:id  - Get assignment details
POST   /api/assignments      - Create assignment (teacher)
POST   /api/assignments/:id/submit - Submit assignment
POST   /api/assignments/:id/grade/:index - Grade submission
```

### Attendance

```
POST   /api/attendance       - Mark attendance
GET    /api/attendance/:classId - Get attendance records
PUT    /api/attendance/:id   - Update attendance
```

### Announcements

```
GET    /api/announcements    - Get all announcements
POST   /api/announcements    - Create announcement
PUT    /api/announcements/:id - Update announcement
DELETE /api/announcements/:id - Delete announcement
```

### Messages/Chat

```
GET    /api/chat/:room       - Get messages
POST   /api/chat             - Post message
POST   /api/chat/:id/like    - Like message
POST   /api/chat/:id/reply   - Reply to message
```

---

## 🔒 Security Features

- ✅ JWT token authentication
- ✅ Password hashing (bcryptjs)
- ✅ Role-based access control
- ✅ Protected API routes
- ✅ CORS configuration
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ Request validation

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Windows - Kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Or use different port
PORT=5001 npm run dev
```

### MongoDB Connection Error

- Ensure MongoDB is running
- Check connection string in `.env`
- For Atlas, whitelist your IP

### CORS Errors

- Verify `CLIENT_URL` in backend `.env`
- Make sure frontend is running on correct port

### Token Errors

- Clear localStorage: Press F12 → Application → LocalStorage → Clear
- Login again

### Dependencies Issues

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env` files
3. ✅ Start MongoDB
4. ✅ Run backend server (`npm run dev`)
5. ✅ Run frontend server (`npm start`)
6. ✅ Create test account
7. ⬜ Add more courses and assignments
8. ⬜ Customize UI/styling
9. ⬜ Deploy to production

---

## 🚀 Deployment

### Backend (Heroku/Railway)

```bash
# Push to Heroku
git push heroku main
```

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy build folder
```

---

## 💡 Tips

- Use Postman to test API endpoints
- Check browser console (F12) for frontend errors
- Check terminal for backend errors
- MongoDB compass: Visualize database
- Redux DevTools: Debug state management

---

## 📞 Support

For issues:

1. Check the error message in console/terminal
2. Verify `.env` configuration
3. Ensure MongoDB is running
4. Check port availability (5000 for backend, 3000 for frontend)
5. Clear cache and restart servers

---

**Your EdTech Platform is ready to use!** 🎓
