import { useState, useEffect, useRef } from 'react';
import { Bell, AlertCircle, Info, AlertTriangle, X, Filter, Trash2, Loader2 } from 'lucide-react';
import { alertsApi } from '../services/api';
import toast from 'react-hot-toast';
import { formatRelativeTime, formatToIST } from '../utils/timeFormat';

const AlertsNotifications = () => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Loading states for actions
  const [processingAlerts, setProcessingAlerts] = useState(new Set()); // IDs being processed (read/delete)
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Refs for tracking alerts state for notifications
  const previousAlertIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  const audioContextRef = useRef(null);

  // Initialize and unlock AudioContext
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioContextRef.current = new AudioContext();
    }

    const unlockAudio = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log("AudioContext resumed/unlocked");
        }).catch(err => console.error("Failed to resume AudioContext:", err));
      }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Sound notification function
  const playNotificationSound = async () => {
    try {
      if (!audioContextRef.current) return;
      const ctx = audioContextRef.current;

      console.log("Playing notification sound, context state:", ctx.state);

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const playBeep = (startTime) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        // Alert sound - fairly high pitch descending
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, startTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, startTime + 0.2); // Drop to A4

        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      };

      const now = ctx.currentTime;
      // Play 3 times as requested
      playBeep(now);
      playBeep(now + 0.4);
      playBeep(now + 0.8);

    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  };

  const fetchAlerts = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const params = {
        severity: selectedSeverity !== 'all' ? selectedSeverity : undefined
      };
      const response = await alertsApi.getAll(params);
      setAlerts(response.data);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Monitor alerts for changes to trigger sound
  useEffect(() => {
    if (loading) return;

    const currentIds = new Set(alerts.map(a => a.id));

    if (isFirstLoad.current) {
      previousAlertIds.current = currentIds;
      isFirstLoad.current = false;
      return;
    }

    // Check for new alerts
    const hasNewAlerts = alerts.some(alert => !previousAlertIds.current.has(alert.id));

    if (hasNewAlerts) {
      playNotificationSound();
      previousAlertIds.current = currentIds;
    }

    // Update ref to current state even if no new ones (e.g. deletions)
    // Actually we only update if we want to reset the baseline. 
    // If strict new alerts, we should just add them? 
    // No, if list refreshes, previousIds should reflect the new list.
    previousAlertIds.current = currentIds;

  }, [alerts, loading]);

  // Initial fetch and reset on filter change
  useEffect(() => {
    isFirstLoad.current = true;
    fetchAlerts(true);
  }, [selectedSeverity]);

  // Polling for new alerts
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchAlerts(false);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [selectedSeverity]);

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    if (processingAlerts.has(id)) return;

    try {
      setProcessingAlerts(prev => new Set(prev).add(id));
      await alertsApi.markRead(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, read: true } : a));
      // Trigger refresh of unread count in header
      window.dispatchEvent(new Event('refreshUnreadCount'));
    } catch (error) {
      console.error("Error marking alert as read:", error);
    } finally {
      setProcessingAlerts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (processingAlerts.has(id)) return;

    try {
      setProcessingAlerts(prev => new Set(prev).add(id));
      await alertsApi.delete(id);
      setAlerts(alerts.filter(a => a.id !== id));
      toast.success("Alert deleted");
      window.dispatchEvent(new Event('refreshUnreadCount'));
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast.error("Failed to delete alert");
      // Only remove from processing set if it failed, otherwise it's gone from list
      setProcessingAlerts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDeleteAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAll = async () => {
    try {
      setIsDeletingAll(true);
      await alertsApi.deleteAll();
      setAlerts([]);
      toast.success("All alerts deleted");
      window.dispatchEvent(new Event('refreshUnreadCount'));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting all alerts:", error);
      toast.error("Failed to delete all alerts");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (isMarkingAllRead) return;

    try {
      setIsMarkingAllRead(true);
      await alertsApi.markAllRead();
      setAlerts(alerts.map(a => ({ ...a, read: true })));
      toast.success("All alerts marked as read");
      // Trigger refresh of unread count in header
      window.dispatchEvent(new Event('refreshUnreadCount'));
    } catch (error) {
      console.error("Error marking all read:", error);
      toast.error("Failed to update alerts");
    } finally {
      setIsMarkingAllRead(false);
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



  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Alerts & Notifications
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          Monitor important events and system notifications
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <Filter className="h-5 w-5 text-gray-400 shrink-0" />
            <div className="flex gap-2">
              {['all', 'info', 'warning', 'critical'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${selectedSeverity === severity
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-600'
                    }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-4 md:ml-auto w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingAllRead || isDeletingAll}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isMarkingAllRead ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Marking...
                </>
              ) : (
                'Mark All as Read'
              )}
            </button>
            {alerts.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={isMarkingAllRead || isDeletingAll}
                className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4" />
                Delete All
              </button>
            )}
          </div>
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
              className={`rounded-2xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${alert.read
                ? 'bg-white border-gray-200'
                : `${config.cardBg} ${config.border} shadow-md`
                } ${processingAlerts.has(alert.id) ? 'opacity-70 pointer-events-none' : ''}`}
              onClick={() => {
                if (processingAlerts.has(alert.id)) return;
                setSelectedAlert(alert);
                if (!alert.read) handleMarkRead({ stopPropagation: () => { } }, alert.id);
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
                    <button
                      onClick={(e) => handleDelete(e, alert.id)}
                      disabled={processingAlerts.has(alert.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 disabled:opacity-50"
                      title="Delete notification"
                    >
                      {processingAlerts.has(alert.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">{formatRelativeTime(alert.timestamp)}</p>
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
                    {formatToIST(selectedAlert.timestamp)}
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

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete All Alerts?</h2>
            <p className="text-gray-600 text-center mb-6">
              This action cannot be undone. All your notifications will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAll}
                disabled={isDeletingAll}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete All'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsNotifications;
