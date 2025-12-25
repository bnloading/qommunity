import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

// Initialize Stripe only if key is available
const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey
  ? loadStripe(stripeKey).catch((err) => {
      console.warn("Stripe initialization failed:", err);
      return null;
    })
  : Promise.resolve(null);

/**
 * Payment Page Component
 * Handles course purchases with Stripe Checkout
 */
const Payment = () => {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses/${courseId}`
      );
      setCourse(response.data.course || response.data);
    } catch (err) {
      setError("Failed to load course details");
      console.error(err);
    }
  };

  const handlePurchase = async () => {
    if (!course) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();

      // Create checkout session
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/payments/create-checkout-session`,
        {
          courseId: course._id,
          itemType: "course",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { sessionId } = response.data;

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Course Header */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <h1 className="text-3xl font-bold text-white mb-2">
              Complete Your Purchase
            </h1>
            <p className="text-blue-100">
              You're one step away from accessing this course
            </p>
          </div>

          {/* Course Details */}
          <div className="p-6">
            <div className="flex gap-6 mb-6">
              {course.thumbnail && (
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-48 h-32 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {course.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {course.description}
                </p>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-bold text-blue-600">
                    ${course.price}
                  </span>
                  <span className="text-gray-500">One-time payment</span>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                What's included:
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Lifetime access to all course content
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Access to all video lessons and resources
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Certificate of completion
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Access to community discussions
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                `Purchase for $${course.price}`
              )}
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Secure payment powered by Stripe
            </p>

            <button
              onClick={() => navigate(-1)}
              className="w-full mt-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <svg
              className="w-6 h-6 text-green-500 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-green-700 dark:text-green-300 font-medium">
              30-day money-back guarantee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
