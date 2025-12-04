import asyncio
from datetime import datetime, time as dt_time, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from .database import SessionLocal
from .models import Reminder, Alert, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReminderScheduler:
    def __init__(self):
        self.running = False
        self.check_interval = 60  # Check every minute
        self.last_reset_date = None
        
    async def start(self):
        """Start the scheduler"""
        self.running = True
        logger.info("Reminder scheduler started")
        
        while self.running:
            try:
                # Check if we need to reset daily reminders (at midnight)
                await self.check_daily_reset()
                
                # Check for due reminders
                await self.check_reminders()
                
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in scheduler: {e}")
                await asyncio.sleep(self.check_interval)
    
    def stop(self):
        """Stop the scheduler"""
        self.running = False
        logger.info("Reminder scheduler stopped")
    
    async def check_daily_reset(self):
        """Reset completed status for recurring reminders at midnight"""
        now = datetime.now()
        current_date = now.date()
        
        # Only reset once per day
        if self.last_reset_date == current_date:
            return
        
        # Check if it's a new day (between 00:00 and 00:01)
        if now.hour == 0 and now.minute == 0:
            db = SessionLocal()
            try:
                # Reset all completed recurring reminders
                updated = db.query(Reminder).filter(
                    and_(
                        Reminder.completed == True,
                        Reminder.enabled == True,
                        Reminder.recurrence.in_(["daily", "weekdays", "weekends", "weekly", "custom"])
                    )
                ).update({"completed": False})
                
                db.commit()
                self.last_reset_date = current_date
                logger.info(f"Reset {updated} completed reminders for new day")
            except Exception as e:
                logger.error(f"Error resetting daily reminders: {e}")
                db.rollback()
            finally:
                db.close()
    
    async def check_reminders(self):
        """Check all reminders and create alerts for due ones"""
        db = SessionLocal()
        try:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            current_day = now.strftime("%A")  # Monday, Tuesday, etc.
            
            # Get all active (non-completed and enabled) reminders
            reminders = db.query(Reminder).filter(
                and_(
                    Reminder.completed == False,
                    Reminder.enabled == True
                )
            ).all()
            
            for reminder in reminders:
                if self.should_trigger_reminder(reminder, current_time, current_day, now):
                    await self.create_reminder_alert(db, reminder)
                    # Update last_triggered timestamp
                    reminder.last_triggered = now
            
            db.commit()
        except Exception as e:
            logger.error(f"Error checking reminders: {e}")
            db.rollback()
        finally:
            db.close()
    
    def should_trigger_reminder(self, reminder: Reminder, current_time: str, current_day: str, now: datetime) -> bool:
        """Determine if a reminder should trigger based on its schedule"""
        # Parse reminder time (HH:MM format)
        reminder_time = reminder.time
        
        # Check if the time matches (within the current minute)
        if reminder_time != current_time:
            return False
        
        # Check if we already created an alert for this reminder today
        # This prevents duplicate alerts within the same day
        if self.has_alert_today(reminder, now):
            return False
        
        # Check recurrence pattern
        recurrence = reminder.recurrence.lower()
        
        if recurrence == "daily":
            return True
        
        elif recurrence == "weekly":
            # For weekly, check if it's been 7 days since last alert
            # For simplicity, we'll trigger on the same day of week as creation
            reminder_day = reminder.date.strftime("%A")
            return current_day == reminder_day
        
        elif recurrence == "weekdays":
            # Monday to Friday
            return current_day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        
        elif recurrence == "weekends":
            # Saturday and Sunday
            return current_day in ["Saturday", "Sunday"]
        
        elif recurrence == "custom":
            # For custom, we'll treat it as daily for now
            # In a real app, you'd store specific days in the reminder
            return True
        
        return False
    
    def has_alert_today(self, reminder: Reminder, now: datetime) -> bool:
        """Check if an alert was already created for this reminder today"""
        # Use last_triggered field for more efficient checking
        if reminder.last_triggered is None:
            return False
        
        # Check if last_triggered was today
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Handle timezone-aware vs naive datetime comparison
        last_triggered = reminder.last_triggered
        if last_triggered.tzinfo is not None and today_start.tzinfo is None:
            # Convert today_start to timezone-aware
            import pytz
            today_start = today_start.replace(tzinfo=pytz.UTC)
        elif last_triggered.tzinfo is None and today_start.tzinfo is not None:
            # Convert last_triggered to timezone-aware
            import pytz
            last_triggered = last_triggered.replace(tzinfo=pytz.UTC)
        
        return last_triggered >= today_start
    
    async def create_reminder_alert(self, db: Session, reminder: Reminder):
        """Create an alert for a due reminder"""
        try:
            # Determine severity based on reminder type
            severity_map = {
                "medication": "critical",
                "appointment": "warning",
                "meal": "info",
                "activity": "info",
                "hydration": "info",
                "other": "info"
            }
            
            severity = severity_map.get(reminder.type, "info")
            
            # Create alert
            alert = Alert(
                user_id=reminder.user_id,
                type="reminder",
                severity=severity,
                title=f"Reminder: {reminder.title}",
                message=f"It's time for your {reminder.type}: {reminder.title}",
                data={
                    "reminder_id": reminder.id,
                    "reminder_type": reminder.type,
                    "reminder_time": reminder.time,
                    "notes": reminder.notes
                }
            )
            
            db.add(alert)
            logger.info(f"Created alert for reminder {reminder.id}: {reminder.title}")
            
        except Exception as e:
            logger.error(f"Error creating reminder alert: {e}")

# Global scheduler instance
scheduler = ReminderScheduler()
