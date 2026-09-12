const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../data/college_db.json');
const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Password hash for Sasurie@123
const salt = 'college_nodue_salt_v1';
const passwordHash = crypto.scryptSync('Sasurie@123', salt, 32).toString('hex');

// Ensure courses exist for all 7 academic departments
const ensureCourses = [
  { id: 1, name: 'B.E. Computer Science and Engineering', code: 'BE-CSE', department_id: 1, duration: 4 },
  { id: 2, name: 'B.E. Electronics and Communication Engineering', code: 'BE-ECE', department_id: 2, duration: 4 },
  { id: 3, name: 'B.E. Mechanical Engineering', code: 'BE-MECH', department_id: 3, duration: 4 },
  { id: 7, name: 'B.E. Electrical and Electronics Engineering', code: 'BE-EEE', department_id: 4, duration: 4 },
  { id: 8, name: 'B.E. Civil Engineering', code: 'BE-CIVIL', department_id: 5, duration: 4 },
  { id: 9, name: 'B.Tech Information Technology', code: 'BTECH-IT', department_id: 6, duration: 4 },
  { id: 10, name: 'B.Tech Artificial Intelligence and Data Science', code: 'BTECH-AI&DS', department_id: 7, duration: 4 }
];

for (const c of ensureCourses) {
  const existing = db.courses.find(item => item.id === c.id || item.code === c.code);
  if (!existing) {
    db.courses.push({
      ...c,
      is_active: true,
      created_at: new Date().toISOString()
    });
  }
}

