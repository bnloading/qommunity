const express = require("express");
const User = require("../models/User");
const Course = require("../models/Course");
const { auth: authenticate } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Get current user profile
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate("enrolledCourses", "title thumbnail rating")
      .populate("teachingCourses", "title thumbnail rating totalRevenue")
      .populate("followers", "firstName lastName profilePicture")
      .populate("following", "firstName lastName profilePicture");

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user profile by ID
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .populate("enrolledCourses", "title thumbnail rating")
      .populate("teachingCourses", "title thumbnail rating totalRevenue")
      .populate("followers", "firstName lastName profilePicture")
      .populate("following", "firstName lastName profilePicture");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update profile information
router.put("/update/info", authenticate, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      bio,
      phone,
      dateOfBirth,
      address,
      city,
      country,
      socialLinks,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        bio,
        phone,
        dateOfBirth,
        address,
        city,
        country,
        socialLinks,
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Upload profile picture
router.post(
  "/upload/avatar",
  authenticate,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        {
          profilePicture: `/uploads/profiles/${req.file.filename}`,
          updatedAt: new Date(),
        },
        { new: true }
      ).select("-password");

      res.json({
        success: true,
        message: "Profile picture updated",
        user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Update settings
router.put("/update/settings", authenticate, async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, privateMessages, darkMode } =
      req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        settings: {
          emailNotifications: emailNotifications ?? true,
          pushNotifications: pushNotifications ?? true,
          privateMessages: privateMessages ?? true,
          darkMode: darkMode ?? false,
        },
        updatedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Settings updated",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's teaching statistics
router.get("/stats/teaching", authenticate, async (req, res) => {
  try {
    // Only teachers can access this
    const user = await User.findById(req.user.id).populate("teachingCourses");

    if (user.role !== "teacher" && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only teachers can access teaching statistics",
      });
    }

    const courses = user.teachingCourses;
    const totalStudents = courses.reduce(
      (sum, course) => sum + course.students.length,
      0
    );
    const totalRevenue = courses.reduce(
      (sum, course) => sum + course.totalRevenue,
      0
    );
    const totalCourses = courses.length;

    res.json({
      success: true,
      stats: {
        totalCourses,
        totalStudents,
        totalRevenue,
        courses: courses.map((c) => ({
          id: c._id,
          title: c.title,
          students: c.students.length,
          revenue: c.totalRevenue,
          rating: c.rating,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Follow a user
router.post("/follow/:userId", authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already following
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Already following this user",
      });
    }

    currentUser.following.push(targetUserId);
    targetUser.followers.push(req.user.id);

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      message: "User followed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Unfollow a user
router.post("/unfollow/:userId", authenticate, async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    currentUser.following = currentUser.following.filter(
      (id) => id.toString() !== targetUserId
    );
    targetUser.followers = targetUser.followers.filter(
      (id) => id.toString() !== req.user.id
    );

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      message: "User unfollowed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
