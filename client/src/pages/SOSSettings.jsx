import { useState, useEffect, useRef } from 'react';
import { Shield, Plus, Phone, Mail, Trash2, Save, AlertCircle, User, Edit2 } from 'lucide-react';
import { sosApi } from '../services/api';
import toast from 'react-hot-toast';
import UnsavedChangesModal from '../components/UnsavedChangesModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import EmergencyContactModal from '../components/sos/EmergencyContactModal';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';

const SOSSettings = () => {
  const [contacts, setContacts] = useState([]);
  const [config, setConfig] = useState({
    send_sms: true,
    make_call: true,
    record_audio: false,
    email_alert: true,
    alert_services: false,
  });
  const [originalConfig, setOriginalConfig] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactToDelete, setContactToDelete] = useState(null);
  const blockerRef = useRef(null);

  // Handle navigation blocking when there are unsaved changes
  useUnsavedChanges(hasUnsavedChanges, (blocker) => {
    blockerRef.current = blocker;
    setShowUnsavedModal(true);
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    if (originalConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setHasUnsavedChanges(changed);
    }
  }, [config, originalConfig]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contactsRes, configRes] = await Promise.all([
        sosApi.getContacts(),
        sosApi.getConfig(),
      ]);
      setContacts(contactsRes.data || []);
      const fetchedConfig = configRes.data || config;
      setConfig(fetchedConfig);
      setOriginalConfig(fetchedConfig);
    } catch (error) {
      console.error('Failed to fetch SOS settings:', error);
      toast.error('Failed to load SOS settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async (contactData) => {
    setSaving(true);
    const promise = editingContact
      ? sosApi.updateContact(editingContact.id, contactData)
      : sosApi.createContact(contactData);

    toast.promise(promise, {
      loading: editingContact ? 'Updating contact...' : 'Adding contact...',
      success: (response) => {
        if (editingContact) {
          setContacts(contacts.map(c => c.id === editingContact.id ? response.data : c));
          return 'Emergency contact updated successfully';
        } else {
          setContacts([...contacts, response.data]);
          return 'Emergency contact added successfully';
        }
      },
      error: (err) => {
        console.error('Failed to save contact:', err);
        return editingContact ? 'Failed to update contact' : 'Failed to add emergency contact';
      }
    }).finally(() => {
      setSaving(false);
      setShowAddModal(false);
      setEditingContact(null);
    });
  };

  const handleEditClick = (contact) => {
    setEditingContact(contact);
    setShowAddModal(true);
  };

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;

    const promise = sosApi.deleteContact(contactToDelete.id);

    toast.promise(promise, {
      loading: 'Deleting contact...',
      success: () => {
        setContacts(contacts.filter(c => c.id !== contactToDelete.id));
        return 'Emergency contact removed';
      },
      error: (err) => {
        console.error('Failed to delete contact:', err);
        return 'Failed to remove emergency contact';
      }
    }).finally(() => {
      setContactToDelete(null);
    });
  };

  const handleSaveConfig = async (shouldNavigate = false) => {
    try {
      setSaving(true);
      await sosApi.updateConfig(config);
      setOriginalConfig(config);
      setHasUnsavedChanges(false);
      toast.success('SOS settings saved successfully');

      if (shouldNavigate && blockerRef.current) {
        blockerRef.current.proceed();
        blockerRef.current = null;
      }
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save SOS settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setConfig(originalConfig);
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);

    if (blockerRef.current) {
      blockerRef.current.proceed();
      blockerRef.current = null;
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Shield className="h-8 w-8 text-red-600" />
          SOS Settings
        </h1>
        <p className="text-lg text-gray-600">
          Configure emergency contacts and alert preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Emergency Contacts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contacts</h2>
              <button
                onClick={() => {
                  setEditingContact(null);
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Add Contact
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 mb-4">No emergency contacts configured</p>
                <button
                  onClick={() => {
                    setEditingContact(null);
                    setShowAddModal(true);
                  }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                >
                  Add Your First Contact
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 text-slate-900 flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </span>
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.relationship && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {contact.relationship}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(contact)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Edit contact"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(contact)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Delete contact"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Alert Configuration */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Alert Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Send SMS</p>
                  <p className="text-sm text-gray-600">Alert contacts via text message</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.send_sms}
                    onChange={(e) => setConfig({ ...config, send_sms: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Make Call</p>
                  <p className="text-sm text-gray-600">Call emergency contacts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.make_call}
                    onChange={(e) => setConfig({ ...config, make_call: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Record Audio</p>
                  <p className="text-sm text-gray-600">Capture ambient audio</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.record_audio}
                    onChange={(e) => setConfig({ ...config, record_audio: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email Alert</p>
                  <p className="text-sm text-gray-600">Send email notifications</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.email_alert}
                    onChange={(e) => setConfig({ ...config, email_alert: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Alert Services</p>
                  <p className="text-sm text-gray-600">Notify emergency services</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.alert_services}
                    onChange={(e) => setConfig({ ...config, alert_services: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>
            </div>

            {hasUnsavedChanges && (
              <button
                onClick={() => handleSaveConfig(false)}
                disabled={saving}
                className="w-full mt-6 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Settings
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Important</h3>
                <p className="text-sm text-blue-800">
                  Emergency contacts will be notified immediately when an SOS alert is triggered.
                  Make sure all contact information is accurate and up to date.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
      <EmergencyContactModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
        initialData={editingContact}
        title={editingContact ? "Edit Emergency Contact" : "Add Emergency Contact"}
        saving={saving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!contactToDelete}
        onClose={() => setContactToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Emergency Contact"
        message={`Are you sure you want to remove ${contactToDelete?.name} from your emergency contacts? This action cannot be undone.`}
        confirmText="Remove Contact"
        itemName={contactToDelete?.name}
      />

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onSave={() => {
          setShowUnsavedModal(false);
          handleSaveConfig(true);
        }}
        onDiscard={handleDiscard}
        onCancel={() => {
          setShowUnsavedModal(false);
          if (blockerRef.current) {
            blockerRef.current.reset();
            blockerRef.current = null;
          }
        }}
        saving={saving}
      />
    </div>
  );
};

export default SOSSettings;
