import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, hashPassword, verifyPassword, createToken, verifyToken, testPgConnection, pgQuery, deleteRecordFromPostgres, UserRecord, StudentRecord, StaffRecord, DepartmentRecord, CourseRecord, SubjectCourseRecord, DueCategoryRecord, CertificateRecord, DueRecord, isAcademicDepartment, getApplicableDepartmentsForStudent } from './db';
import { DEPARTMENT_CURRICULUM_CATALOG, generateGenericSemesterSubjects } from './curriculum_catalog';
import { generateCertificatePdf } from './pdf';

export const apiRouter = Router();

// Middleware to extract authenticated user
export interface AuthRequest extends Request {
  user?: UserRecord;
  studentProfile?: StudentRecord;
  staffProfile?: StaffRecord;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ detail: 'Missing or invalid authentication token' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload || !payload.sub) {
    return res.status(401).json({ detail: 'Token is invalid or expired' });
  }

  let user = db.users.find(u => u.id === payload.sub);
  if (!user && (payload as any).email) {
    user = db.users.find(u => u.email.toLowerCase() === (payload as any).email.toLowerCase());
  }
  if (!user || !user.is_active) {
    return res.status(401).json({ detail: 'User account not active or not found' });
  }

  req.user = user;
  if (user.role === 'STUDENT') {
    req.studentProfile = db.students.find(s => s.user_id === user.id);
  } else if (user.role === 'STAFF' || user.role === 'HOD') {
    req.staffProfile = db.staff.find(s => s.user_id === user.id || s.email.toLowerCase() === user.email.toLowerCase());
  }

  next();
}

// Optional auth helper
function requireRole(roles: Array<'STUDENT' | 'STAFF' | 'HOD' | 'ADMIN'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ detail: 'Permission denied for this action' });
    }
    next();
  };
}

// ----------------------------------------------------
// Health Check
// ----------------------------------------------------
apiRouter.get('/health', async (req, res) => {
  let pgStatus = 'disconnected';
  try {
    if (db.isPgConnected) {
      const pgRes = await pgQuery('SELECT NOW() as now');
      if (pgRes && pgRes.rows && pgRes.rows.length > 0) {
        pgStatus = 'connected (PostgreSQL - Neon Cloud SQL)';
      }
    } else {
      pgStatus = 'local-storage (file/in-memory database active)';
    }
  } catch (err: any) {
    pgStatus = 'error: ' + (err?.message || 'unknown');
  }

  res.json({
    status: 'healthy',
    service: 'College No Due Management System',
    database: pgStatus,
    stats: {
      users: db.users.length,
      students: db.students.length,
      staff: db.staff.length,
      departments: db.departments.length,
      courses: db.courses.length,
      due_records: db.dueRecords.length,
      no_due_requests: db.noDueRequests.length,
      certificates: db.certificates.length
    }
  });
});

// ----------------------------------------------------
// Authentication Routes (/api/auth)
// ----------------------------------------------------
const COLLEGE_ADMIN_EMAILS = [
  'admin@college.edu',
  'admin@college.ac.in',
  'admin@institution.edu',
  'ramya@sasurie.edu',
  'ramyacse23@sasurie.com',
  'admin@sasurie.edu'
];

// Verification endpoint: Informs client that self-registration is permanently disabled
apiRouter.post('/auth/verify-student', (req: Request, res: Response) => {
  return res.status(403).json({
    verified: false,
    detail: 'Student self-registration has been disabled by College Administration. Only students enrolled in the Admin Portal can log in.'
  });
});

// Student Self-Registration: Permanently disabled as per institution policy
apiRouter.post(['/auth/signup', '/auth/register'], (req: Request, res: Response) => {
  return res.status(403).json({
    detail: 'Student self-registration is disabled. All student clearance accounts are provisioned exclusively by the College Administration in the Admin Portal. Please sign in with your Register Number or College Email and password.'
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const identifierField = (req.body.email || req.body.identifier || req.body.username || req.body.register_number || '').trim();
  const password = req.body.password;
  const requestedRole = (req.body.role || req.body.expected_role || '').toString().trim().toUpperCase();

  if (!identifierField || !password) {
    return res.status(400).json({ detail: 'Register Number or College Email and password are required' });
  }

  const rawIdentifier = identifierField;
  const lowerIdentifier = rawIdentifier.toLowerCase();
  const upperIdentifier = rawIdentifier.toUpperCase();

  // Find student by register number or email in the Admin Portal's registry (db.students)
  let student = db.students.find(
    s => s.register_number.toUpperCase() === upperIdentifier ||
         s.email.toLowerCase() === lowerIdentifier ||
         (lowerIdentifier === 'ramyacse23@sasurie.com' && s.email.toLowerCase() === 'ramyacse2327@sasurie.com')
  );

  // Find staff by employee ID or email in the Admin Portal's registry (db.staff)
  let staff = db.staff.find(
    s => s.employee_id.toUpperCase() === upperIdentifier || s.email.toLowerCase() === lowerIdentifier
  );

  let user: UserRecord | undefined;

  if (requestedRole === 'ADMIN') {
    user = db.users.find(u => u.role === 'ADMIN' && (
      u.email.toLowerCase() === lowerIdentifier ||
      (COLLEGE_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(lowerIdentifier) && COLLEGE_ADMIN_EMAILS.map(e => e.toLowerCase()).includes(u.email.toLowerCase()))
    ));
    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier);
    }
  } else if (requestedRole === 'HOD') {
    if (staff) {
      user = db.users.find(u => u.id === staff!.user_id || u.email.toLowerCase() === staff!.email.toLowerCase());
    } else {
      user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier && (u.role === 'HOD' || u.role === 'STAFF'));
    }
    if (!user) {
      user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier);
    }
  } else if (requestedRole === 'STAFF') {
    if (staff) {
      user = db.users.find(u => u.id === staff!.user_id || u.email.toLowerCase() === staff!.email.toLowerCase());
    } else {
      user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier && (u.role === 'STAFF' || u.role === 'HOD'));
    }
  } else if (requestedRole === 'STUDENT') {
    if (student) {
      user = db.users.find(u => u.id === student!.user_id || u.email.toLowerCase() === student!.email.toLowerCase());
    } else {
      user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier && u.role === 'STUDENT');
    }
  } else {
    if (student) {
      user = db.users.find(u => u.id === student!.user_id || u.email.toLowerCase() === student!.email.toLowerCase());
    } else if (staff) {
      user = db.users.find(u => u.id === staff!.user_id || u.email.toLowerCase() === staff!.email.toLowerCase());
    } else {
      user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier);
    }
  }

  // If user does not exist or password does not match
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({
      detail: 'Invalid Employee ID, Register Number, Email or Password. Please check your credentials.'
    });
  }

  // STRICT ROLE SEPARATION:
  if (requestedRole === 'STUDENT') {
    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        detail: 'Access denied: Only students are authorized to log in through the Student Portal.'
      });
    }
  } else if (requestedRole === 'HOD') {
    const isHod = user.role === 'HOD' || (staff && (staff.designation?.toLowerCase().includes('hod') || staff.designation?.toLowerCase().includes('head of department')));
    if (!isHod && user.role !== 'ADMIN') {
      return res.status(403).json({
        detail: 'Access denied: Only authorized Heads of Department (HOD) allocated by the Administrator can log in through the HOD Portal.'
      });
    }
    const hodStaffRecord = staff || db.staff.find(s => s.user_id === user!.id || s.email.toLowerCase() === user!.email.toLowerCase());
    if (!hodStaffRecord || !hodStaffRecord.department_id) {
      return res.status(403).json({
        detail: 'Access denied: No department has been allocated to this HOD account. Please contact the Administrator.'
      });
    }
    if (user.is_active === false || hodStaffRecord.is_active === false) {
      return res.status(403).json({
        detail: 'Access denied: This HOD account has been deactivated by the Administrator. Please contact college administration.'
      });
    }
    user.role = 'HOD';
    staff = hodStaffRecord;
  } else if (requestedRole === 'STAFF') {
    if (user.role !== 'STAFF' && user.role !== 'HOD') {
      return res.status(403).json({
        detail: 'Access denied: Only department staff are authorized to log in through the Staff Portal.'
      });
    }
    const enrolledStaff = staff || db.staff.find(s => s.user_id === user!.id || s.email.toLowerCase() === user!.email.toLowerCase());
    if (!enrolledStaff) {
      return res.status(403).json({
        detail: 'Access Denied: This staff account is not enrolled by the Head of Department or Administrator.'
      });
    }
    if (user.is_active === false || enrolledStaff.is_active === false) {
      return res.status(403).json({
        detail: 'Access Denied: This staff account has been deactivated by the Head of Department (HOD). Please contact your HOD.'
      });
    }
    staff = enrolledStaff;
  } else if (requestedRole === 'ADMIN') {
    if (user.role !== 'ADMIN' || !COLLEGE_ADMIN_EMAILS.some(e => e.toLowerCase() === user!.email.toLowerCase())) {
      return res.status(403).json({
        detail: 'Access denied: Only the institutional administrator is authorized to log in through the Admin Portal.'
      });
    }
  }

  // Administrator strict validation
  if (user.role === 'ADMIN') {
    if (!COLLEGE_ADMIN_EMAILS.some(e => e.toLowerCase() === user!.email.toLowerCase())) {
      return res.status(403).json({
        detail: 'Access denied: Unauthorized administrator account.'
      });
    }
    if (requestedRole && requestedRole !== 'ADMIN') {
      return res.status(403).json({
        detail: `Access denied: Administrator cannot log in through the ${requestedRole === 'STUDENT' ? 'Student' : 'Staff'} Portal.`
      });
    }
  }

  // STRICT REQUIREMENT FOR STUDENTS:
  // If the user account has role 'STUDENT', it MUST be present in the Admin Portal's enrolled students list
  if (user.role === 'STUDENT') {
    const enrolledStudent = student || db.students.find(s => s.user_id === user!.id || s.email.toLowerCase() === user!.email.toLowerCase());
    if (!enrolledStudent) {
      return res.status(403).json({
        detail: 'Access Denied: This student is not registered in the Admin Portal. Only students registered by the college administrator can log in.'
      });
    }
    student = enrolledStudent;
  }

  // STRICT REQUIREMENT FOR STAFF:
  // Only clearance officers enrolled in the Admin Portal can log in
  if (user.role === 'STAFF') {
    const enrolledStaff = staff || db.staff.find(s => s.user_id === user!.id || s.email.toLowerCase() === user!.email.toLowerCase());
    if (!enrolledStaff) {
      return res.status(403).json({
        detail: 'Access Denied: This officer account is not registered in the Admin Portal. Only departmental officers enrolled by the administrator can log in.'
      });
    }
    staff = enrolledStaff;
  }

  if (!user.is_active) {
    return res.status(403).json({ detail: 'This account has been deactivated. Please contact the college administration.' });
  }

  // Admin check - strictly authorized admin account permitted
  if (user.role === 'ADMIN' && !COLLEGE_ADMIN_EMAILS.some(e => e.toLowerCase() === user!.email.toLowerCase())) {
    return res.status(401).json({
      detail: 'Invalid email or password'
    });
  }

  const access_token = createToken({ sub: user.id, email: user.email, role: user.role, type: 'access' }, 1);
  const refresh_token = createToken({ sub: user.id, email: user.email, role: user.role, type: 'refresh' }, 7);

  db.logAudit(user.id, user.email, 'USER_LOGIN', 'USER', user.id, null, { identifier: rawIdentifier, role: user.role }, getClientIp(req));

  const userInfo: any = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  if (user.role === 'STUDENT') {
    const st = student || db.students.find(s => s.user_id === user!.id);
    if (st) {
      const dept = db.departments.find(d => d.id === st.department_id);
      const course = db.courses.find(c => c.id === st.course_id);
      userInfo.full_name = st.full_name;
      userInfo.register_number = st.register_number;
      userInfo.department_id = st.department_id;
      userInfo.department_name = dept ? dept.name : '';
      userInfo.course_name = course ? course.name : '';
      userInfo.year = st.year;
      userInfo.section = st.section;
    }
  } else if (user.role === 'HOD') {
    const st = staff || db.staff.find(s => s.user_id === user!.id || s.email.toLowerCase() === user!.email.toLowerCase());
    const dept = st ? db.departments.find(d => d.id === st.department_id) : db.departments.find(d => d.code === 'CSE');
    userInfo.full_name = st?.full_name || 'Head of Department';
    userInfo.employee_id = st?.employee_id || 'HOD-CSE-001';
    userInfo.department_id = dept ? dept.id : 1;
    userInfo.department_name = dept ? dept.name : 'Computer Science and Engineering';
    userInfo.department_code = dept ? dept.code : 'CSE';
    userInfo.designation = st?.designation || 'Professor & Head of Department';
  } else if (user.role === 'STAFF') {
    const staff = db.staff.find(s => s.user_id === user.id);
    if (staff) {
      const dept = db.departments.find(d => d.id === staff.department_id);
      userInfo.full_name = staff.full_name;
      userInfo.employee_id = staff.employee_id;
      userInfo.department_id = staff.department_id;
      userInfo.department_name = dept ? dept.name : '';
      userInfo.designation = staff.designation;
    }
  } else if (user.role === 'ADMIN') {
    userInfo.full_name = 'College Administrator';
  }

  res.json({
    access_token,
    refresh_token,
    token_type: 'bearer',
    user: userInfo
  });
});

apiRouter.post('/auth/refresh', (req: Request, res: Response) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(401).json({ detail: 'Refresh token missing' });
  }

  const payload = verifyToken(refresh_token);
  if (!payload || payload.type !== 'refresh') {
    return res.status(401).json({ detail: 'Invalid or expired refresh token' });
  }

  let user = db.users.find(u => u.id === payload.sub);
  if (!user && (payload as any).email) {
    user = db.users.find(u => u.email.toLowerCase() === (payload as any).email.toLowerCase());
  }
  if (!user || !user.is_active) {
    return res.status(401).json({ detail: 'User account not active' });
  }

  const new_access_token = createToken({ sub: user.id, email: user.email, role: user.role, type: 'access' }, 1);
  const new_refresh_token = createToken({ sub: user.id, email: user.email, role: user.role, type: 'refresh' }, 7);

  const userInfo: any = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  if (user.role === 'STUDENT') {
    const student = db.students.find(s => s.user_id === user.id);
    if (student) {
      userInfo.full_name = student.full_name;
      userInfo.register_number = student.register_number;
      userInfo.department_id = student.department_id;
    }
  } else if (user.role === 'HOD') {
    const staff = db.staff.find(s => s.user_id === user.id || s.email.toLowerCase() === user.email.toLowerCase());
    if (staff) {
      const dept = db.departments.find(d => d.id === staff.department_id);
      userInfo.full_name = staff.full_name;
      userInfo.employee_id = staff.employee_id;
      userInfo.department_id = staff.department_id;
      userInfo.department_name = dept ? dept.name : '';
      userInfo.department_code = dept ? dept.code : '';
      userInfo.designation = staff.designation;
    }
  } else if (user.role === 'STAFF') {
    const staff = db.staff.find(s => s.user_id === user.id);
    if (staff) {
      userInfo.full_name = staff.full_name;
      userInfo.employee_id = staff.employee_id;
      userInfo.department_id = staff.department_id;
    }
  } else if (user.role === 'ADMIN') {
    userInfo.full_name = 'College Administrator';
  }

  res.json({
    access_token: new_access_token,
    refresh_token: new_refresh_token,
    token_type: 'bearer',
    user: userInfo
  });
});

apiRouter.post('/auth/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  if (req.user) {
    db.logAudit(req.user.id, req.user.email, 'USER_LOGOUT', 'USER', req.user.id, null, { email: req.user.email }, getClientIp(req));
  }
  res.json({ message: 'Logged out successfully' });
});

apiRouter.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const userInfo: any = {
    id: user.id,
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at
  };

  if (user.role === 'STUDENT' && req.studentProfile) {
    const sp = req.studentProfile;
    const dept = db.departments.find(d => d.id === sp.department_id);
    const course = db.courses.find(c => c.id === sp.course_id);
    userInfo.student_id = sp.id;
    userInfo.full_name = sp.full_name;
    userInfo.register_number = sp.register_number;
    userInfo.phone = sp.phone;
    userInfo.department_id = sp.department_id;
    userInfo.department_name = dept ? dept.name : '';
    userInfo.course_id = sp.course_id;
    userInfo.course_name = course ? course.name : '';
    userInfo.year = sp.year;
    userInfo.section = sp.section;
    userInfo.admission_year = sp.admission_year;
    userInfo.student_profile = { ...sp, department_name: userInfo.department_name, course_name: userInfo.course_name };
  } else if ((user.role === 'STAFF' || user.role === 'HOD') && req.staffProfile) {
    const st = req.staffProfile;
    const dept = db.departments.find(d => d.id === st.department_id);
    userInfo.staff_id = st.id;
    userInfo.full_name = st.full_name;
    userInfo.employee_id = st.employee_id;
    userInfo.phone = st.phone;
    userInfo.department_id = st.department_id;
    userInfo.department_name = dept ? dept.name : '';
    userInfo.department_code = dept ? dept.code : '';
    userInfo.designation = st.designation;
    userInfo.staff_profile = { ...st, department_name: userInfo.department_name, department_code: userInfo.department_code };
  } else if (user.role === 'ADMIN') {
    userInfo.full_name = 'College Administrator';
    userInfo.department_name = 'Office of the Principal / Administration';
  }

  res.json(userInfo);
});

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email, new_password } = req.body;
  const user = db.users.find(u => u.email === (email || '').toLowerCase().trim());
  if (user && new_password) {
    user.password_hash = hashPassword(new_password);
    db.logAudit(user.id, user.email, 'PASSWORD_RESET', 'USER', user.id, null, { email: user.email }, getClientIp(req));
  }
  res.json({ message: 'Password updated successfully. You can now login with your new password.' });
});

// ----------------------------------------------------
// Student Routes (/api/student)
// ----------------------------------------------------
apiRouter.get('/student/profile', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile;
  if (!student) return res.status(404).json({ detail: 'Student profile not found' });
  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  res.json({
    id: student.id,
    user_id: student.user_id,
    full_name: student.full_name,
    register_number: student.register_number,
    email: student.email,
    phone: student.phone,
    department_id: student.department_id,
    department_name: dept ? dept.name : '',
    course_id: student.course_id,
    course_name: course ? course.name : '',
    year: student.year,
    section: student.section,
    admission_year: student.admission_year,
    created_at: student.created_at
  });
});

apiRouter.patch('/student/profile', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile;
  if (!student) return res.status(404).json({ detail: 'Student profile not found' });
  const { phone, year, section, department_id, course_id } = req.body;

  if (phone !== undefined) student.phone = phone;
  if (year !== undefined) student.year = Number(year);
  if (section !== undefined) student.section = section.toUpperCase();
  if (department_id !== undefined) student.department_id = Number(department_id);
  if (course_id !== undefined) student.course_id = Number(course_id);

  db.logAudit(req.user!.id, req.user!.email, 'STUDENT_PROFILE_UPDATE', 'STUDENT', student.id, null, req.body, getClientIp(req));

  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  res.json({
    id: student.id,
    user_id: student.user_id,
    full_name: student.full_name,
    register_number: student.register_number,
    email: student.email,
    phone: student.phone,
    department_id: student.department_id,
    department_name: dept ? dept.name : '',
    course_id: student.course_id,
    course_name: course ? course.name : '',
    year: student.year,
    section: student.section,
    admission_year: student.admission_year,
    created_at: student.created_at
  });
});

