const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');

// Admin authentication routes
router.post('/login', adminAuthController.login);
router.post('/create', adminAuthController.createAdmin);

module.exports = router;



