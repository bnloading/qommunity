const jwt = require("jsonwebtoken");
const { clerkClient } = require("@clerk/clerk-sdk-node");
const User = require("../models/User");

// Hybrid authentication - supports both JWT and Clerk tokens
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided, authorization denied",
      });
    }

    // Try JWT first (for email/password auth)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded || (!decoded.id && !decoded._id)) {
        throw new Error("Invalid token payload");
      }

      // Always fetch fresh user data to ensure complete user object
      const userId = decoded.id || decoded._id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Attach comprehensive user info to request
      req.user = {
        id: user._id.toString(),
        _id: user._id, // Keep as ObjectId for Mongoose
        email: user.email,
        role: user.role || "user",
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
      };

      return next();
    } catch (jwtError) {
      // JWT failed, try Clerk token
      console.log("🔑 JWT failed, trying Clerk authentication...");

      try {
        const sessionClaims = await clerkClient.verifyToken(token);

        if (!sessionClaims) {
          return res.status(401).json({
            success: false,
            message: "Token is not valid",
          });
        }

        // Find user by Clerk ID
        let user = await User.findOne({ clerkId: sessionClaims.sub });

        if (!user) {
          // Create user from Clerk data
          const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
          const primaryEmail = clerkUser.emailAddresses?.find(
            (email) => email.id === clerkUser.primaryEmailAddressId
          );

          // Extract name from email if no firstName/lastName provided
          const emailUsername = primaryEmail?.emailAddress?.split("@")[0] || "";
          const nameParts = emailUsername.split(/[._-]/);

          user = await User.create({
            clerkId: clerkUser.id,
            firstName: clerkUser.firstName || nameParts[0] || "User",
            lastName:
              clerkUser.lastName ||
              (nameParts[1] ? nameParts.slice(1).join(" ") : ""),
            email: primaryEmail?.emailAddress || `${clerkUser.id}@clerk.local`,
            profilePicture: clerkUser.imageUrl,
            subscriptionTier: "free",
            subscriptionStatus: "none",
          });
        } else {
          // Update existing user with latest Clerk data if needed
          const clerkUser = await clerkClient.users.getUser(sessionClaims.sub);
          let needsUpdate = false;

          if (clerkUser.firstName && user.firstName !== clerkUser.firstName) {
            user.firstName = clerkUser.firstName;
            needsUpdate = true;
          }
          if (clerkUser.lastName && user.lastName !== clerkUser.lastName) {
            user.lastName = clerkUser.lastName;
            needsUpdate = true;
          }
          if (
            clerkUser.imageUrl &&
            user.profilePicture !== clerkUser.imageUrl
          ) {
            user.profilePicture = clerkUser.imageUrl;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await user.save();
          }
        }

        // Attach user info to request (compatible format)
        req.user = {
          id: user._id.toString(),
          _id: user._id, // Keep as ObjectId for Mongoose
          email: user.email,
          role: user.role || "user",
          clerkId: sessionClaims.sub,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePicture: user.profilePicture,
        };

        req.auth = {
          userId: sessionClaims.sub,
          sessionId: sessionClaims.sid,
        };

        return next();
      } catch (clerkError) {
        console.error("❌ Clerk auth failed:", clerkError.message);
        return res.status(401).json({
          success: false,
          message: "Token is not valid",
        });
      }
    }
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
