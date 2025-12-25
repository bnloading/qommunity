import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { Check, X, Loader2 } from "lucide-react";
import "./SubscriptionPlanSelect.css";

const SubscriptionPlanSelect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(null);

  // Get the redirect path after subscription (e.g., community creation)
  const redirectPath = location.state?.redirectPath || "/community";
  const action = location.state?.action || "create community";

  const plans = [
    {
      id: "hobby",
      name: "Hobby",
      price: 9,
      stripePriceId: process.env.REACT_APP_STRIPE_HOBBY_PRICE_ID || "hobby",
      features: [
        { text: "All features", included: true },
        { text: "Unlimited members", included: true },
        { text: "Unlimited videos", included: true },
        { text: "Unlimited live-streaming", included: true },
        { text: "10% transaction fee", included: true },
        { text: "Custom URL", included: false },
        { text: "Hide suggested communities", included: false },
        { text: "Advanced analytics", included: false },
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: 99,
      stripePriceId: process.env.REACT_APP_STRIPE_PRO_PRICE_ID || "pro",
      popular: true,
      features: [
        { text: "All features", included: true },
        { text: "Unlimited members", included: true },
        { text: "Unlimited videos", included: true },
        { text: "Unlimited live-streaming", included: true },
        { text: "2.9% transaction fee*", included: true },
        { text: "Custom URL", included: true },
        { text: "Hide suggested communities", included: true },
        { text: "Advanced analytics", included: true },
      ],
    },
  ];

  const handleSelectPlan = async (plan) => {
    try {
      setLoading(plan.id);
      const token = await getToken();

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/subscriptions/create-checkout`,
        {
          planId: plan.id,
          priceId: plan.stripePriceId,
          amount: plan.price * 100, // Convert to cents
          planName: plan.name,
          redirectPath: redirectPath,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert(
        error.response?.data?.message ||
          "Failed to start checkout. Please try again."
      );
      setLoading(null);
    }
  };

  return (
    <div className="subscription-select-page">
      <div className="subscription-select-container">
        <div className="subscription-header">
          <h1 className="subscription-logo">skool</h1>
          <h2 className="subscription-title">Select your plan</h2>
          <p className="subscription-subtitle">Choose a plan to {action}</p>
        </div>

        <div className="plans-container">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? "popular" : ""}`}
            >
              {plan.popular && (
                <div className="popular-badge">Most Popular</div>
              )}

              <div className="plan-price">
                <span className="price-amount">${plan.price}</span>
                <span className="price-period">/month</span>
              </div>

              <h3 className="plan-name">{plan.name}</h3>

              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index} className="feature-item">
                    {feature.included ? (
                      <Check className="feature-icon included" size={20} />
                    ) : (
                      <X className="feature-icon excluded" size={20} />
                    )}
                    <span
                      className={`feature-text ${
                        !feature.included ? "excluded" : ""
                      }`}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className="plan-select-btn"
                onClick={() => handleSelectPlan(plan)}
                disabled={loading !== null}
              >
                {loading === plan.id ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processing...
                  </>
                ) : (
                  "TRY FOR FREE"
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="subscription-note">
          * Plus Stripe processing fees. Cancel anytime.
        </p>

        <button className="back-link" onClick={() => navigate(-1)}>
          ← Go back
        </button>
      </div>
    </div>
  );
};

export default SubscriptionPlanSelect;
