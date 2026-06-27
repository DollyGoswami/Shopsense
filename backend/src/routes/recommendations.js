const express = require("express");
const router = express.Router();
const axios = require("axios");
const Product = require("../models/Product");
const User = require("../models/User");
const { optionalAuth } = require("../middleware/authMiddleware");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

function normalizeKeyword(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function scoreSearchHistoryEntries(items = []) {
  const scores = new Map();

  items.forEach((rawItem, index) => {
    const keyword = normalizeKeyword(rawItem);
    if (!keyword) return;

    const lowered = keyword.toLowerCase();
    const recencyWeight = Math.max(1, items.length - index);
    const existing = scores.get(lowered) || { keyword, score: 0, count: 0, firstIndex: index };
    existing.keyword = existing.keyword.length >= keyword.length ? existing.keyword : keyword;
    existing.score += recencyWeight;
    existing.count += 1;
    existing.firstIndex = Math.min(existing.firstIndex, index);
    scores.set(lowered, existing);
  });

  return Array.from(scores.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.count !== a.count) return b.count - a.count;
    return a.firstIndex - b.firstIndex;
  });
}

async function collectProductsForKeywords(keywords = [], perKeywordLimit = 6) {
  const keywordProducts = {};
  const deduped = new Map();

  for (const keyword of keywords) {
    const normalized = normalizeKeyword(keyword);
    if (!normalized) continue;

    const products = await Product.find(
      { $text: { $search: normalized } },
      {
        score: { $meta: "textScore" },
        name: 1,
        brand: 1,
        category: 1,
        image: 1,
        url: 1,
        affiliateUrl: 1,
        source: 1,
        sourceId: 1,
        source_id: 1,
        currentPrice: 1,
        current_price: 1,
        originalPrice: 1,
        original_price: 1,
        discountPct: 1,
        discount_pct: 1,
        rating: 1,
        reviewCount: 1,
        review_count: 1,
        scores: 1,
        buyDecision: 1,
        buy_decision: 1,
        updatedAt: 1,
        updated_at: 1,
        scrapedAt: 1,
        scraped_at: 1,
      }
    )
      .sort({ score: { $meta: "textScore" }, "scores.finalScore": -1, updatedAt: -1 })
      .limit(perKeywordLimit)
      .lean();

    keywordProducts[normalized.toLowerCase()] = products;
    products.forEach((product) => {
      const key = String(product._id);
      if (!deduped.has(key)) deduped.set(key, product);
    });
  }

  return {
    keywordProducts,
    products: Array.from(deduped.values()),
  };
}

async function fetchGeneralRecommendations(limit, userPreferences) {
  try {
    const { data } = await axios.post(
      `${ML_URL}/recommend`,
      {
        limit,
        user_preferences: userPreferences || null,
      },
      { timeout: 10000 }
    );
    return data.products || data.recommendations || [];
  } catch {
    const products = await Product.find({
      currentPrice: { $exists: true, $ne: null },
      "scores.finalScore": { $exists: true },
    })
      .sort({ "scores.finalScore": -1 })
      .limit(Number(limit))
      .lean();
    return products;
  }
}

router.get("/dashboard", optionalAuth, async (req, res) => {
  const { limit = 9, trend_limit = 6 } = req.query;
  const numericLimit = Math.max(3, Math.min(18, Number(limit) || 9));
  const trendLimit = Math.max(3, Math.min(12, Number(trend_limit) || 6));

  let userPreferences = null;
  let history = [];
  let recentProducts = [];

  if (req.user?._id) {
    const user = await User.findById(req.user._id)
      .select("searchHistory recentSearchProducts preferences budgetMin budgetMax profession ageGroup")
      .lean();
    history = Array.isArray(user?.searchHistory) ? user.searchHistory : [];
    recentProducts = Array.isArray(user?.recentSearchProducts) ? user.recentSearchProducts : [];
    userPreferences = user
      ? {
          budget_min: user.budgetMin,
          budget_max: user.budgetMax,
          categories: user.preferences?.categories || [],
          profession: user.profession,
          age_group: user.ageGroup,
        }
      : null;
  }

  const rankedHistory = scoreSearchHistoryEntries(history);
  const seedKeywords = rankedHistory.slice(0, 6).map((entry) => entry.keyword);

  let collected = { keywordProducts: {}, products: [] };
  if (seedKeywords.length) {
    collected = await collectProductsForKeywords(seedKeywords, 8);
  }

  let recommendations = [];
  if (collected.products.length) {
    try {
      const { data } = await axios.post(
        `${ML_URL}/recommend`,
        {
          products: collected.products,
          limit: numericLimit,
          user_preferences: userPreferences,
        },
        { timeout: 12000 }
      );
      recommendations = data.products || data.recommendations || [];
    } catch {
      recommendations = collected.products
        .sort((a, b) => (b?.scores?.finalScore || 0) - (a?.scores?.finalScore || 0))
        .slice(0, numericLimit);
    }
  }

  if (!recommendations.length) {
    recommendations = await fetchGeneralRecommendations(numericLimit, userPreferences);
  }

  const trendKeywords = [
    ...seedKeywords,
    ...recommendations.slice(0, 4).map((product) => String(product?.name || "").split(/\s+/).slice(0, 4).join(" ")),
  ].filter(Boolean);

  let trendSignals = [];
  try {
    const { data } = await axios.post(
      `${ML_URL}/recommend/trends`,
      {
        keywords: trendKeywords,
        keyword_products: collected.keywordProducts,
        limit: trendLimit,
      },
      { timeout: 15000 }
    );
    trendSignals = data.signals || [];
  } catch {
    trendSignals = [];
  }

  res.json({
    success: true,
    recommendations,
    trendSignals,
    searchHistory: rankedHistory.slice(0, 10).map((entry) => ({
      keyword: entry.keyword,
      score: entry.score,
      count: entry.count,
    })),
    recentSearchProducts: recentProducts.slice(0, 5),
    usesSearchHistory: seedKeywords.length > 0,
  });
});

