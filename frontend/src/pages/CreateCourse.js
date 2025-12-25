import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useUser } from "@clerk/clerk-react";
import { ArrowLeft, Save, Image as ImageIcon } from "lucide-react";

const CreateCourse = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [courseForm, setCourseForm] = useState({
    title: "",
    description: "",
    category: "programming",
    price: 0,
    level: "beginner",
  });
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userEmail = user?.primaryEmailAddress?.emailAddress;
      const userName = user?.fullName || `${user?.firstName} ${user?.lastName}`;
      const userImage = user?.imageUrl;

      // Create course
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/courses`,
        {
          ...courseForm,
          userEmail,
          userName,
          userImage,
        }
      );

      if (response.data.success) {
        const courseId = response.data.course._id;

        // Upload thumbnail if provided
        if (thumbnail) {
          const formData = new FormData();
          formData.append("thumbnail", thumbnail);

          await axios.post(
            `${process.env.REACT_APP_API_URL}/courses/${courseId}/upload-thumbnail`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          );
        }

        alert("Курс сәтті жасалды!");
        navigate(`/manage-course/${courseId}`);
      }
    } catch (error) {
      console.error("Error creating course:", error);
      alert(
        "Курс жасау кезінде қате: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ml-64 pt-0 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            Артқа
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Жаңа курс жасау
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Өз курсыңызды жасап, студенттермен бөлісіңіз
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 space-y-6"
        >
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Курс атауы *
            </label>
            <input
              type="text"
              value={courseForm.title}
              onChange={(e) =>
                setCourseForm({ ...courseForm, title: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Мысалы: React-тан React Native-ке дейін"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сипаттама *
            </label>
            <textarea
              value={courseForm.description}
              onChange={(e) =>
                setCourseForm({ ...courseForm, description: e.target.value })
              }
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Курс туралы толық ақпарат..."
              required
            />
          </div>

          {/* Category and Level */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Категория *
              </label>
              <select
                value={courseForm.category}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, category: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
                Деңгейі *
              </label>
              <select
                value={courseForm.level}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, level: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="beginner">Бастауыш</option>
                <option value="intermediate">Орта</option>
                <option value="advanced">Жоғары</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Бағасы (тенге) *
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
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="0 = Тегін курс"
              min="0"
              required
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              0 жазсаңыз, курс тегін болады
            </p>
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Курс суреті (Thumbnail)
            </label>
            <div className="flex items-start gap-4">
              <label className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition">
                <ImageIcon size={20} />
                {thumbnail ? "Суретті өзгерту" : "Сурет таңдау"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
              </label>
              {thumbnailPreview && (
                <img
                  src={thumbnailPreview}
                  alt="Preview"
                  className="w-40 h-24 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              PNG, JPG немесе GIF (max 10MB)
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {loading ? "Жасалуда..." : "Курс жасау"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
            >
              Болдырмау
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;
