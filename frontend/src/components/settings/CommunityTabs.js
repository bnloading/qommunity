import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  GripVertical,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  Check,
  MessageSquare,
  BookOpen,
  Calendar,
  Users,
  Trophy,
  Info,
  MessageCircle,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const TAB_ICONS = {
  community: MessageSquare,
  classroom: BookOpen,
  calendar: Calendar,
  members: Users,
  leaderboard: Trophy,
  about: Info,
  chat: MessageCircle,
};

const CommunityTabs = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tabs, setTabs] = useState({});
  const [draggedTab, setDraggedTab] = useState(null);

  const fetchTabs = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/tabs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTabs(res.data.tabs);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load tabs");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      await axios.put(
        `${API_URL}/community-settings/${communityId}/tabs`,
        { tabs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Tabs updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save tabs");
    } finally {
      setSaving(false);
    }
  };

  const toggleTab = (tabName) => {
    setTabs({
      ...tabs,
      [tabName]: {
        ...tabs[tabName],
        enabled: !tabs[tabName].enabled,
      },
    });
  };

  const updateTabLabel = (tabName, label) => {
    setTabs({
      ...tabs,
      [tabName]: {
        ...tabs[tabName],
        label,
      },
    });
  };

  // Get sorted tabs by order
  const sortedTabs = Object.entries(tabs).sort(
    ([, a], [, b]) => (a.order || 0) - (b.order || 0)
  );

  const handleDragStart = (tabName) => {
    setDraggedTab(tabName);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetTabName) => {
    if (!draggedTab || draggedTab === targetTabName) return;

    const tabEntries = Object.entries(tabs);
    const draggedIndex = tabEntries.findIndex(([name]) => name === draggedTab);
    const targetIndex = tabEntries.findIndex(
      ([name]) => name === targetTabName
    );

    // Reorder
    const newTabs = { ...tabs };
    const orders = sortedTabs.map(([, t]) => t.order);

    newTabs[draggedTab].order = orders[targetIndex];
    newTabs[targetTabName].order = orders[draggedIndex];

    setTabs(newTabs);
    setDraggedTab(null);
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
          Tabs
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Configure which tabs are visible and their order
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="space-y-2">
          {sortedTabs.map(([tabName, tabConfig]) => {
            const IconComponent = TAB_ICONS[tabName] || MessageSquare;
            return (
              <div
                key={tabName}
                draggable
                onDragStart={() => handleDragStart(tabName)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(tabName)}
                className={`flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-move transition-all ${
                  draggedTab === tabName ? "opacity-50 scale-95" : "opacity-100"
                } ${!tabConfig.enabled ? "opacity-60" : ""}`}
              >
                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />

                <div
                  className={`p-2 rounded-lg ${
                    tabConfig.enabled
                      ? "bg-blue-100 dark:bg-blue-900/20"
                      : "bg-gray-200 dark:bg-gray-600"
                  }`}
                >
                  <IconComponent
                    className={`w-5 h-5 ${
                      tabConfig.enabled ? "text-blue-600" : "text-gray-500"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <input
                    type="text"
                    value={tabConfig.label}
                    onChange={(e) => updateTabLabel(tabName, e.target.value)}
                    className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 capitalize">
                    {tabName}
                  </p>
                </div>

                <button
                  onClick={() => toggleTab(tabName)}
                  className={`p-2 rounded-lg transition-colors ${
                    tabConfig.enabled
                      ? "bg-green-100 dark:bg-green-900/20 text-green-600"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-500"
                  }`}
                  title={tabConfig.enabled ? "Disable tab" : "Enable tab"}
                >
                  {tabConfig.enabled ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Drag tabs to reorder. Disabled tabs won't be visible to members.
        </p>

        {/* Save Button */}
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
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

export default CommunityTabs;
