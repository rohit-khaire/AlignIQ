"""In-memory analysis progress for live frontend updates."""

import time
from typing import Any

_progress: dict[str, dict[str, Any]] = {}

STEPS = [
    {"id": "upload", "label": "Uploading document"},
    {"id": "extract", "label": "Extracting text from PDF"},
    {"id": "structure", "label": "Structuring policies"},
    {"id": "index", "label": "Indexing in knowledge base"},
    {"id": "analyze", "label": "Running compliance gap analysis"},
    {"id": "insights", "label": "Generating consulting deliverable"},
    {"id": "complete", "label": "Analysis complete"},
]


def reset_progress(user_id: str) -> None:
    _progress[user_id] = {
        "step": "upload",
        "step_index": 0,
        "percent": 2,
        "message": "Uploading document…",
        "detail": None,
        "status": "running",
        "started_at": time.time(),
        "policies_extracted": 0,
        "policies_analyzed": 0,
        "policies_total": 10,
    }


def set_progress(
    user_id: str,
    step: str,
    message: str,
    percent: int,
    detail: str | None = None,
    **extra,
) -> None:
    step_index = next((i for i, s in enumerate(STEPS) if s["id"] == step), 0)
    state = _progress.get(user_id, {})
    state.update({
        "step": step,
        "step_index": step_index,
        "percent": min(99, max(0, percent)),
        "message": message,
        "detail": detail,
        "status": "running",
        "updated_at": time.time(),
        **extra,
    })
    _progress[user_id] = state


def complete_progress(user_id: str, policies_extracted: int = 0) -> None:
    _progress[user_id] = {
        "step": "complete",
        "step_index": len(STEPS) - 1,
        "percent": 100,
        "message": "Analysis complete",
        "detail": f"Extracted {policies_extracted} policies" if policies_extracted else "Ready to view report",
        "status": "complete",
        "updated_at": time.time(),
    }


def fail_progress(user_id: str, message: str) -> None:
    state = _progress.get(user_id, {})
    state.update({"status": "error", "message": message, "percent": state.get("percent", 0)})
    _progress[user_id] = state


def cancel_progress(user_id: str) -> None:
    state = _progress.get(user_id, {})
    state.update({
        "status": "cancelled",
        "message": "Analysis cancelled",
        "detail": None,
        "step": "cancelled",
    })
    _progress[user_id] = state


def get_progress(user_id: str) -> dict[str, Any]:
    return _progress.get(user_id, {
        "step": "idle",
        "step_index": 0,
        "percent": 0,
        "message": "Waiting to start…",
        "detail": None,
        "status": "idle",
    })


def get_steps() -> list[dict]:
    return STEPS
