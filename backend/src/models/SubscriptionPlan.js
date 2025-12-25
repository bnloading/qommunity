const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "free", "basic", "premium"
    displayName: { type: String, required: true }, // "Free Plan", "Basic Plan"
    price: { type: Number, required: true },
    billingCycle: {
      type: String,
      enum: ["one_time", "monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    features: {
      maxMembers: { type: Number, default: -1 }, // -1 = unlimited
      maxCourses: { type: Number, default: -1 },
      maxStorageGB: { type: Number, default: 10 },
      customDomain: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      removeWatermark: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
      liveEvents: { type: Boolean, default: false },
      emailIntegrations: { type: Boolean, default: false },
    },
    description: String,
    trialDays: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    stripePriceId: String,
    stripeProductId: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Create index
subscriptionPlanSchema.index({ name: 1, isActive: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
