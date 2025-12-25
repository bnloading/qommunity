const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { clerkAuth } = require("../middleware/clerkAuth");
const MediaFile = require("../models/MediaFile");
const User = require("../models/User");

// Ensure upload directories exist
const uploadDir = path.join(__dirname, "../../uploads");
const imagesDir = path.join(uploadDir, "images");
const videosDir = path.join(uploadDir, "videos");
const audiosDir = path.join(uploadDir, "audios");

[uploadDir, imagesDir, videosDir, audiosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = uploadDir;
    if (file.mimetype.startsWith("image/")) {
      dest = imagesDir;
    } else if (file.mimetype.startsWith("video/")) {
      dest = videosDir;
    } else if (file.mimetype.startsWith("audio/")) {
      dest = audiosDir;
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedVideoTypes = [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
  ];
  const allowedAudioTypes = [
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
  ];

  const allAllowed = [
    ...allowedImageTypes,
    ...allowedVideoTypes,
    ...allowedAudioTypes,
  ];

  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type ${file.mimetype} not allowed. Allowed: images, videos, audio files.`
      ),
      false
    );
  }
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for videos
  },
});

/**
 * @route   POST /api/local-upload/image
 * @desc    Upload image from local file
 * @access  Private
 */
router.post("/image", clerkAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileType = req.file.mimetype.startsWith("image/")
      ? "images"
      : req.file.mimetype.startsWith("video/")
      ? "videos"
      : "audios";

    const fileUrl = `/uploads/${fileType}/${req.file.filename}`;

    // Find user from Clerk email
    let userId = null;
    if (req.user && req.user.email) {
      const user = await User.findOne({ email: req.user.email });
      if (user) userId = user._id;
    }

    // Save to database
    const mediaFile = await MediaFile.create({
      user: userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      type: "image",
      community: req.body.communityId || null,
      course: req.body.courseId || null,
      page: req.body.pageId || null,
    });

    res.json({
      success: true,
      message: "File uploaded successfully",
      id: mediaFile._id,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Local upload error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/local-upload/video
 * @desc    Upload video from local file
 * @access  Private
 */
router.post("/video", clerkAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileUrl = `/uploads/videos/${req.file.filename}`;

    // Find user from Clerk email
    let userId = null;
    if (req.user && req.user.email) {
      const user = await User.findOne({ email: req.user.email });
      if (user) userId = user._id;
    }

    // Save to database
    const mediaFile = await MediaFile.create({
      user: userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      type: "video",
      community: req.body.communityId || null,
      course: req.body.courseId || null,
      page: req.body.pageId || null,
    });

    res.json({
      success: true,
      message: "Video uploaded successfully",
      id: mediaFile._id,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      duration: null,
    });
  } catch (error) {
    console.error("Video upload error:", error);
    res.status(500).json({
      success: false,
      message: "Video upload failed",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/local-upload/audio
 * @desc    Upload audio from local file
 * @access  Private
 */
router.post("/audio", clerkAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileUrl = `/uploads/audios/${req.file.filename}`;

    res.json({
      success: true,
      message: "Audio uploaded successfully",
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({
      success: false,
      message: "Audio upload failed",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/local-upload/media
 * @desc    Upload any media file (image, video, or audio)
 * @access  Private
 */
router.post("/media", clerkAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    let fileType = "files";
    if (req.file.mimetype.startsWith("image/")) {
      fileType = "images";
    } else if (req.file.mimetype.startsWith("video/")) {
      fileType = "videos";
    } else if (req.file.mimetype.startsWith("audio/")) {
      fileType = "audios";
    }

    const fileUrl = `/uploads/${fileType}/${req.file.filename}`;

    res.json({
      success: true,
      message: "Media uploaded successfully",
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      type: fileType,
    });
  } catch (error) {
    console.error("Media upload error:", error);
    res.status(500).json({
      success: false,
      message: "Media upload failed",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/local-upload/my-files
 * @desc    Get all files uploaded by the current user
 * @access  Private
 */
router.get("/my-files", clerkAuth, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    // Find user
    let userId = null;
    if (req.user && req.user.email) {
      const user = await User.findOne({ email: req.user.email });
      if (user) userId = user._id;
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    const query = { user: userId, isActive: true };
    if (type) query.type = type;

    const files = await MediaFile.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MediaFile.countDocuments(query);

    res.json({
      success: true,
      files,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get files error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get files",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/local-upload/file/:id
 * @desc    Delete a file by ID
 * @access  Private
 */
router.delete("/file/:id", clerkAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Find the media file
    const mediaFile = await MediaFile.findById(id);

    if (!mediaFile) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Verify ownership
    let userId = null;
    if (req.user && req.user.email) {
      const user = await User.findOne({ email: req.user.email });
      if (user) userId = user._id;
    }

    if (!userId || !mediaFile.user.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this file",
      });
    }

    // Determine file type folder
    let typeFolder = "images";
    if (mediaFile.type === "video") typeFolder = "videos";
    else if (mediaFile.type === "audio") typeFolder = "audios";

    // Delete from filesystem
    const filePath = path.join(uploadDir, typeFolder, mediaFile.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    await MediaFile.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete file",
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/local-upload/:filename
 * @desc    Delete an uploaded file by filename (legacy)
 * @access  Private
 */
router.delete("/:type/:filename", clerkAuth, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const validTypes = ["images", "videos", "audios"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    const filePath = path.join(uploadDir, type, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    fs.unlinkSync(filePath);

    // Also delete from database if exists
    await MediaFile.findOneAndDelete({ filename });

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete file",
      error: error.message,
    });
  }
});

module.exports = router;
