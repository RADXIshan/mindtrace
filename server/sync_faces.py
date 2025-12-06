"""
Utility script to sync face embeddings from database contacts
Run this after adding contacts with photos to update the face recognition database
"""
import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

from ai_engine.face_engine import load_models, sync_embeddings_from_db
from app.database import SessionLocal

def main():
    print("Loading face recognition models...")
    face_app = load_models()
    
    print("Connecting to the database...")
    db = SessionLocal()
    
    try:
        print("Syncing face embeddings from database contacts...")
        result = sync_embeddings_from_db(face_app, db)
        
        if result.get("success"):
            print(f"\n✓ Successfully synced {result['count']} face embeddings!")
        else:
            print(f"\n✗ Error: {result.get('error')}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
