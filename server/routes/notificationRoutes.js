const express = require('express');
const router = express.Router();

const { getNotifications, markAsRead, markAllRead, deleteNotification } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllRead);


router.delete('/:id', protect, deleteNotification);

module.exports = router;