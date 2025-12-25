import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  BarChart3,
  Users,
  FileText,
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityDashboard = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/dashboard`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboard(res.data.dashboard);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        <p>{error}</p>
        <button
          onClick={fetchDashboard}
          className="mt-2 text-sm underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Members",
      value: dashboard?.totalMembers || 0,
      icon: Users,
      color: "bg-blue-500",
      change: null,
    },
    {
      label: "Paid Members",
      value: dashboard?.paidMembers || 0,
      icon: DollarSign,
      color: "bg-green-500",
      change: null,
    },
    {
      label: "Total Posts",
      value: dashboard?.totalPosts || 0,
      icon: FileText,
      color: "bg-purple-500",
      change: null,
    },
    {
      label: "Total Courses",
      value: dashboard?.totalCourses || 0,
      icon: BookOpen,
      color: "bg-orange-500",
      change: null,
    },
    {
      label: "Monthly Revenue (MRR)",
      value: `$${((dashboard?.mrr || 0) / 100).toFixed(2)}`,
      icon: TrendingUp,
      color: "bg-emerald-500",
      change: null,
    },
    {
      label: "Active Subscriptions",
      value: dashboard?.activeSubscriptions || 0,
      icon: Calendar,
      color: "bg-indigo-500",
      change: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Real-time community statistics
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
                {stat.change && (
                  <div className="flex items-center mt-2">
                    {stat.change > 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm ${
                        stat.change > 0 ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {Math.abs(stat.change)}% from last month
                    </span>
                  </div>
                )}
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Posts
          </h3>
          <div className="space-y-3">
            {dashboard?.recentPosts?.length > 0 ? (
              dashboard.recentPosts.map((post, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <img
                    src={
                      post.author?.profilePicture ||
                      `https://ui-avatars.com/api/?name=${post.author?.firstName}`
                    }
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {post.content?.substring(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {post.author?.firstName} {post.author?.lastName} •{" "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent posts</p>
            )}
          </div>
        </div>

        {/* Recent Members */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Members
          </h3>
          <div className="space-y-3">
            {dashboard?.recentMembers?.length > 0 ? (
              dashboard.recentMembers.map((member, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      New member joined
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(member.joinedAt).toLocaleDateString()} •{" "}
                      {member.role}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No recent members</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue Overview
          </h3>
          <BarChart3 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Total Revenue: $
              {((dashboard?.totalRevenue || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              View detailed metrics in the Metrics tab
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDashboard;
