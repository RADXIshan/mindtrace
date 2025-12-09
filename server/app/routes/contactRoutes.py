from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
import base64
import cv2
import numpy as np

from ..database import get_db
from ..models import Contact, User
from ..utils.auth import get_current_user
from ai_engine.face_engine import load_models, detect_and_embed
from ..chroma_client import get_face_collection

router = APIRouter(
    prefix="/contacts",
    tags=["contacts"],
    responses={404: {"description": "Not found"}},
)

# Load face recognition models once
face_app = None

def get_face_app():
    global face_app
    if face_app is None:
        face_app = load_models()
    return face_app

def get_photo_url(contact_id: int, has_photo: bool, request: Request) -> Optional[str]:
    """Generate URL for contact photo endpoint"""
    if not has_photo:
        return None
    
    base_url = str(request.base_url).rstrip('/')
    return f"{base_url}/contacts/{contact_id}/photo"

def get_effective_last_seen(contact_id: int, db: Session) -> Optional[datetime]:
    """
    Calculate the effective 'Last Met' time based on 1-hour minimum gap.
    Returns the most recent interaction that is at least 1 hour old from current time.
    All times are in IST (Indian Standard Time).
    """
    from ..models import Interaction
    
    # Fetch recent interactions (descending order)
    interactions = db.query(Interaction).filter(
        Interaction.contact_id == contact_id
    ).order_by(Interaction.timestamp.desc()).limit(100).all()
    
    if not interactions:
        return None
    
    # Get current time in IST
    ist_tz = ZoneInfo("Asia/Kolkata")
    current_time = datetime.now(ist_tz)
    cutoff_time = current_time - timedelta(hours=1)
    
    # Find the most recent interaction that is at least 1 hour old
    for interaction in interactions:
        interaction_time = interaction.timestamp
        
        # Ensure timezone info and convert to IST
        if interaction_time.tzinfo is None:
            # Assume UTC if no timezone
            interaction_time = interaction_time.replace(tzinfo=timezone.utc)
        interaction_time = interaction_time.astimezone(ist_tz)
        
        # Return the first (most recent) interaction that's at least 1 hour old
        if interaction_time < cutoff_time:
            return interaction_time
    
    # No interaction found that's at least 1 hour old
    return None

def contact_to_response(contact: Contact, request: Request, db: Optional[Session] = None) -> dict:
    """Convert a Contact ORM object to a response dict, handling binary photo data"""
    # Calculate total interactions if db session is provided
    total_interactions = 0
    if db:
        from ..models import Interaction
        total_interactions = db.query(Interaction).filter(
            Interaction.contact_id == contact.id
        ).count()
    
    return {
        "id": contact.id,
        "user_id": contact.user_id,
        "name": contact.name,
        "relationship": contact.relationship,
        "relationship_detail": contact.relationship_detail,
        "avatar": contact.avatar,
        "color": contact.color,
        "phone_number": contact.phone_number,
        "email": contact.email,
        "notes": contact.notes,
        "visit_frequency": contact.visit_frequency,
        "visit_frequency": contact.visit_frequency,
        "last_seen": get_effective_last_seen(contact.id, db) if db else contact.last_seen,
        "is_active": contact.is_active,
        "profile_photo": None,  # Never return binary data
        "profile_photo_url": get_photo_url(contact.id, contact.profile_photo is not None, request),
        "total_interactions": total_interactions
    }

