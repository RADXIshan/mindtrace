import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware

from .database import Base, engine
from .routes.authRoutes import router as auth_router

CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-should-be-in-env")

# Create Database Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MindTrace",
    version="1.0",
    description="API for MindTrace",
)

origins = [
    CLIENT_URL,
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.add_middleware(SessionMiddleware,secret_key=SECRET_KEY)

app.include_router(auth_router)

@app.get("/")
def server_status():
    return JSONResponse(content={ "message": "Server is live" }, status_code=200)
