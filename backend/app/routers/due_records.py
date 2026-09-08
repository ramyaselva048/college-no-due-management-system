import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.models import DueRecord, Student, Department, DueCategory, User, Staff, DuePayment
from backend.app.schemas.schemas import DueRecordCreate, DueRecordUpdate, DueRecordOut
from backend.app.routers.deps import get_current_user, get_current_student, get_current_staff
from backend.app.services.audit_service import log_audit
from backend.app.services.notification_service import create_notification

router = APIRouter(prefix="/due-records", tags=["Due Records"])

@router.get("")
def get_due_records(
    student_id: Optional[int] = None,
    department_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(DueRecord).join(Student).join(Department).join(DueCategory)

    # Role-based scoping
    if current_user.role == "STUDENT":
        if not current_user.student_profile:
            return {"total": 0, "records": []}
        query = query.filter(DueRecord.student_id == current_user.student_profile.id)
    elif current_user.role == "STAFF":
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile missing")
        # Enforce staff can only access their assigned department
        query = query.filter(DueRecord.department_id == current_user.staff_profile.department_id)
        if student_id:
            query = query.filter(DueRecord.student_id == student_id)
    elif current_user.role == "ADMIN":
        if student_id:
            query = query.filter(DueRecord.student_id == student_id)
        if department_id:
            query = query.filter(DueRecord.department_id == department_id)

    if status_filter:
        query = query.filter(DueRecord.status == status_filter)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Student.full_name.ilike(search_pattern)) |
            (Student.register_number.ilike(search_pattern)) |
            (DueRecord.description.ilike(search_pattern))
        )

    total = query.count()
    records = query.order_by(DueRecord.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for r in records:
        result.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.full_name if r.student else "",
            "student_reg_no": r.student.register_number if r.student else "",
            "student_email": r.student.email if r.student else "",
            "department_id": r.department_id,
            "department_name": r.department.name if r.department else "",
            "category_id": r.category_id,
            "category_name": r.category.name if r.category else "",
            "amount": r.amount,
            "status": r.status,
            "description": r.description,
            "remarks": r.remarks,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })

    return {"total": total, "records": result}

