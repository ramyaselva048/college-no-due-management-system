import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.models import (
    NoDueRequest, NoDueApproval, Student, Department, DueRecord, User, Certificate
)
from backend.app.schemas.schemas import NoDueRequestCreate, NoDueRequestOut
from backend.app.routers.deps import get_current_user, get_current_student
from backend.app.services.audit_service import log_audit
from backend.app.services.notification_service import create_notification

router = APIRouter(prefix="/no-due-requests", tags=["No Due Requests"])

@router.post("", response_model=NoDueRequestOut)
def create_no_due_request(
    payload: NoDueRequestCreate,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    # Rule 8: Student cannot request No Due while pending dues exist
    pending_dues = db.query(DueRecord).filter(
        DueRecord.student_id == student.id,
        DueRecord.status == "pending"
    ).all()
    if pending_dues:
        total_pending = sum(d.amount for d in pending_dues)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clear all pending dues before submitting your No Due request. You have ₹{total_pending:.2f} outstanding."
        )

    # Rule 7: Student cannot create duplicate active No Due requests
    active_req = db.query(NoDueRequest).filter(
        NoDueRequest.student_id == student.id,
        NoDueRequest.status.in_(["submitted", "under_review", "approved", "completed"])
    ).first()
    if active_req:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active No Due request in progress or completed."
        )

    # Create No Due Request
    request = NoDueRequest(
        student_id=student.id,
        status="under_review",
        submitted_at=datetime.datetime.utcnow(),
        remarks=payload.remarks
    )
    db.add(request)
    db.flush()

    # Step 8: System automatically creates department approval records for all active departments
    active_departments = db.query(Department).filter(Department.is_active == True).all()
    approvals = []
    for dept in active_departments:
        approval = NoDueApproval(
            request_id=request.id,
            department_id=dept.id,
            status="pending"
        )
        db.add(approval)
        approvals.append(approval)

    db.commit()
    db.refresh(request)

    # Audit log
    log_audit(db, student.user_id, "NO_DUE_REQUEST_CREATED", "NO_DUE_REQUEST", request.id, None, {
        "student_id": student.id,
        "departments_count": len(active_departments)
    })

    # Notification to student
    create_notification(
        db,
        user_id=student.user_id,
        title="No Due Request Submitted",
        message="Your No Due Clearance request has been initiated and routed to all departments for verification.",
        notification_type="info"
    )

    return {
        "id": request.id,
        "student_id": request.student_id,
        "student_name": student.full_name,
        "student_reg_no": student.register_number,
        "course_name": student.course.name if student.course else "",
        "department_name": student.department.name if student.department else "",
        "status": request.status,
        "submitted_at": request.submitted_at,
        "reviewed_at": request.reviewed_at,
        "reviewed_by": request.reviewed_by,
        "remarks": request.remarks,
        "approvals": [
            {
                "id": a.id,
                "request_id": a.request_id,
                "department_id": a.department_id,
                "department_name": a.department.name if a.department else "",
                "approved_by": a.approved_by,
                "status": a.status,
                "remarks": a.remarks,
                "approved_at": a.approved_at,
                "created_at": a.created_at
            } for a in request.approvals
        ],
        "created_at": request.created_at
    }

@router.get("/my", response_model=List[NoDueRequestOut])
def get_my_requests(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    requests = db.query(NoDueRequest).filter(
        NoDueRequest.student_id == student.id
    ).order_by(NoDueRequest.created_at.desc()).all()

    result = []
    for req in requests:
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "student_name": student.full_name,
            "student_reg_no": student.register_number,
            "course_name": student.course.name if student.course else "",
            "department_name": student.department.name if student.department else "",
            "status": req.status,
            "submitted_at": req.submitted_at,
            "reviewed_at": req.reviewed_at,
            "reviewed_by": req.reviewed_by,
            "remarks": req.remarks,
            "approvals": [
                {
                    "id": a.id,
                    "request_id": a.request_id,
                    "department_id": a.department_id,
                    "department_name": a.department.name if a.department else "",
                    "approved_by": a.approved_by,
                    "status": a.status,
                    "remarks": a.remarks,
                    "approved_at": a.approved_at,
                    "created_at": a.created_at
                } for a in req.approvals
            ],
            "created_at": req.created_at
        })
    return result

@router.get("")
def get_all_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    department_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    query = db.query(NoDueRequest).join(Student)

    if status_filter:
        query = query.filter(NoDueRequest.status == status_filter)

    if department_id:
        query = query.filter(Student.department_id == department_id)

    if search:
        p = f"%{search}%"
        query = query.filter(
            (Student.full_name.ilike(p)) |
            (Student.register_number.ilike(p))
        )

    total = query.count()
    requests = query.order_by(NoDueRequest.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for req in requests:
        st = req.student
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "student_name": st.full_name if st else "",
            "student_reg_no": st.register_number if st else "",
            "course_name": st.course.name if st and st.course else "",
            "department_name": st.department.name if st and st.department else "",
            "status": req.status,
            "submitted_at": req.submitted_at,
            "reviewed_at": req.reviewed_at,
            "reviewed_by": req.reviewed_by,
            "remarks": req.remarks,
            "approvals": [
                {
                    "id": a.id,
                    "request_id": a.request_id,
                    "department_id": a.department_id,
                    "department_name": a.department.name if a.department else "",
                    "approved_by": a.approved_by,
                    "status": a.status,
                    "remarks": a.remarks,
                    "approved_at": a.approved_at,
                    "created_at": a.created_at
                } for a in req.approvals
            ],
            "created_at": req.created_at
        })

    return {"total": total, "requests": result}

@router.patch("/{id}")
def update_no_due_request(
    id: int,
    status: str,
    remarks: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admin can directly update request status")

    req = db.query(NoDueRequest).filter(NoDueRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    old_status = req.status
    req.status = status
    if remarks:
        req.remarks = remarks
    req.reviewed_at = datetime.datetime.utcnow()
    req.reviewed_by = current_user.id

    db.commit()

    log_audit(db, current_user.id, "REQUEST_STATUS_UPDATED", "NO_DUE_REQUEST", req.id, {"status": old_status}, {"status": status})
    create_notification(
        db,
        user_id=req.student.user_id,
        title="No Due Request Update",
        message=f"Your No Due Request #{req.id} status is now: {status.upper()}.",
        notification_type="info" if status != "rejected" else "danger"
    )

    return {"message": "Request updated successfully", "status": req.status}
