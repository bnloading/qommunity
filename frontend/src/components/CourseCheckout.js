import React, { useState } from "react";
import axios from "axios";
import { Close, ShoppingCart, Lock } from "@mui/icons-material";

const CourseCheckout = ({ course, isOpen, onClose, tier }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !course) return null;

  const tierData = course.tiers?.find((t) => t.name === tier);

  const handleCheckout = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      // Create checkout session
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/payments/checkout`,
        {
          courseId: course._id,
          tier: tier,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Redirect to Stripe checkout
      const stripe = window.Stripe(process.env.REACT_APP_STRIPE_KEY);
      const { sessionId } = response.data;

      const result = await stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Checkout failed");
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Checkout
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Close />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Course Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {course.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tier: <span className="font-medium capitalize">{tier}</span>
            </p>
          </div>

          {/* Tier Details */}
          {tierData && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${tierData.price.toFixed(2)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  one-time payment
                </span>
              </div>

              {tierData.features && tierData.features.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                    What's included:
                  </p>
                  <ul className="space-y-1">
                    {tierData.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <span className="text-blue-600 dark:text-blue-400">
                          ✓
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Payment Note */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Lock className="w-4 h-4" />
            Secure payment powered by Stripe
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {loading ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCheckout;
