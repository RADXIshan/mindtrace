import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Search, Bell, Menu, Battery, Wifi, LogOut, X, User, MessageCircle, Clock, AlertTriangle, Phone, Home, Settings, HelpCircle, LayoutDashboard } from 'lucide-react';
import { logout } from '../services/auth';
import { userApi, alertsApi, searchApi } from '../services/api';
import { formatTime12Hour } from '../utils/timeFormat';

// Searchable pages index
const PAGES_INDEX = [
  { id: 'home', name: 'Dashboard Home', path: '/dashboard', icon: Home, keywords: ['home', 'dashboard', 'overview', 'main'] },
  { id: 'interactions', name: 'Interaction History', path: '/dashboard/interactions', icon: MessageCircle, keywords: ['interactions', 'history', 'conversations', 'messages', 'chat'] },
  { id: 'contacts', name: 'Contacts Directory', path: '/dashboard/contacts', icon: User, keywords: ['contacts', 'people', 'directory', 'friends', 'family'] },
  { id: 'alerts', name: 'Alerts & Notifications', path: '/dashboard/alerts', icon: AlertTriangle, keywords: ['alerts', 'notifications', 'warnings', 'messages'] },
  { id: 'reminders', name: 'Reminders', path: '/dashboard/reminders', icon: Clock, keywords: ['reminders', 'tasks', 'schedule', 'calendar', 'todo'] },
  { id: 'sos', name: 'SOS Settings', path: '/dashboard/sos', icon: Phone, keywords: ['sos', 'emergency', 'help', 'urgent', 'safety'] },
  { id: 'sos-alerts', name: 'SOS Alerts', path: '/dashboard/sos-alerts', icon: AlertTriangle, keywords: ['sos', 'emergency', 'alerts', 'urgent'] },
  { id: 'settings', name: 'Profile Settings', path: '/dashboard/settings', icon: Settings, keywords: ['settings', 'profile', 'account', 'preferences', 'configuration'] },
  { id: 'help', name: 'Help & Support', path: '/dashboard/help', icon: HelpCircle, keywords: ['help', 'support', 'faq', 'documentation', 'guide'] },
];

