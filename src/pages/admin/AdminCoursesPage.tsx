import React, { useState, useEffect } from 'react';
import {
  Search,
  PlusCircle,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { Department, Course } from '../../types';

// Common branches catalog for autocomplete suggestions
const COMMON_BRANCH_PRESETS = [
  { degree: 'B.E.', branch: 'Computer Science and Engineering', code: 'BE_CSE', dept: 'CSE', duration: 4 },
  { degree: 'B.Tech', branch: 'Artificial Intelligence and Data Science', code: 'BTECH_AIDS', dept: 'AIDS', duration: 4 },
  { degree: 'B.Tech', branch: 'Information Technology', code: 'BTECH_IT', dept: 'IT', duration: 4 },
  { degree: 'B.Tech', branch: 'Artificial Intelligence and Machine Learning', code: 'BTECH_AIML', dept: 'AIDS', duration: 4 },
  { degree: 'B.Tech', branch: 'Cyber Security', code: 'BTECH_CS', dept: 'CSE', duration: 4 },
  { degree: 'B.Tech', branch: 'Computer Science and Business Systems', code: 'BTECH_CSBS', dept: 'CSE', duration: 4 },
  { degree: 'B.E.', branch: 'Electronics and Communication Engineering', code: 'BE_ECE', dept: 'ECE', duration: 4 },
  { degree: 'B.E.', branch: 'Electrical and Electronics Engineering', code: 'BE_EEE', dept: 'EEE', duration: 4 },
  { degree: 'B.E.', branch: 'Mechanical Engineering', code: 'BE_MECH', dept: 'MECH', duration: 4 },
  { degree: 'B.E.', branch: 'Civil Engineering', code: 'BE_CIVIL', dept: 'CIVIL', duration: 4 },
  { degree: 'B.E.', branch: 'Mechatronics Engineering', code: 'BE_MTE', dept: 'MECH', duration: 4 },
  { degree: 'B.E.', branch: 'Biomedical Engineering', code: 'BE_BME', dept: 'BME', duration: 4 },
  { degree: 'B.E.', branch: 'Automobile Engineering', code: 'BE_AUTO', dept: 'MECH', duration: 4 },
  { degree: 'B.Tech', branch: 'Chemical Engineering', code: 'BTECH_CHEM', dept: 'CSE', duration: 4 },
  { degree: 'B.Tech', branch: 'Biotechnology', code: 'BTECH_BIO', dept: 'BME', duration: 4 },
  { degree: 'M.E.', branch: 'Computer Science and Engineering', code: 'ME_CSE', dept: 'CSE', duration: 2 },
  { degree: 'M.E.', branch: 'VLSI Design', code: 'ME_VLSI', dept: 'ECE', duration: 2 },
  { degree: 'M.E.', branch: 'Embedded System Technologies', code: 'ME_EST', dept: 'ECE', duration: 2 },
  { degree: 'M.E.', branch: 'Power Electronics and Drives', code: 'ME_PED', dept: 'EEE', duration: 2 },
  { degree: 'M.E.', branch: 'Structural Engineering', code: 'ME_STR', dept: 'CIVIL', duration: 2 },
  { degree: 'M.E.', branch: 'CAD / CAM', code: 'ME_CAD', dept: 'MECH', duration: 2 },
  { degree: 'M.Tech', branch: 'Data Science', code: 'MTECH_DS', dept: 'AIDS', duration: 2 },
  { degree: 'MBA', branch: 'Master of Business Administration', code: 'MBA', dept: 'MBA', duration: 2 },
  { degree: 'MCA', branch: 'Master of Computer Applications', code: 'MCA', dept: 'MCA', duration: 2 }
];

const DEGREE_SUGGESTIONS = [
  'B.E.',
  'B.Tech',
  'M.E.',
  'M.Tech',
  'MBA',
  'MCA',
  'B.Sc',
  'M.Sc',
  'Diploma',
  'Ph.D'
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

  // Form Fields: Type Degree, Type Branch, Branch Code, Duration (Years), Department
  const [degreeType, setDegreeType] = useState('B.E.');
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [duration, setDuration] = useState<number>(4);
  const [departmentId, setDepartmentId] = useState<number>(0);
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const fetchDependencies = async () => {
    try {
      const res = await api.get('/student/departments');
      const depts = Array.isArray(res.data) ? res.data : [];
      setDepartments(depts);
      if (depts.length > 0 && departmentId === 0) {
        setDepartmentId(depts[0].id);
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

  // Helper to auto-generate code from degree and branch
  const generateSuggestedCode = (deg: string, br: string) => {
    // Check if matches preset
    const preset = COMMON_BRANCH_PRESETS.find(
      (p) => p.branch.toLowerCase() === br.toLowerCase() && p.degree.toLowerCase() === deg.toLowerCase()
    );
    if (preset) return preset.code;

    const cleanDeg = deg.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cleanBr = br
      .split(/\s+/)
      .filter((w) => !['and', 'of', '&', 'in', 'the'].includes(w.toLowerCase()))
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase();

    if (cleanDeg && cleanBr) {
      return `${cleanDeg}_${cleanBr}`;
    }
    if (cleanBr) return cleanBr;
    return br.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 10).toUpperCase();
  };

  // Helper to parse existing course title into degree & branch
  const parseDegreeAndBranch = (fullName: string) => {
    const knownDegrees = ['B.Tech', 'B.E.', 'M.Tech', 'M.E.', 'MBA', 'MCA', 'B.Sc', 'M.Sc', 'Diploma', 'Ph.D'];
    for (const deg of knownDegrees) {
      if (fullName.startsWith(deg)) {
        return {
          degree: deg,
          branch: fullName.substring(deg.length).trim()
        };
      }
    }
    const parts = fullName.split(' ');
    if (parts.length > 1 && (parts[0].endsWith('.') || parts[0].length <= 5)) {
      return {
        degree: parts[0],
        branch: parts.slice(1).join(' ')
      };
    }
    return {
      degree: '',
      branch: fullName
    };
  };

  const handleDegreeChange = (newDeg: string) => {
    setDegreeType(newDeg);
    // Auto-adjust default duration
    if (newDeg.includes('M.E.') || newDeg.includes('M.Tech') || newDeg.includes('MBA') || newDeg.includes('MCA')) {
      setDuration(2);
    } else if (newDeg.includes('Diploma')) {
      setDuration(3);
    } else if (newDeg.includes('B.E.') || newDeg.includes('B.Tech')) {
      setDuration(4);
    }

    if (!codeManuallyEdited && branchName.trim()) {
      setBranchCode(generateSuggestedCode(newDeg, branchName));
    }
  };

  const handleBranchChange = (newBr: string) => {
    setBranchName(newBr);

    // Auto-match department if available
    const matchedPreset = COMMON_BRANCH_PRESETS.find(
      (p) => p.branch.toLowerCase() === newBr.toLowerCase()
    );
    if (matchedPreset) {
      const d = departments.find(
        (dept) => dept.code === matchedPreset.dept || dept.name.toLowerCase().includes(matchedPreset.dept.toLowerCase())
      );
      if (d) setDepartmentId(d.id);
    }

    if (!codeManuallyEdited) {
      setBranchCode(generateSuggestedCode(degreeType, newBr));
    }
  };

  const openCreateModal = () => {
    setError(null);
    setDegreeType('B.E.');
    setBranchName('');
    setBranchCode('');
    setDuration(4);
    setDepartmentId(departments[0]?.id || 1);
    setCodeManuallyEdited(false);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setError(null);
    setEditingCourse(c);
    const parsed = parseDegreeAndBranch(c.name);
    setDegreeType(parsed.degree || 'B.E.');
    setBranchName(parsed.branch);
    setBranchCode(c.code);
    setDuration(c.duration || 4);
    setDepartmentId(c.department_id || departments[0]?.id || 1);
    setCodeManuallyEdited(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const trimmedBranch = branchName.trim();
    if (!trimmedBranch) {
      setError('Please enter a branch name.');
      setSubmitting(false);
      return;
    }

    const trimmedDegree = degreeType.trim();
    const fullName = trimmedDegree ? `${trimmedDegree} ${trimmedBranch}` : trimmedBranch;

    let finalCode = branchCode.trim().toUpperCase();
    if (!finalCode) {
      finalCode = generateSuggestedCode(trimmedDegree, trimmedBranch);
    }

    try {
      await api.post('/admin/courses', {
        name: fullName,
        code: finalCode,
        department_id: Number(departmentId) || departments[0]?.id || 1,
        duration: Number(duration) || 4
      });
      setIsModalOpen(false);
      showToast(`Degree / Branch "${fullName}" created successfully!`);
      await fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create degree / branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setSubmitting(true);
    setError(null);

    const trimmedBranch = branchName.trim();
    if (!trimmedBranch) {
      setError('Please enter a branch name.');
      setSubmitting(false);
      return;
    }

    const trimmedDegree = degreeType.trim();
    const fullName = trimmedDegree ? `${trimmedDegree} ${trimmedBranch}` : trimmedBranch;

    let finalCode = branchCode.trim().toUpperCase();
    if (!finalCode) {
      finalCode = editingCourse.code;
    }

    try {
      await api.patch(`/admin/courses/${editingCourse.id}`, {
        name: fullName,
        code: finalCode,
        department_id: Number(departmentId) || departments[0]?.id || 1,
        duration: Number(duration) || 4
      });
      setEditingCourse(null);
      showToast(`Degree / Branch "${fullName}" updated successfully!`);
      await fetchCourses();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update degree / branch');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCourse) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/courses/${deletingCourse.id}`);
      showToast(`Degree / Branch "${deletingCourse.name}" deleted successfully.`);
      setDeletingCourse(null);
      await fetchCourses();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete degree / branch');
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
            Degrees & Branches
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage institutional academic degrees, branch specializations, branch codes, and program durations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search degrees, branches, codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-60"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Degree/Branch
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: `All Degrees & Branches (${courses.length})` },
          { id: 'BE', label: 'B.E. Branches' },
          { id: 'BTECH', label: 'B.Tech Branches' },
          { id: 'PG', label: 'Postgraduate (M.E./M.Tech/MBA/MCA)' },
          { id: 'CUSTOM', label: 'Other Degrees' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Degrees & Branches List */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading degrees and branches...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-600 font-medium">No degrees or branches found matching criteria.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="w-3 h-3" /> Add Degree/Branch
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Degree & Branch</th>
                  <th className="py-3.5 px-4">Branch Code</th>
                  <th className="py-3.5 px-4">Parent Department</th>
                  <th className="py-3.5 px-4">Duration (Years)</th>
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
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors inline-flex items-center cursor-pointer"
                          title="Edit Degree/Branch"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => setDeletingCourse(c)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center cursor-pointer"
                          title="Delete Degree/Branch"
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

      {/* Add Degree/Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Add Degree/Branch</h3>
                <p className="text-[11px] text-slate-500">
                  Enter degree type, branch name, branch code, and duration
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
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

              {/* Field 1: Type Degree */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Type Degree *</label>
                  <span className="text-[10px] text-slate-400">Select or type custom</span>
                </div>
                <input
                  type="text"
                  required
                  list="degree-type-suggestions"
                  placeholder="e.g. B.E., B.Tech, M.E., MBA, MCA, Diploma..."
                  value={degreeType}
                  onChange={(e) => handleDegreeChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <datalist id="degree-type-suggestions">
                  {DEGREE_SUGGESTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>

                {/* Quick Selection Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['B.E.', 'B.Tech', 'M.E.', 'M.Tech', 'MBA', 'MCA', 'Diploma'].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => handleDegreeChange(deg)}
                      className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                        degreeType === deg
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {deg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Type Branch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type Branch *</label>
                <input
                  type="text"
                  required
                  list="branch-name-suggestions"
                  placeholder="e.g. Computer Science and Engineering, Mechanical Engineering..."
                  value={branchName}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <datalist id="branch-name-suggestions">
                  {COMMON_BRANCH_PRESETS.map((p, idx) => (
                    <option key={idx} value={p.branch}>
                      {p.degree} - {p.code}
                    </option>
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-400 mt-1">
                  Type any engineering or academic branch/specialization name freely.
                </p>
              </div>

              {/* Field 3: Branch Code */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Branch Code *</label>
                  <span className="text-[10px] text-slate-400">Unique identifier</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. BE_CSE or CSE"
                  value={branchCode}
                  onChange={(e) => {
                    setBranchCode(e.target.value.toUpperCase());
                    setCodeManuallyEdited(true);
                  }}
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Field 4: Duration (Years) & Parent Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Years) *</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    placeholder="4"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] text-slate-500 font-semibold mb-1">Preview of Degree & Branch:</div>
                <div className="text-xs font-bold text-slate-900">
                  {degreeType.trim() ? `${degreeType.trim()} ` : ''}
                  {branchName.trim() || '<Branch Name>'}
                </div>
                <div className="text-[11px] text-indigo-600 font-mono mt-0.5">
                  Code: {branchCode || '—'} &bull; Duration: {duration} Years
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Add Degree/Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Degree/Branch Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Degree/Branch</h3>
                <p className="text-[11px] text-slate-400 font-mono">{editingCourse.code}</p>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Field 1: Type Degree */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type Degree *</label>
                <input
                  type="text"
                  required
                  list="edit-degree-type-suggestions"
                  placeholder="e.g. B.E., B.Tech, M.E., MBA..."
                  value={degreeType}
                  onChange={(e) => setDegreeType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                />
                <datalist id="edit-degree-type-suggestions">
                  {DEGREE_SUGGESTIONS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>

              {/* Field 2: Type Branch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Type Branch *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Computer Science and Engineering"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-medium"
                />
              </div>

              {/* Field 3: Branch Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code *</label>
                <input
                  type="text"
                  required
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono font-bold"
                />
              </div>

              {/* Field 4: Duration (Years) & Parent Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Years) *</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 1)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Department</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] text-slate-500 font-semibold mb-1">Preview:</div>
                <div className="text-xs font-bold text-slate-900">
                  {degreeType.trim() ? `${degreeType.trim()} ` : ''}
                  {branchName.trim()}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer disabled:opacity-50"
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
              <h3 className="font-bold text-slate-900 text-sm">Delete Degree / Branch?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>{deletingCourse.name}</strong> ({deletingCourse.code})?
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setDeletingCourse(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer disabled:opacity-50"
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
