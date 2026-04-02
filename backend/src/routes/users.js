const express = require("express");
const multer = require("multer");

const router = express.Router();

const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const { cloudinary, hasCloudinaryConfig } = require("../config/cloudinary");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = /jpeg|jpg|png|gif|webp/;
    const extension = (file.originalname || "").split(".").pop()?.toLowerCase() || "";
    const isAllowed = allowedMimeTypes.test(file.mimetype) && allowedMimeTypes.test(extension);
    cb(isAllowed ? null : new Error("Only image files allowed"), isAllowed);
  }
});

function uploadAvatarToCloudinary(fileBuffer, userId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "shopsense/avatars",
        public_id: `user_${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
}

router.get("/profile", protect, async (req, res) => {
  const user = await User.findById(req.user._id).lean();
  res.json({ success: true, user });
});

router.put("/profile", protect, async (req, res) => {
  const allowed = ["name", "gender", "ageGroup", "profession", "budgetMin", "budgetMax", "city", "language", "preferences"];
  const updates = {};

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, user: user.toPublicJSON() });
});

router.post("/avatar", protect, upload.single("avatar"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  if (!hasCloudinaryConfig) {
    return res.status(500).json({
      success: false,
      message: "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in backend/.env."
    });
  }

  const uploadResult = await uploadAvatarToCloudinary(req.file.buffer, req.user._id);
  const avatarUrl = uploadResult.secure_url;
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: avatarUrl }, { new: true });

  res.json({ success: true, avatar: avatarUrl, user: user.toPublicJSON() });
});

router.delete("/account", protect, async (req, res) => {
  await User.findByIdAndDelete(req.user._id);
  res.json({ success: true, message: "Account deleted successfully" });
});

router.get("/search-history", protect, async (req, res) => {
  const user = await User.findById(req.user._id).select("searchHistory").lean();
  res.json({ success: true, history: user.searchHistory || [] });
});

router.delete("/search-history", protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { searchHistory: [] });
  res.json({ success: true, message: "Search history cleared" });
});

module.exports = router;
