# Complete Skool.com Clone - Full Implementation Guide

## Table of Contents

1. [Subscription & Pricing System](#subscription--pricing-system)
2. [Community Creation & Management](#community-creation--management)
3. [Access Control & Permissions](#access-control--permissions)
4. [Core Features](#core-features)
5. [Database Schema](#database-schema)
6. [Technical Architecture](#technical-architecture)
7. [Monetization & Payments](#monetization--payments)
8. [Admin Dashboard](#admin-dashboard)
9. [Mobile & Security](#mobile--security)

---

## 1. Subscription & Pricing System

### A. Subscription Models

#### Enhanced Subscription Plan Model

```javascript
// backend/src/models/SubscriptionPlan.js
const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["free", "basic", "premium", "vip", "enterprise"],
      unique: true,
    },
    displayName: { type: String, required: true }, // e.g., "Pro Plan"
    description: String,
    tagline: String, // e.g., "Perfect for growing communities"

    pricing: {
      monthly: { amount: Number, stripePriceId: String },
      yearly: {
        amount: Number,
        stripePriceId: String,
        discount: Number, // % discount from monthly * 12
      },
      lifetime: { amount: Number, stripePriceId: String },
    },

    features: [
      {
        category: String, // e.g., "Members", "Storage", "Features"
        items: [
          {
            name: String,
            description: String,
            enabled: { type: Boolean, default: true },
            limit: Number, // null = unlimited
            icon: String,
          },
        ],
      },
    ],

    limits: {
      members: { type: Number, default: 100 },
      communities: { type: Number, default: 1 },
      courses: { type: Number, default: 5 },
      storage: { type: Number, default: 1024 }, // MB
      videoDuration: { type: Number, default: 60 }, // minutes per month
      monthlyPosts: { type: Number, default: null },
      monthlyEmails: { type: Number, default: 100 },
      customDomain: { type: Boolean, default: false },
      removeWatermark: { type: Boolean, default: false },
    },

    trial: {
      enabled: { type: Boolean, default: false },
      days: { type: Number, default: 14 },
      creditCardRequired: { type: Boolean, default: false },
    },

    featured: { type: Boolean, default: false }, // Show as "Most Popular"
    order: { type: Number, default: 0 }, // Display order
    isActive: { type: Boolean, default: true },

    metadata: {
      totalSubscribers: { type: Number, default: 0 },
      monthlyRevenue: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
```

#### User Subscription with Advanced Features

```javascript
// backend/src/models/UserSubscription.js
const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "trial",
        "active",
        "past_due",
        "canceled",
        "paused",
        "incomplete",
        "unpaid",
      ],
      default: "trial",
    },

    billing: {
      interval: { type: String, enum: ["monthly", "yearly", "lifetime"] },
      amount: Number,
      currency: { type: String, default: "usd" },
      tax: { rate: Number, amount: Number },
      nextBillingDate: Date,
      lastBillingDate: Date,
      billingCycleAnchor: Date,
    },

    stripe: {
      customerId: String,
      subscriptionId: String,
      priceId: String,
      paymentMethodId: String,
      invoiceId: String,
    },

    trial: {
      isActive: { type: Boolean, default: false },
      startDate: Date,
      endDate: Date,
      converted: { type: Boolean, default: false },
    },

    cancellation: {
      isCanceled: { type: Boolean, default: false },
      canceledAt: Date,
      reason: {
        type: String,
        enum: [
          "too_expensive",
          "missing_features",
          "not_using",
          "switching",
          "other",
        ],
      },
      feedback: String,
      effectiveDate: Date,
      cancelAtPeriodEnd: { type: Boolean, default: true },
    },

    pause: {
      isPaused: { type: Boolean, default: false },
      pausedAt: Date,
      resumeDate: Date,
    },

    history: [
      {
        action: {
          type: String,
          enum: [
            "created",
            "upgraded",
            "downgraded",
            "renewed",
            "canceled",
            "paused",
            "resumed",
            "reactivated",
          ],
        },
        fromPlan: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubscriptionPlan",
        },
        toPlan: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "SubscriptionPlan",
        },
        amount: Number,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],

    credits: {
      balance: { type: Number, default: 0 }, // For proration
      history: [
        {
          amount: Number,
          reason: String,
          appliedAt: Date,
        },
      ],
    },

    metadata: {
      totalSpent: { type: Number, default: 0 },
      lifetimeValue: { type: Number, default: 0 },
      lastUpgrade: Date,
      lastDowngrade: Date,
      churnRisk: { type: Number, min: 0, max: 100 }, // Predicted churn probability
      engagement: { type: Number, min: 0, max: 100 },
    },
  },
  { timestamps: true }
);

// Indexes for performance
userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ "stripe.subscriptionId": 1 });
userSubscriptionSchema.index({ "billing.nextBillingDate": 1 });

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
```

### B. Proration & Plan Changes

```javascript
// backend/src/services/subscriptionService.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

class SubscriptionService {
  /**
   * Calculate proration when changing plans
   */
  static calculateProration(
    currentPlan,
    newPlan,
    currentPeriodStart,
    currentPeriodEnd,
    billingInterval
  ) {
    const now = Date.now();
    const totalSeconds = (currentPeriodEnd - currentPeriodStart) / 1000;
    const elapsedSeconds = (now - currentPeriodStart) / 1000;
    const remainingSeconds = totalSeconds - elapsedSeconds;

    const currentPrice = currentPlan.pricing[billingInterval].amount;
    const newPrice = newPlan.pricing[billingInterval].amount;

    // Calculate unused amount from current plan
    const unusedAmount = (currentPrice * remainingSeconds) / totalSeconds;

    // Calculate prorated amount for new plan for remaining period
    const proratedNewAmount = (newPrice * remainingSeconds) / totalSeconds;

    // If upgrading: charge difference immediately
    // If downgrading: credit difference to next invoice
    const difference = proratedNewAmount - unusedAmount;

    return {
      currentPlanAmount: currentPrice,
      newPlanAmount: newPrice,
      unusedCredit: unusedAmount,
      proratedCharge: Math.max(0, difference),
      creditToAccount: Math.max(0, -difference),
      remainingDays: Math.ceil(remainingSeconds / 86400),
      chargeImmediately: difference > 0,
    };
  }

  /**
   * Upgrade subscription
   */
  static async upgradePlan(userId, newPlanId, billingInterval = null) {
    try {
      // Get current subscription
      const currentSub = await UserSubscription.findOne({
        user: userId,
        status: "active",
      }).populate("plan");

      if (!currentSub) {
        throw new Error("No active subscription found");
      }

      // Get new plan
      const newPlan = await SubscriptionPlan.findById(newPlanId);
      if (!newPlan) {
        throw new Error("Plan not found");
      }

      const interval = billingInterval || currentSub.billing.interval;

      // Calculate proration
      const proration = this.calculateProration(
        currentSub.plan,
        newPlan,
        currentSub.billing.lastBillingDate,
        currentSub.billing.nextBillingDate,
        interval
      );

      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.update(
        currentSub.stripe.subscriptionId,
        {
          items: [
            {
              id: currentSub.stripe.priceId,
              price: newPlan.pricing[interval].stripePriceId,
            },
          ],
          proration_behavior: "always_invoice",
          billing_cycle_anchor: "unchanged",
        }
      );

      // Update database
      const oldPlanId = currentSub.plan._id;
      currentSub.plan = newPlanId;
      currentSub.billing.amount = newPlan.pricing[interval].amount;
      currentSub.billing.interval = interval;
      currentSub.stripe.priceId = stripeSubscription.items.data[0].price.id;
      currentSub.metadata.lastUpgrade = new Date();

      // Add to history
      currentSub.history.push({
        action: "upgraded",
        fromPlan: oldPlanId,
        toPlan: newPlanId,
        amount: proration.proratedCharge,
        note: `Upgraded to ${newPlan.displayName}`,
      });

      await currentSub.save();

      return {
        success: true,
        subscription: currentSub,
        proration,
        stripeInvoice: stripeSubscription.latest_invoice,
      };
    } catch (error) {
      console.error("Upgrade error:", error);
      throw error;
    }
  }

  /**
   * Downgrade subscription (effective at period end)
   */
  static async downgradePlan(userId, newPlanId) {
    try {
      const currentSub = await UserSubscription.findOne({
        user: userId,
        status: "active",
      }).populate("plan");

      if (!currentSub) {
        throw new Error("No active subscription found");
      }

      const newPlan = await SubscriptionPlan.findById(newPlanId);

      // Schedule downgrade at period end
      await stripe.subscriptions.update(currentSub.stripe.subscriptionId, {
        items: [
          {
            id: currentSub.stripe.priceId,
            price: newPlan.pricing[currentSub.billing.interval].stripePriceId,
          },
        ],
        proration_behavior: "none",
        billing_cycle_anchor: "unchanged",
      });

      // Update database
      currentSub.metadata.lastDowngrade = new Date();
      currentSub.history.push({
        action: "downgraded",
        fromPlan: currentSub.plan._id,
        toPlan: newPlanId,
        note: `Scheduled downgrade to ${newPlan.displayName} at period end`,
      });

      await currentSub.save();

      return {
        success: true,
        subscription: currentSub,
        effectiveDate: currentSub.billing.nextBillingDate,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Handle failed payment with retry logic
   */
  static async handlePaymentFailure(subscriptionId, attemptCount = 1) {
    const subscription = await UserSubscription.findOne({
      "stripe.subscriptionId": subscriptionId,
    }).populate("user");

    if (!subscription) return;

    subscription.status = "past_due";
    await subscription.save();

    // Retry schedule: Day 1, Day 3, Day 5, Day 7
    const retrySchedule = [1, 3, 5, 7];

    if (attemptCount <= retrySchedule.length) {
      // Schedule retry
      const retryDate = new Date();
      retryDate.setDate(retryDate.getDate() + retrySchedule[attemptCount - 1]);

      // Send email notification
      await emailService.sendPaymentFailureEmail(subscription.user, {
        attemptCount,
        nextRetryDate: retryDate,
        amount: subscription.billing.amount,
      });
    } else {
      // Final attempt failed - cancel subscription
      subscription.status = "unpaid";
      subscription.cancellation = {
        isCanceled: true,
        canceledAt: new Date(),
        reason: "payment_failed",
        effectiveDate: new Date(),
      };
      await subscription.save();

      // Send final notice
      await emailService.sendSubscriptionCanceledEmail(subscription.user);
    }
  }

  /**
   * Apply trial period
   */
  static async startTrial(userId, planId) {
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan.trial.enabled) {
      throw new Error("Trial not available for this plan");
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + plan.trial.days);

    const subscription = await UserSubscription.create({
      user: userId,
      plan: planId,
      status: "trial",
      trial: {
        isActive: true,
        startDate: new Date(),
        endDate: trialEnd,
      },
      billing: {
        nextBillingDate: trialEnd,
      },
    });

    return subscription;
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(userId, resumeDate) {
    const subscription = await UserSubscription.findOne({
      user: userId,
      status: "active",
    });

    if (!subscription) {
      throw new Error("No active subscription");
    }

    // Pause in Stripe
    await stripe.subscriptions.update(subscription.stripe.subscriptionId, {
      pause_collection: {
        behavior: "mark_uncollectible",
        resumes_at: Math.floor(resumeDate.getTime() / 1000),
      },
    });

    subscription.status = "paused";
    subscription.pause = {
      isPaused: true,
      pausedAt: new Date(),
      resumeDate,
    };

    await subscription.save();

    return subscription;
  }
}

module.exports = SubscriptionService;
```

### C. Subscription API Endpoints

```javascript
// backend/src/routes/subscriptions.js
const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const SubscriptionService = require("../services/subscriptionService");

// Get all available plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ order: 1 })
      .select("-__v");

    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's current subscription
router.get("/my-subscription", auth, async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      status: { $in: ["trial", "active", "past_due"] },
    }).populate("plan");

    if (!subscription) {
      return res.json({ success: true, subscription: null });
    }

    // Check if trial expired
    if (
      subscription.status === "trial" &&
      subscription.trial.endDate < new Date()
    ) {
      subscription.status = "incomplete";
      await subscription.save();
    }

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create checkout session
router.post("/checkout", auth, async (req, res) => {
  try {
    const { planId, interval, communityId } = req.body;

    const plan = await SubscriptionPlan.findById(planId);
    const user = await User.findById(req.user._id);

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const mode = interval === "lifetime" ? "payment" : "subscription";
    const priceId = plan.pricing[interval].stripePriceId;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing`,
      allow_promotion_codes: true,
      billing_address_collection: "required",
      subscription_data:
        mode === "subscription"
          ? {
              trial_period_days: plan.trial.enabled
                ? plan.trial.days
                : undefined,
              metadata: {
                userId: req.user._id.toString(),
                planId: planId,
                communityId: communityId || "",
              },
            }
          : undefined,
      metadata: {
        userId: req.user._id.toString(),
        planId: planId,
        communityId: communityId || "",
        interval,
      },
    });

    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upgrade plan
router.post("/upgrade", auth, async (req, res) => {
  try {
    const { planId, interval } = req.body;

    const result = await SubscriptionService.upgradePlan(
      req.user._id,
      planId,
      interval
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Downgrade plan
router.post("/downgrade", auth, async (req, res) => {
  try {
    const { planId } = req.body;

    const result = await SubscriptionService.downgradePlan(
      req.user._id,
      planId
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel subscription
router.post("/cancel", auth, async (req, res) => {
  try {
    const { reason, feedback, immediately } = req.body;

    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      status: { $in: ["active", "trial"] },
    });

    if (!subscription) {
      return res
        .status(404)
        .json({ success: false, message: "No active subscription" });
    }

    if (immediately) {
      await stripe.subscriptions.cancel(subscription.stripe.subscriptionId);
      subscription.status = "canceled";
      subscription.cancellation.effectiveDate = new Date();
    } else {
      await stripe.subscriptions.update(subscription.stripe.subscriptionId, {
        cancel_at_period_end: true,
      });
      subscription.cancellation.cancelAtPeriodEnd = true;
      subscription.cancellation.effectiveDate =
        subscription.billing.nextBillingDate;
    }

    subscription.cancellation = {
      ...subscription.cancellation,
      isCanceled: true,
      canceledAt: new Date(),
      reason,
      feedback,
    };

    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reactivate canceled subscription
router.post("/reactivate", auth, async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      "cancellation.isCanceled": true,
      "cancellation.effectiveDate": { $gt: new Date() },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No canceled subscription to reactivate",
      });
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripe.subscriptionId, {
      cancel_at_period_end: false,
    });

    subscription.cancellation = {
      isCanceled: false,
      canceledAt: null,
      reason: null,
      feedback: null,
      effectiveDate: null,
      cancelAtPeriodEnd: false,
    };

    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pause subscription
router.post("/pause", auth, async (req, res) => {
  try {
    const { resumeDate } = req.body;

    const subscription = await SubscriptionService.pauseSubscription(
      req.user._id,
      new Date(resumeDate)
    );

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update payment method
router.post("/update-payment-method", auth, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;

    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      status: "active",
    });

    const user = await User.findById(req.user._id);

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });

    // Set as default
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    subscription.stripe.paymentMethodId = paymentMethodId;
    await subscription.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

---

## 2. Community Creation & Management

### A. Enhanced Community Model

```javascript
// backend/src/models/Community.js (Complete Enhanced Version)
const mongoose = require("mongoose");

const communitySchema = new mongoose.Schema(
  {
    // Basic Info
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, maxlength: 2000 },
    tagline: { type: String, maxlength: 100 },

    // Branding
    branding: {
      logo: { type: String, default: "" },
      coverImage: { type: String, default: "" },
      favicon: String,
      colors: {
        primary: { type: String, default: "#6366f1" },
        secondary: { type: String, default: "#8b5cf6" },
        accent: { type: String, default: "#fbbf24" },
        background: { type: String, default: "#ffffff" },
        text: { type: String, default: "#1f2937" },
      },
      fonts: {
        heading: { type: String, default: "Inter" },
        body: { type: String, default: "Inter" },
      },
    },

    // Settings
    settings: {
      privacy: {
        type: String,
        enum: ["public", "private", "secret"],
        default: "public",
      },
      memberApproval: {
        mode: { type: String, enum: ["auto", "manual"], default: "auto" },
        questions: [{ question: String, required: Boolean }],
      },
      contentModeration: {
        enabled: { type: Boolean, default: false },
        requireApproval: { type: Boolean, default: false },
        allowedFileTypes: {
          type: [String],
          default: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
        },
        maxFileSize: { type: Number, default: 10485760 }, // 10MB
        profanityFilter: { type: Boolean, default: true },
        spamDetection: { type: Boolean, default: true },
      },
      notifications: {
        emailDigest: {
          type: String,
          enum: ["realtime", "daily", "weekly", "never"],
          default: "weekly",
        },
        newMembers: { type: Boolean, default: true },
        newPosts: { type: Boolean, default: true },
        comments: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        weeklyReport: { type: Boolean, default: true },
      },
      features: {
        courses: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        chat: { type: Boolean, default: true },
        leaderboard: { type: Boolean, default: true },
        polls: { type: Boolean, default: true },
        marketplace: { type: Boolean, default: false },
      },
      posting: {
        allowImages: { type: Boolean, default: true },
        allowVideos: { type: Boolean, default: true },
        allowPolls: { type: Boolean, default: true },
        allowFiles: { type: Boolean, default: true },
        requireApproval: { type: Boolean, default: false },
      },
    },

    // Custom Domain
    domain: {
      custom: String,
      verified: { type: Boolean, default: false },
      verificationCode: String,
      verifiedAt: Date,
      dnsRecords: [
        {
          type: { type: String, enum: ["A", "CNAME", "TXT"] },
          host: String,
          value: String,
          verified: Boolean,
        },
      ],
    },

    // Categories & Tags
    categories: [
      {
        name: { type: String, required: true },
        slug: String,
        description: String,
        color: { type: String, default: "#6366f1" },
        icon: String,
        order: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
      },
    ],

    tags: [{ type: String, trim: true }],

    // Membership
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["owner", "admin", "moderator", "member", "guest"],
          default: "member",
        },
        status: {
          type: String,
          enum: ["pending", "active", "suspended", "banned"],
          default: "pending",
        },
        joinedAt: { type: Date, default: Date.now },
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approvedAt: Date,
        subscription: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "UserSubscription",
        },

        // Gamification
        points: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        badges: [
          {
            badge: { type: mongoose.Schema.Types.ObjectId, ref: "Badge" },
            earnedAt: Date,
          },
        ],

        // Activity
        lastActive: Date,
        postCount: { type: Number, default: 0 },
        commentCount: { type: Number, default: 0 },
        likeCount: { type: Number, default: 0 },
        coursesCompleted: { type: Number, default: 0 },

        // Preferences
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: true },
      },
    ],

    // Join Requests (for manual approval)
    joinRequests: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        answers: [{ question: String, answer: String }],
        requestedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedAt: Date,
        rejectionReason: String,
      },
    ],

    // Statistics
    stats: {
      memberCount: { type: Number, default: 0 },
      postCount: { type: Number, default: 0 },
      commentCount: { type: Number, default: 0 },
      courseCount: { type: Number, default: 0 },
      eventCount: { type: Number, default: 0 },
      monthlyActiveUsers: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
      monthlyRevenue: { type: Number, default: 0 },
      totalRevenue: { type: Number, default: 0 },
    },

    // SEO
    seo: {
      metaTitle: String,
      metaDescription: String,
      metaKeywords: [String],
      ogImage: String,
    },

    // Integrations
    integrations: {
      googleAnalytics: { enabled: Boolean, trackingId: String },
      facebook: { enabled: Boolean, pixelId: String },
      discord: { enabled: Boolean, webhookUrl: String },
      slack: { enabled: Boolean, webhookUrl: String },
      zoom: { enabled: Boolean, apiKey: String, apiSecret: String },
      mailchimp: { enabled: Boolean, apiKey: String, listId: String },
    },

    // Status
    isActive: { type: Boolean, default: true },
    isPremium: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
communitySchema.index({ slug: 1 });
communitySchema.index({ owner: 1 });
communitySchema.index({ tags: 1 });
communitySchema.index({ "members.user": 1 });
communitySchema.index({ isActive: 1, isFeatured: 1 });

// Virtual for member count
communitySchema.virtual("activeMemberCount").get(function () {
  return this.members.filter((m) => m.status === "active").length;
});

module.exports = mongoose.model("Community", communitySchema);
```

### B. Community Creation Wizard (Step-by-Step)

```javascript
// backend/src/routes/communities.js (Enhanced with wizard)

// STEP 1: Create Community with Basic Info
router.post("/create/step1", auth, async (req, res) => {
  try {
    const { name, description, category, tagline } = req.body;

    // Validate name
    if (!name || name.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Community name must be at least 3 characters",
      });
    }

    // Generate unique slug
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug exists
    let slugExists = await Community.findOne({ slug });
    let counter = 1;
    while (slugExists) {
      slug = `${slug}-${counter}`;
      slugExists = await Community.findOne({ slug });
      counter++;
    }

    // Create community
    const community = await Community.create({
      name,
      slug,
      description,
      tagline,
      tags: category ? [category] : [],
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "owner",
          status: "active",
          joinedAt: new Date(),
        },
      ],
      stats: { memberCount: 1 },
    });

    res.json({
      success: true,
      community,
      nextStep: "branding",
      message: "Community created! Let's customize it.",
    });
  } catch (error) {
    console.error("Community creation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// STEP 2: Upload Branding Assets
router.put("/:id/branding", auth, async (req, res) => {
  try {
    const { logo, coverImage, colors, fonts } = req.body;

    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    // Verify ownership
    if (community.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Update branding
    if (logo) community.branding.logo = logo;
    if (coverImage) community.branding.coverImage = coverImage;
    if (colors)
      community.branding.colors = { ...community.branding.colors, ...colors };
    if (fonts)
      community.branding.fonts = { ...community.branding.fonts, ...fonts };

    await community.save();

    res.json({
      success: true,
      community,
      nextStep: "settings",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STEP 3: Configure Settings
router.put("/:id/settings", auth, async (req, res) => {
  try {
    const { privacy, memberApproval, features, posting, contentModeration } =
      req.body;

    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Update settings
    if (privacy) community.settings.privacy = privacy;
    if (memberApproval)
      community.settings.memberApproval = {
        ...community.settings.memberApproval,
        ...memberApproval,
      };
    if (features)
      community.settings.features = {
        ...community.settings.features,
        ...features,
      };
    if (posting)
      community.settings.posting = {
        ...community.settings.posting,
        ...posting,
      };
    if (contentModeration)
      community.settings.contentModeration = {
        ...community.settings.contentModeration,
        ...contentModeration,
      };

    await community.save();

    res.json({
      success: true,
      community,
      nextStep: "categories",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STEP 4: Add Categories
router.post("/:id/categories", auth, async (req, res) => {
  try {
    const { categories } = req.body; // Array of category objects

    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Add categories
    categories.forEach((cat, index) => {
      const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      community.categories.push({
        name: cat.name,
        slug,
        description: cat.description || "",
        color: cat.color || "#6366f1",
        icon: cat.icon || "",
        order: index,
        isActive: true,
      });
    });

    await community.save();

    res.json({
      success: true,
      community,
      nextStep: "domain",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STEP 5: Custom Domain Setup (Optional)
router.post("/:id/domain", auth, async (req, res) => {
  try {
    const { domain } = req.body;

    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Check if domain is already taken
    const domainExists = await Community.findOne({
      "domain.custom": domain,
      _id: { $ne: community._id },
    });

    if (domainExists) {
      return res.status(400).json({
        success: false,
        message: "Domain already in use",
      });
    }

    // Generate verification code
    const crypto = require("crypto");
    const verificationCode = crypto.randomBytes(16).toString("hex");

    community.domain = {
      custom: domain,
      verified: false,
      verificationCode,
      dnsRecords: [
        {
          type: "A",
          host: "@",
          value: process.env.SERVER_IP || "123.456.789.0",
          verified: false,
        },
        {
          type: "CNAME",
          host: "www",
          value: `${community.slug}.${
            process.env.BASE_DOMAIN || "yourapp.com"
          }`,
          verified: false,
        },
        {
          type: "TXT",
          host: "_verification",
          value: verificationCode,
          verified: false,
        },
      ],
    };

    await community.save();

    res.json({
      success: true,
      community,
      nextStep: "complete",
      instructions: {
        message: "Add these DNS records to your domain provider",
        records: community.domain.dnsRecords.map((r) => ({
          type: r.type,
          host: r.host,
          value: r.value,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify Custom Domain
router.post("/:id/domain/verify", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (!community.domain.custom) {
      return res
        .status(400)
        .json({ success: false, message: "No custom domain set" });
    }

    const dns = require("dns").promises;
    let allVerified = true;

    // Check TXT record for verification
    try {
      const txtRecords = await dns.resolveTxt(
        `_verification.${community.domain.custom}`
      );
      const txtVerified = txtRecords.some(
        (record) => record[0] === community.domain.verificationCode
      );

      if (txtVerified) {
        const txtRecord = community.domain.dnsRecords.find(
          (r) => r.type === "TXT"
        );
        if (txtRecord) txtRecord.verified = true;
        community.domain.verified = true;
        community.domain.verifiedAt = new Date();
      } else {
        allVerified = false;
      }
    } catch (error) {
      allVerified = false;
    }

    await community.save();

    res.json({
      success: allVerified,
      community,
      message: allVerified
        ? "Domain verified successfully!"
        : "Verification pending. Please check DNS propagation.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STEP 6: Complete Setup & Publish
router.post("/:id/publish", auth, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    if (community.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    community.isActive = true;
    await community.save();

    // Send welcome email
    // await emailService.sendCommunityCreatedEmail(req.user, community);

    res.json({
      success: true,
      community,
      message: "Community published successfully!",
      redirectUrl: `/community/${community.slug}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### C. Member Management

```javascript
// Join Request (for manual approval communities)
router.post("/:id/request-join", auth, async (req, res) => {
  try {
    const { answers } = req.body; // Answers to approval questions

    const community = await Community.findById(req.params.id);

    if (!community) {
      return res
        .status(404)
        .json({ success: false, message: "Community not found" });
    }

    // Check if already a member
    const existingMember = community.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Already a member or request pending",
      });
    }

    // Check if already requested
    const existingRequest = community.joinRequests.find(
      (r) =>
        r.user.toString() === req.user._id.toString() && r.status === "pending"
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Join request already pending",
      });
    }

    // Add join request
    community.joinRequests.push({
      user: req.user._id,
      answers: answers || [],
      status: "pending",
    });

    await community.save();

    // Notify admins
    // await notificationService.notifyAdmins(community, 'new_join_request', req.user);

    res.json({
      success: true,
      message: "Join request submitted. Waiting for approval.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve Join Request
router.post(
  "/:id/approve-request/:requestId",
  auth,
  checkPermission("manage_members"),
  async (req, res) => {
    try {
      const community = await Community.findById(req.params.id);

      const request = community.joinRequests.id(req.params.requestId);

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      if (request.status !== "pending") {
        return res
          .status(400)
          .json({ success: false, message: "Request already processed" });
      }

      // Approve request
      request.status = "approved";
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();

      // Add as member
      community.members.push({
        user: request.user,
        role: "member",
        status: "active",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      });

      community.stats.memberCount++;

      await community.save();

      // Send welcome email
      // await emailService.sendWelcomeEmail(request.user, community);

      res.json({ success: true, message: "Member approved" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Reject Join Request
router.post(
  "/:id/reject-request/:requestId",
  auth,
  checkPermission("manage_members"),
  async (req, res) => {
    try {
      const { reason } = req.body;

      const community = await Community.findById(req.params.id);
      const request = community.joinRequests.id(req.params.requestId);

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      request.status = "rejected";
      request.reviewedBy = req.user._id;
      request.reviewedAt = new Date();
      request.rejectionReason = reason;

      await community.save();

      res.json({ success: true, message: "Request rejected" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Update Member Role
router.put(
  "/:id/members/:memberId/role",
  auth,
  checkPermission("manage_roles"),
  async (req, res) => {
    try {
      const { role } = req.body;

      const community = await Community.findById(req.params.id);
      const member = community.members.id(req.params.memberId);

      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      // Can't change owner role
      if (member.role === "owner") {
        return res
          .status(400)
          .json({ success: false, message: "Cannot change owner role" });
      }

      const oldRole = member.role;
      member.role = role;

      await community.save();

      res.json({
        success: true,
        message: `Role updated from ${oldRole} to ${role}`,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Suspend Member
router.post(
  "/:id/members/:memberId/suspend",
  auth,
  checkPermission("manage_members"),
  async (req, res) => {
    try {
      const { reason, duration } = req.body; // duration in days

      const community = await Community.findById(req.params.id);
      const member = community.members.id(req.params.memberId);

      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      member.status = "suspended";

      await community.save();

      // Schedule unsuspension
      if (duration) {
        // Add to job queue to unsuspend after duration
      }

      res.json({ success: true, message: "Member suspended" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Ban Member
router.post(
  "/:id/members/:memberId/ban",
  auth,
  checkPermission("manage_members"),
  async (req, res) => {
    try {
      const { reason, permanent } = req.body;

      const community = await Community.findById(req.params.id);
      const member = community.members.id(req.params.memberId);

      if (!member) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      member.status = "banned";

      await community.save();

      res.json({ success: true, message: "Member banned" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Remove Member
router.delete(
  "/:id/members/:memberId",
  auth,
  checkPermission("manage_members"),
  async (req, res) => {
    try {
      const community = await Community.findById(req.params.id);

      const memberIndex = community.members.findIndex(
        (m) => m._id.toString() === req.params.memberId
      );

      if (memberIndex === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      const member = community.members[memberIndex];

      // Can't remove owner
      if (member.role === "owner") {
        return res
          .status(400)
          .json({ success: false, message: "Cannot remove owner" });
      }

      community.members.splice(memberIndex, 1);
      community.stats.memberCount--;

      await community.save();

      res.json({ success: true, message: "Member removed" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
```

---

## 3. Access Control & Permissions

### A. Role-Based Access Control (RBAC)

```javascript
// backend/src/middleware/permissions.js (Complete Version)
const Community = require("../models/Community");

// Define all possible permissions
const PERMISSIONS = {
  // Community Management
  MANAGE_COMMUNITY: "manage_community",
  DELETE_COMMUNITY: "delete_community",
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_INTEGRATIONS: "manage_integrations",
  VIEW_ANALYTICS: "view_analytics",

  // Member Management
  MANAGE_MEMBERS: "manage_members",
  MANAGE_ROLES: "manage_roles",
  APPROVE_MEMBERS: "approve_members",
  BAN_MEMBERS: "ban_members",

  // Content Management
  CREATE_POST: "create_post",
  EDIT_OWN_POST: "edit_own_post",
  EDIT_ANY_POST: "edit_any_post",
  DELETE_OWN_POST: "delete_own_post",
  DELETE_ANY_POST: "delete_any_post",
  PIN_POST: "pin_post",
  FEATURE_POST: "feature_post",

  // Comments
  CREATE_COMMENT: "create_comment",
  EDIT_OWN_COMMENT: "edit_own_comment",
  EDIT_ANY_COMMENT: "edit_any_comment",
  DELETE_OWN_COMMENT: "delete_own_comment",
  DELETE_ANY_COMMENT: "delete_any_comment",
  MODERATE_COMMENTS: "moderate_comments",

  // Courses
  CREATE_COURSE: "create_course",
  EDIT_OWN_COURSE: "edit_own_course",
  EDIT_ANY_COURSE: "edit_any_course",
  DELETE_OWN_COURSE: "delete_own_course",
  DELETE_ANY_COURSE: "delete_any_course",
  VIEW_COURSES: "view_courses",
  ENROLL_COURSE: "enroll_course",

  // Events
  CREATE_EVENT: "create_event",
  EDIT_OWN_EVENT: "edit_own_event",
  EDIT_ANY_EVENT: "edit_any_event",
  DELETE_OWN_EVENT: "delete_own_event",
  DELETE_ANY_EVENT: "delete_any_event",

  // Interactions
  LIKE: "like",
  REACT: "react",
  SHARE: "share",

  // Messaging
  SEND_MESSAGE: "send_message",
  CREATE_GROUP_CHAT: "create_group_chat",

  // Billing
  MANAGE_BILLING: "manage_billing",
  VIEW_REVENUE: "view_revenue",
};

// Role permission mappings
const ROLE_PERMISSIONS = {
  owner: [
    // Full access to everything
    ...Object.values(PERMISSIONS),
  ],

  admin: [
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_MEMBERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.APPROVE_MEMBERS,
    PERMISSIONS.BAN_MEMBERS,
    PERMISSIONS.CREATE_POST,
    PERMISSIONS.EDIT_OWN_POST,
    PERMISSIONS.EDIT_ANY_POST,
    PERMISSIONS.DELETE_OWN_POST,
    PERMISSIONS.DELETE_ANY_POST,
    PERMISSIONS.PIN_POST,
    PERMISSIONS.FEATURE_POST,
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_OWN_COMMENT,
    PERMISSIONS.EDIT_ANY_COMMENT,
    PERMISSIONS.DELETE_OWN_COMMENT,
    PERMISSIONS.DELETE_ANY_COMMENT,
    PERMISSIONS.MODERATE_COMMENTS,
    PERMISSIONS.CREATE_COURSE,
    PERMISSIONS.EDIT_OWN_COURSE,
    PERMISSIONS.EDIT_ANY_COURSE,
    PERMISSIONS.DELETE_OWN_COURSE,
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.ENROLL_COURSE,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_OWN_EVENT,
    PERMISSIONS.EDIT_ANY_EVENT,
    PERMISSIONS.DELETE_OWN_EVENT,
    PERMISSIONS.LIKE,
    PERMISSIONS.REACT,
    PERMISSIONS.SHARE,
    PERMISSIONS.SEND_MESSAGE,
    PERMISSIONS.CREATE_GROUP_CHAT,
  ],

  moderator: [
    PERMISSIONS.APPROVE_MEMBERS,
    PERMISSIONS.CREATE_POST,
    PERMISSIONS.EDIT_OWN_POST,
    PERMISSIONS.EDIT_ANY_POST,
    PERMISSIONS.DELETE_ANY_POST,
    PERMISSIONS.PIN_POST,
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_OWN_COMMENT,
    PERMISSIONS.EDIT_ANY_COMMENT,
    PERMISSIONS.DELETE_ANY_COMMENT,
    PERMISSIONS.MODERATE_COMMENTS,
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.ENROLL_COURSE,
    PERMISSIONS.CREATE_EVENT,
    PERMISSIONS.EDIT_OWN_EVENT,
    PERMISSIONS.LIKE,
    PERMISSIONS.REACT,
    PERMISSIONS.SHARE,
    PERMISSIONS.SEND_MESSAGE,
  ],

  member: [
    PERMISSIONS.CREATE_POST,
    PERMISSIONS.EDIT_OWN_POST,
    PERMISSIONS.DELETE_OWN_POST,
    PERMISSIONS.CREATE_COMMENT,
    PERMISSIONS.EDIT_OWN_COMMENT,
    PERMISSIONS.DELETE_OWN_COMMENT,
    PERMISSIONS.VIEW_COURSES,
    PERMISSIONS.ENROLL_COURSE,
    PERMISSIONS.LIKE,
    PERMISSIONS.REACT,
    PERMISSIONS.SHARE,
    PERMISSIONS.SEND_MESSAGE,
  ],

  guest: [PERMISSIONS.VIEW_COURSES],
};

/**
 * Check if user has specific permission in community
 */
function checkPermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      const communityId = req.params.id || req.params.communityId;

      const community = await Community.findById(communityId);

      if (!community) {
        return res.status(404).json({
          success: false,
          message: "Community not found",
        });
      }

      // Find user membership
      const membership = community.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Not a member of this community",
        });
      }

      // Check if member is active
      if (membership.status !== "active") {
        return res.status(403).json({
          success: false,
          message: `Account status: ${membership.status}`,
        });
      }

      // Get permissions for user's role
      const userPermissions = ROLE_PERMISSIONS[membership.role] || [];

      // Check permission
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
          required: requiredPermission,
          role: membership.role,
        });
      }

      // Attach membership to request
      req.membership = membership;
      req.community = community;
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

/**
 * Check if user has ANY of the specified permissions
 */
function checkAnyPermission(...permissions) {
  return async (req, res, next) => {
    try {
      const communityId = req.params.id || req.params.communityId;
      const community = await Community.findById(communityId);

      if (!community) {
        return res
          .status(404)
          .json({ success: false, message: "Community not found" });
      }

      const membership = community.members.find(
        (m) => m.user.toString() === req.user._id.toString()
      );

      if (!membership || membership.status !== "active") {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      const userPermissions = ROLE_PERMISSIONS[membership.role] || [];
      const hasPermission = permissions.some((p) =>
        userPermissions.includes(p)
      );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: "Insufficient permissions",
        });
      }

      req.membership = membership;
      req.community = community;
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

/**
 * Check if user is resource owner
 */
function checkResourceOwner(resourceModel, resourceIdParam = "resourceId") {
  return async (req, res, next) => {
    try {
      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(req.params[resourceIdParam]);

      if (!resource) {
        return res
          .status(404)
          .json({ success: false, message: "Resource not found" });
      }

      // Check if user is the author/creator
      const authorId =
        resource.author?._id ||
        resource.author ||
        resource.createdBy?._id ||
        resource.createdBy;

      if (authorId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not the resource owner" });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  checkPermission,
  checkAnyPermission,
  checkResourceOwner,
};
```

### B. Content Gating by Subscription Tier

```javascript
// backend/src/middleware/contentGate.js (Enhanced)
const UserSubscription = require("../models/UserSubscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");

/**
 * Gate content based on subscription tier
 */
function requireSubscription(requiredTier = "basic") {
  return async (req, res, next) => {
    try {
      const communityId = req.params.id || req.params.communityId;

      // Find user's active subscription
      const subscription = await UserSubscription.findOne({
        user: req.user._id,
        community: communityId,
        status: { $in: ["active", "trial"] },
      }).populate("plan");

      if (!subscription) {
        return res.status(402).json({
          success: false,
          message: "Subscription required",
          action: "subscribe",
          requiredTier,
        });
      }

      // Check if subscription is active
      if (
        subscription.status === "trial" &&
        subscription.trial.endDate < new Date()
      ) {
        return res.status(402).json({
          success: false,
          message: "Trial expired. Please subscribe to continue.",
          action: "subscribe",
        });
      }

      // Tier hierarchy
      const tierHierarchy = {
        free: 0,
        basic: 1,
        premium: 2,
        vip: 3,
        enterprise: 4,
      };

      const userTierLevel = tierHierarchy[subscription.plan.name] || 0;
      const requiredTierLevel = tierHierarchy[requiredTier] || 0;

      if (userTierLevel < requiredTierLevel) {
        return res.status(402).json({
          success: false,
          message: `${requiredTier} subscription required`,
          action: "upgrade",
          currentTier: subscription.plan.name,
          requiredTier,
          upgradeUrl: `/pricing?upgrade=${requiredTier}`,
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error("Content gate error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

/**
 * Check feature limits (e.g., monthly posts, storage)
 */
function checkFeatureLimit(featureName) {
  return async (req, res, next) => {
    try {
      const subscription = await UserSubscription.findOne({
        user: req.user._id,
        status: "active",
      }).populate("plan");

      if (!subscription) {
        return res.status(402).json({
          success: false,
          message: "Subscription required",
        });
      }

      const plan = subscription.plan;
      const limit = plan.limits[featureName];

      // If limit is null, it's unlimited
      if (limit === null || limit === undefined) {
        return next();
      }

      // Check current usage
      // This would need to track usage in a separate collection
      const usage = await getFeatureUsage(req.user._id, featureName);

      if (usage >= limit) {
        return res.status(429).json({
          success: false,
          message: `${featureName} limit reached`,
          limit,
          usage,
          action: "upgrade",
        });
      }

      req.featureUsage = { limit, usage, remaining: limit - usage };
      next();
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

async function getFeatureUsage(userId, featureName) {
  // Implementation depends on feature
  // Could track in a Usage model or aggregate from related models
  const Usage = require("../models/Usage");
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await Usage.findOne({
    user: userId,
    feature: featureName,
    period: { $gte: startOfMonth },
  });

  return usage?.count || 0;
}

module.exports = {
  requireSubscription,
  checkFeatureLimit,
};
```

### C. Drip Content System

```javascript
// backend/src/models/DripSchedule.js (Complete)
const mongoose = require("mongoose");

const dripScheduleSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    unlockTrigger: {
      type: String,
      enum: [
        "immediate", // Unlock immediately
        "enrollment", // X days after enrollment
        "previous_lesson", // After completing previous lesson
        "specific_date", // On a specific date
        "subscription_days", // X days after subscription
        "manual", // Manually unlocked by admin
      ],
      required: true,
      default: "immediate",
    },

    // For 'enrollment' and 'subscription_days' triggers
    unlockDelay: {
      days: { type: Number, default: 0 },
      hours: { type: Number, default: 0 },
      minutes: { type: Number, default: 0 },
    },

    // For 'specific_date' trigger
    unlockDate: Date,

    // For 'previous_lesson' trigger
    requiredLesson: {
      type: mongoose.Schema.Types.ObjectId,
    },
    requiredCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    }, // % completion required

    // For 'subscription_days' trigger
    requiredSubscriptionDays: Number,

    // Manual unlock tracking
    manualUnlocks: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        unlockedAt: Date,
        reason: String,
      },
    ],

    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Index for performance
dripScheduleSchema.index({ course: 1, lesson: 1 });
dripScheduleSchema.index({ unlockTrigger: 1 });

/**
 * Check if content is unlocked for a specific user
 */
dripScheduleSchema.statics.isUnlocked = async function (lessonId, userId) {
  const schedule = await this.findOne({ lesson: lessonId, isActive: true });

  // No drip schedule = unlocked
  if (!schedule) return { unlocked: true, reason: "no_schedule" };

  // Check manual unlock
  const manualUnlock = schedule.manualUnlocks.find(
    (u) => u.user.toString() === userId.toString()
  );
  if (manualUnlock) {
    return {
      unlocked: true,
      reason: "manual",
      unlockedAt: manualUnlock.unlockedAt,
    };
  }

  const CourseEnrollment = require("./CourseEnrollment");
  const LessonProgress = require("./LessonProgress");
  const UserSubscription = require("./UserSubscription");

  const enrollment = await CourseEnrollment.findOne({
    course: schedule.course,
    user: userId,
  });

  if (!enrollment) {
    return { unlocked: false, reason: "not_enrolled" };
  }

  switch (schedule.unlockTrigger) {
    case "immediate":
      return { unlocked: true, reason: "immediate" };

    case "enrollment":
      const enrollmentDate = new Date(enrollment.enrolledAt);
      const unlockDate = new Date(enrollmentDate);
      unlockDate.setDate(unlockDate.getDate() + schedule.unlockDelay.days);
      unlockDate.setHours(unlockDate.getHours() + schedule.unlockDelay.hours);
      unlockDate.setMinutes(
        unlockDate.getMinutes() + schedule.unlockDelay.minutes
      );

      const now = new Date();
      if (now >= unlockDate) {
        return {
          unlocked: true,
          reason: "enrollment_delay",
          unlockedAt: unlockDate,
        };
      }
      return {
        unlocked: false,
        reason: "enrollment_delay",
        unlockAt: unlockDate,
        remainingTime: unlockDate - now,
      };

    case "previous_lesson":
      const progress = await LessonProgress.findOne({
        user: userId,
        lesson: schedule.requiredLesson,
      });

      if (!progress) {
        return {
          unlocked: false,
          reason: "previous_lesson",
          requiredLesson: schedule.requiredLesson,
        };
      }

      if (progress.progress >= schedule.requiredCompletion) {
        return { unlocked: true, reason: "previous_lesson_complete" };
      }

      return {
        unlocked: false,
        reason: "previous_lesson_incomplete",
        requiredCompletion: schedule.requiredCompletion,
        currentProgress: progress.progress,
      };

    case "specific_date":
      if (new Date() >= schedule.unlockDate) {
        return {
          unlocked: true,
          reason: "date_reached",
          unlockedAt: schedule.unlockDate,
        };
      }
      return {
        unlocked: false,
        reason: "date_not_reached",
        unlockAt: schedule.unlockDate,
        remainingTime: schedule.unlockDate - new Date(),
      };

    case "subscription_days":
      const subscription = await UserSubscription.findOne({
        user: userId,
        status: "active",
      });

      if (!subscription) {
        return { unlocked: false, reason: "no_subscription" };
      }

      const subscriptionAge =
        (Date.now() - subscription.createdAt) / (1000 * 60 * 60 * 24);
      if (subscriptionAge >= schedule.requiredSubscriptionDays) {
        return { unlocked: true, reason: "subscription_age" };
      }

      return {
        unlocked: false,
        reason: "subscription_too_new",
        requiredDays: schedule.requiredSubscriptionDays,
        currentDays: Math.floor(subscriptionAge),
      };

    case "manual":
      return { unlocked: false, reason: "manual_unlock_required" };

    default:
      return { unlocked: true, reason: "default" };
  }
};

/**
 * Manually unlock content for a user
 */
dripScheduleSchema.methods.manuallyUnlock = async function (
  userId,
  adminId,
  reason
) {
  this.manualUnlocks.push({
    user: userId,
    unlockedBy: adminId,
    unlockedAt: new Date(),
    reason,
  });

  await this.save();
  return true;
};

module.exports = mongoose.model("DripSchedule", dripScheduleSchema);
```

**Part 2 Complete!** ✅

---

## 4. Core Features Implementation

### A. Enhanced Post & Feed System

```javascript
// backend/src/models/Post.js (Complete Enhanced Version)
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Content
    content: {
      text: { type: String, maxlength: 10000 },
      html: String, // Sanitized HTML version
      mentions: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      hashtags: [String],
    },

    // Post Type
    type: {
      type: String,
      enum: ["text", "poll", "announcement", "question", "celebration"],
      default: "text",
    },

    // Media
    media: [
      {
        type: { type: String, enum: ["image", "video", "file", "link"] },
        url: String,
        thumbnail: String,
        filename: String,
        size: Number,
        mimeType: String,
        duration: Number, // For videos
        dimensions: {
          width: Number,
          height: Number,
        },
      },
    ],

    // Poll (if type is 'poll')
    poll: {
      question: String,
      options: [
        {
          text: { type: String, required: true },
          votes: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
          ],
          voteCount: { type: Number, default: 0 },
        },
      ],
      allowMultiple: { type: Boolean, default: false },
      endDate: Date,
      isAnonymous: { type: Boolean, default: false },
    },

    // Category
    category: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Engagement
    reactions: {
      like: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      love: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      celebrate: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      insightful: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      curious: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },

    reactionCounts: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      celebrate: { type: Number, default: 0 },
      insightful: { type: Number, default: 0 },
      curious: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ["published", "draft", "pending", "flagged", "removed"],
      default: "published",
    },

    isPinned: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }, // Disable comments

    // Moderation
    flags: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        flaggedAt: Date,
      },
    ],

    moderationNotes: [
      {
        moderator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
        action: String,
        createdAt: Date,
      },
    ],

    // SEO
    slug: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    editedAt: Date,
    publishedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ author: 1 });
postSchema.index({ status: 1, isPinned: -1, createdAt: -1 });
postSchema.index({ "content.hashtags": 1 });
postSchema.index({ category: 1 });

// Virtual for total engagement
postSchema.virtual("engagementScore").get(function () {
  return (
    this.reactionCounts.total + this.commentCount * 2 + this.shareCount * 3
  );
});

module.exports = mongoose.model("Post", postSchema);
```

```javascript
// backend/src/models/Comment.js (Complete)
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Content
    content: {
      text: { type: String, required: true, maxlength: 5000 },
      html: String,
      mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },

    // Threading
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },

    // Reactions
    reactions: {
      like: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      love: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      insightful: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },

    reactionCounts: {
      like: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      insightful: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    replyCount: { type: Number, default: 0 },

    // Status
    status: {
      type: String,
      enum: ["published", "pending", "flagged", "removed"],
      default: "published",
    },

    isEdited: { type: Boolean, default: false },
    editedAt: Date,

    // Moderation
    flags: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reason: String,
        flaggedAt: Date,
      },
    ],

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model("Comment", commentSchema);
```

```javascript
// backend/src/routes/posts.js (Enhanced Feed Routes)
const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const auth = require("../middleware/auth");
const { checkPermission } = require("../middleware/permissions");

// Get Community Feed (with filters & sorting)
router.get("/community/:communityId", auth, async (req, res) => {
  try {
    const { sort = "recent", category, type, page = 1, limit = 20 } = req.query;

    const query = {
      community: req.params.communityId,
      status: "published",
    };

    if (category) query.category = category;
    if (type) query.type = type;

    let sortOption = {};
    switch (sort) {
      case "recent":
        sortOption = { isPinned: -1, createdAt: -1 };
        break;
      case "popular":
        sortOption = {
          isPinned: -1,
          "reactionCounts.total": -1,
          commentCount: -1,
        };
        break;
      case "trending":
        // Posts with high engagement in last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        query.createdAt = { $gte: sevenDaysAgo };
        sortOption = { isPinned: -1, engagementScore: -1 };
        break;
      case "unanswered":
        query.type = "question";
        query.commentCount = 0;
        sortOption = { createdAt: -1 };
        break;
    }

    const skip = (page - 1) * limit;

    const posts = await Post.find(query)
      .populate("author", "name avatar username")
      .populate("category", "name color")
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Post.countDocuments(query);

    res.json({
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create Post
router.post("/", auth, checkPermission("create_post"), async (req, res) => {
  try {
    const { communityId, content, type, media, poll, category } = req.body;

    const postData = {
      community: communityId,
      author: req.user._id,
      content: {
        text: content.text,
        mentions: content.mentions || [],
        hashtags: extractHashtags(content.text),
      },
      type: type || "text",
      category,
      status: "published",
      publishedAt: new Date(),
    };

    if (media && media.length > 0) {
      postData.media = media;
    }

    if (type === "poll" && poll) {
      postData.poll = {
        question: poll.question,
        options: poll.options.map((opt) => ({
          text: opt,
          votes: [],
          voteCount: 0,
        })),
        allowMultiple: poll.allowMultiple || false,
        endDate: poll.endDate,
        isAnonymous: poll.isAnonymous || false,
      };
    }

    const post = await Post.create(postData);

    await post.populate("author", "name avatar username");

    // Update community stats
    const Community = require("../models/Community");
    await Community.findByIdAndUpdate(communityId, {
      $inc: { "stats.postCount": 1 },
    });

    // Update member post count
    await Community.updateOne(
      { _id: communityId, "members.user": req.user._id },
      { $inc: { "members.$.postCount": 1 } }
    );

    // Notify mentioned users
    if (content.mentions && content.mentions.length > 0) {
      // await notificationService.notifyMentions(content.mentions, post);
    }

    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Vote on Poll
router.post("/:id/poll/vote", auth, async (req, res) => {
  try {
    const { optionIndex } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post || post.type !== "poll") {
      return res
        .status(404)
        .json({ success: false, message: "Poll not found" });
    }

    if (post.poll.endDate && new Date() > post.poll.endDate) {
      return res
        .status(400)
        .json({ success: false, message: "Poll has ended" });
    }

    const option = post.poll.options[optionIndex];

    if (!option) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid option" });
    }

    // Check if user already voted
    const alreadyVoted = post.poll.options.some((opt) =>
      opt.votes.includes(req.user._id)
    );

    if (alreadyVoted && !post.poll.allowMultiple) {
      // Remove previous vote
      post.poll.options.forEach((opt) => {
        const index = opt.votes.indexOf(req.user._id);
        if (index > -1) {
          opt.votes.splice(index, 1);
          opt.voteCount--;
        }
      });
    }

    // Add vote
    option.votes.push(req.user._id);
    option.voteCount++;

    await post.save();

    res.json({ success: true, poll: post.poll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// React to Post
router.post("/:id/react", auth, async (req, res) => {
  try {
    const { reactionType } = req.body; // 'like', 'love', 'celebrate', etc.

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const validReactions = [
      "like",
      "love",
      "celebrate",
      "insightful",
      "curious",
    ];

    if (!validReactions.includes(reactionType)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid reaction type" });
    }

    // Remove user from all reaction types first
    validReactions.forEach((type) => {
      const index = post.reactions[type].indexOf(req.user._id);
      if (index > -1) {
        post.reactions[type].splice(index, 1);
        post.reactionCounts[type]--;
        post.reactionCounts.total--;
      }
    });

    // Add new reaction
    post.reactions[reactionType].push(req.user._id);
    post.reactionCounts[reactionType]++;
    post.reactionCounts.total++;

    await post.save();

    res.json({
      success: true,
      reactionCounts: post.reactionCounts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove Reaction
router.delete("/:id/react", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const validReactions = [
      "like",
      "love",
      "celebrate",
      "insightful",
      "curious",
    ];

    validReactions.forEach((type) => {
      const index = post.reactions[type].indexOf(req.user._id);
      if (index > -1) {
        post.reactions[type].splice(index, 1);
        post.reactionCounts[type]--;
        post.reactionCounts.total--;
      }
    });

    await post.save();

    res.json({
      success: true,
      reactionCounts: post.reactionCounts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add Comment
router.post(
  "/:id/comments",
  auth,
  checkPermission("create_comment"),
  async (req, res) => {
    try {
      const { content, parentCommentId } = req.body;

      const post = await Post.findById(req.params.id);

      if (!post) {
        return res
          .status(404)
          .json({ success: false, message: "Post not found" });
      }

      if (post.isLocked) {
        return res
          .status(403)
          .json({ success: false, message: "Comments are locked" });
      }

      const comment = await Comment.create({
        post: req.params.id,
        author: req.user._id,
        content: {
          text: content.text,
          mentions: content.mentions || [],
        },
        parentComment: parentCommentId || null,
      });

      await comment.populate("author", "name avatar username");

      // Update post comment count
      post.commentCount++;
      await post.save();

      // Update parent comment reply count
      if (parentCommentId) {
        await Comment.findByIdAndUpdate(parentCommentId, {
          $inc: { replyCount: 1 },
        });
      }

      // Update member comment count
      const Community = require("../models/Community");
      await Community.updateOne(
        { _id: post.community, "members.user": req.user._id },
        { $inc: { "members.$.commentCount": 1 } }
      );

      res.json({ success: true, comment });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Get Comments (with threading)
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const skip = (page - 1) * limit;

    // Get top-level comments
    const comments = await Comment.find({
      post: req.params.id,
      parentComment: null,
      status: "published",
    })
      .populate("author", "name avatar username")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get reply counts and first few replies for each
    for (let comment of comments) {
      const replies = await Comment.find({
        parentComment: comment._id,
        status: "published",
      })
        .populate("author", "name avatar username")
        .sort({ createdAt: 1 })
        .limit(3)
        .lean();

      comment.replies = replies;
      comment.hasMoreReplies = comment.replyCount > 3;
    }

    const total = await Comment.countDocuments({
      post: req.params.id,
      parentComment: null,
      status: "published",
    });

    res.json({
      success: true,
      comments,
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

// Pin Post
router.post("/:id/pin", auth, checkPermission("pin_post"), async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { isPinned: true },
      { new: true }
    );

    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function
function extractHashtags(text) {
  const regex = /#[\w]+/g;
  const matches = text.match(regex);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
}

module.exports = router;
```

### B. Course/LMS System

```javascript
// backend/src/models/Course.js (Enhanced)
const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },

    // Basic Info
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true },
    description: { type: String, maxlength: 5000 },
    shortDescription: { type: String, maxlength: 200 },

    // Instructor
    instructor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: String,
      avatar: String,
      bio: String,
    },

    // Content
    cover: String,
    trailer: String, // Video trailer URL

    lessons: [
      {
        title: { type: String, required: true },
        description: String,
        type: {
          type: String,
          enum: ["video", "text", "quiz", "assignment", "resource"],
          default: "video",
        },
        content: {
          video: {
            url: String,
            duration: Number, // seconds
            thumbnail: String,
            provider: String, // 'vimeo', 'youtube', 'cloudflare', 'self'
          },
          text: {
            html: String,
            markdown: String,
          },
          quiz: {
            questions: [
              {
                question: String,
                type: {
                  type: String,
                  enum: ["multiple", "single", "true-false", "short"],
                },
                options: [String],
                correctAnswer: mongoose.Schema.Types.Mixed,
                explanation: String,
                points: { type: Number, default: 1 },
              },
            ],
            passingScore: { type: Number, default: 70 },
            allowRetry: { type: Boolean, default: true },
            maxAttempts: { type: Number, default: 3 },
          },
          assignment: {
            instructions: String,
            submissionType: {
              type: String,
              enum: ["text", "file", "link", "multiple"],
            },
            maxFileSize: Number,
            allowedFileTypes: [String],
            dueDate: Date,
            points: Number,
          },
          resource: {
            files: [
              {
                name: String,
                url: String,
                type: String,
                size: Number,
              },
            ],
            links: [
              {
                title: String,
                url: String,
                description: String,
              },
            ],
          },
        },
        duration: Number, // minutes
        order: { type: Number, default: 0 },
        isFree: { type: Boolean, default: false },
        isPublished: { type: Boolean, default: true },
      },
    ],

    // Organization
    sections: [
      {
        title: String,
        description: String,
        lessons: [{ type: mongoose.Schema.Types.ObjectId }],
        order: Number,
      },
    ],

    // Settings
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all"],
      default: "all",
    },

    language: { type: String, default: "English" },

    requirements: [String],
    learningOutcomes: [String],

    // Access Control
    accessType: {
      type: String,
      enum: ["free", "basic", "premium", "vip", "enterprise"],
      default: "free",
    },

    price: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },

    // Enrollment
    enrollmentCount: { type: Number, default: 0 },
    completionCount: { type: Number, default: 0 },

    // Stats
    stats: {
      totalDuration: { type: Number, default: 0 }, // minutes
      lessonCount: { type: Number, default: 0 },
      videoCount: { type: Number, default: 0 },
      quizCount: { type: Number, default: 0 },
      resourceCount: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
    },

    // Status
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    publishedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
courseSchema.index({ community: 1, isPublished: 1 });
courseSchema.index({ "instructor.id": 1 });
courseSchema.index({ slug: 1 });

module.exports = mongoose.model("Course", courseSchema);
```

```javascript
// backend/src/models/CourseEnrollment.js
const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },

    // Progress
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
    currentLesson: { type: mongoose.Schema.Types.ObjectId },

    // Time Tracking
    totalWatchTime: { type: Number, default: 0 }, // minutes
    lastAccessedAt: Date,

    // Completion
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: String,

    // Performance
    quizScores: [
      {
        lesson: { type: mongoose.Schema.Types.ObjectId },
        score: Number,
        attempts: Number,
        completedAt: Date,
      },
    ],

    assignments: [
      {
        lesson: { type: mongoose.Schema.Types.ObjectId },
        submittedAt: Date,
        submission: {
          type: String,
          text: String,
          files: [String],
          links: [String],
        },
        grade: {
          score: Number,
          feedback: String,
          gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          gradedAt: Date,
        },
      },
    ],

    // Rating
    rating: {
      score: { type: Number, min: 1, max: 5 },
      review: String,
      createdAt: Date,
    },

    enrolledAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1, isCompleted: 1 });

module.exports = mongoose.model("CourseEnrollment", enrollmentSchema);
```

```javascript
// backend/src/models/LessonProgress.js
const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // Progress
    progress: { type: Number, default: 0, min: 0, max: 100 },
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,

    // Video Progress
    videoProgress: {
      currentTime: { type: Number, default: 0 }, // seconds
      duration: Number,
      watchedSegments: [
        {
          start: Number,
          end: Number,
        },
      ],
    },

    // Quiz Results (if lesson is quiz)
    quizAttempts: [
      {
        attemptNumber: Number,
        score: Number,
        answers: mongoose.Schema.Types.Mixed,
        completedAt: Date,
      },
    ],

    // Notes
    notes: [
      {
        timestamp: Number, // For video lessons
        note: String,
        createdAt: Date,
      },
    ],

    lastAccessedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
progressSchema.index({ user: 1, course: 1, lesson: 1 }, { unique: true });

module.exports = mongoose.model("LessonProgress", progressSchema);
```

### C. Gamification System

```javascript
// backend/src/models/Badge.js
const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },

    name: { type: String, required: true },
    description: String,
    icon: String,
    color: { type: String, default: "#6366f1" },

    // Criteria
    criteria: {
      type: {
        type: String,
        enum: [
          "posts",
          "comments",
          "likes_received",
          "courses_completed",
          "days_active",
          "streak",
          "points",
          "level",
          "referrals",
          "custom",
        ],
        required: true,
      },
      threshold: Number, // Required amount
      timeframe: String, // 'all-time', 'monthly', 'weekly'
    },

    // Rewards
    rewards: {
      points: { type: Number, default: 0 },
      role: String, // Automatically grant role
      discount: { type: Number, default: 0 }, // Percentage discount
    },

    rarity: {
      type: String,
      enum: ["common", "uncommon", "rare", "epic", "legendary"],
      default: "common",
    },

    isActive: { type: Boolean, default: true },
    earnedCount: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

badgeSchema.index({ community: 1, isActive: 1 });

module.exports = mongoose.model("Badge", badgeSchema);
```

```javascript
// backend/src/services/GamificationService.js (Complete)
const Community = require("../models/Community");
const Badge = require("../models/Badge");

class GamificationService {
  /**
   * Award points to a user
   */
  static async awardPoints(userId, communityId, points, reason) {
    try {
      const community = await Community.findById(communityId);
      const member = community.members.find(
        (m) => m.user.toString() === userId.toString()
      );

      if (!member) throw new Error("User not a member");

      // Add points
      member.points += points;

      // Check for level up
      const newLevel = this.calculateLevel(member.points);
      if (newLevel > member.level) {
        member.level = newLevel;
        // Notify user of level up
        // await notificationService.notify(userId, 'level_up', { level: newLevel });
      }

      await community.save();

      // Check for badge achievements
      await this.checkBadges(userId, communityId);

      return { points: member.points, level: member.level };
    } catch (error) {
      console.error("Award points error:", error);
      throw error;
    }
  }

  /**
   * Calculate level based on points
   */
  static calculateLevel(points) {
    // Level formula: level = floor(sqrt(points / 100))
    // Level 1: 0-99 points
    // Level 2: 100-399 points
    // Level 3: 400-899 points
    // Level 4: 900-1599 points
    // etc.
    return Math.floor(Math.sqrt(points / 100)) + 1;
  }

  /**
   * Calculate points required for next level
   */
  static pointsForNextLevel(currentLevel) {
    return currentLevel ** 2 * 100;
  }

  /**
   * Check and award badges
   */
  static async checkBadges(userId, communityId) {
    try {
      const community = await Community.findById(communityId);
      const member = community.members.find(
        (m) => m.user.toString() === userId.toString()
      );

      if (!member) return;

      const badges = await Badge.find({
        community: communityId,
        isActive: true,
      });

      for (let badge of badges) {
        // Check if user already has badge
        const hasBadge = member.badges.some(
          (b) => b.badge.toString() === badge._id.toString()
        );

        if (hasBadge) continue;

        // Check criteria
        let earned = false;

        switch (badge.criteria.type) {
          case "posts":
            earned = member.postCount >= badge.criteria.threshold;
            break;
          case "comments":
            earned = member.commentCount >= badge.criteria.threshold;
            break;
          case "likes_received":
            earned = member.likeCount >= badge.criteria.threshold;
            break;
          case "courses_completed":
            earned = member.coursesCompleted >= badge.criteria.threshold;
            break;
          case "points":
            earned = member.points >= badge.criteria.threshold;
            break;
          case "level":
            earned = member.level >= badge.criteria.threshold;
            break;
        }

        if (earned) {
          // Award badge
          member.badges.push({
            badge: badge._id,
            earnedAt: new Date(),
          });

          // Award bonus points
          if (badge.rewards.points > 0) {
            member.points += badge.rewards.points;
          }

          badge.earnedCount++;
          await badge.save();

          // Notify user
          // await notificationService.notify(userId, 'badge_earned', { badge });
        }
      }

      await community.save();
    } catch (error) {
      console.error("Check badges error:", error);
    }
  }

  /**
   * Get community leaderboard
   */
  static async getLeaderboard(communityId, timeframe = "all-time", limit = 50) {
    try {
      const community = await Community.findById(communityId).populate(
        "members.user",
        "name avatar username"
      );

      if (!community) throw new Error("Community not found");

      // Filter active members
      let members = community.members.filter((m) => m.status === "active");

      // Sort by points
      members.sort((a, b) => b.points - a.points);

      // Limit results
      members = members.slice(0, limit);

      // Add rank
      members = members.map((member, index) => ({
        rank: index + 1,
        user: member.user,
        points: member.points,
        level: member.level,
        badges: member.badges.length,
        postCount: member.postCount,
        commentCount: member.commentCount,
      }));

      return members;
    } catch (error) {
      console.error("Get leaderboard error:", error);
      throw error;
    }
  }

  /**
   * Track user activity for streak
   */
  static async trackActivity(userId, communityId) {
    // Implementation for tracking daily active streaks
    // Store last active date and increment streak if consecutive days
  }
}

// Point award constants
GamificationService.POINTS = {
  POST_CREATED: 10,
  COMMENT_CREATED: 5,
  LIKE_RECEIVED: 1,
  COURSE_COMPLETED: 50,
  QUIZ_PASSED: 20,
  DAILY_LOGIN: 5,
  PROFILE_COMPLETED: 25,
  INVITE_ACCEPTED: 30,
};

module.exports = GamificationService;
```

### D. Events & Calendar

```javascript
// backend/src/models/Event.js (Complete)
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },

    // Basic Info
    title: { type: String, required: true },
    description: String,
    cover: String,

    // Organizer
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Date & Time
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    timezone: { type: String, default: "UTC" },

    // Type
    type: {
      type: String,
      enum: ["online", "in-person", "hybrid"],
      default: "online",
    },

    // Location
    location: {
      type: { type: String, enum: ["venue", "online", "tbd"] },
      venue: {
        name: String,
        address: String,
        city: String,
        country: String,
        coordinates: {
          lat: Number,
          lng: Number,
        },
      },
      online: {
        platform: String, // 'zoom', 'teams', 'meet', 'custom'
        url: String,
        meetingId: String,
        password: String,
        instructions: String,
      },
    },

    // Capacity
    capacity: {
      limit: Number,
      unlimited: { type: Boolean, default: false },
    },

    // Registration
    requiresRegistration: { type: Boolean, default: true },
    registrationDeadline: Date,

    attendees: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["going", "maybe", "not-going"],
          default: "going",
        },
        registeredAt: Date,
        checkInAt: Date,
      },
    ],

    // Recurrence
    recurring: {
      isRecurring: { type: Boolean, default: false },
      pattern: {
        type: String,
        enum: ["daily", "weekly", "monthly", "custom"],
      },
      interval: Number,
      endDate: Date,
      occurrences: Number,
    },

    // Access
    accessLevel: {
      type: String,
      enum: ["public", "members", "premium", "vip", "enterprise"],
      default: "members",
    },

    // Pricing
    isFree: { type: Boolean, default: true },
    price: {
      amount: Number,
      currency: { type: String, default: "USD" },
    },

    // Reminders
    reminders: [
      {
        time: Number, // minutes before event
        sent: { type: Boolean, default: false },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["draft", "published", "cancelled", "completed"],
      default: "draft",
    },

    tags: [String],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
eventSchema.index({ community: 1, startDate: 1 });
eventSchema.index({ status: 1, startDate: 1 });
eventSchema.index({ "attendees.user": 1 });

module.exports = mongoose.model("Event", eventSchema);
```

### E. Direct Messaging System

```javascript
// backend/src/models/Conversation.js
const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
    },

    // Participants
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: { type: String, enum: ["member", "admin"], default: "member" },
        joinedAt: Date,
        lastReadAt: Date,
        unreadCount: { type: Number, default: 0 },
        notifications: { type: Boolean, default: true },
      },
    ],

    // Group Chat
    isGroup: { type: Boolean, default: false },
    name: String,
    avatar: String,
    description: String,

    // Last Message
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: Date,
    },

    // Settings
    settings: {
      allowInvites: { type: Boolean, default: true },
      allowFileSharing: { type: Boolean, default: true },
      maxFileSize: { type: Number, default: 10485760 }, // 10MB
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
conversationSchema.index({ "participants.user": 1 });
conversationSchema.index({ community: 1, updatedAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
```

```javascript
// backend/src/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Content
    content: {
      text: String,
      html: String,
    },

    // Attachments
    attachments: [
      {
        type: { type: String, enum: ["image", "video", "file", "audio"] },
        url: String,
        filename: String,
        size: Number,
        mimeType: String,
      },
    ],

    // Reply/Thread
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // Reactions
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: String,
        createdAt: Date,
      },
    ],

    // Status
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: Date,
      },
    ],

    isEdited: { type: Boolean, default: false },
    editedAt: Date,

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

module.exports = mongoose.model("Message", messageSchema);
```

**Part 3 Complete!** ✅

Covered:

- Enhanced Post & Feed System with reactions, polls, threading
- Complete Course/LMS System with lessons, quizzes, assignments
- Enrollment & Progress Tracking
- Gamification (Points, Levels, Badges, Leaderboards)
- Events & Calendar with registration
- Direct Messaging System

**Ready for Part 4?** Will cover:

- Complete Database Schema with all relationships
- Technical Architecture & Infrastructure
- File Storage & Video Hosting
- Real-time Features (WebSocket)

Let me know!
