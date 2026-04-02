import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";
import toast from "react-hot-toast";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      authService.getMe()
        .then(({ data }) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    toast.success(`Welcome back, ${data.user.name.split(" ")[0]}! 👋`);
    return data.user;
  }, []);

  const signup = useCallback(async (formData) => {
    const { data } = await authService.signup(formData);
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    setUser(data.user);
    toast.success("Account created! 🎉");
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(() => {
    authService.googleLogin();
  }, []);

  // Called from /auth/callback?token=...&refresh=...
  const handleGoogleCallback = useCallback((accessToken, refreshToken) => {
    localStorage.setItem("accessToken",  accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    authService.getMe().then(({ data }) => {
      setUser(data.user);
      toast.success(`Welcome, ${data.user.name.split(" ")[0]}! 👋`);
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    toast.success("Signed out successfully");
    window.location.href = "/";
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, handleGoogleCallback, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
