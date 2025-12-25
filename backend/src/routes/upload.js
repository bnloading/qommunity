const express = require("express");
const router = express.Router();
const {
  uploadImage,
  uploadVideo,
  uploadAvatar,
  deleteFile,
} = require("../config/cloudinary");
const { clerkAuth } = require("../middleware/clerkAuth");

/**
 * @route   POST /api/upload/image
 * @desc    Upload course thumbnail or other images
 * @access  Private
 */
router.post(
  "/image",
  clerkAuth,
  uploadImage.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      res.json({
        success: true,
        message: "Image uploaded successfully",
        url: req.file.path,
        publicId: req.file.filename,
        cloudinary: {
          public_id: req.file.filename,
          secure_url: req.file.path,
        },
      });
    } catch (error) {
      console.error("Image upload error:", error);
      res.status(500).json({
        message: "Image upload failed",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/upload/video
 * @desc    Upload course video lessons
 * @access  Private (Premium users only)
 */
router.post("/video", clerkAuth, async (req, res) => {
  // Check if user has premium access
  const User = require("../models/User");
  const user = await User.findOne({ clerkId: req.userId });

  if (!user || (user.subscriptionTier !== "premium" && user.role !== "admin")) {
    return res.status(403).json({
      message: "Premium subscription required to upload videos",
    });
  }

  uploadVideo.single("video")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: "Video upload failed",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      res.json({
        success: true,
        message: "Video uploaded successfully",
        url: req.file.path,
        publicId: req.file.filename,
        cloudinary: {
          public_id: req.file.filename,
          secure_url: req.file.path,
          resource_type: "video",
        },
      });
    } catch (error) {
      console.error("Video upload error:", error);
      res.status(500).json({
        message: "Video upload failed",
        error: error.message,
      });
    }
  });
});

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload user profile avatar
 * @access  Private
 */
router.post(
  "/avatar",
  clerkAuth,
  uploadAvatar.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Update user's profile picture
      const User = require("../models/User");
      const user = await User.findOne({ clerkId: req.userId });

      if (user) {
        // Delete old avatar if exists
        if (user.profilePicture) {
          const oldPublicId = user.profilePicture
            .split("/")
            .pop()
            .split(".")[0];
          try {
            await deleteFile(`skool/avatars/${oldPublicId}`, "image");
          } catch (error) {
            console.error("Error deleting old avatar:", error);
          }
        }

        user.profilePicture = req.file.path;
        await user.save();
      }

      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        url: req.file.path,
        publicId: req.file.filename,
      });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({
        message: "Avatar upload failed",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Delete uploaded file from Cloudinary
 * @access  Private
 */
router.delete("/:publicId", clerkAuth, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = "image" } = req.query;

    const result = await deleteFile(publicId, resourceType);

    res.json({
      success: true,
      message: "File deleted successfully",
      result,
    });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({
      message: "File deletion failed",
      error: error.message,
    });
  }
});

module.exports = router;
