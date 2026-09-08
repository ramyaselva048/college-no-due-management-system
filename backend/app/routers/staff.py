from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.models import (
    Staff, Student, DueRecord, NoDueApproval, Department, Course, User
)
from backend.app.schemas.schemas import StaffDashboardOut
from backend.app.routers.deps import get_current_user, get_current_staff

router = APIRouter(prefix="/staff", tags=["Staff"])

@router.get("/dashboard", response_model=StaffDashboardOut)
def get_staff_dashboard(
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    dept = staff.department
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    dept_id = staff.department_id

    # 1. Total students associated with this department or college
    total_students = db.query(Student).count()

    # 2. Dues in this staff's department
    dues = db.query(DueRecord).filter(DueRecord.department_id == dept_id).all()
    pending_dues = [d for d in dues if d.status == "pending"]
    cleared_dues = [d for d in dues if d.status == "cleared"]

    pending_dues_count = len(pending_dues)
    pending_dues_amount = sum(d.amount for d in pending_dues)
    cleared_dues_count = len(cleared_dues)

    # 3. No Due Approvals in this staff's department
    approvals = db.query(NoDueApproval).filter(NoDueApproval.department_id == dept_id).all()
    pending_approvals = [a for a in approvals if a.status == "pending"]
    approved_approvals = [a for a in approvals if a.status == "approved"]
    rejected_approvals = [a for a in approvals if a.status == "rejected"]

    return StaffDashboardOut(
        department_id=dept.id,
        department_name=dept.name,
        department_code=dept.code,
        total_students=total_students,
        pending_dues_count=pending_dues_count,
        pending_dues_amount=pending_dues_amount,
        cleared_dues_count=cleared_dues_count,
        pending_approvals_count=len(pending_approvals),
        approved_approvals_count=len(approved_approvals),
        rejected_approvals_count=len(rejected_approvals)
    )

@router.get("/students")
def get_staff_students(
    search: Optional[str] = None,
    course_id: Optional[int] = None,
    year: Optional[int] = None,
    has_due: Optional[str] = None,  # 'yes', 'no', or None
    skip: int = 0,
    limit: int = 50,
    staff: Staff = Depends(get_current_staff),
    db: Session = Depends(get_db)
):
    dept_id = staff.department_id
    query = db.query(Student).join(Course)

    if course_id:
        query = query.filter(Student.course_id == course_id)
    if year:
        query = query.filter(Student.year == year)

    if search:
        p = f"%{search}%"
        query = query.filter(
            (Student.full_name.ilike(p)) |
            (Student.register_number.ilike(p)) |
            (Student.email.ilike(p))
        )

    all_students = query.order_by(Student.register_number).all()

    # Enrich with department dues for staff
    enriched = []
    for s in all_students:
        dept_dues = db.query(DueRecord).filter(
            DueRecord.student_id == s.id,
            DueRecord.department_id == dept_id
        ).all()

        pending_dues = [d for d in dept_dues if d.status == "pending"]
        pending_amt = sum(d.amount for d in pending_dues)

        if has_due == "yes" and len(pending_dues) == 0:
            continue
        if has_due == "no" and len(pending_dues) > 0:
            continue

        enriched.append({
            "id": s.id,
            "register_number": s.register_number,
            "full_name": s.full_name,
            "email": s.email,
            "phone": s.phone,
            "course_id": s.course_id,
            "course_name": s.course.name if s.course else "",
            "department_name": s.department.name if s.department else "",
            "year": s.year,
            "section": s.section,
            "pending_due_amount": pending_amt,
            "has_pending_dues": len(pending_dues) > 0,
            "due_count": len(dept_dues),
            "dues": [
                {
                    "id": d.id,
                    "category_name": d.category.name if d.category else "",
                    "amount": d.amount,
                    "status": d.status,
                    "description": d.description,
                    "remarks": d.remarks,
                    "created_at": d.created_at
                } for d in dept_dues
            ]
        })

    paginated = enriched[skip : skip + limit]
    return {"total": len(enriched), "students": paginated}
