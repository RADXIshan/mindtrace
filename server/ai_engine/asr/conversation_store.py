import json
import os
from datetime import datetime
from typing import List, Dict, Optional

class ConversationStore:
    def __init__(self, storage_path: str = "data/conversations.json"):
        self.storage_path = storage_path
        self._ensure_storage()

    def _ensure_storage(self):
        """Ensure the storage file and directory exist."""
        directory = os.path.dirname(self.storage_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
        
        if not os.path.exists(self.storage_path):
            with open(self.storage_path, 'w') as f:
                json.dump([], f)

    def save_conversation(self, profile_id: str, transcript: str) -> Dict:
        """Save a conversation entry."""
        entry = {
            "profile_id": profile_id,
            "timestamp": datetime.now().isoformat(),
            "transcript": transcript
        }
        
        conversations = self._load_conversations()
        conversations.append(entry)
        
        with open(self.storage_path, 'w') as f:
            json.dump(conversations, f, indent=2)
            
        return entry

    def get_conversations(self, profile_id: Optional[str] = None) -> List[Dict]:
        """Retrieve conversations, optionally filtered by profile_id."""
        conversations = self._load_conversations()
        
        if profile_id:
            return [c for c in conversations if c["profile_id"] == profile_id]
        
        return conversations

    def _load_conversations(self) -> List[Dict]:
        """Load all conversations from storage."""
        try:
            with open(self.storage_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
