"""Temporary admin-only router for PagBank homologation logs."""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from app.api.dependencies import get_current_admin_user
from app.core.homologation_logger import HomologationLogger
from app.models.user import User as PydanticUser

router = APIRouter(prefix="/api/admin/pagbank", tags=["Admin PagBank Homologation"])

@router.get("/logs")
async def list_pagbank_logs():
    """List all captured PagBank homologation logs (Temporary/Unauthenticated for ease of access)."""
    return HomologationLogger.list_logs()

@router.get("/logs/{filename}")
async def get_pagbank_log(
    filename: str
):
    """Retrieve the content of a specific log file (Temporary/Unauthenticated for ease of access)."""
    content = HomologationLogger.get_log_content(filename)
    if not content:
        raise HTTPException(status_code=404, detail="Log not found")
    
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
