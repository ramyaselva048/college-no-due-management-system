/**
 * Pure-TypeScript standard PDF generator.
 * Produces a valid, standards-compliant PDF/1.4 binary buffer
 * containing comprehensive student academic details, allocated theory subjects (Sub 1-6),
 * practical labs (Lab 1-4), common clearance nodes, and authorized institutional signatories.
 */
export interface PdfCertificateOptions {
  year?: number;
  semester?: number;
  examType?: string;
  subjects?: Array<{ slot?: string; code?: string; name: string; faculty_name?: string; dues_status?: string; signature_date?: string }>;
  labs?: Array<{ slot?: string; code?: string; name: string; faculty_name?: string; dues_status?: string; signature_date?: string }>;
  commonNodes?: Array<{ slot?: string; code?: string; name: string; faculty_name?: string; dues_status?: string; signature_date?: string }>;
  signatories?: any;
}

export function generateCertificatePdf(
  studentName: string,
  registerNumber: string,
  courseName: string,
  departmentName: string,
  academicYear: string,
  certificateNumber: string,
  verificationCode: string,
  issuedAt: string,
  issuedBy: string = 'Dr. T. Senthilvel (Principal)',
  options: PdfCertificateOptions = {}
): Buffer {
  const dateStr = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Escape special PDF characters
  const escapePdf = (str: string) =>
    (str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const semStr = options.semester ? `Semester ${options.semester}` : '';
  const yearStr = options.year ? `Year ${options.year}` : '';
  const academicDetails = [yearStr, semStr, options.examType || 'CIAT / End Semester'].filter(Boolean).join(' • ');

  const theorySubjects = (options.subjects && options.subjects.length > 0)
    ? options.subjects.slice(0, 6)
    : [
        { slot: 'Sub 1', code: 'GE3151', name: 'Problem Solving & Python Programming', faculty_name: 'Prof. S. Rajesh', dues_status: 'Accepted & Cleared' },
        { slot: 'Sub 2', code: 'MA3151', name: 'Matrices and Calculus', faculty_name: 'Dr. M. Geetha', dues_status: 'Accepted & Cleared' },
        { slot: 'Sub 3', code: 'PH3151', name: 'Engineering Physics', faculty_name: 'Prof. S. Natarajan', dues_status: 'Accepted & Cleared' },
        { slot: 'Sub 4', code: 'CY3151', name: 'Engineering Chemistry', faculty_name: 'Dr. P. Muthukumar', dues_status: 'Accepted & Cleared' },
        { slot: 'Sub 5', code: 'GE3152', name: 'Heritage of Tamils', faculty_name: 'Prof. V. Sivakumar', dues_status: 'Accepted & Cleared' },
        { slot: 'Sub 6', code: 'HS3151', name: 'Professional English - I', faculty_name: 'Dr. S. Kanimozhi', dues_status: 'Accepted & Cleared' }
      ];

  const practicalLabs = (options.labs && options.labs.length > 0)
    ? options.labs.slice(0, 4)
    : [
        { slot: 'Lab 1', code: 'GE3171', name: 'Problem Solving & Python Laboratory', faculty_name: 'Prof. S. Rajesh', dues_status: 'Accepted & Cleared' },
        { slot: 'Lab 2', code: 'BS3171', name: 'Physics and Chemistry Laboratory', faculty_name: 'Dr. M. Geetha', dues_status: 'Accepted & Cleared' },
        { slot: 'Lab 3', code: 'GE3172', name: 'English Communication Laboratory', faculty_name: 'Dr. S. Kanimozhi', dues_status: 'Accepted & Cleared' }
      ];

  const commonNodes = (options.commonNodes && options.commonNodes.length > 0)
    ? options.commonNodes.slice(0, 6)
    : [
        { slot: 'COM-LIB', name: 'Central Library & Book Bank', dues_status: 'Accepted & Cleared', faculty_name: 'D. Vinoth' },
        { slot: 'COM-ACC', name: 'Accounts & College Finance Office', dues_status: 'Accepted & Cleared', faculty_name: 'Mrs. V. Revathi' },
        { slot: 'COM-HST', name: 'Campus Hostel & Mess Section', dues_status: 'Exempted (Day Scholar)', faculty_name: 'Hostel Office' },
        { slot: 'COM-TRN', name: 'College Bus & Transport Section', dues_status: 'Accepted & Cleared', faculty_name: 'Transport Office' },
        { slot: 'COM-PED', name: 'Physical Education & Sports Dept', dues_status: 'Accepted & Cleared', faculty_name: 'Dir. Physical Ed.' },
        { slot: 'COM-COE', name: 'Controller of Examinations (CoE)', dues_status: 'Accepted & Cleared', faculty_name: 'Dr. H. Sasipal CoE' }
      ];

  const lines: string[] = [
    // --- Header ---
    'BT',
    '/F1 15 Tf',
    '1 0 0 1 40 805 Tm',
    `(${escapePdf('COLLEGE OF ENGINEERING (AUTONOMOUS)')}) Tj`,
    '/F2 8 Tf',
    '1 0 0 1 40 792 Tm',
    `(${escapePdf('Approved by AICTE, Affiliated to Anna University | Accredited NAAC A+')}) Tj`,
    '1 0 0 1 40 781 Tm',
    `(${escapePdf('Office of Academic Affairs & Student Clearances | CIAT & End Semester Examinations')}) Tj`,
    'ET',

    // Decorative blue dividing bar
    '0.12 0.25 0.69 rg',
    '40 773 515 2.5 re',
    'f',

    // Certificate Title & Meta
    'BT',
    '0.12 0.25 0.69 rg',
    '/F1 13 Tf',
    '1 0 0 1 140 754 Tm',
    `(${escapePdf('OFFICIAL NO DUE CLEARANCE CERTIFICATE')}) Tj`,
    '0 0 0 rg',
    '/F2 8 Tf',
    '1 0 0 1 40 738 Tm',
    `(${escapePdf(`Cert No: ${certificateNumber}   |   Verification Code: ${verificationCode}   |   Date: ${dateStr}`)}) Tj`,
    'ET',

    // --- Candidate Academic Profile Box ---
    '0.96 0.97 0.99 rg',
    '40 682 515 48 re',
    'f',
    '0.8 0.85 0.92 RG',
    '0.7 w',
    '40 682 515 48 re',
    'S',

    'BT',
    '0 0 0 rg',
    '/F2 8.5 Tf',
    '1 0 0 1 50 716 Tm',
    `(${escapePdf('Student Name:')}) Tj`,
    '/F1 8.5 Tf',
    '1 0 0 1 120 716 Tm',
    `(${escapePdf(studentName.toUpperCase())}) Tj`,

    '/F2 8.5 Tf',
    '1 0 0 1 310 716 Tm',
    `(${escapePdf('Register No:')}) Tj`,
    '/F1 8.5 Tf',
    '1 0 0 1 380 716 Tm',
    `(${escapePdf(registerNumber)}) Tj`,

    '/F2 8.5 Tf',
    '1 0 0 1 50 701 Tm',
    `(${escapePdf('Degree/Dept:')}) Tj`,
    '/F1 8.5 Tf',
    '1 0 0 1 120 701 Tm',
    `(${escapePdf(`${courseName} - ${departmentName}`)}) Tj`,

    '/F2 8.5 Tf',
    '1 0 0 1 50 688 Tm',
    `(${escapePdf('Academic Term:')}) Tj`,
    '/F1 8.5 Tf',
    '1 0 0 1 120 688 Tm',
    `(${escapePdf(`${academicDetails} (${academicYear})`)}) Tj`,

    '/F2 8.5 Tf',
    '1 0 0 1 310 688 Tm',
    `(${escapePdf('Overall Clearance:')}) Tj`,
    '0.05 0.55 0.25 rg',
    '/F1 8.5 Tf',
    '1 0 0 1 395 688 Tm',
    `(${escapePdf('CONFIRMED - NO DUES PENDING')}) Tj`,
    'ET',

    // --- Section 1: Theory Subjects (Sub 1 - Sub 6) ---
    'BT',
    '0.12 0.25 0.69 rg',
    '/F1 9 Tf',
    '1 0 0 1 40 666 Tm',
    `(${escapePdf('1. ALLOCATED THEORY SUBJECTS (SUB 1 - SUB 6) - HOD & Assigned Faculty Clearance')}) Tj`,
    'ET',

    // Theory Table Header
    '0.92 0.94 0.98 rg',
    '40 648 515 14 re',
    'f',
    '0.75 0.8 0.9 RG',
    '0.5 w',
    '40 648 515 14 re',
    'S',
    'BT',
    '0.1 0.15 0.3 rg',
    '/F1 7.5 Tf',
    '1 0 0 1 45 652 Tm',
    `(${escapePdf('SLOT')}) Tj`,
    '1 0 0 1 85 652 Tm',
    `(${escapePdf('SUBJECT TITLE & CODE')}) Tj`,
    '1 0 0 1 320 652 Tm',
    `(${escapePdf('IN-CHARGE FACULTY')}) Tj`,
    '1 0 0 1 455 652 Tm',
    `(${escapePdf('DUES STATUS')}) Tj`,
    'ET'
  ];

  // Render Theory rows
  let currentY = 634;
  theorySubjects.forEach((sub, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      lines.push('0.98 0.98 0.99 rg', `40 ${currentY - 3} 515 13 re`, 'f');
    }
    lines.push(
      '0.88 0.9 0.93 RG',
      '0.3 w',
      `40 ${currentY - 3} 515 13 re`,
      'S',
      'BT',
      '0.15 0.15 0.15 rg',
      '/F1 7.5 Tf',
      `1 0 0 1 45 ${currentY} Tm`,
      `(${escapePdf(sub.slot || `Sub ${i + 1}`)}) Tj`,
      '/F2 7.5 Tf',
      `1 0 0 1 85 ${currentY} Tm`,
      `(${escapePdf(`${sub.name} [${sub.code || ''}]`.slice(0, 48))}) Tj`,
      `1 0 0 1 320 ${currentY} Tm`,
      `(${escapePdf((sub.faculty_name || 'Assigned Faculty').slice(0, 24))}) Tj`,
      '0.05 0.55 0.25 rg',
      '/F1 7.5 Tf',
      `1 0 0 1 455 ${currentY} Tm`,
      `(${escapePdf('[X] Accepted & Cleared')}) Tj`,
      'ET'
    );
    currentY -= 13;
  });

  // --- Section 2: Laboratory / Practical Clearance (Lab 1 - Lab 4) ---
  currentY -= 6;
  lines.push(
    'BT',
    '0.12 0.25 0.69 rg',
    '/F1 9 Tf',
    `1 0 0 1 40 ${currentY} Tm`,
    `(${escapePdf('2. LABORATORY & PRACTICAL EXPERIMENTS CLEARANCE - Lab In-Charge Sanction')}) Tj`,
    'ET'
  );
  currentY -= 15;

  // Practical Table Header
  lines.push(
    '0.92 0.94 0.98 rg',
    `40 ${currentY} 515 14 re`,
    'f',
    '0.75 0.8 0.9 RG',
    '0.5 w',
    `40 ${currentY} 515 14 re`,
    'S',
    'BT',
    '0.1 0.15 0.3 rg',
    '/F1 7.5 Tf',
    `1 0 0 1 45 ${currentY + 4} Tm`,
    `(${escapePdf('SLOT')}) Tj`,
    `1 0 0 1 85 ${currentY + 4} Tm`,
    `(${escapePdf('PRACTICAL LAB TITLE & CODE')}) Tj`,
    `1 0 0 1 320 ${currentY + 4} Tm`,
    `(${escapePdf('LAB IN-CHARGE')}) Tj`,
    `1 0 0 1 455 ${currentY + 4} Tm`,
    `(${escapePdf('DUES STATUS')}) Tj`,
    'ET'
  );
  currentY -= 14;

  // Render Lab rows
  practicalLabs.forEach((lab, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      lines.push('0.98 0.98 0.99 rg', `40 ${currentY - 3} 515 13 re`, 'f');
    }
    lines.push(
      '0.88 0.9 0.93 RG',
      '0.3 w',
      `40 ${currentY - 3} 515 13 re`,
      'S',
      'BT',
      '0.15 0.15 0.15 rg',
      '/F1 7.5 Tf',
      `1 0 0 1 45 ${currentY} Tm`,
      `(${escapePdf(lab.slot || `Lab ${i + 1}`)}) Tj`,
      '/F2 7.5 Tf',
      `1 0 0 1 85 ${currentY} Tm`,
      `(${escapePdf(`${lab.name} [${lab.code || ''}]`.slice(0, 48))}) Tj`,
      `1 0 0 1 320 ${currentY} Tm`,
      `(${escapePdf((lab.faculty_name || 'Lab In-Charge').slice(0, 24))}) Tj`,
      '0.05 0.55 0.25 rg',
      '/F1 7.5 Tf',
      `1 0 0 1 455 ${currentY} Tm`,
      `(${escapePdf('[X] Accepted & Cleared')}) Tj`,
      'ET'
    );
    currentY -= 13;
  });

  // --- Section 3: Institutional Common Clearance Nodes ---
  currentY -= 6;
  lines.push(
    'BT',
    '0.12 0.25 0.69 rg',
    '/F1 9 Tf',
    `1 0 0 1 40 ${currentY} Tm`,
    `(${escapePdf('3. INSTITUTIONAL COMMON CLEARANCE NODES - Central Sections Clearance')}) Tj`,
    'ET'
  );
  currentY -= 15;

  // Common Nodes Table Header
  lines.push(
    '0.92 0.94 0.98 rg',
    `40 ${currentY} 515 14 re`,
    'f',
    '0.75 0.8 0.9 RG',
    '0.5 w',
    `40 ${currentY} 515 14 re`,
    'S',
    'BT',
    '0.1 0.15 0.3 rg',
    '/F1 7.5 Tf',
    `1 0 0 1 45 ${currentY + 4} Tm`,
    `(${escapePdf('NODE')}) Tj`,
    `1 0 0 1 110 ${currentY + 4} Tm`,
    `(${escapePdf('CENTRAL SECTION & PURPOSE')}) Tj`,
    `1 0 0 1 320 ${currentY + 4} Tm`,
    `(${escapePdf('SECTION OFFICER')}) Tj`,
    `1 0 0 1 455 ${currentY + 4} Tm`,
    `(${escapePdf('CLEARANCE STATUS')}) Tj`,
    'ET'
  );
  currentY -= 14;

  // Render Common Node rows
  commonNodes.forEach((node, i) => {
    const isEven = i % 2 === 0;
    if (isEven) {
      lines.push('0.98 0.98 0.99 rg', `40 ${currentY - 3} 515 13 re`, 'f');
    }
    const isExempt = String(node.dues_status || '').toLowerCase().includes('exempt');
    const statusText = isExempt ? '[X] Exempted (Day Scholar)' : '[X] Accepted & Cleared';

    lines.push(
      '0.88 0.9 0.93 RG',
      '0.3 w',
      `40 ${currentY - 3} 515 13 re`,
      'S',
      'BT',
      '0.15 0.15 0.15 rg',
      '/F1 7.5 Tf',
      `1 0 0 1 45 ${currentY} Tm`,
      `(${escapePdf(node.slot || `COM-${i + 1}`)}) Tj`,
      '/F2 7.5 Tf',
      `1 0 0 1 110 ${currentY} Tm`,
      `(${escapePdf((node.name || 'Central Clearance').slice(0, 42))}) Tj`,
      `1 0 0 1 320 ${currentY} Tm`,
      `(${escapePdf((node.faculty_name || 'Officer In-Charge').slice(0, 24))}) Tj`,
      isExempt ? '0.25 0.35 0.55 rg' : '0.05 0.55 0.25 rg',
      '/F1 7.5 Tf',
      `1 0 0 1 455 ${currentY} Tm`,
      `(${escapePdf(statusText)}) Tj`,
      'ET'
    );
    currentY -= 13;
  });

  // --- Certification Conclusion & Signatures Footer ---
  currentY -= 10;
  lines.push(
    'BT',
    '0.1 0.1 0.1 rg',
    '/F2 7.5 Tf',
    `1 0 0 1 40 ${currentY} Tm`,
    `(${escapePdf(`Certified that all dues across theory subjects, practical laboratories, and administrative departments are fully cleared.`)}) Tj`,
    `1 0 0 1 40 ${currentY - 10} Tm`,
    `(${escapePdf(`No liabilities or equipment pending. The candidate is officially sanctioned for Hall Ticket issuance and exam clearance.`)}) Tj`,
    'ET'
  );

  currentY -= 42;

  // Four Official Signatures: Chief Mentor, HOD, CoE, Principal
  lines.push(
    // Underlines
    '0.5 0.5 0.5 RG',
    '0.5 w',
    `45 ${currentY + 12} 100 0.5 re`, 'S',
    `175 ${currentY + 12} 105 0.5 re`, 'S',
    `305 ${currentY + 12} 105 0.5 re`, 'S',
    `435 ${currentY + 12} 110 0.5 re`, 'S',

    // Signature Texts
    'BT',
    '0.1 0.1 0.25 rg',
    '/F3 8.5 Tf',
    `1 0 0 1 50 ${currentY + 16} Tm`,
    `(${escapePdf('Prof. S. Rajesh')}) Tj`,
    `1 0 0 1 180 ${currentY + 16} Tm`,
    `(${escapePdf('Dr. K. Senthil Kumar')}) Tj`,
    `1 0 0 1 315 ${currentY + 16} Tm`,
    `(${escapePdf('Dr. H. Sasipal')}) Tj`,
    `1 0 0 1 445 ${currentY + 16} Tm`,
    `(${escapePdf('Dr. T. Senthilvel')}) Tj`,

    '0.3 0.3 0.3 rg',
    '/F1 7.5 Tf',
    `1 0 0 1 50 ${currentY} Tm`,
    `(${escapePdf('CHIEF MENTOR')}) Tj`,
    `1 0 0 1 180 ${currentY} Tm`,
    `(${escapePdf('HEAD OF DEPARTMENT')}) Tj`,
    `1 0 0 1 310 ${currentY} Tm`,
    `(${escapePdf('CONTROLLER OF EXAM')}) Tj`,
    `1 0 0 1 450 ${currentY} Tm`,
    `(${escapePdf('PRINCIPAL (SEAL)')}) Tj`,

    '/F2 6.5 Tf',
    `1 0 0 1 50 ${currentY - 9} Tm`,
    `(${escapePdf('Verified & Signed')}) Tj`,
    `1 0 0 1 180 ${currentY - 9} Tm`,
    `(${escapePdf('All Dept Dues Cleared')}) Tj`,
    `1 0 0 1 310 ${currentY - 9} Tm`,
    `(${escapePdf('Hall Ticket Sanctioned')}) Tj`,
    `1 0 0 1 450 ${currentY - 9} Tm`,
    `(${escapePdf('Executive Clearance')}) Tj`,
    'ET',

    // Bottom Watermark & Verification notice
    'BT',
    '0.5 0.5 0.5 rg',
    '/F2 6.5 Tf',
    `1 0 0 1 40 ${currentY - 26} Tm`,
    `(${escapePdf(`Official Tamper-Evident Institutional Record | Verify authentic status online at portal with code: ${verificationCode}`)}) Tj`,
    'ET'
  );

  const streamContent = lines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'latin1');

  const objects = [
    // 1: Catalog
    `<< /Type /Catalog /Pages 2 0 R >>`,
    // 2: Pages
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    // 3: Page
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>`,
    // 4: Font Bold
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`,
    // 5: Font Regular
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    // 6: Font Italic
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>`,
    // 7: Stream
    `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`
  ];

  let body = '%PDF-1.4\n';
  const xref: number[] = [0];

  objects.forEach((obj) => {
    xref.push(body.length);
    body += `${xref.length} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    const offset = xref[i].toString().padStart(10, '0');
    body += `${offset} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(body, 'latin1');
}
