from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, case
from typing import List, Any, Optional
from pydantic import BaseModel
from datetime import datetime
import re

from ..database import get_db
from ..models import Contact, Interaction, Reminder, Alert, SOSContact, User
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/search",
    tags=["search"],
    responses={404: {"description": "Not found"}},
)

class PageMatch(BaseModel):
    id: str
    name: str
    path: str
    description: str
    matched_content: str = ""
    relevance: int = 0

class ContactSearchResponse(BaseModel):
    id: int
    name: str
    relationship: str
    relationship_detail: Optional[str] = None
    avatar: Optional[str] = None
    color: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    visit_frequency: Optional[str] = None
    last_seen: Optional[datetime] = None
    is_active: bool
    profile_photo: Optional[str] = None

    class Config:
        from_attributes = True

class InteractionSearchResponse(BaseModel):
    id: int
    summary: Optional[str] = None
    full_details: Optional[str] = None
    key_topics: Optional[List[str]] = []
    mood: Optional[str] = None
    timestamp: datetime
    contact_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReminderSearchResponse(BaseModel):
    id: int
    title: str
    type: str
    time: str
    recurrence: str
    notes: Optional[str] = None
    completed: bool
    
    class Config:
        from_attributes = True

class AlertSearchResponse(BaseModel):
    id: int
    type: str
    severity: str
    title: str
    message: str
    timestamp: datetime
    read: bool
    
    class Config:
        from_attributes = True

class SOSContactSearchResponse(BaseModel):
    id: int
    name: str
    phone: str
    relationship: Optional[str] = None
    
    class Config:
        from_attributes = True

class SearchResponse(BaseModel):
    pages: List[PageMatch] = []
    contacts: List[ContactSearchResponse] = []
    interactions: List[InteractionSearchResponse] = []
    reminders: List[ReminderSearchResponse] = []
    alerts: List[AlertSearchResponse] = []
    sos_contacts: List[SOSContactSearchResponse] = []

def create_search_patterns(query: str):
    """Create multiple search patterns for better matching"""
    # Clean and normalize the query
    query = query.strip().lower()
    
    # Create patterns for different matching strategies
    patterns = {
        'exact': f"%{query}%",
        'words': [f"%{word}%" for word in query.split() if len(word) > 1],
        'starts_with': f"{query}%",
        'contains_all': query.replace(' ', '%')
    }
    
    return patterns

