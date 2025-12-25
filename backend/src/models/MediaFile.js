const mongoose = require("mongoose");

const mediaFileSchema = new mongoose.Schema(
  {
    // File owner
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Optional community/course reference
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    page: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
    },

    // File details
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },

    // File type categorization
    type: {
      type: String,
      enum: ["image", "video", "audio", "document", "other"],
      required: true,
    },

    // Optional metadata
    duration: Number, // For video/audio
    width: Number, // For images/videos
    height: Number, // For images/videos
    thumbnail: String, // Thumbnail URL for videos

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Usage tracking
    usedIn: [
      {
        type: {
          type: String,
          enum: ["page", "post", "lesson", "community"],
        },
        refId: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  { timestamps: true }
);

// Indexes
mediaFileSchema.index({ user: 1, type: 1 });
mediaFileSchema.index({ community: 1 });
mediaFileSchema.index({ course: 1 });
mediaFileSchema.index({ createdAt: -1 });

module.exports = mongoose.model("MediaFile", mediaFileSchema);
