import React, { useState } from "react";
import { useSelector } from "react-redux";
import { FavoriteBorder, Favorite } from "@mui/icons-material";
import axios from "axios";

const PostCard = ({ post }) => {
  const { user } = useSelector((state) => state.auth);
  const [liked, setLiked] = useState(
    post.likes.some((like) => like.user === user?.id)
  );
  const [likesCount, setLikesCount] = useState(post.likes.length);

  const handleLike = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.REACT_APP_API_URL}/posts/${post._id}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLiked(!liked);
      setLikesCount(liked ? likesCount - 1 : likesCount + 1);
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-100 dark:border-gray-700 p-6 hover:shadow-card transition-all mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {post.author?.firstName?.[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {post.author?.firstName} {post.author?.lastName}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
        {post.content}
      </p>

      {/* Image */}
      {post.image && (
        <img
          src={post.image}
          alt="post"
          className="w-full h-64 object-cover rounded-lg mb-4"
        />
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
        <span>{likesCount} likes</span>
        <span>{post.comments.length} comments</span>
        <span>{post.views} views</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around">
        <button
          onClick={handleLike}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-1 justify-center py-2"
        >
          {liked ? <Favorite className="text-red-600" /> : <FavoriteBorder />}
          <span className="text-sm">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-1 justify-center py-2">
          💬 <span className="text-sm">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors flex-1 justify-center py-2">
          🔗 <span className="text-sm">Share</span>
        </button>
      </div>
    </div>
  );
};

export default PostCard;
