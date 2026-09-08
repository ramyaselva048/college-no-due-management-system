import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.core.security import get_password_hash
from backend.app.models.models import (
    User, Student, Staff, Department, Course, DueCategory,
    DueRecord, NoDueRequest, NoDueApproval, Certificate, AuditLog
)
from backend.app.schemas.schemas import (
    DepartmentCreate, DepartmentUpdate, DepartmentOut,
    CourseCreate, CourseUpdate, CourseOut,
    DueCategoryCreate, DueCategoryUpdate, DueCategoryOut,
    StaffCreate, StaffOut, StudentOut, AdminDashboardStats, AuditLogOut
)
from backend.app.routers.deps import get_current_admin
from backend.app.services.audit_service import log_audit

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def get_admin_dashboard(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_students = db.query(Student).count()
    total_staff = db.query(Staff).count()
    total_departments = db.query(Department).count()
    total_courses = db.query(Course).count()

    all_dues = db.query(DueRecord).all()
    pending_dues = [d for d in all_dues if d.status == "pending"]
    cleared_dues = [d for d in all_dues if d.status == "cleared"]

    pending_dues_count = len(pending_dues)
    pending_dues_amount = sum(d.amount for d in pending_dues)
    cleared_dues_count = len(cleared_dues)
    cleared_dues_amount = sum(d.amount for d in cleared_dues)

    all_requests = db.query(NoDueRequest).all()
    pending_requests_count = len([r for r in all_requests if r.status in ["submitted", "under_review"]])
    approved_requests_count = len([r for r in all_requests if r.status in ["approved", "completed"]])
    rejected_requests_count = len([r for r in all_requests if r.status == "rejected"])

    valid_certificates_count = db.query(Certificate).filter(Certificate.is_valid == True).count()

    # Department-wise pending dues breakdown
    departments = db.query(Department).filter(Department.is_active == True).all()
    department_breakdown = []
    for dept in departments:
        dept_pending = [d for d in pending_dues if d.department_id == dept.id]
        department_breakdown.append({
            "department_id": dept.id,
            "department_name": dept.name,
            "department_code": dept.code,
            "pending_count": len(dept_pending),
            "pending_amount": sum(d.amount for d in dept_pending)
        })

    # Recent activity
    recent_requests = db.query(NoDueRequest).order_by(NoDueRequest.created_at.desc()).limit(5).all()
    recent_dues = db.query(DueRecord).order_by(DueRecord.created_at.desc()).limit(5).all()
    recent_certificates = db.query(Certificate).order_by(Certificate.created_at.desc()).limit(5).all()
    recent_audits = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()

    return {
        "stats": {
            "total_students": total_students,
            "total_staff": total_staff,
            "total_departments": total_departments,
            "total_courses": total_courses,
            "pending_dues_count": pending_dues_count,
            "pending_dues_amount": pending_dues_amount,
            "cleared_dues_count": cleared_dues_count,
            "cleared_dues_amount": cleared_dues_amount,
            "pending_requests_count": pending_requests_count,
            "approved_requests_count": approved_requests_count,
            "rejected_requests_count": rejected_requests_count,
            "valid_certificates_count": valid_certificates_count
        },
        "department_breakdown": department_breakdown,
        "recent_requests": [
            {
                "id": r.id,
                "student_name": r.student.full_name if r.student else "",
                "register_number": r.student.register_number if r.student else "",
                "course_name": r.student.course.name if r.student and r.student.course else "",
                "status": r.status,
                "submitted_at": r.submitted_at
            } for r in recent_requests
        ],
        "recent_dues": [
            {
                "id": d.id,
                "student_name": d.student.full_name if d.student else "",
                "register_number": d.student.register_number if d.student else "",
                "department_name": d.department.name if d.department else "",
                "category_name": d.category.name if d.category else "",
                "amount": d.amount,
                "status": d.status,
                "created_at": d.created_at
            } for d in recent_dues
        ],
        "recent_certificates": [
            {
                "id": c.id,
                "certificate_number": c.certificate_number,
                "student_name": c.student.full_name if c.student else "",
                "register_number": c.student.register_number if c.student else "",
                "issued_at": c.issued_at,
                "is_valid": c.is_valid
            } for c in recent_certificates
        ],
        "recent_audits": [
            {
                "id": a.id,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "created_at": a.created_at
            } for a in recent_audits
        ]
    }

# --- Student Management ---
@router.get("/students")
def get_admin_students(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    course_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Student).join(User).join(Department).join(Course)
    if department_id:
        query = query.filter(Student.department_id == department_id)
    if course_id:
        query = query.filter(Student.course_id == course_id)
    if search:
        p = f"%{search}%"
        query = query.filter(
            (Student.full_name.ilike(p)) |
            (Student.register_number.ilike(p)) |
            (Student.email.ilike(p))
        )

    total = query.count()
    students = query.order_by(Student.register_number).offset(skip).limit(limit).all()

    result = []
    for s in students:
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "register_number": s.register_number,
            "full_name": s.full_name,
            "email": s.email,
            "phone": s.phone,
            "department_id": s.department_id,
            "department_name": s.department.name if s.department else "",
            "course_id": s.course_id,
            "course_name": s.course.name if s.course else "",
            "year": s.year,
            "section": s.section,
            "admission_year": s.admission_year,
            "is_active": s.user.is_active if s.user else True,
            "created_at": s.created_at
        })
    return {"total": total, "students": result}

