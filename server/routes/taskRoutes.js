const express = require('express');
const router = express.Router();
const { 
    getTasks, 
    createTask, 
    updateTask, 
    deleteTask, 
    getMyTasks, 
    getCalendarTasks 
} = require('../controllers/taskController');

const { protect } = require('../middleware/authMiddleware');

router.get('/mine', protect, getMyTasks);        
router.get('/calendar', protect, getCalendarTasks); 

router.post('/', protect, createTask);  

router.get('/:projectId', protect, getTasks);

router.route('/:id')
    .put(protect, updateTask)
    .delete(protect, deleteTask);

module.exports = router;