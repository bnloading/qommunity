import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  Users,
  User,
  Gift,
  DollarSign,
  Settings,
  Bell,
  MessageCircle,
  CreditCard,
  Receipt,
  Palette,
  Loader2,
  ExternalLink,
  Crown,
  AlertCircle,
  Copy,
} from "lucide-react";
import "./UserSettings.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const MENU_ITEMS = [
  { id: "communities", label: "Communities", icon: Users },
  { id: "profile", label: "Profile", icon: User },
  { id: "subscription", label: "Subscription", icon: Crown },
  { id: "affiliates", label: "Affiliates", icon: Gift },
  { id: "payouts", label: "Payouts", icon: DollarSign },
  { id: "account", label: "Account", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "payment-methods", label: "Payment methods", icon: CreditCard },
  { id: "payment-history", label: "Payment history", icon: Receipt },
  { id: "theme", label: "Theme", icon: Palette },
];

function UserSettings() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [activeMenu, setActiveMenu] = useState(section || "communities");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    profilePicture: "",
  });

  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [communities, setCommunities] = useState([]);

  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    allowDirectMessages: true,
    showOnlineStatus: true,
    theme: "light",
  });

  useEffect(() => {
    if (section) {
      setActiveMenu(section);
    }
  }, [section]);

  useEffect(() => {
    if (activeMenu === "subscription") {
      fetchSubscriptionDetails();
    } else if (activeMenu === "payment-history") {
      fetchPaymentHistory();
    } else if (activeMenu === "profile") {
      loadProfile();
    } else if (activeMenu === "communities") {
      fetchCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMenu]);

  const loadProfile = () => {
    if (clerkUser) {
      setProfile({
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        bio: "",
        profilePicture: clerkUser.imageUrl || "",
      });
    }
  };

  const fetchSubscriptionDetails = async () => {
    try {
      setSubscriptionLoading(true);
      const token = await getToken();
      const response = await axios.get(`${API_URL}/subscriptions/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscription(response.data);
    } catch (error) {
      console.error("Error fetching subscription:", error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      setHistoryLoading(true);
      const token = await getToken();
      const response = await axios.get(`${API_URL}/course-purchases/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPaymentHistory(response.data.payments || []);
    } catch (error) {
      console.error("Error fetching payment history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.get(`${API_URL}/communities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommunities(response.data.communities || []);
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const response = await axios.post(
        `${API_URL}/subscriptions/portal`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = response.data.url;
    } catch (error) {
      console.error("Error opening billing portal:", error);
      alert("Failed to open billing portal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) {
      return;
    }
    try {
      setLoading(true);
      const token = await getToken();
      await axios.post(
        `${API_URL}/subscriptions/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSubscriptionDetails();
      alert("Subscription will be cancelled at the end of the billing period.");
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      alert("Failed to cancel subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      await axios.post(
        `${API_URL}/subscriptions/resume`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchSubscriptionDetails();
      alert("Subscription resumed successfully!");
    } catch (error) {
      console.error("Error resuming subscription:", error);
      alert("Failed to resume subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      await axios.put(
        `${API_URL}/users/me/profile`,
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          bio: profile.bio,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Profile saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { color: "green", label: "Active" },
      trialing: { color: "blue", label: "Trial" },
      canceled: { color: "red", label: "Cancelled" },
      past_due: { color: "orange", label: "Past Due" },
      completed: { color: "green", label: "Completed" },
      pending: { color: "yellow", label: "Pending" },
      failed: { color: "red", label: "Failed" },
    };
    const badge = badges[status] || { color: "gray", label: status };
    return (
      <span className={`status-badge status-${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    navigate(`/user-settings/${menuId}`);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="user-settings-page">
      <div className="settings-layout">
        <div className="settings-sidebar-left">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`settings-menu-item ${
                  activeMenu === item.id ? "active" : ""
                }`}
                onClick={() => handleMenuClick(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="settings-main-content">
          {activeMenu === "communities" && (
            <div className="settings-content">
              <h1 className="settings-title">Communities</h1>
              <p className="settings-subtitle">
                Manage your communities and memberships.
              </p>
              {loading ? (
                <div className="loading-spinner">
                  <Loader2 className="spin" />
                </div>
              ) : communities.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} />
                  <p>No communities yet</p>
                  <button
                    className="btn-primary"
                    onClick={() => navigate("/communities")}
                  >
                    Explore Communities
                  </button>
                </div>
              ) : (
                <div className="communities-list">
                  {communities.slice(0, 10).map((community) => (
                    <div
                      key={community._id}
                      className="community-item"
                      onClick={() => navigate(`/community/${community.slug}`)}
                    >
                      <img
                        src={
                          community.thumbnail || "/placeholder-community.png"
                        }
                        alt={community.name}
                        className="community-avatar"
                      />
                      <div className="community-info">
                        <h3>{community.name}</h3>
                        <p>{community.members?.length || 0} members</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMenu === "profile" && (
            <div className="settings-content">
              <h1 className="settings-title">Profile</h1>
              <p className="settings-subtitle">
                Update your personal information.
              </p>

              <div className="profile-avatar-section">
                <img
                  src={
                    profile.profilePicture ||
                    clerkUser?.imageUrl ||
                    "/default-avatar.png"
                  }
                  alt="Profile"
                  className="profile-avatar-large"
                />
                <p className="avatar-hint">Managed through Clerk</p>
              </div>

              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) =>
                    setProfile({ ...profile, firstName: e.target.value })
                  }
                  placeholder="Enter first name"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) =>
                    setProfile({ ...profile, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  rows={4}
                  value={profile.bio}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself"
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 className="spin" size={16} /> : null}
                Save Changes
              </button>
            </div>
          )}

          {activeMenu === "subscription" && (
            <div className="settings-content">
              <h1 className="settings-title">Subscription</h1>
              <p className="settings-subtitle">
                Manage your subscription and billing.
              </p>

              {subscriptionLoading ? (
                <div className="loading-spinner">
                  <Loader2 className="spin" />
                </div>
              ) : (
                <div className="subscription-section">
                  {subscription?.subscription ? (
                    <div className="subscription-card">
                      <div className="subscription-header">
                        <Crown size={24} className="crown-icon" />
                        <div>
                          <h3>
                            {subscription.subscription.planName || "Pro Plan"}
                          </h3>
                          {getStatusBadge(subscription.subscription.status)}
                        </div>
                      </div>

                      <div className="subscription-details">
                        <div className="detail-row">
                          <span>Plan</span>
                          <strong>
                            {subscription.user?.subscriptionTier || "Premium"}
                          </strong>
                        </div>
                        <div className="detail-row">
                          <span>Amount</span>
                          <strong>
                            {formatCurrency(
                              subscription.subscription.amount / 100,
                              subscription.subscription.currency
                            )}
                            /{subscription.subscription.interval}
                          </strong>
                        </div>
                        <div className="detail-row">
                          <span>Current Period</span>
                          <strong>
                            {formatDate(
                              subscription.subscription.currentPeriodStart
                            )}{" "}
                            -{" "}
                            {formatDate(
                              subscription.subscription.currentPeriodEnd
                            )}
                          </strong>
                        </div>
                        {subscription.subscription.cancelAtPeriodEnd && (
                          <div className="cancel-warning">
                            <AlertCircle size={16} />
                            <span>
                              Cancels on{" "}
                              {formatDate(
                                subscription.subscription.currentPeriodEnd
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="subscription-actions">
                        <button
                          className="btn-outline"
                          onClick={handleManageSubscription}
                          disabled={loading}
                        >
                          <ExternalLink size={16} />
                          Manage Billing
                        </button>
                        {subscription.subscription.cancelAtPeriodEnd ? (
                          <button
                            className="btn-primary"
                            onClick={handleResumeSubscription}
                            disabled={loading}
                          >
                            Resume Subscription
                          </button>
                        ) : (
                          <button
                            className="btn-danger"
                            onClick={handleCancelSubscription}
                            disabled={loading}
                          >
                            Cancel Subscription
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="no-subscription">
                      <Crown size={48} className="crown-icon-large" />
                      <h3>No Active Subscription</h3>
                      <p>
                        Upgrade to unlock premium features and create
                        communities.
                      </p>
                      <button
                        className="btn-primary"
                        onClick={() => navigate("/select-plan")}
                      >
                        View Plans
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeMenu === "affiliates" && (
            <div className="settings-content">
              <h1 className="settings-title">Affiliates</h1>
              <p className="settings-subtitle">
                Earn commissions by referring people to communities.
              </p>
              <div className="affiliate-section">
                <div className="affiliate-card">
                  <h3>Your Referral Link</h3>
                  <div className="referral-link-box">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}?ref=${
                        clerkUser?.id?.slice(-8) || "YOURCODE"
                      }`}
                    />
                    <button
                      className="btn-copy"
                      onClick={() =>
                        copyToClipboard(
                          `${window.location.origin}?ref=${
                            clerkUser?.id?.slice(-8) || "YOURCODE"
                          }`
                        )
                      }
                    >
                      <Copy size={16} />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="affiliate-stats">
                  <div className="stat-card">
                    <h4>Total Earnings</h4>
                    <p className="stat-value">$0.00</p>
                  </div>
                  <div className="stat-card">
                    <h4>Referrals</h4>
                    <p className="stat-value">0</p>
                  </div>
                  <div className="stat-card">
                    <h4>Commission Rate</h4>
                    <p className="stat-value">10%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "payouts" && (
            <div className="settings-content">
              <h1 className="settings-title">Payouts</h1>
              <p className="settings-subtitle">
                Manage your payout methods and view earnings.
              </p>
              <div className="payout-section">
                <div className="connect-stripe-card">
                  <DollarSign size={48} />
                  <h3>Connect Stripe</h3>
                  <p>
                    Connect your Stripe account to receive payouts for course
                    sales and affiliate earnings.
                  </p>
                  <button className="btn-primary">
                    <ExternalLink size={16} />
                    Connect Stripe Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "account" && (
            <div className="settings-content">
              <h1 className="settings-title">Account</h1>
              <div className="account-section">
                <div className="account-field">
                  <div className="field-info">
                    <label className="field-label">Email</label>
                    <div className="field-value">
                      {clerkUser?.primaryEmailAddress?.emailAddress ||
                        "Not set"}
                    </div>
                  </div>
                  <button
                    className="btn-change"
                    onClick={() => clerkUser?.openUserProfile()}
                  >
                    MANAGE IN CLERK
                  </button>
                </div>

                <div className="account-field">
                  <div className="field-info">
                    <label className="field-label">Password</label>
                    <div className="field-value">Change your password</div>
                  </div>
                  <button
                    className="btn-change"
                    onClick={() => clerkUser?.openUserProfile()}
                  >
                    CHANGE PASSWORD
                  </button>
                </div>

                <div className="account-field">
                  <div className="field-info">
                    <label className="field-label">Timezone</label>
                    <select className="timezone-select">
                      <option>(GMT +05:00) Asia/Qyzylorda</option>
                      <option>(GMT +00:00) UTC</option>
                      <option>(GMT -05:00) America/New_York</option>
                    </select>
                  </div>
                </div>

                <div className="account-field logout-section">
                  <div className="field-info">
                    <label className="field-label">
                      Log out of all devices
                    </label>
                    <div className="field-value">
                      Log out of all active sessions on all devices.
                    </div>
                  </div>
                  <button className="btn-change">LOG OUT EVERYWHERE</button>
                </div>

                <div className="account-field danger-zone">
                  <div className="field-info">
                    <label className="field-label">Delete Account</label>
                    <div className="field-value">
                      Permanently delete your account and all data.
                    </div>
                  </div>
                  <button className="btn-danger-outline">DELETE ACCOUNT</button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "notifications" && (
            <div className="settings-content">
              <h1 className="settings-title">Notifications</h1>
              <div className="notification-settings">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <label>Email notifications</label>
                    <p>Receive updates via email</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          emailNotifications: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-item">
                  <div className="toggle-info">
                    <label>Push notifications</label>
                    <p>Receive browser notifications</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pushNotifications: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-item">
                  <div className="toggle-info">
                    <label>Marketing emails</label>
                    <p>Receive promotional content</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.marketingEmails}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          marketingEmails: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "chat" && (
            <div className="settings-content">
              <h1 className="settings-title">Chat</h1>
              <div className="notification-settings">
                <div className="toggle-item">
                  <div className="toggle-info">
                    <label>Allow direct messages</label>
                    <p>Let others send you messages</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.allowDirectMessages}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          allowDirectMessages: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="toggle-item">
                  <div className="toggle-info">
                    <label>Show online status</label>
                    <p>Let others see when you're online</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.showOnlineStatus}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          showOnlineStatus: e.target.checked,
                        })
                      }
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeMenu === "payment-methods" && (
            <div className="settings-content">
              <h1 className="settings-title">Payment Methods</h1>
              <p className="settings-subtitle">
                Manage your payment methods for subscriptions and purchases.
              </p>
              <div className="payment-methods-section">
                <button
                  className="btn-primary"
                  onClick={handleManageSubscription}
                >
                  <ExternalLink size={16} />
                  Manage Payment Methods in Stripe
                </button>
              </div>
            </div>
          )}

          {activeMenu === "payment-history" && (
            <div className="settings-content">
              <h1 className="settings-title">Payment History</h1>
              {historyLoading ? (
                <div className="loading-spinner">
                  <Loader2 className="spin" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={48} />
                  <p>No payment history</p>
                </div>
              ) : (
                <div className="payment-history-list">
                  {paymentHistory.map((payment, index) => (
                    <div key={payment.id || index} className="payment-item">
                      <div className="payment-info">
                        <span className="payment-type">{payment.type}</span>
                        <span className="payment-desc">
                          {payment.type === "course"
                            ? payment.courseName
                            : payment.description}
                        </span>
                      </div>
                      <div className="payment-meta">
                        <span className="payment-amount">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                        {getStatusBadge(payment.status)}
                        <span className="payment-date">
                          {formatDate(payment.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMenu === "theme" && (
            <div className="settings-content">
              <h1 className="settings-title">Theme</h1>
              <div className="theme-options">
                <label
                  className={`theme-option ${
                    settings.theme === "light" ? "active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === "light"}
                    onChange={() =>
                      setSettings({ ...settings, theme: "light" })
                    }
                  />
                  <div className="theme-preview light"></div>
                  <span>Light</span>
                </label>
                <label
                  className={`theme-option ${
                    settings.theme === "dark" ? "active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === "dark"}
                    onChange={() => setSettings({ ...settings, theme: "dark" })}
                  />
                  <div className="theme-preview dark"></div>
                  <span>Dark</span>
                </label>
                <label
                  className={`theme-option ${
                    settings.theme === "system" ? "active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    checked={settings.theme === "system"}
                    onChange={() =>
                      setSettings({ ...settings, theme: "system" })
                    }
                  />
                  <div className="theme-preview system"></div>
                  <span>System</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserSettings;
