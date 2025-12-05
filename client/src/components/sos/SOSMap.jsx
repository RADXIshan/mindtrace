import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { MAP_CONFIG } from '../../constants/sosConfig';
import { formatCoordinates, getMapUrl } from '../../utils/geocoding';

// Lazy load Leaflet to reduce bundle size
let L = null;

/**
 * @param {Object} props
 * @param {import('../../types/sos.types').Location} [props.location]
 * @param {boolean} [props.isAlertActive] - Whether SOS is active (triggers pulsing)
 * @param {boolean} [props.showAccuracy] - Show accuracy radius circle
 * @param {Function} [props.onLocationClick] - Callback when location is clicked
 */
const SOSMap = ({
    location,
    isAlertActive = false,
    showAccuracy = true,
    onLocationClick
}) => {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const circleRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Initialize map
    useEffect(() => {
        const initMap = async () => {
            try {
                // Dynamically import Leaflet
                if (!L) {
                    L = await import('leaflet');
                    // Import CSS
                    await import('leaflet/dist/leaflet.css');
                }

                if (!mapContainerRef.current || mapRef.current) return;

                // Fix for default marker icons in Leaflet + bundlers
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                });

                // Create map
                const map = L.map(mapContainerRef.current, {
                    center: location
                        ? [location.lat, location.lng]
                        : MAP_CONFIG.defaultCenter,
                    zoom: MAP_CONFIG.defaultZoom,
                    zoomControl: true,
                    attributionControl: true
                });

                // Add tile layer
                L.tileLayer(MAP_CONFIG.tileUrl, {
                    attribution: MAP_CONFIG.attribution,
                    maxZoom: MAP_CONFIG.maxZoom,
                    minZoom: MAP_CONFIG.minZoom
                }).addTo(map);

                mapRef.current = map;
                setIsLoading(false);

            } catch (err) {
                console.error('Failed to initialize map:', err);
                setError('Failed to load map');
                setIsLoading(false);
            }
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Update marker when location changes
    useEffect(() => {
        if (!mapRef.current || !L || !location) return;

        const { lat, lng, accuracy } = location;

        // Remove existing marker and circle
        if (markerRef.current) {
            markerRef.current.remove();
        }
        if (circleRef.current) {
            circleRef.current.remove();
        }

        // Create custom icon for active alert
        const iconHtml = isAlertActive
            ? `<div class="sos-marker-pulse">
           <div class="sos-marker-inner"></div>
         </div>`
            : `<div class="sos-marker-static"></div>`;

        const customIcon = L.divIcon({
            className: 'sos-custom-marker',
            html: iconHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        // Add marker
        const marker = L.marker([lat, lng], { icon: customIcon })
            .addTo(mapRef.current);

        if (location.address) {
            marker.bindPopup(`
        <div class="p-2">
          <strong>📍 Location</strong><br/>
          ${location.address}
        </div>
      `);
        }

        markerRef.current = marker;

        // Add accuracy circle if enabled
        if (showAccuracy && accuracy) {
            const circle = L.circle([lat, lng], {
                radius: accuracy,
                color: isAlertActive ? '#F59E0B' : '#3B82F6',
                fillColor: isAlertActive ? '#FEF3C7' : '#DBEAFE',
                fillOpacity: 0.3,
                weight: 2
            }).addTo(mapRef.current);

            circleRef.current = circle;
        }

        // Pan to new location with animation
        mapRef.current.flyTo([lat, lng], MAP_CONFIG.defaultZoom, {
            duration: 1
        });

    }, [location, isAlertActive, showAccuracy]);

    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100);
    };

    // Handle open in external maps
    const handleOpenExternal = () => {
        if (location) {
            window.open(getMapUrl(location.lat, location.lng), '_blank');
        }
    };

    // Fallback when map fails
    if (error) {
        return (
            <div className="bg-gray-100 rounded-2xl border border-gray-200 p-6 flex flex-col items-center justify-center min-h-[300px]">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium mb-2">Map unavailable</p>
                {location && (
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">
                            Coordinates: {formatCoordinates(location.lat, location.lng)}
                        </p>
                        <button
                            onClick={handleOpenExternal}
                            className="text-sm text-indigo-600 hover:text-indigo-700 underline"
                        >
                            Open in Google Maps →
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className={`relative bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden
        transition-all duration-300 ${isFullscreen ? 'fixed inset-4 z-50' : 'min-h-[300px] md:min-h-[400px]'}`}
        >
            {/* Loading State */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-3 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                        <span className="mt-2 text-sm text-gray-500">Loading map...</span>
                    </div>
                </div>
            )}

            {/* Map Container */}
            <div
                ref={mapContainerRef}
                className="w-full h-full min-h-[300px] md:min-h-[400px]"
                role="application"
                aria-label="Location map"
            />

            {/* Controls Overlay */}
            <div className="absolute top-3 right-3 z-1000 flex flex-col gap-2">
                <button
                    onClick={toggleFullscreen}
                    className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                    {isFullscreen ? (
                        <Minimize2 className="h-4 w-4 text-gray-600" />
                    ) : (
                        <Maximize2 className="h-4 w-4 text-gray-600" />
                    )}
                </button>
            </div>

            {/* Location Info Overlay */}
            {location && (
                <div className="absolute bottom-3 left-3 right-3 z-1000">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isAlertActive ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            <MapPin className={`h-5 w-5 ${isAlertActive ? 'text-amber-600' : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {location.address || formatCoordinates(location.lat, location.lng)}
                            </p>
                            <p className="text-xs text-gray-500">
                                Accuracy: ±{location.accuracy}m
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Marker Styles */}
            <style>{`
        .sos-custom-marker {
          background: transparent !important;
          border: none !important;
        }
        
        .sos-marker-pulse {
          width: 40px;
          height: 40px;
          position: relative;
        }
        
        .sos-marker-pulse::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(245, 158, 11, 0.4);
          border-radius: 50%;
          animation: sos-pulse 1.5s ease-out infinite;
        }
        
        .sos-marker-inner {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: #F59E0B;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .sos-marker-static {
          width: 16px;
          height: 16px;
          background: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          margin: 12px;
        }
        
        @keyframes sos-pulse {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
};

export default SOSMap;
