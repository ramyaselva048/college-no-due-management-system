import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  Download,
  ExternalLink,
  ShieldCheck,
  Ban,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { Certificate } from '../../types';

export const AdminCertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchCerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/all');
      setCertificates(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load certificate ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleRevoke = async (certId: number) => {
    const reason = window.prompt('Enter institutional justification for revoking this certificate:');
    if (!reason || !reason.trim()) return;

    try {
      await api.patch(`/certificates/${certId}/revoke`, { reason: reason.trim() });
      alert('Certificate has been marked revoked in the institutional registry.');
      fetchCerts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to revoke certificate');
    }
  };

  const filteredCerts = certificates.filter(
    (c) =>
      c.certificate_number?.toLowerCase().includes(search.toLowerCase()) ||
      c.verification_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.register_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            No Due Certificates Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-backed cryptographic registry of all student clearance credentials
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search certificate, student or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading certificate registry...</div>
      ) : filteredCerts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No certificates found matching criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Certificate Number</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Program & Dept</th>
                  <th className="py-3.5 px-4">Verification Code</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {cert.certificate_number}
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{cert.student_name}</p>
                      <p className="font-mono text-[11px] text-indigo-700">{cert.register_number}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <p className="font-medium">{cert.course_name}</p>
                      <p className="text-[11px] text-slate-400">{cert.department_name}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <Link
                        to={`/verify/${cert.verification_code}`}
                        target="_blank"
                        className="font-mono font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
                      >
                        {cert.verification_code} <ExternalLink className="w-2.5 h-2.5" />
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(cert.issued_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          cert.is_valid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {cert.is_valid ? 'Valid & Issued' : 'Revoked'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {cert.is_valid && (
                        <button
                          onClick={() => handleRevoke(cert.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
