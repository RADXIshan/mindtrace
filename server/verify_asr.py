import time
import collections
import numpy as np
import sys
import os

# Add server directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_engine.asr import AudioStream, VADEngine, ASREngine, ConversationStore, ConversationLinker

def verify_asr():
    print("Initializing ASR System...")
    
    # Initialize components
    audio_stream = AudioStream()
    vad_engine = VADEngine()
    asr_engine = ASREngine(model_size="base") # Use 'base' for speed in verification
    store = ConversationStore()
    linker = ConversationLinker(store)
    
    print("\n--- ASR Verification ---")
    print("Please speak into the microphone. Press Ctrl+C to stop.")
    print("Listening...")
    
    audio_stream.start_stream()
    
    # Buffer for audio frames
    buffer = collections.deque()
    triggered = False
    
    try:
        while True:
            frame_data = audio_stream.get_frame()
            if frame_data is None:
                continue
                
            is_speech = vad_engine.is_speech(frame_data.tobytes())
            
            if is_speech:
                if not triggered:
                    print("\n[Speech Detected] Recording...", end="", flush=True)
                    triggered = True
                buffer.append(frame_data)
                sys.stdout.write(".")
                sys.stdout.flush()
            else:
                if triggered:
                    # Speech ended (simple logic: end immediately on silence for verification)
                    # In production, we'd want a "hangover" period of silence before cutting
                    print("\n[Silence Detected] Processing...")
                    triggered = False
                    
                    # Convert buffer to single numpy array
                    if len(buffer) > 0:
                        # Stack frames into a single array
                        # frame_data is int16, we need float32 for Whisper
                        audio_int16 = np.concatenate(list(buffer))
                        audio_float32 = audio_int16.astype(np.float32) / 32768.0
                        
                        # Transcribe
                        transcript = asr_engine.transcribe_audio_chunk(audio_float32)
                        print(f"Transcript: \"{transcript}\"")
                        
                        # Save (using a dummy profile ID)
                        if transcript:
                            linker.link_and_save("verification_user", transcript)
                            print("Saved to conversation store.")
                        
                        buffer.clear()
                    
    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        audio_stream.stop_stream()
        print("Done.")

if __name__ == "__main__":
    verify_asr()
