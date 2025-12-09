import insightface
from insightface.app import FaceAnalysis
import cv2
import numpy as np
import json
import os
import sys

# Add parent directory to path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ChromaDB client
try:
    from app.chroma_client import get_face_collection
except ImportError:
    # Fallback for when running as script
    sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app"))
    from app.chroma_client import get_face_collection

def load_models():
    """
    Load the RetinaFace and ArcFace models.
    Optimized for real-time multi-face detection with maximum performance using 'buffalo_s'.
    """
    # This provides a ~3x speedup with minimal accuracy loss for close-range faces
    # CoreML disabled due to shape mismatch errors on some MacOS versions
    app = FaceAnalysis(name="buffalo_s", providers=['CPUExecutionProvider'])
    
    # Use (320, 320) - slightly larger than 224 for better detection of small faces but still very fast
    app.prepare(ctx_id=0, det_size=(320, 320))
    return app

def detect_and_embed(app, image):
    """
    Detect all faces and return their embedding vectors.
    Optimized for real-time performance.
    """
    if image is None:
        return []
    
    # Ensure image is in correct format
    # Simple check for efficiency
    if getattr(image, 'ndim', 0) != 3:
        return []
    
    # Direct detection
    # Using the smaller model allows for faster inference
    faces = app.get(image)
    
    if len(faces) == 0:
        return []
    
    results = []
    for face in faces:
        results.append({
            "embedding": face.embedding.tolist(),
            "bbox": face.bbox.tolist(),
            "det_score": float(face.det_score) if hasattr(face, "det_score") else 1.0
        })
    
    return results

def recognize_face(app, image, threshold=0.45, user_id=None):
    """
    Compare input face embeddings to stored embeddings using ChromaDB.
    Returns a list of recognition results sorted by confidence.
    """
    # Detect faces
    detected_faces = detect_and_embed(app, image)
    
    if not detected_faces:
        return []

    # Strict confidence filtering for cleanliness
    # Buffalo_S might be slightly noisier, so we keep a reasonable threshold
    MIN_DET_SCORE = 0.5 
    detected_faces = [f for f in detected_faces if f.get("det_score", 0) >= MIN_DET_SCORE]
    
    if not detected_faces:
        return []

    # Get ChromaDB collection
    try:
        collection = get_face_collection()
        if collection.count() == 0:
            return [{
                "name": "Unknown", 
                "relation": "Unidentified Person", 
                "confidence": 0.0,
                "bbox": f["bbox"],
                "det_score": f["det_score"]
            } for f in detected_faces]
    except:
        return []

    results = []
    where_filter = {"user_id": user_id} if user_id else None

    # Batch query could be implemented here but sequential is fast enough for 1-3 faces
    for face_data in detected_faces:
        current_emb = face_data["embedding"]
        current_bbox = face_data["bbox"]
        
        try:
            # Query top 1
            query_result = collection.query(
                query_embeddings=[current_emb],
                n_results=1,
                where=where_filter
            )
            
            match_found = False
            if query_result and query_result['ids'] and len(query_result['ids'][0]) > 0:
                distance = query_result['distances'][0][0]
                similarity = 1.0 - distance
                
                # Buffalo_S produces slightly different embedding space
                # 0.45 is a good safe threshold
                if similarity > threshold:
                    metadata = query_result['metadatas'][0][0]
                    results.append({
                        "name": metadata["name"],
                        "relation": metadata["relation"],
                        "confidence": float(similarity),
                        "bbox": current_bbox,
                        "det_score": face_data["det_score"],
                        "contact_id": metadata.get("contact_id")
                    })
                    match_found = True
            
            if not match_found:
                results.append({
                    "name": "Unknown", 
                    "relation": "Unidentified Person", 
                    "confidence": 0.0,
                    "bbox": current_bbox,
                    "det_score": face_data["det_score"]
                })
                
        except Exception as e:
            print(f"Recog error: {e}")
            results.append({
                "name": "Unknown", "relation": "Error", "confidence": 0, "bbox": current_bbox
            })

    # Sort results
    results.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    return results

def sync_embeddings_from_db(app, db_session):
    """
    Sync face embeddings from database contacts with profile photos.
    """
    from app.models import Contact
    
    contacts = db_session.query(Contact).filter(
        Contact.profile_photo.isnot(None),
        Contact.is_active == True
    ).all()
    
    try:
        collection = get_face_collection()
    except Exception as e:
        return {"success": False, "error": str(e)}
    
    ids = []
    embeddings = []
    metadatas = []
    
    for contact in contacts:
        if not contact.profile_photo: continue
            
        nparr = np.frombuffer(contact.profile_photo, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None: continue
        
        # Detect
        # Note: We must use the same model (app) as used for recognition
        faces = app.get(img)
        if not faces:
            print(f"Warning: No face found in profile photo for {contact.name}")
            continue
            
        # Take largest face (assuming profile photo has main subject largest)
        faces.sort(key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
        face = faces[0]
        
        ids.append(f"contact_{contact.id}")
        embeddings.append(face.embedding.tolist())
        metadatas.append({
            "name": contact.name,
            "relation": contact.relationship_detail or contact.relationship,
            "contact_id": contact.id,
            "user_id": contact.user_id
        })
    
    if ids:
        collection.upsert(ids=ids, embeddings=embeddings, metadatas=metadatas)
        return {"success": True, "count": len(ids)}
    else:
        return {"success": True, "count": 0}
