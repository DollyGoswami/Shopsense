const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/productController");
const { optionalAuth } = require("../middleware/authMiddleware");
const { productFeedLimiter } = require("../middleware/rateLimiter");

router.get ("/",             optionalAuth, ctrl.searchProducts);
router.get ("/trending",     productFeedLimiter, ctrl.getTrending);
router.get ("/deals",        productFeedLimiter, ctrl.getBestDeals);
router.get ("/categories",   productFeedLimiter, ctrl.getCategories);
router.get ("/compare",      ctrl.compareProducts);
router.get ("/:id",          ctrl.getProduct);
router.get ("/:id/price-history", ctrl.getPriceHistory);
router.post("/scrape",       optionalAuth, ctrl.triggerScrape);

module.exports = router;
