const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");

// GET all notifications for current user
router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const unreadOnly = req.query.unread === "true";

    const filter = { recipient: req.user._id };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate("sender", "firstName lastName profilePicture")
      .populate("relatedPost", "content")
      .populate("relatedComment", "content")
      .populate("relatedCommunity", "name slug thumbnail")
      .populate("relatedCourse", "title thumbnail")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET unread count only
router.get("/unread-count", auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// MARK notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// MARK all notifications as read
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE a notification
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await Notification.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE all notifications for user
router.delete("/", auth, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });

    res.status(200).json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE notification (internal helper - usually called from other routes)
router.post("/", auth, async (req, res) => {
  try {
    const {
      recipientId,
      type,
      title,
      message,
      relatedPost,
      relatedComment,
      relatedCommunity,
      relatedCourse,
    } = req.body;

    if (!recipientId || !type || !title) {
      return res.status(400).json({
        success: false,
        message: "recipientId, type, and title are required",
      });
    }

    const notification = await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type,
      title,
      message: message || "",
      relatedPost: relatedPost || null,
      relatedComment: relatedComment || null,
      relatedCommunity: relatedCommunity || null,
      relatedCourse: relatedCourse || null,
    });

    await notification.populate("sender", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Notification created",
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
