import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Glasses, Monitor } from 'lucide-react';
import HUDOverlay from '../components/HUDOverlay';

const FaceRecognition = () => {
    const [mode, setMode] = useState('standard'); // 'standard' or 'rayban'

    // Recognition State
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [recognitionResult, setRecognitionResult] = useState(null);
    const intervalRef = useRef(null);

    // Start Camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
        }
    };

    useEffect(() => {
        startCamera();
        startRecognitionLoop();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const captureFrame = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (video.videoWidth === 0 || video.videoHeight === 0) return null;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            return new Promise(resolve => {
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/jpeg');
            });
        }
        return null;
    };

    const startRecognitionLoop = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            const blob = await captureFrame();
            if (!blob) return;

            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');

            try {
                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/face/recognize`, formData);
                if (response.data && response.data.name !== "Unknown") {
                    setRecognitionResult(response.data);
                    // Clear result after 3 seconds if no new detection
                    setTimeout(() => setRecognitionResult(null), 3000);
                }
            } catch (err) {
                // console.error("Recognition error", err);
            }
        }, 1000);
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-black">
            {/* Video Feed */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* HUD Overlay */}
            <HUDOverlay mode={mode} recognitionResult={recognitionResult} />

            {/* Controls - Only visible in Standard Mode or on hover */}
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 transition-opacity duration-300 ${mode === 'rayban' ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <button
                    onClick={() => setMode('standard')}
                    className={`p-4 rounded-full backdrop-blur-md border transition-all ${mode === 'standard'
                            ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-black/40 border-white/10 text-white/60 hover:bg-black/60'
                        }`}
                    title="Standard View"
                >
                    <Monitor className="w-6 h-6" />
                </button>

                <button
                    onClick={() => setMode('rayban')}
                    className={`p-4 rounded-full backdrop-blur-md border transition-all ${mode === 'rayban'
                            ? 'bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                            : 'bg-black/40 border-white/10 text-white/60 hover:bg-black/60'
                        }`}
                    title="Ray-Ban Meta Mode"
                >
                    <Glasses className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default FaceRecognition;
