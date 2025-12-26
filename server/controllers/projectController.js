const Project = require('../models/Project');
const Notification = require('../models/Notification');
const Task = require('../models/Task'); // 👇 EKLENDİ
const Message = require('../models/Message'); // 👇 EKLENDİ
const Activity = require('../models/Activity'); // 👇 EKLENDİ
const logActivity = require('../utils/logActivity');
const generateCode = () => 'PRJ-' + Math.floor(1000 + Math.random() * 9000);

const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'collaborators.user': req.user._id } 
      ]
    })
    .populate('owner', 'username email') 
    .populate('collaborators.user', 'username email')
    .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createProject = async (req, res) => {
    try {
      const { name, description, dueDate, color } = req.body;
      const project = await Project.create({
        name, description, dueDate, color,
        owner: req.user._id,
        inviteCode: generateCode()
      });
      await logActivity(req.user._id, project._id, "projeyi oluşturdu", name);
      res.status(201).json(project);
    } catch (error) { res.status(400).json({ message: error.message }); }
};

const joinProject = async (req, res) => {
    try {
        const { code } = req.body;
        const project = await Project.findOne({ inviteCode: code });

        if (!project) return res.status(404).json({ message: "Geçersiz kod" });

        const isMember = project.collaborators.some(c => c.user.toString() === req.user._id.toString());
        if (project.owner.toString() === req.user._id.toString() || isMember) {
            return res.status(400).json({ message: "Zaten bu projedesiniz" });
        }

        project.collaborators.push({ user: req.user._id, role: 'viewer' });
        await project.save();

        await logActivity(req.user._id, project._id, "projeye katıldı", project.name);

        if (project.owner.toString() !== req.user._id.toString()) {
            await Notification.create({
                user: project.owner,
                message: `${req.user.username} "${project.name}" projesine katıldı.`,
                type: 'info',
                link: `/projects/${project._id}`
            });
        }

        res.json(project);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateMemberRole = async (req, res) => {
    try {
        const { projectId, userId, newRole } = req.body;
        const project = await Project.findById(projectId);
        if (project.owner.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Yetkisiz işlem." });

        const memberIndex = project.collaborators.findIndex(c => c.user.toString() === userId);
        if (memberIndex > -1) {
            project.collaborators[memberIndex].role = newRole;
            await project.save();
            res.json(project);
        } else {
            res.status(404).json({ message: "Üye bulunamadı" });
        }
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const removeMember = async (req, res) => {
    try {
        const { projectId, userId } = req.body;
        const project = await Project.findById(projectId);
        if (project.owner.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Yetkisiz işlem." });

        project.collaborators = project.collaborators.filter(c => c.user.toString() !== userId);
        await project.save();
        res.json(project);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

const getActivities = async (req, res) => {
    try {
       const userProjects = await Project.find({
           $or: [ { owner: req.user._id }, { 'collaborators.user': req.user._id } ]
       }).select('_id');

       const projectIds = userProjects.map(p => p._id);
       const activities = await Activity.find({ project: { $in: projectIds } })
       .populate('user', 'username')
       .populate('project', 'name color')
       .sort({ createdAt: -1 })
       .limit(20);
       
       res.json(activities);
    } catch (error) { res.status(500).json({ message: error.message }); }
}

// 👇 KRİTİK GÜNCELLEME: Proje silinince her şeyi temizle
const deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Bulunamadı' });
        if(project.owner.toString() !== req.user._id.toString()) return res.status(401).json({message: 'Yetkisiz'});
        
        // İlişkili tüm verileri sil (Temizlik)
        await Task.deleteMany({ project: project._id });
        await Message.deleteMany({ project: project._id });
        await Activity.deleteMany({ project: project._id });
        
        await project.deleteOne();
        res.json({ message: 'Proje ve ilişkili tüm veriler silindi.' });
      } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if(!project) return res.status(404).json({message: 'Proje bulunamadı'});

        const oldStatus = project.status;
        const updatedProject = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('owner', 'username email')
            .populate('collaborators.user', 'username email');

        if (oldStatus !== 'completed' && req.body.status === 'completed') {
            await logActivity(req.user._id, project._id, "projeyi tamamladı", project.name);
            const recipients = [project.owner, ...project.collaborators.map(c => c.user)].filter(u => u._id.toString() !== req.user._id.toString());
            const notifications = recipients.map(u => ({
                user: u._id,
                message: `"${project.name}" projesi tamamlandı! 🎉`,
                type: 'success',
                link: `/projects/${project._id}`
            }));
            if(notifications.length > 0) await Notification.insertMany(notifications);
        }
        res.json(updatedProject);
      } catch (error) { res.status(400).json({ message: error.message }); }
};

module.exports = { getProjects, createProject, joinProject, getActivities, deleteProject, updateProject, updateMemberRole, removeMember };