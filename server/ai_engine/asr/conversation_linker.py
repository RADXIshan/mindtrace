from .conversation_store import ConversationStore
import numpy as np

class ConversationLinker:
    def __init__(self, store: ConversationStore):
        self.store = store

    def link_and_save(self, profile_id: str, transcript: str):
        """
        Link a transcript to a profile and save it.
        
        Args:
            profile_id: The ID of the recognized face/profile.
            transcript: The transcribed text.
        """
        if not transcript or not transcript.strip():
            return None

        print(f"Linking conversation to profile {profile_id}: '{transcript}'")
        return self.store.save_conversation(profile_id, transcript)
