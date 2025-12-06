import { useState, useRef, useEffect } from 'react';
import { Glasses, Monitor } from 'lucide-react';
import HUDOverlay from '../components/HUDOverlay';
import { faceApi, userApi } from '../services/api';

const FaceRecognition = () => {
    const [mode, setMode] = useState('standard'); // 'standard' or 'rayban'

    // Recognition State
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [recognitionResult, setRecognitionResult] = useState(null);
    const intervalRef = useRef(null);
    const [debugStatus, setDebugStatus] = useState("Init...");
    const lastResultRef = useRef(null);
    const timeoutRef = useRef(null);

    const [subtitle, setSubtitle] = useState("");
    const [userId, setUserId] = useState(null);
    const userIdRef = useRef(null); // Use ref to avoid stale closure

    // Extract token from URL on mount and fetch user profile
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            localStorage.setItem('token', token);
            setDebugStatus("Token received");
            // Clean URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            const existingToken = localStorage.getItem('token');
            if (!existingToken) {
                setDebugStatus("No token - Auth required");
            }
        }
        
        // Fetch user profile to get user_id
        const fetchUserProfile = async () => {
            try {
                console.log("Fetching user profile...");
                const response = await userApi.getProfile();
                console.log("User profile response:", response.data);
                const id = response.data.id;
                setUserId(id);
                userIdRef.current = id; // Store in ref for immediate access
                console.log("User ID set to:", id);
                setDebugStatus("User loaded");
            } catch (error) {
                console.error("Error fetching user profile:", error);
                setDebugStatus("User fetch failed");
            }
        };
        
        fetchUserProfile();
    }, []);
    
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

    const isProcessingRef = useRef(false);
    const loopActiveRef = useRef(false);
    const lastRequestTimeRef = useRef(0);
    const MIN_REQUEST_INTERVAL = 150; // Minimum 150ms between requests (~6-7 FPS for faster detection)

    const captureFrame = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (video.videoWidth === 0 || video.videoHeight === 0) return null;

            // Resize to max 480px width for faster processing (reduced from 640px)
            const MAX_WIDTH = 480;
            let width = video.videoWidth;
            let height = video.videoHeight;

            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);

            return new Promise(resolve => {
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/jpeg', 0.7); // Slightly lower quality for faster upload
            });
        }
        return null;
    };

    const calculatePosition = (bbox) => {
        if (!videoRef.current || !bbox) return null;

        const video = videoRef.current;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // Match the MAX_WIDTH used in captureFrame (now 480)
        const MAX_WIDTH = 480;
        let sentWidth = videoWidth;
        let sentHeight = videoHeight;
        if (videoWidth > MAX_WIDTH) {
            sentHeight = Math.round((videoHeight * MAX_WIDTH) / videoWidth);
            sentWidth = MAX_WIDTH;
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Calculate scale to maintain aspect ratio (object-cover)
        const scale = Math.max(screenWidth / videoWidth, screenHeight / videoHeight);
        
        // bbox is [x1, y1, x2, y2] based on sentWidth/sentHeight
        const [x1, y1, x2, y2] = bbox;

        // Normalize to 0..1
        const nX1 = x1 / sentWidth;
        const nY1 = y1 / sentHeight;
        const nX2 = x2 / sentWidth;
        const nY2 = y2 / sentHeight;

        // Map to video element scale (which matches screen via object-cover)
        // 1. Video frame scaling to screen
        const scaledWidth = videoWidth * scale; // Width of video on screen
        const scaledHeight = videoHeight * scale; // Height of video on screen
        const xOffset = (screenWidth - scaledWidth) / 2;
        const yOffset = (screenHeight - scaledHeight) / 2;

        // 2. Map normalized coords to scaled video dimensions
        const screenX = nX1 * scaledWidth + xOffset;
        const screenY = nY1 * scaledHeight + yOffset;
        const screenW = (nX2 - nX1) * scaledWidth;
        const screenH = (nY2 - nY1) * scaledHeight;

        return {
            left: screenX,
            top: screenY,
            width: screenW,
            height: screenH
        };
    };

    // --- Audio / ASR Logic ---
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const audioInputRef = useRef(null);
    const wsRef = useRef(null);
    const isRecordingRef = useRef(false);

    const startRecording = async (profileId) => {
        if (isRecordingRef.current) {
            console.log("ASR already recording, skipping...");
            return;
        }
        
        const currentUserId = userIdRef.current; // Use ref
        if (!currentUserId) {
            console.error("Cannot start ASR: userId is null");
            setDebugStatus("No User ID");
            return;
        }
        
        try {
            console.log("=== Starting ASR ===");
            console.log("Profile ID:", profileId);
            console.log("User ID:", currentUserId);
            isRecordingRef.current = true;
            
            // Connect WebSocket with user_id
            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
            const token = localStorage.getItem('token');
            
            if (!token) {
                console.error("No authentication token found");
                setDebugStatus("No Auth Token");
                isRecordingRef.current = false;
                return;
            }
            
            const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + `/asr/${currentUserId}/${encodeURIComponent(profileId)}?token=${encodeURIComponent(token)}`;
            console.log("Connecting to ASR WebSocket:", wsUrl.replace(token, '[TOKEN]'));
            
            wsRef.current = new WebSocket(wsUrl);
            
            wsRef.current.onopen = () => {
                console.log("✓ ASR WebSocket connected successfully");
                setDebugStatus(`ASR: ${profileId}`);
            };
            
            let subtitleTimeout = null;
            
            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("WebSocket message received:", data);
                    
                    if (data.type === 'subtitle') {
                        console.log("Subtitle:", data.text);
                        
                        // Clear any existing timeout
                        if (subtitleTimeout) {
                            clearTimeout(subtitleTimeout);
                        }
                        
                        if (data.text && data.text.trim()) {
                            setSubtitle(data.text);
                            // Keep subtitle visible for 3 seconds after last update
                            subtitleTimeout = setTimeout(() => {
                                setSubtitle("");
                            }, 3000);
                        } else {
                            // Empty subtitle clears immediately
                            setSubtitle("");
                        }
                    } else if (data.type === 'error') {
                        console.error("Server error:", data.message);
                        setDebugStatus(`Error: ${data.message}`);
                    } else if (data.type === 'connected') {
                        console.log("Connection confirmed:", data.message);
                    }
                } catch (e) {
                    console.error("WebSocket parse error:", e, "Raw data:", event.data);
                }
            };
            
            wsRef.current.onerror = (e) => {
                console.error("ASR WebSocket error:", e);
                setDebugStatus("ASR WS Error");
            };
            
            wsRef.current.onclose = (e) => {
                console.log("ASR WebSocket closed:", e.code, e.reason);
                if (e.code === 1008) {
                    setDebugStatus("ASR Auth Fail");
                } else if (e.code !== 1000) {
                    setDebugStatus(`ASR Closed: ${e.code}`);
                } else {
                    setDebugStatus("ASR Disconnected");
                }
                isRecordingRef.current = false;
            };

            // Start Audio
            try {
                console.log("Requesting microphone access...");
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        sampleRate: 16000
                    }
                });
                
                console.log("Microphone access granted");
                
                // Initialize Audio Context with 16kHz sample rate
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
                
                console.log(`AudioContext created with sample rate: ${audioContextRef.current.sampleRate}`);
                
                // Handle Suspended State (Autoplay Policy)
                if (audioContextRef.current.state === 'suspended') {
                    console.warn("AudioContext suspended! Attempting resume...");
                    setDebugStatus("CLICK TO ENABLE AUDIO");
                    
                    // Try immediate resume
                    try {
                        await audioContextRef.current.resume();
                        console.log("AudioContext resumed successfully");
                    } catch (e) {
                        console.error("Failed to resume AudioContext:", e);
                    }
                }
                
                audioInputRef.current = audioContextRef.current.createMediaStreamSource(stream);
                
                // Use 4096 buffer size for ~0.25s chunks at 16kHz
                processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                
                processorRef.current.onaudioprocess = (e) => {
                    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                        return;
                    }
                    
                    const inputData = e.inputBuffer.getChannelData(0);
                    
                    // Convert Float32Array to ArrayBuffer for WebSocket transmission
                    // The backend expects raw float32 bytes
                    const buffer = new ArrayBuffer(inputData.length * 4);
                    const view = new Float32Array(buffer);
                    view.set(inputData);
                    
                    try {
                        wsRef.current.send(buffer);
                    } catch (sendErr) {
                        console.error("Error sending audio data:", sendErr);
                    }
                };
                
                audioInputRef.current.connect(processorRef.current);
                processorRef.current.connect(audioContextRef.current.destination);
                
                console.log("Audio pipeline connected successfully");
                setDebugStatus(`REC: ${profileId}`);

            } catch (err) {
                console.error("Audio Init Error:", err);
                setDebugStatus(`Mic Error: ${err.message}`);
                isRecordingRef.current = false;
                if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                }
            }
        } catch (outerErr) {
            console.error("=== CRITICAL ERROR in startRecording ===");
            console.error("Error:", outerErr);
            console.error("Stack:", outerErr.stack);
            setDebugStatus(`ASR Error: ${outerErr.message}`);
            isRecordingRef.current = false;
        }
    };

    const stopRecording = () => {
        if (!isRecordingRef.current) return;
        
        console.log("Stopping ASR...");
        isRecordingRef.current = false;
        
        // Keep subtitle visible for 2 seconds after stopping
        setTimeout(() => setSubtitle(""), 2000);
        
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        
        if (audioInputRef.current) {
            audioInputRef.current.disconnect(); 
            audioInputRef.current = null;
        }
        
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    // --- End Audio Logic ---

    useEffect(() => {
        return () => {
             stopRecording(); // Cleanup on unmount
        }
    }, []);

    // ... existing refs and logic ...

    const processFrame = async () => {
        if (!loopActiveRef.current) return;
        
        // Throttle requests to prevent overwhelming the server
        const now = Date.now();
        if (now - lastRequestTimeRef.current < MIN_REQUEST_INTERVAL) {
            requestAnimationFrame(processFrame);
            return;
        }
        
        if (isProcessingRef.current) {
            requestAnimationFrame(processFrame);
            return;
        }

        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || videoRef.current.readyState < 2) {
             requestAnimationFrame(processFrame); // Use RAF instead of setTimeout for smoother loop
             return;
        }

        isProcessingRef.current = true;
        lastRequestTimeRef.current = now;
        
        try {
            const blob = await captureFrame();
            if (!blob) {
                isProcessingRef.current = false;
                setTimeout(processFrame, 100);
                return;
            }

            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');

            const response = await faceApi.recognize(formData);
            const data = response.data;

            console.log("Face recognition response:", data);

            const results = Array.isArray(data) ? data : [data];
            const validResults = results.filter(r => r);

            console.log("Valid results:", validResults);

            const processedResults = validResults.map((result) => {
                if (result.bbox) {
                    return { ...result, position: calculatePosition(result.bbox) };
                }
                return result;
            });

            console.log("Processed results:", processedResults);

            if (processedResults.length > 0) {
                setRecognitionResult(processedResults);
                lastResultRef.current = processedResults;
                
                // Update debug status with face info
                const faceNames = processedResults.map(r => r.name).join(", ");
                setDebugStatus(`Detected: ${faceNames}`);
                
                // --- ASR Trigger ---
                // If we detect a face, start recording if not already
                // Use the name of the first person detected as ID
                const name = processedResults[0]?.name || "Unknown";
                const currentUserId = userIdRef.current; // Use ref to get current value
                
                if (!isRecordingRef.current && currentUserId) {
                    console.log(`Face detected: ${name}, starting ASR...`);
                    startRecording(name);
                } else if (!currentUserId) {
                    console.warn("Cannot start ASR: userId not available yet");
                }
                // -------------------

                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            } else {
                setRecognitionResult([]);
                 if (lastResultRef.current && !timeoutRef.current) {
                    // Increased timeout to 2 seconds to reduce flicker
                    timeoutRef.current = setTimeout(() => {
                        lastResultRef.current = null;
                        timeoutRef.current = null;
                        setDebugStatus("No Faces");
                        
                        // --- ASR Stop ---
                        stopRecording();
                        // ----------------
                        
                    }, 2000);
                    setDebugStatus("Persisting...");
                } else if (!lastResultRef || !lastResultRef.current) {
                     setDebugStatus("Scanning...");
                }
            }
        } catch (err) {
            console.error('Face recognition error:', err);
            
            // Handle authentication errors
            if (err.response?.status === 401) {
                setDebugStatus('Auth Error - Check token');
                loopActiveRef.current = false; // Stop the loop on auth failure
                return;
            }
            
            setDebugStatus(`Err: ${err.message}`);
            
            // Shorter backoff on errors (500ms instead of 1000ms)
            await new Promise(resolve => setTimeout(resolve, 500));
        } finally {
            isProcessingRef.current = false;
            if (loopActiveRef.current) {
                requestAnimationFrame(processFrame);
            }
        }
    };

    const startRecognitionLoop = () => {
        if (loopActiveRef.current) return;
        loopActiveRef.current = true;
        setDebugStatus("Loop Started (Flow Control)");
        processFrame(); 
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
            <HUDOverlay mode={mode} recognitionResult={recognitionResult} debugStatus={debugStatus} subtitle={subtitle} />

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
