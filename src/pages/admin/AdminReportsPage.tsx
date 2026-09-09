import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  Download,
  Building2,
  CheckCircle2,
  Receipt,
  FileCheck2,
  Printer,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { AdminDashboardData } from '../../types';

export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState<'clear_cycle' | 'clear_dues' | 'full_reset'>('clear_cycle');
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReportData = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/admin/dashboard');
      setData(res.data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to fetch updated clearance report');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
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
    link.setAttribute('download', `institutional_clearance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    try {
      // Create a dedicated invisible iframe to print cleanly without app layout distortion
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const html = generateReportHtml();
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 3000);
          }
        }, 300);
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Iframe print fallback triggered:', e);
      try {
        window.print();
      } catch (err) {
        handleOpenInNewWindow();
      }
    }
  };

  const generateReportHtml = () => {
    if (!data) return '';
    const now = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
    const clearedAmt = Number(data.stats?.cleared_dues_amount || 0);
    const pendingAmt = Number(data.stats?.pending_dues_amount || 0);
    const totalAmount = pendingAmt + clearedAmt;
    const recoveryRate = totalAmount > 0 ? (clearedAmt / totalAmount) * 100 : 100;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apex Institute - Official Clearance & Financial Audit Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 30px; line-height: 1.5; font-size: 13px; background: #fff; }
    .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 24px; }
    .institution { font-size: 22px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
    .affiliation { font-size: 11px; color: #475569; margin: 4px 0 0; }
    .report-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 10px 0 0; text-transform: uppercase; }
    .meta-bar { font-size: 11px; color: #64748b; margin-top: 6px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background: #f8fafc; }
    .kpi-title { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; margin: 0 0 6px; }
    .kpi-val { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
    .kpi-sub { font-size: 11px; color: #64748b; margin: 4px 0 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #f1f5f9; color: #334155; text-align: left; padding: 10px 12px; border: 1px solid #cbd5e1; font-weight: 700; text-transform: uppercase; font-size: 11px; }
    td { padding: 10px 12px; border: 1px solid #cbd5e1; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
    .badge-clear { background: #ecfdf5; color: #047857; }
    .badge-high { background: #fef2f2; color: #b91c1c; }
    .badge-med { background: #fffbeb; color: #b45309; }
    .footer { margin-top: 50px; display: flex; justify-content: space-between; padding-top: 30px; border-top: 1px dashed #94a3b8; }
    .sign-block { width: 220px; text-align: center; }
    .sign-line { border-top: 1px solid #0f172a; margin-top: 45px; padding-top: 6px; font-weight: 700; font-size: 12px; }
    @media print {
      body { margin: 12mm; font-size: 12px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="institution">APEX INSTITUTE OF TECHNOLOGY & HIGHER EDUCATION</h1>
    <p class="affiliation">Approved by AICTE & Affiliated to Anna University | Accredited Grade A+ | Office of Academic Affairs</p>
    <div class="report-title">INSTITUTIONAL NO DUE CLEARANCE & FINANCIAL AUDIT REPORT</div>
    <div class="meta-bar">Generated: ${now} | Ref: REP-${Date.now().toString().slice(-6)} | Authorized By: Institutional Admin Console</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Fee Recovery Efficiency</div>
      <div class="kpi-val" style="color: #059669;">${recoveryRate.toFixed(1)}%</div>
      <div class="kpi-sub">₹${clearedAmt.toFixed(2)} collected of ₹${totalAmount.toFixed(2)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Graduation Clearance Rate</div>
      <div class="kpi-val" style="color: #4f46e5;">${data.stats.total_students > 0 ? ((data.stats.valid_certificates_count / data.stats.total_students) * 100).toFixed(1) : '0.0'}%</div>
      <div class="kpi-sub">${data.stats.valid_certificates_count} of ${data.stats.total_students} students certified clear</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Applications Resolved</div>
      <div class="kpi-val">${data.stats.approved_requests_count + data.stats.rejected_requests_count} / ${data.stats.approved_requests_count + data.stats.rejected_requests_count + data.stats.pending_requests_count}</div>
      <div class="kpi-sub">${data.stats.pending_requests_count} applications pending verification</div>
    </div>
  </div>

  <h3 style="font-size: 14px; font-weight: 700; color: #1e293b; margin: 20px 0 8px; text-transform: uppercase;">
    Department Clearance Performance & Outstanding Student Liabilities
  </h3>
  <table>
    <thead>
      <tr>
        <th>Department Unit</th>
        <th>Code</th>
        <th>Pending Students</th>
        <th>Outstanding Liabilities (₹)</th>
        <th>Clearance Assessment</th>
      </tr>
    </thead>
    <tbody>
      ${data.department_breakdown.map((d) => {
        const isHigh = d.pending_amount > 5000 || d.pending_count > 10;
        return `
        <tr>
          <td><strong>${d.department_name}</strong></td>
          <td style="font-family: monospace; font-weight: 600;">${d.department_code}</td>
          <td>${d.pending_count} students</td>
          <td><strong>₹${Number(d.pending_amount || 0).toFixed(2)}</strong></td>
          <td>
            ${
              d.pending_amount === 0
                ? '<span class="badge badge-clear">Full Clearance</span>'
                : isHigh
                ? '<span class="badge badge-high">High Outstanding</span>'
                : '<span class="badge badge-med">Moderate Dues</span>'
            }
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <div class="sign-block">
      <div class="sign-line">Prepared By: Admin Incharge</div>
    </div>
    <div class="sign-block">
      <div class="sign-line">Audited By: Dean of Student Affairs</div>
    </div>
    <div class="sign-block">
      <div class="sign-line">Principal & Executive Authority</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadHtml = () => {
    const html = generateReportHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Apex_Clearance_Report_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenInNewWindow = () => {
    const html = generateReportHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (!w) {
      handleDownloadHtml();
    }
  };

  const handleExecuteReset = async () => {
    try {
      setResetting(true);
      setErrorMsg(null);
      const res = await api.post('/admin/reset', { mode: resetMode });
      setSuccessMsg(res.data.message || 'Admin portal reset completed successfully.');
      setShowResetModal(false);
      await fetchReportData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to complete reset operation.');
    } finally {
      setResetting(false);
    }
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
      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header with Print & Reset Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Institutional Clearance Analytics & Reports
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit summaries, recovery efficiency metrics, and departmental clearance performance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh / Reset Data View */}
          <button
            onClick={fetchReportData}
            disabled={refreshing}
            title="Reset and refresh report data"
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Dedicated Working Print Report Button */}
          <button
            onClick={() => setShowPrintModal(true)}
            id="print-report-button"
            className="px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Print Report</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-xs font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Admin Portal Reset (reset panni kudu admin portala) */}
          <button
            onClick={() => setShowResetModal(true)}
            id="admin-portal-reset-button"
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset Portal</span>
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
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-sm text-slate-900">
              Department Performance & Unsettled Liabilities
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit breakdown by department to identify bottlenecks in graduation clearances
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            {department_breakdown.length} Departments Audited
          </span>
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

      {/* ========================================================================= */}
      {/* MODAL 1: DEDICATED OFFICIAL REPORT PRINT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header & Action Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    Printable Institutional Clearance Report
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official layout configured for letterhead printing and PDF archiving
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Direct Print Button */}
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>

                {/* Open in New Tab (Bypasses iframe print blocking) */}
                <button
                  onClick={handleOpenInNewWindow}
                  title="Open report in dedicated window for direct browser print dialog"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open New Tab</span>
                </button>

                {/* Download Standalone HTML */}
                <button
                  onClick={handleDownloadHtml}
                  title="Download self-contained report file"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download HTML</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Document Preview */}
            <div className="p-6 overflow-y-auto bg-slate-100/70 flex-1">
              <div
                id="printable-report"
                className="printable-document bg-white p-8 sm:p-10 rounded-xl shadow-xs border border-slate-200 max-w-3xl mx-auto text-slate-900"
              >
                {/* College Letterhead */}
                <div className="text-center pb-5 mb-6 border-b-2 border-indigo-900">
                  <h1 className="font-display font-extrabold text-lg sm:text-xl text-indigo-900 tracking-tight">
                    APEX INSTITUTE OF TECHNOLOGY & HIGHER EDUCATION
                  </h1>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Approved by AICTE & Affiliated to Anna University | Accredited Grade A+
                  </p>
                  <p className="text-[11px] font-bold text-slate-800 mt-0.5 uppercase tracking-wide">
                    Office of Academic Affairs & Student Clearance Administration
                  </p>
                  <div className="mt-3 inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-800 text-xs font-extrabold uppercase tracking-wider">
                    Institutional Clearance & Financial Audit Executive Report
                  </div>
                  <div className="mt-2 text-[10px] text-slate-500 font-mono">
                    Generated: {new Date().toLocaleString()} | Ref: REP-CLEARANCE-{Date.now().toString().slice(-6)}
                  </div>
                </div>

                {/* Key Executive Statistics */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Fee Recovery Rate
                    </span>
                    <p className="font-display font-bold text-xl text-emerald-700 mt-1">
                      {recoveryRate.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      ₹{clearedAmt.toFixed(2)} collected
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Graduation Clearance
                    </span>
                    <p className="font-display font-bold text-xl text-indigo-700 mt-1">
                      {stats.total_students > 0
                        ? ((stats.valid_certificates_count / stats.total_students) * 100).toFixed(1)
                        : '0.0'}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {stats.valid_certificates_count} of {stats.total_students} students
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Resolved Applications
                    </span>
                    <p className="font-display font-bold text-xl text-slate-900 mt-1">
                      {stats.approved_requests_count + stats.rejected_requests_count}/
                      {stats.approved_requests_count + stats.rejected_requests_count + stats.pending_requests_count}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {stats.pending_requests_count} pending reviews
                    </p>
                  </div>
                </div>

                {/* Breakdown Table */}
                <div className="mb-6">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 mb-2">
                    Departmental Clearance & Unsettled Liabilities Audit
                  </h4>
                  <table className="w-full text-left text-[11px] border border-slate-200">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Department</th>
                        <th className="py-2 px-3">Code</th>
                        <th className="py-2 px-3">Pending Students</th>
                        <th className="py-2 px-3">Outstanding (₹)</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {department_breakdown.map((d) => (
                        <tr key={d.department_id}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{d.department_name}</td>
                          <td className="py-2 px-3 font-mono text-slate-700">{d.department_code}</td>
                          <td className="py-2 px-3">{d.pending_count} students</td>
                          <td className="py-2 px-3 font-semibold">₹{Number(d.pending_amount || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                d.pending_amount === 0
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {d.pending_amount === 0 ? 'Full Clearance' : 'Dues Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Official Signatures */}
                <div className="pt-8 mt-8 border-t border-dashed border-slate-300 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-600">
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      Administrative Officer
                    </div>
                    <span>College Records Section</span>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      Dean (Academic Affairs)
                    </div>
                    <span>Clearance Oversight Committee</span>
                  </div>
                  <div>
                    <div className="h-10"></div>
                    <div className="border-t border-slate-400 pt-1 font-bold text-slate-800">
                      Principal / Registrar
                    </div>
                    <span>Apex Institute of Technology</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADMIN PORTAL DATA & CLEARANCE CYCLE RESET CONSOLE */}
      {/* ========================================================================= */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    Admin Portal System Reset
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reset clearance cycles or restore clean baseline institutional records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-5 space-y-3.5">
              <p className="text-xs text-slate-600">
                Choose the scope of reset operation for the college portal:
              </p>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetMode === 'clear_cycle'
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_mode"
                  checked={resetMode === 'clear_cycle'}
                  onChange={() => setResetMode('clear_cycle')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold block">
                    Reset Clearance Cycle (New Academic Semester)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clears student clearance applications, department approvals, and issued certificates. Keeps all student accounts, staff, departments, and dues intact.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetMode === 'clear_dues'
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_mode"
                  checked={resetMode === 'clear_dues'}
                  onChange={() => setResetMode('clear_dues')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold block">
                    Clear Dues & Payment Records
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clears all student fee records and payment logs, resetting pending liabilities to zero.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetMode === 'full_reset'
                    ? 'border-rose-600 bg-rose-50/40 text-rose-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reset_mode"
                  checked={resetMode === 'full_reset'}
                  onChange={() => setResetMode('full_reset')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold block text-rose-700">
                    Institutional Baseline Reset (Full Reset)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Restores clean institutional default database: baseline departments, courses, official staff clearance officers, and enrolled student accounts. Clears test data.
                  </p>
                </div>
              </label>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  This operation is logged in the permanent audit trail. Existing active administrator credentials will remain valid.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                disabled={resetting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-xs ${
                  resetMode === 'full_reset'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {resetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{resetting ? 'Resetting...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
