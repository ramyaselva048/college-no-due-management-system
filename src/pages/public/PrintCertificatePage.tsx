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
import { CertificateDocument } from '../../components/certificate/CertificateDocument';

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
      <CertificateDocument cert={cert} />
    </div>
  );
};

export default PrintCertificatePage;
