/**
 * Auth Controller
 * Handles: signup, login, Google OAuth, phone OTP, forgot/reset password, refresh token
 */
const crypto = require("crypto");
const User   = require("../models/User");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../services/jwtService");
const { sendVerificationEmail, sendPasswordResetEmail, sendOTPEmail }   = require("../services/emailService");
const { sendOTPSMS, sendWhatsAppOTP } = require("../services/smsService");

// ── Helpers ──────────────────────────────────────────────────────────────────
const generateOTP  = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashToken    = (t) => crypto.createHash("sha256").update(t).digest("hex");
const sendTokens   = (res, user, status = 200) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  res.status(status).json({
    success: true,
    accessToken,
    refreshToken,
    user: user.toPublicJSON(),
  });
};

// ── Signup ────────────────────────────────────────────────────────────────────
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "Name, email and password are required" });

  const existing = await User.findOne({ email });
  if (existing)
    return res.status(409).json({ success: false, message: "Email already registered" });

  // Generate email verification token
  const rawToken  = crypto.randomBytes(32).toString("hex");
  const hashTok   = hashToken(rawToken);

  const user = await User.create({
    name,
    email,
    password,
    authProvider:       "local",
    emailVerifyToken:   hashTok,
    emailVerifyExpires: Date.now() + 24 * 60 * 60 * 1000,  // 24 hours
  });

  // Send verification email (non-blocking)
  sendVerificationEmail(email, name, rawToken).catch(console.error);

  sendTokens(res, user, 201);
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password are required" });

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: "Invalid email or password" });

  user.lastLogin  = new Date();
  user.loginCount += 1;
  await user.save({ validateBeforeSave: false });

  sendTokens(res, user);
};

// ── Google OAuth callback ─────────────────────────────────────────────────────
exports.googleCallback = async (req, res) => {
  const accessToken  = generateAccessToken(req.user._id);
  const refreshToken = generateRefreshToken(req.user._id);
  // Redirect frontend with tokens
  const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}`;
  res.redirect(redirectUrl);
};

// ── Phone — Send OTP ──────────────────────────────────────────────────────────
exports.sendPhoneOTP = async (req, res) => {
  const { phone } = req.body;
  if (!phone)
    return res.status(400).json({ success: false, message: "Phone number required" });

  const otp     = generateOTP();
  const expires = Date.now() + 10 * 60 * 1000;  // 10 minutes

  // Upsert user by phone
  await User.findOneAndUpdate(
    { phone },
    { phone, otpCode: otp, otpExpires: expires, otpAttempts: 0, authProvider: "phone" },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendOTPSMS(phone, otp);

  // In development, return OTP for testing
  const devOTP = process.env.NODE_ENV === "development" ? { otp } : {};

  res.json({ success: true, message: "OTP sent successfully", ...devOTP });
};

// ── Phone — Verify OTP ────────────────────────────────────────────────────────
exports.verifyPhoneOTP = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp)
    return res.status(400).json({ success: false, message: "Phone and OTP required" });

  const user = await User.findOne({ phone }).select("+otpCode +otpExpires +otpAttempts");
  if (!user)
    return res.status(404).json({ success: false, message: "Phone number not registered" });

  if (user.otpAttempts >= 5)
    return res.status(429).json({ success: false, message: "Too many attempts. Request a new OTP." });

  if (!user.otpCode || user.otpExpires < Date.now()) {
    return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
  }

  if (user.otpCode !== otp) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    return res.status(400).json({ success: false, message: "Incorrect OTP" });
  }

  // Clear OTP fields
  user.otpCode    = undefined;
  user.otpExpires = undefined;
  user.isVerified = true;
  user.lastLogin  = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokens(res, user);
};
