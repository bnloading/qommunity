const express = require("express");
const Message = require("../models/Message");
const Community = require("../models/Community");
const { auth } = require("../middleware/auth");
const router = express.Router();

// Get messages for a community/room
router.get("/messages/:communityId", auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { room: req.params.communityId },
        { community: req.params.communityId },
      ],
    })
      .populate("sender", "firstName lastName profilePicture")
      .populate("likes", "firstName lastName")
      .populate("replies.sender", "firstName lastName")
      .sort({ createdAt: 1 })
      .limit(100);

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      sender: msg.sender?._id,
      senderName: msg.sender
        ? `${msg.sender.firstName} ${msg.sender.lastName}`
        : "Anonymous",
      message: msg.content,
      timestamp: msg.createdAt,
      likes: msg.likes?.length || 0,
      replies: msg.replies?.length || 0,
    }));

    res.status(200).json({
      success: true,
      count: formattedMessages.length,
      messages: formattedMessages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Post message to community
router.post("/message", auth, async (req, res) => {
  try {
    const { community, message, messageType, fileUrl } = req.body;

    // Verify user is member of community
    const communityDoc = await Community.findById(community);
    if (!communityDoc) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    if (!communityDoc.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You must be a member to post messages",
      });
    }

    const newMessage = await Message.create({
      sender: req.user.id,
      room: community,
      community: community,
      content: message,
      messageType: messageType || "text",
      fileUrl,
    });

    await newMessage.populate("sender", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Message posted successfully",
      data: newMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Legacy route for backward compatibility
router.get("/:room", auth, async (req, res) => {
  try {
    const messages = await Message.find({ room: req.params.room })
      .populate("sender", "firstName lastName profilePicture")
      .populate("likes", "firstName lastName")
      .populate("replies.sender", "firstName lastName")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Legacy post route
router.post("/", auth, async (req, res) => {
  try {
    const { room, content, messageType, fileUrl } = req.body;

    const message = await Message.create({
      sender: req.user.id,
      room,
      content,
      messageType,
      fileUrl,
    });

    await message.populate("sender", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Message posted successfully",
      data: message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Like message
router.post("/:id/like", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.likes.includes(req.user.id)) {
      message.likes.pull(req.user.id);
    } else {
      message.likes.push(req.user.id);
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: "Like updated",
      likes: message.likes.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reply to message
router.post("/:id/reply", auth, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    message.replies.push({
      sender: req.user.id,
      content,
      createdAt: new Date(),
    });

    await message.save();
    await message.populate("replies.sender", "firstName lastName");

    res.status(201).json({
      success: true,
      message: "Reply added successfully",
      replies: message.replies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
