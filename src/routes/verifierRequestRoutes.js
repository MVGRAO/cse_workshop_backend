const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/auth');
// const { requireAdmin } = require('../middleware/role');
const controller = require('../controllers/verifierRequestController');

// Public: submit request
router.post('/', controller.createRequest);

// Admin protected routes
router.use(protectAdmin);

router.get('/', controller.listRequests);
router.post('/:id/accept', controller.acceptRequest);
router.post('/:id/reject', controller.rejectRequest);

module.exports = router;





