const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "post_like",
        "comment",
        "comment_reply",
        "follow",
        "course_enrollment",
        "new_lesson",
        "lesson_complete",
        "message",
        "announcement",
        "community_join",
        "community_invite",
        "role_change",
      ],
      required: true,
    },
    title: String,
    message: String,
    link: String,
    relatedModel: String,
    relatedId: mongoose.Schema.Types.ObjectId,
    relatedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    relatedComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    relatedCommunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      default: null,
    },
    relatedCourse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    relatedLesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lesson",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: { expires: 2592000 }, // Auto-delete after 30 days
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
