import os
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Force reload environment variables
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from .database import Base, engine
from .routes.authRoutes import router as auth_router
from .routes.faceRoutes import router as face_router
from .routes.contactRoutes import router as contact_router
from .routes.interactionRoutes import router as interaction_router
from .routes.alertRoutes import router as alert_router
from .routes.reminderRoutes import router as reminder_router
from .routes.sosRoutes import router as sos_router
from .routes.userRoutes import router as user_router
from .scheduler import scheduler

CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-should-be-in-env")

# Create Database Tables
Base.metadata.create_all(bind=engine)

# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the reminder scheduler
    scheduler_task = asyncio.create_task(scheduler.start())
    yield
    # Shutdown: Stop the scheduler
    scheduler.stop()
    scheduler_task.cancel()
    try:
        await scheduler_task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="MindTrace",
    version="1.0",
    description="API for MindTrace",
    lifespan=lifespan
)

origins = [
    CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:5174",
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

# Mount static files for profile photos and profile images
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS_DIR = os.path.join(BASE_DIR, "ai_engine", "profiles", "images")
PROFILE_IMAGES_DIR = os.path.join(BASE_DIR, "static", "profile_images")
os.makedirs(PHOTOS_DIR, exist_ok=True)
os.makedirs(PROFILE_IMAGES_DIR, exist_ok=True)
app.mount("/static/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")
app.mount("/static/profile_images", StaticFiles(directory=PROFILE_IMAGES_DIR), name="profile_images")

app.include_router(auth_router)
app.include_router(face_router, prefix="/face", tags=["Face Recognition"])
app.include_router(contact_router)
app.include_router(interaction_router)
app.include_router(alert_router)
app.include_router(reminder_router)
app.include_router(sos_router)
app.include_router(user_router)

@app.get("/")
def server_status():
    return JSONResponse(content={ "message": "Server is live" }, status_code=200)

@app.get("/health/scheduler")
def scheduler_health():
    """Check if the reminder scheduler is running"""
    from .scheduler import scheduler
    return {
        "running": scheduler.running,
        "check_interval": scheduler.check_interval,
        "last_reset_date": str(scheduler.last_reset_date) if scheduler.last_reset_date else None
    }