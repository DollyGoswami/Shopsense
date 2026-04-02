const express = require("express");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const axios   = require("axios");
const router  = express.Router();
const Product = require("../models/Product");
const User    = require("../models/User");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const ML_URL      = process.env.ML_SERVICE_URL      || "http://localhost:8001";
const SCRAPER_URL = process.env.SCRAPER_SERVICE_URL || "http://localhost:8002";

// ── Image upload config ───────────────────────────────────────────────────────
const imgUploadDir = path.join(__dirname, "../../uploads/search-images");
if (!fs.existsSync(imgUploadDir)) fs.mkdirSync(imgUploadDir, { recursive: true });

const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imgUploadDir),
  filename:    (req, file, cb) => cb(null, `search_${Date.now()}${path.extname(file.originalname)}`),
});
const imgUpload = multer({
  storage:  imgStorage,
  limits:   { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /image\/(jpeg|png|webp|jpg)/.test(file.mimetype);
    cb(ok ? null : new Error("Images only"), ok);
  },
});

// ── Text Search ───────────────────────────────────────────────────────────────
// GET /api/search?q=samsung+galaxy&trigger_scrape=true
router.get("/", optionalAuth, async (req, res) => {
  const { q, trigger_scrape = "true", page = 1, limit = 20 } = req.query;
  if (!q || q.trim().length < 3)
    return res.status(400).json({ success: false, message: "Query must be at least 3 characters" });

  const query = q.trim();

  // Save to user's search history
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        searchHistory: {
          $each:     [query],
          $slice:    -50,
          $position: 0,
        },
      },
    });
  }

  // Fetch from DB
  const filter   = { $text: { $search: query } };
  const skip     = (Number(page) - 1) * Number(limit);
  const total    = await Product.countDocuments(filter);
  const products = await Product.find(filter, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: "textScore" }, "scores.finalScore": -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  // If too few results, trigger live scraping in background
  if (trigger_scrape === "true" && products.length < 8) {
    axios.post(`${SCRAPER_URL}/scrape/search`, { query, pages: 1 }).catch(() => {});
  }

  res.json({
    success: true,
    query,
    total,
    page:    Number(page),
    pages:   Math.ceil(total / Number(limit)),
    products,
    scraping_triggered: trigger_scrape === "true" && products.length < 8,
  });
});

// ── Image Search ──────────────────────────────────────────────────────────────
// POST /api/search/image  (multipart/form-data, field: "image")
router.post("/image", optionalAuth, imgUpload.single("image"), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ success: false, message: "Image file required" });

  const imagePath = req.file.path;

  try {
    // Send image to ML service for category detection + visual similarity
    const formData = new (require("form-data"))();
    formData.append("image", fs.createReadStream(imagePath));

    const { data: mlResult } = await axios.post(`${ML_URL}/image-search`, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 15000,
    });

    const { detected_category, detected_keywords, similar_product_ids } = mlResult;

    // Find visually/semantically similar products from DB
    let products = [];

    if (similar_product_ids?.length) {
      products = await Product.find({ _id: { $in: similar_product_ids } }).lean();
    }

    // Fallback: search by detected keywords
    if (products.length < 3 && detected_keywords) {
      const textProducts = await Product.find({ $text: { $search: detected_keywords } })
        .sort({ "scores.finalScore": -1 })
        .limit(12)
        .lean();
      products = [...products, ...textProducts].slice(0, 12);
    }

    // Cleanup uploaded file
    fs.unlink(imagePath, () => {});

    return res.json({
      success: true,
      detected_category,
      detected_keywords,
      products,
    });

  } catch {
    // ML service unavailable — use mock keyword extraction from filename
    const keyword = path.basename(req.file.originalname, path.extname(req.file.originalname))
      .replace(/[_-]/g, " ");

    const products = await Product.find({ $text: { $search: keyword } })
      .sort({ "scores.finalScore": -1 })
      .limit(9)
      .lean();

    fs.unlink(imagePath, () => {});

    return res.json({
      success:            true,
      detected_category:  "Electronics",
      detected_keywords:  keyword,
      products,
      ml_fallback:        true,
    });
  }
});

// ── Autocomplete / suggestions ────────────────────────────────────────────────
// GET /api/search/suggest?q=sam
router.get("/suggest", async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2)
    return res.json({ success: true, suggestions: [] });

  const products = await Product.find(
    { name: { $regex: q, $options: "i" } },
    { name: 1, category: 1, _id: 0 }
  ).limit(8).lean();

  const suggestions = [...new Set(products.map((p) => p.name.split(" ").slice(0, 5).join(" ")))];
  res.json({ success: true, suggestions });
});

module.exports = router;
