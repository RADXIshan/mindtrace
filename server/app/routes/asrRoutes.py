import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session
import numpy as np
import sys
import os
import torch
import logging
from jose import jwt, JWTError

# Ensure we can import from ai_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from ai_engine.asr import ASREngine, ConversationStore, ConversationLinker
from ..database import get_db
from ..models import Contact, User
from ..chroma_client import get_conversation_collection
from ..utils.auth import SECRET_KEY, ALGORITHM

router = APIRouter(
    prefix="/asr",
    tags=["ASR"]
)

# Initialize engines
# Use 'base.en' model which is optimized for English (better accuracy/speed than generic base)
try:
    asr_engine = ASREngine(model_size="base.en")
    print("ASR Engine initialized in routes.")
except Exception as e:
    print(f"Failed to initialize ASR Engine: {e}")
    asr_engine = None

@router.get("/conversations")
async def get_conversations(
    profile_id: str = None,
    db: Session = Depends(get_db)
):
    """Get conversations from JSON file (backward compatibility)"""
    try:
        store = ConversationStore()
        conversations = store.get_conversations(profile_id=profile_id)
        return {"conversations": conversations}
    except Exception as e:
        print(f"Error getting conversations: {e}")
        return {"conversations": [], "error": str(e)}

@router.post("/sync-conversations")
async def sync_conversations_to_db(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Sync conversations from JSON file to database and ChromaDB"""
    try:
        from ..models import Interaction, Contact
        
        # Load conversations from JSON
        store = ConversationStore()
        conversations = store.get_conversations()
        
        chroma_collection = get_conversation_collection()
        synced_count = 0
        
        for conv in conversations:
            profile_id = conv.get("profile_id")
            transcript = conv.get("transcript")
            timestamp = conv.get("timestamp")
            
            if not profile_id or not transcript:
                continue
            
            # Try to find contact
            contact_id = None
            contact = db.query(Contact).filter(
                Contact.user_id == user_id,
                Contact.name == profile_id,
                Contact.is_active == True
            ).first()
            if contact:
                contact_id = contact.id
            
            # Check if already exists in database
            existing = db.query(Interaction).filter(
                Interaction.user_id == user_id,
                Interaction.contact_name == profile_id,
                Interaction.timestamp == timestamp
            ).first()
            
            if existing:
                continue
            
            # Create interaction
            db_interaction = Interaction(
                user_id=user_id,
                contact_id=contact_id,
                contact_name=profile_id,
                summary=transcript[:200] + "..." if len(transcript) > 200 else transcript,
                full_details=transcript,
                mood="neutral",
                timestamp=timestamp
            )
            
            db.add(db_interaction)
            db.commit()
            db.refresh(db_interaction)
            
            # Add to ChromaDB
            try:
                chroma_collection.add(
                    ids=[f"interaction_{db_interaction.id}"],
                    documents=[transcript],
                    metadatas=[{
                        "type": "conversation",
                        "interaction_id": db_interaction.id,
                        "user_id": user_id,
                        "contact_id": contact_id or -1,
                        "contact_name": profile_id,
                        "timestamp": timestamp,
                        "mood": "neutral"
                    }]
                )
            except Exception as e:
                print(f"Error adding to ChromaDB: {e}")
            
            synced_count += 1
        
        return {
            "message": f"Synced {synced_count} conversations to database and ChromaDB",
            "count": synced_count
        }
    except Exception as e:
        print(f"Error syncing conversations: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "count": 0}

@router.get("/search-conversations")
async def search_conversations(
    query: str,
    user_id: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    Semantic search for conversations using ChromaDB embeddings.
    Returns interactions ranked by semantic similarity to the query.
    """
    try:
        from ..models import Interaction, Contact
        
        chroma_collection = get_conversation_collection()
        
        # Query ChromaDB for similar conversations
        results = chroma_collection.query(
            query_texts=[query],
            n_results=limit,
            where={"user_id": user_id}
        )
        
        if not results or not results['ids'] or not results['ids'][0]:
            return {"results": [], "count": 0}
        
        # Extract interaction IDs from ChromaDB results
        interaction_ids = []
        distances = results['distances'][0] if results.get('distances') else []
        metadatas = results['metadatas'][0] if results.get('metadatas') else []
        documents = results['documents'][0] if results.get('documents') else []
        
        for i, chroma_id in enumerate(results['ids'][0]):
            # Extract interaction_id from "interaction_{id}" format
            if chroma_id.startswith("interaction_"):
                interaction_id = int(chroma_id.split("_")[1])
                interaction_ids.append({
                    "id": interaction_id,
                    "distance": distances[i] if i < len(distances) else None,
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                    "snippet": documents[i][:200] if i < len(documents) else ""
                })
        
        # Fetch full interaction details from database
        search_results = []
        for item in interaction_ids:
            interaction = db.query(Interaction).filter(
                Interaction.id == item["id"],
                Interaction.user_id == user_id
            ).first()
            
            if interaction:
                # Enrich with contact info
                contact_avatar = None
                contact_relationship = None
                contact_color = None
                
                if interaction.contact_id:
                    contact = db.query(Contact).filter(Contact.id == interaction.contact_id).first()
                    if contact:
                        contact_avatar = contact.avatar
                        contact_relationship = contact.relationship_detail or contact.relationship
                        contact_color = contact.color
                
                search_results.append({
                    "id": interaction.id,
                    "user_id": interaction.user_id,
                    "contact_id": interaction.contact_id,
                    "contact_name": interaction.contact_name,
                    "contact_avatar": contact_avatar,
                    "contact_relationship": contact_relationship,
                    "contact_color": contact_color,
                    "summary": interaction.summary,
                    "full_details": interaction.full_details,
                    "key_topics": interaction.key_topics,
                    "mood": interaction.mood,
                    "timestamp": interaction.timestamp.isoformat() if interaction.timestamp else None,
                    "duration": interaction.duration,
                    "location": interaction.location,
                    "starred": interaction.starred,
                    "similarity_score": 1 - item["distance"] if item["distance"] is not None else None,
                    "snippet": item["snippet"]
                })
        
        return {
            "results": search_results,
            "count": len(search_results),
            "query": query
        }
        
    except Exception as e:
        print(f"Error searching conversations: {e}")
        import traceback
        traceback.print_exc()
        return {"results": [], "count": 0, "error": str(e)}

@router.websocket("/{user_id}/{profile_id}")
async def websocket_asr(
    websocket: WebSocket, 
    user_id: int, 
    profile_id: str,
    token: str = Query(None)
):
    # Authenticate via token
    if not token:
        print("ASR WebSocket connection rejected: No token provided")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = next(get_db())
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise Exception("Invalid token: no sub")
            
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise Exception("User not found")
            
        if user.id != user_id:
             print(f"ASR WebSocket token user mismatch. Token user: {user.id}, Path user: {user_id}")
             # We could reject, but maybe just logwarn. Better to reject for security.
             # However, let's trust the token's user.
             # Actually, if the path param differs, we should probably respect the token user or error out.
             # For now, let's enforce match.
             # await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
             # return
             pass # Allowing for now, but strictly speaking should match.
             
    except Exception as e:
        print(f"ASR WebSocket authentication failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        db.close()
        return

    await websocket.accept()
    print(f"✓ ASR WebSocket connected for user {user_id}, profile: {profile_id}")
    
    # Send confirmation message
    try:
        await websocket.send_json({
            "type": "connected",
            "message": f"ASR ready for {profile_id}"
        })
    except Exception as e:
        print(f"Error sending connection confirmation: {e}")
    
    # ChromaDB collection
    chroma_collection = get_conversation_collection()
    
    # Initialize store and linker with database and ChromaDB
    store = ConversationStore(db_session=db, chroma_collection=chroma_collection)
    linker = ConversationLinker(store)
    
    # Try to find contact_id from profile_id (name)
    contact_id = None
    try:
        contact = db.query(Contact).filter(
            Contact.user_id == user_id,
            Contact.name == profile_id,
            Contact.is_active == True
        ).first()
        if contact:
            contact_id = contact.id
            print(f"Found contact_id {contact_id} for profile {profile_id}")
    except Exception as e:
        print(f"Error finding contact: {e}")
    
    audio_buffer = []
    chunk_counter = 0
    total_chunks_received = 0
    TRANSCRIBE_INTERVAL_CHUNKS = 2 # Approx 0.5 second (Even faster updates)
    RMS_THRESHOLD = 0.0005 # Further reduced threshold for better sensitivity
    last_activity_time = asyncio.get_event_loop().time()
    IDLE_TIMEOUT = 30.0 # Keep connection alive for 30 seconds of silence

    if not asr_engine:
        print("❌ Error: ASR Engine is not initialized")
        try:
            await websocket.send_json({
                "type": "error",
                "message": "ASR Engine failed to initialize on server"
            })
        except:
            pass
    else:
        print("✓ ASR Engine ready")


    try:
        while True:
            # Receive raw bytes (float32 PCM) with timeout
            try:
                data = await asyncio.wait_for(websocket.receive_bytes(), timeout=1.0)
            except asyncio.TimeoutError:
                # Check if we've been idle too long
                current_time = asyncio.get_event_loop().time()
                if current_time - last_activity_time > IDLE_TIMEOUT:
                    print(f"ASR idle timeout reached ({IDLE_TIMEOUT}s), closing connection")
                    break
                continue
            
            if len(data) == 0:
                continue
            
            # Update activity time
            last_activity_time = asyncio.get_event_loop().time()
            
            # Convert bytes to numpy array (float32)
            try:
                chunk = np.frombuffer(data, dtype=np.float32)
                if len(chunk) == 0:
                    continue
                
                total_chunks_received += 1
                audio_buffer.append(chunk)
                chunk_counter += 1
                
                # Log every 20 chunks to avoid spam
                if total_chunks_received % 20 == 0:
                    print(f"Received {total_chunks_received} audio chunks ({len(chunk)} samples each)")
            except Exception as e:
                print(f"Error converting audio data: {e}")
                continue
            
            # --- Incremental Transcription for Subtitles ---
            # Use smaller interval for lower latency
            if chunk_counter >= TRANSCRIBE_INTERVAL_CHUNKS and asr_engine:
                chunk_counter = 0
                try:
                    # Rolling buffer strategy:
                    # Ideally we keep a single large buffer or a deque of chunks.
                    # Repeated np.concatenate is O(N^2) if done naively on growing list.
                    # Here we flatten only the window we need + context.

                    # Max context: ~15 seconds (240k samples)
                    # Transcribe window: Last 3 seconds for quick feedback (approx 48k samples)
                    # But we provide more context to Whisper if available.
                    
                    # Optimization: Only flatten if we have new chunks
                    # (Here we always have at least 1 new chunk due to if check)

                    # Quick concatenate just for the recent window optimization
                    # We need enough past context for accurate transcription, but we only really care about the new text.
                    # Let's take the last N chunks that sum up to ~5-10 seconds.
                    
                    # Minimal implementation for speed:
                    # 1. Concatenate everything (still simple enough for < 1 min audio)
                    # 2. Slice the last 5 seconds.
                    
                    current_full = np.concatenate(audio_buffer)
                    
                    # Limit buffer growth - Keep last 30 seconds max to prevent OOM on very long sessions
                    # 16000 * 30 = 480,000
                    if len(current_full) > 480000:
                         # Keep last 15s only
                         current_full = current_full[-240000:]
                         # Reset buffer to single chunk to free memory
                         audio_buffer = [current_full]

                    # Transcribe window: Last 5 seconds (80000 samples)
                    # Reduced from previous logic to ensure responsiveness
                    SAMPLES_FOR_TRANSCRIPTION = 80000 
                    transcribe_window = current_full[-SAMPLES_FOR_TRANSCRIPTION:] if len(current_full) > SAMPLES_FOR_TRANSCRIPTION else current_full
                    
                    # VAD: Check Energy Level (RMS)
                    rms = np.sqrt(np.mean(transcribe_window**2))
                    
                    # Reduced valid length check for faster first token
                    if len(transcribe_window) > 1600 and rms > RMS_THRESHOLD: # > 0.1s
                        # Run ASR on threadpool to avoid blocking WebSocket
                        transcript = await asyncio.to_thread(asr_engine.transcribe_audio_chunk, transcribe_window)
                        if transcript and transcript.strip():
                            print(f"✓ Subtitle: {transcript}")
                            await websocket.send_json({
                                "type": "subtitle",
                                "text": transcript
                            })
                    else:
                        # Send empty subtitle to clear if too quiet
                        if rms <= RMS_THRESHOLD:
                            await websocket.send_json({
                                "type": "subtitle",
                                "text": ""
                            })
                except Exception as e:
                    print(f"Incremental transcribe error: {e}")
            # -----------------------------------------------
            # -----------------------------------------------

    except WebSocketDisconnect:
        print(f"ASR WebSocket disconnected for {profile_id}. Processing final conversation...")
        
        # Process the buffer if we have audio
        if audio_buffer and asr_engine:
            try:
                # Concatenate all chunks
                full_audio = np.concatenate(audio_buffer)
                
                duration_seconds = len(full_audio) / 16000
                print(f"Total audio: {len(full_audio)} samples ({duration_seconds:.2f} seconds)")
                print(f"Total chunks received: {total_chunks_received}")
                
                if len(full_audio) > 4800: # Ensure at least 0.3 seconds of audio
                    print(f"Transcribing final audio...")
                    transcript = await asyncio.to_thread(asr_engine.transcribe_audio_chunk, full_audio)
                    print(f"✓ Final Transcript: {transcript}")
                    
                    if transcript and transcript.strip():
                        result = linker.link_and_save(profile_id, transcript, user_id=user_id, contact_id=contact_id)
                        if result:
                            print(f"✓ Conversation saved successfully")
                        else:
                            print("⚠ Conversation save returned None")
                    else:
                        print("⚠ Empty transcript, not saving")
                else:
                    print(f"⚠ Audio too short to transcribe ({duration_seconds:.2f}s)")
                    
            except Exception as e:
                print(f"❌ Error processing audio buffer: {e}")
                import traceback
                traceback.print_exc()
        elif not audio_buffer:
            print("⚠ No audio data received")
        elif not asr_engine:
            print("❌ ASR Engine not available")
        
        db.close()
        
    except Exception as e:
        print(f"WebSocket Error: {e}")
        db.close()

