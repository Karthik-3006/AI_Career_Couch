import uvicorn
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Import database initialization
from backend.app.core.database import get_db
from backend.app.services.learning_service import seed_default_subjects
from backend.app.services.seed_coding_problems import seed_coding_problems

# Import routers
from backend.app.routes import auth, resume, interview, learning, coding, roadmap, admin, subscription, updates

load_dotenv()

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("backend.app")

app = FastAPI(
    title="AI Career Coach & Learning Platform API",
    description="Unified career profile, resume processing, subjects, mock interview practice, compiler sandbox, and roadmap API.",
    version="1.0.0"
)

# CORS Configuration
# React + Vite runs on http://localhost:5173 by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for clean error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception caught on request {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "An internal server error occurred.",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )

# Include API Routers under /api/v1 prefix
app.include_router(auth.router, prefix="/api/v1")
app.include_router(resume.router, prefix="/api/v1")
app.include_router(interview.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")
app.include_router(coding.router, prefix="/api/v1")
app.include_router(roadmap.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(subscription.router, prefix="/api/v1")
app.include_router(updates.router, prefix="/api/v1")

@app.on_event("startup")
def on_startup():
    logger.info("Initializing services on startup...")
    try:
        # Test connection & ensure indexes
        get_db()
        # Seed default academic/placement subjects
        seed_default_subjects()
        # Seed 200 coding practice questions
        seed_coding_problems()
    except Exception as exc:
        logger.error(f"Critical error during startup sequence: {exc}")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI Career Coach Backend REST API",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
