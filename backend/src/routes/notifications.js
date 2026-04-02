const express      = require("express");
const router       = express.Router();
const Notification = require("../models/Notification");
const { protect }  = require("../middleware/authMiddleware");

// GET /api/notifications
router.get("/", protect, async (req, res) => {
  const { page = 1, limit = 20, unread } = req.query;
  const filter = { userId: req.user._id };
  if (unread === "true") filter.isRead = false;

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Notification.countDocuments(filter);
  const items = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate("productId", "name image currentPrice source")
    .lean();

  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

  res.json({ success: true, total, unreadCount, notifications: items });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", protect, async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true }
  );
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
router.patch("/read-all", protect, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true, message: "All notifications marked as read" });
});

// DELETE /api/notifications/:id
router.delete("/:id", protect, async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ success: true });
});

// DELETE /api/notifications
router.delete("/", protect, async (req, res) => {
  await Notification.deleteMany({ userId: req.user._id });
  res.json({ success: true, message: "All notifications cleared" });
});

module.exports = router;
