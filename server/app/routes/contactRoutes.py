from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
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

def contact_to_response(contact: Contact, request: Request) -> dict:
    """Convert a Contact ORM object to a response dict, handling binary photo data"""
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
        "last_seen": contact.last_seen,
        "is_active": contact.is_active,
        "profile_photo": None,  # Never return binary data
        "profile_photo_url": get_photo_url(contact.id, contact.profile_photo is not None, request)
    }

def sync_contact_to_chroma(contact: Contact) -> bool:
    """
    Sync a single contact's face embedding to ChromaDB.
    Returns True if successful, False otherwise.
    """
    if not contact.profile_photo:
        print(f"No profile photo for contact {contact.name}")
        return False
    
    try:
        # Load face recognition models
        app = get_face_app()
        
        # Convert binary data to OpenCV image
        nparr = np.frombuffer(contact.profile_photo, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            print(f"Error: Could not decode image for {contact.name}")
            return False
        
        # Extract embedding
        data_list = detect_and_embed(app, img)
        if not data_list:
            print(f"Error: No face detected for {contact.name}")
            return False
        
        # Use the first detected face
        data = data_list[0]
        
        # Get ChromaDB collection
        collection = get_face_collection()
        
        # Upsert to ChromaDB
        collection.upsert(
            ids=[f"contact_{contact.id}"],
            embeddings=[data["embedding"]],
            metadatas=[{
                "name": contact.name,
                "relation": contact.relationship_detail or contact.relationship,
                "contact_id": contact.id,
                "user_id": contact.user_id
            }]
        )
        
        print(f"Successfully synced {contact.name} to ChromaDB")
        return True
        
    except Exception as e:
        print(f"Error syncing contact {contact.name} to ChromaDB: {e}")
        import traceback
        traceback.print_exc()
        return False

def remove_contact_from_chroma(contact_id: int) -> bool:
    """
    Remove a contact's face embedding from ChromaDB.
    Returns True if successful, False otherwise.
    """
    try:
        collection = get_face_collection()
        collection.delete(ids=[f"contact_{contact_id}"])
        print(f"Successfully removed contact_{contact_id} from ChromaDB")
        return True
    except Exception as e:
        print(f"Error removing contact from ChromaDB: {e}")
        return False

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
    return [contact_to_response(contact, request) for contact in contacts]

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
    name: str = Form(...),
    relationship: str = Form(...),
    relationship_detail: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    visit_frequency: Optional[str] = Form(None),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a contact with a profile photo for face recognition"""
    try:
        # Read photo as binary data
        photo_data = await photo.read()
        
        # Create contact with binary photo data
        db_contact = Contact(
            user_id=current_user.id,
            name=name,
            relationship=relationship,
            relationship_detail=relationship_detail,
            phone_number=phone_number,
            email=email,
            notes=notes,
            visit_frequency=visit_frequency,
            profile_photo=photo_data,
            profile_photo_filename=photo.filename,
            avatar=name[:2].upper(),
            color="indigo"
        )
        
        db.add(db_contact)
        db.commit()
        db.refresh(db_contact)
        
        # Automatically sync to ChromaDB
        sync_success = sync_contact_to_chroma(db_contact)
        if not sync_success:
            print(f"Warning: Failed to sync contact {db_contact.name} to ChromaDB")
        
        return contact_to_response(db_contact, request)
        
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
    
    return contact_to_response(contact, request)

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
    return db_contact

@router.put("/{contact_id}/with-photo", response_model=ContactResponse)
async def update_contact_with_photo(
    contact_id: int,
    request: Request,
    name: Optional[str] = Form(None),
    relationship: Optional[str] = Form(None),
    relationship_detail: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    visit_frequency: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a contact with optional new profile photo"""
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
        if photo:
            # Read photo as binary data
            photo_data = await photo.read()
            db_contact.profile_photo = photo_data
            db_contact.profile_photo_filename = photo.filename
            photo_updated = True
        
        db.commit()
        db.refresh(db_contact)
        
        # Sync to ChromaDB if photo was updated or if contact has a photo
        if photo_updated or db_contact.profile_photo:
            sync_success = sync_contact_to_chroma(db_contact)
            if not sync_success:
                print(f"Warning: Failed to sync contact {db_contact.name} to ChromaDB")
        
        return contact_to_response(db_contact, request)
        
    except Exception as e:
        print(f"Error updating contact with photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = db.query(Contact).filter(Contact.id == contact_id, Contact.user_id == current_user.id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    # Remove from ChromaDB
    remove_contact_from_chroma(contact_id)
    
    # Hard delete from database
    db.delete(db_contact)
    db.commit()
    return {"message": "Contact deleted successfully"}
