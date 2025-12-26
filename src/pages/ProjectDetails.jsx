import { useState, useEffect, useContext, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import {ArrowLeft,ArrowRight,CheckCircle2,Clock,Trash2,Plus,X,Users,Tag,MessageSquare,CheckSquare,Save,Shield,Send,Layout,Activity as ActivityIcon,Image as ImageIcon,Check,CheckCheck,
  Download,
  ZoomIn,
  Lock,
  Video,
  Play,
  Edit2,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import Toast from "../components/Toast";
const SOCKET_URL = "http://localhost:5000";

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("board");
  const [toast, setToast] = useState({ message: "", type: "" });

  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectDescInput, setProjectDescInput] = useState("");
  const [projectDateInput, setProjectDateInput] = useState("");

  const [showMembersModal, setShowMembersModal] = useState(false);

  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [localTaskData, setLocalTaskData] = useState({});
  const [newComment, setNewComment] = useState("");

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileType, setFileType] = useState(null); // image | video
  const [viewMedia, setViewMedia] = useState(null); // {url,type}
  const [socket, setSocket] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const showToast = (message, type = "success") => setToast({ message, type });

  const isProjectLocked = project?.status === "completed";

  const myRole = useMemo(() => {
    if (!project || !user) return "viewer";
    const ownerId = project.owner?._id || project.owner;
    if (ownerId === user._id) return "owner";
    const member = project.collaborators?.find(
      (c) => (c.user?._id || c.user) === user._id
    );
    return member?.role || "viewer";
  }, [project, user]);

  const canEdit = useMemo(() => {
    if (isProjectLocked) return false;
    return ["owner", "editor"].includes(myRole);
  }, [isProjectLocked, myRole]);

  const fetchProjectAndTasks = async () => {
    try {
      setLoading(true);
      const [tasksRes, projRes] = await Promise.all([
        api.get(`/tasks/${id}`),
        api.get("/projects"),
      ]);

      const currentProject = projRes.data.find((p) => p._id === id);

      setTasks(tasksRes.data || []);
      setProject(currentProject || null);

      setProjectDescInput(currentProject?.description || "");
      setProjectDateInput(
        currentProject?.dueDate ? currentProject.dueDate.substring(0, 10) : ""
      );
    } catch (err) {
      console.error(err);
      showToast("Veriler alınamadı", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/activities/${id}`);
      setActivities(res.data || []);
    } catch (err) {
      console.error("Aktivite hatası", err);
    }
  };

  useEffect(() => {
    fetchProjectAndTasks();

    const s = io(SOCKET_URL);
    setSocket(s);
    s.emit("join_project", id);

    return () => {
      s.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (activeTab === "chat") {
      api
        .get(`/messages/${id}`)
        .then((res) => setMessages(res.data || []))
        .catch(console.error);
    }

    if (activeTab === "activity") {
      fetchActivities();
    }
  }, [activeTab, id]);

  useEffect(() => {
    if (!socket) return;

    const onReceive = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    const onDeleted = (deletedId) => {
      setMessages((prev) => prev.filter((m) => m._id !== deletedId));
    };

    const onRead = (data) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const alreadyRead = msg.readBy?.some((u) => u._id === data.userId);
          const isTarget = data.messageIds?.includes(msg._id);
          if (!alreadyRead && isTarget) {
            return {
              ...msg,
              readBy: [...(msg.readBy || []), { _id: data.userId, username: "..." }],
            };
          }
          return msg;
        })
      );
    };

    socket.on("receive_message", onReceive);
    socket.on("message_deleted", onDeleted);
    socket.on("messages_read", onRead);

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("message_deleted", onDeleted);
      socket.off("messages_read", onRead);
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

    if (activeTab !== "chat") return;
    if (!messages?.length) return;
    if (!user?._id) return;

    const unreadIds = messages
      .filter(
        (m) =>
          m.sender?._id !== user._id &&
          !m.readBy?.some((u) => u._id === user._id)
      )
      .map((m) => m._id);

    if (!unreadIds.length) return;

    api.put("/messages/read", { messageIds: unreadIds }).catch(console.error);

    socket?.emit("mark_read", {
      projectId: id,
      userId: user._id,
      messageIds: unreadIds,
    });
  }, [messages, activeTab, id, user, socket]);

  useEffect(() => {
    if (selectedTask) {
      setLocalTaskData({ ...selectedTask });
      setNewComment("");
    } else {
      setLocalTaskData({});
    }
  }, [selectedTask]);

  const updateProjectDetails = async () => {
    try {
      const res = await api.put(`/projects/${id}`, {
        description: projectDescInput,
        dueDate: projectDateInput,
      });

      setProject((prev) => ({
        ...prev,
        description: res.data.description,
        dueDate: res.data.dueDate,
      }));

      showToast("Proje güncellendi");
      setIsEditingProject(false);
    } catch (err) {
      console.error(err);
      showToast("Güncellenemedi", "error");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast("Dosya çok büyük (Max 50MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile(reader.result);
      if (file.type.startsWith("video/")) setFileType("video");
      else setFileType("image");
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (isProjectLocked) return;
    if (!socket) return;

    const hasText = chatInput.trim().length > 0;
    const hasFile = !!selectedFile;

    if (!hasText && !hasFile) return;

    const payload = {
      projectId: id,
      senderId: user._id,
      text: chatInput,
      image: fileType === "image" ? selectedFile : null,
      video: fileType === "video" ? selectedFile : null,
    };

    socket.emit("send_message", payload);

    setChatInput("");
    setSelectedFile(null);
    setFileType(null);
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m._id !== msgId));
      socket?.emit("delete_message", { projectId: id, messageId: msgId });
    } catch (err) {
      console.error("Silinemedi", err);
      showToast("Mesaj silinemedi", "error");
    }
  };

  const downloadMedia = (mediaUrl, type) => {
    const link = document.createElement("a");
    link.href = mediaUrl;
    link.download = `workflow_${type}_${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openCreateModal = () => {
    if (isProjectLocked) return;
    setIsCreating(true);
    setSelectedTask({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      checklist: [],
      comments: [],
    });
  };

  const updateLocalField = (field, value) => {
    if (isProjectLocked) return;
    setLocalTaskData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTask = async () => {
    if (isProjectLocked) return;

    if (!localTaskData.title?.trim()) {
      showToast("Başlık zorunludur", "error");
      return;
    }

    try {
      if (isCreating) {
        const res = await api.post("/tasks", { ...localTaskData, projectId: id });
        setTasks((prev) => [res.data, ...prev]);
        showToast("Görev oluşturuldu!");
      } else {
        const res = await api.put(`/tasks/${localTaskData._id}`, localTaskData);
        setTasks((prev) =>
          prev.map((t) => (t._id === localTaskData._id ? res.data : t))
        );
        showToast("Kaydedildi");
      }

      setSelectedTask(null);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
      showToast("İşlem başarısız", "error");
    }
  };

  const updateStatus = async (e, taskId, newStatus) => {
    e.stopPropagation();
    if (isProjectLocked) return;

    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data : t)));
    } catch (err) {
      console.error(err);
      showToast("Güncellenemedi", "error");
    }
  };

  const deleteTask = async (taskId) => {
    if (isProjectLocked) return;
    if (!window.confirm("Sil?")) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      setSelectedTask(null);
      showToast("Silindi");
    } catch (err) {
      console.error(err);
      showToast("Silinemedi", "error");
    }
  };

  const toggleChecklistFromCard = async (e, task, index) => {
    e.stopPropagation();
    if (isProjectLocked) return;

    const newList = [...(task.checklist || [])];
    newList[index].isDone = !newList[index].isDone;

    const optimistic = { ...task, checklist: newList };
    setTasks((prev) => prev.map((t) => (t._id === task._id ? optimistic : t)));

    try {
      await api.put(`/tasks/${task._id}`, { checklist: newList });
    } catch (err) {
      console.error(err);
      fetchProjectAndTasks();
    }
  };

  const addChecklistItem = () => {
    if (isProjectLocked) return;
    updateLocalField("checklist", [
      ...(localTaskData.checklist || []),
      { text: "Yeni", isDone: false },
    ]);
  };

  const toggleChecklistModal = (idx) => {
    if (isProjectLocked) return;
    const list = [...(localTaskData.checklist || [])];
    list[idx].isDone = !list[idx].isDone;
    updateLocalField("checklist", list);
  };

  const changeChecklistText = (idx, txt) => {
    if (isProjectLocked) return;
    const list = [...(localTaskData.checklist || [])];
    list[idx].text = txt;
    updateLocalField("checklist", list);
  };

  const removeChecklistItem = (idx) => {
    if (isProjectLocked) return;
    updateLocalField(
      "checklist",
      (localTaskData.checklist || []).filter((_, i) => i !== idx)
    );
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (isProjectLocked) return;
    if (!newComment.trim()) return;

    const comment = { user: user._id, text: newComment, createdAt: new Date() };
    const updated = [...(localTaskData.comments || []), comment];

    setLocalTaskData((prev) => ({ ...prev, comments: updated }));
    setNewComment("");

    try {
      await api.put(`/tasks/${localTaskData._id}`, { comments: updated });
    } catch (err) {
      console.error(err);
      showToast("Yorum eklenemedi", "error");
    }
  };

  const changeRole = async (uid, role) => {
    if (isProjectLocked) return;

    try {
      await api.put("/projects/role", { projectId: id, userId: uid, newRole: role });
      showToast("Rol güncellendi");
      fetchProjectAndTasks();
    } catch (err) {
      console.error(err);
      showToast("Rol güncellenemedi", "error");
    }
  };

  const removeMember = async (uid) => {
    if (isProjectLocked) return;

    try {
      await api.post("/projects/remove-member", { projectId: id, userId: uid });
      showToast("Üye çıkarıldı");
      fetchProjectAndTasks();
    } catch (err) {
      console.error(err);
      showToast("Üye çıkarılamadı", "error");
    }
  };

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] relative">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "" })}
      />

      {/* HEADER */}
      <div className="flex flex-col mb-4 gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/projects")}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white truncate">
                  {project?.name}
                </h1>

                {isProjectLocked && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                    <Lock size={12} /> Tamamlandı
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("board")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === "board"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <Layout size={16} /> Görevler
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <MessageSquare size={16} /> Sohbet
            </button>

            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                activeTab === "activity"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <ActivityIcon size={16} /> Aktivite
            </button>
          </div>

          <button
            onClick={() => setShowMembersModal(true)}
            className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <Users size={18} /> Ekip ({project?.collaborators?.length + 1 || 1})
          </button>
        </div>

        <div className="ml-10">
          {canEdit && isEditingProject ? (
            <div className="flex flex-col gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-w-lg">
              <input
                type="text"
                value={projectDescInput}
                onChange={(e) => setProjectDescInput(e.target.value)}
                placeholder="Açıklama"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm dark:text-white"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={projectDateInput}
                  onChange={(e) => setProjectDateInput(e.target.value)}
                  max="2999-12-31"
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs dark:text-white"
                />
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={() => setIsEditingProject(false)}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    İptal
                  </button>
                  <button
                    onClick={updateProjectDetails}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`text-sm text-slate-500 dark:text-slate-400 ${
                canEdit
                  ? "cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 flex flex-col gap-1 group"
                  : ""
              }`}
              onClick={() => canEdit && setIsEditingProject(true)}
            >
              <p className="flex items-center gap-2">
                {project?.description || "Açıklama eklemek için tıklayın..."}
                {canEdit && (
                  <Edit2
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </p>
              {project?.dueDate && (
                <p className="text-xs flex items-center gap-1 text-slate-400">
                  <Clock size={10} />{" "}
                  {new Date(project.dueDate).toLocaleDateString("tr-TR")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {activeTab === "board" && (
        <div className="flex gap-4 overflow-x-auto pb-4 h-full snap-x snap-mandatory px-1 scroll-smooth">
          {["todo", "doing", "done"].map((status) => (
            <div
              key={status}
              className="flex-none w-[85vw] md:flex-1 md:min-w-[300px] flex flex-col h-full snap-center"
            >
              <div
                className={`flex items-center gap-2 p-3 rounded-t-xl border-b-2 bg-white dark:bg-slate-800 dark:border-slate-700 ${
                  status === "todo"
                    ? "border-slate-300"
                    : status === "doing"
                    ? "border-blue-400"
                    : "border-emerald-400"
                }`}
              >
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 capitalize">
                  {status === "todo"
                    ? "Yapılacak"
                    : status === "doing"
                    ? "Yapılıyor"
                    : "Tamamlandı"}
                </h3>
                <span className="ml-auto bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold dark:bg-slate-700 dark:text-slate-300">
                  {tasks.filter((t) => t.status === status).length}
                </span>
              </div>

              <div className="bg-slate-100 p-3 flex-1 overflow-y-auto rounded-b-xl space-y-3 dark:bg-slate-900/50">
                {status === "todo" && canEdit && (
                  <button
                    onClick={openCreateModal}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-all dark:bg-slate-800 dark:border-slate-600 dark:hover:border-blue-400"
                  >
                    <Plus size={20} /> Yeni Görev Ekle
                  </button>
                )}

                {tasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <div
                      key={task._id}
                      onClick={() => {
                        setIsCreating(false);
                        setSelectedTask(task);
                      }}
                      className="group relative bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer dark:bg-slate-800 dark:border-slate-700 flex flex-col gap-2"
                    >
                      {canEdit && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10">
                          {status !== "todo" && (
                            <button
                              onClick={(e) =>
                                updateStatus(
                                  e,
                                  task._id,
                                  status === "done" ? "doing" : "todo"
                                )
                              }
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 dark:hover:bg-slate-700 bg-white/80 dark:bg-slate-800"
                            >
                              <ArrowLeft size={16} />
                            </button>
                          )}
                          {status !== "done" && (
                            <button
                              onClick={(e) =>
                                updateStatus(
                                  e,
                                  task._id,
                                  status === "todo" ? "doing" : "done"
                                )
                              }
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 dark:hover:bg-slate-700 bg-white/80 dark:bg-slate-800"
                            >
                              <ArrowRight size={16} />
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5">
                        {task.priority === "high" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800">
                            YÜKSEK
                          </span>
                        )}
                        {task.priority === "medium" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                            ORTA
                          </span>
                        )}
                        {task.priority === "low" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                            DÜŞÜK
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 pr-14 leading-relaxed">
                        {task.title}
                      </p>

                      {task.checklist?.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {task.checklist.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded cursor-pointer"
                              onClick={(e) =>
                                toggleChecklistFromCard(e, task, idx)
                              }
                            >
                              <div
                                className={`w-3 h-3 rounded border flex items-center justify-center ${
                                  item.isDone
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-slate-300 dark:border-slate-500"
                                }`}
                              >
                                {item.isDone && (
                                  <CheckCircle2 size={10} className="text-white" />
                                )}
                              </div>
                              <span
                                className={
                                  item.isDone
                                    ? "line-through text-slate-400"
                                    : ""
                                }
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
            {messages.map((msg, idx) => {
              const isMe = msg.sender?._id === user._id;
              const isRead =
                msg.readBy && msg.readBy.some((u) => u._id !== user._id);

              return (
                <div key={idx} className={`flex group ${isMe ? "justify-end" : "justify-start"}`}>
                  {isMe && !isProjectLocked && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="self-center mr-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 mr-2 shrink-0">
                      {msg.sender?.username?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 rounded-bl-none"
                    }`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-300 mb-1">
                        {msg.sender?.username}
                      </p>
                    )}

                    {msg.image && (
                      <div
                        className="relative group/media mb-2 cursor-pointer"
                        onClick={() => setViewMedia({ url: msg.image, type: "image" })}
                      >
                        <img
                          src={msg.image}
                          alt="Resim"
                          className="rounded-lg max-w-full max-h-48 object-cover border border-black/10"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                          <ZoomIn
                            className="text-white opacity-0 group-hover/media:opacity-100 drop-shadow-md"
                            size={20}
                          />
                        </div>
                      </div>
                    )}

                    {msg.video && (
                      <div
                        className="relative group/media mb-2 cursor-pointer"
                        onClick={() => setViewMedia({ url: msg.video, type: "video" })}
                      >
                        <div className="relative rounded-lg overflow-hidden border border-black/10 bg-black max-h-48 flex items-center justify-center">
                          <video src={msg.video} className="max-w-full max-h-48 opacity-80" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white/30 backdrop-blur-sm p-3 rounded-full group-hover/media:scale-110 transition-transform">
                              <Play size={24} fill="white" className="text-white ml-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.text && <p>{msg.text}</p>}

                    <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${isMe ? "text-blue-200" : "text-slate-400"}`}>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMe && (isRead ? <CheckCheck size={14} className="text-white" /> : <Check size={14} />)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {isProjectLocked ? (
            <div className="p-4 bg-slate-100 dark:bg-slate-900 text-center text-slate-500 text-sm font-medium border-t border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
              <Lock size={16} /> Bu proje tamamlandı.
            </div>
          ) : (
            <>
              {selectedFile && (
                <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="relative flex items-center gap-2 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
                    {fileType === "image" ? <ImageIcon size={16} /> : <Video size={16} />}
                    <span className="text-xs truncate max-w-[150px]">Dosya Eklendi</span>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setFileType(null);
                      }}
                      className="bg-rose-500 text-white rounded-full p-0.5 ml-2"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-center"
              >
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  <Plus size={20} />
                </button>

                <input
                  type="text"
                  placeholder="Bir mesaj yaz..."
                  className="flex-1 bg-slate-100 dark:bg-slate-900 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white outline-none"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />

                <button
                  type="submit"
                  className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">
            Proje Hareketleri
          </h3>

          <div className="space-y-6">
            {activities.map((act, idx) => (
              <div key={idx} className="flex gap-4 relative">
                {idx !== activities.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-slate-700" />
                )}
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 z-10 font-bold text-xs">
                  {act.user?.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-slate-800 dark:text-slate-200">
                    <span className="font-bold">{act.user?.username}</span>{" "}
                    {act.action}{" "}
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {act.target}
                    </span>
                  </p>
                  {act.details && (
                    <p className="text-xs text-slate-500 mt-0.5 italic">
                      "{act.details}"
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(act.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMedia && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setViewMedia(null)}
        >
          <button
            onClick={() => setViewMedia(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X size={32} />
          </button>

          {viewMedia.type === "image" ? (
            <img
              src={viewMedia.url}
              alt="Tam Ekran"
              className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              controls
              autoPlay
              className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <source src={viewMedia.url} type="video/mp4" />
            </video>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadMedia(viewMedia.url, viewMedia.type);
            }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-200 transition-all shadow-lg"
          >
            <Download size={20} /> İndir
          </button>
        </div>
      )}

      {selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedTask(null)}
        >
          <div className="bg-white dark:bg-slate-800 w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-start p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex-1 mr-4">
                <input
                  className="text-xl font-bold text-slate-800 dark:text-white bg-transparent outline-none w-full placeholder:text-slate-300"
                  placeholder="Görev başlığı..."
                  value={localTaskData.title || ""}
                  onChange={(e) => updateLocalField("title", e.target.value)}
                  readOnly={!canEdit}
                />
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Durum
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm dark:text-white"
                    value={localTaskData.status}
                    onChange={(e) => updateLocalField("status", e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="todo">Yapılacak</option>
                    <option value="doing">Yapılıyor</option>
                    <option value="done">Tamamlandı</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Önem
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm dark:text-white"
                    value={localTaskData.priority || "medium"}
                    onChange={(e) => updateLocalField("priority", e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Orta</option>
                    <option value="high">Yüksek</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                    Son Tarih
                  </label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-sm dark:text-white"
                    value={
                      localTaskData.dueDate ? localTaskData.dueDate.substring(0, 10) : ""
                    }
                    onChange={(e) => updateLocalField("dueDate", e.target.value)}
                    disabled={!canEdit}
                    max="2999-12-31"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 text-slate-800 dark:text-white font-semibold">
                  <Tag size={18} /> Açıklama
                </div>
                <textarea
                  className="w-full min-h-[120px] p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm outline-none dark:text-white"
                  value={localTaskData.description || ""}
                  onChange={(e) => updateLocalField("description", e.target.value)}
                  readOnly={!canEdit}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
                    <CheckSquare size={18} /> Kontrol Listesi
                  </div>
                  {canEdit && (
                    <button
                      onClick={addChecklistItem}
                      className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-medium"
                    >
                      Ekle
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {localTaskData.checklist?.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={item.isDone}
                        onChange={() => toggleChecklistModal(index)}
                        disabled={!canEdit}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        className={`flex-1 bg-transparent text-sm outline-none border-b border-transparent ${
                          item.isDone
                            ? "line-through text-slate-400"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                        value={item.text}
                        onChange={(e) => changeChecklistText(index, e.target.value)}
                        readOnly={!canEdit}
                      />
                      {canEdit && (
                        <button
                          onClick={() => removeChecklistItem(index)}
                          className="text-slate-300 hover:text-rose-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isCreating && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-white font-semibold">
                    <MessageSquare size={18} /> Yorumlar
                  </div>

                  <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto">
                    {localTaskData.comments?.map((comment, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                          {comment.user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!isProjectLocked && (
                    <form onSubmit={addComment} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Yorum yaz..."
                        className="flex-1 text-sm p-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none dark:text-white"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                      >
                        Gönder
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
                {!isCreating ? (
                  <button
                    onClick={() => deleteTask(selectedTask._id)}
                    className="text-rose-500 hover:bg-rose-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Sil
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleSaveTask}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/30"
                  >
                    <Save size={18} /> {isCreating ? "Oluştur" : "Kaydet"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Proje Ekibi
              </h2>
              <button onClick={() => setShowMembersModal(false)}>
                <X size={24} className="text-slate-400 hover:text-rose-500" />
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                    {project?.owner?.username?.charAt(0).toUpperCase() || "P"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">
                      {project?.owner?.username}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                      Yönetici
                    </span>
                  </div>
                </div>
                <Shield size={18} className="text-indigo-500" />
              </div>

              {project?.collaborators?.map((member) => {
                if (!member.user) return null;
                const memberId = member.user._id || member.user;

                return (
                  <div
                    key={memberId}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-sm">
                        {member.user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {member.user.username}
                        </p>
                        <p className="text-xs text-slate-400">{member.user.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canEdit && myRole === "owner" ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => changeRole(memberId, e.target.value)}
                            className="text-xs p-1.5 rounded border border-slate-300 dark:bg-slate-800 dark:text-white dark:border-slate-600 outline-none"
                          >
                            <option value="editor">Düzenleyici</option>
                            <option value="viewer">İzleyici</option>
                          </select>
                          <button
                            onClick={() => removeMember(memberId)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            member.role === "editor"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {member.role === "editor" ? "Düzenleyici" : "İzleyici"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
