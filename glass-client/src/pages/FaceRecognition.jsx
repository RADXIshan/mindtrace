import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Camera, Upload, UserPlus, ScanFace, CheckCircle, AlertCircle } from 'lucide-react';

const FaceRecognition = () => {
    const [activeTab, setActiveTab] = useState('register'); // 'register' or 'recognize'

    // Registration State
    const [name, setName] = useState('');
    const [relation, setRelation] = useState('');
    const [file, setFile] = useState(null);
    const [regStatus, setRegStatus] = useState({ type: '', message: '' });
    const [isRegistering, setIsRegistering] = useState(false);

    // Recognition State
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [recognitionResult, setRecognitionResult] = useState(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
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
            setRegStatus({ type: 'error', message: 'Could not access camera. Please allow permissions.' });
        }
    };

    // Stop Camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        if (activeTab === 'recognize') {
            startCamera();
            startRecognitionLoop();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [activeTab]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!name || !relation || !file) {
            setRegStatus({ type: 'error', message: 'Please fill all fields and select an image.' });
            return;
        }

        setIsRegistering(true);
        setRegStatus({ type: '', message: '' });

        const formData = new FormData();
        formData.append('name', name);
        formData.append('relation', relation);
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/api/face/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setRegStatus({ type: 'success', message: `Successfully registered ${response.data.name}!` });
            setName('');
            setRelation('');
            setFile(null);
        } catch (err) {
            console.error(err);
            setRegStatus({ type: 'error', message: err.response?.data?.detail || 'Registration failed.' });
        } finally {
            setIsRegistering(false);
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

    const startRecognitionLoop = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            const blob = await captureFrame();
            if (!blob) return;

            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');

            try {
                const response = await axios.post('http://localhost:8000/api/face/recognize', formData);
                setRecognitionResult(response.data);
            } catch (err) {
                console.error("Recognition error", err);
            }
        }, 1000); // Check every 1 second
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
                    <ScanFace className="w-8 h-8 text-blue-400" />
                    Face Recognition System
                </h1>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-gray-700 pb-1">
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`px-4 py-2 flex items-center gap-2 transition-colors ${activeTab === 'register'
                                ? 'border-b-2 border-blue-500 text-blue-400'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <UserPlus className="w-5 h-5" />
                        Register New Face
                    </button>
                    <button
                        onClick={() => setActiveTab('recognize')}
                        className={`px-4 py-2 flex items-center gap-2 transition-colors ${activeTab === 'recognize'
                                ? 'border-b-2 border-green-500 text-green-400'
                                : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        <Camera className="w-5 h-5" />
                        Live Recognition
                    </button>
                </div>

                {/* Content */}
                <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">

                    {activeTab === 'register' && (
                        <div className="max-w-md mx-auto">
                            <h2 className="text-xl font-semibold mb-6">Add New Profile</h2>

                            <form onSubmit={handleRegister} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Relation</label>
                                    <input
                                        type="text"
                                        value={relation}
                                        onChange={(e) => setRelation(e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                                        placeholder="e.g. Friend, Self"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Photo</label>
                                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                        <p className="text-gray-400 text-sm">
                                            {file ? file.name : "Click or drag to upload photo"}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isRegistering}
                                    className={`w-full py-3 rounded-lg font-medium transition-colors ${isRegistering
                                            ? 'bg-blue-500/50 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-500'
                                        }`}
                                >
                                    {isRegistering ? 'Registering...' : 'Register Profile'}
                                </button>

                                {regStatus.message && (
                                    <div className={`p-4 rounded-lg flex items-center gap-3 ${regStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        }`}>
                                        {regStatus.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                        {regStatus.message}
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {activeTab === 'recognize' && (
                        <div className="flex flex-col items-center">
                            <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-gray-700">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-[640px] h-[480px] object-cover bg-black"
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Overlay Result */}
                                {recognitionResult && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-4 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-gray-400 text-xs uppercase tracking-wider">Detected</p>
                                                <p className="text-2xl font-bold text-white">{recognitionResult.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-400 text-xs uppercase tracking-wider">Relation</p>
                                                <p className="text-lg text-blue-400">{recognitionResult.relation}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-400 text-xs uppercase tracking-wider">Confidence</p>
                                                <div className={`text-lg font-mono ${recognitionResult.confidence > 0.6 ? 'text-green-400' : 'text-yellow-400'
                                                    }`}>
                                                    {(recognitionResult.confidence * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="mt-4 text-gray-500 text-sm">
                                Looking for faces... Ensure good lighting and face the camera.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default FaceRecognition;