def search_pages(query: str) -> List[PageMatch]:
    """Search through page content and features"""
    query_lower = query.lower().strip()
    
    # Define searchable page content with features, actions, and keywords
    pages_content = [
        {
            "id": "home",
            "name": "Dashboard Home",
            "path": "/dashboard",
            "description": "Overview and quick actions",
            "content": [
                "welcome", "overview", "quick actions", "add contact", "new reminder",
                "view alerts", "emergency sos", "visitors today", "conversations",
                "unread alerts", "upcoming reminders", "recent interactions", 
                "today's reminders", "glasses status", "connection", "battery", "last sync"
            ]
        },
        {
            "id": "interactions",
            "name": "Interaction History",
            "path": "/dashboard/interactions",
            "description": "Review and analyze past conversations",
            "content": [
                "interactions", "history", "conversations", "messages", "chat",
                "search", "filter", "mood", "happy", "sad", "neutral", "anxious", "confused",
                "starred", "export", "download", "timeline", "summary", "details",
                "key topics", "location", "duration", "emotional tone", "conversation"
            ]
        },
        {
            "id": "contacts",
            "name": "Contacts Directory",
            "path": "/dashboard/contacts",
            "description": "Manage people in the recognition database",
            "content": [
                "contacts", "people", "directory", "friends", "family", "add contact",
                "sync faces", "face recognition", "relationship", "caretaker", "doctor",
                "nurse", "neighbor", "last seen", "frequency", "profile", "photo",
                "grid view", "list view", "search contacts", "filter", "manage"
            ]
        },
        {
            "id": "alerts",
            "name": "Alerts & Notifications",
            "path": "/dashboard/alerts",
            "description": "Monitor important events and system notifications",
            "content": [
                "alerts", "notifications", "warnings", "messages", "info", "warning",
                "critical", "severity", "mark read", "mark all read", "filter",
                "system notifications", "events", "monitor", "unread"
            ]
        },
        {
            "id": "reminders",
            "name": "Reminders & Schedule",
            "path": "/dashboard/reminders",
            "description": "Manage daily routines, medications, and appointments",
            "content": [
                "reminders", "schedule", "calendar", "tasks", "todo", "medication",
                "medications", "pills", "appointment", "appointments", "activity",
                "activities", "meal", "meals", "morning", "afternoon", "evening",
                "daily", "weekly", "weekday", "time", "routine", "add reminder",
                "complete", "delete", "notes", "recurrence", "smart alerts"
            ]
        },
        {
            "id": "sos",
            "name": "SOS Settings",
            "path": "/dashboard/sos",
            "description": "Configure emergency contacts and SOS settings",
            "content": [
                "sos", "emergency", "help", "urgent", "safety", "emergency contacts",
                "add contact", "priority", "phone", "email", "sms", "call",
                "location sharing", "auto call", "emergency services", "911",
                "trigger", "activate", "settings", "configuration"
            ]
        },
        {
            "id": "sos-alerts",
            "name": "SOS Alerts",
            "path": "/dashboard/sos-alerts",
            "description": "View and manage SOS alert history",
            "content": [
                "sos", "emergency", "alerts", "urgent", "history", "active",
                "triggered", "location", "map", "contacts notified", "clear history"
            ]
        },
        {
            "id": "settings",
            "name": "Profile Settings",
            "path": "/dashboard/settings",
            "description": "Manage your account and preferences",
            "content": [
                "settings", "profile", "account", "preferences", "configuration",
                "personal information", "full name", "email", "password",
                "change password", "security", "profile picture", "photo",
                "upload", "delete account", "danger zone", "member since",
                "account status", "save changes"
            ]
        },
        {
            "id": "help",
            "name": "Help & Support",
            "path": "/dashboard/help",
            "description": "Get answers and assistance",
            "content": [
                "help", "support", "faq", "documentation", "guide", "assistance",
                "email support", "phone support", "contact", "questions",
                "how to", "add contact", "sos button", "medication reminders",
                "export data", "smart glasses", "forgot password", "data protection",
                "caregivers", "system status", "operational"
            ]
        }
    ]
    
    matches = []
    
    for page in pages_content:
        relevance = 0
        matched_terms = []
        
        # Check name match
        if query_lower in page["name"].lower():
            relevance += 100
            matched_terms.append(page["name"])
        elif page["name"].lower().startswith(query_lower):
            relevance += 80
            matched_terms.append(page["name"])
        
        # Check description match
        if query_lower in page["description"].lower():
            relevance += 50
            matched_terms.append(page["description"])
        
        # Check content keywords
        for keyword in page["content"]:
            if query_lower == keyword:
                relevance += 30
                matched_terms.append(keyword)
            elif keyword.startswith(query_lower):
                relevance += 20
                matched_terms.append(keyword)
            elif query_lower in keyword:
                relevance += 10
                matched_terms.append(keyword)
        
        # Check multi-word queries
        query_words = query_lower.split()
        if len(query_words) > 1:
            for keyword in page["content"]:
                if all(word in keyword for word in query_words):
                    relevance += 25
                    matched_terms.append(keyword)
        
        if relevance > 0:
            # Create matched content string
            matched_content = ", ".join(list(set(matched_terms))[:5])
            
            matches.append(PageMatch(
                id=page["id"],
                name=page["name"],
                path=page["path"],
                description=page["description"],
                matched_content=matched_content,
                relevance=relevance
            ))
    
    # Sort by relevance
    matches.sort(key=lambda x: x.relevance, reverse=True)
    
    # Return top 5 matches
    return matches[:5]

