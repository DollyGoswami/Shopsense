const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const SALES_FILE = path.join(__dirname, "../data/upcoming_sales.json");

router.get("/upcoming", async (req, res) => {
  try {
    const raw = fs.readFileSync(SALES_FILE, "utf8");
    const data = JSON.parse(raw);
    return res.json({ success: true, sales: data });
  } catch (err) {
    console.error("[Sales] Could not read sales file:", err.message);
    return res.status(500).json({ success: false, message: "Could not load upcoming sales" });
  }
});

module.exports = router;
