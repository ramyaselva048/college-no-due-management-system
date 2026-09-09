import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { Department, Course } from '../../types';

// Pre-defined catalog of common engineering degree programs
const ENGINEERING_PRESETS = [
  { degree: 'B.E.', name: 'Computer Science and Engineering', code: 'BE_CSE', dept_code: 'CSE', duration: 4 },
  { degree: 'B.Tech', name: 'Artificial Intelligence and Data Science', code: 'BTECH_AIDS', dept_code: 'AIDS', duration: 4 },
  { degree: 'B.Tech', name: 'Information Technology', code: 'BTECH_IT', dept_code: 'IT', duration: 4 },
  { degree: 'B.Tech', name: 'Artificial Intelligence and Machine Learning', code: 'BTECH_AIML', dept_code: 'AIDS', duration: 4 },
  { degree: 'B.Tech', name: 'Cyber Security', code: 'BTECH_CS', dept_code: 'CSE', duration: 4 },
  { degree: 'B.Tech', name: 'Computer Science and Business Systems', code: 'BTECH_CSBS', dept_code: 'CSE', duration: 4 },
  { degree: 'B.E.', name: 'Electronics and Communication Engineering', code: 'BE_ECE', dept_code: 'ECE', duration: 4 },
  { degree: 'B.E.', name: 'Electrical and Electronics Engineering', code: 'BE_EEE', dept_code: 'EEE', duration: 4 },
  { degree: 'B.E.', name: 'Mechanical Engineering', code: 'BE_MECH', dept_code: 'MECH', duration: 4 },
  { degree: 'B.E.', name: 'Civil Engineering', code: 'BE_CIVIL', dept_code: 'CIVIL', duration: 4 },
  { degree: 'B.E.', name: 'Mechatronics Engineering', code: 'BE_MTE', dept_code: 'MECH', duration: 4 },
  { degree: 'B.E.', name: 'Biomedical Engineering', code: 'BE_BME', dept_code: 'BME', duration: 4 },
  { degree: 'B.E.', name: 'Automobile Engineering', code: 'BE_AUTO', dept_code: 'MECH', duration: 4 },
  { degree: 'B.Tech', name: 'Chemical Engineering', code: 'BTECH_CHEM', dept_code: 'CSE', duration: 4 },
  { degree: 'B.Tech', name: 'Biotechnology', code: 'BTECH_BIO', dept_code: 'BME', duration: 4 },
  { degree: 'M.E.', name: 'Computer Science and Engineering', code: 'ME_CSE', dept_code: 'CSE', duration: 2 },
  { degree: 'M.E.', name: 'VLSI Design', code: 'ME_VLSI', dept_code: 'ECE', duration: 2 },
  { degree: 'M.E.', name: 'Embedded System Technologies', code: 'ME_EST', dept_code: 'ECE', duration: 2 },
  { degree: 'M.E.', name: 'Power Electronics and Drives', code: 'ME_PED', dept_code: 'EEE', duration: 2 },
  { degree: 'M.E.', name: 'Structural Engineering', code: 'ME_STR', dept_code: 'CIVIL', duration: 2 },
  { degree: 'M.E.', name: 'CAD / CAM', code: 'ME_CAD', dept_code: 'MECH', duration: 2 },
  { degree: 'M.Tech', name: 'Data Science', code: 'MTECH_DS', dept_code: 'AIDS', duration: 2 },
  { degree: 'MBA', name: 'Master of Business Administration', code: 'MBA', dept_code: 'MBA', duration: 2 },
  { degree: 'MCA', name: 'Master of Computer Applications', code: 'MCA', dept_code: 'MCA', duration: 2 }
];

