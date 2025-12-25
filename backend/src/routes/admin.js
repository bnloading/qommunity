const express = require("express");
const router = express.Router();
const { clerkAuth } = require("../middleware/clerkAuth");
const User = require("../models/User");
const Course = require("../models/Course");
const Order = require("../models/Order");
const Community = require("../models/Community");

/**
 * Middleware to check admin role
 */
const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId });

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required",
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Authorization failed" });
  }
};

/**
 * @route   GET /api/admin/statistics
 * @desc    Get platform statistics for admin dashboard
 * @access  Admin only
 */
router.get("/statistics", clerkAuth, isAdmin, async (req, res) => {
  try {
    // Get date range (default: last 30 days)
    const { startDate, endDate } = req.query;
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Total users
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    // Active subscribers
    const activeSubscribers = await User.countDocuments({
      subscriptionStatus: "active",
    });

    // Total courses
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ published: true });

    // Total revenue
    const revenueAgg = await Order.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    // Revenue in date range
    const periodRevenueAgg = await Order.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);
    const periodRevenue = periodRevenueAgg[0]?.total || 0;

    // Total orders
    const totalOrders = await Order.countDocuments({ status: "completed" });
    const pendingOrders = await Order.countDocuments({ status: "pending" });

    // Revenue by item type
    const revenueByType = await Order.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: "$itemType",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Top selling courses
    const topCourses = await Order.aggregate([
      { $match: { status: "completed", itemType: "course" } },
      {
        $group: {
          _id: "$itemId",
          revenue: { $sum: "$amount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    // Populate course details
    const topCoursesPopulated = await Course.populate(topCourses, {
      path: "_id",
      select: "title thumbnail price",
    });

    // Daily revenue trend (last 30 days)
    const revenueByDay = await Order.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Subscription distribution
    const subscriptionDistribution = await User.aggregate([
      {
        $group: {
          _id: "$subscriptionTier",
          count: { $sum: 1 },
        },
      },
    ]);

    // Total communities
    const totalCommunities = await Community.countDocuments();

    res.json({
      success: true,
      statistics: {
        users: {
          total: totalUsers,
          new: newUsers,
          activeSubscribers,
          distribution: subscriptionDistribution,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
        },
        revenue: {
          total: totalRevenue,
          period: periodRevenue,
          byType: revenueByType,
          trend: revenueByDay,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
        },
        communities: {
          total: totalCommunities,
        },
        topCourses: topCoursesPopulated,
      },
      dateRange: {
        start,
        end,
      },
    });
  } catch (error) {
    console.error("Statistics error:", error);
    res.status(500).json({
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination
 * @access  Admin only
 */
router.get("/users", clerkAuth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, tier } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (tier) {
      query.subscriptionTier = tier;
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/**
 * @route   GET /api/admin/orders
 * @desc    Get all orders with pagination
 * @access  Admin only
 */
router.get("/orders", clerkAuth, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, itemType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (itemType) query.itemType = itemType;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/**
 * @route   PUT /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Admin only
 */
router.put("/users/:userId/role", clerkAuth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["admin", "instructor", "student"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "User role updated",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update user role" });
  }
});

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user account
 * @access  Admin only
 */
router.delete("/users/:userId", clerkAuth, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;
