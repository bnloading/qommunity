import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader, ArrowRight } from "lucide-react";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: clerkUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const planParam = searchParams.get("plan");

    if (planParam) setPlan(planParam);

    if (!sessionId) {
      setError("Session ID not found");
      setLoading(false);
      return;
    }

    // Verify the session and update user subscription
    const verifySession = async () => {
      try {
        const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;

        // Update user subscription status in backend
        await axios.post(
          `${process.env.REACT_APP_API_URL}/subscriptions/verify-session`,
          { sessionId, userEmail, plan: planParam }
        );

        setLoading(false);
      } catch (err) {
        console.error("Verification error:", err);
        // Still show success since Stripe webhook will handle it
        setLoading(false);
      }
    };

    // Wait for webhook to process, then verify
    const timer = setTimeout(async () => {
      await verifySession();
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams, clerkUser]);

  // Countdown and auto-redirect after loading is done
  useEffect(() => {
    if (loading || error) return;

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          navigate("/create-community");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [loading, error, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Processing Payment...
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we activate your subscription
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Error Occurred
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate("/pricing")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Төлем сәтті өтті! 🎉
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          <span className="font-semibold capitalize">{plan || "Pro"}</span>{" "}
          жоспарына қош келдіңіз!
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
          14 күндік тегін сынақ кезеңі басталды. Енді сіз community құра аласыз.
        </p>

        {/* Countdown indicator */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6">
          <p className="text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center justify-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-lg">
              {countdown}
            </span>
            секундтан кейін Community құру бетіне өтесіз...
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/create-community")}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2"
          >
            Community құру
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            Профильді көру
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
