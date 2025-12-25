import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import axios from "axios";
import {
  Users,
  Check,
  AlertCircle,
  Lock,
  Crown,
  ArrowRight,
  Clock,
  Loader2,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const InvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [invite, setInvite] = useState(null);
  const [community, setCommunity] = useState(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    const validateInvite = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/community-settings/invites/${token}/validate`
        );
        setInvite(res.data.invite);
        setCommunity(res.data.community);

        // Check if user is already a member
        if (isSignedIn) {
          const authToken = await getToken();
          try {
            const memberRes = await axios.get(
              `${API_URL}/communities/${res.data.community._id}/membership`,
              { headers: { Authorization: `Bearer ${authToken}` } }
            );
            setAlreadyMember(memberRes.data.isMember);
          } catch (e) {
            // Not a member
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "This invite link is invalid or expired"
        );
      } finally {
        setLoading(false);
      }
    };

    validateInvite();
  }, [token, isSignedIn, getToken]);

  const handleJoin = async () => {
    if (!isSignedIn) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/invite/${token}`);
      return;
    }

    try {
      setJoining(true);
      const authToken = await getToken();
      const res = await axios.post(
        `${API_URL}/community-settings/invites/${token}/use`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      // Redirect to community
      navigate(`/community/${res.data.community.slug}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to join community");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invite
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You're Already a Member!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You're already part of {community?.name}
          </p>
          <button
            onClick={() => navigate(`/community/${community?.slug}`)}
            className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Community
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Community Header */}
        {community?.image ? (
          <div
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${community.image})` }}
          />
        ) : (
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600" />
        )}

        <div className="p-8">
          {/* Community Info */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {community?.name}
            </h1>
            {community?.description && (
              <p className="text-gray-500 dark:text-gray-400 line-clamp-2">
                {community.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-gray-900 dark:text-white">
                <Users className="w-4 h-4" />
                <span className="font-semibold">
                  {community?.memberCount || 0}
                </span>
              </div>
              <p className="text-xs text-gray-500">Members</p>
            </div>
            {community?.isPrivate && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-gray-900 dark:text-white">
                  <Lock className="w-4 h-4" />
                  <span className="font-semibold">Private</span>
                </div>
                <p className="text-xs text-gray-500">Community</p>
              </div>
            )}
          </div>

          {/* Invite Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              You've been invited to join this community
              {invite?.role === "admin" && (
                <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                  <Crown className="w-3 h-3" />
                  As Admin
                </span>
              )}
            </p>

            {invite?.expiresAt && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Expires{" "}
                {new Date(invite.expiresAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}

            {invite?.skipPayment && community?.monthlyPrice > 0 && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                Free access included (no payment required)
              </div>
            )}
          </div>

          {/* Pricing Info */}
          {community?.monthlyPrice > 0 && !invite?.skipPayment && (
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <p className="text-sm text-gray-500 mb-2">
                Subscription Required
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${community.monthlyPrice}
                </span>
                <span className="text-gray-500">/month</span>
              </div>
              {community.yearlyPrice && (
                <p className="text-sm text-gray-500 mt-1">
                  or ${community.yearlyPrice}/year (save{" "}
                  {Math.round(
                    (1 -
                      community.yearlyPrice / (community.monthlyPrice * 12)) *
                      100
                  )}
                  %)
                </p>
              )}
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={joining}
            className="flex items-center justify-center gap-2 w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold text-lg transition-colors"
          >
            {joining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : isSignedIn ? (
              <>
                Join Community
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Sign in to Join
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Sign up prompt for non-signed in users */}
          {!isSignedIn && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Don't have an account?{" "}
              <button
                onClick={() => navigate(`/signup?redirect=/invite/${token}`)}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitePage;
