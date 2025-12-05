from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import SOSContact, SOSConfig, SOSAlert, User
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/sos",
    tags=["sos"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models
class SOSContactBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    relationship: Optional[str] = None
    priority: int = 1

class SOSContactCreate(SOSContactBase):
    pass

class SOSContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    relationship: Optional[str] = None
    priority: Optional[int] = None

class SOSContactResponse(SOSContactBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

class SOSConfigBase(BaseModel):
    send_sms: bool = True
    make_call: bool = True
    record_audio: bool = False
    email_alert: bool = True
    alert_services: bool = False

class SOSConfigResponse(SOSConfigBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- SOS Alert Models ---

class LocationData(BaseModel):
    lat: float
    lng: float
    accuracy: Optional[float] = None
    address: Optional[str] = None

class SOSAlertCreate(BaseModel):
    location: Optional[LocationData] = None
    battery_level: Optional[int] = None
    connection_status: Optional[str] = None
    is_test: Optional[bool] = False

class SOSAlertUpdate(BaseModel):
    status: Optional[str] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[LocationData] = None

class SOSAlertResponse(BaseModel):
    id: int
    user_id: int
    status: str
    timestamp: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None
    location: Optional[LocationData] = None
    battery_level: Optional[int] = None
    connection_status: Optional[str] = None
    wearer_name: Optional[str] = None
    is_test: Optional[bool] = False

    class Config:
        from_attributes = True

# --- Contacts Endpoints ---

@router.get("/contacts", response_model=List[SOSContactResponse])
def get_sos_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    contacts = db.query(SOSContact).filter(SOSContact.user_id == current_user.id).order_by(SOSContact.priority).all()
    return contacts

@router.post("/contacts", response_model=SOSContactResponse)
def create_sos_contact(
    contact: SOSContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = SOSContact(**contact.dict(), user_id=current_user.id)
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

@router.delete("/contacts/{contact_id}")
def delete_sos_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = db.query(SOSContact).filter(SOSContact.id == contact_id, SOSContact.user_id == current_user.id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    db.delete(db_contact)
    db.commit()
    return {"message": "Contact deleted successfully"}

@router.put("/contacts/{contact_id}", response_model=SOSContactResponse)
def update_sos_contact(
    contact_id: int,
    contact_update: SOSContactUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_contact = db.query(SOSContact).filter(SOSContact.id == contact_id, SOSContact.user_id == current_user.id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = contact_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_contact, key, value)

    db.commit()
    db.refresh(db_contact)
    return db_contact

# --- Config Endpoints ---

@router.get("/config", response_model=SOSConfigResponse)
def get_sos_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(SOSConfig).filter(SOSConfig.user_id == current_user.id).first()
    if not config:
        # Create default config if not exists
        config = SOSConfig(user_id=current_user.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/config", response_model=SOSConfigResponse)
def update_sos_config(
    config_update: SOSConfigBase,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config = db.query(SOSConfig).filter(SOSConfig.user_id == current_user.id).first()
    if not config:
        config = SOSConfig(user_id=current_user.id)
        db.add(config)
    
    for key, value in config_update.dict(exclude_unset=True).items():
        setattr(config, key, value)
        
    db.commit()
    db.refresh(config)
    return config

# --- SOS Alert Endpoints ---

@router.post("/alerts", response_model=SOSAlertResponse)
def create_sos_alert(
    alert_data: SOSAlertCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new SOS alert"""
    db_alert = SOSAlert(
        user_id=current_user.id,
        battery_level=alert_data.battery_level,
        connection_status=alert_data.connection_status,
        is_test=alert_data.is_test or False
    )
    
    if alert_data.location:
        db_alert.latitude = str(alert_data.location.lat)
        db_alert.longitude = str(alert_data.location.lng)
        db_alert.accuracy = str(alert_data.location.accuracy) if alert_data.location.accuracy else None
        db_alert.address = alert_data.location.address
    
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    
    # Convert to response format
    response = SOSAlertResponse(
        id=db_alert.id,
        user_id=db_alert.user_id,
        status=db_alert.status,
        timestamp=db_alert.timestamp,
        resolved_at=db_alert.resolved_at,
        resolved_by=db_alert.resolved_by,
        notes=db_alert.notes,
        battery_level=db_alert.battery_level,
        connection_status=db_alert.connection_status,
        wearer_name=current_user.full_name,
        is_test=db_alert.is_test,
        location=LocationData(
            lat=float(db_alert.latitude),
            lng=float(db_alert.longitude),
            accuracy=float(db_alert.accuracy) if db_alert.accuracy else None,
            address=db_alert.address
        ) if db_alert.latitude and db_alert.longitude else None
    )
    
    return response

@router.get("/alerts", response_model=List[SOSAlertResponse])
def get_sos_alerts(
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get SOS alert history"""
    query = db.query(SOSAlert).filter(SOSAlert.user_id == current_user.id)
    
    if status:
        query = query.filter(SOSAlert.status == status)
    
    alerts = query.order_by(desc(SOSAlert.timestamp)).limit(limit).all()
    
    # Convert to response format
    response_alerts = []
    for alert in alerts:
        response_alerts.append(SOSAlertResponse(
            id=alert.id,
            user_id=alert.user_id,
            status=alert.status,
            timestamp=alert.timestamp,
            resolved_at=alert.resolved_at,
            resolved_by=alert.resolved_by,
            notes=alert.notes,
            battery_level=alert.battery_level,
            connection_status=alert.connection_status,
            wearer_name=current_user.full_name,
            is_test=alert.is_test,
            location=LocationData(
                lat=float(alert.latitude),
                lng=float(alert.longitude),
                accuracy=float(alert.accuracy) if alert.accuracy else None,
                address=alert.address
            ) if alert.latitude and alert.longitude else None
        ))
    
    return response_alerts

@router.get("/alerts/active", response_model=Optional[SOSAlertResponse])
def get_active_alert(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current active SOS alert (pending or acknowledged)"""
    alert = db.query(SOSAlert).filter(
        SOSAlert.user_id == current_user.id,
        SOSAlert.status.in_(["pending", "acknowledged"])
    ).order_by(desc(SOSAlert.timestamp)).first()
    
    if not alert:
        return None
    
    return SOSAlertResponse(
        id=alert.id,
        user_id=alert.user_id,
        status=alert.status,
        timestamp=alert.timestamp,
        resolved_at=alert.resolved_at,
        resolved_by=alert.resolved_by,
        notes=alert.notes,
        is_test=alert.is_test,
        battery_level=alert.battery_level,
        connection_status=alert.connection_status,
        wearer_name=current_user.full_name,
        location=LocationData(
            lat=float(alert.latitude),
            lng=float(alert.longitude),
            accuracy=float(alert.accuracy) if alert.accuracy else None,
            address=alert.address
        ) if alert.latitude and alert.longitude else None
    )

@router.put("/alerts/{alert_id}", response_model=SOSAlertResponse)
def update_sos_alert(
    alert_id: int,
    alert_update: SOSAlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an SOS alert (acknowledge, resolve, update location)"""
    alert = db.query(SOSAlert).filter(
        SOSAlert.id == alert_id,
        SOSAlert.user_id == current_user.id
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    # Update fields
    if alert_update.status:
        alert.status = alert_update.status
        if alert_update.status == "resolved":
            alert.resolved_at = datetime.utcnow()
    
    if alert_update.resolved_by:
        alert.resolved_by = alert_update.resolved_by
    
    if alert_update.notes:
        alert.notes = alert_update.notes
    
    if alert_update.location:
        alert.latitude = str(alert_update.location.lat)
        alert.longitude = str(alert_update.location.lng)
        alert.accuracy = str(alert_update.location.accuracy) if alert_update.location.accuracy else None
        alert.address = alert_update.location.address
    
    db.commit()
    db.refresh(alert)
    
    return SOSAlertResponse(
        id=alert.id,
        user_id=alert.user_id,
        status=alert.status,
        timestamp=alert.timestamp,
        resolved_at=alert.resolved_at,
        resolved_by=alert.resolved_by,
        notes=alert.notes,
        is_test=alert.is_test,
        battery_level=alert.battery_level,
        connection_status=alert.connection_status,
        wearer_name=current_user.full_name,
        location=LocationData(
            lat=float(alert.latitude),
            lng=float(alert.longitude),
            accuracy=float(alert.accuracy) if alert.accuracy else None,
            address=alert.address
        ) if alert.latitude and alert.longitude else None
    )

@router.delete("/alerts/history")
def clear_alert_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear all resolved SOS alerts"""
    db.query(SOSAlert).filter(
        SOSAlert.user_id == current_user.id,
        SOSAlert.status == "resolved"
    ).delete()
    db.commit()
    return {"message": "Alert history cleared successfully"}
