import { useState, useRef, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { contactsApi } from '../services/api';
import toast from 'react-hot-toast';
import UnsavedChangesModal from './UnsavedChangesModal';

const EditContactModal = ({ isOpen, onClose, contact, onUpdate }) => {
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'family',
    relationship_detail: '',
    notes: '',
    phone_number: '',
    email: '',
    visit_frequency: '',
    photos: []
  });
  const [originalData, setOriginalData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (contact) {
      const initialData = {
        name: contact.name || '',
        relationship: contact.relationship || 'family',
        relationship_detail: contact.relationship_detail || '',
        notes: contact.notes || '',
        phone_number: contact.phone_number || '',
        email: contact.email || '',
        visit_frequency: contact.visit_frequency || '',
        photos: contact.photos || []
      };
      setFormData(initialData);
      setOriginalData(initialData);
    }
  }, [contact]);

  // Track changes
  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasUnsavedChanges(changed);
    }
  }, [formData, originalData]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData({ ...formData, photos: [...formData.photos, ...files] });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const contactData = {
        name: formData.name,
        relationship: formData.relationship,
        relationship_detail: formData.relationship_detail,
        notes: formData.notes,
        phone_number: formData.phone_number,
        email: formData.email,
        visit_frequency: formData.visit_frequency,
        avatar: contact.avatar || formData.name.substring(0, 2).toUpperCase(),
        color: contact.color || 'indigo'
      };
      
      await contactsApi.update(contact.id, contactData);
      toast.success('Contact updated successfully!');
      
      setHasUnsavedChanges(false);
      
      if (onUpdate) {
        onUpdate();
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error(error.response?.data?.detail || 'Failed to update contact');
    } finally {
      setIsSubmitting(false);
    }
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

  if (!isOpen) return null;

  return (
    <>
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {contact?.profile_photo_url ? (
              <img 
                src={contact.profile_photo_url} 
                alt={contact.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className={`w-12 h-12 rounded-full bg-${contact?.color || 'indigo'}-500 flex items-center justify-center text-white font-semibold`}>
                {contact?.avatar || contact?.name?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-2xl font-bold text-gray-900">Edit Contact</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step, index) => (
              <div key={step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      formStep >= step ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step}
                  </div>
                  <span className="text-xs text-gray-600 mt-2 whitespace-nowrap">
                    {step === 1 && 'Basic Info'}
                    {step === 2 && 'Photos'}
                    {step === 3 && 'Details'}
                    {step === 4 && 'Review'}
                  </span>
                </div>
                {index < 3 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      formStep > step ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
          {formStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Relationship Type *
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="family">Family</option>
                  <option value="friend">Friend</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="neighbor">Neighbor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Specific Relation *
                </label>
                <input
                  type="text"
                  value={formData.relationship_detail}
                  onChange={(e) => setFormData({ ...formData, relationship_detail: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., Daughter, Grandson, Primary Physician"
                />
              </div>
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-4">
              {contact?.profile_photo_url && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">Current Profile Photo</p>
                  <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={contact.profile_photo_url}
                      alt="Current profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-600 mb-4">
                Upload at least 3 photos for better facial recognition accuracy
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div 
                onClick={handleUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-700 font-medium mb-2">Click to upload photos</p>
                <p className="text-sm text-gray-500">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">PNG, JPG up to 10MB each</p>
              </div>
              {formData.photos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Selected Photos ({formData.photos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={photo instanceof File ? URL.createObjectURL(photo) : photo}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {formStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Visit Frequency
                </label>
                <input
                  type="text"
                  value={formData.visit_frequency}
                  onChange={(e) => setFormData({ ...formData, visit_frequency: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="e.g., Daily, Weekly, Monthly"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  placeholder="Any additional information..."
                />
              </div>
            </div>
          )}

          {formStep === 4 && (
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Review Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">Name</dt>
                  <dd className="text-gray-900 font-medium">{formData.name || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Relationship</dt>
                  <dd className="text-gray-900 font-medium">
                    {formData.relationship_detail || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Phone</dt>
                  <dd className="text-gray-900 font-medium">
                    {formData.phone_number || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Email</dt>
                  <dd className="text-gray-900 font-medium">{formData.email || 'Not provided'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Visit Frequency</dt>
                  <dd className="text-gray-900 font-medium">
                    {formData.visit_frequency || 'Not provided'}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 flex gap-3">
          {formStep > 1 && (
            <button
              onClick={() => setFormStep(formStep - 1)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (formStep < 4) {
                setFormStep(formStep + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : (formStep < 4 ? 'Next' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>

    {/* Unsaved Changes Modal */}
    <UnsavedChangesModal
      isOpen={showUnsavedModal}
      onSave={() => {
        setShowUnsavedModal(false);
        handleSubmit();
      }}
      onDiscard={handleDiscard}
      onCancel={() => setShowUnsavedModal(false)}
      saving={isSubmitting}
    />
    </>
  );
};

export default EditContactModal;
