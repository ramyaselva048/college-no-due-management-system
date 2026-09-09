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
  AlertTriangle,
  Edit2,
  Trash2,
  User,
  Building2,
  Tag
} from 'lucide-react';
import api from '../../services/api';
import { DueRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const StaffDuesPage: React.FC = () => {
  const { staffProfile } = useAuth();
  const [dues, setDues] = useState<DueRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'cleared' | 'waived'>('pending');
  const [search, setSearch] = useState('');

  // Add / Edit Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<any | null>(null);
  const [clearingDue, setClearingDue] = useState<DueRecord | null>(null);
  const [clearingRef, setClearingRef] = useState('');
  const [waivingDue, setWaivingDue] = useState<DueRecord | null>(null);
  const [waiveReason, setWaiveReason] = useState('Institutional fee concession or departmental exemption');
  const [deletingDue, setDeletingDue] = useState<DueRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialAddForm = {
    student_id: 0,
    category_id: 0,
    amount: '',
    description: '',
    remarks: ''
  };

  const [addForm, setAddForm] = useState(initialAddForm);

  const [editForm, setEditForm] = useState({
    category_id: 0,
    amount: '',
    description: '',
    remarks: '',
    status: 'pending'
  });

  const fetchDues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/due-records');
      const data = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.records) ? res.data.records : []);
      setDues(data);
    } catch (err) {
      console.error('Failed to load dues', err);
      setDues([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [stRes, catRes] = await Promise.all([
        api.get('/staff/students'),
        api.get('/due-categories')
      ]);

      const stList = Array.isArray(stRes.data) ? stRes.data : [];
      const catList = Array.isArray(catRes.data) ? catRes.data : [];

      setStudents(stList);
      setCategories(catList);

      if (stList.length > 0 && catList.length > 0) {
        setAddForm((prev) => ({
          ...prev,
          student_id: stList[0].id,
          category_id: catList[0].id
        }));
      }
    } catch (err) {
      console.error('Failed to load students or categories', err);
    }
  };

  useEffect(() => {
    fetchDues();
    fetchInitialData();
  }, []);

  const openAddModal = () => {
    setFormError(null);
    setAddForm({
      ...initialAddForm,
      student_id: students[0]?.id || 0,
      category_id: categories[0]?.id || 0
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (due: DueRecord) => {
    setFormError(null);
    setEditingDue(due);
    setEditForm({
      category_id: due.category_id || (categories[0]?.id || 0),
      amount: String(due.amount || 0),
      description: due.description || '',
      remarks: due.remarks || '',
      status: due.status || 'pending'
    });
  };

  const handleSaveNewDue = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const parsedAmount = parseFloat(addForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a valid number greater than 0');
      setSubmitting(false);
      return;
    }

    if (!addForm.student_id) {
      setFormError('Please select a student');
      setSubmitting(false);
      return;
    }

    if (!addForm.category_id) {
      setFormError('Please select a due category');
      setSubmitting(false);
      return;
    }

    if (!addForm.description.trim()) {
      setFormError('Please provide a description or reason for this due');
      setSubmitting(false);
      return;
    }

    try {
      await api.post('/due-records', {
        student_id: Number(addForm.student_id),
        category_id: Number(addForm.category_id),
        amount: parsedAmount,
        description: addForm.description.trim(),
        remarks: addForm.remarks.trim() || undefined
      });

      setIsAddModalOpen(false);
      await fetchDues();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save due record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDue) return;

    setSubmitting(true);
    setFormError(null);

    const parsedAmount = parseFloat(editForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Amount must be a valid number greater than 0');
      setSubmitting(false);
      return;
    }

    if (!editForm.description.trim()) {
      setFormError('Please provide a description');
      setSubmitting(false);
      return;
    }

    try {
      await api.patch(`/due-records/${editingDue.id}`, {
        category_id: Number(editForm.category_id),
        amount: parsedAmount,
        description: editForm.description.trim(),
        remarks: editForm.remarks.trim() || undefined,
        status: editForm.status
      });

      setEditingDue(null);
      await fetchDues();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to update due record');
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
      await fetchDues();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to delete due record');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmWaiveDue = async () => {
    if (!waivingDue || !waiveReason.trim()) return;
    try {
      setSubmitting(true);
      await api.patch(`/due-records/${waivingDue.id}`, {
        status: 'waived',
        remarks: `Waived: ${waiveReason.trim()}`
      });
      setWaivingDue(null);
      await fetchDues();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to waive due');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmMarkCleared = async () => {
    if (!clearingDue || !clearingRef.trim()) return;
    try {
      setSubmitting(true);
      await api.post(`/due-records/${clearingDue.id}/pay`, {
        payment_reference: clearingRef.trim()
      });
      setClearingDue(null);
      await fetchDues();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to mark due cleared');
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
      d.description?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Department Dues & Fines Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, edit, manage, and settle student liabilities for {staffProfile?.department_name || 'Assigned Department'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dues or student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add New Due
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Dues ({dues.filter((d) => d.status === 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('cleared')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'cleared'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cleared ({dues.filter((d) => d.status === 'cleared').length})
        </button>
        <button
          onClick={() => setStatusFilter('waived')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'waived'
              ? 'bg-slate-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Waived ({dues.filter((d) => d.status === 'waived').length})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({dues.length})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading department dues...</div>
      ) : filteredDues.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">No Due Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {students.length === 0
              ? 'No students enrolled yet. Once the Administrator registers students in the Admin Portal, you can record dues for them here.'
              : 'No dues matching your selected filter. Click "Add New Due" to record a new department liability.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Particulars</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDues.map((due) => (
                  <tr key={due.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{due.student_name || 'Student'}</p>
                      <p className="font-mono text-[11px] text-indigo-700">{due.student_reg_no}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-600">
                        {due.category_name || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                      <p className="font-medium truncate">{due.description}</p>
                      {due.remarks && (
                        <p className="text-[10px] text-slate-400 italic truncate">"{due.remarks}"</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-display font-bold text-slate-900">
                        ₹{Number(due.amount || 0).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          due.status === 'cleared'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : due.status === 'waived'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {due.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(due.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {due.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setClearingDue(due);
                                setClearingRef(`RCPT-${Date.now().toString().slice(-6)}`);
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                              title="Mark Paid via Counter Voucher"
                            >
                              Pay
                            </button>
                            <button
                              onClick={() => {
                                setWaivingDue(due);
                                setWaiveReason('Institutional fee concession or departmental exemption');
                              }}
                              className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                              title="Waive Due"
                            >
                              Waive
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => openEditModal(due)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Due Record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeletingDue(due)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Due Record"
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
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-slate-900 text-base">Record New Department Due</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDue} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Student Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student <span className="text-rose-500">*</span>
                </label>
                {students.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    No students currently enrolled in the college. Please contact the Administrator to enroll students first.
                  </div>
                ) : (
                  <select
                    value={addForm.student_id}
                    onChange={(e) => setAddForm({ ...addForm, student_id: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name} ({s.register_number}) — Year {s.year || 1}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Due Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={addForm.category_id}
                  onChange={(e) => setAddForm({ ...addForm, category_id: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Particulars / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.description}
                  onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                  placeholder="e.g. Lab component damage fine, overdue book, semester fee balance"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={addForm.remarks}
                  onChange={(e) => setAddForm({ ...addForm, remarks: e.target.value })}
                  placeholder="Additional institutional notes or clearance conditions..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || students.length === 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {submitting ? 'Saving Due...' : 'Save Due Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Due Modal */}
      {editingDue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-display font-bold text-slate-900 text-base">Edit Due Record #{editingDue.id}</h3>
              </div>
              <button
                onClick={() => setEditingDue(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDue} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Student Info Readonly Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400">Student</p>
                  <p className="font-bold text-slate-900">{editingDue.student_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">Register Number</p>
                  <p className="font-mono font-bold text-indigo-700">{editingDue.student_reg_no}</p>
                </div>
              </div>

              {/* Due Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editForm.category_id}
                  onChange={(e) => setEditForm({ ...editForm, category_id: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Particulars / Description <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="pending">Pending (Unpaid)</option>
                  <option value="cleared">Cleared (Paid)</option>
                  <option value="waived">Waived (Discharged)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDue(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-xs"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Counter Receipt / Pay Modal */}
      {clearingDue && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Clear Due via Counter Receipt</h4>
                  <p className="text-[11px] text-slate-400">Record #{clearingDue.id} — ₹{Number(clearingDue.amount).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => setClearingDue(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Recording counter payment for student <span className="font-bold text-slate-900">{clearingDue.student_name}</span> ({clearingDue.student_reg_no}).
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Counter Receipt / Offline Voucher Reference <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={clearingRef}
                onChange={(e) => setClearingRef(e.target.value)}
                placeholder="e.g. RCPT-12345"
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setClearingDue(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmMarkCleared}
                disabled={submitting || !clearingRef.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Marking Cleared...' : 'Confirm Clearance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waive Due Modal */}
      {waivingDue && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Waive Due Obligation</h4>
                  <p className="text-[11px] text-slate-400">Record #{waivingDue.id} — ₹{Number(waivingDue.amount).toFixed(2)}</p>
                </div>
              </div>
              <button onClick={() => setWaivingDue(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Exempt student <span className="font-bold text-slate-900">{waivingDue.student_name}</span> ({waivingDue.student_reg_no}) from outstanding liability.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Waiver Justification / Sanction Authority <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                placeholder="Specify reason or concession order..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setWaivingDue(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmWaiveDue}
                disabled={submitting || !waiveReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl disabled:opacity-50"
              >
                {submitting ? 'Applying Waiver...' : 'Confirm Waiver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Due Modal */}
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
              <span className="font-bold text-slate-900">{deletingDue.student_name}</span>?
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
