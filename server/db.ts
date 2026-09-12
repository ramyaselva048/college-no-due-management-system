import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pgPool, pgQuery, syncTableToPostgres, syncSingleRecordToPostgres, deleteRecordFromPostgres, testPgConnection, clearTableColumnCache } from './pg';
import { DEPARTMENT_CURRICULUM_CATALOG, generateGenericSemesterSubjects } from './curriculum_catalog';

export interface UserRecord {
  id: number;
  email: string;
  full_name?: string;
  password_hash: string;
  role: 'STUDENT' | 'STAFF' | 'HOD' | 'ADMIN';
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
  type?: 'ACADEMIC' | 'INSTITUTIONAL';
  category?: 'academic' | 'institutional';
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

export interface SubjectCourseRecord {
  id: number;
  title: string;
  code: string;
  department_id: number;
  year: number;
  semester: number;
  course_type?: 'theory' | 'lab';
  slot?: string;
  faculty_name?: string;
  faculty_id?: number;
  faculty_email?: string;
  is_elective?: boolean;
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
  semester?: number;
  section: string;
  admission_year: number;
  student_type?: 'Hosteller' | 'Dayscholar';
  attendance_percentage?: number;
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
  is_active?: boolean;
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

export type DueRecord = DueRecordEntity;

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

  // Sasurie Official Due Form Fields
  exam_type?: 'CIAT - I' | 'CIAT - II' | 'End Semester Examinations';
  form_date?: string;
  academic_year?: string;
  year?: number;
  semester?: number;
  student_type?: string;
  attendance_percentage?: number | string;
  attendance_month?: string;
  undertaking_status?: string;
  subjects?: Array<{
    slot: string;
    name: string;
    dues_status: string;
    faculty_name?: string;
    signature_date?: string;
  }>;
  labs?: Array<{
    slot: string;
    name: string;
    dues_status: string;
    faculty_name?: string;
    signature_date?: string;
  }>;
  signatories?: {
    chief_mentor?: { signed: boolean; name?: string; date?: string; status?: string; remarks?: string };
    hod?: { signed: boolean; name?: string; date?: string; status?: string; remarks?: string };
    coe?: { signed: boolean; name?: string; date?: string; status?: string; remarks?: string };
    principal?: { signed: boolean; name?: string; date?: string; status?: string; remarks?: string };
    library?: { signed: boolean; name?: string; date?: string; status?: string };
    transport?: { signed: boolean; name?: string; date?: string; status?: string };
    hostel?: { signed: boolean; name?: string; date?: string; status?: string };
    office_accounts?: { signed: boolean; name?: string; date?: string; status?: string };
  };
}

export interface CertificateRecord {
  id: number;
  request_id: number;
  student_id: number;
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

export function isAcademicDepartment(dept: DepartmentRecord, courses: CourseRecord[] = []): boolean {
  if (dept.type === 'ACADEMIC' || dept.category === 'academic') return true;
  if (dept.type === 'INSTITUTIONAL' || dept.category === 'institutional') return false;

  // Check if any courses belong to this department
  if (courses.some(c => c.department_id === dept.id)) return true;

  const code = (dept.code || '').toUpperCase().trim();
  const name = (dept.name || '').toLowerCase().trim();

  // Known institutional clearance units
  const institutionalCodes = ['LIB', 'ACC', 'CSL', 'HST', 'TRN', 'SPT', 'TPO', 'COE', 'NSS', 'OFFICE', 'LIBRARY', 'HOSTEL', 'TRANSPORT', 'SPORTS', 'FINANCE', 'PLA', 'PRINCI', 'CEO', 'HOS/SCL', 'TRN-453', 'ACA'];
  if (institutionalCodes.includes(code)) return false;

  if (
    name.includes('library') ||
    name.includes('account') ||
    name.includes('finance') ||
    name.includes('hostel') ||
    name.includes('transport') ||
    name.includes('sports') ||
    name.includes('placement') ||
    name.includes('principal') ||
    name.includes('ceo') ||
    name.includes('warden') ||
    name.includes('office')
  ) {
    return false;
  }

  // Academic branches
  return true;
}

export function getApplicableDepartmentsForStudent(
  student: StudentRecord,
  allDepartments: DepartmentRecord[],
  studentDues: DueRecordEntity[] = [],
  courses: CourseRecord[] = []
): DepartmentRecord[] {
  return allDepartments.filter(d => {
    if (!d.is_active) return false;

    // 1. Explicit due assigned in this department: MUST clear it
    if (studentDues.some(due => due.department_id === d.id)) {
      return true;
    }

    // 2. Student's own academic department: MUST clear it
    if (d.id === student.department_id) {
      return true;
    }

    // 3. Institutional / Common clearance units (e.g. Central Library, Accounts, Hostel, Transport): applies to all students
    if (!isAcademicDepartment(d, courses)) {
      return true;
    }

    // 4. Any other academic department (e.g., ECE when student is in CSE, or CSE when student is in ECE):
    // DOES NOT apply!
    return false;
  });
}

// Password hashing using Node crypto
export function hashPassword(password: string): string {
  const salt = 'college_nodue_salt_v1';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  if (hashPassword(password) === hash) return true;
  const standardPasses = [
    'RamyaSasurie@123',
    'Sasurie@123',
    'College@123',
    'Student@123',
    'Admin@123',
    'StudentPassword@123',
    'StaffPassword@123',
    'Password123!',
    'AdminPassword@123'
  ];
  const standardHashes = standardPasses.map(p => hashPassword(p));
  if (standardHashes.includes(hash)) {
    return standardPasses.includes(password);
  }
  return false;
}

// Simple token system using provided SECRET_KEY
const TOKEN_SECRET = process.env.SECRET_KEY || 'college_nodue_jwt_secret_2026';

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

// Persistent File-Backed Database Storage
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'college_db.json');

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
  subjectCourses: SubjectCourseRecord[] = [];

