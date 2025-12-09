import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import cv2
import numpy as np
from ai_engine.face_engine import load_models, recognize_face, sync_embeddings_from_db
from ..database import get_db
from ..models import Contact, User
from ..models import Contact, User
from ..utils.auth import get_current_user, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError

router = APIRouter()

# Initialize models (lazy loading or global)
# For better performance, we should load this once. 
# In a real app, use a lifespan event or dependency injection.
face_app = load_models()

# Images are stored via contacts page, not uploaded directly here

# Removed /register endpoint - faces are now only registered through contacts page
# Use /sync-from-database after adding contacts with photos

@router.post("/recognize")
async def recognize_face_endpoint(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Read image directly from memory
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
             raise HTTPException(status_code=400, detail="Invalid image data")

        # Pass user_id to restrict recognition to user's contacts
        # Run CPU-bound face recognition in a separate thread to avoid blocking the event loop
        result = await asyncio.to_thread(recognize_face, face_app, img, user_id=current_user.id)
        
        # Ensure result is always a list
        if result is None:
            result = []
        
        # If contacts are recognized, enrich with details (batch query for performance)
        if result:
            from datetime import datetime, timezone
            from ..models import Interaction
            
            # Collect all contact IDs for batch query
            contact_ids = [res["contact_id"] for res in result if res.get("name") != "Unknown" and "contact_id" in res]
            
            if contact_ids:
                from datetime import timedelta

                # Batch query contacts
                contacts = db.query(Contact).filter(Contact.id.in_(contact_ids)).all()
                contact_map = {c.id: c for c in contacts}
                
                # Optimized: Fetch top interactions per contact
                interaction_map = {} 
                for cid in contact_ids:
                    # Fetch recent interactions to find the most recent one that's at least 1 hour old
                    recent = db.query(Interaction).filter(
                        Interaction.contact_id == cid
                    ).order_by(Interaction.timestamp.desc()).limit(20).all()
                    
                    if recent:
                        formatted = []
                        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=1)
                        
                        # Find the most recent interaction that is at least 1 hour old
                        for r in recent:
                            # Ensure timestamp has timezone info
                            r_timestamp = r.timestamp
                            if r_timestamp.tzinfo is None:
                                r_timestamp = r_timestamp.replace(tzinfo=timezone.utc)
                            
                            if r_timestamp < cutoff_time:
                                formatted.append({
                                    "summary": r.summary,
                                    "date": r_timestamp.isoformat(),
                                    "timestamp": r_timestamp.isoformat()
                                })
                                # Only show the most recent one that's at least 1 hour old
                                break 
                        
                        interaction_map[cid] = formatted
                
                # Enrich results
                for res in result:
                    if res.get("name") != "Unknown" and "contact_id" in res:
                        contact_id = res["contact_id"]
                        contact = contact_map.get(contact_id)
                        
                        if contact:
                            # Capture PREVIOUS last_seen time
                            last_seen_time = contact.last_seen
                            
                            # Ensure timezone info
                            if last_seen_time and last_seen_time.tzinfo is None:
                                last_seen_time = last_seen_time.replace(tzinfo=timezone.utc)
                            
                            # Filter Last Seen: Only show if at least 1 hour ago
                            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=1)
                            
                            if last_seen_time and last_seen_time < cutoff_time:
                                res["last_seen_timestamp"] = last_seen_time.isoformat()
                            else:
                                res["last_seen_timestamp"] = None
                            
                            # Add history list
                            history = interaction_map.get(contact_id, [])
                            res["recent_interactions"] = history
                            res["last_conversation_summary"] = history[0]["summary"] if history else None
                            
                            # Update last_seen to NOW
                            contact.last_seen = datetime.now(timezone.utc)
                
                db.commit()
        
        return JSONResponse(content=result, status_code=200)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync-from-database")
async def sync_faces_from_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync face embeddings from database contacts.
    This will rebuild the embeddings.json file from all contacts with profile photos.
    """
    try:
        result = sync_embeddings_from_db(face_app, db)
        
        if result.get("success"):
            return JSONResponse(
                content={
                    "message": f"Successfully synced {result['count']} face embeddings from database",
                    "count": result["count"]
                },
                status_code=200
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
            
    except Exception as e:
        print(f"Error in sync_faces_from_database: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/recognize/{user_id}")
async def websocket_recognize(
    websocket: WebSocket,
    user_id: int,
    token: str = Query(None)
):
    # Authenticate
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
             await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
             return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    
    # Get DB session
    db = next(get_db())

    try:
        while True:
            # Receive image bytes
            data = await websocket.receive_bytes()
            
            # Decode image
            nparr = np.frombuffer(data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if img is None:
                continue

            # Run recognition in thread pool
            result = await asyncio.to_thread(recognize_face, face_app, img, user_id=user_id)
            
            if result is None:
                result = []

            # Enrich results (copy-paste logic from HTTP endpoint for now, can be refactored later)
            if result:
                from datetime import datetime, timezone
                from ..models import Interaction, Contact
                
                contact_ids = [res["contact_id"] for res in result if res.get("name") != "Unknown" and "contact_id" in res]
                
                if contact_ids:
                    from datetime import timedelta

                    contacts = db.query(Contact).filter(Contact.id.in_(contact_ids)).all()
                    contact_map = {c.id: c for c in contacts}
                    
                    # Optimized: Fetch top interactions per contact
                    interaction_map = {} # contact_id -> list of summaries
                    
                    for cid in contact_ids:
                        recent = db.query(Interaction).filter(
                            Interaction.contact_id == cid
                        ).order_by(Interaction.timestamp.desc()).limit(20).all()
                        
                        if recent:
                            formatted = []
                            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=1)
                            
                            for r in recent:
                                # Ensure timestamp has timezone info
                                r_timestamp = r.timestamp
                                if r_timestamp.tzinfo is None:
                                    r_timestamp = r_timestamp.replace(tzinfo=timezone.utc)
                                
                                if r_timestamp < cutoff_time:
                                    formatted.append({
                                        "summary": r.summary,
                                        "date": r_timestamp.isoformat(),
                                        "timestamp": r_timestamp.isoformat()
                                    })
                                    break # Only want the most recent one that's at least 1h old
                            
                            interaction_map[cid] = formatted

                    for res in result:
                        if res.get("name") != "Unknown" and "contact_id" in res:
                            contact_id = res["contact_id"]
                            contact = contact_map.get(contact_id)
                            
                            if contact:
                                last_seen_time = contact.last_seen
                                
                                # Ensure timezone info
                                if last_seen_time and last_seen_time.tzinfo is None:
                                    last_seen_time = last_seen_time.replace(tzinfo=timezone.utc)
                                
                                # Filter Last Seen: Only show if at least 1 hour ago
                                cutoff_time = datetime.now(timezone.utc) - timedelta(hours=1)
                                
                                if last_seen_time and last_seen_time < cutoff_time:
                                    res["last_seen_timestamp"] = last_seen_time.isoformat()
                                else:
                                    res["last_seen_timestamp"] = None
                                
                                # Add history list
                                history = interaction_map.get(contact_id, [])
                                res["recent_interactions"] = history
                                
                                # Backward compatibility
                                res["last_conversation_summary"] = history[0]["summary"] if history else None
                                
                                contact.last_seen = datetime.now(timezone.utc)
                    
                    db.commit()

            # Send back result
            await websocket.send_json(result)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        db.close()