@router.patch("/students/{id}/toggle-status")
def toggle_student_status(
    id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student or not student.user:
        raise HTTPException(status_code=404, detail="Student user not found")

    new_status = not student.user.is_active
    student.user.is_active = new_status
    db.commit()

    log_audit(db, admin.id, "USER_STATUS_TOGGLE", "STUDENT", student.id, {"is_active": not new_status}, {"is_active": new_status})
    return {"message": f"Student account {'activated' if new_status else 'deactivated'}", "is_active": new_status}

# --- Staff Management ---
@router.get("/staff")
def get_admin_staff(
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Staff).join(User).join(Department)
    if department_id:
        query = query.filter(Staff.department_id == department_id)
    if search:
        p = f"%{search}%"
        query = query.filter(
            (Staff.full_name.ilike(p)) |
            (Staff.employee_id.ilike(p)) |
            (Staff.email.ilike(p))
        )

    total = query.count()
    staff_list = query.order_by(Staff.full_name).offset(skip).limit(limit).all()

    result = []
    for st in staff_list:
        result.append({
            "id": st.id,
            "user_id": st.user_id,
            "employee_id": st.employee_id,
            "full_name": st.full_name,
            "email": st.email,
            "phone": st.phone,
            "department_id": st.department_id,
            "department_name": st.department.name if st.department else "",
            "designation": st.designation,
            "is_active": st.user.is_active if st.user else True,
            "created_at": st.created_at
        })
    return {"total": total, "staff": result}

@router.post("/staff", response_model=StaffOut)
def create_admin_staff(
    payload: StaffCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Rule 3: Staff employee ID must be unique
    existing_emp = db.query(Staff).filter(Staff.employee_id == payload.employee_id.upper()).first()
    if existing_emp:
        raise HTTPException(status_code=400, detail="Employee ID already exists")

    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    dept = db.query(Department).filter(Department.id == payload.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    user = User(
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role="STAFF",
        is_active=True
    )
    db.add(user)
    db.flush()

    staff = Staff(
        user_id=user.id,
        employee_id=payload.employee_id.upper(),
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone,
        department_id=payload.department_id,
        designation=payload.designation
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)

    log_audit(db, admin.id, "STAFF_CREATED", "STAFF", staff.id, None, {
        "email": staff.email,
        "employee_id": staff.employee_id,
        "department": dept.name
    })

    return {
        "id": staff.id,
        "user_id": staff.user_id,
        "employee_id": staff.employee_id,
        "full_name": staff.full_name,
        "email": staff.email,
        "phone": staff.phone,
        "department_id": staff.department_id,
        "department_name": dept.name,
        "designation": staff.designation,
        "is_active": True,
        "created_at": staff.created_at
    }

# --- Department Management ---
@router.get("/departments", response_model=List[DepartmentOut])
def get_departments(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(Department).order_by(Department.name).all()

@router.post("/departments", response_model=DepartmentOut)
def create_department(
    payload: DepartmentCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Rule 4: Department code must be unique
    existing = db.query(Department).filter(Department.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this code already exists")

    dept = Department(
        name=payload.name.strip(),
        code=payload.code.upper().strip(),
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    log_audit(db, admin.id, "DEPARTMENT_CREATED", "DEPARTMENT", dept.id, None, payload.model_dump())
    return dept

@router.patch("/departments/{id}", response_model=DepartmentOut)
def update_department(
    id: int,
    payload: DepartmentUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    dept = db.query(Department).filter(Department.id == id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    old_vals = {"name": dept.name, "code": dept.code, "is_active": dept.is_active}
    if payload.name is not None:
        dept.name = payload.name.strip()
    if payload.code is not None:
        dept.code = payload.code.upper().strip()
    if payload.description is not None:
        dept.description = payload.description
    if payload.is_active is not None:
        dept.is_active = payload.is_active

    db.commit()
    db.refresh(dept)
    log_audit(db, admin.id, "DEPARTMENT_UPDATED", "DEPARTMENT", dept.id, old_vals, payload.model_dump(exclude_unset=True))
    return dept

# --- Course Management ---
@router.get("/courses")
def get_courses(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    courses = db.query(Course).join(Department).order_by(Course.name).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "department_id": c.department_id,
            "department_name": c.department.name if c.department else "",
            "duration": c.duration,
            "is_active": c.is_active,
            "created_at": c.created_at
        } for c in courses
    ]

@router.post("/courses")
def create_course(
    payload: CourseCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Rule 5: Course code must be unique
    existing = db.query(Course).filter(Course.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Course with this code already exists")

    course = Course(
        name=payload.name.strip(),
        code=payload.code.upper().strip(),
        department_id=payload.department_id,
        duration=payload.duration,
        is_active=payload.is_active
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    log_audit(db, admin.id, "COURSE_CREATED", "COURSE", course.id, None, payload.model_dump())
    return {
        "id": course.id,
        "name": course.name,
        "code": course.code,
        "department_id": course.department_id,
        "department_name": course.department.name if course.department else "",
        "duration": course.duration,
        "is_active": course.is_active,
        "created_at": course.created_at
    }

# --- Due Categories ---
@router.get("/due-categories", response_model=List[DueCategoryOut])
def get_admin_due_categories(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(DueCategory).order_by(DueCategory.name).all()

@router.post("/due-categories", response_model=DueCategoryOut)
def create_due_category(
    payload: DueCategoryCreate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    # Rule 6: Due category code must be unique
    existing = db.query(DueCategory).filter(DueCategory.code == payload.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Due category with this code already exists")

    cat = DueCategory(
        name=payload.name.strip(),
        code=payload.code.upper().strip(),
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)

    log_audit(db, admin.id, "DUE_CATEGORY_CREATED", "DUE_CATEGORY", cat.id, None, payload.model_dump())
    return cat

# --- Audit Logs ---
@router.get("/audit-logs")
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog).outerjoin(User)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if search:
        p = f"%{search}%"
        query = query.filter(
            (AuditLog.action.ilike(p)) |
            (AuditLog.entity_type.ilike(p)) |
            (AuditLog.new_values.ilike(p)) |
            (User.email.ilike(p))
        )

    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for l in logs:
        result.append({
            "id": l.id,
            "user_id": l.user_id,
            "user_email": l.user.email if l.user else "System",
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "old_values": l.old_values,
            "new_values": l.new_values,
            "ip_address": l.ip_address,
            "created_at": l.created_at
        })
    return {"total": total, "logs": result}

# --- Reports ---
@router.get("/reports")
def get_admin_reports(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    departments = db.query(Department).all()
    courses = db.query(Course).all()

    dept_metrics = []
    for d in departments:
        dues = db.query(DueRecord).filter(DueRecord.department_id == d.id).all()
        pending = [x for x in dues if x.status == "pending"]
        cleared = [x for x in dues if x.status == "cleared"]
        waived = [x for x in dues if x.status == "waived"]

        dept_metrics.append({
            "department_id": d.id,
            "department_name": d.name,
            "department_code": d.code,
            "total_dues": len(dues),
            "pending_count": len(pending),
            "pending_amount": sum(x.amount for x in pending),
            "cleared_count": len(cleared),
            "cleared_amount": sum(x.amount for x in cleared),
            "waived_count": len(waived),
            "waived_amount": sum(x.amount for x in waived),
            "collection_rate": round(len(cleared) / len(dues) * 100, 1) if dues else 100.0
        })

    return {
        "generated_at": datetime.datetime.utcnow(),
        "department_metrics": dept_metrics,
        "total_issued_certificates": db.query(Certificate).filter(Certificate.is_valid == True).count(),
        "total_revoked_certificates": db.query(Certificate).filter(Certificate.is_valid == False).count(),
        "total_requests": db.query(NoDueRequest).count()
    }
