from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import Alert, User
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models
class AlertBase(BaseModel):
    type: str
    severity: str = "info"
    title: str
    message: str
    data: Optional[Dict[str, Any]] = {}

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: int
    user_id: int
    timestamp: datetime
    read: bool

    class Config:
        from_attributes = True

@router.get("/", response_model=List[AlertResponse])
def get_alerts(
    skip: int = 0, 
    limit: int = 100, 
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Alert).filter(Alert.user_id == current_user.id)
    
    if severity and severity != 'all':
        query = query.filter(Alert.severity == severity)
        
    alerts = query.order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()
    return alerts

@router.post("/", response_model=AlertResponse)
def create_alert(
    alert: AlertCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_alert = Alert(**alert.dict(), user_id=current_user.id)
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

@router.put("/{alert_id}/read", response_model=AlertResponse)
def mark_alert_read(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.read = True
    db.commit()
    db.refresh(alert)
    return alert

@router.get("/unread-count", response_model=Dict[str, int])
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.read == False).count()
    return {"count": count}

@router.put("/read-all", response_model=Dict[str, int])
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.read == False).update({"read": True})
    db.commit()
    return {"updated_count": result}
