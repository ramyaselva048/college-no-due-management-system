import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Download,
  Building2,
  CheckCircle2,
  Receipt,
  FileCheck2,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import { AdminDashboardData } from '../../types';

export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard').then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ['Department Code', 'Department Name', 'Pending Students Count', 'Unpaid Outstanding (INR)'],
      ...data.department_breakdown.map((d) => [
        d.department_code,
        `"${d.department_name}"`,
        d.pending_count,
        d.pending_amount
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'institutional_clearance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return <div className="py-20 text-center text-xs text-slate-400">Compiling executive reports...</div>;
  }

  const { stats, department_breakdown } = data;
  const clearedAmt = Number(stats?.cleared_dues_amount || 0);
  const pendingAmt = Number(stats?.pending_dues_amount || 0);
  const totalAmount = pendingAmt + clearedAmt;
  const recoveryRate = totalAmount > 0 ? (clearedAmt / totalAmount) * 100 : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Institutional Clearance Analytics & Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit summaries, recovery efficiency metrics, and departmental performance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print Report
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Department CSV
          </button>
        </div>
      </div>

      {/* Summary Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Financial Fee Recovery Rate</span>
          <p className="font-display font-extrabold text-3xl text-emerald-700 mt-2">
            {recoveryRate.toFixed(1)}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full"
              style={{ width: `${Math.min(100, recoveryRate)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            ₹{clearedAmt.toFixed(2)} collected of ₹{totalAmount.toFixed(2)}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Institutional Clearance Rate</span>
          <p className="font-display font-extrabold text-3xl text-indigo-700 mt-2">
            {stats.total_students > 0
              ? ((stats.valid_certificates_count / stats.total_students) * 100).toFixed(1)
              : '0.0'}%
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full"
              style={{
                width: `${
                  stats.total_students > 0
                    ? Math.min(100, (stats.valid_certificates_count / stats.total_students) * 100)
                    : 0
                }%`
              }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            {stats.valid_certificates_count} graduating students with official clearance
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Application Resolution Ratio</span>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-2">
            {stats.approved_requests_count + stats.rejected_requests_count}/
            {stats.approved_requests_count + stats.rejected_requests_count + stats.pending_requests_count}
          </p>
          <p className="text-[11px] text-slate-400 mt-4">
            {stats.pending_requests_count} applications currently in verification pipeline
          </p>
        </div>
      </div>

      {/* Department Clearance Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-display font-bold text-sm text-slate-900">
            Department Performance & Unsettled Liabilities
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit breakdown by department to identify bottlenecks in graduation clearances
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Department Node</th>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Students with Pending Dues</th>
                <th className="py-3.5 px-4">Outstanding Amount</th>
                <th className="py-3.5 px-4 text-right">Relative Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {department_breakdown.map((d) => {
                const isHighRisk = d.pending_amount > 5000 || d.pending_count > 10;
                return (
                  <tr key={d.department_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{d.department_name}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{d.department_code}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">{d.pending_count} students</td>
                    <td className="py-3.5 px-4 font-display font-bold text-slate-900">
                      ₹{Number(d.pending_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          d.pending_amount === 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : isHighRisk
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {d.pending_amount === 0 ? 'Clear' : isHighRisk ? 'High Volume' : 'Moderate'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
