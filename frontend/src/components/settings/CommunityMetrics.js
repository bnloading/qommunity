import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  MessageSquare,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const PERIODS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];

const CommunityMetrics = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [metrics, setMetrics] = useState({
    members: { total: 0, new: 0, growth: 0 },
    posts: { total: 0, new: 0, growth: 0 },
    comments: { total: 0, new: 0, growth: 0 },
    revenue: { total: 0, new: 0, growth: 0 },
    engagement: { postsPerMember: 0, commentsPerPost: 0 },
    timeline: [],
  });

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/metrics?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMetrics(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }, [communityId, period, getToken]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const GrowthIndicator = ({ value }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span
        className={`flex items-center gap-1 text-sm ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        )}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Metrics & Analytics
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Track your community's growth and engagement
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Main Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <GrowthIndicator value={metrics.members?.growth || 0} />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(metrics.members?.total || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Members</p>
              <p className="text-xs text-gray-400 mt-1">
                +{metrics.members?.new || 0} new
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <GrowthIndicator value={metrics.revenue?.growth || 0} />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(metrics.revenue?.total || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xs text-gray-400 mt-1">
                +{formatCurrency(metrics.revenue?.new || 0)} new
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <GrowthIndicator value={metrics.posts?.growth || 0} />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(metrics.posts?.total || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Posts</p>
              <p className="text-xs text-gray-400 mt-1">
                +{metrics.posts?.new || 0} new
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                </div>
                <GrowthIndicator value={metrics.comments?.growth || 0} />
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatNumber(metrics.comments?.total || 0)}
              </p>
              <p className="text-sm text-gray-500">Total Comments</p>
              <p className="text-xs text-gray-400 mt-1">
                +{metrics.comments?.new || 0} new
              </p>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Engagement Rates
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Posts per Member
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {(metrics.engagement?.postsPerMember || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (metrics.engagement?.postsPerMember || 0) * 10,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Comments per Post
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {(metrics.engagement?.commentsPerPost || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (metrics.engagement?.commentsPerPost || 0) * 10,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activity Overview
              </h3>
              <div className="flex items-center justify-center h-32">
                <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-center text-sm text-gray-500">
                Detailed charts coming soon
              </p>
            </div>
          </div>

          {/* Timeline Data */}
          {metrics.timeline && metrics.timeline.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Activity Timeline
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">New Members</th>
                      <th className="pb-3 font-medium">Posts</th>
                      <th className="pb-3 font-medium">Comments</th>
                      <th className="pb-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {metrics.timeline.map((day, index) => (
                      <tr
                        key={index}
                        className="text-gray-700 dark:text-gray-300"
                      >
                        <td className="py-3">{day.date}</td>
                        <td className="py-3">{day.members || 0}</td>
                        <td className="py-3">{day.posts || 0}</td>
                        <td className="py-3">{day.comments || 0}</td>
                        <td className="py-3">
                          {formatCurrency(day.revenue || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunityMetrics;
