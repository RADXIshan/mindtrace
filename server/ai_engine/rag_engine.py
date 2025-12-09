"""
RAG (Retrieval-Augmented Generation) Engine for Interaction History
Uses ChromaDB for semantic search, PostgreSQL for structured data, and Google Gemini for answer generation
"""
import os
from typing import List, Dict, Optional
from google import genai
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

class InteractionRAG:
    def __init__(self, chroma_collection, db_session: Optional[Session] = None):
        """
        Initialize RAG engine with ChromaDB collection and database session
        
        Args:
            chroma_collection: ChromaDB collection for semantic search
            db_session: SQLAlchemy database session for structured queries
        """
        self.collection = chroma_collection
        self.db = db_session
        # The client gets the API key from the environment variable `GEMINI_API_KEY`
        self.client = genai.Client()
        self.model_name = 'gemini-2.5-flash'
    
    def _get_contact_info(self, user_id: int, contact_name: Optional[str] = None) -> List[Dict]:
        """
        Retrieve contact information from PostgreSQL
        
        Args:
            user_id: User ID
            contact_name: Optional contact name to filter by
        
        Returns:
            List of contact dictionaries
        """
        if not self.db:
            return []
        
        try:
            from app.models import Contact
            from datetime import timezone, timedelta
            
            query = self.db.query(Contact).filter(
                Contact.user_id == user_id,
                Contact.is_active == True
            )
            
            if contact_name:
                query = query.filter(Contact.name.ilike(f"%{contact_name}%"))
            
            contacts = query.all()
            
            # IST timezone (UTC+5:30)
            ist_tz = ZoneInfo("Asia/Kolkata")
            
            contact_list = []
            for contact in contacts:
                # Format last_seen to IST
                last_seen_ist = None
                if contact.last_seen:
                    # Convert to IST and format as readable string
                    if contact.last_seen.tzinfo is None:
                        # Assume UTC if no timezone
                        last_seen_dt = contact.last_seen.replace(tzinfo=timezone.utc).astimezone(ist_tz)
                    else:
                        last_seen_dt = contact.last_seen.astimezone(ist_tz)
                    last_seen_ist = last_seen_dt.strftime("%d %B %Y, %I:%M %p IST")
                
                contact_list.append({
                    "id": contact.id,
                    "name": contact.name,
                    "relationship": contact.relationship,
                    "relationship_detail": contact.relationship_detail,
                    "phone_number": contact.phone_number,
                    "email": contact.email,
                    "notes": contact.notes,
                    "visit_frequency": contact.visit_frequency,
                    "last_seen": last_seen_ist
                })
            
            return contact_list
        except Exception as e:
            print(f"Error retrieving contacts: {e}")
            return []
    
    def _get_interaction_stats(self, user_id: int, contact_id: Optional[int] = None) -> Dict:
        """
        Get interaction statistics from PostgreSQL
        
        Args:
            user_id: User ID
            contact_id: Optional contact ID to filter by
        
        Returns:
            Dictionary with interaction statistics
        """
        if not self.db:
            return {}
        
        try:
            from app.models import Interaction
            from sqlalchemy import func, desc
            from datetime import timezone, timedelta as td
            
            query = self.db.query(Interaction).filter(Interaction.user_id == user_id)
            
            if contact_id:
                query = query.filter(Interaction.contact_id == contact_id)
            
            # Total interactions
            total_count = query.count()
            
            # Most recent interaction
            most_recent = query.order_by(desc(Interaction.timestamp)).first()
            
            # Interactions by contact
            contact_counts = self.db.query(
                Interaction.contact_name,
                func.count(Interaction.id).label('count'),
                func.max(Interaction.timestamp).label('last_interaction')
            ).filter(
                Interaction.user_id == user_id
            ).group_by(
                Interaction.contact_name
            ).order_by(
                desc('count')
            ).limit(10).all()
            
            # Recent interactions (last 7 days)
            seven_days_ago = datetime.now() - timedelta(days=7)
            recent_count = query.filter(Interaction.timestamp >= seven_days_ago).count()
            
            # IST timezone (UTC+5:30)
            ist_tz = timezone(td(hours=5, minutes=30))
            
            # Format most recent date to IST
            most_recent_date_ist = None
            if most_recent and most_recent.timestamp:
                most_recent_dt = most_recent.timestamp.replace(tzinfo=timezone.utc).astimezone(ist_tz)
                most_recent_date_ist = most_recent_dt.strftime("%d %B %Y, %I:%M %p IST")
            
            return {
                "total_interactions": total_count,
                "recent_interactions_7d": recent_count,
                "most_recent_date": most_recent_date_ist,
                "most_recent_contact": most_recent.contact_name if most_recent else None,
                "top_contacts": [
                    {
                        "name": name,
                        "count": count,
                        "last_interaction": last_interaction.replace(tzinfo=timezone.utc).astimezone(ist_tz).strftime("%d %B %Y, %I:%M %p IST") if last_interaction else None
                    }
                    for name, count, last_interaction in contact_counts
                ]
            }
        except Exception as e:
            print(f"Error retrieving interaction stats: {e}")
            return {}
    
    def query(
        self, 
        question: str, 
        user_id: int,
        n_results: int = 10,
        include_context: bool = True
    ) -> Dict:
        """
        Answer a question using RAG over interaction history, contacts, and conversation data
        
        Args:
            question: User's question
            user_id: User ID to filter interactions
            n_results: Number of relevant interactions to retrieve
            include_context: Whether to include retrieved context in response
        
        Returns:
            Dictionary with answer, sources, and metadata
        """
        try:
            # Step 1: Analyze question to determine what data to retrieve
            question_lower = question.lower()
            
            # Check if question is about contacts
            is_contact_query = any(word in question_lower for word in [
                'contact', 'phone', 'email', 'relationship', 'who is', 'tell me about',
                'how often', 'visit', 'last seen', 'when did i last'
            ])
            
            # Check if question is about statistics/patterns
            is_stats_query = any(word in question_lower for word in [
                'how many', 'how often', 'frequency', 'most', 'least', 'statistics',
                'pattern', 'trend', 'total', 'count'
            ])
            
            # Step 2: Retrieve contact information if relevant
            contact_context = ""
            if is_contact_query or is_stats_query:
                # Try to extract contact name from question
                # But if asking about groups (family, friends, etc.), get all contacts
                contact_name = None
                group_keywords = ['family', 'friends', 'all', 'contacts', 'everyone', 'people', 'most recently', 'recently']
                is_group_query = any(keyword in question_lower for keyword in group_keywords)
                
                if not is_group_query:
                    # Extract potential names from the question
                    # Look for capitalized words or words after common name indicators
                    import re
                    
                    # Common patterns for asking about specific people
                    name_patterns = [
                        r'(?:about|with|see|saw|talk|spoke|met|call|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                        r'(?:is|was)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
                        r'\b([A-Z][a-z]+)(?:\s|\'s|\?|$)',
                    ]
                    
                    for pattern in name_patterns:
                        matches = re.findall(pattern, question)
                        if matches:
                            # Filter out common question words
                            excluded = {'Who', 'What', 'When', 'Where', 'Why', 'How', 'I', 'The', 'A', 'An'}
                            potential_names = [m for m in matches if m not in excluded]
                            if potential_names:
                                contact_name = potential_names[0]
                                break
                
                contacts = self._get_contact_info(user_id, contact_name)
                
                if contacts:
                    contact_context = "\n\n=== CONTACT INFORMATION ===\n"
                    contact_context += f"Total contacts found: {len(contacts)}\n"
                    for contact in contacts:
                        contact_context += f"\nContact: {contact['name']}\n"
                        contact_context += f"Relationship: {contact['relationship_detail'] or contact['relationship']}\n"
                        if contact['phone_number']:
                            contact_context += f"Phone: {contact['phone_number']}\n"
                        if contact['email']:
                            contact_context += f"Email: {contact['email']}\n"
                        if contact['visit_frequency']:
                            contact_context += f"Visit Frequency: {contact['visit_frequency']}\n"
                        if contact['last_seen']:
                            contact_context += f"Last Seen: {contact['last_seen']}\n"
                        if contact['notes']:
                            contact_context += f"Notes: {contact['notes']}\n"
                else:
                    contact_context = "\n\n=== CONTACT INFORMATION ===\nNo contacts found in the database.\n"
            
            # Step 3: Retrieve interaction statistics if relevant
            stats_context = ""
            if is_stats_query:
                stats = self._get_interaction_stats(user_id)
                
                if stats and stats.get('total_interactions', 0) > 0:
                    stats_context = "\n\n=== INTERACTION STATISTICS ===\n"
                    stats_context += f"Total Interactions: {stats.get('total_interactions', 0)}\n"
                    stats_context += f"Recent Interactions (Last 7 Days): {stats.get('recent_interactions_7d', 0)}\n"
                    
                    if stats.get('most_recent_contact'):
                        stats_context += f"Most Recent Interaction: {stats['most_recent_contact']} on {stats.get('most_recent_date', 'Unknown')}\n"
                    
                    if stats.get('top_contacts'):
                        stats_context += "\nTop Contacts by Interaction Count:\n"
                        for contact in stats['top_contacts'][:5]:
                            stats_context += f"  - {contact['name']}: {contact['count']} interactions (last: {contact['last_interaction']})\n"
                else:
                    stats_context = "\n\n=== INTERACTION STATISTICS ===\nNo interactions found in the database.\n"
            
            # Step 4: Retrieve relevant interactions from ChromaDB
            results = self.collection.query(
                query_texts=[question],
                n_results=n_results,
                where={"user_id": user_id}
            )
            
            # Step 5: Extract and format retrieved interactions
            documents = results['documents'][0] if results and results.get('documents') and results['documents'][0] else []
            metadatas = results['metadatas'][0] if results and results.get('metadatas') and results['metadatas'][0] else []
            distances = results['distances'][0] if results and results.get('distances') and results['distances'][0] else []
            
            sources = []
            context_texts = []
            
            for i, (doc, metadata, distance) in enumerate(zip(documents, metadatas, distances)):
                source = {
                    "interaction_id": metadata.get('interaction_id'),
                    "contact_name": metadata.get('contact_name', 'Unknown'),
                    "timestamp": metadata.get('timestamp'),
                    "relevance_score": round(1 - distance, 3) if distance is not None else None,
                    "snippet": doc[:200] + "..." if len(doc) > 200 else doc
                }
                sources.append(source)
                
                # Format context for LLM
                context_text = f"""
Interaction {i+1}:
Contact: {metadata.get('contact_name', 'Unknown')}
Date: {metadata.get('timestamp', 'Unknown')}
Content: {doc}
"""
                context_texts.append(context_text)
            
            # Step 6: Build comprehensive prompt for Gemini
            interaction_context = "\n".join(context_texts) if context_texts else "No relevant interactions found."
            
            prompt = f"""You are an AI assistant helping a user understand their interaction history, contacts, and relationships. 
You have access to:
1. Their contact database with names, relationships, phone numbers, emails, and notes
2. Their interaction history with conversations and meetings
3. Statistics about their communication patterns

The user asked: "{question}"

{contact_context}

{stats_context}

=== RELEVANT INTERACTIONS ===
{interaction_context}

CRITICAL INSTRUCTIONS:
- ONLY use the information provided above in the CONTACT INFORMATION, INTERACTION STATISTICS, and RELEVANT INTERACTIONS sections
- DO NOT make up, invent, or hallucinate any contact names, phone numbers, emails, or other data
- If a specific contact is not listed in CONTACT INFORMATION, you MUST say that contact is not in the database
- NEVER create example or placeholder data like "555-123-4567" or "example.com" emails
- If you don't have the information to answer the question, clearly state what information is missing

IMPORTANT - Understanding "Last Seen" vs "Interactions":
- "Last Seen" in CONTACT INFORMATION refers to when the user physically saw or met the contact in person
- "Interactions" in RELEVANT INTERACTIONS refers to recorded conversations or meetings
- If the user asks "when did I last see/saw [person]", use the "Last Seen" field from CONTACT INFORMATION
- If the user asks about conversations or what was discussed, use RELEVANT INTERACTIONS
- If you have "Last Seen" data but no interaction records, that's perfectly fine - just answer based on Last Seen
- Do NOT say "no interactions found" when you have Last Seen data - they are different things

Based ONLY on the actual data provided above, please provide a helpful, accurate, and conversational answer to the user's question.

Guidelines:
- Use ONLY information from the data sections above - never invent data
- Be specific and reference actual data when relevant
- If you have contact information (phone, email), include it when asked
- If you have statistics, use them to provide insights
- Use a friendly, conversational tone
- When answering "when did I last see X", use the Last Seen field and don't mention interactions unless asked
- If the data doesn't fully answer the question, say so honestly and explain what's missing
- If there's no data at all, tell the user they need to add contacts or record interactions first

FORMATTING INSTRUCTIONS:
- Write in PLAIN TEXT only - NO markdown formatting
- Do NOT use asterisks (*), underscores (_), or hashtags (#) for formatting
- Do NOT use bullet points with dashes (-) or asterisks (*)
- Instead of bullet points, use numbered lists (1., 2., 3.) or write in paragraph form
- Do NOT use **bold** or *italic* formatting
- Use simple line breaks and paragraphs for structure
- Write naturally as if speaking to someone

Answer:"""
            
            # Step 7: Generate answer using Gemini
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            answer = response.text
            
            return {
                "answer": answer,
                "sources": sources if include_context else [],
                "retrieved_count": len(sources),
                "question": question,
                "used_contacts": bool(contact_context),
                "used_stats": bool(stats_context)
            }
            
        except Exception as e:
            print(f"Error in RAG query: {e}")
            import traceback
            traceback.print_exc()
            return {
                "answer": f"I encountered an error while searching your data: {str(e)}",
                "sources": [],
                "retrieved_count": 0,
                "question": question,
                "error": str(e)
            }
    
    def multi_turn_query(
        self,
        question: str,
        user_id: int,
        conversation_history: List[Dict],
        n_results: int = 5
    ) -> Dict:
        """
        Handle multi-turn conversations with context from previous Q&A
        
        Args:
            question: Current question
            user_id: User ID
            conversation_history: List of previous Q&A pairs [{"question": "...", "answer": "..."}]
            n_results: Number of interactions to retrieve
        
        Returns:
            Dictionary with answer and sources
        """
        # Build conversation context
        conversation_context = ""
        if conversation_history:
            conversation_context = "\n\nPrevious conversation:\n"
            for i, turn in enumerate(conversation_history[-3:], 1):  # Last 3 turns
                conversation_context += f"Q{i}: {turn.get('question', '')}\n"
                conversation_context += f"A{i}: {turn.get('answer', '')}\n"
        
        # Enhance question with conversation context for better retrieval
        enhanced_question = question
        if conversation_context:
            enhanced_question = f"{conversation_context}\n\nCurrent question: {question}"
        
        # Use regular query with enhanced context
        result = self.query(question, user_id, n_results, include_context=True)
        
        # Add conversation history to the prompt if we're regenerating
        if conversation_history and result.get('sources'):
            # This would require modifying the prompt in query() method
            # For now, the enhanced question helps with retrieval
            pass
        
        return result
    
    def get_insights(self, user_id: int, topic: Optional[str] = None) -> Dict:
        """
        Generate insights about interaction patterns using both ChromaDB and PostgreSQL
        
        Args:
            user_id: User ID
            topic: Optional topic to focus on
        
        Returns:
            Dictionary with insights
        """
        try:
            # Get comprehensive statistics from PostgreSQL
            stats = self._get_interaction_stats(user_id)
            contacts = self._get_contact_info(user_id)
            
            # Query for recent interactions from ChromaDB
            query_text = topic if topic else "recent conversations and interactions"
            
            results = self.collection.query(
                query_texts=[query_text],
                n_results=30,
                where={"user_id": user_id}
            )
            
            # Prepare data for analysis
            documents = results['documents'][0] if results and results.get('documents') and results['documents'][0] else []
            metadatas = results['metadatas'][0] if results and results.get('metadatas') and results['metadatas'][0] else []
            
            if not documents and not stats and not contacts:
                return {
                    "insights": "Not enough data to generate insights. Start by adding contacts and recording interactions.",
                    "topic": topic
                }
            
            # Build contact context
            contact_context = ""
            if contacts:
                contact_context = "\n\n=== CONTACT DATABASE ===\n"
                contact_context += f"Total Contacts: {len(contacts)}\n\n"
                for contact in contacts[:10]:  # Top 10 contacts
                    contact_context += f"- {contact['name']} ({contact['relationship_detail'] or contact['relationship']})\n"
                    if contact['visit_frequency']:
                        contact_context += f"  Visit Frequency: {contact['visit_frequency']}\n"
                    if contact['last_seen']:
                        contact_context += f"  Last Seen: {contact['last_seen']}\n"
            
            # Build stats context
            stats_context = ""
            if stats:
                stats_context = "\n\n=== INTERACTION STATISTICS ===\n"
                stats_context += f"Total Interactions: {stats.get('total_interactions', 0)}\n"
                stats_context += f"Recent Interactions (Last 7 Days): {stats.get('recent_interactions_7d', 0)}\n"
                
                if stats.get('most_recent_contact'):
                    stats_context += f"Most Recent: {stats['most_recent_contact']} on {stats.get('most_recent_date', 'Unknown')}\n"
                
                if stats.get('top_contacts'):
                    stats_context += "\nMost Frequent Contacts:\n"
                    for contact in stats['top_contacts'][:5]:
                        stats_context += f"  - {contact['name']}: {contact['count']} interactions (last: {contact['last_interaction']})\n"
            
            # Build interaction context
            context_texts = []
            for doc, metadata in zip(documents, metadatas):
                context_texts.append(f"Contact: {metadata.get('contact_name')}, Date: {metadata.get('timestamp')}\n{doc}")
            
            interaction_context = "\n\n".join(context_texts) if context_texts else "No detailed interactions available."
            
            topic_focus = f" focusing on {topic}" if topic else ""
            
            prompt = f"""You are analyzing a user's social interactions, contacts, and communication patterns{topic_focus}.

{contact_context}

{stats_context}

=== RECENT INTERACTIONS ===
{interaction_context}

Based on ALL the data above (contacts, statistics, and interaction details), please provide comprehensive insights:

1. Relationship Overview: Who are the key people in their life and what roles do they play?

2. Communication Patterns: How often do they interact? Are there any concerning gaps or changes?

3. Social Network Health: Is their social circle diverse? Are they maintaining regular contact?

4. Topics & Interests: What do they talk about most? Any recurring themes?

5. Temporal Patterns: When do interactions typically happen? Any patterns in timing?

6. Recommendations: 
   - Who should they reach out to (haven't talked to in a while)?
   - Any relationships that need attention?
   - Suggestions for maintaining or improving social connections

Be specific, data-driven, and actionable. Reference actual names, dates, and statistics.

FORMATTING INSTRUCTIONS:
- Write in PLAIN TEXT only - NO markdown formatting
- Do NOT use asterisks (*), underscores (_), or hashtags (#) for formatting
- Do NOT use **bold** or *italic* formatting
- Use numbered lists (1., 2., 3.) for structure
- Write naturally and conversationally
- Use simple line breaks and paragraphs
"""
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            
            return {
                "insights": response.text,
                "topic": topic,
                "analyzed_interactions": len(documents),
                "total_contacts": len(contacts),
                "total_interactions": stats.get('total_interactions', 0) if stats else 0
            }
            
        except Exception as e:
            print(f"Error generating insights: {e}")
            import traceback
            traceback.print_exc()
            return {
                "insights": f"Error generating insights: {str(e)}",
                "topic": topic,
                "error": str(e)
            }
