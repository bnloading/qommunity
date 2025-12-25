const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

/**
 * Cloudinary Configuration
 * Sign up at https://cloudinary.com to get your credentials
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Storage configuration for images
 */
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "skool/images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, height: 675, crop: "limit" }],
  },
});

/**
 * Storage configuration for videos
 */
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "skool/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "avi", "mkv", "webm"],
    // No transformation for videos - keep original quality
  },
});

/**
 * Storage configuration for profile avatars
 */
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "skool/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
    ],
  },
});

/**
 * Multer middleware for image uploads
 */
const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

/**
 * Multer middleware for video uploads
 */
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"), false);
    }
  },
});

/**
 * Multer middleware for avatar uploads
 */
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image' or 'video'
 */
const deleteFile = async (publicId, resourceType = "image") => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

/**
 * Get video info from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 */
const getVideoInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "video",
    });
    return result;
  } catch (error) {
    console.error("Get video info error:", error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadVideo,
  uploadAvatar,
  deleteFile,
  getVideoInfo,
};
