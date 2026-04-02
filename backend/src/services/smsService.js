/**
 * SMS & WhatsApp notification service using Twilio.
 * Falls back to console.log if credentials are not configured.
 */
let twilioClient = null;

const getClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require("twilio");
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

const isMockMode = () => !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN;

// ── SMS ───────────────────────────────────────────────────────────────────────

const sendSMS = async (to, message) => {
  if (isMockMode()) {
    console.log(`[SMS Mock] To: ${to} | Message: ${message}`);
    return { success: true, mock: true };
  }
  try {
    const client = getClient();
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to,
    });
    console.log(`[SMS] Sent to ${to}: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`[SMS] Failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

const sendOTPSMS = async (phone, otp) => {
  const message = `Your ShopSense AI OTP is: ${otp}. Valid for 10 minutes. Do not share.`;
  return sendSMS(phone, message);
};

const sendPriceDropSMS = async (phone, productName, newPrice, oldPrice) => {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  const message  = `📉 ShopSense Alert! ${productName} dropped ${discount}% → ₹${newPrice.toLocaleString("en-IN")}. Open app to buy!`;
  return sendSMS(phone, message);
};

// ── WhatsApp ──────────────────────────────────────────────────────────────────

const sendWhatsApp = async (to, message) => {
  if (isMockMode()) {
    console.log(`[WhatsApp Mock] To: ${to} | Message: ${message}`);
    return { success: true, mock: true };
  }
  try {
    const client = getClient();
    const msg = await client.messages.create({
      body: message,
      from: process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886",
      to:   `whatsapp:${to}`,
    });
    console.log(`[WhatsApp] Sent to ${to}: ${msg.sid}`);
    return { success: true, sid: msg.sid };
  } catch (err) {
    console.error(`[WhatsApp] Failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

const sendWhatsAppPriceDrop = async (phone, productName, newPrice, oldPrice, productUrl) => {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  const message = [
    `🛒 *ShopSense AI — Price Drop Alert!*`,
    ``,
    `*${productName}*`,
    `~~₹${oldPrice.toLocaleString("en-IN")}~~ → *₹${newPrice.toLocaleString("en-IN")}*`,
    `💰 You save ${discount}%!`,
    ``,
    `🔗 ${productUrl}`,
    ``,
    `_Reply STOP to unsubscribe_`,
  ].join("\n");
  return sendWhatsApp(phone, message);
};

const sendWhatsAppOTP = async (phone, otp) => {
  const message = `🔐 *ShopSense AI OTP*\n\nYour OTP is: *${otp}*\n\nValid for 10 minutes. Do not share with anyone.`;
  return sendWhatsApp(phone, message);
};

module.exports = {
  sendSMS,
  sendOTPSMS,
  sendPriceDropSMS,
  sendWhatsApp,
  sendWhatsAppPriceDrop,
  sendWhatsAppOTP,
};
