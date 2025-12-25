const { clerkClient } = require("@clerk/clerk-sdk-node");
const User = require("../models/User");

// Token cache to reduce Clerk API calls
const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenCache.entries()) {
    if (now - data.cachedAt > CACHE_TTL) {
      tokenCache.delete(token);
    }
  }
}, 10 * 60 * 1000);

// Clerk authentication middleware
const clerkAuth = async (req, res, next) => {
  try {
    // Get the session token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No authorization header or invalid format");
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    const token = authHeader.split(" ")[1];

    // Check cache first
    const cached = tokenCache.get(token);
    let sessionClaims;
    let user;

    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      // Use cached data - no Clerk API call needed!
      sessionClaims = cached.sessionClaims;
      user = cached.user;
      console.log("⚡ Using cached token for:", user.email);
    } else {
      // Cache miss or expired - verify with Clerk
      console.log("🔑 Verifying token with Clerk API...");

      sessionClaims = await clerkClient.verifyToken(token);

      if (!sessionClaims) {
        console.log("❌ Token verification failed - invalid token");
        return res.status(401).json({ error: "Unauthorized - Invalid token" });
      }

      console.log("✅ Token verified for user:", sessionClaims.sub);

      // Ensure a corresponding Mongo user exists
      user = await User.findOne({ clerkId: sessionClaims.sub });

      if (!user) {
        console.log("👤 User not found in DB, creating from Clerk data...");
        const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
        const primaryEmail = clerkUser.emailAddresses?.find(
          (email) => email.id === clerkUser.primaryEmailAddressId
        );
        const safeFirstName =
          clerkUser.firstName?.trim() || clerkUser.username || "Skool";
        const safeLastName = clerkUser.lastName?.trim() || "Member";
        const safeEmail =
          primaryEmail?.emailAddress || `${clerkUser.id}@clerk.local`;

        // Check if user exists with this email (from old auth system)
        const existingUser = await User.findOne({ email: safeEmail });

        if (existingUser) {
          // Update existing user with Clerk ID
          existingUser.clerkId = clerkUser.id;
          existingUser.firstName = safeFirstName;
          existingUser.lastName = safeLastName;
          existingUser.profilePicture =
            clerkUser.imageUrl || existingUser.profilePicture;
          await existingUser.save();
          user = existingUser;
          console.log("✅ Linked existing user:", user.email);
        } else {
          // Create new user
          user = await User.create({
            clerkId: clerkUser.id,
            firstName: safeFirstName,
            lastName: safeLastName,
            email: safeEmail,
            profilePicture: clerkUser.imageUrl,
            subscriptionTier: "free",
            subscriptionStatus: "none",
          });
          console.log("✅ User created:", user.email);
        }
      } else {
        console.log("✅ User found:", user.email);
      }

      // Cache the verified token and user data
      tokenCache.set(token, {
        sessionClaims,
        user,
        cachedAt: Date.now(),
      });
      console.log("💾 Token cached for 5 minutes");
    }

    // Attach user info to request
    req.auth = {
      userId: sessionClaims.sub, // Clerk user ID
      sessionId: sessionClaims.sid,
    };
    req.user = user;

    next();
  } catch (error) {
    console.error("❌ Clerk auth error:", error.message);
    console.error("Full error:", error);
    return res.status(401).json({
      error: "Unauthorized",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Middleware to check if user can create courses
const canCreateCourses = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const user = await User.findOne({ clerkId: req.auth.userId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.canCreateCourses()) {
      return res.status(403).json({
        error: "Upgrade to Basic or Premium to create courses",
        subscriptionTier: user.subscriptionTier,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Check course creation permission error:", error);
    res.status(500).json({ error: "Failed to verify permissions" });
  }
};

// Middleware to check if user has access to a course
const checkCourseAccess = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const Course = require("../models/Course");

    const user = await User.findOne({ clerkId: req.auth.userId });
    const course = await Course.findById(req.params.id || req.params.courseId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Premium users have access to all courses
    if (user.subscriptionTier === "premium") {
      req.user = user;
      req.course = course;
      return next();
    }

    // Check if user purchased the course
    const hasPurchased = user.purchasedCourses.some(
      (pc) => pc.course.toString() === course._id.toString()
    );

    if (!hasPurchased) {
      return res.status(403).json({
        error: "Course not purchased",
        message: "Purchase this course or upgrade to Premium to access",
        courseId: course._id,
        price: course.price,
      });
    }

    req.user = user;
    req.course = course;
    next();
  } catch (error) {
    console.error("Check course access error:", error);
    res.status(500).json({ error: "Failed to verify course access" });
  }
};

module.exports = {
  clerkAuth,
  canCreateCourses,
  checkCourseAccess,
};
