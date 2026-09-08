import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.models import (
    NoDueApproval, NoDueRequest, Student, Department, DueRecord, User, Staff
)
from backend.app.schemas.schemas import NoDueApprovalUpdate, NoDueApprovalOut
from backend.app.routers.deps import get_current_user, get_current_staff
from backend.app.services.audit_service import log_audit
from backend.app.services.notification_service import create_notification

router = APIRouter(prefix="/no-due-approvals", tags=["No Due Approvals"])

@router.get("/my-department")
def get_my_department_approvals(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "STAFF" or not current_user.staff_profile:
        raise HTTPException(status_code=403, detail="Staff role required")

    dept_id = current_user.staff_profile.department_id

    query = db.query(NoDueApproval).join(NoDueRequest).join(Student).filter(
        NoDueApproval.department_id == dept_id
    )

    if status_filter:
        query = query.filter(NoDueApproval.status == status_filter)

    approvals = query.order_by(NoDueApproval.created_at.desc()).all()

    result = []
    for a in approvals:
        req = a.request
        st = req.student if req else None
        
        # Check if student has any pending dues in this department
        pending_dues = []
        if st:
            pending_dues = db.query(DueRecord).filter(
                DueRecord.student_id == st.id,
                DueRecord.department_id == dept_id,
                DueRecord.status == "pending"
            ).all()

        result.append({
            "id": a.id,
            "request_id": a.request_id,
            "department_id": a.department_id,
            "department_name": a.department.name if a.department else "",
            "student_id": st.id if st else None,
            "student_name": st.full_name if st else "",
            "student_reg_no": st.register_number if st else "",
            "course_name": st.course.name if st and st.course else "",
            "academic_year": f"{st.year}th Year" if st else "",
            "status": a.status,
            "remarks": a.remarks,
            "approved_at": a.approved_at,
            "has_pending_dues": len(pending_dues) > 0,
            "pending_dues_amount": sum(d.amount for d in pending_dues),
            "created_at": a.created_at
        })

    return result

@router.patch("/{id}")
def update_approval_status(
    id: int,
    payload: NoDueApprovalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    approval = db.query(NoDueApproval).filter(NoDueApproval.id == id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval record not found")

    # Rule 9 & 10: Staff cannot modify or approve another department's records
    if current_user.role == "STAFF":
        if not current_user.staff_profile or approval.department_id != current_user.staff_profile.department_id:
            raise HTTPException(
                status_code=403,
                detail="You are only authorized to approve or reject for your assigned department"
            )

    if payload.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    # If approving, verify student has no pending dues in this department
    if payload.status == "approved":
        req = approval.request
        if req and req.student_id:
            dept_pending = db.query(DueRecord).filter(
                DueRecord.student_id == req.student_id,
                DueRecord.department_id == approval.department_id,
                DueRecord.status == "pending"
            ).first()
            if dept_pending:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot approve clearance: Student has an active pending due of ₹{dept_pending.amount:.2f} in this department"
                )

    old_status = approval.status
    approval.status = payload.status
    approval.remarks = payload.remarks
    approval.approved_by = current_user.id
    approval.approved_at = datetime.datetime.utcnow()

    # If any department rejects, mark request as under_review/rejected
    req = approval.request
    if payload.status == "rejected" and req:
        req.status = "rejected"
        req.remarks = f"Rejected by {approval.department.name}: {payload.remarks or 'Requirement unfulfilled'}"
    elif payload.status == "approved" and req:
        # Check if ALL required departments have approved!
        all_approved = all(a.status == "approved" for a in req.approvals if a.id != approval.id)
        if all_approved:
            # Step 12: Only after ALL required departments approve, No Due request becomes eligible for final approval
            req.status = "approved"

    db.commit()

    log_audit(db, current_user.id, f"APPROVAL_{payload.status.upper()}", "NO_DUE_APPROVAL", approval.id, {"status": old_status}, {"status": payload.status, "remarks": payload.remarks})
    
    # Notify student
    if req and req.student:
        dept_name = approval.department.name if approval.department else "Department"
        create_notification(
            db,
            user_id=req.student.user_id,
            title=f"Clearance {payload.status.capitalize()} by {dept_name}",
            message=f"{dept_name} has {payload.status} your No Due clearance request. Remarks: {payload.remarks or 'None'}.",
            notification_type="success" if payload.status == "approved" else "danger"
        )

    return {"message": f"Department clearance marked as {payload.status}", "status": approval.status}

@router.get("/request/{request_id}")
def get_request_approvals(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    approvals = db.query(NoDueApproval).filter(NoDueApproval.request_id == request_id).all()
    result = []
    for a in approvals:
        result.append({
            "id": a.id,
            "request_id": a.request_id,
            "department_id": a.department_id,
            "department_name": a.department.name if a.department else "",
            "approved_by": a.approved_by,
            "status": a.status,
            "remarks": a.remarks,
            "approved_at": a.approved_at,
            "created_at": a.created_at
        })
    return result
