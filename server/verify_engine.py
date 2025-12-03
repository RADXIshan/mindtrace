import sys
import os
import cv2

# Add current directory to path so we can import ai_engine
sys.path.append(os.getcwd())

from ai_engine.face_engine import load_models, register_profile, recognize_face

def main():
    print("Loading models...")
    app = load_models()
    print("Models loaded.")

    # Register Dad
    dad_img_path = "ai_engine/profiles/images/dad.png"
    print(f"Registering Dad from {dad_img_path}...")
    if register_profile(app, "Michael", "Father", dad_img_path):
        print("Dad registered successfully.")
    else:
        print("Failed to register Dad.")

    # Register Mom
    mom_img_path = "ai_engine/profiles/images/mom.png"
    print(f"Registering Mom from {mom_img_path}...")
    if register_profile(app, "Sarah", "Mother", mom_img_path):
        print("Mom registered successfully.")
    else:
        print("Failed to register Mom.")

    # Verify Dad
    print("Verifying Dad...")
    img = cv2.imread(dad_img_path)
    result = recognize_face(app, img)
    print("Result:", result)
    
    if result and result["name"] == "Michael":
        print("SUCCESS: Dad recognized.")
    else:
        print("FAILURE: Dad not recognized.")

    # Verify Mom
    print("Verifying Mom...")
    img = cv2.imread(mom_img_path)
    result = recognize_face(app, img)
    print("Result:", result)

    if result and result["name"] == "Sarah":
        print("SUCCESS: Mom recognized.")
    else:
        print("FAILURE: Mom not recognized.")

if __name__ == "__main__":
    main()
