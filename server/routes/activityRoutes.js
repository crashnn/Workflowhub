const express = require('express');
const router = express.Router();
const { getActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:projectId', protect, getActivities);

module.exports = router;