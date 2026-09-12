export interface StandardSubjectDefinition {
  title: string;
  code: string;
  year: number;
  semester: number;
  course_type: 'theory' | 'lab';
  slot: string; // 'Sub 1' .. 'Sub 6' or 'Lab 1' .. 'Lab 4'
  faculty_name: string;
  is_elective?: boolean;
}

export const DEPARTMENT_CURRICULUM_CATALOG: Record<string, StandardSubjectDefinition[]> = {
  CSE: [
    // Year 1 - Sem 1
    { slot: 'Sub 1', code: 'GE3151', title: 'Problem Solving and Python Programming', year: 1, semester: 1, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 2', code: 'MA3151', title: 'Matrices and Calculus', year: 1, semester: 1, course_type: 'theory', faculty_name: 'Dr. M. Geetha' },
    { slot: 'Sub 3', code: 'PH3151', title: 'Engineering Physics', year: 1, semester: 1, course_type: 'theory', faculty_name: 'Prof. S. Natarajan' },
    { slot: 'Sub 4', code: 'CY3151', title: 'Engineering Chemistry', year: 1, semester: 1, course_type: 'theory', faculty_name: 'Dr. P. Muthukumar' },
    { slot: 'Sub 5', code: 'HS3151', title: 'Professional English - I', year: 1, semester: 1, course_type: 'theory', faculty_name: 'Prof. B. Anitha' },
    { slot: 'Sub 6', code: 'GE3152', title: 'Heritage of Tamils', year: 1, semester: 1, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'GE3171', title: 'Problem Solving & Python Lab', year: 1, semester: 1, course_type: 'lab', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Lab 2', code: 'BS3171', title: 'Physics and Chemistry Laboratory', year: 1, semester: 1, course_type: 'lab', faculty_name: 'Prof. S. Natarajan' },

    // Year 1 - Sem 2
    { slot: 'Sub 1', code: 'CS3251', title: 'Programming in C', year: 1, semester: 2, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 2', code: 'MA3251', title: 'Statistics and Numerical Methods', year: 1, semester: 2, course_type: 'theory', faculty_name: 'Dr. M. Geetha' },
    { slot: 'Sub 3', code: 'PH3256', title: 'Physics for Information Science', year: 1, semester: 2, course_type: 'theory', faculty_name: 'Prof. S. Natarajan' },
    { slot: 'Sub 4', code: 'BE3251', title: 'Basic Electrical & Electronics Engg', year: 1, semester: 2, course_type: 'theory', faculty_name: 'Prof. M. Selvam' },
    { slot: 'Sub 5', code: 'HS3251', title: 'Professional English - II', year: 1, semester: 2, course_type: 'theory', faculty_name: 'Prof. B. Anitha' },
    { slot: 'Sub 6', code: 'GE3252', title: 'Tamils and Technology', year: 1, semester: 2, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3271', title: 'Programming in C Laboratory', year: 1, semester: 2, course_type: 'lab', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Lab 2', code: 'GE3271', title: 'Engineering Practices Laboratory', year: 1, semester: 2, course_type: 'lab', faculty_name: 'Prof. M. Selvam' },

    // Year 2 - Sem 3
    { slot: 'Sub 1', code: 'CS3301', title: 'Data Structures and Algorithms', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. S. Rajesh' },
    { slot: 'Sub 2', code: 'CS3351', title: 'Digital Principles and Computer Organization', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Sub 3', code: 'CS3352', title: 'Foundations of Data Science', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 4', code: 'CS3391', title: 'Object Oriented Programming', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. S. Vignesh' },
    { slot: 'Sub 5', code: 'MA3354', title: 'Discrete Mathematics', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. M. Geetha' },
    { slot: 'Sub 6', code: 'CDC003', title: 'Career Development Centre - Level 1', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3361', title: 'Data Structures Laboratory', year: 2, semester: 3, course_type: 'lab', faculty_name: 'Dr. S. Rajesh' },
    { slot: 'Lab 2', code: 'CS3381', title: 'Object Oriented Programming Laboratory', year: 2, semester: 3, course_type: 'lab', faculty_name: 'Prof. S. Vignesh' },

    // Year 2 - Sem 4
    { slot: 'Sub 1', code: 'CS3452', title: 'Theory of Computation', year: 2, semester: 4, course_type: 'theory', faculty_name: 'Dr. S. Rajesh' },
    { slot: 'Sub 2', code: 'CS3491', title: 'Artificial Intelligence and Machine Learning', year: 2, semester: 4, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 3', code: 'CS3492', title: 'Database Management Systems', year: 2, semester: 4, course_type: 'theory', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Sub 4', code: 'CS3401', title: 'Algorithms Design and Analysis', year: 2, semester: 4, course_type: 'theory', faculty_name: 'Prof. S. Vignesh' },
    { slot: 'Sub 5', code: 'GE3451', title: 'Environmental Sciences & Sustainability', year: 2, semester: 4, course_type: 'theory', faculty_name: 'Dr. P. Muthukumar' },
    { slot: 'Sub 6', code: 'CDC004', title: 'Career Development Centre - Level 2', year: 2, semester: 4, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3461', title: 'Database Management Systems Lab', year: 2, semester: 4, course_type: 'lab', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Lab 2', code: 'CS3481', title: 'Artificial Intelligence Laboratory', year: 2, semester: 4, course_type: 'lab', faculty_name: 'Dr. K. Ramesh' },

    // Year 3 - Sem 5
    { slot: 'Sub 1', code: 'CS3591', title: 'Computer Networks', year: 3, semester: 5, course_type: 'theory', faculty_name: 'Dr. S. Rajesh' },
    { slot: 'Sub 2', code: 'CS3501', title: 'Compiler Design', year: 3, semester: 5, course_type: 'theory', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Sub 3', code: 'CB3491', title: 'Cryptography and Cyber Security', year: 3, semester: 5, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 4', code: 'CS3551', title: 'Distributed Computing & Cloud', year: 3, semester: 5, course_type: 'theory', faculty_name: 'Prof. S. Vignesh' },
    { slot: 'Sub 5', code: 'PE3501', title: 'Professional Elective - I (Full Stack Dev)', year: 3, semester: 5, course_type: 'theory', faculty_name: 'Dr. B. Anitha', is_elective: true },
    { slot: 'Sub 6', code: 'CDC005', title: 'Career Development Centre - Level 3', year: 3, semester: 5, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3561', title: 'Compiler Design Laboratory', year: 3, semester: 5, course_type: 'lab', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Lab 2', code: 'CS3581', title: 'Computer Networks Laboratory', year: 3, semester: 5, course_type: 'lab', faculty_name: 'Dr. S. Rajesh' },

    // Year 3 - Sem 6
    { slot: 'Sub 1', code: 'CCS341', title: 'Mobile Application Development', year: 3, semester: 6, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 2', code: 'CS3691', title: 'Embedded Systems and IoT', year: 3, semester: 6, course_type: 'theory', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Sub 3', code: 'OE3601', title: 'Open Elective - I (Sensors & Actuators)', year: 3, semester: 6, course_type: 'theory', faculty_name: 'Prof. M. Selvam', is_elective: true },
    { slot: 'Sub 4', code: 'PE3601', title: 'Professional Elective - II (Big Data)', year: 3, semester: 6, course_type: 'theory', faculty_name: 'Dr. S. Rajesh', is_elective: true },
    { slot: 'Sub 5', code: 'PE3602', title: 'Professional Elective - III (Blockchain)', year: 3, semester: 6, course_type: 'theory', faculty_name: 'Prof. S. Vignesh', is_elective: true },
    { slot: 'Sub 6', code: 'CDC006', title: 'Career Development Centre - Level 4', year: 3, semester: 6, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3661', title: 'Mobile Application Development Lab', year: 3, semester: 6, course_type: 'lab', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Lab 2', code: 'CS3681', title: 'Internet of Things Laboratory', year: 3, semester: 6, course_type: 'lab', faculty_name: 'Prof. P. Vijay' },

    // Year 4 - Sem 7
    { slot: 'Sub 1', code: 'GE3791', title: 'Human Values and Ethics', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. P. Muthukumar' },
    { slot: 'Sub 2', code: 'MG3751', title: 'Total Quality Management', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. S. Vignesh' },
    { slot: 'Sub 3', code: 'PE3701', title: 'Professional Elective - IV (FinTech)', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. B. Anitha', is_elective: true },
    { slot: 'Sub 4', code: 'PE3702', title: 'Professional Elective - V (Deep Learning)', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. K. Ramesh', is_elective: true },
    { slot: 'Sub 5', code: 'OE3701', title: 'Open Elective - II (Electric & Hybrid Vehicles)', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. M. Selvam', is_elective: true },
    { slot: 'Sub 6', code: 'CDC007', title: 'CDC - Placement & Interview Prep', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3711', title: 'Project Work Phase - I', year: 4, semester: 7, course_type: 'lab', faculty_name: 'Dr. S. Rajesh' },
    { slot: 'Lab 2', code: 'CS3712', title: 'Cloud & DevOps Laboratory', year: 4, semester: 7, course_type: 'lab', faculty_name: 'Prof. P. Vijay' },

    // Year 4 - Sem 8
    { slot: 'Sub 1', code: 'PE3801', title: 'Professional Elective - VI (DevOps)', year: 4, semester: 8, course_type: 'theory', faculty_name: 'Dr. K. Ramesh', is_elective: true },
    { slot: 'Sub 2', code: 'OE3801', title: 'Open Elective - III (Disaster Management)', year: 4, semester: 8, course_type: 'theory', faculty_name: 'Dr. P. Muthukumar', is_elective: true },
    { slot: 'Sub 3', code: 'CDC008', title: 'CDC - Industry Readiness Certification', year: 4, semester: 8, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'CS3811', title: 'Project Work Phase - II (Final Capstone)', year: 4, semester: 8, course_type: 'lab', faculty_name: 'Dr. S. Rajesh' }
  ],

  ECE: [
    // Year 2 - Sem 3
    { slot: 'Sub 1', code: 'EC3354', title: 'Signals and Systems', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. A. Kumar' },
    { slot: 'Sub 2', code: 'EC3351', title: 'Control Systems', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. R. Soundar' },
    { slot: 'Sub 3', code: 'EC3352', title: 'Electronic Circuits - I', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. K. Deepa' },
    { slot: 'Sub 4', code: 'EC3353', title: 'Digital Systems Design', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. V. Karthik' },
    { slot: 'Sub 5', code: 'MA3355', title: 'Random Processes and Linear Algebra', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. M. Geetha' },
    { slot: 'Sub 6', code: 'CDC003', title: 'CDC - Core Aptitude', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'EC3361', title: 'Analog and Digital Circuits Lab', year: 2, semester: 3, course_type: 'lab', faculty_name: 'Prof. K. Deepa' },

    // Year 4 - Sem 7
    { slot: 'Sub 1', code: 'EC3701', title: 'VLSI Design', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. A. Kumar' },
    { slot: 'Sub 2', code: 'EC3702', title: 'Optical Communication', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. R. Soundar' },
    { slot: 'Sub 3', code: 'EC3703', title: 'Embedded Systems', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. K. Deepa' },
    { slot: 'Sub 4', code: 'EC3704', title: 'Digital Image Processing', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. V. Karthik' },
    { slot: 'Sub 5', code: 'EC3705', title: 'Wireless Sensor Networks', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. M. Sangeetha' },
    { slot: 'Sub 6', code: 'CDC007', title: 'CDC - Technical Interviews', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'EC3711', title: 'VLSI Design Laboratory', year: 4, semester: 7, course_type: 'lab', faculty_name: 'Prof. A. Kumar' },
    { slot: 'Lab 2', code: 'EC3712', title: 'Optical & Microwave Laboratory', year: 4, semester: 7, course_type: 'lab', faculty_name: 'Dr. R. Soundar' }
  ],

  MECH: [
    // Year 2 - Sem 3
    { slot: 'Sub 1', code: 'ME3351', title: 'Engineering Thermodynamics', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. N. Saravanan' },
    { slot: 'Sub 2', code: 'ME3391', title: 'Engineering Materials and Metallurgy', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. G. Balaji' },
    { slot: 'Sub 3', code: 'ME3392', title: 'Manufacturing Processes', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. C. Suresh' },
    { slot: 'Sub 4', code: 'ME3393', title: 'Thermal Engineering', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Sub 5', code: 'MA3351', title: 'Transforms and Partial Diff Equations', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Dr. M. Geetha' },
    { slot: 'Sub 6', code: 'CDC003', title: 'CDC - Industry Foundation', year: 2, semester: 3, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'ME3361', title: 'Manufacturing Technology Lab', year: 2, semester: 3, course_type: 'lab', faculty_name: 'Dr. C. Suresh' },

    // Year 4 - Sem 7
    { slot: 'Sub 1', code: 'ME3701', title: 'Power Plant Engineering', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. N. Saravanan' },
    { slot: 'Sub 2', code: 'ME3702', title: 'Mechatronics', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. G. Balaji' },
    { slot: 'Sub 3', code: 'ME3703', title: 'Automobile Engineering', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. C. Suresh' },
    { slot: 'Sub 4', code: 'ME3704', title: 'CAD/CAM & Automation', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Sub 5', code: 'ME3705', title: 'Robotics and Industrial Automation', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Dr. S. Mohan' },
    { slot: 'Sub 6', code: 'CDC007', title: 'CDC - Technical Placement', year: 4, semester: 7, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: 'ME3711', title: 'CAD/CAM Laboratory', year: 4, semester: 7, course_type: 'lab', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Lab 2', code: 'ME3712', title: 'Mechatronics Laboratory', year: 4, semester: 7, course_type: 'lab', faculty_name: 'Prof. G. Balaji' }
  ]
};

// Fallback generic subject generator for any branch, year, sem
export function generateGenericSemesterSubjects(deptCode: string, year: number, semester: number): StandardSubjectDefinition[] {
  const codePrefix = deptCode.slice(0, 2).toUpperCase() || 'GE';
  const semNum = semester || (year * 2 - 1);
  return [
    { slot: 'Sub 1', code: `${codePrefix}3${semNum}01`, title: `${deptCode} Core Systems - I`, year, semester: semNum, course_type: 'theory', faculty_name: 'Dr. K. Ramesh' },
    { slot: 'Sub 2', code: `${codePrefix}3${semNum}02`, title: `${deptCode} Core Systems - II`, year, semester: semNum, course_type: 'theory', faculty_name: 'Prof. M. Selvam' },
    { slot: 'Sub 3', code: `${codePrefix}3${semNum}03`, title: `${deptCode} Analysis & Design`, year, semester: semNum, course_type: 'theory', faculty_name: 'Dr. P. Muthukumar' },
    { slot: 'Sub 4', code: `${codePrefix}3${semNum}04`, title: `Total Quality & Engineering Ethics`, year, semester: semNum, course_type: 'theory', faculty_name: 'Prof. S. Vignesh' },
    { slot: 'Sub 5', code: `${codePrefix}3${semNum}05`, title: `Professional Elective - ${semNum}`, year, semester: semNum, course_type: 'theory', faculty_name: 'Dr. B. Anitha', is_elective: true },
    { slot: 'Sub 6', code: `CDC00${semNum}`, title: `Career Development Centre (CDC)`, year, semester: semNum, course_type: 'theory', faculty_name: 'Prof. T. Hariprasad' },
    { slot: 'Lab 1', code: `${codePrefix}3${semNum}71`, title: `${deptCode} Laboratory - I`, year, semester: semNum, course_type: 'lab', faculty_name: 'Prof. P. Vijay' },
    { slot: 'Lab 2', code: `${codePrefix}3${semNum}72`, title: `${deptCode} Practice Laboratory - II`, year, semester: semNum, course_type: 'lab', faculty_name: 'Dr. S. Rajesh' }
  ];
}
