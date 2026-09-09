import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, hashPassword, verifyPassword, createToken, verifyToken, UserRecord, StudentRecord, StaffRecord, DepartmentRecord, CourseRecord, DueCategoryRecord } from './db';
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

  const user = db.users.find(u => u.id === payload.sub);
  if (!user || !user.is_active) {
    return res.status(401).json({ detail: 'User account not active or not found' });
  }

  req.user = user;
  if (user.role === 'STUDENT') {
    req.studentProfile = db.students.find(s => s.user_id === user.id);
  } else if (user.role === 'STAFF') {
    req.staffProfile = db.staff.find(s => s.user_id === user.id);
  }

  next();
}

// Optional auth helper
function requireRole(roles: Array<'STUDENT' | 'STAFF' | 'ADMIN'>) {
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
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'College No Due API',
    database: 'connected (in-memory persistent)'
  });
});

// ----------------------------------------------------
// Authentication Routes (/api/auth)
// ----------------------------------------------------
const COLLEGE_ADMIN_EMAIL = 'ramya@sasurie.edu';

// Real-time verification of student institutional enrollment against Admin portal database
apiRouter.post('/auth/verify-student', (req: Request, res: Response) => {
  const { register_number, email } = req.body;
  const cleanReg = (register_number || '').toUpperCase().trim();
  const cleanEmail = (email || '').toLowerCase().trim();

  if (!cleanReg) {
    return res.status(400).json({ detail: 'Register Number is required' });
  }

  const student = db.students.find(s => s.register_number.toUpperCase() === cleanReg);
  if (!student) {
    return res.status(404).json({
      verified: false,
      detail: `Register Number '${cleanReg}' was not found in the institutional database. Only students enrolled by the college administration in the Admin Portal can create an account.`
    });
  }

  if (cleanEmail && student.email.toLowerCase().trim() !== cleanEmail) {
    return res.status(400).json({
      verified: false,
      detail: `The email provided does not match the official college email on record for Register Number '${cleanReg}'.`
    });
  }

  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  const existingUser = db.users.find(u => u.id === student.user_id || u.email.toLowerCase() === student.email.toLowerCase());

  res.json({
    verified: true,
    student: {
      id: student.id,
      full_name: student.full_name,
      register_number: student.register_number,
      email: student.email,
      department_name: dept ? dept.name : '',
      course_name: course ? course.name : '',
      year: student.year,
      section: student.section,
      admission_year: student.admission_year,
      is_already_registered: existingUser ? !!existingUser.is_registered : false
    }
  });
});

