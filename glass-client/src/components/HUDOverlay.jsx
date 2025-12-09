import React from 'react';
import { Battery } from 'lucide-react';

const HUDOverlay = ({ mode, recognitionResult, debugStatus, subtitle }) => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Helper to get style for tracking tag
    const getTagStyle = (position, placement, index) => {
        if (!position) return {};

        const { left, top, width } = position;
        const verticalOffset = (index % 3) * 40; // Stagger to prevent vertical overlap

        // If placement is 'right', tag goes to the RIGHT of the face
        // If placement is 'left', tag goes to the LEFT of the face
        const horizontalOffset = placement === 'right' ? width + 40 : -280; // Tag width ~260px + margin

        return {
            position: 'absolute',
            left: `${left + horizontalOffset}px`,
            top: `${top + verticalOffset}px`,
            transition: 'left 0.1s ease-out, top 0.1s ease-out',
            willChange: 'transform, left, top',
            transform: 'translate3d(0, 0, 0)',
            zIndex: 1000 + index, 
            backfaceVisibility: 'hidden',
            perspective: 1000
        };
    };

    const formatISTTime = (timestamp) => {
        if (!timestamp) return null;
        try {
            const date = new Date(timestamp);
            return new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            }).format(date);
        } catch (e) {
            return null;
        }
    };

    const TagContent = ({ result, placement, variant = 'light' }) => {
        const lastSeen = formatISTTime(result.last_seen_timestamp);
        const summary = result.last_conversation_summary;
        
        const isDark = variant === 'dark';
        
        // Dynamic styles based on variant
        const containerClass = isDark 
            ? "bg-black/60 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl text-white min-w-[260px] max-w-[300px]"
            : "bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-2xl shadow-xl text-gray-900 min-w-[280px] max-w-[320px]";
            
        const labelClass = isDark
            ? "text-[10px] font-bold tracking-wider uppercase text-indigo-400 mb-1 block"
            : "text-xs font-bold tracking-wider uppercase text-indigo-600 mb-1 block";
            
        const nameClass = isDark
            ? "text-2xl font-bold leading-none tracking-tight mb-0.5"
            : "text-3xl font-bold leading-none tracking-tight mb-1";
            
        const relationClass = isDark
            ? "text-sm font-medium opacity-80 text-gray-300 block"
            : "text-lg font-medium opacity-70 text-gray-600 block";
            
        const metaLabelClass = isDark
            ? "text-[10px] font-bold uppercase text-gray-400 mt-0.5 whitespace-nowrap"
            : "text-xs font-bold uppercase text-indigo-400 mt-0.5 whitespace-nowrap";
            
        const metaTextClass = isDark
            ? "text-xs font-medium text-gray-200"
            : "text-sm font-medium text-gray-700";
            
        const topicLabelClass = isDark
             ? "text-[10px] font-bold uppercase text-gray-400"
             : "text-xs font-bold uppercase text-indigo-400";
             
        const topicTextClass = isDark
            ? "text-[11px] text-gray-300 leading-snug line-clamp-2 italic"
            : "text-xs text-gray-600 leading-snug line-clamp-2 italic";

        // Line positioning based on placement
        // If placement is 'right' (tag on right of face), line is on LEFT of tag
        // If placement is 'left' (tag on left of face), line is on RIGHT of tag
        const isTagOnRight = placement === 'right';

        return (
            <div className={containerClass}>
                <div className="flex flex-col gap-2">
                    <div>
                        <span className={labelClass}>
                            {result.name === 'Unknown' ? 'Detected' : 'Identified'}
                        </span>
                        <h1 className={nameClass}>{result.name}</h1>
                        <span className={relationClass}>{result.relation}</span>
                    </div>

                    {(lastSeen || summary) && (
                        <div className={`mt-2 pt-2 border-t flex flex-col gap-2 ${isDark ? 'border-white/10' : 'border-gray-200/50'}`}>
                            {lastSeen && (
                                <div className="flex items-start gap-2">
                                    <span className={metaLabelClass}>Last Met</span>
                                    <span className={metaTextClass}>{lastSeen}</span>
                                </div>
                            )}
                            {summary && (
                                <div className="flex flex-col gap-1">
                                    <span className={topicLabelClass}>Last Topic</span>
                                    <p className={topicTextClass}>
                                        "{summary}"
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Connecting Line */}
                {isTagOnRight ? (
                    <>
                        <div className={`absolute top-8 left-0 -translate-x-full h-px ${isDark ? 'w-8 bg-white/30' : 'w-10 bg-white/60'}`} />
                        <div className={`absolute top-8 -left-1 w-2 h-2 rounded-full ${isDark ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]'}`} />
                    </>
                ) : (
                    <>
                        <div className={`absolute top-8 right-0 translate-x-full h-px ${isDark ? 'w-8 bg-white/30' : 'w-10 bg-white/60'}`} />
                        <div className={`absolute top-8 -right-1 w-2 h-2 rounded-full ${isDark ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]'}`} />
                    </>
                )}
            </div>
        );
    };

    if (mode === 'standard') {
        return (
            <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                    <div className="bg-white/90 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/50 text-gray-900 shadow-sm">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-indigo-900">MindTrace</h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 text-gray-900 shadow-sm flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm font-medium">Live Feed</span>
                        </div>
                        {/* Debug Info */}
                        <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 text-gray-900 shadow-sm flex flex-col items-start">
                            <span className="text-xs font-mono font-medium">
                                Faces: {recognitionResult ? (Array.isArray(recognitionResult) ? recognitionResult.length : 'Obj') : 'None'}
                            </span>
                            {debugStatus && <span className="text-[10px] font-mono text-indigo-600">{debugStatus}</span>}
                        </div>
                    </div>
                </div>



                {/* Tracking Tags */}
                {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.map((result, index) => {
                    if (!result.position) return null;
                    
                    // Determine placement based on screen position
                    // If face is on left half (< 50vw), place tag on RIGHT
                    // If face is on right half (> 50vw), place tag on LEFT
                    const screenCenter = window.innerWidth / 2;
                    const faceCenter = result.position.left + result.position.width / 2;
                    const placement = faceCenter < screenCenter ? 'right' : 'left';
                    
                    return (
                        <div key={`track-${result.trackId}`} style={getTagStyle(result.position, placement, index)}>
                            <TagContent result={result} placement={placement} variant="light" />
                        </div>
                    );
                })}

                {/* Info message when Unknown faces are detected */}
                {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.length > 0 &&
                    recognitionResult.every(r => r.name === 'Unknown') && (
                        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-md">
                            <div className="bg-indigo-600/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-indigo-400/50 shadow-xl">
                                <p className="text-white text-sm font-medium text-center">
                                    💡 Upload contacts with photos to identify faces
                                </p>
                            </div>
                        </div>
                    )}

                {/* Live Subtitles */}
                {subtitle && subtitle.trim() && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-3xl w-full text-center px-6">
                         <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border-2 border-indigo-200 shadow-2xl">
                            <p className="text-gray-900 text-xl font-medium leading-relaxed tracking-wide">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Ray-Ban Meta Mode
    return (
        <div className="absolute inset-0 pointer-events-none">
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />

            {/* HUD Elements */}
            <div className="absolute top-8 right-8 flex items-center gap-4 text-white/90 font-medium">
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium">LIVE</span>
                </div>
                <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <Battery className="w-5 h-5" />
                    <span className="text-sm font-medium">84%</span>
                    <div className="w-px h-4 bg-white/20" />
                    <span className="text-sm font-medium">{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                </div>
            </div>

            {/* Center Reticle - Minimal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
                <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
            </div>



            {/* Tracking Tags - Minimal for Ray-Ban */}
            {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.map((result, index) => {
                if (!result.position) return null;
                
                const screenCenter = window.innerWidth / 2;
                const faceCenter = result.position.left + result.position.width / 2;
                const placement = faceCenter < screenCenter ? 'right' : 'left';
                
                return (
                    <div key={`track-${result.trackId}`} style={getTagStyle(result.position, placement, index)}>
                        <TagContent result={result} placement={placement} variant="dark" />
                    </div>
                );
            })}

                {/* Info message when Unknown faces are detected */}
                {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.length > 0 &&
                    recognitionResult.every(r => r.name === 'Unknown') && (
                        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-md">
                            <div className="bg-indigo-600/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-indigo-400/50 shadow-xl">
                                <p className="text-white text-sm font-medium text-center">
                                    💡 Upload contacts with photos to identify faces
                                </p>
                            </div>
                        </div>
                    )}

                {/* Live Subtitles */}
                {subtitle && subtitle.trim() && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-3xl w-full text-center px-6">
                         <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl border-2 border-indigo-200 shadow-2xl">
                            <p className="text-gray-900 text-xl font-medium leading-relaxed tracking-wide">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        );
    }


export default HUDOverlay;
