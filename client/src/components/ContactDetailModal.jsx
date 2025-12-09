import { useState } from 'react';
import { X, Phone, Mail, Edit2, Trash2 } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ContactAvatar from './ContactAvatar';
import { contactsApi } from '../services/api';
import toast from 'react-hot-toast';
import { formatToIST } from '../utils/timeFormat';

const ContactDetailModal = ({ contact, onClose, onEdit }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    return formatToIST(timestamp);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(contact);
    }
  };

  const handleDelete = async () => {
    const promise = contactsApi.delete(contact.id);

    toast.promise(promise, {
      loading: 'Deleting contact...',
      success: () => {
        onClose();
        // Trigger a refresh in the parent component
        window.location.reload();
        return "Contact deleted successfully";
      },
      error: (err) => {
        console.error("Error deleting contact:", err);
        return "Failed to delete contact";
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ContactAvatar contact={contact} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{contact.name}</h2>
              <p className="text-gray-500">{contact.relationship_detail}</p>
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
        <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Last Seen</p>
              <p className="font-semibold text-gray-900">{contact.last_seen ? formatLastSeen(contact.last_seen) : 'Never'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Interactions</p>
              <p className="font-semibold text-gray-900">{contact.total_interactions || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Visit Frequency</p>
              <p className="font-semibold text-gray-900">{contact.visit_frequency || 'N/A'}</p>
            </div>

          </div>

          {/* Contact Information */}
          {(contact.phone_number || contact.email) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
              <div className="space-y-3">
                {contact.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{contact.phone_number}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{contact.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notes</h3>
              <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4">
                {contact.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={handleEdit}
            className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Edit2 className="h-5 w-5" />
            Edit Contact
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
          title="Delete Contact"
          message="Are you sure you want to delete this contact? This will remove them from the recognition database and all associated data."
          itemName={contact.name}
          confirmText="Delete Contact"
        />
      </div>
    </div>
  );
};

export default ContactDetailModal;
