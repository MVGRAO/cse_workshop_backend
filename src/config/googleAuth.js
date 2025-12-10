const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const config = require('./env');
const logger = require('../utils/logger');

const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);

/**
 * Verify Google ID token and extract user info
 * @param {string} idToken - Google ID token from frontend
 * @returns {Promise<{email: string, name: string, picture: string, googleId: string, givenName?: string, familyName?: string, locale?: string}>}
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
      givenName: payload.given_name,
      familyName: payload.family_name,
      locale: payload.locale,
      emailVerified: payload.email_verified,
    };
  } catch (error) {
    logger.error(`Google token verification failed: ${error.message}`);
    throw new Error('Invalid Google token');
  }
};

/**
 * Fetch additional user profile information from Google People API
 * Requires access token and additional scopes
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<{phoneNumber?: string, location?: string}>}
 */
const fetchGoogleProfileDetails = async (accessToken) => {
  try {
    if (!config.GOOGLE_CLIENT_SECRET) {
      logger.warn('GOOGLE_CLIENT_SECRET not configured, skipping People API call');
      return {
        phoneNumber: null,
        location: null,
      };
    }

    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({ access_token: accessToken });
    
    const people = google.people({
      version: 'v1',
      auth: oauth2Client,
    });

    const response = await people.people.get({
      resourceName: 'people/me',
      personFields: 'phoneNumbers,addresses,locations',
    });

    const person = response.data;
    const phoneNumber = person.phoneNumbers?.[0]?.value;
    const location = person.addresses?.[0]?.formattedValue || 
                     person.locations?.[0]?.value;

    return {
      phoneNumber: phoneNumber || null,
      location: location || null,
    };
  } catch (error) {
    logger.warn(`Failed to fetch Google profile details: ${error.message}`);
    // Don't throw error - this is optional information
    return {
      phoneNumber: null,
      location: null,
    };
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
  fetchGoogleProfileDetails,
};



