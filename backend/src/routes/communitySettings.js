const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const crypto = require("crypto");
const Community = require("../models/Community");
const Post = require("../models/Post");
const Course = require("../models/Course");
const User = require("../models/User");
const UserSubscription = require("../models/UserSubscription");
const Payment = require("../models/Payment");
const Invite = require("../models/Invite");
const InviteLog = require("../models/InviteLog");
const Affiliate = require("../models/Affiliate");
const Payout = require("../models/Payout");
const RuleAcceptance = require("../models/RuleAcceptance");
const CommunityBilling = require("../models/CommunityBilling");
const { auth } = require("../middleware/auth");
const { stripeClient } = require("../config/stripe");

// Middleware to check if user is community owner or admin
const checkCommunityAdmin = async (req, res, next) => {
  try {
    const communityId = req.params.communityId || req.params.id;
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const userId = req.user._id.toString();
    const isCreator = community.creator?.toString() === userId;
    const member = community.members.find((m) => m.user?.toString() === userId);
    const isAdmin = member?.role === "admin";

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Owners and admins only.",
      });
    }

    req.community = community;
    req.isOwner = isCreator;
    req.isAdmin = isAdmin;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check owner only (for payouts, billing)
const checkCommunityOwner = async (req, res, next) => {
  try {
    const communityId = req.params.communityId || req.params.id;
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: "Community not found",
      });
    }

    const userId = req.user._id.toString();
    const isCreator = community.creator?.toString() === userId;

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Owner only.",
      });
    }

    req.community = community;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================
// 1️⃣ DASHBOARD - Real-time aggregated statistics
// =============================================

