import { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, Circle, Trash2, Bell, Filter, X } from 'lucide-react';
import AddReminderModal from '../components/AddReminderModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { remindersApi } from '../services/api';
import toast from 'react-hot-toast';

const Reminders = () => {
  const [selectedType, setSelectedType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, reminderId: null, reminderTitle: '' });
  const [showTip, setShowTip] = useState(() => {
    const savedPreference = localStorage.getItem('showReminderTip');
    return savedPreference !== 'false';
  });

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const params = {
        type: selectedType !== 'all' ? selectedType : undefined
      };
      const response = await remindersApi.getAll(params);
      setReminders(response.data);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      toast.error("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [selectedType]);

  const handleToggleComplete = async (id) => {
    try {
      await remindersApi.toggleComplete(id);
      setReminders(reminders.map(reminder => 
        reminder.id === id ? { ...reminder, completed: !reminder.completed } : reminder
      ));
    } catch (error) {
      console.error("Error toggling reminder:", error);
      toast.error("Failed to update reminder");
    }
  };

  const handleDeleteReminder = async () => {
    try {
      await remindersApi.delete(deleteModal.reminderId);
      setReminders(reminders.filter(reminder => reminder.id !== deleteModal.reminderId));
      toast.success("Reminder deleted");
    } catch (error) {
      console.error("Error deleting reminder:", error);
      toast.error("Failed to delete reminder");
    }
  };

  const handleAddReminder = () => {
    // Refresh the reminders list after adding
    fetchReminders();
  };

  const handleDismissTip = () => {
    setShowTip(false);
    localStorage.setItem('showReminderTip', 'false');
  };

  const reminderTypes = [
    { value: 'all', label: 'All Reminders' },
    { value: 'medication', label: 'Medications' },
    { value: 'appointment', label: 'Appointments' },
    { value: 'activity', label: 'Activities' },
    { value: 'meal', label: 'Meals' },
    { value: 'other', label: 'Other' },
  ];

  // Group reminders by time of day (Morning, Afternoon, Evening)
  const groupedReminders = {
    morning: reminders.filter(r => {
      const hour = parseInt(r.time.split(':')[0]);
      const isPM = r.time.includes('PM');
      const time24 = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
      return time24 >= 5 && time24 < 12;
    }),
    afternoon: reminders.filter(r => {
      const hour = parseInt(r.time.split(':')[0]);
      const isPM = r.time.includes('PM');
      const time24 = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
      return time24 >= 12 && time24 < 17;
    }),
    evening: reminders.filter(r => {
      const hour = parseInt(r.time.split(':')[0]);
      const isPM = r.time.includes('PM');
      const time24 = isPM && hour !== 12 ? hour + 12 : (hour === 12 && !isPM ? 0 : hour);
      return time24 >= 17 || time24 < 5;
    })
  };

  const getTypeColor = (type) => {
    const colors = {
      medication: 'bg-red-100 text-red-700',
      appointment: 'bg-blue-100 text-blue-700',
      activity: 'bg-green-100 text-green-700',
      meal: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700'
    };
    return colors[type] || colors.other;
  };

  const ReminderCard = ({ reminder }) => (
    <div className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md group ${
      reminder.completed ? 'border-gray-200 bg-gray-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start gap-4">
        <button
          onClick={() => handleToggleComplete(reminder.id)}
          className={`mt-1 transition-colors ${
            reminder.completed ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-500'
          }`}
        >
          {reminder.completed ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <Circle className="h-6 w-6" />
          )}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <h3 className={`font-semibold ${
              reminder.completed ? 'text-gray-500 line-through' : 'text-gray-900'
            }`}>
              {reminder.title}
            </h3>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setDeleteModal({ isOpen: true, reminderId: reminder.id, reminderTitle: reminder.title })}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className={`flex items-center gap-1 ${
              reminder.completed ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Clock className="h-4 w-4" />
              {reminder.time}
            </div>
            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
              reminder.completed ? 'bg-gray-100 text-gray-400' : getTypeColor(reminder.type)
            }`}>
              {reminder.type.charAt(0).toUpperCase() + reminder.type.slice(1)}
            </span>
            {reminder.days && (
              <span className={`text-xs ${reminder.completed ? 'text-gray-400' : 'text-gray-500'}`}>
                {reminder.days.join(', ')}
              </span>
            )}
          </div>
          
          {reminder.notes && (
            <p className={`text-sm mt-2 ${
              reminder.completed ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {reminder.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Reminders & Schedule
          </h1>
          <p className="text-lg text-gray-600">
            Manage daily routines, medications, and appointments
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800
            transition-all duration-200 flex items-center gap-2 shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Add Reminder
        </button>
      </div>

      {/* Info Banner */}
      {showTip && (
        <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Smart Reminder Alerts</h3>
              <p className="text-sm text-gray-600">
                Reminders automatically create alerts at their scheduled time. Daily reminders reset each day, 
                weekly reminders trigger on the same day each week, and weekday reminders only trigger Monday-Friday.
              </p>
            </div>
            <button
              onClick={handleDismissTip}
              className="p-1 hover:bg-indigo-100 rounded-lg transition-colors shrink-0"
              aria-label="Dismiss tip"
            >
              <X className="h-5 w-5 text-indigo-600" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-4 overflow-x-auto pb-2 md:pb-0">
          <Filter className="h-5 w-5 text-gray-400 shrink-0" />
          <div className="flex gap-2">
            {reminderTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                  selectedType === type.value
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule Sections */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading reminders...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Morning */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <h2 className="text-lg font-semibold text-gray-900">Morning</h2>
              <span className="text-sm text-gray-500 ml-auto">5:00 AM - 11:59 AM</span>
            </div>
            <div className="space-y-3">
              {groupedReminders.morning.length > 0 ? (
                groupedReminders.morning.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">No morning reminders</p>
                </div>
              )}
            </div>
          </div>

          {/* Afternoon */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <h2 className="text-lg font-semibold text-gray-900">Afternoon</h2>
              <span className="text-sm text-gray-500 ml-auto">12:00 PM - 4:59 PM</span>
            </div>
            <div className="space-y-3">
              {groupedReminders.afternoon.length > 0 ? (
                groupedReminders.afternoon.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">No afternoon reminders</p>
                </div>
              )}
            </div>
          </div>

          {/* Evening */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900">Evening</h2>
              <span className="text-sm text-gray-500 ml-auto">5:00 PM - 4:59 AM</span>
            </div>
            <div className="space-y-3">
              {groupedReminders.evening.length > 0 ? (
                groupedReminders.evening.map(reminder => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500 text-sm">No evening reminders</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AddReminderModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddReminder}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, reminderId: null, reminderTitle: '' })}
        onConfirm={handleDeleteReminder}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder? This action cannot be undone."
        itemName={deleteModal.reminderTitle}
        confirmText="Delete Reminder"
      />
    </div>
  );
};

export default Reminders;
