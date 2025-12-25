import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Globe,
  Search,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  Check,
  Tag,
  Star,
  X,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityDiscovery = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [discovery, setDiscovery] = useState({
    enabled: false,
    searchEngineIndexing: false,
    featuredOrder: null,
    keywords: [],
  });
  const [newKeyword, setNewKeyword] = useState("");

  const fetchDiscovery = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/discovery`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiscovery({
        enabled: res.data.discovery?.enabled ?? false,
        searchEngineIndexing: res.data.discovery?.searchEngineIndexing ?? false,
        featuredOrder: res.data.discovery?.featuredOrder ?? null,
        keywords: res.data.discovery?.keywords || [],
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load discovery settings"
      );
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchDiscovery();
  }, [fetchDiscovery]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      await axios.put(
        `${API_URL}/community-settings/${communityId}/discovery`,
        { discovery },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Discovery settings updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to save discovery settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (keyword && !discovery.keywords.includes(keyword)) {
      setDiscovery({
        ...discovery,
        keywords: [...discovery.keywords, keyword],
      });
      setNewKeyword("");
    }
  };

  const removeKeyword = (keyword) => {
    setDiscovery({
      ...discovery,
      keywords: discovery.keywords.filter((k) => k !== keyword),
    });
  };

  const handleKeywordKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
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
          Discovery
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Control how your community appears in search and discovery
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
        {/* Discovery Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Enable Discovery
              </p>
              <p className="text-sm text-gray-500">
                Show community in public directory and search
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={discovery.enabled}
              onChange={(e) =>
                setDiscovery({ ...discovery, enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {discovery.enabled && (
          <>
            {/* Search Engine Indexing */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Search className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Search Engine Indexing
                  </p>
                  <p className="text-sm text-gray-500">
                    Allow Google and other search engines to index your
                    community
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={discovery.searchEngineIndexing}
                  onChange={(e) =>
                    setDiscovery({
                      ...discovery,
                      searchEngineIndexing: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Featured Status */}
            {discovery.featuredOrder !== null && (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Featured Community
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your community is featured at position #
                    {discovery.featuredOrder}
                  </p>
                </div>
              </div>
            )}

            {/* Keywords */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Discovery Keywords
                </div>
              </label>
              <p className="text-sm text-gray-500">
                Add keywords to help people find your community
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={handleKeywordKeyPress}
                  placeholder="Add a keyword..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addKeyword}
                  disabled={!newKeyword.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>

              {discovery.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {discovery.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                    >
                      {keyword}
                      <button
                        onClick={() => removeKeyword(keyword)}
                        className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!discovery.enabled && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <EyeOff className="w-5 h-5 text-gray-500" />
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300">
                Community is Hidden
              </p>
              <p className="text-sm text-gray-500">
                Only people with a direct link can find your community
              </p>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
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

      {/* SEO Tips */}
      {discovery.enabled && discovery.searchEngineIndexing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            SEO Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              Use a descriptive community name that includes your main topic
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              Write a detailed description with relevant keywords
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              Add 5-10 relevant keywords for better discoverability
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              Create quality content regularly to improve rankings
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CommunityDiscovery;
