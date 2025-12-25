import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, useUser } from "@clerk/clerk-react";
import { ArrowLeft, Sparkles, Upload, X, Loader2 } from "lucide-react";
import "./CreateCommunity.css";

const CATEGORIES = [
  { value: "hobbies", label: "🎨 Hobbies", emoji: "🎨" },
  { value: "music", label: "🎵 Music", emoji: "🎵" },
  { value: "money", label: "💰 Money", emoji: "💰" },
  { value: "spirituality", label: "✨ Spirituality", emoji: "✨" },
  { value: "tech", label: "💻 Tech", emoji: "💻" },
  { value: "health", label: "🔥 Health", emoji: "🔥" },
  { value: "sports", label: "⚽ Sports", emoji: "⚽" },
  { value: "self-improvement", label: "🧠 Self-improvement", emoji: "🧠" },
  { value: "relationships", label: "❤️ Relationships", emoji: "❤️" },
  { value: "other", label: "🌟 Other", emoji: "🌟" },
];

function CreateCommunity() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    category: "other",
    coverImage: "",
    logo: "",
    // Pricing settings
    pricingModel: "free",
    pricingAmount: 0,
    hasTrial: false,
    trialDays: 7,
  });

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const userEmail = clerkUser?.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
          setCheckingSubscription(false);
          return;
        }

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}/subscriptions/status`,
          { params: { userEmail } }
        );

        const { subscriptionStatus, subscriptionTier } = response.data;
        console.log("📊 Subscription check:", {
          subscriptionStatus,
          subscriptionTier,
        });

        // Allow active or trialing subscriptions with non-free tier
        const isActiveSubscription =
          (subscriptionStatus === "active" ||
            subscriptionStatus === "trialing") &&
          subscriptionTier &&
          subscriptionTier !== "free";

        if (!isActiveSubscription) {
          navigate("/select-plan", {
            state: {
              redirectPath: "/create-community",
              action: "create community",
            },
          });
          return;
        }

        setCheckingSubscription(false);
      } catch (error) {
        console.error("Error checking subscription:", error);
        // Redirect to plan selection on error
        navigate("/select-plan", {
          state: {
            redirectPath: "/create-community",
            action: "create community",
          },
        });
      }
    };

    if (clerkUser) {
      checkSubscription();
    }
  }, [clerkUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate slug from name
    if (name === "name") {
      const slugValue = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setFormData((prev) => ({
        ...prev,
        slug: slugValue,
      }));
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }

    const setUploading =
      type === "cover" ? setUploadingCover : setUploadingLogo;
    setUploading(true);

    try {
      const token = await getToken();
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/local-upload/image`,
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const imageUrl = response.data.url;
      setFormData((prev) => ({
        ...prev,
        [type === "cover" ? "coverImage" : "logo"]: imageUrl,
      }));
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (type) => {
    setFormData((prev) => ({
      ...prev,
      [type === "cover" ? "coverImage" : "logo"]: "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = await getToken();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/communities`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        navigate(`/community/${response.data.community.slug}`);
      }
    } catch (error) {
      console.error("Error creating community:", error);
      alert(error.response?.data?.message || "Failed to create community");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking subscription
  if (checkingSubscription) {
    return (
      <div className="create-community-page">
        <div className="create-community-container">
          <div
            className="create-header"
            style={{ textAlign: "center", padding: "4rem" }}
          >
            <Loader2
              className="animate-spin"
              size={48}
              style={{ margin: "0 auto 1rem" }}
            />
            <h2>Checking subscription status...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-community-page">
      <button className="back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>Back to Communities</span>
      </button>

      <div className="create-community-container">
        <div className="create-header">
          <Sparkles className="create-icon" size={48} />
          <h1>Create Your Community</h1>
          <p>
            Build a space where people can learn, connect, and grow together
          </p>
        </div>

        <form onSubmit={handleSubmit} className="community-form">
          <div className="form-section">
            <h2 className="section-title">Community Details</h2>

            <div className="form-group">
              <label htmlFor="name">
                Community Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Pickleball Masters"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="slug">
                URL Slug <span className="required">*</span>
              </label>
              <div className="slug-input">
                <span className="slug-prefix">skool.com/</span>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  placeholder="pickleball-masters"
                  value={formData.slug}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="shortDescription">Short Description</label>
              <textarea
                id="shortDescription"
                name="shortDescription"
                placeholder="A brief description that appears on the community card"
                value={formData.shortDescription}
                onChange={handleChange}
                rows={2}
                maxLength={120}
              />
              <div className="char-count">
                {formData.shortDescription.length}/120
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">About (Full Description)</label>
              <textarea
                id="description"
                name="description"
                placeholder="Tell people more about your community..."
                value={formData.description}
                onChange={handleChange}
                rows={6}
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">
                Category <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cover Image</label>
              <div className="image-upload-container">
                {formData.coverImage ? (
                  <div className="image-preview">
                    <img
                      src={
                        formData.coverImage.startsWith("http")
                          ? formData.coverImage
                          : `http://localhost:5000${formData.coverImage}`
                      }
                      alt="Cover preview"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage("cover")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "cover")}
                      disabled={uploadingCover}
                      style={{ display: "none" }}
                    />
                    {uploadingCover ? (
                      <div className="upload-placeholder">
                        <Loader2 className="animate-spin" size={32} />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <Upload size={32} />
                        <span>Click to upload cover image</span>
                        <small>Recommended: 1200x400px</small>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Logo</label>
              <div className="image-upload-container logo-upload">
                {formData.logo ? (
                  <div className="image-preview logo-preview">
                    <img
                      src={
                        formData.logo.startsWith("http")
                          ? formData.logo
                          : `http://localhost:5000${formData.logo}`
                      }
                      alt="Logo preview"
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImage("logo")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="upload-area logo-area">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "logo")}
                      disabled={uploadingLogo}
                      style={{ display: "none" }}
                    />
                    {uploadingLogo ? (
                      <div className="upload-placeholder">
                        <Loader2 className="animate-spin" size={24} />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <Upload size={24} />
                        <span>Upload logo</span>
                        <small>400x400px</small>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="form-section">
            <h2 className="section-title">💰 Pricing Settings</h2>
            <p className="section-description">
              Set how members will access your community
            </p>

            <div className="form-group">
              <label htmlFor="pricingModel">Access Type</label>
              <select
                id="pricingModel"
                name="pricingModel"
                value={formData.pricingModel}
                onChange={handleChange}
              >
                <option value="free">🆓 Free - Anyone can join</option>
                <option value="one-time">💵 One-time Payment</option>
                <option value="subscription">🔄 Monthly Subscription</option>
              </select>
            </div>

            {formData.pricingModel !== "free" && (
              <>
                <div className="form-group">
                  <label htmlFor="pricingAmount">
                    Price (USD) <span className="required">*</span>
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency-symbol">$</span>
                    <input
                      type="number"
                      id="pricingAmount"
                      name="pricingAmount"
                      placeholder="29"
                      value={formData.pricingAmount}
                      onChange={handleChange}
                      min="1"
                      step="1"
                      required={formData.pricingModel !== "free"}
                    />
                    {formData.pricingModel === "subscription" && (
                      <span className="price-period">/month</span>
                    )}
                  </div>
                </div>

                <div className="form-group trial-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      name="hasTrial"
                      checked={formData.hasTrial}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          hasTrial: e.target.checked,
                        }))
                      }
                    />
                    <span className="toggle-switch"></span>
                    <span>Offer free trial</span>
                  </label>
                </div>

                {formData.hasTrial && (
                  <div className="form-group">
                    <label htmlFor="trialDays">Trial Days</label>
                    <select
                      id="trialDays"
                      name="trialDays"
                      value={formData.trialDays}
                      onChange={handleChange}
                    >
                      <option value="3">3 days</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? "Creating..." : "Create Community"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCommunity;
