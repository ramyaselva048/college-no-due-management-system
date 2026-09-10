import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  PlusCircle,
  Search,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  List,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { StaffProfile, Department } from '../../types';

const DESIGNATION_PRESETS = [
  'HOD & Clearance Incharge',
  'Senior Faculty Advisor',
  'Chief Librarian & Clearance Officer',
  'Senior Accounts Superintendent',
  'Chief Hostel Warden',
  'Laboratory Incharge & System Admin',
  'Training & Placement Officer',
  'Assistant Controller of Examinations',
  'Physical Director (Sports & Gym)',
  'Student Welfare Officer',
  'Department Clearance Signer'
];

export const AdminStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<StaffProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    department_id: 0,
    designation: 'HOD & Clearance Incharge',
    // Custom department typing
    is_custom_dept: false,
    custom_department_name: '',
    custom_department_code: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [staffRes, deptRes] = await Promise.all([
        api.get('/admin/staff'),
        api.get('/admin/departments')
      ]);
      setStaffList(Array.isArray(staffRes.data) ? staffRes.data : []);
      const depts = Array.isArray(deptRes.data) ? deptRes.data : [];
      setDepartments(depts);
      if (depts.length > 0 && formData.department_id === 0) {
        setFormData((prev) => ({ ...prev, department_id: depts[0].id }));
      }
    } catch (err) {
      console.error(err);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setError(null);
    setShowPassword(false);
    const defaultDept = departments[0]?.id || 1;
    const randomEmpNum = Math.floor(100 + Math.random() * 900);
    setFormData({
      employee_id: `EMP-OFF-${randomEmpNum}`,
      full_name: '',
      email: '',
      password: 'StaffPassword@123',
      phone: '',
      department_id: defaultDept,
      designation: 'HOD & Clearance Incharge',
      is_custom_dept: false,
      custom_department_name: '',
      custom_department_code: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffProfile) => {
    setError(null);
    setShowPassword(false);
    setEditingStaff(staff);
    setFormData({
      employee_id: staff.employee_id,
      full_name: staff.full_name,
      email: staff.email,
      password: '',
      phone: staff.phone || '',
      department_id: staff.department_id,
      designation: staff.designation || 'Clearance Officer',
      is_custom_dept: false,
      custom_department_name: '',
      custom_department_code: ''
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id.trim() || !formData.full_name.trim() || !formData.email.trim()) {
      setError('Employee ID, Full Name, and Email are required.');
      return;
    }
    if (!formData.password.trim()) {
      setError('Password is required for officer login.');
      return;
    }
    if (formData.is_custom_dept && !formData.custom_department_name.trim()) {
      setError('Please provide the Custom Department Name or choose an existing department.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post('/admin/staff', {
        employee_id: formData.employee_id.trim().toUpperCase(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        department_id: formData.is_custom_dept ? -1 : formData.department_id,
        custom_department_name: formData.is_custom_dept ? formData.custom_department_name.trim() : undefined,
        custom_department_code: formData.is_custom_dept ? formData.custom_department_code.trim().toUpperCase() : undefined,
        designation: formData.designation.trim()
      });

      setIsModalOpen(false);
      showToast(`Clearance Officer "${formData.full_name}" successfully enrolled!`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create clearance officer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!formData.employee_id.trim() || !formData.full_name.trim() || !formData.email.trim()) {
      setError('Employee ID, Full Name, and Email are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.patch(`/admin/staff/${editingStaff.id}`, {
        employee_id: formData.employee_id.trim().toUpperCase(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password ? formData.password : undefined,
        phone: formData.phone.trim(),
        department_id: formData.is_custom_dept ? -1 : formData.department_id,
        custom_department_name: formData.is_custom_dept ? formData.custom_department_name.trim() : undefined,
        custom_department_code: formData.is_custom_dept ? formData.custom_department_code.trim().toUpperCase() : undefined,
        designation: formData.designation.trim()
      });

      setEditingStaff(null);
      showToast(`Officer "${formData.full_name}" details saved successfully!`);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update clearance officer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffProfile) => {
    try {
      const res = await api.patch(`/admin/staff/${staff.id}/status`, {
        is_active: !staff.is_active
      });
      showToast(res.data?.message || `Officer status updated`);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to toggle officer status');
    }
  };

  const confirmDelete = async () => {
    if (!deletingStaff) return;
    try {
      await api.delete(`/admin/staff/${deletingStaff.id}`);
      showToast(`Officer ${deletingStaff.full_name} (${deletingStaff.employee_id}) removed from system.`);
      setDeletingStaff(null);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to delete clearance officer');
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.department_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.designation?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedDeptFilter !== 'ALL') {
      return String(s.department_id) === selectedDeptFilter;
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

      {/* Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-indigo-600" />
            Department Clearance Officers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administered officers authorized to sign off student No Due certificates using their Employee ID or Email
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, EMP ID, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-52 sm:w-60 shadow-2xs"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <input
            type="text"
            list="admin-staff-dept-filter-list"
            placeholder="Filter department..."
            value={
              selectedDeptFilter === 'ALL'
                ? ''
                : departments.find((d) => String(d.id) === selectedDeptFilter)?.name || selectedDeptFilter
            }
            onChange={(e) => {
              const val = e.target.value;
              if (!val || val.toLowerCase() === 'all' || val.toLowerCase() === 'all departments') {
                setSelectedDeptFilter('ALL');
              } else {
                const matched = departments.find(
                  (d) =>
                    d.name.toLowerCase() === val.toLowerCase() ||
                    d.code.toLowerCase() === val.toLowerCase() ||
                    String(d.id) === val
                );
                setSelectedDeptFilter(matched ? String(matched.id) : val);
              }
            }}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          />
          <datalist id="admin-staff-dept-filter-list">
            <option value="All Departments" />
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.code}
              </option>
            ))}
          </datalist>

          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 flex items-center">
            <button
              onClick={() => setViewMode('CARDS')}
              title="Cards View"
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === 'CARDS' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              title="Table View"
              className={`p-1.5 rounded-lg text-xs font-semibold ${
                viewMode === 'TABLE' ? 'bg-white shadow-2xs text-indigo-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Enroll Officer
          </button>
        </div>
      </div>

      {/* Security Rule Notice */}
      <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3">
        <Shield className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-950 leading-relaxed">
          <span className="font-bold">Strict Staff Authentication Policy:</span> Clearance officers can log in using either their <span className="font-semibold underline">Employee ID</span> (e.g. <span className="font-mono">EMP-LIB-101</span>) or their institutional <span className="font-semibold underline">College Email</span> with their password. Only officers enrolled here by the College Administrator are permitted to access the Staff Clearance Portal.
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading authorized clearance officers...</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-2xs">
          <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">No clearance officers found matching your search or filters.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1"
          >
            <PlusCircle className="w-3 h-3" /> Enroll First Officer
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div
              key={staff.id}
              className={`bg-white rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                staff.is_active !== false ? 'border-slate-200 hover:border-slate-300' : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center font-bold text-sm">
                    {staff.full_name?.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                      {staff.employee_id}
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-slate-900">{staff.full_name}</h4>
                <p className="text-xs text-indigo-700 font-semibold mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {staff.department_name}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{staff.designation || 'Clearance Officer'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-600 space-y-1 mb-3">
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{staff.email}</span>
                  </p>
                  {staff.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{staff.phone}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <button
                    onClick={() => handleToggleStatus(staff)}
                    className={`text-xs px-2 py-1 rounded-lg border transition-colors flex items-center gap-1 font-medium ${
                      staff.is_active !== false
                        ? 'text-slate-600 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                        : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {staff.is_active !== false ? (
                      <>
                        <ToggleRight className="w-3.5 h-3.5 text-emerald-600" /> Active
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Deactivated
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(staff)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => setDeletingStaff(staff)}
                      className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Officer Name</th>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Email / Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{staff.full_name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{staff.employee_id}</td>
                    <td className="py-3 px-4 font-medium text-indigo-700">{staff.department_name}</td>
                    <td className="py-3 px-4 text-slate-600">{staff.designation || 'Clearance Officer'}</td>
                    <td className="py-3 px-4">
                      <div>{staff.email}</div>
                      {staff.phone && <div className="text-[11px] text-slate-400">{staff.phone}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          staff.is_active !== false
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}
                      >
                        {staff.is_active !== false ? 'Active' : 'Deactivated'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(staff)}
                          className="px-2 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeletingStaff(staff)}
                          className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
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

      {/* Enroll Staff Modal (with Preset vs Custom Department Option) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-600" />
                  Enroll Department Clearance Officer
                </h3>
                <p className="text-xs text-slate-500">
                  Officer can log in using Employee ID or Email and password
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3.5 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EMP-CSE-01"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. K. Ramesh"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="r.verma@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter login password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full text-xs px-3 pr-8 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Department Assignment (Existing List OR Custom Typing) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Department Assignment *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_custom_dept: !formData.is_custom_dept })}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline"
                  >
                    {formData.is_custom_dept ? '← Select Existing Department' : '+ Type Custom Department'}
                  </button>
                </div>

                {!formData.is_custom_dept ? (
                  <div>
                    <input
                      type="text"
                      list="admin-staff-add-dept-list"
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
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <datalist id="admin-staff-add-dept-list">
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.code}
                        </option>
                      ))}
                    </datalist>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Choose from any engineering college department or institutional clearance node.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <p className="text-[11px] font-bold text-indigo-900">
                      Type Custom Department Name & Code:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Aeronautical Engineering"
                          value={formData.custom_department_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData({
                              ...formData,
                              custom_department_name: val,
                              custom_department_code:
                                formData.custom_department_code ||
                                val.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase()
                            });
                          }}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Code (e.g. AERO)"
                          value={formData.custom_department_code}
                          onChange={(e) =>
                            setFormData({ ...formData, custom_department_code: e.target.value.toUpperCase() })
                          }
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-indigo-700">
                      This will automatically register the new department in the college directory and link this officer.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    list="admin-staff-designation-list"
                    placeholder="Type designation..."
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <datalist id="admin-staff-designation-list">
                    {DESIGNATION_PRESETS.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2.5">
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
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {submitting ? 'Enrolling...' : 'Save & Enroll Officer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Clearance Officer</h3>
                <p className="text-[11px] text-slate-400 font-mono">{editingStaff.employee_id} • {editingStaff.full_name}</p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-3.5 overflow-y-auto flex-1">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institutional Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reset Password (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Department Assignment */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Department Assignment
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_custom_dept: !formData.is_custom_dept })}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline"
                  >
                    {formData.is_custom_dept ? '← Select Existing Department' : '+ Type Custom Department'}
                  </button>
                </div>

                {!formData.is_custom_dept ? (
                  <div>
                    <input
                      type="text"
                      list="admin-staff-edit-dept-list"
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
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <datalist id="admin-staff-edit-dept-list">
                      {departments.map((d) => (
                        <option key={d.id} value={d.name}>
                          {d.code}
                        </option>
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div className="space-y-2 bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                    <p className="text-[11px] font-bold text-indigo-900">
                      Type New Department Name:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Marine Engineering"
                          value={formData.custom_department_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              custom_department_name: e.target.value
                            })
                          }
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Code"
                          value={formData.custom_department_code}
                          onChange={(e) =>
                            setFormData({ ...formData, custom_department_code: e.target.value.toUpperCase() })
                          }
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 uppercase font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-slate-900 text-base">Delete Officer Account?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-slate-800">{deletingStaff.full_name}</span> (
                <span className="font-mono text-indigo-600 font-bold">{deletingStaff.employee_id}</span>)?
              </p>
              <p className="text-[11px] text-rose-600 font-medium pt-1">
                This officer will immediately lose login access to the Staff Portal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="w-full py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="w-full py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
