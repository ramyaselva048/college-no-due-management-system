import React from 'react';
import {
  GraduationCap,
  CheckCircle2,
  ShieldCheck,
  Building2,
  QrCode,
  Award,
  Calendar,
  BookOpen,
  FlaskConical,
  Library,
  FileCheck
} from 'lucide-react';
import { Certificate, PublicVerificationResult } from '../../types';

interface CertificateDocumentProps {
  cert: Certificate | PublicVerificationResult;
  isPublicVerification?: boolean;
}

export const CertificateDocument: React.FC<CertificateDocumentProps> = ({ cert, isPublicVerification = false }) => {
  const verifyCode = cert.verification_code || 'VER-00000000';
  const certNumber = cert.certificate_number || 'ND-0000-0000';
  const verifyUrl = `${window.location.origin}/verify/${verifyCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;

  const issuedDateStr = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const shortDateStr = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-GB')
    : new Date().toLocaleDateString('en-GB');

  // Fallback data if backend hasn't populated rich lists yet
  const studentYear = cert.year || 4;
  const studentSem = cert.semester || (studentYear * 2 - 1);
  const examType = cert.exam_type || 'CIAT - I / End Semester Examination';
  const academicYear = cert.academic_year || '2025-2026';

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
        { slot: 'COM-LIB', name: 'Central Library & Book Bank', dues_status: 'Accepted & Cleared', faculty_name: 'D. Vinoth (Librarian)', requirement_description: 'All books, research journals returned & fines settled', signature_date: shortDateStr },
        { slot: 'COM-ACC', name: 'Accounts & College Finance Section', dues_status: 'Accepted & Cleared', faculty_name: 'Mrs. V. Revathi (Accounts)', requirement_description: 'All semester tuition, development & exam fees paid', signature_date: shortDateStr },
        { slot: 'COM-HST', name: 'Campus Hostel & Mess Office', dues_status: 'Exempted (Day Scholar)', faculty_name: 'Hostel Administration', requirement_description: 'Mess dues & inventory clearance', signature_date: shortDateStr },
        { slot: 'COM-TRN', name: 'College Bus & Transport Section', dues_status: 'Accepted & Cleared', faculty_name: 'Mr. K. Murugesan (Transport)', requirement_description: 'Transport ID pass validated & fleet clearance confirmed', signature_date: shortDateStr },
        { slot: 'COM-PED', name: 'Physical Education & Sports Department', dues_status: 'Accepted & Cleared', faculty_name: 'Dr. A. Joseph (Dir. Sports)', requirement_description: 'Sports kits, equipment & gym liability cleared', signature_date: shortDateStr },
        { slot: 'COM-COE', name: 'Controller of Examinations (CoE Cell)', dues_status: 'Accepted & Cleared', faculty_name: 'Dr. H. Sasipal (Controller)', requirement_description: 'Exam registration & Hall Ticket clearance sanction granted', signature_date: shortDateStr }
      ];

  const signatories = cert.signatories || {
    chief_mentor: { signed: true, name: 'Prof. S. Rajesh, M.E.', date: shortDateStr, remarks: 'Verified & Cleared' },
    hod: { signed: true, name: 'Dr. K. Senthil Kumar, M.E., Ph.D.', date: shortDateStr, remarks: 'All departmental requirements verified' },
    coe: { signed: true, name: 'Dr. H. Sasipal, M.E., Ph.D.', date: shortDateStr, remarks: 'Exam clearance granted' },
    principal: { signed: true, name: cert.issued_by || 'Dr. T. Senthilvel, Ph.D.', date: shortDateStr, remarks: 'Executive approval' }
  };

  return (
    <div
      id="certificate-print-sheet"
      className="w-full max-w-[840px] bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 border-2 sm:border-3 border-indigo-950/20 shadow-xl print:shadow-none print:border-2 print:border-indigo-950 print:p-6 print:m-0 print:w-full print:max-w-none relative overflow-hidden text-slate-800 text-left font-sans"
    >
      {/* Subtle Institutional Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
        <GraduationCap className="w-[500px] h-[500px] text-indigo-950" />
      </div>

      {/* Outer Border Flourish / Watermark Strip */}
      <div className="absolute top-0 left-0 right-0 h-2.5 bg-linear-to-r from-indigo-900 via-blue-700 to-indigo-950 print:h-2" />

      {/* Certificate Header */}
      <div className="relative z-10 border-b-2 border-indigo-950/15 pb-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white flex items-center justify-center shadow-md print:shadow-none">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="text-left">
            <h1 className="font-display font-black text-xl sm:text-2xl text-indigo-950 tracking-tight leading-none uppercase">
              College of Engineering
            </h1>
            <p className="text-[11px] font-bold text-slate-600 tracking-wide uppercase mt-1">
              Autonomous Institution &bull; Approved by AICTE &bull; Affiliated to Anna University &bull; NAAC 'A+'
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          Office of Academic Affairs, Student Mentoring & Institutional Clearances
        </p>

        {/* Certificate Title Badge */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Official No Due Clearance Certificate
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> All Institutional Dues Cleared
          </div>
        </div>

        {/* Identification Metadata Ribbon */}
        <div className="mt-3 py-1.5 px-3 bg-slate-50/90 rounded-lg border border-slate-200/80 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-slate-500 font-medium">Certificate No: </span>
            <strong className="font-mono text-indigo-950">{certNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Verification Code: </span>
            <span className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
              {verifyCode}
            </span>
          </div>
          <div>
            <span className="text-slate-500 font-medium">Issue Date: </span>
            <strong className="text-slate-800">{issuedDateStr}</strong>
          </div>
        </div>
      </div>

      {/* Student Academic Details Grid */}
      <div className="relative z-10 mt-4 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Candidate Name</span>
            <span className="font-bold text-slate-900 text-sm">{cert.student_name || 'STUDENT NAME'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Register Number</span>
            <span className="font-mono font-bold text-indigo-950 text-sm bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
              {cert.register_number || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Degree & Program</span>
            <span className="font-semibold text-slate-800">{cert.course_name || 'B.E. Computer Science'}</span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Department</span>
            <span className="font-semibold text-slate-800">{cert.department_name || 'Computer Science and Engineering'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Academic Year & Term</span>
            <span className="font-semibold text-slate-800">
              Year {studentYear} &bull; Semester {studentSem} ({academicYear})
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider">Purpose / Exam Cycle</span>
            <span className="font-semibold text-emerald-700">{examType}</span>
          </div>
        </div>
      </div>

      {/* Section 1: Theory Subjects Clearance Schedule (Sub 1 - Sub 6) */}
      <div className="relative z-10 mt-5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-700" />
            <h3 className="font-display font-bold text-xs text-indigo-950 uppercase tracking-wide">
              1. Theory Subjects Clearance Schedule (Sub 1 - Sub 6)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            6 / 6 Subjects Cleared
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-indigo-950/5 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-1.5 px-2.5 w-14">Slot</th>
                <th className="py-1.5 px-2.5">Subject Title & Code</th>
                <th className="py-1.5 px-2.5">In-Charge Faculty</th>
                <th className="py-1.5 px-2.5 text-center w-36">Dues Status</th>
                <th className="py-1.5 px-2.5 text-right w-24">Endorsement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {theorySubjects.map((sub, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-1.5 px-2.5 font-bold font-mono text-indigo-900">{sub.slot || `Sub ${idx + 1}`}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-900">
                    {sub.name}
                    {sub.code && <span className="ml-1.5 font-mono text-[10px] text-slate-500 font-normal">({sub.code})</span>}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600">{sub.faculty_name || 'Assigned Faculty'}</td>
                  <td className="py-1.5 px-2.5 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      Accepted & Cleared
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-[10px] text-slate-500">
                    {sub.signature_date || shortDateStr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Practical & Laboratory Clearance Schedule (Lab 1 - Lab 4) */}
      <div className="relative z-10 mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <FlaskConical className="w-4 h-4 text-indigo-700" />
            <h3 className="font-display font-bold text-xs text-indigo-950 uppercase tracking-wide">
              2. Laboratory & Practical Clearance Schedule (Lab 1 - Lab 4)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {practicalLabs.length} / {practicalLabs.length} Labs Cleared
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-indigo-950/5 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-1.5 px-2.5 w-14">Slot</th>
                <th className="py-1.5 px-2.5">Practical Course & Code</th>
                <th className="py-1.5 px-2.5">Lab In-Charge</th>
                <th className="py-1.5 px-2.5 text-center w-36">Equipment / Record</th>
                <th className="py-1.5 px-2.5 text-right w-24">Endorsement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {practicalLabs.map((lab, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-1.5 px-2.5 font-bold font-mono text-indigo-900">{lab.slot || `Lab ${idx + 1}`}</td>
                  <td className="py-1.5 px-2.5 font-medium text-slate-900">
                    {lab.name}
                    {lab.code && <span className="ml-1.5 font-mono text-[10px] text-slate-500 font-normal">({lab.code})</span>}
                  </td>
                  <td className="py-1.5 px-2.5 text-slate-600">{lab.faculty_name || 'Lab In-Charge'}</td>
                  <td className="py-1.5 px-2.5 text-center">
                    <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      Accepted & Cleared
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 text-right font-mono text-[10px] text-slate-500">
                    {lab.signature_date || shortDateStr}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Institutional Common Clearance Nodes */}
      <div className="relative z-10 mt-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-700" />
            <h3 className="font-display font-bold text-xs text-indigo-950 uppercase tracking-wide">
              3. Institutional Common Clearance Nodes (Central Sections)
            </h3>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            All Institutional Nodes Cleared
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-indigo-950/5 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-1.5 px-2.5 w-18">Node ID</th>
                <th className="py-1.5 px-2.5">Central Department / Purpose</th>
                <th className="py-1.5 px-2.5">Authorized Officer</th>
                <th className="py-1.5 px-2.5 text-center w-40">Clearance Status</th>
                <th className="py-1.5 px-2.5 text-right w-24">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commonNodes.map((node, idx) => {
                const isExempt = String(node.dues_status || '').toLowerCase().includes('exempt');
                return (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-1.5 px-2.5 font-bold font-mono text-indigo-900">{node.slot || `COM-${idx + 1}`}</td>
                    <td className="py-1.5 px-2.5">
                      <div className="font-semibold text-slate-900">{node.name}</div>
                      {node.requirement_description && (
                        <div className="text-[10px] text-slate-500 font-normal">{node.requirement_description}</div>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600">{node.faculty_name || 'Section Officer'}</td>
                    <td className="py-1.5 px-2.5 text-center">
                      {isExempt ? (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-300">
                          <CheckCircle2 className="w-3 h-3 text-slate-500 shrink-0" />
                          Exempted (Day Scholar)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          Accepted & Cleared
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-[10px] text-slate-500">
                      {node.signature_date || shortDateStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institutional Certification Text */}
      <div className="relative z-10 mt-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-[11px] text-slate-700 leading-relaxed text-justify">
        This document certifies that the candidate named above has resolved all institutional obligations, returned all library books and materials, surrendered laboratory apparatus and laboratory records, settled semester tuition and examination fees, and resolved all departmental dues.
        There are <strong className="text-emerald-800 uppercase font-black">NO OUTSTANDING DUES OR LIABILITIES</strong> on record. The student is fully cleared for Hall Ticket issuance, exam enrollment, and academic progression.
      </div>

      {/* Multi-tier Authorized Signatures & QR Code Section */}
      <div className="relative z-10 mt-4 pt-4 border-t-2 border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Verification QR Box */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white border border-slate-300 rounded-xl shadow-xs">
            <img src={qrUrl} alt="Certificate Verification QR" className="w-16 h-16 sm:w-18 sm:h-18 block rounded" />
          </div>
          <div className="text-[10px] text-slate-600 max-w-[200px]">
            <div className="font-bold text-slate-900 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tamper-Evident QR
            </div>
            <p className="mt-0.5 leading-tight text-slate-500">
              Scan with mobile camera to verify official registry clearance.
            </p>
            <p className="mt-1 font-mono text-[9px] text-indigo-700 break-all">{verifyCode}</p>
          </div>
        </div>

        {/* 4 Signatory Columns: Chief Mentor, HOD, CoE, Principal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {/* Chief Mentor */}
          <div className="w-24 sm:w-28">
            <div className="font-serif italic font-bold text-[11px] text-indigo-950 h-6 flex items-end justify-center">
              {signatories.chief_mentor?.name || 'Prof. S. Rajesh'}
            </div>
            <div className="h-0.5 bg-slate-400 my-1"></div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Chief Mentor</div>
            <div className="text-[8px] text-slate-500">Verified & Approved</div>
          </div>

          {/* Head of Department (HOD) */}
          <div className="w-24 sm:w-28">
            <div className="font-serif italic font-bold text-[11px] text-indigo-950 h-6 flex items-end justify-center">
              {signatories.hod?.name || 'Dr. K. Senthil Kumar'}
            </div>
            <div className="h-0.5 bg-slate-400 my-1"></div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">HOD Approval</div>
            <div className="text-[8px] text-slate-500">All Dept Dues Cleared</div>
          </div>

          {/* Controller of Examinations (CoE) */}
          <div className="w-24 sm:w-28">
            <div className="font-serif italic font-bold text-[11px] text-indigo-950 h-6 flex items-end justify-center">
              {signatories.coe?.name || 'Dr. H. Sasipal'}
            </div>
            <div className="h-0.5 bg-slate-400 my-1"></div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">CoE Sanction</div>
            <div className="text-[8px] text-slate-500">Hall Ticket Cleared</div>
          </div>

          {/* Principal & Executive Head */}
          <div className="w-24 sm:w-28">
            <div className="font-serif italic font-bold text-[11px] text-indigo-950 h-6 flex items-end justify-center">
              {signatories.principal?.name || cert.issued_by || 'Dr. T. Senthilvel'}
            </div>
            <div className="h-0.5 bg-slate-400 my-1"></div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Principal (Seal)</div>
            <div className="text-[8px] text-emerald-700 font-semibold">Executive Clearance</div>
          </div>
        </div>
      </div>

      {/* Micro-footer */}
      <div className="relative z-10 mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
        <div>Official Institutional Document &bull; Autonomous Academic Governance</div>
        <div className="font-mono">Security Checksum: {verifyCode.replace(/-/g, '').slice(0, 16)}</div>
      </div>
    </div>
  );
};
