import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import {
  Lock,
  CheckCircle,
  PlayCircle,
  Clock,
  BookOpen,
  Crown,
  MessageCircle,
} from "lucide-react";

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProgress, setUserProgress] = useState({});
  const [activeChapter, setActiveChapter] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState("free");

  useEffect(() => {
    fetchCourseDetails();
    fetchUserProgress();
    // eslint-disable-next-line
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses/${id}`
      );
      setCourse(response.data.course);
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses/${id}/progress`,
        {
          params: { userEmail },
        }
      );
      setUserProgress(response.data.progress || {});
      setSubscriptionTier(response.data.subscriptionTier || "free");
    } catch (error) {
      console.error("Error fetching progress:", error);
    }
  };

  const isChapterUnlocked = (chapterIndex) => {
    if (chapterIndex === 0) return true;
    const prevChapterId = course?.lessons?.[chapterIndex - 1]?._id;
    return userProgress[prevChapterId]?.completed === true;
  };

  const markChapterComplete = async (chapterId) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/courses/${id}/progress`,
        { chapterId, completed: true }
      );
      setUserProgress({
        ...userProgress,
        [chapterId]: { completed: true, completedAt: new Date() },
      });
    } catch (error) {
      console.error("Error marking chapter complete:", error);
    }
  };

  if (loading) {
    return (
      <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl">⏳</div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">
            Loading course...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Course not found
          </p>
          <button
            onClick={() => navigate("/courses")}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  const completedChapters = Object.values(userProgress).filter(
    (p) => p.completed
  ).length;
  const totalChapters = course.lessons?.length || 0;
  const progressPercentage =
    totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

  return (
    <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {course.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                {course.description}
              </p>

              {/* Instructor Profile Section */}
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-4">
                  {/* Instructor Avatar - Clickable */}
                  <div
                    onClick={() => {
                      if (course.instructor?.id) {
                        navigate(`/instructor/${course.instructor.id}`);
                      }
                    }}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={
                        course.instructor?.profilePicture ||
                        "https://via.placeholder.com/80"
                      }
                      alt={course.instructor?.name || "Instructor"}
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                    />
                  </div>

                  <div
                    onClick={() => {
                      if (course.instructor?.id) {
                        navigate(`/instructor/${course.instructor.id}`);
                      }
                    }}
                    className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Оқытушы / Instructor
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {course.instructor?.name || "Unknown Instructor"}
                    </h3>
                    {course.instructor?.email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {course.instructor.email}
                      </p>
                    )}
                  </div>

                  {/* Message Button */}
                  {course.instructor?.email && (
                    <button
                      onClick={() =>
                        navigate(`/chat?to=${course.instructor.email}`)
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Хат жазу
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 mt-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span>{totalChapters} Chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{course.level}</span>
                </div>
              </div>
            </div>

            {course.thumbnail && (
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-64 h-40 object-cover rounded-lg ml-8"
              />
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Your Progress
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {completedChapters} / {totalChapters} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Subscription Status */}
          <div className="mt-6 flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Crown
              className={`w-6 h-6 ${
                subscriptionTier === "premium"
                  ? "text-yellow-500"
                  : "text-gray-400"
              }`}
            />
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                Subscription:{" "}
                {subscriptionTier.charAt(0).toUpperCase() +
                  subscriptionTier.slice(1)}
              </p>
              {subscriptionTier === "free" && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upgrade to Premium for full access
                </p>
              )}
            </div>
            {subscriptionTier === "free" && (
              <button
                onClick={() => navigate("/pricing")}
                className="ml-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium"
              >
                Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Chapters List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Course Content
          </h2>

          {!course.lessons || course.lessons.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No chapters added yet. Check back later!
            </p>
          ) : (
            <div className="space-y-4">
              {course.lessons.map((lesson, index) => {
                const isUnlocked = isChapterUnlocked(index);
                const isCompleted = userProgress[lesson._id]?.completed;
                const isActive = activeChapter === lesson._id;

                return (
                  <div
                    key={lesson._id}
                    className={`border rounded-lg p-6 transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700"
                    } ${
                      !isUnlocked
                        ? "opacity-60"
                        : "hover:shadow-md cursor-pointer"
                    }`}
                    onClick={() =>
                      isUnlocked &&
                      setActiveChapter(isActive ? null : lesson._id)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? "bg-green-100 dark:bg-green-900"
                              : isUnlocked
                              ? "bg-blue-100 dark:bg-blue-900"
                              : "bg-gray-100 dark:bg-gray-700"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                          ) : isUnlocked ? (
                            <PlayCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <Lock className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Chapter {index + 1}: {lesson.title}
                          </h3>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {lesson.description}
                            </p>
                          )}
                          {lesson.duration && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{lesson.duration} min</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {!isUnlocked && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Complete previous chapter to unlock
                        </span>
                      )}
                    </div>

                    {/* Chapter Content */}
                    {isActive && isUnlocked && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        {/* Video Player */}
                        {lesson.videoUrl && (
                          <div className="mb-6">
                            {lesson.videoUrl.startsWith("/uploads") ? (
                              <video
                                key={lesson.videoUrl}
                                controls
                                className="w-full rounded-lg bg-black"
                                src={`http://localhost:5000${lesson.videoUrl}`}
                                controlsList="nodownload"
                              >
                                Сіздің браузеріңіз видеоны қолдамайды.
                              </video>
                            ) : lesson.videoUrl.includes("youtube.com") ||
                              lesson.videoUrl.includes("youtu.be") ? (
                              <iframe
                                className="w-full aspect-video rounded-lg"
                                src={lesson.videoUrl.replace(
                                  "watch?v=",
                                  "embed/"
                                )}
                                title={lesson.title}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center">
                                <PlayCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                <p className="text-gray-600 dark:text-gray-400">
                                  Видео URL: {lesson.videoUrl}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="prose dark:prose-invert max-w-none">
                          <p className="text-gray-700 dark:text-gray-300">
                            {lesson.description ||
                              "Chapter content goes here..."}
                          </p>
                        </div>

                        {!isCompleted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markChapterComplete(lesson._id);
                            }}
                            className="mt-6 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                          >
                            Mark as Complete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
