from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import shutil
import os
import cv2
import numpy as np
from ai_engine.face_engine import load_models, register_profile, recognize_face, sync_embeddings_from_db
from ..database import get_db
from ..models import Contact, User
from ..utils.auth import get_current_user

router = APIRouter()

# Initialize models (lazy loading or global)
# For better performance, we should load this once. 
# In a real app, use a lifespan event or dependency injection.
face_app = load_models()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Go up two levels to server root, then into ai_engine/profiles/images
IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), "ai_engine", "profiles", "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

@router.post("/register")
async def register_face(
    name: str = Form(...),
    relation: str = Form(...),
    file: UploadFile = File(...)
):
    try:
        # Save the uploaded file
        file_location = os.path.join(IMAGES_DIR, file.filename)
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Register the profile
        success = register_profile(face_app, name, relation, file_location)
        
        if success:
            return JSONResponse(content={"message": "Profile registered successfully", "name": name, "relation": relation}, status_code=200)
        else:
            # Clean up if failed
            if os.path.exists(file_location):
                os.remove(file_location)
            raise HTTPException(status_code=400, detail="Failed to detect face or register profile")
            
    except Exception as e:
        print(f"Error in register_face: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
             raise HTTPException(status_code=400, detail="Invalid image data")

        result = recognize_face(face_app, img)
        
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
