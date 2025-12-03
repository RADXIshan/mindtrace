import insightface
from insightface.app import FaceAnalysis
import cv2
import numpy as np
import json
import os

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
    Detect the dominant face and return its embedding vector.
    """
    # InsightFace expects BGR image (OpenCV format)
    faces = app.get(image)
    if len(faces) == 0:
        return None
    
    # Find the largest face by area
    main_face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    embedding = main_face.embedding.tolist()
    
    return {
        "embedding": embedding,
        "bbox": main_face.bbox.tolist()
    }

def register_profile(app, name, relation, image_path):
    """
    Take an image of a family member, extract embedding, and save to embeddings.json.
    """
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image at {image_path}")
        return False

    data = detect_and_embed(app, img)
    if not data:
        print(f"Error: No face detected in {image_path}")
        return False
    
    new_profile = {
        "name": name,
        "relation": relation,
        "embedding": data["embedding"]
    }

    # Ensure profiles directory exists
    os.makedirs(PROFILES_DIR, exist_ok=True)

    # Append to embeddings.json
    try:
        if os.path.exists(EMBEDDINGS_FILE):
            with open(EMBEDDINGS_FILE, "r") as f:
                db = json.load(f)
        else:
            db = []
    except Exception as e:
        print(f"Error loading database: {e}")
        db = []

    db.append(new_profile)

    try:
        with open(EMBEDDINGS_FILE, "w") as f:
            json.dump(db, f, indent=4)
    except Exception as e:
        print(f"Error saving database: {e}")
        return False

    return True

def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return np.dot(a, b) / (norm_a * norm_b)

def recognize_face(app, image, threshold=0.45):
    """
    Compare input face embedding to stored embeddings using cosine similarity.
    """
    # Get embedding for the current input
    result = detect_and_embed(app, image)
    if not result:
        return None

    current_emb = result["embedding"]

    # Load stored profiles
    try:
        if os.path.exists(EMBEDDINGS_FILE):
            with open(EMBEDDINGS_FILE, "r") as f:
                profiles = json.load(f)
        else:
            profiles = []
    except:
        profiles = []

    best_match = None
    best_score = -1

    for profile in profiles:
        score = cosine_similarity(current_emb, profile["embedding"])
        if score > best_score:
            best_score = score
            best_match = profile

    if best_score < threshold:
        return {"name": "Unknown", "relation": "Unknown", "confidence": float(best_score)}

    return {
        "name": best_match["name"],
        "relation": best_match["relation"],
        "confidence": float(best_score)
    }
