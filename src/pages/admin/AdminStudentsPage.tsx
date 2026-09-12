import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Power,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  Layers,
  Sparkles,
  ShieldCheck,
  RotateCw
} from 'lucide-react';
import api from '../../services/api';
import { Department, Course } from '../../types';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSem, setFilterSem] = useState('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Custom Course Mode states (for both add & edit)
  const [isCustomCourse, setIsCustomCourse] = useState(false);
  const [customDegreePrefix, setCustomDegreePrefix] = useState('B.E.');
  const [customCourseTitle, setCustomCourseTitle] = useState('');
  const [customCourseCode, setCustomCourseCode] = useState('');
  const [customCourseDuration, setCustomCourseDuration] = useState(4);

  const initialForm = {
    full_name: '',
    register_number: '',
    email: '',
    password: '',
    phone: '',
    department_id: 0,
    course_id: 0,
    year: 1,
    semester: 1,
    section: 'A',
    admission_year: new Date().getFullYear()
  };

  const [formData, setFormData] = useState(initialForm);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const fetchDependencies = async () => {
    try {
      const [deptRes, courseRes] = await Promise.all([
        api.get('/student/departments'),
        api.get('/student/courses')
      ]);
      const depts = Array.isArray(deptRes.data) ? deptRes.data : [];
      const crss = Array.isArray(courseRes.data) ? courseRes.data : [];
      setDepartments(depts);
      setCourses(crss);
      if (depts.length > 0 && crss.length > 0) {
        setFormData((prev) => ({
          ...prev,
          department_id: prev.department_id || depts[0].id,
          course_id: prev.course_id || crss[0].id
        }));
      }
    } catch (err) {
      console.error('Failed to load departments/courses', err);
    }
  };

  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await api.get('/admin/students');
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.students) ? res.data.students : []);
      setStudents(list);
    } catch (err: any) {
      console.error('Failed to load students', err);
      setLoadError(err.response?.data?.detail || 'Failed to refresh students list from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchDependencies();
  }, []);

  const handleToggleStatus = async (studentId: number, currentActive: boolean) => {
    try {
      await api.patch(`/admin/students/${studentId}/status`);
      showToast(`Student status ${currentActive ? 'deactivated' : 'activated'} successfully.`);
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle student status');
    }
  };

  const openCreateModal = () => {
    setFormError(null);
    setIsCustomCourse(false);
    setCustomDegreePrefix('B.E.');
    setCustomCourseTitle('');
    setCustomCourseCode('');
    setCustomCourseDuration(4);
    setFormData({
      ...initialForm,
      department_id: departments[0]?.id || 1,
      course_id: courses[0]?.id || 1,
      year: 1,
      semester: 1
    });
    setIsCreateOpen(true);
  };

  const openEditModal = (student: any) => {
    setFormError(null);
    setIsCustomCourse(false);
    setCustomDegreePrefix('B.E.');
    setCustomCourseTitle('');
    setCustomCourseCode('');
    setCustomCourseDuration(4);
    setEditingStudent(student);
    const yr = Number(student.year) || 1;
    const sem = Number(student.semester) || (yr * 2 - 1);
    setFormData({
      full_name: student.full_name || '',
      register_number: student.register_number || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      department_id: student.department_id || departments[0]?.id || 1,
      course_id: student.course_id || courses[0]?.id || 1,
      year: yr,
      semester: sem,
      section: student.section || 'A',
      admission_year: student.admission_year || new Date().getFullYear()
    });
  };

  // Custom Course helper
  const handleCustomTitleChange = (prefix: string, title: string) => {
    setCustomDegreePrefix(prefix);
    setCustomCourseTitle(title);

    const fullTitle = prefix === 'None' || !prefix ? title.trim() : `${prefix} ${title}`.trim();
    const suggestedCode = fullTitle
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 16)
      .toUpperCase();

    let duration = 4;
    if (prefix.includes('M.E.') || prefix.includes('M.Tech') || prefix.includes('MBA') || prefix.includes('MCA')) {
      duration = 2;
    } else if (prefix.includes('Diploma')) {
      duration = 3;
    }

    setCustomCourseCode(suggestedCode);
    setCustomCourseDuration(duration);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const payload: any = { ...formData };

      if (isCustomCourse) {
        const fullCourseName = customDegreePrefix === 'None' || !customDegreePrefix
          ? customCourseTitle.trim()
          : `${customDegreePrefix} ${customCourseTitle}`.trim();

        if (!fullCourseName) {
          setFormError('Please enter a custom degree course title or select an existing one.');
          setSubmitting(false);
          return;
        }

        payload.custom_course_name = fullCourseName;
        payload.custom_course_code = customCourseCode || fullCourseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15).toUpperCase();
        payload.custom_course_duration = customCourseDuration;
        payload.course_id = 0; // Trigger custom course creation on server
      }

      await api.post('/admin/students', payload);
      setIsCreateOpen(false);
      showToast(`Student "${payload.full_name}" enrolled successfully!`);
      await Promise.all([fetchStudents(), fetchDependencies()]);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to register student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const payload: any = { ...formData };
      if (!payload.password) {
        delete payload.password;
      }

      if (isCustomCourse) {
        const fullCourseName = customDegreePrefix === 'None' || !customDegreePrefix
          ? customCourseTitle.trim()
          : `${customDegreePrefix} ${customCourseTitle}`.trim();

        if (!fullCourseName) {
          setFormError('Please enter a valid degree course title.');
          setSubmitting(false);
          return;
        }

        payload.custom_course_name = fullCourseName;
        payload.custom_course_code = customCourseCode || fullCourseName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15).toUpperCase();
        payload.custom_course_duration = customCourseDuration;
      }

      await api.patch(`/admin/students/${editingStudent.id}`, payload);
      setEditingStudent(null);
      showToast(`Student profile "${payload.full_name}" updated and saved!`);
      await Promise.all([fetchStudents(), fetchDependencies()]);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to update student profile');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/students/${deletingStudent.id}`);
      showToast(`Student "${deletingStudent.full_name}" and all records deleted.`);
      setDeletingStudent(null);
      await fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete student');
    } finally {
      setSubmitting(false);
    }
  };

  const safeStudents = Array.isArray(students) ? students : [];

  const filteredStudents = safeStudents.filter((s) => {
    const matchesSearch =
      search === '' ||
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.register_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.department_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.course_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCourse =
      filterCourse === 'all' ||
      !filterCourse ||
      s.course_name?.toLowerCase().includes(filterCourse.toLowerCase());
    const matchesDept =
      filterDept === 'all' ||
      !filterDept ||
      String(s.department_id) === filterDept ||
      s.department_name?.toLowerCase().includes(filterDept.toLowerCase());
    const matchesYear =
      filterYear === 'all' ||
      !filterYear ||
      String(s.year) === filterYear;
    const studentSem = s.semester || (s.year ? s.year * 2 - 1 : 1);
    const matchesSem =
      filterSem === 'all' ||
      !filterSem ||
      String(studentSem) === filterSem;
    return matchesSearch && matchesCourse && matchesDept && matchesYear && matchesSem;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-emerald-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold border border-emerald-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Enrolled Students Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student registrations, engineering degree programs, edit profiles, and clearance accounts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Semester Filter */}
          <select
            value={filterSem}
            onChange={(e) => setFilterSem(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Semesters</option>
            <option value="1">Sem 1</option>
            <option value="2">Sem 2</option>
            <option value="3">Sem 3</option>
            <option value="4">Sem 4</option>
            <option value="5">Sem 5</option>
            <option value="6">Sem 6</option>
            <option value="7">Sem 7</option>
            <option value="8">Sem 8</option>
          </select>

          <div className="relative">
            <input
              type="text"
              list="students-filter-course-list"
              placeholder="Degree / course..."
              value={filterCourse === 'all' ? '' : filterCourse}
              onChange={(e) => setFilterCourse(e.target.value || 'all')}
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 max-w-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            />
            <datalist id="students-filter-course-list">
              <option value="all">All Degree Programs</option>
              {courses.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search students, reg no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-48"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={() => fetchStudents()}
            disabled={loading}
            className="p-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            title="Refresh student records"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Student
          </button>
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs">
        <div className="flex flex-wrap items-center gap-2 text-indigo-900">
          <span className="font-bold flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Active Registry:
          </span>
          <span className="bg-white text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
            {safeStudents.length} Students Enrolled
          </span>
          <span className="text-indigo-600">•</span>
          <span className="text-slate-600">All Academic Departments & Years 1–4 Configured</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Default Student Password:</span>
          <code className="px-2 py-0.5 bg-white text-indigo-700 border border-indigo-200 font-mono font-bold rounded-md">
            College@123
          </code>
        </div>
      </div>

      {loadError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <button
            onClick={() => fetchStudents()}
            className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-300 rounded-lg text-amber-900 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      )}

      {/* Students Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading student directory...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No students found matching current filters.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1"
          >
            <PlusCircle className="w-3 h-3" /> Enroll First Student
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student Profile</th>
                  <th className="py-3.5 px-4">Register Number</th>
                  <th className="py-3.5 px-4">Degree & Department</th>
                  <th className="py-3.5 px-4">Year / Sem / Sec</th>
                  <th className="py-3.5 px-4">Batch</th>
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

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100">
                        {student.register_number}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <p className="font-semibold text-slate-900">{student.course_name || 'Degree Not Set'}</p>
                      <p className="text-[11px] text-slate-400">{student.department_name}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="font-semibold text-slate-900">
                        Year {student.year} • Sem {student.semester || (student.year ? student.year * 2 - 1 : 1)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Section {student.section || 'A'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      Batch {student.admission_year}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            student.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {student.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          ✓ Portal Login Ready
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors inline-flex items-center"
                          title="Edit Student Profile"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(student.id, student.is_active !== false)}
                          className={`p-1.5 rounded-lg border transition-colors inline-flex items-center ${
                            student.is_active !== false
                              ? 'border-slate-200 hover:bg-amber-50 text-amber-600'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                          title={student.is_active !== false ? 'Disable Student Account' : 'Activate Student Account'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingStudent(student)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center"
                          title="Delete Student Record"
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

      {/* Add Student Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Enroll New Student</h3>
                <p className="text-[11px] text-slate-500">
                  Register student credentials and assign engineering degree program
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. S. Karthik"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Register Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 713522104042"
                    value={formData.register_number}
                    onChange={(e) => setFormData({ ...formData, register_number: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">College Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. karthik@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Defaults to StudentPassword@123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Department *</label>
                  <input
                    type="text"
                    list="student-departments-datalist"
                    placeholder="Type department..."
                    value={departments.find((d) => d.id === formData.department_id)?.name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = departments.find(
                        (d) =>
                          d.name.toLowerCase() === val.toLowerCase() ||
                          d.code.toLowerCase() === val.toLowerCase() ||
                          String(d.id) === val
                      );
                      if (matched) {
                        setFormData({ ...formData, department_id: matched.id });
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    required
                  />
                  <datalist id="student-departments-datalist">
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.code}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Degree Course *</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCourse(!isCustomCourse)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {isCustomCourse ? '← Pick Existing List' : '✏️ Type Custom Degree'}
                    </button>
                  </div>

                  {!isCustomCourse ? (
                    <div>
                      <input
                        type="text"
                        list="student-courses-datalist"
                        placeholder="Type degree course..."
                        value={courses.find((c) => c.id === formData.course_id)?.name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = courses.find(
                            (c) =>
                              c.name.toLowerCase() === val.toLowerCase() ||
                              c.code.toLowerCase() === val.toLowerCase() ||
                              String(c.id) === val
                          );
                          if (matched) {
                            setFormData({ ...formData, course_id: matched.id });
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                      />
                      <datalist id="student-courses-datalist">
                        {courses.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.code}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-indigo-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Prefix</label>
                          <input
                            type="text"
                            list="student-degree-prefixes-datalist"
                            placeholder="e.g. B.E."
                            value={customDegreePrefix}
                            onChange={(e) => handleCustomTitleChange(e.target.value, customCourseTitle)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                          />
                          <datalist id="student-degree-prefixes-datalist">
                            <option value="B.E." />
                            <option value="B.Tech" />
                            <option value="M.E." />
                            <option value="M.Tech" />
                            <option value="MBA" />
                            <option value="MCA" />
                            <option value="None" />
                          </datalist>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Type Course Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Robotics & Automation"
                            value={customCourseTitle}
                            onChange={(e) => handleCustomTitleChange(customDegreePrefix, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-indigo-700">
                        Will be created as: <strong>{customDegreePrefix !== 'None' ? `${customDegreePrefix} ` : ''}{customCourseTitle || 'Your Course'}</strong>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Year *</label>
                  <select
                    value={formData.year}
                    onChange={(e) => {
                      const yr = Number(e.target.value) || 1;
                      const validSems = [yr * 2 - 1, yr * 2];
                      const newSem = validSems.includes(formData.semester) ? formData.semester : yr * 2 - 1;
                      setFormData({ ...formData, year: yr, semester: newSem });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) || 1;
                      const calculatedYear = Math.ceil(sem / 2);
                      setFormData({ ...formData, semester: sem, year: calculatedYear });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={1}>Sem 1 (1st Yr)</option>
                    <option value={2}>Sem 2 (1st Yr)</option>
                    <option value={3}>Sem 3 (2nd Yr)</option>
                    <option value={4}>Sem 4 (2nd Yr)</option>
                    <option value={5}>Sem 5 (3rd Yr)</option>
                    <option value={6}>Sem 6 (3rd Yr)</option>
                    <option value={7}>Sem 7 (4th Yr)</option>
                    <option value={8}>Sem 8 (4th Yr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="A"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={formData.admission_year}
                    onChange={(e) => setFormData({ ...formData, admission_year: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  {submitting ? 'Enrolling...' : 'Save & Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Student Record</h3>
                <p className="text-[11px] text-slate-400 font-mono">{editingStudent.register_number}</p>
              </div>
              <button
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Register Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.register_number}
                    onChange={(e) => setFormData({ ...formData, register_number: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reset Password <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep unchanged"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    list="student-edit-departments-datalist"
                    placeholder="Type department..."
                    value={departments.find((d) => d.id === formData.department_id)?.name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = departments.find(
                        (d) =>
                          d.name.toLowerCase() === val.toLowerCase() ||
                          d.code.toLowerCase() === val.toLowerCase() ||
                          String(d.id) === val
                      );
                      if (matched) {
                        setFormData({ ...formData, department_id: matched.id });
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                  <datalist id="student-edit-departments-datalist">
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.code}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Degree Course</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCourse(!isCustomCourse)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {isCustomCourse ? '← Choose Existing' : '✏️ Type Custom Course'}
                    </button>
                  </div>

                  {!isCustomCourse ? (
                    <div>
                      <input
                        type="text"
                        list="student-edit-courses-datalist"
                        placeholder="Type degree course..."
                        value={courses.find((c) => c.id === formData.course_id)?.name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = courses.find(
                            (c) =>
                              c.name.toLowerCase() === val.toLowerCase() ||
                              c.code.toLowerCase() === val.toLowerCase() ||
                              String(c.id) === val
                          );
                          if (matched) {
                            setFormData({ ...formData, course_id: matched.id });
                          }
                        }}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                      />
                      <datalist id="student-edit-courses-datalist">
                        {courses.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.code}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-indigo-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Prefix</label>
                          <input
                            type="text"
                            list="student-edit-prefixes-datalist"
                            placeholder="e.g. B.E."
                            value={customDegreePrefix}
                            onChange={(e) => handleCustomTitleChange(e.target.value, customCourseTitle)}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                          />
                          <datalist id="student-edit-prefixes-datalist">
                            <option value="B.E." />
                            <option value="B.Tech" />
                            <option value="M.E." />
                            <option value="M.Tech" />
                            <option value="MBA" />
                            <option value="MCA" />
                            <option value="None" />
                          </datalist>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Type Course Name</label>
                          <input
                            type="text"
                            placeholder="e.g. Biomedical Engineering"
                            value={customCourseTitle}
                            onChange={(e) => handleCustomTitleChange(customDegreePrefix, e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Current Year *</label>
                  <select
                    value={formData.year}
                    onChange={(e) => {
                      const yr = Number(e.target.value) || 1;
                      const validSems = [yr * 2 - 1, yr * 2];
                      const newSem = validSems.includes(formData.semester) ? formData.semester : yr * 2 - 1;
                      setFormData({ ...formData, year: yr, semester: newSem });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
                  <select
                    value={formData.semester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) || 1;
                      const calculatedYear = Math.ceil(sem / 2);
                      setFormData({ ...formData, semester: sem, year: calculatedYear });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={1}>Sem 1 (1st Yr)</option>
                    <option value={2}>Sem 2 (1st Yr)</option>
                    <option value={3}>Sem 3 (2nd Yr)</option>
                    <option value={4}>Sem 4 (2nd Yr)</option>
                    <option value={5}>Sem 5 (3rd Yr)</option>
                    <option value={6}>Sem 6 (3rd Yr)</option>
                    <option value={7}>Sem 7 (4th Yr)</option>
                    <option value={8}>Sem 8 (4th Yr)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Year</label>
                  <input
                    type="number"
                    value={formData.admission_year}
                    onChange={(e) => setFormData({ ...formData, admission_year: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-sm">Delete Student Profile?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Permanently remove <strong>{deletingStudent.full_name}</strong> ({deletingStudent.register_number})?
                This will cascade and remove their login credentials, clearances, and dues.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteStudent}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
