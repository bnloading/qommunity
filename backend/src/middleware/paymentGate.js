const Payment = require("../models/Payment");
const User = require("../models/User");

/**
 * Middleware to check if user has paid for course/community creation privilege
 * Only teachers who have made at least one successful payment can create courses
 * Admins bypass this check
 */
const checkPaymentForCreation = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Admin bypass
    if (user.role === "admin") {
      return next();
    }

    // Check if user has at least one completed payment
    const hasPayment = await Payment.findOne({
      student: userId,
      status: "completed",
    });

    if (!hasPayment) {
      return res.status(403).json({
        success: false,
        message:
          "Payment required: You must purchase at least one course before you can create your own courses or communities",
        requiresPayment: true,
      });
    }

    // User has paid, allow creation
    next();
  } catch (error) {
    console.error("Payment check error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment status",
    });
  }
};

/**
 * Middleware to check if user can create premium content
 * Requires premium-tier payment
 */
const checkPremiumAccess = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    // Admin bypass
    if (user.role === "admin") {
      return next();
    }

    // Check for premium payment
    const hasPremiumPayment = await Payment.findOne({
      student: userId,
      status: "completed",
      tier: "premium",
    });

    if (!hasPremiumPayment) {
      return res.status(403).json({
        success: false,
        message:
          "Premium access required: Upgrade to premium tier to create premium content",
        requiresPremium: true,
      });
    }

    next();
  } catch (error) {
    console.error("Premium check error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying premium access",
    });
  }
};

/**
 * Check if user has active subscription or payment
 */
const checkActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (user.role === "admin") {
      return next();
    }

    // Check for any active payment in last 365 days
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const activePayment = await Payment.findOne({
      student: userId,
      status: "completed",
      createdAt: { $gte: oneYearAgo },
    });

    if (!activePayment) {
      return res.status(403).json({
        success: false,
        message:
          "Active subscription required: Please renew your subscription to continue creating content",
        requiresSubscription: true,
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying subscription status",
    });
  }
};

module.exports = {
  checkPaymentForCreation,
  checkPremiumAccess,
  checkActiveSubscription,
};
