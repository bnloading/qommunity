const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Course = require("../models/Course");
const User = require("../models/User");
const CoursePurchase = require("../models/CoursePurchase");
const { auth } = require("../middleware/auth");

// Create checkout session for course purchase
router.post("/create-checkout/:courseId", auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { affiliateCode } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Check if course is free
    if (!course.price || course.price === 0) {
      return res.status(400).json({ error: "This course is free" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already purchased
    const existingPurchase = await CoursePurchase.findOne({
      user: user._id,
      course: courseId,
      status: "completed",
    });

    if (existingPurchase) {
      return res.status(400).json({ error: "You already own this course" });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Check for affiliate
    let affiliateUser = null;
    if (affiliateCode) {
      affiliateUser = await User.findOne({ affiliateCode });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: course.currency || "usd",
            unit_amount: Math.round(course.price * 100),
            product_data: {
              name: course.title,
              description:
                course.description?.substring(0, 500) || "Course access",
              images: course.thumbnail ? [course.thumbnail] : [],
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/courses/${courseId}?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/courses/${courseId}?purchase=cancelled`,
      metadata: {
        userId: user._id.toString(),
        courseId: courseId,
        type: "course_purchase",
        affiliateUserId: affiliateUser?._id?.toString() || "",
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Create course checkout error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Verify course purchase
router.post("/verify/:courseId", auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    if (session.metadata.courseId !== courseId) {
      return res.status(400).json({ error: "Course ID mismatch" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if purchase already recorded
    let purchase = await CoursePurchase.findOne({
      stripeCheckoutSessionId: sessionId,
    });

    if (!purchase) {
      // Create purchase record
      purchase = await CoursePurchase.create({
        user: user._id,
        course: courseId,
        stripePaymentIntentId: session.payment_intent,
        stripeCheckoutSessionId: sessionId,
        amount: session.amount_total / 100,
        currency: session.currency,
        status: "completed",
        accessGrantedAt: new Date(),
        affiliateUser: session.metadata.affiliateUserId || null,
      });

      // Add to user's purchased courses
      user.purchasedCourses.push({
        course: courseId,
        purchaseDate: new Date(),
        amount: session.amount_total / 100,
        stripePaymentId: session.payment_intent,
      });
      await user.save();

      // Add user to course enrolledUsers
      const course = await Course.findById(courseId);
      if (course && !course.enrolledUsers.includes(user.clerkId)) {
        course.enrolledUsers.push(user.clerkId);
        await course.save();
      }

      // Handle affiliate commission
      if (session.metadata.affiliateUserId) {
        const affiliateUser = await User.findById(
          session.metadata.affiliateUserId
        );
        if (affiliateUser) {
          const commission = (session.amount_total / 100) * 0.1; // 10% commission
          purchase.affiliateCommission = commission;
          await purchase.save();

          affiliateUser.affiliateEarnings += commission;
          await affiliateUser.save();
        }
      }
    }

    res.json({
      success: true,
      message: "Course access granted",
      purchase: {
        id: purchase._id,
        status: purchase.status,
        accessGrantedAt: purchase.accessGrantedAt,
      },
    });
  } catch (error) {
    console.error("Verify course purchase error:", error);
    res.status(500).json({ error: "Failed to verify purchase" });
  }
});

// Check if user has access to course
router.get("/access/:courseId", auth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Free course - everyone has access
    if (!course.price || course.price === 0) {
      return res.json({ hasAccess: true, reason: "free_course" });
    }

    // Check if user purchased the course
    const purchase = await CoursePurchase.findOne({
      user: user._id,
      course: courseId,
      status: "completed",
    });

    if (purchase) {
      return res.json({ hasAccess: true, reason: "purchased" });
    }

    // Check if user is the course creator
    if (course.instructor?.id?.toString() === user._id.toString()) {
      return res.json({ hasAccess: true, reason: "creator" });
    }

    res.json({
      hasAccess: false,
      price: course.price,
      currency: course.currency || "usd",
    });
  } catch (error) {
    console.error("Check course access error:", error);
    res.status(500).json({ error: "Failed to check access" });
  }
});

// Get user's purchased courses
router.get("/my-purchases", auth, async (req, res) => {
  try {
    const purchases = await CoursePurchase.find({
      user: req.user._id,
      status: "completed",
    })
      .populate("course", "title thumbnail instructor price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      purchases,
    });
  } catch (error) {
    console.error("Get purchases error:", error);
    res.status(500).json({ error: "Failed to get purchases" });
  }
});

// Get purchase history (for payment history page)
router.get("/history", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get course purchases
    const coursePurchases = await CoursePurchase.find({
      user: req.user._id,
    })
      .populate("course", "title")
      .sort({ createdAt: -1 });

    // Get subscription payments from Stripe
    let subscriptionPayments = [];
    if (user.stripeCustomerId) {
      try {
        const charges = await stripe.charges.list({
          customer: user.stripeCustomerId,
          limit: 20,
        });

        subscriptionPayments = charges.data
          .filter((charge) => charge.invoice) // Only subscription payments
          .map((charge) => ({
            id: charge.id,
            type: "subscription",
            amount: charge.amount / 100,
            currency: charge.currency,
            status: charge.status,
            description: charge.description || "Subscription payment",
            createdAt: new Date(charge.created * 1000),
          }));
      } catch (stripeError) {
        console.error("Error fetching Stripe charges:", stripeError);
      }
    }

    // Combine and sort by date
    const allPayments = [
      ...coursePurchases.map((p) => ({
        id: p._id,
        type: "course",
        courseName: p.course?.title,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt,
      })),
      ...subscriptionPayments,
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      payments: allPayments,
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ error: "Failed to get payment history" });
  }
});

module.exports = router;
