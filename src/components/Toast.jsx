import { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); 
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-bottom-5 duration-300 ${
        type === 'success' 
        ? 'bg-white border-emerald-100 text-emerald-700 dark:bg-slate-800 dark:border-emerald-900/50 dark:text-emerald-400' 
        : 'bg-white border-rose-100 text-rose-700 dark:bg-slate-800 dark:border-rose-900/50 dark:text-rose-400'
    }`}>

      {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}

      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={16}/></button>
      
    </div>
  );
};

export default Toast;