// 50 Student specifications across all departments and all years
const studentSpecs = [
  // CSE (Dept 1) - 8 students
  { name: 'Kavin Kumar S', dept: 1, course: 1, year: 1, sem: 2, admYear: 2025, reg: '732425104001', sec: 'A', type: 'day_scholar', phone: '9842100001' },
  { name: 'Sneha R', dept: 1, course: 1, year: 1, sem: 2, admYear: 2025, reg: '732425104002', sec: 'B', type: 'hostel', phone: '9842100002' },
  { name: 'Vigneshwaran M', dept: 1, course: 1, year: 2, sem: 4, admYear: 2024, reg: '732424104003', sec: 'A', type: 'day_scholar', phone: '9842100003' },
  { name: 'Divya Bharathi K', dept: 1, course: 1, year: 2, sem: 4, admYear: 2024, reg: '732424104004', sec: 'B', type: 'hostel', phone: '9842100004' },
  { name: 'Hariharan P', dept: 1, course: 1, year: 3, sem: 6, admYear: 2023, reg: '732423104005', sec: 'A', type: 'day_scholar', phone: '9842100005' },
  { name: 'Soundarya V', dept: 1, course: 1, year: 3, sem: 6, admYear: 2023, reg: '732423104006', sec: 'B', type: 'hostel', phone: '9842100006' },
  { name: 'Dinesh Karthik M', dept: 1, course: 1, year: 4, sem: 8, admYear: 2022, reg: '732422104007', sec: 'A', type: 'day_scholar', phone: '9842100007' },
  { name: 'Aishwarya R', dept: 1, course: 1, year: 4, sem: 8, admYear: 2022, reg: '732422104008', sec: 'B', type: 'hostel', phone: '9842100008' },

  // ECE (Dept 2) - 8 students
  { name: 'Gokulnath S', dept: 2, course: 2, year: 1, sem: 2, admYear: 2025, reg: '732425106001', sec: 'A', type: 'day_scholar', phone: '9842200001' },
  { name: 'Meena K', dept: 2, course: 2, year: 1, sem: 2, admYear: 2025, reg: '732425106002', sec: 'B', type: 'hostel', phone: '9842200002' },
  { name: 'Prasanth T', dept: 2, course: 2, year: 2, sem: 4, admYear: 2024, reg: '732424106003', sec: 'A', type: 'day_scholar', phone: '9842200003' },
  { name: 'Keerthana M', dept: 2, course: 2, year: 2, sem: 4, admYear: 2024, reg: '732424106004', sec: 'B', type: 'hostel', phone: '9842200004' },
  { name: 'Sanjay R', dept: 2, course: 2, year: 3, sem: 6, admYear: 2023, reg: '732423106005', sec: 'A', type: 'day_scholar', phone: '9842200005' },
  { name: 'Ananya P', dept: 2, course: 2, year: 3, sem: 6, admYear: 2023, reg: '732423106006', sec: 'B', type: 'hostel', phone: '9842200006' },
  { name: 'Naveen Kumar B', dept: 2, course: 2, year: 4, sem: 8, admYear: 2022, reg: '732422106007', sec: 'A', type: 'day_scholar', phone: '9842200007' },
  { name: 'Priyadharshini S', dept: 2, course: 2, year: 4, sem: 8, admYear: 2022, reg: '732422106008', sec: 'B', type: 'hostel', phone: '9842200008' },

  // MECH (Dept 3) - 7 students
  { name: 'Saravanan K', dept: 3, course: 3, year: 1, sem: 2, admYear: 2025, reg: '732425114001', sec: 'A', type: 'day_scholar', phone: '9842300001' },
  { name: 'Manojkumar C', dept: 3, course: 3, year: 1, sem: 2, admYear: 2025, reg: '732425114002', sec: 'A', type: 'hostel', phone: '9842300002' },
  { name: 'Deepak Raj V', dept: 3, course: 3, year: 2, sem: 4, admYear: 2024, reg: '732424114003', sec: 'A', type: 'day_scholar', phone: '9842300003' },
  { name: 'Praveen S', dept: 3, course: 3, year: 2, sem: 4, admYear: 2024, reg: '732424114004', sec: 'B', type: 'hostel', phone: '9842300004' },
  { name: 'Santhosh Kumar G', dept: 3, course: 3, year: 3, sem: 6, admYear: 2023, reg: '732423114005', sec: 'A', type: 'day_scholar', phone: '9842300005' },
  { name: 'Vasanth M', dept: 3, course: 3, year: 3, sem: 6, admYear: 2023, reg: '732423114006', sec: 'A', type: 'hostel', phone: '9842300006' },
  { name: 'Surya Narayanan K', dept: 3, course: 3, year: 4, sem: 8, admYear: 2022, reg: '732422114007', sec: 'A', type: 'day_scholar', phone: '9842300007' },

  // EEE (Dept 4) - 7 students
  { name: 'Karthikeyan N', dept: 4, course: 7, year: 1, sem: 2, admYear: 2025, reg: '732425105001', sec: 'A', type: 'day_scholar', phone: '9842400001' },
  { name: 'Pavithra S', dept: 4, course: 7, year: 1, sem: 2, admYear: 2025, reg: '732425105002', sec: 'B', type: 'hostel', phone: '9842400002' },
  { name: 'Sivakumar M', dept: 4, course: 7, year: 2, sem: 4, admYear: 2024, reg: '732424105003', sec: 'A', type: 'day_scholar', phone: '9842400003' },
  { name: 'Bhavani R', dept: 4, course: 7, year: 2, sem: 4, admYear: 2024, reg: '732424105004', sec: 'B', type: 'hostel', phone: '9842400004' },
  { name: 'Vijay Anand T', dept: 4, course: 7, year: 3, sem: 6, admYear: 2023, reg: '732423105005', sec: 'A', type: 'day_scholar', phone: '9842400005' },
  { name: 'Nandhini G', dept: 4, course: 7, year: 3, sem: 6, admYear: 2023, reg: '732423105006', sec: 'B', type: 'hostel', phone: '9842400006' },
  { name: 'Ajith Kumar P', dept: 4, course: 7, year: 4, sem: 8, admYear: 2022, reg: '732422105007', sec: 'A', type: 'day_scholar', phone: '9842400007' },

  // CIVIL (Dept 5) - 7 students
  { name: 'Gopinath V', dept: 5, course: 8, year: 1, sem: 2, admYear: 2025, reg: '732425103001', sec: 'A', type: 'day_scholar', phone: '9842500001' },
  { name: 'Monika K', dept: 5, course: 8, year: 1, sem: 2, admYear: 2025, reg: '732425103002', sec: 'B', type: 'hostel', phone: '9842500002' },
  { name: 'Bharathidasan S', dept: 5, course: 8, year: 2, sem: 4, admYear: 2024, reg: '732424103003', sec: 'A', type: 'day_scholar', phone: '9842500003' },
  { name: 'Abirami M', dept: 5, course: 8, year: 2, sem: 4, admYear: 2024, reg: '732424103004', sec: 'B', type: 'hostel', phone: '9842500004' },
  { name: 'Ravichandran P', dept: 5, course: 8, year: 3, sem: 6, admYear: 2023, reg: '732423103005', sec: 'A', type: 'day_scholar', phone: '9842500005' },
  { name: 'Swetha N', dept: 5, course: 8, year: 3, sem: 6, admYear: 2023, reg: '732423103006', sec: 'B', type: 'hostel', phone: '9842500006' },
  { name: 'Silambarasan T', dept: 5, course: 8, year: 4, sem: 8, admYear: 2022, reg: '732422103007', sec: 'A', type: 'day_scholar', phone: '9842500007' },

  // IT (Dept 6) - 7 students
  { name: 'Ashwin Raj K', dept: 6, course: 9, year: 1, sem: 2, admYear: 2025, reg: '732425205001', sec: 'A', type: 'day_scholar', phone: '9842600001' },
  { name: 'Kavitha S', dept: 6, course: 9, year: 1, sem: 2, admYear: 2025, reg: '732425205002', sec: 'B', type: 'hostel', phone: '9842600002' },
  { name: 'Rithish V', dept: 6, course: 9, year: 2, sem: 4, admYear: 2024, reg: '732424205003', sec: 'A', type: 'day_scholar', phone: '9842600003' },
  { name: 'Sandhya M', dept: 6, course: 9, year: 2, sem: 4, admYear: 2024, reg: '732424205004', sec: 'B', type: 'hostel', phone: '9842600004' },
  { name: 'Harish Kumar L', dept: 6, course: 9, year: 3, sem: 6, admYear: 2023, reg: '732423205005', sec: 'A', type: 'day_scholar', phone: '9842600005' },
  { name: 'Poornima R', dept: 6, course: 9, year: 3, sem: 6, admYear: 2023, reg: '732423205006', sec: 'B', type: 'hostel', phone: '9842600006' },
  { name: 'Yogeshwaran B', dept: 6, course: 9, year: 4, sem: 8, admYear: 2022, reg: '732422205007', sec: 'A', type: 'day_scholar', phone: '9842600007' },

  // AIADS (Dept 7) - 6 students
  { name: 'Akshaya S', dept: 7, course: 10, year: 1, sem: 2, admYear: 2025, reg: '732425243001', sec: 'A', type: 'day_scholar', phone: '9842700001' },
  { name: 'Dharun Prasad M', dept: 7, course: 10, year: 1, sem: 2, admYear: 2025, reg: '732425243002', sec: 'A', type: 'hostel', phone: '9842700002' },
  { name: 'Subashree K', dept: 7, course: 10, year: 2, sem: 4, admYear: 2024, reg: '732424243003', sec: 'A', type: 'day_scholar', phone: '9842700003' },
  { name: 'Lokesh Kumar T', dept: 7, course: 10, year: 2, sem: 4, admYear: 2024, reg: '732424243004', sec: 'B', type: 'hostel', phone: '9842700004' },
  { name: 'Gayathri Devi R', dept: 7, course: 10, year: 3, sem: 6, admYear: 2023, reg: '732423243005', sec: 'A', type: 'day_scholar', phone: '9842700005' },
  { name: 'Mithun Chakravarthy S', dept: 7, course: 10, year: 4, sem: 8, admYear: 2022, reg: '732422243006', sec: 'A', type: 'day_scholar', phone: '9842700006' }
];

