const Activity = require('../models/Activity');

const getActivities = async (req, res) => {
    try {
        const activities = await Activity.find({ project: req.params.projectId })
            .populate('user', 'username')
            .sort({ createdAt: -1 }) 
            .limit(50); 
        res.json(activities);
    } catch (error) { res.status(500).json({ message: error.message }); }
}

module.exports = { getActivities };