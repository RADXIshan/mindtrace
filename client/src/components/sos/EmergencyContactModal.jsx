import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import UnsavedChangesModal from '../UnsavedChangesModal';

const EmergencyContactModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData = null,
  title = "Add Emergency Contact",
  saving = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    priority: 1,
  });
  const [originalData, setOriginalData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      let initial;
      if (initialData) {
        initial = {
          name: initialData.name || '',
          phone: initialData.phone || '',
          email: initialData.email || '',
          relationship: initialData.relationship || '',
          priority: initialData.priority || 1,
        };
      } else {
        initial = {
          name: '',
          phone: '',
          email: '',
          relationship: '',
          priority: 1,
        };
      }
      setFormData(initial);
      setOriginalData(initial);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasUnsavedChanges(changed);
    }
  }, [formData, originalData]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSave(formData);
    setHasUnsavedChanges(false);
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  const handleDiscard = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    onClose();
  };

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-slate-800">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-slate-800">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
              placeholder="john@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship (Optional)
            </label>
            <input
              type="text"
              value={formData.relationship}
              onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
              placeholder="e.g., Spouse, Daughter, Friend"
            />
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !formData.name || !formData.phone}
            className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
    <UnsavedChangesModal
      isOpen={showUnsavedModal}
      onSave={() => {
        setShowUnsavedModal(false);
        handleSubmit();
      }}
      onDiscard={handleDiscard}
      onCancel={() => setShowUnsavedModal(false)}
      saving={saving}
    />
    </>
  );
};

export default EmergencyContactModal;
