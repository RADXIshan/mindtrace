import React from 'react';
import { Battery } from 'lucide-react';

const HUDOverlay = ({ mode, recognitionResult }) => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (mode === 'standard') {
        return (
            <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
                {/* Top Bar */}
                <div className="flex justify-between items-start">
                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20 text-white">
                        <h2 className="text-sm font-serif tracking-widest uppercase">MindTrace</h2>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm font-serif">Live Feed</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar - Recognition Result */}
                {recognitionResult && (
                    <div className="self-center mb-12">
                        <div className="bg-white/95 backdrop-blur-xl border border-gray-200 p-8 rounded-xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom-10 fade-in duration-500 text-gray-900">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-500 text-xs font-serif tracking-widest uppercase">Identified</span>
                                <span className="text-gray-400 text-xs font-serif">{recognitionResult.confidence ? (recognitionResult.confidence * 100).toFixed(1) + '%' : ''} Match</span>
                            </div>
                            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">{recognitionResult.name}</h1>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm font-medium border border-gray-200">
                                    {recognitionResult.relation}
                                </span>
                            </div>
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
                    <span className="text-sm font-serif">REC</span>
                    <span className="text-sm font-mono ml-2 opacity-80">00:14</span>
                </div>
                <div className="flex items-center gap-3 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <Battery className="w-5 h-5" />
                    <span className="text-sm font-serif">84%</span>
                    <div className="w-px h-4 bg-white/20" />
                    <span className="text-sm font-serif">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>

            {/* Center Reticle - Minimal */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
                <div className="w-2 h-2 bg-white rounded-full shadow-lg" />
            </div>

            {/* Recognition Result - Minimal */}
            {recognitionResult && (
                <div className="absolute top-1/2 left-1/2 translate-x-12 -translate-y-1/2">
                    <div className="bg-black/60 backdrop-blur-md p-4 rounded-lg border border-white/20 text-white shadow-xl">
                        <div className="text-xl font-serif font-bold">{recognitionResult.name}</div>
                        <div className="text-sm font-serif opacity-80">{recognitionResult.relation}</div>
                    </div>
                    <div className="w-12 h-px bg-white/40 absolute top-1/2 right-full" />
                </div>
            )}
        </div>
    );
};

export default HUDOverlay;
