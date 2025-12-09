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
    const MIN_REQUEST_INTERVAL = 8; // ~120 FPS for absolute maximum throughput
    const faceTrackingCache = useRef(new Map()); // Cache for smoother face tracking
    const velocityCache = useRef(new Map()); // Track velocity for predictive smoothing
    const frameInterpolationRef = useRef(null); // For frame interpolation between API calls
    const requestAnimationFrameId = useRef(null); // Track RAF for cleanup

    const captureFrame = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });

            if (video.videoWidth === 0 || video.videoHeight === 0) return null;

            // Use 224px for extreme speed - aggressive optimization
            const MAX_DIM = 224;
            let width = video.videoWidth;
            let height = video.videoHeight;

            // Scale to fit within 224x224 while maintaining aspect ratio
            const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);

            canvas.width = width;
            canvas.height = height;
            
            // Disable smoothing for faster processing
            context.imageSmoothingEnabled = false;
            
            context.drawImage(video, 0, 0, width, height);

            return new Promise(resolve => {
                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/jpeg', 0.5); // Aggressive compression for extreme speed
            });
        }
        return null;
    };

    const calculatePosition = (bbox) => {
        if (!videoRef.current || !bbox) return null;

        const video = videoRef.current;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // Match the MAX_DIM used in captureFrame (now 224)
        const MAX_DIM = 224;
        const scale = Math.min(MAX_DIM / videoWidth, MAX_DIM / videoHeight);
        let sentWidth = Math.round(videoWidth * scale);
        let sentHeight = Math.round(videoHeight * scale);

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Calculate scale to maintain aspect ratio (object-cover)
        const displayScale = Math.max(screenWidth / videoWidth, screenHeight / videoHeight);
        
        // bbox is [x1, y1, x2, y2] based on sentWidth/sentHeight
        const [x1, y1, x2, y2] = bbox;

        // Normalize to 0..1
        const nX1 = x1 / sentWidth;
        const nY1 = y1 / sentHeight;
        const nX2 = x2 / sentWidth;
        const nY2 = y2 / sentHeight;

        // Map to video element scale (which matches screen via object-cover)
        // 1. Video frame scaling to screen
        const scaledWidth = videoWidth * displayScale; // Width of video on screen
        const scaledHeight = videoHeight * displayScale; // Height of video on screen
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
                    
                    if (data.type === 'ping') {
                        // Respond to server ping to keep connection alive
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            wsRef.current.send(JSON.stringify({ type: 'pong' }));
                        }
                        return;
                    }
                    
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

    const faceWsRef = useRef(null);
    const isWaitingForResponseRef = useRef(false);

    // Initial connection to Face Recognition WebSocket
    const connectFaceWebSocket = () => {
        const currentUserId = userIdRef.current;
        if (!currentUserId || faceWsRef.current) return;

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const token = localStorage.getItem('token');
        
        if (!token) return;

        const wsUrl = apiBaseUrl.replace(/^http/, 'ws') + `/face/ws/recognize/${currentUserId}?token=${encodeURIComponent(token)}`;
        console.log("Connecting to Face WebSocket:", wsUrl);

        const ws = new WebSocket(wsUrl);
        faceWsRef.current = ws;

        ws.onopen = () => {
            console.log("✓ Face WebSocket connected");
            setDebugStatus("Face WS Connected");
            processFrame(); // Start the loop
        };

        ws.onmessage = (event) => {
            isWaitingForResponseRef.current = false;
            try {
                const data = JSON.parse(event.data);
                handleRecognitionResult(data);
                
                // Immediately trigger next frame after receiving response for lowest latency
                // Use requestAnimationFrame to sync with display refresh
                 requestAnimationFrame(processFrame);
            } catch (e) {
                console.error("Face WS parse error:", e);
                // Continue loop even on error
                requestAnimationFrame(processFrame);
            }
        };

        ws.onclose = () => {
            console.log("Face WebSocket closed");
            faceWsRef.current = null;
            // Try to reconnect after a short delay if loop is still active
            if (loopActiveRef.current) {
                setTimeout(connectFaceWebSocket, 1000);
            }
        };

        ws.onerror = (err) => {
            console.error("Face WS Error:", err);
            isWaitingForResponseRef.current = false;
        };
    };

    const tracksRef = useRef([]); // [{ id, x, y, w, h, lastSeen, data }]
    const nextTrackIdRef = useRef(1);

    const updateTracks = (newDetections) => {
        const timestamp = Date.now();
        const assignments = new Array(newDetections.length).fill(-1);
        const usedTracks = new Set();
        
        // Calculate centers for new detections
        const newCenters = newDetections.map(d => {
             if (!d.position) return null;
             return {
                 x: d.position.left + d.position.width / 2,
                 y: d.position.top + d.position.height / 2
             };
        });

        // 1. Greedy matching: Find closest track for each detection
        // Limit matching distance to avoid jumping across screen (e.g., 20% of screen width)
        const MAX_MATCH_DIST = window.innerWidth * 0.25;

        // Sort detections by size (largest first) to prioritize main subjects
        const sortedIndices = newDetections.map((_, i) => i)
            .sort((a, b) => (newDetections[b].position.width * newDetections[b].position.height) - 
                            (newDetections[a].position.width * newDetections[a].position.height));

        for (const idx of sortedIndices) {
            const center = newCenters[idx];
            if (!center) continue;
            
            let bestTrackIndex = -1;
            let minDist = MAX_MATCH_DIST;

            tracksRef.current.forEach((track, tIdx) => {
                if (usedTracks.has(tIdx)) return;
                
                // Prediction: Estimate where track would be based on velocity? 
                // For simplicity, just use last known position as we have high FPS
                const trackCenter = { 
                     x: track.x + track.w / 2, 
                     y: track.y + track.h / 2 
                };

                const dist = Math.hypot(center.x - trackCenter.x, center.y - trackCenter.y);
                
                if (dist < minDist) {
                    minDist = dist;
                    bestTrackIndex = tIdx;
                }
            });

            if (bestTrackIndex !== -1) {
                assignments[idx] = bestTrackIndex;
                usedTracks.add(bestTrackIndex);
            }
        }

        // 2. Update/Create Tracks
        const currentTracks = tracksRef.current;
        const updatedTracks = [];

        newDetections.forEach((detection, idx) => {
             const trackIdx = assignments[idx];
             
             if (trackIdx !== -1) {
                 // Update existing track
                 const track = currentTracks[trackIdx];
                 updatedTracks.push({
                     ...track,
                     x: detection.position.left,
                     y: detection.position.top,
                     w: detection.position.width,
                     h: detection.position.height,
                     lastSeen: timestamp,
                     data: detection // Update recognition data (name could change if recognition improves)
                 });
             } else {
                 // Create new track
                 updatedTracks.push({
                     id: nextTrackIdRef.current++,
                     x: detection.position.left,
                     y: detection.position.top,
                     w: detection.position.width,
                     h: detection.position.height,
                     lastSeen: timestamp,
                     data: detection
                 });
             }
        });

        // 3. Keep lost tracks for a short time (ghosting) to prevent flickering on one missing frame
        // But only if they haven't been stale for > 500ms
        currentTracks.forEach((track, tIdx) => {
             if (!usedTracks.has(tIdx)) {
                 if (timestamp - track.lastSeen < 500) {
                     updatedTracks.push(track);
                 }
             }
        });

        tracksRef.current = updatedTracks;
        
        // Return format expected by UI, injected with stable trackId
        return updatedTracks.map(track => ({
            ...track.data,
            trackId: track.id, // STABLE ID
            position: {
                left: track.x,
                top: track.y,
                width: track.w,
                height: track.h
            }
        }));
    };

    const handleRecognitionResult = (data) => {
        const results = Array.isArray(data) ? data : [data];
        const validResults = results.filter(r => r);

        // 1. First, calculate raw screen positions for the new frame
        const processedResults = validResults.map((result) => {
            if (result.bbox) {
                return { ...result, position: calculatePosition(result.bbox) };
            }
            return result;
        }).filter(r => r.position); // Must have valid position

        // 2. Run Tracker to assign stable IDs and handle temporary loss
        const trackedResults = updateTracks(processedResults);

        if (trackedResults.length > 0) {
            // 3. Apply Smoothing using Stable Track IDs
            const smoothedResults = trackedResults.map(result => {
                // KEY CHANGE: Use trackId for caching instead of name
                const cacheKey = `track_${result.trackId}`;
                
                const cached = faceTrackingCache.current.get(cacheKey);
                const velocity = velocityCache.current.get(cacheKey);
                
                if (cached && result.position) {
                    // Calculate velocity
                    const newVelocity = {
                        left: result.position.left - cached.left,
                        top: result.position.top - cached.top,
                        width: result.position.width - cached.width,
                        height: result.position.height - cached.height
                    };
                    
                    const velocitySmooth = 0.6; // Smoother for multiple faces
                    const smoothedVelocity = velocity ? {
                        left: velocity.left * (1 - velocitySmooth) + newVelocity.left * velocitySmooth,
                        top: velocity.top * (1 - velocitySmooth) + newVelocity.top * velocitySmooth,
                        width: velocity.width * (1 - velocitySmooth) + newVelocity.width * velocitySmooth,
                        height: velocity.height * (1 - velocitySmooth) + newVelocity.height * velocitySmooth
                    } : newVelocity;
                    
                    velocityCache.current.set(cacheKey, smoothedVelocity);
                    
                    // Prediction factor
                    const smoothFactor = 0.6; // Increase smoothing for stability
                    const predictFactor = 0.2; 
                    
                    result.position = {
                        left: cached.left * (1 - smoothFactor) + result.position.left * smoothFactor + smoothedVelocity.left * predictFactor,
                        top: cached.top * (1 - smoothFactor) + result.position.top * smoothFactor + smoothedVelocity.top * predictFactor,
                        width: cached.width * (1 - smoothFactor) + result.position.width * smoothFactor + smoothedVelocity.width * predictFactor,
                        height: cached.height * (1 - smoothFactor) + result.position.height * smoothFactor + smoothedVelocity.height * predictFactor
                    };
                }
                
                if (result.position) {
                    faceTrackingCache.current.set(cacheKey, result.position);
                }
                
                return result;
            });
            
            setRecognitionResult(smoothedResults);
            lastResultRef.current = smoothedResults;
            
            // Debug info
            const faceCount = smoothedResults.length;
            if (faceCount > 0) {
                 const faceNames = smoothedResults.slice(0, 3).map(r => r.name).join(", ");
                 const moreText = faceCount > 3 ? ` +${faceCount - 3}` : '';
                 setDebugStatus(`${faceCount} Faces: ${faceNames}${moreText}`);
            }

            // ASR Trigger
            const identifiedPerson = smoothedResults.find(r => r.name !== "Unknown");
            const name = identifiedPerson?.name || smoothedResults[0]?.name || "Unknown";
            const currentUserId = userIdRef.current;
            
            if (!isRecordingRef.current && currentUserId && name !== "Unknown") {
                startRecording(name);
            }

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        } else {
            setRecognitionResult([]);
             if (lastResultRef.current && !timeoutRef.current) {
                timeoutRef.current = setTimeout(() => {
                    lastResultRef.current = null;
                    timeoutRef.current = null;
                    faceTrackingCache.current.clear();
                    velocityCache.current.clear();
                    setDebugStatus("No Faces");
                    stopRecording();
                }, 2000);
            } else if (!lastResultRef.current) {
                 // Scan indicator handled by blinking led in UI usually
            }
        }
    };

    const processFrame = async () => {
        if (!loopActiveRef.current) return;
        
        // If WebSocket is not open, wait/reconnect
        if (!faceWsRef.current || faceWsRef.current.readyState !== WebSocket.OPEN) {
            // If completely missing, try connect
            if (!faceWsRef.current) {
                connectFaceWebSocket();
            }
            setTimeout(() => requestAnimationFrame(processFrame), 500); 
            return;
        }

        // Flow Control: If we are still waiting for a response, skip this frame
        // This ensures we don't flood the server and build up latency
        if (isWaitingForResponseRef.current) {
             // Optional: Add a timeout to force reset if stuck?
             // For now, just skip.
             // But valid to check if it's STUCK (e.g. > 2 sec)
             return;
        }
        
        // Rate limit locally if needed, but with WS ping-pong it's self-regulating.
        // We can just rely on the server response triggering the next frame.

        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || videoRef.current.readyState < 2) {
             setTimeout(() => requestAnimationFrame(processFrame), 100);
             return;
        }

        try {
            const blob = await captureFrame();
            if (!blob) {
                setTimeout(() => requestAnimationFrame(processFrame), 100);
                return;
            }

            // Send via WebSocket
            faceWsRef.current.send(blob);
            isWaitingForResponseRef.current = true;
            // Next frame trigger is in onmessage

        } catch (err) {
            console.error('Frame processing error:', err);
            isWaitingForResponseRef.current = false;
            setTimeout(() => requestAnimationFrame(processFrame), 100);
        }
    };

    // Frame interpolation for ultra-smooth rendering between API calls
    const interpolateFrames = () => {
        if (!recognitionResult || !Array.isArray(recognitionResult) || recognitionResult.length === 0) {
            return;
        }

        const interpolatedResults = recognitionResult.map(result => {
            const cacheKey = `track_${result.trackId}`;
            const velocity = velocityCache.current.get(cacheKey);
            
            if (velocity && result.position) {
                const interpolationFactor = 0.15;
                return {
                    ...result,
                    position: {
                        left: result.position.left + velocity.left * interpolationFactor,
                        top: result.position.top + velocity.top * interpolationFactor,
                        width: result.position.width + velocity.width * interpolationFactor,
                        height: result.position.height + velocity.height * interpolationFactor
                    }
                };
            }
            return result;
        });

        setRecognitionResult(interpolatedResults);
    };

    const startRecognitionLoop = () => {
        if (loopActiveRef.current) return;
        loopActiveRef.current = true;
        setDebugStatus("Initialising WS...");
        
        // Connect WS - which triggers processFrame loop on open
        if (userIdRef.current) {
            connectFaceWebSocket();
        } else {
             // Wait for user ID
             const checkUser = setInterval(() => {
                 if (userIdRef.current) {
                     clearInterval(checkUser);
                     connectFaceWebSocket();
                 }
             }, 100);
        }
        
        // Start frame interpolation at 120 FPS
        frameInterpolationRef.current = setInterval(interpolateFrames, 8); 
    };

    useEffect(() => {
        startCamera();
        startRecognitionLoop();
        return () => {
            loopActiveRef.current = false;
            // Close WS
            if (faceWsRef.current) {
                faceWsRef.current.close();
                faceWsRef.current = null;
            }
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (frameInterpolationRef.current) clearInterval(frameInterpolationRef.current);
            if (requestAnimationFrameId.current) cancelAnimationFrame(requestAnimationFrameId.current);
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
