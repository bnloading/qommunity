const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      required: true,
    },
    videoThumbnail: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      required: true,
    },
    resources: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: ["pdf", "link", "document"],
        },
      },
    ],
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      default: null,
    },
    attachments: [String],
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

module.exports = mongoose.model("Lesson", lessonSchema);
