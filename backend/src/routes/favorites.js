const express   = require("express");
const router    = express.Router();
const Favorite  = require("../models/Favorite");
const Product   = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

// GET /api/favorites
router.get("/", protect, async (req, res) => {
  const favs = await Favorite.find({ userId: req.user._id })
    .populate("productId")
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, favorites: favs });
});

// POST /api/favorites
router.post("/", protect, async (req, res) => {
  const { productId, targetPrice } = req.body;
  if (!productId)
    return res.status(400).json({ success: false, message: "productId required" });

  const product = await Product.findById(productId);
  if (!product)
    return res.status(404).json({ success: false, message: "Product not found" });

  const fav = await Favorite.findOneAndUpdate(
    { userId: req.user._id, productId },
    { userId: req.user._id, productId, targetPrice: targetPrice || product.currentPrice * 0.9, alertEnabled: true },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, favorite: fav });
});

// DELETE /api/favorites/:productId
router.delete("/:productId", protect, async (req, res) => {
  await Favorite.findOneAndDelete({ userId: req.user._id, productId: req.params.productId });
  res.json({ success: true, message: "Removed from favorites" });
});

// PATCH /api/favorites/:productId/target-price
router.patch("/:productId/target-price", protect, async (req, res) => {
  const { targetPrice } = req.body;
  const fav = await Favorite.findOneAndUpdate(
    { userId: req.user._id, productId: req.params.productId },
    { targetPrice },
    { new: true }
  );
  if (!fav)
    return res.status(404).json({ success: false, message: "Favorite not found" });
  res.json({ success: true, favorite: fav });
});

module.exports = router;
