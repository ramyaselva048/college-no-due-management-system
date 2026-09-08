import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from backend.app.models.models import AuditLog

def log_audit(
    db: Session,
    user_id: Optional[int],
    action: str,
    entity_type: str,
    entity_id: Optional[int] = None,
    old_values: Optional[Any] = None,
    new_values: Optional[Any] = None,
    ip_address: Optional[str] = None
):
    try:
        old_str = json.dumps(old_values, default=str) if old_values is not None else None
        new_str = json.dumps(new_values, default=str) if new_values is not None else None
        
        log = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_str,
            new_values=new_str,
            ip_address=ip_address
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Error recording audit log: {e}")
        db.rollback()