@router.post("", response_model=DueRecordOut)
def create_due_record(
    payload: DueRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only staff and admin can create due records")

    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    dept_id = payload.department_id
    if current_user.role == "STAFF":
        if not current_user.staff_profile:
            raise HTTPException(status_code=403, detail="Staff profile not found")
        # Enforce staff department
        dept_id = current_user.staff_profile.department_id
    elif not dept_id:
        raise HTTPException(status_code=400, detail="department_id is required")

    category = db.query(DueCategory).filter(DueCategory.id == payload.category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Due category not found")

    dept = db.query(Department).filter(Department.id == dept_id).first()

    due = DueRecord(
        student_id=student.id,
        department_id=dept_id,
        category_id=category.id,
        amount=payload.amount,
        status="pending",
        description=payload.description,
        remarks=payload.remarks,
        created_by=current_user.id,
        updated_by=current_user.id
    )
    db.add(due)
    db.commit()
    db.refresh(due)

    # Log audit
    log_audit(db, current_user.id, "DUE_CREATED", "DUE_RECORD", due.id, None, {
        "student_id": student.id,
        "dept_id": dept_id,
        "amount": payload.amount,
        "desc": payload.description
    })

    # Notify student
    create_notification(
        db,
        user_id=student.user_id,
        title="New Due Recorded",
        message=f"A due of ₹{payload.amount:.2f} for '{payload.description}' was recorded under {dept.name if dept else 'department'}.",
        notification_type="warning"
    )

    return {
        "id": due.id,
        "student_id": due.student_id,
        "student_name": student.full_name,
        "student_reg_no": student.register_number,
        "student_email": student.email,
        "department_id": due.department_id,
        "department_name": dept.name if dept else "",
        "category_id": due.category_id,
        "category_name": category.name,
        "amount": due.amount,
        "status": due.status,
        "description": due.description,
        "remarks": due.remarks,
        "created_at": due.created_at,
        "updated_at": due.updated_at
    }

@router.patch("/{id}", response_model=DueRecordOut)
def update_due_record(
    id: int,
    payload: DueRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Only staff and admin can update dues")

    due = db.query(DueRecord).filter(DueRecord.id == id).first()
    if not due:
        raise HTTPException(status_code=404, detail="Due record not found")

    if current_user.role == "STAFF":
        if not current_user.staff_profile or due.department_id != current_user.staff_profile.department_id:
            raise HTTPException(status_code=403, detail="You can only modify dues for your assigned department")

    old_values = {"amount": due.amount, "status": due.status, "remarks": due.remarks}

    if payload.amount is not None:
        due.amount = payload.amount
    if payload.status is not None:
        if payload.status not in ["pending", "cleared", "waived"]:
            raise HTTPException(status_code=400, detail="Invalid status. Must be pending, cleared, or waived")
        due.status = payload.status
    if payload.description is not None:
        due.description = payload.description
    if payload.remarks is not None:
        due.remarks = payload.remarks

    due.updated_by = current_user.id
    due.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(due)

    # Log audit
    log_audit(db, current_user.id, "DUE_UPDATED", "DUE_RECORD", due.id, old_values, payload.model_dump(exclude_unset=True))

    # Notify student if status changed
    if payload.status in ["cleared", "waived"]:
        create_notification(
            db,
            user_id=due.student.user_id,
            title=f"Due {payload.status.capitalize()}",
            message=f"Your due of ₹{due.amount:.2f} under {due.department.name} has been marked as {payload.status}.",
            notification_type="success"
        )

    return {
        "id": due.id,
        "student_id": due.student_id,
        "student_name": due.student.full_name,
        "student_reg_no": due.student.register_number,
        "student_email": due.student.email,
        "department_id": due.department_id,
        "department_name": due.department.name,
        "category_id": due.category_id,
        "category_name": due.category.name,
        "amount": due.amount,
        "status": due.status,
        "description": due.description,
        "remarks": due.remarks,
        "created_at": due.created_at,
        "updated_at": due.updated_at
    }

@router.delete("/{id}")
def delete_due_record(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["STAFF", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    due = db.query(DueRecord).filter(DueRecord.id == id).first()
    if not due:
        raise HTTPException(status_code=404, detail="Due record not found")

    if current_user.role == "STAFF":
        if not current_user.staff_profile or due.department_id != current_user.staff_profile.department_id:
            raise HTTPException(status_code=403, detail="Permission denied for other department's due records")

    student_uid = due.student.user_id if due.student else None
    due_id = due.id
    db.delete(due)
    db.commit()

    log_audit(db, current_user.id, "DUE_DELETED", "DUE_RECORD", due_id, None, None)
    return {"message": "Due record deleted successfully"}

@router.post("/{id}/pay")
def pay_due_record(
    id: int,
    payment_reference: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    due = db.query(DueRecord).filter(DueRecord.id == id).first()
    if not due:
        raise HTTPException(status_code=404, detail="Due record not found")

    if current_user.role == "STUDENT":
        if not current_user.student_profile or due.student_id != current_user.student_profile.id:
            raise HTTPException(status_code=403, detail="You can only clear your own dues")

    ref_id = payment_reference or f"TXN-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    # Create payment record
    payment = DuePayment(
        due_record_id=due.id,
        student_id=due.student_id,
        amount=due.amount,
        payment_reference=ref_id,
        payment_status="successful",
        paid_at=datetime.datetime.utcnow()
    )
    db.add(payment)

    # Mark due as cleared
    due.status = "cleared"
    due.remarks = f"Cleared via online payment ref {ref_id}"
    due.updated_at = datetime.datetime.utcnow()

    db.commit()

    log_audit(db, current_user.id, "DUE_CLEARED_PAYMENT", "DUE_RECORD", due.id, {"status": "pending"}, {"status": "cleared", "ref": ref_id})
    create_notification(
        db,
        user_id=due.student.user_id,
        title="Due Payment Successful",
        message=f"Payment of ₹{due.amount:.2f} for '{due.description}' confirmed. Ref: {ref_id}.",
        notification_type="success"
    )

    return {"message": "Due marked as cleared successfully", "payment_reference": ref_id}
