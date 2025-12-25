const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");
const Course = require("../models/Course");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const router = express.Router();

// Create checkout session
router.post("/checkout", auth, async (req, res) => {
  try {
    const { courseId, tier } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!courseId || !tier) {
      return res.status(400).json({
        success: false,
        message: "Course ID and tier are required",
      });
    }

    // Find course
    const course = await Course.findById(courseId).populate("instructor");
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Find tier pricing
    const tierData = course.tiers.find((t) => t.name === tier);
    if (!tierData) {
      return res.status(400).json({
        success: false,
        message: "Tier not found",
      });
    }

    // Check if user already has access to this tier
    const existingAccess = course.accessList.find(
      (item) =>
        item.user.toString() === userId &&
        (item.tier === tier ||
          (tier === "basic" && item.tier === "premium") ||
          (tier === "premium" && item.tier === "premium"))
    );

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        message: "You already have access to this tier or a higher tier",
      });
    }

    // Get user details
    const user = await User.findById(userId);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${course.title} - ${tier.toUpperCase()} Tier`,
              description: `Access to ${course.title} (${tier} tier)`,
              images: [course.thumbnail],
            },
            unit_amount: Math.round(tierData.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: `${userId}_${courseId}_${tier}`,
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/courses/${courseId}?canceled=true`,
      metadata: {
        userId,
        courseId,
        tier,
        instructorId: course.instructor._id.toString(),
      },
    });

    // Create pending payment record
    const payment = await Payment.create({
      student: userId,
      course: courseId,
      tier,
      amount: tierData.price,
      currency: "USD",
      paymentMethod: "stripe",
      status: "pending",
      stripeSessionId: session.id,
      userEmail: user.email,
    });

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      sessionId: session.id,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify payment and grant access
router.post("/verify", auth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
      });
    }

    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment not completed",
      });
    }

    // Find payment record
    const payment = await Payment.findOne({ stripeSessionId: sessionId });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Verify user matches
    if (payment.student.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (payment.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        payment,
      });
    }

    // Update payment status
    payment.status = "completed";
    payment.completedAt = new Date();
    payment.transactionId = session.payment_intent;
    payment.stripePaymentIntentId = session.payment_intent;
    await payment.save();

    // Grant access to course
    const course = await Course.findById(payment.course);

    // Add to access list
    course.accessList.push({
      user: userId,
      tier: payment.tier,
      purchasedAt: new Date(),
      transactionId: session.payment_intent,
    });

    // Add to students if not already there
    const studentExists = course.students.find(
      (s) => s.user.toString() === userId
    );
    if (!studentExists) {
      course.students.push({
        user: userId,
        tier: payment.tier,
      });
    } else {
      // Update tier if higher
      const tierHierarchy = { free: 0, basic: 1, premium: 2 };
      if (tierHierarchy[payment.tier] > tierHierarchy[studentExists.tier]) {
        studentExists.tier = payment.tier;
      }
    }

    // Update tier student count
    const tierIndex = course.tiers.findIndex((t) => t.name === payment.tier);
    if (tierIndex >= 0) {
      course.tiers[tierIndex].studentCount += 1;
    }

    // Update total revenue
    course.totalRevenue += payment.amount;

    await course.save();

    // Add course to user's enrolled courses
    if (!course.students.find((s) => s.user.toString() === userId)) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { enrolledCourses: payment.course },
      });
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and access granted",
      payment,
      course: course._id,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Webhook to handle Stripe events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || "whsec_test"
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case "checkout.session.completed":
          const session = event.data.object;

          // Find and update payment
          const payment = await Payment.findOne({
            stripeSessionId: session.id,
          });

          if (payment && payment.status !== "completed") {
            payment.status = "completed";
            payment.completedAt = new Date();
            payment.transactionId = session.payment_intent;
            payment.stripePaymentIntentId = session.payment_intent;
            await payment.save();

            // Grant access
            const course = await Course.findById(payment.course);
            course.accessList.push({
              user: payment.student,
              tier: payment.tier,
              purchasedAt: new Date(),
              transactionId: session.payment_intent,
            });

            const studentIndex = course.students.findIndex(
              (s) => s.user.toString() === payment.student.toString()
            );

            if (studentIndex >= 0) {
              const tierHierarchy = { free: 0, basic: 1, premium: 2 };
              if (
                tierHierarchy[payment.tier] >
                tierHierarchy[course.students[studentIndex].tier]
              ) {
                course.students[studentIndex].tier = payment.tier;
              }
            } else {
              course.students.push({
                user: payment.student,
                tier: payment.tier,
              });
            }

            const tierIndex = course.tiers.findIndex(
              (t) => t.name === payment.tier
            );
            if (tierIndex >= 0) {
              course.tiers[tierIndex].studentCount += 1;
            }

            course.totalRevenue += payment.amount;
            await course.save();

            await User.findByIdAndUpdate(payment.student, {
              $addToSet: { enrolledCourses: payment.course },
            });
          }

          break;

        case "charge.refunded":
          // Handle refunds
          const chargeRefunded = event.data.object;
          const refundedPayment = await Payment.findOne({
            stripePaymentIntentId: chargeRefunded.payment_intent,
          });

          if (refundedPayment) {
            refundedPayment.status = "refunded";
            await refundedPayment.save();

            // Remove access
            const courseToRemove = await Course.findById(
              refundedPayment.course
            );
            courseToRemove.accessList = courseToRemove.accessList.filter(
              (item) =>
                !(
                  item.user.toString() === refundedPayment.student.toString() &&
                  item.tier === refundedPayment.tier
                )
            );

            const tierToUpdate = courseToRemove.tiers.findIndex(
              (t) => t.name === refundedPayment.tier
            );
            if (
              tierToUpdate >= 0 &&
              courseToRemove.tiers[tierToUpdate].studentCount > 0
            ) {
              courseToRemove.tiers[tierToUpdate].studentCount -= 1;
            }

            courseToRemove.totalRevenue -= refundedPayment.amount;
            await courseToRemove.save();
          }

          break;

        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Webhook handling error:", error);
      res.status(500).json({
        success: false,
        message: "Webhook processing failed",
      });
    }
  }
);

// Get payment history
router.get("/history", auth, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.user.id })
      .populate("course", "title thumbnail")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Check user access to course
router.get("/access/:courseId", auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const access = course.accessList.find(
      (item) => item.user.toString() === userId
    );

    const hasAccess = !!access;
    const tier = access?.tier || "none";

    res.status(200).json({
      success: true,
      hasAccess,
      tier,
      access,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get recent payments (admin only)
router.get("/recent", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const limit = parseInt(req.query.limit) || 10;

    const payments = await Payment.find({ status: "completed" })
      .populate("student", "firstName lastName email")
      .populate("course", "title")
      .sort({ createdAt: -1 })
      .limit(limit);

    const formattedPayments = payments.map((payment) => ({
      _id: payment._id,
      amount: payment.amount,
      status: payment.status,
      tier: payment.tier,
      createdAt: payment.createdAt,
      user: {
        email: payment.student?.email || payment.userEmail || "Unknown",
        name: payment.student
          ? `${payment.student.firstName} ${payment.student.lastName}`
          : "Unknown",
      },
      course: {
        title: payment.course?.title || "Unknown Course",
      },
    }));

    res.status(200).json({
      success: true,
      payments: formattedPayments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
