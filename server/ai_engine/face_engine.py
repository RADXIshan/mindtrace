import insightface
from insightface.app import FaceAnalysis
import cv2
import numpy as np
import json
import os
import sys

# Add parent directory to path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Define paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")
EMBEDDINGS_FILE = os.path.join(PROFILES_DIR, "embeddings.json")

def load_models():
    """
    Load the RetinaFace and ArcFace models.
    """
    # buffalo_l contains RetinaFace + ArcFace
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
    for face in faces:
        results.append({
            "embedding": face.embedding.tolist(),
            "bbox": face.bbox.tolist()
        })
    
    return results

# Removed register_profile function - profiles are now only registered through database contacts
# Use sync_embeddings_from_db() to sync from database

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)

def recognize_face(app, image, threshold=0.45):
    """
    Compare input face embeddings to stored embeddings using cosine similarity.
    Returns a list of recognition results.
    """
    # Get embedding and bbox for all faces
    detected_faces = detect_and_embed(app, image)
    if not detected_faces:
        return []

    # Load stored profiles
    try:
        if os.path.exists(EMBEDDINGS_FILE):
            with open(EMBEDDINGS_FILE, "r") as f:
                profiles = json.load(f)
        else:
            profiles = []
    except:
        profiles = []

    results = []

    for face_data in detected_faces:
        current_emb = face_data["embedding"]
        current_bbox = face_data["bbox"]

        best_match = None
        best_score = -1

        for profile in profiles:
            score = cosine_similarity(current_emb, profile["embedding"])
            if score > best_score:
                best_score = score
                best_match = profile

        if best_score < threshold:
            results.append({
                "name": "Unknown", 
                "relation": "Unknown", 
                "confidence": float(best_score),
                "bbox": current_bbox
            })
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
            
            results.append(match_result)
    
    return results

def sync_embeddings_from_db(app, db_session):
    """
    Sync face embeddings from database contacts with profile photos.
    This is the ONLY way to register faces - all photos must be added through the contacts page.
    This function replaces the embeddings.json with data from the database.
    """
    from app.models import Contact
    
    # Get all contacts with profile photos
    contacts = db_session.query(Contact).filter(
        Contact.profile_photo.isnot(None),
        Contact.is_active == True
    ).all()
    
    embeddings_db = []
    
    for contact in contacts:
        if not contact.profile_photo or not os.path.exists(contact.profile_photo):
            print(f"Warning: Photo not found for {contact.name}: {contact.profile_photo}")
            continue
            
        # Read and process the image
        img = cv2.imread(contact.profile_photo)
        if img is None:
            print(f"Error: Could not read image for {contact.name}")
            continue
        
        # Extract embedding
        data_list = detect_and_embed(app, img)
        if not data_list:
            print(f"Error: No face detected for {contact.name}")
            continue
        
        # Use the first detected face for the profile
        data = data_list[0]
        
        # Add to embeddings database
        embeddings_db.append({
            "name": contact.name,
            "relation": contact.relationship_detail or contact.relationship,
            "embedding": data["embedding"],
            "contact_id": contact.id
        })
    
    # Save to embeddings.json
    os.makedirs(PROFILES_DIR, exist_ok=True)
    try:
        with open(EMBEDDINGS_FILE, "w") as f:
            json.dump(embeddings_db, f, indent=4)
        print(f"Successfully synced {len(embeddings_db)} face embeddings from database")
        return {"success": True, "count": len(embeddings_db)}
    except Exception as e:
        print(f"Error saving embeddings: {e}")
        return {"success": False, "error": str(e)}
