import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  CreditCard,
  ExternalLink,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Building,
  ArrowRight,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityPayouts = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [payouts, setPayouts] = useState(null);

  const fetchPayouts = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/payouts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPayouts(res.data.payouts);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load payout info");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const connectStripe = async () => {
    try {
      setConnecting(true);
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/community-settings/${communityId}/payouts/connect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Redirect to Stripe onboarding
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to connect Stripe");
      setConnecting(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/payouts/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.open(res.data.url, "_blank");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to open Stripe dashboard"
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Payouts
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your earnings and Stripe Connect account
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            ×
          </button>
        </div>
      )}

      {/* Stripe Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-lg ${
                payouts?.stripeConnected
                  ? "bg-green-100 dark:bg-green-900/20"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}
            >
              <Building
                className={`w-6 h-6 ${
                  payouts?.stripeConnected ? "text-green-600" : "text-gray-500"
                }`}
              />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Stripe Connect
              </h3>
              <p className="text-sm text-gray-500">
                {payouts?.stripeConnected
                  ? "Your Stripe account is connected"
                  : "Connect your Stripe account to receive payouts"}
              </p>
            </div>
          </div>
          {payouts?.stripeConnected ? (
            <button
              onClick={openStripeDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Open Dashboard
              <ExternalLink className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={connectStripe}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {connecting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  Connect Stripe
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Balance Cards */}
      {payouts?.stripeConnected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">Available Balance</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${((payouts?.availableBalance || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Ready for payout</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-500">Pending Balance</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${((payouts?.pendingBalance || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Processing...</p>
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Payout History
        </h3>

        {payouts?.history?.length > 0 ? (
          <div className="space-y-3">
            {payouts.history.map((payout, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      payout.status === "paid"
                        ? "bg-green-100 dark:bg-green-900/20"
                        : payout.status === "failed"
                        ? "bg-red-100 dark:bg-red-900/20"
                        : "bg-yellow-100 dark:bg-yellow-900/20"
                    }`}
                  >
                    <DollarSign
                      className={`w-4 h-4 ${
                        payout.status === "paid"
                          ? "text-green-600"
                          : payout.status === "failed"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      ${(payout.amount / 100).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(payout.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    payout.status === "paid"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : payout.status === "failed"
                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}
                >
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No payouts yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Payouts will appear here once you start earning
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPayouts;
