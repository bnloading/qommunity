const express = require("express");
const router = express.Router();
const { Webhook } = require("svix");
const User = require("../models/User");
const CoursePurchase = require("../models/CoursePurchase");

// Clerk webhook handler
router.post("/clerk", async (req, res) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error("Please add CLERK_WEBHOOK_SECRET to .env");
    }

    // Get the headers
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res
        .status(400)
        .json({ error: "Error occurred -- no svix headers" });
    }

    // Get the body
    const payload = req.body;
    const body = JSON.stringify(payload);

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // Verify the payload with the headers
    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return res
        .status(400)
        .json({ error: "Error occurred during verification" });
    }

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === "user.created") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      // Create user in database
      const user = await User.create({
        clerkId: id,
        email: email_addresses[0].email_address,
        firstName: first_name || "User",
        lastName: last_name || "",
        profilePicture: image_url,
        subscriptionTier: "free",
        subscriptionStatus: "none",
      });

      console.log("User created:", user._id);
    }

    if (eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      // Update user in database
      const user = await User.findOneAndUpdate(
        { clerkId: id },
        {
          email: email_addresses[0].email_address,
          firstName: first_name || "User",
          lastName: last_name || "",
          profilePicture: image_url,
        },
        { new: true }
      );

      console.log("User updated:", user?._id);
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;

      // Delete user from database
      await User.findOneAndDelete({ clerkId: id });

      console.log("User deleted:", id);
    }

    return res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Stripe webhook handler
router.post("/stripe", async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      const subscription = event.data.object;
      const customerId = subscription.customer;

      // Get user by Stripe customer ID
      const user = await User.findOne({ stripeCustomerId: customerId });

      if (user) {
        // Determine tier from price ID
        let tier = "free";
        if (
          subscription.items.data[0].price.id ===
          process.env.STRIPE_BASIC_PRICE_ID
        ) {
          tier = "basic";
        } else if (
          subscription.items.data[0].price.id ===
          process.env.STRIPE_PREMIUM_PRICE_ID
        ) {
          tier = "premium";
        }

        user.subscriptionTier = tier;
        user.subscriptionId = subscription.id;
        user.subscriptionStatus = subscription.status;
        user.currentPeriodEnd = new Date(
          subscription.current_period_end * 1000
        );
        user.cancelAtPeriodEnd = subscription.cancel_at_period_end || false;
        await user.save();

        console.log(`User ${user.email} subscription updated to ${tier}`);
      }
      break;

    case "customer.subscription.deleted":
      const deletedSub = event.data.object;
      const deletedCustomerId = deletedSub.customer;

      const canceledUser = await User.findOne({
        stripeCustomerId: deletedCustomerId,
      });

      if (canceledUser) {
        canceledUser.subscriptionTier = "free";
        canceledUser.subscriptionId = null;
        canceledUser.subscriptionStatus = "canceled";
        canceledUser.currentPeriodEnd = null;
        canceledUser.cancelAtPeriodEnd = false;
        await canceledUser.save();

        console.log(`User ${canceledUser.email} subscription canceled`);
      }
      break;

    case "checkout.session.completed":
      const session = event.data.object;

      // Handle course purchase checkout
      if (session.metadata?.type === "course_purchase") {
        const courseId = session.metadata.courseId;
        const userId = session.metadata.userId;

        // Update CoursePurchase record
        const purchase = await CoursePurchase.findOne({
          stripeCheckoutSessionId: session.id,
        });

        if (purchase) {
          purchase.status = "completed";
          purchase.stripePaymentIntentId = session.payment_intent;
          purchase.accessGrantedAt = new Date();
          await purchase.save();

          // Add course to user's purchased courses
          const purchaseUser = await User.findById(userId);
          if (
            purchaseUser &&
            !purchaseUser.purchasedCourses.some(
              (pc) => pc.course.toString() === courseId
            )
          ) {
            purchaseUser.purchasedCourses.push({
              course: courseId,
              purchaseDate: new Date(),
              amount: session.amount_total / 100,
              stripePaymentId: session.payment_intent,
            });
            await purchaseUser.save();
          }

          console.log(
            `Course purchase completed: ${courseId} by user ${userId}`
          );
        }
      }
      break;

    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata;

      if (metadata.type === "course_purchase") {
        const userId = metadata.userId;
        const courseId = metadata.courseId;

        // Update CoursePurchase if exists
        await CoursePurchase.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { status: "completed", accessGrantedAt: new Date() }
        );

        // Add course to user's purchased courses
        const purchaseUser = await User.findById(userId);
        if (
          purchaseUser &&
          !purchaseUser.purchasedCourses.some(
            (pc) => pc.course.toString() === courseId
          )
        ) {
          purchaseUser.purchasedCourses.push({
            course: courseId,
            purchaseDate: new Date(),
            amount: paymentIntent.amount / 100,
            stripePaymentId: paymentIntent.id,
          });
          await purchaseUser.save();

          console.log(
            `User ${purchaseUser.email} purchased course ${courseId}`
          );
        }
      }
      break;

    case "payment_intent.payment_failed":
      const failedPayment = event.data.object;

      // Update CoursePurchase status to failed
      await CoursePurchase.findOneAndUpdate(
        { stripePaymentIntentId: failedPayment.id },
        { status: "failed" }
      );

      console.log(`Payment failed for payment intent: ${failedPayment.id}`);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
