const rateLimit = require("express-rate-limit");

const global = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 600,
  message: { success: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: "Too many auth attempts, please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many OTP requests. Please wait." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Optional route-level rate limiter for frequent non-auth endpoints
const productFeedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { success: false, message: "Too many product feed requests, please wait a minute." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { global, authLimiter, otpLimiter, productFeedLimiter };
