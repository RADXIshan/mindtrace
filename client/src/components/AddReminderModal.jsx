import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { X, ChevronDown, Clock, Pill, Utensils, Activity, Droplets } from 'lucide-react';
import { remindersApi } from '../services/api';
import toast from 'react-hot-toast';
import UnsavedChangesModal from './UnsavedChangesModal';

const AddReminderModal = ({ isOpen, onClose, onSave, navigateAfterSave = false }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    type: 'medication',
    time: '',
    recurrence: 'daily',
    notes: ''
  });

  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track if user has made any changes
  useEffect(() => {
    const hasChanges =
      formData.title !== '' ||
      formData.type !== 'medication' ||
      formData.time !== '' ||
      formData.recurrence !== 'daily' ||
      formData.notes !== '';

    setHasUnsavedChanges(hasChanges);
  }, [formData]);

  const reminderTypes = [
    { value: 'medication', label: 'Medication', icon: Pill },
    { value: 'meal', label: 'Meal', icon: Utensils },
    { value: 'activity', label: 'Activity', icon: Activity },
    { value: 'hydration', label: 'Hydration', icon: Droplets }
  ];

  const recurrenceOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const promise = remindersApi.create(formData);

    toast.promise(promise, {
      loading: 'Creating reminder...',
      success: (response) => {
        if (onSave) {
          onSave(response.data);
        }

        setFormData({
          title: '',
          type: 'medication',
          time: '',
          recurrence: 'daily',
          notes: ''
        });
        setHasUnsavedChanges(false);

        // Navigate to reminders page if requested (before closing modal)
        if (navigateAfterSave) {
          navigate('/dashboard/reminders');
        }

        onClose();
        return 'Reminder created successfully!';
      },
      error: (err) => {
        console.error('Error creating reminder:', err);
        return err.response?.data?.detail || 'Failed to create reminder';
      }
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setFormData({
      title: '',
      type: 'medication',
      time: '',
      recurrence: 'daily',
      notes: ''
    });
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    onClose();
  };

  if (!isOpen) return null;

  const selectedType = reminderTypes.find(t => t.value === formData.type);
  const selectedRecurrence = recurrenceOptions.find(r => r.value === formData.recurrence);
  const TypeIcon = selectedType.icon;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Add New Reminder</h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="p-4 md:p-6 space-y-4">
              {/* Type Dropdown */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Reminder Type
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowTypeDropdown(!showTypeDropdown);
                    setShowRecurrenceDropdown(false);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <TypeIcon className="h-5 w-5 text-gray-600" />
                    <span className="text-gray-900">{selectedType.label}</span>
                  </span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showTypeDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {reminderTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, type: type.value });
                            setShowTypeDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                        >
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="text-gray-900">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter reminder title"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Recurrence Dropdown */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Recurrence
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowRecurrenceDropdown(!showRecurrenceDropdown);
                    setShowTypeDropdown(false);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 flex items-center justify-between"
                >
                  <span className="text-gray-900">{selectedRecurrence.label}</span>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showRecurrenceDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showRecurrenceDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {recurrenceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, recurrence: option.value });
                          setShowRecurrenceDropdown(false);
                        }}
                        className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left text-gray-900"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 md:p-6 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Reminder'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={() => {
          setShowUnsavedModal(false);
          // Trigger form submission
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        onDiscard={handleDiscard}
        onCancel={() => setShowUnsavedModal(false)}
        saving={isSubmitting}
      />
    </>
  );
};

export default AddReminderModal;
