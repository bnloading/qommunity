import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSignIn, useSignUp } from "@clerk/clerk-react";
import {
  Sparkles,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  ArrowRight,
  Check,
  User,
  FileText,
} from "lucide-react";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const {
    signIn,
    setActive: setActiveSignIn,
    isLoaded: signInLoaded,
  } = useSignIn();
  const {
    signUp,
    setActive: setActiveSignUp,
    isLoaded: signUpLoaded,
  } = useSignUp();

  const [authMethod, setAuthMethod] = useState("select"); // "select", "email", "phone"
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Phone OTP state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+7");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [pendingVerification, setPendingVerification] = useState(false);

  // Profile completion state (for phone signup)
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
  });

  const otpInputRefs = useRef([]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleGoogleSignIn = async () => {
    if (!signInLoaded) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      setError("Google sign in failed. Please try again.");
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only keep last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length - 1, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  // Send OTP to phone
  const handleSendOtp = async () => {
    if (!signUpLoaded || !signInLoaded) return;

    const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;

    if (phoneNumber.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Try sign-in first (existing user)
      try {
        const signInAttempt = await signIn.create({
          identifier: fullPhoneNumber,
        });

        // Prepare phone verification
        await signIn.prepareFirstFactor({
          strategy: "phone_code",
          phoneNumberId: signInAttempt.supportedFirstFactors?.find(
            (f) => f.strategy === "phone_code"
          )?.phoneNumberId,
        });

        setOtpSent(true);
        setOtpTimer(60);
        setPendingVerification(false);
        setIsSignUp(false);
      } catch (signInError) {
        // User doesn't exist, try sign-up
        console.log("User not found, trying sign-up...");

        await signUp.create({
          phoneNumber: fullPhoneNumber,
        });

        await signUp.preparePhoneNumberVerification();

        setOtpSent(true);
        setOtpTimer(60);
        setPendingVerification(true);
        setIsSignUp(true);
      }
    } catch (error) {
      console.error("Phone auth error:", error);
      setError(
        error.errors?.[0]?.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (pendingVerification) {
        // Complete sign-up verification
        const result = await signUp.attemptPhoneNumberVerification({
          code: otpCode,
        });

        if (result.status === "complete") {
          await setActiveSignUp({ session: result.createdSessionId });
          // New user - show profile completion
          setShowProfileCompletion(true);
        }
      } else {
        // Complete sign-in verification
        const result = await signIn.attemptFirstFactor({
          strategy: "phone_code",
          code: otpCode,
        });

        if (result.status === "complete") {
          await setActiveSignIn({ session: result.createdSessionId });
          navigate("/");
        }
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      setError(error.errors?.[0]?.message || "Invalid code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Save profile after phone signup
  const handleSaveProfile = async () => {
    if (!profileData.firstName.trim()) {
      setError("Please enter your first name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\D/g, "")}`;

      // Save profile to backend
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/users/complete-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: fullPhoneNumber,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            bio: profileData.bio,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      navigate("/");
    } catch (error) {
      console.error("Profile save error:", error);
      // Still navigate even if backend save fails (Clerk has the user)
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!signInLoaded) return;

    setLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      });

      if (result.status === "complete") {
        await setActiveSignIn({ session: result.createdSessionId });
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.errors?.[0]?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!signUpLoaded) return;

    setLoading(true);
    setError("");

    try {
      const result = await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });

      // Send verification email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // For simplicity, auto-complete (in production, verify email first)
      if (result.status === "complete") {
        await setActiveSignUp({ session: result.createdSessionId });
        navigate("/");
      } else {
        setError("Please check your email to verify your account.");
      }
    } catch (error) {
      console.error("Sign up error:", error);
      setError(
        error.errors?.[0]?.message || "Sign up failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Profile completion screen for phone signup
  if (showProfileCompletion) {
    return (
      <div className="login-page">
        <div className="login-container">
          {/* Left side - Branding */}
          <div className="login-branding">
            <div className="branding-content">
              <h1 className="brand-logo">skool</h1>
              <p className="brand-tagline">Complete your profile</p>
              <div className="brand-features">
                <div className="feature-item">
                  <Check className="feature-icon" size={20} />
                  <span>Phone verified successfully!</span>
                </div>
                <div className="feature-item">
                  <User className="feature-icon" size={20} />
                  <span>Tell us about yourself</span>
                </div>
                <div className="feature-item">
                  <FileText className="feature-icon" size={20} />
                  <span>Add a bio (optional)</span>
                </div>
              </div>
            </div>
            <div className="branding-pattern"></div>
          </div>

          {/* Right side - Profile Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="login-header">
                <div className="verified-badge">
                  <Check size={24} />
                </div>
                <h2>Welcome to Skool!</h2>
                <p>Let's set up your profile</p>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="profile-form">
                <div className="name-row">
                  <div className="form-group">
                    <label>
                      First Name <span className="required">*</span>
                    </label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        name="firstName"
                        placeholder="John"
                        value={profileData.firstName}
                        onChange={handleProfileChange}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <div className="input-wrapper">
                      <User size={18} className="input-icon" />
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Doe"
                        value={profileData.lastName}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Bio (Optional)</label>
                  <textarea
                    name="bio"
                    placeholder="Tell us a bit about yourself..."
                    value={profileData.bio}
                    onChange={handleProfileChange}
                    rows={4}
                    maxLength={500}
                  />
                  <div className="char-count">{profileData.bio.length}/500</div>
                </div>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleSaveProfile}
                  disabled={loading || !profileData.firstName.trim()}
                >
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Complete Setup
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="skip-btn"
                  onClick={() => navigate("/")}
                >
                  Skip for now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP verification screen
  if (otpSent) {
    return (
      <div className="login-page">
        <div className="login-container">
          {/* Left side - Branding */}
          <div className="login-branding">
            <div className="branding-content">
              <h1 className="brand-logo">skool</h1>
              <p className="brand-tagline">Verify your phone</p>
              <div className="brand-features">
                <div className="feature-item">
                  <Phone className="feature-icon" size={20} />
                  <span>
                    Code sent to {countryCode} {phoneNumber}
                  </span>
                </div>
              </div>
            </div>
            <div className="branding-pattern"></div>
          </div>

          {/* Right side - OTP Form */}
          <div className="login-form-section">
            <div className="login-form-container">
              <div className="login-header">
                <div className="otp-icon-wrapper">
                  <Lock size={32} />
                </div>
                <h2>Enter verification code</h2>
                <p>
                  We sent a 6-digit code to{" "}
                  <strong>
                    {countryCode} {phoneNumber}
                  </strong>
                </p>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="otp-container">
                <div className="otp-inputs" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="otp-input"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.join("").length !== 6}
                >
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Verify Code
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="resend-section">
                  {otpTimer > 0 ? (
                    <p className="resend-timer">Resend code in {otpTimer}s</p>
                  ) : (
                    <button
                      type="button"
                      className="resend-btn"
                      onClick={handleSendOtp}
                      disabled={loading}
                    >
                      Resend code
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="back-btn-text"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                >
                  ← Change phone number
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main login screen
  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <h1 className="brand-logo">skool</h1>
            <p className="brand-tagline">Where communities grow and thrive</p>
            <div className="brand-features">
              <div className="feature-item">
                <Sparkles className="feature-icon" size={20} />
                <span>Create and join amazing communities</span>
              </div>
              <div className="feature-item">
                <Sparkles className="feature-icon" size={20} />
                <span>Learn from expert instructors</span>
              </div>
              <div className="feature-item">
                <Sparkles className="feature-icon" size={20} />
                <span>Connect with like-minded people</span>
              </div>
            </div>
          </div>
          <div className="branding-pattern"></div>
        </div>

        {/* Right side - Login Form */}
        <div className="login-form-section">
          <div className="login-form-container">
            <div className="login-header">
              <h2>{isSignUp ? "Create your account" : "Welcome back!"}</h2>
              <p>
                {isSignUp
                  ? "Join thousands of learners today"
                  : "Sign in to continue learning"}
              </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Auth Method Selection */}
            {authMethod === "select" && (
              <div className="auth-methods">
                <button
                  type="button"
                  className="auth-method-btn google-btn"
                  onClick={handleGoogleSignIn}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      fill="#4285F4"
                      d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
                    />
                    <path
                      fill="#34A853"
                      d="M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 000 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
                    />
                    <path
                      fill="#EA4335"
                      d="M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  className="auth-method-btn phone-btn"
                  onClick={() => setAuthMethod("phone")}
                >
                  <Phone size={20} />
                  <span>Continue with Phone</span>
                </button>

                <button
                  type="button"
                  className="auth-method-btn email-btn"
                  onClick={() => setAuthMethod("email")}
                >
                  <Mail size={20} />
                  <span>Continue with Email</span>
                </button>
              </div>
            )}

            {/* Phone Auth */}
            {authMethod === "phone" && (
              <div className="phone-auth">
                <div className="form-group">
                  <label>Phone Number</label>
                  <div className="phone-input-wrapper">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="country-select"
                    >
                      <option value="+7">🇰🇿 +7</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+81">🇯🇵 +81</option>
                      <option value="+86">🇨🇳 +86</option>
                      <option value="+91">🇮🇳 +91</option>
                      <option value="+82">🇰🇷 +82</option>
                      <option value="+971">🇦🇪 +971</option>
                      <option value="+90">🇹🇷 +90</option>
                      <option value="+998">🇺🇿 +998</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="xxx xxx xxxx"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value);
                        setError("");
                      }}
                      className="phone-input"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="submit-btn"
                  onClick={handleSendOtp}
                  disabled={loading || phoneNumber.length < 9}
                >
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      Send OTP Code
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="back-btn-text"
                  onClick={() => {
                    setAuthMethod("select");
                    setError("");
                  }}
                >
                  ← Other sign in options
                </button>
              </div>
            )}

            {/* Email Auth */}
            {authMethod === "email" && (
              <form
                onSubmit={isSignUp ? handleEmailSignUp : handleEmailSignIn}
                className="email-auth"
              >
                {isSignUp && (
                  <div className="name-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    <>
                      {isSignUp ? "Create Account" : "Sign In"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div className="switch-mode">
                  <span>
                    {isSignUp
                      ? "Already have an account?"
                      : "Don't have an account?"}
                  </span>
                  <button
                    type="button"
                    className="switch-btn"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError("");
                    }}
                  >
                    {isSignUp ? "Sign in" : "Sign up"}
                  </button>
                </div>

                <button
                  type="button"
                  className="back-btn-text"
                  onClick={() => {
                    setAuthMethod("select");
                    setError("");
                  }}
                >
                  ← Other sign in options
                </button>
              </form>
            )}

            <p className="terms-text">
              By continuing, you agree to our{" "}
              <a href="/terms">Terms of Service</a> and{" "}
              <a href="/privacy">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
