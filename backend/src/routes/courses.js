const express = require("express");
const Course = require("../models/Course");
const User = require("../models/User");
const { auth, authorize } = require("../middleware/auth");
const { checkPaymentForCreation } = require("../middleware/paymentGate");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Helper function to get user email from request
const getUserEmail = (req) => {
  // Priority: 1) Query param, 2) Header, 3) Fallback
  return (
    req.query.userEmail ||
    req.headers["x-user-email"] ||
    "nurbakhitjan5@gmail.com"
  );
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images and videos are allowed"));
  },
});

// Get all courses with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const {
      category,
      level,
      search,
      instructorId,
      page = 1,
      limit = 12,
      sort = "createdAt",
    } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (level && level !== "all") {
      filter.level = level;
    }

    if (instructorId) {
      filter["instructor.id"] = instructorId;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortOptions = {};
    if (sort === "popular") {
      sortOptions.rating = -1;
    } else if (sort === "newest") {
      sortOptions.createdAt = -1;
    } else if (sort === "price-low") {
      sortOptions["tiers.0.price"] = 1;
    } else if (sort === "price-high") {
      sortOptions["tiers.0.price"] = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const courses = await Course.find(filter)
      .select(
        "title slug description thumbnail category level price rating enrolledUsers totalRevenue studentCount instructor createdAt lessons"
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Course.countDocuments(filter);

    // Add student count per course and auto-fix missing instructor emails
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const courseObj = course.toObject();

        // Auto-fix missing instructor email
        if (!courseObj.instructor?.email && courseObj.instructor?.id) {
          const instructorUser = await User.findById(courseObj.instructor.id);
          if (instructorUser) {
            course.instructor.email = instructorUser.email;
            await course.save();
            courseObj.instructor.email = instructorUser.email;
          }
        }

        return {
          ...courseObj,
          studentCount:
            course.enrolledUsers?.length || course.studentCount || 0,
        };
      })
    );

    res.status(200).json({
      success: true,
      courses: coursesWithStats,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching courses:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get course by ID
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    console.log("📖 Fetching course:", course.title);
    console.log("👤 Instructor email:", course.instructor?.email);
    console.log("👤 Instructor object:", course.instructor);

    // Auto-fix missing instructor email
    if (!course.instructor.email && course.instructor.id) {
      console.log("⚠️ Instructor email missing, fixing...");
      const instructorUser = await User.findById(course.instructor.id);
      if (instructorUser) {
        course.instructor.email = instructorUser.email;
        await course.save();
        console.log("✅ Fixed instructor email:", instructorUser.email);
      }
    }

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("❌ Error fetching course by ID:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create course (any authenticated user with payment)
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      price,
      duration,
      userName,
      userImage,
    } = req.body;

    console.log("📚 Creating course:", title);

    // Find test user to use as instructor
    const userEmail = getUserEmail(req);
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      console.log("Creating test user...");
      user = await User.create({
        email: userEmail,
        firstName: userName?.split(" ")[0] || "Test",
        lastName: userName?.split(" ").slice(1).join(" ") || "User",
        profilePicture: userImage || "https://via.placeholder.com/150",
        subscriptionTier: "premium",
        subscriptionStatus: "active",
        clerkId: "test_user_123",
      });
    }

    // Generate a slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const course = await Course.create({
      title,
      slug: slug + "-" + Date.now(),
      description,
      category: category || "programming",
      level: level || "beginner",
      price: price || 0,
      thumbnail:
        "https://via.placeholder.com/400x300?text=" + encodeURIComponent(title),
      instructor: {
        id: user._id,
        clerkId: user.clerkId || "test_user_123",
        name: userName || `${user.firstName} ${user.lastName}`,
        email: userEmail,
        profilePicture:
          userImage || user.profilePicture || "https://via.placeholder.com/150",
      },
      isPublished: true,
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update course
router.put("/:id", async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the course author
    const userEmail = getUserEmail(req);
    const user = await User.findOne({ email: userEmail });
    if (course.instructor.id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this course",
      });
    }

    course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete course
router.delete("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the course author
    const userEmail = getUserEmail(req);
    const user = await User.findOne({ email: userEmail });
    if (course.instructor.id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this course",
      });
    }

    await Course.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Enroll in course (any authenticated user)
