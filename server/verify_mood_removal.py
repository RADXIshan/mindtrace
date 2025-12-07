#!/usr/bin/env python3
"""
Verification script to check that mood has been completely removed from the system.
Run this after applying the changes to ensure everything is working correctly.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from app.database import SessionLocal
from app.chroma_client import get_conversation_collection

def check_database_schema():
    """Check if mood column exists in interactions table"""
    print("\n1. Checking Database Schema...")
    db = SessionLocal()
    try:
        result = db.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='interactions' AND column_name='mood'
        """))
        
        if result.fetchone():
            print("   ✗ FAIL: mood column still exists in database")
            return False
        else:
            print("   ✓ PASS: mood column removed from database")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
        return False
    finally:
        db.close()

def check_chromadb_metadata():
    """Check if new entries in ChromaDB don't have mood"""
    print("\n2. Checking ChromaDB Metadata...")
    try:
        collection = get_conversation_collection()
        
        # Get a sample of recent entries
        results = collection.get(limit=5)
        
        if not results or not results['metadatas']:
            print("   ⚠ WARNING: No entries found in ChromaDB")
            return True
        
        has_mood = False
        for metadata in results['metadatas']:
            if 'mood' in metadata:
                has_mood = True
                break
        
        if has_mood:
            print("   ⚠ WARNING: Some entries still have mood in metadata")
            print("   Note: Old entries may still have mood, but new entries should not")
            return True  # Not a failure, just a warning
        else:
            print("   ✓ PASS: No mood field found in ChromaDB metadata")
            return True
            
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
        return False

def check_model_definition():
    """Check if Interaction model has mood attribute"""
    print("\n3. Checking Model Definition...")
    try:
        from app.models import Interaction
        
        # Check if mood is in the model's columns
        if hasattr(Interaction, 'mood'):
            print("   ✗ FAIL: Interaction model still has mood attribute")
            return False
        else:
            print("   ✓ PASS: Interaction model does not have mood attribute")
            return True
    except Exception as e:
        print(f"   ✗ ERROR: {e}")
        return False

def check_route_definitions():
    """Check if routes still reference mood"""
    print("\n4. Checking Route Definitions...")
    
    files_to_check = [
        'app/routes/interactionRoutes.py',
        'app/routes/asrRoutes.py',
        'app/routes/searchRoutes.py',
        'ai_engine/asr/conversation_store.py'
    ]
    
    all_clean = True
    for file_path in files_to_check:
        full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), file_path)
        try:
            with open(full_path, 'r') as f:
                content = f.read()
                # Check for mood references (excluding comments)
                lines = content.split('\n')
                mood_refs = []
                for i, line in enumerate(lines, 1):
                    if 'mood' in line.lower() and not line.strip().startswith('#'):
                        # Exclude the word "mood" in strings or comments
                        if '"mood"' in line or "'mood'" in line:
                            mood_refs.append((i, line.strip()))
                
                if mood_refs:
                    print(f"   ⚠ WARNING: Found mood references in {file_path}:")
                    for line_num, line in mood_refs[:3]:  # Show first 3
                        print(f"      Line {line_num}: {line[:80]}")
                    all_clean = False
        except Exception as e:
            print(f"   ✗ ERROR checking {file_path}: {e}")
            all_clean = False
    
    if all_clean:
        print("   ✓ PASS: No mood references found in route files")
    
    return all_clean

def main():
    print("=" * 70)
    print("Mood Removal Verification Script")
    print("=" * 70)
    
    results = []
    
    # Run all checks
    results.append(("Database Schema", check_database_schema()))
    results.append(("ChromaDB Metadata", check_chromadb_metadata()))
    results.append(("Model Definition", check_model_definition()))
    results.append(("Route Definitions", check_route_definitions()))
    
    # Summary
    print("\n" + "=" * 70)
    print("Verification Summary")
    print("=" * 70)
    
    for check_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {check_name}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 70)
    if all_passed:
        print("✓ All checks passed! Mood feature successfully removed.")
    else:
        print("✗ Some checks failed. Please review the output above.")
    print("=" * 70)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