router.get(
  "/:communityId/dashboard",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const community = req.community;

      // Use aggregation pipelines for performance
      const [membersStats, postsCount, coursesCount, revenueStats] =
        await Promise.all([
          // Members stats
          (async () => {
            const total = community.members.length;
            const paidMembers = await UserSubscription.countDocuments({
              community: communityId,
              status: { $in: ["active", "trialing"] },
            });
            return { total, paid: paidMembers };
          })(),

          // Posts count
          Post.countDocuments({ community: communityId }),

          // Courses count
          Course.countDocuments({ community: communityId }),

          // Revenue stats (MRR)
          (async () => {
            const billing = await CommunityBilling.findOne({
              community: communityId,
            });
            const activeSubscriptions = await UserSubscription.find({
              community: communityId,
              status: "active",
            });

            let mrr = 0;
            for (const sub of activeSubscriptions) {
              if (sub.interval === "year") {
                mrr += sub.amount / 12;
              } else {
                mrr += sub.amount;
              }
            }

            return {
              mrr: Math.round(mrr),
              totalRevenue: billing?.totalRevenue || 0,
              activeSubscriptions: activeSubscriptions.length,
            };
          })(),
        ]);

      // Get recent activity
      const recentPosts = await Post.find({ community: communityId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("author", "firstName lastName profilePicture");

      const recentMembers = community.members
        .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
        .slice(0, 5);

      res.json({
        success: true,
        dashboard: {
          totalMembers: membersStats.total,
          paidMembers: membersStats.paid,
          totalPosts: postsCount,
          totalCourses: coursesCount,
          mrr: revenueStats.mrr,
          totalRevenue: revenueStats.totalRevenue,
          activeSubscriptions: revenueStats.activeSubscriptions,
          recentPosts,
          recentMembers,
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 2️⃣ INVITES - Generate and manage invite links
// =============================================

// Get all invites for community
router.get(
  "/:communityId/invites",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const invites = await Invite.find({ community: req.params.communityId })
        .populate("createdBy", "firstName lastName email")
        .populate("usedBy.user", "firstName lastName email")
        .sort({ createdAt: -1 });

      res.json({ success: true, invites });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Create invite link
router.post(
  "/:communityId/invites",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { role, expiresIn, maxUses, name, skipPayment } = req.body;
      const { communityId } = req.params;

      // Calculate expiration date
      let expiresAt = null;
      if (expiresIn) {
        const now = new Date();
        switch (expiresIn) {
          case "1h":
            expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
            break;
          case "24h":
            expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case "7d":
            expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
          case "never":
          default:
            expiresAt = null;
        }
      }

      const invite = await Invite.create({
        community: communityId,
        createdBy: req.user._id,
        role: role || "member",
        expiresAt,
        maxUses: maxUses || null,
        name: name || "",
        skipPayment: skipPayment || false,
      });

      // Log the action
      await InviteLog.create({
        invite: invite._id,
        community: communityId,
        action: "created",
        performedBy: req.user._id,
        metadata: { role, expiresAt, maxUses },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      const baseUrl = process.env.CLIENT_URL || "http://localhost:3000";
      invite.url = `${baseUrl}/invite/${invite.token}`;

      res.status(201).json({
        success: true,
        invite: {
          ...invite.toObject(),
          url: `${baseUrl}/invite/${invite.token}`,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Validate and use invite
router.post("/invites/:token/use", auth, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user._id;

    const invite = await Invite.findOne({ token }).populate("community");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite link",
      });
    }

    // Check if invite is valid
    if (!invite.isValid()) {
      await InviteLog.create({
        invite: invite._id,
        community: invite.community._id,
        action: "expired",
        targetUser: userId,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      return res.status(400).json({
        success: false,
        message: "This invite link has expired or reached its limit",
      });
    }

    const community = invite.community;

    // Check if already a member
    const isMember = community.members.some(
      (m) => m.user?.toString() === userId.toString()
    );

    if (isMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this community",
      });
    }

    // Check if paid community requires payment
    if (community.isPremium && !invite.skipPayment) {
      return res.status(402).json({
        success: false,
        message: "This community requires payment to join",
        requiresPayment: true,
        communityId: community._id,
        communitySlug: community.slug,
      });
    }

    // Add user to community
    community.members.push({
      user: userId,
      role: invite.role,
      joinedAt: new Date(),
    });
    await community.save();

    // Update invite usage
    invite.usedCount += 1;
    invite.usedBy.push({ user: userId, usedAt: new Date() });
    await invite.save();

    // Log the action
    await InviteLog.create({
      invite: invite._id,
      community: community._id,
      action: "used",
      performedBy: userId,
      targetUser: userId,
      metadata: { role: invite.role },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    res.json({
      success: true,
      message: "Successfully joined the community",
      community: {
        _id: community._id,
        name: community.name,
        slug: community.slug,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get invite info (public - for invite page)
router.get("/invites/:token", async (req, res) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token })
      .populate(
        "community",
        "name slug thumbnail description isPremium monthlyPrice"
      )
      .populate("createdBy", "firstName lastName");

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite link",
      });
    }

    res.json({
      success: true,
      invite: {
        isValid: invite.isValid(),
        role: invite.role,
        expiresAt: invite.expiresAt,
        community: invite.community,
        createdBy: invite.createdBy,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke invite
router.delete(
  "/:communityId/invites/:inviteId",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const invite = await Invite.findOneAndUpdate(
        { _id: req.params.inviteId, community: req.params.communityId },
        { isActive: false },
        { new: true }
      );

      if (!invite) {
        return res.status(404).json({
          success: false,
          message: "Invite not found",
        });
      }

      await InviteLog.create({
        invite: invite._id,
        community: req.params.communityId,
        action: "revoked",
        performedBy: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ success: true, message: "Invite revoked" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get invite logs
router.get(
  "/:communityId/invites/logs",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const logs = await InviteLog.find({ community: req.params.communityId })
        .populate("invite")
        .populate("performedBy", "firstName lastName")
        .populate("targetUser", "firstName lastName")
        .sort({ createdAt: -1 })
        .limit(100);

      res.json({ success: true, logs });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 3️⃣ GENERAL - Community Settings
// =============================================

router.get(
  "/:communityId/settings",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const community = req.community;
      res.json({
        success: true,
        settings: {
          name: community.name,
          description: community.description,
          category: community.category,
          isPrivate: community.isPrivate,
          thumbnail: community.thumbnail,
          coverImage: community.coverImage,
          icon: community.icon,
          customUrl: community.customUrl,
          slug: community.slug,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  "/:communityId/settings",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { name, description, category, isPrivate, customUrl } = req.body;
      const community = req.community;

      // Validate name
      if (name && name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Community name must be at least 3 characters",
        });
      }

      // Check custom URL uniqueness
      if (customUrl && customUrl !== community.customUrl) {
        const existing = await Community.findOne({
          slug: customUrl.toLowerCase(),
          _id: { $ne: community._id },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "This URL is already taken",
          });
        }
      }

      // Update fields
      if (name) community.name = name;
      if (description !== undefined) community.description = description;
      if (category) community.category = category;
      if (typeof isPrivate === "boolean") community.isPrivate = isPrivate;
      if (customUrl) {
        community.customUrl = customUrl;
        community.slug = customUrl.toLowerCase();
      }

      community.updatedAt = new Date();
      await community.save();

      res.json({
        success: true,
        message: "Settings updated successfully",
        community,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Upload community image (FILE UPLOAD ONLY)
router.post(
  "/:communityId/settings/image",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      // This endpoint expects file upload via multer middleware
      // Image URLs are NOT allowed - only file uploads

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded. Image URLs are not allowed.",
        });
      }

      const { type } = req.body; // 'thumbnail', 'coverImage', or 'icon'
      const validTypes = ["thumbnail", "coverImage", "icon"];

      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid image type. Must be thumbnail, coverImage, or icon.",
        });
      }

      // Validate file type
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
        });
      }

      // Validate file size (5MB max)
      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
      }

      const community = req.community;
      community[type] = `/uploads/communities/${req.file.filename}`;
      await community.save();

      res.json({
        success: true,
        message: "Image uploaded successfully",
        imageUrl: community[type],
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 4️⃣ PAYOUTS - Stripe Connect integration
// =============================================

// Get payout info
router.get(
  "/:communityId/payouts",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const community = req.community;

      let stripeBalance = { available: 0, pending: 0 };
      let payoutHistory = [];

      // Get balance from Stripe if connected
      if (community.stripeAccountId) {
        try {
          const balance = await stripeClient.balance.retrieve({
            stripeAccount: community.stripeAccountId,
          });

          stripeBalance = {
            available: balance.available.reduce((sum, b) => sum + b.amount, 0),
            pending: balance.pending.reduce((sum, b) => sum + b.amount, 0),
          };

          // Get payout history from Stripe
          const stripePayouts = await stripeClient.payouts.list(
            {
              limit: 20,
            },
            {
              stripeAccount: community.stripeAccountId,
            }
          );

          payoutHistory = stripePayouts.data;
        } catch (stripeError) {
          console.error("Stripe error:", stripeError.message);
        }
      }

      // Get payouts from database
      const dbPayouts = await Payout.find({ community: communityId })
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({
        success: true,
        payouts: {
          stripeConnected: !!community.stripeAccountId,
          stripeAccountId: community.stripeAccountId,
          availableBalance: stripeBalance.available,
          pendingBalance: stripeBalance.pending,
          history: dbPayouts,
          stripePayouts: payoutHistory,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Connect Stripe account
router.post(
  "/:communityId/payouts/connect",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const community = req.community;
      const user = await User.findById(req.user._id);

      // Create Stripe Connect account if not exists
      if (!community.stripeAccountId) {
        const account = await stripeClient.accounts.create({
          type: "express",
          country: "US",
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            communityId: communityId,
            userId: user._id.toString(),
          },
        });

        community.stripeAccountId = account.id;
        await community.save();

        // Update billing record
        await CommunityBilling.findOneAndUpdate(
          { community: communityId },
          { stripeConnectAccountId: account.id },
          { upsert: true }
        );
      }

      // Create account link for onboarding
      const accountLink = await stripeClient.accountLinks.create({
        account: community.stripeAccountId,
        refresh_url: `${process.env.CLIENT_URL}/community/${community.slug}/settings/payouts?refresh=true`,
        return_url: `${process.env.CLIENT_URL}/community/${community.slug}/settings/payouts?success=true`,
        type: "account_onboarding",
      });

      res.json({
        success: true,
        url: accountLink.url,
      });
    } catch (error) {
      console.error("Stripe connect error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get Stripe dashboard link
router.get(
  "/:communityId/payouts/dashboard",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const community = req.community;

      if (!community.stripeAccountId) {
        return res.status(400).json({
          success: false,
          message: "No Stripe account connected",
        });
      }

      const loginLink = await stripeClient.accounts.createLoginLink(
        community.stripeAccountId
      );

      res.json({
        success: true,
        url: loginLink.url,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 5️⃣ PRICING - Subscription pricing settings
// =============================================

router.get(
  "/:communityId/pricing",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const community = req.community;
      const billing = await CommunityBilling.findOne({
        community: req.params.communityId,
      });

      res.json({
        success: true,
        pricing: {
          pricingModel: community.pricingModel,
          isPremium: community.isPremium,
          monthlyPrice: community.monthlyPrice,
          yearlyPrice: community.yearlyPrice,
          currency: community.currency,
          hasTrial: community.hasTrial,
          trialDays: community.trialDays,
          stripeProductId: community.stripeProductId,
          stripePriceIdMonthly: community.stripePriceIdMonthly,
          stripePriceIdYearly: community.stripePriceIdYearly,
          activeSubscriptions: billing?.activeSubscriptions || 0,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  "/:communityId/pricing",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const {
        pricingModel,
        monthlyPrice,
        yearlyPrice,
        currency,
        hasTrial,
        trialDays,
      } = req.body;
      const community = req.community;

      // Validate prices (in cents)
      if (pricingModel !== "free") {
        if (!monthlyPrice || monthlyPrice < 100) {
          return res.status(400).json({
            success: false,
            message: "Monthly price must be at least $1.00",
          });
        }
      }

      // Update community pricing
      community.pricingModel = pricingModel || "free";
      community.isPremium = pricingModel !== "free";
      community.monthlyPrice = monthlyPrice || 0;
      community.yearlyPrice =
        yearlyPrice || (monthlyPrice ? monthlyPrice * 10 : 0);
      community.currency = currency || "usd";
      community.hasTrial = hasTrial || false;
      community.trialDays = trialDays || 7;

      // Create/update Stripe products and prices
      if (pricingModel !== "free" && community.stripeAccountId) {
        try {
          // Create product if not exists
          if (!community.stripeProductId) {
            const product = await stripeClient.products.create({
              name: `${community.name} Membership`,
              description: community.description,
              metadata: { communityId: community._id.toString() },
            });
            community.stripeProductId = product.id;
          }

          // Create monthly price
          const monthlyStripePrice = await stripeClient.prices.create({
            product: community.stripeProductId,
            unit_amount: monthlyPrice,
            currency: currency || "usd",
            recurring: { interval: "month" },
          });
          community.stripePriceIdMonthly = monthlyStripePrice.id;

          // Create yearly price
          if (yearlyPrice) {
            const yearlyStripePrice = await stripeClient.prices.create({
              product: community.stripeProductId,
              unit_amount: yearlyPrice,
              currency: currency || "usd",
              recurring: { interval: "year" },
            });
            community.stripePriceIdYearly = yearlyStripePrice.id;
          }
        } catch (stripeError) {
          console.error("Stripe pricing error:", stripeError);
        }
      }

      await community.save();

      // Update billing record
      await CommunityBilling.findOneAndUpdate(
        { community: community._id },
        {
          monthlyPrice: community.monthlyPrice,
          yearlyPrice: community.yearlyPrice,
          currency: community.currency,
          stripeProductId: community.stripeProductId,
          stripePriceIdMonthly: community.stripePriceIdMonthly,
          stripePriceIdYearly: community.stripePriceIdYearly,
        },
        { upsert: true }
      );

      res.json({
        success: true,
        message: "Pricing updated successfully",
        pricing: {
          pricingModel: community.pricingModel,
          isPremium: community.isPremium,
          monthlyPrice: community.monthlyPrice,
          yearlyPrice: community.yearlyPrice,
          currency: community.currency,
          hasTrial: community.hasTrial,
          trialDays: community.trialDays,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 6️⃣ AFFILIATES - Affiliate system
// =============================================

// Get affiliate settings
router.get(
  "/:communityId/affiliates/settings",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const community = req.community;

      res.json({
        success: true,
        settings: {
          enabled: community.affiliatesEnabled,
          commissionRate: community.affiliateCommissionRate,
          cookieDuration: community.affiliateCookieDuration,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update affiliate settings
router.put(
  "/:communityId/affiliates/settings",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const { enabled, commissionRate, cookieDuration } = req.body;
      const community = req.community;

      if (typeof enabled === "boolean") community.affiliatesEnabled = enabled;
      if (commissionRate !== undefined) {
        community.affiliateCommissionRate = Math.min(
          100,
          Math.max(0, commissionRate)
        );
      }
      if (cookieDuration !== undefined) {
        community.affiliateCookieDuration = Math.max(1, cookieDuration);
      }

      await community.save();

      res.json({
        success: true,
        message: "Affiliate settings updated",
        settings: {
          enabled: community.affiliatesEnabled,
          commissionRate: community.affiliateCommissionRate,
          cookieDuration: community.affiliateCookieDuration,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get all affiliates for community
router.get(
  "/:communityId/affiliates",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const affiliates = await Affiliate.find({
        community: req.params.communityId,
        isActive: true,
      })
        .populate("user", "firstName lastName email profilePicture")
        .sort({ totalEarnings: -1 });

      const stats = await Affiliate.aggregate([
        {
          $match: {
            community: new mongoose.Types.ObjectId(req.params.communityId),
          },
        },
        {
          $group: {
            _id: null,
            totalAffiliates: { $sum: 1 },
            totalEarnings: { $sum: "$totalEarnings" },
            totalConversions: { $sum: { $size: "$conversions" } },
            totalClicks: { $sum: "$clicks" },
          },
        },
      ]);

      res.json({
        success: true,
        affiliates,
        stats: stats[0] || {
          totalAffiliates: 0,
          totalEarnings: 0,
          totalConversions: 0,
          totalClicks: 0,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Join affiliate program (for members)
router.post("/:communityId/affiliates/join", auth, async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user._id;

    const community = await Community.findById(communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (!community.affiliatesEnabled) {
      return res.status(400).json({
        success: false,
        message: "Affiliate program is not enabled for this community",
      });
    }

    // Check if already an affiliate
    let affiliate = await Affiliate.findOne({
      user: userId,
      community: communityId,
    });
    if (affiliate) {
      return res.json({ success: true, affiliate });
    }

    // Create affiliate
    affiliate = await Affiliate.create({
      user: userId,
      community: communityId,
      commissionRate: community.affiliateCommissionRate,
    });

    await affiliate.populate("user", "firstName lastName email");

    res.status(201).json({
      success: true,
      affiliate,
      referralUrl: `${process.env.CLIENT_URL}/join?ref=${affiliate.referralCode}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Track affiliate click
router.post("/affiliates/click/:referralCode", async (req, res) => {
  try {
    const affiliate = await Affiliate.findOneAndUpdate(
      { referralCode: req.params.referralCode, isActive: true },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    if (!affiliate) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid referral code" });
    }

    res.json({ success: true, communityId: affiliate.community });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// 7️⃣ TABS - Tab management
// =============================================

router.get(
  "/:communityId/tabs",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      res.json({
        success: true,
        tabs: req.community.tabs,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  "/:communityId/tabs",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { tabs } = req.body;
      const community = req.community;

      // Validate tabs structure
      const validTabs = [
        "community",
        "classroom",
        "calendar",
        "members",
        "leaderboard",
        "about",
        "chat",
      ];

      for (const [tabName, config] of Object.entries(tabs)) {
        if (!validTabs.includes(tabName)) continue;

        if (typeof config.enabled === "boolean") {
          community.tabs[tabName].enabled = config.enabled;
        }
        if (typeof config.order === "number") {
          community.tabs[tabName].order = config.order;
        }
        if (typeof config.label === "string") {
          community.tabs[tabName].label = config.label;
        }
      }

      await community.save();

      res.json({
        success: true,
        message: "Tabs updated successfully",
        tabs: community.tabs,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 8️⃣ CATEGORIES - Post categories
// =============================================

router.get("/:communityId/categories", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    res.json({
      success: true,
      categories: community.postCategories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post(
  "/:communityId/categories",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { name, color } = req.body;
      const community = req.community;

      if (!name || name.trim().length < 1) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      // Check for duplicate
      const exists = community.postCategories.some(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        return res.status(400).json({
          success: false,
          message: "Category already exists",
        });
      }

      const slug = name.toLowerCase().replace(/\s+/g, "-");
      const order = community.postCategories.length;

      community.postCategories.push({
        name: name.trim(),
        color: color || "#3B82F6",
        slug,
        order,
        postCount: 0,
      });

      await community.save();

      res.status(201).json({
        success: true,
        category: community.postCategories[community.postCategories.length - 1],
        categories: community.postCategories,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  "/:communityId/categories/:categoryId",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { name, color, order } = req.body;
      const community = req.community;

      const category = community.postCategories.id(req.params.categoryId);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      if (name) {
        category.name = name.trim();
        category.slug = name.toLowerCase().replace(/\s+/g, "-");
      }
      if (color) category.color = color;
      if (typeof order === "number") category.order = order;

      await community.save();

      res.json({
        success: true,
        category,
        categories: community.postCategories,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.delete(
  "/:communityId/categories/:categoryId",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const community = req.community;
      const { categoryId } = req.params;

      const category = community.postCategories.id(categoryId);
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      // Remove category from posts (but don't delete posts)
      await Post.updateMany(
        { community: community._id, category: category.name },
        { $set: { category: "" } }
      );

      // Remove category
      community.postCategories.pull({ _id: categoryId });
      await community.save();

      res.json({
        success: true,
        message: "Category deleted. Posts have been uncategorized.",
        categories: community.postCategories,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 9️⃣ RULES - Community rules
// =============================================

router.get("/:communityId/rules", async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    res.json({
      success: true,
      rules: {
        content: community.rules,
        version: community.rulesVersion,
        required: community.rulesRequired,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put(
  "/:communityId/rules",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { rules, required } = req.body;
      const community = req.community;

      if (rules !== undefined) {
        community.rules = rules;
        // Increment version when rules change
        const currentVersion = parseFloat(community.rulesVersion) || 1.0;
        community.rulesVersion = (currentVersion + 0.1).toFixed(1);
      }

      if (typeof required === "boolean") {
        community.rulesRequired = required;
      }

      await community.save();

      res.json({
        success: true,
        message: "Rules updated successfully",
        rules: {
          content: community.rules,
          version: community.rulesVersion,
          required: community.rulesRequired,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Check if user has accepted rules
router.get("/:communityId/rules/acceptance", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (!community.rulesRequired || !community.rules) {
      return res.json({
        success: true,
        accepted: true,
        required: false,
      });
    }

    const rulesHash = crypto
      .createHash("md5")
      .update(community.rules)
      .digest("hex");

    const acceptance = await RuleAcceptance.findOne({
      user: req.user._id,
      community: req.params.communityId,
    });

    // Check if rules changed since acceptance
    const accepted = acceptance && acceptance.rulesHash === rulesHash;

    res.json({
      success: true,
      accepted,
      required: community.rulesRequired,
      version: community.rulesVersion,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept rules
router.post("/:communityId/rules/accept", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    const rulesHash = crypto
      .createHash("md5")
      .update(community.rules || "")
      .digest("hex");

    await RuleAcceptance.findOneAndUpdate(
      { user: req.user._id, community: req.params.communityId },
      {
        rulesVersion: community.rulesVersion,
        rulesHash,
        acceptedAt: new Date(),
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: "Rules accepted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// 🔟 DISCOVERY - Search and discovery settings
// =============================================

router.get(
  "/:communityId/discovery",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      res.json({
        success: true,
        discovery: req.community.discovery,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

router.put(
  "/:communityId/discovery",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const { enabled, searchEngineIndexing, keywords } = req.body;
      const community = req.community;

      if (typeof enabled === "boolean") {
        community.discovery.enabled = enabled;
        community.showInDiscovery = enabled;
      }
      if (typeof searchEngineIndexing === "boolean") {
        community.discovery.searchEngineIndexing = searchEngineIndexing;
      }
      if (Array.isArray(keywords)) {
        community.discovery.keywords = keywords.slice(0, 10); // Max 10 keywords
      }

      await community.save();

      res.json({
        success: true,
        message: "Discovery settings updated",
        discovery: community.discovery,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Public discovery search
router.get("/discover/search", async (req, res) => {
  try {
    const { query, category, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
      isPrivate: false,
      "discovery.enabled": true,
    };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
        { "discovery.keywords": { $in: [new RegExp(query, "i")] } },
      ];
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    const [communities, total] = await Promise.all([
      Community.find(filter)
        .select(
          "name slug description thumbnail category members isPremium monthlyPrice"
        )
        .sort({ "discovery.featuredOrder": -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Community.countDocuments(filter),
    ]);

    // Add member count
    const enrichedCommunities = communities.map((c) => ({
      ...c,
      memberCount: c.members?.length || 0,
      members: undefined, // Don't send full members array
    }));

    res.json({
      success: true,
      communities: enrichedCommunities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================
// 1️⃣1️⃣ METRICS - Analytics and metrics
// =============================================

router.get(
  "/:communityId/metrics",
  auth,
  checkCommunityAdmin,
  async (req, res) => {
    try {
      const { communityId } = req.params;
      const { period = "30d" } = req.query;

      // Calculate date range
      let startDate = new Date();
      switch (period) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(startDate.getDate() - 90);
          break;
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Member growth over time
      const memberGrowth = await Community.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(communityId) } },
        { $unwind: "$members" },
        { $match: { "members.joinedAt": { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$members.joinedAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Post engagement
      const postEngagement = await Post.aggregate([
        {
          $match: {
            community: new mongoose.Types.ObjectId(communityId),
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            posts: { $sum: 1 },
            likes: { $sum: { $size: "$likes" } },
            comments: { $sum: { $size: "$comments" } },
            views: { $sum: "$views" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Revenue trends
      const revenueData = await Payment.aggregate([
        {
          $match: {
            community: new mongoose.Types.ObjectId(communityId),
            status: "completed",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$amount" },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Top posts
      const topPosts = await Post.find({ community: communityId })
        .sort({ views: -1, "likes.length": -1 })
        .limit(5)
        .populate("author", "firstName lastName")
        .lean();

      // Active members (posted in period)
      const activeMembers = await Post.distinct("author", {
        community: communityId,
        createdAt: { $gte: startDate },
      });

      res.json({
        success: true,
        metrics: {
          period,
          memberGrowth,
          postEngagement,
          revenueData,
          topPosts,
          activeMembersCount: activeMembers.length,
          summary: {
            newMembers: memberGrowth.reduce((sum, d) => sum + d.count, 0),
            totalPosts: postEngagement.reduce((sum, d) => sum + d.posts, 0),
            totalLikes: postEngagement.reduce((sum, d) => sum + d.likes, 0),
            totalComments: postEngagement.reduce(
              (sum, d) => sum + d.comments,
              0
            ),
            totalRevenue: revenueData.reduce((sum, d) => sum + d.revenue, 0),
          },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// =============================================
// 1️⃣2️⃣ BILLING - Complete billing management
// =============================================

router.get(
  "/:communityId/billing",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const { communityId } = req.params;

      // Get or create billing record
      let billing = await CommunityBilling.findOne({ community: communityId });
      if (!billing) {
        billing = await CommunityBilling.create({ community: communityId });
      }

      // Get active subscriptions
      const activeSubscriptions = await UserSubscription.find({
        community: communityId,
        status: { $in: ["active", "trialing"] },
      }).populate("user", "firstName lastName email");

      // Get recent payments
      const recentPayments = await Payment.find({ community: communityId })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("student", "firstName lastName email");

      // Get failed payments
      const failedPayments = await Payment.find({
        community: communityId,
        status: "failed",
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("student", "firstName lastName email");

      // Calculate totals
      const [totalRevenue] = await Payment.aggregate([
        {
          $match: {
            community: new mongoose.Types.ObjectId(communityId),
            status: "completed",
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      // Calculate MRR
      let mrr = 0;
      for (const sub of activeSubscriptions) {
        if (sub.interval === "year") {
          mrr += sub.amount / 12;
        } else {
          mrr += sub.amount;
        }
      }

      res.json({
        success: true,
        billing: {
          totalRevenue: totalRevenue?.total || 0,
          mrr: Math.round(mrr),
          activeSubscriptions: activeSubscriptions.length,
          subscriptionsList: activeSubscriptions,
          recentPayments,
          failedPayments,
          refunds: billing.refunds,
          stripeConnected: !!billing.stripeConnectAccountId,
          availableBalance: billing.availableBalance,
          pendingBalance: billing.pendingBalance,
          monthlyRevenue: billing.monthlyRevenue.slice(-12),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Create subscription checkout for community
router.post("/:communityId/billing/subscribe", auth, async (req, res) => {
  try {
    const { interval = "month", affiliateCode } = req.body;
    const { communityId } = req.params;
    const userId = req.user._id;

    const community = await Community.findById(communityId);
    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (!community.isPremium) {
      return res.status(400).json({
        success: false,
        message: "This is a free community",
      });
    }

    const user = await User.findById(userId);

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeClient.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: userId.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Get price ID
    const priceId =
      interval === "year"
        ? community.stripePriceIdYearly
        : community.stripePriceIdMonthly;

    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: "Pricing not configured for this community",
      });
    }

    // Create checkout session
    const sessionParams = {
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/community/${community.slug}?subscribed=true`,
      cancel_url: `${process.env.CLIENT_URL}/community/${community.slug}?canceled=true`,
      metadata: {
        userId: userId.toString(),
        communityId: communityId,
        interval,
      },
    };

    // Add trial if enabled
    if (community.hasTrial) {
      sessionParams.subscription_data = {
        trial_period_days: community.trialDays,
      };
    }

    // Track affiliate
    if (affiliateCode) {
      const affiliate = await Affiliate.findOne({
        referralCode: affiliateCode,
        community: communityId,
        isActive: true,
      });
      if (affiliate) {
        sessionParams.metadata.affiliateId = affiliate._id.toString();
        sessionParams.metadata.affiliateUserId = affiliate.user.toString();
      }
    }

    // Transfer to connected account if exists
    if (community.stripeAccountId) {
      const applicationFeePercent = 10; // Platform takes 10%
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        application_fee_percent: applicationFeePercent,
        transfer_data: {
          destination: community.stripeAccountId,
        },
      };
    }

    const session = await stripeClient.checkout.sessions.create(sessionParams);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Subscription checkout error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel subscription
router.post("/:communityId/billing/cancel", auth, async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      community: req.params.communityId,
      status: { $in: ["active", "trialing"] },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No active subscription found",
      });
    }

    // Cancel in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripeClient.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );
    }

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    res.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Issue refund
router.post(
  "/:communityId/billing/refund",
  auth,
  checkCommunityOwner,
  async (req, res) => {
    try {
      const { paymentId, reason } = req.body;

      const payment = await Payment.findOne({
        _id: paymentId,
        community: req.params.communityId,
        status: "completed",
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      // Create refund in Stripe
      let stripeRefund;
      if (payment.stripePaymentIntentId) {
        stripeRefund = await stripeClient.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: "requested_by_customer",
        });
      }

      // Update payment status
      payment.status = "refunded";
      payment.refundedAt = new Date();
      payment.refundReason = reason;
      await payment.save();

      // Log refund in billing
      await CommunityBilling.findOneAndUpdate(
        { community: req.params.communityId },
        {
          $push: {
            refunds: {
              stripeRefundId: stripeRefund?.id,
              amount: payment.amount,
              reason,
              user: payment.student,
              createdAt: new Date(),
            },
          },
          $inc: { totalRevenue: -payment.amount },
        }
      );

      res.json({
        success: true,
        message: "Refund processed successfully",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;
