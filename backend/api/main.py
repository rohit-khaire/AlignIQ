import logging
import sys
import os

# Add the backend directory to sys.path so modules can be found
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import compliance
from api.routes import users
from services.db_service import init_db
from contextlib import asynccontextmanager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logging.info("Initializing database and storage directories...")
    
    # Ensure directories exist for cloud deployments (Render/Heroku)
    base_dir = os.path.dirname(os.path.dirname(__file__))
    os.makedirs(os.path.join(base_dir, "uploads"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "reports"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "data"), exist_ok=True)
    
    init_db()
    yield
    logging.info("Shutting down...")

app = FastAPI(
    title="AlignIQ Compliance API",
    description="API for the AlignIQ compliance engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS — explicit origins for deployment; use env ALLOWED_ORIGINS comma-separated
_allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["compliance"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the AlignIQ Compliance API", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "aligniq-api"}
