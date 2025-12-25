const mongoose = require("mongoose");

const ruleAcceptanceSchema = new mongoose.Schema(
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
    // Version of rules accepted (for tracking rule updates)
    rulesVersion: {
      type: String,
      default: "1.0",
    },
    // Hash of accepted rules content (to detect changes)
    rulesHash: {
      type: String,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// Compound index for quick lookups
ruleAcceptanceSchema.index({ user: 1, community: 1 }, { unique: true });
ruleAcceptanceSchema.index({ community: 1 });

module.exports = mongoose.model("RuleAcceptance", ruleAcceptanceSchema);
