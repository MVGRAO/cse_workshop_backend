const morgan = require('morgan');
const config = require('../config/env');

// Simple logger utility
const logger = {
  info: (message) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
  },
  error: (message) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  },
  warn: (message) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
  },
  debug: (message) => {
    if (config.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`);
    }
  },
};

// Morgan HTTP request logger middleware
const httpLogger = morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev');

module.exports = logger;
module.exports.httpLogger = httpLogger;



