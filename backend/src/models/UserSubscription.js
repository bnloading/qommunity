const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" }, // Optional: for community-specific subscriptions
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
    },
    // Amount in cents
    amount: {
      type: Number,
      default: 0,
    },
    // Billing interval
    interval: {
      type: String,
      enum: ["month", "year"],
      default: "month",
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "paused",
        "incomplete",
        "incomplete_expired",
      ],
      default: "active",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: Date,
    trialStart: Date,
    trialEnd: Date,
    stripeSubscriptionId: { type: String, unique: true, sparse: true },
    stripeCustomerId: String,
    stripeSessionId: { type: String, index: true },
    stripePriceId: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Indexes
userSubscriptionSchema.index({ user: 1, status: 1 });
userSubscriptionSchema.index({ community: 1, status: 1 });
userSubscriptionSchema.index({ stripeSubscriptionId: 1 });
userSubscriptionSchema.index({ currentPeriodEnd: 1 });

// Helper methods
userSubscriptionSchema.methods.isActive = function () {
  return (
    this.status === "active" ||
    this.status === "trialing" ||
    (this.cancelAtPeriodEnd && new Date() < this.currentPeriodEnd)
  );
};

userSubscriptionSchema.methods.cancel = async function () {
  this.cancelAtPeriodEnd = true;
  this.canceledAt = new Date();
  return await this.save();
};

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
