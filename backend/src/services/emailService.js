/**
 * Email service — supports SendGrid API and SMTP fallback.
 */
const nodemailer = require("nodemailer");

// ── Transporter setup ─────────────────────────────────────────────────────────
const createTransporter = () => {
  // If SendGrid key provided, use SendGrid SMTP
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Fallback: generic SMTP (Gmail, etc.)
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

const FROM = process.env.EMAIL_FROM || "ShopSense AI <noreply@shopsense.ai>";

// ── Templates ─────────────────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.1); }
    .header { background: linear-gradient(135deg, #6c63ff, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .body { padding: 32px; color: #333; line-height: 1.7; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6c63ff, #8b5cf6); color: #fff; padding: 12px 28px; border-radius: 50px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 16px 32px; font-size: 12px; color: #999; text-align: center; }
    .price-box { background: #f0f0ff; border-left: 4px solid #6c63ff; padding: 16px; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>✨ ShopSense AI</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© 2024 ShopSense AI · <a href="#">Unsubscribe</a></div>
  </div>
</body>
</html>`;

// ── Send functions ────────────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({ from: FROM, to, subject, html, text });
    console.log(`[Email] Sent to ${to}: ${subject} (${info.messageId})`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message);
    return false;
  }
};

const sendVerificationEmail = async (to, name, token) => {
  const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  return sendEmail({
    to,
    subject: "Verify your ShopSense AI account",
    html: baseTemplate(`
      <h2>Hi ${name} 👋</h2>
      <p>Thanks for signing up! Please verify your email to start saving money with AI.</p>
      <a href="${link}" class="btn">Verify Email →</a>
      <p style="color:#999;font-size:13px">Link expires in 24 hours.</p>
    `),
  });
};

const sendPasswordResetEmail = async (to, name, token) => {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return sendEmail({
    to,
    subject: "Reset your ShopSense AI password",
    html: baseTemplate(`
      <h2>Password Reset 🔐</h2>
      <p>Hi ${name}, you requested a password reset. Click below:</p>
      <a href="${link}" class="btn">Reset Password →</a>
      <p style="color:#999;font-size:13px">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `),
  });
};

const sendPriceDropEmail = async (to, name, product, newPrice, oldPrice) => {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  return sendEmail({
    to,
    subject: `📉 Price Drop Alert! ${product.name} dropped by ${discount}%`,
    html: baseTemplate(`
      <h2>💰 Price Drop Alert!</h2>
      <p>Hi ${name}, great news! A product you're watching just got cheaper.</p>
      <div class="price-box">
        <strong>${product.name}</strong><br>
        <span style="text-decoration:line-through;color:#999">₹${oldPrice.toLocaleString("en-IN")}</span>
        &nbsp;→&nbsp;
        <span style="font-size:1.4em;color:#6c63ff;font-weight:700">₹${newPrice.toLocaleString("en-IN")}</span>
        &nbsp;<span style="background:#e8f5e9;color:#2e7d32;padding:3px 8px;border-radius:4px;font-size:12px">${discount}% OFF</span>
      </div>
      <a href="${product.url}" class="btn">Buy Now →</a>
    `),
  });
};

const sendOTPEmail = async (to, name, otp) => {
  return sendEmail({
    to,
    subject: "Your ShopSense AI OTP",
    html: baseTemplate(`
      <h2>Your OTP 🔐</h2>
      <p>Hi ${name}, your one-time password is:</p>
      <div style="font-size:2.5rem;font-weight:700;letter-spacing:0.5rem;color:#6c63ff;text-align:center;padding:24px">${otp}</div>
      <p style="color:#999;font-size:13px;text-align:center">Expires in 10 minutes. Do not share this with anyone.</p>
    `),
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPriceDropEmail,
  sendOTPEmail,
};
