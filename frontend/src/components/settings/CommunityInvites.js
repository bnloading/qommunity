import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  Link2,
  Copy,
  Trash2,
  Plus,
  Check,
  Clock,
  Users,
  Shield,
  AlertCircle,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const CommunityInvites = ({ communityId, communitySlug }) => {
  const { getToken } = useAuth();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Create invite form
  const [newInvite, setNewInvite] = useState({
    name: "",
    role: "member",
    expiresIn: "never",
    maxUses: "",
    skipPayment: false,
  });

  const fetchInvites = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(
        `${API_URL}/community-settings/${communityId}/invites`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvites(res.data.invites);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [communityId, getToken]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const createInvite = async (e) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const res = await axios.post(
        `${API_URL}/community-settings/${communityId}/invites`,
        {
          ...newInvite,
          maxUses: newInvite.maxUses ? parseInt(newInvite.maxUses) : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvites([res.data.invite, ...invites]);
      setShowCreateModal(false);
      setNewInvite({
        name: "",
        role: "member",
        expiresIn: "never",
        maxUses: "",
        skipPayment: false,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create invite");
    }
  };

  const revokeInvite = async (inviteId) => {
    if (!window.confirm("Are you sure you want to revoke this invite?")) return;

    try {
      const token = await getToken();
      await axios.delete(
        `${API_URL}/community-settings/${communityId}/invites/${inviteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInvites(invites.filter((i) => i._id !== inviteId));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke invite");
    }
  };

  const copyToClipboard = async (invite) => {
    const url = `${window.location.origin}/invite/${invite.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite._id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getExpirationText = (expiresAt) => {
    if (!expiresAt) return "Never expires";
    const date = new Date(expiresAt);
    if (date < new Date()) return "Expired";
    return `Expires ${date.toLocaleDateString()}`;
  };

  const isExpired = (invite) => {
    if (!invite.isActive) return true;
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date())
      return true;
    if (invite.maxUses && invite.usedCount >= invite.maxUses) return true;
    return false;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invite Links
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Generate and manage invite links for your community
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Invite
        </button>
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

      {/* Invites List */}
      <div className="space-y-4">
        {invites.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No invite links yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create an invite link to share with others
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Invite Link
            </button>
          </div>
        ) : (
          invites.map((invite) => (
            <div
              key={invite._id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border ${
                isExpired(invite)
                  ? "border-gray-300 dark:border-gray-600 opacity-60"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {invite.name || "Untitled Invite"}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        invite.role === "admin"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      }`}
                    >
                      {invite.role === "admin" ? (
                        <>
                          <Shield className="w-3 h-3 inline mr-1" />
                          Admin
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3 inline mr-1" />
                          Member
                        </>
                      )}
                    </span>
                    {isExpired(invite) && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {!invite.isActive ? "Revoked" : "Expired"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getExpirationText(invite.expiresAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {invite.usedCount} used
                      {invite.maxUses && ` / ${invite.maxUses} max`}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-300 truncate">
                      {`${window.location.origin}/invite/${invite.token}`}
                    </code>
                    <button
                      onClick={() => copyToClipboard(invite)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      {copiedId === invite._id ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-500" />
                      )}
                    </button>
                    {!isExpired(invite) && (
                      <button
                        onClick={() => revokeInvite(invite._id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition-colors text-red-500"
                        title="Revoke invite"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Invite Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Invite Link
            </h3>
            <form onSubmit={createInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={newInvite.name}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, name: e.target.value })
                  }
                  placeholder="e.g., Launch Promotion"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={newInvite.role}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expires After
                </label>
                <select
                  value={newInvite.expiresIn}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, expiresIn: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="1h">1 hour</option>
                  <option value="24h">24 hours</option>
                  <option value="7d">7 days</option>
                  <option value="30d">30 days</option>
                  <option value="never">Never</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Uses (optional)
                </label>
                <input
                  type="number"
                  value={newInvite.maxUses}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, maxUses: e.target.value })
                  }
                  placeholder="Unlimited"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipPayment"
                  checked={newInvite.skipPayment}
                  onChange={(e) =>
                    setNewInvite({
                      ...newInvite,
                      skipPayment: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label
                  htmlFor="skipPayment"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Skip payment (for paid communities)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Create Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityInvites;
