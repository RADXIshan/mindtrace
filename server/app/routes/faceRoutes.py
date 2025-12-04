from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import cv2
import numpy as np
from ai_engine.face_engine import load_models, recognize_face, sync_embeddings_from_db
from ..database import get_db
from ..models import Contact, User
from ..utils.auth import get_current_user

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
    db: Session = Depends(get_db)
):
    try:
        # Read image directly from memory
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
             print("DEBUG: Failed to decode image in recognize_face_endpoint")
             raise HTTPException(status_code=400, detail="Invalid image data")

        print("DEBUG: Calling recognize_face")
        result = recognize_face(face_app, img)
        print(f"DEBUG: recognize_face result: {result}")
        
        # If contacts are recognized, update their last_seen timestamp
        if result:
            for res in result:
                if res.get("name") != "Unknown" and "contact_id" in res:
                    contact = db.query(Contact).filter(
                        Contact.id == res["contact_id"]
                    ).first()
                    if contact:
                        from datetime import datetime
                        contact.last_seen = datetime.now()
            db.commit()
        
        return JSONResponse(content=result, status_code=200)

    except Exception as e:
        print(f"Error in recognize_face_endpoint: {e}")
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
