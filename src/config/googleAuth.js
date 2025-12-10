const { OAuth2Client } = require('google-auth-library');
const config = require('./env');
const logger = require('../utils/logger');

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and extract user info
 * @param {string} idToken - Google ID token from frontend
 * @returns {Promise<{email: string, name: string, picture: string, googleId: string}>}
 */
const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      googleId: payload.sub,
    };
  } catch (error) {
    logger.error(`Google token verification failed: ${error.message}`);
    throw new Error('Invalid Google token');
  }
};

/**
 * Check if email domain is allowed
 * @param {string} email 
 * @returns {boolean}
 */
const isAllowedEmailDomain = (email) => {
  if (!email) return false;
  
  const allowedDomains = config.ALLOWED_EMAIL_DOMAINS.map(domain => 
    domain.startsWith('@') ? domain : `@${domain}`
  );
  
  return allowedDomains.some(domain => email.toLowerCase().endsWith(domain.toLowerCase()));
};

module.exports = {
  verifyGoogleToken,
  isAllowedEmailDomain,
};



