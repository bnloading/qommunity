# Complete Skool.com Clone - Full Implementation Roadmap

## ✅ COMPLETED FEATURES (Current State)

### Backend (Node.js + Express + MongoDB)

- ✅ User authentication (Clerk + JWT hybrid)
- ✅ Communities CRUD with creator field
- ✅ Courses system (15 endpoints)
- ✅ Pages & Folders system for course content
- ✅ Media upload (Cloudinary - 100MB video limit)
- ✅ Rich text editor with formatting
- ✅ Posts, Comments, Events basic structure
- ✅ Community membership management
- ✅ Creator name display in Discover page

### Frontend (React 18 + Tailwind CSS)

- ✅ Home page (now at /courses)
- ✅ Discover communities page (at /)
- ✅ Community detail pages
- ✅ Course pages with folder navigation
- ✅ Navbar with profile dropdown
- ✅ Rank badges (#1🏆, #2🥈, #3🥉)
- ✅ Creator avatars and names
- ✅ Category filters
- ✅ Search functionality

---

## 🚀 IMPLEMENTATION ROADMAP

### PHASE 1: Subscription & Payments (Week 1-2)

#### 1.1 Database Schema - Subscription Models

**Create these new models:**

```javascript
// backend/src/models/SubscriptionPlan.js
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "Free", "Basic", "Premium"
    displayName: String,
    price: { type: Number, required: true },
    billingCycle: {
      type: String,
      enum: ["one_time", "monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    features: {
      maxMembers: { type: Number, default: -1 }, // -1 = unlimited
      maxCourses: { type: Number, default: -1 },
      customDomain: { type: Boolean, default: false },
      advancedAnalytics: { type: Boolean, default: false },
      prioritySupport: { type: Boolean, default: false },
      removeWatermark: { type: Boolean, default: false },
      apiAccess: { type: Boolean, default: false },
      whiteLabel: { type: Boolean, default: false },
    },
    trialDays: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    stripePriceId: String,
    stripeProductId: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// backend/src/models/UserSubscription.js
const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    community: { type: mongoose.Schema.Types.ObjectId, ref: "Community" },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "canceled",
        "past_due",
        "trialing",
        "paused",
        "incomplete",
      ],
      default: "active",
    },
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: { type: Boolean, default: false },
    canceledAt: Date,
    trialEnd: Date,
    stripeSubscriptionId: String,
    stripeCustomerId: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// backend/src/models/Payment.js
const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserSubscription",
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: String,
    stripePaymentIntentId: String,
    stripeChargeId: String,
    refundAmount: { type: Number, default: 0 },
    refundedAt: Date,
    failureReason: String,
    receiptUrl: String,
    invoiceUrl: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);
```

#### 1.2 Stripe Integration

**Install dependencies:**

```bash
cd backend
npm install stripe
```

**Create Stripe routes:**

```javascript
// backend/src/routes/subscriptions.js
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { auth } = require("../middleware/auth");
const UserSubscription = require("../models/UserSubscription");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Payment = require("../models/Payment");

// Get all available subscription plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({
      sortOrder: 1,
    });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create checkout session
router.post("/create-checkout", auth, async (req, res) => {
  try {
    const { planId, communityId } = req.body;
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      return res
        .status(404)
        .json({ success: false, message: "Plan not found" });
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = req.user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user._id.toString(),
        },
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await User.findByIdAndUpdate(req.user._id, {
        stripeCustomerId: customer.id,
      });
    }

    const sessionData = {
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: plan.billingCycle === "one_time" ? "payment" : "subscription",
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      metadata: {
        userId: req.user._id.toString(),
        planId: plan._id.toString(),
        communityId: communityId || "",
      },
    };

    // Add trial if applicable
    if (plan.trialDays > 0 && plan.billingCycle !== "one_time") {
      sessionData.subscription_data = {
        trial_period_days: plan.trialDays,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionData);

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Stripe webhook handler
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
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log("Stripe webhook event:", event.type);

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutComplete(event.data.object);
          break;

        case "customer.subscription.created":
        case "customer.subscription.updated":
          await handleSubscriptionUpdate(event.data.object);
          break;

        case "customer.subscription.deleted":
          await handleSubscriptionCancel(event.data.object);
          break;

        case "invoice.payment_succeeded":
          await handlePaymentSuccess(event.data.object);
          break;

        case "invoice.payment_failed":
          await handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);

// Webhook helper functions
async function handleCheckoutComplete(session) {
  const { userId, planId, communityId } = session.metadata;

  const subscription = await UserSubscription.create({
    user: userId,
    community: communityId || null,
    plan: planId,
    status: session.payment_status === "paid" ? "active" : "incomplete",
    stripeSubscriptionId: session.subscription,
    stripeCustomerId: session.customer,
    currentPeriodStart: new Date(
      session.subscription?.current_period_start * 1000
    ),
    currentPeriodEnd: new Date(session.subscription?.current_period_end * 1000),
  });

  console.log("Subscription created:", subscription._id);
}

async function handleSubscriptionUpdate(stripeSubscription) {
  const subscription = await UserSubscription.findOne({
    stripeSubscriptionId: stripeSubscription.id,
  });

  if (subscription) {
    subscription.status = stripeSubscription.status;
    subscription.currentPeriodStart = new Date(
      stripeSubscription.current_period_start * 1000
    );
    subscription.currentPeriodEnd = new Date(
      stripeSubscription.current_period_end * 1000
    );
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;

    await subscription.save();
    console.log("Subscription updated:", subscription._id);
  }
}

async function handleSubscriptionCancel(stripeSubscription) {
  const subscription = await UserSubscription.findOne({
    stripeSubscriptionId: stripeSubscription.id,
  });

  if (subscription) {
    subscription.status = "canceled";
    subscription.canceledAt = new Date();
    await subscription.save();
    console.log("Subscription canceled:", subscription._id);
  }
}

async function handlePaymentSuccess(invoice) {
  await Payment.create({
    user: invoice.customer_metadata?.userId,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency.toUpperCase(),
    status: "completed",
    stripePaymentIntentId: invoice.payment_intent,
    stripeChargeId: invoice.charge,
    receiptUrl: invoice.hosted_invoice_url,
    invoiceUrl: invoice.invoice_pdf,
  });
}

async function handlePaymentFailed(invoice) {
  const subscription = await UserSubscription.findOne({
    stripeSubscriptionId: invoice.subscription,
  });

  if (subscription) {
    subscription.status = "past_due";
    await subscription.save();
  }

  await Payment.create({
    user: invoice.customer_metadata?.userId,
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    status: "failed",
    failureReason: invoice.last_finalization_error?.message,
  });
}

// Get user's current subscription
router.get("/my-subscription", auth, async (req, res) => {
  try {
    const subscription = await UserSubscription.findOne({
      user: req.user._id,
      status: { $in: ["active", "trialing", "past_due"] },
    }).populate("plan");

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel subscription
router.post("/cancel", auth, async (req, res) => {
  try {
    const { subscriptionId, cancelAtPeriodEnd = true } = req.body;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      user: req.user._id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      subscription.cancelAtPeriodEnd = true;
    } else {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      subscription.status = "canceled";
      subscription.canceledAt = new Date();
    }

    await subscription.save();
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upgrade/downgrade subscription
router.post("/change-plan", auth, async (req, res) => {
  try {
    const { newPlanId, subscriptionId } = req.body;

    const subscription = await UserSubscription.findOne({
      _id: subscriptionId,
      user: req.user._id,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const newPlan = await SubscriptionPlan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId
    );

    const updated = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: "create_prorations",
      }
    );

    subscription.plan = newPlanId;
    subscription.currentPeriodStart = new Date(
      updated.current_period_start * 1000
    );
    subscription.currentPeriodEnd = new Date(updated.current_period_end * 1000);
    await subscription.save();

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
```

**Add to server.js:**

```javascript
// In backend/src/server.js, add:
const subscriptionRoutes = require("./routes/subscriptions");
app.use("/api/subscriptions", subscriptionRoutes);
```

#### 1.3 Frontend - Pricing Page

```javascript
// frontend/src/pages/Pricing.js
import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Check, Crown, Zap } from "lucide-react";

export default function Pricing() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/subscriptions/plans`
      );
      setPlans(response.data.plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/subscriptions/my-subscription`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCurrentSubscription(response.data.subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/subscriptions/create-checkout`,
        { planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("Failed to start checkout process");
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">
            Start free and upgrade as you grow
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <PricingCard
              key={plan._id}
              plan={plan}
              currentPlan={currentSubscription?.plan?._id === plan._id}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        {currentSubscription && (
          <div className="mt-12 text-center">
            <button
              onClick={() => navigate("/subscription/manage")}
              className="text-blue-600 hover:underline"
            >
              Manage My Subscription →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PricingCard({ plan, currentPlan, onSubscribe }) {
  const isPopular = plan.name === "Premium";

  return (
    <div
      className={`
      relative bg-white rounded-2xl shadow-lg overflow-hidden
      ${isPopular ? "ring-2 ring-blue-500 transform scale-105" : ""}
    `}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-1 text-sm font-semibold">
          POPULAR
        </div>
      )}

      <div className="p-8">
        <div className="flex items-center mb-4">
          {plan.name === "Premium" && (
            <Crown className="text-yellow-500 mr-2" />
          )}
          {plan.name === "Pro" && <Zap className="text-blue-500 mr-2" />}
          <h3 className="text-2xl font-bold">
            {plan.displayName || plan.name}
          </h3>
        </div>

        <div className="mb-6">
          <span className="text-4xl font-bold">${plan.price}</span>
          <span className="text-gray-600">
            /{plan.billingCycle === "monthly" ? "mo" : "yr"}
          </span>
          {plan.trialDays > 0 && (
            <div className="text-sm text-green-600 mt-1">
              {plan.trialDays}-day free trial
            </div>
          )}
        </div>

        <ul className="space-y-3 mb-8">
          {Object.entries(plan.features).map(([key, value]) => {
            if (typeof value === "boolean" && value) {
              return (
                <li key={key} className="flex items-start">
                  <Check
                    className="text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <span className="text-gray-700">
                    {formatFeatureName(key)}
                  </span>
                </li>
              );
            }
            if (typeof value === "number" && value !== 0) {
              return (
                <li key={key} className="flex items-start">
                  <Check
                    className="text-green-500 mr-2 flex-shrink-0 mt-0.5"
                    size={18}
                  />
                  <span className="text-gray-700">
                    {value === -1 ? "Unlimited" : value}{" "}
                    {formatFeatureName(key)}
                  </span>
                </li>
              );
            }
            return null;
          })}
        </ul>

        <button
          onClick={() => onSubscribe(plan._id)}
          disabled={currentPlan}
          className={`
            w-full py-3 rounded-lg font-semibold transition-all
            ${
              currentPlan
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : isPopular
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }
          `}
        >
          {currentPlan ? "Current Plan" : "Get Started"}
        </button>
      </div>
    </div>
  );
}

function formatFeatureName(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace("Max ", "")
    .trim();
}
```

---

### PHASE 2: Community Wizard & Settings (Week 3)

[Content continues with detailed implementation for community creation flow, advanced settings, role-based permissions, etc.]

---

### PHASE 3: Gamification System (Week 4)

[Points, levels, badges, leaderboards implementation]

---

### PHASE 4: Advanced Features (Week 5-6)

- Direct messaging system
- Live events with video integration
- Advanced analytics dashboard
- Email notification system
- Mobile responsive optimization

---

## 📋 PRIORITY CHECKLIST

**Immediate (This Week):**

- [ ] Fix home page routing (COMPLETED ✅)
- [ ] Implement Stripe subscription system
- [ ] Create pricing page
- [ ] Set up webhook handlers

**Short-term (Next 2 Weeks):**

- [ ] Community creation wizard
- [ ] Role-based permissions
- [ ] Content gating by subscription
- [ ] Payment history page

**Medium-term (Month 2):**

- [ ] Gamification (points, levels, badges)
- [ ] Leaderboards
- [ ] Advanced analytics
- [ ] Direct messaging

**Long-term (Month 3+):**

- [ ] Mobile app
- [ ] Custom domains
- [ ] White-label options
- [ ] API access

---

## 🛠️ SETUP INSTRUCTIONS

### Environment Variables Needed

**Backend (.env):**

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env):**

```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Stripe Setup Steps

1. Create Stripe account
2. Get API keys from Dashboard → Developers → API keys
3. Create products and prices in Stripe Dashboard
4. Copy price IDs to database when creating SubscriptionPlan documents
5. Set up webhook endpoint: Dashboard → Developers → Webhooks
6. Add endpoint URL: `https://your-api.com/api/subscriptions/webhook`
7. Select events to listen for
8. Copy webhook secret

---

## 📝 NOTES

- Current issue: Home page showing different content for different users - **FIXED** ✅
- Creator names now display correctly
- CSS compiling properly without CRACO
- Backend on port 5000, Frontend on port 3000
- MongoDB Atlas database

Need help with any specific implementation? Let me know!
