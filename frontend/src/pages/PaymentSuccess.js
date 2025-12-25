import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

/**
 * Payment Success Page
 * Shown after successful Stripe checkout
 */
const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [courseData, setCourseData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setStatus("error");
      setError("No payment session found");
    }
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const token = await getToken();

      // Verify payment with backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/payments/verify`,
        { sessionId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setStatus("success");
        setCourseData(response.data.course);
      } else {
        setStatus("error");
        setError("Payment verification failed");
      }
    } catch (err) {
      setStatus("error");
      setError(err.response?.data?.message || "Payment verification failed");
      console.error(err);
    }
  };

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Verifying your payment...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we confirm your purchase
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/courses")}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
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
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Your purchase has been completed successfully. You now have access to
          the course.
        </p>

        {/* Confetti animation */}
        <div className="mb-6">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome to your new learning journey!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/courses/${courseData}`)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Start Learning Now
          </button>
          <button
            onClick={() => navigate("/my-courses")}
            className="w-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            View My Courses
          </button>
        </div>

        {/* Receipt Link */}
        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          A receipt has been sent to your email
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
