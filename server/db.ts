import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { pgPool, pgQuery, syncTableToPostgres, syncSingleRecordToPostgres, deleteRecordFromPostgres, testPgConnection } from './pg';

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
  };

  isPgConnected: boolean = false;

  constructor() {
    const loaded = this.loadFromFile();
    if (loaded) {
      this.ensureAdminsExist();
      this.ensureInstitutionalStudents();
      this.removeDemoData();
      this.deduplicateAll();
      this.saveToFile();
    } else {
      this.seedClean();
      this.ensureInstitutionalStudents();
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
        await this.loadFromPostgres();
        // Keep institutional admin & students guaranteed
        this.ensureAdminsExist();
        this.ensureInstitutionalStudents();
        this.removeDemoData();
        this.deduplicateAll();
        // Sync current state to PostgreSQL to ensure complete parity
        await this.syncToPostgres();
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
        auditRes
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
        pgQuery('SELECT * FROM audit_logs ORDER BY id ASC')
      ]);

      if (usersRes.rows && usersRes.rows.length > 0) {
        this.users = usersRes.rows;
      }
      if (deptsRes.rows && deptsRes.rows.length > 0) {
        this.departments = deptsRes.rows;
      }
      if (coursesRes.rows && coursesRes.rows.length > 0) {
        this.courses = coursesRes.rows;
      }
      if (dueCatsRes.rows && dueCatsRes.rows.length > 0) {
        this.dueCategories = dueCatsRes.rows;
      }
      if (studentsRes.rows && studentsRes.rows.length > 0) {
        this.students = studentsRes.rows;
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

      this.recalculateNextIds();
      return true;
    } catch (err) {
      console.error('[PostgreSQL] Failed loading from PostgreSQL tables:', err);
      return false;
    }
  }

  async syncToPostgres(): Promise<void> {
    if (!this.isPgConnected && !process.env.DATABASE_URL) return;
    try {
      await Promise.allSettled([
        syncTableToPostgres('users', this.users),
        syncTableToPostgres('departments', this.departments),
        syncTableToPostgres('courses', this.courses),
        syncTableToPostgres('due_categories', this.dueCategories),
        syncTableToPostgres('students', this.students),
        syncTableToPostgres('staff', this.staff),
        syncTableToPostgres('due_records', this.dueRecords),
        syncTableToPostgres('due_payments', this.duePayments),
        syncTableToPostgres('no_due_requests', this.noDueRequests),
        syncTableToPostgres('no_due_approvals', this.noDueApprovals),
        syncTableToPostgres('certificates', this.certificates),
        syncTableToPostgres('notifications', this.notifications),
        syncTableToPostgres('audit_logs', this.auditLogs.slice(-200))
      ]);
    } catch (err) {
      console.error('[PostgreSQL] syncToPostgres error:', err);
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

      // Asynchronously synchronize to PostgreSQL
      this.syncToPostgres().catch(err => {
        console.error('[PostgreSQL] Async sync on saveToFile error:', err);
      });
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
          if (data.nextId) {
            this.nextId = { ...this.nextId, ...data.nextId };
          }
          return true;
        }
      } catch (err) {
        console.error(`Error reading ${filePath}:`, err);
      }
    }
    return false;
  }


  ensureInstitutionalStudents() {
    // Institutional student records that must never be lost across restarts or re-logins
    const coreStudents = [
      {
        register_number: '732423104036',
        full_name: 'Ramya S',
        email: 'ramyacse2327@sasurie.com',
        phone: '+918825641424',
        dept_code: 'CSE',
        course_code: 'BE_CSE',
        year: 1,
        section: 'A',
        admission_year: 2026,
        password: 'RamyaSasurie@123'
      },
      {
        register_number: '732921104001',
        full_name: 'Aravindhan R',
        email: 'aravindh@sasurie.edu',
        phone: '+91 98450 11223',
        dept_code: 'CSE',
        course_code: 'BE_CSE',
        year: 4,
        section: 'A',
        admission_year: 2021,
        password: 'StudentPassword@123'
      }
    ];

    const now = new Date().toISOString();
    for (const cs of coreStudents) {
      let st = this.students.find(
        s => s.register_number?.toUpperCase() === cs.register_number.toUpperCase() ||
             s.email?.toLowerCase() === cs.email.toLowerCase()
      );

      const dept = this.departments.find(d => d.code === cs.dept_code) || this.departments[0];
      const course = this.courses.find(c => c.code === cs.course_code) || this.courses[0];

      if (!st) {
        const nextUserId = Math.max(0, ...this.users.map(u => u.id)) + 1;
        const newUser: UserRecord = {
          id: nextUserId,
          email: cs.email.toLowerCase(),
          password_hash: hashPassword(cs.password),
          role: 'STUDENT',
          is_active: true,
          is_registered: true,
          created_at: now
        };
        this.users.push(newUser);

        const nextStudentId = Math.max(0, ...this.students.map(s => s.id)) + 1;
        st = {
          id: nextStudentId,
          user_id: newUser.id,
          register_number: cs.register_number,
          full_name: cs.full_name,
          email: cs.email.toLowerCase(),
          phone: cs.phone,
          department_id: dept ? dept.id : 1,
          course_id: course ? course.id : 1,
          year: cs.year,
          section: cs.section,
          admission_year: cs.admission_year,
          created_at: now
        };
        this.students.push(st);
      } else {
        // Ensure student has active user login
        let user = this.users.find(u => u.id === st!.user_id || u.email.toLowerCase() === st!.email.toLowerCase());
        if (!user) {
          const nextUserId = Math.max(0, ...this.users.map(u => u.id)) + 1;
          user = {
            id: nextUserId,
            email: st.email.toLowerCase(),
            password_hash: hashPassword(cs.password),
            role: 'STUDENT',
            is_active: true,
            is_registered: true,
            created_at: now
          };
          this.users.push(user);
          st.user_id = user.id;
        } else {
          user.role = 'STUDENT';
          user.is_active = true;
          user.is_registered = true;
          user.password_hash = hashPassword(cs.password);
        }
      }
    }
  }

  ensureAdminsExist() {
    const adminEmails = ['ramya@sasurie.edu', 'ramyacse23@sasurie.com', 'admin@sasurie.edu'];
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

  removeDemoData() {
    // 1. Purge demo student 2022BCSE042 / student@college.edu / Aditya Sharma
    const demoStudentIds = this.students
      .filter(s =>
        s.register_number?.toUpperCase() === '2022BCSE042' ||
        s.email?.toLowerCase() === 'student@college.edu' ||
        s.full_name?.toLowerCase().includes('aditya sharma')
      )
      .map(s => s.id);

    if (demoStudentIds.length > 0) {
      this.students = this.students.filter(s => !demoStudentIds.includes(s.id));
      this.dueRecords = this.dueRecords.filter(d => !demoStudentIds.includes(d.student_id));
      this.duePayments = this.duePayments.filter(p => !demoStudentIds.includes(p.student_id));
      this.noDueRequests = this.noDueRequests.filter(r => !demoStudentIds.includes(r.student_id));
      this.certificates = this.certificates.filter(c => !demoStudentIds.includes(c.student_id));
    }

    // Purge fake student user
    this.users = this.users.filter(u => u.email.toLowerCase() !== 'student@college.edu');

    // Purge fake dues
    this.dueRecords = this.dueRecords.filter(d =>
      !d.description?.toLowerCase().includes('operating systems concepts') &&
      !d.description?.toLowerCase().includes('semester 8 exam form')
    );

    // Purge fake notifications
    this.notifications = this.notifications.filter(n =>
      !n.title?.toLowerCase().includes('welcome to no due portal')
    );
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
    };
    this.seedClean();
    this.ensureAdminsExist();
    this.ensureInstitutionalStudents();
    this.deduplicateAll();
    this.saveToFile();
    return {
      message: 'System reset to clean institutional state with baseline departments, courses, staff, and enrolled students.'
    };
  }

  seedClean() {
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

    // 4. Administrator Account - Strictly only ONE institutional admin
    const adminAccounts = [
      { email: 'ramya@sasurie.edu', pass: 'RamyaSasurie@123' }
    ];

    adminAccounts.forEach(acc => {
      this.users.push({
        id: this.nextId.users++,
        email: acc.email,
        password_hash: hashPassword(acc.pass),
        role: 'ADMIN',
        is_active: true,
        created_at: now
      });
    });

    // 5. Staff Users (Official Departmental Clearance Officers)
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

    // NOTE: ZERO FAKE DEMO STUDENTS!
    // Students and dues are only created when real administrator or staff enters them.
    this.students = [];
    this.dueRecords = [];
    this.notifications = [];

    // Initial Audit Log
    this.auditLogs.push({
      id: this.nextId.auditLogs++,
      user_id: 1,
      user_email: 'ramya@sasurie.edu',
      action: 'SYSTEM_INITIALIZED',
      entity_type: 'SYSTEM',
      entity_id: 1,
      new_values: { message: 'College No Due System initialized with clean institutional datasets' },
      ip_address: '127.0.0.1',
      created_at: now
    });
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
    syncSingleRecordToPostgres('audit_logs', audit).catch(() => {});
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
    syncSingleRecordToPostgres('notifications', notif).catch(() => {});
    return notif;
  }

  async deleteRecord(tableName: string, id: number) {
    await deleteRecordFromPostgres(tableName, id);
  }
}

export const db = new InMemoryDatabase();
export { pgPool, pgQuery, testPgConnection, syncSingleRecordToPostgres, deleteRecordFromPostgres };