@router.get("/", response_model=SearchResponse)
def search_all(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not q or len(q) < 1:
        return SearchResponse()

    patterns = create_search_patterns(q)
    search_term = patterns['exact']
    
    # Search pages/content
    page_matches = search_pages(q)
    
    # Enhanced contact search with more fields and better ordering
    contact_filters = [
        Contact.name.ilike(search_term),
        Contact.relationship.ilike(search_term),
        Contact.relationship_detail.ilike(search_term),
        Contact.notes.ilike(search_term),
        Contact.email.ilike(search_term),
        Contact.phone_number.ilike(search_term),
        Contact.visit_frequency.ilike(search_term)
    ]
    
    # Add partial word matching for better results (e.g., "ish" matches "Ishan")
    for word_pattern in patterns['words']:
        contact_filters.extend([
            Contact.name.ilike(word_pattern),
            Contact.relationship_detail.ilike(word_pattern),
            Contact.notes.ilike(word_pattern)
        ])
    
    # Add starts-with matching for instant results
    contact_filters.extend([
        Contact.name.ilike(patterns['starts_with']),
        Contact.relationship.ilike(patterns['starts_with']),
        Contact.relationship_detail.ilike(patterns['starts_with'])
    ])
    
    contact_query = db.query(Contact).filter(
        Contact.user_id == current_user.id,
        Contact.is_active == True,
        or_(*contact_filters)
    )
    
    # Order by relevance: exact name match first, then starts with, then contains
    contacts = contact_query.order_by(
        case(
            (Contact.name.ilike(patterns['starts_with']), 1),
            (Contact.name.ilike(search_term), 2),
            else_=3
        ),
        Contact.name
    ).limit(10).all()

    # Enhanced interaction search with key_topics
    interaction_filters = [
        Interaction.contact_name.ilike(search_term),
        Interaction.summary.ilike(search_term),
        Interaction.full_details.ilike(search_term),
        Interaction.location.ilike(search_term),
        Interaction.mood.ilike(search_term),
        Interaction.duration.ilike(search_term)
    ]
    
    # Add word-by-word search for better matching
    for word_pattern in patterns['words']:
        interaction_filters.extend([
            Interaction.summary.ilike(word_pattern),
            Interaction.full_details.ilike(word_pattern)
        ])
    
    interactions = db.query(Interaction).filter(
        Interaction.user_id == current_user.id,
        or_(*interaction_filters)
    ).order_by(Interaction.timestamp.desc()).limit(5).all()

    # Enhanced reminder search
    reminder_filters = [
        Reminder.title.ilike(search_term),
        Reminder.notes.ilike(search_term),
        Reminder.type.ilike(search_term),
        Reminder.recurrence.ilike(search_term),
        Reminder.time.ilike(search_term)
    ]
    
    for word_pattern in patterns['words']:
        reminder_filters.extend([
            Reminder.title.ilike(word_pattern),
            Reminder.notes.ilike(word_pattern)
        ])
    
    reminders = db.query(Reminder).filter(
        Reminder.user_id == current_user.id,
        or_(*reminder_filters)
    ).order_by(
        Reminder.enabled.desc(),
        Reminder.time
    ).limit(5).all()
    
    # Enhanced alert search
    alert_filters = [
        Alert.title.ilike(search_term),
        Alert.message.ilike(search_term),
        Alert.type.ilike(search_term),
        Alert.severity.ilike(search_term)
    ]
    
    for word_pattern in patterns['words']:
        alert_filters.extend([
            Alert.title.ilike(word_pattern),
            Alert.message.ilike(word_pattern)
        ])
    
    alerts = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        or_(*alert_filters)
    ).order_by(Alert.timestamp.desc()).limit(5).all()
    
    # Enhanced SOS contact search
    sos_contacts = db.query(SOSContact).filter(
        SOSContact.user_id == current_user.id,
        or_(
            SOSContact.name.ilike(search_term),
            SOSContact.relationship.ilike(search_term),
            SOSContact.phone.ilike(search_term),
            SOSContact.email.ilike(search_term)
        )
    ).order_by(
        SOSContact.priority,
        case(
            (SOSContact.name.ilike(patterns['starts_with']), 1),
            (SOSContact.name.ilike(search_term), 2),
            else_=3
        )
    ).limit(5).all()

    return {
        "pages": page_matches,
        "contacts": contacts,
        "interactions": interactions,
        "reminders": reminders,
        "alerts": alerts,
        "sos_contacts": sos_contacts
    }