apiRouter.get('/student/summary', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile;
  if (!student) return res.status(404).json({ detail: 'Student profile not found' });

  const studentDues = db.dueRecords.filter(d => d.student_id === student.id);
  const activeDepartments = getApplicableDepartmentsForStudent(student, db.departments, studentDues, db.courses);

  const totalAmount = studentDues.reduce((sum, d) => sum + d.amount, 0);
  const pendingAmount = studentDues.filter(d => d.status === 'pending').reduce((sum, d) => sum + d.amount, 0);
  const clearedAmount = studentDues.filter(d => d.status === 'cleared').reduce((sum, d) => sum + d.amount, 0);
  const waivedAmount = studentDues.filter(d => d.status === 'waived').reduce((sum, d) => sum + d.amount, 0);

  const activeReq = db.noDueRequests.slice().reverse().find(r => r.student_id === student.id);
  const approvalMap = new Map<number, { status: string; remarks?: string }>();
  if (activeReq) {
    const approvals = db.noDueApprovals.filter(a => a.request_id === activeReq.id);
    approvals.forEach(a => approvalMap.set(a.department_id, { status: a.status, remarks: a.remarks }));
  }

  let clearedDeptsCount = 0;
  const departmentStatuses = activeDepartments.map(dept => {
    const deptDues = studentDues.filter(d => d.department_id === dept.id);
    const deptPendingDues = deptDues.filter(d => d.status === 'pending');
    const deptClearedDues = deptDues.filter(d => d.status === 'cleared');
    const deptPendingAmt = deptPendingDues.reduce((sum, d) => sum + d.amount, 0);
    const deptClearedAmt = deptClearedDues.reduce((sum, d) => sum + d.amount, 0);
    const deptTotalAmt = deptDues.reduce((sum, d) => sum + d.amount, 0);
    const isCleared = deptPendingAmt === 0;
    if (isCleared) clearedDeptsCount++;

    const appInfo = approvalMap.get(dept.id);
    return {
      department_id: dept.id,
      department_name: dept.name,
      department_code: dept.code,
      has_dues: !isCleared,
      total_dues_amount: deptTotalAmt,
      pending_dues_amount: deptPendingAmt,
      cleared_dues_amount: deptClearedAmt,
      pending_amount: deptPendingAmt,
      total_dues_count: deptDues.length,
      pending_dues_count: deptPendingDues.length,
      status: isCleared ? 'CLEAR' : 'PENDING',
      approval_status: appInfo ? appInfo.status : undefined,
      remarks: appInfo ? appInfo.remarks : undefined
    };
  });

  const totalDepts = activeDepartments.length;
  const clearancePct = totalDepts > 0 ? Math.round((clearedDeptsCount / totalDepts) * 100) : 100;
  const canRequestNoDue = pendingAmount === 0 && (!activeReq || activeReq.status === 'rejected');

  const cert = db.certificates.slice().reverse().find(c => c.student_id === student.id && c.is_valid);
  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  let activeReqOut = null;
  if (activeReq) {
    const approvals = db.noDueApprovals.filter(a => a.request_id === activeReq.id).map(a => {
      const d = db.departments.find(dept => dept.id === a.department_id);
      return {
        id: a.id,
        request_id: a.request_id,
        department_id: a.department_id,
        department_name: d ? d.name : '',
        approved_by: a.approved_by,
        approver_name: 'Department Authority',
        status: a.status,
        remarks: a.remarks,
        approved_at: a.approved_at,
        created_at: a.created_at
      };
    });
    activeReqOut = {
      id: activeReq.id,
      student_id: activeReq.student_id,
      student_name: student.full_name,
      student_reg_no: student.register_number,
      course_name: course ? course.name : '',
      department_name: dept ? dept.name : '',
      status: activeReq.status,
      submitted_at: activeReq.submitted_at,
      reviewed_at: activeReq.reviewed_at,
      reviewed_by: activeReq.reviewed_by,
      remarks: activeReq.remarks,
      approvals,
      created_at: activeReq.created_at
    };
  }

  let certOut = null;
  if (cert) {
    certOut = {
      id: cert.id,
      request_id: cert.request_id,
      student_id: cert.student_id,
      student_name: student.full_name,
      register_number: student.register_number,
      course_name: course ? course.name : '',
      department_name: dept ? dept.name : '',
      certificate_number: cert.certificate_number,
      verification_code: cert.verification_code,
      issued_at: cert.issued_at,
      is_valid: cert.is_valid,
      created_at: cert.created_at
    };
  }

  res.json({
    student: {
      id: student.id,
      user_id: student.user_id,
      full_name: student.full_name,
      register_number: student.register_number,
      email: student.email,
      phone: student.phone,
      department_id: student.department_id,
      department_name: dept ? dept.name : '',
      course_id: student.course_id,
      course_name: course ? course.name : '',
      year: student.year,
      semester: student.semester || (student.year ? student.year * 2 - 1 : 1),
      section: student.section,
      admission_year: student.admission_year,
      created_at: student.created_at
    },
    total_dues_amount: totalAmount,
    pending_dues_amount: pendingAmount,
    cleared_dues_amount: clearedAmount,
    waived_dues_amount: waivedAmount,
    total_due_amount: totalAmount,
    pending_due_amount: pendingAmount,
    cleared_due_amount: clearedAmount,
    waived_due_amount: waivedAmount,
    total_departments: totalDepts,
    cleared_departments_count: clearedDeptsCount,
    pending_departments_count: totalDepts - clearedDeptsCount,
    clearance_percentage: clearancePct,
    can_request_no_due: canRequestNoDue,
    active_request: activeReqOut,
    issued_certificate: certOut,
    department_statuses: departmentStatuses,
    departments_summary: departmentStatuses
  });
});

apiRouter.get(['/departments', '/student/departments'], (req, res) => {
  res.json(db.departments.filter(d => d.is_active));
});

apiRouter.get(['/courses', '/student/courses'], (req, res) => {
  const list = db.courses.filter(c => c.is_active).map(c => {
    const dept = db.departments.find(d => d.id === c.department_id);
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      department_id: c.department_id,
      department_name: dept ? dept.name : '',
      duration: c.duration,
      is_active: c.is_active,
      created_at: c.created_at
    };
  });
  res.json(list);
});

apiRouter.get('/student/due-categories', (req, res) => {
  res.json(db.dueCategories.filter(c => c.is_active));
});

apiRouter.get('/due-categories', (req, res) => {
  res.json(db.dueCategories.filter(c => c.is_active));
});

// ----------------------------------------------------
// Due Records (/api/due-records)
// ----------------------------------------------------
apiRouter.get('/due-records', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  let records = db.dueRecords;

  if (user.role === 'STUDENT') {
    if (!req.studentProfile) return res.json([]);
    records = records.filter(r => r.student_id === req.studentProfile!.id);
  } else if (user.role === 'STAFF') {
    if (!req.staffProfile) return res.status(403).json({ detail: 'Staff profile missing' });
    records = records.filter(r => r.department_id === req.staffProfile!.department_id);
    if (req.query.student_id) {
      records = records.filter(r => r.student_id === Number(req.query.student_id));
    }
  } else if (user.role === 'ADMIN') {
    if (req.query.student_id) {
      records = records.filter(r => r.student_id === Number(req.query.student_id));
    }
    if (req.query.department_id) {
      records = records.filter(r => r.department_id === Number(req.query.department_id));
    }
  }

  const statusFilter = req.query.status as string;
  if (statusFilter && statusFilter !== 'all') {
    records = records.filter(r => r.status === statusFilter);
  }

  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    records = records.filter(r => {
      const student = db.students.find(s => s.id === r.student_id);
      return (
        (student && student.full_name.toLowerCase().includes(search)) ||
        (student && student.register_number.toLowerCase().includes(search)) ||
        r.description.toLowerCase().includes(search)
      );
    });
  }

  const total = records.length;
  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = records.slice().reverse().slice(skip, skip + limit);

  const result = paginated.map(r => {
    const student = db.students.find(s => s.id === r.student_id);
    const studentDept = student ? db.departments.find(d => d.id === student.department_id) : null;
    const studentCourse = student ? db.courses.find(c => c.id === student.course_id) : null;
    const dept = db.departments.find(d => d.id === r.department_id);
    const cat = db.dueCategories.find(c => c.id === r.category_id);
    return {
      id: r.id,
      student_id: r.student_id,
      student_name: student ? student.full_name : '',
      student_reg_no: student ? student.register_number : '',
      student_email: student ? student.email : '',
      student_department_id: student ? student.department_id : null,
      student_department_name: studentDept ? studentDept.name : '',
      student_department_code: studentDept ? studentDept.code : '',
      student_course: studentCourse ? (studentCourse.code || studentCourse.name) : '',
      student_year: student ? student.year : null,
      student_section: student ? student.section : '',
      department_id: r.department_id,
      department_name: dept ? dept.name : '',
      department_code: dept ? dept.code : '',
      category_id: r.category_id,
      category_name: cat ? cat.name : '',
      amount: r.amount,
      status: r.status,
      description: r.description,
      remarks: r.remarks,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
  });

  res.json(result);
});

apiRouter.post('/due-records', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const { student_id, department_id, category_id, amount, description, remarks } = req.body;
  const student = db.students.find(s => s.id === Number(student_id));
  if (!student) return res.status(404).json({ detail: 'Student not found' });

  let deptId = Number(department_id);
  if (req.user!.role === 'STAFF') {
    deptId = req.staffProfile!.department_id;
  }
  const dept = db.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const cat = db.dueCategories.find(c => c.id === Number(category_id));
  if (!cat) return res.status(404).json({ detail: 'Due category not found' });

  const parsedAmount = Number(amount) || 0;
  const cleanDesc = (description || 'Department Due').trim();

  // Prevent duplicate pending due record
  const existingPending = db.dueRecords.find(d =>
    d.student_id === student.id &&
    d.department_id === dept.id &&
    d.category_id === cat.id &&
    d.amount === parsedAmount &&
    d.status === 'pending' &&
    d.description.toLowerCase().trim() === cleanDesc.toLowerCase()
  );
  if (existingPending) {
    return res.status(400).json({ detail: 'An identical pending due record already exists for this student in this department' });
  }

  const now = new Date().toISOString();
  const nextDueId = Math.max(0, ...db.dueRecords.map(d => d.id)) + 1;
  const newDue: any = {
    id: nextDueId,
    student_id: student.id,
    department_id: dept.id,
    category_id: cat.id,
    amount: parsedAmount,
    status: 'pending',
    description: cleanDesc,
    remarks: (remarks || '').trim(),
    created_by: req.user!.id,
    updated_by: req.user!.id,
    created_at: now
  };
  db.dueRecords.push(newDue);

  db.logAudit(req.user!.id, req.user!.email, 'DUE_CREATED', 'DUE_RECORD', newDue.id, null, newDue, getClientIp(req));
  db.createNotification(
    student.user_id,
    'New Due Recorded',
    `A due of ₹${newDue.amount.toFixed(2)} for '${newDue.description}' was recorded under ${dept.name}.`,
    'warning'
  );

  res.json({
    id: newDue.id,
    student_id: newDue.student_id,
    student_name: student.full_name,
    student_reg_no: student.register_number,
    student_email: student.email,
    department_id: newDue.department_id,
    department_name: dept.name,
    category_id: newDue.category_id,
    category_name: cat.name,
    amount: newDue.amount,
    status: newDue.status,
    description: newDue.description,
    remarks: newDue.remarks,
    created_at: newDue.created_at,
    updated_at: newDue.updated_at
  });
});

apiRouter.get('/admin/dues/preview-department-target', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const { department_id, year, section, course_id } = req.query;
  const deptId = Number(department_id);
  if (!deptId) return res.status(400).json({ detail: 'department_id is required' });

  const dept = db.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  let targetStudents = db.students.filter(s => s.department_id === deptId);
  if (year !== undefined && year !== 'ALL' && year !== '') {
    targetStudents = targetStudents.filter(s => s.year === Number(year));
  }
  if (section && section !== 'ALL' && section !== '') {
    targetStudents = targetStudents.filter(s => (s.section || '').toUpperCase() === String(section).toUpperCase());
  }
  if (course_id !== undefined && course_id !== 'ALL' && course_id !== '') {
    targetStudents = targetStudents.filter(s => s.course_id === Number(course_id));
  }

  res.json({
    count: targetStudents.length,
    department: {
      id: dept.id,
      name: dept.name,
      code: dept.code
    },
    students: targetStudents.map(s => {
      const course = db.courses.find(c => c.id === s.course_id);
      return {
        id: s.id,
        full_name: s.full_name,
        register_number: s.register_number,
        email: s.email,
        year: s.year,
        section: s.section,
        course_name: course ? course.name : ''
      };
    })
  });
});

apiRouter.post(['/admin/dues/allocate-department', '/admin/dues/bulk-allocate-department'], authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const { department_id, year, section, course_id, category_id, amount, description, remarks } = req.body;

  const deptId = Number(department_id);
  if (!deptId) {
    return res.status(400).json({ detail: 'Valid department_id is required' });
  }

  const dept = db.departments.find(d => d.id === deptId);
  if (!dept) {
    return res.status(404).json({ detail: 'Department not found' });
  }

  // If STAFF, verify staff belongs to this department
  if (req.user!.role === 'STAFF' && req.staffProfile && req.staffProfile.department_id !== deptId) {
    return res.status(403).json({ detail: 'Staff can only allocate dues for their assigned department' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ detail: 'Amount must be a positive number' });
  }

  const trimmedDesc = (description || '').trim();
  if (!trimmedDesc) {
    return res.status(400).json({ detail: 'Due description is required' });
  }

  const catId = Number(category_id);
  const category = db.dueCategories.find(c => c.id === catId);
  if (!category) {
    return res.status(400).json({ detail: 'Valid due category is required' });
  }

  // Filter target students by department, year, section, course
  let targetStudents = db.students.filter(s => s.department_id === deptId);

  if (year !== undefined && year !== 'ALL' && year !== '') {
    targetStudents = targetStudents.filter(s => s.year === Number(year));
  }
  if (section && section !== 'ALL' && section !== '') {
    targetStudents = targetStudents.filter(s => (s.section || '').toUpperCase() === String(section).toUpperCase());
  }
  if (course_id !== undefined && course_id !== 'ALL' && course_id !== '') {
    targetStudents = targetStudents.filter(s => s.course_id === Number(course_id));
  }

  if (targetStudents.length === 0) {
    return res.status(400).json({
      detail: `No students found matching Department: ${dept.name} (Year: ${year || 'All'}, Section: ${section || 'All'})`
    });
  }

  const now = new Date().toISOString();
  let baseDueId = Math.max(0, ...db.dueRecords.map(d => d.id));
  const newRecords: any[] = [];

  for (const student of targetStudents) {
    baseDueId++;
    const dueRecord: any = {
      id: baseDueId,
      student_id: student.id,
      department_id: deptId,
      category_id: catId,
      amount: numAmount,
      status: 'pending',
      description: trimmedDesc,
      remarks: remarks ? String(remarks).trim() : `Allocated to ${dept.code || dept.name} batch`,
      created_by: req.user!.id,
      updated_by: req.user!.id,
      created_at: now,
      updated_at: now
    };
    db.dueRecords.push(dueRecord);
    newRecords.push(dueRecord);

    // Create in-app notification for the student
    db.createNotification(
      student.user_id,
      `New ${dept.code || 'Dept'} Due Allocated: ₹${numAmount.toFixed(2)}`,
      `A due of ₹${numAmount.toFixed(2)} for "${trimmedDesc}" (${category.name}) has been allocated by ${dept.name}.`,
      'warning'
    );
  }

  db.recalculateNextIds();
  db.saveToFile();

  db.logAudit(
    req.user!.id,
    req.user!.email,
    'DEPARTMENT_DUES_BULK_ALLOCATED',
    'DUE_RECORD',
    deptId,
    null,
    {
      department_name: dept.name,
      department_code: dept.code,
      category_name: category.name,
      amount: numAmount,
      student_count: targetStudents.length,
      total_allocated_amount: numAmount * targetStudents.length,
      year: year || 'ALL',
      section: section || 'ALL',
      description: trimmedDesc
    },
    getClientIp(req)
  );

  res.json({
    success: true,
    message: `Successfully allocated ₹${numAmount.toFixed(2)} dues to ${targetStudents.length} students of ${dept.name}`,
    allocated_count: targetStudents.length,
    total_amount: numAmount * targetStudents.length,
    department: {
      id: dept.id,
      name: dept.name,
      code: dept.code
    },
    category: {
      id: category.id,
      name: category.name
    },
    students: targetStudents.map(s => ({
      id: s.id,
      full_name: s.full_name,
      register_number: s.register_number,
      year: s.year,
      section: s.section
    }))
  });
});

apiRouter.patch('/due-records/:id', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const due = db.dueRecords.find(d => d.id === id);
  if (!due) return res.status(404).json({ detail: 'Due record not found' });

  if (req.user!.role === 'STAFF' && due.department_id !== req.staffProfile!.department_id) {
    return res.status(403).json({ detail: 'You can only modify dues for your assigned department' });
  }

  const { amount, status, description, remarks, category_id } = req.body;
  if (category_id !== undefined) {
    const cat = db.dueCategories.find(c => c.id === Number(category_id));
    if (cat) due.category_id = cat.id;
  }
  if (amount !== undefined) due.amount = Number(amount);
  if (status !== undefined) {
    if (!['pending', 'cleared', 'waived'].includes(status)) {
      return res.status(400).json({ detail: 'Invalid status. Must be pending, cleared, or waived' });
    }
    due.status = status;
  }
  if (description !== undefined) due.description = description.trim();
  if (remarks !== undefined) due.remarks = remarks.trim();

  due.updated_at = new Date().toISOString();
  due.updated_by = req.user!.id;

  const student = db.students.find(s => s.id === due.student_id);
  const dept = db.departments.find(d => d.id === due.department_id);
  const cat = db.dueCategories.find(c => c.id === due.category_id);

  if (student && ['cleared', 'waived'].includes(due.status)) {
    db.createNotification(
      student.user_id,
      `Due ${due.status.toUpperCase()}`,
      `Your due of ₹${due.amount.toFixed(2)} under ${dept ? dept.name : 'Department'} has been marked as ${due.status}.`,
      'success'
    );
  }

  db.logAudit(req.user!.id, req.user!.email, 'DUE_UPDATED', 'DUE_RECORD', due.id, null, req.body, getClientIp(req));

  res.json({
    id: due.id,
    student_id: due.student_id,
    student_name: student ? student.full_name : '',
    student_reg_no: student ? student.register_number : '',
    student_email: student ? student.email : '',
    department_id: due.department_id,
    department_name: dept ? dept.name : '',
    category_id: due.category_id,
    category_name: cat ? cat.name : '',
    amount: due.amount,
    status: due.status,
    description: due.description,
    remarks: due.remarks,
    created_at: due.created_at,
    updated_at: due.updated_at
  });
});

apiRouter.delete('/due-records/:id', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.dueRecords.findIndex(d => d.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Due record not found' });

  const due = db.dueRecords[idx];
  if (req.user!.role === 'STAFF' && due.department_id !== req.staffProfile!.department_id) {
    return res.status(403).json({ detail: 'Permission denied for other department due records' });
  }

  db.dueRecords.splice(idx, 1);
  deleteRecordFromPostgres('due_records', id).catch(() => {});
  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'DUE_DELETED', 'DUE_RECORD', id, null, null, getClientIp(req));
  res.json({ message: 'Due record deleted successfully' });
});

apiRouter.post('/due-records/:id/pay', authMiddleware, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const due = db.dueRecords.find(d => d.id === id);
  if (!due) return res.status(404).json({ detail: 'Due record not found' });

  if (req.user!.role === 'STUDENT' && req.studentProfile && due.student_id !== req.studentProfile.id) {
    return res.status(403).json({ detail: 'You can only clear your own dues' });
  }

  const refId = req.body.payment_reference || `TXN-${Date.now()}`;
  due.status = 'cleared';
  due.remarks = `Cleared via online payment ref ${refId}`;
  due.updated_at = new Date().toISOString();

  const student = db.students.find(s => s.id === due.student_id);
  if (student) {
    db.createNotification(
      student.user_id,
      'Due Payment Successful',
      `Payment of ₹${due.amount.toFixed(2)} for '${due.description}' confirmed. Ref: ${refId}.`,
      'success'
    );
  }

  db.logAudit(req.user!.id, req.user!.email, 'DUE_CLEARED_PAYMENT', 'DUE_RECORD', due.id, { status: 'pending' }, { status: 'cleared', ref: refId }, getClientIp(req));

  res.json({ message: 'Due marked as cleared successfully', payment_reference: refId });
});

