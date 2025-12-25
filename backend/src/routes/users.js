const express = require("express");
const User = require("../models/User");
const { auth, authorize } = require("../middleware/auth");
const { clerkAuth } = require("../middleware/clerkAuth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/profiles");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Get current user (Clerk)
router.get("/me", async (req, res) => {
  try {
    const { clerkAuth } = require("../middleware/clerkAuth");
    await clerkAuth(req, res, async () => {
      const user = await User.findOne({ clerkId: req.auth.userId })
        .populate("purchasedCourses.course")
        .populate("createdCourses");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user });
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Update user profile (Clerk auth)
router.put("/me/profile", clerkAuth, async (req, res) => {
  try {
    const { firstName, lastName, bio, displayName } = req.body;

    // Find user by Clerk ID or email
    let user = await User.findOne({ clerkId: req.userId });

    if (!user && req.userEmail) {
      user = await User.findOne({ email: req.userEmail });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (bio !== undefined) user.bio = bio;
    if (displayName !== undefined) user.displayName = displayName;
    user.updatedAt = new Date();

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        displayName: user.displayName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});

// Complete profile after phone signup
router.post("/complete-profile", async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, bio } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    // Find user by phone number or create new one
    let user = await User.findOne({ phone: phoneNumber });

    if (!user) {
      // Try to find by a partial match (without country code variations)
      const phoneDigits = phoneNumber.replace(/\D/g, "").slice(-10);
      user = await User.findOne({
        phone: { $regex: phoneDigits + "$" },
      });
    }

    if (!user) {
      // Create new user with phone
      user = new User({
        clerkId: `phone_${phoneNumber.replace(/\D/g, "")}`,
        email: `${phoneNumber.replace(/\D/g, "")}@phone.local`,
        phone: phoneNumber,
        firstName: firstName || "User",
        lastName: lastName || "",
        bio: bio || "",
        subscriptionTier: "free",
        subscriptionStatus: "none",
      });
    } else {
      // Update existing user
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (bio !== undefined) user.bio = bio;
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile completed successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete profile",
    });
  }
});

// Get user's purchased courses
router.get("/me/courses", clerkAuth, async (req, res) => {
  try {
    const user = await User.findOne({ clerkId: req.userId }).populate({
      path: "purchasedCourses.course",
      select: "title description thumbnail price category",
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Format response with progress (mock for now - add real progress tracking later)
    const coursesWithProgress = user.purchasedCourses.map((item) => ({
      _id: item.course._id,
      course: item.course,
      purchaseDate: item.purchaseDate,
      amount: item.amount,
      progress: Math.floor(Math.random() * 101), // TODO: Implement real progress tracking
    }));

    res.json({
      success: true,
      courses: coursesWithProgress,
      purchasedCourses: coursesWithProgress,
    });
  } catch (error) {
    console.error("Get user courses error:", error);
    res.status(500).json({ error: "Failed to get courses" });
  }
});

// Get all users (admin only)
router.get("/", auth, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find().populate("enrolledCourses teachingCourses");
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user by ID (public endpoint)
router.get("/:id", async (req, res) => {
  try {
    console.log("🔍 Fetching user by ID:", req.params.id);
    const user = await User.findById(req.params.id).select(
      "firstName lastName email profilePicture subscriptionTier"
    );
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    console.log("✅ User found:", user.email);
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Error fetching user by ID:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update user
router.put("/:id", auth, async (req, res) => {
  try {
    // Check authorization
    if (req.user._id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this user",
      });
    }

    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete user (admin only)
router.delete("/:id", auth, authorize("admin"), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: "User deleted successfully",
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
  "/upload-profile-picture",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please upload an image file",
        });
      }

      const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;

      // Update user's profile picture
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profilePicture: profilePictureUrl },
        { new: true }
      ).select("-password");

      res.status(200).json({
        success: true,
        message: "Profile picture uploaded successfully",
        profilePicture: profilePictureUrl,
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

// Update user settings (including dark mode preference)
router.patch("/settings", auth, async (req, res) => {
  try {
    const { darkMode, emailNotifications, pushNotifications, privateMessages } =
      req.body;

    const updateData = {};
    if (darkMode !== undefined) updateData["settings.darkMode"] = darkMode;
    if (emailNotifications !== undefined)
      updateData["settings.emailNotifications"] = emailNotifications;
    if (pushNotifications !== undefined)
      updateData["settings.pushNotifications"] = pushNotifications;
    if (privateMessages !== undefined)
      updateData["settings.privateMessages"] = privateMessages;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Follow/Unfollow a user
router.post("/:userId/follow", auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId
      );
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    res.status(200).json({
      success: true,
      message: isFollowing ? "User unfollowed" : "User followed",
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
      followingCount: currentUser.following.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's followers
router.get("/:userId/followers", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("followers", "firstName lastName profilePicture email")
      .select("followers");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      followers: user.followers,
      count: user.followers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's following
router.get("/:userId/following", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("following", "firstName lastName profilePicture email")
      .select("following");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      following: user.following,
      count: user.following.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
