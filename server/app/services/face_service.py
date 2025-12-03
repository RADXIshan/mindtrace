import os
from deepface import DeepFace
import numpy as np
import cv2

# Ensure models are downloaded or handle first run delay
# DeepFace will download models to ~/.deepface/weights/ on first use

class FaceService:
    def __init__(self):
        self.model_name = "ArcFace"
        self.detector_backend = "retinaface"

    def get_embedding(self, img_path):
        """
        Generate embedding for a face in the image.
        Returns the embedding vector (list of floats) or None if no face found.
        """
        try:
            # enforce_detection=False allows returning embedding even if detection fails slightly, 
            # but for registration we want to be strict. 
            # For now, let's be strict.
            embedding_objs = DeepFace.represent(
                img_path=img_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True
            )
            
            if embedding_objs and len(embedding_objs) > 0:
                # Return the embedding of the first detected face
                return embedding_objs[0]["embedding"]
            return None
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None

    def verify_face(self, img_path1, img_path2):
        """
        Verify if two images represent the same person.
        """
        try:
            result = DeepFace.verify(
                img1_path=img_path1,
                img2_path=img_path2,
                model_name=self.model_name,
                detector_backend=self.detector_backend
            )
            return result["verified"], result["distance"]
        except Exception as e:
            print(f"Error verifying face: {e}")
            return False, 1.0

    def compute_similarity(self, embedding1, embedding2):
        """
        Compute cosine similarity between two embeddings.
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
        
        a = np.array(embedding1)
        b = np.array(embedding2)
        
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        return np.dot(a, b) / (norm_a * norm_b)

face_service = FaceService()
