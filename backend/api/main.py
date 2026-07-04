import logging
import sys
import os

# Add the backend directory to sys.path so modules can be found
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import compliance

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

app = FastAPI(
    title="MasterPol Compliance API",
    description="API for the MasterPol compliance engine.",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["Compliance"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the AlignIQ Compliance API"}
