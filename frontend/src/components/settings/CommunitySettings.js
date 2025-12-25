import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import {
  LayoutDashboard,
  Link2,
  Settings,
  Wallet,
  DollarSign,
  Users2,
  LayoutGrid,
  Tag,
  Shield,
  Globe,
  BarChart3,
  CreditCard,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

// Import all settings components
import CommunityDashboard from "./CommunityDashboard";
import CommunityInvites from "./CommunityInvites";
import CommunityGeneral from "./CommunityGeneral";
import CommunityPayouts from "./CommunityPayouts";
import CommunityPricing from "./CommunityPricing";
import CommunityAffiliates from "./CommunityAffiliates";
import CommunityTabs from "./CommunityTabs";
import CommunityCategories from "./CommunityCategories";
import CommunityRules from "./CommunityRules";
import CommunityDiscovery from "./CommunityDiscovery";
import CommunityMetrics from "./CommunityMetrics";
import CommunityBilling from "./CommunityBilling";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "invites", label: "Invites", icon: Link2 },
  { id: "general", label: "General", icon: Settings },
  { id: "payouts", label: "Payouts", icon: Wallet },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "affiliates", label: "Affiliates", icon: Users2 },
  { id: "tabs", label: "Tabs", icon: LayoutGrid },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "rules", label: "Rules", icon: Shield },
  { id: "discovery", label: "Discovery", icon: Globe },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const CommunitySettings = () => {
  const { slug, section = "dashboard" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchCommunity = async () => {
      if (!isLoaded || !isSignedIn) return;

      try {
        const token = await getToken();
        const res = await axios.get(`${API_URL}/communities/slug/${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCommunity(res.data);

        // Check permissions
        const userRes = await axios.get(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userId = userRes.data._id;
        setIsOwner(
          res.data.creator?._id === userId || res.data.creator === userId
        );
        setIsAdmin(
          res.data.admins?.some(
            (admin) => admin._id === userId || admin === userId
          )
        );
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load community");
      } finally {
        setLoading(false);
      }
    };

    fetchCommunity();
  }, [slug, getToken, isLoaded, isSignedIn]);

  const handleSectionChange = (sectionId) => {
    navigate(`/community/${slug}/settings/${sectionId}`);
  };

  const renderContent = () => {
    if (!community) return null;

    const props = {
      communityId: community._id,
      communitySlug: slug,
      community,
      isOwner,
      isAdmin,
    };

    switch (section) {
      case "dashboard":
        return <CommunityDashboard {...props} />;
      case "invites":
        return <CommunityInvites {...props} />;
      case "general":
        return <CommunityGeneral {...props} />;
      case "payouts":
        return <CommunityPayouts {...props} />;
      case "pricing":
        return <CommunityPricing {...props} />;
      case "affiliates":
        return <CommunityAffiliates {...props} />;
      case "tabs":
        return <CommunityTabs {...props} />;
      case "categories":
        return <CommunityCategories {...props} />;
      case "rules":
        return <CommunityRules {...props} />;
      case "discovery":
        return <CommunityDiscovery {...props} />;
      case "metrics":
        return <CommunityMetrics {...props} />;
      case "billing":
        return <CommunityBilling {...props} />;
      default:
        return <CommunityDashboard {...props} />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-500">{error}</p>
          <button
            onClick={() => navigate(`/community/${slug}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!isOwner && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500">
            You don't have permission to access community settings.
          </p>
          <button
            onClick={() => navigate(`/community/${slug}`)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/community/${slug}`)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              {community.image && (
                <img
                  src={community.image}
                  alt={community.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {community.name}
                </h1>
                <p className="text-sm text-gray-500">Settings</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = section === item.id;
                // Some sections are owner-only
                const ownerOnly = ["payouts", "pricing", "billing"].includes(
                  item.id
                );
                if (ownerOnly && !isOwner) return null;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 border-r-2 border-blue-600"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default CommunitySettings;
