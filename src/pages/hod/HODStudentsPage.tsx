import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  GraduationCap,
  FileCheck2,
  Building2,
  Receipt,
  ArrowLeft
} from 'lucide-react';
import api from '../../services/api';

export const HODStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hod/students');
      setStudents(res.data);
    } catch (err: any) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filtered = students.filter((s) => {
    if (selectedYear !== 'all' && String(s.year) !== selectedYear) return false;
    if (selectedSection !== 'all' && s.section !== selectedSection) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.register_number?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-xl text-slate-900">
              Department Students Directory
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
              All Batches
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Directory of enrolled students across all academic years in your department. Track their clearance status and pending dues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/dashboard"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={fetchStudents}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            Refresh Student List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or register no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Academic Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Sections</option>
            <option value="A">Section A</option>
            <option value="B">Section B</option>
            <option value="C">Section C</option>
          </select>

          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
            Showing <strong className="text-slate-800">{filtered.length}</strong> students
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading department students...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">No students found matching the filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Register Number</th>
                  <th className="px-5 py-3.5">Class / Section</th>
                  <th className="px-5 py-3.5">Clearance Request</th>
                  <th className="px-5 py-3.5">Pending Dues</th>
                  <th className="px-5 py-3.5 text-right">Clearance Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{s.full_name}</div>
                      <div className="text-[11px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                      {s.register_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800">Year {s.year}</span>
                      <div className="text-[10px] text-slate-400">Sem {s.semester || s.year * 2} • Sec {s.section}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.active_request_id ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <FileCheck2 className="w-3 h-3" />
                          <span>{s.active_request_exam || 'Active Form'} ({s.active_request_status})</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No Active Form</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.has_pending_dues ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <Receipt className="w-3 h-3" /> ₹{s.pending_due_amount} Due
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> No Institutional Dues
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {s.has_pending_dues ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Dues Settlement Needed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Ready for Clearance
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
