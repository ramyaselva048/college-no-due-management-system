export type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  full_name?: string;
  is_active?: boolean;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  department_id: number;
  department_name?: string;
  duration: number;
  is_active: boolean;
  created_at?: string;
}

export interface DueCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface StudentProfile {
  id: number;
  user_id: number;
  register_number: string;
  full_name: string;
  email: string;
  phone?: string;
  department_id: number;
  department_name?: string;
  course_id: number;
  course_name?: string;
  year: number;
  section: string;
  admission_year: number;
  created_at?: string;
}

export interface StaffProfile {
  id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone?: string;
  department_id: number;
  department_name?: string;
  designation?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface DueRecord {
  id: number;
  student_id: number;
  student_name?: string;
  student_reg_no?: string;
  student_email?: string;
  department_id: number;
  department_name?: string;
  category_id: number;
  category_name?: string;
  amount: number;
  status: 'pending' | 'cleared' | 'waived';
  description: string;
  remarks?: string;
  created_at: string;
  updated_at?: string;
}

export interface DepartmentDueSummary {
  department_id: number;
  department_name: string;
  department_code: string;
  has_dues: boolean;
  total_dues_amount: number;
  pending_dues_amount: number;
  cleared_dues_amount: number;
  status: 'CLEAR' | 'PENDING';
}

export interface StudentDuesSummary {
  student: StudentProfile;
  total_due_amount: number;
  pending_due_amount: number;
  cleared_due_amount: number;
  can_request_no_due: boolean;
  active_request: any | null;
  departments_summary: DepartmentDueSummary[];
}

export interface NoDueApproval {
  id: number;
  request_id: number;
  department_id: number;
  department_name?: string;
  approved_by?: number;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  approved_at?: string;
  created_at?: string;
}

export interface NoDueRequest {
  id: number;
  student_id: number;
  student_name?: string;
  student_reg_no?: string;
  course_name?: string;
  department_name?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  remarks?: string;
  approvals: NoDueApproval[];
  created_at: string;
}

export interface Certificate {
  id: number;
  request_id: number;
  student_id: number;
  student_name?: string;
  register_number?: string;
  course_name?: string;
  department_id?: number;
  department_name?: string;
  certificate_number: string;
  verification_code: string;
  issued_at: string;
  is_valid: boolean;
  issued_by?: number;
  issued_by_name?: string;
  revoked_by?: number;
  revoked_by_name?: string;
  revoked_at?: string;
  revocation_reason?: string;
  created_at: string;
  updated_at?: string;
}

export interface PublicVerificationResult {
  is_valid: boolean;
  certificate_number: string;
  verification_code: string;
  student_name: string;
  register_number: string;
  course_name: string;
  department_name: string;
  academic_year: string;
  issued_at: string;
  issued_by?: string;
  revoked_at?: string;
  revocation_reason?: string;
  college_name: string;
  status_message: string;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'danger';
  is_read: boolean;
  created_at: string;
}

export interface StaffDashboardData {
  department_id: number;
  department_name: string;
  department_code: string;
  total_students: number;
  pending_dues_count: number;
  pending_dues_amount: number;
  cleared_dues_count: number;
  pending_approvals_count: number;
  approved_approvals_count: number;
  rejected_approvals_count: number;
}

export interface AdminDashboardData {
  stats: {
    total_students: number;
    total_staff: number;
    total_departments: number;
    total_courses: number;
    pending_dues_count: number;
    pending_dues_amount: number;
    cleared_dues_count: number;
    cleared_dues_amount: number;
    pending_requests_count: number;
    approved_requests_count: number;
    rejected_requests_count: number;
    valid_certificates_count: number;
  };
  department_breakdown: Array<{
    department_id: number;
    department_name: string;
    department_code: string;
    pending_count: number;
    pending_amount: number;
  }>;
  recent_requests: any[];
  recent_dues: any[];
  recent_certificates: any[];
  recent_audits: any[];
}

export interface AuditLog {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  created_at: string;
}
