import crypto from 'crypto';

export interface UserRecord {
  id: number;
  email: string;
  password_hash: string;
  role: 'STUDENT' | 'STAFF' | 'ADMIN';
  is_active: boolean;
  is_registered?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DepartmentRecord {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface CourseRecord {
  id: number;
  name: string;
  code: string;
  department_id: number;
  duration: number;
  is_active: boolean;
  created_at: string;
}

export interface DueCategoryRecord {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface StudentRecord {
  id: number;
  user_id: number;
  register_number: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: number;
  course_id: number;
  year: number;
  section: string;
  admission_year: number;
  created_at: string;
}

export interface StaffRecord {
  id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: number;
  designation: string;
  created_at: string;
}

export interface DueRecordEntity {
  id: number;
  student_id: number;
  department_id: number;
  category_id: number;
  amount: number;
  status: 'pending' | 'cleared' | 'waived';
  description: string;
  remarks?: string;
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at?: string;
}

export interface DuePaymentRecord {
  id: number;
  due_record_id: number;
  student_id: number;
  amount: number;
  payment_reference: string;
  payment_status: string;
  paid_at: string;
}

export interface NoDueApprovalRecord {
  id: number;
  request_id: number;
  department_id: number;
  approved_by?: number;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  approved_at?: string;
  created_at: string;
}

export interface NoDueRequestRecord {
  id: number;
  student_id: number;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: number;
  remarks?: string;
  created_at: string;
}

export interface CertificateRecord {
  id: number;
  request_id: number;
  student_id: number;
  certificate_number: string;
  verification_code: string;
  issued_at: string;
  is_valid: boolean;
  created_at: string;
  updated_at?: string;
}

export interface NotificationRecord {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'danger';
  is_read: boolean;
  created_at: string;
}

export interface AuditLogRecord {
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

// Password hashing using Node crypto
export function hashPassword(password: string): string {
  const salt = 'college_nodue_salt_v1';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Simple token system
const TOKEN_SECRET = 'college_nodue_jwt_secret_2026';

export function createToken(payload: { sub: number; role: string; type: 'access' | 'refresh' }, expiresInDays = 1): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + expiresInDays * 86400000;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { sub: number; role: string; type: 'access' | 'refresh'; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// In-Memory Database Storage
class InMemoryDatabase {
  users: UserRecord[] = [];
  departments: DepartmentRecord[] = [];
  courses: CourseRecord[] = [];
  dueCategories: DueCategoryRecord[] = [];
  students: StudentRecord[] = [];
  staff: StaffRecord[] = [];
  dueRecords: DueRecordEntity[] = [];
  duePayments: DuePaymentRecord[] = [];
  noDueRequests: NoDueRequestRecord[] = [];
  noDueApprovals: NoDueApprovalRecord[] = [];
  certificates: CertificateRecord[] = [];
  notifications: NotificationRecord[] = [];
  auditLogs: AuditLogRecord[] = [];

  private nextId = {
    users: 1,
    departments: 1,
    courses: 1,
    dueCategories: 1,
    students: 1,
    staff: 1,
    dueRecords: 1,
    duePayments: 1,
    noDueRequests: 1,
    noDueApprovals: 1,
    certificates: 1,
    notifications: 1,
    auditLogs: 1,
  };

  constructor() {
    this.seed();
  }

  seed() {
    const now = new Date().toISOString();

    // 1. Departments
    const deptData = [
      { name: 'Central Library', code: 'LIB', description: 'Library book returns, journal access, and fine clearance.' },
      { name: 'Accounts & Finance', code: 'ACC', description: 'Tuition, examination fees, library deposits, and scholarship audits.' },
      { name: 'Computer Science Laboratory', code: 'CSL', description: 'Lab equipment, computer hardware, robotics kits, and apparatus check.' },
      { name: 'Academic Department (CSE)', code: 'CSE', description: 'Departmental project clearances, symposium dues, and seminar records.' },
      { name: 'Hostel & Student Housing', code: 'HST', description: 'Room inventory, mess bill dues, electricity meters, and caution return.' },
      { name: 'Transport Services', code: 'TRN', description: 'College bus pass, parking tags, and transport clearance.' },
      { name: 'Sports & Physical Education', code: 'SPT', description: 'Sports kit, tournament gear, gym membership, and athletics return.' },
      { name: 'Training & Placement Cell', code: 'TPO', description: 'Placement training fee, company drive clearance, and offer verification.' }
    ];

    deptData.forEach(d => {
      this.departments.push({
        id: this.nextId.departments++,
        name: d.name,
        code: d.code,
        description: d.description,
        is_active: true,
        created_at: now
      });
    });

    // 2. Courses
    const cseDept = this.departments.find(d => d.code === 'CSE')!;
    const coursesData = [
      { name: 'B.Tech Computer Science & Engineering', code: 'BTECH_CSE', dept_id: cseDept.id, duration: 4 },
      { name: 'B.Tech Information Technology', code: 'BTECH_IT', dept_id: cseDept.id, duration: 4 },
      { name: 'B.Tech Electronics & Communication', code: 'BTECH_ECE', dept_id: cseDept.id, duration: 4 },
      { name: 'Master of Computer Applications', code: 'MCA', dept_id: cseDept.id, duration: 2 }
    ];

    coursesData.forEach(c => {
      this.courses.push({
        id: this.nextId.courses++,
        name: c.name,
        code: c.code,
        department_id: c.dept_id,
        duration: c.duration,
        is_active: true,
        created_at: now
      });
    });

    // 3. Due Categories
    const catData = [
      { name: 'Library Book Overdue Fine', code: 'LIB_BOOK', description: 'Late book return fine per library regulations.' },
      { name: 'Tuition & Term Fee', code: 'FEE_TUITION', description: 'Pending semester tuition or registration fee.' },
      { name: 'Laboratory Equipment Replacement', code: 'LAB_EQUIP', description: 'Damaged or unreturned lab components.' },
      { name: 'Hostel Mess Dues', code: 'HST_MESS', description: 'Unpaid monthly mess bill balance.' },
      { name: 'Transport Pass Renewal', code: 'TRN_PASS', description: 'Bus pass semester balance.' },
      { name: 'Sports Uniform & Gear', code: 'SPT_GEAR', description: 'College sports jersey or gear unreturned.' },
      { name: 'Department Association Dues', code: 'DEPT_ASSOC', description: 'Student symposium or technical chapter dues.' }
    ];

    catData.forEach(cat => {
      this.dueCategories.push({
        id: this.nextId.dueCategories++,
        name: cat.name,
        code: cat.code,
        description: cat.description,
        is_active: true,
        created_at: now
      });
    });

    // 4. Sole Admin User
    const adminUser: UserRecord = {
      id: this.nextId.users++,
      email: 'ramya@sasurie.edu',
      password_hash: hashPassword('RamyaSasurie@123'),
      role: 'ADMIN',
      is_active: true,
      created_at: now
    };
    this.users.push(adminUser);

    // 5. Staff User
    const libDept = this.departments.find(d => d.code === 'LIB')!;
    const staffUser: UserRecord = {
      id: this.nextId.users++,
      email: 'staff.library@college.edu',
      password_hash: hashPassword('StaffPassword@123'),
      role: 'STAFF',
      is_active: true,
      created_at: now
    };
    this.users.push(staffUser);

    this.staff.push({
      id: this.nextId.staff++,
      user_id: staffUser.id,
      employee_id: 'EMP-LIB-101',
      full_name: 'Prof. Rajesh Kumar',
      email: staffUser.email,
      phone: '+91 98765 43210',
      department_id: libDept.id,
      designation: 'Chief Librarian & Clearance Officer',
      created_at: now
    });

    // 6. Student User
    const btechCourse = this.courses.find(c => c.code === 'BTECH_CSE')!;
    const studentUser: UserRecord = {
      id: this.nextId.users++,
      email: 'student@college.edu',
      password_hash: hashPassword('StudentPassword@123'),
      role: 'STUDENT',
      is_active: true,
      created_at: now
    };
    this.users.push(studentUser);

    const studentRecord: StudentRecord = {
      id: this.nextId.students++,
      user_id: studentUser.id,
      register_number: '2022BCSE042',
      full_name: 'Aditya Sharma',
      email: studentUser.email,
      phone: '+91 91234 56789',
      department_id: cseDept.id,
      course_id: btechCourse.id,
      year: 4,
      section: 'A',
      admission_year: 2022,
      created_at: now
    };
    this.students.push(studentRecord);

    // Initial dues for student
    const libCat = this.dueCategories.find(c => c.code === 'LIB_BOOK')!;
    const accDept = this.departments.find(d => d.code === 'ACC')!;
    const feeCat = this.dueCategories.find(c => c.code === 'FEE_TUITION')!;

    this.dueRecords.push({
      id: this.nextId.dueRecords++,
      student_id: studentRecord.id,
      department_id: libDept.id,
      category_id: libCat.id,
      amount: 150.0,
      status: 'cleared',
      description: 'Late return fine - Operating Systems Concepts (Silberschatz)',
      remarks: 'Cleared at Central Library counter',
      created_at: now
    });

    this.dueRecords.push({
      id: this.nextId.dueRecords++,
      student_id: studentRecord.id,
      department_id: accDept.id,
      category_id: feeCat.id,
      amount: 500.0,
      status: 'pending',
      description: 'Semester 8 Exam Form & Hall Ticket Processing Fee',
      remarks: 'Pending clearance before graduation',
      created_at: now
    });

    // Initial Notifications
    this.notifications.push({
      id: this.nextId.notifications++,
      user_id: studentUser.id,
      title: 'Welcome to No Due Portal',
      message: 'Track your departmental dues and apply for digital clearance certificate once all dues are settled.',
      notification_type: 'info',
      is_read: false,
      created_at: now
    });

    // Initial Audit Log
    this.auditLogs.push({
      id: this.nextId.auditLogs++,
      user_id: adminUser.id,
      user_email: adminUser.email,
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'SYSTEM',
      entity_id: 1,
      new_values: { message: 'College No Due System initialized with default datasets' },
      ip_address: '127.0.0.1',
      created_at: now
    });
  }

  logAudit(userId?: number, userEmail?: string, action?: string, entityType?: string, entityId?: number, oldValues?: any, newValues?: any, ip = '127.0.0.1') {
    this.auditLogs.unshift({
      id: this.nextId.auditLogs++,
      user_id: userId,
      user_email: userEmail || 'System',
      action: action || 'UNKNOWN',
      entity_type: entityType || 'GENERAL',
      entity_id: entityId,
      old_values: oldValues ? (typeof oldValues === 'string' ? oldValues : JSON.stringify(oldValues)) : undefined,
      new_values: newValues ? (typeof newValues === 'string' ? newValues : JSON.stringify(newValues)) : undefined,
      ip_address: ip,
      created_at: new Date().toISOString()
    });
  }

  createNotification(userId: number, title: string, message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') {
    const notif: NotificationRecord = {
      id: this.nextId.notifications++,
      user_id: userId,
      title,
      message,
      notification_type: type,
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    return notif;
  }
}

export const db = new InMemoryDatabase();
