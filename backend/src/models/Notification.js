const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:      { type: String, enum: ["price_drop", "trend_alert", "buy_now", "flash_sale", "back_in_stock", "system"], required: true },
    title:     { type: String, required: true },
    message:   { type: String, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    data:      { type: mongoose.Schema.Types.Mixed },  // extra payload
    isRead:    { type: Boolean, default: false },
    channels: {
      email:    { sent: Boolean, sentAt: Date },
      sms:      { sent: Boolean, sentAt: Date },
      whatsapp: { sent: Boolean, sentAt: Date },
      push:     { sent: Boolean, sentAt: Date },
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
