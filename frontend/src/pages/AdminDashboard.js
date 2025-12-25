import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import {
  Users,
  BookOpen,
  MessageCircle,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  Settings,
} from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalCommunities: 0,
    totalRevenue: 0,
    newUsersThisMonth: 0,
    activeCourses: 0,
    totalPayments: 0,
    averageRevenue: 0,
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const { token } = useSelector((state) => state.auth);
  const { theme } = useSelector((state) => state.theme);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);

        // Fetch analytics
        const analyticsRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/analytics/admin`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Fetch recent users
        const usersRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/users?limit=5&sort=-createdAt`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Fetch recent payments
        const paymentsRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/payments/recent?limit=5`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setStats(analyticsRes.data.analytics || {});
        setRecentUsers(usersRes.data.users || []);
        setRecentPayments(paymentsRes.data.payments || []);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAdminData();
    }
  }, [token]);

  const StatCard = ({ icon: Icon, title, value, subtext, color }) => (
    <div
      className={`rounded-lg shadow-soft p-6 border ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white border-gray-100"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p
            className={`text-sm font-medium ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            {title}
          </p>
          <p
            className={`text-3xl font-bold mt-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            {loading ? "..." : value}
          </p>
          {subtext && (
            <p
              className={`text-sm mt-2 ${
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              }`}
            >
              {subtext}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`ml-64 p-6 min-h-screen ${
        theme === "dark" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1
            className={`text-3xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            <Shield className="inline-block mr-2 mb-1" size={32} />
            Admin Dashboard
          </h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Settings size={18} />
            Settings
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            title="Total Users"
            value={stats.totalUsers}
            subtext={`+${stats.newUsersThisMonth || 0} this month`}
            color="bg-blue-600"
          />
          <StatCard
            icon={BookOpen}
            title="Total Courses"
            value={stats.totalCourses}
            subtext={`${stats.activeCourses || 0} active`}
            color="bg-green-600"
          />
          <StatCard
            icon={MessageCircle}
            title="Communities"
            value={stats.totalCommunities}
            subtext="Active discussions"
            color="bg-purple-600"
          />
          <StatCard
            icon={DollarSign}
            title="Total Revenue"
            value={`$${(stats.totalRevenue || 0).toLocaleString()}`}
            subtext={`Avg: $${(stats.averageRevenue || 0).toFixed(2)}`}
            color="bg-amber-600"
          />
        </div>

        {/* Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Users */}
          <div
            className={`rounded-lg shadow-soft p-6 border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-xl font-semibold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Recent Users
              </h2>
              <TrendingUp
                size={20}
                className={theme === "dark" ? "text-gray-400" : "text-gray-500"}
              />
            </div>
            <div className="space-y-3">
              {loading ? (
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }
                >
                  Loading...
                </p>
              ) : recentUsers.length === 0 ? (
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }
                >
                  No recent users
                </p>
              ) : (
                recentUsers.map((user) => (
                  <div
                    key={user._id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          user.role === "admin"
                            ? "bg-red-500"
                            : user.role === "teacher"
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                      >
                        {user.firstName?.[0]}
                        {user.lastName?.[0]}
                      </div>
                      <div>
                        <p
                          className={`font-medium ${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {user.firstName} {user.lastName}
                        </p>
                        <p
                          className={`text-sm ${
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === "admin"
                          ? "bg-red-100 text-red-700"
                          : user.role === "teacher"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Payments */}
          <div
            className={`rounded-lg shadow-soft p-6 border ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-100"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-xl font-semibold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                Recent Payments
              </h2>
              <Activity
                size={20}
                className={theme === "dark" ? "text-gray-400" : "text-gray-500"}
              />
            </div>
            <div className="space-y-3">
              {loading ? (
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }
                >
                  Loading...
                </p>
              ) : recentPayments.length === 0 ? (
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }
                >
                  No recent payments
                </p>
              ) : (
                recentPayments.map((payment) => (
                  <div
                    key={payment._id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                    }`}
                  >
                    <div>
                      <p
                        className={`font-medium ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        ${payment.amount?.toFixed(2) || "0.00"}
                      </p>
                      <p
                        className={`text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {payment.user?.email ||
                          payment.course?.title ||
                          "Unknown"}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {payment.status || "unknown"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Platform Metrics */}
        <div
          className={`rounded-lg shadow-soft p-6 border ${
            theme === "dark"
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-100"
          }`}
        >
          <h2
            className={`text-xl font-semibold mb-4 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Platform Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {stats.totalPayments || 0}
              </div>
              <div
                className={`text-sm mt-1 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Total Transactions
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  theme === "dark" ? "text-green-400" : "text-green-600"
                }`}
              >
                {stats.totalCourses && stats.totalUsers
                  ? ((stats.totalCourses / stats.totalUsers) * 100).toFixed(1)
                  : 0}
                %
              </div>
              <div
                className={`text-sm mt-1 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Course Enrollment Rate
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  theme === "dark" ? "text-purple-400" : "text-purple-600"
                }`}
              >
                $
                {stats.totalRevenue && stats.totalUsers
                  ? (stats.totalRevenue / stats.totalUsers).toFixed(2)
                  : 0}
              </div>
              <div
                className={`text-sm mt-1 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Revenue Per User
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
