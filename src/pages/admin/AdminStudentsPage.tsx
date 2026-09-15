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
import { SearchableSelect } from '../../components/common/SearchableSelect';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSem, setFilterSem] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
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
      let depts: Department[] = [];
      let crss: Course[] = [];

      try {
        const deptRes = await api.get('/student/departments');
        if (Array.isArray(deptRes.data) && deptRes.data.length > 0) {
          depts = deptRes.data;
          try { localStorage.setItem('cache_student_depts', JSON.stringify(depts)); } catch {}
        }
      } catch {
        try {
          const cached = localStorage.getItem('cache_student_depts');
          if (cached) depts = JSON.parse(cached);
        } catch {}
      }

      try {
        const courseRes = await api.get('/student/courses');
        if (Array.isArray(courseRes.data) && courseRes.data.length > 0) {
          crss = courseRes.data;
          try { localStorage.setItem('cache_student_courses', JSON.stringify(crss)); } catch {}
        }
      } catch {
        try {
          const cached = localStorage.getItem('cache_student_courses');
          if (cached) crss = JSON.parse(cached);
        } catch {}
      }

      if (depts.length > 0) setDepartments(depts);
      if (crss.length > 0) setCourses(crss);

      if (depts.length > 0 && crss.length > 0) {
        setFormData((prev) => ({
          ...prev,
          department_id: prev.department_id || depts[0].id,
          course_id: prev.course_id || crss[0].id
        }));
      }
    } catch (err) {
      console.warn('Recovered gracefully for departments/courses:', err);
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
      try { localStorage.setItem('cache_admin_students', JSON.stringify(list)); } catch {}
    } catch (err: any) {
      console.warn('Network issue fetching students, checking offline cache:', err);
      try {
        const cached = localStorage.getItem('cache_admin_students');
        if (cached) {
          setStudents(JSON.parse(cached));
        } else {
          setLoadError(err.response?.data?.detail || 'Failed to refresh students list from server.');
        }
      } catch {
        setLoadError(err.response?.data?.detail || 'Failed to refresh students list from server.');
      }
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

  const resetFilters = () => {
    setSearch('');
    setFilterCourse('all');
    setFilterDept('all');
    setFilterYear('all');
    setFilterSem('all');
    setFilterSection('all');
    setFilterStatus('all');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    filterCourse !== 'all' ||
    filterDept !== 'all' ||
    filterYear !== 'all' ||
    filterSem !== 'all' ||
    filterSection !== 'all' ||
    filterStatus !== 'all';

  const filteredStudents = safeStudents.filter((s) => {
    const filterDeptStr = String(filterDept ?? 'all').trim();
    const filterCourseStr = String(filterCourse ?? 'all').trim();
    const filterYearStr = String(filterYear ?? 'all').trim();
    const filterSemStr = String(filterSem ?? 'all').trim();
    const filterSectionStr = String(filterSection ?? 'all').trim();
    const searchStr = String(search ?? '').trim().toLowerCase();

    const matchesSearch =
      searchStr === '' ||
      Boolean(s.full_name?.toLowerCase().includes(searchStr)) ||
      Boolean(s.register_number?.toLowerCase().includes(searchStr)) ||
      Boolean(s.email?.toLowerCase().includes(searchStr)) ||
      Boolean(s.department_name?.toLowerCase().includes(searchStr)) ||
      Boolean(s.department_code?.toLowerCase().includes(searchStr)) ||
      Boolean(s.course_name?.toLowerCase().includes(searchStr)) ||
      Boolean(s.course_code?.toLowerCase().includes(searchStr)) ||
      Boolean(s.phone?.toLowerCase().includes(searchStr));

    const matchesCourse =
      filterCourseStr === 'all' ||
      filterCourseStr === '' ||
      String(s.course_id) === filterCourseStr ||
      Boolean(s.course_name?.toLowerCase().includes(filterCourseStr.toLowerCase())) ||
      Boolean(s.course_code?.toLowerCase().includes(filterCourseStr.toLowerCase()));

    const matchesDept =
      filterDeptStr === 'all' ||
      filterDeptStr === '' ||
      String(s.department_id) === filterDeptStr ||
      Boolean(s.department_name?.toLowerCase().includes(filterDeptStr.toLowerCase())) ||
      Boolean(s.department_code?.toLowerCase().includes(filterDeptStr.toLowerCase()));

    const matchesYear =
      filterYearStr === 'all' ||
      filterYearStr === '' ||
      String(s.year) === filterYearStr;

    const studentSem = s.semester || (s.year ? s.year * 2 - 1 : 1);
    const matchesSem =
      filterSemStr === 'all' ||
      filterSemStr === '' ||
      String(studentSem) === filterSemStr;

    const matchesSection =
      filterSectionStr === 'all' ||
      filterSectionStr === '' ||
      String(s.section || 'A').toUpperCase() === filterSectionStr.toUpperCase();

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && s.is_active !== false) ||
      (filterStatus === 'disabled' && s.is_active === false);

    return matchesSearch && matchesCourse && matchesDept && matchesYear && matchesSem && matchesSection && matchesStatus;
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
      <div className="flex flex-col gap-4">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStudents()}
              disabled={loading}
              className="p-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Refresh student records from server"
            >
              <RotateCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add Student
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative min-w-[200px] flex-1">
            <input
              type="text"
              placeholder="Search by name, reg no, email, dept..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-7 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="w-48">
            <SearchableSelect
              value={filterDept}
              onChange={(e) => setFilterDept(String(e.target.value ?? 'all'))}
              placeholder="All Departments"
              searchPlaceholder="Filter department..."
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              options={[
                { value: 'all', label: 'All Departments' },
                ...departments.map((d) => ({
                  value: String(d.id),
                  label: `${d.name} (${d.code})`
                }))
              ]}
            />
          </div>

          {/* Course / Degree Filter */}
          <div className="w-48">
            <SearchableSelect
              value={filterCourse}
              onChange={(e) => setFilterCourse(String(e.target.value ?? 'all'))}
              placeholder="All Degree Programs"
              searchPlaceholder="Filter degree/course..."
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              options={[
                { value: 'all', label: 'All Degree Programs' },
                ...courses.map((c) => ({
                  value: String(c.id),
                  label: `${c.name} (${c.code})`
                }))
              ]}
            />
          </div>

          {/* Year Filter */}
          <div className="w-32">
            <SearchableSelect
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              placeholder="All Years"
              searchPlaceholder="Filter year..."
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              options={[
                { value: 'all', label: 'All Years' },
                { value: '1', label: '1st Year' },
                { value: '2', label: '2nd Year' },
                { value: '3', label: '3rd Year' },
                { value: '4', label: '4th Year' }
              ]}
            />
          </div>

          {/* Semester Filter */}
          <div className="w-36">
            <SearchableSelect
              value={filterSem}
              onChange={(e) => setFilterSem(e.target.value)}
              placeholder="All Semesters"
              searchPlaceholder="Filter semester..."
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              options={[
                { value: 'all', label: 'All Semesters' },
                ...[1, 2, 3, 4, 5, 6, 7, 8].map(s => ({
                  value: String(s),
                  label: `Sem ${s}`
                }))
              ]}
            />
          </div>

          {/* Section Filter */}
          <div className="w-32">
            <SearchableSelect
              value={filterSection}
              onChange={(e) => setFilterSection(e.target.value)}
              placeholder="All Sections"
              searchPlaceholder="Filter section..."
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              options={[
                { value: 'all', label: 'All Sections' },
                { value: 'A', label: 'Section A' },
                { value: 'B', label: 'Section B' },
                { value: 'C', label: 'Section C' },
                { value: 'D', label: 'Section D' }
              ]}
            />
          </div>

          {/* Account Status Filter */}
          <div className="w-36">
            <SearchableSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              placeholder="All Accounts"
              searchPlaceholder="Filter status..."
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              options={[
                { value: 'all', label: 'All Accounts' },
                { value: 'active', label: 'Active Only' },
                { value: 'disabled', label: 'Disabled Only' }
              ]}
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Clear all active filters"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs">
        <div className="flex flex-wrap items-center gap-2 text-indigo-900">
          <span className="font-bold flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            Registry Count:
          </span>
          <span className="bg-white text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
            Showing {filteredStudents.length} of {safeStudents.length} Students
          </span>
          {hasActiveFilters && (
            <span className="bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-md text-[11px]">
              Filtered results
            </span>
          )}
          <span className="text-indigo-600">•</span>
          <span className="text-slate-600">All registered student records persisted</span>
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
          <p className="text-sm font-semibold text-slate-700">No students found matching current filters</p>
          <p className="text-xs text-slate-400 mt-1">
            {hasActiveFilters
              ? `There are ${safeStudents.length} students enrolled in the registry. Try clearing or adjusting your search filters.`
              : 'No students enrolled yet.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters & View All {safeStudents.length} Students
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Add New Student
            </button>
          </div>
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
                  <SearchableSelect
                    value={formData.department_id ? String(formData.department_id) : ''}
                    onChange={(e) => {
                      const val = String(e.target.value);
                      const num = Number(val);
                      if (!isNaN(num) && num > 0) {
                        setFormData({ ...formData, department_id: num });
                      } else {
                        const matched = departments.find(
                          (d) =>
                            d.name.toLowerCase() === val.toLowerCase() ||
                            d.code.toLowerCase() === val.toLowerCase()
                        );
                        if (matched) setFormData({ ...formData, department_id: matched.id });
                      }
                    }}
                    placeholder="Select or add department..."
                    searchPlaceholder="Type department name..."
                    allowCustom={true}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    options={departments.map((d) => ({
                      value: String(d.id),
                      label: `${d.name} (${d.code || 'DEPT'})`
                    }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Degree Course *</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCourse(!isCustomCourse)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      {isCustomCourse ? '← Pick Existing List' : '✏️ Type Custom Degree'}
                    </button>
                  </div>

                  {!isCustomCourse ? (
                    <SearchableSelect
                      value={formData.course_id ? String(formData.course_id) : ''}
                      onChange={(e) => {
                        const val = String(e.target.value);
                        const num = Number(val);
                        if (!isNaN(num) && num > 0) {
                          setFormData({ ...formData, course_id: num });
                        } else {
                          const matched = courses.find(
                            (c) =>
                              c.name.toLowerCase() === val.toLowerCase() ||
                              c.code.toLowerCase() === val.toLowerCase()
                          );
                          if (matched) {
                            setFormData({ ...formData, course_id: matched.id });
                          } else if (val.trim()) {
                            setIsCustomCourse(true);
                            handleCustomTitleChange('B.E.', val.trim());
                          }
                        }
                      }}
                      placeholder="Select or add degree course..."
                      searchPlaceholder="Type degree course..."
                      allowCustom={true}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                      options={courses.map((c) => ({
                        value: String(c.id),
                        label: c.name,
                        subLabel: c.code
                      }))}
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 border border-indigo-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Prefix</label>
                          <SearchableSelect
                            value={customDegreePrefix}
                            onChange={(e) => handleCustomTitleChange(String(e.target.value), customCourseTitle)}
                            placeholder="Prefix..."
                            searchPlaceholder="e.g. B.E."
                            allowCustom={true}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                            options={[
                              { value: 'B.E.', label: 'B.E.' },
                              { value: 'B.Tech', label: 'B.Tech' },
                              { value: 'M.E.', label: 'M.E.' },
                              { value: 'M.Tech', label: 'M.Tech' },
                              { value: 'MBA', label: 'MBA' },
                              { value: 'MCA', label: 'MCA' },
                              { value: 'None', label: 'None' }
                            ]}
                          />
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
                  <SearchableSelect
                    value={formData.year}
                    onChange={(e) => {
                      const yr = Number(e.target.value) || 1;
                      const validSems = [yr * 2 - 1, yr * 2];
                      const newSem = validSems.includes(formData.semester) ? formData.semester : yr * 2 - 1;
                      setFormData({ ...formData, year: yr, semester: newSem });
                    }}
                    placeholder="Select Year..."
                    searchPlaceholder="Type year..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                    options={[
                      { value: 1, label: '1st Year' },
                      { value: 2, label: '2nd Year' },
                      { value: 3, label: '3rd Year' },
                      { value: 4, label: '4th Year' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
                  <SearchableSelect
                    value={formData.semester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) || 1;
                      const calculatedYear = Math.ceil(sem / 2);
                      setFormData({ ...formData, semester: sem, year: calculatedYear });
                    }}
                    placeholder="Select Semester..."
                    searchPlaceholder="Type semester..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                    options={[
                      { value: 1, label: 'Sem 1 (1st Yr)' },
                      { value: 2, label: 'Sem 2 (1st Yr)' },
                      { value: 3, label: 'Sem 3 (2nd Yr)' },
                      { value: 4, label: 'Sem 4 (2nd Yr)' },
                      { value: 5, label: 'Sem 5 (3rd Yr)' },
                      { value: 6, label: 'Sem 6 (3rd Yr)' },
                      { value: 7, label: 'Sem 7 (4th Yr)' },
                      { value: 8, label: 'Sem 8 (4th Yr)' }
                    ]}
                  />
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
                  <SearchableSelect
                    value={formData.department_id ? String(formData.department_id) : ''}
                    onChange={(e) => {
                      const val = String(e.target.value);
                      const num = Number(val);
                      if (!isNaN(num) && num > 0) {
                        setFormData({ ...formData, department_id: num });
                      } else {
                        const matched = departments.find(
                          (d) =>
                            d.name.toLowerCase() === val.toLowerCase() ||
                            d.code.toLowerCase() === val.toLowerCase()
                        );
                        if (matched) setFormData({ ...formData, department_id: matched.id });
                      }
                    }}
                    placeholder="Select or add department..."
                    searchPlaceholder="Type department name..."
                    allowCustom={true}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    options={departments.map((d) => ({
                      value: String(d.id),
                      label: `${d.name} (${d.code || 'DEPT'})`
                    }))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Degree Course</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCourse(!isCustomCourse)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      {isCustomCourse ? '← Choose Existing' : '✏️ Type Custom Course'}
                    </button>
                  </div>

                  {!isCustomCourse ? (
                    <SearchableSelect
                      value={formData.course_id ? String(formData.course_id) : ''}
                      onChange={(e) => {
                        const val = String(e.target.value);
                        const num = Number(val);
                        if (!isNaN(num) && num > 0) {
                          setFormData({ ...formData, course_id: num });
                        } else {
                          const matched = courses.find(
                            (c) =>
                              c.name.toLowerCase() === val.toLowerCase() ||
                              c.code.toLowerCase() === val.toLowerCase()
                          );
                          if (matched) {
                            setFormData({ ...formData, course_id: matched.id });
                          } else if (val.trim()) {
                            setIsCustomCourse(true);
                            handleCustomTitleChange('B.E.', val.trim());
                          }
                        }
                      }}
                      placeholder="Select or add degree course..."
                      searchPlaceholder="Type degree course..."
                      allowCustom={true}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                      options={courses.map((c) => ({
                        value: String(c.id),
                        label: c.name,
                        subLabel: c.code
                      }))}
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 border border-indigo-200 rounded-xl space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Prefix</label>
                          <SearchableSelect
                            value={customDegreePrefix}
                            onChange={(e) => handleCustomTitleChange(String(e.target.value), customCourseTitle)}
                            placeholder="Prefix..."
                            searchPlaceholder="e.g. B.E."
                            allowCustom={true}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                            options={[
                              { value: 'B.E.', label: 'B.E.' },
                              { value: 'B.Tech', label: 'B.Tech' },
                              { value: 'M.E.', label: 'M.E.' },
                              { value: 'M.Tech', label: 'M.Tech' },
                              { value: 'MBA', label: 'MBA' },
                              { value: 'MCA', label: 'MCA' },
                              { value: 'None', label: 'None' }
                            ]}
                          />
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
                  <SearchableSelect
                    value={formData.year}
                    onChange={(e) => {
                      const yr = Number(e.target.value) || 1;
                      const validSems = [yr * 2 - 1, yr * 2];
                      const newSem = validSems.includes(formData.semester) ? formData.semester : yr * 2 - 1;
                      setFormData({ ...formData, year: yr, semester: newSem });
                    }}
                    placeholder="Select Year..."
                    searchPlaceholder="Type year..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                    options={[
                      { value: 1, label: '1st Year' },
                      { value: 2, label: '2nd Year' },
                      { value: 3, label: '3rd Year' },
                      { value: 4, label: '4th Year' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Semester *</label>
                  <SearchableSelect
                    value={formData.semester}
                    onChange={(e) => {
                      const sem = Number(e.target.value) || 1;
                      const calculatedYear = Math.ceil(sem / 2);
                      setFormData({ ...formData, semester: sem, year: calculatedYear });
                    }}
                    placeholder="Select Semester..."
                    searchPlaceholder="Type semester..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                    options={[
                      { value: 1, label: 'Sem 1 (1st Yr)' },
                      { value: 2, label: 'Sem 2 (1st Yr)' },
                      { value: 3, label: 'Sem 3 (2nd Yr)' },
                      { value: 4, label: 'Sem 4 (2nd Yr)' },
                      { value: 5, label: 'Sem 5 (3rd Yr)' },
                      { value: 6, label: 'Sem 6 (3rd Yr)' },
                      { value: 7, label: 'Sem 7 (4th Yr)' },
                      { value: 8, label: 'Sem 8 (4th Yr)' }
                    ]}
                  />
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
