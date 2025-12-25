import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Settings,
  Upload,
  Globe,
  Lock,
  Image as ImageIcon,
  Save,
  AlertCircle,
  Check,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CATEGORIES = [
  "hobbies",
  "music",
  "money",
  "spirituality",
  "tech",
  "health",
  "sports",
  "self-improvement",
  "relationships",
  "Business",
  "Technology",
  "Health & Fitness",
  "Creative Arts",
  "other",
];

const CommunityGeneral = ({ communityId, communitySlug, onUpdate }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const [settings, setSettings] = useState({
    name: "",
    description: "",
    category: "other",
    isPrivate: false,
    thumbnail: "",
    coverImage: "",
    customUrl: "",
    slug: "",
  });

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/settings`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings(res.data.settings);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      const res = await axios.put(
        `${API_URL}/community-settings/${communityId}/settings`,
        {
          name: settings.name,
          description: settings.description,
          category: settings.category,
          isPrivate: settings.isPrivate,
          customUrl: settings.customUrl,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Settings saved successfully!");
      if (onUpdate) onUpdate(res.data.community);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, and WebP images are allowed");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const formData = new FormData();
      formData.append("image", file);
      formData.append("type", type);

      // Use local upload endpoint
      const uploadRes = await axios.post(
        `${API_URL}/local-upload/community/${communityId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setSettings({
        ...settings,
        [type]: uploadRes.data.url,
      });
      setSuccess("Image uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          General Settings
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Configure your community's basic information
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 text-green-600 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        {/* Community Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Community Image
          </label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden">
              {settings.thumbnail ? (
                <img
                  src={settings.thumbnail}
                  alt="Community"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleImageUpload(e, "thumbnail")}
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              <p className="text-xs text-gray-500 mt-2">
                JPEG, PNG, GIF or WebP. Max 5MB.
              </p>
            </div>
          </div>
        </div>

        {/* Community Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Community Name
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter community name"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={settings.description}
            onChange={(e) =>
              setSettings({ ...settings, description: e.target.value })
            }
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Describe your community..."
          />
          <p className="text-xs text-gray-500 mt-1">
            {settings.description?.length || 0}/1000 characters
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category
          </label>
          <select
            value={settings.category}
            onChange={(e) =>
              setSettings({ ...settings, category: e.target.value })
            }
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Custom URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custom URL
          </label>
          <div className="flex items-center">
            <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg text-gray-500 text-sm">
              {window.location.origin}/community/
            </span>
            <input
              type="text"
              value={settings.customUrl || settings.slug}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  customUrl: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                })
              }
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="my-community"
            />
          </div>
        </div>

        {/* Privacy */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Privacy
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setSettings({ ...settings, isPrivate: false })}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                !settings.isPrivate
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <Globe className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Public</p>
                <p className="text-xs text-gray-500">
                  Anyone can find and join
                </p>
              </div>
            </button>
            <button
              onClick={() => setSettings({ ...settings, isPrivate: true })}
              className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                settings.isPrivate
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <Lock className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium">Private</p>
                <p className="text-xs text-gray-500">Invite only</p>
              </div>
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunityGeneral;
