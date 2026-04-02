/**
 * User Model
 * Supports: JWT login, Google OAuth, Phone/OTP login
 */
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    // ── Core ────────────────────────────────────────────────────────────────
    name:         { type: String, required: true, trim: true, maxlength: 100 },
    email:        { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    password:     { type: String, minlength: 6, select: false },
    phone:        { type: String, unique: true, sparse: true },

    // ── OAuth ────────────────────────────────────────────────────────────────
    googleId:     { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ["local", "google", "phone"], default: "local" },

    // ── Profile ──────────────────────────────────────────────────────────────
    avatar:       { type: String },
    gender:       { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    ageGroup:     { type: String, enum: ["under_18", "18_25", "26_35", "36_45", "45_plus"] },
    profession:   { type: String, trim: true, maxlength: 100 },
    budgetMin:    { type: Number, default: 0 },
    budgetMax:    { type: Number, default: 100000 },
    city:         { type: String, trim: true },
    language:     { type: String, default: "en" },

    // ── Preferences ──────────────────────────────────────────────────────────
    preferences: {
      categories:        { type: [String], default: [] },
      brands:            { type: [String], default: [] },
      emailNotifications:{ type: Boolean, default: true },
      smsNotifications:  { type: Boolean, default: true },
      whatsappNotifs:    { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      priceDropAlerts:   { type: Boolean, default: true },
      trendAlerts:       { type: Boolean, default: true },
      weeklyDigest:      { type: Boolean, default: false },
    },

    // ── Auth state ───────────────────────────────────────────────────────────
    isVerified:           { type: Boolean, default: false },
    emailVerifyToken:     { type: String, select: false },
    emailVerifyExpires:   { type: Date,   select: false },
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
    otpCode:              { type: String, select: false },
    otpExpires:           { type: Date,   select: false },
    otpAttempts:          { type: Number, default: 0 },

    // ── Activity ─────────────────────────────────────────────────────────────
    lastLogin:     { type: Date },
    loginCount:    { type: Number, default: 0 },
    searchHistory: { type: [String], default: [] },
    clickHistory:  [{ productId: String, source: String, clickedAt: Date }],
  },
  { timestamps: true }
);

// ── Password hashing ─────────────────────────────────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Methods ──────────────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerifyToken;
  delete obj.passwordResetToken;
  delete obj.otpCode;
  return obj;
};

// ── Indexes ──────────────────────────────────────────────────────────────────
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ googleId: 1 });

module.exports = mongoose.model("User", UserSchema);
