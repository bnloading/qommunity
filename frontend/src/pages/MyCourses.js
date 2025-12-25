import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";

/**
 * My Courses Page
 * Shows all courses purchased by the user
 */
const MyCourses = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, in-progress, completed

  useEffect(() => {
    fetchMyCourses();
  }, []);

  const fetchMyCourses = async () => {
    try {
      const token = await getToken();

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/me/courses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCourses(response.data.courses || response.data.purchasedCourses || []);
    } catch (err) {
      setError("Failed to load your courses");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (filter === "all") return true;
    if (filter === "in-progress")
      return course.progress > 0 && course.progress < 100;
    if (filter === "completed") return course.progress === 100;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Courses
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Continue learning from where you left off
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-8">
            <button
              onClick={() => setFilter("all")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                filter === "all"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              All Courses ({courses.length})
            </button>
            <button
              onClick={() => setFilter("in-progress")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                filter === "in-progress"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                filter === "completed"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {filter === "all" ? "No courses yet" : `No ${filter} courses`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === "all"
                ? "Start learning by purchasing your first course"
                : `You don't have any ${filter.replace("-", " ")} courses`}
            </p>
            <button
              onClick={() => navigate("/courses")}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Courses
            </button>
          </div>
        )}

        {/* Courses Grid */}
        {filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((item) => {
              const course = item.course || item;
              const progress = item.progress || 0;

              return (
                <div
                  key={course._id}
                  onClick={() => navigate(`/courses/${course._id}`)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-16 h-16 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {/* Progress Badge */}
                    {progress > 0 && (
                      <div className="absolute top-3 right-3 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {progress}% Complete
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Progress Bar */}
                    {progress > 0 && (
                      <div className="mb-4">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Continue/Start Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/courses/${course._id}/learn`);
                      }}
                      className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {progress > 0 ? "Continue Learning" : "Start Course"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
