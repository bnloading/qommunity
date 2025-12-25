import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Search, Plus, Globe, Users, TrendingUp, X } from "lucide-react";

const Community = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "hobbies",
    thumbnail: null,
  });

  // Fetch user subscription status
  useEffect(() => {
    const fetchSubscriptionStatus = async () => {
      try {
        const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
        if (!userEmail) return;

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/subscriptions/status`,
          { params: { userEmail } }
        );
        setUserSubscription(response.data);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      }
    };

    if (clerkUser) {
      fetchSubscriptionStatus();
    }
  }, [clerkUser]);

  // Check subscription and redirect if needed
  const handleCreateClick = () => {
    // Check if user has an active subscription
    if (
      !userSubscription ||
      userSubscription.subscriptionStatus !== "active" ||
      userSubscription.subscriptionTier === "free"
    ) {
      // Redirect to subscription plan selection
      navigate("/select-plan", {
        state: {
          redirectPath: "/community",
          action: "create community",
        },
      });
      return;
    }
    // User has subscription, show create modal
    setShowCreateModal(true);
  };

  useEffect(() => {
    fetchCommunities();
  }, [selectedCategory, searchQuery]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (searchQuery) params.append("search", searchQuery);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/community?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCommunities(response.data.communities || []);
    } catch (error) {
      console.error("Error fetching communities:", error);
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    {
      id: "all",
      label: "All",
      icon: "🌍",
      emoji: <Globe className="w-4 h-4" />,
    },
    { id: "hobbies", label: "Hobbies", icon: "🎨", emoji: "🎨" },
    { id: "music", label: "Music", icon: "🎵", emoji: "🎵" },
    { id: "money", label: "Money", icon: "💰", emoji: "💰" },
    { id: "spirituality", label: "Spirituality", icon: "🙏", emoji: "🙏" },
    { id: "tech", label: "Tech", icon: "💻", emoji: "💻" },
    { id: "health", label: "Health", icon: "🏃", emoji: "🏃" },
    { id: "sports", label: "Sports", icon: "⚽", emoji: "⚽" },
    {
      id: "self-improvement",
      label: "Self-improvement",
      icon: "📚",
      emoji: "📚",
    },
  ];

  const handleJoinCommunity = async (communityId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_URL}/community/${communityId}/join`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Joined community successfully!");
      fetchCommunities();
    } catch (error) {
      console.error("Error joining community:", error);
      alert(error.response?.data?.message || "Failed to join community");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      thumbnail: e.target.files[0],
    }));
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const token = localStorage.getItem("token");
      const data = new FormData();
      data.append("name", formData.name);
      data.append("description", formData.description);
      data.append("category", formData.category);
      if (formData.thumbnail) {
        data.append("thumbnail", formData.thumbnail);
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/community/create`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        alert("Community created successfully!");
        setShowCreateModal(false);
        setFormData({
          name: "",
          description: "",
          category: "hobbies",
          thumbnail: null,
        });
        fetchCommunities();
      }
    } catch (error) {
      console.error("Error creating community:", error);
      alert(
        error.response?.data?.message ||
          "Failed to create community. Make sure you have completed a payment first."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="ml-64 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Discover communities
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            or{" "}
            <button
              onClick={handleCreateClick}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold underline"
            >
              create your own
            </button>
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for anything"
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-3 mb-12 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? "bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-lg"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span className="text-lg">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium whitespace-nowrap transition-all">
            <span>More...</span>
            <Globe className="w-4 h-4" />
          </button>
        </div>

        {/* Communities Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Loading communities...
            </p>
          </div>
        ) : communities.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-16 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-xl mb-6">
              No communities found
            </p>
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Create First Community
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {communities.map((community, index) => (
              <div
                key={community._id}
                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                {/* Ranking Badge */}
                <div className="relative">
                  <div className="absolute top-4 left-4 bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg z-10 shadow-lg">
                    #{index + 1}
                  </div>

                  {/* Thumbnail */}
                  <div className="h-48 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative overflow-hidden">
                    {community.thumbnail ? (
                      <img
                        src={`${process.env.REACT_APP_API_URL.replace(
                          "/api",
                          ""
                        )}${community.thumbnail}`}
                        alt={community.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                        {community.name?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Community Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {community.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                        {community.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{community.members?.length || 0} members</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {community.description || "No description available"}
                  </p>

                  {/* Creator Info */}
                  {community.creator && (
                    <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 dark:text-gray-500">
                      <span>Created by</span>
                      <span className="font-semibold">
                        {community.creator.firstName}{" "}
                        {community.creator.lastName}
                      </span>
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    onClick={() => handleJoinCommunity(community._id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                  >
                    Join Community
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {communities.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-8 text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-semibold">{communities.length}</span>
              <span>communities</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-semibold">
                {communities.reduce(
                  (acc, c) => acc + (c.members?.length || 0),
                  0
                )}
              </span>
              <span>total members</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Community
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCommunity} className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., AI Automation Society"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  placeholder="Describe what your community is about..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories
                    .filter((cat) => cat.id !== "all")
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community Thumbnail *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-400 file:font-semibold hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
                />
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  ℹ️ <strong>Note:</strong> You need to have completed at least
                  one payment to create a community.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create Community"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Community;
