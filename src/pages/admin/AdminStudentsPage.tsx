import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  ShieldAlert,
  Power
} from 'lucide-react';
import api from '../../services/api';
import { StudentProfile } from '../../types';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [courses, setCourses] = useState<any[]>([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/students');
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    api.get('/student/courses').then((res) => setCourses(res.data));
  }, []);

  const handleToggleStatus = async (studentId: number) => {
    try {
      await api.patch(`/admin/students/${studentId}/status`);
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle student status');
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      search === '' ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.register_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = filterCourse === 'all' || s.course_name === filterCourse;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Enrolled Students Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Institutional directory of registered students, academic departments, and clearance status
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800"
          >
            <option value="all">All Degree Programs</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading student directory...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No students found matching current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student Profile</th>
                  <th className="py-3.5 px-4">Register Number</th>
                  <th className="py-3.5 px-4">Department & Degree</th>
                  <th className="py-3.5 px-4">Year / Sec</th>
                  <th className="py-3.5 px-4">Admission</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {student.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.full_name}</p>
                          <p className="text-[11px] text-slate-400">{student.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {student.register_number}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <p className="font-medium">{student.department_name}</p>
                      <p className="text-[11px] text-slate-400">{student.course_name}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      Year {student.year} ({student.section})
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      Batch {student.admission_year}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          student.is_active !== false
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {student.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(student.id)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors inline-flex items-center"
                        title={student.is_active !== false ? 'Deactivate Student' : 'Activate Student'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
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
