const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// Helper function to get user email from request
const getUserEmail = (req) => {
  return (
    req.query.userEmail ||
    req.headers["x-user-email"] ||
    "nurbakhitjan5@gmail.com"
  );
};

// Test endpoint to verify Stripe configuration
router.get("/test", async (req, res) => {
  try {
    const hasSecretKey =
      !!process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("your_stripe_key");
    const hasPublicKey = !!process.env.STRIPE_PUBLIC_KEY;

    res.json({
      stripeConfigured: hasSecretKey,
      publicKeySet: hasPublicKey,
      secretKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15) + "...",
      message: hasSecretKey
        ? "Stripe is configured correctly"
        : "Stripe secret key missing",
    });
  } catch (error) {
    console.error("Stripe test error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user's subscription status
router.get("/status", async (req, res) => {
  try {
    const userEmail = getUserEmail(req);
    let user = await User.findOne({ email: userEmail });

    if (!user) {
      // Create user if doesn't exist
      user = await User.create({
        email: userEmail,
        firstName: "User",
        lastName: "",
        subscriptionTier: "free",
        subscriptionStatus: "none",
      });
    }

    // If user has a Stripe subscription, verify it's still active
    if (user.subscriptionId && user.stripeCustomerId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.subscriptionId
        );

        // Update user's subscription status based on Stripe data
        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          user.subscriptionStatus = subscription.status;
          // Determine tier from subscription metadata or price
          if (subscription.metadata.tier) {
            user.subscriptionTier = subscription.metadata.tier;
          }
          await user.save();
        } else {
          // Subscription is not active, reset to free
          user.subscriptionTier = "free";
          user.subscriptionStatus = "none";
          await user.save();
        }
      } catch (stripeError) {
        console.error("Stripe subscription verification error:", stripeError);
        // If subscription not found in Stripe, reset to free
        user.subscriptionTier = "free";
        user.subscriptionStatus = "none";
        await user.save();
      }
    }

    res.json({
      subscriptionTier: user.subscriptionTier || "free",
      subscriptionStatus: user.subscriptionStatus || "none",
      subscriptionId: user.subscriptionId,
      stripeCustomerId: user.stripeCustomerId,
      bio: user.bio || "",
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

// Get current user's subscription status (old version kept for reference)
router.get("/status-old", async (req, res) => {
  try {
    const user = await User.findOne({ email: "nurbakhitjan5@gmail.com" });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      subscriptionTier: user.subscriptionTier,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionId: user.subscriptionId,
      stripeCustomerId: user.stripeCustomerId,
    });
  } catch (error) {
    console.error("Get subscription status error:", error);
    res.status(500).json({ error: "Failed to get subscription status" });
  }
});

// Create Stripe checkout session for subscription
router.post("/checkout", async (req, res) => {
  try {
    console.log("🛒 Checkout request received", req.body);
    const { tier } = req.body; // 'basic' or 'premium'

    if (
      !process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET_KEY.includes("your_stripe_key")
    ) {
      return res.status(500).json({
        error:
          "Stripe secret key is not configured. Set STRIPE_SECRET_KEY in your environment.",
      });
    }

    // Find or create test user
    let user = await User.findOne({ email: "nurbakhitjan5@gmail.com" });

    if (!user) {
      console.log("Creating test user...");
      user = await User.create({
        email: "nurbakhitjan5@gmail.com",
        firstName: "Test",
        lastName: "User",
        subscriptionTier: "free",
        subscriptionStatus: "none",
      });
    }

    console.log("✅ User found:", user.email);

    // Get the correct price ID based on tier
    let priceId;
    let amount;
    if (tier === "basic") {
      priceId = process.env.STRIPE_BASIC_PRICE_ID;
      amount = 999; // $9.99
    } else if (tier === "premium") {
      priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
      amount = 2999; // $29.99
    } else {
      return res.status(400).json({ error: "Invalid subscription tier" });
    }

    console.log("💰 Price ID for", tier, ":", priceId);

    // Check if price ID is a placeholder (like price_basic_monthly or price_premium_monthly)
    const isPlaceholder =
      priceId &&
      (priceId === "price_basic_monthly" ||
        priceId === "price_premium_monthly");

    // If no price ID or placeholder, we'll create a checkout with inline pricing
    if (!priceId || !priceId.startsWith("price_") || isPlaceholder) {
      console.log(
        "⚠️ No valid Stripe price ID found, using inline pricing instead"
      );
      priceId = null; // Force inline pricing
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      console.log("Creating Stripe customer...");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user._id.toString(),
        },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
      console.log("✅ Stripe customer created:", customerId);
    } else {
      console.log("✅ Using existing Stripe customer:", customerId);
    }

    // Create checkout session
    console.log("Creating Stripe checkout session...");

    const sessionConfig = {
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/pricing`,
      metadata: {
        userId: user._id.toString(),
        tier: tier,
      },
    };

    // Use price ID if available, otherwise create inline price
    if (priceId && priceId.startsWith("price_")) {
      sessionConfig.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
    } else {
      sessionConfig.line_items = [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount,
            recurring: {
              interval: "month",
            },
            product_data: {
              name: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan`,
              description: `Monthly ${tier} subscription`,
            },
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    console.log("✅ Checkout session created:", session.id);

    res.json({ url: session.url });
  } catch (error) {
    console.error("Create checkout session error:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Create checkout session for plan selection (Hobby/Pro plans)
router.post("/create-checkout", async (req, res) => {
  try {
    console.log("🛒 Create checkout request received:", req.body);
    const { planId, planName, amount, redirectPath } = req.body;

    // Get user from auth token
    const authHeader = req.headers.authorization;
    let userEmail = "nurbakhitjan5@gmail.com"; // Default fallback

    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        // Decode Clerk JWT to get email
        const decoded = JSON.parse(
          Buffer.from(token.split(".")[1], "base64").toString()
        );
        if (decoded.email) {
          userEmail = decoded.email;
        }
      } catch (e) {
        console.log("Could not decode token, using default email");
      }
    }

    let user = await User.findOne({ email: userEmail });
    if (!user) {
      user = await User.create({
        email: userEmail,
        firstName: "User",
        lastName: "",
        subscriptionTier: "free",
        subscriptionStatus: "none",
      });
    }

    // Create or get Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Determine pricing based on plan
    let priceConfig;
    if (planId === "hobby") {
      priceConfig = {
        unit_amount: 900, // $9.00
        currency: "usd",
        recurring: { interval: "month" },
        product_data: {
          name: "Hobby Plan",
          description: "All features, 10% transaction fee",
        },
      };
    } else if (planId === "pro") {
      priceConfig = {
        unit_amount: 9900, // $99.00
        currency: "usd",
        recurring: { interval: "month" },
        product_data: {
          name: "Pro Plan",
          description:
            "All features, 2.9% transaction fee, Custom URL, Advanced analytics",
        },
      };
    } else {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price_data: priceConfig,
          quantity: 1,
        },
      ],
      success_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&redirect=${encodeURIComponent(
        redirectPath || "/community"
      )}`,
      cancel_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/select-plan`,
      metadata: {
        userId: user._id.toString(),
        planId: planId,
        planName: planName,
      },
      subscription_data: {
        metadata: {
          userId: user._id.toString(),
          planId: planId,
        },
        trial_period_days: 14, // 14-day free trial
      },
    });

    console.log("✅ Checkout session created:", session.id);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Create checkout error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to create checkout session" });
  }
});

// Verify Stripe session and update user subscription
router.post("/verify-session", async (req, res) => {
  try {
    const { sessionId, userEmail, plan } = req.body;
    console.log("🔍 Verifying session:", sessionId, "for user:", userEmail);

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      // Check if it's a trial (no payment required initially)
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id
        );
        if (
          subscription.status !== "trialing" &&
          subscription.status !== "active"
        ) {
          return res.status(400).json({ error: "Payment not completed" });
        }
      } else {
        return res.status(400).json({ error: "Payment not completed" });
      }
    }

    // Find or create user
    let user = await User.findOne({
      email: userEmail || session.customer_email,
    });

    if (!user && session.customer_email) {
      user = await User.create({
        email: session.customer_email,
        firstName: "User",
        lastName: "",
        subscriptionTier: "free",
        subscriptionStatus: "none",
      });
    }

    if (user) {
      // Determine tier from plan
      let tier = "basic";
      if (plan === "pro" || session.metadata?.planId === "pro") {
        tier = "premium";
      } else if (plan === "hobby" || session.metadata?.planId === "hobby") {
        tier = "basic";
      }

      // Update user subscription
      user.subscriptionTier = tier;
      user.subscriptionStatus = "active";
      user.stripeCustomerId = session.customer;
      if (session.subscription) {
        user.subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;
      }
      await user.save();

      console.log("✅ User subscription updated:", user.email, "->", tier);
    }

    res.json({
      success: true,
      message: "Subscription verified",
      tier: user?.subscriptionTier,
    });
  } catch (error) {
    console.error("Verify session error:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to verify session" });
  }
});

