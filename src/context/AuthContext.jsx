import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/axios";

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

// Central place holding the logged-in user + their effective permissions.
// Login writes accessToken/user to localStorage directly (unchanged), then
// calls setAuthenticatedUser() so this context (and everything reading
// usePermissions()) picks it up immediately without a full page reload.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [isReady, setIsReady] = useState(false);

  // Re-fetches the caller's permissions from the backend (not the JWT), so
  // an admin editing a trainer's permissions takes effect on that trainer's
  // next page load/refresh without requiring them to log in again.
  const refreshPermissions = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      setIsReady(true);
      return;
    }

    try {
      const response = await api.get("/auth/me");

      setUser((current) => {
        const merged = {
          ...(current || {}),
          ...response.data,
        };

        localStorage.setItem(
          "user",
          JSON.stringify(merged)
        );

        return merged;
      });
    } catch {
      // Token invalid/expired — ProtectedRoute's own accessToken check
      // handles redirecting to login, nothing extra to do here.
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const setAuthenticatedUser = useCallback((nextUser) => {
    setUser(nextUser);
  }, []);

  const clearAuthenticatedUser = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        setAuthenticatedUser,
        clearAuthenticatedUser,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};
