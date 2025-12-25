import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Users,
  Link2,
  Copy,
  DollarSign,
  TrendingUp,
  MousePointer,
  Check,
  Save,
  AlertCircle,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityAffiliates = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const [settings, setSettings] = useState({
    enabled: false,
    commissionRate: 10,
    cookieDuration: 30,
  });

  const [affiliates, setAffiliates] = useState([]);
  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalEarnings: 0,
    totalConversions: 0,
    totalClicks: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const [settingsRes, affiliatesRes] = await Promise.all([
        axios.get(
          `${API_URL}/community-settings/${communityId}/affiliates/settings`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        axios.get(`${API_URL}/community-settings/${communityId}/affiliates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSettings(settingsRes.data.settings);
      setAffiliates(affiliatesRes.data.affiliates);
      setStats(affiliatesRes.data.stats);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      const token = await getToken();
      await axios.put(
        `${API_URL}/community-settings/${communityId}/affiliates/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess("Affiliate settings saved!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const copyReferralUrl = async (affiliate) => {
    const url = `${window.location.origin}/join?ref=${affiliate.referralCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedCode(affiliate.referralCode);
    setTimeout(() => setCopiedCode(null), 2000);
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
          Affiliates
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Let members earn commissions by referring new subscribers
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

      {/* Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              Enable Affiliate Program
            </h3>
            <p className="text-sm text-gray-500">
              Allow members to earn commissions for referrals
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) =>
                setSettings({ ...settings, enabled: e.target.checked })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {settings.enabled && (
          <>
            {/* Commission Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Commission Rate (%)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  value={settings.commissionRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commissionRate: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="50"
                  className="flex-1"
                />
                <div className="w-16 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-center font-medium">
                  {settings.commissionRate}%
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Affiliates earn this percentage of each referred subscription
              </p>
            </div>

            {/* Cookie Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cookie Duration (days)
              </label>
              <input
                type="number"
                value={settings.cookieDuration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    cookieDuration: parseInt(e.target.value) || 30,
                  })
                }
                min="1"
                max="365"
                className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long referral tracking lasts after a click
              </p>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </button>
        </div>
      </div>

      {/* Stats */}
      {settings.enabled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-500">Affiliates</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalAffiliates}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-500">Clicks</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalClicks}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-500">Conversions</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalConversions}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-gray-500">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              ${(stats.totalEarnings / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Affiliates List */}
      {settings.enabled && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Active Affiliates
          </h3>

          {affiliates.length > 0 ? (
            <div className="space-y-4">
              {affiliates.map((affiliate) => (
                <div
                  key={affiliate._id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        affiliate.user?.profilePicture ||
                        `https://ui-avatars.com/api/?name=${affiliate.user?.firstName}`
                      }
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {affiliate.user?.firstName} {affiliate.user?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {affiliate.conversions?.length || 0} conversions •{" "}
                        {affiliate.clicks || 0} clicks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        ${(affiliate.totalEarnings / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">Earned</p>
                    </div>
                    <button
                      onClick={() => copyReferralUrl(affiliate)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      title="Copy referral link"
                    >
                      {copiedCode === affiliate.referralCode ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No affiliates yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Members can join your affiliate program from the community page
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityAffiliates;
