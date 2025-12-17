const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectUser } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');

/**
 * @route   POST /api/v1/auth/google
 * @desc    Authenticate with Google
 * @access  Public
 */
router.post('/google', authController.googleAuth);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user with email/password
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email/password
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/verifier/login
 * @desc    Login as verifier with email/password
 * @access  Public
 */
router.post('/verifier/login', authController.verifierLogin);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', protectUser, authController.getMe);

/**
 * @route   GET /api/v1/auth/dev-token
 * @desc    Get a dev token for testing (only in dev mode)
 * @access  Public (dev only)
 */
router.get('/dev-token', authController.getDevToken);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', protectUser, authController.updateProfile);

/**
 * @route   PUT /api/v1/auth/profile/avatar
 * @desc    Update current user avatar
 * @access  Private
 */
router.put('/profile/avatar', protectUser, upload.single('avatar'), authController.updateAvatar);

/**
 * @route   DELETE /api/v1/auth/account
 * @desc    Delete current user account
 * @access  Private
 */
router.delete('/account', protectUser, authController.deleteAccount);

module.exports = router;



