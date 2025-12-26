const Message = require('../models/Message');

const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ project: req.params.projectId })
      .populate('sender', 'username email')
      .populate('readBy', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) { res.status(500).json({ message: error.message }); }
};


const sendMessage = async (req, res) => {
  try {
    const { projectId, text, image, video } = req.body;
    
    const message = await Message.create({
      project: projectId,
      sender: req.user._id,
      text,
      image,
      video, 
      readBy: [req.user._id]
    });

    const fullMessage = await Message.findById(message._id)
        .populate('sender', 'username')
        .populate('readBy', 'username');

    res.status(201).json(fullMessage);
  } catch (error) { res.status(400).json({ message: error.message }); }
};


const markRead = async (req, res) => {
    try {
        const { messageIds } = req.body;
        await Message.updateMany(
            { _id: { $in: messageIds }, readBy: { $ne: req.user._id } },
            { $addToSet: { readBy: req.user._id } }
        );
        res.json({ success: true });
    } catch (error) { res.status(500).json({ message: error.message }); }
}

const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        
        if (!message) return res.status(404).json({ message: "Mesaj bulunamadı" });

        
        if (message.sender.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "Bu mesajı silme yetkiniz yok." });
        }

        await message.deleteOne();
        res.json({ message: "Mesaj silindi", messageId: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getMessages, sendMessage, markRead, deleteMessage };