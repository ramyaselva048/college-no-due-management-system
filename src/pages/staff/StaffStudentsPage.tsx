import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { AddDueModal } from '../../components/modals/AddDueModal';
import { useAuth } from '../../context/AuthContext';

export const StaffStudentsPage: React.FC = () => {
  const { staffProfile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudentForDue, setSelectedStudentForDue] = useState<any | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/students');
      setStudents(res.data);
    } catch (err: any) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(
    (s) =>
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.register_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Student Clearance Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search students to view departmental standing or record disciplinary and fee liabilities
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search student name or reg no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading directory...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">No Students Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Register Number</th>
                  <th className="py-3.5 px-4">Program / Course</th>
                  <th className="py-3.5 px-4">Year & Section</th>
                  <th className="py-3.5 px-4">Dept Standing</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => {
                  const hasDues = student.department_dues_pending > 0;
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                            {student.full_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{student.full_name}</p>
                            <p className="text-[11px] text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {student.register_number}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {student.course_name || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        Year {student.year} (Sec {student.section})
                      </td>

                      <td className="py-3.5 px-4">
                        {hasDues ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px]">
                            <AlertTriangle className="w-3 h-3" />
                            ₹{student.department_dues_pending.toFixed(2)} Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Clear
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedStudentForDue(student)}
                          className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Record Due
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Due Modal */}
      {selectedStudentForDue && (
        <AddDueModal
          studentId={selectedStudentForDue.id}
          studentName={selectedStudentForDue.full_name}
          studentRegNo={selectedStudentForDue.register_number}
          defaultDepartmentId={staffProfile?.department_id}
          isOpen={!!selectedStudentForDue}
          onClose={() => setSelectedStudentForDue(null)}
          onSuccess={fetchStudents}
        />
      )}
    </div>
  );
};
