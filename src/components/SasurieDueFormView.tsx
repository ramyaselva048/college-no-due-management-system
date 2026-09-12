import React from 'react';
import { Printer, Download, Check, ShieldCheck, Award } from 'lucide-react';
import { NoDueRequest, StudentProfile } from '../types';

interface SasurieDueFormViewProps {
  request?: Partial<NoDueRequest> | null;
  student?: Partial<StudentProfile> | null;
  hideActionButtons?: boolean;
}

export const SasurieDueFormView: React.FC<SasurieDueFormViewProps> = ({
  request,
  student,
  hideActionButtons = false,
}) => {
  // Derive student information
  const studentName = (
    request?.student_name ||
    student?.full_name ||
    'RAMYA S'
  ).toUpperCase();

  const regNo = (
    request?.student_reg_no ||
    student?.register_number ||
    '732423104036'
  ).toUpperCase();

  const deptName = (
    request?.department_name ||
    student?.department_name ||
    'BE COMPUTER SCIENCE AND ENGINEERING'
  ).toUpperCase();

  const yearNum = request?.year || student?.year || 4;
  const semNum = request?.semester || (yearNum === 4 ? 7 : yearNum === 3 ? 5 : yearNum === 2 ? 3 : 1);

  const romanYears: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
  const romanSems: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII' };

  const yearSemDisplay = `${romanYears[yearNum] || yearNum} / ${romanSems[semNum] || semNum}`;

  const examType = request?.exam_type || 'CIAT - I';
  const academicYear = request?.academic_year || '2025-26';
  const formDate = request?.form_date || (request?.submitted_at ? new Date(request.submitted_at).toLocaleDateString('en-GB') : '10/08/2026');
  const attendancePct = request?.attendance_percentage ?? 98;
  const attendanceMonth = request?.attendance_month || 'August';
  const undertakingStatus = request?.undertaking_status || (Number(attendancePct) >= 80 ? 'Exempted' : 'Submitted');

  // Default subjects matching the photo for CSE Year 4 Sem 7, or fallback to request subjects
  const subjects = request?.subjects && request.subjects.length >= 6 ? request.subjects : [
    { slot: 'Sub 1', name: 'Sensors', dues_status: 'No Dues', faculty_name: 'Dr. K. Ramesh', signature_date: '10/8/26' },
    { slot: 'Sub 2', name: 'Electric And Hybrid vehicles', dues_status: 'No Dues', faculty_name: 'Prof. M. Selvam', signature_date: '7/8/26' },
    { slot: 'Sub 3', name: 'Human values and Ethics', dues_status: 'No Dues', faculty_name: 'Dr. P. Muthukumar', signature_date: '7/8/26' },
    { slot: 'Sub 4', name: 'Total Quality management', dues_status: 'No Dues', faculty_name: 'Prof. S. Vignesh', signature_date: '10/8/26' },
    { slot: 'Sub 5', name: 'Fin Tech', dues_status: 'No Dues', faculty_name: 'Dr. B. Anitha', signature_date: '10/8/26' },
    { slot: 'Sub 6', name: 'CDC', dues_status: 'Verified', faculty_name: 'Prof. T. Hariprasad', signature_date: '10/8/26' },
  ];

  const labs = request?.labs && request.labs.length >= 4 ? request.labs : [
    { slot: 'Lab 1', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
    { slot: 'Lab 2', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
    { slot: 'Lab 3', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
    { slot: 'Lab 4', name: '-', dues_status: '-', faculty_name: '', signature_date: '' },
  ];

  const signatories = request?.signatories || {
    chief_mentor: { signed: true, name: 'S. Rajesh', date: '10/8/26', status: 'approved' },
    hod: { signed: true, name: 'Dr. S. R. Murugan', date: '10/8/26', status: 'approved' },
    coe: { signed: true, name: 'Dr. H. Soundararajan CoE', date: '10/8/26', status: 'approved' },
    principal: { signed: true, name: 'Dr. T. Senthilvel', date: '10/8/26', status: 'approved' },
    library: { signed: true, name: 'D. Vinoth', date: '10/8/26', status: 'No Due' },
    transport: { signed: false, name: '-', date: '-', status: '-' },
    hostel: { signed: false, name: '-', date: '-', status: '-' },
    office_accounts: { signed: true, name: 'S. Accounts', date: '10/08/2026', status: 'No Dues' },
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {!hideActionButtons && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800">
              Official Institutional No Due Form (Original Paper Template)
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
              Autonomous
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print Official Form
            </button>
          </div>
        </div>
      )}

      {/* The Exact Physical Paper Form Container */}
      <div
        id="official-paper-form"
        className="bg-white text-black p-6 sm:p-10 border border-slate-400 shadow-md max-w-3xl mx-auto rounded-none font-serif relative print:shadow-none print:border-none print:p-0 print:m-0"
        style={{ minHeight: '1000px', backgroundColor: '#ffffff' }}
      >
        {/* Top Header: Logo + College Name + Badges */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          {/* Left: Institutional Logo & Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-16 h-16 flex items-center justify-center font-bold text-black border-2 border-black text-center p-1 leading-tight">
              <span className="text-[10px] font-sans font-black tracking-tighter">
                COLLEGE
              </span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl text-black tracking-tight uppercase font-sans">
                COLLEGE OF ENGINEERING
              </h1>
              <p className="text-[11px] font-bold text-black uppercase font-sans -mt-1">
                Approved by AICTE & Affiliated to Anna University
              </p>
              <p className="text-[9px] text-black italic font-sans">
                (Autonomous Institution)
              </p>
            </div>
          </div>

          {/* Right: Accreditations (NAAC, AICTE, Anna University) */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 border border-black rounded-full flex flex-col items-center justify-center p-0.5 text-center">
              <span className="text-[7px] font-bold leading-none">NAAC</span>
              <span className="text-[6px] leading-none">A+</span>
            </div>
            <div className="w-9 h-9 border border-black rounded-sm flex flex-col items-center justify-center p-0.5 text-center">
              <span className="text-[7px] font-bold leading-none">AICTE</span>
              <span className="text-[6px] leading-none">Approved</span>
            </div>
            <div className="w-9 h-9 border border-black rounded-full flex flex-col items-center justify-center p-0.5 text-center">
              <span className="text-[6px] font-bold leading-none">ANNA</span>
              <span className="text-[5px] leading-none">Univ</span>
            </div>
          </div>
        </div>

        {/* Title Bar: Student No Due Form - CIAT - I / II / End Semester Examinations */}
        <div className="text-center pt-3 pb-2">
          <div className="flex items-center justify-between text-xs font-sans mb-1">
            <span></span>
            <span className="font-bold text-black">
              Date: <span className="font-serif underline underline-offset-4 decoration-dotted">{formDate}</span>
            </span>
          </div>

          <div className="relative inline-block">
            <h2 className="text-sm sm:text-base font-bold text-black tracking-normal uppercase border-b border-black pb-0.5">
              Student No Due Form -{' '}
              <span className="relative inline-block px-1">
                CIAT - I
                {examType === 'CIAT - I' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-blue-800 font-sans font-black text-lg select-none">
                    ✓
                  </span>
                )}
              </span>{' '}
              /{' '}
              <span className="relative inline-block px-1">
                II
                {examType === 'CIAT - II' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-blue-800 font-sans font-black text-lg select-none">
                    ✓
                  </span>
                )}
              </span>{' '}
              /{' '}
              <span className="relative inline-block px-1">
                End Semester Examinations
                {examType === 'End Semester Examinations' && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-blue-800 font-sans font-black text-lg select-none">
                    ✓
                  </span>
                )}
              </span>
            </h2>
          </div>

          <p className="text-xs font-sans mt-1">
            Academic Year: <span className="font-serif underline underline-offset-2">{academicYear}</span>
          </p>
        </div>

        {/* Student Profile Metadata Fields */}
        <div className="text-xs sm:text-sm font-sans space-y-1.5 my-3 px-1">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-baseline">
            <div className="sm:col-span-4 font-bold text-black">Name of the Student</div>
            <div className="sm:col-span-8 font-serif font-bold text-black flex items-center gap-1">
              <span>:</span>
              <span className="uppercase tracking-wider ml-1 underline decoration-dotted underline-offset-4">{studentName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-baseline">
            <div className="sm:col-span-4 font-bold text-black">Reg. No</div>
            <div className="sm:col-span-8 font-serif font-bold text-black flex items-center gap-1">
              <span>:</span>
              <span className="font-mono tracking-wider ml-1 underline decoration-dotted underline-offset-4">{regNo}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-baseline">
            <div className="sm:col-span-4 font-bold text-black">Department</div>
            <div className="sm:col-span-8 font-serif font-bold text-black flex items-center gap-1">
              <span>:</span>
              <span className="uppercase ml-1 underline decoration-dotted underline-offset-4">{deptName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 items-baseline">
            <div className="sm:col-span-4 font-bold text-black">Year / Semester</div>
            <div className="sm:col-span-8 font-serif font-bold text-black flex items-center gap-1">
              <span>:</span>
              <span className="ml-1 underline decoration-dotted underline-offset-4">{yearSemDisplay}</span>
            </div>
          </div>
        </div>

        {/* The 14-Row Clearance Table */}
        <div className="mt-4 border-t-2 border-l-2 border-black">
          <table className="w-full text-xs font-sans border-collapse border-b-2 border-r-2 border-black">
            <thead>
              <tr className="border-b border-black text-center font-bold bg-slate-50">
                <th className="border-r border-black py-1.5 px-2 w-12 text-center">S.No</th>
                <th className="border-r border-black py-1.5 px-3 text-left">Subject</th>
                <th className="border-r border-black py-1.5 px-3 w-28 text-center">Dues</th>
                <th className="py-1.5 px-3 w-52 text-center">Signature of the Faculty / Staff</th>
              </tr>
            </thead>
            <tbody>
              {/* Rows 1 to 6: Subjects */}
              {subjects.map((sub, idx) => (
                <tr key={idx} className="border-b border-black h-8 text-black">
                  <td className="border-r border-black text-center font-sans font-semibold py-1">{idx + 1}</td>
                  <td className="border-r border-black px-2.5 font-serif py-1">
                    <span className="font-sans font-semibold text-[11px]">{sub.slot}: </span>
                    {sub.code && <span className="font-mono text-[10px] font-bold text-slate-700 mr-1.5">[{sub.code}]</span>}
                    <span className="italic font-bold text-blue-950">{sub.name}</span>
                  </td>
                  <td className="border-r border-black text-center font-serif text-blue-900 font-bold py-1">
                    {sub.dues_status}
                  </td>
                  <td className="px-2 text-center font-serif py-1">
                    <div className="flex items-center justify-center gap-2">
                      <span className="italic font-bold text-blue-900 text-xs font-serif">
                        {sub.faculty_name || 'Signed'}
                      </span>
                      {sub.signature_date && (
                        <span className="text-[10px] text-blue-950 font-mono">
                          {sub.signature_date}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {/* Rows 7 to 10: Labs */}
              {labs.map((lab, idx) => (
                <tr key={`lab-${idx}`} className="border-b border-black h-7 text-black">
                  <td className="border-r border-black text-center font-sans font-semibold py-1">{idx + 7}</td>
                  <td className="border-r border-black px-2.5 font-serif py-1">
                    <span className="font-sans font-semibold text-[11px]">{lab.slot}: </span>
                    {lab.code && <span className="font-mono text-[10px] font-bold text-slate-700 mr-1.5">[{lab.code}]</span>}
                    <span className="italic">{lab.name}</span>
                  </td>
                  <td className="border-r border-black text-center font-serif text-blue-900 font-bold py-1">
                    {lab.dues_status}
                  </td>
                  <td className="px-2 text-center font-serif py-1 text-slate-600">
                    {lab.faculty_name ? (
                      <div className="flex items-center justify-center gap-2 text-blue-900">
                        <span className="italic font-bold">{lab.faculty_name}</span>
                        {lab.signature_date && <span className="text-[10px] font-mono">{lab.signature_date}</span>}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Row 11: Library */}
              <tr className="border-b border-black h-8 text-black">
                <td className="border-r border-black text-center font-sans font-semibold py-1">11</td>
                <td className="border-r border-black px-2.5 font-serif py-1">Library</td>
                <td className="border-r border-black text-center font-serif text-blue-900 font-bold py-1">
                  {signatories.library?.status || 'Nodue'}
                </td>
                <td className="px-2 text-center font-serif py-1">
                  <div className="flex items-center justify-center gap-2 text-blue-900">
                    <span className="italic font-bold">{signatories.library?.name || 'D. Vinoth'}</span>
                    <span className="text-[10px] font-mono">{signatories.library?.date || '10/8/26'}</span>
                  </div>
                </td>
              </tr>

              {/* Row 12: Transport In-charge (Day Scholar only)* */}
              <tr className="border-b border-black h-7 text-black">
                <td className="border-r border-black text-center font-sans font-semibold py-1">12</td>
                <td className="border-r border-black px-2.5 font-serif py-1">Transport In-charge (Day Scholar only)*</td>
                <td className="border-r border-black text-center font-serif text-blue-900 font-bold py-1">
                  {signatories.transport?.status || '-'}
                </td>
                <td className="px-2 text-center font-serif py-1 text-slate-600">
                  {signatories.transport?.signed ? (
                    <div className="flex items-center justify-center gap-2 text-blue-900">
                      <span className="italic font-bold">{signatories.transport.name}</span>
                      <span className="text-[10px] font-mono">{signatories.transport.date}</span>
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>

              {/* Row 13: Hostel Warden (Hosteller only)* */}
              <tr className="border-b border-black h-7 text-black">
                <td className="border-r border-black text-center font-sans font-semibold py-1">13</td>
                <td className="border-r border-black px-2.5 font-serif py-1">Hostel Warden( Hosteller only)*</td>
                <td className="border-r border-black text-center font-serif text-blue-900 font-bold py-1">
                  {signatories.hostel?.status || '-'}
                </td>
                <td className="px-2 text-center font-serif py-1 text-slate-600">
                  {signatories.hostel?.signed ? (
                    <div className="flex items-center justify-center gap-2 text-blue-900">
                      <span className="italic font-bold">{signatories.hostel.name}</span>
                      <span className="text-[10px] font-mono">{signatories.hostel.date}</span>
                    </div>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>

              {/* Row 14: Office - Accounts* */}
              <tr className="h-8 text-black">
                <td className="border-r border-black text-center font-sans font-semibold py-1">14</td>
                <td className="border-r border-black px-2.5 font-serif py-1">Office - Accounts*</td>
                <td className="border-r border-black text-center font-serif text-blue-900 font-bold py-1">
                  {signatories.office_accounts?.status || 'No Dues'}
                </td>
                <td className="px-2 text-center font-serif py-1">
                  <div className="flex items-center justify-center gap-2 text-blue-900">
                    <span className="italic font-bold">{signatories.office_accounts?.name || 'S. Accounts'}</span>
                    <span className="text-[10px] font-mono">{signatories.office_accounts?.date || '10/8/2026'}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Note Section (Attendance & Undertaking Status) */}
        <div className="mt-3 border border-black p-2.5 text-[11px] font-sans leading-relaxed text-black">
          <p className="font-bold">
            Note:
          </p>
          <p className="mt-0.5">
            Attendance Percentage :{' '}
            <span className="font-serif font-bold text-blue-950 text-xs underline decoration-dotted px-1">
              {attendancePct} %
            </span>{' '}
            as on{' '}
            <span className="font-serif underline decoration-dotted px-1">
              {attendanceMonth} Month
            </span>
          </p>
          <p className="mt-1 text-[10.5px]">
            The Chief Mentor is requested to verify the attendance percentage (if below 80%) and indicate the status of the
            undertaking form as :{' '}
            <span className="font-bold font-serif underline px-1">
              {undertakingStatus}
            </span>
          </p>
        </div>

        <p className="text-[10px] font-sans text-black italic mt-1 px-1">
          *Applicable only to those who have not paid the fees. They should obtain the No Dues from the respective section.
        </p>

        {/* The 4 Bottom Authorized Signatories */}
        <div className="mt-8 pt-4 grid grid-cols-4 gap-2 text-center text-xs font-sans">
          {/* Chief Mentor */}
          <div className="flex flex-col items-center justify-end h-16">
            <div className="font-serif italic font-bold text-blue-900 text-xs">
              {signatories.chief_mentor?.signed ? signatories.chief_mentor?.name || 'S. Rajesh' : ''}
            </div>
            <div className="text-[10px] font-mono text-blue-950">
              {signatories.chief_mentor?.signed ? signatories.chief_mentor?.date || '10/8/26' : ''}
            </div>
            <div className="w-24 border-t border-black mt-1"></div>
            <p className="font-bold text-black mt-1 text-[11px]">Chief Mentor</p>
          </div>

          {/* HoD */}
          <div className="flex flex-col items-center justify-end h-16">
            <div className="font-serif italic font-bold text-blue-900 text-xs">
              {signatories.hod?.signed ? signatories.hod?.name || 'Dr. S. R. Murugan' : ''}
            </div>
            <div className="text-[10px] font-mono text-blue-950">
              {signatories.hod?.signed ? signatories.hod?.date || '10/8/26' : ''}
            </div>
            <div className="w-20 border-t border-black mt-1"></div>
            <p className="font-bold text-black mt-1 text-[11px]">HoD</p>
          </div>

          {/* CoE */}
          <div className="flex flex-col items-center justify-end h-16">
            <div className="font-serif italic font-bold text-blue-900 text-xs">
              {signatories.coe?.signed ? signatories.coe?.name || 'Dr. H. Soundararajan' : ''}
            </div>
            <div className="text-[10px] font-mono text-blue-950">
              {signatories.coe?.signed ? signatories.coe?.date || '10/8/26' : ''}
            </div>
            <div className="w-20 border-t border-black mt-1"></div>
            <p className="font-bold text-black mt-1 text-[11px]">CoE</p>
          </div>

          {/* PRINCIPAL */}
          <div className="flex flex-col items-center justify-end h-16">
            <div className="font-serif italic font-bold text-emerald-900 text-xs">
              {signatories.principal?.signed ? signatories.principal?.name || 'Dr. T. Senthilvel' : ''}
            </div>
            <div className="text-[10px] font-mono text-emerald-950">
              {signatories.principal?.signed ? signatories.principal?.date || '10/8/26' : ''}
            </div>
            <div className="w-24 border-t border-black mt-1"></div>
            <p className="font-bold text-black mt-1 text-[11px] uppercase">PRINCIPAL</p>
          </div>
        </div>
      </div>
    </div>
  );
};
