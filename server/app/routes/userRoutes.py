from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
import base64

from ..database import get_db
from ..models import User
from ..utils.auth import get_current_user, get_password_hash, verify_password

router = APIRouter(
    prefix="/user",
    tags=["User Profile"],
    responses={404: {"description": "Not found"}},
)

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

@router.get("/profile")
def get_user_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile information"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "profile_image": current_user.profile_image,
        "profile_image_url": current_user.profile_image,  # Base64 data URL
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

@router.put("/profile")
def update_user_profile(
    profile_update: UserProfileUpdate,
    request: Request,
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
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "profile_image": current_user.profile_image,
        "profile_image_url": current_user.profile_image,  # Base64 data URL
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

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
        # Validate file type
        if not photo.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Read the image file
        image_data = await photo.read()
        
        # Validate file size (max 5MB)
        if len(image_data) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image size must be less than 5MB"
            )
        
        # Convert to base64 data URL
        base64_data = base64.b64encode(image_data).decode('utf-8')
        data_url = f"data:{photo.content_type};base64,{base64_data}"
        
        # Update user profile image
        current_user.profile_image = data_url
        db.commit()
        db.refresh(current_user)
        
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "profile_image": current_user.profile_image,
            "profile_image_url": current_user.profile_image,  # Base64 data URL
            "is_active": current_user.is_active,
            "created_at": current_user.created_at
        }
        
    except HTTPException:
        raise
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
        # Clear the profile image
        current_user.profile_image = None
        db.commit()
        db.refresh(current_user)
        
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "profile_image": None,
            "profile_image_url": None,
            "is_active": current_user.is_active,
            "created_at": current_user.created_at
        }
        
    except Exception as e:
        print(f"Error deleting profile image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
