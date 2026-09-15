import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  Download,
  RotateCcw,
  ArrowLeft,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { Certificate } from '../../types';
import { downloadCertificatePdfFile } from '../../utils/printCertificate';

export const PrintCertificatePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const autoPrint = searchParams.get('autoprint') === 'true';

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [hasPrinted, setHasPrinted] = useState(false);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!id) {
        throw new Error('Certificate identifier missing');
      }

      // Try authenticated endpoint first, fallback to public verification endpoint
      try {
        const res = await api.get(`/certificates/${id}`);
        setCert(res.data);
      } catch (authErr) {
        // Try public verify endpoint
        const verifyRes = await api.get(`/certificates/verify/${id}`);
        setCert({
          id: Number(id) || 1,
          request_id: 1,
          student_id: 1,
          student_name: verifyRes.data.student_name,
          register_number: verifyRes.data.register_number,
          course_name: verifyRes.data.course_name,
          department_name: verifyRes.data.department_name,
          certificate_number: verifyRes.data.certificate_number,
          verification_code: verifyRes.data.verification_code,
          issued_at: verifyRes.data.issued_at,
          is_valid: verifyRes.data.is_valid,
          created_at: verifyRes.data.issued_at,
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load certificate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificate();
  }, [id]);

  useEffect(() => {
    if (cert && autoPrint && !hasPrinted) {
      const timer = setTimeout(() => {
        try {
          window.print();
          setHasPrinted(true);
        } catch (e) {
          console.warn('Auto print failed or blocked', e);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [cert, autoPrint, hasPrinted]);

  const handlePrintNow = () => {
    try {
      window.print();
    } catch (err) {
      alert('Your browser blocked the print command. Please press Ctrl+P (or ⌘+P) to print, or click Download PDF.');
    }
  };

  const handleDownload = async () => {
    if (!cert) return;
    try {
      setDownloading(true);
      await downloadCertificatePdfFile(cert.id, cert.certificate_number);
    } catch (err: any) {
      alert('Unable to generate PDF directly. Please use the Print button to Save as PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 text-slate-600 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Preparing high-resolution printable certificate...</span>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="font-display font-bold text-base text-slate-900">Certificate Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Could not locate the requested certificate record.'}</p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={fetchCertificate}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${cert.verification_code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}`;
  const issuedDateStr = cert.issued_at
    ? new Date(cert.issued_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 p-4 sm:p-8 flex flex-col items-center">
      {/* Action Toolbar (Hidden during browser printing) */}
      <div className="w-full max-w-4xl mb-6 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display font-bold text-sm text-slate-900">Official Certificate Print Preview</h1>
            <p className="text-[11px] text-slate-500 font-mono">
              {cert.certificate_number} &bull; {cert.student_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCertificate}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Reload & Reset certificate data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Reset View
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            {downloading ? 'Downloading...' : 'Save PDF'}
          </button>
          <button
            onClick={handlePrintNow}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" /> Print Certificate (Ctrl+P)
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div
        id="certificate-print-sheet"
        className="w-full max-w-[820px] bg-white rounded-3xl p-8 sm:p-14 border-3 border-indigo-950/20 shadow-xl print:shadow-none print:border-2 print:border-indigo-950 print:p-8 print:m-0 print:w-full print:max-w-none relative overflow-hidden"
      >
        {/* Subtle Watermark BG */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.035] select-none">
          <GraduationCap className="w-96 h-96 text-indigo-950" />
        </div>

        {/* Certificate Inner Content */}
        <div className="relative z-10 text-center space-y-6">
          {/* Header / Crest */}
          <div className="border-b-2 border-slate-900/10 pb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-indigo-950 uppercase tracking-tight">
              College of Engineering
            </h2>
            <p className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-1">
              Autonomous Institution &bull; Approved by AICTE &bull; Affiliated to Anna University &bull; NAAC 'A+'
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Office of Academic Affairs & Institutional Clearances (CIAT - I / II / End Sem)
            </p>
          </div>

          {/* Title */}
          <div>
            <span className="inline-block px-4 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 font-display font-bold text-xs uppercase tracking-widest">
              Official Institutional Clearance
            </span>
            <h3 className="font-display font-black text-xl sm:text-2xl text-slate-900 uppercase tracking-tight mt-3">
              No Due Certificate
            </h3>
          </div>

          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 py-2 px-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 max-w-xl mx-auto">
            <div>
              <span className="text-slate-400">Cert No: </span>
              <span className="font-bold text-slate-900">{cert.certificate_number}</span>
            </div>
            <div className="h-3 w-px bg-slate-200"></div>
            <div>
              <span className="text-slate-400">Verification: </span>
              <span className="font-bold text-indigo-700">{cert.verification_code}</span>
            </div>
            <div className="h-3 w-px bg-slate-200"></div>
            <div>
              <span className="text-slate-400">Date: </span>
              <span className="font-bold text-slate-900">{issuedDateStr}</span>
            </div>
          </div>

          {/* Body Certification Statement */}
          <div className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 text-justify pt-2">
            <p>
              This is to officially certify that <span className="font-bold text-slate-900">{cert.student_name}</span>,
              holding Registration Number <span className="font-mono font-bold text-indigo-900 bg-slate-100 px-1.5 py-0.5 rounded">{cert.register_number}</span>,
              enrolled in the academic program <span className="font-bold text-slate-900">{cert.course_name}</span> within
              the Department of <span className="font-bold text-slate-900">{cert.department_name}</span>, has successfully
              completed all institutional clearance protocols.
            </p>
            <p>
              As of <span className="font-semibold text-slate-900">{issuedDateStr}</span>, the aforementioned student has settled
              all dues, library liabilities, laboratory equipments, accounts charges, hostel accommodation inventory, and
              departmental clearances. There are <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase">NO OUTSTANDING DUES</span> recorded
              against this student across any college department.
            </p>
          </div>

          {/* Footer with QR Code and Signatures */}
          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* QR Verification Seal */}
            <div className="flex items-center gap-4 text-left">
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <img
                  src={qrUrl}
                  alt="Certificate QR Verification"
                  className="w-20 h-20"
                />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tamper-Proof QR
                </p>
                <p className="text-[10px] text-slate-500 max-w-[150px] mt-0.5 leading-tight">
                  Scan using any camera to verify validity on official institutional registry
                </p>
                <p className="text-[9px] font-mono text-indigo-600 mt-1">
                  {cert.verification_code}
                </p>
              </div>
            </div>

            {/* Authorized Signatories */}
            <div className="flex items-center gap-8 text-center text-xs">
              <div>
                <div className="h-10 flex items-end justify-center font-display italic text-indigo-900 font-semibold text-sm">
                  Dean of Academics
                </div>
                <div className="w-28 border-t border-slate-400 mt-1"></div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Dean (Academics)</p>
              </div>

              <div>
                <div className="h-10 flex items-end justify-center font-display italic text-indigo-900 font-semibold text-sm">
                  Dr. T. Senthilvel
                </div>
                <div className="w-28 border-t border-slate-400 mt-1"></div>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase">PRINCIPAL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintCertificatePage;
