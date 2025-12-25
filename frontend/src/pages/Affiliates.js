import React from "react";
import { useNavigate } from "react-router-dom";
import "./Affiliates.css";

const Affiliates = () => {
  const navigate = useNavigate();
  const userEmail = "nurbakhitjan5@gmail.com";
  const affiliateLink =
    "https://www.skool.com/signup?ref=3f465466a20e4e8f9174c2bce52e3c50";

  const handleCopy = () => {
    navigator.clipboard.writeText(affiliateLink);
    alert("Link copied to clipboard!");
  };

  return (
    <div className="affiliates-page">
      <div className="affiliates-container">
        <aside className="affiliates-sidebar">
          <button
            className="sidebar-item"
            onClick={() => navigate("/discover")}
          >
            Communities
          </button>
          <button className="sidebar-item" onClick={() => navigate("/profile")}>
            Profile
          </button>
          <button className="sidebar-item active">Affiliates</button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/payouts")}
          >
            Payouts
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/account")}
          >
            Account
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/notifications")}
          >
            Notifications
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/chat")}
          >
            Chat
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/payment-methods")}
          >
            Payment methods
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/payment-history")}
          >
            Payment history
          </button>
          <button
            className="sidebar-item"
            onClick={() => navigate("/user-settings/theme")}
          >
            Theme
          </button>
        </aside>

        <main className="affiliates-content">
          <h1 className="affiliates-title">Affiliates</h1>
          <p className="affiliates-subtitle">
            Earn commission for life when you invite somebody to create or join
            a Skool community.
          </p>

          <div className="affiliates-stats">
            <div className="stat-card">
              <div className="stat-value">$0</div>
              <div className="stat-label">Last 30 days</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">$0</div>
              <div className="stat-label">Lifetime</div>
            </div>
            <div className="stat-card stat-card-green">
              <div className="stat-value stat-value-green">$0</div>
              <div className="stat-label">Account balance</div>
            </div>
            <button className="payout-btn">PAYOUT</button>
          </div>
          <div className="payout-note">$0 available soon</div>

          <div className="affiliate-links-section">
            <h2 className="section-title">Your affiliate links</h2>
            <button className="platform-tag">Skool platform</button>
            <p className="commission-text">
              Earn <strong>40% commission</strong> when you invite somebody to
              create a Skool community.
            </p>
            <div className="link-container">
              <input
                type="text"
                className="affiliate-link-input"
                value={affiliateLink}
                readOnly
              />
              <button className="copy-btn" onClick={handleCopy}>
                COPY
              </button>
            </div>
            <div className="active-status">
              Active <span className="dropdown-arrow">▼</span>
            </div>
          </div>

          <div className="referrals-section">
            <div className="coins-icon">
              <div className="coin coin-front">
                <div className="dollar-sign">$</div>
              </div>
              <div className="coin coin-middle"></div>
              <div className="coin coin-back"></div>
            </div>
            <p className="referrals-text">Your referrals will show here</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Affiliates;
