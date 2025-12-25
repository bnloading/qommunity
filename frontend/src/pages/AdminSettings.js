import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserPlus,
  Settings,
  CreditCard,
  DollarSign,
  Plug,
  Tag,
  List,
  Shield,
  Eye,
  BarChart3,
  TrendingUp,
  Users,
} from "lucide-react";
import "./AdminSettings.css";

const MENU_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "invite", label: "Invite", icon: UserPlus },
  { id: "general", label: "General", icon: Settings },
  { id: "payouts", label: "Payouts", icon: CreditCard },
  { id: "pricing", label: "Pricing", icon: DollarSign },
  { id: "affiliates", label: "Affiliates", icon: Users },
  { id: "plugins", label: "Plugins", icon: Plug },
  { id: "tabs", label: "Tabs", icon: List },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "rules", label: "Rules", icon: Shield },
  { id: "discovery", label: "Discovery", icon: Eye },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "billing", label: "Billing", icon: CreditCard },
];

function AdminSettings() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [communityName] = useState("dspjod"); // TODO: Get from API

  // Mock data
  const stats = {
    paidMembers: 0,
    mrr: 0,
    churnRate: 0,
    aboutPageVisitors: 3,
    signups: 2,
    conversionRate: 66.67,
    oneTimeSales: 0,
    trialsInProgress: 0,
    trialConversionRate: 0,
  };

  return (
    <div className="admin-settings-page">
      <div className="settings-sidebar">
        <div className="sidebar-header">
          <div className="community-avatar">d</div>
          <div className="community-info">
            <h3>{communityName}</h3>
            <p>Group settings</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`menu-item ${
                  activeMenu === item.id ? "active" : ""
                }`}
                onClick={() => setActiveMenu(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="settings-main">
        <div className="settings-header">
          <div className="greeting">
            <div className="greeting-icon">🎉</div>
            <h1>Happy Wednesday, nurbakhitjan5</h1>
          </div>
          <p className="last-updated">Last updated just now</p>
        </div>

        {activeMenu === "dashboard" && (
          <div className="dashboard-content">
            <section className="stats-section">
              <h2 className="section-title">Subscriptions</h2>
              <div className="stats-grid three-col">
                <div className="stat-card">
                  <div className="stat-value">{stats.paidMembers}</div>
                  <div className="stat-label">Paid members</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">${stats.mrr}</div>
                  <div className="stat-label">MRR</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.churnRate}%</div>
                  <div className="stat-label">Churn (last 30d)</div>
                </div>
              </div>
            </section>

            <section className="stats-section">
              <h2 className="section-title">Traffic (last 7-days)</h2>
              <div className="stats-grid three-col">
                <div className="stat-card">
                  <div className="stat-value">{stats.aboutPageVisitors}</div>
                  <div className="stat-label">About page visitors</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.signups}</div>
                  <div className="stat-label">Signups</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.conversionRate}%</div>
                  <div className="stat-label">Conversion rate</div>
                </div>
              </div>
            </section>

            <section className="stats-section">
              <h2 className="section-title">Other</h2>
              <div className="stats-grid three-col">
                <div className="stat-card">
                  <div className="stat-value">${stats.oneTimeSales}</div>
                  <div className="stat-label">1-time sales</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.trialsInProgress}</div>
                  <div className="stat-label">Trials in progress</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.trialConversionRate}%</div>
                  <div className="stat-label">Trial conversion rate</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeMenu === "general" && (
          <div className="general-content">
            <h2 className="section-title">General Settings</h2>
            <p>General settings coming soon...</p>
          </div>
        )}

        {activeMenu === "invite" && (
          <div className="invite-content">
            <h2 className="section-title">Invite Members</h2>
            <p>Invite functionality coming soon...</p>
          </div>
        )}

        {activeMenu === "pricing" && (
          <div className="pricing-content">
            <h2 className="section-title">Pricing Settings</h2>
            <p>Pricing configuration coming soon...</p>
          </div>
        )}

        {/* Add other menu content as needed */}
      </div>
    </div>
  );
}

export default AdminSettings;
