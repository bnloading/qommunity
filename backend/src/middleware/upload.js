const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directories if they don't exist
const uploadDirs = [
  "uploads/profiles",
  "uploads/courses",
  "uploads/communities",
  "uploads/lessons",
];

uploadDirs.forEach((dir) => {
  const fullPath = path.join(__dirname, "../../", dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/profiles";

    if (file.fieldname === "courseThumbnail") {
      uploadPath = "uploads/courses";
    } else if (file.fieldname === "communityThumbnail") {
      uploadPath = "uploads/communities";
    } else if (file.fieldname === "lessonVideo") {
      uploadPath = "uploads/lessons";
    }

    const fullPath = path.join(__dirname, "../../", uploadPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to accept only certain file types
const fileFilter = (req, file, cb) => {
  // Allowed file types for different fields
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/quicktime"];

  if (file.fieldname === "lessonVideo") {
    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed for lessons"), false);
    }
  } else {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
};

// Create multer instance with limits
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for images
  },
});

module.exports = upload;
