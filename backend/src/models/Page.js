const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      default: "New page",
    },
    content: {
      type: String,
      default: "",
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
    dripStatus: {
      enabled: {
        type: Boolean,
        default: false,
      },
      unlockDate: {
        type: Date,
        default: null,
      },
      unlockAfterDays: {
        type: Number,
        default: null,
      },
    },
    media: [
      {
        type: {
          type: String,
          enum: ["image", "video", "file"],
        },
        url: String,
        name: String,
        size: Number,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    completionPercentage: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

pageSchema.index({ course: 1, order: 1 });
pageSchema.index({ folder: 1 });

module.exports = mongoose.model("Page", pageSchema);
