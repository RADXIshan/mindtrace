"""
AI Routes for Summarization and RAG queries
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from ..database import get_db
from ..models import Interaction, User
from ..utils.auth import get_current_user
from ..chroma_client import get_conversation_collection
from ai_engine.summarizer import InteractionSummarizer
from ai_engine.rag_engine import InteractionRAG

router = APIRouter(
    prefix="/ai",
    tags=["AI"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models
class SummarizeRequest(BaseModel):
    interaction_ids: Optional[List[int]] = None
    days: Optional[int] = None  # Last N days
    contact_id: Optional[int] = None  # Specific contact
    summary_type: str = "brief"  # brief, detailed, analytical
    focus_areas: Optional[List[str]] = None

class RAGQueryRequest(BaseModel):
    question: str
    n_results: int = 5
    include_context: bool = True

class MultiTurnRAGRequest(BaseModel):
    question: str
    conversation_history: List[dict] = []
    n_results: int = 5

class InsightsRequest(BaseModel):
    topic: Optional[str] = None

# Initialize AI engines
summarizer = InteractionSummarizer()

@router.post("/summarize")
def summarize_interactions(
    request: SummarizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a summary of interactions
    
    Options:
    - Specific interaction IDs
    - Last N days
    - Specific contact
    - Summary type: brief, detailed, analytical
    """
    try:
        query = db.query(Interaction).filter(Interaction.user_id == current_user.id)
        
        # Filter by specific IDs
        if request.interaction_ids:
            query = query.filter(Interaction.id.in_(request.interaction_ids))
        
        # Filter by days
        if request.days:
            from datetime import datetime, timedelta
            cutoff_date = datetime.now() - timedelta(days=request.days)
            query = query.filter(Interaction.timestamp >= cutoff_date)
        
        # Filter by contact
        if request.contact_id:
            query = query.filter(Interaction.contact_id == request.contact_id)
        
        interactions = query.order_by(Interaction.timestamp.desc()).all()
        
        if not interactions:
            return {
                "summary": "No interactions found matching your criteria.",
                "interaction_count": 0,
                "time_period": None
            }
        
        # Convert to dict format
        interaction_dicts = []
        for i in interactions:
            interaction_dicts.append({
                "id": i.id,
                "contact_name": i.contact_name,
                "summary": i.summary,
                "full_details": i.full_details,
                "key_topics": i.key_topics,
                "timestamp": i.timestamp.isoformat() if i.timestamp else None
            })
        
        # Generate summary
        result = summarizer.summarize_interactions(
            interaction_dicts,
            summary_type=request.summary_type,
            focus_areas=request.focus_areas
        )
        
        return result
        
    except Exception as e:
        print(f"Error in summarize endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize/contact/{contact_id}")
def summarize_contact_interactions(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate a summary of all interactions with a specific contact"""
    try:
        from ..models import Contact
        
        # Get contact info
        contact = db.query(Contact).filter(
            Contact.id == contact_id,
            Contact.user_id == current_user.id
        ).first()
        
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        
        # Get all interactions with this contact
        interactions = db.query(Interaction).filter(
            Interaction.user_id == current_user.id,
            Interaction.contact_id == contact_id
        ).order_by(Interaction.timestamp.desc()).all()
        
        if not interactions:
            return {
                "summary": f"No interactions found with {contact.name}.",
                "interaction_count": 0,
                "contact_name": contact.name
            }
        
        # Convert to dict format
        interaction_dicts = []
        for i in interactions:
            interaction_dicts.append({
                "id": i.id,
                "contact_name": i.contact_name,
                "summary": i.summary,
                "full_details": i.full_details,
                "key_topics": i.key_topics,
                "timestamp": i.timestamp.isoformat() if i.timestamp else None
            })
        
        # Generate contact-specific summary
        result = summarizer.generate_contact_summary(interaction_dicts, contact.name)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in contact summary endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rag/query")
def rag_query(
    request: RAGQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Answer a question using RAG over interaction history
    Uses ChromaDB for semantic search and Gemini for answer generation
    """
    try:
        collection = get_conversation_collection()
        rag_engine = InteractionRAG(collection)
        
        result = rag_engine.query(
            question=request.question,
            user_id=current_user.id,
            n_results=request.n_results,
            include_context=request.include_context
        )
        
        return result
        
    except Exception as e:
        print(f"Error in RAG query endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rag/multi-turn")
def rag_multi_turn(
    request: MultiTurnRAGRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Handle multi-turn RAG conversations with context
    """
    try:
        collection = get_conversation_collection()
        rag_engine = InteractionRAG(collection)
        
        result = rag_engine.multi_turn_query(
            question=request.question,
            user_id=current_user.id,
            conversation_history=request.conversation_history,
            n_results=request.n_results
        )
        
        return result
        
    except Exception as e:
        print(f"Error in multi-turn RAG endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/insights")
def get_insights(
    request: InsightsRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate insights about interaction patterns
    """
    try:
        collection = get_conversation_collection()
        rag_engine = InteractionRAG(collection)
        
        result = rag_engine.get_insights(
            user_id=current_user.id,
            topic=request.topic
        )
        
        return result
        
    except Exception as e:
        print(f"Error in insights endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
def ai_health_check():
    """Check if AI services are configured and available"""
    import os
    
    gemini_configured = bool(os.getenv("GEMINI_API_KEY"))
    
    try:
        collection = get_conversation_collection()
        chroma_available = True
        chroma_count = collection.count()
    except Exception as e:
        chroma_available = False
        chroma_count = 0
    
    return {
        "gemini_configured": gemini_configured,
        "chroma_available": chroma_available,
        "indexed_interactions": chroma_count,
        "status": "healthy" if (gemini_configured and chroma_available) else "degraded"
    }
