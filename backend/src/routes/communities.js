const express = require("express");
const router = express.Router();
const Community = require("../models/Community");
const { auth } = require("../middleware/auth");

// GET all communities
router.get("/", async (req, res) => {
  try {
    const communities = await Community.find()
      .populate("creator", "firstName lastName profilePicture email")
      .populate("members.user", "firstName lastName profilePicture email")
      .sort({ createdAt: -1 });

    // Add computed name field for easier access
    const communitiesWithNames = communities.map((community) => {
      const communityObj = community.toObject();
      if (communityObj.creator) {
        communityObj.creator.name = `${communityObj.creator.firstName || ""} ${
          communityObj.creator.lastName || ""
        }`.trim();
      }
      return communityObj;
    });

    res.status(200).json({
      success: true,
      communities: communitiesWithNames,
    });
  } catch (error) {
    console.error("Error fetching communities:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET community by slug
router.get("/:slug", async (req, res) => {
  try {
    const community = await Community.findOne({ slug: req.params.slug })
      .populate("creator", "firstName lastName profilePicture email name")
      .populate("members.user", "firstName lastName profilePicture email name");

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    res.status(200).json({
      success: true,
      community,
    });
  } catch (error) {
    console.error("Error fetching community by slug:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE new community
router.post("/", auth, async (req, res) => {
  try {
    const {
      name,
      slug,
      shortDescription,
      description,
      category,
      coverImage,
      logo,
    } = req.body;

    // Check if slug already exists
    const existingCommunity = await Community.findOne({ slug });
    if (existingCommunity) {
      return res.status(400).json({
        success: false,
        message: "URL slug already taken",
      });
    }

    const community = await Community.create({
      name,
      slug,
      description: description || shortDescription,
      thumbnail: coverImage || logo || "",
      category,
      creator: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "admin",
          joinedAt: new Date(),
        },
      ],
    });

    await community.populate("creator", "firstName lastName profilePicture");

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
});

// JOIN community
router.post("/:id/join", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if already a member
    const isMember = community.members.some((member) => {
      if (!member) return false;
      const memberId = member.user?._id || member.user || member._id || member;
      return memberId && memberId.toString() === req.user._id.toString();
    });

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "Already a member of this community",
      });
    }

    // Add member with proper structure
    community.members.push({
      user: req.user._id,
      joinedAt: new Date(),
      role: "member",
    });
    await community.save();

    res.status(200).json({
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

// Check membership status and auto-add creator if missing
router.post("/:id/check-membership", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    let fixed = false;

    // Fix: Set creator if missing
    if (!community.creator) {
      console.log("⚠️ Community missing creator, setting to:", req.user._id);
      community.creator = req.user._id;
      fixed = true;
    }

    // Fix: Clean up null members and fix member structure
    const validMembers = [];
    for (const member of community.members) {
      if (!member) continue; // Skip null entries

      // If member has user field, keep it
      if (member.user) {
        validMembers.push(member);
      } else if (member._id) {
        // If member only has _id, convert to proper structure
        validMembers.push({
          user: member._id,
          role: member.role || "member",
          joinedAt: member.joinedAt || new Date(),
        });
        fixed = true;
      }
    }

    const isCreator =
      community.creator &&
      community.creator.toString() === req.user._id.toString();
    const isMember = validMembers.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === req.user._id.toString();
    });

    // If user is creator but not in members array, add them
    if (isCreator && !isMember) {
      console.log("✅ Adding creator to members array");
      validMembers.push({
        user: req.user._id,
        joinedAt: new Date(),
        role: "admin",
      });
      fixed = true;
    }

    // Save fixed members array
    if (fixed) {
      community.members = validMembers;
      await community.save();
      console.log("✅ Community fixed and saved");

      return res.status(200).json({
        success: true,
        message: "Community membership fixed",
        isCreator,
        isMember: true,
        membershipFixed: true,
        fixedIssues: {
          setCreator: !community.creator,
          cleanedMembers: true,
          addedCreatorAsMember: isCreator && !isMember,
        },
      });
    }

    res.status(200).json({
      success: true,
      isCreator,
      isMember,
      canCreateCourses: isCreator || isMember,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE community
router.put("/:id", auth, async (req, res) => {
  try {
    let community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is creator
    const isCreator = community.creator.toString() === req.user._id.toString();

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this community",
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      "name",
      "description",
      "icon",
      "coverImage",
      "customUrl",
      "isPrivate",
      "showInDiscovery",
      "category",
      "rules",
      "pricingModel",
      "pricingAmount",
      "hasTrial",
      "trialDays",
      "affiliatesEnabled",
      "affiliateCommissionRate",
      "affiliateCookieDuration",
      "postCategories",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        community[field] = req.body[field];
      }
    });

    await community.save();

    res.status(200).json({
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

// UPDATE community settings (dedicated endpoint for settings modal)
router.put("/:id/settings", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is creator
    const isCreator = community.creator.toString() === req.user._id.toString();

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the creator can update settings",
      });
    }

    // Update settings based on the tab
    const { tab, data } = req.body;

    switch (tab) {
      case "general":
        community.name = data.name || community.name;
        community.description = data.description || community.description;
        community.icon = data.icon || community.icon;
        community.coverImage = data.coverImage || community.coverImage;
        community.customUrl = data.customUrl || community.customUrl;
        community.isPrivate =
          data.isPrivate !== undefined ? data.isPrivate : community.isPrivate;
        break;

      case "discovery":
        community.showInDiscovery =
          data.showInDiscovery !== undefined
            ? data.showInDiscovery
            : community.showInDiscovery;
        community.category = data.category || community.category;
        break;

      case "pricing":
        community.pricingModel = data.pricingModel || community.pricingModel;
        community.pricingAmount =
          data.pricingAmount !== undefined
            ? data.pricingAmount
            : community.pricingAmount;
        community.hasTrial =
          data.hasTrial !== undefined ? data.hasTrial : community.hasTrial;
        community.trialDays = data.trialDays || community.trialDays;
        break;

      case "affiliates":
        community.affiliatesEnabled =
          data.affiliatesEnabled !== undefined
            ? data.affiliatesEnabled
            : community.affiliatesEnabled;
        community.affiliateCommissionRate =
          data.affiliateCommissionRate || community.affiliateCommissionRate;
        community.affiliateCookieDuration =
          data.affiliateCookieDuration || community.affiliateCookieDuration;
        break;

      case "categories":
        community.postCategories =
          data.postCategories || community.postCategories;
        break;

      case "rules":
        community.rules = data.rules || community.rules;
        break;

      default:
        // For other tabs, update all provided fields
        Object.keys(data).forEach((key) => {
          if (community[key] !== undefined) {
            community[key] = data[key];
          }
        });
    }

    await community.save();

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      community,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// DELETE community
router.delete("/:id", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is creator
    if (community.creator.toString() !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: "Only creator can delete this community",
      });
    }

    await Community.findByIdAndDelete(req.params.id);

    res.status(200).json({
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

// GET posts for a specific community
router.get("/:id/posts", async (req, res) => {
  try {
    const Post = require("../models/Post");
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({
      community: req.params.id,
      isPublished: true,
    })
      .populate("author", "firstName lastName profilePicture email name")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "firstName lastName profilePicture name",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({
      community: req.params.id,
      isPublished: true,
    });

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching community posts:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE post for a specific community
router.post("/:id/posts", auth, async (req, res) => {
  try {
    const Post = require("../models/Post");
    const { content, image, category, title } = req.body;

    console.log("📝 Creating post, req.user:", req.user);

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated properly. Please log in again.",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Post content is required",
      });
    }

    // Check if user is a member
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const isMember = community.members.some(
      (member) =>
        member.user?.toString() === req.user._id.toString() ||
        member._id?.toString() === req.user._id.toString() ||
        member.toString() === req.user._id.toString()
    );

    const isCreator = community.creator.toString() === req.user._id.toString();

    if (!isMember && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "You must be a member to post",
      });
    }

    const post = await Post.create({
      author: req.user._id,
      content,
      image: image || null,
      community: req.params.id,
      category: category || "",
      title: title || "",
    });

    await post.populate(
      "author",
      "firstName lastName profilePicture email name"
    );

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Error creating community post:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET courses for a specific community
router.get("/:id/courses", async (req, res) => {
  try {
    const Course = require("../models/Course");

    const courses = await Course.find({
      community: req.params.id,
      isPublished: true,
    })
      .select(
        "title slug description thumbnail category level price rating enrolledUsers lessons"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error("Error fetching community courses:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE course for a specific community
router.post("/:id/courses", auth, async (req, res) => {
  try {
    const Course = require("../models/Course");
    const User = require("../models/User");
    const { title, description, category, level, price, thumbnail } = req.body;

    console.log("📚 Creating course, req.user:", req.user);

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated properly",
      });
    }

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    // Get full user details
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is a member
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Check if user is creator or member
    const isCreator =
      community.creator && community.creator.toString() === user._id.toString();

    console.log("🔍 Membership check:");
    console.log("User ID:", user._id.toString());
    console.log("Creator ID:", community.creator?.toString());
    console.log("Is Creator:", isCreator);
    console.log("Members array:", JSON.stringify(community.members, null, 2));

    const isMember = community.members.some((member) => {
      if (!member) return false;
      const memberId = member.user?._id || member.user || member._id || member;
      const isMatch = memberId && memberId.toString() === user._id.toString();
      console.log(`Checking member: ${memberId} === ${user._id} -> ${isMatch}`);
      return isMatch;
    });

    console.log("Is Member:", isMember);

    // Allow creator or admin to create courses
    const isAdmin = community.members.some((member) => {
      if (!member) return false;
      const memberId = member.user?._id || member.user || member._id || member;
      return (
        memberId &&
        memberId.toString() === user._id.toString() &&
        member.role === "admin"
      );
    });

    console.log("Is Admin:", isAdmin);

    if (!isCreator && !isAdmin) {
      // If user is the creator but not in members array, auto-add them
      if (
        community.creator &&
        community.creator.toString() === user._id.toString()
      ) {
        console.log("✅ Auto-adding creator as admin member");
        community.members.push({
          user: user._id,
          joinedAt: new Date(),
          role: "admin",
        });
        await community.save();
      } else {
        return res.status(403).json({
          success: false,
          message: "Only community owner or admins can create courses",
        });
      }
    }

    // Generate slug from title
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Date.now();

    const course = await Course.create({
      community: req.params.id,
      title,
      slug,
      description,
      thumbnail:
        thumbnail ||
        "https://via.placeholder.com/400x300?text=" + encodeURIComponent(title),
      category: category || "other",
      level: level || "beginner",
      price: price || 0,
      instructor: {
        id: user._id,
        clerkId: user.clerkId || "local_user",
        name:
          user.name ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          user.email,
        profilePicture: user.profilePicture || "",
      },
      isPublished: true,
      lessons: [],
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.error("Error creating community course:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET events for a specific community
router.get("/:id/events", async (req, res) => {
  try {
    const Event = require("../models/Event");

    const events = await Event.find({
      community: req.params.id,
    })
      .populate("createdBy", "firstName lastName email name")
      .sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Error fetching community events:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// CREATE event for a specific community
router.post("/:id/events", auth, async (req, res) => {
  try {
    const Event = require("../models/Event");
    const { title, description, startTime, endTime, type, link } = req.body;

    if (!title || !startTime) {
      return res.status(400).json({
        success: false,
        message: "Title and start time are required",
      });
    }

    // Check if user is a member
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const isMember = community.members.some(
      (member) =>
        member.user?.toString() === req.user._id ||
        member._id?.toString() === req.user._id ||
        member.toString() === req.user._id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You must be a member to create events",
      });
    }

    const event = await Event.create({
      community: req.params.id,
      title,
      description: description || "",
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      type: type || "other",
      link: link || "",
      createdBy: req.user._id,
    });

    await event.populate("createdBy", "firstName lastName email name");

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Error creating community event:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET member role in community
router.get("/:id/member-role", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const isCreator = community.creator?.toString() === req.user._id.toString();

    // Find member in community
    const member = community.members.find((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.toString() === req.user._id.toString();
    });

    let role = "none";
    if (isCreator) {
      role = "owner";
    } else if (member) {
      role = member.role || "member";
    }

    res.status(200).json({
      success: true,
      role,
      isCreator,
      isMember: !!member,
      canManageMembers: isCreator || role === "admin",
      canCreateCourses: isCreator || role === "admin" || role === "moderator",
      canModerate: isCreator || role === "admin" || role === "moderator",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// UPDATE member role
router.put("/:id/members/:userId/role", auth, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["member", "moderator", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be member, moderator, or admin",
      });
    }

    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Only owner or admin can change roles
    const isCreator = community.creator?.toString() === req.user._id.toString();
    const currentUserMember = community.members.find((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.toString() === req.user._id.toString();
    });
    const isAdmin = currentUserMember?.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only owner or admin can change member roles",
      });
    }

    // Find target member
    const targetMemberIndex = community.members.findIndex((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.toString() === req.params.userId;
    });

    if (targetMemberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Member not found in community",
      });
    }

    // Can't change owner's role
    if (community.creator?.toString() === req.params.userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot change the owner's role",
      });
    }

    // Admins can't promote to admin (only owner can)
    if (role === "admin" && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "Only the owner can promote to admin",
      });
    }

    community.members[targetMemberIndex].role = role;
    await community.save();

    // Create notification for role change
    const Notification = require("../models/Notification");
    await Notification.create({
      recipient: req.params.userId,
      sender: req.user._id,
      type: "role_change",
      title: `Your role was changed to ${role}`,
      message: `You are now a ${role} in ${community.name}`,
      relatedCommunity: community._id,
    });

    res.status(200).json({
      success: true,
      message: `Member role updated to ${role}`,
      member: community.members[targetMemberIndex],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// REMOVE member from community
router.delete("/:id/members/:userId", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const isCreator = community.creator?.toString() === req.user._id.toString();
    const currentUserMember = community.members.find((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.toString() === req.user._id.toString();
    });
    const isAdmin = currentUserMember?.role === "admin";
    const isModerator = currentUserMember?.role === "moderator";

    // User removing themselves (leaving)
    const isSelfRemoval = req.params.userId === req.user._id.toString();

    // Can't remove owner
    if (community.creator?.toString() === req.params.userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot remove the owner from the community",
      });
    }

    // Check permissions
    if (!isSelfRemoval && !isCreator && !isAdmin && !isModerator) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to remove members",
      });
    }

    // Find target member
    const targetMember = community.members.find((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.toString() === req.params.userId;
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        message: "Member not found in community",
      });
    }

    // Moderators can only remove regular members
    if (isModerator && !isCreator && !isAdmin) {
      if (targetMember.role === "admin" || targetMember.role === "moderator") {
        return res.status(403).json({
          success: false,
          message: "Moderators can only remove regular members",
        });
      }
    }

    // Admins can't remove other admins (only owner can)
    if (isAdmin && !isCreator && targetMember.role === "admin") {
      return res.status(403).json({
        success: false,
        message: "Only the owner can remove admins",
      });
    }

    // Remove member
    community.members = community.members.filter((m) => {
      const memberId = m.user?._id || m.user;
      return !(memberId && memberId.toString() === req.params.userId);
    });

    await community.save();

    res.status(200).json({
      success: true,
      message: isSelfRemoval
        ? "Left community successfully"
        : "Member removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET all members of a community
router.get("/:id/members", async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate("members.user", "firstName lastName profilePicture email bio")
      .populate("creator", "firstName lastName profilePicture email bio");

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    // Format members with role info
    const members = community.members.map((m) => ({
      user: m.user,
      role:
        community.creator?._id?.toString() === m.user?._id?.toString()
          ? "owner"
          : m.role || "member",
      joinedAt: m.joinedAt,
    }));

    // Add creator if not in members
    const creatorInMembers = members.some(
      (m) => m.user?._id?.toString() === community.creator?._id?.toString()
    );

    if (!creatorInMembers && community.creator) {
      members.unshift({
        user: community.creator,
        role: "owner",
        joinedAt: community.createdAt,
      });
    }

    res.status(200).json({
      success: true,
      members,
      totalMembers: members.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
