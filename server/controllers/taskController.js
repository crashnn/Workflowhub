const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const logActivity = require('../utils/logActivity');
const getTasks = async (req, res) => { 
    try {
        const tasks = await Task.find({ project: req.params.projectId })
          .populate('assignedTo', 'username email')
          .populate('comments.user', 'username')
          .sort({ createdAt: -1 });
        res.json(tasks);
      } catch (error) { res.status(500).json({ message: error.message }); }
};


const getMyTasks = async (req, res) => { 
    try {
        const tasks = await Task.find({
          assignedTo: req.user._id, 
          status: { $ne: 'done' } 
        })
        .populate('project', 'name color')
        .sort({ createdAt: -1 })
        .limit(10);
    
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
};


const getCalendarTasks = async (req, res) => {
    try {
        const tasks = await Task.find({
            $or: [
                { assignedTo: req.user._id },
                { assignedTo: null }
            ]
        }).populate('project', 'name color');
        
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, projectId, checklist, comments } = req.body;
    const assignedTo = req.body.assignedTo || req.user._id;

    const task = await Task.create({
      title, description, status, priority, dueDate, checklist, comments,
      project: projectId,
      assignedTo
    });

    await logActivity(req.user._id, projectId, "oluşturdu", `Görev: ${title}`);

    
   if (assignedTo.toString() !== req.user._id.toString()) {
        await Notification.create({
            user: assignedTo,
            message: `Sana yeni bir görev atandı: "${title}"`,
            type: 'info',
            link: `/projects/${projectId}`
        });
    }

    res.status(201).json(task);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Görev bulunamadı' });

    const previousStatus = task.status; 

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignedTo', 'username')
      .populate('comments.user', 'username');

    
    if (req.body.status && req.body.status !== previousStatus) {
        let action = "güncelledi";
        if(req.body.status === 'done') action = "tamamladı";
        if(req.body.status === 'doing') action = "üzerinde çalışıyor";
        
        await logActivity(req.user._id, task.project, action, `Görev: ${task.title}`);
    }

    res.json(updatedTask);
  } catch (error) { res.status(400).json({ message: error.message }); }
};

const deleteTask = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Bulunamadı' });
        await task.deleteOne();
        res.json({ message: 'Silindi' });
      } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getTasks, getMyTasks, getCalendarTasks, createTask, updateTask, deleteTask };