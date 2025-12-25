const mongoose = require("mongoose");

/**
 * Order Model
 * Tracks all purchases (courses, communities, subscriptions)
 */
const orderSchema = new mongoose.Schema(
  {
    // User who made the purchase
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
    },

    // What was purchased
    itemType: {
      type: String,
      enum: ["course", "community", "subscription"],
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "itemType",
    },
    itemName: {
      type: String,
      required: true,
    },

    // Payment details
    amount: {
      type: Number,
      required: true,
      min: 0,
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

    // Stripe details
    stripeSessionId: {
      type: String,
      unique: true,
      sparse: true,
    },
    stripePaymentIntentId: {
      type: String,
    },

    // Subscription details (if applicable)
    subscriptionId: {
      type: String,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "expired", "trialing"],
    },
    subscriptionPeriodEnd: {
      type: Date,
    },

    // Metadata
    metadata: {
      type: Map,
      of: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ stripeSessionId: 1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model("Order", orderSchema);