// Student Self-Registration: Strictly allowed only if Register Number and College Email exist in Admin Portal
apiRouter.post(['/auth/signup', '/auth/register'], (req: Request, res: Response) => {
  const {
    register_number,
    email,
    password
  } = req.body;

  const upperReg = (register_number || '').toUpperCase().trim();
  const lowerEmail = (email || '').toLowerCase().trim();

  if (!upperReg || !lowerEmail || !password) {
    return res.status(400).json({ detail: 'Register Number, College Email, and Password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ detail: 'Password must be at least 8 characters long.' });
  }

  // 1. Check if student is enrolled in Admin database
  const student = db.students.find(s => s.register_number.toUpperCase() === upperReg);
  if (!student) {
    return res.status(403).json({
      detail: `Registration Denied: Register Number '${upperReg}' is not enrolled in the college database. Only students added by the college administration in the Admin Portal can create an account. Please contact the Admin.`
    });
  }

  // 2. Check if the college email matches the student record
  if (student.email.toLowerCase().trim() !== lowerEmail) {
    return res.status(403).json({
      detail: `Verification Error: The email '${lowerEmail}' does not match the official institutional email registered for Register Number '${upperReg}'. Please use your official college email.`
    });
  }

  const now = new Date().toISOString();

  // 3. Find or create user account linked to this enrolled student
  let user = db.users.find(u => u.id === student.user_id || u.email.toLowerCase() === lowerEmail);
  if (user) {
    // Set student's own chosen password and activate
    user.email = lowerEmail;
    user.password_hash = hashPassword(password);
    user.is_active = true;
    user.is_registered = true;
    user.updated_at = now;
  } else {
    const nextUserId = Math.max(...db.users.map(u => u.id), 0) + 1;
    user = {
      id: nextUserId,
      email: lowerEmail,
      password_hash: hashPassword(password),
      role: 'STUDENT',
      is_active: true,
      is_registered: true,
      created_at: now
    };
    db.users.push(user);
  }

  student.user_id = user.id;

  db.logAudit(user.id, user.email, 'STUDENT_ACCOUNT_REGISTERED', 'STUDENT', student.id, null, { email: lowerEmail, reg_no: upperReg }, getClientIp(req));

  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  const access_token = createToken({ sub: user.id, role: user.role, type: 'access' }, 1);
  const refresh_token = createToken({ sub: user.id, role: user.role, type: 'refresh' }, 7);

  res.json({
    access_token,
    refresh_token,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: student.full_name,
      register_number: student.register_number,
      department_id: student.department_id,
      department_name: dept ? dept.name : '',
      course_id: student.course_id,
      course_name: course ? course.name : '',
      year: student.year,
      section: student.section
    }
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ detail: 'Email or Register Number and password are required' });
  }

  const rawIdentifier = email.trim();
  const lowerIdentifier = rawIdentifier.toLowerCase();
  const upperIdentifier = rawIdentifier.toUpperCase();

  // Find user by email or by student register number
  let user = db.users.find(u => u.email.toLowerCase() === lowerIdentifier);
  let student = db.students.find(s => s.user_id === user?.id);

  if (!user) {
    // Check if entered identifier is a student register number
    student = db.students.find(s => s.register_number.toUpperCase() === upperIdentifier);
    if (student) {
      user = db.users.find(u => u.id === student!.user_id || u.email.toLowerCase() === student!.email.toLowerCase());
    }
  }

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ detail: 'Invalid Register Number / Email or Password' });
  }

  if (!user.is_active) {
    return res.status(403).json({ detail: 'Account is deactivated. Please contact administration.' });
  }

  // Sole admin check - strictly only authorized admin account permitted
  if (user.role === 'ADMIN' && user.email.toLowerCase() !== COLLEGE_ADMIN_EMAIL.toLowerCase()) {
    return res.status(401).json({
      detail: 'Invalid email or password'
    });
  }

  const access_token = createToken({ sub: user.id, role: user.role, type: 'access' }, 1);
  const refresh_token = createToken({ sub: user.id, role: user.role, type: 'refresh' }, 7);

  db.logAudit(user.id, user.email, 'USER_LOGIN', 'USER', user.id, null, { identifier: rawIdentifier, role: user.role }, getClientIp(req));

  const userInfo: any = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  if (user.role === 'STUDENT') {
    const st = student || db.students.find(s => s.user_id === user.id);
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
    userInfo.full_name = 'Ramya (College Administrator)';
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

  const user = db.users.find(u => u.id === payload.sub);
  if (!user || !user.is_active) {
    return res.status(401).json({ detail: 'User account not active' });
  }

  const new_access_token = createToken({ sub: user.id, role: user.role, type: 'access' }, 1);
  const new_refresh_token = createToken({ sub: user.id, role: user.role, type: 'refresh' }, 7);

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
  } else if (user.role === 'STAFF') {
    const staff = db.staff.find(s => s.user_id === user.id);
    if (staff) {
      userInfo.full_name = staff.full_name;
      userInfo.employee_id = staff.employee_id;
      userInfo.department_id = staff.department_id;
    }
  } else if (user.role === 'ADMIN') {
    userInfo.full_name = 'Ramya (College Administrator)';
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
  } else if (user.role === 'STAFF' && req.staffProfile) {
    const st = req.staffProfile;
    const dept = db.departments.find(d => d.id === st.department_id);
    userInfo.staff_id = st.id;
    userInfo.full_name = st.full_name;
    userInfo.employee_id = st.employee_id;
    userInfo.phone = st.phone;
    userInfo.department_id = st.department_id;
    userInfo.department_name = dept ? dept.name : '';
    userInfo.designation = st.designation;
    userInfo.staff_profile = { ...st, department_name: userInfo.department_name };
  } else if (user.role === 'ADMIN') {
    userInfo.full_name = 'Ramya (College Administrator)';
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

  const activeDepartments = db.departments.filter(d => d.is_active);
  const studentDues = db.dueRecords.filter(d => d.student_id === student.id);

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
    const deptPendingAmt = deptPendingDues.reduce((sum, d) => sum + d.amount, 0);
    const isCleared = deptPendingAmt === 0;
    if (isCleared) clearedDeptsCount++;

    const appInfo = approvalMap.get(dept.id);
    return {
      department_id: dept.id,
      department_name: dept.name,
      department_code: dept.code,
      pending_amount: deptPendingAmt,
      total_dues_count: deptDues.length,
      pending_dues_count: deptPendingDues.length,
      status: isCleared ? 'cleared' : 'pending',
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
      section: student.section,
      admission_year: student.admission_year,
      created_at: student.created_at
    },
    total_dues_amount: totalAmount,
    pending_dues_amount: pendingAmount,
    cleared_dues_amount: clearedAmount,
    waived_dues_amount: waivedAmount,
    total_departments: totalDepts,
    cleared_departments_count: clearedDeptsCount,
    pending_departments_count: totalDepts - clearedDeptsCount,
    clearance_percentage: clearancePct,
    can_request_no_due: canRequestNoDue,
    active_request: activeReqOut,
    issued_certificate: certOut,
    department_statuses: departmentStatuses
  });
});

