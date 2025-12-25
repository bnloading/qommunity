const mongoose = require("mongoose");

const communityBillingSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
      unique: true,
    },
    // Stripe product/price IDs
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
    // Pricing configuration
    currency: {
      type: String,
      default: "usd",
      lowercase: true,
    },
    monthlyPrice: {
      type: Number, // In cents
      default: 0,
    },
    yearlyPrice: {
      type: Number, // In cents
      default: 0,
    },
    // Revenue tracking (in cents)
    totalRevenue: {
      type: Number,
      default: 0,
    },
    // Monthly revenue history
    monthlyRevenue: [
      {
        month: String, // YYYY-MM format
        revenue: Number,
        subscriptions: Number,
        coursePurchases: Number,
        affiliatePayouts: Number,
      },
    ],
    // Active subscriptions count
    activeSubscriptions: {
      type: Number,
      default: 0,
    },
    // Failed payments tracking
    failedPayments: [
      {
        stripePaymentIntentId: String,
        amount: Number,
        reason: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Refunds tracking
    refunds: [
      {
        stripeRefundId: String,
        amount: Number,
        reason: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Stripe Connect account for receiving payments
    stripeConnectAccountId: {
      type: String,
      default: null,
    },
    stripeConnectOnboarded: {
      type: Boolean,
      default: false,
    },
    // Available balance (ready for payout)
    availableBalance: {
      type: Number,
      default: 0,
    },
    // Pending balance (not yet available)
    pendingBalance: {
      type: Number,
      default: 0,
    },
    // Last synced with Stripe
    lastStripeSync: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
communityBillingSchema.index({ community: 1 });
communityBillingSchema.index({ stripeConnectAccountId: 1 });

module.exports = mongoose.model("CommunityBilling", communityBillingSchema);