// ----------------------------------------------------
// Sasurie Official No Due Form Helpers (Dynamic by Department & Semester)
// ----------------------------------------------------
function defaultSubjectsForStudent(student?: any, semester?: number): Array<{ slot: string; name: string; dues_status: string; faculty_name?: string; signature_date?: string; code?: string }> {
  const deptId = student?.department_id || 1;
  const targetSem = Number(semester) || student?.semester || (student?.year ? student.year * 2 - 1 : 7);
  const targetYear = student?.year || Math.ceil(targetSem / 2);
  const dateStr = new Date().toLocaleDateString('en-GB');

  // Query db.subjectCourses for theory subjects
  const dbSubjects = db.subjectCourses.filter(c =>
    c.department_id === deptId &&
    c.semester === targetSem &&
    (!c.course_type || c.course_type === 'theory') &&
    !c.slot?.toLowerCase().includes('lab') &&
    !c.title.toLowerCase().includes('lab')
  );

  if (dbSubjects.length > 0) {
    return dbSubjects.slice(0, 6).map((c, idx) => ({
      slot: c.slot || `Sub ${idx + 1}`,
      name: c.title,
      code: c.code,
      dues_status: 'No Dues',
      faculty_name: c.faculty_name || 'Faculty In-Charge',
      signature_date: dateStr
    }));
  }

  // Fallback to curriculum catalog if database not yet seeded for this sem
  const dept = db.departments.find(d => d.id === deptId);
  const catalog = DEPARTMENT_CURRICULUM_CATALOG[dept?.code?.toUpperCase() || 'CSE'] || [];
  const semCatalog = catalog.filter(c => c.semester === targetSem && c.course_type === 'theory');
  if (semCatalog.length > 0) {
    return semCatalog.slice(0, 6).map((c, idx) => ({
      slot: c.slot || `Sub ${idx + 1}`,
      name: c.title,
      code: c.code,
      dues_status: 'No Dues',
      faculty_name: c.faculty_name,
      signature_date: dateStr
    }));
  }

  // Generic fallback
  const generic = generateGenericSemesterSubjects(dept?.code || 'ENGG', targetYear, targetSem)
    .filter(c => c.course_type === 'theory');
  return generic.slice(0, 6).map((c, idx) => ({
    slot: c.slot || `Sub ${idx + 1}`,
    name: c.title,
    code: c.code,
    dues_status: 'No Dues',
    faculty_name: c.faculty_name,
    signature_date: dateStr
  }));
}

function defaultLabsForStudent(student?: any, semester?: number): Array<{ slot: string; name: string; dues_status: string; faculty_name?: string; signature_date?: string; code?: string }> {
  const deptId = student?.department_id || 1;
  const targetSem = Number(semester) || student?.semester || (student?.year ? student.year * 2 - 1 : 7);
  const targetYear = student?.year || Math.ceil(targetSem / 2);
  const dateStr = new Date().toLocaleDateString('en-GB');

  // Query db.subjectCourses for lab courses
  const dbLabs = db.subjectCourses.filter(c =>
    c.department_id === deptId &&
    c.semester === targetSem &&
    (c.course_type === 'lab' || c.slot?.toLowerCase().includes('lab') || c.title.toLowerCase().includes('lab'))
  );

  if (dbLabs.length > 0) {
    return dbLabs.slice(0, 4).map((c, idx) => ({
      slot: c.slot || `Lab ${idx + 1}`,
      name: c.title,
      code: c.code,
      dues_status: 'No Dues',
      faculty_name: c.faculty_name || 'Lab In-Charge',
      signature_date: dateStr
    }));
  }

  const dept = db.departments.find(d => d.id === deptId);
  const catalog = DEPARTMENT_CURRICULUM_CATALOG[dept?.code?.toUpperCase() || 'CSE'] || [];
  const semCatalog = catalog.filter(c => c.semester === targetSem && c.course_type === 'lab');
  if (semCatalog.length > 0) {
    return semCatalog.slice(0, 4).map((c, idx) => ({
      slot: c.slot || `Lab ${idx + 1}`,
      name: c.title,
      code: c.code,
      dues_status: 'No Dues',
      faculty_name: c.faculty_name,
      signature_date: dateStr
    }));
  }

  return [
    { slot: 'Lab 1', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
    { slot: 'Lab 2', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
    { slot: 'Lab 3', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
    { slot: 'Lab 4', name: '-', dues_status: '-', faculty_name: '', signature_date: '' }
  ];
}

function defaultSignatoriesForStudent(reqObj?: any) {
  return {
    chief_mentor: { signed: true, name: 'S. Rajesh', date: '10/8/26', status: 'approved' },
    hod: { signed: true, name: 'Dr. S. R. Murugan', date: '10/8/26', status: 'approved' },
    coe: { signed: true, name: 'Dr. H. Sasipal CoE', date: '10/8/26', status: 'approved' },
    principal: { signed: true, name: 'Dr. T. Senthilvel', date: '10/8/26', status: 'approved' },
    library: { signed: true, name: 'D. Vinoth', date: '10/8/26', status: 'No Due' },
    transport: { signed: false, name: '-', date: '-', status: '-' },
    hostel: { signed: false, name: '-', date: '-', status: '-' },
    office_accounts: { signed: true, name: 'S. Accounts', date: '10/08/2026', status: 'No Dues' }
  };
}

// ----------------------------------------------------
// No Due Requests (/api/no-due-requests)
// ----------------------------------------------------
apiRouter.post('/no-due-requests', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile!;
  const pendingDues = db.dueRecords.filter(d => d.student_id === student.id && d.status === 'pending');
  if (pendingDues.length > 0) {
    const totalPending = pendingDues.reduce((s, d) => s + d.amount, 0);
    return res.status(400).json({
      detail: `Clear all pending dues before submitting your No Due request. You have ₹${totalPending.toFixed(2)} outstanding.`
    });
  }

  const activeReq = db.noDueRequests.find(r => r.student_id === student.id && ['submitted', 'under_review', 'approved', 'completed'].includes(r.status));
  if (activeReq) {
    return res.status(400).json({ detail: 'You already have an active No Due request in progress or completed.' });
  }

  const now = new Date().toISOString();
  const reqId = Math.max(0, ...db.noDueRequests.map(r => r.id)) + 1;
  const attendancePct = req.body.attendance_percentage ?? (student.attendance_percentage ?? 98);
  const undertakingStatus = req.body.undertaking_status || (Number(attendancePct) >= 80 ? 'Exempted' : 'Submitted');

  const targetYear = req.body.year || student.year || 4;
  const targetSemester = req.body.semester || student.semester || (student.year === 4 ? 7 : student.year * 2 - 1);

  const newReq: any = {
    id: reqId,
    student_id: student.id,
    status: 'under_review',
    submitted_at: now,
    remarks: req.body.remarks || 'CIAT / End Sem Clearance Form',
    created_at: now,
    exam_type: req.body.exam_type || 'CIAT - I',
    form_date: req.body.form_date || new Date().toLocaleDateString('en-GB'),
    academic_year: req.body.academic_year || '2025-26',
    year: targetYear,
    semester: targetSemester,
    student_type: req.body.student_type || student.student_type || 'day_scholar',
    attendance_percentage: attendancePct,
    attendance_month: req.body.attendance_month || 'August',
    undertaking_status: undertakingStatus,
    subjects: req.body.subjects && req.body.subjects.length > 0 ? req.body.subjects : defaultSubjectsForStudent(student, targetSemester),
    labs: req.body.labs && req.body.labs.length > 0 ? req.body.labs : defaultLabsForStudent(student, targetSemester),
    signatories: req.body.signatories || defaultSignatoriesForStudent()
  };
  db.noDueRequests.push(newReq);

  // Auto-generate approval for departments applicable to this student
  const studentDues = db.dueRecords.filter(d => d.student_id === student.id);
  const activeDepts = getApplicableDepartmentsForStudent(student, db.departments, studentDues, db.courses);
  const baseAppId = Math.max(0, ...db.noDueApprovals.map(a => a.id));
  const approvals = activeDepts.map((d, index) => {
    const appRecord: any = {
      id: baseAppId + index + 1,
      request_id: newReq.id,
      department_id: d.id,
      status: 'pending',
      created_at: now
    };
    db.noDueApprovals.push(appRecord);
    return {
      ...appRecord,
      department_name: d.name
    };
  });
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'NO_DUE_REQUEST_CREATED', 'NO_DUE_REQUEST', newReq.id, null, { departments_count: activeDepts.length, exam_type: newReq.exam_type }, getClientIp(req));
  db.createNotification(
    student.user_id,
    'Official No Due Request Submitted',
    `Your ${newReq.exam_type} No Due Form has been initiated with 14 clearance sections and routed for verification.`,
    'info'
  );

  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  res.json({
    id: newReq.id,
    student_id: newReq.student_id,
    student_name: student.full_name,
    student_reg_no: student.register_number,
    course_name: course ? course.name : '',
    department_name: dept ? dept.name : '',
    status: newReq.status,
    submitted_at: newReq.submitted_at,
    remarks: newReq.remarks,
    approvals,
    created_at: newReq.created_at,
    exam_type: newReq.exam_type,
    form_date: newReq.form_date,
    academic_year: newReq.academic_year,
    year: newReq.year,
    semester: newReq.semester,
    student_type: newReq.student_type,
    attendance_percentage: newReq.attendance_percentage,
    attendance_month: newReq.attendance_month,
    undertaking_status: newReq.undertaking_status,
    subjects: newReq.subjects,
    labs: newReq.labs,
    signatories: newReq.signatories
  });
});

apiRouter.get('/no-due-requests/my', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile!;
  const requests = db.noDueRequests.filter(r => r.student_id === student.id).slice().reverse();
  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  const result = requests.map(r => {
    const approvals = db.noDueApprovals.filter(a => a.request_id === r.id).map(a => {
      const d = db.departments.find(dep => dep.id === a.department_id);
      return {
        id: a.id,
        request_id: a.request_id,
        department_id: a.department_id,
        department_name: d ? d.name : '',
        approved_by: a.approved_by,
        status: a.status,
        remarks: a.remarks,
        approved_at: a.approved_at,
        created_at: a.created_at
      };
    });
    return {
      id: r.id,
      student_id: r.student_id,
      student_name: student.full_name,
      student_reg_no: student.register_number,
      course_name: course ? course.name : '',
      department_name: dept ? dept.name : '',
      status: r.status,
      submitted_at: r.submitted_at,
      reviewed_at: r.reviewed_at,
      reviewed_by: r.reviewed_by,
      remarks: r.remarks,
      approvals,
      created_at: r.created_at,
      exam_type: r.exam_type || 'CIAT - I',
      form_date: r.form_date || (r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '10/08/2026'),
      academic_year: r.academic_year || '2025-26',
      year: r.year || student.year || 4,
      semester: r.semester || (student.semester || (student.year === 4 ? 7 : student.year * 2 - 1)),
      student_type: r.student_type || student.student_type || 'day_scholar',
      attendance_percentage: r.attendance_percentage ?? (student.attendance_percentage ?? 98),
      attendance_month: r.attendance_month || 'August',
      undertaking_status: r.undertaking_status || ((Number(r.attendance_percentage ?? student.attendance_percentage ?? 98) >= 80) ? 'Exempted' : 'Submitted'),
      subjects: r.subjects && r.subjects.length > 0 ? r.subjects : defaultSubjectsForStudent(student),
      labs: r.labs && r.labs.length > 0 ? r.labs : defaultLabsForStudent(student),
      signatories: r.signatories || defaultSignatoriesForStudent(r)
    };
  });

  res.json(result);
});

apiRouter.get(['/no-due-requests', '/no-due-requests/all'], authMiddleware, requireRole(['STUDENT', 'STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  let requests = db.noDueRequests;
  if (req.user!.role === 'STUDENT') {
    const student = req.studentProfile;
    if (!student) return res.json([]);
    requests = requests.filter(r => r.student_id === student.id);
  }
  if (req.query.status) {
    requests = requests.filter(r => r.status === req.query.status);
  }

  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    requests = requests.filter(r => {
      const st = db.students.find(s => s.id === r.student_id);
      return (
        (st && st.full_name.toLowerCase().includes(search)) ||
        (st && st.register_number.toLowerCase().includes(search))
      );
    });
  }

  const total = requests.length;
  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = requests.slice().reverse().slice(skip, skip + limit);

  const result = paginated.map(r => {
    const st = db.students.find(s => s.id === r.student_id);
    const dept = st ? db.departments.find(d => d.id === st.department_id) : null;
    const course = st ? db.courses.find(c => c.id === st.course_id) : null;
    const approvals = db.noDueApprovals.filter(a => a.request_id === r.id).map(a => {
      const d = db.departments.find(dep => dep.id === a.department_id);
      return {
        id: a.id,
        request_id: a.request_id,
        department_id: a.department_id,
        department_name: d ? d.name : '',
        approved_by: a.approved_by,
        status: a.status,
        remarks: a.remarks,
        approved_at: a.approved_at,
        created_at: a.created_at
      };
    });

    return {
      id: r.id,
      student_id: r.student_id,
      student_name: st ? st.full_name : '',
      student_reg_no: st ? st.register_number : '',
      course_name: course ? course.name : '',
      department_name: dept ? dept.name : '',
      status: r.status,
      submitted_at: r.submitted_at,
      reviewed_at: r.reviewed_at,
      reviewed_by: r.reviewed_by,
      remarks: r.remarks,
      approvals,
      created_at: r.created_at,
      exam_type: r.exam_type || 'CIAT - I',
      form_date: r.form_date || (r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-GB') : '10/08/2026'),
      academic_year: r.academic_year || '2025-26',
      year: r.year || (st ? st.year : 4),
      semester: r.semester || (st ? (st.semester || (st.year === 4 ? 7 : st.year * 2 - 1)) : 7),
      student_type: r.student_type || (st ? st.student_type : 'day_scholar'),
      attendance_percentage: r.attendance_percentage ?? (st ? st.attendance_percentage : 98),
      attendance_month: r.attendance_month || 'August',
      undertaking_status: r.undertaking_status || ((Number(r.attendance_percentage ?? st?.attendance_percentage ?? 98) >= 80) ? 'Exempted' : 'Submitted'),
      subjects: r.subjects && r.subjects.length > 0 ? r.subjects : defaultSubjectsForStudent(st),
      labs: r.labs && r.labs.length > 0 ? r.labs : defaultLabsForStudent(st),
      signatories: r.signatories || defaultSignatoriesForStudent(r)
    };
  });

  res.json(result);
});

// Update specific signatory or subject on a physical form
apiRouter.patch('/no-due-requests/:id/sign-role', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const r = db.noDueRequests.find(reqItem => reqItem.id === id);
  if (!r) return res.status(404).json({ detail: 'Request not found' });

  const { role_key, signer_name, dues_status, remarks, date_str } = req.body;
  const nowStr = date_str || new Date().toLocaleDateString('en-GB');

  if (!r.signatories) {
    r.signatories = defaultSignatoriesForStudent(r);
  }

  if (role_key && r.signatories && (r.signatories as any)[role_key] !== undefined) {
    (r.signatories as any)[role_key] = {
      signed: true,
      name: signer_name || req.user!.full_name,
      date: nowStr,
      status: dues_status || 'approved',
      remarks: remarks || ''
    };
  }

  // If role_key is a subject slot (e.g., 'Sub 1', 'Sub 2')
  if (role_key && role_key.startsWith('Sub ') && r.subjects) {
    const sub = r.subjects.find(s => s.slot === role_key);
    if (sub) {
      sub.dues_status = dues_status || 'No Dues';
      sub.faculty_name = signer_name || req.user!.full_name;
      sub.signature_date = nowStr;
    }
  }

  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'SIGNATORY_UPDATED', 'NO_DUE_REQUEST', r.id, null, { role_key, signer_name }, getClientIp(req));

  res.json({ message: 'Signatory updated successfully', signatories: r.signatories, subjects: r.subjects });
});

apiRouter.patch('/no-due-requests/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const r = db.noDueRequests.find(reqItem => reqItem.id === id);
  if (!r) return res.status(404).json({ detail: 'Request not found' });

  const { status, remarks } = req.body;
  if (status) r.status = status;
  if (remarks) r.remarks = remarks;
  r.reviewed_at = new Date().toISOString();
  r.reviewed_by = req.user!.id;

  const st = db.students.find(s => s.id === r.student_id);
  if (st) {
    db.createNotification(
      st.user_id,
      'No Due Request Update',
      `Your No Due Request #${r.id} status is now: ${r.status.toUpperCase()}.`,
      r.status === 'rejected' ? 'danger' : 'info'
    );
  }

  db.logAudit(req.user!.id, req.user!.email, 'REQUEST_STATUS_UPDATED', 'NO_DUE_REQUEST', r.id, null, { status: r.status }, getClientIp(req));
  res.json({ message: 'Request updated successfully', status: r.status });
});

apiRouter.delete('/no-due-requests/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.noDueRequests.findIndex(reqItem => reqItem.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Clearance request not found' });

  db.noDueApprovals = db.noDueApprovals.filter(a => a.request_id !== id);
  db.noDueRequests.splice(idx, 1);

  db.logAudit(req.user!.id, req.user!.email, 'REQUEST_DELETED', 'NO_DUE_REQUEST', id, null, null, getClientIp(req));
  res.json({ message: 'Clearance application deleted successfully', id });
});

// ----------------------------------------------------
// No Due Approvals (/api/no-due-approvals)
// ----------------------------------------------------
apiRouter.get(['/no-due-approvals', '/no-due-approvals/my-department'], authMiddleware, (req: AuthRequest, res: Response) => {
  let approvals = db.noDueApprovals;
  const user = req.user!;

  if (user.role === 'STAFF') {
    const staff = req.staffProfile;
    if (!staff) return res.status(403).json({ detail: 'Staff profile not found' });
    approvals = approvals.filter(a => a.department_id === staff.department_id);
  } else if (user.role === 'ADMIN') {
    if (req.query.department_id) {
      approvals = approvals.filter(a => a.department_id === Number(req.query.department_id));
    }
  } else {
    return res.status(403).json({ detail: 'Unauthorized' });
  }

  if (req.query.status_filter) {
    approvals = approvals.filter(a => a.status === req.query.status_filter);
  }

  const result = approvals.slice().reverse().map(a => {
    const r = db.noDueRequests.find(reqItem => reqItem.id === a.request_id);
    const st = r ? db.students.find(s => s.id === r.student_id) : null;
    const course = st ? db.courses.find(c => c.id === st.course_id) : null;
    const dept = db.departments.find(d => d.id === a.department_id);

    const pendingDues = st ? db.dueRecords.filter(d => d.student_id === st.id && d.department_id === a.department_id && d.status === 'pending') : [];

    return {
      id: a.id,
      request_id: a.request_id,
      department_id: a.department_id,
      department_name: dept ? dept.name : '',
      student_id: st ? st.id : null,
      student_name: st ? st.full_name : '',
      student_reg_no: st ? st.register_number : '',
      course_name: course ? course.name : '',
      academic_year: st ? `${st.year}th Year` : '',
      status: a.status,
      remarks: a.remarks,
      approved_at: a.approved_at,
      has_pending_dues: pendingDues.length > 0,
      pending_dues_amount: pendingDues.reduce((s, d) => s + d.amount, 0),
      created_at: a.created_at
    };
  });

  res.json(result);
});

