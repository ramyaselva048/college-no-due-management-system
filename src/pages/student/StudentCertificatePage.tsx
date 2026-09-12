import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  QrCode,
  AlertCircle,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { Certificate } from '../../types';
import { SasurieDueFormView } from '../../components/SasurieDueFormView';
import { useAuth } from '../../context/AuthContext';

export const StudentCertificatePage: React.FC = () => {
  const { studentProfile } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewFormat, setViewFormat] = useState<'sasurie_form' | 'digital_cert'>('sasurie_form');

  const fetchCerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/my');
      setCertificates(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to retrieve certificates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleDownloadPdf = async (certId: number) => {
    try {
      setDownloading(true);
      // Download PDF as blob
      const res = await api.get(`/certificates/${certId}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sasurie_NoDue_Certificate_${certId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Unable to download PDF. You can also print this page directly.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading certificate records...</div>;
  }

  const activeCert = certificates.find((c) => c.is_valid) || certificates[0];
  const linkedRequest = (activeCert as any)?.request;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Official No Due Clearance & Form
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sasurie College of Engineering (Autonomous) — CIAT / End Sem Clearance Document
          </p>
        </div>

        {activeCert && (
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View format switcher */}
            <div className="p-1 bg-slate-200/80 rounded-xl flex items-center text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewFormat('sasurie_form')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewFormat === 'sasurie_form'
                    ? 'bg-white text-indigo-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Original Sasurie Form
              </button>
              <button
                type="button"
                onClick={() => setViewFormat('digital_cert')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewFormat === 'digital_cert'
                    ? 'bg-white text-indigo-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                Digital Certificate
              </button>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              id="btn-download-pdf"
              onClick={() => handleDownloadPdf(activeCert.id)}
              disabled={downloading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!activeCert ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">
            No Due Certificate Not Yet Issued
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Your certificate and official Sasurie form will be automatically minted once all designated department clearance officers and the college administrator complete their sign-off.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/student/request"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Track Application Progress
            </Link>
          </div>
        </div>
      ) : viewFormat === 'sasurie_form' ? (
        /* The Authentic Sasurie Institutional Paper Replica */
        <SasurieDueFormView request={linkedRequest} student={studentProfile} />
      ) : (
        /* Digital Verifiable Certificate View */
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-indigo-900/20 shadow-xl print:shadow-none print:border-none relative overflow-hidden">
          {/* Subtle Watermark BG */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <GraduationCap className="w-96 h-96 text-indigo-900" />
          </div>

          {/* Certificate Inner Content */}
          <div className="relative z-10 text-center space-y-6">
            {/* Header / Crest */}
            <div className="border-b-2 border-slate-900/10 pb-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-indigo-950 uppercase tracking-tight">
                Sasurie College of Engineering
              </h1>
              <p className="text-xs font-bold text-slate-600 tracking-wider uppercase mt-1">
                Autonomous Institution • Vijayamangalam, Tiruppur - 638056 • NAAC 'A+'
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
              <h2 className="font-display font-black text-xl sm:text-2xl text-slate-900 uppercase tracking-tight mt-3">
                No Due Certificate
              </h2>
            </div>

            {/* Metadata Bar */}
            <div className="flex flex-wrap items-center justify-center gap-6 py-2 px-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 max-w-xl mx-auto">
              <div>
                <span className="text-slate-400">Cert No: </span>
                <span className="font-bold text-slate-900">{activeCert.certificate_number}</span>
              </div>
              <div className="h-3 w-px bg-slate-200"></div>
              <div>
                <span className="text-slate-400">Verification: </span>
                <span className="font-bold text-indigo-700">{activeCert.verification_code}</span>
              </div>
            </div>

            {/* Body Certification Statement */}
            <div className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4 text-justify pt-2">
              <p>
                This is to officially certify that <span className="font-bold text-slate-900">{activeCert.student_name}</span>, holding Registration Number <span className="font-mono font-bold text-indigo-900">{activeCert.register_number}</span>, enrolled in the academic program <span className="font-bold text-slate-900">{activeCert.course_name}</span> within the Department of <span className="font-bold text-slate-900">{activeCert.department_name}</span>, has successfully completed all institutional clearance protocols.
              </p>
              <p>
                As of <span className="font-semibold text-slate-900">{new Date(activeCert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>, the aforementioned student has settled all dues, library liabilities, laboratory equipments, accounts charges, and campus residential obligations. There are <span className="font-bold text-emerald-800 uppercase">NO OUTSTANDING DUES</span> recorded against this student across any college department.
              </p>
            </div>

            {/* Footer with QR Code and Signatures */}
            <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* QR Verification Seal */}
              <div className="flex items-center gap-4 text-left">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(
                      `${window.location.origin}/verify/${activeCert.verification_code}`
                    )}`}
                    alt="Certificate QR Verification"
                    className="w-18 h-18"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tamper-Proof QR
                  </p>
                  <p className="text-[10px] text-slate-500 max-w-[150px] mt-0.5 leading-tight">
                    Scan using any camera to verify validity on official institutional registry
                  </p>
                  <Link
                    to={`/verify/${activeCert.verification_code}`}
                    target="_blank"
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 mt-1"
                  >
                    Open Public Verifier <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
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
      )}
    </div>
  );
};

