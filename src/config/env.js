// Environment configuration - shared in git
module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://cseworkshop360_db_user:85q2Udl9nbzJyQHu@cseworkshops.enwejeq.mongodb.net/cse_workshop?appName=CseWorkshops',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'cseworkshop_9f8d7f6a5e4d3c2b1a0_secure_jwt_secret_2025',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  // Allowed College Email Domains (comma-separated)
  ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS 
    ? process.env.ALLOWED_EMAIL_DOMAINS.split(',') 
    : ['@college.edu', '@university.edu','@rguktn.ac.in'],

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || 'cseworkshop360@gmail.com',
  // Note: Gmail app passwords are typically provided without spaces.
  EMAIL_PASS: process.env.EMAIL_PASS || 'esnxrvzhvhikprop',
  EMAIL_FROM: process.env.EMAIL_FROM || 'CSE Workshop <cseworkshop360@gmail.com>',

  // Frontend URL (for CORS)
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // File Storage
  STORAGE_TYPE: process.env.STORAGE_TYPE || 'local', // 'local' | 'cloud'
  STORAGE_PATH: process.env.STORAGE_PATH || './uploads',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,

  // Certificate
  CERTIFICATE_BASE_URL: process.env.CERTIFICATE_BASE_URL || 'http://localhost:5000',

  // Development Mode - Bypass Authentication (ONLY FOR DEVELOPMENT!)
  DEV_MODE: process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development',
  DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH === 'true',
};