apiRouter.patch('/no-due-approvals/:id', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const approval = db.noDueApprovals.find(a => a.id === id);
  if (!approval) return res.status(404).json({ detail: 'Approval record not found' });

  if (req.user!.role === 'STAFF' && approval.department_id !== req.staffProfile!.department_id) {
    return res.status(403).json({ detail: 'You are only authorized to approve or reject for your assigned department' });
  }

  const { status, remarks } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ detail: "Status must be 'approved' or 'rejected'" });
  }

  const r = db.noDueRequests.find(reqItem => reqItem.id === approval.request_id);
  if (status === 'approved' && r) {
    const deptPending = db.dueRecords.find(d => d.student_id === r.student_id && d.department_id === approval.department_id && d.status === 'pending');
    if (deptPending) {
      return res.status(400).json({
        detail: `Cannot approve clearance: Student has an active pending due of ₹${deptPending.amount.toFixed(2)} in this department`
      });
    }
  }

  approval.status = status;
  approval.remarks = remarks;
  approval.approved_by = req.user!.id;
  approval.approved_at = new Date().toISOString();

  if (r) {
    if (status === 'rejected') {
      r.status = 'rejected';
      const dept = db.departments.find(d => d.id === approval.department_id);
      r.remarks = `Rejected by ${dept ? dept.name : 'Department'}: ${remarks || 'Requirement unfulfilled'}`;
    } else if (status === 'approved') {
      // Check if ALL approvals for this request are approved
      const allApprovals = db.noDueApprovals.filter(a => a.request_id === r.id);
      const allApproved = allApprovals.every(a => a.status === 'approved');
      if (allApproved) {
        r.status = 'approved';
      }
    }

    const st = db.students.find(s => s.id === r.student_id);
    const dept = db.departments.find(d => d.id === approval.department_id);
    if (st) {
      db.createNotification(
        st.user_id,
        `Clearance ${status.toUpperCase()} by ${dept ? dept.name : 'Department'}`,
        `${dept ? dept.name : 'Department'} has ${status} your clearance request. Remarks: ${remarks || 'None'}.`,
        status === 'approved' ? 'success' : 'danger'
      );
    }
  }

  db.logAudit(req.user!.id, req.user!.email, `APPROVAL_${status.toUpperCase()}`, 'NO_DUE_APPROVAL', approval.id, null, req.body, getClientIp(req));
  res.json({ message: `Department clearance marked as ${status}`, status: approval.status });
});

apiRouter.get('/no-due-approvals/request/:request_id', authMiddleware, (req: AuthRequest, res: Response) => {
  const reqId = Number(req.params.request_id);
  const approvals = db.noDueApprovals.filter(a => a.request_id === reqId).map(a => {
    const dept = db.departments.find(d => d.id === a.department_id);
    return {
      id: a.id,
      request_id: a.request_id,
      department_id: a.department_id,
      department_name: dept ? dept.name : '',
      approved_by: a.approved_by,
      status: a.status,
      remarks: a.remarks,
      approved_at: a.approved_at,
      created_at: a.created_at
    };
  });
  res.json(approvals);
});

// ----------------------------------------------------
// Certificates (/api/certificates)
// ----------------------------------------------------
apiRouter.post(['/certificates/request/:request_id/issue', '/certificates/issue/:request_id'], authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const reqId = Number(req.params.request_id);
  const r = db.noDueRequests.find(item => item.id === reqId);
  if (!r) return res.status(404).json({ detail: 'No Due Request not found' });

  const approvals = db.noDueApprovals.filter(a => a.request_id === r.id);
  const pendingApprovals = approvals.filter(a => a.status !== 'approved');
  if (pendingApprovals.length > 0) {
    const unapproved = pendingApprovals.map(a => {
      const d = db.departments.find(dept => dept.id === a.department_id);
      return d ? d.name : `Dept #${a.department_id}`;
    });
    return res.status(400).json({ detail: `Cannot issue certificate. Clearances pending from: ${unapproved.join(', ')}` });
  }

  const existing = db.certificates.find(c => c.request_id === reqId);
  if (existing) {
    return res.status(400).json({ detail: 'Certificate has already been issued for this request' });
  }

  const nextCertId = Math.max(0, ...db.certificates.map(c => c.id)) + 1;
  const certNumber = `CERT-2026-${nextCertId.toString().padStart(5, '0')}`;
  const verifCode = `VFY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();
  const issuerName = req.user?.role === 'ADMIN' ? 'College Administrator' : (req.user?.email || 'Institutional Administrator');

  const cert: CertificateRecord = {
    id: nextCertId,
    request_id: r.id,
    student_id: r.student_id,
    certificate_number: certNumber,
    verification_code: verifCode,
    issued_at: now,
    is_valid: true,
    issued_by: req.user!.id,
    issued_by_name: issuerName,
    created_at: now
  };
  db.certificates.push(cert);
  db.saveToFile();

  r.status = 'completed';
  r.reviewed_at = now;
  r.reviewed_by = req.user!.id;

  const st = db.students.find(s => s.id === r.student_id);
  const dept = st ? db.departments.find(d => d.id === st.department_id) : null;
  const course = st ? db.courses.find(c => c.id === st.course_id) : null;

  if (st) {
    db.createNotification(
      st.user_id,
      'No Due Certificate Issued!',
      `Congratulations! Your official No Due Certificate #${certNumber} has been issued and is available for download.`,
      'success'
    );
  }

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_ISSUED', 'CERTIFICATE', cert.id, null, {
    cert_number: certNumber,
    student_id: r.student_id,
    student_name: st ? st.full_name : '',
    register_number: st ? st.register_number : '',
    issued_by: issuerName
  }, getClientIp(req));

  res.json({
    id: cert.id,
    request_id: cert.request_id,
    student_id: cert.student_id,
    student_name: st ? st.full_name : '',
    register_number: st ? st.register_number : '',
    course_name: course ? course.name : '',
    department_id: dept ? dept.id : undefined,
    department_name: dept ? dept.name : '',
    certificate_number: cert.certificate_number,
    verification_code: cert.verification_code,
    issued_at: cert.issued_at,
    is_valid: cert.is_valid,
    issued_by: cert.issued_by,
    issued_by_name: cert.issued_by_name,
    created_at: cert.created_at
  });
});

apiRouter.get('/certificates/my', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile!;
  const certs = db.certificates.filter(c => c.student_id === student.id).slice().reverse();
  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  const result = certs.map(c => {
    const reqObj = db.noDueRequests.find(r => r.id === c.request_id);
    return {
      id: c.id,
      request_id: c.request_id,
      student_id: c.student_id,
      student_name: student.full_name,
      register_number: student.register_number,
      course_name: course ? course.name : '',
      department_id: dept ? dept.id : undefined,
      department_name: dept ? dept.name : '',
      certificate_number: c.certificate_number,
      verification_code: c.verification_code,
      issued_at: c.issued_at,
      is_valid: c.is_valid,
      issued_by: c.issued_by,
      issued_by_name: c.issued_by_name || 'Institutional Administrator',
      revoked_by: c.revoked_by,
      revoked_by_name: c.revoked_by_name,
      revoked_at: c.revoked_at,
      revocation_reason: c.revocation_reason,
      created_at: c.created_at,
      request: reqObj || null
    };
  });

  res.json(result);
});

apiRouter.get(['/certificates', '/certificates/all'], authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  let certs = db.certificates;
  
  // Filter by status: 'issued' | 'revoked' | 'all'
  if (req.query.status) {
    const status = String(req.query.status).toLowerCase();
    if (status === 'issued' || status === 'valid') {
      certs = certs.filter(c => c.is_valid === true);
    } else if (status === 'revoked') {
      certs = certs.filter(c => c.is_valid === false);
    }
  } else if (req.query.is_valid !== undefined) {
    const isValid = req.query.is_valid === 'true';
    certs = certs.filter(c => c.is_valid === isValid);
  }

  // Filter by department
  if (req.query.department_id) {
    const deptId = Number(req.query.department_id);
    certs = certs.filter(c => {
      const st = db.students.find(s => s.id === c.student_id);
      return st && st.department_id === deptId;
    });
  }

  // Filter by issue date (YYYY-MM-DD)
  if (req.query.issue_date) {
    const filterDate = String(req.query.issue_date).trim();
    certs = certs.filter(c => c.issued_at.startsWith(filterDate));
  }

  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    certs = certs.filter(c => {
      const st = db.students.find(s => s.id === c.student_id);
      return (
        c.certificate_number.toLowerCase().includes(search) ||
        c.verification_code.toLowerCase().includes(search) ||
        (st && st.full_name.toLowerCase().includes(search)) ||
        (st && st.register_number.toLowerCase().includes(search))
      );
    });
  }

  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 100;
  const paginated = certs.slice().reverse().slice(skip, skip + limit);

  const result = paginated.map(c => {
    const st = db.students.find(s => s.id === c.student_id);
    const dept = st ? db.departments.find(d => d.id === st.department_id) : null;
    const course = st ? db.courses.find(cr => cr.id === st.course_id) : null;
    const reqObj = db.noDueRequests.find(r => r.id === c.request_id);
    return {
      id: c.id,
      request_id: c.request_id,
      student_id: c.student_id,
      student_name: st ? st.full_name : '',
      register_number: st ? st.register_number : '',
      course_name: course ? course.name : '',
      department_id: dept ? dept.id : undefined,
      department_name: dept ? dept.name : '',
      certificate_number: c.certificate_number,
      verification_code: c.verification_code,
      issued_at: c.issued_at,
      is_valid: c.is_valid,
      issued_by: c.issued_by,
      issued_by_name: c.issued_by_name || 'Institutional Administrator',
      revoked_by: c.revoked_by,
      revoked_by_name: c.revoked_by_name,
      revoked_at: c.revoked_at,
      revocation_reason: c.revocation_reason,
      created_at: c.created_at,
      updated_at: c.updated_at,
      request: reqObj || null
    };
  });

  res.json(result);
});

// Certificate audit history endpoint
apiRouter.get('/certificates/audits', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const limit = Number(req.query.limit) || 100;
  const certId = req.query.certificate_id ? Number(req.query.certificate_id) : null;
  let logs = db.auditLogs.filter(l => l.entity_type === 'CERTIFICATE');
  if (certId) {
    logs = logs.filter(l => l.entity_id === certId);
  }
  const mapped = logs.slice().reverse().slice(0, limit).map(l => ({
    id: l.id,
    action: l.action,
    user_id: l.user_id,
    user_email: l.user_email,
    entity_id: l.entity_id,
    details: l.new_values || l.old_values || {},
    ip_address: l.ip_address,
    created_at: l.created_at
  }));
  res.json(mapped);
});

// Audit view log endpoint
apiRouter.post('/certificates/:id/audit-view', authMiddleware, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const cert = db.certificates.find(c => c.id === id);
  if (!cert) return res.status(404).json({ detail: 'Certificate not found' });
  const st = db.students.find(s => s.id === cert.student_id);

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_VIEWED', 'CERTIFICATE', cert.id, null, {
    certificate_number: cert.certificate_number,
    student_id: cert.student_id,
    student_name: st ? st.full_name : '',
    register_number: st ? st.register_number : '',
    viewer_role: req.user!.role
  }, getClientIp(req));

  res.json({ success: true });
});

// Public verification endpoint (supports verification code OR certificate number)
apiRouter.get('/certificates/verify/:verification_code', (req: Request, res: Response) => {
  const code = (req.params.verification_code || '').trim().toUpperCase();
  const cert = db.certificates.find(c => 
    c.verification_code.toUpperCase() === code || 
    c.certificate_number.toUpperCase() === code
  );
  if (!cert) {
    return res.status(404).json({ detail: 'Certificate with this verification code or certificate ID was not found in institutional records.' });
  }

  const st = db.students.find(s => s.id === cert.student_id);
  const dept = st ? db.departments.find(d => d.id === st.department_id) : null;
  const course = st ? db.courses.find(c => c.id === st.course_id) : null;

  res.json({
    is_valid: cert.is_valid,
    certificate_number: cert.certificate_number,
    verification_code: cert.verification_code,
    student_name: st ? st.full_name : 'N/A',
    register_number: st ? st.register_number : 'N/A',
    course_name: course ? course.name : 'N/A',
    department_name: dept ? dept.name : 'N/A',
    academic_year: st ? `Class of ${st.admission_year + (course?.duration || 4)}` : 'N/A',
    issued_at: cert.issued_at,
    issued_by: cert.issued_by_name || 'Institutional Administrator',
    revoked_at: cert.revoked_at,
    revocation_reason: cert.revocation_reason,
    college_name: 'College of Engineering (Autonomous), Approved by AICTE & Anna University',
    status_message: cert.is_valid ? 'AUTHENTIC & VALID' : 'REVOKED / INVALID'
  });
});

apiRouter.get('/certificates/:id/download', authMiddleware, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const cert = db.certificates.find(c => c.id === id);
  if (!cert) return res.status(404).json({ detail: 'Certificate not found' });

  if (req.user!.role === 'STUDENT' && req.studentProfile && cert.student_id !== req.studentProfile.id) {
    return res.status(403).json({ detail: 'You are not authorized to download this certificate' });
  }

  const st = db.students.find(s => s.id === cert.student_id);
  const dept = st ? db.departments.find(d => d.id === st.department_id) : null;
  const course = st ? db.courses.find(c => c.id === st.course_id) : null;
  const issuer = cert.issued_by_name || 'Institutional Administrator';

  const pdfBuffer = generateCertificatePdf(
    st ? st.full_name : 'STUDENT',
    st ? st.register_number : 'REG000',
    course ? course.name : 'Undergraduate Program',
    dept ? dept.name : 'Academic Department',
    st ? `${st.year}th Year (${st.admission_year}-${st.admission_year + 4})` : '2022-2026',
    cert.certificate_number,
    cert.verification_code,
    cert.issued_at,
    issuer
  );

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_DOWNLOADED', 'CERTIFICATE', cert.id, null, {
    certificate_number: cert.certificate_number,
    student_id: cert.student_id,
    student_name: st ? st.full_name : '',
    register_number: st ? st.register_number : ''
  }, getClientIp(req));

  const filename = `NoDueCertificate_${st ? st.register_number : cert.certificate_number}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

apiRouter.patch('/certificates/:id/revoke', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const cert = db.certificates.find(c => c.id === id);
  if (!cert) return res.status(404).json({ detail: 'Certificate not found' });

  const reason = (req.body.reason || 'Administrative review and discrepancy verification').trim();
  const issuerName = req.user?.role === 'ADMIN' ? 'College Administrator' : (req.user?.email || 'Administrator');
  cert.is_valid = false;
  cert.revoked_at = new Date().toISOString();
  cert.revoked_by = req.user!.id;
  cert.revoked_by_name = issuerName;
  cert.revocation_reason = reason;
  cert.updated_at = new Date().toISOString();
  db.saveToFile();

  const st = db.students.find(s => s.id === cert.student_id);
  if (st) {
    db.createNotification(
      st.user_id,
      'Certificate Revoked',
      `Your certificate #${cert.certificate_number} has been revoked by administration. Reason: ${reason}.`,
      'danger'
    );
  }

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_REVOKED', 'CERTIFICATE', cert.id, { is_valid: true }, {
    is_valid: false,
    reason,
    revoked_by: issuerName,
    certificate_number: cert.certificate_number
  }, getClientIp(req));

  res.json({
    message: 'Certificate revoked successfully',
    is_valid: false,
    revoked_at: cert.revoked_at,
    revoked_by_name: cert.revoked_by_name,
    revocation_reason: cert.revocation_reason
  });
});

apiRouter.delete('/certificates/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.certificates.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Certificate not found' });

  const cert = db.certificates[idx];
  db.certificates.splice(idx, 1);
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_DELETED', 'CERTIFICATE', id, null, { cert_number: cert.certificate_number }, getClientIp(req));
  res.json({ message: 'Certificate removed from records', id });
});

// ----------------------------------------------------
// Notifications (/api/notifications)
// ----------------------------------------------------
apiRouter.get('/notifications', authMiddleware, (req: AuthRequest, res: Response) => {
  const list = db.notifications.filter(n => n.user_id === req.user!.id).slice(0, 50);
  res.json(list);
});

apiRouter.patch('/notifications/:id/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const notif = db.notifications.find(n => n.id === id && n.user_id === req.user!.id);
  if (!notif) return res.status(404).json({ detail: 'Notification not found' });
  notif.is_read = true;
  res.json(notif);
});

apiRouter.post('/notifications/read-all', authMiddleware, (req: AuthRequest, res: Response) => {
  db.notifications.filter(n => n.user_id === req.user!.id).forEach(n => { n.is_read = true; });
  res.json({ message: 'All notifications marked as read' });
});

// ----------------------------------------------------
// Admin Routes (/api/admin)
// ----------------------------------------------------
apiRouter.get('/admin/dashboard', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const totalStudents = db.students.length;
  const totalStaff = db.staff.length;
  const totalDepartments = db.departments.length;
  const totalCourses = db.courses.length;

  const pendingDues = db.dueRecords.filter(d => d.status === 'pending');
  const clearedDues = db.dueRecords.filter(d => d.status === 'cleared');

  const pendingDuesCount = pendingDues.length;
  const pendingDuesAmount = pendingDues.reduce((s, d) => s + d.amount, 0);
  const clearedDuesCount = clearedDues.length;
  const clearedDuesAmount = clearedDues.reduce((s, d) => s + d.amount, 0);

  const pendingRequestsCount = db.noDueRequests.filter(r => ['submitted', 'under_review'].includes(r.status)).length;
  const approvedRequestsCount = db.noDueRequests.filter(r => ['approved', 'completed'].includes(r.status)).length;
  const rejectedRequestsCount = db.noDueRequests.filter(r => r.status === 'rejected').length;
  const validCertificatesCount = db.certificates.filter(c => c.is_valid).length;

  const departmentBreakdown = db.departments.filter(d => d.is_active).map(dept => {
    const deptPending = pendingDues.filter(d => d.department_id === dept.id);
    return {
      department_id: dept.id,
      department_name: dept.name,
      department_code: dept.code,
      pending_count: deptPending.length,
      pending_amount: deptPending.reduce((s, d) => s + d.amount, 0)
    };
  });

  const recentRequests = db.noDueRequests.slice().reverse().slice(0, 5).map(r => {
    const st = db.students.find(s => s.id === r.student_id);
    const cr = st ? db.courses.find(c => c.id === st.course_id) : null;
    return {
      id: r.id,
      student_name: st ? st.full_name : '',
      register_number: st ? st.register_number : '',
      course_name: cr ? cr.name : '',
      status: r.status,
      submitted_at: r.submitted_at
    };
  });

  const recentDues = db.dueRecords.slice().reverse().slice(0, 5).map(d => {
    const st = db.students.find(s => s.id === d.student_id);
    const dep = db.departments.find(dept => dept.id === d.department_id);
    const cat = db.dueCategories.find(c => c.id === d.category_id);
    return {
      id: d.id,
      student_name: st ? st.full_name : '',
      register_number: st ? st.register_number : '',
      department_name: dep ? dep.name : '',
      category_name: cat ? cat.name : '',
      amount: d.amount,
      status: d.status,
      created_at: d.created_at
    };
  });

  const recentCertificates = db.certificates.slice().reverse().slice(0, 5).map(c => {
    const st = db.students.find(s => s.id === c.student_id);
    return {
      id: c.id,
      certificate_number: c.certificate_number,
      student_name: st ? st.full_name : '',
      register_number: st ? st.register_number : '',
      issued_at: c.issued_at,
      is_valid: c.is_valid
    };
  });

  const recentAudits = db.auditLogs.slice(0, 8).map(a => ({
    id: a.id,
    action: a.action,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    created_at: a.created_at
  }));

  res.json({
    stats: {
      total_students: totalStudents,
      total_staff: totalStaff,
      total_departments: totalDepartments,
      total_courses: totalCourses,
      pending_dues_count: pendingDuesCount,
      pending_dues_amount: pendingDuesAmount,
      cleared_dues_count: clearedDuesCount,
      cleared_dues_amount: clearedDuesAmount,
      pending_requests_count: pendingRequestsCount,
      approved_requests_count: approvedRequestsCount,
      rejected_requests_count: rejectedRequestsCount,
      valid_certificates_count: validCertificatesCount
    },
    department_breakdown: departmentBreakdown,
    recent_requests: recentRequests,
    recent_dues: recentDues,
    recent_certificates: recentCertificates,
    recent_audits: recentAudits
  });
});