def sync_contact_to_chroma(contact_id: int, profile_photo: bytes, name: str, relationship: str, user_id: int):
    """
    Sync a single contact's face embedding to ChromaDB.
    Executed in background.
    """
    if not profile_photo:
        print(f"No profile photo for contact {name}")
        return
    
    try:
        import time
        start_time = time.time()
        
        # Load face recognition models (should be pre-warmed on startup)
        app = get_face_app()
        
        # Convert binary data to OpenCV image
        nparr = np.frombuffer(profile_photo, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            print(f"Error: Could not decode image for {name}")
            return
        
        # Extract embedding
        data_list = detect_and_embed(app, img)
        
        if not data_list:
            print(f"Error: No face detected for {name}")
            return
        
        # Use the first detected face
        data = data_list[0]
        
        # Get ChromaDB collection
        collection = get_face_collection()
        
        # Upsert to ChromaDB with timeout handling (inherent in network request but we catch exceptions)
        collection.upsert(
            ids=[f"contact_{contact_id}"],
            embeddings=[data["embedding"]],
            metadatas=[{
                "name": name,
                "relation": relationship,
                "contact_id": contact_id,
                "user_id": user_id
            }]
        )
        
        total_time = time.time() - start_time
        print(f"✓ Successfully synced {name} to ChromaDB (background task, {total_time:.2f}s)")
        
    except Exception as e:
        print(f"Error syncing contact {name} to ChromaDB: {e}")

def sync_contact_to_chroma_multiple(contact_id: int, profile_photos: List[bytes], name: str, relationship: str, user_id: int):
    """
    Sync a contact's face embeddings from multiple photos to ChromaDB.
    This creates multiple embeddings for better recognition accuracy.
    Executed in background.
    """
    if not profile_photos:
        print(f"No profile photos for contact {name}")
        return
    
    try:
        import time
        start_time = time.time()
        
        # Load face recognition models (should be pre-warmed on startup)
        app = get_face_app()
        
        # Get ChromaDB collection
        collection = get_face_collection()
        
        # Process each photo and collect embeddings
        all_embeddings = []
        all_ids = []
        all_metadatas = []
        
        for idx, photo_data in enumerate(profile_photos):
            # Convert binary data to OpenCV image
            nparr = np.frombuffer(photo_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                print(f"Error: Could not decode image {idx+1} for {name}")
                continue
            
            # Extract embedding
            data_list = detect_and_embed(app, img)
            
            if not data_list:
                print(f"Warning: No face detected in image {idx+1} for {name}")
                continue
            
            # Use the first detected face from each photo
            data = data_list[0]
            
            # Add to batch with unique ID for each photo
            all_ids.append(f"contact_{contact_id}_photo_{idx}")
            all_embeddings.append(data["embedding"])
            all_metadatas.append({
                "name": name,
                "relation": relationship,
                "contact_id": contact_id,
                "user_id": user_id,
                "photo_index": idx
            })
        
        if not all_embeddings:
            print(f"Error: No faces detected in any photos for {name}")
            return
        
        # Upsert all embeddings to ChromaDB
        collection.upsert(
            ids=all_ids,
            embeddings=all_embeddings,
            metadatas=all_metadatas
        )
        
        total_time = time.time() - start_time
        print(f"✓ Successfully synced {len(all_embeddings)} embeddings for {name} to ChromaDB (background task, {total_time:.2f}s)")
        
    except Exception as e:
        print(f"Error syncing contact {name} to ChromaDB: {e}")
        # We don't re-raise here because it's a background task

def remove_contact_from_chroma(contact_id: int):
    """
    Remove all of a contact's face embeddings from ChromaDB.
    Handles both single and multiple photo embeddings.
    Executed in background.
    """
    try:
        collection = get_face_collection()
        
        # Query for all embeddings belonging to this contact
        try:
            results = collection.get(
                where={"contact_id": contact_id}
            )
            
            if results and results['ids']:
                # Delete all found embeddings
                collection.delete(ids=results['ids'])
                print(f"Successfully removed {len(results['ids'])} embeddings for contact_{contact_id} from ChromaDB")
            else:
                print(f"No embeddings found for contact_{contact_id} in ChromaDB")
        except Exception as query_error:
            # Fallback: try to delete the old single-photo format
            print(f"Query failed, trying legacy delete: {query_error}")
            collection.delete(ids=[f"contact_{contact_id}"])
            print(f"Successfully removed contact_{contact_id} from ChromaDB (legacy format)")
            
    except Exception as e:
        print(f"Error removing contact from ChromaDB: {e}")

# Pydantic models
class ContactBase(BaseModel):
    name: str
    relationship: str
    relationship_detail: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = "indigo"
    phone_number: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    visit_frequency: Optional[str] = None
    profile_photo: Optional[str] = None

class ContactCreate(ContactBase):
    pass

class ContactUpdate(ContactBase):
    pass

class ContactResponse(ContactBase):
    id: int
    user_id: int
    last_seen: Optional[datetime] = None
    is_active: bool
    profile_photo_url: Optional[str] = None
    total_interactions: Optional[int] = 0
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[ContactResponse])
def get_contacts(
    request: Request,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id, Contact.is_active == True).offset(skip).limit(limit).all()
    return [contact_to_response(contact, request, db) for contact in contacts]

@router.post("/", response_model=ContactResponse)
def create_contact(
    contact: ContactCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = Contact(**contact.dict(), user_id=current_user.id)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.post("/with-photo", response_model=ContactResponse)
async def create_contact_with_photo(
    request: Request,
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    relationship: str = Form(...),
    relationship_detail: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    visit_frequency: Optional[str] = Form(None),
    photo: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a contact with profile photos for face recognition"""
    try:
        # Read all photos as binary data
        all_photos = []
        for p in photo:
            photo_data = await p.read()
            all_photos.append(photo_data)
        
        # Use the first photo for profile display
        primary_photo = all_photos[0] if all_photos else None
        primary_filename = photo[0].filename if photo else None
        
        # Create contact with primary photo for display
        db_contact = Contact(
            user_id=current_user.id,
            name=name,
            relationship=relationship,
            relationship_detail=relationship_detail,
            phone_number=phone_number,
            email=email,
            notes=notes,
            visit_frequency=visit_frequency,
            profile_photo=primary_photo,
            profile_photo_filename=primary_filename,
            avatar=name[:2].upper(),
            color="indigo"
        )
        
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        
        # Background sync to ChromaDB with ALL photos for better recognition
        background_tasks.add_task(
            sync_contact_to_chroma_multiple, 
            db_contact.id, 
            all_photos,  # Pass all photos for embedding
            db_contact.name,
            db_contact.relationship_detail or db_contact.relationship,
            db_contact.user_id
        )
        
        return contact_to_response(db_contact, request, db)
        
    except Exception as e:
        print(f"Error creating contact with photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(
    contact_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return contact_to_response(contact, request, db)

@router.get("/{contact_id}/photo")
def get_contact_photo(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the profile photo for a contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    if not contact.profile_photo:
        raise HTTPException(status_code=404, detail="No photo available")
    
    # Determine media type from filename
    media_type = "image/jpeg"
    if contact.profile_photo_filename:
        if contact.profile_photo_filename.lower().endswith('.png'):
            media_type = "image/png"
        elif contact.profile_photo_filename.lower().endswith('.gif'):
            media_type = "image/gif"
        elif contact.profile_photo_filename.lower().endswith('.webp'):
            media_type = "image/webp"
    
    return Response(content=contact.profile_photo, media_type=media_type)

@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int, 
    contact_update: ContactUpdate, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    for key, value in contact_update.dict(exclude_unset=True).items():
        setattr(db_contact, key, value)
    
    db.commit()
    db.refresh(db_contact)
    return contact_to_response(db_contact, request, db)

@router.put("/{contact_id}/with-photo", response_model=ContactResponse)
async def update_contact_with_photo(
    contact_id: int,
    request: Request,
    background_tasks: BackgroundTasks,
    name: Optional[str] = Form(None),
    relationship: Optional[str] = Form(None),
    relationship_detail: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    visit_frequency: Optional[str] = Form(None),
    photo: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a contact with optional new profile photos"""
    db_contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    try:
        # Update text fields
        if name is not None:
            db_contact.name = name
        if relationship is not None:
            db_contact.relationship = relationship
        if relationship_detail is not None:
            db_contact.relationship_detail = relationship_detail
        if phone_number is not None:
            db_contact.phone_number = phone_number
        if email is not None:
            db_contact.email = email
        if notes is not None:
            db_contact.notes = notes
        if visit_frequency is not None:
            db_contact.visit_frequency = visit_frequency
        
        # Handle photo update
        photo_updated = False
        all_photos = []
        if photo and len(photo) > 0:
            # Read all photos as binary data
            for p in photo:
                photo_data = await p.read()
                all_photos.append(photo_data)
            
            # Use first photo for profile display
            db_contact.profile_photo = all_photos[0]
            db_contact.profile_photo_filename = photo[0].filename
            photo_updated = True
        
        db.commit()
        db.refresh(db_contact)
        
        # Sync to ChromaDB if photos were updated
        if photo_updated and all_photos:
            # Remove old embeddings first
            background_tasks.add_task(remove_contact_from_chroma, db_contact.id)
            # Add new embeddings from all photos
            background_tasks.add_task(
                sync_contact_to_chroma_multiple, 
                db_contact.id, 
                all_photos, 
                db_contact.name,
                db_contact.relationship_detail or db_contact.relationship,
                db_contact.user_id
            )

        return contact_to_response(db_contact, request, db)
        
    except Exception as e:
        print(f"Error updating contact with photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Remove from ChromaDB in background
    background_tasks.add_task(remove_contact_from_chroma, contact_id)
    
    # Hard delete from database
    db.delete(db_contact)
    db.commit()
    return {"message": "Contact deleted successfully"}
