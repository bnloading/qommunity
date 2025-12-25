const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// GET posts from people you follow
router.get("/following", auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    // Get current user's following list
    const currentUser = await User.findById(req.user._id).select("following");
    const followingIds = currentUser?.following || [];

    // Include user's own posts
    const authorIds = [...followingIds, req.user._id];

    const posts = await Post.find({
      isPublished: true,
      author: { $in: authorIds },
    })
      .populate("author", "firstName lastName profilePicture email")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "firstName lastName profilePicture",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({
      isPublished: true,
      author: { $in: authorIds },
    });

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET all posts (feed)
router.get("/", auth, async (req, res) => {
  try {
    const page = req.query.page || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ isPublished: true })
      .populate("author", "firstName lastName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "firstName lastName profilePicture",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ isPublished: true });

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET single post
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate("author", "firstName lastName profilePicture")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "firstName lastName profilePicture",
        },
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE new post
router.post("/", auth, async (req, res) => {
  try {
    const { content, image, groupId, courseId, tags } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Post content is required",
      });
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      image: image || null,
      group: groupId || null,
      course: courseId || null,
      tags: tags || [],
    });

    await post.populate("author", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE post
router.put("/:id", auth, async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check authorization
    if (post.author.toString() !== req.user._id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post",
      });
    }

    const { content, image, tags } = req.body;

    post = await Post.findByIdAndUpdate(
      req.params.id,
      { content, image, tags },
      { new: true }
    ).populate("author", "firstName lastName profilePicture");

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE post
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check authorization
    if (post.author.toString() !== req.user._id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post",
      });
    }

    // Delete associated comments
    await Comment.deleteMany({ post: req.params.id });

    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// LIKE post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if already liked
    const likeIndex = post.likes.findIndex(
      (like) => like.user.toString() === req.user._id
    );

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push({
        user: req.user._id,
        createdAt: new Date(),
      });

      // Send notification to post author (if not self-like)
      if (post.author.toString() !== req.user._id.toString()) {
        const Notification = require("../models/Notification");
        const user = await User.findById(req.user._id);
        await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: "post_like",
          title: `${user.firstName} ${user.lastName} liked your post`,
          message: post.content?.substring(0, 100) || "Your post got a like!",
          relatedPost: post._id,
          relatedCommunity: post.community || null,
        });
      }
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: likeIndex > -1 ? "Post unliked" : "Post liked",
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
