import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  MenuBook,
  NotificationsActive,
  Settings,
  Logout,
  DarkMode,
  LightMode,
  Person,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import { useTheme } from "../context/ThemeContext";

const Sidebar = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const { user } = useSelector((state) => state.auth);

  const menuItems = [
    {
      label: "Home",
      icon: <Home className="w-6 h-6" />,
      path: "/",
      exact: true,
    },
    {
      label: "Courses",
      icon: <MenuBook className="w-6 h-6" />,
      path: "/courses",
    },
    {
      label: "Notifications",
      icon: <NotificationsActive className="w-6 h-6" />,
      path: "/notifications",
    },
  ];

  const isActive = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-colors">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Skool
          </h1>
        </div>
      </div>

      {/* User Profile Section */}
      {user && (
        <div
          onClick={() => navigate("/profile")}
          className="p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            {user.profilePicture ? (
              <img
                src={`${process.env.REACT_APP_API_URL.replace("/api", "")}${
                  user.profilePicture
                }`}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-12 h-12 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {user.firstName?.charAt(0)}
                {user.lastName?.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6">
        <div className="px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path, item.exact)
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-2">
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {darkMode ? (
            <>
              <LightMode className="text-xl" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <DarkMode className="text-xl" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
        <Link
          to="/profile"
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Person className="text-xl" />
          <span>Profile</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Logout className="text-xl" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
