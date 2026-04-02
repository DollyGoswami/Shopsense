const express  = require("express");
const passport = require("passport");
const router   = express.Router();

const auth = require("../controllers/authController");
const { protect }    = require("../middleware/authMiddleware");
const { authLimiter, otpLimiter } = require("../middleware/rateLimiter");

// ── Local Auth ────────────────────────────────────────────────────────────────
router.post("/signup",          authLimiter, auth.signup);
router.post("/login",           authLimiter, auth.login);
router.post("/refresh-token",   auth.refreshToken);
router.get ("/verify-email",    auth.verifyEmail);

// ── Password ──────────────────────────────────────────────────────────────────
router.post("/forgot-password", authLimiter, auth.forgotPassword);
router.post("/reset-password",  authLimiter, auth.resetPassword);
router.post("/change-password", protect,     auth.changePassword);

// ── Phone OTP ─────────────────────────────────────────────────────────────────
router.post("/send-otp",        otpLimiter, auth.sendPhoneOTP);
router.post("/verify-otp",      otpLimiter, auth.verifyPhoneOTP);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get(
  "/google",
  passport.authenticate("google", { session: false, scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_failed` }),
  auth.googleCallback
);

// ── Me ────────────────────────────────────────────────────────────────────────
router.get("/me", protect, auth.getMe);

module.exports = router;
