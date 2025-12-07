import os
import asyncio
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Force reload environment variables
load_dotenv(override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from starlette.middleware.sessions import SessionMiddleware

from .database import Base, engine
from .routes.authRoutes import router as auth_router
from .routes.faceRoutes import router as face_router
from .routes.contactRoutes import router as contact_router
from .routes.interactionRoutes import router as interaction_router
from .routes.alertRoutes import router as alert_router
from .routes.reminderRoutes import router as reminder_router
from .routes.sosRoutes import router as sos_router
from .routes.chatRoutes import router as chat_router
from .routes.userRoutes import router as user_router
from .routes.searchRoutes import router as search_router
from .routes.asrRoutes import router as asr_router
from .routes.statsRoutes import router as stats_router
from .routes.aiRoutes import router as ai_router
from .scheduler import scheduler

CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")
GLASS_URL = os.getenv("GLASS_URL", "http://localhost:5174")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-should-be-in-env")

# Create Database Tables
Base.metadata.create_all(bind=engine)

# Lifespan context manager for startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Pre-load face recognition models to avoid cold start delays
    try:
        from .routes.contactRoutes import get_face_app
        import numpy as np
        import cv2
        
        print("Pre-loading face recognition models...")
        face_app = get_face_app()
        print("✓ Face recognition models loaded")
        
        # Warmup: Run a dummy inference to initialize CUDA/CPU kernels
        print("Warming up face recognition engine...")
        dummy_image = np.zeros((480, 480, 3), dtype=np.uint8)
        face_app.get(dummy_image)
        print("✓ Face recognition engine warmed up and ready")
    except Exception as e:
        print(f"⚠ Warning: Failed to pre-load face recognition models: {e}")
    
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
    GLASS_URL,
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

app.include_router(auth_router)
app.include_router(face_router, prefix="/face", tags=["Face Recognition"])
app.include_router(contact_router)
app.include_router(interaction_router)
app.include_router(alert_router)
app.include_router(reminder_router)
app.include_router(sos_router)
app.include_router(chat_router)
app.include_router(user_router)
app.include_router(search_router)
app.include_router(asr_router)
app.include_router(stats_router)
app.include_router(ai_router)

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