const mongoose = require("mongoose");

const coursePurchaseSchema = new mongoose.Schema(
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
    // Payment details
    stripePaymentIntentId: {
      type: String,
      required: true,
    },
    stripeCheckoutSessionId: {
      type: String,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    // Affiliate tracking
    affiliateUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    affiliateCommission: {
      type: Number,
      default: 0,
    },
    affiliateCommissionPaid: {
      type: Boolean,
      default: false,
    },
    // Access details
    accessGrantedAt: {
      type: Date,
      default: null,
    },
    // Refund details
    refundedAt: {
      type: Date,
      default: null,
    },
    refundReason: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
coursePurchaseSchema.index({ user: 1, course: 1 });
coursePurchaseSchema.index({ stripePaymentIntentId: 1 });
coursePurchaseSchema.index({ status: 1 });

module.exports = mongoose.model("CoursePurchase", coursePurchaseSchema);
