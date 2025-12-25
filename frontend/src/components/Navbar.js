import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { MessageCircle, Bell } from "lucide-react";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { token, user: reduxUser } = useSelector((state) => state.auth);
  const isAuthenticated = isSignedIn || !!token;
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const user = clerkUser || reduxUser;
  const userEmail =
    user?.emailAddresses?.[0]?.emailAddress || user?.email || "";

  const handleLogout = () => {
    setShowDropdown(false);
    if (isSignedIn) {
      signOut(() => navigate("/login"));
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const getAvatarContent = () => {
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <nav className="navbar-skool">
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => navigate("/discover")}>
          <span className="logo-s">s</span>
          <span className="logo-k">k</span>
          <span className="logo-o1">o</span>
          <span className="logo-o2">o</span>
          <span className="logo-l">l</span>
        </div>
        {isAuthenticated && (
          <div className="navbar-actions">
            <button className="navbar-icon-btn">
              <MessageCircle size={20} />
            </button>
            <button className="navbar-icon-btn">
              <Bell size={20} />
            </button>
            <div className="navbar-profile-wrapper" ref={dropdownRef}>
              <button
                className="navbar-avatar"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {getAvatarContent()}
              </button>
              {showDropdown && (
                <div className="navbar-dropdown">
                  <div className="dropdown-header">{userEmail}</div>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/profile");
                    }}
                  >
                    Profile
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/user-settings");
                    }}
                  >
                    Settings
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/user-settings/affiliates");
                    }}
                  >
                    Affiliates
                  </button>
                  <div className="dropdown-divider"></div>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/help");
                    }}
                  >
                    Help center
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/create-community");
                    }}
                  >
                    Create a community
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/discover");
                    }}
                  >
                    Discover communities
                  </button>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
