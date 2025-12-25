import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  ClerkProvider,
  RedirectToSignIn,
  useAuth,
  SignIn,
  SignUp,
} from "@clerk/clerk-react";

// Import pages
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import CreateCommunity from "./pages/CreateCommunity";
import CommunityDetail from "./pages/CommunityDetail";
import CoursePages from "./pages/CoursePages";
import CourseDetail from "./pages/CourseDetail";
import ManageCourse from "./pages/ManageCourse";
import CreateCourse from "./pages/CreateCourse";
import Community from "./pages/Community";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import InstructorProfile from "./pages/InstructorProfile";
import Pricing from "./pages/Pricing";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionPlanSelect from "./pages/SubscriptionPlanSelect";
import CustomSignUp from "./pages/SignUp";
import EmailLogin from "./pages/EmailLogin";
import Login from "./pages/Login";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import MyCourses from "./pages/MyCourses";
import Feed from "./pages/Feed";
import AdminSettings from "./pages/AdminSettings";
import UserProfile from "./pages/UserProfile";
import UserSettings from "./pages/UserSettings";
import Affiliates from "./pages/Affiliates";
import Dashboard from "./pages/Dashboard";
import NotificationsPage from "./pages/NotificationsPage";
import InvitePage from "./pages/InvitePage";

// Import settings components
import { CommunitySettings } from "./components/settings";

// Import components
import Navbar from "./components/Navbar";

// Import context
import { ThemeProvider } from "./context/ThemeContext";

// Clerk publishable key
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isLoaded, userId } = useAuth();
  const token = localStorage.getItem("token");

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  console.log("🔐 ProtectedRoute check:", { userId, hasToken: !!token });

  // Check both Clerk auth and email/password auth
  if (!userId && !token) {
    console.log("❌ Not authenticated, redirecting to sign in");
    return <RedirectToSignIn />;
  }

  console.log("✅ Authenticated, rendering protected content");
  return children;
}

function AppContent() {
  const { isLoaded, userId } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem("token");
  const isAuthenticated = userId || !!token;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {isAuthenticated && <Navbar />}
      <div className="w-full">
        <Routes>
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-community"
            element={
              <ProtectedRoute>
                <CreateCommunity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/:slug"
            element={
              <ProtectedRoute>
                <CommunityDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/:slug/settings"
            element={
              <ProtectedRoute>
                <CommunitySettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/:slug/settings/:section"
            element={
              <ProtectedRoute>
                <CommunitySettings />
              </ProtectedRoute>
            }
          />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route
            path="/course/:courseId/pages"
            element={
              <ProtectedRoute>
                <CoursePages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/:communityId/course/:courseId/pages"
            element={
              <ProtectedRoute>
                <CoursePages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-settings"
            element={
              <ProtectedRoute>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-course/:id"
            element={
              <ProtectedRoute>
                <ManageCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-course"
            element={
              <ProtectedRoute>
                <CreateCourse />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute>
                <Pricing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/select-plan"
            element={
              <ProtectedRoute>
                <SubscriptionPlanSelect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-settings"
            element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-settings/:section"
            element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-settings/affiliates"
            element={
              <ProtectedRoute>
                <Affiliates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/old-profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/:id"
            element={
              <ProtectedRoute>
                <InstructorProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscription/success"
            element={
              <ProtectedRoute>
                <SubscriptionSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment/success"
            element={
              <ProtectedRoute>
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />

          {/* Custom Auth Routes (Email/Password) */}
          <Route path="/signup" element={<CustomSignUp />} />
          <Route path="/email-login" element={<EmailLogin />} />
          <Route path="/legacy-login" element={<Login />} />

          {/* Clerk Auth Routes */}
          <Route
            path="/sign-in/*"
            element={
              userId ? (
                <Navigate to="/" />
              ) : (
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                  <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome to Skool
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Sign in with Gmail or email to continue
                      </p>
                    </div>
                    <SignIn
                      appearance={{
                        elements: {
                          rootBox: "mx-auto",
                          card: "shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800",
                          headerTitle:
                            "text-2xl font-bold text-gray-900 dark:text-white",
                          headerSubtitle: "text-gray-600 dark:text-gray-400",
                          socialButtonsBlockButton:
                            "bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition",
                          socialButtonsBlockButtonText:
                            "font-semibold text-base",
                          formButtonPrimary:
                            "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition",
                          footerActionLink:
                            "text-blue-600 hover:text-blue-700 font-semibold",
                          formFieldInput:
                            "border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500",
                          identityPreviewEditButton:
                            "text-blue-600 hover:text-blue-700",
                        },
                      }}
                      routing="path"
                      path="/sign-in"
                      signUpUrl="/sign-up"
                      redirectUrl="/"
                    />
                  </div>
                </div>
              )
            }
          />
          <Route
            path="/sign-up/*"
            element={
              userId ? (
                <Navigate to="/" />
              ) : (
                <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
                  <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Join Skool
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">
                        Create your account with Gmail or email
                      </p>
                    </div>
                    <SignUp
                      appearance={{
                        elements: {
                          rootBox: "mx-auto",
                          card: "shadow-2xl border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800",
                          headerTitle:
                            "text-2xl font-bold text-gray-900 dark:text-white",
                          headerSubtitle: "text-gray-600 dark:text-gray-400",
                          socialButtonsBlockButton:
                            "bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition",
                          socialButtonsBlockButtonText:
                            "font-semibold text-base",
                          formButtonPrimary:
                            "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition",
                          footerActionLink:
                            "text-blue-600 hover:text-blue-700 font-semibold",
                          formFieldInput:
                            "border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500",
                        },
                      }}
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                      redirectUrl="/"
                    />
                  </div>
                </div>
              )
            }
          />
          <Route path="/login" element={<Navigate to="/sign-in" />} />
          <Route path="/register" element={<Navigate to="/sign-up" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  if (!clerkPubKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            ⚠️ Configuration Error
          </h1>
          <p className="text-gray-700 mb-2">Missing Clerk Publishable Key</p>
          <p className="text-sm text-gray-600">
            Please add{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              REACT_APP_CLERK_PUBLISHABLE_KEY
            </code>{" "}
            to your .env file
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ThemeProvider>
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </ClerkProvider>
  );
}

export default App;
