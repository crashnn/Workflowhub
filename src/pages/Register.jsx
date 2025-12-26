import { useMemo, useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";

const Register = () => {
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }, []);

  const bgImage = useMemo(
    () => "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80",
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.username || !formData.email || !formData.password) { setError("Lütfen tüm alanları doldurun."); return; }
    if (formData.password.length < 6) { setError("Şifre en az 6 karakter olmalıdır."); return; }

    try {
      setLoading(true);
      const response = await api.post("/auth/register", formData);
      login(response.data);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Kayıt başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-10 bg-white text-slate-900">
      
      {/* SOL: Resim */}
      <div className="relative hidden lg:block lg:col-span-7 h-full">
        <img src={bgImage} alt="Background" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
        <div className="absolute bottom-10 left-10 max-w-lg">
          <h2 className="text-4xl font-bold text-white mb-4">Aramıza Katılın</h2>
          <p className="text-white/90 text-lg leading-relaxed">Ekibinizi kurun, projelerinizi yönetin.</p>
        </div>
      </div>

      {/* SAĞ: Form */}
      <div className="flex items-center justify-center px-6 py-10 lg:col-span-3 bg-slate-50">
        <div className="w-full max-w-md">
          
          <div className="mb-8 text-center lg:text-left">
             <div className="flex items-center gap-3 justify-center lg:justify-start mb-4">
              <img 
                src="/workflowhublogo.png" 
                alt="Logo" 
                className="h-20 w-auto object-contain" 
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <h1 className="text-3xl font-bold text-slate-900">WorkFlowHub</h1>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Hesap Oluştur 🚀</h2>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-600 text-sm border border-rose-100">{error}</div>}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Ad Soyad</label>
                <input type="text" required placeholder="Adınız Soyadınız" value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">E-posta</label>
                <input type="email" required placeholder="ornek@mail.com" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Şifre</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} required placeholder="En az 6 karakter" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-slate-500 hover:text-blue-600">
                    {showPw ? "Gizle" : "Göster"}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-70 transition-all">
                {loading ? "Hesap Oluşturuluyor..." : "Kayıt Ol"}
              </button>

              <div className="text-center text-sm text-slate-600">
                Zaten hesabın var mı? <Link to="/login" className="font-semibold text-blue-600 hover:underline">Giriş Yap</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;