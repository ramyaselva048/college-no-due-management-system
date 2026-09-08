from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.app.core.database import get_db
from backend.app.models.models import (
    Student, Department, Course, DueRecord, DueCategory,
    NoDueRequest, NoDueApproval, Certificate, User
)
from backend.app.schemas.schemas import (
    StudentOut, StudentUpdate, StudentSummaryOut, DepartmentDueStatus,
    DepartmentOut, CourseOut, DueCategoryOut, NoDueRequestOut, CertificateOut
)
from backend.app.routers.deps import get_current_user, get_current_student
from backend.app.services.audit_service import log_audit

router = APIRouter(prefix="/student", tags=["Student"])

@router.get("/profile", response_model=StudentOut)
def get_student_profile(student: Student = Depends(get_current_student)):
    return {
        "id": student.id,
        "user_id": student.user_id,
        "full_name": student.full_name,
        "register_number": student.register_number,
        "email": student.email,
        "phone": student.phone,
        "department_id": student.department_id,
        "department_name": student.department.name if student.department else "",
        "course_id": student.course_id,
        "course_name": student.course.name if student.course else "",
        "year": student.year,
        "section": student.section,
        "admission_year": student.admission_year,
        "created_at": student.created_at
    }

@router.patch("/profile", response_model=StudentOut)
def update_student_profile(
    payload: StudentUpdate,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    old_val = {"phone": student.phone, "year": student.year, "section": student.section}
    if payload.phone is not None:
        student.phone = payload.phone
    if payload.year is not None:
        student.year = payload.year
    if payload.section is not None:
        student.section = payload.section.upper()
    if payload.department_id is not None:
        student.department_id = payload.department_id
    if payload.course_id is not None:
        student.course_id = payload.course_id

    db.commit()
    db.refresh(student)
    log_audit(db, student.user_id, "STUDENT_PROFILE_UPDATE", "STUDENT", student.id, old_val, payload.model_dump(exclude_unset=True))
    
    return {
        "id": student.id,
        "user_id": student.user_id,
        "full_name": student.full_name,
        "register_number": student.register_number,
        "email": student.email,
        "phone": student.phone,
        "department_id": student.department_id,
        "department_name": student.department.name if student.department else "",
        "course_id": student.course_id,
        "course_name": student.course.name if student.course else "",
        "year": student.year,
        "section": student.section,
        "admission_year": student.admission_year,
        "created_at": student.created_at
    }

@router.get("/summary", response_model=StudentSummaryOut)
def get_student_summary(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # 1. Fetch all active departments
    departments = db.query(Department).filter(Department.is_active == True).order_by(Department.name).all()
    
    # 2. Fetch all due records for this student
    due_records = db.query(DueRecord).filter(DueRecord.student_id == student.id).all()
    
    total_amount = sum(d.amount for d in due_records)
    pending_amount = sum(d.amount for d in due_records if d.status == "pending")
    cleared_amount = sum(d.amount for d in due_records if d.status == "cleared")
    waived_amount = sum(d.amount for d in due_records if d.status == "waived")

    # 3. Check active No Due request
    active_req = db.query(NoDueRequest).filter(
        NoDueRequest.student_id == student.id
    ).order_by(NoDueRequest.created_at.desc()).first()

    # Build approval map by department_id if request exists
    approval_map = {}
    if active_req:
        for app in active_req.approvals:
            approval_map[app.department_id] = {
                "status": app.status,
                "remarks": app.remarks
            }

    # 4. Department-wise statuses
    dept_statuses: List[DepartmentDueStatus] = []
    cleared_depts = 0

    for dept in departments:
        dept_dues = [d for d in due_records if d.department_id == dept.id]
        dept_pending_dues = [d for d in dept_dues if d.status == "pending"]
        dept_pending_amt = sum(d.amount for d in dept_pending_dues)
        
        is_cleared = (dept_pending_amt == 0)
        if is_cleared:
            cleared_depts += 1

        app_info = approval_map.get(dept.id, {})
        dept_statuses.append(DepartmentDueStatus(
            department_id=dept.id,
            department_name=dept.name,
            department_code=dept.code,
            pending_amount=dept_pending_amt,
            total_dues_count=len(dept_dues),
            pending_dues_count=len(dept_pending_dues),
            status="cleared" if is_cleared else "pending",
            approval_status=app_info.get("status"),
            remarks=app_info.get("remarks")
        ))

    total_depts = len(departments)
    clearance_pct = int((cleared_depts / total_depts * 100)) if total_depts > 0 else 100

    # Eligible for No Due request:
    # 1. No pending dues (pending_amount == 0)
    # 2. No existing active request or existing request was rejected
    can_request = (pending_amount == 0) and (
        active_req is None or active_req.status == "rejected"
    )

    # 5. Check issued certificate
    cert = db.query(Certificate).filter(
        Certificate.student_id == student.id,
        Certificate.is_valid == True
    ).order_by(Certificate.issued_at.desc()).first()

    active_req_out = None
    if active_req:
        active_req_out = {
            "id": active_req.id,
            "student_id": active_req.student_id,
            "student_name": student.full_name,
            "student_reg_no": student.register_number,
            "course_name": student.course.name if student.course else "",
            "department_name": student.department.name if student.department else "",
            "status": active_req.status,
            "submitted_at": active_req.submitted_at,
            "reviewed_at": active_req.reviewed_at,
            "reviewed_by": active_req.reviewed_by,
            "remarks": active_req.remarks,
            "approvals": [
                {
                    "id": a.id,
                    "request_id": a.request_id,
                    "department_id": a.department_id,
                    "department_name": a.department.name if a.department else "",
                    "approved_by": a.approved_by,
                    "approver_name": "Department Authority",
                    "status": a.status,
                    "remarks": a.remarks,
                    "approved_at": a.approved_at,
                    "created_at": a.created_at
                } for a in active_req.approvals
            ],
            "created_at": active_req.created_at
        }

    cert_out = None
    if cert:
        cert_out = {
            "id": cert.id,
            "request_id": cert.request_id,
            "student_id": cert.student_id,
            "student_name": student.full_name,
            "register_number": student.register_number,
            "course_name": student.course.name if student.course else "",
            "department_name": student.department.name if student.department else "",
            "certificate_number": cert.certificate_number,
            "verification_code": cert.verification_code,
            "issued_at": cert.issued_at,
            "is_valid": cert.is_valid,
            "created_at": cert.created_at
        }

    return StudentSummaryOut(
        student={
            "id": student.id,
            "user_id": student.user_id,
            "full_name": student.full_name,
            "register_number": student.register_number,
            "email": student.email,
            "phone": student.phone,
            "department_id": student.department_id,
            "department_name": student.department.name if student.department else "",
            "course_id": student.course_id,
            "course_name": student.course.name if student.course else "",
            "year": student.year,
            "section": student.section,
            "admission_year": student.admission_year,
            "created_at": student.created_at
        },
        total_dues_amount=total_amount,
        pending_dues_amount=pending_amount,
        cleared_dues_amount=cleared_amount,
        waived_dues_amount=waived_amount,
        total_departments=total_depts,
        cleared_departments_count=cleared_depts,
        pending_departments_count=total_depts - cleared_depts,
        clearance_percentage=clearance_pct,
        can_request_no_due=can_request,
        active_request=active_req_out,
        issued_certificate=cert_out,
        department_statuses=dept_statuses
    )

@router.get("/departments", response_model=List[DepartmentOut])
def get_student_departments(db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.is_active == True).order_by(Department.name).all()

@router.get("/courses", response_model=List[CourseOut])
def get_student_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).filter(Course.is_active == True).order_by(Course.name).all()
    return [
        CourseOut(
            id=c.id,
            name=c.name,
            code=c.code,
            department_id=c.department_id,
            department_name=c.department.name if c.department else "",
            duration=getattr(c, 'duration', 4) or 4,
            is_active=c.is_active,
            created_at=c.created_at
        ) for c in courses
    ]

@router.get("/due-categories", response_model=List[DueCategoryOut])
def get_student_due_categories(db: Session = Depends(get_db)):
    return db.query(DueCategory).filter(DueCategory.is_active == True).order_by(DueCategory.name).all()

