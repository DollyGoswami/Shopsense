// AuthPage.jsx
// Premium dark luxury auth — matches LandingPage.jsx aesthetic
// Fonts: Bebas Neue + DM Sans + DM Serif Display (same as landing)
// Dependencies: framer-motion, react-i18next, lucide-react, react-hot-toast

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// ─── Design tokens (same as LandingPage) ─────────────────────────────────────
const T = {
  ink:     "#0a0a0f",
  ink2:    "#12121a",
  ink3:    "#1c1c2a",
  smoke:   "#f5f3ee",
  gold:    "#c8a96e",
  gold2:   "#e8c98e",
  border:  "rgba(200,169,110,.18)",
  border2: "rgba(200,169,110,.32)",
  muted:   "rgba(245,243,238,.45)",
  dim:     "rgba(245,243,238,.25)",
  accent:  "#a78bfa",
  ease:    [0.16, 1, 0.3, 1],
};

// ─── Slide transition ─────────────────────────────────────────────────────────
const slide = {
  initial:    { opacity: 0, x: 32 },
  animate:    { opacity: 1, x: 0  },
  exit:       { opacity: 0, x: -32 },
  transition: { duration: 0.28, ease: T.ease },
};

// ─── Reusable styled primitives ───────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontSize: ".65rem", letterSpacing: ".15em", textTransform: "uppercase", color: T.muted, marginBottom: ".5rem", fontFamily: "'DM Sans',sans-serif" }}>
      {children}
    </div>
  );
}

function Input({ type = "text", placeholder, value, onChange, onKeyDown, right, autoFocus }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%",
          boxSizing: "border-box", 
          background: "rgba(200,169,110,.04)",
          border: `1px solid ${focused ? T.border2 : T.border}`,
          borderRadius: 6,
          padding: right ? ".85rem 2.75rem .85rem 1rem" : ".85rem 1rem",
          fontFamily: "'DM Sans',sans-serif",
          fontSize: ".875rem",
          color: T.smoke,
          outline: "none",
          transition: "border-color .2s",
          boxShadow: focused ? `0 0 0 3px rgba(200,169,110,.07)` : "none",
        }}
      />
      {right && (
        <div style={{ position: "absolute", right: "0.875rem", top: "50%", transform: "translateY(-50%)" }}>
          {right}
        </div>
      )}
    </div>
  );
}

function GoldButton({ children, onClick, disabled, loading }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled ? { y: -2, boxShadow: "0 10px 30px rgba(200,169,110,.25)" } : {}}
      whileTap={!disabled ? { scale: .98 } : {}}
      style={{
        width: "100%",
        background: disabled ? "rgba(200,169,110,.3)" : T.gold,
        color: T.ink,
        border: "none",
        borderRadius: 6,
        padding: ".9rem",
        fontFamily: "'DM Sans',sans-serif",
        fontSize: ".8rem",
        fontWeight: 600,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: ".5rem",
        transition: "background .2s",
      }}
    >
      {loading ? <Spinner /> : children}
    </motion.button>
  );
}

