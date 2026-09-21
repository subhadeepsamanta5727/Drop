const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const parsePrices = (value, fallback) => {
  try { return { ...fallback, ...(value ? JSON.parse(value) : {}) }; }
  catch { throw new Error('Invalid JSON price configuration'); }
};
const env = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER,
  contactEmail: process.env.CONTACT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER,
  maxUploadFiles: Number(process.env.MAX_UPLOAD_FILES || 12),
  subscriptionPrices: parsePrices(process.env.SUBSCRIPTION_PRICES_JSON, { '1_MONTH': 99900, '6_MONTH': 499900, '1_YEAR': 899900 }),
  oneTimePrices: parsePrices(process.env.ONETIME_PRICES_JSON, { CRYPTO: 199900, STOCKS: 199900, FOREX: 199900 })
};
module.exports = env;