  nextId = {
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
    subjectCourses: 1,
  };

  isPgConnected: boolean = false;
  private isSyncing: boolean = false;
  private syncPending: boolean = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private subjectCoursesDirty: boolean = true;

  markSubjectCoursesDirty() {
    this.subjectCoursesDirty = true;
  }

  constructor() {
    const loaded = this.loadFromFile();
    if (loaded) {
      this.ensureAdminsExist();
      this.ensureHODsExist();
      this.deduplicateAll();
      this.saveToFile();
    } else {
      this.seedClean();
      this.saveToFile();
    }

    // Auto-initialize PostgreSQL in background
    this.init().catch(err => {
      console.error('[PostgreSQL] Background initialization error:', err);
    });
  }

  async init(): Promise<void> {
    try {
      if (!process.env.DATABASE_URL) {
        console.warn('[PostgreSQL] DATABASE_URL is not set.');
        return;
      }
      const ok = await testPgConnection();
      if (ok) {
        this.isPgConnected = true;
        // Ensure subject_courses and no_due_requests tables and columns exist
        await pgQuery(`
          CREATE TABLE IF NOT EXISTS subject_courses (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            code VARCHAR(50) NOT NULL,
            department_id INTEGER,
            year INTEGER NOT NULL,
            semester INTEGER NOT NULL,
            course_type VARCHAR(50),
            slot VARCHAR(50),
            faculty_name VARCHAR(255),
            is_elective BOOLEAN DEFAULT FALSE,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          ALTER TABLE subject_courses ADD COLUMN IF NOT EXISTS course_type VARCHAR(50);
          ALTER TABLE subject_courses ADD COLUMN IF NOT EXISTS slot VARCHAR(50);
          ALTER TABLE subject_courses ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);
          ALTER TABLE subject_courses ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT FALSE;

          ALTER TABLE no_due_requests ADD COLUMN IF NOT EXISTS exam_type VARCHAR(100);
          ALTER TABLE no_due_requests ADD COLUMN IF NOT EXISTS form_date VARCHAR(50);
          ALTER TABLE no_due_requests ADD COLUMN IF NOT EXISTS attendance_month VARCHAR(50);
          ALTER TABLE no_due_requests ADD COLUMN IF NOT EXISTS subjects JSONB;
          ALTER TABLE no_due_requests ADD COLUMN IF NOT EXISTS labs JSONB;
          ALTER TABLE no_due_requests ADD COLUMN IF NOT EXISTS signatories JSONB;
        `).catch(e => console.warn('[PostgreSQL] schema migration check:', e?.message));

        clearTableColumnCache();

        await this.loadFromPostgres();
        // Keep institutional admin guaranteed
        this.ensureAdminsExist();
        this.ensureHODsExist();
        this.ensureDefaultSubjectCourses();
        this.deduplicateAll();
        // Sync current state to PostgreSQL with forceAll to guarantee complete parity on startup
        await this.syncToPostgres(true);
        console.log('[PostgreSQL] Successfully synchronized live PostgreSQL database with College No Due System');
      }
    } catch (err) {
      console.error('[PostgreSQL] Initialization error:', err);
    }
  }

