/**
 * Minimal pure-TypeScript standard PDF generator.
 * Produces a valid, standards-compliant PDF/1.4 binary buffer
 * containing student details, institutional clearance badge, and verification code.
 */
export function generateCertificatePdf(
  studentName: string,
  registerNumber: string,
  courseName: string,
  departmentName: string,
  academicYear: string,
  certificateNumber: string,
  verificationCode: string,
  issuedAt: string,
  issuedBy: string = 'Institutional Administrator'
): Buffer {
  const dateStr = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Escape special PDF characters
  const escapePdf = (str: string) =>
    (str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

  const lines = [
    'BT',
    '/F1 17 Tf',
    '1 0 0 1 50 780 Tm',
    `(${escapePdf('COLLEGE OF ENGINEERING (AUTONOMOUS)')}) Tj`,
    '/F2 9 Tf',
    '1 0 0 1 50 762 Tm',
    `(${escapePdf('Approved by AICTE, Affiliated to Anna University | NAAC A+')}) Tj`,
    '1 0 0 1 50 750 Tm',
    `(${escapePdf('Student No Due Form & Clearance Administration - CIAT / End Semester')}) Tj`,
    'ET',

    // Decorative blue dividing bar
    '0.12 0.25 0.69 rg',
    '50 740 500 3 re',
    'f',

    // Certificate Title
    'BT',
    '0.12 0.25 0.69 rg',
    '/F1 16 Tf',
    '1 0 0 1 120 710 Tm',
    `(${escapePdf('OFFICIAL NO DUE CLEARANCE CERTIFICATE')}) Tj`,
    '0 0 0 rg',
    '/F3 9 Tf',
    '1 0 0 1 140 695 Tm',
    `(${escapePdf('Issued pursuant to institutional clearance protocol')}) Tj`,
    'ET',

    // Meta Box
    '0.96 0.97 0.98 rg',
    '50 645 500 35 re',
    'f',
    '0.8 0.84 0.88 RG',
    '0.5 w',
    '50 645 500 35 re',
    'S',

    'BT',
    '0 0 0 rg',
    '/F1 10 Tf',
    '1 0 0 1 65 660 Tm',
    `(${escapePdf(`Certificate No: ${certificateNumber}`)}) Tj`,
    '1 0 0 1 360 660 Tm',
    `(${escapePdf(`Issue Date: ${dateStr}`)}) Tj`,
    'ET',

    // Candidate Details Box
    '0.95 0.96 0.98 rg',
    '50 515 500 115 re',
    'f',
    '0.8 0.84 0.88 RG',
    '50 515 500 115 re',
    'S',

    'BT',
    '0 0 0 rg',
    '/F2 10 Tf',
    '1 0 0 1 70 605 Tm',
    `(${escapePdf('Student Name:')}) Tj`,
    '/F1 10 Tf',
    '1 0 0 1 160 605 Tm',
    `(${escapePdf(studentName.toUpperCase())}) Tj`,

    '/F2 10 Tf',
    '1 0 0 1 340 605 Tm',
    `(${escapePdf('Register Number:')}) Tj`,
    '/F1 10 Tf',
    '1 0 0 1 440 605 Tm',
    `(${escapePdf(registerNumber)}) Tj`,

    '/F2 10 Tf',
    '1 0 0 1 70 575 Tm',
    `(${escapePdf('Course/Program:')}) Tj`,
    '/F1 10 Tf',
    '1 0 0 1 160 575 Tm',
    `(${escapePdf(courseName)}) Tj`,

    '/F2 10 Tf',
    '1 0 0 1 70 545 Tm',
    `(${escapePdf('Department:')}) Tj`,
    '/F1 10 Tf',
    '1 0 0 1 160 545 Tm',
    `(${escapePdf(departmentName)}) Tj`,

    '/F2 10 Tf',
    '1 0 0 1 340 545 Tm',
    `(${escapePdf('Status:')}) Tj`,
    '0.08 0.64 0.29 rg',
    '/F1 10 Tf',
    '1 0 0 1 400 545 Tm',
    `(${escapePdf('ALL DUES CLEARED')}) Tj`,
    'ET',

    // Certification statement
    'BT',
    '0.1 0.1 0.1 rg',
    '/F2 10 Tf',
    '1 0 0 1 50 480 Tm',
    `(${escapePdf(`This is to formally certify that ${studentName} (Reg No: ${registerNumber}),`)} ) Tj`,
    '1 0 0 1 50 465 Tm',
    `(${escapePdf(`student of ${courseName}, has cleared all institutional dues across all`)} ) Tj`,
    '1 0 0 1 50 450 Tm',
    `(${escapePdf('departments including Central Library, Laboratory, Accounts, Hostel & Sports.')} ) Tj`,
    '1 0 0 1 50 435 Tm',
    `(${escapePdf('There are NO OUTSTANDING DUES OR LIABILITIES pending against the student.')} ) Tj`,
    'ET',

    // Department checklist box
    '0.94 0.99 0.96 rg',
    '50 350 500 65 re',
    'f',
    '0.52 0.94 0.67 RG',
    '1 w',
    '50 350 500 65 re',
    'S',

    'BT',
    '0.08 0.5 0.23 rg',
    '/F1 9 Tf',
    '1 0 0 1 70 395 Tm',
    `(${escapePdf('[X] Central Library')}) Tj`,
    '1 0 0 1 200 395 Tm',
    `(${escapePdf('[X] Accounts & Finance')}) Tj`,
    '1 0 0 1 350 395 Tm',
    `(${escapePdf('[X] CSE Department')}) Tj`,

    '1 0 0 1 70 370 Tm',
    `(${escapePdf('[X] Computer Laboratories')}) Tj`,
    '1 0 0 1 200 370 Tm',
    `(${escapePdf('[X] Hostel & Mess')}) Tj`,
    '1 0 0 1 350 370 Tm',
    `(${escapePdf('[X] Transport & Sports')}) Tj`,
    'ET',

    // Verification Code Block
    'BT',
    '0 0 0 rg',
    '/F2 8 Tf',
    '1 0 0 1 50 280 Tm',
    `(${escapePdf('Digital Verification Code:')}) Tj`,
    '0.12 0.25 0.69 rg',
    '/F1 10 Tf',
    '1 0 0 1 50 265 Tm',
    `(${escapePdf(verificationCode)}) Tj`,
    '0.4 0.4 0.4 rg',
    '/F2 7 Tf',
    '1 0 0 1 50 250 Tm',
    `(${escapePdf(`Issued By: ${issuedBy}`)}) Tj`,
    '1 0 0 1 50 238 Tm',
    `(${escapePdf('Verify authentic status at public college portal.')}) Tj`,
    'ET',

    // Signatures
    '0.4 0.4 0.4 RG',
    '0.5 w',
    '340 270 90 0.5 re',
    'S',
    '450 270 90 0.5 re',
    'S',

    'BT',
    '0 0 0 rg',
    '/F2 8 Tf',
    '1 0 0 1 350 255 Tm',
    `(${escapePdf('Dean (Academics)')}) Tj`,
    '1 0 0 1 470 255 Tm',
    `(${escapePdf('Registrar')}) Tj`,
    'ET',

    // Disclaimer
    'BT',
    '0.6 0.6 0.6 rg',
    '/F2 7 Tf',
    '1 0 0 1 75 180 Tm',
    `(${escapePdf('Official digitally generated certificate by College No Due Management System.')}) Tj`,
    'ET'
  ];

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

  objects.forEach((obj, idx) => {
    xref.push(body.length);
    body += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
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
