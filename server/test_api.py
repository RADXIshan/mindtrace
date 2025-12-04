import requests
import os

url = "http://127.0.0.1:8000/face/recognize"
image_path = r"c:\Users\colin\OneDrive\Desktop\mindtrace\server\ai_engine\profiles\images\colin_1.jpg"

if not os.path.exists(image_path):
    print(f"File not found: {image_path}")
    exit(1)

files = {'file': open(image_path, 'rb')}

try:
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
