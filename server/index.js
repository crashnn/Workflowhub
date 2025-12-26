const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');  
const connectDB = require('./config/db'); 
const http = require('http'); 
const { Server } = require('socket.io');


require('./models/User');
const Message = require('./models/Message');
const Notification = require('./models/Notification');
const Project = require('./models/Project');

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: '50mb' }));


app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST", "DELETE"] },
    maxHttpBufferSize: 1e8
});

io.on('connection', (socket) => {
    socket.on('join_user', (userId) => { socket.join(userId); });
    socket.on('join_project', (projectId) => { socket.join(projectId); });

    socket.on('send_message', async (data) => {
        const { projectId, senderId, text, image, video } = data;
        try {
            const newMessage = await Message.create({ project: projectId, sender: senderId, text, image, video, readBy: [senderId] });
            const fullMessage = await Message.findById(newMessage._id).populate('sender', 'username email').populate('readBy', 'username');
            io.to(projectId).emit('receive_message', fullMessage);
            
            const project = await Project.findById(projectId);
            if(project) {
                const recipients = [project.owner, ...project.collaborators.map(c=>c.user)].filter(uid=>uid.toString()!==senderId);
                recipients.forEach(async (uid) => {
                    const msg = `${fullMessage.sender.username} mesaj attı.`;
                    await Notification.create({ user: uid, message: msg, type: 'info', link: `/projects/${projectId}` });
                    io.to(uid.toString()).emit('new_notification', { message: msg, link: `/projects/${projectId}` });
                });
            }
        } catch (e) { console.error(e); }
    });

   
    socket.on('delete_message', (data) => {

        io.to(data.projectId).emit('message_deleted', data.messageId);
    });

    socket.on('mark_read', (data) => { socket.to(data.projectId).emit('messages_read', data); });
});

const PORT = process.env.PORT || 5000; 
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));