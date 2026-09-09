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

export function createToken(payload: { sub: number; role: string; type: 'access' | 'refresh'; email?: string }, expiresInDays = 1): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + expiresInDays * 86400000;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { sub: number; role: string; type: 'access' | 'refresh'; exp: number; email?: string } | null {
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

    // 1. Comprehensive Engineering Departments & Institutional Clearance Units
    const deptData = [
      { name: 'Central Library', code: 'LIB', description: 'Library book returns, journal access, and fine clearance.' },
      { name: 'Accounts & Finance', code: 'ACC', description: 'Tuition, examination fees, library deposits, and scholarship audits.' },
      { name: 'Computer Science Laboratory', code: 'CSL', description: 'Lab equipment, computer hardware, robotics kits, and apparatus check.' },
      { name: 'Department of Computer Science & Engineering', code: 'CSE', description: 'Departmental project clearances, symposium dues, and seminar records.' },
      { name: 'Department of Information Technology', code: 'IT', description: 'IT departmental laboratory, project submissions, and symposium clearances.' },
      { name: 'Department of Artificial Intelligence & Data Science', code: 'AIDS', description: 'AI & Data Science lab components, projects, and departmental records.' },
      { name: 'Department of Electronics & Communication Engineering', code: 'ECE', description: 'ECE microelectronics, signal lab, and project approvals.' },
      { name: 'Department of Electrical & Electronics Engineering', code: 'EEE', description: 'EEE machines lab, power electronics hardware, and project clearances.' },
      { name: 'Department of Mechanical Engineering', code: 'MECH', description: 'Workshop, CAD lab, manufacturing tools, and machinery clearances.' },
      { name: 'Department of Civil Engineering', code: 'CIVIL', description: 'Surveying lab, structural testing equipment, and civil project returns.' },
      { name: 'Department of Biomedical Engineering', code: 'BME', description: 'Biomedical instrumentation, sensor kits, and lab clearance.' },
      { name: 'Department of Mechatronics Engineering', code: 'MTE', description: 'Robotics automation, hydraulics, pneumatics, and embedded kits.' },
      { name: 'Department of Automobile Engineering', code: 'AUTO', description: 'Automotive chassis lab, engine testing equipment, and fabrication dues.' },
      { name: 'Department of Chemical Engineering', code: 'CHEM', description: 'Chemical reaction engineering lab, process instrumentation, and glassware dues.' },
      { name: 'Department of Biotechnology', code: 'BIO', description: 'Bioprocess lab, molecular biology kits, and culture room clearances.' },
      { name: 'Department of Science & Humanities', code: 'S&H', description: 'Physics, Chemistry, and English communication language lab clearances.' },
      { name: 'Department of Management Studies', code: 'MBA', description: 'MBA case study library, corporate projects, and departmental dues.' },
      { name: 'Department of Computer Applications', code: 'MCA', description: 'MCA software project repositories, lab stations, and seminar dues.' },
      { name: 'Hostel & Student Housing', code: 'HST', description: 'Room inventory, mess bill dues, electricity meters, and caution return.' },
      { name: 'Transport Services', code: 'TRN', description: 'College bus pass, parking tags, and transport clearance.' },
      { name: 'Sports & Physical Education', code: 'SPT', description: 'Sports kit, tournament gear, gym membership, and athletics return.' },
      { name: 'Training & Placement Cell', code: 'TPO', description: 'Placement training fee, company drive clearance, and offer verification.' },
      { name: 'Office of Controller of Examinations', code: 'COE', description: 'Grade sheet dues, exam hall clearance, and graduation approvals.' },
      { name: 'NSS, Red Cross & Student Welfare', code: 'NSS', description: 'Student club inventory, community project dues, and welfare approvals.' }
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

    // 2. Comprehensive Engineering Courses & Degrees
    const getDeptId = (code: string) => {
      const d = this.departments.find(dept => dept.code === code);
      return d ? d.id : (this.departments.find(dept => dept.code === 'CSE')?.id || 1);
    };

    const coursesData = [
      // Undergraduate Engineering (B.E. / B.Tech)
      { name: 'B.E. Computer Science and Engineering', code: 'BE_CSE', dept_code: 'CSE', duration: 4 },
      { name: 'B.Tech Artificial Intelligence and Data Science', code: 'BTECH_AIDS', dept_code: 'AIDS', duration: 4 },
      { name: 'B.Tech Information Technology', code: 'BTECH_IT', dept_code: 'IT', duration: 4 },
      { name: 'B.Tech Artificial Intelligence and Machine Learning', code: 'BTECH_AIML', dept_code: 'AIDS', duration: 4 },
      { name: 'B.Tech Cyber Security', code: 'BTECH_CS', dept_code: 'CSE', duration: 4 },
      { name: 'B.Tech Computer Science and Business Systems', code: 'BTECH_CSBS', dept_code: 'CSE', duration: 4 },
      { name: 'B.E. Electronics and Communication Engineering', code: 'BE_ECE', dept_code: 'ECE', duration: 4 },
      { name: 'B.E. Electrical and Electronics Engineering', code: 'BE_EEE', dept_code: 'EEE', duration: 4 },
      { name: 'B.E. Mechanical Engineering', code: 'BE_MECH', dept_code: 'MECH', duration: 4 },
      { name: 'B.E. Civil Engineering', code: 'BE_CIVIL', dept_code: 'CIVIL', duration: 4 },
      { name: 'B.E. Mechatronics Engineering', code: 'BE_MTE', dept_code: 'MECH', duration: 4 },
      { name: 'B.E. Biomedical Engineering', code: 'BE_BME', dept_code: 'BME', duration: 4 },
      { name: 'B.E. Automobile Engineering', code: 'BE_AUTO', dept_code: 'MECH', duration: 4 },
      { name: 'B.Tech Chemical Engineering', code: 'BTECH_CHEM', dept_code: 'CSE', duration: 4 },
      { name: 'B.Tech Biotechnology', code: 'BTECH_BIO', dept_code: 'BME', duration: 4 },
      // Postgraduate Engineering & Management (M.E. / M.Tech / MBA / MCA)
      { name: 'M.E. Computer Science and Engineering', code: 'ME_CSE', dept_code: 'CSE', duration: 2 },
      { name: 'M.E. VLSI Design', code: 'ME_VLSI', dept_code: 'ECE', duration: 2 },
      { name: 'M.E. Embedded System Technologies', code: 'ME_EST', dept_code: 'ECE', duration: 2 },
      { name: 'M.E. Power Electronics and Drives', code: 'ME_PED', dept_code: 'EEE', duration: 2 },
      { name: 'M.E. Structural Engineering', code: 'ME_STR', dept_code: 'CIVIL', duration: 2 },
      { name: 'M.E. CAD / CAM', code: 'ME_CAD', dept_code: 'MECH', duration: 2 },
      { name: 'M.Tech Data Science', code: 'MTECH_DS', dept_code: 'AIDS', duration: 2 },
      { name: 'Master of Business Administration (MBA)', code: 'MBA', dept_code: 'MBA', duration: 2 },
      { name: 'Master of Computer Applications (MCA)', code: 'MCA', dept_code: 'MCA', duration: 2 }
    ];

    coursesData.forEach(c => {
      this.courses.push({
        id: this.nextId.courses++,
        name: c.name,
        code: c.code,
        department_id: getDeptId(c.dept_code),
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

    // 4. Admin Users
    const adminUser: UserRecord = {
      id: this.nextId.users++,
      email: 'ramya@sasurie.edu',
      password_hash: hashPassword('RamyaSasurie@123'),
      role: 'ADMIN',
      is_active: true,
      created_at: now
    };
    this.users.push(adminUser);

    const sasurieAdmin: UserRecord = {
      id: this.nextId.users++,
      email: 'ramyacse23@sasurie.com',
      password_hash: hashPassword('RamyaSasurie@123'),
      role: 'ADMIN',
      is_active: true,
      created_at: now
    };
    this.users.push(sasurieAdmin);

    const genericAdmin: UserRecord = {
      id: this.nextId.users++,
      email: 'admin@college.edu',
      password_hash: hashPassword('AdminPassword@123'),
      role: 'ADMIN',
      is_active: true,
      created_at: now
    };
    this.users.push(genericAdmin);

    // 5. Staff Users (Departmental Clearance Officers)
    const seedStaffMembers = [
      {
        email: 'staff.library@college.edu',
        emp_id: 'EMP-LIB-101',
        name: 'Prof. Rajesh Kumar',
        phone: '+91 98765 43210',
        dept_code: 'LIB',
        designation: 'Chief Librarian & Clearance Officer'
      },
      {
        email: 'staff.cse@college.edu',
        emp_id: 'EMP-CSE-201',
        name: 'Dr. Ananya Sundaram',
        phone: '+91 98401 22334',
        dept_code: 'CSE',
        designation: 'HOD & Departmental Clearance Incharge'
      },
      {
        email: 'staff.accounts@college.edu',
        emp_id: 'EMP-ACC-301',
        name: 'Mr. K. Murugesan',
        phone: '+91 94432 55667',
        dept_code: 'ACC',
        designation: 'Senior Accounts Superintendent'
      },
      {
        email: 'staff.hostel@college.edu',
        emp_id: 'EMP-HST-401',
        name: 'Prof. Vigneshwaran',
        phone: '+91 97890 11223',
        dept_code: 'HST',
        designation: 'Chief Hostel Warden'
      },
      {
        email: 'staff.lab@college.edu',
        emp_id: 'EMP-CSL-501',
        name: 'Er. S. Prakash',
        phone: '+91 99420 33445',
        dept_code: 'CSL',
        designation: 'Central Computing Systems Administrator'
      }
    ];

    seedStaffMembers.forEach(sm => {
      const dept = this.departments.find(d => d.code === sm.dept_code) || this.departments[0];
      const sUser: UserRecord = {
        id: this.nextId.users++,
        email: sm.email,
        password_hash: hashPassword('StaffPassword@123'),
        role: 'STAFF',
        is_active: true,
        created_at: now
      };
      this.users.push(sUser);

      this.staff.push({
        id: this.nextId.staff++,
        user_id: sUser.id,
        employee_id: sm.emp_id,
        full_name: sm.name,
        email: sm.email,
        phone: sm.phone,
        department_id: dept.id,
        designation: sm.designation,
        created_at: now
      });
    });

    // 6. Student User
    const btechCourse = this.courses.find(c => c.code === 'BE_CSE' || c.code === 'BTECH_CSE') || this.courses[0];
    const cseDept = this.departments.find(d => d.code === 'CSE') || this.departments[0];
    const studentUser: UserRecord = {
      id: this.nextId.users++,
      email: 'student@college.edu',
      password_hash: hashPassword('StudentPassword@123'),
      role: 'STUDENT',
      is_active: true,
      is_registered: true,
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
    const libDept = this.departments.find(d => d.code === 'LIB') || this.departments[0];
    const libCat = this.dueCategories.find(c => c.code === 'LIB_BOOK')!;
    const accDept = this.departments.find(d => d.code === 'ACC') || this.departments[0];
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
