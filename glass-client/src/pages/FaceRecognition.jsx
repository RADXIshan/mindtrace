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
    const [debugStatus, setDebugStatus] = useState("Init...");

    // Start Camera
    const startCamera = async () => {
        try {
            setDebugStatus("Requesting Camera...");
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Wait for video metadata to load before playing
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(err => {
                        console.error("Error playing video:", err);
                        setDebugStatus(`Play Err: ${err.message}`);
                    });
                    setDebugStatus("Camera Active");
                };
            } else {
                setDebugStatus("Err: No Video Ref");
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setDebugStatus(`Cam Err: ${err.message}`);
        }
    };

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

    const calculatePosition = (bbox) => {
        if (!videoRef.current || !bbox) return null;

        const video = videoRef.current;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Calculate scale to maintain aspect ratio (object-cover)
        const scale = Math.max(screenWidth / videoWidth, screenHeight / videoHeight);

        const scaledWidth = videoWidth * scale;
        const scaledHeight = videoHeight * scale;

        const xOffset = (screenWidth - scaledWidth) / 2;
        const yOffset = (screenHeight - scaledHeight) / 2;

        // bbox is [x1, y1, x2, y2]
        const [x1, y1, x2, y2] = bbox;

        // Map to screen coordinates
        const screenX = x1 * scale + xOffset;
        const screenY = y1 * scale + yOffset;
        const screenW = (x2 - x1) * scale;
        const screenH = (y2 - y1) * scale;

        return {
            left: screenX,
            top: screenY,
            width: screenW,
            height: screenH
        };
    };

    const timeoutRef = useRef(null);

    const startRecognitionLoop = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDebugStatus("Loop Started");

        intervalRef.current = setInterval(async () => {
            if (!videoRef.current) {
                setDebugStatus("Wait: No Video Ref");
                return;
            }
            if (videoRef.current.paused) {
                setDebugStatus("Wait: Video Paused");
                return;
            }
            if (videoRef.current.ended) {
                setDebugStatus("Wait: Video Ended");
                return;
            }
            if (videoRef.current.readyState < 2) {
                setDebugStatus(`Wait: ReadyState ${videoRef.current.readyState}`);
                return;
            }

            const blob = await captureFrame();
            if (!blob) {
                setDebugStatus("Wait: No Blob (Size 0?)");
                return;
            }

            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');

            try {
                // setDebugStatus("Sending..."); // Optional: might flicker too much
                const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/face/recognize`, formData);
                const data = response.data;

                // Handle both single object (legacy) and array (new)
                const results = Array.isArray(data) ? data : [data];

                // Filter out nulls/undefined, but KEEP "Unknown" faces
                const validResults = results.filter(r => r);

                setDebugStatus(`OK: ${validResults.length} faces (Raw: ${results.length})`);

                if (validResults.length > 0) {
                    const processedResults = validResults.map(result => {
                        if (result.bbox) {
                            return {
                                ...result,
                                position: calculatePosition(result.bbox)
                            };
                        }
                        return result;
                    });

                    // Clear any pending timeout to hide the result
                    if (timeoutRef.current) clearTimeout(timeoutRef.current);

                    setRecognitionResult(processedResults);

                    // Set a new timeout to clear the result if no new detection occurs
                    timeoutRef.current = setTimeout(() => {
                        setRecognitionResult([]);
                        timeoutRef.current = null;
                    }, 2000);
                }
            } catch (err) {
                console.error("Recognition error", err);
                setDebugStatus(`Err: ${err.message}`);
            }
        }, 200); // Increased frequency for smoother tracking (5fps)
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
            <HUDOverlay mode={mode} recognitionResult={recognitionResult} debugStatus={debugStatus} />

            {/* Controls - Only visible in Standard Mode or on hover */}
            <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 transition-opacity duration-300 ${mode === 'rayban' ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <button
                    onClick={() => setMode('standard')}
                    className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${mode === 'standard'
                        ? 'bg-white text-indigo-600 border-white shadow-lg scale-110'
                        : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                        }`}
                    title="Standard View"
                >
                    <Monitor className="w-6 h-6" />
                </button>

                <button
                    onClick={() => setMode('rayban')}
                    className={`p-4 rounded-2xl backdrop-blur-md border transition-all ${mode === 'rayban'
                        ? 'bg-white text-indigo-600 border-white shadow-lg scale-110'
                        : 'bg-white/20 border-white/30 text-white hover:bg-white/30'
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