console.log(`Total students to add/sync: ${studentSpecs.length}`);

let nextUserId = Math.max(...db.users.map(u => u.id), 0) + 1;
let nextStudentId = Math.max(...db.students.map(s => s.id), 0) + 1;

let addedCount = 0;
for (const spec of studentSpecs) {
  const email = `${spec.reg}@sasurie.edu`;
  let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    user = {
      id: nextUserId++,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role: 'STUDENT',
      is_active: true,
      is_registered: true,
      created_at: new Date().toISOString(),
      updated_at: null,
      department_id: null
    };
    db.users.push(user);
  } else {
    // Ensure password is Sasurie@123
    user.password_hash = passwordHash;
    user.is_active = true;
  }

  let student = db.students.find(s => s.register_number.toUpperCase() === spec.reg.toUpperCase());
  if (!student) {
    student = {
      id: nextStudentId++,
      user_id: user.id,
      register_number: spec.reg,
      full_name: spec.name,
      email: email.toLowerCase(),
      phone: spec.phone,
      department_id: spec.dept,
      course_id: spec.course,
      year: spec.year,
      section: spec.sec,
      admission_year: spec.admYear,
      semester: spec.sem,
      academic_year: '2025-2026',
      student_type: spec.type,
      attendance_percentage: (82 + Math.floor(Math.random() * 16)).toString(),
      undertaking_status: 'submitted',
      created_at: new Date().toISOString()
    };
    db.students.push(student);
    addedCount++;
  } else {
    // Update fields to ensure accurate department, course, year
    student.department_id = spec.dept;
    student.course_id = spec.course;
    student.year = spec.year;
    student.section = spec.sec;
    student.admission_year = spec.admYear;
    student.semester = spec.sem;
    student.student_type = spec.type;
  }
}

// Update nextId
db.nextId = db.nextId || {};
db.nextId.users = Math.max(...db.users.map(u => u.id), 0) + 1;
db.nextId.students = Math.max(...db.students.map(s => s.id), 0) + 1;

fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
console.log(`Successfully added ${addedCount} new students. Total students in DB: ${db.students.length}`);
