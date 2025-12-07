"""
Interaction History Summarizer using Google Gemini
Generates summaries of interaction history with different granularities
"""
import os
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from google import genai

class InteractionSummarizer:
    def __init__(self):
        # The client gets the API key from the environment variable `GEMINI_API_KEY`
        self.client = genai.Client()
        self.model_name = 'gemini-2.0-flash-exp'
    
    def summarize_interactions(
        self, 
        interactions: List[Dict], 
        summary_type: str = "brief",
        focus_areas: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate a summary of interactions
        
        Args:
            interactions: List of interaction dictionaries
            summary_type: "brief", "detailed", or "analytical"
            focus_areas: Optional list of topics to focus on (e.g., ["health", "family"])
        
        Returns:
            Dictionary with summary text and metadata
        """
        if not interactions:
            return {
                "summary": "No interactions found for the specified period.",
                "interaction_count": 0,
                "time_period": None
            }
        
        # Prepare interaction data for summarization
        interaction_texts = []
        for i, interaction in enumerate(interactions, 1):
            timestamp = interaction.get('timestamp', 'Unknown time')
            contact_name = interaction.get('contact_name', 'Unknown')
            summary = interaction.get('summary', '')
            full_details = interaction.get('full_details', '')
            key_topics = interaction.get('key_topics', [])
            
            text = f"Interaction {i}:\n"
            text += f"Date: {timestamp}\n"
            text += f"Contact: {contact_name}\n"
            text += f"Summary: {summary}\n"
            if full_details and full_details != summary:
                text += f"Details: {full_details}\n"
            if key_topics:
                text += f"Topics: {', '.join(key_topics)}\n"
            
            interaction_texts.append(text)
        
        # Build prompt based on summary type
        prompt = self._build_prompt(
            interaction_texts, 
            summary_type, 
            focus_areas,
            len(interactions)
        )
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            summary_text = response.text
            
            # Calculate time period
            timestamps = [i.get('timestamp') for i in interactions if i.get('timestamp')]
            time_period = None
            if timestamps:
                try:
                    dates = [datetime.fromisoformat(str(ts).replace('Z', '+00:00')) for ts in timestamps]
                    earliest = min(dates)
                    latest = max(dates)
                    time_period = {
                        "start": earliest.isoformat(),
                        "end": latest.isoformat(),
                        "days": (latest - earliest).days + 1
                    }
                except:
                    pass
            
            return {
                "summary": summary_text,
                "interaction_count": len(interactions),
                "time_period": time_period,
                "summary_type": summary_type,
                "focus_areas": focus_areas
            }
            
        except Exception as e:
            print(f"Error generating summary: {e}")
            return {
                "summary": f"Error generating summary: {str(e)}",
                "interaction_count": len(interactions),
                "time_period": None,
                "error": str(e)
            }
    
    def _build_prompt(
        self, 
        interaction_texts: List[str], 
        summary_type: str,
        focus_areas: Optional[List[str]],
        count: int
    ) -> str:
        """Build the prompt for Gemini based on summary type"""
        
        interactions_block = "\n\n".join(interaction_texts)
        
        base_prompt = f"""You are analyzing {count} interactions from a personal interaction history system. 
Here are the interactions:

{interactions_block}

"""
        
        if summary_type == "brief":
            prompt = base_prompt + """
Please provide a BRIEF summary (2-3 paragraphs) covering:
1. Overall patterns and frequency of interactions
2. Main people involved and their relationships
3. Key topics or themes discussed
4. Any notable events or important moments

Keep it concise and highlight only the most important information.
"""
        
        elif summary_type == "detailed":
            prompt = base_prompt + """
Please provide a DETAILED summary covering:
1. Comprehensive overview of all interactions
2. Detailed breakdown by person/contact
3. Timeline of events and conversations
4. Key topics discussed with context
5. Emotional tone and relationship dynamics
6. Important decisions, plans, or commitments made
7. Follow-up items or unresolved matters

Be thorough and include specific details from the interactions.
"""
        
        elif summary_type == "analytical":
            prompt = base_prompt + """
Please provide an ANALYTICAL summary covering:
1. Patterns and trends in communication
2. Relationship dynamics and changes over time
3. Topic analysis: what subjects come up most frequently
4. Sentiment analysis: emotional tone of interactions
5. Network analysis: who interacts with whom
6. Insights and observations about social patterns
7. Recommendations for maintaining or improving relationships

Focus on insights, patterns, and actionable observations.
"""
        
        else:
            prompt = base_prompt + "\nPlease provide a summary of these interactions."
        
        # Add focus areas if specified
        if focus_areas:
            prompt += f"\n\nPay special attention to these topics: {', '.join(focus_areas)}"
        
        return prompt
    
    def generate_contact_summary(self, interactions: List[Dict], contact_name: str) -> Dict:
        """Generate a summary focused on a specific contact"""
        
        if not interactions:
            return {
                "summary": f"No interactions found with {contact_name}.",
                "interaction_count": 0
            }
        
        interaction_texts = []
        for i, interaction in enumerate(interactions, 1):
            timestamp = interaction.get('timestamp', 'Unknown time')
            summary = interaction.get('summary', '')
            full_details = interaction.get('full_details', '')
            key_topics = interaction.get('key_topics', [])
            
            text = f"Interaction {i} ({timestamp}):\n{summary}"
            if full_details and full_details != summary:
                text += f"\nDetails: {full_details}"
            if key_topics:
                text += f"\nTopics: {', '.join(key_topics)}"
            
            interaction_texts.append(text)
        
        interactions_block = "\n\n".join(interaction_texts)
        
        prompt = f"""You are analyzing {len(interactions)} interactions with {contact_name}.

{interactions_block}

Please provide a comprehensive summary of the relationship with {contact_name} including:
1. Frequency and pattern of interactions
2. Main topics discussed
3. Relationship dynamics and emotional tone
4. Important events or milestones
5. Current status and any pending matters
6. Suggestions for maintaining or strengthening the relationship

Be specific and reference actual interactions when relevant.
"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return {
                "summary": response.text,
                "interaction_count": len(interactions),
                "contact_name": contact_name
            }
        except Exception as e:
            print(f"Error generating contact summary: {e}")
            return {
                "summary": f"Error generating summary: {str(e)}",
                "interaction_count": len(interactions),
                "contact_name": contact_name,
                "error": str(e)
            }
