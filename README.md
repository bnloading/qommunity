# 🎓 Skool Platform - Full-Stack Education Community

A comprehensive full-stack platform inspired by Skool.com with support for courses, communities, real-time chat, and Stripe payments with tier-based access control.

## ✨ Features

### 🔐 Authentication & User Management

- JWT-based authentication (access + refresh tokens)
- User roles: Student, Teacher, Admin
- Profile settings with dark/light mode toggle
- Email verification & password reset
- Social links and profile customization

### 📚 Courses & Learning

- Create and manage courses
- **NEW**: Tier-based pricing (Free, Basic, Premium)
- Video lessons with attachments
- Student progress tracking
- Course ratings and reviews
- Analytics dashboard for instructors

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

- **NEW**: Dark/Light mode toggle
- Responsive design (mobile, tablet, desktop)
- Tailwind CSS styling
- Card-based layouts with soft shadows
- Material-UI icons
- Smooth transitions and animations

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Joi
- **Email**: Nodemailer
- **File Upload**: Multer
- **Payment**: Stripe API

### Frontend

- **Framework**: React.js
- **State Management**: Redux Toolkit
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS & Material-UI
- **UI Components**: Material-UI
- **Forms**: React Hook Form
- **Real-time**: Socket.io (for chat)

### Database

- **MongoDB**: NoSQL database
- **Mongoose**: ODM for MongoDB

## 📁 Project Structure

```
skool/
├── backend/
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── config/
│   │   └── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── utils/
│   │   ├── styles/
│   │   └── App.js
│   ├── package.json
│   └── .env.example
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```
MONGODB_URI=mongodb://localhost:27017/edtech
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
PORT=5000
```

4. Start the server:

```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

4. Start the development server:

```bash
npm start
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Courses

- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course (admin/teacher)
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Assignments

- `GET /api/assignments` - Get assignments
- `POST /api/assignments` - Create assignment
- `POST /api/assignments/:id/submit` - Submit assignment
- `GET /api/assignments/:id/submissions` - Get submissions

### Attendance

- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/:classId` - Get class attendance

### Announcements

- `GET /api/announcements` - Get all announcements
- `POST /api/announcements` - Create announcement
- `DELETE /api/announcements/:id` - Delete announcement

## 🔐 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Input validation and sanitization
- CORS configuration
- Rate limiting
- SQL injection prevention

## 📝 License

MIT License

## 👥 Contributing

Contributions are welcome! Please create a pull request with your changes.

## 📞 Support

For issues and questions, please create an issue in the repository.
"# qommunity" 
