import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useAuth,
} from "@clerk/clerk-react";

// Import pages
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";

// Import components
import Sidebar from "./components/Sidebar";

// Import context
import { ThemeProvider } from "./context/ThemeContext";

// Clerk publishable key
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

// Protected Route Component
function ProtectedRoute({ children }) {
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

  if (!userId) {
    return <RedirectToSignIn />;
  }

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

  return (
    <div className="flex">
      {userId && <Sidebar />}
      <div className={userId ? "flex-1 ml-64" : "flex-1"}>
        <Routes>
          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
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
            path="/chat"
            element={
              <ProtectedRoute>
                <Chat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
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

          {/* Redirect logged in users away from sign in */}
          <Route
            path="/sign-in/*"
            element={userId ? <Navigate to="/" /> : <SignedOut />}
          />
          <Route
            path="/sign-up/*"
            element={userId ? <Navigate to="/" /> : <SignedOut />}
          />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  if (!clerkPubKey) {
    throw new Error("Missing Clerk Publishable Key");
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
