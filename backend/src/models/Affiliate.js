const mongoose = require("mongoose");
const crypto = require("crypto");

const affiliateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    // Unique referral code
    referralCode: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(8).toString("hex"),
    },
    // Commission rate (percentage)
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    // Total earnings (in cents)
    totalEarnings: {
      type: Number,
      default: 0,
    },
    // Pending payout (not yet paid out)
    pendingPayout: {
      type: Number,
      default: 0,
    },
    // Paid out amount
    paidOut: {
      type: Number,
      default: 0,
    },
    // Conversions tracking
    conversions: [
      {
        referredUser: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        stripePaymentId: String,
        amount: Number, // Amount in cents
        commission: Number, // Commission in cents
        status: {
          type: String,
          enum: ["pending", "confirmed", "paid", "refunded"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        confirmedAt: Date,
        paidAt: Date,
      },
    ],
    // Click tracking
    clicks: {
      type: Number,
      default: 0,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Stripe Connect account (for payouts)
    stripeConnectAccountId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
affiliateSchema.index({ user: 1, community: 1 }, { unique: true });
affiliateSchema.index({ referralCode: 1 });
affiliateSchema.index({ community: 1 });
affiliateSchema.index({ isActive: 1 });

// Virtual for referral URL
affiliateSchema.virtual("referralUrl").get(function () {
  return `${process.env.CLIENT_URL}/join?ref=${this.referralCode}`;
});

// Calculate conversion rate
affiliateSchema.virtual("conversionRate").get(function () {
  if (this.clicks === 0) return 0;
  return ((this.conversions.length / this.clicks) * 100).toFixed(2);
});

module.exports = mongoose.model("Affiliate", affiliateSchema);
