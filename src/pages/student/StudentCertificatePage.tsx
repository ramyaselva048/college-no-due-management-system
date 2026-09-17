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
  RotateCcw,
  FileText,
  Copy,
  Check,
  X
} from 'lucide-react';
import api from '../../services/api';
import { Certificate } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  printCertificateDirectly,
  downloadCertificatePdfFile,
  buildCertificatePrintHtml
} from '../../utils/printCertificate';
import { CertificateDocument } from '../../components/certificate/CertificateDocument';

export const StudentCertificatePage: React.FC = () => {
  const { studentProfile } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCerts = async () => {
    try {
      setLoading(true);
      setError(null);
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

  const handleReset = async () => {
    try {
      setResetting(true);
      setError(null);
      setSuccessMsg(null);
      const res = await api.get('/certificates/my');
      setCertificates(res.data);
      setSuccessMsg('Certificate view and clearance status refreshed successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError('Unable to refresh certificate data. Please check connection.');
    } finally {
      setResetting(false);
    }
  };

  const handleDownloadPdf = async (certId: number, certNumber?: string) => {
    try {
      setDownloading(true);
      setError(null);
      await downloadCertificatePdfFile(certId, certNumber);
      setSuccessMsg('PDF Certificate downloaded successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError('Unable to generate PDF directly. Please use the Print button to Save as PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDirectPrint = async (cert: Certificate) => {
    try {
      setPrinting(true);
      setError(null);

      // Attempt method 1: Direct hidden iframe print
      const result = await printCertificateDirectly(cert);

      if (!result.ok) {
        // If iframe print is blocked by browser sandbox policy, open print modal / tab
        console.warn('Direct print blocked or failed, opening dedicated print view:', result.error);
        setShowPrintModal(true);
      } else {
        setSuccessMsg('Print dialog dispatched. If not visible, open the Print View tab.');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Print execution error:', err);
      setShowPrintModal(true);
    } finally {
      setPrinting(false);
    }
  };

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}/verify/${code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Loading certificate records...
      </div>
    );
  }

  const activeCert = certificates.find((c) => c.is_valid) || certificates[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            Digital No Due Certificate & Clearance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            College of Engineering (Autonomous) — Digital Verified Clearance Certificate
          </p>
        </div>

        {activeCert && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Reset / Refresh Button */}
            <button
              id="btn-reset-cert-view"
              onClick={handleReset}
              disabled={resetting}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Reset and refresh certificate data"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${resetting ? 'animate-spin' : ''}`} />
              Reset View
            </button>

            {/* Print Button */}
            <button
              id="btn-print-cert"
              onClick={() => handleDirectPrint(activeCert)}
              disabled={printing}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Print certificate"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {printing ? 'Preparing...' : 'Print'}
            </button>

            {/* Print Options / New Tab */}
            <Link
              to={`/certificate/print/${activeCert.id}?autoprint=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-colors items-center gap-1.5 shadow-2xs"
              title="Open clean printable document in new tab (bypasses iframe restrictions)"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Print in New Tab
            </Link>

            {/* Download PDF Button */}
            <button
              id="btn-download-pdf"
              onClick={() => handleDownloadPdf(activeCert.id, activeCert.certificate_number)}
              disabled={downloading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2 shadow-2xs print:hidden animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold px-1.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-600 hover:text-rose-900 text-xs font-bold px-1.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Print Options Modal (for when iframe blocks direct print) */}
      {showPrintModal && activeCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    Print Certificate Options
                  </h3>
                  <p className="text-[11px] text-slate-500">Choose your preferred printing method</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              If your browser's preview window restricts the printer modal inside this frame, you can open the clean A4 certificate directly in a new tab or save the high-resolution PDF.
            </p>

            <div className="space-y-2.5 pt-1">
              <Link
                to={`/certificate/print/${activeCert.id}?autoprint=true`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowPrintModal(false)}
                className="w-full px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-between transition-colors shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> Open Clean Print Page (New Tab)
                </span>
                <span className="text-[10px] uppercase tracking-wider opacity-80">Recommended &rarr;</span>
              </Link>

              <button
                onClick={() => {
                  setShowPrintModal(false);
                  handleDownloadPdf(activeCert.id, activeCert.certificate_number);
                }}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-600" /> Download Official PDF Document
                </span>
                <span className="text-[10px] text-slate-400 font-mono">.pdf</span>
              </button>

              <button
                onClick={() => {
                  setShowPrintModal(false);
                  window.print();
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Try Standard Browser Print (Ctrl+P)
              </button>
            </div>
          </div>
        </div>
      )}

      {!activeCert ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
              No Due Certificate Pending Clearance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
              Your official certificate will be issued once staff clearances, HOD endorsement, and formal Admin approval are completed.
            </p>
          </div>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={async () => {
                try {
                  setError(null);
                  await api.post('/certificates/my/claim');
                  await fetchCerts();
                } catch (err: any) {
                  setError(err.response?.data?.detail || 'Clearance or Admin approval is still pending.');
                }
              }}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> Check Clearance & Admin Approval Status
            </button>
            <Link
              to="/student/request"
              className="px-5 py-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              View Clearance Nodes &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* Digital Verifiable Certificate View */
        <div className="flex justify-center">
          <CertificateDocument cert={activeCert} />
        </div>
      )}
    </div>
  );
};

export default StudentCertificatePage;

