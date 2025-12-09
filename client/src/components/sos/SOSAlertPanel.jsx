/**
 * SOSAlertPanel Component
 * Displays active alert status with emergency actions
 */

import { AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
import SOSEmergencyActions from './SOSEmergencyActions';

/**
 * Format timestamp to readable string
 * @param {string} timestamp 
 * @returns {string}
 */
const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

/**
 * @param {Object} props
 * @param {import('../../types/sos.types').SOSAlert} [props.activeAlert]
 * @param {Function} props.onResolve
 * @param {Function} props.onAcknowledge
 * @param {boolean} [props.isTestMode]
 */
const SOSAlertPanel = ({
    activeAlert,
    onResolve,
    onAcknowledge,
    isTestMode = false,
    contacts = []
}) => {
    // No active alert - show safe state
    if (!activeAlert) {
        return (
            <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-xl">
                        <CheckCircle className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-emerald-800">All Safe</h2>
                        <p className="text-emerald-600">
                            No active SOS alerts. Last check: {formatTime(new Date().toISOString())}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Active alert states
    const isPending = activeAlert.status === 'pending';
    const isAcknowledged = activeAlert.status === 'acknowledged';

    return (
        <div
            className={`rounded-2xl border-2 p-6 transition-all duration-300 ${isPending
                    ? 'bg-amber-50 border-amber-300 animate-pulse-slow'
                    : 'bg-amber-50 border-amber-200'
                }`}
            role="alert"
            aria-live="assertive"
        >
            {/* Alert Header */}
            <div className="flex items-start gap-4 mb-5">
                <div className={`p-3 rounded-xl ${isPending ? 'bg-amber-200' : 'bg-amber-100'}`}>
                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                </div>

                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-amber-900">
                            {isPending ? 'SOS Alert Received!' : 'SOS Alert (Acknowledged)'}
                        </h2>
                        {isTestMode && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                TEST
                            </span>
                        )}
                    </div>
                    
                    {activeAlert.wearer_name && (
                        <p className="text-sm text-amber-700 mt-1">
                            From: <span className="font-semibold">{activeAlert.wearer_name}</span>
                        </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-amber-700 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm font-medium">
                                {formatTime(activeAlert.timestamp)}
                            </span>
                        </div>

                        {activeAlert.location?.address && (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" />
                                <span className="text-sm truncate max-w-[200px] md:max-w-[400px]">
                                    {activeAlert.location.address}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            <div className="mb-5">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isPending
                        ? 'bg-amber-200 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isPending ? 'bg-amber-600 animate-pulse' : 'bg-blue-600'
                        }`} />
                    {isPending ? 'Awaiting Response' : 'Acknowledged'}
                </div>
            </div>

            {/* Emergency Actions */}
            <SOSEmergencyActions
                activeAlert={activeAlert}
                location={activeAlert.location}
                onResolve={onResolve}
                onAcknowledge={onAcknowledge}
                isTest={isTestMode}
                contacts={contacts}
            />
        </div>
    );
};

export default SOSAlertPanel;
