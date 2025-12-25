const stripe = require("stripe");

/**
 * Stripe Configuration
 * Initialize Stripe with secret key from environment
 */
const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe Price IDs (from Stripe Dashboard)
 * Create these products/prices in your Stripe dashboard
 */
const STRIPE_PRICES = {
  BASIC_MONTHLY: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
  PREMIUM_MONTHLY: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  BASIC_YEARLY: process.env.STRIPE_BASIC_YEARLY_PRICE_ID,
  PREMIUM_YEARLY: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID,
};

/**
 * Subscription Tier Mapping
 */
const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    price: 0,
    features: ["Access to free courses", "Community chat", "Basic support"],
  },
  basic: {
    name: "Basic",
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      "All Free features",
      "Access to Basic courses",
      "Create 1 community",
      "Priority support",
    ],
  },
  premium: {
    name: "Premium",
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      "All Basic features",
      "Access to ALL courses",
      "Create unlimited communities",
      "Upload courses",
      "Advanced analytics",
      "24/7 premium support",
    ],
  },
};

module.exports = {
  stripeClient,
  STRIPE_PRICES,
  SUBSCRIPTION_TIERS,
};
