import insightface
from insightface.app import FaceAnalysis
import cv2
import numpy as np
import json
import os
import sys

# Add parent directory to path to import from app
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
    """

    app = FaceAnalysis(name="buffalo_l")
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app

def detect_and_embed(app, image):
    """
    Detect all faces and return their embedding vectors.
    """
    # InsightFace expects BGR image (OpenCV format)
    if image is None:
        print("DEBUG: Image is None in detect_and_embed")
        return []
        
    print(f"DEBUG: Image shape: {image.shape}")
    faces = app.get(image)
    print(f"DEBUG: Detected {len(faces)} faces")
    
    if len(faces) == 0:
        return []
    
    results = []
    for idx, face in enumerate(faces):
        bbox = face.bbox.tolist()
        print(f"DEBUG: Face {idx} bbox: {bbox}")
        results.append({
            "embedding": face.embedding.tolist(),
            "bbox": bbox
        })
    
    print(f"DEBUG: Returning {len(results)} face embeddings")
    return results

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)

def recognize_face(app, image, threshold=0.45, user_id=None):
    """
    Compare input face embeddings to stored embeddings using ChromaDB.
    Returns a list of recognition results.
    """
    # Get embedding and bbox for all faces
    detected_faces = detect_and_embed(app, image)
    print(f"DEBUG: recognize_face - Processing {len(detected_faces)} detected faces")
    
    if not detected_faces:
        return []

    # Get ChromaDB collection
    try:
        collection = get_face_collection()
    except Exception as e:
        print(f"Error connecting to ChromaDB: {e}")
        return []

    results = []

    for idx, face_data in enumerate(detected_faces):
        current_emb = face_data["embedding"]
        current_bbox = face_data["bbox"]

        # Query ChromaDB
        # We query for the nearest neighbor
        # Filter by user_id if provided
        where_filter = {"user_id": user_id} if user_id else None
        
        try:
            # Check if collection is empty first
            collection_count = collection.count()
            print(f"DEBUG: ChromaDB collection has {collection_count} embeddings")
            
            if collection_count == 0:
                print(f"DEBUG: Collection is empty, marking face {idx} as Unknown")
                query_result = None
            else:
                query_result = collection.query(
                    query_embeddings=[current_emb],
                    n_results=1,
                    where=where_filter
                )
        except Exception as e:
            print(f"Error querying ChromaDB: {e}")
            query_result = None

        best_match = None
        best_score = -1
        
        # Chroma returns distance (L2 or Cosine). We configured 'cosine' space.
        # Cosine distance = 1 - Cosine Similarity.
        # So Similarity = 1 - Distance.
        # We want Similarity > threshold.
        # So 1 - Distance > threshold => Distance < 1 - threshold.
        
        if query_result and query_result['ids'] and len(query_result['ids'][0]) > 0:
            # query_result['distances'][0][0] is the distance of the best match
            distance = query_result['distances'][0][0]
            similarity = 1.0 - distance
            
            metadata = query_result['metadatas'][0][0]
            
            print(f"DEBUG: Face {idx} match: {metadata.get('name')} (sim: {similarity:.3f}, dist: {distance:.3f})")
            
            if similarity > threshold:
                best_score = similarity
                best_match = metadata

        if best_match is None:
            result = {
                "name": "Unknown", 
                "relation": "Unidentified Person", 
                "confidence": float(best_score) if best_score > 0 else 0.0,
                "bbox": current_bbox
            }
            print(f"DEBUG: Face {idx} -> Unknown (score: {best_score:.3f if best_score > 0 else 0.0})")
            results.append(result)
        else:
            match_result = {
                "name": best_match["name"],
                "relation": best_match["relation"],
                "confidence": float(best_score),
                "bbox": current_bbox
            }
            # Include contact_id if available
            if "contact_id" in best_match:
                match_result["contact_id"] = best_match["contact_id"]
            
            print(f"DEBUG: Face {idx} -> {best_match['name']} (score: {best_score:.3f})")
            results.append(match_result)
    
    print(f"DEBUG: recognize_face - Returning {len(results)} results")
    return results

def sync_embeddings_from_db(app, db_session):
    """
    Sync face embeddings from database contacts with profile photos.
    This is the ONLY way to register faces - all photos must be added through the contacts page.
    This function pushes embeddings to ChromaDB.
    """
    from app.models import Contact
    
    # Get all contacts with profile photos
    contacts = db_session.query(Contact).filter(
        Contact.profile_photo.isnot(None),
        Contact.is_active == True
    ).all()
    
    # Get ChromaDB collection
    try:
        collection = get_face_collection()
    except Exception as e:
        return {"success": False, "error": f"Failed to connect to ChromaDB: {str(e)}"}
    
    count = 0
    errors = []
    
    # Prepare batch data
    ids = []
    embeddings = []
    metadatas = []
    
    for contact in contacts:
        if not contact.profile_photo:
            print(f"Warning: No photo data for {contact.name}")
            continue
            
        # Convert binary data to OpenCV image
        nparr = np.frombuffer(contact.profile_photo, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            print(f"Error: Could not decode image for {contact.name}")
            continue
        
        # Extract embedding
        data_list = detect_and_embed(app, img)
        if not data_list:
            print(f"Error: No face detected for {contact.name}")
            continue
        
        # Use the first detected face for the profile
        data = data_list[0]
        
        # Add to batch
        ids.append(f"contact_{contact.id}")
        embeddings.append(data["embedding"])
        metadatas.append({
            "name": contact.name,
            "relation": contact.relationship_detail or contact.relationship,
            "contact_id": contact.id,
            "user_id": contact.user_id
        })
        count += 1
    
    # Upsert to ChromaDB
    if ids:
        try:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                metadatas=metadatas
            )
            print(f"Successfully synced {len(ids)} face embeddings to ChromaDB")
            return {"success": True, "count": len(ids)}
        except Exception as e:
            print(f"Error upserting to ChromaDB: {e}")
            return {"success": False, "error": str(e)}
    else:
        return {"success": True, "count": 0}
