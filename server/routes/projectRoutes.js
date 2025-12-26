const express = require('express');
const router = express.Router();
const { 
    getProjects, createProject, deleteProject, updateProject, 
    joinProject, getActivities, 
    updateMemberRole, removeMember 
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getProjects)
    .post(protect, createProject);

router.post('/join', protect, joinProject);
router.get('/activities', protect, getActivities);

router.put('/role', protect, updateMemberRole);
router.post('/remove-member', protect, removeMember); 

router.route('/:id')
    .delete(protect, deleteProject)
    .put(protect, updateProject);

module.exports = router;