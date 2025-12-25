const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
      default: null,
    },
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    instructor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      clerkId: {
        type: String,
        required: true,
      },
      name: String,
      profilePicture: String,
    },
    category: {
      type: String,
      enum: [
        "programming",
        "business",
        "design",
        "marketing",
        "personal-development",
        "data-science",
        "other",
      ],
      default: "other",
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: "usd",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    stripePriceId: {
      type: String,
      default: null,
    },
    stripeProductId: {
      type: String,
      default: null,
    },
    lessons: [
      {
        title: {
          type: String,
          required: true,
        },
        description: String,
        videoUrl: String,
        duration: Number,
        order: {
          type: Number,
          required: true,
        },
        isFree: {
          type: Boolean,
          default: false,
        },
      },
    ],
    enrolledUsers: [
      {
        type: String, // Clerk ID
      },
    ],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        user: {
          clerkId: String,
          name: String,
          profilePicture: String,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tags: [String],
    isPublished: {
      type: Boolean,
      default: false,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    studentCount: {
      type: Number,
      default: 0,
    },
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

courseSchema.index({ slug: 1 });
courseSchema.index({ instructor: 1 });

module.exports = mongoose.model("Course", courseSchema);
