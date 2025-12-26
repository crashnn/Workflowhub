import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Moon, Sun, User, Shield, LogOut, Save, Lock, Check } from 'lucide-react';

const Settings = () => {
    const { user, logout, updateUser } = useContext(AuthContext);
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

    // Mesajlar için state
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
    const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

    const [profileData, setProfileData] = useState({
        username: user?.username || '',
        email: user?.email || ''
    });

    const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
    const [showPasswordSection, setShowPasswordSection] = useState(false);

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } 
        else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const showMessage = (setter, type, text) => { 
        setter({ type, text }); 
        setTimeout(() => setter({ type: '', text: '' }), 3000); 
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setProfileMsg({ type: '', text: '' });
        try {
            const response = await api.put('/users/profile', profileData);
            updateUser(response.data);
            showMessage(setProfileMsg, 'success', 'Profil bilgileri başarıyla güncellendi.');
        } catch (error) { showMessage(setProfileMsg, 'error', 'Güncelleme başarısız.'); }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setPasswordMsg({ type: '', text: '' });
        if (passwordData.password !== passwordData.confirmPassword) { showMessage(setPasswordMsg, 'error', 'Şifreler eşleşmiyor.'); return; }
        if (passwordData.password.length < 8) { showMessage(setPasswordMsg, 'error', 'Şifre en az 8 karakter olmalı.'); return; }
        try {
            await api.put('/users/profile', { password: passwordData.password });
            showMessage(setPasswordMsg, 'success', 'Şifreniz başarıyla değiştirildi.');
            setPasswordData({ password: '', confirmPassword: '' });
            setShowPasswordSection(false);
        } catch (error) { showMessage(setPasswordMsg, 'error', 'Şifre değiştirilemedi.'); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Ayarlar</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
                    <Sun size={20} className="text-amber-500" /> Görünüm</h2>

                <div className="flex items-center justify-between">

                    <div className="flex items-center gap-3">

                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{darkMode ? <Moon size={20} /> : <Sun size={20} />}</div>
                        <p className="font-medium dark:text-slate-200">Karanlık Mod</p>
                    </div>
                    <button onClick={() => setDarkMode(!darkMode)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white"><User size={20} className="text-blue-500" /> Profil Bilgileri</h2>
                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Kullanıcı Adı</label><input type="text" value={profileData.username} onChange={(e) => setProfileData({ ...profileData, username: e.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white" /></div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">E-posta</label><input type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} className="w-full rounded-lg border border-slate-300 p-2.5 outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white" /></div>
                    
                    <div className="md:col-span-2 flex items-center gap-4">
                        <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"><Save size={18} /> Kaydet</button>
                        
                     
                        {profileMsg.text && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium animate-in fade-in ${profileMsg.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {profileMsg.type === 'success' && <Check size={16} />}
                                {profileMsg.text}
                            </div>
                        )}
                    </div>
                </form>
            </div>

         
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white"><Shield size={20} className="text-violet-500" /> Güvenlik</h2>
                {!showPasswordSection ? (<button onClick={() => setShowPasswordSection(true)} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors dark:text-slate-400 dark:hover:text-blue-400"><Lock size={18} /> Şifremi Değiştirmek İstiyorum</button>) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-900/50 dark:border-slate-700">
                        <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Yeni Şifre</label><input type="password" placeholder="En az 8 karakter" className="w-full rounded-lg border border-slate-300 p-2 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white" value={passwordData.password} onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })} /></div>
                        <div><label className="block text-sm font-medium mb-1 dark:text-slate-300">Yeni Şifre (Tekrar)</label><input type="password" placeholder="Doğrula" className="w-full rounded-lg border border-slate-300 p-2 outline-none dark:bg-slate-800 dark:border-slate-600 dark:text-white" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} /></div>
                        
                        <div className="flex items-center gap-3">
                            <button type="submit" className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700">Şifreyi Güncelle</button>
                            <button type="button" onClick={() => setShowPasswordSection(false)} className="text-slate-500 px-4 py-2 text-sm hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">İptal</button>
                            
                          
                            {passwordMsg.text && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium animate-in fade-in ${passwordMsg.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {passwordMsg.type === 'success' && <Check size={16} />}
                                    {passwordMsg.text}
                                </div>
                            )}
                        </div>
                    </form>
                )}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700"><button onClick={handleLogout} className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors font-medium dark:hover:bg-rose-900/20"><LogOut size={20} /> Çıkış Yap</button></div>
            </div>
        </div>
    );
};

export default Settings;