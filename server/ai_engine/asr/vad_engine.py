import webrtcvad
import collections
import sys

class VADEngine:
    def __init__(self, aggressiveness: int = 2, sample_rate: int = 16000, frame_duration_ms: int = 30):
        """
        Initialize VAD Engine.
        
        Args:
            aggressiveness: 0-3. 0 is least aggressive about filtering out non-speech, 3 is most aggressive.
            sample_rate: Audio sample rate (must be 8000, 16000, 32000, or 48000).
            frame_duration_ms: Frame duration in ms (must be 10, 20, or 30).
        """
        self.vad = webrtcvad.Vad(aggressiveness)
        self.sample_rate = sample_rate
        self.frame_duration_ms = frame_duration_ms
        self.frame_size_bytes = int(sample_rate * (frame_duration_ms / 1000.0) * 2) # 2 bytes per sample (16-bit)

    def is_speech(self, frame_bytes: bytes) -> bool:
        """
        Check if a frame contains speech.
        
        Args:
            frame_bytes: Raw audio bytes for a single frame.
            
        Returns:
            True if speech is detected, False otherwise.
        """
        if len(frame_bytes) != self.frame_size_bytes:
            # If frame size is incorrect (e.g. end of stream), assume no speech to be safe
            return False
            
        try:
            return self.vad.is_speech(frame_bytes, self.sample_rate)
        except Exception as e:
            print(f"VAD Error: {e}", file=sys.stderr)
            return False

class Frame(object):
    """Represents a "frame" of audio data."""
    def __init__(self, bytes, timestamp, duration):
        self.bytes = bytes
        self.timestamp = timestamp
        self.duration = duration