function OutlineButton({ children, onClick, icon }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      whileTap={{ scale: .98 }}
      style={{
        width: "100%",
        background: hov ? "rgba(200,169,110,.05)" : "transparent",
        border: `1px solid ${hov ? T.border2 : T.border}`,
        borderRadius: 6,
        padding: ".8rem",
        fontFamily: "'DM Sans',sans-serif",
        fontSize: ".8rem",
        color: hov ? T.gold : T.muted,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: ".625rem",
        transition: "all .2s",
        letterSpacing: ".04em",
      }}
    >
      {icon && <span style={{ fontSize: "1rem" }}>{icon}</span>}
      {children}
    </motion.button>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ flex: 1, height: 1, background: T.border }} />
      <span style={{ fontSize: ".65rem", letterSpacing: ".12em", textTransform: "uppercase", color: T.dim, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 16, height: 16, border: `2px solid ${T.ink}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
  );
}

function BackButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: -2 }}
      style={{ display: "flex", alignItems: "center", gap: ".4rem", background: "none", border: "none", cursor: "pointer", color: T.dim, fontSize: ".75rem", letterSpacing: ".08em", marginBottom: "1.5rem", fontFamily: "'DM Sans',sans-serif" }}
    >
      <ArrowLeft size={13} /> Back
    </motion.button>
  );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OTPInput({ onComplete, loading }) {
  const refs = Array.from({ length: 6 }, () => useRef());
  const [vals, setVals] = useState(["","","","","",""]);

  const update = (i, v) => {
    const next = [...vals];
    next[i] = v.replace(/\D/g, "").slice(-1);
    setVals(next);
    if (v && i < 5) refs[i + 1].current?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  };
  const onKey = (i, e) => {
    if (e.key === "Backspace" && !vals[i] && i > 0) refs[i - 1].current?.focus();
  };

  return (
    <div style={{ display: "flex", gap: ".5rem", justifyContent: "center", margin: "1.5rem 0" }}>
      {refs.map((ref, i) => (
        <motion.input
          key={i}
          ref={ref}
          maxLength={1}
          value={vals[i]}
          disabled={loading}
          onChange={e => update(i, e.target.value)}
          onKeyDown={e => onKey(i, e)}
          autoFocus={i === 0}
          whileFocus={{ borderColor: T.border2, boxShadow: `0 0 0 3px rgba(200,169,110,.08)` }}
          style={{
            width: 44, height: 52,
            textAlign: "center",
            fontFamily: "'DM Serif Display',serif",
            fontSize: "1.3rem",
            background: "rgba(200,169,110,.04)",
            border: `1px solid ${vals[i] ? T.border2 : T.border}`,
            borderRadius: 8,
            color: T.gold,
            outline: "none",
            transition: "border-color .2s, box-shadow .2s",
          }}
        />
      ))}
    </div>
  );
}

// ─── Gender selector ──────────────────────────────────────────────────────────
function GenderPicker({ value, onChange }) {
  const OPTIONS = [["male", "♂", "Male"], ["female", "♀", "Female"], ["other", "⚧", "Other"]];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".5rem" }}>
      {OPTIONS.map(([val, sym, lbl]) => {
        const active = value === val;
        return (
          <motion.button
            key={val}
            onClick={() => onChange(val)}
            whileTap={{ scale: .96 }}
            style={{
              padding: ".65rem .5rem",
              background: active ? "rgba(200,169,110,.1)" : "transparent",
              border: `1px solid ${active ? T.border2 : T.border}`,
              borderRadius: 6,
              cursor: "pointer",
              color: active ? T.gold : T.muted,
              fontSize: ".8rem",
              fontFamily: "'DM Sans',sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".3rem",
              transition: "all .2s",
            }}
          >
            <span>{sym}</span> {lbl}
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: ".4rem", justifyContent: "center", marginBottom: "2rem" }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 20 : 6, background: i === current ? T.gold : T.border2 }}
          style={{ height: 4, borderRadius: 2 }}
          transition={{ duration: .3 }}
        />
      ))}
    </div>
  );
}

// ─── Select field ─────────────────────────────────────────────────────────────
function SelectField({ value, onChange, placeholder, options }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        background: "rgba(200,169,110,.04)",
        border: `1px solid ${focused ? T.border2 : T.border}`,
        borderRadius: 6,
        padding: ".85rem 1rem",
        fontFamily: "'DM Sans',sans-serif",
        fontSize: ".875rem",
        color: value ? T.smoke : T.dim,
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        boxShadow: focused ? `0 0 0 3px rgba(200,169,110,.07)` : "none",
        transition: "border-color .2s",
      }}
    >
      <option value="" style={{ background: T.ink2 }}>{placeholder}</option>
      {options.map(([val, lbl]) => (
        <option key={val} value={val} style={{ background: T.ink2, color: T.smoke }}>{lbl}</option>
      ))}
    </select>
  );
}

// ─── Animated background ──────────────────────────────────────────────────────
function AuthBackground() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
      {/* Base */}
      <div style={{ position: "absolute", inset: 0, background: T.ink }} />
      {/* Radial glows */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 20% 50%, rgba(200,169,110,.06) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 40% 60% at 80% 30%, rgba(167,139,250,.04) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 60% 80%, rgba(224,90,43,.03) 0%, transparent 60%)" }} />
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(200,169,110,.03) 1px,transparent 1px), linear-gradient(90deg,rgba(200,169,110,.03) 1px,transparent 1px)",
        backgroundSize: "60px 60px",
        maskImage: "radial-gradient(ellipse at center, black 10%, transparent 75%)",
      }} />
    </div>
  );
}

// ─── Left panel (branding) ────────────────────────────────────────────────────
function LeftPanel() {
  const FEATURES = [
    { icon: "📉", text: "Real-time prices from 6+ platforms" },
    { icon: "🧠", text: "BERT AI sentiment analysis" },
    { icon: "🔮", text: "LSTM price prediction (87% accuracy)" },
    { icon: "🔔", text: "WhatsApp, SMS & email alerts" },
    { icon: "💎", text: "Hidden gem product detector" },
  ];

  return (
    <div style={{ flex: 1, padding: "4rem", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", zIndex: 1 }}>
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .7, ease: T.ease }}
        style={{ marginBottom: "3.5rem" }}
      >
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.8rem", letterSpacing: ".12em", color: T.gold }}>
          ShopSense <span style={{ color: T.smoke, opacity: .6 }}>AI</span>
        </div>
      </motion.div>

      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: .8, ease: T.ease, delay: .15 }}
      >
        <h2 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "clamp(2rem,3.5vw,2.8rem)", lineHeight: 1.15, marginBottom: "1rem" }}>
          Shop smarter.<br />
          <em style={{ color: T.gold }}>Save more.</em>
        </h2>
        <p style={{ fontSize: ".9rem", color: T.muted, lineHeight: 1.7, fontWeight: 300, maxWidth: 340, marginBottom: "2.5rem" }}>
          India's most intelligent price tracking platform — powered by real-time data and machine learning.
        </p>
      </motion.div>

      {/* Feature list */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".875rem" }}>
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: .6, ease: T.ease, delay: .3 + i * .1 }}
            style={{ display: "flex", alignItems: "center", gap: ".875rem" }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(200,169,110,.08)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".95rem", flexShrink: 0 }}>
              {f.icon}
            </div>
            <span style={{ fontSize: ".85rem", color: T.muted, fontWeight: 300 }}>{f.text}</span>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: .9, duration: .6 }}
        style={{ display: "flex", gap: "2rem", marginTop: "3rem", paddingTop: "2rem", borderTop: `1px solid ${T.border}` }}
      >
        {[["₹2.4Cr+","Saved"], ["6","Platforms"], ["87%","Accuracy"]].map(([n, l]) => (
          <div key={l}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.4rem", color: T.gold, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: ".65rem", letterSpacing: ".1em", textTransform: "uppercase", color: T.dim, marginTop: ".2rem" }}>{l}</div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Main Auth Page ───────────────────────────────────────────────────────────
export default function AuthPage({ onSuccess, onBack }) {
  const { login, signup, loginWithGoogle } = useAuth();
  const [step,    setStep]    = useState("login");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    gender: "", ageGroup: "", profession: "", budgetMax: 50000,
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Inject fonts
  useEffect(() => {
    const id = "auth-fonts";
    if (!document.getElementById(id)) {
      const l = document.createElement("link");
      l.id = id; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap";
      document.head.appendChild(l);
    }
    // Inject spinner keyframe
    if (!document.getElementById("auth-spin")) {
      const s = document.createElement("style");
      s.id = "auth-spin";
      s.textContent = "@keyframes spin { to { transform: rotate(360deg) } }";
      document.head.appendChild(s);
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!form.email || !form.password) return toast.error("Email and password required");
    setLoading(true);
    try {
      await login(form.email, form.password);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials");
    } finally { setLoading(false); }
  };

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) return toast.error("All fields required");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await signup({ name: form.name, email: form.email, password: form.password });
      setStep("profile");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!form.email) return toast.error("Enter your email first");
    setLoading(true);
    try {
      const { authService } = await import("../services/authService");
      await authService.forgotPassword(form.email);
      toast.success("Reset link sent! Check your inbox.");
      setStep("login");
    } catch { toast.error("Failed to send reset link"); }
    finally { setLoading(false); }
  };

  const handleSendOTP = async () => {
    if (form.phone.length < 10) return toast.error("Enter a valid 10-digit number");
    setLoading(true);
    try {
      const { authService } = await import("../services/authService");
      await authService.sendOTP(form.phone);
      toast.success("OTP sent to +91 " + form.phone);
      setStep("otp");
    } catch { toast.error("Failed to send OTP"); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async (otp) => {
    setLoading(true);
    try {
      const { authService } = await import("../services/authService");
      const { data } = await authService.verifyOTP(form.phone, otp);
      localStorage.setItem("accessToken",  data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      toast.success("Verified! Welcome 🎉");
      onSuccess?.();
    } catch { toast.error("Incorrect OTP — try again"); }
    finally { setLoading(false); }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
      const { userService } = await import("../services/authService");
      await userService.updateProfile({ gender: form.gender, ageGroup: form.ageGroup, profession: form.profession, budgetMax: form.budgetMax });
      toast.success("Profile saved!");
    } catch { /* non-fatal */ }
    finally { setLoading(false); onSuccess?.(); }
  };

  // ── Step renderer ────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── LOGIN ─────────────────────────────────────────────────────────────
      case "login": return (
        <motion.div key="login" {...slide}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "rgba(200,169,110,.05)", border: `1px solid ${T.border}`, borderRadius: 8, padding: 4, gap: 4, marginBottom: "2rem" }}>
            {[["login","Login"],["signup","Sign Up"]].map(([s, l]) => (
              <motion.button key={s} onClick={() => setStep(s)}
                animate={{ background: step === s ? "rgba(200,169,110,.12)" : "transparent", color: step === s ? T.gold : T.muted, borderColor: step === s ? T.border2 : "transparent" }}
                style={{ flex: 1, padding: ".6rem", borderRadius: 6, fontSize: ".8rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, cursor: "pointer", border: "1px solid transparent", letterSpacing: ".04em", transition: "all .2s" }}
              >
                {l}
              </motion.button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="you@email.com" value={form.email} autoFocus onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
                <Label>Password</Label>
                <button onClick={() => setStep("forgot")} style={{ fontSize: ".7rem", color: T.accent, background: "none", border: "none", cursor: "pointer", letterSpacing: ".04em", fontFamily: "'DM Sans',sans-serif" }}>
                  Forgot password?
                </button>
              </div>
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                right={
                  <button onClick={() => setShowPwd(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>

            <GoldButton onClick={handleLogin} loading={loading}>
              Sign In <ChevronRight size={14} />
            </GoldButton>

            <Divider label="or continue with" />

            <OutlineButton onClick={loginWithGoogle} icon="🌐">Continue with Google</OutlineButton>
            <OutlineButton onClick={() => setStep("phone")} icon="📱">Continue with Phone</OutlineButton>
          </div>
        </motion.div>
      );

      // ── SIGNUP ────────────────────────────────────────────────────────────
      case "signup": return (
        <motion.div key="signup" {...slide}>
          {/* Tabs */}
          <div style={{ display: "flex", background: "rgba(200,169,110,.05)", border: `1px solid ${T.border}`, borderRadius: 8, padding: 4, gap: 4, marginBottom: "2rem" }}>
            {[["login","Login"],["signup","Sign Up"]].map(([s, l]) => (
              <motion.button key={s} onClick={() => setStep(s)}
                animate={{ background: step === s ? "rgba(200,169,110,.12)" : "transparent", color: step === s ? T.gold : T.muted, borderColor: step === s ? T.border2 : "transparent" }}
                style={{ flex: 1, padding: ".6rem", borderRadius: 6, fontSize: ".8rem", fontFamily: "'DM Sans',sans-serif", fontWeight: 500, cursor: "pointer", border: "1px solid transparent", letterSpacing: ".04em", transition: "all .2s" }}
              >
                {l}
              </motion.button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <Label>Full Name</Label>
              <Input placeholder="Aryan Sharma" value={form.name} autoFocus onChange={e => set("name", e.target.value)} />
            </div>
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="you@email.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type={showPwd ? "text" : "password"}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignup()}
                right={
                  <button onClick={() => setShowPwd(p => !p)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, display: "flex", alignItems: "center" }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </div>

            <GoldButton onClick={handleSignup} loading={loading}>
              Create Account <ChevronRight size={14} />
            </GoldButton>

            <Divider label="or" />
            <OutlineButton onClick={loginWithGoogle} icon="🌐">Continue with Google</OutlineButton>
          </div>
        </motion.div>
      );

      // ── FORGOT PASSWORD ───────────────────────────────────────────────────
      case "forgot": return (
        <motion.div key="forgot" {...slide}>
          <BackButton onClick={() => setStep("login")} />
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(200,169,110,.08)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1.25rem" }}>🔐</div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.5rem", marginBottom: ".5rem" }}>Reset Password</h3>
            <p style={{ fontSize: ".85rem", color: T.muted, lineHeight: 1.6, fontWeight: 300 }}>Enter your email and we'll send you a secure reset link.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="you@email.com" value={form.email} autoFocus onChange={e => set("email", e.target.value)} onKeyDown={e => e.key === "Enter" && handleForgot()} />
            </div>
            <GoldButton onClick={handleForgot} loading={loading}>Send Reset Link</GoldButton>
          </div>
        </motion.div>
      );

      // ── PHONE LOGIN ───────────────────────────────────────────────────────
      case "phone": return (
        <motion.div key="phone" {...slide}>
          <BackButton onClick={() => setStep("login")} />
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(200,169,110,.08)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1.25rem" }}>📱</div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.5rem", marginBottom: ".5rem" }}>Phone Login</h3>
            <p style={{ fontSize: ".85rem", color: T.muted, fontWeight: 300 }}>We'll send a 6-digit OTP to your number.</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <Label>Mobile Number</Label>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: ".4rem", background: "rgba(200,169,110,.04)", border: `1px solid ${T.border}`, borderRadius: 6, padding: ".85rem .875rem", fontSize: ".85rem", color: T.muted, flexShrink: 0 }}>
                  🇮🇳 <span>+91</span>
                </div>
                <Input
                  type="tel"
                  placeholder="98765 43210"
                  value={form.phone}
                  autoFocus
                  onChange={e => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                />
              </div>
            </div>
            <GoldButton onClick={handleSendOTP} loading={loading} disabled={form.phone.length < 10}>
              Send OTP
            </GoldButton>
          </div>
        </motion.div>
      );

      // ── OTP VERIFY ────────────────────────────────────────────────────────
      case "otp": return (
        <motion.div key="otp" {...slide}>
          <BackButton onClick={() => setStep("phone")} />
          <div style={{ textAlign: "center", marginBottom: ".5rem" }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(200,169,110,.08)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 1.25rem" }}>🔢</div>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.5rem", marginBottom: ".5rem" }}>Enter OTP</h3>
            <p style={{ fontSize: ".85rem", color: T.muted, fontWeight: 300 }}>
              Sent to <span style={{ color: T.gold }}>+91 {form.phone}</span>
            </p>
          </div>

          <OTPInput onComplete={handleVerifyOTP} loading={loading} />

          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".5rem", color: T.muted, fontSize: ".85rem", marginBottom: "1rem" }}>
              <Spinner /> Verifying...
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
            <span style={{ fontSize: ".8rem", color: T.dim }}>Didn't receive it?</span>
            <button
              onClick={handleSendOTP}
              style={{ fontSize: ".8rem", color: T.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
            >
              Resend OTP
            </button>
          </div>
        </motion.div>
      );

      // ── PROFILE SETUP ─────────────────────────────────────────────────────
      case "profile": return (
        <motion.div key="profile" {...slide}>
          <StepDots total={2} current={1} />

          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.5rem", marginBottom: ".5rem" }}>
              Tell us about <em style={{ color: T.gold }}>yourself</em>
            </h3>
            <p style={{ fontSize: ".85rem", color: T.muted, fontWeight: 300 }}>Personalize your AI recommendations</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <Label>Gender</Label>
              <GenderPicker value={form.gender} onChange={v => set("gender", v)} />
            </div>
            <div>
              <Label>Age Group</Label>
              <SelectField
                value={form.ageGroup}
                onChange={e => set("ageGroup", e.target.value)}
                placeholder="Select your age group"
                options={[["under_18","Under 18"],["18_25","18–25"],["26_35","26–35"],["36_45","36–45"],["45_plus","45+"]]}
              />
            </div>
            <div>
              <Label>Profession</Label>
              <SelectField
                value={form.profession}
                onChange={e => set("profession", e.target.value)}
                placeholder="What do you do?"
                options={[["Student","Student"],["Software Engineer","Software Engineer"],["Business Owner","Business Owner"],["Doctor","Doctor"],["Teacher","Teacher"],["Freelancer","Freelancer"],["Other","Other"]]}
              />
            </div>
            <div>
              <Label>Budget Range</Label>
              <SelectField
                value={form.budgetMax}
                onChange={e => set("budgetMax", Number(e.target.value))}
                placeholder="Your typical budget"
                options={[[10000,"Under ₹10,000"],[50000,"₹10k – ₹50k"],[100000,"₹50k – ₹1 Lakh"],[200000,"₹1L – ₹2 Lakhs"],[9999999,"Above ₹2 Lakhs"]]}
              />
            </div>

            <GoldButton onClick={handleProfileSave} loading={loading}>
              Start Shopping <ChevronRight size={14} />
            </GoldButton>

            <button
              onClick={onSuccess}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.dim, fontSize: ".8rem", fontFamily: "'DM Sans',sans-serif", letterSpacing: ".06em", textAlign: "center" }}
            >
              Skip for now →
            </button>
          </div>
        </motion.div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "'DM Sans',sans-serif", position: "relative" }}>
      <AuthBackground />

      {/* Left branding panel — hidden on mobile */}
      <div style={{ flex: 1, display: "flex", position: "relative", zIndex: 1, borderRight: `1px solid ${T.border}` }}
        className="hidden lg:flex"
      >
        <LeftPanel />
      </div>

      {/* Right auth panel */}
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", justifyContent: "center", padding: "3rem 3.5rem", position: "relative", zIndex: 1 }}>

        {/* ── Back to landing ── */}
        <motion.button
          onClick={onBack}
          whileHover={{ x: -3, color: T.gold }}
          style={{
            display: "flex", alignItems: "center", gap: ".5rem",
            background: "none", border: "none", cursor: "pointer",
            color: T.muted, fontSize: ".75rem", letterSpacing: ".1em",
            textTransform: "uppercase", fontFamily: "'DM Sans',sans-serif",
            marginBottom: "2rem", alignSelf: "flex-start",
            transition: "color .2s",
          }}
        >
          <ArrowLeft size={14} />
          Back to Home
        </motion.button>

        {/* Mobile logo */}
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "1.5rem", letterSpacing: ".12em", color: T.gold, marginBottom: "2.5rem" }}
          className="lg:hidden"
        >
          ShopSense <span style={{ color: T.smoke, opacity: .6 }}>AI</span>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(18,18,26,.8)", border: `1px solid ${T.border}`, borderRadius: 16, padding: "2.5rem", backdropFilter: "blur(24px)", boxShadow: "0 24px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(200,169,110,.06)" }}>
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>

        {/* Footer note */}
        <p style={{ fontSize: ".72rem", color: T.dim, textAlign: "center", marginTop: "1.5rem", letterSpacing: ".06em", lineHeight: 1.6 }}>
          By signing up you agree to our{" "}
          <a href="#" style={{ color: T.gold, textDecoration: "none" }}>Terms</a>{" "}and{" "}
          <a href="#" style={{ color: T.gold, textDecoration: "none" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
