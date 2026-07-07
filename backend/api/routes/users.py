import logging
from fastapi import APIRouter, Header, HTTPException
from services.db_service import upsert_user_login, get_user_stats

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/login")
async def register_login(x_user_id: str = Header("anonymous")):
    """Record user login timestamp"""
    logger.info(f"User {x_user_id} logged in. Updating timestamp.")
    if x_user_id != "anonymous":
        upsert_user_login(x_user_id)
    return {"status": "success"}

@router.get("/stats")
async def fetch_stats(x_user_id: str = Header("anonymous")):
    """Get user stats like last login and docs uploaded"""
    logger.info(f"Fetching stats for {x_user_id}")
    stats = get_user_stats(x_user_id)
    return {"status": "success", "data": stats}