router.post("/:id/enroll", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Find test user
    const userEmail = getUserEmail(req);
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      user = await User.create({
        email: userEmail,
        firstName: "Test",
        lastName: "User",
        subscriptionTier: "premium",
        subscriptionStatus: "active",
      });
    }

    if (course.students.includes(user._id)) {
      return res.status(400).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    course.students.push(user._id);
    await course.save();

    // Update user's enrolled courses
    await User.findByIdAndUpdate(user._id, {
      $push: { enrolledCourses: req.params.id },
    });

    res.status(200).json({
      success: true,
      message: "Enrolled successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's created courses
router.get("/my-courses/created", async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.json({
        success: true,
        courses: [],
      });
    }

    const courses = await Course.find({ "instructor.id": user._id })
      .select(
        "title description thumbnail category level price studentCount rating createdAt lessons"
      )
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user progress for a course
router.get("/:id/progress", async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.json({
        progress: {},
        subscriptionTier: "free",
      });
    }

    // For now, return empty progress - you can expand this later
    res.json({
      progress: user.courseProgress || {},
      subscriptionTier: user.subscriptionTier || "free",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Save user progress for a course
router.post("/:id/progress", async (req, res) => {
  try {
    const { chapterId, completed } = req.body;
    const userEmail = getUserEmail(req);
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Initialize courseProgress if it doesn't exist
    if (!user.courseProgress) {
      user.courseProgress = {};
    }

    // Save progress
    user.courseProgress[chapterId] = {
      completed,
      completedAt: completed ? new Date() : null,
    };

    await user.save();

    res.json({
      success: true,
      message: "Progress saved",
      progress: user.courseProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Add lesson to course
router.post("/:id/lessons", async (req, res) => {
  try {
    const { title, description, videoUrl, duration, order, isFree } = req.body;

    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the course author
    const userEmail = getUserEmail(req);
    const user = await User.findOne({ email: userEmail });
    if (course.instructor.id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add lessons to this course",
      });
    }

    course.lessons.push({
      title,
      description,
      videoUrl,
      duration,
      order,
      isFree: isFree || false,
    });

    await course.save();

    res.json({
      success: true,
      message: "Lesson added successfully",
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete lesson from course
router.delete("/:id/lessons/:lessonId", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user is the course author
    const userEmail = getUserEmail(req);
    const user = await User.findOne({ email: userEmail });
    if (course.instructor.id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete lessons from this course",
      });
    }

    course.lessons = course.lessons.filter(
      (lesson) => lesson._id.toString() !== req.params.lessonId
    );

    await course.save();

    res.json({
      success: true,
      message: "Lesson deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Upload course thumbnail
router.post(
  "/:id/upload-thumbnail",
  upload.single("thumbnail"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the course author
      const userEmail = getUserEmail(req);
      const user = await User.findOne({ email: userEmail });
      if (course.instructor.id.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to upload thumbnail for this course",
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      course.thumbnail = fileUrl;
      await course.save();

      res.json({
        success: true,
        message: "Thumbnail uploaded successfully",
        thumbnail: fileUrl,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Upload lesson video
router.post(
  "/:id/lessons/:lessonId/upload-video",
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video file uploaded",
        });
      }

      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }

      // Check if user is the course author
      const userEmail = getUserEmail(req);
      const user = await User.findOne({ email: userEmail });
      if (course.instructor.id.toString() !== user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to upload video for this course",
        });
      }

      const lesson = course.lessons.id(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: "Lesson not found",
        });
      }

      const videoUrl = `/uploads/${req.file.filename}`;
      lesson.videoUrl = videoUrl;
      await course.save();

      res.json({
        success: true,
        message: "Video uploaded successfully",
        videoUrl: videoUrl,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Mark lesson as complete
router.post("/:courseId/lessons/:lessonId/complete", auth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { watchTime, lastPosition } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    // Update user's course progress
    const user = await User.findById(req.user._id);
    if (!user.courseProgress) {
      user.courseProgress = new Map();
    }

    user.courseProgress.set(lessonId, {
      completed: true,
      completedAt: new Date(),
      watchTime: watchTime || 0,
      lastPosition: lastPosition || 0,
    });

    await user.save();

    // Calculate overall course progress
    const completedLessons = course.lessons.filter(
      (l) =>
        user.courseProgress.has(l._id.toString()) &&
        user.courseProgress.get(l._id.toString()).completed
    ).length;
    const totalLessons = course.lessons.length;
    const progressPercentage =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    res.json({
      success: true,
      message: "Lesson marked as complete",
      progress: {
        completedLessons,
        totalLessons,
        percentage: progressPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's progress for a specific course
router.get("/:courseId/my-progress", auth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const user = await User.findById(req.user._id);
    const lessonProgress = {};
    let completedLessons = 0;

    course.lessons.forEach((lesson) => {
      const lessonId = lesson._id.toString();
      if (user.courseProgress && user.courseProgress.has(lessonId)) {
        const progress = user.courseProgress.get(lessonId);
        lessonProgress[lessonId] = progress;
        if (progress.completed) {
          completedLessons++;
        }
      } else {
        lessonProgress[lessonId] = {
          completed: false,
          completedAt: null,
          watchTime: 0,
          lastPosition: 0,
        };
      }
    });

    const totalLessons = course.lessons.length;
    const progressPercentage =
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;

    res.json({
      success: true,
      courseId,
      lessonProgress,
      summary: {
        completedLessons,
        totalLessons,
        percentage: progressPercentage,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update lesson watch position (for resuming)
router.put("/:courseId/lessons/:lessonId/position", auth, async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { watchTime, lastPosition } = req.body;

    const user = await User.findById(req.user._id);
    if (!user.courseProgress) {
      user.courseProgress = new Map();
    }

    const existing = user.courseProgress.get(lessonId) || {};
    user.courseProgress.set(lessonId, {
      ...existing,
      watchTime: watchTime || existing.watchTime || 0,
      lastPosition: lastPosition || existing.lastPosition || 0,
    });

    await user.save();

    res.json({
      success: true,
      message: "Position saved",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
