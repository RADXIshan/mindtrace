import { useState } from 'react';
import { X, Clock, Repeat, Edit2, Trash2, Pill, Utensils, Activity, Droplets, CheckCircle2 } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { formatTime12Hour } from '../utils/timeFormat';

const ViewReminderModal = ({ reminder, onClose, onEdit, onDelete, onToggleComplete }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  if (!reminder) return null;

  const reminderIcons = {
    medication: Pill,
    meal: Utensils,
    activity: Activity,
    hydration: Droplets
  };

  const reminderColors = {
    medication: 'blue',
    meal: 'orange',
    activity: 'purple',
    hydration: 'cyan'
  };

  const Icon = reminderIcons[reminder.type] || Pill;
  const color = reminderColors[reminder.type] || 'blue';

  const handleEdit = () => {
    onEdit(reminder);
    onClose();
  };

  const handleDelete = () => {
    onDelete(reminder.id);
    setShowDeleteModal(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full bg-${color}-100 flex items-center justify-center`}>
              <Icon className={`h-7 w-7 text-${color}-600`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{reminder.title}</h2>
              <p className="text-gray-500 capitalize">{reminder.type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <p className="font-semibold text-gray-900">
                {reminder.completed ? 'Completed' : 'Pending'}
              </p>
            </div>
            <button
              onClick={() => onToggleComplete(reminder.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                reminder.completed
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <CheckCircle2 className="h-5 w-5" />
              {reminder.completed ? 'Completed' : 'Mark Complete'}
            </button>
          </div>

          {/* Time */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Time</p>
            </div>
            <p className="text-lg font-bold text-gray-900 ml-8">{formatTime12Hour(reminder.time)}</p>
          </div>

          {/* Recurrence */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Repeat className="h-5 w-5 text-gray-400" />
              <p className="text-sm font-semibold text-gray-900">Recurrence</p>
            </div>
            <p className="text-lg font-bold text-gray-900 ml-8 capitalize">{reminder.recurrence}</p>
          </div>

          {/* Notes (if any) */}
          {reminder.notes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-900 mb-2">Notes</p>
              <p className="text-gray-700 leading-relaxed">{reminder.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleEdit}
            className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="h-5 w-5" />
            Edit Reminder
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-3 border border-red-300 text-red-700 rounded-xl font-medium hover:bg-red-50 transition-colors flex items-center gap-2"
          >
            <Trash2 className="h-5 w-5" />
            Delete
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Reminder"
          message="Are you sure you want to delete this reminder? This action cannot be undone."
          itemName={reminder.title}
          confirmText="Delete Reminder"
        />
      </div>
    </div>
  );
};

export default ViewReminderModal;
