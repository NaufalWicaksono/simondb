import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronDown, LogOut, Menu } from 'lucide-react';
import { StatusIndicator } from '../ui/StatusIndicator.jsx';
import { fetchStatus } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export function TopBar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dbStatus, setDbStatus] = useState({ database: { connected: true, latency_ms: 0 } });
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchStatus();
        if (mounted) setDbStatus(data);
      } catch { }
    };
    load();
    const id = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const tahunPeriode = new Date().getFullYear();

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'AD';

  const roleBadge = {
    super_admin: 'badge-purple',
    admin:       'badge-blue',
    viewer:      'badge-green',
  }[user?.role] || 'badge-gray';

  const roleLabel = {
    super_admin: 'Super Admin',
    admin:       'Administrator',
    viewer:      'Viewer / Analyst',
  }[user?.role] || user?.role || 'User';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-3 lg:gap-4 z-10 transition-all duration-300">
      {/* Mobile Menu Button */}
      <button 
        onClick={onMenuClick}
        className="lg:hidden p-1.5 -ml-1.5 text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none"
      >
        <Menu size={20} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* DB Status */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
        <StatusIndicator
          connected={dbStatus?.database?.connected}
          latency={dbStatus?.database?.latency_ms}
        />
      </div>

      {/* Mobile DB Status */}
      <div className="flex sm:hidden items-center p-1.5 rounded-lg bg-gray-50 border border-gray-200">
        <StatusIndicator
          connected={dbStatus?.database?.connected}
          hideText={true}
        />
      </div>

      {/* Periode */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
        <CalendarDays size={14} className="text-gray-500" />
        <span className="text-xs font-medium text-gray-600">Periode {tahunPeriode}</span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-gray-200" />

      {/* User Avatar + Dropdown */}
      <div className="relative">
        <button
          id="topbar-user-menu"
          onClick={() => setShowDropdown(v => !v)}
          className="flex items-center gap-2.5 cursor-pointer group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-xs">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.name || 'User'}</p>
            <p className="text-[10px] text-gray-400 leading-tight">{roleLabel}</p>
          </div>
          <span className={`badge ${roleBadge} text-[10px] hidden md:inline-flex`}>{roleLabel}</span>
          <ChevronDown size={14} className={`text-gray-400 group-hover:text-gray-600 transition-all duration-150 ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-fade-in">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{user?.email}</p>
              </div>
              <button
                id="btn-logout"
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                <span>Keluar</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default TopBar;
