import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, Bell, Calendar, TrendingUp, Activity, Plus, ArrowRight, AlertCircle } from 'lucide-react';
import AddContactModal from '../components/AddContactModal';
import AddReminderModal from '../components/AddReminderModal';
import { interactionsApi, remindersApi, alertsApi, userApi } from '../services/api';
import toast from 'react-hot-toast';

const DashboardHome = () => {
  const navigate = useNavigate();
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isAddReminderModalOpen, setIsAddReminderModalOpen] = useState(false);

  const [recentInteractions, setRecentInteractions] = useState([]);
  const [todayReminders, setTodayReminders] = useState([]);
  const [stats, setStats] = useState({
    visitors: 0,
    conversations: 0,
    unreadAlerts: 0,
    upcomingReminders: 0
  });
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch Profile
      const profileRes = await userApi.getProfile();
      setProfile(profileRes.data);

      // Fetch Interactions
      const interactionsRes = await interactionsApi.getAll({ limit: 3 });
      setRecentInteractions(interactionsRes.data);

      // Fetch Reminders
      const remindersRes = await remindersApi.getAll();
      const reminders = remindersRes.data;

      // Filter for today's reminders (simple check for now, can be improved)
      // Assuming reminders are daily for MVP or we just show all sorted by time
      setTodayReminders(reminders.slice(0, 4));

      // Fetch Alerts for stats
      const alertsRes = await alertsApi.getAll({ limit: 100 }); // Get enough to count unread
      const unreadCount = alertsRes.data.filter(a => !a.read).length;

      setStats({
        visitors: 4, // Placeholder for now as we don't have visitor tracking yet
        conversations: interactionsRes.data.length, // Just using count of fetched for now
        unreadAlerts: unreadCount,
        upcomingReminders: reminders.filter(r => !r.completed).length
      });

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMoodEmoji = (mood) => {
    const emojis = {
      happy: '😊',
      neutral: '😐',
      sad: '😢',
      anxious: '😰',
      confused: '😕',
    };
    return emojis[mood] || emojis.neutral;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="text-lg text-gray-600">
          Here's what's happening with your loved one today
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setIsAddContactModalOpen(true)}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 
              hover:border-gray-300 hover:bg-gray-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center 
              group-hover:bg-gray-200 transition-colors">
              <Users className="h-6 w-6 text-gray-700" />
            </div>
            <span className="text-sm font-medium text-gray-900">Add Contact</span>
          </button>

          <button
            onClick={() => setIsAddReminderModalOpen(true)}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 
              hover:border-gray-300 hover:bg-gray-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center 
              group-hover:bg-gray-200 transition-colors">
              <Calendar className="h-6 w-6 text-gray-700" />
            </div>
            <span className="text-sm font-medium text-gray-900">New Reminder</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/alerts')}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 
              hover:border-gray-300 hover:bg-gray-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center 
              group-hover:bg-gray-200 transition-colors">
              <Bell className="h-6 w-6 text-gray-700" />
            </div>
            <span className="text-sm font-medium text-gray-900">View Alerts</span>
          </button>

          <button
            onClick={() => navigate('/dashboard/sos')}
            className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 border-red-200 
              bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center 
              group-hover:bg-red-200 transition-colors">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <span className="text-sm font-semibold text-red-600">Emergency SOS</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-default group">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-indigo-100 text-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.visitors}</p>
            <p className="text-sm text-gray-600">Visitors Today</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-default group">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-xl flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.conversations}</p>
            <p className="text-sm text-gray-600">Conversations</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-default group">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-yellow-100 text-yellow-600 w-12 h-12 rounded-xl flex items-center justify-center">
              <Bell className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.unreadAlerts}</p>
            <p className="text-sm text-gray-600">Unread Alerts</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 cursor-default group">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{stats.upcomingReminders}</p>
            <p className="text-sm text-gray-600">Upcoming Reminders</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Interactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Recent Interactions</h2>
            <button
              onClick={() => navigate('/dashboard/interactions')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentInteractions.length > 0 ? (
              recentInteractions.map((interaction, index) => (
                <div
                  key={index}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => navigate('/dashboard/interactions')}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full bg-${interaction.contact_color || 'indigo'}-500 flex items-center justify-center text-white font-semibold shrink-0`}>
                      {interaction.contact_avatar || interaction.contact_name?.substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {interaction.contact_name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-gray-500">{interaction.contact_relationship || 'Contact'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">
                            {getMoodEmoji(interaction.mood)}
                          </span>
                          <span className="text-sm text-gray-500">{formatTime(interaction.timestamp)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{interaction.summary}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No recent interactions found.
              </div>
            )}
          </div>
        </div>

        {/* Today's Reminders */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Today's Reminders</h2>
            <button
              onClick={() => navigate('/dashboard/reminders')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {todayReminders.length > 0 ? (
              todayReminders.map((reminder, index) => (
                <div key={index} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${reminder.completed ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${reminder.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {reminder.title}
                    </p>
                    <p className="text-xs text-gray-500">{reminder.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500">
                No reminders for today.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Glasses Status */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Glasses Status</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Connection</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-gray-900">Connected</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Battery</span>
            <span className="text-sm font-semibold text-gray-900">87%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Sync</span>
            <span className="text-sm font-semibold text-gray-900">2 min ago</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        onSave={() => {
          fetchData(); // Refresh dashboard data after adding contact
        }}
        navigateAfterSave={true}
      />
      <AddReminderModal
        isOpen={isAddReminderModalOpen}
        onClose={() => setIsAddReminderModalOpen(false)}
        onSave={() => {
          fetchData(); // Refresh dashboard data after adding reminder
        }}
        navigateAfterSave={true}
      />
    </div>
  );
};

export default DashboardHome;
