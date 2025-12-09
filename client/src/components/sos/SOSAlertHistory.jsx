/**
 * SOSAlertHistory Component
 * Timeline view of past SOS alerts
 */

import { useState } from 'react';
import { Clock, MapPin, User, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Format timestamp to readable date and time
 * @param {string} timestamp 
 * @returns {Object}
 */
const formatDateTime = (timestamp) => {
    if (!timestamp) return { date: '', time: '' };
    const date = new Date(timestamp);
    return {
        date: date.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        }),
        time: date.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    };
};

/**
 * Calculate duration between two timestamps
 * @param {string} start 
 * @param {string} end 
 * @returns {string}
 */
const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end) - new Date(start);
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return '<1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
};

/**
 * Single alert history item
 */
const AlertHistoryItem = ({ alert, isExpanded, onToggle }) => {
    const { date, time } = formatDateTime(alert.timestamp);
    const duration = calculateDuration(alert.timestamp, alert.resolved_at);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-gray-300 transition-colors">
            {/* Header - always visible */}
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors"
                aria-expanded={isExpanded}
            >
                {/* Status Icon */}
                <div className={`p-2 rounded-lg shrink-0 ${alert.status === 'resolved' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                    {alert.status === 'resolved' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                    )}
                </div>

                {/* Main Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{date}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-600">{time}</span>
                        {alert.is_test && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs font-medium rounded">
                                TEST
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                        {alert.location?.address || 'Location unavailable'}
                    </p>
                </div>

                {/* Duration & Expand */}
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-gray-500">{duration}</span>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
                    <div className="space-y-3">
                        {/* Location */}
                        <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Location</p>
                                <p className="text-sm text-gray-700">
                                    {alert.location?.address || 'Not available'}
                                </p>
                            </div>
                        </div>

                        {/* Resolution */}
                        {alert.resolved_by && (
                            <div className="flex items-start gap-2">
                                <User className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Resolved By</p>
                                    <p className="text-sm text-gray-700">{alert.resolved_by}</p>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {alert.notes && (
                            <div className="p-3 bg-white rounded-lg border border-gray-200">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Notes</p>
                                <p className="text-sm text-gray-700">{alert.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * @param {Object} props
 * @param {import('../../types/sos.types').SOSAlert[]} props.history
 * @param {Function} [props.onClearHistory]
 * @param {boolean} [props.showClear]
 */
const SOSAlertHistory = ({ history, onClearHistory, showClear = false }) => {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (!history || history.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    Alert History
                </h3>
                <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No past alerts recorded</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Previous SOS alerts will appear here
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    Alert History
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {history.length}
                    </span>
                </h3>

                {showClear && onClearHistory && (
                    <button
                        onClick={onClearHistory}
                        className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {history.map((alert) => (
                    <AlertHistoryItem
                        key={alert.id}
                        alert={alert}
                        isExpanded={expandedId === alert.id}
                        onToggle={() => toggleExpand(alert.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default SOSAlertHistory;
