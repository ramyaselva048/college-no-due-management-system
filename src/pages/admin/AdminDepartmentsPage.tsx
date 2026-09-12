import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  BookOpen,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
  Check,
  GraduationCap,
  Landmark,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  Users
} from 'lucide-react';
import api from '../../services/api';
import { Department } from '../../types';

interface EngineeringPreset {
  name: string;
  code: string;
  description: string;
  category: 'academic' | 'institutional';
}

const ALL_ENGINEERING_PRESETS: EngineeringPreset[] = [
  // Academic Engineering Departments
  {
    name: 'Department of Computer Science & Engineering',
    code: 'CSE',
    description: 'Computer systems, programming, algorithms, project clearances, and departmental symposium records.',
    category: 'academic'
  },
  {
    name: 'Department of Artificial Intelligence & Data Science',
    code: 'AIDS',
    description: 'AI & Data Science lab components, machine learning clusters, projects, and departmental records.',
    category: 'academic'
  },
  {
    name: 'Department of Information Technology',
    code: 'IT',
    description: 'IT departmental laboratories, web development kits, project submissions, and symposium clearances.',
    category: 'academic'
  },
  {
    name: 'Department of Artificial Intelligence & Machine Learning',
    code: 'AIML',
    description: 'AI/ML neural compute servers, deep learning models, project approvals, and department records.',
    category: 'academic'
  },
  {
    name: 'Department of Computer Science & Business Systems',
    code: 'CSBS',
    description: 'TCS collaborated enterprise business systems, financial tech projects, and departmental dues.',
    category: 'academic'
  },
  {
    name: 'Department of Cyber Security',
    code: 'CS',
    description: 'Network security lab, ethical hacking sandboxes, security tool clearances, and project submissions.',
    category: 'academic'
  },
  {
    name: 'Department of Electronics & Communication Engineering',
    code: 'ECE',
    description: 'ECE microelectronics, VLSI kits, digital signal processing lab, and final semester project approvals.',
    category: 'academic'
  },
  {
    name: 'Department of Electrical & Electronics Engineering',
    code: 'EEE',
    description: 'EEE electrical machines lab, power electronics hardware, high-voltage test clearances, and projects.',
    category: 'academic'
  },
  {
    name: 'Department of Mechanical Engineering',
    code: 'MECH',
    description: 'Workshop, machine tools, CAD/CAM lab, thermal engineering apparatus, and fabrication clearances.',
    category: 'academic'
  },
  {
    name: 'Department of Civil Engineering',
    code: 'CIVIL',
    description: 'Surveying lab equipment, total stations, concrete structural testing, and civil project returns.',
    category: 'academic'
  },
  {
    name: 'Department of Biomedical Engineering',
    code: 'BME',
    description: 'Biomedical instrumentation, physiological signal kits, patient simulation setups, and lab clearance.',
    category: 'academic'
  },
  {
    name: 'Department of Mechatronics Engineering',
    code: 'MTE',
    description: 'Industrial robotics, hydraulic & pneumatic actuators, programmable logic controllers, and sensor kits.',
    category: 'academic'
  },
  {
    name: 'Department of Automobile Engineering',
    code: 'AUTO',
    description: 'Automotive chassis lab, engine testing dynamo, vehicle electrical components, and fabrication dues.',
    category: 'academic'
  },
  {
    name: 'Department of Chemical Engineering',
    code: 'CHEM',
    description: 'Chemical reaction engineering lab, mass transfer equipment, process instrumentation, and glassware dues.',
    category: 'academic'
  },
  {
    name: 'Department of Biotechnology',
    code: 'BIO',
    description: 'Bioprocess engineering lab, molecular biology kits, incubators, and cell culture room clearances.',
    category: 'academic'
  },
  {
    name: 'Department of Science & Humanities',
    code: 'S&H',
    description: 'Engineering Physics, Chemistry lab glassware, and English communication language laboratory clearances.',
    category: 'academic'
  },
  {
    name: 'Department of Management Studies (MBA)',
    code: 'MBA',
    description: 'MBA case study repository, corporate internships, business simulation lab, and departmental dues.',
    category: 'academic'
  },
  {
    name: 'Department of Computer Applications (MCA)',
    code: 'MCA',
    description: 'MCA software project repositories, advanced computing lab workstations, and seminar clearances.',
    category: 'academic'
  },

  // Institutional & Administrative Clearance Units
  {
    name: 'Central Library',
    code: 'LIB',
    description: 'Library physical books return, journal access, digital card return, and overdue fine clearance.',
    category: 'institutional'
  },
  {
    name: 'Accounts & Finance Section',
    code: 'ACC',
    description: 'Tuition fees, exam fees, caution deposits refund, scholarship reconciliations, and fee balance audit.',
    category: 'institutional'
  },
  {
    name: 'Computer Science Laboratory',
    code: 'CSL',
    description: 'Central computer center terminals, network lab equipment, workstation accessories, and server access.',
    category: 'institutional'
  },
  {
    name: 'Hostel & Student Housing',
    code: 'HST',
    description: 'Hostel room inventory, electrical fixtures, mess fee arrears, key return, and caution deposit refund.',
    category: 'institutional'
  },
  {
    name: 'Transport Services',
    code: 'TRN',
    description: 'College bus pass settlement, parking tag surrender, and route dues clearance.',
    category: 'institutional'
  },
  {
    name: 'Sports & Physical Education',
    code: 'SPT',
    description: 'Athletic equipment, sports uniform, gymnasium membership return, and tournament gear return.',
    category: 'institutional'
  },
  {
    name: 'Training & Placement Cell',
    code: 'TPO',
    description: 'Placement training fee clearance, interview badge return, offer acceptance verification, and archive.',
    category: 'institutional'
  },
  {
    name: 'Office of Controller of Examinations',
    code: 'COE',
    description: 'Semester grade sheet verification, arrears examination fees, and hall ticket records.',
    category: 'institutional'
  },
  {
    name: 'NSS, Red Cross & Student Affairs',
    code: 'NSS',
    description: 'Student club inventory, youth red cross dues, community camp records, and certificate sign-offs.',
    category: 'institutional'
  }
];

