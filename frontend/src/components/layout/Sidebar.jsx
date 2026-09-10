import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Download,
  ChevronRight,
  Database,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

const ALL_NAV_ITEMS = [
  { to: '/',               icon: LayoutDashboard,  label: 'Dashboard Query Builder', roles: null },
  { to: '/revitalisasi',   icon: Building2,        label: 'Operasional & Fasilitas', roles: null },
  { to: '/export-data',    icon: Download,         label: 'Export Data Warehouse',   roles: null },
  { to: '/users',          icon: Users,            label: 'Manajemen Pengguna',      roles: ['admin', 'super_admin'] },
];

export function Sidebar({ isOpen, setIsOpen }) {
  const location    = useLocation();
  const { user }    = useAuth();
  const currentRole = user?.role;

  const navItems = ALL_NAV_ITEMS.filter(
    item => item.roles === null || (currentRole && item.roles.includes(currentRole))
  );

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-30 select-none transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo / Branding */}
        <div className="px-5 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Database size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">SiMonDB Demo</p>
              <p className="text-[10px] text-emerald-600 font-semibold leading-tight mt-0.5">Enterprise Platform</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600 rounded-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">
            Menu Navigasi
          </p>
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span className="flex-1 text-xs font-semibold">{label}</span>
                {isActive && <ChevronRight size={14} className="opacity-70" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[10px] text-gray-400 text-center">
            SiMonDB Standalone v2.0
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
