import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ExternalLink,
  Trash2,
  AlertCircle,
  AlertTriangle,
  X
} from 'lucide-react';
import api from '../../services/api';
import { Certificate } from '../../types';

export const AdminCertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modals replacing browser window.prompt / window.confirm
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('Administrative review and discrepancy verification');
  const [deletingCert, setDeletingCert] = useState<Certificate | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates/all');
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.certificates) ? res.data.certificates : []);
      setCertificates(list);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load certificate ledger');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const confirmRevoke = async () => {
    if (!revokingCert) return;
    try {
      setActionLoading(true);
      await api.patch(`/certificates/${revokingCert.id}/revoke`, { reason: revokeReason.trim() });
      setRevokingCert(null);
      await fetchCerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCert) return;
    try {
      setActionLoading(true);
      await api.delete(`/certificates/${deletingCert.id}`);
      setDeletingCert(null);
      await fetchCerts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete certificate');
    } finally {
      setActionLoading(false);
    }
  };

  const safeCerts = Array.isArray(certificates) ? certificates : [];

  const filteredCerts = safeCerts.filter(
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
                      <div className="flex items-center justify-end gap-1.5">
                        {cert.is_valid && (
                          <button
                            onClick={() => {
                              setRevokingCert(cert);
                              setRevokeReason('Administrative review and discrepancy verification');
                            }}
                            className="px-2 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                            title="Revoke Certificate"
                          >
                            Revoke
                          </button>
                        )}
                        <button
                          onClick={() => setDeletingCert(cert)}
                          className="p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center"
                          title="Delete Certificate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revoke Certificate Modal */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Revoke No Due Certificate</h4>
                  <p className="text-[11px] text-slate-400">#{revokingCert.certificate_number}</p>
                </div>
              </div>
              <button onClick={() => setRevokingCert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Revoking this certificate will invalidate the cryptographic verification code for student{' '}
              <span className="font-bold text-slate-900">{revokingCert.student_name}</span> ({revokingCert.register_number}).
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Revocation Reason / Remarks
              </label>
              <textarea
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Specify official justification..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRevokingCert(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                disabled={actionLoading || !revokeReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Certificate Modal */}
      {deletingCert && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Delete Certificate Record</h4>
                  <p className="text-[11px] text-slate-400">#{deletingCert.certificate_number}</p>
                </div>
              </div>
              <button onClick={() => setDeletingCert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete certificate{' '}
              <span className="font-bold text-slate-900">#{deletingCert.certificate_number}</span> issued to{' '}
              <span className="font-bold text-slate-900">{deletingCert.student_name}</span>? This action will remove the clearance credential from the institutional database.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingCert(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
