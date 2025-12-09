import { useState, useEffect } from 'react';
import { Search, Grid, List, Plus, Eye, RefreshCw } from 'lucide-react';
import AddContactModal from '../components/AddContactModal';
import ContactDetailModal from '../components/ContactDetailModal';
import EditContactModal from '../components/EditContactModal';
import ContactAvatar from '../components/ContactAvatar';
import { contactsApi, faceApi } from '../services/api';
import toast from 'react-hot-toast';
import { formatRelativeTime } from '../utils/timeFormat';

const ContactsDirectory = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedRelationship, setSelectedRelationship] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await contactsApi.getAll();
      setContacts(response.data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleAddContact = () => {
    // Refresh the contacts list after adding
    fetchContacts();
  };

  const handleUpdateContact = () => {
    // Refresh the contacts list after updating
    fetchContacts();
  };

  const handleSyncFaces = async () => {
    setSyncing(true);
    const promise = faceApi.syncFromDatabase();

    toast.promise(promise, {
      loading: 'Syncing face recognition database...',
      success: (response) => response.data.message || 'Face recognition database synced!',
      error: (err) => {
        console.error("Error syncing faces:", err);
        return "Failed to sync face recognition database";
      }
    }).finally(() => {
      setSyncing(false);
    });
  };

  const relationshipTypes = [
    { value: 'all', label: 'All Contacts' },
    { value: 'family', label: 'Family' },
    { value: 'friend', label: 'Friends' },
    { value: 'caretaker', label: 'Caretakers' },
    { value: 'doctor', label: 'Medical' },
    { value: 'nurse', label: 'Nurses' },
    { value: 'neighbor', label: 'Neighbors' },
  ];

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.relationship_detail && contact.relationship_detail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRelationship = selectedRelationship === 'all' || contact.relationship === selectedRelationship;

    return matchesSearch && matchesRelationship;
  });

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    return formatRelativeTime(timestamp).replace(' ago', '').replace('minutes', 'min').replace('minute', 'min').replace('hours', 'h').replace('hour', 'h').replace('days', 'd').replace('day', 'd');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Contacts Directory
          </h1>
          <p className="text-base md:text-lg text-gray-600">
            Manage people in the recognition database
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button
            onClick={handleSyncFaces}
            disabled={syncing}
            className="flex-1 md:flex-none px-6 py-3 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-medium hover:bg-gray-50
              transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Faces'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 md:flex-none px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800
              transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or relationship..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                transition-all duration-200"
            />
          </div>

          {/* Relationship Filter */}
          <select
            value={selectedRelationship}
            onChange={(e) => setSelectedRelationship(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
              focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
              transition-all duration-200 cursor-pointer"
          >
            {relationshipTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'grid'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Grid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg transition-all ${viewMode === 'list'
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Contacts Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading contacts...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => {
                setSelectedContact(contact);
                setShowDetailModal(true);
              }}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg
                transition-all duration-300 cursor-pointer group"
            >
              <div className="flex flex-col items-center text-center mb-4">
                <ContactAvatar contact={contact} size="xl" className="mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {contact.name}
                </h3>
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg mt-2">
                  {contact.relationship_detail || contact.relationship}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Last seen:</span>
                  <span className="font-medium text-gray-900">{formatLastSeen(contact.last_seen)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Frequency:</span>
                  <span className="font-medium text-gray-900">{contact.visit_frequency || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => {
                setSelectedContact(contact);
                setShowDetailModal(true);
              }}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg
                transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <ContactAvatar contact={contact} size="md" className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {contact.name}
                  </h3>
                  <p className="text-sm text-gray-500">{contact.relationship_detail || contact.relationship}</p>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Last Seen</p>
                    <p className="font-medium text-gray-900">{formatLastSeen(contact.last_seen)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Frequency</p>
                    <p className="font-medium text-gray-900">{contact.visit_frequency || 'N/A'}</p>
                  </div>
                </div>
                <Eye className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredContacts.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No contacts found matching your filters</p>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddContactModal
          isOpen={true}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddContact}
        />
      )}
      {showDetailModal && selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedContact(null);
          }}
          onEdit={(contact) => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
        />
      )}
      {showEditModal && selectedContact && (
        <EditContactModal
          isOpen={true}
          contact={selectedContact}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateContact}
        />
      )}
    </div>
  );
};

export default ContactsDirectory;
