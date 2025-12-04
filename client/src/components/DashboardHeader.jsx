import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, Bell, Menu, Battery, Wifi, LogOut } from 'lucide-react';
import { logout } from '../services/auth';
import { userApi, alertsApi } from '../services/api';

const DashboardHeader = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [glassesConnected, setGlassesConnected] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(87);
  const [profile, setProfile] = useState(null);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userApi.getProfile();
        setProfile(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();

    // Listen for profile updates
    const handleProfileUpdate = (event) => {
      setProfile(event.detail);
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Fetch unread alerts count
  const fetchUnreadCount = async () => {
    try {
      const response = await alertsApi.getUnreadCount();
      setNotificationCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for custom event to refresh count
    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('refreshUnreadCount', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshUnreadCount', handleRefresh);
    };
  }, []);

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

  const getInitials = () => {
    if (!profile) return 'U';
    if (profile.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (profile.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between p-[19px]">
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
              onClick={() => navigate('/dashboard/alerts')}
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
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="group relative transition-all duration-200"
              title={profile?.full_name || profile?.email || 'Profile Settings'}
            >
              {profile?.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 group-hover:border-gray-400 transition-colors"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">
                  {getInitials()}
                </div>
              )}
            </button>
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
