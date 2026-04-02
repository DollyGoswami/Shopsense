/**
 * Product Model
 * Stores scraped products from supported marketplaces.
 */
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    // ── Source ───────────────────────────────────────────────────────────────
    source:    { type: String, enum: ["amazon", "flipkart", "myntra", "apollo_pharmacy"], required: true },
    sourceId:  { type: String, required: true },   // ASIN, Flipkart PID, etc.
    url:       { type: String },
    affiliateUrl: { type: String },

    // ── Core info ─────────────────────────────────────────────────────────────
    name:      { type: String, required: true, maxlength: 500 },
    brand:     { type: String },
    category:  { type: String, default: "Electronics" },
    image:     { type: String },
    images:    { type: [String], default: [] },
    features:  { type: [String], default: [] },
    description:{ type: String },

    // ── Pricing ──────────────────────────────────────────────────────────────
    currentPrice:  { type: Number },
    originalPrice: { type: Number },
    discountPct:   { type: Number },
    currency:      { type: String, default: "INR" },
    availability:  { type: String, enum: ["in_stock", "out_of_stock", "low_stock", "unknown"], default: "unknown" },

    // ── Reviews ──────────────────────────────────────────────────────────────
    rating:      { type: Number, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    // ── AI Scores (computed by ML service) ───────────────────────────────────
    scores: {
      priceScore:     { type: Number },
      sentimentScore: { type: Number },
      ratingScore:    { type: Number },
      trendScore:     { type: Number },
      dealScore:      { type: Number },
      finalScore:     { type: Number },
    },
    buyDecision:    { type: String, enum: ["BUY", "WAIT", "AVOID"] },
    hypeLabel:      { type: String, enum: ["gem", "hype", "avoid", "neutral"] },
    sentimentLabel: { type: String },

    // ── Metadata ─────────────────────────────────────────────────────────────
    scrapedAt:  { type: Date },
    scoreUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Compound index to prevent duplicates ─────────────────────────────────────
ProductSchema.index({ source: 1, sourceId: 1 }, { unique: true });
ProductSchema.index({ name: "text", brand: "text", category: "text" });
ProductSchema.index({ category: 1, currentPrice: 1 });
ProductSchema.index({ "scores.finalScore": -1 });
ProductSchema.index({ updatedAt: -1 });

module.exports = mongoose.model("Product", ProductSchema);
