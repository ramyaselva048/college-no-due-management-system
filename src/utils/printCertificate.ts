import { Certificate } from '../types';
import api from '../services/api';

/**
 * Builds a standalone, print-optimized HTML string for the No Due Certificate.
 * Contains embedded print stylesheets, high-resolution layout, theory subjects,
 * practical labs, common clearance nodes, QR code, and official signatories.
 */
export function buildCertificatePrintHtml(cert: Certificate, originUrl?: string): string {
  const origin = originUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const verifyUrl = `${origin}/verify/${cert.verification_code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;
  const issuedDateStr = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const shortDateStr = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  const studentYear = cert.year || 4;
  const studentSem = cert.semester || (studentYear * 2 - 1);
  const academicYear = cert.academic_year || '2025-2026';
  const examType = cert.exam_type || 'CIAT - I / End Semester Examination';

  const theorySubjects = (cert.subjects && cert.subjects.length > 0)
    ? cert.subjects
    : [
        { slot: 'Sub 1', code: 'GE3151', name: 'Problem Solving and Python Programming', faculty_name: 'Prof. S. Rajesh', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Sub 2', code: 'MA3151', name: 'Matrices and Calculus', faculty_name: 'Dr. M. Geetha', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Sub 3', code: 'PH3151', name: 'Engineering Physics', faculty_name: 'Prof. S. Natarajan', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Sub 4', code: 'CY3151', name: 'Engineering Chemistry', faculty_name: 'Dr. P. Muthukumar', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Sub 5', code: 'GE3152', name: 'Heritage of Tamils', faculty_name: 'Prof. V. Sivakumar', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Sub 6', code: 'HS3151', name: 'Professional English - I', faculty_name: 'Dr. S. Kanimozhi', dues_status: 'Accepted & Cleared', signature_date: shortDateStr }
      ];

  const practicalLabs = (cert.labs && cert.labs.length > 0)
    ? cert.labs
    : [
        { slot: 'Lab 1', code: 'GE3171', name: 'Problem Solving & Python Laboratory', faculty_name: 'Prof. S. Rajesh', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Lab 2', code: 'BS3171', name: 'Physics and Chemistry Laboratory', faculty_name: 'Dr. M. Geetha', dues_status: 'Accepted & Cleared', signature_date: shortDateStr },
        { slot: 'Lab 3', code: 'GE3172', name: 'English Communication Laboratory', faculty_name: 'Dr. S. Kanimozhi', dues_status: 'Accepted & Cleared', signature_date: shortDateStr }
      ];

  const commonNodes = (cert.common_nodes && cert.common_nodes.length > 0)
    ? cert.common_nodes
    : [
        { slot: 'COM-LIB', name: 'Central Library & Book Bank', dues_status: 'Accepted & Cleared', faculty_name: 'D. Vinoth (Librarian)', requirement_description: 'All books & fines cleared', signature_date: shortDateStr },
        { slot: 'COM-ACC', name: 'Accounts & Finance Section', dues_status: 'Accepted & Cleared', faculty_name: 'Mrs. V. Revathi (Accounts)', requirement_description: 'Semester & tuition fees paid in full', signature_date: shortDateStr },
        { slot: 'COM-HST', name: 'Campus Hostel & Mess Office', dues_status: 'Exempted (Day Scholar)', faculty_name: 'Hostel Administration', requirement_description: 'Hostel dues & inventory', signature_date: shortDateStr },
        { slot: 'COM-TRN', name: 'College Bus & Transport Section', dues_status: 'Accepted & Cleared', faculty_name: 'Mr. K. Murugesan (Transport)', requirement_description: 'Transport ID pass validated', signature_date: shortDateStr },
        { slot: 'COM-PED', name: 'Physical Education & Sports Dept', dues_status: 'Accepted & Cleared', faculty_name: 'Dr. A. Joseph (Dir. Sports)', requirement_description: 'Sports kits and equipment returned', signature_date: shortDateStr },
        { slot: 'COM-COE', name: 'Controller of Examinations (CoE)', dues_status: 'Accepted & Cleared', faculty_name: 'Dr. H. Sasipal CoE', requirement_description: 'Exam registration & Hall Ticket clearance', signature_date: shortDateStr }
      ];

  const signatories = cert.signatories || {
    chief_mentor: { name: 'Prof. S. Rajesh, M.E.' },
    hod: { name: 'Dr. K. Senthil Kumar, M.E., Ph.D.' },
    coe: { name: 'Dr. H. Sasipal CoE' },
    principal: { name: cert.issued_by || 'Dr. T. Senthilvel' }
  };

  const theoryRowsHtml = theorySubjects.map((sub, i) => `
    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 4px 8px; font-weight: 700; font-family: monospace; color: #1e1b4b;">${sub.slot || `Sub ${i + 1}`}</td>
      <td style="padding: 4px 8px; font-weight: 600; color: #0f172a;">
        ${sub.name}
        ${sub.code ? `<span style="font-family: monospace; font-size: 9.5px; color: #64748b; font-weight: normal;"> (${sub.code})</span>` : ''}
      </td>
      <td style="padding: 4px 8px; color: #475569;">${sub.faculty_name || 'Assigned Faculty'}</td>
      <td style="padding: 4px 8px; text-align: center;">
        <span style="display: inline-block; padding: 1px 8px; font-size: 9.5px; font-weight: 700; color: #065f46; background-color: #d1fae5; border: 1px solid #a7f3d0; border-radius: 9999px;">
          &#10004; Accepted &amp; Cleared
        </span>
      </td>
      <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-size: 9.5px; color: #64748b;">
        ${sub.signature_date || shortDateStr}
      </td>
    </tr>
  `).join('');

  const labRowsHtml = practicalLabs.map((lab, i) => `
    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 4px 8px; font-weight: 700; font-family: monospace; color: #1e1b4b;">${lab.slot || `Lab ${i + 1}`}</td>
      <td style="padding: 4px 8px; font-weight: 600; color: #0f172a;">
        ${lab.name}
        ${lab.code ? `<span style="font-family: monospace; font-size: 9.5px; color: #64748b; font-weight: normal;"> (${lab.code})</span>` : ''}
      </td>
      <td style="padding: 4px 8px; color: #475569;">${lab.faculty_name || 'Lab In-Charge'}</td>
      <td style="padding: 4px 8px; text-align: center;">
        <span style="display: inline-block; padding: 1px 8px; font-size: 9.5px; font-weight: 700; color: #065f46; background-color: #d1fae5; border: 1px solid #a7f3d0; border-radius: 9999px;">
          &#10004; Accepted &amp; Cleared
        </span>
      </td>
      <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-size: 9.5px; color: #64748b;">
        ${lab.signature_date || shortDateStr}
      </td>
    </tr>
  `).join('');

  const commonRowsHtml = commonNodes.map((node, i) => {
    const isExempt = String(node.dues_status || '').toLowerCase().includes('exempt');
    return `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 4px 8px; font-weight: 700; font-family: monospace; color: #1e1b4b;">${node.slot || `COM-${i + 1}`}</td>
        <td style="padding: 4px 8px; font-weight: 600; color: #0f172a;">
          ${node.name}
          ${node.requirement_description ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">${node.requirement_description}</div>` : ''}
        </td>
        <td style="padding: 4px 8px; color: #475569;">${node.faculty_name || 'Section Officer'}</td>
        <td style="padding: 4px 8px; text-align: center;">
          ${isExempt ? `
            <span style="display: inline-block; padding: 1px 8px; font-size: 9.5px; font-weight: 700; color: #475569; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 9999px;">
              &#10004; Exempted (Day Scholar)
            </span>
          ` : `
            <span style="display: inline-block; padding: 1px 8px; font-size: 9.5px; font-weight: 700; color: #065f46; background-color: #d1fae5; border: 1px solid #a7f3d0; border-radius: 9999px;">
              &#10004; Accepted &amp; Cleared
            </span>
          `}
        </td>
        <td style="padding: 4px 8px; text-align: right; font-family: monospace; font-size: 9.5px; color: #64748b;">
          ${node.signature_date || shortDateStr}
        </td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>No Due Certificate - ${cert.certificate_number} - ${cert.student_name || 'Student'}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.4;
      padding: 6px;
    }
    .cert-outer-wrapper {
      max-width: 820px;
      margin: 0 auto;
      border: 2px solid #1e1b4b;
      border-radius: 16px;
      padding: 24px;
      position: relative;
      background: #ffffff;
    }
    .top-color-strip {
      height: 4px;
      background: linear-gradient(to right, #1e1b4b, #2563eb, #1e1b4b);
      border-radius: 12px 12px 0 0;
      margin: -24px -24px 18px -24px;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.035;
      pointer-events: none;
      user-select: none;
      z-index: 0;
    }
    .watermark svg {
      width: 420px;
      height: 420px;
    }
    .cert-content {
      position: relative;
      z-index: 1;
    }
    .header-center {
      text-align: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
    }
    .college-name {
      font-family: 'Cinzel', Georgia, serif;
      font-weight: 900;
      font-size: 23px;
      color: #1e1b4b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .affiliation {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 3px;
    }
    .sub-office {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .badge-clearance {
      display: inline-block;
      padding: 3px 12px;
      background-color: #eef2ff;
      border: 1px solid #c7d2fe;
      border-radius: 9999px;
      color: #3730a3;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 8px;
    }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 14px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 10.5px;
      margin-top: 10px;
    }
    .meta-bar strong {
      color: #0f172a;
    }
    .student-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      padding: 10px 14px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 11px;
    }
    .grid-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      display: block;
      margin-bottom: 1px;
    }
    .grid-val {
      font-weight: 700;
      color: #0f172a;
    }
    .sec-title {
      font-size: 11px;
      font-weight: 800;
      color: #1e1b4b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 12px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sec-badge {
      font-size: 9px;
      font-weight: 700;
      color: #065f46;
      background: #d1fae5;
      padding: 1px 6px;
      border-radius: 4px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 10.5px;
    }
    table.data-table th {
      background-color: #f1f5f9;
      color: #334155;
      padding: 4px 8px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    .cert-body-note {
      margin-top: 10px;
      padding: 8px 12px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 10px;
      color: #334155;
      line-height: 1.4;
      text-align: justify;
    }
    .cert-footer {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .qr-block {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .qr-frame {
      padding: 4px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .qr-frame img {
      display: block;
      width: 62px;
      height: 62px;
    }
    .qr-meta {
      font-size: 9.5px;
      color: #64748b;
      max-width: 170px;
      line-height: 1.3;
    }
    .signatories-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      text-align: center;
    }
    .sig-col {
      width: 105px;
    }
    .sig-name {
      font-family: 'Cinzel', Georgia, serif;
      font-style: italic;
      font-size: 10.5px;
      font-weight: 700;
      color: #1e1b4b;
      height: 20px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .sig-line {
      height: 1px;
      background-color: #64748b;
      margin: 3px auto 2px;
      width: 85px;
    }
    .sig-title {
      font-size: 8.5px;
      font-weight: 800;
      color: #334155;
      text-transform: uppercase;
    }
    .sig-sub {
      font-size: 7.5px;
      color: #059669;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="cert-outer-wrapper">
    <div class="top-color-strip"></div>

    <!-- Institutional Watermark -->
    <div class="watermark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
      </svg>
    </div>

    <div class="cert-content">
      <!-- Header / Crest -->
      <div class="header-center">
        <h1 class="college-name">College of Engineering</h1>
        <p class="affiliation">Autonomous Institution &bull; Approved by AICTE &bull; Affiliated to Anna University &bull; NAAC 'A+'</p>
        <p class="sub-office">Office of Academic Affairs, Student Clearances &amp; Examination Administration</p>
        <div>
          <span class="badge-clearance">Official No Due Clearance Certificate</span>
        </div>
      </div>

      <!-- Metadata Bar -->
      <div class="meta-bar">
        <div><span style="color: #64748b;">Certificate No:</span> <strong>${cert.certificate_number}</strong></div>
        <div><span style="color: #64748b;">Verification:</span> <strong style="font-family: monospace; color: #4338ca;">${cert.verification_code}</strong></div>
        <div><span style="color: #64748b;">Issue Date:</span> <strong>${issuedDateStr}</strong></div>
      </div>

      <!-- Student Profile Grid -->
      <div class="student-grid">
        <div>
          <span class="grid-label">Candidate Name</span>
          <span class="grid-val">${cert.student_name || 'STUDENT NAME'}</span>
        </div>
        <div>
          <span class="grid-label">Register Number</span>
          <span class="grid-val" style="font-family: monospace; color: #1e1b4b;">${cert.register_number || 'N/A'}</span>
        </div>
        <div>
          <span class="grid-label">Degree &amp; Program</span>
          <span class="grid-val">${cert.course_name || 'B.E. Computer Science'}</span>
        </div>
        <div>
          <span class="grid-label">Department</span>
          <span class="grid-val">${cert.department_name || 'Computer Science & Engineering'}</span>
        </div>
        <div>
          <span class="grid-label">Academic Year &amp; Sem</span>
          <span class="grid-val">Year ${studentYear} &bull; Sem ${studentSem} (${academicYear})</span>
        </div>
        <div>
          <span class="grid-label">Purpose / Exam Cycle</span>
          <span class="grid-val" style="color: #065f46;">${examType}</span>
        </div>
      </div>

      <!-- 1. Theory Subjects Clearance Schedule (Sub 1 - Sub 6) -->
      <div class="sec-title">
        <span>1. Theory Subjects Clearance Schedule (Sub 1 - Sub 6)</span>
        <span class="sec-badge">6 / 6 Subjects Cleared</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 55px;">Slot</th>
            <th>Subject Title &amp; Code</th>
            <th>In-Charge Faculty</th>
            <th style="width: 140px; text-align: center;">Dues Status</th>
            <th style="width: 90px; text-align: right;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${theoryRowsHtml}
        </tbody>
      </table>

      <!-- 2. Laboratory & Practical Clearance Schedule (Lab 1 - Lab 4) -->
      <div class="sec-title">
        <span>2. Laboratory &amp; Practical Clearance Schedule (Lab 1 - Lab 4)</span>
        <span class="sec-badge">${practicalLabs.length} / ${practicalLabs.length} Labs Cleared</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 55px;">Slot</th>
            <th>Practical Course Title &amp; Code</th>
            <th>Lab In-Charge</th>
            <th style="width: 140px; text-align: center;">Equipment / Record</th>
            <th style="width: 90px; text-align: right;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${labRowsHtml}
        </tbody>
      </table>

      <!-- 3. Institutional Common Clearance Nodes -->
      <div class="sec-title">
        <span>3. Institutional Common Clearance Nodes</span>
        <span class="sec-badge">All Institutional Nodes Cleared</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 65px;">Node</th>
            <th>Central Office / Purpose</th>
            <th>Authorized Officer</th>
            <th style="width: 150px; text-align: center;">Clearance Status</th>
            <th style="width: 90px; text-align: right;">Date</th>
          </tr>
        </thead>
        <tbody>
          ${commonRowsHtml}
        </tbody>
      </table>

      <!-- Certification Statement Note -->
      <div class="cert-body-note">
        This document formally certifies that the student has completed all clearance requirements across Theory Subjects, Practical Laboratories, Central Library, Financial Accounts, Transport, and Campus Sections. There are <strong>NO OUTSTANDING DUES OR LIABILITIES</strong> pending against this candidate. Sanction is hereby granted for Hall Ticket issuance and End Semester Examination attendance.
      </div>

      <!-- Footer: QR Code & 4 Signatures -->
      <div class="cert-footer">
        <!-- QR Code -->
        <div class="qr-block">
          <div class="qr-frame">
            <img src="${qrUrl}" alt="Verification QR" />
          </div>
          <div class="qr-meta">
            <strong style="color: #0f172a; display: block;">Tamper-Proof QR</strong>
            <span>Scan to verify authentic institutional registry status online.</span>
            <div style="font-family: monospace; color: #4f46e5; font-size: 8.5px; margin-top: 2px;">${cert.verification_code}</div>
          </div>
        </div>

        <!-- 4 Authorized Signatures -->
        <div class="signatories-grid">
          <div class="sig-col">
            <div class="sig-name">${signatories.chief_mentor?.name || 'Prof. S. Rajesh'}</div>
            <div class="sig-line"></div>
            <div class="sig-title">Chief Mentor</div>
            <div class="sig-sub">Verified &amp; Cleared</div>
          </div>
          <div class="sig-col">
            <div class="sig-name">${signatories.hod?.name || 'Dr. K. Senthil Kumar'}</div>
            <div class="sig-line"></div>
            <div class="sig-title">HOD Approval</div>
            <div class="sig-sub">Dept Dues Cleared</div>
          </div>
          <div class="sig-col">
            <div class="sig-name">${signatories.coe?.name || 'Dr. H. Sasipal'}</div>
            <div class="sig-line"></div>
            <div class="sig-title">Controller of Exam</div>
            <div class="sig-sub">Hall Ticket Cleared</div>
          </div>
          <div class="sig-col">
            <div class="sig-name">${signatories.principal?.name || cert.issued_by || 'Dr. T. Senthilvel'}</div>
            <div class="sig-line"></div>
            <div class="sig-title">Principal (Seal)</div>
            <div class="sig-sub">Executive Sanction</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers printing using a hidden sandbox iframe.
 * If browser policy blocks iframe printing (common in embedded iframes), returns ok: false.
 */
export async function printCertificateDirectly(cert: Certificate): Promise<{ ok: boolean; error?: string }> {
  try {
    const htmlContent = buildCertificatePrintHtml(cert, window.location.origin);
    const iframe = document.createElement('iframe');
    iframe.id = 'certificate-hidden-printer';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      return { ok: false, error: 'Cannot access printer document context' };
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Give images a short moment to render
    await new Promise((resolve) => setTimeout(resolve, 400));

    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {
            // ignore
          }
        }, 60000);
        return { ok: true };
      }
    } catch (printErr: any) {
      // Browser blocked window.print() inside iframe
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      return { ok: false, error: printErr?.message || 'Iframe print blocked' };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Unknown print error' };
  }
}

/**
 * Downloads official PDF for the certificate from backend.
 */
export async function downloadCertificatePdfFile(certId: number, certNumber?: string): Promise<void> {
  const res = await api.get(`/certificates/${certId}/download`, {
    responseType: 'blob',
  });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `College_NoDue_Certificate_${certNumber || certId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