const DashboardHeader = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [pageResults, setPageResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [glassesConnected] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(87);
  const [profile, setProfile] = useState(null);

  // Constants
  const MIN_SEARCH_CHARS = 1; // Changed to 1 for instant page search
  const DEBOUNCE_MS = 100; // Fast response

  // Handle outside click to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all results as flat array for keyboard navigation
  const getAllResults = () => {
    const results = [];

    // Add pages first
    pageResults.forEach(page => results.push({ type: 'page', data: page }));

    // Add data results
    if (searchResults) {
      searchResults.contacts?.forEach(item => results.push({ type: 'contact', data: item }));
      searchResults.interactions?.forEach(item => results.push({ type: 'interaction', data: item }));
      searchResults.reminders?.forEach(item => results.push({ type: 'reminder', data: item }));
      searchResults.alerts?.forEach(item => results.push({ type: 'alert', data: item }));
      searchResults.sos_contacts?.forEach(item => results.push({ type: 'sos', data: item }));
    }

    return results;
  };

  // Handle keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // ESC to close search results
      if (event.key === 'Escape' && showResults) {
        setShowResults(false);
        setSelectedIndex(-1);
        event.preventDefault();
        return;
      }

      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = searchRef.current?.querySelector('input');
        searchInput?.focus();
        return;
      }

      // Arrow key navigation when results are shown
      if (showResults && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        const allResults = getAllResults();

        if (event.key === 'ArrowDown') {
          setSelectedIndex(prev => (prev < allResults.length - 1 ? prev + 1 : prev));
        } else {
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        }
      }

      // Enter to navigate to selected result
      if (showResults && event.key === 'Enter' && selectedIndex >= 0) {
        event.preventDefault();
        const allResults = getAllResults();
        const selected = allResults[selectedIndex];

        if (selected) {
          if (selected.type === 'page') {
            navigate(selected.data.path);
          } else {
            // Navigate to appropriate page based on type
            const pathMap = {
              contact: '/dashboard/contacts',
              interaction: '/dashboard/interactions',
              reminder: '/dashboard/reminders',
              alert: '/dashboard/alerts',
              sos: '/dashboard/sos'
            };
            navigate(pathMap[selected.type]);
          }
          clearSearch();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResults, selectedIndex, pageResults, searchResults]);

  // Search data from API (debounced) - includes backend page search
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery || searchQuery.length < MIN_SEARCH_CHARS) {
        setSearchResults(null);
        setPageResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);
      try {
        const response = await searchApi.search(searchQuery);
        setSearchResults(response.data);

        // Merge backend page results with client-side page results
        if (response.data.pages && response.data.pages.length > 0) {
          // Convert backend page results to match client format
          const backendPages = response.data.pages.map(p => {
            const pageIndex = PAGES_INDEX.find(pi => pi.path === p.path);
            return {
              id: p.id,
              name: p.name,
              path: p.path,
              icon: pageIndex?.icon || LayoutDashboard,
              keywords: [],
              matchedContent: p.matched_content,
              relevance: p.relevance
            };
          });

          // Merge with client-side results, prioritizing backend results
          const clientPages = PAGES_INDEX.filter(page => {
            const query = searchQuery.toLowerCase().trim();
            const nameMatch = page.name.toLowerCase().includes(query);
            const keywordMatch = page.keywords.some(keyword => keyword.startsWith(query) || keyword.includes(query));
            return nameMatch || keywordMatch;
          });

          // Combine and deduplicate
          const allPages = [...backendPages];
          clientPages.forEach(cp => {
            if (!allPages.find(bp => bp.path === cp.path)) {
              allPages.push(cp);
            }
          });

          setPageResults(allPages.slice(0, 5));
        } else {
          // Fallback to client-side search if no backend results
          const query = searchQuery.toLowerCase().trim();
          const matches = PAGES_INDEX.filter(page => {
            const nameMatch = page.name.toLowerCase().includes(query);
            const keywordMatch = page.keywords.some(keyword => keyword.startsWith(query) || keyword.includes(query));
            return nameMatch || keywordMatch;
          });
          setPageResults(matches.slice(0, 5));
        }
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to client-side page search on error
        const query = searchQuery.toLowerCase().trim();
        const matches = PAGES_INDEX.filter(page => {
          const nameMatch = page.name.toLowerCase().includes(query);
          const keywordMatch = page.keywords.some(keyword => keyword.startsWith(query) || keyword.includes(query));
          return nameMatch || keywordMatch;
        });
        setPageResults(matches.slice(0, 5));
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, DEBOUNCE_MS);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await userApi.getProfile();
        setProfile(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };
    fetchProfile();

    // Listen for profile updates
    const handleProfileUpdate = (event) => {
      setProfile(event.detail);
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Fetch unread alerts count
  const fetchUnreadCount = async () => {
    try {
      const response = await alertsApi.getUnreadCount();
      setNotificationCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    // Listen for custom event to refresh count
    const handleRefresh = () => fetchUnreadCount();
    window.addEventListener('refreshUnreadCount', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refreshUnreadCount', handleRefresh);
    };
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate battery drain
      setBatteryLevel((prev) => Math.max(prev - 1, 20));
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  const getBatteryColor = () => {
    if (batteryLevel > 50) return 'text-emerald-600';
    if (batteryLevel > 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getInitials = () => {
    if (!profile) return 'U';
    if (profile.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (profile.email) {
      return profile.email[0].toUpperCase();
    }
    return 'U';
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setPageResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const highlightMatch = (text, query) => {
    if (!text || !query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ?
        <mark key={i} className="bg-yellow-200 text-gray-900 font-medium">{part}</mark> :
        part
    );
  };

  const renderSearchResultItem = (item, type, icon, onClick, index) => {
    const primaryText = item.name || item.title || item.contact_name || item.summary || 'Unknown';
    const secondaryText = item.matchedContent || item.relationship || item.summary || item.message || item.notes || item.type || '';
    const isSelected = index === selectedIndex;

    return (
      <div
        key={`${type}-${item.id || item.path}`}
        onClick={() => {
          onClick();
          clearSearch();
        }}
        className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-start gap-3 transition-all duration-150 group ${isSelected ? 'bg-indigo-100' : 'hover:bg-indigo-50'
          }`}
      >
        <div className={`mt-1 shrink-0 transition-colors ${isSelected ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'
          }`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 truncate">
            {highlightMatch(primaryText, searchQuery)}
          </div>
          {secondaryText && (
            <div className="text-sm text-gray-500 truncate mt-0.5">
              {type === 'page' ? secondaryText : highlightMatch(secondaryText, searchQuery)}
            </div>
          )}
          {item.timestamp && (
            <div className='text-xs text-gray-400 mt-1'>
              {new Date(item.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
          {item.time && !item.timestamp && (
            <div className='text-xs text-gray-400 mt-1'>
              {formatTime12Hour(item.time)} • {item.recurrence}
            </div>
          )}
          {item.phone && (
            <div className='text-xs text-gray-400 mt-1'>
              {item.phone}
            </div>
          )}
        </div>
      </div>
    );
  };

  const hasDataResults = searchResults && (
    searchResults.contacts?.length > 0 ||
    searchResults.interactions?.length > 0 ||
    searchResults.reminders?.length > 0 ||
    searchResults.alerts?.length > 0 ||
    searchResults.sos_contacts?.length > 0
  );

  const hasAnyResults = pageResults.length > 0 || hasDataResults;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between p-4 md:p-[19px]">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
              {isSearching ? (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              )}
              <input
                type="text"
                placeholder="Search everything... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.length >= MIN_SEARCH_CHARS) setShowResults(true);
                }}
                className="w-full pl-12 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl
                        focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
                        transition-all duration-200 text-sm placeholder:text-gray-400"
              />
              {searchQuery && !isSearching && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                {!hasAnyResults && !isSearching ? (
                  <div className="p-6 text-center">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No results found for <span className="font-medium">"{searchQuery}"</span></p>
                    <p className="text-gray-400 text-xs mt-1">Try different keywords or check spelling</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[85vh] custom-scrollbar">
                    {/* Result count */}
                    <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2 text-xs text-gray-500 z-10 flex items-center justify-between">
                      <span>
                        Found {
                          pageResults.length +
                          (searchResults?.contacts?.length || 0) +
                          (searchResults?.interactions?.length || 0) +
                          (searchResults?.reminders?.length || 0) +
                          (searchResults?.alerts?.length || 0) +
                          (searchResults?.sos_contacts?.length || 0)
                        } results
                      </span>
                      {isSearching && (
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Searching...</span>
                        </div>
                      )}
                    </div>

                    {/* Pages/Navigation */}
                    {pageResults.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-700 uppercase tracking-wider bg-gray-50/50 flex items-center gap-2">
                          <LayoutDashboard className="h-3.5 w-3.5" />
                          Pages ({pageResults.length})
                        </div>
                        {pageResults.map((page, idx) => {
                          const Icon = page.icon;
                          return renderSearchResultItem(
                            { name: page.name, path: page.path },
                            'page',
                            <Icon className="h-4 w-4" />,
                            () => navigate(page.path),
                            idx
                          );
                        })}
                      </div>
                    )}

                    {/* Contacts */}
                    {searchResults?.contacts?.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider bg-indigo-50/50 flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          Contacts ({searchResults.contacts.length})
                        </div>
                        {searchResults.contacts.map((contact, idx) =>
                          renderSearchResultItem(
                            contact,
                            'contact',
                            <User className="h-4 w-4" />,
                            () => navigate('/dashboard/contacts'),
                            pageResults.length + idx
                          )
                        )}
                      </div>
                    )}

                    {/* Interactions */}
                    {searchResults?.interactions?.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50/50 flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5" />
                          Interactions ({searchResults.interactions.length})
                        </div>
                        {searchResults.interactions.map((interaction, idx) =>
                          renderSearchResultItem(
                            interaction,
                            'interaction',
                            <MessageCircle className="h-4 w-4" />,
                            () => navigate('/dashboard/interactions'),
                            pageResults.length + (searchResults.contacts?.length || 0) + idx
                          )
                        )}
                      </div>
                    )}

                    {/* Reminders */}
                    {searchResults?.reminders?.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-purple-600 uppercase tracking-wider bg-purple-50/50 flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Reminders ({searchResults.reminders.length})
                        </div>
                        {searchResults.reminders.map((reminder, idx) =>
                          renderSearchResultItem(
                            reminder,
                            'reminder',
                            <Clock className="h-4 w-4" />,
                            () => navigate('/dashboard/reminders'),
                            pageResults.length + (searchResults.contacts?.length || 0) + (searchResults.interactions?.length || 0) + idx
                          )
                        )}
                      </div>
                    )}

                    {/* Alerts */}
                    {searchResults?.alerts?.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-orange-600 uppercase tracking-wider bg-orange-50/50 flex items-center gap-2">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Alerts ({searchResults.alerts.length})
                        </div>
                        {searchResults.alerts.map((alert, idx) =>
                          renderSearchResultItem(
                            alert,
                            'alert',
                            <AlertTriangle className="h-4 w-4" />,
                            () => navigate('/dashboard/alerts'),
                            pageResults.length + (searchResults.contacts?.length || 0) + (searchResults.interactions?.length || 0) + (searchResults.reminders?.length || 0) + idx
                          )
                        )}
                      </div>
                    )}

                    {/* SOS Contacts */}
                    {searchResults?.sos_contacts?.length > 0 && (
                      <div className="border-b border-gray-100">
                        <div className="px-4 py-2 text-xs font-semibold text-red-600 uppercase tracking-wider bg-red-50/50 flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          SOS Contacts ({searchResults.sos_contacts.length})
                        </div>
                        {searchResults.sos_contacts.map((contact, idx) =>
                          renderSearchResultItem(
                            contact,
                            'sos',
                            <Phone className="h-4 w-4" />,
                            () => navigate('/dashboard/sos'),
                            pageResults.length + (searchResults.contacts?.length || 0) + (searchResults.interactions?.length || 0) + (searchResults.reminders?.length || 0) + (searchResults.alerts?.length || 0) + idx
                          )
                        )}
                      </div>
                    )}

                    {/* Keyboard shortcuts footer */}
                    <div className="sticky bottom-0 bg-white px-4 py-3 border-t border-gray-100">
                      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">↑↓</kbd>
                          Navigate
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">↵</kbd>
                          Select
                        </span>
                        <span className="flex items-center gap-1">
                          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">ESC</kbd>
                          Close
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Status + Notifications + Profile */}
        <div className="flex items-center gap-4">
          {/* Glasses Status */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <div className={`relative ${glassesConnected ? '' : 'opacity-40'}`}>
                <Wifi className={`h-4 w-4 ${glassesConnected ? 'text-emerald-600' : 'text-gray-400'}`} />
                {glassesConnected && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                )}
              </div>
              <Battery className={`h-4 w-4 ${getBatteryColor()}`} />
              <span className="text-xs font-medium text-gray-600">{batteryLevel}%</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <span className="text-xs font-medium text-gray-600">
              {glassesConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => navigate('/dashboard/alerts')}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold
                  rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
            <button
              onClick={() => navigate('/dashboard/settings')}
              className="group relative transition-all duration-200"
              title={profile?.full_name || profile?.email || 'Profile Settings'}
            >
              {profile?.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 group-hover:border-gray-400 transition-colors"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">
                  {getInitials()}
                </div>
              )}
            </button>
            <button
              onClick={logout}
              className="hidden md:block p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-red-600"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
