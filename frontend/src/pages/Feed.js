import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import PostCard from "../components/PostCard";
import { Users, TrendingUp } from "lucide-react";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [postImage, setPostImage] = useState(null);
  const [feedMode, setFeedMode] = useState("following"); // "all" or "following"
  const { user: reduxUser, token } = useSelector((state) => state.auth);
  const { user: clerkUser } = useUser();

  const userEmail =
    clerkUser?.primaryEmailAddress?.emailAddress || reduxUser?.email;
  const userId = reduxUser?._id || reduxUser?.id;

  useEffect(() => {
    fetchPosts();
  }, [feedMode]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem("token");

      const endpoint =
        feedMode === "following"
          ? `${process.env.REACT_APP_API_URL}/posts/following`
          : `${process.env.REACT_APP_API_URL}/posts`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setPosts(response.data.posts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    try {
      const authToken = token || localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/posts`,
        {
          content: newPost,
          image: postImage,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      setPosts([response.data.post, ...posts]);
      setNewPost("");
      setPostImage(null);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to create post. Please try again.");
    }
  };

  return (
    <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Share updates and see what others are posting
          </p>
        </div>

        {/* Feed Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFeedMode("following")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              feedMode === "following"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Users size={18} />
            Following
          </button>
          <button
            onClick={() => setFeedMode("all")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              feedMode === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <TrendingUp size={18} />
            Explore
          </button>
        </div>

        {/* Create Post */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-100 dark:border-gray-700 p-6 mb-6">
          <form onSubmit={handleCreatePost}>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
              rows="4"
            />
            <div className="flex items-center justify-between mt-4">
              <input
                type="text"
                value={postImage || ""}
                onChange={(e) => setPostImage(e.target.value)}
                placeholder="Image URL (optional)"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white mr-4"
              />
              <button
                type="submit"
                disabled={!newPost.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Post
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              Loading posts...
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-100 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              {feedMode === "following"
                ? "No posts from people you follow yet"
                : "No posts to show"}
            </p>
            {feedMode === "following" && (
              <button
                onClick={() => setFeedMode("all")}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Explore All Posts
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
