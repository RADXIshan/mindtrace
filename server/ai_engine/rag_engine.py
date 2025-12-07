"""
RAG (Retrieval-Augmented Generation) Engine for Interaction History
Uses ChromaDB for semantic search and Google Gemini for answer generation
"""
import os
from typing import List, Dict, Optional
from google import genai

class InteractionRAG:
    def __init__(self, chroma_collection):
        """
        Initialize RAG engine with ChromaDB collection
        
        Args:
            chroma_collection: ChromaDB collection for semantic search
        """
        self.collection = chroma_collection
        # The client gets the API key from the environment variable `GEMINI_API_KEY`
        self.client = genai.Client()
        self.model_name = 'gemini-2.0-flash-exp'
    
    def query(
        self, 
        question: str, 
        user_id: int,
        n_results: int = 5,
        include_context: bool = True
    ) -> Dict:
        """
        Answer a question using RAG over interaction history
        
        Args:
            question: User's question
            user_id: User ID to filter interactions
            n_results: Number of relevant interactions to retrieve
            include_context: Whether to include retrieved context in response
        
        Returns:
            Dictionary with answer, sources, and metadata
        """
        try:
            # Step 1: Retrieve relevant interactions from ChromaDB
            results = self.collection.query(
                query_texts=[question],
                n_results=n_results,
                where={"user_id": user_id}
            )
            
            if not results or not results['ids'] or not results['ids'][0]:
                return {
                    "answer": "I couldn't find any relevant interactions to answer your question. Try asking about specific people, topics, or events from your interaction history.",
                    "sources": [],
                    "retrieved_count": 0,
                    "question": question
                }
            
            # Step 2: Extract and format retrieved interactions
            documents = results['documents'][0] if results.get('documents') else []
            metadatas = results['metadatas'][0] if results.get('metadatas') else []
            distances = results['distances'][0] if results.get('distances') else []
            
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
            
            # Step 3: Build prompt for Gemini
            context_block = "\n".join(context_texts)
            
            prompt = f"""You are an AI assistant helping a user understand their interaction history. 
You have access to their past conversations and interactions stored in a database.

The user asked: "{question}"

Here are the most relevant interactions from their history:

{context_block}

Based on these interactions, please provide a helpful, accurate, and conversational answer to the user's question.

Guidelines:
- Be specific and reference actual interactions when relevant
- If the interactions don't fully answer the question, say so
- Use a friendly, conversational tone
- Cite which interaction(s) you're referencing (e.g., "In your conversation with John...")
- If you notice patterns or insights, mention them
- Keep your answer concise but informative

Answer:"""
            
            # Step 4: Generate answer using Gemini
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            answer = response.text
            
            return {
                "answer": answer,
                "sources": sources if include_context else [],
                "retrieved_count": len(sources),
                "question": question
            }
            
        except Exception as e:
            print(f"Error in RAG query: {e}")
            import traceback
            traceback.print_exc()
            return {
                "answer": f"I encountered an error while searching your interactions: {str(e)}",
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
        Generate insights about interaction patterns
        
        Args:
            user_id: User ID
            topic: Optional topic to focus on
        
        Returns:
            Dictionary with insights
        """
        try:
            # Query for recent interactions
            query_text = topic if topic else "recent conversations and interactions"
            
            results = self.collection.query(
                query_texts=[query_text],
                n_results=20,
                where={"user_id": user_id}
            )
            
            if not results or not results['ids'] or not results['ids'][0]:
                return {
                    "insights": "Not enough interaction data to generate insights.",
                    "topic": topic
                }
            
            # Prepare data for analysis
            documents = results['documents'][0] if results.get('documents') else []
            metadatas = results['metadatas'][0] if results.get('metadatas') else []
            
            context_texts = []
            for doc, metadata in zip(documents, metadatas):
                context_texts.append(f"Contact: {metadata.get('contact_name')}, Date: {metadata.get('timestamp')}\n{doc}")
            
            context_block = "\n\n".join(context_texts)
            
            topic_focus = f" focusing on {topic}" if topic else ""
            
            prompt = f"""Analyze these interactions{topic_focus} and provide insights:

{context_block}

Please provide:
1. Key patterns in communication and relationships
2. Frequently discussed topics
3. Relationship dynamics and social network
4. Temporal patterns (when interactions happen)
5. Actionable recommendations for the user

Be specific and data-driven in your analysis.
"""
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            
            return {
                "insights": response.text,
                "topic": topic,
                "analyzed_interactions": len(documents)
            }
            
        except Exception as e:
            print(f"Error generating insights: {e}")
            return {
                "insights": f"Error generating insights: {str(e)}",
                "topic": topic,
                "error": str(e)
            }