apiRouter.get('/admin/students', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  let students = db.students;
  if (req.query.department_id) {
    students = students.filter(s => s.department_id === Number(req.query.department_id));
  }
  if (req.query.course_id) {
    students = students.filter(s => s.course_id === Number(req.query.course_id));
  }
  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    students = students.filter(s =>
      s.full_name.toLowerCase().includes(search) ||
      s.register_number.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search)
    );
  }

  const total = students.length;
  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = students.slice(skip, skip + limit);

  const result = paginated.map(s => {
    const user = db.users.find(u => u.id === s.user_id);
    const dept = db.departments.find(d => d.id === s.department_id);
    const course = db.courses.find(c => c.id === s.course_id);
    return {
      id: s.id,
      user_id: s.user_id,
      register_number: s.register_number,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      department_id: s.department_id,
      department_name: dept ? dept.name : '',
      course_id: s.course_id,
      course_name: course ? course.name : '',
      year: s.year,
      semester: s.semester || (s.year ? s.year * 2 - 1 : 1),
      section: s.section,
      admission_year: s.admission_year,
      is_active: user ? user.is_active : true,
      is_registered: user ? !!user.is_registered : false,
      created_at: s.created_at
    };
  });

  res.json(result);
});

apiRouter.patch(['/admin/students/:id/status', '/admin/students/:id/toggle-status'], authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const st = db.students.find(s => s.id === id);
  if (!st) return res.status(404).json({ detail: 'Student not found' });
  const u = db.users.find(user => user.id === st.user_id);
  if (!u) return res.status(404).json({ detail: 'User not found' });

  u.is_active = !u.is_active;
  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'USER_STATUS_TOGGLE', 'STUDENT', st.id, null, { is_active: u.is_active }, getClientIp(req));
  res.json({ message: `Student account ${u.is_active ? 'activated' : 'deactivated'}`, is_active: u.is_active });
});

apiRouter.post('/admin/students', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const {
    register_number,
    full_name,
    email,
    password,
    phone,
    department_id,
    course_id,
    custom_course_name,
    custom_course_code,
    custom_course_duration,
    year,
    semester,
    section,
    admission_year
  } = req.body;

  const upperReg = (register_number || '').toUpperCase().trim();
  if (!upperReg) return res.status(400).json({ detail: 'Register number is required' });
  if (db.students.some(s => s.register_number.toUpperCase() === upperReg)) {
    return res.status(400).json({ detail: 'Student with this register number already exists' });
  }

  const lowerEmail = (email || '').toLowerCase().trim();
  if (!lowerEmail) return res.status(400).json({ detail: 'Email address is required' });
  if (db.users.some(u => u.email === lowerEmail)) {
    return res.status(400).json({ detail: 'An account with this email already exists' });
  }

  let dept = db.departments.find(d => d.id === Number(department_id));
  if (!dept) {
    dept = db.departments.find(d => d.code === 'CSE') || db.departments[0];
  }

  const now = new Date().toISOString();
  let course = db.courses.find(c => c.id === Number(course_id));

  // If custom course is supplied by the admin, resolve or create it
  if (custom_course_name && custom_course_name.trim()) {
    const trimmed = custom_course_name.trim();
    const existing = db.courses.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      course = existing;
    } else {
      let code = (custom_course_code || trimmed.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)).toUpperCase();
      if (db.courses.some(c => c.code === code)) {
        code = `${code}_${Date.now().toString().slice(-4)}`;
      }
      const newCourseId = Math.max(...db.courses.map(c => c.id), 0) + 1;
      const newCourse: CourseRecord = {
        id: newCourseId,
        name: trimmed,
        code,
        department_id: dept ? dept.id : 1,
        duration: Number(custom_course_duration) || 4,
        is_active: true,
        created_at: now
      };
      db.courses.push(newCourse);
      course = newCourse;
    }
  }

  if (!course) {
    course = db.courses[0];
  }

  const nextUserId = Math.max(...db.users.map(u => u.id), 0) + 1;
  const newUser: UserRecord = {
    id: nextUserId,
    email: lowerEmail,
    password_hash: hashPassword(password || 'StudentPassword@123'),
    role: 'STUDENT',
    is_active: true,
    is_registered: true,
    created_at: now
  };
  db.users.push(newUser);

    const targetYr = Number(year) || 1;
    const targetSem = semester !== undefined && semester !== null && Number(semester) > 0
      ? Number(semester)
      : (targetYr * 2 - 1);

    const nextStudentId = Math.max(...db.students.map(s => s.id), 0) + 1;
    const newStudent: StudentRecord = {
      id: nextStudentId,
      user_id: newUser.id,
      register_number: upperReg,
      full_name: (full_name || '').trim(),
      email: lowerEmail,
      phone: phone || '',
      department_id: dept ? dept.id : 1,
      course_id: course.id,
      year: targetYr,
      semester: targetSem,
      section: (section || 'A').toUpperCase().trim(),
      admission_year: Number(admission_year) || new Date().getFullYear(),
      created_at: now
    };
    db.students.push(newStudent);
    db.saveToFile();

    db.logAudit(req.user!.id, req.user!.email, 'STUDENT_CREATED', 'STUDENT', newStudent.id, null, req.body, getClientIp(req));

    res.json({
      id: newStudent.id,
      user_id: newStudent.user_id,
      register_number: newStudent.register_number,
      full_name: newStudent.full_name,
      email: newStudent.email,
      phone: newStudent.phone,
      department_id: newStudent.department_id,
      department_name: dept ? dept.name : '',
      course_id: newStudent.course_id,
      course_name: course.name,
      year: newStudent.year,
      semester: newStudent.semester,
      section: newStudent.section,
      admission_year: newStudent.admission_year,
      is_active: true,
      created_at: newStudent.created_at
    });
});

apiRouter.patch('/admin/students/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const st = db.students.find(s => s.id === id);
  if (!st) return res.status(404).json({ detail: 'Student not found' });

  const u = db.users.find(user => user.id === st.user_id);

  const {
    register_number,
    full_name,
    email,
    password,
    phone,
    department_id,
    course_id,
    custom_course_name,
    custom_course_code,
    custom_course_duration,
    year,
    semester,
    section,
    admission_year,
    is_active
  } = req.body;

  if (register_number) {
    const upperReg = register_number.toUpperCase().trim();
    if (db.students.some(s => s.id !== id && s.register_number.toUpperCase() === upperReg)) {
      return res.status(400).json({ detail: 'Register number already used by another student' });
    }
    st.register_number = upperReg;
  }

  if (email) {
    const lowerEmail = email.toLowerCase().trim();
    if (db.users.some(user => user.id !== st.user_id && user.email === lowerEmail)) {
      return res.status(400).json({ detail: 'Email already in use by another user' });
    }
    st.email = lowerEmail;
    if (u) u.email = lowerEmail;
  }

  if (password) {
    if (u) {
      u.password_hash = hashPassword(password);
    } else {
      const nextUserId = Math.max(...db.users.map(user => user.id), 0) + 1;
      const newUser: UserRecord = {
        id: nextUserId,
        email: st.email,
        password_hash: hashPassword(password),
        role: 'STUDENT',
        is_active: true,
        is_registered: true,
        created_at: new Date().toISOString()
      };
      db.users.push(newUser);
      st.user_id = newUser.id;
    }
  }

  if (full_name !== undefined) st.full_name = full_name.trim();
  if (phone !== undefined) st.phone = phone.trim();
  if (department_id !== undefined) st.department_id = Number(department_id);

  // If custom course name is provided during edit
  if (custom_course_name && custom_course_name.trim()) {
    const trimmed = custom_course_name.trim();
    const existing = db.courses.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      st.course_id = existing.id;
    } else {
      let code = (custom_course_code || trimmed.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15)).toUpperCase();
      if (db.courses.some(c => c.code === code)) {
        code = `${code}_${Date.now().toString().slice(-4)}`;
      }
      const newCourseId = Math.max(...db.courses.map(c => c.id), 0) + 1;
      const newCourse: CourseRecord = {
        id: newCourseId,
        name: trimmed,
        code,
        department_id: st.department_id || 1,
        duration: Number(custom_course_duration) || 4,
        is_active: true,
        created_at: new Date().toISOString()
      };
      db.courses.push(newCourse);
      st.course_id = newCourse.id;
    }
  } else if (course_id !== undefined) {
    st.course_id = Number(course_id);
  }

  if (year !== undefined) st.year = Number(year);
  if (semester !== undefined) {
    st.semester = Number(semester);
    if (year === undefined && st.semester > 0) {
      st.year = Math.ceil(st.semester / 2);
    }
  }
  if (section !== undefined) st.section = section.toUpperCase().trim();
  if (admission_year !== undefined) st.admission_year = Number(admission_year);
  if (is_active !== undefined && u) u.is_active = is_active;

  const dept = db.departments.find(d => d.id === st.department_id);
  const course = db.courses.find(c => c.id === st.course_id);

  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'STUDENT_UPDATED', 'STUDENT', st.id, null, req.body, getClientIp(req));

  res.json({
    id: st.id,
    user_id: st.user_id,
    register_number: st.register_number,
    full_name: st.full_name,
    email: st.email,
    phone: st.phone,
    department_id: st.department_id,
    department_name: dept ? dept.name : '',
    course_id: st.course_id,
    course_name: course ? course.name : '',
    year: st.year,
    semester: st.semester || (st.year ? st.year * 2 - 1 : 1),
    section: st.section,
    admission_year: st.admission_year,
    is_active: u ? u.is_active : true,
    created_at: st.created_at
  });
});

apiRouter.delete('/admin/students/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const stIndex = db.students.findIndex(s => s.id === id);
  if (stIndex === -1) return res.status(404).json({ detail: 'Student not found' });

  const st = db.students[stIndex];
  const userId = st.user_id;

  // Cascade cleanup
  const studentReqIds = db.noDueRequests.filter(r => r.student_id === id).map(r => r.id);
  db.noDueApprovals = db.noDueApprovals.filter(a => !studentReqIds.includes(a.request_id));
  db.dueRecords = db.dueRecords.filter(d => d.student_id !== id);
  db.noDueRequests = db.noDueRequests.filter(r => r.student_id !== id);
  db.certificates = db.certificates.filter(c => c.student_id !== id);
  db.notifications = db.notifications.filter(n => n.user_id !== userId);
  db.users = db.users.filter(u => u.id !== userId);
  db.students.splice(stIndex, 1);
  deleteRecordFromPostgres('students', id).catch(() => {});
  if (userId) deleteRecordFromPostgres('users', userId).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'STUDENT_DELETED', 'STUDENT', id, null, { student: st.full_name, reg_no: st.register_number }, getClientIp(req));

  res.json({ message: 'Student and all related records deleted successfully', id });
});

apiRouter.get('/admin/staff', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  let staffList = db.staff;
  if (req.query.department_id) {
    staffList = staffList.filter(s => s.department_id === Number(req.query.department_id));
  }
  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    staffList = staffList.filter(s =>
      s.full_name.toLowerCase().includes(search) ||
      s.employee_id.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search)
    );
  }

  const total = staffList.length;
  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = staffList.slice(skip, skip + limit);

  const result = paginated.map(st => {
    const user = db.users.find(u => u.id === st.user_id);
    const dept = db.departments.find(d => d.id === st.department_id);
    return {
      id: st.id,
      user_id: st.user_id,
      employee_id: st.employee_id,
      full_name: st.full_name,
      email: st.email,
      phone: st.phone,
      department_id: st.department_id,
      department_name: dept ? dept.name : '',
      designation: st.designation,
      is_active: user ? user.is_active : true,
      created_at: st.created_at
    };
  });

  res.json(result);
});

apiRouter.post('/admin/staff', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const {
    employee_id,
    email,
    password,
    full_name,
    phone,
    department_id,
    custom_department_name,
    custom_department_code,
    designation
  } = req.body;
  const upperEmp = (employee_id || '').toUpperCase().trim();
  if (!upperEmp) {
    return res.status(400).json({ detail: 'Employee ID is required' });
  }
  if (db.staff.some(s => s.employee_id.toUpperCase() === upperEmp)) {
    return res.status(400).json({ detail: 'Employee ID already exists' });
  }

  const lowerEmail = (email || '').toLowerCase().trim();
  if (!lowerEmail) {
    return res.status(400).json({ detail: 'Officer email is required' });
  }
  if (db.users.some(u => u.email.toLowerCase() === lowerEmail)) {
    return res.status(400).json({ detail: 'An account with this email already exists' });
  }

  let finalDeptId = Number(department_id);

  // If custom department name is provided
  if (custom_department_name && custom_department_name.trim()) {
    const trimmedDeptName = custom_department_name.trim();
    const existingDept = db.departments.find(d => d.name.toLowerCase() === trimmedDeptName.toLowerCase());
    if (existingDept) {
      finalDeptId = existingDept.id;
    } else {
      let deptCode = (custom_department_code || trimmedDeptName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10)).toUpperCase();
      if (db.departments.some(d => d.code === deptCode)) {
        deptCode = `${deptCode}_${Date.now().toString().slice(-4)}`;
      }
      const newDept: DepartmentRecord = {
        id: Math.max(...db.departments.map(d => d.id), 0) + 1,
        name: trimmedDeptName,
        code: deptCode,
        description: `Clearance department for ${trimmedDeptName}`,
        is_active: true,
        created_at: new Date().toISOString()
      };
      db.departments.push(newDept);
      finalDeptId = newDept.id;
    }
  }

  let dept = db.departments.find(d => d.id === finalDeptId);
  if (!dept) {
    dept = db.departments[0];
    finalDeptId = dept.id;
  }

  const isHodDesignation = (designation || '').toLowerCase().includes('hod') || (designation || '').toLowerCase().includes('head of department');
  const userRole: 'HOD' | 'STAFF' = isHodDesignation ? 'HOD' : 'STAFF';

  const now = new Date().toISOString();
  const nextUserId = Math.max(...db.users.map(u => u.id), 0) + 1;
  const newUser: UserRecord = {
    id: nextUserId,
    email: lowerEmail,
    password_hash: hashPassword(password || 'StaffPassword@123'),
    role: userRole,
    is_active: true,
    created_at: now
  };
  db.users.push(newUser);

  const nextStaffId = Math.max(...db.staff.map(s => s.id), 0) + 1;
  const newStaff: StaffRecord = {
    id: nextStaffId,
    user_id: newUser.id,
    employee_id: upperEmp,
    full_name: (full_name || '').trim(),
    email: lowerEmail,
    phone: phone || '',
    department_id: dept.id,
    designation: designation || 'Clearance Officer',
    created_at: now
  };
  db.staff.push(newStaff);

  db.logAudit(req.user!.id, req.user!.email, 'STAFF_CREATED', 'STAFF', newStaff.id, null, req.body, getClientIp(req));

  res.json({
    id: newStaff.id,
    user_id: newStaff.user_id,
    employee_id: newStaff.employee_id,
    full_name: newStaff.full_name,
    email: newStaff.email,
    phone: newStaff.phone,
    department_id: newStaff.department_id,
    department_name: dept.name,
    designation: newStaff.designation,
    is_active: true,
    created_at: newStaff.created_at
  });
});

apiRouter.patch('/admin/staff/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const st = db.staff.find(s => s.id === id);
  if (!st) return res.status(404).json({ detail: 'Clearance officer not found' });

  const u = db.users.find(user => user.id === st.user_id);
  const {
    employee_id,
    full_name,
    email,
    password,
    phone,
    department_id,
    custom_department_name,
    custom_department_code,
    designation,
    is_active
  } = req.body;

  if (employee_id) {
    const upperEmp = employee_id.toUpperCase().trim();
    if (db.staff.some(s => s.id !== id && s.employee_id.toUpperCase() === upperEmp)) {
      return res.status(400).json({ detail: 'Employee ID already in use by another officer' });
    }
    st.employee_id = upperEmp;
  }

  if (email) {
    const lowerEmail = email.toLowerCase().trim();
    if (db.users.some(user => user.id !== st.user_id && user.email.toLowerCase() === lowerEmail)) {
      return res.status(400).json({ detail: 'Email already in use by another user' });
    }
    st.email = lowerEmail;
    if (u) u.email = lowerEmail;
  }

  if (password && u) {
    u.password_hash = hashPassword(password);
  }

  if (full_name !== undefined) st.full_name = full_name.trim();
  if (phone !== undefined) st.phone = phone.trim();

  if (custom_department_name && custom_department_name.trim()) {
    const trimmedDeptName = custom_department_name.trim();
    const existingDept = db.departments.find(d => d.name.toLowerCase() === trimmedDeptName.toLowerCase());
    if (existingDept) {
      st.department_id = existingDept.id;
    } else {
      let deptCode = (custom_department_code || trimmedDeptName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10)).toUpperCase();
      if (db.departments.some(d => d.code === deptCode)) {
        deptCode = `${deptCode}_${Date.now().toString().slice(-4)}`;
      }
      const newDept: DepartmentRecord = {
        id: Math.max(...db.departments.map(d => d.id), 0) + 1,
        name: trimmedDeptName,
        code: deptCode,
        description: `Clearance department for ${trimmedDeptName}`,
        is_active: true,
        created_at: new Date().toISOString()
      };
      db.departments.push(newDept);
      st.department_id = newDept.id;
    }
  } else if (department_id !== undefined) {
    st.department_id = Number(department_id);
  }

  if (designation !== undefined) {
    st.designation = designation.trim();
    if (u) {
      const isHod = st.designation.toLowerCase().includes('hod') || st.designation.toLowerCase().includes('head of department');
      u.role = isHod ? 'HOD' : 'STAFF';
    }
  }
  if (is_active !== undefined && u) u.is_active = is_active;

  const dept = db.departments.find(d => d.id === st.department_id);

  db.saveToFile();
  db.queueSyncToPostgres();

  db.logAudit(req.user!.id, req.user!.email, 'STAFF_UPDATED', 'STAFF', st.id, null, req.body, getClientIp(req));

  res.json({
    id: st.id,
    user_id: st.user_id,
    employee_id: st.employee_id,
    full_name: st.full_name,
    email: st.email,
    phone: st.phone,
    department_id: st.department_id,
    department_name: dept ? dept.name : '',
    designation: st.designation,
    is_active: u ? u.is_active : true,
    created_at: st.created_at
  });
});

apiRouter.patch('/admin/staff/:id/status', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const st = db.staff.find(s => s.id === id);
  if (!st) return res.status(404).json({ detail: 'Clearance officer not found' });

  const u = db.users.find(user => user.id === st.user_id);
  if (!u) return res.status(404).json({ detail: 'User account not found' });

  u.is_active = req.body.is_active !== undefined ? req.body.is_active : !u.is_active;

  db.logAudit(req.user!.id, req.user!.email, 'STAFF_STATUS_TOGGLED', 'STAFF', st.id, null, { is_active: u.is_active }, getClientIp(req));
  res.json({
    id: st.id,
    is_active: u.is_active,
    message: `Clearance officer account ${u.is_active ? 'activated' : 'deactivated'} successfully`
  });
});

apiRouter.delete('/admin/staff/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const stIndex = db.staff.findIndex(s => s.id === id);
  if (stIndex === -1) return res.status(404).json({ detail: 'Clearance officer not found' });

  const st = db.staff[stIndex];
  const userId = st.user_id;

  db.users = db.users.filter(u => u.id !== userId);
  db.staff.splice(stIndex, 1);
  deleteRecordFromPostgres('staff', id).catch(() => {});
  if (userId) deleteRecordFromPostgres('users', userId).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'STAFF_DELETED', 'STAFF', id, null, { staff: st.full_name, emp_id: st.employee_id }, getClientIp(req));

  res.json({ message: 'Clearance officer deleted successfully', id });
});

