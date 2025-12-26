import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ChevronLeft, ChevronRight, CheckCircle2, Plus, X, Folder } from 'lucide-react';

const CalendarPage = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(""); 
  const [formData, setFormData] = useState({ name: '', description: '', color: 'blue' });

  const colorMap = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    purple: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
    rose: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  };

  const colors = [
    { name: 'blue', bg: 'bg-blue-500' }, { name: 'purple', bg: 'bg-purple-500' },
    { name: 'green', bg: 'bg-emerald-500' }, { name: 'orange', bg: 'bg-orange-500' },
    { name: 'rose', bg: 'bg-rose-500' },
  ];

  useEffect(() => {
    const fetchData = async () => {
        try {
          const [resTasks, resProjects] = await Promise.all([
              api.get('/tasks/calendar'),
              api.get('/projects')
          ]);
          setTasks(resTasks.data);
          setProjects(resProjects.data);
        } catch (error) { console.error("Veri hatası", error); }
        finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); 
  
  const changeMonth = (offset) => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate); 
  
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));

  const isToday = (date) => {
      const today = new Date();
      return date && date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  }

  const openCreateModal = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setSelectedDate(`${year}-${month}-${day}`);
      setFormData({ name: '', description: '', color: 'blue' });
      setShowModal(true);
  };

  const handleCreateProject = async (e) => {
      e.preventDefault();
      if(!formData.name) return;
      try {
         const payload = { ...formData, dueDate: selectedDate };
         const res = await api.post('/projects', payload);
         setProjects([res.data, ...projects]);
         setShowModal(false);
      } catch(err) { alert("Hata oluştu"); }
   }

  if (loading) return <div className="p-8">Takvim yükleniyor...</div>;

  return (
    <div className="flex flex-col h-full relative">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white capitalize text-center sm:text-left">
            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
        </h1>

        <div className="flex justify-between sm:justify-end gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                <ChevronLeft size={20}/>
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white transition-colors">
                Bugün
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shadow-sm">
                <ChevronRight size={20}/>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-4 mb-2">
          {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day) => (
              <div key={day} className="text-center text-[10px] sm:text-sm font-semibold text-slate-400 uppercase tracking-wider py-2">
                  {day}
              </div>
          ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-4 auto-rows-fr pb-10">
          {days.map((date, index) => {
              if (!date) return <div key={index} className="bg-transparent"></div>;

              const dayTasks = tasks.filter(task => {
                  if (!task.dueDate) return false;
                  const d = new Date(task.dueDate);
                  return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
              });

              const dayProjects = projects.filter(proj => {
                  if (!proj.dueDate) return false;
                  const d = new Date(proj.dueDate);
                  return d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
              });

              return (
                  <div 
                    key={index} 
                   
                    className={`group relative min-h-[80px] sm:min-h-[100px] lg:min-h-[140px] p-1 sm:p-2 rounded-lg sm:rounded-xl border transition-all hover:shadow-md
                        ${isToday(date) ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700'}
                    `}
                    onClick={() => {

                        if (window.innerWidth < 640) openCreateModal(date);
                    }}
                  >
                     
                      <div className="flex justify-between items-start mb-1 sm:mb-2">
                          <span className={`text-xs sm:text-sm font-semibold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full ${isToday(date) ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                              {date.getDate()}
                          </span>
                          
                          {/* Desktop Hover Butonu */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); openCreateModal(date); }}
                            className="hidden sm:group-hover:flex w-6 h-6 items-center justify-center bg-blue-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                          >
                              <Plus size={14} />
                          </button>
                      </div>

                 
                      <div className="space-y-1 overflow-y-auto max-h-[50px] sm:max-h-[70px] lg:max-h-[100px] pr-0.5 custom-scrollbar">

                          {dayProjects.map(proj => (
                              <div 
                                key={`proj-${proj._id}`}
                                onClick={(e) => { e.stopPropagation(); navigate(`/projects/${proj._id}`); }}
                                className={`text-[9px] sm:text-xs p-1 rounded border cursor-pointer truncate flex items-center gap-1 font-bold border-l-[3px] ${colorMap[proj.color || 'blue']}`}
                                style={{ borderLeftColor: 'currentColor' }}
                              >
                                
                                <Folder size={10} className="hidden sm:block"/>
                                <span className="truncate">{proj.name}</span>
                              </div>
                          ))}

                          {dayTasks.map(task => (
                              <div 
                                key={`task-${task._id}`}
                                onClick={(e) => { e.stopPropagation(); navigate(`/projects/${task.project._id}`); }}
                                className={`text-[9px] sm:text-xs p-1 rounded border cursor-pointer truncate flex items-center gap-1 opacity-90
                                    ${colorMap[task.project?.color || 'blue']}
                                    ${task.status === 'done' ? 'opacity-50 line-through' : ''}
                                `}
                              >
                                <CheckCircle2 size={10} className="hidden sm:block"/>
                                <span className="truncate">{task.title}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              );
          })}
      </div>

  
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-700">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Yeni Proje</h2>
                    <button onClick={()=>setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={24} /></button>
                 </div>

                 <form onSubmit={handleCreateProject} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proje Adı</label>
                        <input className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500" 
                            placeholder="Proje Adı" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                        <textarea className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500 resize-none" 
                            placeholder="Detaylar..." rows="2" value={formData.description} onChange={e=>setFormData({...formData, description:e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bitiş Tarihi</label>
                            <input type="date" className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                                value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Renk</label>
                            <div className="flex items-center gap-2 mt-2">
                                {colors.map((c) => (
                                    <button key={c.name} type="button" onClick={() => setFormData({...formData, color: c.name})}
                                        className={`w-6 h-6 rounded-full ${c.bg} hover:scale-110 transition-transform ${formData.color === c.name ? 'ring-2 ring-offset-2 ring-slate-400' : ''}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                 
                    <div className="flex gap-3 mt-6 pt-2">
                        <button type="button" onClick={()=>setShowModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200">İptal</button>
                        <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 shadow-lg">Oluştur</button>
                    </div>
                 </form>
             </div>
        </div>
       )}
    </div>
  );
};

export default CalendarPage;