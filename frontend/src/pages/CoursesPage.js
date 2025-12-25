import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";
import { Search, Filter } from "lucide-react";
import CourseCard from "../components/CourseCard";

const CoursesPage = () => {
  const { darkMode } = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    level: "all",
    sort: "newest",
    page: 1,
    limit: 12,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    currentPage: 1,
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: filters.search,
        category: filters.category,
        level: filters.level,
        sort: filters.sort,
        page: filters.page,
        limit: filters.limit,
      });

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses?${params}`
      );

      setCourses(response.data.courses || []);
      setPagination(response.data.pagination || {});
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to page 1 when filter changes
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  return (
    <div
      className={`min-h-screen py-12 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-12">
          <h1
            className={`text-4xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Explore Courses
          </h1>
          <p
            className={`text-lg ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Learn from the best instructors and expand your skills
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search
              className={`absolute left-4 top-3.5 ${
                darkMode ? "text-gray-500" : "text-gray-400"
              }`}
              size={20}
            />
            <input
              type="text"
              placeholder="Search courses..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className={`w-full pl-12 pr-4 py-3 rounded-lg border ${
                darkMode
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
              }`}
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                showFilters
                  ? "bg-blue-500 text-white"
                  : darkMode
                  ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
              }`}
            >
              <Filter size={18} />
              Filters
            </button>

            {/* Quick Category Filters */}
            {["programming", "business", "design", "marketing"].map((cat) => (
              <button
                key={cat}
                onClick={() => handleFilterChange("category", cat)}
                className={`px-4 py-2 rounded-lg font-semibold transition capitalize ${
                  filters.category === cat
                    ? "bg-blue-500 text-white"
                    : darkMode
                    ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div
              className={`p-6 rounded-lg border ${
                darkMode
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-300"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-3 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) =>
                      handleFilterChange("category", e.target.value)
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <option value="all">All Categories</option>
                    <option value="programming">Programming</option>
                    <option value="business">Business</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="personal-development">
                      Personal Development
                    </option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Level Filter */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-3 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Level
                  </label>
                  <select
                    value={filters.level}
                    onChange={(e) =>
                      handleFilterChange("level", e.target.value)
                    }
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-3 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Sort By
                  </label>
                  <select
                    value={filters.sort}
                    onChange={(e) => handleFilterChange("sort", e.target.value)}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <option value="newest">Newest</option>
                    <option value="popular">Most Popular</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
              Loading courses...
            </p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <p
              className={`text-xl ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              No courses found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {courses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center gap-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        pagination.currentPage === page
                          ? "bg-blue-500 text-white"
                          : darkMode
                          ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                          : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-300"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
