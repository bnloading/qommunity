import React, { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { Calendar, Edit2 } from "lucide-react";
import axios from "axios";
import "./UserProfile.css";

function UserProfile() {
  const { isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { user } = useSelector((state) => state.auth);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const email = isSignedIn
        ? clerkUser?.emailAddresses?.[0]?.emailAddress
        : user?.email;

      if (email) {
        const response = await axios.get(
          `http://localhost:5000/api/users/email/${email}`
        );
        setProfileData(response.data.user);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserData = () => {
    if (isSignedIn && clerkUser) {
      return {
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
        username: `@${clerkUser.username || "user"}`,
        email: clerkUser.emailAddresses?.[0]?.emailAddress,
        avatar: clerkUser.imageUrl,
        bio: profileData?.bio || "just",
        joinedDate: new Date(clerkUser.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };
    }

    return {
      name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User",
      username: `@${user?.email?.split("@")[0] || "user"}`,
      email: user?.email,
      avatar: user?.profilePicture || "/default-avatar.png",
      bio: profileData?.bio || "just",
      joinedDate: profileData?.createdAt
        ? new Date(profileData.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Nov 14, 2025",
    };
  };

  const userData = getUserData();

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="profile-container">
        {/* Left Side - Activity */}
        <div className="profile-left">
          <section className="activity-section">
            <h2>Activity</h2>
            <div className="activity-calendar">
              <div className="calendar-header">
                {[
                  "Dec",
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                ].map((month) => (
                  <div key={month} className="month-label">
                    {month}
                  </div>
                ))}
              </div>
              <div className="calendar-grid">
                <div className="day-labels">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                  <span>Sun</span>
                </div>
                <div className="calendar-cells">
                  {Array.from({ length: 365 }).map((_, i) => (
                    <div key={i} className="calendar-cell empty"></div>
                  ))}
                </div>
              </div>
              <div className="calendar-legend">
                <span>What is this?</span>
                <div className="legend-scale">
                  <span>Less</span>
                  <div className="scale-boxes">
                    <div className="scale-box level-0"></div>
                    <div className="scale-box level-1"></div>
                    <div className="scale-box level-2"></div>
                    <div className="scale-box level-3"></div>
                    <div className="scale-box level-4"></div>
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          </section>

          <section className="memberships-section">
            <h2>Memberships</h2>
            <p className="empty-text">No memberships yet</p>
          </section>

          <section className="contributions-section">
            <h2>Contributions</h2>
            <div className="contributions-filter">
              <select>
                <option>Select a group to see contributions</option>
              </select>
            </div>
          </section>
        </div>

        {/* Right Side - Profile Card */}
        <div className="profile-right">
          <div className="profile-card">
            <div className="profile-avatar-large">
              {userData.avatar ? (
                <img src={userData.avatar} alt={userData.name} />
              ) : (
                <div className="avatar-placeholder">
                  {userData.name[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h1 className="profile-name">{userData.name}</h1>
            <p className="profile-username">{userData.username}</p>
            <p className="profile-bio">{userData.bio}</p>

            <div className="online-status">
              <span className="status-dot"></span>
              <span>Online now</span>
            </div>

            <div className="joined-date">
              <Calendar size={16} />
              <span>Joined {userData.joinedDate}</span>
            </div>

            <div className="profile-stats">
              <div className="stat-item">
                <div className="stat-value">0</div>
                <div className="stat-label">Contributions</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {profileData?.followers?.length || 0}
                </div>
                <div className="stat-label">Followers</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {profileData?.following?.length || 0}
                </div>
                <div className="stat-label">Following</div>
              </div>
            </div>

            <button className="edit-profile-btn">
              <Edit2 size={16} />
              <span>EDIT PROFILE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;
