import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Search,
  Palette,
  Music,
  DollarSign,
  Sparkles,
  MonitorPlay,
  Heart,
  Trophy,
  Brain,
  Users,
} from "lucide-react";
import "./Discover.css";

const CATEGORIES = [
  { id: "all", name: "All", icon: null },
  { id: "hobbies", name: "Hobbies", icon: Palette },
  { id: "music", name: "Music", icon: Music },
  { id: "money", name: "Money", icon: DollarSign },
  { id: "spirituality", name: "Spirituality", icon: Sparkles },
  { id: "tech", name: "Tech", icon: MonitorPlay },
  { id: "health", name: "Health", icon: Heart },
  { id: "sports", name: "Sports", icon: Trophy },
  { id: "self-improvement", name: "Self-improvement", icon: Brain },
  { id: "relationships", name: "Relationships", icon: Users },
];

function Discover() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [filteredCommunities, setFilteredCommunities] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCommunities();
  }, []);

  useEffect(() => {
    filterCommunities();
  }, [selectedCategory, searchQuery, communities]);

  const fetchCommunities = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/communities");
      setCommunities(response.data.communities || []);
    } catch (error) {
      console.error("Error fetching communities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCommunities = () => {
    let filtered = communities;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (community) =>
          community.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (community) =>
          community.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          community.description
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCommunities(filtered);
  };

  return (
    <div className="discover-page">
      <div className="discover-hero">
        <h1 className="discover-title">Discover communities</h1>
        <p className="discover-subtitle">
          or{" "}
          <span
            className="create-link"
            onClick={() => navigate("/create-community")}
          >
            create your own
          </span>
        </p>

        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search for anything"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="categories-container">
        <div className="categories-scroll">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                className={`category-btn ${
                  selectedCategory === category.id ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {Icon && <Icon size={18} />}
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="communities-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        ) : filteredCommunities.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={48} className="empty-icon" />
            <h3>No communities found</h3>
            <p>Try adjusting your search or category</p>
          </div>
        ) : (
          filteredCommunities.map((community, index) => {
            const getRankBadge = (idx) => {
              if (idx === 0)
                return { text: "#1", emoji: "🏆", color: "#f59e0b" };
              if (idx === 1)
                return { text: "#2", emoji: "🥈", color: "#9ca3af" };
              if (idx === 2)
                return { text: "#3", emoji: "🥉", color: "#ea580c" };
              return { text: `#${idx + 1}`, emoji: "📚", color: "#3b82f6" };
            };
            const badge = getRankBadge(index);
            const creator = community.creator || community.owner;

            return (
              <div
                key={community._id}
                className="community-card"
                onClick={() => navigate(`/community/${community.slug}`)}
              >
                <div className="community-card-header">
                  <div
                    className="rank-badge"
                    style={{ backgroundColor: badge.color }}
                  >
                    <span className="rank-emoji">{badge.emoji}</span>
                    <span className="rank-text">{badge.text}</span>
                  </div>
                  <div
                    className="community-cover"
                    style={{
                      backgroundImage: community.thumbnail
                        ? `url(${community.thumbnail})`
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    }}
                  />
                </div>
                <div className="community-content">
                  <div className="community-header-info">
                    <div className="community-logo">
                      {community.name?.charAt(0).toUpperCase() || "C"}
                    </div>
                    <h3 className="community-name">{community.name}</h3>
                  </div>
                  <p className="community-description">
                    {community.description?.substring(0, 100)}
                    {community.description?.length > 100 ? "..." : ""}
                  </p>
                  {creator && (
                    <div className="community-creator">
                      <div className="creator-avatar">
                        {creator.profilePicture ? (
                          <img
                            src={creator.profilePicture}
                            alt={`${creator.firstName || ""} ${
                              creator.lastName || ""
                            }`}
                          />
                        ) : (
                          <span>
                            {(
                              creator.firstName?.charAt(0) ||
                              creator.name?.charAt(0) ||
                              "U"
                            ).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="creator-name">
                        by{" "}
                        {creator.firstName && creator.lastName
                          ? `${creator.firstName} ${creator.lastName}`
                          : creator.name ||
                            creator.email?.split("@")[0] ||
                            "Unknown"}
                      </span>
                    </div>
                  )}
                  <div className="community-meta">
                    <span className="member-count">
                      <Users size={14} />
                      {community.members?.length || 0} Members
                    </span>
                    {community.isPaid && (
                      <span className="paid-badge">💎 Paid</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Discover;
