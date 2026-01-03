"""Utility for capturing and persisting PagBank homologation logs."""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

# Base directory for homologation logs
# Using /data to ensure persistence on Fly.io volumes
LOG_DIR = Path("/data/homologation") if os.path.exists("/data") else Path("logs/homologation")

class HomologationLogger:
    """Handles saving PagBank request/response logs to files."""

    @staticmethod
    def _ensure_dir():
        """Ensure the log directory exists."""
        if not LOG_DIR.exists():
            try:
                LOG_DIR.mkdir(parents=True, exist_ok=True)
                # Ensure it's writable
                os.chmod(LOG_DIR, 0o777)
                logger.info(f"Created homologation log directory: {LOG_DIR}")
            except Exception as e:
                logger.error(f"Failed to create log directory {LOG_DIR}: {e}")

    @classmethod
    async def save_log(
        cls, 
        order_id: str, 
        activity: str, 
        endpoint: str,
        method: str,
        request_headers: Dict[str, str],
        request_body: Any,
        response_status: int,
        response_headers: Dict[str, str],
        response_body: Any
    ):
        """
        Save a full request/response log to a file.
        
        Args:
            order_id: The PagBank order ID or reference
            activity: Description of the action (e.g., "Create Order", "Status Check")
            endpoint: The full URL called
            method: HTTP method
            request_headers: Dict of request headers (sensitive tokens should be masked)
            request_body: Request payload (dict or str)
            response_status: HTTP status code
            response_headers: Dict of response headers
            response_body: Response body (dict or str)
        """
        # Feature flag check
        if os.getenv("PAGBANK_ENABLE_HOMOLOGATION_LOGS", "false").lower() != "true":
            return

        cls._ensure_dir()

        timestamp = datetime.utcnow().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"{timestamp}_{order_id}_{activity.replace(' ', '_')}.txt"
        filepath = LOG_DIR / filename

        # Mask Authorization header
        safe_req_headers = {k: ("***" if k.lower() == "authorization" else v) for k, v in request_headers.items()}

        content = []
        content.append("=" * 80)
        content.append(f"ACTIVITY: {activity}")
        content.append(f"TIMESTAMP: {datetime.utcnow().isoformat()}Z")
        content.append(f"ORDER ID: {order_id}")
        content.append("=" * 80)
        content.append("")
        content.append(f"API ENDPOINT: {endpoint}")
        content.append(f"METHOD: {method}")
        content.append("")
        content.append("--- REQUEST HEADERS ---")
        content.append(json.dumps(safe_req_headers, indent=2))
        content.append("")
        content.append("--- REQUEST BODY ---")
        if isinstance(request_body, (dict, list)):
            content.append(json.dumps(request_body, indent=2))
        else:
            content.append(str(request_body))
        content.append("")
        content.append("=" * 80)
        content.append("")
        content.append(f"RESPONSE STATUS: {response_status}")
        content.append("")
        content.append("--- RESPONSE HEADERS ---")
        content.append(json.dumps(dict(response_headers), indent=2))
        content.append("")
        content.append("--- RESPONSE BODY ---")
        if isinstance(response_body, (dict, list)):
            content.append(json.dumps(response_body, indent=2))
        else:
            content.append(str(response_body))
        content.append("")
        content.append("=" * 80)

        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write("\n".join(content))
            logger.info(f"Saved homologation log: {filepath}")
        except Exception as e:
            logger.error(f"Failed to save homologation log to {filepath}: {e}")

    @classmethod
    def list_logs(cls) -> list[Dict[str, Any]]:
        """List all captured log files."""
        if os.getenv("PAGBANK_ENABLE_HOMOLOGATION_LOGS", "false").lower() != "true":
            return []
            
        if not LOG_DIR.exists():
            return []
        
        logs = []
        for file in LOG_DIR.glob("*.txt"):
            stats = file.stat()
            logs.append({
                "filename": file.name,
                "size_bytes": stats.st_size,
                "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat()
            })
        
        # Sort by creation time descending
        return sorted(logs, key=lambda x: x["created_at"], reverse=True)

    @classmethod
    def get_log_content(cls, filename: str) -> Optional[str]:
        """Read the content of a specific log file."""
        if os.getenv("PAGBANK_ENABLE_HOMOLOGATION_LOGS", "false").lower() != "true":
            return None

        # Security: prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return None
            
        filepath = LOG_DIR / filename
        if not filepath.exists():
            return None
            
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Error reading log file {filename}: {e}")
            return None
