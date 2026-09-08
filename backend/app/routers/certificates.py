import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.app.core.database import get_db
from backend.app.models.models import Certificate, NoDueRequest, Student, User, Department, Course
from backend.app.schemas.schemas import CertificateOut, PublicCertificateVerifyOut
from backend.app.routers.deps import get_current_user, get_current_student
from backend.app.services.audit_service import log_audit
from backend.app.services.notification_service import create_notification
from backend.app.services.pdf_service import generate_certificate_pdf

router = APIRouter(prefix="/certificates", tags=["Certificates"])

@router.post("/request/{request_id}/issue", response_model=CertificateOut)
def issue_certificate(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administration can issue official certificates")

    req = db.query(NoDueRequest).filter(NoDueRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="No Due Request not found")

    # Rule 11: Certificate cannot be issued before all required approvals
    pending_approvals = [a for a in req.approvals if a.status != "approved"]
    if pending_approvals:
        unapproved_depts = [a.department.name for a in pending_approvals if a.department]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot issue certificate. Clearances pending/rejected from: {', '.join(unapproved_depts)}"
        )

    # Check if certificate already exists
    existing = db.query(Certificate).filter(Certificate.request_id == request_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Certificate has already been issued for this request")

    # Generate unique certificate number: NDC-2026-XXXXXX
    cert_count = db.query(Certificate).count() + 1
    cert_number = f"NDC-2026-{cert_count:06d}"
    verif_code = f"VFY-{uuid.uuid4().hex[:12].upper()}"

    cert = Certificate(
        request_id=req.id,
        student_id=req.student_id,
        certificate_number=cert_number,
        verification_code=verif_code,
        issued_at=datetime.datetime.utcnow(),
        is_valid=True
    )
    db.add(cert)

    req.status = "completed"
    req.reviewed_at = datetime.datetime.utcnow()
    req.reviewed_by = current_user.id

    db.commit()
    db.refresh(cert)

    # Audit log
    log_audit(db, current_user.id, "CERTIFICATE_ISSUED", "CERTIFICATE", cert.id, None, {
        "cert_number": cert_number,
        "student_id": req.student_id,
        "verification_code": verif_code
    })

    # Notify student
    create_notification(
        db,
        user_id=req.student.user_id,
        title="No Due Certificate Issued!",
        message=f"Congratulations! Your official No Due Certificate #{cert_number} has been issued and is available for download.",
        notification_type="success"
    )

    st = req.student
    return {
        "id": cert.id,
        "request_id": cert.request_id,
        "student_id": cert.student_id,
        "student_name": st.full_name if st else "",
        "register_number": st.register_number if st else "",
        "course_name": st.course.name if st and st.course else "",
        "department_name": st.department.name if st and st.department else "",
        "certificate_number": cert.certificate_number,
        "verification_code": cert.verification_code,
        "issued_at": cert.issued_at,
        "is_valid": cert.is_valid,
        "created_at": cert.created_at
    }

@router.get("/my", response_model=List[CertificateOut])
def get_my_certificates(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    certs = db.query(Certificate).filter(
        Certificate.student_id == student.id
    ).order_by(Certificate.issued_at.desc()).all()

    result = []
    for c in certs:
        result.append({
            "id": c.id,
            "request_id": c.request_id,
            "student_id": c.student_id,
            "student_name": student.full_name,
            "register_number": student.register_number,
            "course_name": student.course.name if student.course else "",
            "department_name": student.department.name if student.department else "",
            "certificate_number": c.certificate_number,
            "verification_code": c.verification_code,
            "issued_at": c.issued_at,
            "is_valid": c.is_valid,
            "created_at": c.created_at
        })
    return result

@router.get("")
def get_all_certificates(
    is_valid: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in ["ADMIN", "STAFF"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    query = db.query(Certificate).join(Student)
    if is_valid is not None:
        query = query.filter(Certificate.is_valid == is_valid)
    if search:
        p = f"%{search}%"
        query = query.filter(
            (Certificate.certificate_number.ilike(p)) |
            (Certificate.verification_code.ilike(p)) |
            (Student.full_name.ilike(p)) |
            (Student.register_number.ilike(p))
        )

    total = query.count()
    certs = query.order_by(Certificate.issued_at.desc()).offset(skip).limit(limit).all()

    result = []
    for c in certs:
        st = c.student
        result.append({
            "id": c.id,
            "request_id": c.request_id,
            "student_id": c.student_id,
            "student_name": st.full_name if st else "",
            "register_number": st.register_number if st else "",
            "course_name": st.course.name if st and st.course else "",
            "department_name": st.department.name if st and st.department else "",
            "certificate_number": c.certificate_number,
            "verification_code": c.verification_code,
            "issued_at": c.issued_at,
            "is_valid": c.is_valid,
            "created_at": c.created_at
        })

    return {"total": total, "certificates": result}

@router.get("/verify/{verification_code}", response_model=PublicCertificateVerifyOut)
def verify_certificate_public(
    verification_code: str,
    db: Session = Depends(get_db)
):
    # Rule 8: Public certificate verification page
    # Anyone with the verification code should be able to verify:
    # - Certificate number, Student name, Register number, Course, Department, Issue date, Valid/Revoked status
    cert = db.query(Certificate).filter(
        Certificate.verification_code == verification_code.strip()
    ).first()

    if not cert:
        raise HTTPException(
            status_code=404,
            detail="Certificate with this verification code was not found in institutional records."
        )

    st = cert.student
    status_msg = "AUTHENTIC & VALID" if cert.is_valid else "REVOKED / INVALID"

    return {
        "is_valid": cert.is_valid,
        "certificate_number": cert.certificate_number,
        "verification_code": cert.verification_code,
        "student_name": st.full_name if st else "N/A",
        "register_number": st.register_number if st else "N/A",
        "course_name": st.course.name if st and st.course else "N/A",
        "department_name": st.department.name if st and st.department else "N/A",
        "academic_year": f"Class of {st.admission_year + (st.course.duration if st and st.course else 4)}" if st else "N/A",
        "issued_at": cert.issued_at,
        "college_name": "Apex Institute of Technology & Higher Education",
        "status_message": status_msg
    }

@router.get("/{id}/download")
def download_certificate_pdf(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(Certificate.id == id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Rule 13: Only authorized users can download certificates
    if current_user.role == "STUDENT":
        if not current_user.student_profile or cert.student_id != current_user.student_profile.id:
            raise HTTPException(status_code=403, detail="You are not authorized to download this certificate")

    st = cert.student
    course_name = st.course.name if st and st.course else "Undergraduate Program"
    dept_name = st.department.name if st and st.department else "Academic Department"
    acad_year = f"{st.year}th Year ({st.admission_year}-{st.admission_year + 4})" if st else "2022-2026"

    pdf_bytes = generate_certificate_pdf(
        student_name=st.full_name if st else "STUDENT",
        register_number=st.register_number if st else "REG000",
        course_name=course_name,
        department_name=dept_name,
        academic_year=acad_year,
        certificate_number=cert.certificate_number,
        verification_code=cert.verification_code,
        issued_at=cert.issued_at
    )

    filename = f"NoDueCertificate_{st.register_number if st else cert.certificate_number}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.patch("/{id}/revoke")
def revoke_certificate(
    id: int,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only administrators can revoke certificates")

    cert = db.query(Certificate).filter(Certificate.id == id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    cert.is_valid = False
    cert.updated_at = datetime.datetime.utcnow()
    db.commit()

    log_audit(db, current_user.id, "CERTIFICATE_REVOKED", "CERTIFICATE", cert.id, {"is_valid": True}, {"is_valid": False, "reason": reason})
    
    if cert.student:
        create_notification(
            db,
            user_id=cert.student.user_id,
            title="Certificate Revoked",
            message=f"Your certificate #{cert.certificate_number} has been revoked by administration. Reason: {reason or 'Administrative review'}.",
            notification_type="danger"
        )

    return {"message": "Certificate revoked successfully", "is_valid": False}