export const AdminCoursesPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'BE' | 'BTECH' | 'PG' | 'CUSTOM'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states
  const [entryMode, setEntryMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<string>('');
  const [degreePrefix, setDegreePrefix] = useState('B.E.');
  const [customCourseName, setCustomCourseName] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department_id: 0,
    duration: 4
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const fetchDependencies = async () => {
    try {
      const res = await api.get('/student/departments');
      const depts = Array.isArray(res.data) ? res.data : [];
      setDepartments(depts);
      if (depts.length > 0 && formData.department_id === 0) {
        setFormData((prev) => ({ ...prev, department_id: depts[0].id }));
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/courses');
      const data = Array.isArray(res.data) ? res.data : [];
      setCourses(data);
    } catch (err) {
      console.error('Failed to fetch courses', err);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchDependencies();
  }, []);

  const openCreateModal = () => {
    setError(null);
    setEntryMode('preset');
    setSelectedPresetIndex('');
    setDegreePrefix('B.E.');
    setCustomCourseName('');
    setFormData({
      name: '',
      code: '',
      department_id: departments[0]?.id || 1,
      duration: 4
    });
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setError(null);
    setEditingCourse(c);
    setEntryMode('custom');
    setFormData({
      name: c.name,
      code: c.code,
      department_id: c.department_id || departments[0]?.id || 1,
      duration: c.duration || 4
    });
  };

  // Handle Preset selection
  const handlePresetChange = (indexStr: string) => {
    setSelectedPresetIndex(indexStr);
    if (!indexStr) return;
    const idx = parseInt(indexStr, 10);
    const preset = ENGINEERING_PRESETS[idx];
    if (preset) {
      const matchedDept = departments.find(
        (d) => d.code === preset.dept_code || d.name.toLowerCase().includes(preset.dept_code.toLowerCase())
      );

      const fullName = preset.degree ? `${preset.degree} ${preset.name}` : preset.name;
      setFormData({
        name: fullName,
        code: preset.code,
        department_id: matchedDept ? matchedDept.id : (departments[0]?.id || 1),
        duration: preset.duration
      });
    }
  };

  // When admin types custom degree prefix or course name
  const handleCustomDegreeChange = (prefix: string, name: string) => {
    setDegreePrefix(prefix);
    setCustomCourseName(name);

    const fullTitle = prefix === 'None' || !prefix ? name.trim() : `${prefix} ${name}`.trim();
    const suggestedCode = fullTitle
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 16)
      .toUpperCase();

    let defaultDuration = 4;
    if (prefix.includes('M.E.') || prefix.includes('M.Tech') || prefix.includes('MBA') || prefix.includes('MCA')) {
      defaultDuration = 2;
    } else if (prefix.includes('Diploma')) {
      defaultDuration = 3;
    }

    setFormData((prev) => ({
      ...prev,
      name: fullTitle,
      code: prev.code && !prev.code.startsWith('AUTO_') ? prev.code : suggestedCode,
      duration: defaultDuration
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Please provide a course or degree title.');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/admin/courses', {
        ...formData,
        name: trimmedName,
        code: formData.code.trim().toUpperCase(),
        department_id: Number(formData.department_id) || departments[0]?.id || 1
      });
      setIsModalOpen(false);
      showToast(`Degree program "${trimmedName}" created successfully!`);
      await fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create academic course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setSubmitting(true);
    setError(null);

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Please enter a valid degree title.');
      setSubmitting(false);
      return;
    }

    try {
      await api.patch(`/admin/courses/${editingCourse.id}`, {
        ...formData,
        name: trimmedName,
        code: formData.code.trim().toUpperCase(),
        department_id: Number(formData.department_id)
      });
      setEditingCourse(null);
      showToast(`Degree program "${trimmedName}" updated successfully!`);
      await fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCourse) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/courses/${deletingCourse.id}`);
      showToast(`Program "${deletingCourse.name}" deleted successfully.`);
      setDeletingCourse(null);
      await fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete course');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.code?.toLowerCase().includes(search.toLowerCase()) ||
      c.department_name?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedTab === 'BE') {
      return c.name?.startsWith('B.E.') || c.code?.startsWith('BE_');
    }
    if (selectedTab === 'BTECH') {
      return c.name?.startsWith('B.Tech') || c.code?.startsWith('BTECH_');
    }
    if (selectedTab === 'PG') {
      return (
        c.name?.startsWith('M.E.') ||
        c.name?.startsWith('M.Tech') ||
        c.name?.includes('MBA') ||
        c.name?.includes('MCA') ||
        c.duration <= 2
      );
    }
    if (selectedTab === 'CUSTOM') {
      return (
        !c.name?.startsWith('B.E.') &&
        !c.name?.startsWith('B.Tech') &&
        !c.name?.startsWith('M.E.') &&
        !c.name?.startsWith('M.Tech') &&
        !c.name?.includes('MBA') &&
        !c.name?.includes('MCA')
      );
    }
    return true;
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            Engineering Courses & Degrees
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full engineering college degree programs catalog with instant custom typing option
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search degrees, codes, depts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-60"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Degree / Course
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: `All Programs (${courses.length})` },
          { id: 'BE', label: 'B.E. Programs' },
          { id: 'BTECH', label: 'B.Tech Programs' },
          { id: 'PG', label: 'Postgraduate (M.E./M.Tech/MBA/MCA)' },
          { id: 'CUSTOM', label: 'Custom Degrees' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              selectedTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading degree programs...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-medium">No courses found matching criteria.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1"
          >
            <PlusCircle className="w-3 h-3" /> Add New Degree Course
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Degree & Course Title</th>
                  <th className="py-3.5 px-4">Course Code</th>
                  <th className="py-3.5 px-4">Parent Department</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{c.name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{c.department_name || 'Academic'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{c.duration} Years</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors inline-flex items-center"
                          title="Edit Course"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => setDeletingCourse(c)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center"
                          title="Delete Course"
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

      {/* Add Degree / Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Add Degree Program</h3>
                <p className="text-[11px] text-slate-500">
                  Select from standard engineering catalog or type your own custom degree
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEntryMode('preset')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${
                    entryMode === 'preset' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Engineering Catalog Presets
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntryMode('custom');
                    setSelectedPresetIndex('');
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${
                    entryMode === 'custom' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> ✏️ Type Custom Course / Degree
                </button>
              </div>

              {entryMode === 'preset' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Engineering College Degree & Course *
                  </label>
                  <select
                    value={selectedPresetIndex}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose from Engineering Catalog --</option>
                    <optgroup label="Undergraduate Engineering (B.E. / B.Tech - 4 Years)">
                      {ENGINEERING_PRESETS.filter((p) => p.duration === 4).map((p, idx) => (
                        <option key={idx} value={ENGINEERING_PRESETS.indexOf(p)}>
                          {p.degree} {p.name} ({p.code})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Postgraduate & Masters (M.E. / M.Tech / MBA / MCA - 2 Years)">
                      {ENGINEERING_PRESETS.filter((p) => p.duration === 2).map((p, idx) => (
                        <option key={idx} value={ENGINEERING_PRESETS.indexOf(p)}>
                          {p.degree} {p.name} ({p.code})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Or switch to "Type Custom Course" if your program is not in the list.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Degree Prefix</label>
                      <select
                        value={degreePrefix}
                        onChange={(e) => handleCustomDegreeChange(e.target.value, customCourseName)}
                        className="w-full text-xs px-2.5 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                      >
                        <option value="B.E.">B.E.</option>
                        <option value="B.Tech">B.Tech</option>
                        <option value="M.E.">M.E.</option>
                        <option value="M.Tech">M.Tech</option>
                        <option value="MBA">MBA</option>
                        <option value="MCA">MCA</option>
                        <option value="B.Sc">B.Sc</option>
                        <option value="M.Sc">M.Sc</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Ph.D">Ph.D</option>
                        <option value="None">None (Custom)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Type Course / Specialization Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Robotics and Automation"
                        value={customCourseName}
                        onChange={(e) => handleCustomDegreeChange(degreePrefix, e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Full Title (Editable preview) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Program Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.E. Computer Science and Engineering"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BE_CSE"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Years)</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years (Masters/PG)</option>
                    <option value={3}>3 Years (Diploma/Lateral)</option>
                    <option value={4}>4 Years (Standard B.E./B.Tech)</option>
                    <option value={5}>5 Years (Integrated)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Degree Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Degree Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Degree Program</h3>
                <p className="text-[11px] text-slate-400 font-mono">{editingCourse.code}</p>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-3">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Program Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Years)</label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value={1}>1 Year</option>
                    <option value={2}>2 Years</option>
                    <option value={3}>3 Years</option>
                    <option value={4}>4 Years</option>
                    <option value={5}>5 Years</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-slate-900 text-sm">Delete Degree Program?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>{deletingCourse.name}</strong> ({deletingCourse.code})?
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
