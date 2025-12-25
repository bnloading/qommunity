const express = require("express");
const Course = require("../models/Course");
const Payment = require("../models/Payment");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const router = express.Router();

// Get instructor dashboard analytics
router.get("/instructor/dashboard", auth, async (req, res) => {
  try {
    const instructorId = req.user.id;

    // Get all courses taught by this instructor
    const courses = await Course.find({ instructor: instructorId }).populate(
      "students.user",
      "firstName lastName email"
    );

    // Calculate statistics
    const stats = {
      totalCourses: courses.length,
      totalStudents: 0,
      totalRevenue: 0,
      courses: [],
    };

    courses.forEach((course) => {
      const courseStats = {
        _id: course._id,
        title: course.title,
        thumbnail: course.thumbnail,
        studentCount: course.students.length,
        revenue: course.totalRevenue,
        tiers: course.tiers.map((tier) => ({
          name: tier.name,
          price: tier.price,
          studentCount: tier.studentCount,
        })),
        rating: course.rating,
      };

      stats.courses.push(courseStats);
      stats.totalStudents += course.students.length;
      stats.totalRevenue += course.totalRevenue;
    });

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get specific course analytics
router.get("/instructor/course/:courseId", auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user.id;

    const course = await Course.findById(courseId)
      .populate("students.user", "firstName lastName email profilePicture")
      .populate("lessons");

    // Verify ownership
    if (course.instructor.toString() !== instructorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Get payment info for this course
    const payments = await Payment.find({
      course: courseId,
      status: "completed",
    });

    // Calculate tier breakdown
    const tierBreakdown = {};
    course.tiers.forEach((tier) => {
      tierBreakdown[tier.name] = {
        name: tier.name,
        price: tier.price,
        studentCount: tier.studentCount,
        revenue: tier.studentCount * tier.price,
      };
    });

    const analytics = {
      course: {
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        category: course.category,
        level: course.level,
      },
      students: course.students.map((student) => ({
        _id: student.user._id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        tier: student.tier,
        enrolledAt: student.enrolledAt,
        progress: student.progress,
      })),
      statistics: {
        totalStudents: course.students.length,
        totalRevenue: course.totalRevenue,
        averageProgress:
          course.students.length > 0
            ? (
                course.students.reduce((sum, s) => sum + s.progress, 0) /
                course.students.length
              ).toFixed(2)
            : 0,
        rating: course.rating,
        lessonsCount: course.lessons.length,
      },
      tierBreakdown,
      recentPayments: payments.slice(-10),
    };

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get user's purchased courses and progress
router.get("/student/courses", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all courses user has access to
    const courses = await Course.find({
      "students.user": userId,
    })
      .populate("instructor", "firstName lastName profilePicture")
      .populate("lessons");

    const userCourses = courses.map((course) => {
      const student = course.students.find((s) => s.user.toString() === userId);
      return {
        _id: course._id,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        category: course.category,
        level: course.level,
        rating: course.rating,
        lessonsCount: course.lessons.length,
        tier: student.tier,
        progress: student.progress,
        enrolledAt: student.enrolledAt,
      };
    });

    res.status(200).json({
      success: true,
      courses: userCourses,
      totalCourses: userCourses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get global platform analytics (admin only)
router.get("/admin/overview", auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalPayments = await Payment.countDocuments({ status: "completed" });

    const totalRevenue = await Payment.aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const topInstructors = await Course.aggregate([
      {
        $group: {
          _id: "$instructor",
          courseCount: { $sum: 1 },
          totalStudents: {
            $sum: { $size: "$students" },
          },
          totalRevenue: { $sum: "$totalRevenue" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "instructorInfo",
        },
      },
    ]);

    const adminOverview = {
      totalUsers,
      totalCourses,
      totalPayments,
      totalRevenue: totalRevenue[0]?.total || 0,
      topInstructors: topInstructors.map((instructor) => ({
        _id: instructor._id,
        name: instructor.instructorInfo[0]?.firstName || "Unknown",
        courseCount: instructor.courseCount,
        totalStudents: instructor.totalStudents,
        totalRevenue: instructor.totalRevenue,
      })),
    };

    res.status(200).json({
      success: true,
      overview: adminOverview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Comprehensive admin analytics endpoint
router.get("/admin", auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // Import Community model
    const Community = require("../models/Community");

    // Get counts
    const totalUsers = await User.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalCommunities = await Community.countDocuments();
    const activeCourses = await Course.countDocuments({ status: "published" });

    // Get new users this month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth },
    });

    // Calculate revenue
    const revenueData = await Payment.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
          average: { $avg: "$amount" },
        },
      },
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    const totalPayments = revenueData[0]?.count || 0;
    const averageRevenue = revenueData[0]?.average || 0;

    const analytics = {
      totalUsers,
      totalCourses,
      totalCommunities,
      totalRevenue,
      newUsersThisMonth,
      activeCourses,
      totalPayments,
      averageRevenue,
    };

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
