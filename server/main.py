import os
from dotenv import load_dotenv

# Force reload environment variables
load_dotenv(override=True)

import uvicorn
from app.app import app

PORT = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    print("Starting MindTrace Server...", flush=True)
    uvicorn.run("app.app:app", host="127.0.0.1", port=PORT, reload=False)