import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Filter
} from 'lucide-react';
import api from '../../services/api';
import { Department, SubjectCourse } from '../../types';

// Anna University / AICTE common course quick suggestion catalog
const QUICK_COURSE_SUGGESTIONS = [
  { title: 'Data Structures and Algorithms', code: 'CS3301', defaultDept: 'CSE', year: 2, sem: 3 },
  { title: 'Digital Principles and Computer Organization', code: 'CS3351', defaultDept: 'CSE', year: 2, sem: 3 },
  { title: 'Database Management Systems', code: 'CS3492', defaultDept: 'CSE', year: 2, sem: 4 },
  { title: 'Operating Systems', code: 'CS3452', defaultDept: 'CSE', year: 2, sem: 4 },
  { title: 'Computer Networks', code: 'CS3591', defaultDept: 'CSE', year: 3, sem: 5 },
  { title: 'Theory of Computation', code: 'CS3501', defaultDept: 'CSE', year: 3, sem: 5 },
  { title: 'Compiler Design', code: 'CS3601', defaultDept: 'CSE', year: 3, sem: 6 },
  { title: 'Artificial Intelligence and Machine Learning', code: 'CS3691', defaultDept: 'CSE', year: 3, sem: 6 },
  { title: 'Cloud Computing and Big Data Analytics', code: 'CS3701', defaultDept: 'CSE', year: 4, sem: 7 },
  { title: 'Cryptography and Cyber Security', code: 'CS3791', defaultDept: 'CSE', year: 4, sem: 7 },
  { title: 'Deep Learning & Ethics in AI', code: 'CS3801', defaultDept: 'CSE', year: 4, sem: 8 },
  { title: 'Object Oriented Programming using Java', code: 'IT3301', defaultDept: 'IT', year: 2, sem: 3 },
  { title: 'Web Technology and Frameworks', code: 'IT3401', defaultDept: 'IT', year: 2, sem: 4 },
  { title: 'Engineering Thermodynamics', code: 'ME3351', defaultDept: 'MECH', year: 2, sem: 3 },
  { title: 'Electric Circuit Analysis', code: 'EE3301', defaultDept: 'EEE', year: 2, sem: 3 },
  { title: 'Mechanics of Solids', code: 'CE3301', defaultDept: 'CIVIL', year: 2, sem: 3 }
];

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<SubjectCourse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [selectedSemFilter, setSelectedSemFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<SubjectCourse | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<SubjectCourse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Fields (department, course title, course code, year, semester)
  const [formDeptId, setFormDeptId] = useState<number>(0);
  const [formDeptName, setFormDeptName] = useState('');
  const [deptInputMode, setDeptInputMode] = useState<'type' | 'select'>('type');
  const [formCourseTitle, setFormCourseTitle] = useState('');
  const [formCourseCode, setFormCourseCode] = useState('');
  const [formYear, setFormYear] = useState<number>(1);
  const [formSemester, setFormSemester] = useState<number>(1);
  const [formError, setFormError] = useState('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, deptsRes] = await Promise.all([
        api.get<SubjectCourse[]>('/admin/subject-courses'),
        api.get<Department[]>('/departments')
      ]);
      setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
      const depts = Array.isArray(deptsRes.data) ? deptsRes.data : [];
      setDepartments(depts);
      if (depts.length > 0 && formDeptId === 0) {
        setFormDeptId(depts[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load courses data:', err);
      showToast('error', 'Failed to fetch courses list. Using offline cache.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingCourse(null);
    setFormCourseTitle('');
    setFormCourseCode('');
    setFormYear(1);
    setFormSemester(1);
    const defaultDept = departments[0];
    setFormDeptId(defaultDept?.id || 1);
    setFormDeptName(defaultDept ? `${defaultDept.name} (${defaultDept.code})` : '');
    setDeptInputMode('type');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: SubjectCourse) => {
    setEditingCourse(c);
    setFormCourseTitle(c.title);
    setFormCourseCode(c.code);
    setFormYear(c.year || 1);
    setFormSemester(c.semester || 1);
    const matchedDept = departments.find(d => d.id === c.department_id);
    setFormDeptId(c.department_id || departments[0]?.id || 1);
    setFormDeptName(c.department_name || (matchedDept ? `${matchedDept.name} (${matchedDept.code})` : ''));
    setDeptInputMode('type');
    setFormError('');
    setIsModalOpen(true);
  };

  // When year changes, ensure semester is within the corresponding year
  const handleYearChange = (newYear: number) => {
    setFormYear(newYear);
    // If current semester is outside the year's default semesters, update it
    const minSem = (newYear - 1) * 2 + 1;
    const maxSem = newYear * 2;
    if (formSemester < minSem || formSemester > maxSem) {
      setFormSemester(minSem);
    }
  };

  const handleDeptNameChange = (val: string) => {
    setFormDeptName(val);
    const trimmed = val.trim().toLowerCase();
    const matched = departments.find(d =>
      d.name.toLowerCase() === trimmed ||
      d.code.toLowerCase() === trimmed ||
      `${d.name} (${d.code})`.toLowerCase() === trimmed ||
      trimmed.includes(d.code.toLowerCase())
    );
    if (matched) {
      setFormDeptId(matched.id);
    }
  };

  const handleSelectDeptChip = (dept: Department) => {
    setFormDeptId(dept.id);
    setFormDeptName(`${dept.name} (${dept.code})`);
  };

  const handleApplyPreset = (preset: typeof QUICK_COURSE_SUGGESTIONS[0]) => {
    setFormCourseTitle(preset.title);
    setFormCourseCode(preset.code);
    setFormYear(preset.year);
    setFormSemester(preset.sem);
    const matchedDept = departments.find(d => d.code.toUpperCase() === preset.defaultDept.toUpperCase());
    if (matchedDept) {
      setFormDeptId(matchedDept.id);
      setFormDeptName(`${matchedDept.name} (${matchedDept.code})`);
    } else {
      setFormDeptName(preset.defaultDept);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedTitle = formCourseTitle.trim();
    if (!trimmedTitle) {
      setFormError('Course Title is required');
      return;
    }

    const trimmedCode = formCourseCode.trim().toUpperCase();
    if (!trimmedCode) {
      setFormError('Course Code is required');
      return;
    }

    const trimmedDeptName = formDeptName.trim();
    if (!trimmedDeptName && !formDeptId) {
      setFormError('Please type or select a Department');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        department_id: formDeptId || undefined,
        department_name: trimmedDeptName || undefined,
        department: trimmedDeptName || formDeptId,
        course_title: trimmedTitle,
        course_code: trimmedCode,
        year: Number(formYear),
        semester: Number(formSemester)
      };

      if (editingCourse) {
        const res = await api.patch<SubjectCourse>(`/admin/subject-courses/${editingCourse.id}`, payload);
        setCourses(prev => prev.map(c => (c.id === editingCourse.id ? res.data : c)));
        showToast('success', `Course "${trimmedTitle}" updated successfully`);
      } else {
        const res = await api.post<SubjectCourse>('/admin/subject-courses', payload);
        setCourses(prev => [res.data, ...prev]);
        showToast('success', `Course "${trimmedTitle}" added successfully`);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Failed saving course:', err);
      setFormError(err?.response?.data?.detail || 'Failed to save course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/subject-courses/${deletingCourse.id}`);
      setCourses(prev => prev.filter(c => c.id !== deletingCourse.id));
      showToast('success', `Course "${deletingCourse.title}" deleted successfully`);
      setDeletingCourse(null);
    } catch (err: any) {
      console.error('Failed deleting course:', err);
      showToast('error', err?.response?.data?.detail || 'Failed to delete course');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      // Search filter
      const matchesSearch =
        !search.trim() ||
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        (c.department_name && c.department_name.toLowerCase().includes(search.toLowerCase())) ||
        (c.department_code && c.department_code.toLowerCase().includes(search.toLowerCase()));

      // Dept filter
      const matchesDept =
        selectedDeptFilter === 'ALL' || String(c.department_id) === selectedDeptFilter;

      // Year filter
      const matchesYear =
        selectedYearFilter === 'ALL' || String(c.year) === selectedYearFilter;

      // Sem filter
      const matchesSem =
        selectedSemFilter === 'ALL' || String(c.semester) === selectedSemFilter;

      return matchesSearch && matchesDept && matchesYear && matchesSem;
    });
  }, [courses, search, selectedDeptFilter, selectedYearFilter, selectedSemFilter]);

  // Quick stats
  const stats = useMemo(() => {
    const total = courses.length;
    const year1_2 = courses.filter(c => c.year === 1 || c.year === 2).length;
    const year3_4 = courses.filter(c => c.year === 3 || c.year === 4).length;
    const deptsCount = new Set(courses.map(c => c.department_id)).size;
    return { total, year1_2, year3_4, deptsCount };
  }, [courses]);

  const getYearBadgeColor = (year: number) => {
    switch (year) {
      case 1:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 2:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 3:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 4:
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-12" id="admin-courses-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
              Courses
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage departmental curriculum courses, course codes, academic year, and semester subjects
          </p>
        </div>

        <button
          id="add-course-btn"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Course</span>
        </button>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Courses</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-display font-bold text-2xl text-slate-900 mt-2">{stats.total}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Across all departments</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Year 1 & 2 Subjects</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="font-display font-bold text-2xl text-indigo-600 mt-2">{stats.year1_2}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Semesters 1 to 4</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Year 3 & 4 Subjects</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <p className="font-display font-bold text-2xl text-purple-600 mt-2">{stats.year3_4}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Semesters 5 to 8</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Departments</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-display font-bold text-2xl text-emerald-600 mt-2">{stats.deptsCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">With assigned curriculum</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="course-search-input"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by course title, course code (e.g. CS3301), or department..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              id="dept-filter-select"
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={String(d.id)}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <select
              id="year-filter-select"
              value={selectedYearFilter}
              onChange={e => setSelectedYearFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Years</option>
              <option value="1">Year 1 (1st Yr)</option>
              <option value="2">Year 2 (2nd Yr)</option>
              <option value="3">Year 3 (3rd Yr)</option>
              <option value="4">Year 4 (Final Yr)</option>
            </select>
          </div>

          {/* Semester Filter */}
          <div className="flex items-center gap-2">
            <select
              id="sem-filter-select"
              value={selectedSemFilter}
              onChange={e => setSelectedSemFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          {(selectedDeptFilter !== 'ALL' || selectedYearFilter !== 'ALL' || selectedSemFilter !== 'ALL' || search) && (
            <button
              onClick={() => {
                setSelectedDeptFilter('ALL');
                setSelectedYearFilter('ALL');
                setSelectedSemFilter('ALL');
                setSearch('');
              }}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Courses List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Loading courses curriculum...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-16 text-center px-4 space-y-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base text-slate-800">
                No Courses Found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {search || selectedDeptFilter !== 'ALL' || selectedYearFilter !== 'ALL' || selectedSemFilter !== 'ALL'
                  ? 'No course matches your current search or filter criteria. Try resetting filters.'
                  : 'No curriculum courses have been added yet. Click "+ Add Course" to create the first course.'}
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" id="courses-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-4">Course Code</th>
                  <th className="py-3.5 px-4">Course Title</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Year</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map(course => {
                  const dept = departments.find(d => d.id === course.department_id);
                  const deptName = course.department_name || dept?.name || 'Department';
                  const deptCode = course.department_code || dept?.code || 'DEPT';

                  return (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                      id={`course-row-${course.id}`}
                    >
                      {/* Course Code */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                          {course.code}
                        </span>
                      </td>

                      {/* Course Title */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">
                          {course.title}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800">
                            {deptName}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {deptCode}
                          </span>
                        </div>
                      </td>

                      {/* Year */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getYearBadgeColor(
                            course.year
                          )}`}
                        >
                          Year {course.year}
                        </span>
                      </td>

                      {/* Semester */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Semester {course.semester}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                            course.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              course.is_active !== false ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {course.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            id={`edit-course-${course.id}`}
                            onClick={() => openEditModal(course)}
                            title="Edit Course"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            id={`delete-course-${course.id}`}
                            onClick={() => setDeletingCourse(course)}
                            title="Delete Course"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] flex flex-col my-auto overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Pinned Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    {editingCourse ? 'Edit Course' : 'Add New Course'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingCourse
                      ? 'Update course details and curriculum position'
                      : 'Fill in the course title, code, department, year, and semester'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Container */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              {/* Scrollable Form Body */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain focus:outline-none">
                {formError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Quick Preset helper for new courses */}
                {!editingCourse && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>Quick Suggestion Presets:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {QUICK_COURSE_SUGGESTIONS.slice(0, 6).map(preset => (
                        <button
                          key={preset.code}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="text-[11px] px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 rounded-lg font-medium transition-all text-left truncate max-w-[200px] cursor-pointer"
                        >
                          {preset.code}: {preset.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. Type Department */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Type Department <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setDeptInputMode('type')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                          deptInputMode === 'type'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Type Department
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeptInputMode('select')}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                          deptInputMode === 'select'
                            ? 'bg-white text-blue-700 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Select List
                      </button>
                    </div>
                  </div>

                  {deptInputMode === 'type' ? (
                    <div className="space-y-2">
                      <div className="relative">
                        <input
                          id="form-course-department-type"
                          type="text"
                          list="department-type-options"
                          value={formDeptName}
                          onChange={e => handleDeptNameChange(e.target.value)}
                          placeholder="Type department (e.g. Computer Science, ECE, Mechanical, IT...)"
                          required
                          className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                        />
                        <datalist id="department-type-options">
                          {departments.map(d => (
                            <option key={d.id} value={`${d.name} (${d.code})`} />
                          ))}
                        </datalist>
                      </div>

                      {/* Quick Department Suggestion Chips */}
                      {departments.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                            Quick Select Department:
                          </span>
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                            {departments.map(d => {
                              const isSelected =
                                formDeptId === d.id ||
                                formDeptName.toLowerCase().includes(d.code.toLowerCase()) ||
                                formDeptName.toLowerCase().includes(d.name.toLowerCase());
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => handleSelectDeptChip(d)}
                                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                                      : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200 hover:border-blue-300'
                                  }`}
                                >
                                  {d.code} - {d.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <select
                        id="form-course-department-select"
                        value={formDeptId}
                        onChange={e => {
                          const id = Number(e.target.value);
                          setFormDeptId(id);
                          const d = departments.find(x => x.id === id);
                          if (d) setFormDeptName(`${d.name} (${d.code})`);
                        }}
                        required
                        className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Type any department name or select directly from institutional offerings
                  </span>
                </div>

                {/* 2. Course Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-course-title"
                    type="text"
                    value={formCourseTitle}
                    onChange={e => setFormCourseTitle(e.target.value)}
                    placeholder="e.g. Data Structures and Algorithms"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>

                {/* 3. Course Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Course Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-course-code"
                    type="text"
                    value={formCourseCode}
                    onChange={e => setFormCourseCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS3301"
                    required
                    className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-mono text-slate-800 uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Official catalog / regulation code (e.g. CS3301, EC8452, ME3351)
                  </span>
                </div>

                {/* 4 & 5. Year and Semester (Two columns) */}
                <div className="grid grid-cols-2 gap-3 pb-2">
                  {/* Year */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Year <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="form-course-year"
                      value={formYear}
                      onChange={e => handleYearChange(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    >
                      <option value={1}>1st Year (Year 1)</option>
                      <option value={2}>2nd Year (Year 2)</option>
                      <option value={3}>3rd Year (Year 3)</option>
                      <option value={4}>4th Year (Final Year)</option>
                    </select>
                  </div>

                  {/* Semester */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Semester <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="form-course-semester"
                      value={formSemester}
                      onChange={e => setFormSemester(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                        const isExpectedForYear = Math.ceil(sem / 2) === formYear;
                        return (
                          <option key={sem} value={sem}>
                            Semester {sem} {isExpectedForYear ? '★' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/80 shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-course-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{editingCourse ? 'Save Changes' : 'Add Course'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150 my-auto">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Delete Course?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-slate-800">
                  {deletingCourse.title} ({deletingCourse.code})
                </span>
                ? This will remove it from the curriculum catalog.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-course-btn"
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Delete Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
