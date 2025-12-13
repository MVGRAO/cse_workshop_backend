const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireAdmin } = require('../middleware/role');
const controller = require('../controllers/verifierRequestController');

// Public: submit request
router.post('/', controller.createRequest);

// Admin protected routes
router.use(authenticate);
router.use(requireAdmin);

router.get('/', controller.listRequests);
router.post('/:id/accept', controller.acceptRequest);
router.post('/:id/reject', controller.rejectRequest);

module.exports = router;




