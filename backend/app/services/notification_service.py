from sqlalchemy.orm import Session
from backend.app.models.models import Notification

def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info"
):
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif
    except Exception as e:
        print(f"Error creating notification: {e}")
        db.rollback()
        return None