apiRouter.get('/admin/departments', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const deptsWithHod = db.departments.map(dept => {
    const hodStaff = db.staff.find(s => s.department_id === dept.id && (
      s.designation?.toLowerCase().includes('hod') || 
      s.designation?.toLowerCase().includes('head of department')
    ));
    let hodInfo = null;
    if (hodStaff) {
      const hodUser = db.users.find(u => u.id === hodStaff.user_id || u.email.toLowerCase() === hodStaff.email.toLowerCase());
      hodInfo = {
        id: hodStaff.id,
        user_id: hodUser?.id || hodStaff.user_id,
        full_name: hodStaff.full_name,
        employee_id: hodStaff.employee_id,
        email: hodStaff.email,
        phone: hodStaff.phone,
        is_active: hodUser ? hodUser.is_active : (hodStaff.is_active !== false)
      };
    }
    return {
      ...dept,
      hod_info: hodInfo
    };
  });
  res.json(deptsWithHod);
});

apiRouter.post('/admin/departments/:id/allocate-hod', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const deptId = Number(req.params.id);
  const dept = db.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const { full_name, employee_id, email, password, phone, is_active } = req.body;
  if (!full_name || !employee_id || !email) {
    return res.status(400).json({ detail: 'HOD Full Name, Employee ID, and Login Email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanEmpId = employee_id.trim().toUpperCase();
  const cleanName = full_name.trim();

  let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    if (!password || !password.trim()) {
      return res.status(400).json({ detail: 'Password is required to allocate new HOD login credentials.' });
    }
    const nextUserId = Math.max(0, ...db.users.map(u => u.id)) + 1;
    user = {
      id: nextUserId,
      email: cleanEmail,
      password_hash: hashPassword(password.trim()),
      role: 'HOD',
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      is_registered: true,
      created_at: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.role = 'HOD';
    if (is_active !== undefined) {
      user.is_active = Boolean(is_active);
    }
    if (password && password.trim()) {
      user.password_hash = hashPassword(password.trim());
    }
  }

  let hodStaff = db.staff.find(s => s.department_id === deptId && (
    s.designation?.toLowerCase().includes('hod') || 
    s.designation?.toLowerCase().includes('head of department')
  ));

  if (!hodStaff) {
    hodStaff = db.staff.find(s => s.email.toLowerCase() === cleanEmail || s.employee_id.toUpperCase() === cleanEmpId);
  }

  if (!hodStaff) {
    const nextStaffId = Math.max(0, ...db.staff.map(s => s.id)) + 1;
    hodStaff = {
      id: nextStaffId,
      user_id: user.id,
      employee_id: cleanEmpId,
      full_name: cleanName,
      email: cleanEmail,
      phone: phone || '9842100000',
      department_id: deptId,
      designation: `Head of Department (${dept.code})`,
      is_active: user.is_active,
      created_at: new Date().toISOString()
    };
    db.staff.push(hodStaff);
  } else {
    hodStaff.user_id = user.id;
    hodStaff.employee_id = cleanEmpId;
    hodStaff.full_name = cleanName;
    hodStaff.email = cleanEmail;
    if (phone) hodStaff.phone = phone;
    hodStaff.department_id = deptId;
    hodStaff.designation = `Head of Department (${dept.code})`;
    hodStaff.is_active = user.is_active;
  }

  db.saveToFile();
  db.queueSyncToPostgres();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_ALLOCATED', 'DEPARTMENT', deptId, null, {
    department: dept.name,
    hod_name: cleanName,
    hod_email: cleanEmail,
    employee_id: cleanEmpId,
    is_active: user.is_active
  }, getClientIp(req));

  res.json({
    message: `Head of Department successfully allocated for ${dept.name}!`,
    hod_info: {
      id: hodStaff.id,
      user_id: user.id,
      full_name: hodStaff.full_name,
      employee_id: hodStaff.employee_id,
      email: hodStaff.email,
      phone: hodStaff.phone,
      is_active: user.is_active
    }
  });
});

apiRouter.patch('/admin/departments/:id/hod-status', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const deptId = Number(req.params.id);
  const dept = db.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const hodStaff = db.staff.find(s => s.department_id === deptId && (
    s.designation?.toLowerCase().includes('hod') || 
    s.designation?.toLowerCase().includes('head of department')
  ));
  if (!hodStaff) return res.status(404).json({ detail: 'No HOD currently allocated to this department' });

  const user = db.users.find(u => u.id === hodStaff.user_id || u.email.toLowerCase() === hodStaff.email.toLowerCase());
  const newStatus = req.body.is_active !== undefined ? Boolean(req.body.is_active) : (user ? !user.is_active : false);
  if (user) user.is_active = newStatus;
  hodStaff.is_active = newStatus;

  db.saveToFile();
  db.queueSyncToPostgres();
  res.json({
    message: `HOD account ${newStatus ? 'activated' : 'deactivated'} successfully`,
    is_active: newStatus
  });
});

apiRouter.delete('/admin/departments/:id/hod', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const deptId = Number(req.params.id);
  const dept = db.departments.find(d => d.id === deptId);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const hodStaffIdx = db.staff.findIndex(s => s.department_id === deptId && (
    s.designation?.toLowerCase().includes('hod') || 
    s.designation?.toLowerCase().includes('head of department')
  ));
  if (hodStaffIdx === -1) return res.status(404).json({ detail: 'No HOD allocated to this department' });

  const hodStaff = db.staff[hodStaffIdx];
  const user = db.users.find(u => u.id === hodStaff.user_id || u.email.toLowerCase() === hodStaff.email.toLowerCase());
  if (user && user.role === 'HOD') {
    user.is_active = false;
  }
  db.staff.splice(hodStaffIdx, 1);
  db.saveToFile();

  res.json({ message: `HOD unallocated from ${dept.name}` });
});

apiRouter.post('/admin/departments', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { name, code, description, is_active, type, category } = req.body;
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    return res.status(400).json({ detail: 'Department name is required' });
  }

  let upperCode = (code || '').toUpperCase().trim();
  if (!upperCode) {
    upperCode = trimmedName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 8).toUpperCase();
  }

  if (db.departments.some(d => d.code === upperCode)) {
    return res.status(400).json({ detail: `Department code "${upperCode}" already exists` });
  }

  const deptType = type || (category === 'institutional' ? 'INSTITUTIONAL' : 'ACADEMIC');
  const deptCategory = category || (deptType === 'INSTITUTIONAL' ? 'institutional' : 'academic');

  const newDept: DepartmentRecord = {
    id: Math.max(...db.departments.map(d => d.id), 0) + 1,
    name: trimmedName,
    code: upperCode,
    description: description || '',
    type: deptType,
    category: deptCategory,
    is_active: is_active !== undefined ? is_active : true,
    created_at: new Date().toISOString()
  };
  db.departments.push(newDept);
  db.logAudit(req.user!.id, req.user!.email, 'DEPARTMENT_CREATED', 'DEPARTMENT', newDept.id, null, req.body, getClientIp(req));
  res.json(newDept);
});

apiRouter.patch('/admin/departments/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const dept = db.departments.find(d => d.id === id);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const { name, code, description, is_active, type, category } = req.body;
  if (name !== undefined) dept.name = name.trim();
  if (type !== undefined) dept.type = type;
  if (category !== undefined) dept.category = category;
  if (code !== undefined) {
    const upperCode = code.toUpperCase().trim();
    if (db.departments.some(d => d.id !== id && d.code === upperCode)) {
      return res.status(400).json({ detail: `Department code "${upperCode}" is already in use` });
    }
    dept.code = upperCode;
  }
  if (description !== undefined) dept.description = description;
  if (is_active !== undefined) dept.is_active = is_active;

  db.logAudit(req.user!.id, req.user!.email, 'DEPARTMENT_UPDATED', 'DEPARTMENT', dept.id, null, req.body, getClientIp(req));
  res.json(dept);
});

apiRouter.patch('/admin/departments/:id/status', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const dept = db.departments.find(d => d.id === id);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  dept.is_active = req.body.is_active !== undefined ? req.body.is_active : !dept.is_active;
  db.logAudit(req.user!.id, req.user!.email, 'DEPARTMENT_STATUS_TOGGLED', 'DEPARTMENT', dept.id, null, { is_active: dept.is_active }, getClientIp(req));
  res.json({
    id: dept.id,
    is_active: dept.is_active,
    message: `Department ${dept.is_active ? 'activated' : 'deactivated'} successfully`
  });
});

apiRouter.delete('/admin/departments/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const deptIdx = db.departments.findIndex(d => d.id === id);
  if (deptIdx === -1) return res.status(404).json({ detail: 'Department not found' });

  const dept = db.departments[deptIdx];
  db.departments.splice(deptIdx, 1);
  deleteRecordFromPostgres('departments', id).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'DEPARTMENT_DELETED', 'DEPARTMENT', id, null, { department: dept.name, code: dept.code }, getClientIp(req));
  res.json({ message: 'Department deleted successfully', id });
});

apiRouter.get('/admin/courses', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const list = db.courses.map(c => {
    const dept = db.departments.find(d => d.id === c.department_id);
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      department_id: c.department_id,
      department_name: dept ? dept.name : '',
      duration: c.duration,
      is_active: c.is_active,
      created_at: c.created_at
    };
  });
  res.json(list);
});

apiRouter.post('/admin/courses', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { name, code, department_id, duration, is_active } = req.body;
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    return res.status(400).json({ detail: 'Course title is required' });
  }

  let upperCode = (code || '').toUpperCase().trim();
  if (!upperCode) {
    upperCode = trimmedName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15).toUpperCase();
  }
  if (db.courses.some(c => c.code === upperCode)) {
    upperCode = `${upperCode}_${Date.now().toString().slice(-4)}`;
  }

  let dept = db.departments.find(d => d.id === Number(department_id));
  if (!dept) {
    dept = db.departments.find(d => d.code === 'CSE') || db.departments[0];
  }

  const nextCourseId = Math.max(...db.courses.map(c => c.id), 0) + 1;
  const newCourse: CourseRecord = {
    id: nextCourseId,
    name: trimmedName,
    code: upperCode,
    department_id: dept ? dept.id : 1,
    duration: Number(duration) || 4,
    is_active: is_active !== undefined ? is_active : true,
    created_at: new Date().toISOString()
  };
  db.courses.push(newCourse);
  db.logAudit(req.user!.id, req.user!.email, 'COURSE_CREATED', 'COURSE', newCourse.id, null, req.body, getClientIp(req));

  res.json({
    ...newCourse,
    department_name: dept ? dept.name : ''
  });
});

apiRouter.patch('/admin/courses/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const course = db.courses.find(c => c.id === id);
  if (!course) return res.status(404).json({ detail: 'Course not found' });

  const { name, code, department_id, duration, is_active } = req.body;
  if (code) {
    const upperCode = code.toUpperCase().trim();
    if (db.courses.some(c => c.id !== id && c.code === upperCode)) {
      return res.status(400).json({ detail: 'Course with this code already exists' });
    }
    course.code = upperCode;
  }
  if (name !== undefined) course.name = name.trim();
  if (department_id !== undefined) course.department_id = Number(department_id);
  if (duration !== undefined) course.duration = Number(duration);
  if (is_active !== undefined) course.is_active = is_active;

  const dept = db.departments.find(d => d.id === course.department_id);

  db.logAudit(req.user!.id, req.user!.email, 'COURSE_UPDATED', 'COURSE', course.id, null, req.body, getClientIp(req));

  res.json({
    ...course,
    department_name: dept ? dept.name : ''
  });
});

apiRouter.delete('/admin/courses/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.courses.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Course not found' });

  const c = db.courses[idx];
  db.courses.splice(idx, 1);
  deleteRecordFromPostgres('courses', id).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'COURSE_DELETED', 'COURSE', id, null, { course: c.name, code: c.code }, getClientIp(req));
  res.json({ message: 'Course deleted successfully', id });
});

// Degrees & Branches alias routes
apiRouter.get('/admin/degrees', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const list = db.courses.map(c => {
    const dept = db.departments.find(d => d.id === c.department_id);
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      department_id: c.department_id,
      department_name: dept ? dept.name : '',
      duration: c.duration,
      is_active: c.is_active,
      created_at: c.created_at
    };
  });
  res.json(list);
});

apiRouter.post('/admin/degrees', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { name, code, department_id, duration, is_active } = req.body;
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    return res.status(400).json({ detail: 'Branch name is required' });
  }

  let upperCode = (code || '').toUpperCase().trim();
  if (!upperCode) {
    upperCode = trimmedName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15).toUpperCase();
  }
  if (db.courses.some(c => c.code === upperCode)) {
    upperCode = `${upperCode}_${Date.now().toString().slice(-4)}`;
  }

  let dept = db.departments.find(d => d.id === Number(department_id));
  if (!dept) {
    dept = db.departments.find(d => d.code === 'CSE') || db.departments[0];
  }

  const nextCourseId = Math.max(...db.courses.map(c => c.id), 0) + 1;
  const newCourse: CourseRecord = {
    id: nextCourseId,
    name: trimmedName,
    code: upperCode,
    department_id: dept ? dept.id : 1,
    duration: Number(duration) || 4,
    is_active: is_active !== undefined ? is_active : true,
    created_at: new Date().toISOString()
  };
  db.courses.push(newCourse);
  db.logAudit(req.user!.id, req.user!.email, 'DEGREE_BRANCH_CREATED', 'DEGREE', newCourse.id, null, req.body, getClientIp(req));

  res.json({
    ...newCourse,
    department_name: dept ? dept.name : ''
  });
});

apiRouter.patch('/admin/degrees/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const course = db.courses.find(c => c.id === id);
  if (!course) return res.status(404).json({ detail: 'Degree/Branch not found' });

  const { name, code, department_id, duration, is_active } = req.body;
  if (code) {
    const upperCode = code.toUpperCase().trim();
    if (db.courses.some(c => c.id !== id && c.code === upperCode)) {
      return res.status(400).json({ detail: 'Branch code already exists' });
    }
    course.code = upperCode;
  }
  if (name !== undefined) course.name = name.trim();
  if (department_id !== undefined) course.department_id = Number(department_id);
  if (duration !== undefined) course.duration = Number(duration);
  if (is_active !== undefined) course.is_active = is_active;

  const dept = db.departments.find(d => d.id === course.department_id);
  db.logAudit(req.user!.id, req.user!.email, 'DEGREE_BRANCH_UPDATED', 'DEGREE', course.id, null, req.body, getClientIp(req));

  res.json({
    ...course,
    department_name: dept ? dept.name : ''
  });
});

apiRouter.delete('/admin/degrees/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.courses.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Degree/Branch not found' });

  const c = db.courses[idx];
  db.courses.splice(idx, 1);
  deleteRecordFromPostgres('courses', id).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'DEGREE_BRANCH_DELETED', 'DEGREE', id, null, { degree: c.name, code: c.code }, getClientIp(req));
  res.json({ message: 'Degree/Branch deleted successfully', id });
});

// ==========================================
// Academic Subject Courses (Curriculum) Endpoints
// Supports Department, Year, Semester, Course Type, Slot, Faculty In-Charge
// ==========================================

// Public curriculum lookup for authenticated Students, Staff, and Admins
apiRouter.get('/curriculum/subjects', authMiddleware, (req: AuthRequest, res: Response) => {
  const deptId = Number(req.query.department_id) || req.studentProfile?.department_id || 1;
  const year = Number(req.query.year) || req.studentProfile?.year || 1;
  const semester = Number(req.query.semester) || req.studentProfile?.semester || (year === 4 ? 7 : year * 2 - 1);
  const courseType = req.query.course_type ? String(req.query.course_type).toLowerCase() : undefined;

  let list = db.subjectCourses.filter(c => c.department_id === deptId && c.semester === semester && c.is_active !== false);

  if (courseType) {
    if (courseType === 'lab') {
      list = list.filter(c => c.course_type === 'lab' || c.slot?.toLowerCase().includes('lab') || c.title.toLowerCase().includes('lab'));
    } else if (courseType === 'theory') {
      list = list.filter(c => (!c.course_type || c.course_type === 'theory') && !c.slot?.toLowerCase().includes('lab') && !c.title.toLowerCase().includes('lab'));
    }
  }

  // If no courses found in db for this department and semester, fallback to standard catalog
  if (list.length === 0) {
    const dept = db.departments.find(d => d.id === deptId);
    const catalog = DEPARTMENT_CURRICULUM_CATALOG[dept?.code?.toUpperCase() || 'CSE'] || [];
    let semCatalog = catalog.filter(c => c.semester === semester);
    if (courseType) {
      semCatalog = semCatalog.filter(c => c.course_type === courseType);
    }
    if (semCatalog.length > 0) {
      return res.json(semCatalog.map((c, idx) => ({
        id: -(idx + 1),
        title: c.title,
        code: c.code,
        department_id: deptId,
        year: c.year,
        semester: c.semester,
        course_type: c.course_type,
        slot: c.slot,
        faculty_name: c.faculty_name,
        is_elective: c.is_elective || false,
        is_active: true
      })));
    }

    // Generic fallback
    const generic = generateGenericSemesterSubjects(dept?.code || 'ENGG', year, semester);
    const filteredGeneric = courseType ? generic.filter(c => c.course_type === courseType) : generic;
    return res.json(filteredGeneric.map((c, idx) => ({
      id: -(idx + 100),
      title: c.title,
      code: c.code,
      department_id: deptId,
      year: c.year,
      semester: c.semester,
      course_type: c.course_type,
      slot: c.slot,
      faculty_name: c.faculty_name,
      is_elective: c.is_elective || false,
      is_active: true
    })));
  }

  const dept = db.departments.find(d => d.id === deptId);
  res.json(list.map(c => ({
    id: c.id,
    title: c.title,
    code: c.code,
    department_id: c.department_id,
    department_name: dept?.name || 'General Engineering',
    department_code: dept?.code || 'GEN',
    year: c.year,
    semester: c.semester,
    course_type: c.course_type || (c.title.toLowerCase().includes('lab') ? 'lab' : 'theory'),
    slot: c.slot || (c.course_type === 'lab' ? 'Lab' : 'Sub'),
    faculty_name: c.faculty_name || 'Faculty In-Charge',
    is_elective: c.is_elective || false,
    is_active: c.is_active
  })));
});

apiRouter.get(['/admin/subject-courses', '/admin/curriculum-courses'], authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  let list = db.subjectCourses;

  if (req.query.department_id) {
    list = list.filter(c => c.department_id === Number(req.query.department_id));
  }
  if (req.query.year) {
    list = list.filter(c => c.year === Number(req.query.year));
  }
  if (req.query.semester) {
    list = list.filter(c => c.semester === Number(req.query.semester));
  }
  if (req.query.course_type) {
    const ct = String(req.query.course_type).toLowerCase();
    if (ct === 'lab') {
      list = list.filter(c => c.course_type === 'lab' || c.slot?.toLowerCase().includes('lab') || c.title.toLowerCase().includes('lab'));
    } else if (ct === 'theory') {
      list = list.filter(c => (!c.course_type || c.course_type === 'theory') && !c.slot?.toLowerCase().includes('lab') && !c.title.toLowerCase().includes('lab'));
    }
  }
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase().trim();
    list = list.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.faculty_name && c.faculty_name.toLowerCase().includes(q)) ||
      (c.slot && c.slot.toLowerCase().includes(q))
    );
  }

  const enriched = list.map(c => {
    const dept = db.departments.find(d => d.id === c.department_id);
    return {
      id: c.id,
      title: c.title,
      code: c.code,
      department_id: c.department_id,
      department_name: dept ? dept.name : 'General Engineering',
      department_code: dept ? dept.code : 'GEN',
      year: c.year,
      semester: c.semester,
      course_type: c.course_type || (c.title.toLowerCase().includes('lab') ? 'lab' : 'theory'),
      slot: c.slot || (c.course_type === 'lab' ? 'Lab 1' : 'Sub 1'),
      faculty_name: c.faculty_name || 'Faculty In-Charge',
      is_elective: Boolean(c.is_elective),
      is_active: c.is_active,
      created_at: c.created_at
    };
  });

  res.json(enriched);
});

