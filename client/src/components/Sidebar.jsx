import { Home, Clock, Users, Bell, Calendar, AlertTriangle, Settings, HelpCircle, X, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { logout } from '../services/auth';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Clock, label: 'Interactions', path: '/dashboard/interactions' },
    { icon: Users, label: 'Contacts', path: '/dashboard/contacts' },
    { icon: Bell, label: 'Alerts', path: '/dashboard/alerts' },
    { icon: Calendar, label: 'Reminders', path: '/dashboard/reminders' },
    { icon: AlertTriangle, label: 'SOS Settings', path: '/dashboard/sos' },
  ];

  const bottomNavItems = [
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
    { icon: HelpCircle, label: 'Help & Support', path: '/dashboard/help' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-screen bg-white border-r border-gray-200 z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-72 flex flex-col
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-2xl text-gray-900">MindTrace</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                    transition-all duration-200 font-medium text-sm
                    ${active
                      ? 'bg-gray-900 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${active ? '' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t border-gray-200 space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200 font-medium text-sm
                  ${active
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`h-5 w-5 ${active ? '' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 text-red-500" />
            <span>Logout</span>
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">John Doe</p>
              <p className="text-xs text-gray-500 truncate">Caregiver</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
