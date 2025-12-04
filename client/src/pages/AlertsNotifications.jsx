import { useState, useEffect } from 'react';
import { Bell, AlertCircle, Info, AlertTriangle, X, Filter } from 'lucide-react';
import { alertsApi } from '../services/api';
import toast from 'react-hot-toast';

const AlertsNotifications = () => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = {
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined
      };
      const response = await alertsApi.getAll(params);
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [selectedSeverity]);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await alertsApi.markRead(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
      // Trigger refresh of unread count in header
      window.dispatchEvent(new Event('refreshUnreadCount'));
    } catch (error) {
      console.error("Error marking alert as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await alertsApi.markAllRead();
      setAlerts(alerts.map(a => ({ ...a, read: true })));
      toast.success("All alerts marked as read");
      // Trigger refresh of unread count in header
      window.dispatchEvent(new Event('refreshUnreadCount'));
    } catch (error) {
      console.error("Error marking all read:", error);
      toast.error("Failed to update alerts");
    }
  };

  const getSeverityConfig = (severity) => {
    const configs = {
      info: {
        icon: Info,
        color: 'blue',
        bg: 'bg-blue-500',
        text: 'text-white',
        border: 'border-blue-400',
        cardBg: 'bg-blue-50'
      },
      warning: {
        icon: AlertTriangle,
        color: 'yellow',
        bg: 'bg-amber-500',
        text: 'text-white',
        border: 'border-amber-400',
        cardBg: 'bg-amber-50'
      },
      critical: {
        icon: AlertCircle,
        color: 'red',
        bg: 'bg-red-500',
        text: 'text-white',
        border: 'border-red-400',
        cardBg: 'bg-red-50'
      }
    };
    return configs[severity] || configs.info;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Alerts & Notifications
        </h1>
        <p className="text-lg text-gray-600">
          Monitor important events and system notifications
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex gap-2">
            {['all', 'info', 'warning', 'critical'].map((severity) => (
              <button
                key={severity}
                onClick={() => setSelectedSeverity(severity)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  selectedSeverity === severity
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-600'
                }`}
              >
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </button>
            ))}
          </div>
          <button 
            onClick={handleMarkAllRead}
            className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Mark All as Read
          </button>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading alerts...</p>
          </div>
        ) : alerts.map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                alert.read 
                  ? 'bg-white border-gray-200' 
                  : `${config.cardBg} ${config.border} shadow-md`
              }`}
              onClick={() => {
                setSelectedAlert(alert);
                if (!alert.read) handleMarkRead({ stopPropagation: () => {} }, alert.id);
              }}
            >
              <div className="flex items-start gap-4">
                <div className={`${config.bg} ${config.text} w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className={`font-semibold ${alert.read ? 'text-gray-600' : 'text-gray-900'}`}>
                        {alert.title}
                      </h3>
                      <p className={`text-sm mt-1 ${alert.read ? 'text-gray-500' : 'text-gray-700'}`}>
                        {alert.message}
                      </p>
                    </div>
                    {!alert.read && (
                      <div className="w-2 h-2 bg-indigo-600 rounded-full ml-4" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</p>
                </div>
              </div>
            </div>
          );
        })}
        
        {!loading && alerts.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No alerts found</p>
          </div>
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{selectedAlert.title}</h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-gray-700">{selectedAlert.message}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedAlert.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Severity</span>
                  <span className={`font-medium ${getSeverityConfig(selectedAlert.severity).text}`}>
                    {selectedAlert.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedAlert(null)}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsNotifications;
