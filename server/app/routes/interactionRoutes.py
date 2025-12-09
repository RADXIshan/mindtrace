from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any
from pydantic import BaseModel
from datetime import datetime

from ..database import get_db
from ..models import Interaction, User, Contact
from ..utils.auth import get_current_user

router = APIRouter(
    prefix="/interactions",
    tags=["interactions"],
    responses={404: {"description": "Not found"}},
)

# Pydantic models
class InteractionBase(BaseModel):
    contact_id: Optional[int] = None
    contact_name: Optional[str] = None
    summary: Optional[str] = None
    full_details: Optional[str] = None
    key_topics: Optional[List[str]] = []
    duration: Optional[str] = None
    location: Optional[str] = None
    starred: Optional[bool] = False

class InteractionCreate(InteractionBase):
    pass

class InteractionResponse(InteractionBase):
    id: int
    user_id: int
    timestamp: datetime
    
    # Enriched fields for frontend convenience
    contact_avatar: Optional[str] = None
    contact_relationship: Optional[str] = None
    contact_color: Optional[str] = None
    contact_photo_url: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/search")
def search_interactions(
    request: Request,
    query: str,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Semantic search for interactions using ChromaDB embeddings.
    Returns interactions ranked by semantic similarity to the query.
    """
    try:
        from app.chroma_client import get_conversation_collection
        collection = get_conversation_collection()
        
        # Query ChromaDB for similar interactions
        results = collection.query(
            query_texts=[query],
            n_results=limit,
            where={"user_id": current_user.id}
        )
        
        if not results or not results['ids'] or not results['ids'][0]:
            return {"results": [], "count": 0, "query": query}
        
        # Extract interaction IDs from ChromaDB results
        interaction_ids = []
        distances = results['distances'][0] if results.get('distances') else []
        metadatas = results['metadatas'][0] if results.get('metadatas') else []
        documents = results['documents'][0] if results.get('documents') else []
        
        for i, chroma_id in enumerate(results['ids'][0]):
            # Extract interaction_id from "interaction_{id}" format
            if chroma_id.startswith("interaction_"):
                interaction_id = int(chroma_id.split("_")[1])
                interaction_ids.append({
                    "id": interaction_id,
                    "distance": distances[i] if i < len(distances) else None,
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                    "snippet": documents[i][:200] if i < len(documents) else ""
                })
        
        # Fetch full interaction details from database
        base_url = str(request.base_url).rstrip('/')
        search_results = []
        for item in interaction_ids:
            interaction = db.query(Interaction).filter(
                Interaction.id == item["id"],
                Interaction.user_id == current_user.id
            ).first()
            
            if interaction:
                # Enrich with contact info
                contact_avatar = None
                contact_relationship = None
                contact_color = None
                contact_photo_url = None
                
                if interaction.contact_id:
                    contact = db.query(Contact).filter(Contact.id == interaction.contact_id).first()
                    if contact:
                        contact_avatar = contact.avatar
                        contact_relationship = contact.relationship_detail or contact.relationship
                        contact_color = contact.color
                        # Add photo URL if contact has a photo
                        if contact.profile_photo:
                            contact_photo_url = f"{base_url}/contacts/{contact.id}/photo"
                
                result = {
                    "id": interaction.id,
                    "user_id": interaction.user_id,
                    "contact_id": interaction.contact_id,
                    "contact_name": interaction.contact_name,
                    "contact_avatar": contact_avatar,
                    "contact_relationship": contact_relationship,
                    "contact_color": contact_color,
                    "contact_photo_url": contact_photo_url,
                    "summary": interaction.summary,
                    "full_details": interaction.full_details,
                    "key_topics": interaction.key_topics,
                    "timestamp": interaction.timestamp.isoformat() if interaction.timestamp else None,
                    "duration": interaction.duration,
                    "location": interaction.location,
                    "starred": interaction.starred,
                    "similarity_score": 1 - item["distance"] if item["distance"] is not None else None,
                    "snippet": item["snippet"]
                }
                search_results.append(result)
        
        return {
            "results": search_results,
            "count": len(search_results),
            "query": query
        }
        
    except Exception as e:
        print(f"Error searching interactions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[InteractionResponse])
def get_interactions(
    request: Request,
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    starred: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Interaction).filter(Interaction.user_id == current_user.id)
    
    if starred:
        query = query.filter(Interaction.starred == True)
        
    if search:
        # Simple search implementation
        search_term = f"%{search}%"
        query = query.filter(
            (Interaction.contact_name.ilike(search_term)) | 
            (Interaction.summary.ilike(search_term))
        )
    
    interactions = query.order_by(Interaction.timestamp.desc()).offset(skip).limit(limit).all()
    
    # Enrich with contact info if available
    results = []
    for interaction in interactions:
        resp = InteractionResponse.from_orm(interaction)
        if interaction.contact_id:
            contact = db.query(Contact).filter(Contact.id == interaction.contact_id).first()
            if contact:
                resp.contact_avatar = contact.avatar
                resp.contact_relationship = contact.relationship_detail or contact.relationship
                resp.contact_color = contact.color
                # Add photo URL if contact has a photo
                if contact.profile_photo:
                    base_url = str(request.base_url).rstrip('/')
                    resp.contact_photo_url = f"{base_url}/contacts/{contact.id}/photo"
        results.append(resp)
        
    return results

@router.get("/{interaction_id}", response_model=InteractionResponse)
def get_interaction(
    interaction_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id, Interaction.user_id == current_user.id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    resp = InteractionResponse.from_orm(interaction)
    if interaction.contact_id:
        contact = db.query(Contact).filter(Contact.id == interaction.contact_id).first()
        if contact:
            resp.contact_avatar = contact.avatar
            resp.contact_relationship = contact.relationship_detail or contact.relationship
            resp.contact_color = contact.color
            # Add photo URL if contact has a photo
            if contact.profile_photo:
                base_url = str(request.base_url).rstrip('/')
                resp.contact_photo_url = f"{base_url}/contacts/{contact.id}/photo"
            
    return resp

@router.post("/", response_model=InteractionResponse)
def create_interaction(
    interaction: InteractionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # If contact_id provided, fetch name if not provided
    if interaction.contact_id and not interaction.contact_name:
        contact = db.query(Contact).filter(Contact.id == interaction.contact_id).first()
        if contact:
            interaction.contact_name = contact.name
            
    db_interaction = Interaction(**interaction.dict(), user_id=current_user.id)
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    
    # Index in ChromaDB
    try:
        from app.chroma_client import get_conversation_collection
        collection = get_conversation_collection()
        
        # Prepare text content for embedding
        # We combine summary, full_details, and key_topics
        text_content = f"Summary: {db_interaction.summary or ''}\n"
        if db_interaction.full_details:
            text_content += f"Details: {db_interaction.full_details}\n"
        if db_interaction.key_topics:
            text_content += f"Topics: {', '.join(db_interaction.key_topics)}\n"
        
        collection.add(
            ids=[f"interaction_{db_interaction.id}"],
            documents=[text_content],
            metadatas=[{
                "type": "interaction",
                "interaction_id": db_interaction.id,
                "user_id": current_user.id,
                "contact_id": db_interaction.contact_id or -1,
                "contact_name": db_interaction.contact_name or "Unknown",
                "timestamp": db_interaction.timestamp.isoformat()
            }]
        )
        print(f"Indexed interaction {db_interaction.id} in ChromaDB")
    except Exception as e:
        print(f"Error indexing interaction: {e}")
        # Don't fail the request if indexing fails, just log it
    
    return db_interaction

@router.put("/{interaction_id}/star", response_model=InteractionResponse)
def toggle_star_interaction(
    interaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id, Interaction.user_id == current_user.id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found")
    
    interaction.starred = not interaction.starred
    db.commit()
    db.refresh(interaction)
    return interaction

@router.post("/sync-to-chroma")
def sync_interactions_to_chroma(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sync all past interactions to ChromaDB.
    """
    try:
        from app.chroma_client import get_conversation_collection
        collection = get_conversation_collection()
        
        interactions = db.query(Interaction).filter(Interaction.user_id == current_user.id).all()
        
        ids = []
        documents = []
        metadatas = []
        
        for interaction in interactions:
            text_content = f"Summary: {interaction.summary or ''}\n"
            if interaction.full_details:
                text_content += f"Details: {interaction.full_details}\n"
            if interaction.key_topics:
                text_content += f"Topics: {', '.join(interaction.key_topics)}\n"
            
            ids.append(f"interaction_{interaction.id}")
            documents.append(text_content)
            metadatas.append({
                "type": "interaction",
                "interaction_id": interaction.id,
                "user_id": current_user.id,
                "contact_id": interaction.contact_id or -1,
                "contact_name": interaction.contact_name or "Unknown",
                "timestamp": interaction.timestamp.isoformat() if interaction.timestamp else ""
            })
            
        if ids:
            collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            
        return {"message": f"Synced {len(ids)} interactions to ChromaDB", "count": len(ids)}
    except Exception as e:
        print(f"Error syncing interactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@router.get("/export")
def export_interactions(
    request: Request,
    format: str = Query("csv", regex="^(csv|pdf)$"),
    search: Optional[str] = None,
    starred: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import io
    import csv
    from fastapi.responses import StreamingResponse

    # 1. Fetch Data (Same filtering logic as get_interactions)
    query = db.query(Interaction).filter(Interaction.user_id == current_user.id)
    
    if starred:
        query = query.filter(Interaction.starred == True)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Interaction.contact_name.ilike(search_term)) | 
            (Interaction.summary.ilike(search_term))
        )
    
    interactions = query.order_by(Interaction.timestamp.desc()).all()
    
    # 2. Generate File
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow(["Date", "Contact", "Relationship", "Summary", "Topics", "Duration", "Location"])
        
        # Rows
        for i in interactions:
            writer.writerow([
                i.timestamp.strftime("%Y-%m-%d %H:%M") if i.timestamp else "",
                i.contact_name or "Unknown",
                i.contact_name or "", # Placeholder logic, ideally fetch contact
                i.summary or "",
                ", ".join(i.key_topics) if i.key_topics else "",
                i.duration or "",
                i.location or ""
            ])
            
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=interactions_export.csv"}
        )

    elif format == "pdf":
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = styles["Heading1"]
        title_style.alignment = 1 # Center
        story.append(Paragraph("Interaction History Report", title_style))
        story.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d')}", styles["Normal"]))
        story.append(Spacer(1, 20))
        
        # Table Data
        data = [["Date", "Contact", "Summary", "Duration"]] # Headers
        
        style_normal = styles["Normal"]
        style_normal.fontSize = 9
        
        for i in interactions:
            # Wrap text for table cells
            date_str = i.timestamp.strftime("%Y-%m-%d") if i.timestamp else ""
            summary_trunc = (i.summary[:100] + "...") if i.summary and len(i.summary) > 100 else (i.summary or "")
            
            data.append([
                Paragraph(date_str, style_normal),
                Paragraph(i.contact_name or "Unknown", style_normal),
                Paragraph(summary_trunc, style_normal),
                Paragraph(i.duration or "", style_normal)
            ])
            
        # Table Style
        table = Table(data, colWidths=[80, 100, 280, 70])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        
        story.append(table)
        doc.build(story)
        
        buffer.seek(0)
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=interactions_export.pdf"}
        )
