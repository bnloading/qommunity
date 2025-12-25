import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Plus, BookOpen, Users, Star, X, Crown } from "lucide-react";

const Home = () => {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dbUser, setDbUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "programming",
    price: 0,
  });

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const params = new URLSearchParams();
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      setUserLoading(true);
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/users/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDbUser(response.data.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setUserLoading(false);
    }
  };

  const subscriptionTier = dbUser?.subscriptionTier || "free";
  const canCreateCourses = subscriptionTier === "premium";

  const categories = [
    { id: "all", label: "All", emoji: "🌍" },
    { id: "programming", label: "Programming", emoji: "💻" },
    { id: "business", label: "Business", emoji: "💼" },
    { id: "design", label: "Design", emoji: "🎨" },
    { id: "marketing", label: "Marketing", emoji: "📱" },
    { id: "personal-development", label: "Personal Development", emoji: "📚" },
    { id: "data-science", label: "Data Science", emoji: "📊" },
  ];

  const handleEnrollCourse = async (courseId) => {
    try {
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!canCreateCourses) {
      alert("Upgrade to Premium to create and sell your own courses.");
      return;
    }
    try {
      setCreating(true);
      const token = await getToken();

      await axios.post(`${process.env.REACT_APP_API_URL}/courses`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Course created successfully!");
      setShowCreateModal(false);
      setFormData({
        title: "",
        description: "",
        category: "programming",
        price: 0,
      });
      fetchCourses();
    } catch (error) {
      console.error("Error creating course:", error);
      alert(error.response?.data?.message || "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  const handleUpgradeToPremium = async () => {
    try {
      setUpgradeLoading(true);
      const token = await getToken();
      if (!token) {
        alert("Please sign in to upgrade.");
        return;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/subscriptions/checkout`,
        { tier: "premium" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error upgrading to premium:", error);
      alert(error.response?.data?.error || "Failed to start checkout.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!canCreateCourses) {
      handleUpgradeToPremium();
      return;
    }
    setShowCreateModal(true);
  };

  const getRankBadge = (index) => {
    const badges = {
      0: { bg: "bg-yellow-500", text: "#1", icon: "🏆" },
      1: { bg: "bg-gray-400", text: "#2", icon: "🥈" },
      2: { bg: "bg-orange-600", text: "#3", icon: "🥉" },
    };
    return (
      badges[index] || { bg: "bg-blue-500", text: `#${index + 1}`, icon: "📚" }
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f5f1] dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Discover courses
          </h1>
          {userLoading ? (
            <p className="text-gray-500">Checking your membership...</p>
          ) : canCreateCourses ? (
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              or{" "}
              <button
                onClick={handleOpenCreateModal}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                create your own
              </button>
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-700">
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Want to launch your own course? Upgrade to Premium to unlock
                creation tools.
              </p>
              <button
                onClick={handleUpgradeToPremium}
                disabled={upgradeLoading}
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {upgradeLoading ? (
                  "Redirecting..."
                ) : (
                  <>
                    <Crown className="w-5 h-5" /> Upgrade to Premium
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for anything"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                selectedCategory === category.id
                  ? "bg-blue-600 text-white shadow-lg scale-105"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
              }`}
            >
              <span className="text-xl">{category.emoji}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-5xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Loading courses...
            </p>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400 text-xl mb-6">
              No courses found. Be the first to create one!
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition font-semibold"
            >
              {canCreateCourses ? "Create Course" : "Upgrade to Premium"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => {
              const badge = getRankBadge(index);
              return (
                <div
                  key={course._id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden border border-gray-100 dark:border-gray-700"
                  onClick={() => handleEnrollCourse(course._id)}
                >
                  {/* Rank Badge */}
                  <div className="relative">
                    <div
                      className={`absolute top-4 left-4 ${badge.bg} text-white px-4 py-2 rounded-full font-bold shadow-lg z-10 flex items-center gap-2`}
                    >
                      <span className="text-xl">{badge.icon}</span>
                      <span>{badge.text}</span>
                    </div>

                    {/* Thumbnail */}
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <BookOpen className="w-16 h-16 text-white opacity-80" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Instructor */}
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={
                          course.instructor?.profilePicture ||
                          "https://via.placeholder.com/40"
                        }
                        alt={course.instructor?.name || "Instructor"}
                        className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-700"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {course.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          by {course.instructor?.name || "Unknown"}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{course.studentCount || 0} students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{course.rating?.average || 0}</span>
                      </div>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${course.price || 0}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnrollCourse(course._id);
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition font-semibold"
                      >
                        View Course
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && canCreateCourses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Course
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              >
                <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Course Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Complete Web Development Bootcamp"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Describe what students will learn..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="programming">Programming</option>
                    <option value="business">Business</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="personal-development">
                      Personal Development
                    </option>
                    <option value="data-science">Data Science</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Course
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
