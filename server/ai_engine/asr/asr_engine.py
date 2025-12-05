import whisper
import numpy as np
import torch
import os

class ASREngine:
    def __init__(self, model_size: str = "base"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper model '{model_size}' on {self.device}...")
        self.model = whisper.load_model(model_size, device=self.device)
        print("Whisper model loaded.")

    def transcribe_audio_chunk(self, audio_data: np.ndarray) -> str:
        """
        Transcribe a chunk of audio data.
        
        Args:
            audio_data: Numpy array of audio samples (16kHz, mono, float32 normalized to -1.0 to 1.0)
        
        Returns:
            Transcribed text.
        """
        if len(audio_data) == 0:
            return ""

        # Whisper expects float32 audio
        if audio_data.dtype != np.float32:
            audio_data = audio_data.astype(np.float32)

        # Pad or trim to 30 seconds (Whisper's expected input length logic handles this internally mostly, 
        # but pad_or_trim is a helper)
        audio = whisper.pad_or_trim(audio_data)
        
        # Make log-Mel spectrogram and move to the same device as the model
        mel = whisper.log_mel_spectrogram(audio).to(self.model.device)

        # Decode the audio
        options = whisper.DecodingOptions(fp16=False) # fp16=False to be safe on CPU
        result = whisper.decode(self.model, mel, options)

        return result.text.strip()
