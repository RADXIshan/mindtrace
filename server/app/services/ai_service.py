"""
AI Service for MindTrace using Google Gemini.
Provides context-aware AI assistance with access to user data.
"""

import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from google import genai
from google.genai import types

from ..models import User, Contact, Reminder, Alert, Interaction, SOSContact


class MindTraceAI:
    """AI Assistant for MindTrace with full app context."""
    
    def __init__(self):
        """Initialize the Gemini AI client."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.5-flash-lite"  
    
    def _get_user_context(self, db: Session, user: User) -> str:
        """
        Build comprehensive context about the user and their data.
        
        Args:
            db: Database session
            user: Current user
            
        Returns:
            Formatted context string
        """
        context_parts = []
        
        # User info
        context_parts.append(f"User Information:")
        context_parts.append(f"- Name: {user.full_name or 'Not set'}")
        context_parts.append(f"- Email: {user.email}")
        context_parts.append(f"- Account created: {user.created_at.strftime('%B %d, %Y') if user.created_at else 'Unknown'}")
        context_parts.append("")
        
        # Contacts
        contacts = db.query(Contact).filter(
            Contact.user_id == user.id,
            Contact.is_active == True
        ).all()
        
        if contacts:
            context_parts.append(f"Contacts ({len(contacts)} total):")
            for contact in contacts[:10]:  # Limit to first 10
                last_seen = contact.last_seen.strftime('%B %d, %Y') if contact.last_seen else 'Never'
                context_parts.append(
                    f"- {contact.name} ({contact.relationship}): "
                    f"Phone: {contact.phone_number or 'N/A'}, "
                    f"Last seen: {last_seen}"
                )
            if len(contacts) > 10:
                context_parts.append(f"... and {len(contacts) - 10} more contacts")
            context_parts.append("")
        
        # Reminders
        reminders = db.query(Reminder).filter(
            Reminder.user_id == user.id,
            Reminder.enabled == True
        ).all()
        
        if reminders:
            context_parts.append(f"Active Reminders ({len(reminders)} total):")
            for reminder in reminders[:10]:
                context_parts.append(
                    f"- {reminder.title} ({reminder.type}): "
                    f"{reminder.time}, {reminder.recurrence}"
                )
            if len(reminders) > 10:
                context_parts.append(f"... and {len(reminders) - 10} more reminders")
            context_parts.append("")
        
        # Recent Alerts
        recent_alerts = db.query(Alert).filter(
            Alert.user_id == user.id
        ).order_by(Alert.timestamp.desc()).limit(5).all()
        
        if recent_alerts:
            context_parts.append(f"Recent Alerts:")
            for alert in recent_alerts:
                status = "Read" if alert.read else "Unread"
                context_parts.append(
                    f"- [{alert.severity.upper()}] {alert.title}: "
                    f"{alert.message} ({status})"
                )
            context_parts.append("")
        
        # Recent Interactions
        recent_interactions = db.query(Interaction).filter(
            Interaction.user_id == user.id
        ).order_by(Interaction.timestamp.desc()).limit(5).all()
        
        if recent_interactions:
            context_parts.append(f"Recent Interactions:")
            for interaction in recent_interactions:
                time_str = interaction.timestamp.strftime('%B %d, %Y at %I:%M %p') if interaction.timestamp else 'Unknown'
                context_parts.append(
                    f"- {interaction.contact_name or 'Unknown'}: "
                    f"{interaction.summary or 'No summary'} ({time_str})"
                )
            context_parts.append("")
        
        # SOS Contacts
        sos_contacts = db.query(SOSContact).filter(
            SOSContact.user_id == user.id
        ).order_by(SOSContact.priority).all()
        
        if sos_contacts:
            context_parts.append(f"Emergency SOS Contacts:")
            for sos in sos_contacts:
                context_parts.append(
                    f"- {sos.name} ({sos.relationship or 'Contact'}): "
                    f"{sos.phone}, Priority: {sos.priority}"
                )
            context_parts.append("")
        
        return "\n".join(context_parts)
    
    def _strip_markdown(self, text: str) -> str:
        """
        Remove markdown formatting from text.
        
        Args:
            text: Text that may contain markdown
            
        Returns:
            Plain text without markdown formatting
        """
        import re
        
        # Remove bold (**text** or __text__)
        text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
        text = re.sub(r'__(.+?)__', r'\1', text)
        
        # Remove italic (*text* or _text_)
        text = re.sub(r'\*(.+?)\*', r'\1', text)
        text = re.sub(r'_(.+?)_', r'\1', text)
        
        # Remove inline code (`text`)
        text = re.sub(r'`(.+?)`', r'\1', text)
        
        # Remove code blocks (```text```)
        text = re.sub(r'```[\s\S]*?```', '', text)
        
        # Remove headers (# text)
        text = re.sub(r'^#{1,6}\s+(.+)$', r'\1', text, flags=re.MULTILINE)
        
        # Remove links but keep text [text](url)
        text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)
        
        # Remove horizontal rules
        text = re.sub(r'^[-*_]{3,}$', '', text, flags=re.MULTILINE)
        
        return text.strip()
    
    def _get_system_prompt(self) -> str:
        """
        Get the system prompt that defines the AI assistant's behavior.
        
        Returns:
            System prompt string
        """
        return """You are the MindTrace AI Assistant, a helpful and friendly AI companion integrated into the MindTrace smart glasses system. MindTrace helps users with memory assistance, face recognition, contact management, reminders, and emergency features.

