import os
from dotenv import load_dotenv

load_dotenv()

import uvicorn
from app.app import app

PORT = int(os.getenv("PORT", 8000))

if __name__ == "__main__":
    uvicorn.run("app.app:app", host="127.0.0.1", port=PORT, reload=True)