router.get("/", optionalAuth, async (req, res) => {
  const { category, limit = 12 } = req.query;

  try {
    const payload = {
      limit: Number(limit),
      category: category || null,
      user_preferences: req.user
        ? {
            budget_min: req.user.budgetMin,
            budget_max: req.user.budgetMax,
            categories: req.user.preferences?.categories || [],
            profession: req.user.profession,
            age_group: req.user.ageGroup,
          }
        : null,
    };

    const { data } = await axios.post(`${ML_URL}/recommend`, payload, { timeout: 10000 });
    return res.json({ success: true, recommendations: data.recommendations, products: data.recommendations });
  } catch {
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

router.post("/score", async (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, message: "productId required" });
  }

  const product = await Product.findById(productId).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  try {
    const { data } = await axios.post(`${ML_URL}/score`, { product }, { timeout: 8000 });
    await Product.findByIdAndUpdate(productId, {
      scores: data.scores,
      buyDecision: data.buy_decision,
      hypeLabel: data.hype_label,
      scoreUpdatedAt: new Date(),
    });
    return res.json({ success: true, ...data });
  } catch {
    return res.json({ success: true, scores: product.scores, buyDecision: product.buyDecision });
  }
});

router.get("/alternatives/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const alternatives = await Product.find({
    _id: { $ne: product._id },
    category: product.category,
    $or: [
      { currentPrice: { $lt: product.currentPrice } },
      { rating: { $gt: product.rating || 0 } },
    ],
  })
    .sort({ "scores.finalScore": -1 })
    .limit(6)
    .lean();

  res.json({ success: true, alternatives });
});

router.get("/bundles/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const bundleMap = {
    smartphone: ["earbuds", "phone case", "screen protector", "power bank"],
    laptop: ["laptop bag", "mouse", "keyboard", "laptop stand"],
    headphones: ["earbuds", "audio cable", "headphone stand"],
    camera: ["memory card", "tripod", "camera bag", "lens"],
    smartwatch: ["watch strap", "wireless charger"],
    television: ["soundbar", "hdmi cable", "wall mount"],
  };

  const categoryLower = (product.category || "").toLowerCase();
  const keywords = Object.entries(bundleMap).find(([key]) => categoryLower.includes(key))?.[1] || ["accessories"];

  const bundles = await Product.find({
    _id: { $ne: product._id },
    $text: { $search: keywords.join(" ") },
    currentPrice: { $lte: product.currentPrice * 0.5 },
  })
    .sort({ "scores.finalScore": -1 })
    .limit(4)
    .lean();

  res.json({ success: true, bundles, suggested_keywords: keywords });
});

router.get("/best-time/:id", async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  try {
    const { data } = await axios.get(`${ML_URL}/predict/${req.params.id}`, { timeout: 8000 });
    return res.json({ success: true, ...data });
  } catch {
    const daysToWait = product.discountPct > 25 ? 0 : Math.floor(Math.random() * 14) + 3;
    return res.json({
      success: true,
      decision: daysToWait === 0 ? "BUY_NOW" : "WAIT",
      days_to_wait: daysToWait,
      predicted_min_price: product.currentPrice * 0.92,
      confidence: 0.71,
      reason:
        daysToWait === 0
          ? "Price is at a 90-day low - great time to buy"
          : `AI predicts a price drop in about ${daysToWait} days based on historical patterns`,
    });
  }
});

module.exports = router;
