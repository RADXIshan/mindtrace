from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship as sa_relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    full_name = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)  # Path to profile image
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contacts = sa_relationship("Contact", back_populates="user")
    interactions = sa_relationship("Interaction", back_populates="user")
    alerts = sa_relationship("Alert", back_populates="user")
    reminders = sa_relationship("Reminder", back_populates="user")
    sos_contacts = sa_relationship("SOSContact", back_populates="user")
    sos_config = sa_relationship("SOSConfig", back_populates="user", uselist=False)

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    relationship = Column(String, nullable=False) # family, friend, doctor, etc.
    relationship_detail = Column(String, nullable=True) # e.g. "Daughter"
    avatar = Column(String, nullable=True) # Initials or URL
    color = Column(String, default="indigo")
    phone_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    visit_frequency = Column(String, nullable=True)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)
    profile_photo = Column(String, nullable=True) # Path to profile photo for face recognition
    
    user = sa_relationship("User", back_populates="contacts")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True) # Optional link to contact
    contact_name = Column(String, nullable=True) # Snapshot of name in case contact is deleted
    summary = Column(Text, nullable=True)
    full_details = Column(Text, nullable=True)
    key_topics = Column(JSON, default=list) # List of strings
    mood = Column(String, default="neutral")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    duration = Column(String, nullable=True)
    location = Column(String, nullable=True)
    starred = Column(Boolean, default=False)

    user = sa_relationship("User", back_populates="interactions")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, nullable=False) # visitor-arrival, missed-medication, etc.
    severity = Column(String, default="info") # info, warning, critical
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    read = Column(Boolean, default=False)
    data = Column(JSON, default=dict) # Extra data like personName, medicationName

    user = sa_relationship("User", back_populates="alerts")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    type = Column(String, default="medication") # medication, meal, activity, hydration
    time = Column(String, nullable=False) # HH:MM format
    recurrence = Column(String, default="daily") # daily, weekly, weekdays, weekends, custom
    completed = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), server_default=func.now()) # For specific date reminders, or just tracking creation
    last_triggered = Column(DateTime(timezone=True), nullable=True) # Track when last alert was created
    enabled = Column(Boolean, default=True) # Allow disabling without deleting

    user = sa_relationship("User", back_populates="reminders")

class SOSContact(Base):
    __tablename__ = "sos_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    relationship = Column(String, nullable=True)
    priority = Column(Integer, default=1)

    user = sa_relationship("User", back_populates="sos_contacts")

class SOSConfig(Base):
    __tablename__ = "sos_config"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    send_sms = Column(Boolean, default=True)
    make_call = Column(Boolean, default=True)
    share_location = Column(Boolean, default=True)
    record_audio = Column(Boolean, default=False)
    email_alert = Column(Boolean, default=True)
    alert_services = Column(Boolean, default=False)

    user = sa_relationship("User", back_populates="sos_config")
