import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import (
    verify_password, get_password_hash,
    create_access_token, create_refresh_token, decode_token
)
from backend.app.models.models import User, Student, Staff, RefreshToken, Department, Course
from backend.app.schemas.schemas import UserLogin, UserSignUp, TokenResponse, RefreshTokenRequest, PasswordResetRequest
from backend.app.routers.deps import get_current_user
from backend.app.services.audit_service import log_audit

COLLEGE_ADMIN_EMAIL = "ramya@sasurie.edu"

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0]
    return request.client.host if request.client else "unknown"

@router.post("/signup", response_model=TokenResponse)
def signup(payload: UserSignUp, request: Request, db: Session = Depends(get_db)):
    # 1. Check if email exists
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )

    # 2. Check if register number exists
    existing_reg = db.query(Student).filter(Student.register_number == payload.register_number.upper()).first()
    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A student with this Register / Roll Number already exists"
        )

    # 3. Check department & course validity
    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    
    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # 4. Create User
    hashed_pwd = get_password_hash(payload.password)
    user = User(
        email=payload.email.lower(),
        password_hash=hashed_pwd,
        role="STUDENT",
        is_active=True
    )
    db.add(user)
    db.flush()

    # 5. Create Student Profile
    student = Student(
        user_id=user.id,
        register_number=payload.register_number.upper(),
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        department_id=payload.department_id,
        course_id=payload.course_id,
        year=payload.year,
        section=payload.section.upper(),
        admission_year=payload.admission_year
    )
    db.add(student)
    db.commit()
    db.refresh(user)
    db.refresh(student)

    # 6. Audit log
    ip = get_client_ip(request)
    log_audit(db, user.id, "STUDENT_SIGNUP", "USER", user.id, None, {"email": user.email, "reg_no": student.register_number}, ip)

    # 7. Generate tokens
    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    # Store refresh token record
    ref_record = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token[-20:],
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(ref_record)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "full_name": student.full_name,
            "register_number": student.register_number,
            "department_name": dept.name,
            "course_name": course.name
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact administration."
        )

    # Enforce sole authorized college administrator
    if user.role == "ADMIN" and user.email.lower() != COLLEGE_ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Only the designated College Administrator ({COLLEGE_ADMIN_EMAIL}) is permitted."
        )

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)

    ref_record = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token[-20:],
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(ref_record)
    db.commit()

    ip = get_client_ip(request)
    log_audit(db, user.id, "USER_LOGIN", "USER", user.id, None, {"email": user.email, "role": user.role}, ip)

    user_info = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
    }

    if user.role == "STUDENT" and user.student_profile:
        user_info["full_name"] = user.student_profile.full_name
        user_info["register_number"] = user.student_profile.register_number
        user_info["department_id"] = user.student_profile.department_id
        user_info["department_name"] = user.student_profile.department.name if user.student_profile.department else ""
        user_info["course_name"] = user.student_profile.course.name if user.student_profile.course else ""
    elif user.role == "STAFF" and user.staff_profile:
        user_info["full_name"] = user.staff_profile.full_name
        user_info["employee_id"] = user.staff_profile.employee_id
        user_info["department_id"] = user.staff_profile.department_id
        user_info["department_name"] = user.staff_profile.department.name if user.staff_profile.department else ""
        user_info["designation"] = user.staff_profile.designation
    elif user.role == "ADMIN":
        user_info["full_name"] = "Ramya (College Administrator)"

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user_info
    }

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenRequest, db: Session = Depends(get_db)):
    decoded = decode_token(payload.refresh_token)
    if not decoded or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = int(decoded.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not active"
        )

    new_access_token = create_access_token(subject=user.id, role=user.role)
    new_refresh_token = create_refresh_token(subject=user.id, role=user.role)

    # Store new refresh token
    ref_record = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_token[-20:],
        expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(ref_record)
    db.commit()

    user_info = {
        "id": user.id,
        "email": user.email,
        "role": user.role,
    }
    if user.role == "STUDENT" and user.student_profile:
        user_info["full_name"] = user.student_profile.full_name
        user_info["register_number"] = user.student_profile.register_number
        user_info["department_id"] = user.student_profile.department_id
    elif user.role == "STAFF" and user.staff_profile:
        user_info["full_name"] = user.staff_profile.full_name
        user_info["employee_id"] = user.staff_profile.employee_id
        user_info["department_id"] = user.staff_profile.department_id
    elif user.role == "ADMIN":
        user_info["full_name"] = "Ramya (College Administrator)"

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user_info
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Mark user's refresh tokens as revoked
    db.query(RefreshToken).filter(RefreshToken.user_id == current_user.id).update(
        {"revoked_at": datetime.datetime.utcnow()}
    )
    db.commit()
    log_audit(db, current_user.id, "USER_LOGOUT", "USER", current_user.id, None, {"email": current_user.email})
    return {"message": "Logged out successfully"}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_info = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }

    if current_user.role == "STUDENT" and current_user.student_profile:
        sp = current_user.student_profile
        user_info.update({
            "student_id": sp.id,
            "full_name": sp.full_name,
            "register_number": sp.register_number,
            "phone": sp.phone,
            "department_id": sp.department_id,
            "department_name": sp.department.name if sp.department else "",
            "course_id": sp.course_id,
            "course_name": sp.course.name if sp.course else "",
            "year": sp.year,
            "section": sp.section,
            "admission_year": sp.admission_year
        })
    elif current_user.role == "STAFF" and current_user.staff_profile:
        st = current_user.staff_profile
        user_info.update({
            "staff_id": st.id,
            "full_name": st.full_name,
            "employee_id": st.employee_id,
            "phone": st.phone,
            "department_id": st.department_id,
            "department_name": st.department.name if st.department else "",
            "designation": st.designation
        })
    elif current_user.role == "ADMIN":
        user_info.update({
            "full_name": "Ramya (College Administrator)",
            "department_name": "Office of the Principal / Administration"
        })

    return user_info

@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        # Return success message to avoid email enumeration
        return {"message": "If this email is registered, the password has been reset."}
    
    user.password_hash = get_password_hash(payload.new_password)
    db.commit()
    log_audit(db, user.id, "PASSWORD_RESET", "USER", user.id, None, {"email": user.email})
    return {"message": "Password updated successfully. You can now login with your new password."}
