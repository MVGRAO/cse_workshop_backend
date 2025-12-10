const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

/**
 * @route   GET /api/v1/certificates/verify/:verificationHash
 * @desc    Public certificate verification
 * @access  Public
 */
router.get('/certificates/verify/:verificationHash', certificateController.verifyCertificate);

module.exports = router;



