const mongoose = require("mongoose");

const payoutSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Amount in cents
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    // Stripe payout/transfer ID
    stripePayoutId: {
      type: String,
      default: null,
    },
    stripeTransferId: {
      type: String,
      default: null,
    },
    // Status
    status: {
      type: String,
      enum: ["pending", "in_transit", "paid", "failed", "canceled"],
      default: "pending",
    },
    // Type of payout
    type: {
      type: String,
      enum: ["subscription", "course", "affiliate"],
      required: true,
    },
    // Related transaction IDs
    relatedPayments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
      },
    ],
    // Arrival date
    arrivalDate: Date,
    // Failure reason
    failureReason: String,
    // Metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes
payoutSchema.index({ community: 1 });
payoutSchema.index({ user: 1 });
payoutSchema.index({ status: 1 });
payoutSchema.index({ createdAt: -1 });
payoutSchema.index({ stripePayoutId: 1 });

module.exports = mongoose.model("Payout", payoutSchema);
