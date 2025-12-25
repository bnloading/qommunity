import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import { MessageCircle, BookOpen, Users, Award, Mail } from "lucide-react";

const InstructorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [instructor, setInstructor] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    const fetchInstructorData = async () => {
      try {
        // Fetch instructor info
        const instructorRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/users/${id}`
        );
        setInstructor(instructorRes.data.user);

        // Fetch instructor's courses
        const coursesRes = await axios.get(
          `${process.env.REACT_APP_API_URL}/courses?instructorId=${id}`
        );
        setCourses(coursesRes.data.courses || []);
      } catch (error) {
        console.error("Error fetching instructor data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructorData();
  }, [id]);

  const handleChatClick = () => {
    if (instructor?.email) {
      navigate(`/chat?to=${instructor.email}`);
    }
  };

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/users/${id}/follow`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsFollowing(response.data.isFollowing);
    } catch (error) {
      console.error("Error following user:", error);
      alert("Failed to follow user. Please try again.");
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Жүктелуде...</p>
        </div>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Оқытушы табылмады
          </h2>
          <button
            onClick={() => navigate("/courses")}
            className="text-blue-600 hover:text-blue-700"
          >
            Курстарға оралу
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile =
    user?.primaryEmailAddress?.emailAddress === instructor?.email;

  // Debug
  console.log("🔍 InstructorProfile Debug:", {
    myEmail: user?.primaryEmailAddress?.emailAddress,
    instructorEmail: instructor?.email,
    instructorId: id,
    isOwnProfile,
  });

  // TEMPORARY: Show chat button even for own profile (for testing)
  const showChatButton = true; // Change to !isOwnProfile in production

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={
                  instructor.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    instructor.firstName + " " + instructor.lastName
                  )}&size=200&background=random`
                }
                alt={`${instructor.firstName} ${instructor.lastName}`}
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
              />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {instructor.firstName} {instructor.lastName}
              </h1>
              <div className="flex items-center justify-center md:justify-start gap-2 text-gray-600 dark:text-gray-400 mb-4">
                <Mail className="w-4 h-4" />
                <span>{instructor.email}</span>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 justify-center md:justify-start mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>{courses.length}</strong> курс
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>
                      {courses.reduce(
                        (sum, c) => sum + (c.enrolledCount || 0),
                        0
                      )}
                    </strong>{" "}
                    студент
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Оқытушы
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center md:justify-start">
                {!isOwnProfile && (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`px-6 py-2 rounded-lg font-medium transition ${
                      isFollowing
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-50`}
                  >
                    {followLoading
                      ? "..."
                      : isFollowing
                      ? "Following"
                      : "Follow"}
                  </button>
                )}
                {showChatButton && instructor?.email && (
                  <button
                    onClick={handleChatClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Хат жазу
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructor's Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Курстары
          </h2>

          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Әлі курстар жоқ
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course._id}
                  onClick={() => navigate(`/courses/${course._id}`)}
                  className="bg-gray-50 dark:bg-gray-700 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <img
                    src={
                      course.thumbnail
                        ? `${process.env.REACT_APP_API_URL}${course.thumbnail}`
                        : `https://via.placeholder.com/400x200?text=${encodeURIComponent(
                            course.title
                          )}`
                    }
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {course.enrolledCount || 0} студент
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {course.price === 0 ? "Тегін" : `${course.price} ₸`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorProfile;