apiRouter.get('/student/departments', (req, res) => {
  res.json(db.departments.filter(d => d.is_active));
});

apiRouter.get('/student/courses', (req, res) => {
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
  if (statusFilter) {
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
    const dept = db.departments.find(d => d.id === r.department_id);
    const cat = db.dueCategories.find(c => c.id === r.category_id);
    return {
      id: r.id,
      student_id: r.student_id,
      student_name: student ? student.full_name : '',
      student_reg_no: student ? student.register_number : '',
      student_email: student ? student.email : '',
      department_id: r.department_id,
      department_name: dept ? dept.name : '',
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

  const now = new Date().toISOString();
  const newDue: any = {
    id: db.dueRecords.length + 1,
    student_id: student.id,
    department_id: dept.id,
    category_id: cat.id,
    amount: Number(amount) || 0,
    status: 'pending',
    description: description || 'Department Due',
    remarks: remarks || '',
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

apiRouter.patch('/due-records/:id', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const due = db.dueRecords.find(d => d.id === id);
  if (!due) return res.status(404).json({ detail: 'Due record not found' });

  if (req.user!.role === 'STAFF' && due.department_id !== req.staffProfile!.department_id) {
    return res.status(403).json({ detail: 'You can only modify dues for your assigned department' });
  }

  const { amount, status, description, remarks } = req.body;
  if (amount !== undefined) due.amount = Number(amount);
  if (status !== undefined) {
    if (!['pending', 'cleared', 'waived'].includes(status)) {
      return res.status(400).json({ detail: 'Invalid status. Must be pending, cleared, or waived' });
    }
    due.status = status;
  }
  if (description !== undefined) due.description = description;
  if (remarks !== undefined) due.remarks = remarks;

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
  const reqId = db.noDueRequests.length + 1;
  const newReq: any = {
    id: reqId,
    student_id: student.id,
    status: 'under_review',
    submitted_at: now,
    remarks: req.body.remarks || '',
    created_at: now
  };
  db.noDueRequests.push(newReq);

  // Auto-generate approval for every active department
  const activeDepts = db.departments.filter(d => d.is_active);
  const approvals = activeDepts.map(d => {
    const appRecord: any = {
      id: db.noDueApprovals.length + 1,
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

  db.logAudit(req.user!.id, req.user!.email, 'NO_DUE_REQUEST_CREATED', 'NO_DUE_REQUEST', newReq.id, null, { departments_count: activeDepts.length }, getClientIp(req));
  db.createNotification(
    student.user_id,
    'No Due Request Submitted',
    'Your No Due Clearance request has been initiated and routed to all departments for verification.',
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
    created_at: newReq.created_at
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
      created_at: r.created_at
    };
  });

  res.json(result);
});

apiRouter.get('/no-due-requests', authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  let requests = db.noDueRequests;
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
      created_at: r.created_at
    };
  });

  res.json(result);
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

  const certNumber = `NDC-2026-${(db.certificates.length + 1).toString().padStart(6, '0')}`;
  const verifCode = `VFY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const now = new Date().toISOString();

  const cert: any = {
    id: db.certificates.length + 1,
    request_id: r.id,
    student_id: r.student_id,
    certificate_number: certNumber,
    verification_code: verifCode,
    issued_at: now,
    is_valid: true,
    created_at: now
  };
  db.certificates.push(cert);

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

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_ISSUED', 'CERTIFICATE', cert.id, null, { cert_number: certNumber, student_id: r.student_id }, getClientIp(req));

  res.json({
    id: cert.id,
    request_id: cert.request_id,
    student_id: cert.student_id,
    student_name: st ? st.full_name : '',
    register_number: st ? st.register_number : '',
    course_name: course ? course.name : '',
    department_name: dept ? dept.name : '',
    certificate_number: cert.certificate_number,
    verification_code: cert.verification_code,
    issued_at: cert.issued_at,
    is_valid: cert.is_valid,
    created_at: cert.created_at
  });
});

apiRouter.get('/certificates/my', authMiddleware, requireRole(['STUDENT']), (req: AuthRequest, res: Response) => {
  const student = req.studentProfile!;
  const certs = db.certificates.filter(c => c.student_id === student.id).slice().reverse();
  const dept = db.departments.find(d => d.id === student.department_id);
  const course = db.courses.find(c => c.id === student.course_id);

  const result = certs.map(c => ({
    id: c.id,
    request_id: c.request_id,
    student_id: c.student_id,
    student_name: student.full_name,
    register_number: student.register_number,
    course_name: course ? course.name : '',
    department_name: dept ? dept.name : '',
    certificate_number: c.certificate_number,
    verification_code: c.verification_code,
    issued_at: c.issued_at,
    is_valid: c.is_valid,
    created_at: c.created_at
  }));

  res.json(result);
});

apiRouter.get(['/certificates', '/certificates/all'], authMiddleware, requireRole(['STAFF', 'ADMIN']), (req: AuthRequest, res: Response) => {
  let certs = db.certificates;
  if (req.query.is_valid !== undefined) {
    const isValid = req.query.is_valid === 'true';
    certs = certs.filter(c => c.is_valid === isValid);
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

  const total = certs.length;
  const skip = Number(req.query.skip) || 0;
  const limit = Number(req.query.limit) || 50;
  const paginated = certs.slice().reverse().slice(skip, skip + limit);

  const result = paginated.map(c => {
    const st = db.students.find(s => s.id === c.student_id);
    const dept = st ? db.departments.find(d => d.id === st.department_id) : null;
    const course = st ? db.courses.find(cr => cr.id === st.course_id) : null;
    return {
      id: c.id,
      request_id: c.request_id,
      student_id: c.student_id,
      student_name: st ? st.full_name : '',
      register_number: st ? st.register_number : '',
      course_name: course ? course.name : '',
      department_name: dept ? dept.name : '',
      certificate_number: c.certificate_number,
      verification_code: c.verification_code,
      issued_at: c.issued_at,
      is_valid: c.is_valid,
      created_at: c.created_at
    };
  });

  res.json(result);
});

// Public verification endpoint
apiRouter.get('/certificates/verify/:verification_code', (req: Request, res: Response) => {
  const code = (req.params.verification_code || '').trim().toUpperCase();
  const cert = db.certificates.find(c => c.verification_code.toUpperCase() === code);
  if (!cert) {
    return res.status(404).json({ detail: 'Certificate with this verification code was not found in institutional records.' });
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
    college_name: 'Apex Institute of Technology & Higher Education',
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

  const pdfBuffer = generateCertificatePdf(
    st ? st.full_name : 'STUDENT',
    st ? st.register_number : 'REG000',
    course ? course.name : 'Undergraduate Program',
    dept ? dept.name : 'Academic Department',
    st ? `${st.year}th Year (${st.admission_year}-${st.admission_year + 4})` : '2022-2026',
    cert.certificate_number,
    cert.verification_code,
    cert.issued_at
  );

  const filename = `NoDueCertificate_${st ? st.register_number : cert.certificate_number}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
});

apiRouter.patch('/certificates/:id/revoke', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const cert = db.certificates.find(c => c.id === id);
  if (!cert) return res.status(404).json({ detail: 'Certificate not found' });

  cert.is_valid = false;
  cert.updated_at = new Date().toISOString();

  const st = db.students.find(s => s.id === cert.student_id);
  if (st) {
    db.createNotification(
      st.user_id,
      'Certificate Revoked',
      `Your certificate #${cert.certificate_number} has been revoked by administration. Reason: ${req.body.reason || 'Administrative review'}.`,
      'danger'
    );
  }

  db.logAudit(req.user!.id, req.user!.email, 'CERTIFICATE_REVOKED', 'CERTIFICATE', cert.id, { is_valid: true }, { is_valid: false, reason: req.body.reason }, getClientIp(req));
  res.json({ message: 'Certificate revoked successfully', is_valid: false });
});

