import React, { createContext, useContext, useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { setAuthState, logout } from "../redux/slices/authSlice";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);

  // Initialize user from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid by fetching user profile
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/profile/me`,
            {
              headers: { Authorization: `Bearer ${storedToken}` },
            }
          );

          if (response.data.user) {
            dispatch(
              setAuthState({
                user: response.data.user,
                token: storedToken,
              })
            );
          }
        } catch (error) {
          // Token is invalid, clear auth
          console.error("Failed to verify token:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          dispatch(logout());
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [dispatch]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/login`,
        { email, password }
      );

      if (response.data.token && response.data.user) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        dispatch(
          setAuthState({
            user: response.data.user,
            token: response.data.token,
          })
        );

        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/auth/register`,
        userData
      );

      if (response.data.token && response.data.user) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        dispatch(
          setAuthState({
            user: response.data.user,
            token: response.data.token,
          })
        );

        return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const updateUser = (updatedUser) => {
    dispatch(setAuthState({ user: updatedUser, token }));
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(logout());
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    updateUser,
    logout: logoutUser,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
