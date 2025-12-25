const express = require("express");
const router = express.Router();
const Group = require("../models/Group");
const { auth } = require("../middleware/auth");
const slugify = require("slugify");

// GET all groups
router.get("/", auth, async (req, res) => {
  try {
    const groups = await Group.find({ isPrivate: false })
      .populate("creator", "firstName lastName profilePicture")
      .populate({
        path: "members.user",
        select: "firstName lastName profilePicture",
      });

    res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET single group
router.get("/:slug", auth, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slug })
      .populate("creator", "firstName lastName profilePicture")
      .populate("posts")
      .populate({
        path: "members.user",
        select: "firstName lastName profilePicture",
      });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    res.status(200).json({
      success: true,
      group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE new group
router.post("/", auth, async (req, res) => {
  try {
    const { name, description, icon, isPrivate, rules } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Name and description are required",
      });
    }

    // Check if group already exists
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "Group already exists",
      });
    }

    const group = await Group.create({
      name,
      description,
      slug: slugify(name, { lower: true }),
      icon: icon || "📌",
      creator: req.user.id,
      members: [
        {
          user: req.user.id,
          role: "admin",
        },
      ],
      isPrivate: isPrivate || false,
      rules: rules || [],
    });

    await group.populate("creator", "firstName lastName profilePicture");

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// JOIN group
router.post("/:slugId/join", auth, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slugId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if already member
    const isMember = group.members.find(
      (m) => m.user.toString() === req.user.id
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "Already a member of this group",
      });
    }

    group.members.push({
      user: req.user.id,
      role: "member",
    });

    await group.save();

    res.status(200).json({
      success: true,
      message: "Joined group successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// LEAVE group
router.post("/:slugId/leave", auth, async (req, res) => {
  try {
    const group = await Group.findOne({ slug: req.params.slugId });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    group.members = group.members.filter(
      (m) => m.user.toString() !== req.user.id
    );

    await group.save();

    res.status(200).json({
      success: true,
      message: "Left group successfully",
      group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