apiRouter.delete('/certificates/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const idx = db.certificates.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ detail: 'Certificate not found' });

  const cert = db.certificates[idx];
  db.certificates.splice(idx, 1);

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
    year,
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

  const dept = db.departments.find(d => d.id === Number(department_id));
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const course = db.courses.find(c => c.id === Number(course_id));
  if (!course) return res.status(404).json({ detail: 'Degree course not found' });

  const now = new Date().toISOString();
  const nextUserId = Math.max(...db.users.map(u => u.id), 0) + 1;
  const newUser: UserRecord = {
    id: nextUserId,
    email: lowerEmail,
    password_hash: hashPassword(password || 'StudentPassword@123'),
    role: 'STUDENT',
    is_active: true,
    created_at: now
  };
  db.users.push(newUser);

  const nextStudentId = Math.max(...db.students.map(s => s.id), 0) + 1;
  const newStudent: StudentRecord = {
    id: nextStudentId,
    user_id: newUser.id,
    register_number: upperReg,
    full_name: (full_name || '').trim(),
    email: lowerEmail,
    phone: phone || '',
    department_id: dept.id,
    course_id: course.id,
    year: Number(year) || 1,
    section: (section || 'A').toUpperCase().trim(),
    admission_year: Number(admission_year) || new Date().getFullYear(),
    created_at: now
  };
  db.students.push(newStudent);

  db.logAudit(req.user!.id, req.user!.email, 'STUDENT_CREATED', 'STUDENT', newStudent.id, null, req.body, getClientIp(req));

  res.json({
    id: newStudent.id,
    user_id: newStudent.user_id,
    register_number: newStudent.register_number,
    full_name: newStudent.full_name,
    email: newStudent.email,
    phone: newStudent.phone,
    department_id: newStudent.department_id,
    department_name: dept.name,
    course_id: newStudent.course_id,
    course_name: course.name,
    year: newStudent.year,
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
    year,
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

  if (password && u) {
    u.password_hash = hashPassword(password);
  }

  if (full_name !== undefined) st.full_name = full_name.trim();
  if (phone !== undefined) st.phone = phone.trim();
  if (department_id !== undefined) st.department_id = Number(department_id);
  if (course_id !== undefined) st.course_id = Number(course_id);
  if (year !== undefined) st.year = Number(year);
  if (section !== undefined) st.section = section.toUpperCase().trim();
  if (admission_year !== undefined) st.admission_year = Number(admission_year);
  if (is_active !== undefined && u) u.is_active = is_active;

  const dept = db.departments.find(d => d.id === st.department_id);
  const course = db.courses.find(c => c.id === st.course_id);

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
  db.dueRecords = db.dueRecords.filter(d => d.student_id !== id);
  db.noDueRequests = db.noDueRequests.filter(r => r.student_id !== id);
  db.certificates = db.certificates.filter(c => c.student_id !== id);
  db.notifications = db.notifications.filter(n => n.user_id !== userId);
  db.users = db.users.filter(u => u.id !== userId);
  db.students.splice(stIndex, 1);

  db.logAudit(req.user!.id, req.user!.email, 'STUDENT_DELETED', 'STUDENT', id, null, { student: st.full_name, reg_no: st.register_number }, getClientIp(req));

  res.json({ message: 'Student and related records deleted successfully', id });
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
  const { employee_id, email, password, full_name, phone, department_id, designation } = req.body;
  const upperEmp = (employee_id || '').toUpperCase().trim();
  if (db.staff.some(s => s.employee_id === upperEmp)) {
    return res.status(400).json({ detail: 'Employee ID already exists' });
  }

  const lowerEmail = (email || '').toLowerCase().trim();
  if (db.users.some(u => u.email === lowerEmail)) {
    return res.status(400).json({ detail: 'An account with this email already exists' });
  }

  const dept = db.departments.find(d => d.id === Number(department_id));
  if (!dept) return res.status(404).json({ detail: 'Department not found' });

  const now = new Date().toISOString();
  const newUser: UserRecord = {
    id: db.users.length + 1,
    email: lowerEmail,
    password_hash: hashPassword(password || 'StaffPassword@123'),
    role: 'STAFF',
    is_active: true,
    created_at: now
  };
  db.users.push(newUser);

  const newStaff: StaffRecord = {
    id: db.staff.length + 1,
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
  const { employee_id, full_name, email, password, phone, department_id, designation, is_active } = req.body;

  if (employee_id) {
    const upperEmp = employee_id.toUpperCase().trim();
    if (db.staff.some(s => s.id !== id && s.employee_id.toUpperCase() === upperEmp)) {
      return res.status(400).json({ detail: 'Employee ID already in use by another officer' });
    }
    st.employee_id = upperEmp;
  }

  if (email) {
    const lowerEmail = email.toLowerCase().trim();
    if (db.users.some(user => user.id !== st.user_id && user.email === lowerEmail)) {
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
  if (department_id !== undefined) st.department_id = Number(department_id);
  if (designation !== undefined) st.designation = designation.trim();
  if (is_active !== undefined && u) u.is_active = is_active;

  const dept = db.departments.find(d => d.id === st.department_id);

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

apiRouter.delete('/admin/staff/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const stIndex = db.staff.findIndex(s => s.id === id);
  if (stIndex === -1) return res.status(404).json({ detail: 'Clearance officer not found' });

  const st = db.staff[stIndex];
  const userId = st.user_id;

  db.users = db.users.filter(u => u.id !== userId);
  db.staff.splice(stIndex, 1);

  db.logAudit(req.user!.id, req.user!.email, 'STAFF_DELETED', 'STAFF', id, null, { staff: st.full_name, emp_id: st.employee_id }, getClientIp(req));

  res.json({ message: 'Clearance officer deleted successfully', id });
});

apiRouter.get('/admin/departments', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  res.json(db.departments);
});

apiRouter.post('/admin/departments', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const { name, code, description, is_active } = req.body;
  const upperCode = (code || '').toUpperCase().trim();
  if (db.departments.some(d => d.code === upperCode)) {
    return res.status(400).json({ detail: 'Department with this code already exists' });
  }

  const newDept: DepartmentRecord = {
    id: db.departments.length + 1,
    name: (name || '').trim(),
    code: upperCode,
    description: description || '',
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

  const { name, code, description, is_active } = req.body;
  if (name !== undefined) dept.name = name.trim();
  if (code !== undefined) dept.code = code.toUpperCase().trim();
  if (description !== undefined) dept.description = description;
  if (is_active !== undefined) dept.is_active = is_active;

  db.logAudit(req.user!.id, req.user!.email, 'DEPARTMENT_UPDATED', 'DEPARTMENT', dept.id, null, req.body, getClientIp(req));
  res.json(dept);
});

apiRouter.delete('/admin/departments/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const deptIdx = db.departments.findIndex(d => d.id === id);
  if (deptIdx === -1) return res.status(404).json({ detail: 'Department not found' });

  const dept = db.departments[deptIdx];
  db.departments.splice(deptIdx, 1);

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
  const upperCode = (code || '').toUpperCase().trim();
  if (db.courses.some(c => c.code === upperCode)) {
    return res.status(400).json({ detail: 'Course with this code already exists' });
  }

  const dept = db.departments.find(d => d.id === Number(department_id));
  const newCourse: CourseRecord = {
    id: db.courses.length + 1,
    name: (name || '').trim(),
    code: upperCode,
    department_id: Number(department_id),
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

  db.logAudit(req.user!.id, req.user!.email, 'COURSE_DELETED', 'COURSE', id, null, { course: c.name, code: c.code }, getClientIp(req));
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
