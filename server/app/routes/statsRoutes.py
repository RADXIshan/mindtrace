from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from datetime import datetime, timedelta, timezone
from typing import Dict

from ..database import get_db
from ..models import Interaction, Alert, Reminder, User
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/stats",
    tags=["stats"],
    responses={404: {"description": "Not found"}},
)

@router.get("/dashboard")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get dashboard statistics for the current user.
    Returns:
    - visitors: unique contacts seen today
    - conversations: total interactions count
    - unreadAlerts: count of unread alerts
    - upcomingReminders: count of incomplete reminders
    """
    
    # Get today's date range (start of day to now) - timezone aware
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Debug: Log the date range being used
    print(f"[Stats] Checking visitors from {today_start} to {now}")
    print(f"[Stats] User ID: {current_user.id}")
    
    # Count unique visitors today (unique contact_ids in interactions)
    visitors_today = db.query(func.count(distinct(Interaction.contact_id))).filter(
        Interaction.user_id == current_user.id,
        Interaction.contact_id.isnot(None),  # Only count interactions with known contacts
        Interaction.timestamp >= today_start
    ).scalar() or 0
    
    # Debug: Check all interactions today
    all_interactions_today = db.query(Interaction).filter(
        Interaction.user_id == current_user.id,
        Interaction.timestamp >= today_start
    ).all()
    print(f"[Stats] Total interactions today: {len(all_interactions_today)}")
    for interaction in all_interactions_today:
        print(f"[Stats] - Interaction {interaction.id}: contact_id={interaction.contact_id}, timestamp={interaction.timestamp}")
    
    # Total conversations (all interactions)
    total_conversations = db.query(func.count(Interaction.id)).filter(
        Interaction.user_id == current_user.id
    ).scalar() or 0
    
    # Unread alerts
    unread_alerts = db.query(func.count(Alert.id)).filter(
        Alert.user_id == current_user.id,
        Alert.read == False
    ).scalar() or 0
    
    # Upcoming reminders (not completed and enabled)
    upcoming_reminders = db.query(func.count(Reminder.id)).filter(
        Reminder.user_id == current_user.id,
        Reminder.completed == False,
        Reminder.enabled == True
    ).scalar() or 0
    
    print(f"[Stats] Results - visitors: {visitors_today}, conversations: {total_conversations}, alerts: {unread_alerts}, reminders: {upcoming_reminders}")
    
    return {
        "visitors": visitors_today,
        "conversations": total_conversations,
        "unreadAlerts": unread_alerts,
        "upcomingReminders": upcoming_reminders
    }
