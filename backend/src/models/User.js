const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: false,
      trim: true,
      default: "Skool",
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      default: "Member",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    subscriptionTier: {
      type: String,
      enum: ["free", "basic", "premium"],
      default: "free",
    },
    subscriptionId: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "canceled", "past_due", "none", "trialing"],
      default: "none",
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    // Subscription details
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    // Stripe Connect for creators
    stripeConnectAccountId: {
      type: String,
      default: null,
    },
    stripeConnectOnboarded: {
      type: Boolean,
      default: false,
    },
    // Affiliate tracking
    affiliateCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    affiliateEarnings: {
      type: Number,
      default: 0,
    },
    phone: String,
    profilePicture: String,
    dateOfBirth: Date,
    address: String,
    city: String,
    country: String,
    bio: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    purchasedCourses: [
      {
        course: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        purchaseDate: {
          type: Date,
          default: Date.now,
        },
        amount: Number,
        stripePaymentId: String,
      },
    ],
    createdCourses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    joinedGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    socialLinks: {
      twitter: String,
      linkedin: String,
      github: String,
      website: String,
    },
    settings: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      pushNotifications: {
        type: Boolean,
        default: true,
      },
      privateMessages: {
        type: Boolean,
        default: true,
      },
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    // Course progress tracking - maps lessonId to completion status
    courseProgress: {
      type: Map,
      of: {
        completed: Boolean,
        completedAt: Date,
        watchTime: Number, // seconds watched
        lastPosition: Number, // video position in seconds
      },
      default: {},
    },
    // Community membership tracking
    joinedCommunities: [
      {
        community: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Community",
        },
        role: {
          type: String,
          enum: ["owner", "admin", "moderator", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Hash password before saving (only if password exists - for legacy users)
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords (for legacy users)
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if user has access to a course
userSchema.methods.hasAccessToCourse = function (courseId) {
  // Premium users have access to all courses
  if (this.subscriptionTier === "premium") {
    return true;
  }

  // Check if user purchased the course
  return this.purchasedCourses.some(
    (pc) => pc.course.toString() === courseId.toString()
  );
};

// Check if user can create courses
userSchema.methods.canCreateCourses = function () {
  return this.subscriptionTier === "premium";
};

module.exports = mongoose.model("User", userSchema);
