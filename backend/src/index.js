/**
 * ShopSense AI — Express Server Entry Point
 */
require("dotenv").config();
require("express-async-errors");

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const path    = require("path");

const connectDB       = require("./config/db");
const passportConfig  = require("./config/passport");
const errorHandler    = require("./middleware/errorHandler");
const rateLimiter     = require("./middleware/rateLimiter");

// Routes
const authRoutes          = require("./routes/auth");
const userRoutes          = require("./routes/users");
const productRoutes       = require("./routes/products");
const recommendRoutes     = require("./routes/recommendations");
const notificationRoutes  = require("./routes/notifications");
const favoriteRoutes      = require("./routes/favorites");
const searchRoutes        = require("./routes/search");
const chatbotRoutes       = require("./routes/chatbot");

const app  = express();
const PORT = process.env.PORT || 5000;
const SCRAPER_SERVICE_URL = process.env.SCRAPER_SERVICE_URL || "http://localhost:8002";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";
const avatarUploadDirSetting = process.env.AVATAR_UPLOAD_DIR || "storage/avatars";
const avatarStorageDir = path.isAbsolute(avatarUploadDirSetting)
  ? avatarUploadDirSetting
  : path.join(__dirname, "../", avatarUploadDirSetting);
const avatarPublicBasePath = process.env.AVATAR_PUBLIC_BASE_PATH || "/media/avatars";



app.use('/uploads', express.static('uploads'));
app.use(avatarPublicBasePath, express.static(avatarStorageDir));


// ── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors({
  origin:      process.env.FRONTEND_URL || "http://localhost:3000"||"http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Passport (Google OAuth)
passportConfig(app);

// Global rate limiter
app.use(rateLimiter.global);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",           authRoutes);
app.use("/api/users",          userRoutes);
app.use("/api/products",       productRoutes);
app.use("/api/recommendations",recommendRoutes);
app.use("/api/notifications",  notificationRoutes);
app.use("/api/favorites",      favoriteRoutes);
app.use("/api/search",         searchRoutes);
app.use("/api/chatbot",        chatbotRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", env: process.env.NODE_ENV }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Error handler (must be last)
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ShopSense Backend running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Scraper:     ${SCRAPER_SERVICE_URL}`);
  console.log(`   ML Service:  ${ML_SERVICE_URL}\n`);
});

module.exports = app;
