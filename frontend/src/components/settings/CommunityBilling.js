import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  CreditCard,
  DollarSign,
  AlertCircle,
  Check,
  Users,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  XCircle,
  Clock,
  Receipt,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityBilling = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billing, setBilling] = useState({
    revenue: {
      total: 0,
      thisMonth: 0,
      lastMonth: 0,
      growth: 0,
    },
    subscriptions: {
      active: 0,
      canceled: 0,
      pastDue: 0,
    },
    failedPayments: [],
    recentPayments: [],
    refunds: [],
    monthlyRevenue: [],
  });
  const [refundLoading, setRefundLoading] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchBilling = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/billing`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBilling(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const handleRefund = async (paymentId) => {
    const reason = window.prompt("Enter refund reason (optional):");
    if (reason === null) return; // User cancelled

    try {
      setRefundLoading(paymentId);
      const token = await getToken();
      await axios.post(
        `${API_URL}/community-settings/${communityId}/billing/refund`,
        { paymentId, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Refund processed successfully!");
      fetchBilling();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process refund");
    } finally {
      setRefundLoading(null);
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Billing
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Manage subscriptions, payments, and refunds
          </p>
        </div>
        <button
          onClick={fetchBilling}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
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

      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(billing.revenue?.total || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">This Month</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(billing.revenue?.thisMonth || 0)}
          </p>
          {billing.revenue?.growth !== 0 && (
            <p
              className={`text-sm mt-1 ${
                billing.revenue?.growth > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {billing.revenue?.growth > 0 ? "+" : ""}
              {billing.revenue?.growth?.toFixed(1)}% vs last month
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Active Subscriptions</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {billing.subscriptions?.active || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <span className="text-sm text-gray-500">Past Due</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {billing.subscriptions?.pastDue || 0}
          </p>
        </div>
      </div>

      {/* Failed Payments Alert */}
      {billing.failedPayments && billing.failedPayments.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
              Failed Payments ({billing.failedPayments.length})
            </h3>
          </div>
          <div className="space-y-3">
            {billing.failedPayments.map((payment) => (
              <div
                key={payment._id}
                className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {payment.user?.name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.user?.name || "Unknown User"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(payment.amount)} ·{" "}
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
                  Failed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Payments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Payments
            </h3>
          </div>
        </div>

        {billing.recentPayments && billing.recentPayments.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {billing.recentPayments.map((payment) => (
              <div
                key={payment._id}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center font-medium text-gray-600 dark:text-gray-300">
                    {payment.user?.name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payment.user?.name || "Unknown User"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.type || "Subscription"} ·{" "}
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-sm ${
                      payment.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : payment.status === "refunded"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {payment.status}
                  </span>
                  {payment.status === "completed" && (
                    <button
                      onClick={() => handleRefund(payment._id)}
                      disabled={refundLoading === payment._id}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      {refundLoading === payment._id ? "..." : "Refund"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500">No payments yet</p>
          </div>
        )}
      </div>

      {/* Refunds */}
      {billing.refunds && billing.refunds.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Refunds
              </h3>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {billing.refunds.map((refund) => (
              <div
                key={refund._id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center font-medium text-gray-600 dark:text-gray-300">
                    {refund.user?.name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {refund.user?.name || "Unknown User"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {refund.refundReason || "No reason provided"} ·{" "}
                      {formatDate(refund.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-red-600">
                  -{formatCurrency(refund.amount, refund.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Revenue Chart Placeholder */}
      {billing.monthlyRevenue && billing.monthlyRevenue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Revenue
          </h3>
          <div className="flex items-end gap-1 h-40">
            {billing.monthlyRevenue.slice(-12).map((month, index) => {
              const maxRevenue = Math.max(
                ...billing.monthlyRevenue.map((m) => m.amount)
              );
              const height =
                maxRevenue > 0 ? (month.amount / maxRevenue) * 100 : 0;
              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${month.month}: ${formatCurrency(month.amount)}`}
                  ></div>
                  <span className="text-xs text-gray-500 truncate w-full text-center">
                    {month.month?.slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityBilling;
