const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const { auth } = require("../middleware/auth");

// GET all comments for a post
router.get("/:postId", auth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate("author", "firstName lastName profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE new comment
router.post("/:postId", auth, async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    // Check if post exists
    const post = await Post.findById(req.params.postId).populate(
      "author",
      "firstName lastName"
    );
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = await Comment.create({
      post: req.params.postId,
      author: req.user.id,
      content,
      image: image || null,
    });

    await comment.populate("author", "firstName lastName profilePicture");

    // Add comment to post
    post.comments.push(comment._id);
    await post.save();

    // Send notification to post author (if not commenting on own post)
    if (post.author._id.toString() !== req.user.id.toString()) {
      const Notification = require("../models/Notification");
      const User = require("../models/User");
      const commenter = await User.findById(req.user.id);
      await Notification.create({
        recipient: post.author._id,
        sender: req.user.id,
        type: "comment",
        title: `${commenter.firstName} ${commenter.lastName} commented on your post`,
        message: content.substring(0, 100),
        relatedPost: post._id,
        relatedComment: comment._id,
        relatedCommunity: post.community || null,
      });
    }

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE comment
router.put("/:id", auth, async (req, res) => {
  try {
    let comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check authorization
    if (
      comment.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this comment",
      });
    }

    const { content, image } = req.body;

    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { content, image },
      { new: true }
    ).populate("author", "firstName lastName profilePicture");

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE comment
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check authorization
    if (
      comment.author.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    // Remove from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: req.params.id },
    });

    await Comment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// LIKE comment
router.post("/:id/like", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Check if already liked
    const likeIndex = comment.likes.findIndex(
      (like) => like.user.toString() === req.user.id
    );

    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push({
        user: req.user.id,
        createdAt: new Date(),
      });
    }

    await comment.save();

    res.status(200).json({
      success: true,
      message: likeIndex > -1 ? "Comment unliked" : "Comment liked",
      comment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
