from uuid import UUID
from fastapi import HTTPException, status

def validate_uuid4(id_str: str) -> str:
    try:
        return str(UUID(id_str))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UUID")
