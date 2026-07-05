import logging
import sys
import os

# Add the backend directory to sys.path so modules can be found
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import compliance
from api.routes.compliance import reset_session as reset_session_handler
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
    title="MasterPol Compliance API",
    description="API for the MasterPol compliance engine.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["Compliance"])

@app.api_route("/reset", methods=["GET", "POST"])
async def reset_root():
    return await reset_session_handler()

@app.get("/")
def read_root():
    return {"message": "Welcome to the MasterPol Compliance API"}
