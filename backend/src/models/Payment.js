const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Support both course payments and subscription payments
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // For course payments (legacy support)
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    // For community subscription payments
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },

    // For subscription payments (new)
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
    },

    // Payment type
    type: {
      type: String,
      enum: ["course", "subscription", "one-time", "affiliate"],
      default: "course",
    },

    tier: {
      type: String,
      enum: ["free", "basic", "premium"],
      default: "free",
    },
    amount: { type: Number, required: true }, // Amount in cents
    currency: { type: String, default: "usd" },

    paymentMethod: {
      type: String,
      enum: [
        "credit_card",
        "debit_card",
        "paypal",
        "stripe",
        "bank_transfer",
        "card",
      ],
      default: "stripe",
    },

    transactionId: { type: String, unique: true, sparse: true },

    // Stripe fields
    stripeSessionId: { type: String, index: true },
    stripePaymentIntentId: { type: String, unique: true, sparse: true },
    stripeChargeId: String,
    stripeInvoiceId: String,

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded", "canceled"],
      default: "pending",
    },

    refundAmount: { type: Number, default: 0 },
    refundedAt: Date,
    refundReason: String,
    failureReason: String,

    receipt: String,
    userEmail: String,
    metadata: mongoose.Schema.Types.Mixed,

    completedAt: Date,
  },
  { timestamps: true }
);

// Indexes
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ student: 1, course: 1 });
paymentSchema.index({ community: 1, status: 1 });
paymentSchema.index({ community: 1, createdAt: -1 });
paymentSchema.index({ subscription: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ stripeSessionId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

// Helper methods
paymentSchema.methods.markAsCompleted = async function () {
  this.status = "completed";
  this.completedAt = new Date();
  return await this.save();
};

paymentSchema.methods.markAsFailed = async function (reason) {
  this.status = "failed";
  this.failureReason = reason;
  return await this.save();
};

paymentSchema.methods.refund = async function (amount) {
  this.status = "refunded";
  this.refundAmount = amount || this.amount;
  this.refundedAt = new Date();
  return await this.save();
};

module.exports = mongoose.model("Payment", paymentSchema);
