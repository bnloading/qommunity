import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useTheme } from "../context/ThemeContext";
import {
  Crown,
  Sparkles,
  Check,
  BookOpen,
  TrendingUp,
  ExternalLink,
  Mail,
  Plus,
  Image,
  Edit2,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MediaLibrary from "../components/MediaLibrary";

const Profile = () => {
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const { darkMode } = useTheme();
  const navigate = useNavigate();

  const [dbUser, setDbUser] = useState(null);
  const [purchasedCourses, setPurchasedCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Profile editing states
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    bio: "",
  });

  useEffect(() => {
    const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
    if (userEmail) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clerkUser?.primaryEmailAddress?.emailAddress]);

  const fetchUserData = async () => {
    try {
      const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
      console.log("Profile: Fetching data for email:", userEmail);

      if (!userEmail) {
        console.error("Profile: No email found");
        setLoading(false);
        return;
      }

      // Get user's created courses
      const coursesResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses/my-courses/created`,
        {
          params: { userEmail },
        }
      );
      console.log("Profile: Courses response:", coursesResponse.data);

      setCreatedCourses(coursesResponse.data.courses || []);

      // Get subscription status from backend
      const subResponse = await axios.get(
        `${process.env.REACT_APP_API_URL}/subscriptions/status`,
        {
          params: { userEmail },
        }
      );
      console.log("Profile: Subscription response:", subResponse.data);

      const userData = {
        firstName: clerkUser?.firstName || "User",
        lastName: clerkUser?.lastName || "",
        email: userEmail,
        bio: subResponse.data.bio || "",
        subscriptionTier: subResponse.data.subscriptionTier || "free",
        subscriptionStatus: subResponse.data.subscriptionStatus || "none",
      };

      setDbUser(userData);
      setEditForm({
        firstName: userData.firstName,
        lastName: userData.lastName,
        bio: userData.bio,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setEditForm({
      firstName: dbUser?.firstName || clerkUser?.firstName || "",
      lastName: dbUser?.lastName || clerkUser?.lastName || "",
      bio: dbUser?.bio || "",
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({
      firstName: dbUser?.firstName || clerkUser?.firstName || "",
      lastName: dbUser?.lastName || clerkUser?.lastName || "",
      bio: dbUser?.bio || "",
    });
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = await getToken();

      await axios.put(
        `${process.env.REACT_APP_API_URL}/users/me/profile`,
        {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          bio: editForm.bio,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state
      setDbUser((prev) => ({
        ...prev,
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        bio: editForm.bio,
      }));

      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/subscriptions/portal`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error accessing billing portal:", error);
      alert("Failed to access billing portal");
    }
  };

  const getSubscriptionBadge = () => {
    const tier = dbUser?.subscriptionTier || "free";

    const badges = {
      free: {
        color: "bg-gray-500",
        icon: <Sparkles size={16} />,
        text: "Free",
      },
      hobby: {
        color: "bg-blue-500",
        icon: <Check size={16} />,
        text: "Hobby",
      },
      pro: {
        color: "bg-yellow-500",
        icon: <Crown size={16} />,
        text: "Pro",
      },
      // Keep old names for backwards compatibility
      basic: {
        color: "bg-blue-500",
        icon: <Check size={16} />,
        text: "Basic",
      },
      premium: {
        color: "bg-yellow-500",
        icon: <Crown size={16} />,
        text: "Premium",
      },
    };

    const badge = badges[tier] || badges.free;

    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${badge.color} text-white font-semibold`}
      >
        {badge.icon}
        {badge.text}
      </div>
    );
  };

  console.log(
    "Profile render - loading:",
    loading,
    "clerkUser:",
    !!clerkUser,
    "dbUser:",
    !!dbUser
  );

  if (loading || !clerkUser) {
    return (
      <div className="ml-64 flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
          <p className="text-gray-500 text-sm mt-2">
            Loading: {loading.toString()}, User: {clerkUser ? "Yes" : "No"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ml-64 min-h-screen py-12 ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Card */}
        <div
          className={`rounded-2xl shadow-xl overflow-hidden mb-8 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div
            className={`h-32 ${
              darkMode
                ? "bg-gradient-to-r from-blue-900 to-purple-900"
                : "bg-gradient-to-r from-blue-500 to-purple-500"
            }`}
          ></div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-16">
              <img
                src={clerkUser.imageUrl || "https://via.placeholder.com/150"}
                alt={clerkUser.fullName}
                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
              />

              <div className="flex-1">
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4 mt-8">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label
                          className={`block text-sm font-medium mb-1 ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          First Name
                        </label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              firstName: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2 rounded-lg border ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                      <div className="flex-1">
                        <label
                          className={`block text-sm font-medium mb-1 ${
                            darkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              lastName: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2 rounded-lg border ${
                            darkMode
                              ? "bg-gray-700 border-gray-600 text-white"
                              : "bg-white border-gray-300 text-gray-900"
                          } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-1 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Bio
                      </label>
                      <textarea
                        value={editForm.bio}
                        onChange={(e) =>
                          setEditForm({ ...editForm, bio: e.target.value })
                        }
                        rows={3}
                        placeholder="Tell us about yourself..."
                        className={`w-full px-4 py-2 rounded-lg border ${
                          darkMode
                            ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                            : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none`}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Save size={18} />
                        )}
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                          darkMode
                            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        } disabled:opacity-50`}
                      >
                        <X size={18} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="flex items-center gap-4 mb-2">
                      <h1
                        className={`text-3xl font-bold ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {dbUser?.firstName && dbUser?.lastName
                          ? `${dbUser.firstName} ${dbUser.lastName}`
                          : clerkUser.fullName ||
                            `${clerkUser.firstName} ${clerkUser.lastName}`}
                      </h1>
                      {getSubscriptionBadge()}
                      <button
                        onClick={handleEditClick}
                        className={`p-2 rounded-lg transition ${
                          darkMode
                            ? "hover:bg-gray-700 text-gray-400 hover:text-white"
                            : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        }`}
                        title="Edit Profile"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                    <p
                      className={`flex items-center gap-2 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      <Mail size={18} />
                      {clerkUser.primaryEmailAddress?.emailAddress}
                    </p>
                    {dbUser?.bio && (
                      <p
                        className={`mt-3 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {dbUser.bio}
                      </p>
                    )}
                  </>
                )}
              </div>

              {!isEditing && dbUser?.subscriptionTier !== "free" && (
                <button
                  onClick={handleManageSubscription}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-semibold"
                >
                  Manage Subscription
                  <ExternalLink size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Subscription Info */}
            <div
              className={`rounded-2xl shadow-xl p-8 ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h2
                className={`text-2xl font-bold mb-6 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Your Plan
              </h2>
              {dbUser?.subscriptionTier === "free" && (
                <div>
                  <p
                    className={`mb-6 ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    You're currently on the Free plan. Upgrade to unlock more
                    features!
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate("/pricing")}
                      className="px-6 py-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-semibold"
                    >
                      Upgrade to Basic
                    </button>
                    <button
                      onClick={() => navigate("/pricing")}
                      className="px-6 py-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-semibold flex items-center justify-center gap-2"
                    >
                      <Crown size={20} />
                      Upgrade to Premium
                    </button>
                  </div>
                </div>
              )}
              {dbUser?.subscriptionTier === "basic" && (
                <div>
                  <p
                    className={`mb-6 ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    You have Basic subscription. Purchase courses individually
                    or upgrade to Premium for full access!
                  </p>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="px-6 py-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-semibold flex items-center gap-2"
                  >
                    <Crown size={20} />
                    Upgrade to Premium
                  </button>
                </div>
              )}
              {dbUser?.subscriptionTier === "hobby" && (
                <div>
                  <p
                    className={`mb-6 ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    You have the Hobby plan ($9/month). Upgrade to Pro for lower
                    transaction fees and advanced features!
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
                    <div
                      className={`p-4 rounded-lg text-center ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <BookOpen
                        className={`mx-auto mb-2 ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                        size={32}
                      />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Unlimited Members
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-lg text-center ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <TrendingUp
                        className={`mx-auto mb-2 ${
                          darkMode ? "text-green-400" : "text-green-600"
                        }`}
                        size={32}
                      />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        10% Transaction Fee
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-lg text-center ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <Sparkles
                        className={`mx-auto mb-2 ${
                          darkMode ? "text-purple-400" : "text-purple-600"
                        }`}
                        size={32}
                      />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Unlimited Videos
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/select-plan")}
                    className="px-6 py-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-semibold flex items-center gap-2"
                  >
                    <Crown size={20} />
                    Upgrade to Pro ($99/month)
                  </button>
                </div>
              )}
              {dbUser?.subscriptionTier === "pro" && (
                <div>
                  <p
                    className={`mb-4 text-lg ${
                      darkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    🎉 You have the Pro plan with all premium features!
                  </p>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div
                      className={`p-4 rounded-lg text-center ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <BookOpen
                        className={`mx-auto mb-2 ${
                          darkMode ? "text-blue-400" : "text-blue-600"
                        }`}
                        size={32}
                      />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        2.9% Transaction Fee
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-lg text-center ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <TrendingUp
                        className={`mx-auto mb-2 ${
                          darkMode ? "text-green-400" : "text-green-600"
                        }`}
                        size={32}
                      />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Custom URL
                      </p>
                    </div>
                    <div
                      className={`p-4 rounded-lg text-center ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <Crown
                        className={`mx-auto mb-2 ${
                          darkMode ? "text-yellow-400" : "text-yellow-600"
                        }`}
                        size={32}
                      />
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Advanced Analytics
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <p
                  className={`mb-4 text-lg ${
                    darkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  🎉 You have unlimited access to all courses and can create
                  your own!
                </p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div
                    className={`p-4 rounded-lg text-center ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <BookOpen
                      className={`mx-auto mb-2 ${
                        darkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                      size={32}
                    />
                    <p
                      className={`text-sm ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Access All Courses
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg text-center ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <TrendingUp
                      className={`mx-auto mb-2 ${
                        darkMode ? "text-green-400" : "text-green-600"
                      }`}
                      size={32}
                    />
                    <p
                      className={`text-sm ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Create Unlimited
                    </p>
                  </div>
                  <div
                    className={`p-4 rounded-lg text-center ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <Crown
                      className={`mx-auto mb-2 ${
                        darkMode ? "text-yellow-400" : "text-yellow-600"
                      }`}
                      size={32}
                    />
                    <p
                      className={`text-sm ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Priority Support
                    </p>
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Purchased Courses */}
            {purchasedCourses.length > 0 && (
              <div
                className={`rounded-2xl shadow-xl p-8 ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h2
                  className={`text-2xl font-bold mb-6 ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Purchased Courses
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {purchasedCourses.map((pc) => (
                    <div
                      key={pc._id}
                      className={`p-4 rounded-lg cursor-pointer hover:shadow-lg transition ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                      onClick={() => navigate(`/courses/${pc.course._id}`)}
                    >
                      <h3
                        className={`font-semibold mb-2 ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {pc.course?.title || "Course"}
                      </h3>
                      <p
                        className={`text-sm ${
                          darkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Purchased:{" "}
                        {new Date(pc.purchaseDate).toLocaleDateString()}
                      </p>
                      <p
                        className={`text-sm font-semibold ${
                          darkMode ? "text-green-400" : "text-green-600"
                        }`}
                      >
                        ${pc.amount}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Created Courses */}
            <div
              className={`rounded-2xl shadow-xl p-8 ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <h2
                  className={`text-2xl font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Your Courses
                </h2>
                <button
                  onClick={() => navigate("/create-course")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-semibold"
                >
                  <Plus size={20} />
                  Create Course
                </button>
              </div>

              {createdCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {createdCourses.map((course) => (
                    <div
                      key={course._id}
                      className={`rounded-lg overflow-hidden hover:shadow-lg transition ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      {/* Thumbnail */}
                      {course.thumbnail && (
                        <img
                          src={
                            course.thumbnail.startsWith("/uploads")
                              ? `http://localhost:5000${course.thumbnail}`
                              : course.thumbnail
                          }
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      )}

                      <div className="p-4">
                        <h3
                          className={`font-semibold text-lg mb-2 ${
                            darkMode ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {course.title}
                        </h3>
                        <p
                          className={`text-sm mb-4 ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {course.description?.substring(0, 100)}...
                        </p>

                        <div className="flex items-center justify-between mb-4">
                          <p
                            className={`text-sm ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            👥 {course.studentCount || 0} студенттер
                          </p>
                          <p
                            className={`font-semibold ${
                              darkMode ? "text-green-400" : "text-green-600"
                            }`}
                          >
                            ${course.totalRevenue || 0}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              navigate(`/manage-course/${course._id}`)
                            }
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
                          >
                            ✏️ Басқару
                          </button>
                          <button
                            onClick={() => navigate(`/courses/${course._id}`)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm ${
                              darkMode
                                ? "bg-gray-600 hover:bg-gray-500 text-white"
                                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                            }`}
                          >
                            👁️ Көру
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className={`text-center py-8 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Сіз әлі курс жасамадыңыз. "Create Course" батырмасын басып,
                  алғашқы курсыңызды жасаңыз!
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <div
              className={`rounded-2xl shadow-xl p-6 ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-bold mb-4 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Account Info
              </h3>
              <div className="space-y-3">
                <div>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Member since
                  </p>
                  <p
                    className={`font-semibold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {new Date(clerkUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-sm ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Subscription Status
                  </p>
                  <p
                    className={`font-semibold capitalize ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {dbUser?.subscriptionStatus || "None"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div
              className={`rounded-2xl shadow-xl p-6 ${
                darkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <h3
                className={`text-lg font-bold mb-4 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/courses")}
                  className={`w-full py-2 rounded-lg font-semibold transition ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  Browse Courses
                </button>
                <button
                  onClick={() => setShowMediaLibrary(true)}
                  className={`w-full py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                  }`}
                >
                  <Image size={18} />
                  Media Library
                </button>
                {(dbUser?.subscriptionTier === "hobby" ||
                  dbUser?.subscriptionTier === "pro" ||
                  dbUser?.subscriptionTier === "basic" ||
                  dbUser?.subscriptionTier === "premium") && (
                  <button
                    onClick={() => navigate("/courses/create")}
                    className="w-full py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition font-semibold"
                  >
                    Create Course
                  </button>
                )}
                <button
                  onClick={() => navigate("/pricing")}
                  className="w-full py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition font-semibold"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        darkMode={darkMode}
      />
    </div>
  );
};

export default Profile;