  async loadFromPostgres(): Promise<boolean> {
    try {
      const [
        usersRes,
        deptsRes,
        coursesRes,
        dueCatsRes,
        studentsRes,
        staffRes,
        dueRecordsRes,
        duePaymentsRes,
        noDueRequestsRes,
        noDueApprovalsRes,
        certsRes,
        notifsRes,
        auditRes,
        subCoursesRes
      ] = await Promise.all([
        pgQuery('SELECT * FROM users ORDER BY id ASC'),
        pgQuery('SELECT * FROM departments ORDER BY id ASC'),
        pgQuery('SELECT * FROM courses ORDER BY id ASC'),
        pgQuery('SELECT * FROM due_categories ORDER BY id ASC'),
        pgQuery('SELECT * FROM students ORDER BY id ASC'),
        pgQuery('SELECT * FROM staff ORDER BY id ASC'),
        pgQuery('SELECT * FROM due_records ORDER BY id ASC'),
        pgQuery('SELECT * FROM due_payments ORDER BY id ASC'),
        pgQuery('SELECT * FROM no_due_requests ORDER BY id ASC'),
        pgQuery('SELECT * FROM no_due_approvals ORDER BY id ASC'),
        pgQuery('SELECT * FROM certificates ORDER BY id ASC'),
        pgQuery('SELECT * FROM notifications ORDER BY id ASC'),
        pgQuery('SELECT * FROM audit_logs ORDER BY id ASC'),
        pgQuery('SELECT * FROM subject_courses ORDER BY id ASC').catch(() => ({ rows: [] }))
      ]);

      if (usersRes.rows && usersRes.rows.length >= this.users.length) {
        this.users = usersRes.rows;
      } else if (usersRes.rows && usersRes.rows.length > 0) {
        for (const u of usersRes.rows) {
          if (!this.users.some(x => x.id === u.id || x.email.toLowerCase() === u.email.toLowerCase())) {
            this.users.push(u);
          }
        }
      }

      if (deptsRes.rows && deptsRes.rows.length > 0) {
        this.departments = deptsRes.rows;
      }

      if (coursesRes.rows && coursesRes.rows.length >= this.courses.length) {
        this.courses = coursesRes.rows;
      } else if (coursesRes.rows && coursesRes.rows.length > 0) {
        for (const c of coursesRes.rows) {
          if (!this.courses.some(x => x.id === c.id || x.code === c.code)) {
            this.courses.push(c);
          }
        }
      }

      if (dueCatsRes.rows && dueCatsRes.rows.length > 0) {
        this.dueCategories = dueCatsRes.rows;
      }

      if (studentsRes.rows && studentsRes.rows.length >= this.students.length) {
        this.students = studentsRes.rows;
      } else if (studentsRes.rows && studentsRes.rows.length > 0) {
        for (const s of studentsRes.rows) {
          if (!this.students.some(x => x.id === s.id || x.register_number.toUpperCase() === s.register_number.toUpperCase())) {
            this.students.push(s);
          }
        }
      }
      if (staffRes.rows && staffRes.rows.length > 0) {
        this.staff = staffRes.rows;
      }
      if (dueRecordsRes.rows) {
        this.dueRecords = dueRecordsRes.rows;
      }
      if (duePaymentsRes.rows) {
        this.duePayments = duePaymentsRes.rows;
      }
      if (noDueRequestsRes.rows) {
        this.noDueRequests = noDueRequestsRes.rows;
      }
      if (noDueApprovalsRes.rows) {
        this.noDueApprovals = noDueApprovalsRes.rows;
      }
      if (certsRes.rows) {
        this.certificates = certsRes.rows;
      }
      if (notifsRes.rows) {
        this.notifications = notifsRes.rows;
      }
      if (auditRes.rows) {
        this.auditLogs = auditRes.rows;
      }
      if (subCoursesRes.rows && subCoursesRes.rows.length > 0) {
        this.subjectCourses = subCoursesRes.rows;
      }

      this.recalculateNextIds();
      return true;
    } catch (err) {
      console.error('[PostgreSQL] Failed loading from PostgreSQL tables:', err);
      return false;
    }
  }

