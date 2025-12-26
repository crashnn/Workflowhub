const Activity = require('../models/Activity');

const logActivity = async (userId, projectId, action, target = "", details = "") => {
    try {
        await Activity.create({
            user: userId,
            project: projectId,
            action,
            target,
            details
        });
    } catch (error) {
        console.error("Aktivite kaydı hatası:", error);
    }
};

module.exports = logActivity;