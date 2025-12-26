import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect, useRef, useMemo } from "react";
import io from "socket.io-client";
import {
  LayoutDashboard,
  Folder,
  Settings,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Calendar,
  Trash2,
} from "lucide-react";

import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const SOCKET_URL = "http://localhost:5000";

const DashboardLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  // ---------------- UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  // ---------------- notifications
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  // ---------------- search
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const searchRef = useRef(null);

  // ---------------- socket
  const socketRef = useRef(null);

  const menuItems = useMemo(
    () => [
      { path: "/dashboard", label: "Genel Bakış", icon: <LayoutDashboard size={20} /> },
      { path: "/projects", label: "Projeler", icon: <Folder size={20} /> },
      { path: "/calendar", label: "Takvim", icon: <Calendar size={20} /> },
      { path: "/settings", label: "Ayarlar", icon: <Settings size={20} /> },
    ],
    []
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // ---------------- auth guard
  useEffect(() => {
    if (!user && !localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  // ---------------- notifications load + socket
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");
        setNotifications(res.data || []);
      } catch (err) {
        // sessiz geçiyorum, UI zaten boş kalır
      }
    };

    if (!user?._id) return;

    fetchNotifications();

    if (!socketRef.current) {
      const s = io(SOCKET_URL);
      socketRef.current = s;

      s.emit("join_user", user._id);

      s.on("new_notification", (data) => {
        setNotifications((prev) => [
          {
            _id: Date.now(), // backend id gelmiyorsa fallback
            message: data.message,
            link: data.link,
            read: false,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user]);

  // ---------------- click outside
  useEffect(() => {
    const onOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearching(false);
      }
    };

    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  // ---------------- search (debounce)
  useEffect(() => {
    const runSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      const q = searchQuery.toLowerCase();
      const results = [];

      // pages
      menuItems.forEach((item) => {
        if (item.label.toLowerCase().includes(q)) {
          results.push({ type: "page", title: item.label, link: item.path });
        }
      });

      // projects
      try {
        const res = await api.get("/projects");
        (res.data || []).forEach((p) => {
          if ((p.name || "").toLowerCase().includes(q)) {
            results.push({ type: "project", title: p.name, link: `/projects/${p._id}` });
          }
        });
      } catch (err) {
        // projects gelmezse sadece sayfalarla devam
      }

      setSearchResults(results);
    };

    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [searchQuery, menuItems]);

  // ---------------- handlers
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleOpenSidebar = () => setIsSidebarOpen(true);
  const handleCloseSidebar = () => setIsSidebarOpen(false);

  const handleToggleNotif = () => setShowNotif((prev) => !prev);

  const handleReadNotif = async (notif) => {
    try {
      if (!notif.read && notif._id) {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
      }
    } catch (err) {
      // backend hata verse bile kullanıcı tıklayınca yönlendirelim
    }

    if (notif.link) {
      navigate(notif.link);
      setShowNotif(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {}
  };

  const handleDeleteNotif = async (e, notifId) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${notifId}`);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    } catch (error) {
      console.error("Bildirim silinemedi");
    }
  };

  const getPageTitle = () => {
    const exact = menuItems.find((i) => i.path === location.pathname);
    if (exact) return exact.label;
    if (location.pathname.startsWith("/projects/")) return "Proje Detayları";
    return "Dashboard";
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800 justify-between">
        <div className="flex items-center gap-3">
          <img src="/workflowhublogo.png" alt="Logo" className="h-8 w-auto object-contain" />
          <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
            WorkFlowHub
          </span>
        </div>
        <button onClick={handleCloseSidebar} className="md:hidden text-slate-500 ml-auto">
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleCloseSidebar}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group cursor-pointer">
          <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold text-xs uppercase">
            {user?.username?.substring(0, 2).toUpperCase() || "AD"}
          </div>

          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {user?.username || "Kullanıcı"}
            </p>
            <p className="truncate text-xs text-slate-400">Yönetici</p>
          </div>

          <button onClick={handleLogout} title="Çıkış Yap">
            <LogOut
              size={16}
              className="text-slate-400 group-hover:text-rose-500 transition-colors"
            />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans transition-colors duration-300">
      {/* desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col h-full fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>

      {/* mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={handleCloseSidebar}
        />
      )}

      {/* mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden relative md:pl-64 transition-all duration-300">
        {/* header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 transition-colors duration-300 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSidebar}
              className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-white truncate">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* search */}
            <div className="relative hidden sm:block" ref={searchRef}>
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Proje veya sayfa ara..."
                className="h-9 w-40 lg:w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-4 text-sm text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearching(true);
                }}
                onFocus={() => setIsSearching(true)}
              />

              {isSearching && searchQuery && (
                <div className="absolute top-10 left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                  {searchResults.length > 0 ? (
                    searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          navigate(result.link);
                          setIsSearching(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          {result.type === "page" ? (
                            <LayoutDashboard size={16} className="text-slate-400" />
                          ) : (
                            <Folder size={16} className="text-blue-500" />
                          )}
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                            {result.title}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-400">
                      Sonuç bulunamadı.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleToggleNotif}
                className="relative rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 border border-white dark:border-slate-900 animate-pulse" />
                )}
              </button>

              {showNotif && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-slate-800 dark:text-white">
                        Bildirimler
                      </h3>
                      {unreadCount > 0 && (
                        <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-[10px] text-blue-600 hover:underline">
                        Hepsini Oku
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Bell size={24} className="mb-2 opacity-20" />
                        <p className="text-sm">Bildirim yok.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => handleReadNotif(n)}
                          className={`group relative p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                            !n.read ? "bg-blue-50/40 dark:bg-blue-900/10" : ""
                          }`}
                        >
                          {!n.read && (
                            <div className="absolute left-1 top-4 w-1.5 h-1.5 rounded-full bg-blue-500" />
                          )}

                          <div className={`flex justify-between items-start ${!n.read ? "pl-2" : ""}`}>
                            <div>
                              <p
                                className={`text-sm line-clamp-2 ${
                                  !n.read
                                    ? "text-slate-800 dark:text-white font-medium"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {n.message}
                              </p>

                              <p className="text-[10px] text-slate-400 mt-1 flex justify-between gap-2">
                                <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                <span>
                                  {new Date(n.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </p>
                            </div>

                            <button
                              onClick={(e) => handleDeleteNotif(e, n._id)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                              title="Bildirimi Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