// Access Stripe billing portal (authenticated)
router.post("/portal", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: "No subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${
        process.env.FRONTEND_URL || "http://localhost:3000"
      }/user-settings`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Create portal session error:", error);
    res.status(500).json({ error: "Failed to access billing portal" });
  }
});

// Cancel subscription (authenticated)
router.post("/cancel", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.subscriptionId) {
      return res.status(400).json({ error: "No active subscription found" });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    user.cancelAtPeriodEnd = true;
    await user.save();

    res.json({
      success: true,
      message: "Subscription will be canceled at the end of the billing period",
      cancelAt: subscription.cancel_at,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Resume subscription (authenticated)
router.post("/resume", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user || !user.subscriptionId) {
      return res.status(400).json({ error: "No subscription found" });
    }

    // Resume subscription
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: false,
    });

    user.cancelAtPeriodEnd = false;
    await user.save();

    res.json({
      success: true,
      message: "Subscription resumed successfully",
    });
  } catch (error) {
    console.error("Resume subscription error:", error);
    res.status(500).json({ error: "Failed to resume subscription" });
  }
});

// Get full subscription details (authenticated)
router.get("/details", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let subscriptionDetails = null;

    if (user.subscriptionId && user.stripeCustomerId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.subscriptionId
        );
        const product = await stripe.products.retrieve(
          subscription.items.data[0].price.product
        );

        subscriptionDetails = {
          id: subscription.id,
          status: subscription.status,
          planName: product.name,
          planDescription: product.description,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000
          ),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000)
            : null,
          amount: subscription.items.data[0].price.unit_amount / 100,
          currency: subscription.items.data[0].price.currency,
          interval: subscription.items.data[0].price.recurring?.interval,
        };

        // Update user's currentPeriodEnd
        user.currentPeriodEnd = subscriptionDetails.currentPeriodEnd;
        user.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await user.save();
      } catch (stripeError) {
        console.error("Error fetching Stripe subscription:", stripeError);
      }
    }

    res.json({
      success: true,
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionTier: user.subscriptionTier || "free",
        subscriptionStatus: user.subscriptionStatus || "none",
      },
      subscription: subscriptionDetails,
    });
  } catch (error) {
    console.error("Get subscription details error:", error);
    res.status(500).json({ error: "Failed to get subscription details" });
  }
});

module.exports = router;