export const AdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACADEMIC' | 'INSTITUTIONAL'>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPresetCode, setSelectedPresetCode] = useState<string>('');

  // Allocate HOD Modal State
  const [allocatingHodDept, setAllocatingHodDept] = useState<Department | null>(null);
  const [submittingHod, setSubmittingHod] = useState(false);
  const [hodError, setHodError] = useState<string | null>(null);
  const [showHodPassword, setShowHodPassword] = useState(false);
  const [hodFormData, setHodFormData] = useState({
    full_name: '',
    employee_id: '',
    email: '',
    password: '',
    phone: '',
    is_active: true
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/departments');
      const list = Array.isArray(res.data) ? res.data : [];
      setDepartments(list);
    } catch (err) {
      console.error(err);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

  const openCreateModal = () => {
    setError(null);
    setName('');
    setCode('');
    setDescription('');
    setSelectedPresetCode('');
    setModalMode('PRESET');
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setError(null);
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
  };

  const handleSelectPreset = (preset: EngineeringPreset) => {
    setSelectedPresetCode(preset.code);
    setName(preset.name);
    setCode(preset.code);
    setDescription(preset.description);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Department Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let finalCode = code.trim().toUpperCase();
      if (!finalCode) {
        finalCode = name
          .replace(/[^a-zA-Z0-9]/g, '_')
          .substring(0, 8)
          .toUpperCase();
      }

      await api.post('/admin/departments', {
        name: name.trim(),
        code: finalCode,
        description: description.trim() || `Clearance department for ${name.trim()}`,
        is_active: true
      });

      setIsModalOpen(false);
      showToast(`Department "${name.trim()}" successfully added to college registry!`);
      setName('');
      setCode('');
      setDescription('');
      setSelectedPresetCode('');
      await fetchDepts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    if (!name.trim()) {
      setError('Department Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.patch(`/admin/departments/${editingDept.id}`, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim()
      });
      setEditingDept(null);
      showToast(`Department "${name.trim()}" updated successfully!`);
      await fetchDepts();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (dept: Department) => {
    try {
      const res = await api.patch(`/admin/departments/${dept.id}/status`, {
        is_active: !dept.is_active
      });
      showToast(res.data?.message || `Department status updated`);
      await fetchDepts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle department status');
    }
  };

  const handleDelete = async (dept: Department) => {
    const confirmMsg = `Are you sure you want to permanently delete department "${dept.name}" (${dept.code})?\n\nThis will remove it from the institutional clearance hierarchy.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/admin/departments/${dept.id}`);
      showToast(`Department "${dept.name}" removed successfully.`);
      await fetchDepts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete department');
    }
  };

  const openAllocateHodModal = (dept: Department) => {
    setHodError(null);
    setShowHodPassword(false);
    setAllocatingHodDept(dept);
    if (dept.hod_info) {
      setHodFormData({
        full_name: dept.hod_info.full_name,
        employee_id: dept.hod_info.employee_id,
        email: dept.hod_info.email,
        password: '',
        phone: dept.hod_info.phone || '9842100000',
        is_active: dept.hod_info.is_active !== false
      });
    } else {
      const codeLower = dept.code.toLowerCase().replace(/[^a-z0-9]/g, '');
      setHodFormData({
        full_name: `Dr. Head of ${dept.code}, M.E., Ph.D.`,
        employee_id: `HOD-${dept.code.toUpperCase()}-001`,
        email: `hod.${codeLower}@college.edu`,
        password: 'College@123',
        phone: '9842100000',
        is_active: true
      });
    }
  };

  const handleAllocateHodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingHodDept) return;
    if (!hodFormData.full_name.trim() || !hodFormData.employee_id.trim() || !hodFormData.email.trim()) {
      setHodError('Full Name, Employee ID, and Login Email are required.');
      return;
    }
    if (!allocatingHodDept.hod_info && !hodFormData.password.trim()) {
      setHodError('Please provide an initial login password for this HOD.');
      return;
    }

    setSubmittingHod(true);
    setHodError(null);
    try {
      const res = await api.post(`/admin/departments/${allocatingHodDept.id}/allocate-hod`, hodFormData);
      showToast(res.data?.message || `HOD allocated successfully for ${allocatingHodDept.name}!`);
      setAllocatingHodDept(null);
      await fetchDepts();
    } catch (err: any) {
      setHodError(err.response?.data?.detail || 'Failed to allocate HOD.');
    } finally {
      setSubmittingHod(false);
    }
  };

  const handleToggleHodStatus = async (dept: Department) => {
    if (!dept.hod_info) return;
    try {
      const res = await api.patch(`/admin/departments/${dept.id}/hod-status`, {
        is_active: !dept.hod_info.is_active
      });
      showToast(res.data?.message || 'HOD login status updated');
      await fetchDepts();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle HOD status');
    }
  };

  const handleAddAllMissingPresets = async () => {
    const existingCodes = departments.map((d) => d.code.toUpperCase());
    const missingPresets = ALL_ENGINEERING_PRESETS.filter((p) => !existingCodes.includes(p.code.toUpperCase()));

    if (missingPresets.length === 0) {
      alert('All standard engineering college departments are already present!');
      return;
    }

    const confirmMsg = `Found ${missingPresets.length} missing engineering college departments. Would you like to automatically add them all to the system?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      for (const p of missingPresets) {
        await api.post('/admin/departments', {
          name: p.name,
          code: p.code,
          description: p.description,
          is_active: true
        });
      }
      showToast(`Successfully added ${missingPresets.length} missing engineering departments!`);
      await fetchDepts();
    } catch (err: any) {
      alert('Error during batch addition: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const existingCodes = departments.map((d) => d.code.toUpperCase());
  const missingPresetsCount = ALL_ENGINEERING_PRESETS.filter((p) => !existingCodes.includes(p.code.toUpperCase())).length;

  const filteredDepts = departments.filter((d) => {
    const matchesSearch =
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.code?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'ACADEMIC') {
      const preset = ALL_ENGINEERING_PRESETS.find((p) => p.code.toUpperCase() === d.code.toUpperCase());
      return preset ? preset.category === 'academic' : d.name.toLowerCase().includes('department') || d.name.toLowerCase().includes('engineering');
    }
    if (filterType === 'INSTITUTIONAL') {
      const preset = ALL_ENGINEERING_PRESETS.find((p) => p.code.toUpperCase() === d.code.toUpperCase());
      return preset ? preset.category === 'institutional' : !d.name.toLowerCase().includes('department') && !d.name.toLowerCase().includes('engineering');
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            Engineering College Departments
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure all academic engineering departments and institutional clearance units required for student graduation No Due
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {missingPresetsCount > 0 && (
            <button
              onClick={handleAddAllMissingPresets}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sync Missing Presets ({missingPresetsCount})
            </button>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="Search departments or codes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52 sm:w-60 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Department
          </button>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold text-slate-600">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterType === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          All Departments ({departments.length})
        </button>
        <button
          onClick={() => setFilterType('ACADEMIC')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterType === 'ACADEMIC' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Academic Engineering
        </button>
        <button
          onClick={() => setFilterType('INSTITUTIONAL')}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            filterType === 'INSTITUTIONAL' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          Institutional Clearance Nodes
        </button>
      </div>

      {/* Departments Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading college departments catalog...</span>
        </div>
      ) : filteredDepts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">No clearance departments found matching your search.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={openCreateModal}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" /> Add Department
            </button>
            {missingPresetsCount > 0 && (
              <button
                onClick={handleAddAllMissingPresets}
                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg inline-flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Sync Presets
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((dept) => {
            const isAcademic =
              dept.name.toLowerCase().includes('department') ||
              dept.name.toLowerCase().includes('engineering') ||
              dept.name.toLowerCase().includes('studies') ||
              dept.name.toLowerCase().includes('applications');

            return (
              <div
                key={dept.id}
                className={`bg-white rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                  dept.is_active ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isAcademic
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {isAcademic ? <GraduationCap className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                        {dept.code}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 line-clamp-2">{dept.name}</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                    {dept.description || 'Mandatory clearance node for student No Due verification and certificate generation.'}
                  </p>

                  {/* Department HOD Allocation Section */}
                  {dept.hod_info ? (
                    <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-slate-800">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Allocated HOD
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            dept.hod_info.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {dept.hod_info.is_active !== false ? 'Active (Can Log in)' : 'Deactivated (Blocked)'}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900">{dept.hod_info.full_name}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-600 font-mono mt-1">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                          {dept.hod_info.employee_id}
                        </span>
                        <span className="text-indigo-600 font-medium">{dept.hod_info.email}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-200/70 text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleToggleHodStatus(dept)}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                        >
                          {dept.hod_info.is_active !== false ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" /> Disable Login
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" /> Enable Login
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openAllocateHodModal(dept)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" /> Edit / Password
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3.5 p-3 rounded-xl bg-amber-50/70 border border-dashed border-amber-300 text-amber-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>No HOD allocated yet</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAllocateHodModal(dept)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Allocate HOD
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        dept.is_active
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-amber-700 bg-amber-50 border-amber-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {dept.is_active ? 'Active Clearance Node' : 'Inactive'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID #{dept.id}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <button
                      onClick={() => handleToggleStatus(dept)}
                      title={dept.is_active ? 'Deactivate department' : 'Activate department'}
                      className={`text-xs px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 font-medium ${
                        dept.is_active
                          ? 'text-slate-600 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {dept.is_active ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 text-emerald-600" /> Active
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Disabled
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(dept)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(dept)}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Department Modal (with Preset Selection OR Type Custom Option) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Add College Department
                </h3>
                <p className="text-xs text-slate-500">
                  Select from engineering college catalog or type a custom department
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-6 pt-4 border-b border-slate-100 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('PRESET');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    modalMode === 'PRESET'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Choose from Engineering Catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('CUSTOM');
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    modalMode === 'CUSTOM'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  ✏️ Type Custom Department
                </button>
              </div>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {modalMode === 'PRESET' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Standard Engineering College Department:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/40">
                      {ALL_ENGINEERING_PRESETS.map((preset) => {
                        const isAlreadyAdded = existingCodes.includes(preset.code.toUpperCase());
                        const isSelected = selectedPresetCode === preset.code;

                        return (
                          <button
                            key={preset.code}
                            type="button"
                            disabled={isAlreadyAdded}
                            onClick={() => handleSelectPreset(preset)}
                            className={`p-2.5 rounded-lg border text-left transition-all relative ${
                              isAlreadyAdded
                                ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                                : isSelected
                                ? 'bg-indigo-50/70 border-indigo-500 ring-1 ring-indigo-500'
                                : 'bg-white border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                                {preset.code}
                              </span>
                              {isAlreadyAdded && (
                                <span className="text-[10px] text-slate-400 font-semibold">Already Added</span>
                              )}
                              {isSelected && !isAlreadyAdded && (
                                <span className="text-[10px] font-bold text-indigo-600 flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Selected
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">{preset.name}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {name && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                      <p className="text-[11px] font-bold text-indigo-900">Selected Department Details:</p>
                      <div className="text-xs space-y-1">
                        <p><span className="font-semibold text-slate-600">Name:</span> {name}</p>
                        <p><span className="font-semibold text-slate-600">Code:</span> <span className="font-mono font-bold text-indigo-700">{code}</span></p>
                        <p><span className="font-semibold text-slate-600">Description:</span> <span className="text-slate-500">{description}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Department of Robotics & Automation or Central Examination Cell"
                      value={name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setName(val);
                        // Auto-generate a clean code if code was empty or auto-generated
                        if (!code || code.length <= 6) {
                          setCode(val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase());
                        }
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Department Code *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ROBO or EXAM"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Initial Status
                      </label>
                      <div className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-600 font-medium">
                        Active Clearance Node
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description & Clearance Scope
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Describe what lab items, library dues, fees, or keys this department clears for students..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : 'Save & Register Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Department</h3>
                <p className="text-[11px] text-slate-400 font-mono">ID #{editingDept.id} • {editingDept.code}</p>
              </div>
              <button onClick={() => setEditingDept(null)} className="p-1 rounded-md text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clearance Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate / Edit Department HOD Modal */}
      {allocatingHodDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    {allocatingHodDept.hod_info ? 'Edit HOD Login & Allocation' : 'Allocate Head of Department (HOD)'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {allocatingHodDept.name} ({allocatingHodDept.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAllocatingHodDept(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocateHodSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-indigo-900 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Strict HOD Authentication:</strong> Only the email and password allocated here will grant access to the department HOD clearance portal.
                </div>
              </div>

              {hodError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{hodError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HOD Full Name & Degree *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. K. Senthil Kumar, M.E., Ph.D."
                  value={hodFormData.full_name}
                  onChange={(e) => setHodFormData({ ...hodFormData, full_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HOD-CSE-001"
                    value={hodFormData.employee_id}
                    onChange={(e) => setHodFormData({ ...hodFormData, employee_id: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9842100000"
                    value={hodFormData.phone}
                    onChange={(e) => setHodFormData({ ...hodFormData, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Login Email (HOD Username) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. hod.cse@college.edu"
                    value={hodFormData.email}
                    onChange={(e) => setHodFormData({ ...hodFormData, email: e.target.value.toLowerCase().trim() })}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {allocatingHodDept.hod_info ? 'Reset Login Password (optional)' : 'Login Password *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setHodFormData({ ...hodFormData, password: 'College@' + Math.floor(100 + Math.random() * 900) })}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showHodPassword ? 'text' : 'password'}
                    placeholder={allocatingHodDept.hod_info ? 'Leave empty to retain current password' : 'Enter login password'}
                    value={hodFormData.password}
                    onChange={(e) => setHodFormData({ ...hodFormData, password: e.target.value })}
                    className="w-full text-xs pl-9 pr-10 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowHodPassword(!showHodPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showHodPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {allocatingHodDept.hod_info && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Fill in a new password only if the HOD needs credentials reset.
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Account Login Status</div>
                  <div className="text-[11px] text-slate-500">
                    {hodFormData.is_active ? 'HOD is permitted to sign in.' : 'Login is blocked immediately.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setHodFormData({ ...hodFormData, is_active: !hodFormData.is_active })}
                  className="cursor-pointer"
                >
                  {hodFormData.is_active ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setAllocatingHodDept(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingHod}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  {submittingHod ? 'Saving Allocation...' : allocatingHodDept.hod_info ? 'Save HOD Credentials' : 'Save & Allocate HOD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
