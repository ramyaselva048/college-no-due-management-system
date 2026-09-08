import sys
import getpass
from backend.app.core.database import SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.models.models import User

def create_admin(email: str = None, password: str = None):
    db = SessionLocal()
    try:
        if not email:
            email = input("Admin Email: ").strip().lower()
        if not password:
            password = getpass.getpass("Admin Password: ").strip()

        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.role != "ADMIN":
                existing.role = "ADMIN"
                existing.password_hash = get_password_hash(password)
                existing.is_active = True
                db.commit()
                print(f"Existing user {email} upgraded to ADMIN successfully.")
            else:
                existing.password_hash = get_password_hash(password)
                db.commit()
                print(f"Admin password for {email} updated successfully.")
            return

        user = User(
            email=email,
            password_hash=get_password_hash(password),
            role="ADMIN",
            is_active=True
        )
        db.add(user)
        db.commit()
        print(f"Admin user {email} created successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    e = sys.argv[1] if len(sys.argv) > 1 else None
    p = sys.argv[2] if len(sys.argv) > 2 else None
    create_admin(e, p)
