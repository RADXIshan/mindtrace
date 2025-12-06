import whisper
import numpy as np
import torch
import os
from typing import Union
from collections import deque
import time

class ASREngine:
    def __init__(self, model_size: str = "base"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper model '{model_size}' on {self.device}...")
        self.model = whisper.load_model(model_size, device=self.device)
        print("Whisper model loaded.")
        
        # Cache for smoother transcription
        self.last_transcript = ""
        self.last_transcript_time = 0
        self.transcript_cache = deque(maxlen=3)  # Keep last 3 transcripts for smoothing
        
    def transcribe_audio_chunk(self, audio_data: Union[np.ndarray, str]) -> str:
        """
        Transcribe a chunk of audio data with improved smoothing and caching.
        
        Args:
            audio_data: Numpy array of audio samples (16kHz, mono, float32 normalized to -1.0 to 1.0) OR path to audio file
        
        Returns:
            Transcribed text.
        """
        if not isinstance(audio_data, str):
            if len(audio_data) == 0:
                return ""

            # Whisper expects float32 audio
            if audio_data.dtype != np.float32:
                audio_data = audio_data.astype(np.float32)
            
            # Normalize audio to prevent clipping
            max_val = np.abs(audio_data).max()
            if max_val > 0:
                audio_data = audio_data / max_val * 0.95

        try:
            # Use the high-level transcribe method which is more robust
            # fp16=True for CUDA (faster), False for CPU (required)
            use_fp16 = self.device == "cuda"
            
            # Optimized parameters for faster, smoother transcription
            result = self.model.transcribe(
                audio_data, 
                fp16=use_fp16, 
                language="en",
                beam_size=3,  # Reduced from default 5 for speed
                best_of=3,    # Reduced from default 5 for speed
                temperature=0.0,  # Deterministic output for consistency
                compression_ratio_threshold=2.4,
                logprob_threshold=-1.0,
                no_speech_threshold=0.5,  # More aggressive silence detection
                condition_on_previous_text=True  # Better context awareness
            )
            
            transcript = result["text"].strip()
            
            # Cache management for smoother output
            current_time = time.time()
            if transcript:
                self.transcript_cache.append(transcript)
                self.last_transcript = transcript
                self.last_transcript_time = current_time
            
            return transcript
            
        except Exception as e:
            print(f"Transcription error: {e}")
            return ""
