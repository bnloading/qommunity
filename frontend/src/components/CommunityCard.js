import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "@clerk/clerk-react";
import { Users, Lock, UserPlus, UserMinus } from "lucide-react";
import axios from "axios";

const CommunityCard = ({ community, onJoinSuccess }) => {
  const { darkMode } = useTheme();
  const { user } = useUser();
  const [isMember, setIsMember] = useState(
    community.members.some((m) => m.user._id === user?._id)
  );
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/community/${community._id}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setIsMember(true);
      if (onJoinSuccess) onJoinSuccess();
    } catch (error) {
      console.error("Error joining community:", error);
      alert(error.response?.data?.message || "Error joining community");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this community?"))
      return;

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/community/${community._id}/leave`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      setIsMember(false);
      if (onJoinSuccess) onJoinSuccess();
    } catch (error) {
      console.error("Error leaving community:", error);
      alert("Error leaving community");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden transition transform hover:scale-105 ${
        darkMode ? "bg-gray-800 hover:shadow-2xl" : "bg-white hover:shadow-2xl"
      }`}
    >
      {/* Community Thumbnail */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-green-500 to-teal-500">
        <img
          src={community.thumbnail}
          alt={community.name}
          className="w-full h-full object-cover"
        />
        {community.isPremium && (
          <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Lock size={16} />
            Premium
          </div>
        )}
      </div>

      {/* Community Info */}
      <div className="p-6">
        {/* Category Badge */}
        <div className="mb-2">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              darkMode
                ? "bg-green-900/30 text-green-300"
                : "bg-green-100 text-green-800"
            }`}
          >
            {community.category}
          </span>
        </div>

        {/* Name */}
        <h3
          className={`text-lg font-bold mb-2 line-clamp-2 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          {community.name}
        </h3>

        {/* Creator */}
        <div
          className={`flex items-center gap-2 mb-4 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          <img
            src={
              community.creator?.profilePicture ||
              "https://via.placeholder.com/32"
            }
            alt={community.creator?.firstName}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm">
            {community.creator?.firstName} {community.creator?.lastName}
          </span>
        </div>

        {/* Description */}
        <p
          className={`text-sm line-clamp-2 mb-4 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {community.description}
        </p>

        {/* Stats */}
        <div
          className={`flex items-center justify-between mb-4 text-sm pb-4 border-b ${
            darkMode
              ? "border-gray-700 text-gray-400"
              : "border-gray-200 text-gray-600"
          }`}
        >
          <div className="flex items-center gap-1">
            <Users size={16} />
            {community.members?.length || 0} members
          </div>
          {community.isPremium && (
            <span className="text-green-500 font-semibold">
              ${community.premiumPrice}
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={isMember ? handleLeave : handleJoin}
          disabled={loading}
          className={`w-full py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 ${
            isMember
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          {isMember ? (
            <>
              <UserMinus size={18} />
              Leave Community
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Join Community
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default CommunityCard;
