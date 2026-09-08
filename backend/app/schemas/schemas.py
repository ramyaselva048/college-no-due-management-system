from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
import datetime

# --- Auth Schemas ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSignUp(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    register_number: str
    department_id: int
    course_id: int
    year: int = 4
    section: str = "A"
    admission_year: int = 2022
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)

# --- Department & Course Schemas ---
class DepartmentBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DepartmentOut(DepartmentBase):
    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    name: str
    code: str
    department_id: int
    duration: int = 4
    is_active: bool = True

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[int] = None
    duration: Optional[int] = None
    is_active: Optional[bool] = None

class CourseOut(CourseBase):
    id: int
    department_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Due Category Schemas ---
class DueCategoryBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool = True

class DueCategoryCreate(DueCategoryBase):
    pass

class DueCategoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class DueCategoryOut(DueCategoryBase):
    id: int
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Student Profile Schemas ---
class StudentBase(BaseModel):
    full_name: str
    register_number: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: int
    course_id: int
    year: int = 4
    section: str = "A"
    admission_year: int = 2022

class StudentCreate(StudentBase):
    user_id: int

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    year: Optional[int] = None
    section: Optional[str] = None
    department_id: Optional[int] = None
    course_id: Optional[int] = None

class StudentOut(StudentBase):
    id: int
    user_id: int
    department_name: Optional[str] = None
    course_name: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Staff Profile Schemas ---
class StaffBase(BaseModel):
    full_name: str
    employee_id: str
    email: EmailStr
    phone: Optional[str] = None
    department_id: int
    designation: str = "Assistant Professor"

class StaffCreate(StaffBase):
    password: str = Field(..., min_length=6)

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    department_id: Optional[int] = None

class StaffOut(StaffBase):
    id: int
    user_id: int
    department_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Due Record Schemas ---
class DueRecordCreate(BaseModel):
    student_id: int
    department_id: Optional[int] = None  # If staff, automatically assigned to staff's department
    category_id: int
    amount: float
    description: str
    remarks: Optional[str] = None

class DueRecordUpdate(BaseModel):
    amount: Optional[float] = None
    status: Optional[str] = None  # pending, cleared, waived
    description: Optional[str] = None
    remarks: Optional[str] = None

class DueRecordOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_reg_no: Optional[str] = None
    student_email: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    category_id: int
    category_name: Optional[str] = None
    amount: float
    status: str
    description: str
    remarks: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

# --- No Due Request & Approval Schemas ---
class NoDueRequestCreate(BaseModel):
    remarks: Optional[str] = None

class NoDueApprovalUpdate(BaseModel):
    status: str  # approved, rejected
    remarks: Optional[str] = None

class NoDueApprovalOut(BaseModel):
    id: int
    request_id: int
    department_id: int
    department_name: Optional[str] = None
    approved_by: Optional[int] = None
    approver_name: Optional[str] = None
    status: str
    remarks: Optional[str] = None
    approved_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class NoDueRequestOut(BaseModel):
    id: int
    student_id: int
    student_name: Optional[str] = None
    student_reg_no: Optional[str] = None
    course_name: Optional[str] = None
    department_name: Optional[str] = None
    status: str  # submitted, under_review, approved, rejected, completed
    submitted_at: datetime.datetime
    reviewed_at: Optional[datetime.datetime] = None
    reviewed_by: Optional[int] = None
    remarks: Optional[str] = None
    approvals: List[NoDueApprovalOut] = []
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Certificate Schemas ---
class CertificateOut(BaseModel):
    id: int
    request_id: int
    student_id: int
    student_name: Optional[str] = None
    register_number: Optional[str] = None
    course_name: Optional[str] = None
    department_name: Optional[str] = None
    certificate_number: str
    verification_code: str
    issued_at: datetime.datetime
    is_valid: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class PublicCertificateVerifyOut(BaseModel):
    is_valid: bool
    certificate_number: str
    verification_code: str
    student_name: str
    register_number: str
    course_name: str
    department_name: str
    academic_year: str
    issued_at: datetime.datetime
    college_name: str
    status_message: str

# --- Student Summary ---
class DepartmentDueStatus(BaseModel):
    department_id: int
    department_name: str
    department_code: str
    pending_amount: float
    total_dues_count: int
    pending_dues_count: int
    status: str  # 'cleared' or 'pending'
    approval_status: Optional[str] = None  # None, 'pending', 'approved', 'rejected'
    remarks: Optional[str] = None

class StudentSummaryOut(BaseModel):
    student: StudentOut
    total_dues_amount: float
    pending_dues_amount: float
    cleared_dues_amount: float
    waived_dues_amount: float
    total_departments: int
    cleared_departments_count: int
    pending_departments_count: int
    clearance_percentage: int
    can_request_no_due: bool
    active_request: Optional[NoDueRequestOut] = None
    issued_certificate: Optional[CertificateOut] = None
    department_statuses: List[DepartmentDueStatus] = []

# --- Staff Summary ---
class StaffDashboardOut(BaseModel):
    department_id: int
    department_name: str
    department_code: str
    total_students: int
    pending_dues_count: int
    pending_dues_amount: float
    cleared_dues_count: int
    pending_approvals_count: int
    approved_approvals_count: int
    rejected_approvals_count: int

# --- Admin Dashboard ---
class AdminDashboardStats(BaseModel):
    total_students: int
    total_staff: int
    total_departments: int
    total_courses: int
    pending_dues_count: int
    pending_dues_amount: float
    cleared_dues_count: int
    cleared_dues_amount: float
    pending_requests_count: int
    approved_requests_count: int
    rejected_requests_count: int
    valid_certificates_count: int
    department_breakdown: List[dict] = []
    monthly_requests: List[dict] = []

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Audit Log Schemas ---
class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    old_values: Optional[str] = None
    new_values: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
