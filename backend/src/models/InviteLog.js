const mongoose = require("mongoose");

const inviteLogSchema = new mongoose.Schema(
  {
    invite: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invite",
      required: true,
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    action: {
      type: String,
      enum: ["created", "used", "expired", "revoked", "updated"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

// Indexes
inviteLogSchema.index({ invite: 1 });
inviteLogSchema.index({ community: 1 });
inviteLogSchema.index({ performedBy: 1 });
inviteLogSchema.index({ createdAt: -1 });
inviteLogSchema.index({ action: 1 });

module.exports = mongoose.model("InviteLog", inviteLogSchema);
