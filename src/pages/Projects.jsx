import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api'; 
// 👇 DÜZELTME: Edit EKLENDİ
import { Plus, Folder, Calendar, UserPlus, Trash2, CheckCircle2, Circle, Clock, Copy, User, Edit } from 'lucide-react';

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal ve Düzenleme State'leri
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); 
  const [editingId, setEditingId] = useState(null); 
  
  const [joinCode, setJoinCode] = useState("");
  const [formData, setFormData] = useState({ name: '', description: '', dueDate: '', color: 'blue' });

  const colors = [
    { name: 'blue', bg: 'bg-blue-500', border: 'border-blue-200', soft: 'bg-blue-50 text-blue-600' },
    { name: 'purple', bg: 'bg-purple-500', border: 'border-purple-200', soft: 'bg-purple-50 text-purple-600' },
    { name: 'green', bg: 'bg-emerald-500', border: 'border-emerald-200', soft: 'bg-emerald-50 text-emerald-600' },
    { name: 'orange', bg: 'bg-orange-500', border: 'border-orange-200', soft: 'bg-orange-50 text-orange-600' },
    { name: 'rose', bg: 'bg-rose-500', border: 'border-rose-200', soft: 'bg-rose-50 text-rose-600' },
  ];

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => { try { const res = await api.get('/projects'); setProjects(res.data); } catch(e) { console.log(e); } finally { setLoading(false); } }

  const openNewModal = () => {
      setIsEditing(false);
      setFormData({ name: '', description: '', dueDate: '', color: 'blue' });
      setShowModal(true);
  };

  const openEditModal = (e, project) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditingId(project._id);
      setFormData({
          name: project.name,
          description: project.description || '',
          dueDate: project.dueDate ? project.dueDate.substring(0, 10) : '',
          color: project.color || 'blue'
      });
      setShowModal(true);
  };

  const handleSubmitForm = async (e) => {
     e.preventDefault();
     if(!formData.name) return;
     
     try {
        if (isEditing) {
            const res = await api.put(`/projects/${editingId}`, formData);
            setProjects(projects.map(p => p._id === editingId ? res.data : p));
        } else {
            const res = await api.post('/projects', formData);
            setProjects([res.data, ...projects]);
        }
        setShowModal(false);
     } catch(err) { console.error("Hata", err); }
  }

  const handleJoin = async (e) => { e.preventDefault(); if(!joinCode) return; try { const res = await api.post('/projects/join', { code: joinCode }); setProjects([res.data, ...projects]); setJoinCode(""); } catch (err) { console.error("Katılım başarısız", err); } };
  
  const handleDelete = async (e, projectId) => { 
      e.stopPropagation(); 
      if(!window.confirm("Bu projeyi silmek istediğine emin misin?")) return; 
      try { 
          await api.delete(`/projects/${projectId}`); 
          setProjects(projects.filter(p => p._id !== projectId)); 
      } catch (error) { console.error("Silinemedi"); } 
  };

  const toggleStatus = async (e, project) => { 
      e.stopPropagation(); 
      const newStatus = project.status === 'active' ? 'completed' : 'active'; 
      try { 
          const res = await api.put(`/projects/${project._id}`, { status: newStatus }); 
          setProjects(projects.map(p => p._id === project._id ? res.data : p)); 
      } catch (error) { console.error("Güncellenemedi"); } 
  };

  const getColorStyle = (colorName) => { return colors.find(c => c.name === colorName) || colors[0]; };

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="relative pb-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Projelerim</h1><p className="text-slate-500 dark:text-slate-400">Projelerini takip et ve yönet.</p></div>
        <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleJoin} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                <div className="pl-3 text-slate-400"><UserPlus size={18} /></div>
                <input type="text" placeholder="Davet Kodu" className="w-full sm:w-40 outline-none text-sm bg-transparent dark:text-white placeholder:text-slate-400" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                <button type="submit" className="whitespace-nowrap bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs font-bold px-3 py-2 rounded-lg transition-colors">Katıl</button>
            </form>
            <button onClick={openNewModal} className="whitespace-nowrap flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/20 transition-all">
              <Plus size={20} /> Yeni Proje
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 && <div className="p-4 text-slate-500 dark:text-slate-400">Henüz proje yok.</div>}

        {projects.map((project) => {
          const style = getColorStyle(project.color);
          const isCompleted = project.status === 'completed';
          
          const isOwner = project.owner._id === user._id;
          const myMemberInfo = project.collaborators.find(c => c.user._id === user._id);
          const isEditor = myMemberInfo && myMemberInfo.role === 'editor';
          
          const canEdit = isOwner || isEditor;

          return (
            <div 
              key={project._id} 
              onClick={() => navigate(`/projects/${project._id}`)}
              className={`
                relative bg-white dark:bg-slate-800 p-6 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg
                ${isCompleted ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10' : `border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700`}
              `}
            >
              
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : style.soft}`}>
                  {isCompleted ? <CheckCircle2 size={24} /> : <Folder size={24} />}
                </div>
                
                <div className="flex gap-2">
                    {canEdit && (
                        <button 
                            onClick={(e) => openEditModal(e, project)}
                            className="text-slate-300 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Düzenle"
                        >
                            <Edit size={18} />
                        </button>
                    )}

                    {isOwner && (
                        <button 
                            onClick={(e) => handleDelete(e, project._id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"
                            title="Sil"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
              </div>
              
              <h3 className={`text-lg font-bold mb-1 transition-all ${isCompleted ? 'text-emerald-800 dark:text-emerald-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                  {project.name}
              </h3>

              <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <User size={12} />
                  <span>Sahibi: <span className="text-slate-700 dark:text-slate-200">{isOwner ? 'Sen' : project.owner.username}</span></span>
              </div>
              
              <div className="mb-3 flex items-center gap-2" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(project.inviteCode); }}>
                <span className="flex items-center gap-1 text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-slate-600 hover:text-blue-600 cursor-copy transition-colors group/code">
                    <Copy size={10} className="opacity-50 group-hover/code:opacity-100"/> {project.inviteCode || "Kod Yok"}
                </span>
              </div>

              <p className={`text-sm line-clamp-2 mb-6 h-10 ${isCompleted ? 'text-emerald-600/70 dark:text-emerald-400/50' : 'text-slate-500 dark:text-slate-400'}`}>
                {project.description || "Açıklama yok."}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                 {project.dueDate ? (
                   <div className={`flex items-center text-xs gap-2 font-medium ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      <Clock size={14} /> <span>{new Date(project.dueDate).toLocaleDateString('tr-TR')}</span>
                   </div>
                 ) : ( <span className="text-xs text-slate-400">Tarih yok</span> )}
                 
                 {canEdit && (
                     <button 
                       onClick={(e) => toggleStatus(e, project)}
                       className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                           isCompleted 
                           ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' 
                           : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700'
                       }`}
                     >
                        {isCompleted ? ( <>Geri Al <Clock size={12}/></> ) : ( <>Tamamla <CheckCircle2 size={12}/></> )}
                     </button>
                 )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                 
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                        {isEditing ? 'Projeyi Düzenle' : 'Yeni Proje Oluştur'}
                    </h2>
                    <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                        <Plus size={24} className="rotate-45" />
                    </button>
                 </div>

                 <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proje Adı</label>
                        <input className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                            placeholder="Örn: Mobil Uygulama Tasarımı" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} autoFocus />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                        <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none" 
                            placeholder="Proje hakkında kısa bilgi..." rows="3" value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bitiş Tarihi</label>
                            <input type="date" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                                value={formData.dueDate} onChange={e=>setFormData({...formData, dueDate:e.target.value})} max="2999-12-31" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Renk Etiketi</label>
                            <div className="flex items-center gap-2 mt-2">
                                {colors.map((color) => (
                                    <button key={color.name} type="button" onClick={() => setFormData({...formData, color: color.name})}
                                        className={`w-6 h-6 rounded-full ${color.bg} transition-transform hover:scale-110 ${formData.color === color.name ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110' : ''}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                 
                    <div className="flex gap-3 mt-6 pt-2">
                        <button type="button" onClick={()=>setShowModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 transition-colors">İptal</button>
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all">
                            {isEditing ? 'Güncelle' : 'Oluştur'}
                        </button>
                    </div>
                 </form>
             </div>
        </div>
       )}
    </div>
  );
};

export default Projects;