apiRouter.post(['/admin/subject-courses', '/admin/curriculum-courses'], authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { department, department_id, course_title, title, course_code, code, year, semester, course_type, slot, faculty_name, is_elective } = req.body;

  const finalTitle = (course_title || title || '').trim();
  if (!finalTitle) {
    return res.status(400).json({ detail: 'Course title is required' });
  }

  let finalCode = (course_code || code || '').toUpperCase().trim();
  if (!finalCode) {
    finalCode = finalTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10).toUpperCase();
  }

  // Find or create department from ID or typed department name/code
  let deptId = Number(department_id || department);
  let dept = db.departments.find(d => d.id === deptId);
  const rawDeptName = (typeof department === 'string' ? department : (req.body.department_name || '')).trim();
  if (!dept && rawDeptName) {
    dept = db.departments.find(d =>
      d.name.toLowerCase() === rawDeptName.toLowerCase() ||
      d.code.toLowerCase() === rawDeptName.toLowerCase() ||
      rawDeptName.toLowerCase().includes(d.name.toLowerCase()) ||
      rawDeptName.toLowerCase().includes(d.code.toLowerCase())
    );
    if (!dept) {
      const newDeptId = Math.max(0, ...db.departments.map(d => d.id)) + 1;
      const codeSuggestion = rawDeptName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 6) || `DEPT${newDeptId}`;

      dept = {
        id: newDeptId,
        name: rawDeptName,
        code: codeSuggestion,
        description: `${rawDeptName} Department`,
        is_active: true,
        created_at: new Date().toISOString()
      };
      db.departments.push(dept);
      db.saveToFile();
    }
  }

  if (!dept) {
    dept = db.departments[0];
    deptId = dept ? dept.id : 1;
  } else {
    deptId = dept.id;
  }

  const finalSemester = Math.max(1, Math.min(8, Number(semester) || 1));
  const finalYear = Number(year) ? Math.max(1, Math.min(4, Number(year))) : Math.ceil(finalSemester / 2);
  const finalType: 'theory' | 'lab' = course_type === 'lab' || finalTitle.toLowerCase().includes('lab') ? 'lab' : 'theory';
  const finalSlot = (slot || (finalType === 'lab' ? 'Lab 1' : 'Sub 1')).trim();
  const finalFaculty = (faculty_name || 'Faculty In-Charge').trim();

  const nextId = Math.max(0, ...db.subjectCourses.map(s => s.id)) + 1;
  const newCourse: SubjectCourseRecord = {
    id: nextId,
    title: finalTitle,
    code: finalCode,
    department_id: deptId,
    year: finalYear,
    semester: finalSemester,
    course_type: finalType,
    slot: finalSlot,
    faculty_name: finalFaculty,
    is_elective: Boolean(is_elective),
    is_active: true,
    created_at: new Date().toISOString()
  };

  db.subjectCourses.unshift(newCourse);
  db.saveToFile();

  db.logAudit(
    req.user!.id,
    req.user!.email,
    'COURSE_CREATED',
    'COURSE',
    newCourse.id,
    null,
    { title: newCourse.title, code: newCourse.code, department: dept?.name, year: finalYear, semester: finalSemester, slot: finalSlot },
    getClientIp(req)
  );

  res.json({
    ...newCourse,
    department_name: dept ? dept.name : 'General Engineering',
    department_code: dept ? dept.code : 'GEN'
  });
});

apiRouter.post('/admin/curriculum-courses/seed-standards', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { department_id } = req.body;
  const deptsToSeed = department_id ? db.departments.filter(d => d.id === Number(department_id)) : db.departments.filter(d => d.type !== 'INSTITUTIONAL');

  let addedCount = 0;
  let nextId = Math.max(0, ...db.subjectCourses.map(s => s.id)) + 1;
  const now = new Date().toISOString();

  for (const dept of deptsToSeed) {
    const catalog = DEPARTMENT_CURRICULUM_CATALOG[dept.code.toUpperCase()];
    if (catalog) {
      for (const item of catalog) {
        const existing = db.subjectCourses.find(c => c.department_id === dept.id && c.code === item.code && c.semester === item.semester);
        if (!existing) {
          db.subjectCourses.push({
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
          addedCount++;
        }
      }
    } else {
      for (let sem = 1; sem <= 8; sem++) {
        const yr = Math.ceil(sem / 2);
        const existingCount = db.subjectCourses.filter(c => c.department_id === dept.id && c.semester === sem).length;
        if (existingCount === 0) {
          const generated = generateGenericSemesterSubjects(dept.code || 'ENGG', yr, sem);
          for (const item of generated) {
            db.subjectCourses.push({
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
            addedCount++;
          }
        }
      }
    }
  }

  db.saveToFile();
  res.json({ message: `Successfully seeded ${addedCount} curriculum subjects`, added: addedCount });
});

apiRouter.patch('/admin/subject-courses/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const course = db.subjectCourses.find(c => c.id === id);
  if (!course) return res.status(404).json({ detail: 'Course not found' });

  const { department, department_id, course_title, title, course_code, code, year, semester, course_type, slot, faculty_name, is_elective, is_active } = req.body;

  if (course_title !== undefined || title !== undefined) {
    const t = (course_title || title || '').trim();
    if (t) course.title = t;
  }
  if (course_code !== undefined || code !== undefined) {
    const c = (course_code || code || '').toUpperCase().trim();
    if (c) course.code = c;
  }
  if (course_type !== undefined) {
    course.course_type = course_type === 'lab' ? 'lab' : 'theory';
  }
  if (slot !== undefined) {
    course.slot = String(slot).trim();
  }
  if (faculty_name !== undefined) {
    course.faculty_name = String(faculty_name).trim();
  }
  if (is_elective !== undefined) {
    course.is_elective = Boolean(is_elective);
  }
  if (department_id !== undefined || department !== undefined || req.body.department_name) {
    const rawDept = (typeof department === 'string' ? department : (req.body.department_name || '')).trim();
    let dId = Number(department_id || department);
    let matchedDept = db.departments.find(d => d.id === dId);
    if (!matchedDept && rawDept) {
      matchedDept = db.departments.find(d =>
        d.name.toLowerCase() === rawDept.toLowerCase() ||
        d.code.toLowerCase() === rawDept.toLowerCase() ||
        rawDept.toLowerCase().includes(d.name.toLowerCase()) ||
        rawDept.toLowerCase().includes(d.code.toLowerCase())
      );
      if (!matchedDept) {
        const newDeptId = Math.max(0, ...db.departments.map(d => d.id)) + 1;
        const codeSuggestion = rawDept
          .replace(/[^a-zA-Z0-9\s]/g, '')
          .split(' ')
          .filter(Boolean)
          .map(w => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 6) || `DEPT${newDeptId}`;

        matchedDept = {
          id: newDeptId,
          name: rawDept,
          code: codeSuggestion,
          description: `${rawDept} Department`,
          is_active: true,
          created_at: new Date().toISOString()
        };
        db.departments.push(matchedDept);
        db.saveToFile();
      }
    }
    if (matchedDept) {
      course.department_id = matchedDept.id;
    }
  }
  if (year !== undefined) {
    course.year = Math.max(1, Math.min(4, Number(year) || 1));
  }
  if (semester !== undefined) {
    course.semester = Math.max(1, Math.min(8, Number(semester) || 1));
    if (!year) {
      course.year = Math.ceil(course.semester / 2);
    }
  }
  if (is_active !== undefined) {
    course.is_active = Boolean(is_active);
  }

  db.saveToFile();

  const dept = db.departments.find(d => d.id === course.department_id);
  db.logAudit(req.user!.id, req.user!.email, 'COURSE_UPDATED', 'COURSE', course.id, null, req.body, getClientIp(req));

  res.json({
    ...course,
    department_name: dept ? dept.name : 'General Engineering',
    department_code: dept ? dept.code : 'GEN'
  });
});

apiRouter.delete('/admin/subject-courses/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.subjectCourses.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Course not found' });

  const deleted = db.subjectCourses[idx];
  db.subjectCourses.splice(idx, 1);
  deleteRecordFromPostgres('subject_courses', id).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'COURSE_DELETED', 'COURSE', id, null, { title: deleted.title, code: deleted.code }, getClientIp(req));
  res.json({ message: 'Course deleted successfully', id });
});

apiRouter.get('/admin/due-categories', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  res.json(db.dueCategories);
});

apiRouter.post('/admin/due-categories', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { name, code, description, is_active } = req.body;
  const upperCode = (code || '').toUpperCase().trim();
  if (db.dueCategories.some(c => c.code === upperCode)) {
    return res.status(400).json({ detail: 'Due category with this code already exists' });
  }

  const newCat: DueCategoryRecord = {
    id: db.dueCategories.length + 1,
    name: (name || '').trim(),
    code: upperCode,
    description: description || '',
    is_active: is_active !== undefined ? is_active : true,
    created_at: new Date().toISOString()
  };
  db.dueCategories.push(newCat);
  db.logAudit(req.user!.id, req.user!.email, 'DUE_CATEGORY_CREATED', 'DUE_CATEGORY', newCat.id, null, req.body, getClientIp(req));
  res.json(newCat);
});

apiRouter.patch('/admin/due-categories/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const cat = db.dueCategories.find(c => c.id === id);
  if (!cat) return res.status(404).json({ detail: 'Due category not found' });

  const { name, code, description, is_active } = req.body;
  if (code) {
    const upperCode = code.toUpperCase().trim();
    if (db.dueCategories.some(c => c.id !== id && c.code === upperCode)) {
      return res.status(400).json({ detail: 'Due category with this code already exists' });
    }
    cat.code = upperCode;
  }
  if (name !== undefined) cat.name = name.trim();
  if (description !== undefined) cat.description = description;
  if (is_active !== undefined) cat.is_active = is_active;

  db.logAudit(req.user!.id, req.user!.email, 'DUE_CATEGORY_UPDATED', 'DUE_CATEGORY', cat.id, null, req.body, getClientIp(req));
  res.json(cat);
});

apiRouter.delete('/admin/due-categories/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.dueCategories.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Due category not found' });

  const cat = db.dueCategories[idx];
  db.dueCategories.splice(idx, 1);
  deleteRecordFromPostgres('due_categories', id).catch(() => {});
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'DUE_CATEGORY_DELETED', 'DUE_CATEGORY', id, null, { category: cat.name, code: cat.code }, getClientIp(req));
  res.json({ message: 'Due category deleted successfully', id });
});

apiRouter.get('/admin/audit-logs', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  let logs = db.auditLogs;
  if (req.query.action) {
    logs = logs.filter(l => l.action === req.query.action);
  }
  if (req.query.entity_type) {
    logs = logs.filter(l => l.entity_type === req.query.entity_type);
  }
  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    logs = logs.filter(l =>
      l.action.toLowerCase().includes(search) ||
      l.entity_type.toLowerCase().includes(search) ||
      (l.user_email && l.user_email.toLowerCase().includes(search))
    );
  }

  const total = logs.length;
  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = logs.slice(skip, skip + limit);

  res.json(paginated);
});

apiRouter.get('/admin/reports', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const deptMetrics = db.departments.map(d => {
    const dues = db.dueRecords.filter(due => due.department_id === d.id);
    const pending = dues.filter(due => due.status === 'pending');
    const cleared = dues.filter(due => due.status === 'cleared');
    const waived = dues.filter(due => due.status === 'waived');

    return {
      department_id: d.id,
      department_name: d.name,
      department_code: d.code,
      total_dues: dues.length,
      pending_count: pending.length,
      pending_amount: pending.reduce((s, x) => s + x.amount, 0),
      cleared_count: cleared.length,
      cleared_amount: cleared.reduce((s, x) => s + x.amount, 0),
      waived_count: waived.length,
      waived_amount: waived.reduce((s, x) => s + x.amount, 0),
      collection_rate: dues.length > 0 ? Number(((cleared.length / dues.length) * 100).toFixed(1)) : 100.0
    };
  });

  res.json({
    generated_at: new Date().toISOString(),
    department_metrics: deptMetrics,
    total_issued_certificates: db.certificates.filter(c => c.is_valid).length,
    total_revoked_certificates: db.certificates.filter(c => !c.is_valid).length,
    total_requests: db.noDueRequests.length
  });
});

apiRouter.post('/admin/reset', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const mode = req.body?.mode || 'full_reset';
  if (!['clear_cycle', 'clear_dues', 'full_reset'].includes(mode)) {
    return res.status(400).json({ detail: 'Invalid reset mode. Must be clear_cycle, clear_dues, or full_reset' });
  }

  const result = db.resetDatabase(mode);
  db.logAudit(
    req.user!.id,
    req.user!.email,
    `ADMIN_PORTAL_RESET_${mode.toUpperCase()}`,
    'SYSTEM',
    1,
    null,
    { mode, message: result.message },
    getClientIp(req)
  );
  res.json({ success: true, mode, ...result });
});

// ----------------------------------------------------
// Staff Routes (/api/staff)
// ----------------------------------------------------
apiRouter.get('/staff/dashboard', authMiddleware, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const staff = req.staffProfile!;
  const dept = db.departments.find(d => d.id === staff.department_id);
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const totalStudents = db.students.length;
  const dues = db.dueRecords.filter(d => d.department_id === staff.department_id);
  const pendingDues = dues.filter(d => d.status === 'pending');
  const clearedDues = dues.filter(d => d.status === 'cleared');

  const pendingDuesCount = pendingDues.length;
  const pendingDuesAmount = pendingDues.reduce((s, d) => s + d.amount, 0);
  const clearedDuesCount = clearedDues.length;

  const approvals = db.noDueApprovals.filter(a => a.department_id === staff.department_id);
  const pendingApprovals = approvals.filter(a => a.status === 'pending');
  const approvedApprovals = approvals.filter(a => a.status === 'approved');
  const rejectedApprovals = approvals.filter(a => a.status === 'rejected');

  res.json({
    department_id: dept.id,
    department_name: dept.name,
    department_code: dept.code,
    total_students: totalStudents,
    pending_dues_count: pendingDuesCount,
    pending_dues_amount: pendingDuesAmount,
    cleared_dues_count: clearedDuesCount,
    pending_approvals_count: pendingApprovals.length,
    approved_approvals_count: approvedApprovals.length,
    rejected_approvals_count: rejectedApprovals.length
  });
});

apiRouter.get('/staff/students', authMiddleware, requireRole(['STAFF']), (req: AuthRequest, res: Response) => {
  const staff = req.staffProfile!;
  let students = db.students;

  const staffDept = db.departments.find(d => d.id === staff.department_id);
  if (staffDept && isAcademicDepartment(staffDept, db.courses)) {
    students = students.filter(s => s.department_id === staff.department_id || db.dueRecords.some(d => d.student_id === s.id && d.department_id === staff.department_id));
  }

  if (req.query.course_id) {
    students = students.filter(s => s.course_id === Number(req.query.course_id));
  }
  if (req.query.year) {
    students = students.filter(s => s.year === Number(req.query.year));
  }

  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    students = students.filter(s =>
      s.full_name.toLowerCase().includes(search) ||
      s.register_number.toLowerCase().includes(search) ||
      s.email.toLowerCase().includes(search)
    );
  }

  const enriched: any[] = [];
  for (const s of students) {
    const deptDues = db.dueRecords.filter(d => d.student_id === s.id && d.department_id === staff.department_id);
    const pendingDues = deptDues.filter(d => d.status === 'pending');
    const pendingAmt = pendingDues.reduce((sum, d) => sum + d.amount, 0);

    const hasDue = req.query.has_due as string;
    if (hasDue === 'yes' && pendingDues.length === 0) continue;
    if (hasDue === 'no' && pendingDues.length > 0) continue;

    const course = db.courses.find(c => c.id === s.course_id);
    const dept = db.departments.find(d => d.id === s.department_id);

    enriched.push({
      id: s.id,
      register_number: s.register_number,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      course_id: s.course_id,
      course_name: course ? course.name : '',
      department_name: dept ? dept.name : '',
      year: s.year,
      semester: s.semester || (s.year ? s.year * 2 - 1 : 1),
      section: s.section,
      pending_due_amount: pendingAmt,
      has_pending_dues: pendingDues.length > 0,
      due_count: deptDues.length,
      dues: deptDues.map(d => {
        const cat = db.dueCategories.find(c => c.id === d.category_id);
        return {
          id: d.id,
          category_name: cat ? cat.name : '',
          amount: d.amount,
          status: d.status,
          description: d.description,
          remarks: d.remarks,
          created_at: d.created_at
        };
      })
    });
  }

  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = enriched.slice(skip, skip + limit);

  res.json(paginated);
});

// ====================================================
// HOD Clearance Management & Staff Allocation APIs
// ====================================================

apiRouter.get('/hod/profile', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const staff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const deptId = staff?.department_id || 1;
  const dept = db.departments.find(d => d.id === deptId) || db.departments[0];
  const deptStudents = db.students.filter(s => s.department_id === deptId);
  const deptStaff = db.staff.filter(s => s.department_id === deptId);
  const deptNodes = db.subjectCourses.filter(c => c.department_id === deptId && c.is_active !== false);
  const deptReqs = db.noDueRequests.filter(r => {
    const student = db.students.find(s => s.id === r.student_id);
    return student && student.department_id === deptId;
  });

  res.json({
    hod: {
      id: req.user!.id,
      email: req.user!.email,
      full_name: staff?.full_name || 'Dr. K. Senthil Kumar, M.E., Ph.D.',
      employee_id: staff?.employee_id || 'HOD-CSE-001',
      designation: staff?.designation || `Head of Department (${dept?.code || 'CSE'})`,
      phone: staff?.phone || '9842100000'
    },
    department: {
      id: dept?.id || 1,
      name: dept?.name || 'Department of Computer Science and Engineering',
      code: dept?.code || 'CSE',
      description: dept?.description || 'Academic Department'
    },
    metrics: {
      total_students: deptStudents.length,
      total_faculty: deptStaff.length,
      total_clearance_nodes: deptNodes.length,
      active_requests: deptReqs.length,
      pending_hod_endorsements: deptReqs.filter(r => !r.signatories?.hod?.signed).length
    }
  });
});

apiRouter.get('/hod/clearance-nodes', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const staff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const deptId = staff?.department_id || 1;
  
  let nodes = db.subjectCourses.filter(c => c.department_id === deptId);
  
  if (req.query.year) {
    nodes = nodes.filter(c => c.year === Number(req.query.year));
  }
  if (req.query.semester) {
    nodes = nodes.filter(c => c.semester === Number(req.query.semester));
  }
  if (req.query.course_type) {
    nodes = nodes.filter(c => c.course_type === req.query.course_type);
  }

  const sorted = nodes.slice().sort((a, b) => {
    if (a.semester !== b.semester) return a.semester - b.semester;
    const aType = a.course_type || 'theory';
    const bType = b.course_type || 'theory';
    if (aType !== bType) return aType === 'theory' ? -1 : 1;
    return (a.slot || '').localeCompare(b.slot || '');
  });

  res.json(sorted);
});

apiRouter.post('/hod/clearance-nodes', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const staff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const deptId = staff?.department_id || 1;

  const { title, code, year, semester, course_type, slot, faculty_name, faculty_id, faculty_email, is_elective } = req.body;

  if (!title || !code || !year || !semester) {
    return res.status(400).json({ detail: 'Title, Code, Year, and Semester are required to allocate a clearance node.' });
  }

  const nextId = Math.max(0, ...db.subjectCourses.map(c => c.id)) + 1;
  const newNode: SubjectCourseRecord = {
    id: nextId,
    title: title.trim(),
    code: code.trim().toUpperCase(),
    department_id: deptId,
    year: Number(year),
    semester: Number(semester),
    course_type: course_type || 'theory',
    slot: slot || (course_type === 'lab' ? `Lab ${nextId % 4 + 1}` : `Sub ${nextId % 6 + 1}`),
    faculty_name: faculty_name || 'Department Faculty',
    faculty_id: faculty_id ? Number(faculty_id) : undefined,
    faculty_email: faculty_email || undefined,
    is_elective: Boolean(is_elective),
    is_active: true,
    created_at: new Date().toISOString()
  };

  db.subjectCourses.push(newNode);
  db.saveToFile();

  db.logAudit(req.user!.id, req.user!.email, 'HOD_CLEARANCE_NODE_CREATED', 'SUBJECT_COURSE', newNode.id, null, newNode, getClientIp(req));

  res.status(201).json(newNode);
});

