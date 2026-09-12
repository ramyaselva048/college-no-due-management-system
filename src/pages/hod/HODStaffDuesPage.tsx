import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck,
  Plus,
  BookOpen,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Search,
  X,
  Save,
  Users,
  ArrowLeft,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  Filter,
  Check
} from 'lucide-react';
import api from '../../services/api';

interface FacultyMember {
  id: number;
  user_id?: number;
  full_name: string;
  employee_id: string;
  email: string;
  phone?: string;
  designation: string;
  department_id: number;
  is_active?: boolean;
  assigned_nodes?: Array<{
    id: number;
    slot: string;
    code: string;
    title: string;
    course_type?: string;
    year: number;
    semester: number;
  }>;
}

export const HODStaffDuesPage: React.FC = () => {
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DEACTIVATED'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Faculty Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addFormData, setAddFormData] = useState({
    full_name: '',
    employee_id: '',
    email: '',
    password: 'StaffPassword@123',
    phone: '',
    designation: 'Assistant Professor',
    is_active: true
  });

  // Edit Faculty Modal
  const [editingStaff, setEditingStaff] = useState<FacultyMember | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    employee_id: '',
    email: '',
    password: '',
    phone: '',
    designation: '',
    is_active: true
  });

  // Delete Confirmation Modal
  const [deletingStaff, setDeletingStaff] = useState<FacultyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hod/faculty');
      const list = Array.isArray(res.data) ? res.data : [];
      setFacultyList(list);
    } catch (err: any) {
      console.error('Failed to load faculty:', err);
      showToast(err.response?.data?.detail || 'Failed to load faculty list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  // Keyboard shortcut ESC to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingStaff(null);
        setDeletingStaff(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setAddError(null);
    setShowAddPassword(false);
    setAddFormData({
      full_name: '',
      employee_id: `FAC-${Math.floor(100 + Math.random() * 900)}`,
      email: '',
      password: 'StaffPassword@123',
      phone: '',
      designation: 'Assistant Professor',
      is_active: true
    });
    setIsAddModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.full_name.trim() || !addFormData.employee_id.trim() || !addFormData.email.trim()) {
      setAddError('Full name, employee ID, and email are required.');
      return;
    }
    if (!addFormData.password.trim()) {
      setAddError('Please set a login password for the staff member.');
      return;
    }

    try {
      setSavingAdd(true);
      setAddError(null);
      await api.post('/hod/faculty', addFormData);
      showToast(`Staff member "${addFormData.full_name}" allocated successfully. Login is ready!`);
      setIsAddModalOpen(false);
      fetchFaculty();
    } catch (err: any) {
      setAddError(err.response?.data?.detail || 'Failed to add staff member.');
    } finally {
      setSavingAdd(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (staff: FacultyMember) => {
    setEditError(null);
    setShowEditPassword(false);
    setEditingStaff(staff);
    setEditFormData({
      full_name: staff.full_name,
      employee_id: staff.employee_id,
      email: staff.email,
      password: '',
      phone: staff.phone || '',
      designation: staff.designation || 'Assistant Professor',
      is_active: staff.is_active !== false
    });
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editFormData.full_name.trim() || !editFormData.employee_id.trim() || !editFormData.email.trim()) {
      setEditError('Full name, employee ID, and email are required.');
      return;
    }

    try {
      setSavingEdit(true);
      setEditError(null);
      await api.patch(`/hod/faculty/${editingStaff.id}`, editFormData);
      showToast(`Staff member "${editFormData.full_name}" updated successfully.`);
      setEditingStaff(null);
      fetchFaculty();
    } catch (err: any) {
      setEditError(err.response?.data?.detail || 'Failed to update staff member.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Toggle Active / Deactive
  const handleToggleStatus = async (staff: FacultyMember) => {
    const nextStatus = staff.is_active === false ? true : false;
    try {
      const res = await api.patch(`/hod/faculty/${staff.id}/status`, { is_active: nextStatus });
      showToast(res.data?.message || `Staff status changed to ${nextStatus ? 'Active' : 'Deactivated'}.`);
      setFacultyList((prev) =>
        prev.map((f) => (f.id === staff.id ? { ...f, is_active: nextStatus } : f))
      );
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to toggle status.', 'error');
    }
  };

  // Delete Staff
  const handleDeleteSubmit = async () => {
    if (!deletingStaff) return;
    try {
      setDeleting(true);
      const res = await api.delete(`/hod/faculty/${deletingStaff.id}`);
      showToast(res.data?.message || `Staff member "${deletingStaff.full_name}" deleted successfully.`);
      setDeletingStaff(null);
      fetchFaculty();
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to delete staff member.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtering
  const filteredFaculty = facultyList.filter((f) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        f.full_name?.toLowerCase().includes(q) ||
        f.employee_id?.toLowerCase().includes(q) ||
        f.email?.toLowerCase().includes(q) ||
        f.designation?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter
    if (statusFilter === 'ACTIVE') {
      return f.is_active !== false;
    }
    if (statusFilter === 'DEACTIVATED') {
      return f.is_active === false;
    }
    return true;
  });

  const activeCount = facultyList.filter((f) => f.is_active !== false).length;
  const deactivatedCount = facultyList.filter((f) => f.is_active === false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-xl text-slate-900">
              Department Faculty & Staff Allocations
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              HOD Clearance Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Allocate and manage department faculty credentials. Only staff allocated here can sign in to evaluate subject dues, practical labs, and student no-due requests.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/hod/dashboard"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add & Allocate Staff
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name, ID, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({facultyList.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DEACTIVATED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'DEACTIVATED'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-700 hover:text-rose-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
            Deactivated ({deactivatedCount})
          </button>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading department faculty members...</div>
      ) : filteredFaculty.length === 0 ? (
        <div className="py-16 bg-white rounded-2xl border border-slate-200 text-center p-8">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-sm text-slate-800">No staff members found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No staff members match the current filter or search criteria.'
              : 'You have not allocated any faculty members for your department yet. Click "Add & Allocate Staff" to get started.'}
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add First Staff Member
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFaculty.map((staff) => {
            const isActive = staff.is_active !== false;

            return (
              <div
                key={staff.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-slate-200 hover:border-indigo-300'
                    : 'border-rose-200 bg-rose-50/20 opacity-85'
                }`}
              >
                <div>
                  {/* Top Bar: Avatar, Info & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isActive
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}
                      >
                        {staff.full_name?.charAt(0) || 'F'}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-xs text-slate-900 leading-snug truncate">
                          {staff.full_name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {staff.employee_id}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {isActive ? 'Active (Login Allowed)' : 'Deactivated (Blocked)'}
                    </span>
                  </div>

                  <div className="mt-2">
                    <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {staff.designation || 'Faculty Member'}
                    </span>
                  </div>

                  {/* Credentials & Contact */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono text-indigo-700 font-medium">{staff.email}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{staff.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Clearance Nodes / Subjects */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-amber-600" />
                        Allocated Subjects ({staff.assigned_nodes?.length || 0})
                      </span>
                    </div>

                    {staff.assigned_nodes && staff.assigned_nodes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {staff.assigned_nodes.map((node) => (
                          <span
                            key={node.id}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1"
                            title={`Sem ${node.semester} - ${node.title}`}
                          >
                            <span className="font-mono text-amber-700 font-bold">{node.slot}:</span> {node.code}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        No subject clearances allocated yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Action Controls: Active/Deactive Toggle, Edit, Delete */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Status Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(staff)}
                    title={isActive ? 'Deactivate staff login' : 'Activate staff login'}
                    className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors inline-flex items-center gap-1.5 font-semibold cursor-pointer ${
                      isActive
                        ? 'text-slate-700 hover:text-rose-700 hover:bg-rose-50 border-slate-200'
                        : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-rose-500" />
                        <span>Deactive</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Edit Staff Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(staff)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Edit staff details and login password"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Staff Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingStaff(staff)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Remove staff member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD STAFF MODAL */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Add & Allocate Department Staff
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create faculty login credentials to evaluate student dues
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (with degree/qualification) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. M. Anand, M.E., Ph.D."
                  value={addFormData.full_name}
                  onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                    placeholder="e.g. FAC-CSE-012"
                    value={addFormData.employee_id}
                    onChange={(e) => setAddFormData({ ...addFormData, employee_id: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation *
                  </label>
                  <select
                    value={addFormData.designation}
                    onChange={(e) => setAddFormData({ ...addFormData, designation: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Lab Technician">Lab Technician</option>
                    <option value="Class Advisor">Class Advisor</option>
                    <option value="Exam Cell Coordinator">Exam Cell Coordinator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Login Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. anand.m@college.edu"
                    value={addFormData.email}
                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value.toLowerCase().trim() })}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setAddFormData({
                        ...addFormData,
                        password: 'Staff@' + Math.floor(100 + Math.random() * 900)
                      })
                    }
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Set login password for staff"
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                    className="w-full text-xs pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The staff member will use this password to log in to evaluate clearance forms.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. 9842100000"
                    value={addFormData.phone}
                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Initial Login Status</div>
                  <div className="text-[11px] text-slate-500">
                    {addFormData.is_active ? 'Account is active. Staff can sign in immediately.' : 'Account is deactivated. Login will be blocked.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAddFormData({ ...addFormData, is_active: !addFormData.is_active })}
                  className="cursor-pointer"
                >
                  {addFormData.is_active ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingAdd ? 'Allocating Staff...' : 'Save & Allocate Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT STAFF MODAL */}
      {/* ========================================================================= */}
      {editingStaff && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingStaff(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Edit Department Staff Member
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingStaff.full_name} ({editingStaff.employee_id})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name (with degree/qualification) *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                    value={editFormData.employee_id}
                    onChange={(e) => setEditFormData({ ...editFormData, employee_id: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation *
                  </label>
                  <select
                    value={editFormData.designation}
                    onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Lab Technician">Lab Technician</option>
                    <option value="Class Advisor">Class Advisor</option>
                    <option value="Exam Cell Coordinator">Exam Cell Coordinator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Login Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value.toLowerCase().trim() })}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Reset Login Password (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditFormData({
                        ...editFormData,
                        password: 'Staff@' + Math.floor(100 + Math.random() * 900)
                      })
                    }
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Leave empty to retain existing password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full text-xs pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only enter a new password if you want to reset this staff member's credentials.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. 9842100000"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Login Permission Status</div>
                  <div className="text-[11px] text-slate-500">
                    {editFormData.is_active ? 'Staff can sign in and approve dues.' : 'Staff is deactivated. Sign in is blocked.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditFormData({ ...editFormData, is_active: !editFormData.is_active })}
                  className="cursor-pointer"
                >
                  {editFormData.is_active ? (
                    <ToggleRight className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingEdit ? 'Saving Changes...' : 'Save Staff Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {deletingStaff && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeletingStaff(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Remove Staff Member?
                </h3>
                <p className="text-xs text-slate-500">
                  This action removes the faculty member from the department
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-rose-900 text-xs leading-relaxed space-y-1">
              <p>
                Are you sure you want to remove <strong>{deletingStaff.full_name}</strong> (Employee ID: <strong>{deletingStaff.employee_id}</strong>)?
              </p>
              <p className="text-[11px] text-rose-700">
                • Any assigned subject clearance nodes will be unassigned.
                <br />
                • The faculty member will no longer be able to log in to the staff portal.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingStaff(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Removing...' : 'Yes, Remove Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
