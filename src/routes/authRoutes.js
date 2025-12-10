const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middleware/auth');

/**
 * @route   POST /api/v1/auth/google
 * @desc    Authenticate with Google
 * @access  Public
 */
router.post('/google', authController.googleAuth);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;



