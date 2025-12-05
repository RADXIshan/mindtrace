import sounddevice as sd
import numpy as np
import queue
import sys

class AudioStream:
    def __init__(self, sample_rate: int = 16000, frame_duration_ms: int = 30):
        self.sample_rate = sample_rate
        self.frame_duration_ms = frame_duration_ms
        self.block_size = int(sample_rate * (frame_duration_ms / 1000.0))
        self.q = queue.Queue()
        self.stream = None

    def _callback(self, indata, frames, time, status):
        """This is called (from a separate thread) for each audio block."""
        if status:
            print(status, file=sys.stderr)
        # Copy the data to the queue
        self.q.put(indata.copy())

    def start_stream(self):
        """Start the audio stream."""
        # Channels=1 (mono), dtype='int16' for VAD compatibility
        self.stream = sd.InputStream(samplerate=self.sample_rate,
                                     blocksize=self.block_size,
                                     channels=1,
                                     dtype='int16',
                                     callback=self._callback)
        self.stream.start()
        print("Audio stream started.")

    def stop_stream(self):
        """Stop the audio stream."""
        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None
            print("Audio stream stopped.")

    def get_frame(self):
        """Get the next frame of audio from the queue."""
        try:
            return self.q.get(timeout=1.0) # Wait up to 1 second
        except queue.Empty:
            return None
