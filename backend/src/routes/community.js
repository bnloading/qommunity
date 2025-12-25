const express = require("express");
const Community = require("../models/Community");
const User = require("../models/User");
const { auth: authenticate } = require("../middleware/auth");
const { checkPaymentForCreation } = require("../middleware/paymentGate");
const upload = require("../middleware/upload");

const router = express.Router();

// Get all communities with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const skip = (page - 1) * limit;

    let filter = { isActive: true };

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const communities = await Community.find(filter)
      .populate("creator", "firstName lastName profilePicture")
      .populate("members.user", "firstName lastName profilePicture")
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Community.countDocuments(filter);

    res.json({
      success: true,
      communities,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get single community
router.get("/:communityId", async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId)
      .populate("creator", "firstName lastName profilePicture bio email")
      .populate("members.user", "firstName lastName profilePicture bio email");

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    res.json({
      success: true,
      community,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Create new community (with payment gate)
router.post(
  "/create",
  authenticate,
  checkPaymentForCreation,
  upload.single("thumbnail"),
  async (req, res) => {
    try {
      const { name, description, category, isPremium, premiumPrice, rules } =
        req.body;

      // Only teachers and admins can create communities
      const user = await User.findById(req.user.id);
      if (user.role !== "teacher" && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only teachers can create communities",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Community thumbnail is required",
        });
      }

      const slug = name.toLowerCase().replace(/\s+/g, "-");

      const community = new Community({
        name,
        slug,
        description,
        category,
        isPremium: isPremium === "true",
        premiumPrice: isPremium === "true" ? premiumPrice : 0,
        rules: rules ? JSON.parse(rules) : [],
        thumbnail: `/uploads/communities/${req.file.filename}`,
        creator: req.user.id,
        members: [
          {
            user: req.user.id,
            role: "admin",
          },
        ],
      });

      await community.save();
      await community.populate("creator", "firstName lastName profilePicture");
      await community.populate(
        "members.user",
        "firstName lastName profilePicture"
      );

      res.status(201).json({
        success: true,
        message: "Community created successfully",
        community,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Join community
router.post("/:communityId/join", authenticate, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if already a member
    const isMember = community.members.some(
      (m) => m.user.toString() === req.user.id
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "Already a member of this community",
      });
    }

    // Check member limit
    if (
      community.maxMembers &&
      community.members.length >= community.maxMembers
    ) {
      return res.status(400).json({
        success: false,
        message: "Community has reached maximum members",
      });
    }

    community.members.push({
      user: req.user.id,
      role: "member",
    });

    community.lastActivityAt = new Date();
    await community.save();

    await community.populate(
      "members.user",
      "firstName lastName profilePicture"
    );

    res.json({
      success: true,
      message: "Joined community successfully",
      community,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Leave community
router.post("/:communityId/leave", authenticate, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    community.members = community.members.filter(
      (m) => m.user.toString() !== req.user.id
    );

    community.lastActivityAt = new Date();
    await community.save();

    res.json({
      success: true,
      message: "Left community successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update community (creator/admin only)
router.put("/:communityId", authenticate, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is creator or admin
    const isAdmin = community.members.some(
      (m) =>
        m.user.toString() === req.user.id &&
        (m.role === "admin" || m.role === "moderator")
    );

    if (!isAdmin && community.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this community",
      });
    }

    const {
      name,
      description,
      category,
      isPremium,
      premiumPrice,
      maxMembers,
      rules,
    } = req.body;

    if (name) community.name = name;
    if (description) community.description = description;
    if (category) community.category = category;
    if (isPremium !== undefined) community.isPremium = isPremium;
    if (premiumPrice !== undefined) community.premiumPrice = premiumPrice;
    if (maxMembers !== undefined) community.maxMembers = maxMembers;
    if (rules) community.rules = rules;

    community.updatedAt = new Date();
    await community.save();

    res.json({
      success: true,
      message: "Community updated successfully",
      community,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete community (creator only)
router.delete("/:communityId", authenticate, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only creator can delete community",
      });
    }

    await Community.findByIdAndDelete(req.params.communityId);

    res.json({
      success: true,
      message: "Community deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's communities
router.get("/user/joined", authenticate, async (req, res) => {
  try {
    const communities = await Community.find({
      "members.user": req.user.id,
    })
      .populate("creator", "firstName lastName profilePicture")
      .populate("members.user", "firstName lastName profilePicture")
      .sort({ lastActivityAt: -1 });

    res.json({
      success: true,
      communities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
