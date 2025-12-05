import insightface
from insightface.app import FaceAnalysis
import cv2
import numpy as np
import json
import os
import sys

# Add parent directory to path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILES_DIR = os.path.join(BASE_DIR, "profiles")
EMBEDDINGS_FILE = os.path.join(PROFILES_DIR, "embeddings.json")

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

# Removed register_profile function - profiles are now only registered through database contacts
# Use sync_embeddings_from_db() to sync from database

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)

# Cache for embeddings with file modification time tracking
_embeddings_cache = {
    "profiles": [],
    "mtime": 0
}

def load_embeddings_with_cache():
    """
    Load embeddings from file with caching based on file modification time.
    This ensures we always use fresh data when the file is updated.
    """
    global _embeddings_cache
    
    try:
        if os.path.exists(EMBEDDINGS_FILE):
            current_mtime = os.path.getmtime(EMBEDDINGS_FILE)
            
            # Only reload if file has been modified
            if current_mtime != _embeddings_cache["mtime"]:
                with open(EMBEDDINGS_FILE, "r") as f:
                    profiles = json.load(f)
                _embeddings_cache["profiles"] = profiles
                _embeddings_cache["mtime"] = current_mtime
                print(f"DEBUG: Reloaded {len(profiles)} embeddings from file (mtime: {current_mtime})")
            
            return _embeddings_cache["profiles"]
        else:
            return []
    except Exception as e:
        print(f"Error loading embeddings: {e}")
        return []

def recognize_face(app, image, threshold=0.45):
    """
    Compare input face embeddings to stored embeddings using cosine similarity.
    Returns a list of recognition results.
    """
    # Get embedding and bbox for all faces
    detected_faces = detect_and_embed(app, image)
    print(f"DEBUG: recognize_face - Processing {len(detected_faces)} detected faces")
    
    if not detected_faces:
        return []

    # Load stored profiles with caching
    profiles = load_embeddings_with_cache()
    
    if not profiles:
        print("DEBUG: No profiles loaded - all faces will be marked as Unknown")
    else:
        print(f"DEBUG: Loaded {len(profiles)} profiles for comparison")

    results = []

    for idx, face_data in enumerate(detected_faces):
        current_emb = face_data["embedding"]
        current_bbox = face_data["bbox"]

        best_match = None
        best_score = -1

        # Compare against all stored profiles
        for profile in profiles:
            score = cosine_similarity(current_emb, profile["embedding"])
            if score > best_score:
                best_score = score
                best_match = profile

        if best_score < threshold or best_match is None:
            result = {
                "name": "Unknown", 
                "relation": "Unknown", 
                "confidence": float(best_score) if best_score > 0 else 0.0,
                "bbox": current_bbox
            }
            print(f"DEBUG: Face {idx} -> Unknown (score: {best_score:.3f})")
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
        
        # Force cache invalidation by updating the global cache
        global _embeddings_cache
        _embeddings_cache["profiles"] = embeddings_db
        _embeddings_cache["mtime"] = os.path.getmtime(EMBEDDINGS_FILE)
        
        print(f"Successfully synced {len(embeddings_db)} face embeddings from database")
        print(f"Cache updated with {len(embeddings_db)} profiles")
        return {"success": True, "count": len(embeddings_db)}
    except Exception as e:
        print(f"Error saving embeddings: {e}")
        return {"success": False, "error": str(e)}
