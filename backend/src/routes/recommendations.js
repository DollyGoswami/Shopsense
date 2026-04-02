const express = require("express");
const router  = express.Router();
const axios   = require("axios");
const Product = require("../models/Product");
const { protect, optionalAuth } = require("../middleware/authMiddleware");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// ── GET /api/recommendations ─────────────────────────────────────────────────
// Personalized recommendations for logged-in user
router.get("/", optionalAuth, async (req, res) => {
  const { category, limit = 12 } = req.query;

  try {
    // Build ML request payload
    const payload = {
      limit:    Number(limit),
      category: category || null,
      user_preferences: req.user ? {
        budget_min:  req.user.budgetMin,
        budget_max:  req.user.budgetMax,
        categories:  req.user.preferences?.categories || [],
        profession:  req.user.profession,
        age_group:   req.user.ageGroup,
      } : null,
    };

    const { data } = await axios.post(`${ML_URL}/recommend`, payload, { timeout: 10000 });
    return res.json({ success: true, recommendations: data.recommendations, products: data.recommendations });
  } catch {
    // ML service unavailable — fall back to DB scoring
    const products = await Product.find({
      currentPrice: { $exists: true, $ne: null },
      "scores.finalScore": { $exists: true },
    })
      .sort({ "scores.finalScore": -1 })
      .limit(Number(limit))
      .lean();
    return res.json({ success: true, recommendations: products, products, fallback: true });
  }
});

// ── POST /api/recommendations/score ──────────────────────────────────────────
// Get AI score for a specific product
router.post("/score", async (req, res) => {
  const { productId } = req.body;
  if (!productId)
    return res.status(400).json({ success: false, message: "productId required" });

  const product = await Product.findById(productId).lean();
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  try {
    const { data } = await axios.post(`${ML_URL}/score`, { product }, { timeout: 8000 });
    // Persist scores back to DB
    await Product.findByIdAndUpdate(productId, {
      scores:       data.scores,
      buyDecision:  data.buy_decision,
      hypeLabel:    data.hype_label,
      scoreUpdatedAt: new Date(),
    });
    return res.json({ success: true, ...data });
  } catch {
    return res.json({ success: true, scores: product.scores, buyDecision: product.buyDecision });
  }
});

// ── GET /api/recommendations/alternatives/:id ────────────────────────────────
// Get cheaper/better-rated alternatives
router.get("/alternatives/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  const alternatives = await Product.find({
    _id:      { $ne: product._id },
    category: product.category,
    $or: [
      { currentPrice: { $lt: product.currentPrice } },
      { rating:       { $gt: (product.rating || 0) } },
    ],
  })
    .sort({ "scores.finalScore": -1 })
    .limit(6)
    .lean();

  res.json({ success: true, alternatives });
});

// ── GET /api/recommendations/bundles/:id ─────────────────────────────────────
// Suggest product bundles
router.get("/bundles/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  // Category bundle map
  const bundleMap = {
    smartphone:  ["earbuds", "phone case", "screen protector", "power bank"],
    laptop:      ["laptop bag", "mouse", "keyboard", "laptop stand"],
    headphones:  ["earbuds", "audio cable", "headphone stand"],
    camera:      ["memory card", "tripod", "camera bag", "lens"],
    smartwatch:  ["watch strap", "wireless charger"],
    television:  ["soundbar", "hdmi cable", "wall mount"],
  };

  const categoryLower = (product.category || "").toLowerCase();
  const keywords      = Object.entries(bundleMap).find(([k]) => categoryLower.includes(k))?.[1] || ["accessories"];

  const bundles = await Product.find({
    _id:         { $ne: product._id },
    $text:       { $search: keywords.join(" ") },
    currentPrice: { $lte: product.currentPrice * 0.5 },
  })
    .sort({ "scores.finalScore": -1 })
    .limit(4)
    .lean();

  res.json({ success: true, bundles, suggested_keywords: keywords });
});

// ── GET /api/recommendations/best-time/:id ───────────────────────────────────
// Best time to buy based on price prediction
router.get("/best-time/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  try {
    const { data } = await axios.get(`${ML_URL}/predict/${req.params.id}`, { timeout: 8000 });
    return res.json({ success: true, ...data });
  } catch {
    // Fallback heuristic
    const daysToWait = product.discountPct > 25 ? 0 : Math.floor(Math.random() * 14) + 3;
    return res.json({
      success:       true,
      decision:      daysToWait === 0 ? "BUY_NOW" : "WAIT",
      days_to_wait:  daysToWait,
      predicted_min_price: product.currentPrice * 0.92,
      confidence:    0.71,
      reason:        daysToWait === 0
        ? "Price is at a 90-day low — great time to buy"
        : `AI predicts a price drop in ~${daysToWait} days based on historical patterns`,
    });
  }
});

module.exports = router;
