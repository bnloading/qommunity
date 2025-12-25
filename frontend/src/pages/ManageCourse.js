import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser, useAuth } from "@clerk/clerk-react";
import {
  Plus,
  X,
  Trash2,
  Upload,
  Video,
  Image as ImageIcon,
  Save,
} from "lucide-react";

const ManageCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "",
    price: 0,
    level: "",
  });
  const [newLesson, setNewLesson] = useState({
    title: "",
    description: "",
    videoUrl: "",
    duration: "",
    order: 1,
    isFree: false,
  });

  useEffect(() => {
    fetchCourse();
    // eslint-disable-next-line
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/courses/${id}`
      );

      // Check if current user is the course author
      const currentUserEmail = user?.primaryEmailAddress?.emailAddress;
      const courseAuthorEmail = response.data.course.instructor?.email;

      console.log("=== ManageCourse Authorization Check ===");
      console.log("Current user email:", currentUserEmail);
      console.log("Course author email:", courseAuthorEmail);
      console.log("Course instructor object:", response.data.course.instructor);

      // If instructor email is missing, try to get user by instructor ID
      if (!courseAuthorEmail && response.data.course.instructor?.id) {
        console.log("⚠️ Instructor email missing, fetching user by ID...");
        try {
          const token = await getToken();
          const userResponse = await axios.get(
            `${process.env.REACT_APP_API_URL}/users/${response.data.course.instructor.id}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (userResponse.data.user?.email !== currentUserEmail) {
            alert(
              `Сізде бұл курсты басқару құқығы жоқ.\nСіздің email: ${currentUserEmail}`
            );
            navigate("/courses");
            return;
          }
        } catch (error) {
          console.error("Error fetching instructor:", error);
          alert("Instructor ақпаратын алу қатесі. Курсты жаңарту керек.");
          navigate("/courses");
          return;
        }
      } else if (currentUserEmail !== courseAuthorEmail) {
        alert(
          `Сізде бұл курсты басқару құқығы жоқ.\nСіздің email: ${currentUserEmail}\nКурс авторы: ${courseAuthorEmail}`
        );
        navigate("/courses");
        return;
      }

      setCourse(response.data.course);
      setCourseForm({
        title: response.data.course.title,
        description: response.data.course.description,
        category: response.data.course.category,
        price: response.data.course.price,
        level: response.data.course.level || "beginner",
      });
    } catch (error) {
      console.error("Error fetching course:", error);
      alert("Failed to load course");
      navigate("/courses");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/courses/${id}`,
        courseForm
      );

      if (response.data.success) {
        alert("Курс жаңартылды!");
        setEditingCourse(false);
        fetchCourse();
      }
    } catch (error) {
      console.error("Error updating course:", error);
      alert(
        "Курсты жаңарту кезінде қате: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/courses/${id}/lessons`,
        newLesson
      );

      if (response.data.success) {
        alert("Тапсырма сәтті қосылды!");
        setShowAddLesson(false);
        setNewLesson({
          title: "",
          description: "",
          videoUrl: "",
          duration: "",
          order: (course.lessons?.length || 0) + 1,
          isFree: false,
        });
        fetchCourse();
      }
    } catch (error) {
      console.error("Error adding lesson:", error);
      alert(
        "Тапсырма қосу кезінде қате: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("Бұл тапсырманы өшіргіңіз келе ме?")) return;

    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/courses/${id}/lessons/${lessonId}`
      );

      if (response.data.success) {
        alert("Тапсырма өшірілді");
        fetchCourse();
      }
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("Өшіру кезінде қате");
    }
  };

  const handleDeleteCourse = async () => {
    if (
      !window.confirm(
        "Курсты толығымен өшіргіңіз келе ме? Бұл әрекетті қайтару мүмкін емес!"
      )
    )
      return;

    try {
      const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/courses/${id}`
      );

      if (response.data.success) {
        alert("Курс өшірілді");
        navigate("/courses");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Курсты өшіру кезінде қате");
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("thumbnail", file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/courses/${id}/upload-thumbnail`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        alert("Thumbnail жүктелді!");
        fetchCourse();
      }
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      alert("Thumbnail жүктеу кезінде қате");
    }
  };

  const handleVideoUpload = async (e, lessonId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("video", file);

    try {
      alert("Видео жүктелуде... Күтіңіз...");
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/courses/${id}/lessons/${lessonId}/upload-video`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.data.success) {
        alert("Видео сәтті жүктелді!");
        fetchCourse();
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Видео жүктеу кезінде қате");
    }
  };

  if (loading) {
    return (
      <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl">⏳</div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Жүктелуде...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Курс табылмады</p>
      </div>
    );
  }

  return (
    <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {course.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {course.description}
              </p>
              <button
                onClick={() => setEditingCourse(!editingCourse)}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
              >
                <Save className="w-4 h-4" />
                {editingCourse ? "Өзгерістерді сақтау" : "Курсты өзгерту"}
              </button>
            </div>

            {/* Course Thumbnail */}
            {course.thumbnail && (
              <img
                src={
                  course.thumbnail.startsWith("/uploads")
                    ? `http://localhost:5000${course.thumbnail}`
                    : course.thumbnail
                }
                alt={course.title}
                className="w-64 h-40 object-cover rounded-lg ml-8"
              />
            )}
          </div>

          {/* Edit Form */}
          {editingCourse && (
            <form
              onSubmit={handleUpdateCourse}
              className="mb-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Атауы
                </label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Сипаттама
                </label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Категория
                  </label>
                  <select
                    value={courseForm.category}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, category: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="programming">Programming</option>
                    <option value="business">Business</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Бағасы (тг)
                  </label>
                  <input
                    type="number"
                    value={courseForm.price}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Деңгейі
                  </label>
                  <select
                    value={courseForm.level}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, level: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="beginner">Бастауыш</option>
                    <option value="intermediate">Орта</option>
                    <option value="advanced">Жоғары</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Сақтау
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCourse(false)}
                  className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Болдырмау
                </button>
              </div>
            </form>
          )}

          {/* Upload Thumbnail */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Курс суреті (Thumbnail)
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
                <ImageIcon className="w-5 h-5" />
                Сурет жүктеу
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                PNG, JPG немесе GIF (max 10MB)
              </span>
            </div>
          </div>

          {/* Delete Course Button */}
          <button
            onClick={handleDeleteCourse}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
          >
            <Trash2 className="w-5 h-5" />
            Курсты өшіру
          </button>
        </div>

        {/* Lessons Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Тапсырмалар ({course.lessons?.length || 0})
            </h2>
            <button
              onClick={() => setShowAddLesson(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Тапсырма қосу
            </button>
          </div>

          {/* Lessons List */}
          {!course.lessons || course.lessons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                Әлі тапсырмалар қосылмаған. "Тапсырма қосу" батырмасын басыңыз.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {course.lessons.map((lesson, index) => (
                <div
                  key={lesson._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {index + 1}. {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {lesson.description}
                        </p>
                      )}

                      {/* Video preview if exists */}
                      {lesson.videoUrl &&
                        lesson.videoUrl.startsWith("/uploads") && (
                          <video
                            src={`http://localhost:5000${lesson.videoUrl}`}
                            controls
                            className="w-full max-w-md h-48 bg-black rounded-lg mb-4"
                          />
                        )}

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        {lesson.duration && (
                          <span>⏱️ {lesson.duration} мин</span>
                        )}
                        {lesson.videoUrl && (
                          <span className="flex items-center gap-1">
                            <Video className="w-4 h-4" />
                            Видео бар
                          </span>
                        )}
                        {lesson.isFree && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                            Тегін
                          </span>
                        )}
                      </div>

                      {/* Video upload button */}
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg cursor-pointer">
                        <Video className="w-4 h-4" />
                        Видео жүктеу
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleVideoUpload(e, lesson._id)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <button
                      onClick={() => handleDeleteLesson(lesson._id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Lesson Modal */}
        {showAddLesson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Жаңа тапсырма қосу
                </h3>
                <button
                  onClick={() => setShowAddLesson(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddLesson} className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Тапсырма атауы *
                  </label>
                  <input
                    type="text"
                    required
                    value={newLesson.title}
                    onChange={(e) =>
                      setNewLesson({ ...newLesson, title: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Мысалы: 1-сабақ - Кіріспе"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Сипаттама
                  </label>
                  <textarea
                    value={newLesson.description}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        description: e.target.value,
                      })
                    }
                    rows="4"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Тапсырма туралы толық ақпарат..."
                  />
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Видео URL (YouTube, Vimeo т.б.)
                  </label>
                  <input
                    type="url"
                    value={newLesson.videoUrl}
                    onChange={(e) =>
                      setNewLesson({ ...newLesson, videoUrl: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ұзақтығы (минутпен)
                  </label>
                  <input
                    type="number"
                    value={newLesson.duration}
                    onChange={(e) =>
                      setNewLesson({ ...newLesson, duration: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="30"
                  />
                </div>

                {/* Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Реті
                  </label>
                  <input
                    type="number"
                    required
                    value={newLesson.order}
                    onChange={(e) =>
                      setNewLesson({
                        ...newLesson,
                        order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Is Free */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={newLesson.isFree}
                    onChange={(e) =>
                      setNewLesson({ ...newLesson, isFree: e.target.checked })
                    }
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isFree"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Тегін қолжетімді (Preview)
                  </label>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                  >
                    <Save className="w-5 h-5" />
                    Сақтау
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLesson(false)}
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium"
                  >
                    Болдырмау
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageCourse;
