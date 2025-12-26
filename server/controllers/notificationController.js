const Notification = require('../models/Notification');


const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (error) { res.status(500).json({ message: error.message }); }
};


const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ message: error.message }); }
};


const markAllRead = async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message }); }
}


const deleteNotification = async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Bildirim silindi" });
    } catch (error) { res.status(500).json({ message: error.message }); }
}

module.exports = { getNotifications, markAsRead, markAllRead, deleteNotification };