const mongoose = require("mongoose");

const FavoriteSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    productId:     { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    targetPrice:   { type: Number },   // alert when price drops below this
    alertEnabled:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

FavoriteSchema.index({ userId: 1, productId: 1 }, { unique: true });
FavoriteSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Favorite", FavoriteSchema);
