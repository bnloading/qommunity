const mongoose = require("mongoose");
const crypto = require("crypto");

const inviteSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    // Permission level for invited users
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },
    // Expiration settings
    expiresAt: {
      type: Date,
      default: null, // null = never expires
    },
    // Usage limits
    maxUses: {
      type: Number,
      default: null, // null = unlimited
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    // Track who used this invite
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // For paid communities - skip payment requirement
    skipPayment: {
      type: Boolean,
      default: false,
    },
    // Notes/description
    name: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes for performance
inviteSchema.index({ token: 1 });
inviteSchema.index({ community: 1 });
inviteSchema.index({ createdBy: 1 });
inviteSchema.index({ expiresAt: 1 });
inviteSchema.index({ isActive: 1 });

// Check if invite is valid
inviteSchema.methods.isValid = function () {
  // Check if active
  if (!this.isActive) return false;

  // Check expiration
  if (this.expiresAt && new Date() > this.expiresAt) return false;

  // Check usage limit
  if (this.maxUses !== null && this.usedCount >= this.maxUses) return false;

  return true;
};

// Virtual for invite URL
inviteSchema.virtual("url").get(function () {
  return `${process.env.CLIENT_URL}/invite/${this.token}`;
});

module.exports = mongoose.model("Invite", inviteSchema);
