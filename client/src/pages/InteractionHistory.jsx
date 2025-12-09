import { useState, useEffect } from 'react';
import { Search, Download, X, MapPin, Clock, Star, RefreshCw } from 'lucide-react';
import { interactionsApi, asrApi, userApi } from '../services/api';
import toast from 'react-hot-toast';
import ContactAvatar from '../components/ContactAvatar';
import { formatRelativeTime, formatToIST } from '../utils/timeFormat';

const InteractionHistory = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [starredOnly, setStarredOnly] = useState(false);

  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  const handleSyncConversations = async () => {
    setSyncing(true);
    try {
      const userResponse = await userApi.getProfile();
      const userId = userResponse.data.id;

      const response = await asrApi.syncConversations(userId);
      toast.success(response.data.message || 'Conversations synced successfully');

      // Also sync to ChromaDB for embeddings
      try {
        await interactionsApi.syncToChroma();
        toast.success('Conversations indexed for semantic search');
      } catch (err) {
        console.error("Error syncing to ChromaDB:", err);
      }

      // Refresh interactions after sync
      fetchInteractions();
    } catch (error) {
      console.error("Error syncing conversations:", error);
      toast.error("Failed to sync conversations");
    } finally {
      setSyncing(false);
    }
  };

  const fetchInteractions = async () => {
    try {
      setLoading(true);

      // Use semantic search if query is long enough and semantic search is enabled
      if (useSemanticSearch && searchQuery && searchQuery.length > 3) {
        const response = await interactionsApi.search(searchQuery, 50);
        let results = response.data.results || [];

        // Apply additional filters

        if (starredOnly) {
          results = results.filter(i => i.starred);
        }

        setInteractions(results);
      } else {
        // Use regular database query
        const params = {
          search: searchQuery,

          starred: starredOnly ? true : undefined
        };
        const response = await interactionsApi.getAll(params);
        setInteractions(response.data);
      }
    } catch (error) {
      console.error("Error fetching interactions:", error);
      toast.error("Failed to load interactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchInteractions();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, starredOnly, useSemanticSearch]);

  const handleToggleStar = async (e, id) => {
    e.stopPropagation();
    const promise = interactionsApi.toggleStar(id);

    toast.promise(promise, {
      loading: 'Updating interaction...',
      success: () => {
        // Optimistic update or refetch
        setInteractions(interactions.map(i =>
          i.id === id ? { ...i, starred: !i.starred } : i
        ));
        if (selectedInteraction && selectedInteraction.id === id) {
          setSelectedInteraction({ ...selectedInteraction, starred: !selectedInteraction.starred });
        }
        return "Interaction updated";
      },
      error: (err) => {
        console.error("Error toggling star:", err);
        return "Failed to update interaction";
      }
    });
  };





  const handleExport = () => {
    alert('Export functionality would download interaction history as PDF/CSV');
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Interaction History
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          Review and analyze past conversations
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex flex-col gap-4">
          {/* Search Row */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder={useSemanticSearch ? "Search by meaning..." : "Search by name, topic, or keyword..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                  transition-all duration-200"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-2 lg:flex lg:flex-row gap-3">

            {/* Semantic Search Toggle */}
            <button
              onClick={() => setUseSemanticSearch(!useSemanticSearch)}
              className={`px-4 md:px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${useSemanticSearch
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="truncate">AI Search</span>
            </button>

            {/* Starred Filter */}
            <button
              onClick={() => setStarredOnly(!starredOnly)}
              className={`px-4 md:px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
                ${starredOnly
                  ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                }`}
            >
              <Star className={`h-5 w-5 shrink-0 ${starredOnly ? 'fill-yellow-700' : ''}`} />
              <span className="truncate">Starred</span>
            </button>

            {/* Sync Conversations */}
            <button
              onClick={handleSyncConversations}
              disabled={syncing}
              className="px-4 md:px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700
                transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-5 w-5 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
              <span className="truncate">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>

            {/* Export */}
            <button
              onClick={handleExport}
              className="px-4 md:px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800
                transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5 shrink-0" />
              <span className="truncate">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Info Banner */}
      {useSemanticSearch && searchQuery && !loading && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900">
              AI Semantic Search Active
            </p>
            <p className="text-xs text-purple-700">
              Showing {interactions.length} conversations ranked by relevance to "{searchQuery}"
            </p>
          </div>
        </div>
      )}

      {/* Interactions Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading interactions...</p>
          </div>
        ) : interactions.map((interaction) => (
          <div
            key={interaction.id}
            className="bg-white rounded-2xl border border-gray-200 overflow-hidden
              hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => setSelectedInteraction(interaction)}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <ContactAvatar
                  contact={{
                    name: interaction.contact_name,
                    avatar: interaction.contact_avatar,
                    color: interaction.contact_color,
                    profile_photo_url: interaction.contact_photo_url
                  }}
                  size="lg"
                  className="shrink-0"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {interaction.contact_name || 'Unknown'}
                      </h3>
                      <p className="text-sm text-gray-500">{interaction.contact_relationship || 'Contact'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleToggleStar(e, interaction.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Star className={`h-5 w-5 ${interaction.starred ? 'fill-yellow-500 text-yellow-500' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-gray-600 mb-4 line-clamp-2">{interaction.summary}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {interaction.key_topics && interaction.key_topics.map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatRelativeTime(interaction.timestamp)}
                    </div>
                    {interaction.duration && <div>Duration: {interaction.duration}</div>}
                    {interaction.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {interaction.location}
                      </div>
                    )}
                    {useSemanticSearch && interaction.similarity_score !== undefined && (
                      <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium border border-purple-200">
                        {Math.round(interaction.similarity_score * 100)}% match
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && interactions.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">No interactions found matching your filters</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInteraction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ContactAvatar
                  contact={{
                    name: selectedInteraction.contact_name,
                    avatar: selectedInteraction.contact_avatar,
                    color: selectedInteraction.contact_color,
                    profile_photo_url: selectedInteraction.contact_photo_url
                  }}
                  size="lg"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedInteraction.contact_name || 'Unknown'}</h2>
                  <p className="text-gray-500">{selectedInteraction.contact_relationship || 'Contact'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInteraction(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Meta Info */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                  <p className="font-semibold text-gray-900">
                    {formatToIST(selectedInteraction.timestamp)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">{selectedInteraction.duration || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-semibold text-gray-900">{selectedInteraction.location || 'Unknown'}</p>
                </div>
              </div>

              {/* Topics */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedInteraction.key_topics && selectedInteraction.key_topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-2 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-lg"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Full Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Full Conversation Summary</h3>
                <p className="text-gray-700 leading-relaxed">{selectedInteraction.full_details || selectedInteraction.summary}</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                View Contact Profile
              </button>
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractionHistory;
