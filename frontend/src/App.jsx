import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth }   from "./context/AuthContext";
import LandingPage   from "./pages/LandingPage";
import AuthPage      from "./pages/AuthPage";
import AppLayout     from "./pages/AppLayout";

// Phase: landing → auth → app
export default function App() {
  const { user, loading } = useAuth();

  // Determine initial phase from auth state
  const [phase, setPhase] = useState(() => {
    // If already logged in from a previous session, skip landing
    const token = localStorage.getItem("accessToken");
    return token ? "app" : "landing";
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="w-10 h-10 rounded-full border-4 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  // If user is already logged in (from context), go straight to app
  if (user && phase !== "app") setPhase("app");

  return (
    <AnimatePresence mode="wait">
      {phase === "landing" && (
        <motion.div
          key="landing"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
        >
          <LandingPage
  onGetStarted={() => setPhase("auth")}   // "Get Started" button → goes to Login page
  onDemo={() => setPhase("app")}           // "Watch Demo" button → goes straight to Dashboard
/>
        </motion.div>
      )}

      {phase === "auth" && (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        ><AuthPage
  onSuccess={() => setPhase("app")}
  onBack={() => setPhase("landing")}   // ← added this
/>
        </motion.div>
      )}

      
      {phase === "app" && (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="min-h-screen"
        >
          <AppLayout />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
