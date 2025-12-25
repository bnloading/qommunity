import React, { useState } from "react";
import { Check, Crown, Sparkles } from "lucide-react";
import axios from "axios";

const Pricing = () => {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (tier) => {
    try {
      setLoading(tier);
      console.log("🛒 Starting checkout for tier:", tier);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/subscriptions/checkout`,
        { tier }
      );

      console.log("✅ Checkout response:", response.data);

      // Redirect to Stripe Checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      console.error("Error details:", error.response?.data);
      alert(
        `Failed to start checkout: ${
          error.response?.data?.error || error.message
        }`
      );
      setLoading(null);
    }
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      icon: <Sparkles className="w-8 h-8 text-gray-400" />,
      features: [
        "Browse all courses",
        "View course previews",
        "Free lesson previews",
        "Community access",
      ],
      notIncluded: [
        "Full course access",
        "Create courses",
        "Video uploads",
        "Premium support",
      ],
      cta: "Current Plan",
      tier: "free",
      disabled: true,
    },
    {
      name: "Basic",
      price: "$9.99",
      period: "per month",
      icon: <Check className="w-8 h-8 text-blue-500" />,
      popular: false,
      features: [
        "Everything in Free",
        "Purchase individual courses",
        "Lifetime access to purchased courses",
        "Course certificates",
        "Standard support",
      ],
      notIncluded: [
        "Create courses",
        "All courses included",
        "Priority support",
      ],
      cta: "Upgrade to Basic",
      tier: "basic",
      disabled: false,
    },
    {
      name: "Premium",
      price: "$29.99",
      period: "per month",
      icon: <Crown className="w-8 h-8 text-yellow-500" />,
      popular: true,
      features: [
        "Everything in Basic",
        "Access to ALL courses",
        "Create unlimited courses",
        "Upload videos and images",
        "Course analytics",
        "Priority support",
        "Early access to new features",
      ],
      notIncluded: [],
      cta: "Upgrade to Premium",
      tier: "premium",
      disabled: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Select the perfect plan for your learning journey
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                plan.popular
                  ? "ring-4 ring-yellow-500 dark:ring-yellow-400"
                  : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-yellow-500 text-white px-4 py-1 text-sm font-bold rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="p-8">
                {/* Icon */}
                <div className="mb-4">{plan.icon}</div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {plan.period}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                  {plan.notIncluded.map((feature, index) => (
                    <li
                      key={`not-${index}`}
                      className="flex items-start opacity-40"
                    >
                      <span className="mr-3">✕</span>
                      <span className="text-gray-500 dark:text-gray-500 line-through">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => !plan.disabled && handleSubscribe(plan.tier)}
                  disabled={plan.disabled || loading === plan.tier}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.disabled
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      : plan.popular
                      ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  }`}
                >
                  {loading === plan.tier ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can cancel your subscription anytime from your profile
                page. Your access will continue until the end of your billing
                period.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                What happens to my purchased courses if I downgrade?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You keep lifetime access to any courses you purchased
                individually, even if you downgrade or cancel your subscription.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                Can I upgrade from Basic to Premium?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Absolutely! You can upgrade at any time, and you'll be charged a
                prorated amount for the remaining time in your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
