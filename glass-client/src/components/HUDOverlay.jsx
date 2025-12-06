import React from 'react';
import { Battery } from 'lucide-react';

const HUDOverlay = ({ mode, recognitionResult, debugStatus, subtitle }) => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Helper to get style for tracking tag
    const getTagStyle = (position, index) => {
        if (!position) return {};

        const { left, top, width, height } = position;

        // Add vertical offset for multiple faces to prevent overlap
        const verticalOffset = index * 20; // Stagger tags vertically

        return {
            position: 'absolute',
            left: `${left + width + 40}px`, // Increased offset for larger tag
            top: `${top + verticalOffset}px`,
            transition: 'all 0.15s ease-out', // Smoother transition to reduce jitter
            zIndex: 1000 + index // Ensure proper stacking
        };
    };

    const TagContent = ({ result }) => (
        <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-2xl shadow-xl text-gray-900 min-w-[200px]">
            <div className="flex flex-col">
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-600 mb-2">
                    {result.name === 'Unknown' ? 'Detected' : 'Identified'}
                </span>
                <h1 className="text-3xl font-bold leading-none tracking-tight mb-1">{result.name}</h1>
                <span className="text-lg font-medium opacity-70 text-gray-600">{result.relation}</span>
            </div>
            {/* Connecting Line */}
            <div className="absolute top-8 -left-10 w-10 h-px bg-white/60" />
            <div className="absolute top-8 -left-1 w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        </div>
    );

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

                {/* Bounding Boxes for all detected faces */}
                {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.map((result, index) => (
                    result.position && (
                        <div 
                            key={`bbox-${result.name}-${result.confidence}-${index}`}
                            style={{
                                position: 'absolute',
                                left: `${result.position.left}px`,
                                top: `${result.position.top}px`,
                                width: `${result.position.width}px`,
                                height: `${result.position.height}px`,
                                border: '2px solid rgba(99, 102, 241, 0.8)',
                                boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
                                pointerEvents: 'none'
                            }}
                        />
                    )
                ))}

                {/* Tracking Tags */}
                {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.map((result, index) => (
                    result.position && (
                        <div key={`tag-${result.name}-${result.confidence}-${index}`} style={getTagStyle(result.position, index)}>
                            <TagContent result={result} />
                        </div>
                    )
                ))}
                
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
                {subtitle && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl w-full text-center px-6">
                         <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-white/50 shadow-xl">
                            <p className="text-gray-900 text-lg font-medium leading-relaxed tracking-wide">
                                "{subtitle}"
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
                    <span className="text-sm font-medium">REC</span>
                    <span className="text-sm font-mono ml-2 opacity-80">Live</span>
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

            {/* Bounding Boxes for all detected faces */}
            {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.map((result, index) => (
                result.position && (
                    <div 
                        key={`bbox-${result.name}-${result.confidence}-${index}`}
                        style={{
                            position: 'absolute',
                            left: `${result.position.left}px`,
                            top: `${result.position.top}px`,
                            width: `${result.position.width}px`,
                            height: `${result.position.height}px`,
                            border: '2px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
                            pointerEvents: 'none'
                        }}
                    />
                )
            ))}

            {/* Tracking Tags - Minimal for Ray-Ban */}
            {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.map((result, index) => (
                result.position && (
                    <div key={`tag-${result.name}-${result.confidence}-${index}`} style={getTagStyle(result.position, index)}>
                        <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20 text-white shadow-2xl">
                            <div className="text-2xl font-bold">{result.name}</div>
                            <div className="text-base font-medium opacity-80">{result.relation}</div>
                        </div>
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 -left-8 w-8 h-px bg-white/30" />
                        <div className="absolute top-1/2 -left-1 w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                )
            ))}
            
            {/* Info message when Unknown faces are detected */}
            {recognitionResult && Array.isArray(recognitionResult) && recognitionResult.length > 0 && 
             recognitionResult.every(r => r.name === 'Unknown') && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 max-w-md">
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-xl">
                        <p className="text-white text-sm font-medium text-center">
                            💡 Upload contacts with photos to identify faces
                        </p>
                    </div>
                </div>
            )}
            
            {/* Live Subtitles */}
            {subtitle && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 max-w-2xl w-full text-center px-6">
                     <div className="bg-black/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl">
                        <p className="text-white text-lg font-medium leading-relaxed tracking-wide animate-pulse">
                            "{subtitle}"
                        </p>
                     </div>
                </div>
            )}
        </div>
    );
};

export default HUDOverlay;