apiRouter.put('/hod/clearance-nodes/:id', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const node = db.subjectCourses.find(c => c.id === id);
  if (!node) {
    return res.status(404).json({ detail: 'Clearance node not found' });
  }

  const { title, code, year, semester, course_type, slot, faculty_name, faculty_id, faculty_email, is_elective, is_active } = req.body;

  if (title !== undefined) node.title = title.trim();
  if (code !== undefined) node.code = code.trim().toUpperCase();
  if (year !== undefined) node.year = Number(year);
  if (semester !== undefined) node.semester = Number(semester);
  if (course_type !== undefined) node.course_type = course_type;
  if (slot !== undefined) node.slot = slot;
  if (faculty_name !== undefined) node.faculty_name = faculty_name;
  if (faculty_id !== undefined) node.faculty_id = Number(faculty_id);
  if (faculty_email !== undefined) node.faculty_email = faculty_email;
  if (is_elective !== undefined) node.is_elective = Boolean(is_elective);
  if (is_active !== undefined) node.is_active = Boolean(is_active);

  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_CLEARANCE_NODE_UPDATED', 'SUBJECT_COURSE', node.id, null, node, getClientIp(req));

  res.json(node);
});

apiRouter.delete('/hod/clearance-nodes/:id', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const index = db.subjectCourses.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ detail: 'Clearance node not found' });
  }

  const deleted = db.subjectCourses.splice(index, 1)[0];
  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_CLEARANCE_NODE_DELETED', 'SUBJECT_COURSE', id, deleted, null, getClientIp(req));

  res.json({ message: 'Clearance node removed successfully' });
});

apiRouter.post('/hod/clearance-nodes/populate-semester', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const staff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const deptId = staff?.department_id || 1;
  const dept = db.departments.find(d => d.id === deptId) || db.departments[0];
  const deptCode = dept?.code?.toUpperCase() || 'CSE';

  const semester = Number(req.body.semester);
  const year = Number(req.body.year) || Math.ceil(semester / 2);

  if (!semester || semester < 1 || semester > 8) {
    return res.status(400).json({ detail: 'Valid semester between 1 and 8 is required.' });
  }

  // Remove any existing nodes for this department and semester
  db.subjectCourses = db.subjectCourses.filter(c => !(c.department_id === deptId && c.semester === semester));

  // Get department faculty to allocate
  const deptStaff = db.staff.filter(s => s.department_id === deptId);

  // Look up catalog or generate default
  let catalog = DEPARTMENT_CURRICULUM_CATALOG[deptCode] || [];
  let semItems = catalog.filter(c => c.semester === semester);
  if (semItems.length === 0) {
    semItems = generateGenericSemesterSubjects(deptCode, year, semester);
  }

  let nextId = Math.max(0, ...db.subjectCourses.map(c => c.id)) + 1;
  const createdNodes: SubjectCourseRecord[] = [];

  semItems.forEach((item, idx) => {
    const assignedStaff = deptStaff.length > 0 ? deptStaff[idx % deptStaff.length] : null;
    const node: SubjectCourseRecord = {
      id: nextId++,
      title: item.title,
      code: item.code,
      department_id: deptId,
      year: item.year || year,
      semester: semester,
      course_type: item.course_type,
      slot: item.slot,
      faculty_name: item.faculty_name || assignedStaff?.full_name || 'Staff In-Charge',
      faculty_id: assignedStaff?.id,
      faculty_email: assignedStaff?.email,
      is_elective: item.is_elective || false,
      is_active: true,
      created_at: new Date().toISOString()
    };
    db.subjectCourses.push(node);
    createdNodes.push(node);
  });

  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_POPULATE_SEMESTER_NODES', 'SUBJECT_COURSE', semester, null, { count: createdNodes.length, deptCode, semester }, getClientIp(req));

  res.json({
    message: `Successfully allocated ${createdNodes.length} clearance nodes for Year ${year}, Semester ${semester}.`,
    nodes: createdNodes
  });
});

apiRouter.get('/hod/faculty', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id || s.email.toLowerCase() === req.user!.email.toLowerCase());
  const deptId = hodStaff?.department_id || 1;

  const facultyList = db.staff.filter(s => s.department_id === deptId).map(s => {
    const assignedNodes = db.subjectCourses.filter(c => c.department_id === deptId && (c.faculty_id === s.id || c.faculty_email?.toLowerCase() === s.email.toLowerCase() || c.faculty_name === s.full_name));
    const userRec = db.users.find(u => u.id === s.user_id || u.email.toLowerCase() === s.email.toLowerCase());
    const isActive = (s.is_active !== false) && (userRec ? userRec.is_active !== false : true);
    return {
      ...s,
      is_active: isActive,
      assigned_nodes: assignedNodes.map(n => ({
        id: n.id,
        slot: n.slot,
        code: n.code,
        title: n.title,
        course_type: n.course_type,
        year: n.year,
        semester: n.semester
      }))
    };
  });

  res.json(facultyList);
});

apiRouter.post('/hod/faculty', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id || s.email.toLowerCase() === req.user!.email.toLowerCase());
  const deptId = hodStaff?.department_id || 1;
  const { full_name, employee_id, email, password, phone, designation, is_active } = req.body;

  if (!full_name || !employee_id || !email) {
    return res.status(400).json({ detail: 'Full Name, Employee ID, and Email are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanEmpId = employee_id.trim().toUpperCase();
  const cleanName = full_name.trim();
  const cleanPassword = (password && password.trim()) || 'Staff@123';
  const activeFlag = is_active !== undefined ? Boolean(is_active) : true;

  let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    const nextUserId = Math.max(0, ...db.users.map(u => u.id)) + 1;
    user = {
      id: nextUserId,
      email: cleanEmail,
      password_hash: hashPassword(cleanPassword),
      role: 'STAFF',
      is_active: activeFlag,
      is_registered: true,
      created_at: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.role = 'STAFF';
    user.is_active = activeFlag;
    if (password && password.trim()) {
      user.password_hash = hashPassword(password.trim());
    }
  }

  const nextStaffId = Math.max(0, ...db.staff.map(s => s.id)) + 1;
  const newStaff: StaffRecord = {
    id: nextStaffId,
    user_id: user.id,
    employee_id: cleanEmpId,
    full_name: cleanName,
    email: cleanEmail,
    phone: phone || '9876543210',
    department_id: deptId,
    designation: designation || 'Assistant Professor',
    is_active: activeFlag,
    created_at: new Date().toISOString()
  };

  db.staff.push(newStaff);
  db.saveToFile();
  db.queueSyncToPostgres();

  db.logAudit(req.user!.id, req.user!.email, 'HOD_STAFF_CREATED', 'STAFF', newStaff.id, null, {
    staff_name: cleanName,
    emp_id: cleanEmpId,
    dept_id: deptId,
    is_active: activeFlag
  }, getClientIp(req));

  res.status(201).json({ ...newStaff, is_active: activeFlag, assigned_nodes: [] });
});

apiRouter.patch('/hod/faculty/:id', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id || s.email.toLowerCase() === req.user!.email.toLowerCase());
  const deptId = hodStaff?.department_id || 1;
  const staffId = Number(req.params.id);

  const staff = db.staff.find(s => s.id === staffId && s.department_id === deptId);
  if (!staff) {
    return res.status(404).json({ detail: 'Faculty member not found in your department.' });
  }

  const { full_name, employee_id, email, password, phone, designation, is_active } = req.body;
  const oldEmail = staff.email;
  const oldName = staff.full_name;

  if (full_name !== undefined) staff.full_name = full_name.trim();
  if (employee_id !== undefined) staff.employee_id = employee_id.trim().toUpperCase();
  if (email !== undefined) staff.email = email.trim().toLowerCase();
  if (phone !== undefined) staff.phone = phone.trim();
  if (designation !== undefined) staff.designation = designation.trim();
  if (is_active !== undefined) staff.is_active = Boolean(is_active);

  const user = db.users.find(u => u.id === staff.user_id || u.email.toLowerCase() === oldEmail.toLowerCase());
  if (user) {
    if (email !== undefined) user.email = staff.email;
    if (is_active !== undefined) user.is_active = staff.is_active;
    if (password && password.trim()) {
      user.password_hash = hashPassword(password.trim());
    }
  }

  if (staff.full_name !== oldName || staff.email !== oldEmail) {
    db.subjectCourses.forEach(c => {
      if (c.department_id === deptId && (c.faculty_id === staff.id || c.faculty_email?.toLowerCase() === oldEmail.toLowerCase())) {
        c.faculty_name = staff.full_name;
        c.faculty_email = staff.email;
      }
    });
  }

  db.saveToFile();
  db.queueSyncToPostgres();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_STAFF_UPDATED', 'STAFF', staff.id, null, req.body, getClientIp(req));

  const assignedNodes = db.subjectCourses.filter(c => c.department_id === deptId && (c.faculty_id === staff.id || c.faculty_email?.toLowerCase() === staff.email.toLowerCase()));

  res.json({
    ...staff,
    is_active: staff.is_active !== false,
    assigned_nodes: assignedNodes.map(n => ({
      id: n.id,
      slot: n.slot,
      code: n.code,
      title: n.title,
      course_type: n.course_type,
      year: n.year,
      semester: n.semester
    }))
  });
});

apiRouter.patch('/hod/faculty/:id/status', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id || s.email.toLowerCase() === req.user!.email.toLowerCase());
  const deptId = hodStaff?.department_id || 1;
  const staffId = Number(req.params.id);

  const staff = db.staff.find(s => s.id === staffId && s.department_id === deptId);
  if (!staff) {
    return res.status(404).json({ detail: 'Faculty member not found in your department.' });
  }

  const user = db.users.find(u => u.id === staff.user_id || u.email.toLowerCase() === staff.email.toLowerCase());
  const newStatus = req.body.is_active !== undefined ? Boolean(req.body.is_active) : (staff.is_active !== false ? false : true);

  staff.is_active = newStatus;
  if (user) {
    user.is_active = newStatus;
  }

  db.saveToFile();
  db.queueSyncToPostgres();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_STAFF_STATUS_TOGGLED', 'STAFF', staff.id, null, { is_active: newStatus }, getClientIp(req));

  res.json({
    message: `Faculty ${staff.full_name} is now ${newStatus ? 'active' : 'deactivated'}.`,
    is_active: newStatus
  });
});

apiRouter.delete('/hod/faculty/:id', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id || s.email.toLowerCase() === req.user!.email.toLowerCase());
  const deptId = hodStaff?.department_id || 1;
  const staffId = Number(req.params.id);

  const staffIdx = db.staff.findIndex(s => s.id === staffId && s.department_id === deptId);
  if (staffIdx === -1) {
    return res.status(404).json({ detail: 'Faculty member not found in your department.' });
  }

  const staff = db.staff[staffIdx];

  db.subjectCourses.forEach(c => {
    if (c.department_id === deptId && (c.faculty_id === staff.id || c.faculty_email?.toLowerCase() === staff.email.toLowerCase())) {
      c.faculty_id = undefined;
      c.faculty_name = undefined;
      c.faculty_email = undefined;
    }
  });

  const user = db.users.find(u => u.id === staff.user_id || u.email.toLowerCase() === staff.email.toLowerCase());
  if (user) {
    user.is_active = false;
  }

  db.staff.splice(staffIdx, 1);
  deleteRecordFromPostgres('staff', staffId).catch(() => {});
  db.saveToFile();
  db.queueSyncToPostgres();

  db.logAudit(req.user!.id, req.user!.email, 'HOD_STAFF_DELETED', 'STAFF', staffId, null, { staff_name: staff.full_name, emp_id: staff.employee_id }, getClientIp(req));

  res.json({ message: `Faculty ${staff.full_name} has been removed successfully.` });
});

apiRouter.get('/hod/requests', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const deptId = hodStaff?.department_id || 1;
  const dept = db.departments.find(d => d.id === deptId);

  const deptStudents = db.students.filter(s => s.department_id === deptId);
  const studentMap = new Map<number, StudentRecord>(deptStudents.map(s => [s.id, s]));

  let requests = db.noDueRequests.filter(r => studentMap.has(r.student_id));

  if (req.query.status) {
    requests = requests.filter(r => r.status === req.query.status);
  }
  if (req.query.year) {
    requests = requests.filter(r => {
      const st = studentMap.get(r.student_id);
      return (r.year || st?.year) === Number(req.query.year);
    });
  }
  if (req.query.exam_type) {
    requests = requests.filter(r => r.exam_type === req.query.exam_type);
  }

  const enriched = requests.map(r => {
    const student = studentMap.get(r.student_id);
    const course = student ? db.courses.find(c => c.id === student.course_id) : null;
    const subjects = r.subjects || defaultSubjectsForStudent(student, r.semester);
    const labs = r.labs || defaultLabsForStudent(student, r.semester);
    const signatories = r.signatories || defaultSignatoriesForStudent(r);

    const pendingSubjects = subjects.filter((s: any) => s.dues_status && s.dues_status !== 'No Dues' && s.dues_status !== '-');
    const pendingLabs = labs.filter((l: any) => l.dues_status && l.dues_status !== 'No Dues' && l.dues_status !== '-');

    return {
      ...r,
      student_name: student?.full_name || 'Student',
      student_reg_no: student?.register_number || '-',
      department_name: dept?.name || '',
      department_code: dept?.code || '',
      course_name: course?.name || 'B.E. Computer Science and Engineering',
      year: r.year || student?.year || 4,
      semester: r.semester || student?.semester || 7,
      section: student?.section || 'A',
      student_type: r.student_type || student?.student_type || 'day_scholar',
      attendance_percentage: r.attendance_percentage ?? student?.attendance_percentage ?? 95,
      subjects,
      labs,
      signatories,
      all_subjects_cleared: pendingSubjects.length === 0,
      all_labs_cleared: pendingLabs.length === 0,
      hod_endorsed: Boolean(signatories?.hod?.signed),
      created_at: r.created_at || r.submitted_at
    };
  });

  res.json(enriched.reverse());
});

apiRouter.post('/hod/requests/:id/sign-off', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const reqId = Number(req.params.id);
  const noDueReq = db.noDueRequests.find(r => r.id === reqId);
  if (!noDueReq) {
    return res.status(404).json({ detail: 'No Due request not found' });
  }

  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const hodName = hodStaff?.full_name || 'Dr. K. Senthil Kumar, M.E., Ph.D.';
  const todayStr = new Date().toLocaleDateString('en-GB');

  noDueReq.signatories = noDueReq.signatories || defaultSignatoriesForStudent(noDueReq);
  noDueReq.signatories.hod = {
    signed: true,
    name: hodName,
    date: todayStr,
    status: 'approved',
    remarks: req.body.remarks || 'All department subject clearances and lab dues verified and approved.'
  };

  const student = db.students.find(s => s.id === noDueReq.student_id);
  if (student) {
    db.createNotification(
      student.user_id,
      'HOD Endorsement Approved',
      `Head of Department (${hodName}) has officially reviewed and signed off your ${noDueReq.exam_type} Clearance Form.`,
      'success'
    );
  }

  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'HOD_REQUEST_SIGNED', 'NO_DUE_REQUEST', reqId, null, { hod: hodName, remarks: req.body.remarks }, getClientIp(req));

  res.json({
    message: 'Official HOD Endorsement signed successfully.',
    request: noDueReq
  });
});

apiRouter.post(['/hod/requests/:id/clear-subject', '/staff/requests/:id/clear-subject'], authMiddleware, requireRole(['HOD', 'STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const reqId = Number(req.params.id);
  const noDueReq = db.noDueRequests.find(r => r.id === reqId);
  if (!noDueReq) {
    return res.status(404).json({ detail: 'No Due request not found' });
  }

  const { slot, faculty_name } = req.body;
  if (!slot) {
    return res.status(400).json({ detail: 'Slot name is required (e.g., Sub 1, Lab 2).' });
  }

  const staff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const staffName = faculty_name || staff?.full_name || 'Faculty In-Charge';
  const todayStr = new Date().toLocaleDateString('en-GB');

  let updated = false;
  if (noDueReq.subjects && Array.isArray(noDueReq.subjects)) {
    for (const sub of noDueReq.subjects) {
      const subCode = (sub as any).code || '';
      if (sub.slot?.toLowerCase() === slot.toLowerCase() || subCode.toLowerCase() === slot.toLowerCase()) {
        sub.dues_status = 'No Dues';
        sub.faculty_name = staffName;
        sub.signature_date = todayStr;
        updated = true;
      }
    }
  }

  if (noDueReq.labs && Array.isArray(noDueReq.labs)) {
    for (const lab of noDueReq.labs) {
      const labCode = (lab as any).code || '';
      if (lab.slot?.toLowerCase() === slot.toLowerCase() || labCode.toLowerCase() === slot.toLowerCase()) {
        lab.dues_status = 'No Dues';
        lab.faculty_name = staffName;
        lab.signature_date = todayStr;
        updated = true;
      }
    }
  }

  db.saveToFile();
  db.logAudit(req.user!.id, req.user!.email, 'SUBJECT_DUE_CLEARED', 'NO_DUE_REQUEST', reqId, null, { slot, staff: staffName }, getClientIp(req));

  res.json({
    message: `Dues cleared for ${slot} by ${staffName}.`,
    request: noDueReq
  });
});

apiRouter.post(['/hod/requests/:id/mark-subject-due', '/staff/requests/:id/mark-subject-due'], authMiddleware, requireRole(['HOD', 'STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const reqId = Number(req.params.id);
  const noDueReq = db.noDueRequests.find(r => r.id === reqId);
  if (!noDueReq) {
    return res.status(404).json({ detail: 'No Due request not found' });
  }

  const { slot, amount, description } = req.body;
  if (!slot) {
    return res.status(400).json({ detail: 'Slot name is required.' });
  }

  const dueText = amount && Number(amount) > 0 ? `Due: ₹${amount}` : (description || 'Pending Lab/Subject Due');

  if (noDueReq.subjects && Array.isArray(noDueReq.subjects)) {
    for (const sub of noDueReq.subjects) {
      const subCode = (sub as any).code || '';
      if (sub.slot?.toLowerCase() === slot.toLowerCase() || subCode.toLowerCase() === slot.toLowerCase()) {
        sub.dues_status = dueText;
      }
    }
  }

  if (noDueReq.labs && Array.isArray(noDueReq.labs)) {
    for (const lab of noDueReq.labs) {
      const labCode = (lab as any).code || '';
      if (lab.slot?.toLowerCase() === slot.toLowerCase() || labCode.toLowerCase() === slot.toLowerCase()) {
        lab.dues_status = dueText;
      }
    }
  }

  db.saveToFile();
  res.json({
    message: `Due marked for ${slot}.`,
    request: noDueReq
  });
});

apiRouter.get('/hod/students', authMiddleware, requireRole(['HOD', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const hodStaff = req.staffProfile || db.staff.find(s => s.user_id === req.user!.id);
  const deptId = hodStaff?.department_id || 1;
  const dept = db.departments.find(d => d.id === deptId);

  let students = db.students.filter(s => s.department_id === deptId);

  if (req.query.year) {
    students = students.filter(s => s.year === Number(req.query.year));
  }
  if (req.query.section) {
    students = students.filter(s => s.section === req.query.section);
  }

  const enriched = students.map(s => {
    const dues = db.dueRecords.filter(d => d.student_id === s.id);
    const pendingDues = dues.filter(d => d.status === 'pending');
    const totalPending = pendingDues.reduce((sum, d) => sum + d.amount, 0);
    const req = db.noDueRequests.slice().reverse().find(r => r.student_id === s.id);

    return {
      ...s,
      department_name: dept?.name || '',
      department_code: dept?.code || '',
      pending_due_amount: totalPending,
      has_pending_dues: pendingDues.length > 0,
      active_request_id: req?.id,
      active_request_status: req?.status,
      active_request_exam: req?.exam_type
    };
  });

  res.json(enriched);
});
