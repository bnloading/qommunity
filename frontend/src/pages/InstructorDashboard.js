import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { TrendingUp, School, People, AttachMoney } from "@mui/icons-material";

const InstructorDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [dashboardData, setDashboardData] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.role !== "teacher") {
      return;
    }
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/analytics/instructor/dashboard`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDashboardData(response.data.stats);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch dashboard data");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseAnalytics = async (courseId) => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/analytics/instructor/course/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setCourseAnalytics(response.data.analytics);
    } catch (err) {
      console.error("Course analytics error:", err);
    }
  };

  if (user?.role !== "teacher") {
    return (
      <div className="ml-64 p-6">
        <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg">
          <p className="text-blue-600 dark:text-blue-400">
            Only teachers can access the instructor dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ml-64 p-6 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ml-64 p-6">
        <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-64 p-6 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Instructor Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your courses and track your earnings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Courses
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.totalCourses || 0}
              </p>
            </div>
            <School className="w-12 h-12 text-blue-500" />
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Students
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.totalStudents || 0}
              </p>
            </div>
            <People className="w-12 h-12 text-green-500" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Total Revenue
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                ${(dashboardData?.totalRevenue || 0).toFixed(2)}
              </p>
            </div>
            <AttachMoney className="w-12 h-12 text-yellow-500" />
          </div>
        </div>

        {/* Growth Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-soft border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Engagement
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {dashboardData?.courses?.length > 0
                  ? (
                      (dashboardData.totalStudents /
                        (dashboardData.courses.length * 10)) *
                      100
                    ).toFixed(0)
                  : 0}
                %
              </p>
            </div>
            <TrendingUp className="w-12 h-12 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Courses Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your Courses
          </h2>
        </div>

        {dashboardData?.courses && dashboardData.courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Course Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Students
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Revenue
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Rating
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {dashboardData.courses.map((course) => (
                  <tr
                    key={course._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {course.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {course.studentCount}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      ${course.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                        ★ {course.rating.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => fetchCourseAnalytics(course._id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            <p>You haven't created any courses yet.</p>
          </div>
        )}
      </div>

      {/* Course Details Modal */}
      {courseAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {courseAnalytics.course.title}
              </h3>
              <button
                onClick={() => {
                  setCourseAnalytics(null);
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {courseAnalytics.statistics.totalStudents}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${courseAnalytics.statistics.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Avg Progress
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {courseAnalytics.statistics.averageProgress}%
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Rating
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ★ {courseAnalytics.statistics.rating}
                  </p>
                </div>
              </div>

              {/* Tier Breakdown */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Tier Breakdown
                </h4>
                <div className="space-y-2">
                  {Object.values(courseAnalytics.tierBreakdown).map((tier) => (
                    <div
                      key={tier.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                    >
                      <span className="capitalize font-medium text-gray-900 dark:text-white">
                        {tier.name}
                      </span>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {tier.studentCount} students
                        </p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${tier.revenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student List */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Enrolled Students
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {courseAnalytics.students.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {student.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {student.tier}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {student.progress}% progress
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;