CRITICAL FORMATTING RULE: You MUST respond in PLAIN TEXT ONLY. Do NOT use any markdown formatting whatsoever. This means:
- NO asterisks for bold or italic (no **, *, __, _)
- NO backticks for code (no `, ```)
- NO hashtags for headers (no #, ##, ###)
- NO brackets for links (no [text](url))
- NO special formatting characters at all
- Just write naturally like you're having a conversation

If you need to emphasize something, use natural language like "This is important:" or "Note that..."
If you need to list things, just use simple dashes or numbers on new lines.

**Your Role:**
- Help users navigate and use the MindTrace dashboard and features
- Answer questions about their contacts, reminders, alerts, and interactions
- Provide guidance on using face recognition features
- Assist with setting up reminders and managing schedules
- Help configure emergency SOS settings
- Offer insights about their social interactions and relationships
- Be conversational, friendly, and supportive

**Key Features You Can Help With:**

1. **Face Recognition & Contacts:**
   - View and manage contacts with photos
   - Track relationships (family, friends, doctors, etc.)
   - Record when they last saw someone
   - Add notes about people

2. **Reminders:**
   - Set up daily reminders for medications, meals, activities
   - Configure reminder times and recurrence patterns
   - Mark reminders as completed
   - Enable/disable reminders

3. **Interaction History:**
   - Review past conversations and meetings
   - See summaries of interactions
   - Track key topics discussed
   - Note duration and location of interactions

4. **Alerts & Notifications:**
   - View system alerts (visitor arrivals, missed medications, etc.)
   - Check alert severity levels
   - Mark alerts as read

5. **Emergency SOS:**
   - Configure emergency contacts
   - Set up SOS preferences (SMS, calls, location sharing)
   - Manage contact priorities

6. **Dashboard Navigation:**
   - Guide users to different sections
   - Explain features and capabilities
   - Help with profile settings

**Communication Style:**
- Be warm, friendly, and conversational
- Use emojis occasionally to be more engaging (but not excessively)
- Provide clear, actionable guidance
- When referencing user data, be specific and helpful
- If you don't have information, be honest and suggest alternatives
- Keep responses concise but informative
- Write in plain text format - DO NOT use markdown formatting (no **, *, `, #, etc.)
- Use simple line breaks and natural language instead of markdown syntax
- For lists, use simple dashes or numbers without special formatting

**Important:**
- Always respect user privacy
- Be supportive and encouraging
- Provide step-by-step guidance when needed
- Suggest relevant features based on user questions
- Help users get the most out of MindTrace

Remember: You have access to the user's current data (contacts, reminders, alerts, etc.) in the context provided. Use this information to give personalized, relevant assistance."""

    async def generate_response(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        db: Session,
        user: User
    ) -> str:
        """
        Generate an AI response using Gemini with full app context.
        
        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
            db: Database session
            user: Current user
            
        Returns:
            AI-generated response
        """
        try:
            # Build user context
            user_context = self._get_user_context(db, user)
            
            # Build conversation contents
            contents = []
            
            # Add system prompt and user context as first message
            system_message = f"{self._get_system_prompt()}\n\nCurrent User Data:\n{user_context}"
            contents.append(types.Content(
                role="user",
                parts=[types.Part(text=system_message)]
            ))
            contents.append(types.Content(
                role="model",
                parts=[types.Part(text="I understand. I'm ready to assist with MindTrace! I have access to your current data and will provide personalized, helpful guidance. How can I help you today?")]
            ))
            
            # Add conversation history (skip system messages)
            for msg in conversation_history[-10:]:  # Last 10 messages for context
                if msg["role"] in ["user", "assistant"]:
                    role = "user" if msg["role"] == "user" else "model"
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part(text=msg["content"])]
                    ))
            
            # Add current message if not already in history
            if not conversation_history or conversation_history[-1]["content"] != message:
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(text=message)]
                ))
            
            # Generate response
            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                )
            )
            
            # Strip any markdown formatting from the response
            clean_text = self._strip_markdown(response.text)
            return clean_text
            
        except Exception as e:
            print(f"Error generating AI response: {str(e)}")
            return f"I apologize, but I encountered an error processing your request. Please try again. If the issue persists, contact support."
    
    async def generate_streaming_response(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        db: Session,
        user: User
    ):
        """
        Generate a streaming AI response using Gemini.
        
        Args:
            message: User's message
            conversation_history: Previous messages in the conversation
            db: Database session
            user: Current user
            
        Yields:
            Chunks of the AI response
        """
        try:
            # Build user context
            user_context = self._get_user_context(db, user)
            
            # Build conversation contents
            contents = []
            
            # Add system prompt and user context
            system_message = f"{self._get_system_prompt()}\n\nCurrent User Data:\n{user_context}"
            contents.append(types.Content(
                role="user",
                parts=[types.Part(text=system_message)]
            ))
            contents.append(types.Content(
                role="model",
                parts=[types.Part(text="I understand. I'm ready to assist with MindTrace!")]
            ))
            
            # Add conversation history
            for msg in conversation_history[-10:]:
                if msg["role"] in ["user", "assistant"]:
                    role = "user" if msg["role"] == "user" else "model"
                    contents.append(types.Content(
                        role=role,
                        parts=[types.Part(text=msg["content"])]
                    ))
            
            # Add current message
            if not conversation_history or conversation_history[-1]["content"] != message:
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(text=message)]
                ))
            
            # Generate streaming response
            response = self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    top_p=0.95,
                    top_k=40,
                    max_output_tokens=2048,
                )
            )
            
            full_text = ""
            for chunk in response:
                if chunk.text:
                    full_text += chunk.text
            
            # Strip markdown from complete response before yielding
            clean_text = self._strip_markdown(full_text)
            yield clean_text
                    
        except Exception as e:
            print(f"Error generating streaming AI response: {str(e)}")
            yield "I apologize, but I encountered an error. Please try again."


# Global AI instance
ai_assistant = MindTraceAI()
