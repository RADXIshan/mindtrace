from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import os
import shutil

from ..database import get_db
from ..models import User
from ..utils.auth import get_current_user, get_password_hash, verify_password

router = APIRouter(
    prefix="/user",
    tags=["User Profile"],
    responses={404: {"description": "Not found"}},
)

def get_profile_image_url(profile_image: Optional[str], request: Request) -> Optional[str]:
    """Convert file path to URL"""
    if not profile_image or not os.path.exists(profile_image):
        return None
    
    filename = os.path.basename(profile_image)
    base_url = str(request.base_url).rstrip('/')
    return f"{base_url}/static/profile_images/{filename}"

# Pydantic models
class UserProfileResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    profile_image: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.get("/profile", response_model=UserProfileResponse)
def get_user_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile information"""
    profile_dict = UserProfileResponse.from_orm(current_user).dict()
    profile_dict['profile_image_url'] = get_profile_image_url(current_user.profile_image, request)
    return profile_dict

@router.put("/profile", response_model=UserProfileResponse)
def update_user_profile(
    profile_update: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile information"""
    
    # Check if email is being changed and if it's already taken
    if profile_update.email and profile_update.email != current_user.email:
        existing_user = db.query(User).filter(User.email == profile_update.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Update fields
    for key, value in profile_update.dict(exclude_unset=True).items():
        setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(
    password_request: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change user's password"""
    
    # Verify current password
    if not current_user.password_hash or not verify_password(
        password_request.current_password, 
        current_user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(password_request.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.delete("/account")
def delete_user_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete user account"""
    
    # Soft delete by setting is_active to False
    current_user.is_active = False
    db.commit()
    
    return {"message": "Account deleted successfully"}

@router.post("/profile-image")
async def upload_profile_image(
    request: Request,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload or update user profile image"""
    try:
        # Create directory for profile images
        BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        IMAGES_DIR = os.path.join(BASE_DIR, "static", "profile_images")
        os.makedirs(IMAGES_DIR, exist_ok=True)
        
        # Delete old profile image if exists
        if current_user.profile_image and os.path.exists(current_user.profile_image):
            try:
                os.remove(current_user.profile_image)
            except Exception as e:
                print(f"Error deleting old profile image: {e}")
        
        # Save the new photo with a unique name
        file_extension = os.path.splitext(photo.filename)[1]
        photo_filename = f"user_{current_user.id}{file_extension}"
        photo_path = os.path.join(IMAGES_DIR, photo_filename)
        
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        
        # Update user profile image path
        current_user.profile_image = photo_path
        db.commit()
        db.refresh(current_user)
        
        profile_dict = UserProfileResponse.from_orm(current_user).dict()
        profile_dict['profile_image_url'] = get_profile_image_url(current_user.profile_image, request)
        
        return profile_dict
        
    except Exception as e:
        print(f"Error uploading profile image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/profile-image")
def delete_profile_image(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete user profile image"""
    try:
        # Delete the file if it exists
        if current_user.profile_image and os.path.exists(current_user.profile_image):
            os.remove(current_user.profile_image)
        
        # Clear the profile image path
        current_user.profile_image = None
        db.commit()
        db.refresh(current_user)
        
        profile_dict = UserProfileResponse.from_orm(current_user).dict()
        profile_dict['profile_image_url'] = None
        
        return profile_dict
        
    except Exception as e:
        print(f"Error deleting profile image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
