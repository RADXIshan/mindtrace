from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import Reminder, User
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/reminders",
    tags=["reminders"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models
class ReminderBase(BaseModel):
    title: str
    type: str = "medication"
    time: str
    recurrence: str = "daily"
    notes: Optional[str] = None
    enabled: Optional[bool] = True

class ReminderCreate(ReminderBase):
    pass

class ReminderUpdate(ReminderBase):
    pass

class ReminderResponse(ReminderBase):
    id: int
    user_id: int
    completed: bool
    date: datetime
    last_triggered: Optional[datetime] = None
    enabled: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ReminderResponse])
def get_reminders(
    skip: int = 0, 
    limit: int = 100, 
    type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Reminder).filter(Reminder.user_id == current_user.id)
    
    if type and type != 'all':
        query = query.filter(Reminder.type == type)
        
    if status == 'completed':
        query = query.filter(Reminder.completed == True)
    elif status == 'pending':
        query = query.filter(Reminder.completed == False)
        
    reminders = query.order_by(Reminder.time).offset(skip).limit(limit).all()
    return reminders

@router.post("/", response_model=ReminderResponse)
def create_reminder(
    reminder: ReminderCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_reminder = Reminder(**reminder.dict(), user_id=current_user.id)
    db.add(db_reminder)
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_update: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    for key, value in reminder_update.dict(exclude_unset=True).items():
        setattr(db_reminder, key, value)
        
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.put("/{reminder_id}/toggle", response_model=ReminderResponse)
def toggle_reminder_complete(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    db_reminder.completed = not db_reminder.completed
    db.commit()
    db.refresh(db_reminder)
    return db_reminder

@router.delete("/{reminder_id}")
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not db_reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    db.delete(db_reminder)
    db.commit()
    return {"message": "Reminder deleted successfully"}

@router.post("/check-now")
async def check_reminders_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually trigger reminder check (useful for testing)"""
    from ..scheduler import scheduler
    await scheduler.check_reminders()
    return {"message": "Reminder check triggered"}
