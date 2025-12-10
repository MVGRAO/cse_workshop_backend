// Environment configuration - shared in git
module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://cseworkshop360_db_user:85q2Udl9nbzJyQHu@cseworkshops.enwejeq.mongodb.net/cse_workshop?appName=CseWorkshops',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  // Allowed College Email Domains (comma-separated)
  ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS 
    ? process.env.ALLOWED_EMAIL_DOMAINS.split(',') 
    : ['@college.edu', '@university.edu'],

  // Email Configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@workshop.edu',

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
};