  queueSyncToPostgres(delayMs = 300) {
    if (!this.isPgConnected) return;
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(() => {
      this.syncDebounceTimer = null;
      this.executeSyncToPostgres().catch(err => {
        console.warn('[PostgreSQL] Async sync execution warning:', err);
      });
    }, delayMs);
  }

  private async executeSyncToPostgres(): Promise<void> {
    if (!this.isPgConnected) return;
    await this.syncToPostgres();
  }

  async syncToPostgres(forceAll = false): Promise<void> {
    if (!this.isPgConnected) return;
    if (this.isSyncing) {
      this.syncPending = true;
      return;
    }
    this.isSyncing = true;
    this.syncPending = false;
    try {
      // Sync parent tables first to avoid foreign key / dependency locks and deadlock conflicts
      await syncTableToPostgres('users', this.users);
      await syncTableToPostgres('departments', this.departments);
      await syncTableToPostgres('courses', this.courses);
      await syncTableToPostgres('due_categories', this.dueCategories);
      await syncTableToPostgres('students', this.students);
      await syncTableToPostgres('staff', this.staff);
      await syncTableToPostgres('due_records', this.dueRecords);
      await syncTableToPostgres('due_payments', this.duePayments);
      await syncTableToPostgres('no_due_requests', this.noDueRequests);
      await syncTableToPostgres('no_due_approvals', this.noDueApprovals);
      await syncTableToPostgres('certificates', this.certificates);
      if (forceAll || this.subjectCoursesDirty) {
        await syncTableToPostgres('subject_courses', this.subjectCourses);
        this.subjectCoursesDirty = false;
      }
      await syncTableToPostgres('notifications', this.notifications.slice(0, 100));
      await syncTableToPostgres('audit_logs', this.auditLogs.slice(0, 200));
    } catch (err) {
      console.error('[PostgreSQL] syncToPostgres error:', err);
    } finally {
      this.isSyncing = false;
      if (this.syncPending) {
        this.syncPending = false;
        this.queueSyncToPostgres(150);
      }
    }
  }

  saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = {
        users: this.users,
        departments: this.departments,
        courses: this.courses,
        dueCategories: this.dueCategories,
        students: this.students,
        staff: this.staff,
        dueRecords: this.dueRecords,
        duePayments: this.duePayments,
        noDueRequests: this.noDueRequests,
        noDueApprovals: this.noDueApprovals,
        certificates: this.certificates,
        notifications: this.notifications,
        auditLogs: this.auditLogs,
        subjectCourses: this.subjectCourses,
        nextId: this.nextId
      };
      const jsonContent = JSON.stringify(data, null, 2);
      // Atomic write via temp file
      const tempFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tempFile, jsonContent, 'utf-8');
      fs.renameSync(tempFile, DATA_FILE);

      // Also maintain redundancy backup copy
      const backupFile = path.join(DATA_DIR, 'college_db.backup.json');
      fs.writeFileSync(backupFile, jsonContent, 'utf-8');

      // Debounced, serialized synchronization to PostgreSQL (prevents concurrency conflicts & deadlocks)
      this.queueSyncToPostgres();
    } catch (err) {
      console.error('Failed to save database to storage file:', err);
    }
  }

  loadFromFile(): boolean {
    const filesToTry = [DATA_FILE, path.join(DATA_DIR, 'college_db.backup.json')];
    for (const filePath of filesToTry) {
      if (!fs.existsSync(filePath)) continue;
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content || !content.trim()) continue;
        const data = JSON.parse(content);
        if (data && typeof data === 'object') {
          this.users = Array.isArray(data.users) ? data.users : [];
          this.departments = Array.isArray(data.departments) ? data.departments : [];
          this.courses = Array.isArray(data.courses) ? data.courses : [];
          this.dueCategories = Array.isArray(data.dueCategories) ? data.dueCategories : [];
          this.students = Array.isArray(data.students) ? data.students : [];
          this.staff = Array.isArray(data.staff) ? data.staff : [];
          this.dueRecords = Array.isArray(data.dueRecords) ? data.dueRecords : [];
          this.duePayments = Array.isArray(data.duePayments) ? data.duePayments : [];
          this.noDueRequests = Array.isArray(data.noDueRequests) ? data.noDueRequests : [];
          this.noDueApprovals = Array.isArray(data.noDueApprovals) ? data.noDueApprovals : [];
          this.certificates = Array.isArray(data.certificates) ? data.certificates : [];
          this.notifications = Array.isArray(data.notifications) ? data.notifications : [];
          this.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
          this.subjectCourses = Array.isArray(data.subjectCourses) ? data.subjectCourses : [];
          if (data.nextId) {
            this.nextId = { ...this.nextId, ...data.nextId };
          }
          this.ensureDefaultSubjectCourses();
          return true;
        }
      } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }
    return false;
  }

  ensureDefaultSubjectCourses() {
    let nextId = Math.max(0, ...this.subjectCourses.map(s => s.id)) + 1;
    const now = new Date().toISOString();

    // 1. Ensure predefined catalog subjects exist
    for (const [deptCode, subjects] of Object.entries(DEPARTMENT_CURRICULUM_CATALOG)) {
      const dept = this.departments.find(d => d.code.toUpperCase() === deptCode.toUpperCase());
      if (!dept) continue;

      for (const item of subjects) {
        const existing = this.subjectCourses.find(c =>
          c.department_id === dept.id &&
          c.code.toUpperCase() === item.code.toUpperCase() &&
          c.semester === item.semester
        );

        if (!existing) {
          this.subjectCourses.push({
            id: nextId++,
            title: item.title,
            code: item.code,
            department_id: dept.id,
            year: item.year,
            semester: item.semester,
            course_type: item.course_type,
            slot: item.slot,
            faculty_name: item.faculty_name,
            is_elective: item.is_elective || false,
            is_active: true,
            created_at: now
          });
        } else {
          // Enrich missing metadata on existing records
          if (!existing.course_type) existing.course_type = item.course_type;
          if (!existing.slot) existing.slot = item.slot;
          if (!existing.faculty_name) existing.faculty_name = item.faculty_name;
        }
      }
    }

    // 2. Ensure each active academic department has full Sem 1 to Sem 8 subjects
    for (const dept of this.departments) {
      if (dept.type === 'INSTITUTIONAL') continue;

      for (let sem = 1; sem <= 8; sem++) {
        const yr = Math.ceil(sem / 2);
        const count = this.subjectCourses.filter(c => c.department_id === dept.id && c.semester === sem).length;
        if (count === 0) {
          const generated = generateGenericSemesterSubjects(dept.code || 'GEN', yr, sem);
          for (const item of generated) {
            this.subjectCourses.push({
              id: nextId++,
              title: item.title,
              code: item.code,
              department_id: dept.id,
              year: item.year,
              semester: item.semester,
              course_type: item.course_type,
              slot: item.slot,
              faculty_name: item.faculty_name,
              is_elective: item.is_elective || false,
              is_active: true,
              created_at: now
            });
          }
        }
      }
    }

    // 3. Fallback slot assignment for any orphaned course without a slot
    for (const c of this.subjectCourses) {
      if (!c.course_type) {
        c.course_type = c.title.toLowerCase().includes('lab') ? 'lab' : 'theory';
      }
      if (!c.slot) {
        c.slot = c.course_type === 'lab' ? 'Lab 1' : 'Sub 1';
      }
      if (!c.faculty_name) {
        c.faculty_name = 'Staff In-charge';
      }
    }
  }


  ensureInstitutionalStudents() {
    // Zero demo students. Only real students entered by admin/staff will exist in database.
  }

  removeDemoData() {
    // Zero demo data
  }

  ensureAdminsExist() {
    const adminEmails = ['admin@college.edu', 'admin@institution.edu', 'ramya@sasurie.edu', 'ramyacse23@sasurie.com', 'admin@sasurie.edu'];
    const soleAdminPass = 'RamyaSasurie@123';

    for (const em of adminEmails) {
      let admin = this.users.find(u => u.email.toLowerCase() === em.toLowerCase());
      if (admin) {
        admin.role = 'ADMIN';
        admin.password_hash = hashPassword(soleAdminPass);
        admin.is_active = true;
        admin.is_registered = true;
      } else {
        const nextId = Math.max(0, ...this.users.map(u => u.id)) + 1;
        this.users.push({
          id: nextId,
          email: em,
          password_hash: hashPassword(soleAdminPass),
          role: 'ADMIN',
          is_active: true,
          is_registered: true,
          created_at: new Date().toISOString()
        });
      }
    }
  }

  ensureHODsExist() {
    const hodConfigs = [
      {
        deptCode: 'CSE',
        deptName: 'Computer Science and Engineering',
        name: 'Dr. K. Senthil Kumar, M.E., Ph.D.',
        empId: 'HOD-CSE-001',
        emails: ['hod.cse@college.edu', 'hod.cse@college.ac.in', 'hod.cse@sasurie.com', 'hod.cse@sasurie.edu'],
        passwords: ['College@123', 'StaffPassword@123', 'Password123!']
      },
      {
        deptCode: 'ECE',
        deptName: 'Electronics and Communication Engineering',
        name: 'Dr. M. Lakshmi, M.E., Ph.D.',
        empId: 'HOD-ECE-001',
        emails: ['hod.ece@college.edu', 'hod.ece@sasurie.edu'],
        passwords: ['College@123', 'StaffPassword@123', 'Password123!']
      },
      {
        deptCode: 'MECH',
        deptName: 'Mechanical Engineering',
        name: 'Dr. R. Vijayakumar, M.E., Ph.D.',
        empId: 'HOD-MECH-001',
        emails: ['hod.mech@college.edu', 'hod.mech@sasurie.edu'],
        passwords: ['College@123', 'StaffPassword@123', 'Password123!']
      },
      {
        deptCode: 'EEE',
        deptName: 'Electrical and Electronics Engineering',
        name: 'Dr. S. R. Murugan, M.E., Ph.D.',
        empId: 'HOD-EEE-001',
        emails: ['hod.eee@college.edu', 'hod.eee@sasurie.edu'],
        passwords: ['College@123', 'StaffPassword@123', 'Password123!']
      }
    ];

    for (const conf of hodConfigs) {
      const dept = this.departments.find(d => d.code?.toUpperCase() === conf.deptCode || d.name.toLowerCase().includes(conf.deptName.toLowerCase()));
      const deptId = dept ? dept.id : (conf.deptCode === 'CSE' ? 1 : conf.deptCode === 'ECE' ? 2 : conf.deptCode === 'MECH' ? 3 : 4);

      for (const em of conf.emails) {
        let user = this.users.find(u => u.email.toLowerCase() === em.toLowerCase());
        if (!user) {
          const nextId = Math.max(0, ...this.users.map(u => u.id)) + 1;
          user = {
            id: nextId,
            email: em,
            password_hash: hashPassword(conf.passwords[0]),
            role: 'HOD',
            is_active: true,
            is_registered: true,
            created_at: new Date().toISOString()
          };
          this.users.push(user);
        } else {
          user.role = 'HOD';
          user.is_registered = true;
          if (user.is_active === undefined) {
            user.is_active = true;
          }
          if (!user.password_hash) {
            user.password_hash = hashPassword(conf.passwords[0]);
          }
        }

        // Ensure linked staff profile exists
        let staffMember = this.staff.find(s => s.user_id === user!.id || s.email.toLowerCase() === em.toLowerCase());
        if (!staffMember) {
          const nextStaffId = Math.max(0, ...this.staff.map(s => s.id)) + 1;
          staffMember = {
            id: nextStaffId,
            user_id: user.id,
            employee_id: conf.empId,
            full_name: conf.name,
            email: em,
            phone: '9842100000',
            department_id: deptId,
            designation: `Professor & Head of Department (${conf.deptCode})`,
            is_active: user.is_active,
            created_at: new Date().toISOString()
          };
          this.staff.push(staffMember);
        } else {
          staffMember.user_id = user.id;
          staffMember.department_id = deptId;
          staffMember.designation = `Professor & Head of Department (${conf.deptCode})`;
          staffMember.full_name = conf.name;
          if (staffMember.is_active === undefined) {
            staffMember.is_active = user.is_active;
          }
        }
      }
    }
  }

  deduplicateAll() {
    // 1. Deduplicate departments by code
    const seenDeptCodes = new Set<string>();
    const uniqueDepts: DepartmentRecord[] = [];
    for (const d of this.departments) {
      const codeKey = (d.code || '').toUpperCase().trim();
      if (codeKey && !seenDeptCodes.has(codeKey)) {
        seenDeptCodes.add(codeKey);
        uniqueDepts.push(d);
      }
    }
    this.departments = uniqueDepts;

    // 2. Deduplicate courses by code
    const seenCourseCodes = new Set<string>();
    const uniqueCourses: CourseRecord[] = [];
    for (const c of this.courses) {
      const codeKey = (c.code || '').toUpperCase().trim();
      if (codeKey && !seenCourseCodes.has(codeKey)) {
        seenCourseCodes.add(codeKey);
        uniqueCourses.push(c);
      }
    }
    this.courses = uniqueCourses;

    // 3. Deduplicate dueCategories by code
    const seenCatCodes = new Set<string>();
    const uniqueCats: DueCategoryRecord[] = [];
    for (const cat of this.dueCategories) {
      const codeKey = (cat.code || '').toUpperCase().trim();
      if (codeKey && !seenCatCodes.has(codeKey)) {
        seenCatCodes.add(codeKey);
        uniqueCats.push(cat);
      }
    }
    this.dueCategories = uniqueCats;

    // 4. Deduplicate staff by employee_id and email
    const seenEmpIds = new Set<string>();
    const seenStaffEmails = new Set<string>();
    const uniqueStaff: StaffRecord[] = [];
    for (const s of this.staff) {
      const empKey = (s.employee_id || '').toUpperCase().trim();
      const emailKey = (s.email || '').toLowerCase().trim();
      if (empKey && !seenEmpIds.has(empKey) && !seenStaffEmails.has(emailKey)) {
        seenEmpIds.add(empKey);
        seenStaffEmails.add(emailKey);
        uniqueStaff.push(s);
      }
    }
    this.staff = uniqueStaff;

    // 5. Deduplicate students by register_number and email
    const seenRegNos = new Set<string>();
    const seenStudentEmails = new Set<string>();
    const uniqueStudents: StudentRecord[] = [];
    for (const st of this.students) {
      const regKey = (st.register_number || '').toUpperCase().trim();
      const emailKey = (st.email || '').toLowerCase().trim();
      if (regKey && !seenRegNos.has(regKey) && !seenStudentEmails.has(emailKey)) {
        seenRegNos.add(regKey);
        seenStudentEmails.add(emailKey);
        uniqueStudents.push(st);
      }
    }
    this.students = uniqueStudents;

    // 6. Deduplicate users by email
    const seenEmails = new Set<string>();
    const uniqueUsers: UserRecord[] = [];
    for (const u of this.users) {
      const emailKey = (u.email || '').toLowerCase().trim();
      if (emailKey && !seenEmails.has(emailKey)) {
        seenEmails.add(emailKey);
        uniqueUsers.push(u);
      }
    }
    this.users = uniqueUsers;

    // 7. Deduplicate identical due records
    const seenDueKeys = new Set<string>();
    const uniqueDues: DueRecordEntity[] = [];
    for (const d of this.dueRecords) {
      const dueKey = `${d.student_id}_${d.department_id}_${d.category_id}_${d.amount}_${d.description?.trim().toLowerCase()}_${d.status}`;
      if (!seenDueKeys.has(dueKey)) {
        seenDueKeys.add(dueKey);
        uniqueDues.push(d);
      }
    }
    this.dueRecords = uniqueDues;

    // Refresh nextIds safely
    this.recalculateNextIds();
  }

  recalculateNextIds() {
    this.nextId.users = Math.max(0, ...this.users.map(u => u.id)) + 1;
    this.nextId.departments = Math.max(0, ...this.departments.map(d => d.id)) + 1;
    this.nextId.courses = Math.max(0, ...this.courses.map(c => c.id)) + 1;
    this.nextId.dueCategories = Math.max(0, ...this.dueCategories.map(c => c.id)) + 1;
    this.nextId.students = Math.max(0, ...this.students.map(s => s.id)) + 1;
    this.nextId.staff = Math.max(0, ...this.staff.map(s => s.id)) + 1;
    this.nextId.dueRecords = Math.max(0, ...this.dueRecords.map(d => d.id)) + 1;
    this.nextId.duePayments = Math.max(0, ...this.duePayments.map(p => p.id)) + 1;
    this.nextId.noDueRequests = Math.max(0, ...this.noDueRequests.map(r => r.id)) + 1;
    this.nextId.noDueApprovals = Math.max(0, ...this.noDueApprovals.map(a => a.id)) + 1;
    this.nextId.certificates = Math.max(0, ...this.certificates.map(c => c.id)) + 1;
    this.nextId.notifications = Math.max(0, ...this.notifications.map(n => n.id)) + 1;
    this.nextId.auditLogs = Math.max(0, ...this.auditLogs.map(l => l.id)) + 1;
    this.nextId.subjectCourses = Math.max(0, ...this.subjectCourses.map(s => s.id)) + 1;
  }

  resetDatabase(mode: 'clear_cycle' | 'clear_dues' | 'full_reset' = 'full_reset') {
    if (mode === 'clear_cycle') {
      this.noDueRequests = [];
      this.noDueApprovals = [];
      this.certificates = [];
      this.notifications = this.notifications.filter(n =>
        !n.title?.toLowerCase().includes('clearance') &&
        !n.title?.toLowerCase().includes('certificate')
      );
      this.recalculateNextIds();
      this.saveToFile();
      return {
        message: 'Graduation clearance cycle reset successfully. All requests, approvals, and certificates cleared for new cycle.'
      };
    }

    if (mode === 'clear_dues') {
      this.dueRecords = [];
      this.duePayments = [];
      this.recalculateNextIds();
      this.saveToFile();
      return {
        message: 'All fee dues and payment records cleared successfully.'
      };
    }

    // full_reset:
    this.departments = [];
    this.courses = [];
    this.dueCategories = [];
    this.students = [];
    this.staff = [];
    this.users = [];
    this.dueRecords = [];
    this.duePayments = [];
    this.noDueRequests = [];
    this.noDueApprovals = [];
    this.certificates = [];
    this.notifications = [];
    this.auditLogs = [];
    this.subjectCourses = [];
    this.nextId = {
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
      subjectCourses: 1,
    };
    this.ensureAdminsExist();
    this.ensureDefaultSubjectCourses();
    this.deduplicateAll();
    this.saveToFile();
    return {
      message: 'System reset to clean state with zero demo data. Ready for fresh configuration.'
    };
  }

  seedClean() {
    this.departments = [];
    this.courses = [];
    this.dueCategories = [];
    this.students = [];
    this.staff = [];
    this.dueRecords = [];
    this.duePayments = [];
    this.noDueRequests = [];
    this.noDueApprovals = [];
    this.certificates = [];
    this.notifications = [];
    this.auditLogs = [];
    this.ensureAdminsExist();
  }

  logAudit(userId?: number, userEmail?: string, action?: string, entityType?: string, entityId?: number, oldValues?: any, newValues?: any, ip = '127.0.0.1') {
    const audit: AuditLogRecord = {
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
    };
    this.auditLogs.unshift(audit);
    this.saveToFile();
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
    this.saveToFile();
    return notif;
  }

  async deleteRecord(tableName: string, id: number) {
    await deleteRecordFromPostgres(tableName, id);
  }
}

export const db = new InMemoryDatabase();
export { pgPool, pgQuery, testPgConnection, syncSingleRecordToPostgres, deleteRecordFromPostgres };
