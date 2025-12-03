import { useState, useEffect } from 'react';
import { Search, Bell, Menu, Battery, Wifi, LogOut } from 'lucide-react';
import { logout } from '../services/auth';

const DashboardHeader = ({ onMenuClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [glassesConnected, setGlassesConnected] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(87);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate battery drain
      setBatteryLevel((prev) => Math.max(prev - 1, 20));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const getBatteryColor = () => {
    if (batteryLevel > 50) return 'text-emerald-600';
    if (batteryLevel > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts, interactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-all duration-200 text-sm"
            />
          </div>
        </div>

        {/* Right: Status + Notifications + Profile */}
        <div className="flex items-center gap-4">
          {/* Glasses Status */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <div className={`relative ${glassesConnected ? '' : 'opacity-40'}`}>
                <Wifi className={`h-4 w-4 ${glassesConnected ? 'text-emerald-600' : 'text-gray-400'}`} />
                {glassesConnected && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                )}
              </div>
              <Battery className={`h-4 w-4 ${getBatteryColor()}`} />
              <span className="text-xs font-medium text-gray-600">{batteryLevel}%</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-600">
              {glassesConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold
                  rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Visitor Arrived</p>
                        <p className="text-xs text-gray-600 mt-1">Sarah Johnson arrived • 2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">New Summary Ready</p>
                        <p className="text-xs text-gray-600 mt-1">Conversation with Sarah • 1 hour ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">Medication Reminder</p>
                        <p className="text-xs text-gray-600 mt-1">Evening dose acknowledged • 6 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-gray-200 text-center">
                  <button className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors">
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
              JD
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
