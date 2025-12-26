import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react'; //
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/dashboard';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import DashboardLayout from './pages/DashboardLayout';
import Settings from './pages/Settings';
import CalendarPage from './pages/CalendarPage';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    // Eğer kayıtlı tema dark ise VEYA kayıt yoksa ama sistem tercihi dark ise
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/login" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetails />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="settings" element={<Settings />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;