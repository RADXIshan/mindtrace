/**
 * SOSPage Component
 * Main SOS Alert Dashboard page
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { Shield, AlertTriangle, Volume2, VolumeX } from 'lucide-react';

// Components
import SOSMap from './SOSMap';
import SOSQuickInfo from './SOSQuickInfo';
import SOSAlertPanel from './SOSAlertPanel';
import SOSAlertHistory from './SOSAlertHistory';
import SOSNotificationBanner from './SOSNotificationBanner';

// Hooks
import useSOSAlerts from '../../hooks/useSOSAlerts';
import useLocationTracking from '../../hooks/useLocationTracking';
import useNotifications from '../../hooks/useNotifications';

// Services
import { userApi, sosApi } from '../../services/api';

const SOSPage = () => {
    const [wearerProfile, setWearerProfile] = useState(null);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [profileLoading, setProfileLoading] = useState(true);

    // SOS Alert state
    const {
        activeAlert,
        alertHistory,
        isLoading,
        isTestMode,
        triggerAlert,
        acknowledgeAlert,
        resolveAlert,
        clearHistory,
        updateAlertLocation
    } = useSOSAlerts();

    // Location tracking with real-time polling
    const {
        currentLocation,
        batteryLevel,
        connectionStatus,
        isStale,
        setRandomLocation,
        getTimeSinceUpdate
    } = useLocationTracking({ enablePolling: true, pollInterval: 3000 });

    // Fetch user profile and emergency contacts
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const [profileRes, contactsRes] = await Promise.all([
                    userApi.getProfile(),
                    sosApi.getContacts()
                ]);

                setWearerProfile({
                    id: profileRes.data.id,
                    name: profileRes.data.full_name || 'User',
                    photoUrl: profileRes.data.profile_image,
                    medicalNotes: 'Medical information not available',
                    batteryLevel: batteryLevel,
                    connectionStatus: connectionStatus,
                    lastSeen: new Date().toISOString()
                });

                // Set emergency contacts from database (empty array if none)
                setEmergencyContacts(contactsRes.data || []);
            } catch (error) {
                console.error('Failed to fetch profile data:', error);
                // Use default profile if fetch fails
                setWearerProfile({
                    id: 'user',
                    name: 'User',
                    photoUrl: null,
                    medicalNotes: 'Medical information not available',
                    batteryLevel: batteryLevel,
                    connectionStatus: connectionStatus,
                    lastSeen: new Date().toISOString()
                });
            } finally {
                setProfileLoading(false);
            }
        };

        fetchProfileData();
    }, [batteryLevel, connectionStatus]);

    // Notifications
    const {
        preferences,
        showBanner,
        bannerMessage,
        togglePreference,
        hideNotificationBanner,
        triggerSOSNotification
    } = useNotifications();

    // SOS Sound state  
    const [isSOSSoundPlaying, setIsSOSSoundPlaying] = useState(false);
    const audioContextRef = useRef(null);
    const ringtoneIntervalRef = useRef(null);

    // Play SOS ringtone similar to iPhone
    const playSOSSound = useCallback(() => {
        if (isSOSSoundPlaying) return;

        try {
            // Stop any existing sound first
            stopSOSSound();

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioContextRef.current;

            const playRingPattern = () => {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;

                const now = ctx.currentTime;

                // iPhone-style emergency ringtone pattern
                const pattern = [
                    // First ring burst - ascending tones
                    { freq: 880, start: 0.0, dur: 0.12 },
                    { freq: 1047, start: 0.12, dur: 0.12 },
                    { freq: 1319, start: 0.24, dur: 0.12 },
                    { freq: 1568, start: 0.36, dur: 0.15 },
                    // Descending
                    { freq: 1319, start: 0.55, dur: 0.12 },
                    { freq: 1047, start: 0.67, dur: 0.12 },
                    { freq: 880, start: 0.79, dur: 0.15 },
                    // Pause, then repeat with urgency
                    { freq: 1047, start: 1.1, dur: 0.1 },
                    { freq: 1319, start: 1.2, dur: 0.1 },
                    { freq: 1568, start: 1.3, dur: 0.1 },
                    { freq: 1760, start: 1.4, dur: 0.15 },
                    { freq: 1568, start: 1.6, dur: 0.1 },
                    { freq: 1319, start: 1.7, dur: 0.1 },
                    { freq: 1047, start: 1.8, dur: 0.15 },
                ];

                pattern.forEach(({ freq, start, dur }) => {
                    const oscillator = ctx.createOscillator();
                    const gainNode = ctx.createGain();

                    oscillator.connect(gainNode);
                    gainNode.connect(ctx.destination);

                    oscillator.frequency.value = freq;
                    oscillator.type = 'sine';

                    // Smooth envelope for a pleasant but urgent ring sound
                    gainNode.gain.setValueAtTime(0, now + start);
                    gainNode.gain.linearRampToValueAtTime(0.5, now + start + 0.02);
                    gainNode.gain.setValueAtTime(0.5, now + start + dur - 0.02);
                    gainNode.gain.linearRampToValueAtTime(0, now + start + dur);

                    oscillator.start(now + start);
                    oscillator.stop(now + start + dur);
                });
            };

            // Play immediately
            playRingPattern();
            setIsSOSSoundPlaying(true);

            // Loop the ringtone
            ringtoneIntervalRef.current = setInterval(() => {
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    playRingPattern();
                }
            }, 2200);

        } catch (error) {
            console.warn('SOS Audio playback failed:', error);
        }
    }, [isSOSSoundPlaying]);

    // Stop SOS sound
    const stopSOSSound = useCallback(() => {
        if (ringtoneIntervalRef.current) {
            clearInterval(ringtoneIntervalRef.current);
            ringtoneIntervalRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        setIsSOSSoundPlaying(false);
    }, []);

    // Toggle SOS sound and notification
    const toggleSOSSound = useCallback(() => {
        if (isSOSSoundPlaying) {
            stopSOSSound();
            hideNotificationBanner();
        } else {
            playSOSSound();
            // Trigger the SOS notification banner with current location
            triggerSOSNotification(
                '🚨 Emergency SOS Activated! Help is needed immediately.',
                currentLocation
            );
        }
    }, [isSOSSoundPlaying, playSOSSound, stopSOSSound, hideNotificationBanner, triggerSOSNotification, currentLocation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSOSSound();
        };
    }, [stopSOSSound]);

    // Auto-update alert location when current location changes (real-time tracking)
    useEffect(() => {
        if (activeAlert && currentLocation) {
            // Update the alert location in real-time
            const updateTimer = setTimeout(() => {
                updateAlertLocation(currentLocation);
            }, 5000); // Update every 5 seconds

            return () => clearTimeout(updateTimer);
        }
    }, [activeAlert, currentLocation, updateAlertLocation]);

    // Handle resolve
    const handleResolve = (alertId, resolvedBy, notes) => {
        resolveAlert(alertId, resolvedBy, notes);
        hideNotificationBanner();
    };

    // Get overall status
    const getOverallStatus = () => {
        if (activeAlert) {
            if (activeAlert.status === 'pending') {
                return { label: 'SOS Active', color: 'bg-amber-500', pulse: true };
            }
            return { label: 'Acknowledged', color: 'bg-blue-500', pulse: false };
        }
        return { label: 'All Safe', color: 'bg-emerald-500', pulse: false };
    };

    const status = getOverallStatus();

    if (isLoading || profileLoading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="mt-4 text-gray-600">Loading SOS Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* Notification Banner */}
            <SOSNotificationBanner
                show={showBanner}
                message={bannerMessage}
                onDismiss={hideNotificationBanner}
                soundEnabled={preferences.sound}
                onToggleSound={() => togglePreference('sound')}
                isTest={isTestMode}
            />

            {/* Page Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                        <Shield className="h-8 w-8 text-indigo-600" />
                        SOS Alert Center
                    </h1>
                    <p className="text-lg text-gray-600">
                        Real-time location tracking and emergency response
                    </p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-3">
                    {/* SOS Sound Button */}
                    <button
                        onClick={toggleSOSSound}
                        className={`
                            relative flex items-center justify-center gap-2 px-5 py-3 rounded-full font-bold text-white
                            transition-all duration-300 transform hover:scale-105 active:scale-95
                            ${isSOSSoundPlaying
                                ? 'bg-gray-600 hover:bg-gray-700'
                                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-red-500/25'
                            }
                        `}
                        title={isSOSSoundPlaying ? 'Stop SOS Sound' : 'Play SOS Sound'}
                    >
                        {isSOSSoundPlaying ? (
                            <>
                                <VolumeX className="h-5 w-5" />
                                <span>Stop Sound</span>
                            </>
                        ) : (
                            <>
                                <span className="relative flex h-3 w-3 mr-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                </span>
                                <AlertTriangle className="h-5 w-5" />
                                <span>SOS</span>
                            </>
                        )}
                    </button>

                    {/* Status Badge */}
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-semibold ${status.color}`}>
                        {status.pulse && (
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                            </span>
                        )}
                        <span>{status.label}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
                {/* Map - Takes 2 columns on large screens */}
                <div className="lg:col-span-2">
                    <SOSMap
                        location={activeAlert?.location || currentLocation}
                        isAlertActive={!!activeAlert}
                        showAccuracy={true}
                    />
                </div>

                {/* Quick Info Sidebar */}
                <div className="lg:col-span-1">
                    <SOSQuickInfo
                        wearer={wearerProfile}
                        contacts={emergencyContacts}
                        batteryLevel={batteryLevel}
                        connectionStatus={connectionStatus}
                        lastSeen={getTimeSinceUpdate()}
                        isStale={isStale}
                    />
                </div>
            </div>

            {/* Alert Panel */}
            <div className="mb-6">
                <SOSAlertPanel
                    activeAlert={activeAlert}
                    onResolve={handleResolve}
                    onAcknowledge={acknowledgeAlert}
                    isTestMode={isTestMode}
                    contacts={emergencyContacts}
                />
            </div>

            {/* Alert History */}
            <SOSAlertHistory
                history={alertHistory}
                onClearHistory={clearHistory}
                showClear={true}
            />
        </div>
    );
};

export default SOSPage;
