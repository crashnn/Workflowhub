const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMessages, sendMessage, markRead, deleteMessage } = require('../controllers/messageController');

router.get('/:projectId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/read', protect, markRead);
router.delete('/:id', protect, deleteMessage);

module.exports = router;