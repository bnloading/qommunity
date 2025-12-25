const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/courses");
const assignmentRoutes = require("./routes/assignments");
const attendanceRoutes = require("./routes/attendance");
const announcementRoutes = require("./routes/announcements");
const chatRoutes = require("./routes/chat");
const postsRoutes = require("./routes/posts");
const commentsRoutes = require("./routes/comments");
const groupsRoutes = require("./routes/groups");
const paymentsRoutes = require("./routes/payments");
const analyticsRoutes = require("./routes/analytics");
const profileRoutes = require("./routes/profile");
const communityRoutes = require("./routes/community");
const communitiesRoutes = require("./routes/communities");
const communitySettingsRoutes = require("./routes/communitySettings");
const webhooksRoutes = require("./routes/webhooks");
const subscriptionsRoutes = require("./routes/subscriptions");
const uploadRoutes = require("./routes/upload");
const localUploadRoutes = require("./routes/localUpload");
const adminRoutes = require("./routes/admin");
const pagesRoutes = require("./routes/pages");
const notificationsRoutes = require("./routes/notifications");
const coursePurchasesRoutes = require("./routes/coursePurchases");

// Initialize express app
const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) =>
  allowedOrigins.length === 0 || allowedOrigins.includes(origin);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked CORS request from origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan("combined"));

// Stripe webhook needs raw body - must be before express.json()
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhooksRoutes = require("./routes/webhooks");
    webhooksRoutes(req, res);
  }
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files for uploads
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
      } else if (filePath.endsWith(".webm")) {
        res.setHeader("Content-Type", "video/webm");
      } else if (filePath.endsWith(".ogg")) {
        res.setHeader("Content-Type", "video/ogg");
      }
    },
  })
);

// Rate limiting - more lenient for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for dev)
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✓ MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/communities", communitiesRoutes);
app.use("/api/community-settings", communitySettingsRoutes); // Community settings, billing, invites
app.use("/api/webhooks", webhooksRoutes); // For Clerk webhook
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/upload", uploadRoutes); // Cloudinary uploads
app.use("/api/local-upload", localUploadRoutes); // Local file uploads
app.use("/api/admin", adminRoutes); // Admin dashboard
app.use("/api/pages", pagesRoutes); // Course pages/lessons
app.use("/api/notifications", notificationsRoutes); // User notifications
app.use("/api/course-purchases", coursePurchasesRoutes); // Course purchases

// Socket.io for real-time chat
const userSockets = new Map(); // email -> socketId mapping

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Register user socket for direct messages
  socket.on("register_user", (email) => {
    userSockets.set(email, socket.id);
    console.log(`User registered: ${email} -> ${socket.id}`);
  });

  socket.on("join_room", (data) => {
    socket.join(data.room);
    console.log(`${data.username} joined room ${data.room}`);
  });

  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", data);
  });

  // Handle direct messages
  socket.on("send_direct_message", (data) => {
    console.log(
      `Direct message from ${data.sender} to ${data.to}: ${data.message}`
    );
    const recipientSocketId = userSockets.get(data.to);

    if (recipientSocketId) {
      // Send message to recipient
      io.to(recipientSocketId).emit("receive_direct_message", data);

      // Send notification to recipient
      io.to(recipientSocketId).emit("new_message_notification", {
        from: data.sender,
        fromName: data.senderName,
        message: data.message,
        timestamp: data.timestamp,
        type: "direct_message",
      });

      console.log(`Message delivered to ${data.to}`);
    } else {
      console.log(`Recipient ${data.to} not online`);
      // Could save to DB for offline delivery
    }

    // Send confirmation back to sender
    socket.emit("direct_message_sent", {
      success: true,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", () => {
    // Remove user from socket map
    for (const [email, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        userSockets.delete(email);
        console.log(`User ${email} disconnected`);
        break;
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, io, corsOptions, server };
