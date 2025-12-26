import { useEffect, useState, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle2, Clock, Folder, TrendingUp, Activity, ArrowRight, Download, Users } from "lucide-react";
// Grafikler
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
// PDF için (Import şekli güncellendi)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const colorMap = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resProjects, resActivities, resTasks] = await Promise.all([
            api.get('/projects'),
            api.get('/projects/activities'),
            api.get('/tasks/mine')
        ]);
        
        setProjects(resProjects.data);
        setActivities(resActivities.data);
        setMyTasks(resTasks.data);

      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
      const total = projects.length;
      const completed = projects.filter(p => p.status === 'completed').length;
      const active = total - completed;
      const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, active, completed, efficiency };
  }, [projects]);

  const chartData = [
      { name: 'Devam Eden', value: stats.active, color: '#F59E0B' }, 
      { name: 'Tamamlanan', value: stats.completed, color: '#10B981' }, 
  ];

  // 👇 PDF İNDİRME FONKSİYONU (DÜZELTİLDİ)
  const downloadReport = () => {
      try {
          const doc = new jsPDF();
          
          // Başlık
          doc.setFontSize(18);
          doc.text("WorkFlowHub - Proje Raporu", 14, 20);
          
          doc.setFontSize(11);
          doc.text(`Tarih: ${new Date().toLocaleDateString()}`, 14, 30);
          doc.text(`Toplam: ${stats.total} | Aktif: ${stats.active} | Biten: ${stats.completed}`, 14, 40);

          // Tablo Verisi Hazırlama
          const tableColumn = ["Proje Adi", "Durum", "Bitis Tarihi", "Olusturulma"];
          const tableRows = projects.map(p => [
              p.name, // Türkçe karakterler bazen PDF'te bozuk çıkabilir (kütüphane kaynaklı)
              p.status === 'active' ? 'Devam Ediyor' : 'Tamamlandi',
              p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '-',
              new Date(p.createdAt).toLocaleDateString()
          ]);

          // Tabloyu Çiz
          autoTable(doc, {
              startY: 50,
              head: [tableColumn],
              body: tableRows,
              theme: 'grid',
              styles: { fontSize: 9 },
              headStyles: { fillColor: [41, 128, 185] } // Mavi başlık
          });

          doc.save("WorkFlowHub_Rapor.pdf");
      } catch (error) {
          console.error("PDF Hatası:", error);
          alert("Rapor oluşturulurken bir hata oluştu. Konsolu kontrol edin.");
      }
  };

  if(loading) return <div className="p-8">Yükleniyor...</div>;

  const statCards = [
    { title: "Toplam Proje", value: stats.total, icon: <Folder size={24} className="text-blue-600 dark:text-blue-400" />, bg: "bg-blue-50 dark:bg-blue-900/20" },
    { title: "Devam Eden", value: stats.active, icon: <Clock size={24} className="text-amber-600 dark:text-amber-400" />, bg: "bg-amber-50 dark:bg-amber-900/20" },
    { title: "Tamamlanan", value: stats.completed, icon: <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400" />, bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { title: "Verimlilik", value: `%${stats.efficiency}`, icon: <TrendingUp size={24} className="text-violet-600 dark:text-violet-400" />, bg: "bg-violet-50 dark:bg-violet-900/20" },
  ];

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Genel Bakış</h1>
          {/* PDF Butonu */}
          <button onClick={downloadReport} className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-500/20">
              <Download size={18} /> Rapor İndir
          </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700 transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${stat.bg}`}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SOL KOLON */}
        <div className="lg:col-span-2 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* GRAFİK ALANI */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700 flex flex-col items-center justify-center min-h-[300px]">
                    <h3 className="font-bold text-slate-800 dark:text-white w-full mb-2">Proje Durumları</h3>
                    {stats.total > 0 ? (
                        <div className="w-full h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm flex flex-col items-center">
                            <Folder size={40} className="mb-2 opacity-20"/>
                            Veri yok
                        </div>
                    )}
                </div>

                {/* SON PROJELER */}
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 dark:text-white">Son Projeler</h3>
                        <button onClick={() => navigate('/projects')} className="text-sm text-blue-600 font-medium hover:underline">Tümünü Gör</button>
                    </div>
                    <div className="space-y-3">
                        {projects.slice(0, 3).map((project) => (
                            <div key={project._id} onClick={() => navigate(`/projects/${project._id}`)} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors dark:border-slate-700 dark:hover:bg-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold uppercase text-sm ${colorMap[project.color || 'blue']}`}>
                                        {project.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-[120px]">{project.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {project.status === 'completed' ? 'Tamamlandı' : 'Devam Ediyor'}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-slate-300" />
                            </div>
                        ))}
                        {projects.length === 0 && <p className="text-slate-400 text-sm">Henüz proje yok.</p>}
                    </div>
                </div>
            </div>

            {/* AKTİVİTE AKIŞI */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={20} className="text-blue-500"/>
                    <h3 className="font-bold text-slate-800 dark:text-white">Aktivite Akışı</h3>
                </div>
                
                <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {activities.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Henüz aktivite yok.</p>}
                    {activities.map((act) => (
                        <div key={act._id} className="relative flex gap-4">
                            <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-slate-100 dark:bg-slate-700 last:hidden"></div>
                            <div className="mt-1 min-w-[24px] h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 z-10">
                                {act.user?.username?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                                <p className="text-sm text-slate-800 dark:text-slate-200">
                                    <span className="font-semibold">{act.user?.username}</span> {act.action} 
                                    {act.project && (
                                        <span className="text-slate-400 dark:text-slate-500 mx-1">
                                              — <span className={`text-xs px-1.5 py-0.5 rounded-md ${colorMap[act.project.color || 'blue']}`}>{act.project.name}</span>
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {new Date(act.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>

        
        <div className="space-y-6">
            
           
           <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:bg-slate-800 dark:border-slate-700 h-fit">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-blue-500"/>
                        <h3 className="font-bold text-slate-800 dark:text-white">Bana Atananlar</h3>
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold">
                        {myTasks.length}
                    </span>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {myTasks.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 size={24} className="text-emerald-500"/>
                            </div>
                            <p className="text-sm font-medium text-slate-800 dark:text-white">Her şey yolunda!</p>
                        </div>
                    )}

                    {myTasks.map(task => (
                        <div key={task._id} onClick={() => navigate(`/projects/${task.project._id}`)} className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${colorMap[task.project?.color || 'blue']}`}>
                                    {task.project?.name}
                                </span>
                                {task.priority === 'high' && <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-1.5 py-0.5 rounded">ACİL</span>}
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {task.title}
                            </p>
                            {task.dueDate && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                    <Clock size={12} className={new Date(task.dueDate) < new Date() ? "text-rose-500" : ""} />
                                    <span className={new Date(task.dueDate) < new Date() ? "text-rose-500 font-medium" : ""}>
                                        {new Date(task.dueDate).toLocaleDateString('tr-TR', {day:'numeric', month:'short'})}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

          
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <Users size={20} className="text-white"/>
                    </div>
                    <h3 className="font-bold text-lg">Takım Çalışması 🚀</h3>
                </div>
                <p className="text-indigo-100 text-sm mb-4 leading-relaxed">
                    Projelerine arkadaşlarını davet ederek iş bölümü yapabilirsin. Unutma, 'Tamamlandı' işaretlenen projeler kilitlenir!
                </p>
                <button onClick={() => navigate('/projects')} className="w-full bg-white text-indigo-700 hover:bg-indigo-50 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Projelerine Git
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;