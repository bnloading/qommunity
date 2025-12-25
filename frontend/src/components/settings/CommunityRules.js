import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Shield,
  Save,
  AlertCircle,
  Check,
  AlertTriangle,
  FileText,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityRules = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [rules, setRules] = useState("");
  const [rulesRequired, setRulesRequired] = useState(false);
  const [rulesVersion, setRulesVersion] = useState(1);
  const [stats, setStats] = useState({
    acceptedCount: 0,
    pendingCount: 0,
    totalMembers: 0,
  });

  const fetchRules = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/rules`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRules(res.data.rules || "");
      setRulesRequired(res.data.rulesRequired || false);
      setRulesVersion(res.data.rulesVersion || 1);

      // Calculate stats from members
      if (res.data.members) {
        const accepted = res.data.members.filter((m) => m.rulesAccepted).length;
        setStats({
          acceptedCount: accepted,
          pendingCount: res.data.members.length - accepted,
          totalMembers: res.data.members.length,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      await axios.put(
        `${API_URL}/community-settings/${communityId}/rules`,
        { rules, rulesRequired },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Rules updated successfully!");
      setRulesVersion((prev) => prev + 1);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save rules");
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
          Community Rules
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Set guidelines for your community members
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

      {/* Stats Cards */}
      {rulesRequired && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.acceptedCount}
                </p>
                <p className="text-sm text-gray-500">Accepted</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingCount}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  v{rulesVersion}
                </p>
                <p className="text-sm text-gray-500">Version</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        {/* Require Acceptance Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Require Rule Acceptance
              </p>
              <p className="text-sm text-gray-500">
                Members must accept rules before participating
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={rulesRequired}
              onChange={(e) => setRulesRequired(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Rules Editor */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Community Rules
          </label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={12}
            placeholder={`Example rules:

1. Be respectful and kind to all members
2. No spam or self-promotion without permission
3. Keep discussions relevant to the community topic
4. No hate speech, harassment, or bullying
5. Respect member privacy
6. Follow platform terms of service`}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
          />
          <p className="text-sm text-gray-500">
            Supports markdown formatting. Changes will require members to
            re-accept the rules if "Require Rule Acceptance" is enabled.
          </p>
        </div>

        {/* Preview */}
        {rules && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview
            </h4>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-sans">
                {rules}
              </pre>
            </div>
          </div>
        )}

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
            Save Rules
          </button>
        </div>
      </div>

      {/* Warning */}
      {rulesRequired && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Important
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                When you update the rules, all members will need to re-accept
                them before they can post or comment. A new version will be
                created automatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityRules;
