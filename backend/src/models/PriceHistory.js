const mongoose = require("mongoose");

const PriceHistorySchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.Mixed },
    product_id: { type: String },
    source: { type: String },
    sourceId: { type: String },
    source_id: { type: String },
    price: { type: Number, required: true },
    oldPrice: { type: Number },
    old_price: { type: Number },
    currency: { type: String, default: "INR" },
    timestamp: { type: Date, default: Date.now },
  },
  {
    collection: "price_history",
    strict: false,
  }
);

PriceHistorySchema.index({ productId: 1, timestamp: -1 });
PriceHistorySchema.index({ product_id: 1, timestamp: -1 });
PriceHistorySchema.index({ source: 1, sourceId: 1, timestamp: -1 });
PriceHistorySchema.index({ source: 1, source_id: 1, timestamp: -1 });

module.exports = mongoose.model("PriceHistory", PriceHistorySchema);
