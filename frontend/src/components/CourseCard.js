import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "@clerk/clerk-react";
import { ShoppingCart, Users, Star, Lock } from "lucide-react";

const CourseCard = ({ course }) => {
  const { darkMode } = useTheme();
  const { user } = useUser();
  const navigate = useNavigate();

  const getLowestPrice = () => {
    const prices =
      course.tiers?.filter((t) => t.price > 0).map((t) => t.price) || [];
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  return (
    <div
      className={`rounded-lg shadow-lg overflow-hidden transition transform hover:scale-105 ${
        darkMode ? "bg-gray-800 hover:shadow-2xl" : "bg-white hover:shadow-2xl"
      }`}
    >
      {/* Course Thumbnail */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
        <img
          src={course.thumbnail}
          alt={course.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
          <Star size={16} />
          {course.rating?.average || "New"}
        </div>
      </div>

      {/* Course Info */}
      <div className="p-6">
        {/* Category Badge */}
        <div className="mb-2">
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              darkMode
                ? "bg-blue-900/30 text-blue-300"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {course.category}
          </span>
        </div>

        {/* Title */}
        <Link to={`/course/${course._id}`}>
          <h3
            className={`text-lg font-bold mb-2 line-clamp-2 hover:text-blue-500 transition ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {course.title}
          </h3>
        </Link>

        {/* Instructor */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (course.instructor?.id) {
              navigate(`/instructor/${course.instructor.id}`);
            }
          }}
          className={`flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          <img
            src={
              course.instructor?.profilePicture ||
              "https://via.placeholder.com/32"
            }
            alt={course.instructor?.name || "Instructor"}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-sm">
            {course.instructor?.name || "Unknown Instructor"}
          </span>
        </div>

        {/* Description */}
        <p
          className={`text-sm line-clamp-2 mb-4 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}
        >
          {course.description}
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
            {course.studentCount || 0} students
          </div>
          <span className="capitalize font-semibold text-blue-500">
            {course.level}
          </span>
        </div>

        {/* Pricing and Action */}
        {course.tiers && course.tiers.length > 0 ? (
          <div>
            <div className="mb-4">
              {course.tiers.some((t) => t.price === 0) ? (
                <p
                  className={`text-sm font-semibold ${
                    darkMode ? "text-green-400" : "text-green-600"
                  }`}
                >
                  Free + Premium Options
                </p>
              ) : (
                <p
                  className={`text-lg font-bold ${
                    darkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  ${getLowestPrice()}
                  <span className="text-sm text-gray-500 ml-1">
                    + more tiers
                  </span>
                </p>
              )}
            </div>

            {/* Show payment message for non-teachers */}
            {user?.role !== "teacher" && getLowestPrice() > 0 && (
              <p
                className={`text-xs mb-3 p-2 rounded flex items-center gap-2 ${
                  darkMode
                    ? "bg-yellow-900/30 text-yellow-300"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                <Lock size={14} />
                Payment required to access this course
              </p>
            )}

            <button
              onClick={() => navigate(`/payment?courseId=${course._id}`)}
              className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              {getLowestPrice() === 0 ? "Enroll Free" : "Purchase Course"}
            </button>
          </div>
        ) : (
          <button className="w-full bg-gray-500 text-white py-2 rounded-lg font-semibold cursor-not-allowed">
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
