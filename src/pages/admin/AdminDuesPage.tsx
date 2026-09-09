import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  X,
  AlertCircle,
  Edit2,
  Trash2,
  User,
  Building2,
  Tag
} from 'lucide-react';
import api from '../../services/api';
import { Department, StudentProfile } from '../../types';

export const AdminDuesPage: React.FC = () => {
  const [dues, setDues] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<any | null>(null);
  const [deletingDue, setDeletingDue] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialForm = {
    student_id: 0,
    department_id: 0,
    category_id: 0,
    amount: '',
    description: '',
    remarks: '',
    status: 'pending'
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [duesRes, stRes, deptRes, catRes] = await Promise.all([
        api.get('/due-records'),
        api.get('/admin/students'),
        api.get('/student/departments'),
        api.get('/due-categories')
      ]);

      const duesList = Array.isArray(duesRes.data)
        ? duesRes.data
        : (Array.isArray(duesRes.data?.dues) ? duesRes.data.dues : []);
      const stList = Array.isArray(stRes.data)
        ? stRes.data
        : (Array.isArray(stRes.data?.students) ? stRes.data.students : []);
      const deptList = Array.isArray(deptRes.data) ? deptRes.data : [];
      const catList = Array.isArray(catRes.data) ? catRes.data : [];

      setDues(duesList);
      setStudents(stList);
      setDepartments(deptList);
      setCategories(catList);

      if (stList.length > 0 && deptList.length > 0 && catList.length > 0) {
        setFormData((prev) => ({
          ...prev,
          student_id: stList[0].id,
          department_id: deptList[0].id,
          category_id: catList[0].id
        }));
      }
    } catch (err) {
      console.error(err);
      setDues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setError(null);
    setFormData({
      ...initialForm,
      student_id: students[0]?.id || 0,
      department_id: departments[0]?.id || 0,
      category_id: categories[0]?.id || 0
    });
    setIsModalOpen(true);
  };

  const openEditModal = (due: any) => {
    setError(null);
    setEditingDue(due);
    setFormData({
      student_id: due.student_id,
      department_id: due.department_id,
      category_id: due.category_id,
      amount: String(due.amount),
      description: due.description || '',
      remarks: due.remarks || '',
      status: due.status || 'pending'
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/due-records', {
        ...formData,
        amount: Number(formData.amount)
      });
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record institutional due');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDue) return;
    setSubmitting(true);
    setError(null);

    try {
      await api.patch(`/due-records/${editingDue.id}`, {
        amount: Number(formData.amount),
        description: formData.description,
        remarks: formData.remarks,
        status: formData.status
      });
      setEditingDue(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update due record');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteDue = async () => {
    if (!deletingDue) return;
    try {
      setSubmitting(true);
      await api.delete(`/due-records/${deletingDue.id}`);
      setDeletingDue(null);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete due record');
    } finally {
      setSubmitting(false);
    }
  };

  const safeDues = Array.isArray(dues) ? dues : [];

  const filteredDues = safeDues.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch =
      search === '' ||
      d.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.student_reg_no?.toLowerCase().includes(search.toLowerCase()) ||
      d.department_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalOutstanding = filteredDues
    .filter((d) => d.status === 'pending')
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Institutional Financial & Department Dues
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full administrative CRUD control across student dues, penalties, fees, and waivers
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search student, reg no, or due..."
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
            <PlusCircle className="w-3.5 h-3.5" /> Record New Due
          </button>
        </div>
      </div>

      {/* Summary Banner & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto">
          {['all', 'pending', 'cleared', 'waived'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st} ({st === 'all' ? safeDues.length : safeDues.filter((d) => d.status === st).length})
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-700">
          Pending Outstanding:{' '}
          <span className="font-mono text-rose-600 font-bold">
            ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading dues ledger...</div>
      ) : filteredDues.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">No due records found matching your filters.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg inline-flex items-center gap-1"
          >
            <PlusCircle className="w-3 h-3" /> Record New Due
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Department & Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDues.map((due) => (
                  <tr key={due.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{due.student_name}</p>
                      <p className="font-mono text-[11px] text-indigo-700">{due.student_reg_no}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{due.department_name}</span>
                      <p className="text-[11px] text-slate-500">{due.category_name || 'General'}</p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800">{due.description}</p>
                      {due.remarks && (
                        <p className="text-[11px] text-slate-400 italic">"{due.remarks}"</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ₹{Number(due.amount || 0).toFixed(2)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          due.status === 'cleared'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : due.status === 'waived'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {due.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(due)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors inline-flex items-center"
                          title="Edit Due"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => setDeletingDue(due)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors inline-flex items-center"
                          title="Delete Due"
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

      {/* Add Due Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900 text-base">Record Student Due</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-3">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Student *</label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.register_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Due Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 500.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overdue library book penalty (Vol. 3)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Remarks</label>
                <input
                  type="text"
                  placeholder="Optional internal note or receipt ref"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
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
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {submitting ? 'Recording...' : 'Record Due'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Due Modal */}
      {editingDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Due Record</h3>
                <p className="text-[11px] text-slate-400 font-mono">ID #{editingDue.id} • {editingDue.student_name}</p>
              </div>
              <button
                onClick={() => setEditingDue(null)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clearance Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                  >
                    <option value="pending">PENDING</option>
                    <option value="cleared">CLEARED (Paid)</option>
                    <option value="waived">WAIVED (Exempted)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Fee waived by Dean or Paid via Cash Receipt"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDue(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDue && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Delete Due Record</h4>
                  <p className="text-[11px] text-slate-400">Record #{deletingDue.id}</p>
                </div>
              </div>
              <button onClick={() => setDeletingDue(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete due record <span className="font-bold text-slate-900">#{deletingDue.id}</span> of{' '}
              <span className="font-bold text-slate-900">₹{Number(deletingDue.amount).toFixed(2)}</span> for{' '}
              <span className="font-bold text-slate-900">{deletingDue.student_name}</span>? This will permanently update student clearance eligibility.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingDue(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDue}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete Due'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
