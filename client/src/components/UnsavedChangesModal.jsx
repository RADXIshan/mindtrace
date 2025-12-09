import { AlertTriangle } from 'lucide-react';

const UnsavedChangesModal = ({ isOpen, onSave, onDiscard, onCancel, saving = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Unsaved Changes</h2>
          </div>
        </div>
        <div className="p-4 md:p-6">
          <p className="text-gray-600 text-lg">
            You have unsaved changes. What would you like to do?
          </p>
        </div>
        <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Keep Editing
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 px-6 py-3 border border-red-300 text-red-700 rounded-xl font-medium hover:bg-red-50 transition-colors"
          >
            Discard Changes
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
