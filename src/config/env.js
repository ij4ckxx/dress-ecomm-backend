import dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,

  // JWT Configuration
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'fallback_access_secret_dress_ecomm_2026',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback_refresh_secret_dress_ecomm_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '7d',
  TOKEN_CLEANUP_CRON: (process.env.TOKEN_CLEANUP_CRON || '0 */6 * * *').trim(), // Runs every 6 hours by default

  // Cookies
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'fallback_cookie_secret_dress_ecomm',

  // Razorpay
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder_key',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_placeholder_secret',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || '',

  // Notifications & SMTP Email
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'concierge@maisondeelegance.com',

  // Store & E-commerce Defaults (Dynamic override via .env or Database)
  DEFAULT_FLAT_SHIPPING_RATE: parseFloat(process.env.DEFAULT_FLAT_SHIPPING_RATE || process.env.FLAT_SHIPPING_RATE || '150'),
  DEFAULT_FREE_SHIPPING_THRESHOLD: parseFloat(process.env.DEFAULT_FREE_SHIPPING_THRESHOLD || process.env.FREE_SHIPPING_THRESHOLD || '2999'),
  DEFAULT_COD_MAX_LIMIT: parseFloat(process.env.DEFAULT_COD_MAX_LIMIT || process.env.COD_MAX_LIMIT || '25000'),
  DEFAULT_UPI_ID: process.env.DEFAULT_UPI_ID || process.env.UPI_ID || 'maison@okhdfcbank',
  DEFAULT_UPI_PAYEE_NAME: process.env.DEFAULT_UPI_PAYEE_NAME || process.env.UPI_PAYEE_NAME || 'Maison De Élégance',
  DEFAULT_UPI_INSTRUCTIONS: process.env.DEFAULT_UPI_INSTRUCTIONS || "Scan the QR code or tap 'Pay via UPI App', then enter your 12-digit UPI Reference / UTR Number below to confirm.",
  DEFAULT_CURRENCY: process.env.DEFAULT_CURRENCY || 'INR',
  DEFAULT_CURRENCY_SYMBOL: process.env.DEFAULT_CURRENCY_SYMBOL || '₹',
};

// Security check for production environments
if (ENV.NODE_ENV === 'production') {
  if (
    !process.env.JWT_ACCESS_SECRET ||
    ENV.JWT_ACCESS_SECRET === 'fallback_access_secret_dress_ecomm_2026'
  ) {
    console.warn(
      '⚠️ [SECURITY WARNING] JWT_ACCESS_SECRET is using a default fallback secret in production! Please define a strong, random JWT_ACCESS_SECRET in your .env file.'
    );
  }
}

