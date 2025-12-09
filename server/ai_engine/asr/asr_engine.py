import numpy as np
import os
from typing import Union
from collections import deque
import time
from faster_whisper import WhisperModel

class ASREngine:
    def __init__(self, model_size: str = "base.en"):
        # Faster Whisper handles device selection automatically relative to availability
        # On Mac, it uses CTranslate2 which is optimized for CPU/Arm
        device = "cpu" 
        compute_type = "int8" # Quantization for speed
        
        print(f"Loading Faster Whisper model '{model_size}' on {device} with {compute_type}...")
        try:
             self.model = WhisperModel(model_size, device=device, compute_type=compute_type)
             print("✓ Faster Whisper model loaded successfully.")
        except Exception as e:
             print(f"Error loading Faster Whisper: {e}")
             print("Falling back to tiny.en...")
             self.model = WhisperModel("tiny.en", device=device, compute_type=compute_type)

        # Cache for smoother transcription
        self.last_transcript = ""
        self.last_transcript_time = 0
        self.transcript_cache = deque(maxlen=3)
        
    def transcribe_audio_chunk(self, audio_data: Union[np.ndarray, str]) -> str:
        """
        Transcribe audio chunk using Faster Whisper.
        Args:
            audio_data: Numpy array (float32) or file path
        """
        try:
            if not isinstance(audio_data, str):
                if len(audio_data) == 0: return ""
                if audio_data.dtype != np.float32:
                    audio_data = audio_data.astype(np.float32)
                
                # Normalize
                max_val = np.abs(audio_data).max()
                if max_val > 0:
                    audio_data = audio_data / max_val * 0.95

            # Transcribe with greedy decoding (beam_size=1) for maximum speed
            segments, info = self.model.transcribe(
                audio_data, 
                beam_size=1,
                language="en",
                condition_on_previous_text=False, # Disable for short chunks to prevent hallucinations
                vad_filter=True, # Enable VAD to skip silence
                vad_parameters=dict(min_silence_duration_ms=500)
            )
            
            # Combine segments
            text = " ".join([segment.text for segment in segments]).strip()
            
            if text:
                self.transcript_cache.append(text)
                self.last_transcript = text
                self.last_transcript_time = time.time()
                
            return text

        except Exception as e:
            print(f"Transcription error: {e}")
            return ""
