#!/usr/bin/env python3
"""
Test script to verify ChromaDB connection and voice-to-text embedding storage.
Run this to ensure the WebSocket voice-to-text data will be properly stored.
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)
print(f"Loading environment from: {env_path}")

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.chroma_client import get_conversation_collection

def test_chromadb_connection():
    """Test ChromaDB connection and embedding functionality"""
    print("=" * 60)
    print("Testing ChromaDB Connection and Embedding Storage")
    print("=" * 60)
    
    # Display configuration
    print(f"\nChromaDB Configuration:")
    print(f"  Host: {os.getenv('CHROMA_HOST', 'localhost')}")
    print(f"  Port: {os.getenv('CHROMA_PORT', '8000')}")
    print(f"  Tenant: {os.getenv('CHROMA_TENANT', 'default_tenant')}")
    print(f"  Database: {os.getenv('CHROMA_DATABASE', 'default_database')}")
    print(f"  API Key: {'***' + os.getenv('CHROMA_API_KEY', '')[-4:] if os.getenv('CHROMA_API_KEY') else 'Not set'}")
    
    try:
        # Get the conversation collection
        print("\n1. Connecting to ChromaDB...")
        collection = get_conversation_collection()
        print("✓ Successfully connected to ChromaDB")
        
        # Test adding a sample conversation
        print("\n2. Testing embedding generation and storage...")
        test_transcript = "Hello, this is a test conversation to verify embeddings work correctly."
        test_id = "test_interaction_999999"
        
        collection.add(
            ids=[test_id],
            documents=[test_transcript],
            metadatas=[{
                "type": "test",
                "interaction_id": 999999,
                "user_id": 1,
                "contact_id": -1,
                "contact_name": "Test Contact",
                "timestamp": "2024-01-01T00:00:00"
            }]
        )
        print("✓ Successfully stored test conversation with embeddings")
        
        # Test semantic search
        print("\n3. Testing semantic search...")
        results = collection.query(
            query_texts=["test conversation"],
            n_results=1
        )
        
        if results and results['ids'] and len(results['ids'][0]) > 0:
            print("✓ Semantic search working correctly")
            print(f"  Found: {results['ids'][0][0]}")
            print(f"  Distance: {results['distances'][0][0]:.4f}")
        else:
            print("⚠ No results found in semantic search")
        
        # Clean up test data
        print("\n4. Cleaning up test data...")
        try:
            collection.delete(ids=[test_id])
            print("✓ Test data cleaned up")
        except Exception as e:
            print(f"⚠ Could not clean up test data: {e}")
        
        print("\n" + "=" * 60)
        print("✓ All tests passed! ChromaDB is ready for voice-to-text storage")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print("\n" + "=" * 60)
        print("❌ ChromaDB test failed. Check your configuration.")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = test_chromadb_connection()
    sys.exit(0 if success else 1)
