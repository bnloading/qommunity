const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    thumbnail: {
      type: String,
      required: false,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ["member", "moderator", "admin"],
          default: "member",
        },
      },
    ],
    category: {
      type: String,
      enum: [
        "hobbies",
        "music",
        "money",
        "spirituality",
        "tech",
        "health",
        "sports",
        "self-improvement",
        "relationships",
        "other",
        "Business",
        "Technology",
        "Health & Fitness",
        "Creative Arts",
      ],
      default: "other",
    },
    // Privacy settings
    isPrivate: {
      type: Boolean,
      default: false,
    },
    customUrl: {
      type: String,
      default: "",
    },
    // Discovery settings
    showInDiscovery: {
      type: Boolean,
      default: true,
    },
    // Premium community requires payment to join
    isPremium: {
      type: Boolean,
      default: false,
    },
    premiumPrice: {
      type: Number,
      default: 0,
    },
    // Pricing settings
    pricingModel: {
      type: String,
      enum: ["free", "subscription", "freemium", "tiers", "one-time"],
      default: "free",
    },
    pricingAmount: {
      type: Number,
      default: 0,
    },
    hasTrial: {
      type: Boolean,
      default: false,
    },
    trialDays: {
      type: Number,
      default: 7,
    },
    // Affiliates
    affiliatesEnabled: {
      type: Boolean,
      default: false,
    },
    affiliateCommissionRate: {
      type: Number,
      default: 10,
    },
    affiliateCookieDuration: {
      type: Number,
      default: 30,
    },
    // Payouts
    accountBalance: {
      type: Number,
      default: 0,
    },
    stripeAccountId: {
      type: String,
      default: "",
    },
    // Custom categories for posts
    postCategories: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          auto: true,
        },
        name: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          default: "#3B82F6",
        },
        slug: String,
        order: {
          type: Number,
          default: 0,
        },
        postCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    // Tabs configuration
    tabs: {
      community: {
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
        label: { type: String, default: "Community" },
      },
      classroom: {
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 1 },
        label: { type: String, default: "Classroom" },
      },
      calendar: {
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 2 },
        label: { type: String, default: "Calendar" },
      },
      members: {
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 3 },
        label: { type: String, default: "Members" },
      },
      leaderboard: {
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 4 },
        label: { type: String, default: "Leaderboard" },
      },
      about: {
        enabled: { type: Boolean, default: true },
        order: { type: Number, default: 5 },
        label: { type: String, default: "About" },
      },
      chat: {
        enabled: { type: Boolean, default: false },
        order: { type: Number, default: 6 },
        label: { type: String, default: "Chat" },
      },
    },
    maxMembers: {
      type: Number,
      default: null, // null = unlimited
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    // Rules or guidelines for the community
    rules: {
      type: String,
      default: "",
    },
    rulesVersion: {
      type: String,
      default: "1.0",
    },
    rulesRequired: {
      type: Boolean,
      default: false,
    },
    // Discovery settings
    discovery: {
      enabled: {
        type: Boolean,
        default: true,
      },
      searchEngineIndexing: {
        type: Boolean,
        default: true,
      },
      featuredOrder: {
        type: Number,
        default: 0,
      },
      keywords: [String],
    },
    // Pricing in cents
    monthlyPrice: {
      type: Number,
      default: 0,
    },
    yearlyPrice: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "usd",
    },
    // Stripe IDs
    stripeProductId: {
      type: String,
      default: null,
    },
    stripePriceIdMonthly: {
      type: String,
      default: null,
    },
    stripePriceIdYearly: {
      type: String,
      default: null,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
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

// Indexes for performance
communitySchema.index({ creator: 1 });
communitySchema.index({ "members.user": 1 });
communitySchema.index({ slug: 1 });
communitySchema.index({ isActive: 1 });
communitySchema.index({ "discovery.enabled": 1, isPrivate: 1 });
communitySchema.index({ category: 1 });
communitySchema.index({ createdAt: -1 });
communitySchema.index({ "postCategories._id": 1 });

module.exports = mongoose.model("Community", communitySchema);
