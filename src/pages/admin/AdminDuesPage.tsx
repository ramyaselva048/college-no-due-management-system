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
  Tag,
  Users,
  Send,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { Department, StudentProfile } from '../../types';

export const AdminDuesPage: React.FC = () => {
  const [dues, setDues] = useState<any[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState<'all' | number>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDue, setEditingDue] = useState<any | null>(null);
  const [deletingDue, setDeletingDue] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Department-Wise Bulk Allocation Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [deptFormData, setDeptFormData] = useState({
    department_id: 0,
    year: 'ALL',
    section: 'ALL',
    course_id: 'ALL',
    category_id: 0,
    amount: '500',
    description: '',
    remarks: ''
  });
  const [deptTargetCount, setDeptTargetCount] = useState<number | null>(null);
  const [deptTargetStudents, setDeptTargetStudents] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deptSubmitting, setDeptSubmitting] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [deptSuccessMsg, setDeptSuccessMsg] = useState<string | null>(null);

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
      const [duesRes, stRes, deptRes, catRes, coursesRes] = await Promise.all([
        api.get('/due-records'),
        api.get('/admin/students'),
        api.get('/student/departments'),
        api.get('/due-categories'),
        api.get('/admin/courses').catch(() => ({ data: [] }))
      ]);

      const duesList = Array.isArray(duesRes.data)
        ? duesRes.data
        : (Array.isArray(duesRes.data?.dues) ? duesRes.data.dues : []);
      const stList = Array.isArray(stRes.data)
        ? stRes.data
        : (Array.isArray(stRes.data?.students) ? stRes.data.students : []);
      const deptList = Array.isArray(deptRes.data) ? deptRes.data : [];
      const catList = Array.isArray(catRes.data) ? catRes.data : [];
      const courseList = Array.isArray(coursesRes.data) ? coursesRes.data : (coursesRes.data?.courses || []);

      setDues(duesList);
      setStudents(stList);
      setDepartments(deptList);
      setCategories(catList);
      setCourses(courseList);

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

  // Real-time student targeting preview effect
  useEffect(() => {
    if (!isDeptModalOpen || !deptFormData.department_id) return;
    let isCancelled = false;
    setPreviewLoading(true);

    api
      .get('/admin/dues/preview-department-target', {
        params: {
          department_id: deptFormData.department_id,
          year: deptFormData.year,
          section: deptFormData.section,
          course_id: deptFormData.course_id
        }
      })
      .then((res) => {
        if (!isCancelled) {
          setDeptTargetCount(res.data.count);
          setDeptTargetStudents(res.data.students || []);
          setPreviewLoading(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setDeptTargetCount(0);
          setDeptTargetStudents([]);
          setPreviewLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isDeptModalOpen, deptFormData.department_id, deptFormData.year, deptFormData.section, deptFormData.course_id]);

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

  const openDeptAllocateModal = (preselectedDeptId?: number) => {
    setDeptError(null);
    const targetDeptId = preselectedDeptId || (departments.length > 0 ? departments[0].id : 0);
    const targetCatId = categories.length > 0 ? categories[0].id : 0;
    setDeptFormData({
      department_id: targetDeptId,
      year: 'ALL',
      section: 'ALL',
      course_id: 'ALL',
      category_id: targetCatId,
      amount: '500',
      description: '',
      remarks: ''
    });
    setIsDeptModalOpen(true);
  };

  const handleAllocateDepartmentDues = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptFormData.department_id) {
      setDeptError('Please select a target department');
      return;
    }
    if (!deptFormData.description.trim()) {
      setDeptError('Please provide a due description or purpose');
      return;
    }
    const amt = Number(deptFormData.amount);
    if (isNaN(amt) || amt <= 0) {
      setDeptError('Please specify a valid positive due amount');
      return;
    }

    setDeptSubmitting(true);
    setDeptError(null);

    try {
      const res = await api.post('/admin/dues/allocate-department', {
        department_id: deptFormData.department_id,
        year: deptFormData.year,
        section: deptFormData.section,
        course_id: deptFormData.course_id,
        category_id: deptFormData.category_id,
        amount: amt,
        description: deptFormData.description.trim(),
        remarks: deptFormData.remarks.trim()
      });

      setIsDeptModalOpen(false);
      setDeptSuccessMsg(res.data.message || 'Department dues successfully allocated to students!');
      setTimeout(() => setDeptSuccessMsg(null), 6000);
      setDeptFilter(deptFormData.department_id); // Immediately switch filter to this department
      await fetchData();
    } catch (err: any) {
      setDeptError(err.response?.data?.detail || 'Failed to allocate department dues');
    } finally {
      setDeptSubmitting(false);
    }
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
    const matchesDept = deptFilter === 'all' || d.department_id === deptFilter;
    const matchesSearch =
      search === '' ||
      d.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.student_reg_no?.toLowerCase().includes(search.toLowerCase()) ||
      d.department_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesDept && matchesSearch;
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
            Full administrative control across student dues, department fees, penalties, and clearance allocation
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
            onClick={() => openDeptAllocateModal()}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
            title="Allocate clearance dues to an entire department batch"
          >
            <Building2 className="w-3.5 h-3.5" /> Allocate Department Dues
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Record Single Due
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {deptSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{deptSuccessMsg}</span>
          </div>
          <button onClick={() => setDeptSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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

      {/* Department Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Filter by Allocating Department
          </span>
          {deptFilter !== 'all' && (
            <button
              onClick={() => setDeptFilter('all')}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Show All Departments
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setDeptFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
              deptFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Departments ({safeDues.length})
          </button>
          {departments
            .filter((d) => d.is_active)
            .map((dept) => {
              const count = safeDues.filter((d) => d.department_id === dept.id).length;
              const isSelected = deptFilter === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setDeptFilter(dept.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 inline-flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{dept.code || dept.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-mono text-[11px] text-indigo-700 font-semibold">{due.student_reg_no}</span>
                        {due.student_department_code && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                            {due.student_department_code}
                          </span>
                        )}
                        {due.student_year && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Yr {due.student_year}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{due.department_name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{due.category_name || 'General'}</p>
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
                <input
                  type="text"
                  list="admin-dues-students-list"
                  placeholder="Type student name or reg no..."
                  value={
                    students.find((s) => s.id === formData.student_id)
                      ? `${students.find((s) => s.id === formData.student_id)?.full_name} (${students.find((s) => s.id === formData.student_id)?.register_number})`
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = students.find(
                      (s) =>
                        `${s.full_name} (${s.register_number})`.toLowerCase() === val.toLowerCase() ||
                        s.full_name.toLowerCase() === val.toLowerCase() ||
                        s.register_number.toLowerCase() === val.toLowerCase() ||
                        String(s.id) === val
                    );
                    if (matched) {
                      setFormData({ ...formData, student_id: matched.id });
                    }
                  }}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  required
                />
                <datalist id="admin-dues-students-list">
                  {students.map((s) => (
                    <option key={s.id} value={`${s.full_name} (${s.register_number})`}>
                      {s.course_name || 'Student'}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
                  <input
                    type="text"
                    list="admin-dues-depts-list"
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
                  <datalist id="admin-dues-depts-list">
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.code}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <input
                    type="text"
                    list="admin-dues-cats-list"
                    placeholder="Type category..."
                    value={categories.find((c) => c.id === formData.category_id)?.name || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const matched = categories.find(
                        (c) =>
                          c.name.toLowerCase() === val.toLowerCase() ||
                          (c.code && c.code.toLowerCase() === val.toLowerCase()) ||
                          String(c.id) === val
                      );
                      if (matched) {
                        setFormData({ ...formData, category_id: matched.id });
                      }
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                    required
                  />
                  <datalist id="admin-dues-cats-list">
                    {categories.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
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
                  <input
                    type="text"
                    list="admin-dues-status-list"
                    placeholder="Type status (pending / cleared / waived)..."
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value.toLowerCase() })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold"
                  />
                  <datalist id="admin-dues-status-list">
                    <option value="pending">PENDING</option>
                    <option value="cleared">CLEARED (Paid)</option>
                    <option value="waived">WAIVED (Exempted)</option>
                  </datalist>
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

      {/* Department-Wise Clearance Dues Bulk Allocation Modal */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-900 text-base">
                    Allocate Department Clearance Dues
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Assign clearance dues exclusively to students of a specific department batch (e.g. CSE or ECE)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeptModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAllocateDepartmentDues} className="p-6 space-y-4 overflow-y-auto">
              {deptError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{deptError}</span>
                </div>
              )}

              {/* 1. Target Department Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Department *
                </label>
                <select
                  required
                  value={deptFormData.department_id}
                  onChange={(e) =>
                    setDeptFormData({ ...deptFormData, department_id: Number(e.target.value) })
                  }
                  className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={0} disabled>Select Department</option>
                  {departments
                    .filter((d) => d.is_active)
                    .map((d) => {
                      const deptStudentCount = students.filter((s) => s.department_id === d.id).length;
                      return (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code || 'DEPT'}) — {deptStudentCount} Enrolled Students
                        </option>
                      );
                    })}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Only students enrolled in this academic department will receive these clearance dues.
                </p>
              </div>

              {/* 2. Target Batch Filters: Year & Section & Course */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/70">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Academic Year
                  </label>
                  <select
                    value={deptFormData.year}
                    onChange={(e) =>
                      setDeptFormData({ ...deptFormData, year: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value="ALL">All Years (1 - 4)</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Section
                  </label>
                  <select
                    value={deptFormData.section}
                    onChange={(e) =>
                      setDeptFormData({ ...deptFormData, section: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value="ALL">All Sections</option>
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Degree / Course
                  </label>
                  <select
                    value={deptFormData.course_id}
                    onChange={(e) =>
                      setDeptFormData({ ...deptFormData, course_id: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800"
                  >
                    <option value="ALL">All Courses</option>
                    {courses
                      .filter((c) => !deptFormData.department_id || c.department_id === deptFormData.department_id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code || c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 3. Real-Time Student Target Preview Card */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Target Audience Preview:
                  </span>
                  {previewLoading ? (
                    <span className="text-[11px] text-indigo-600 animate-pulse">Calculating target...</span>
                  ) : (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-200/60 text-indigo-900 font-mono">
                      {deptTargetCount ?? 0} Students
                    </span>
                  )}
                </div>

                {deptTargetCount !== null && deptTargetCount > 0 ? (
                  <div>
                    <p className="text-[11px] text-indigo-700 mb-2">
                      Total Allocated Value: <span className="font-bold text-indigo-950 font-mono">
                        ₹{((deptTargetCount || 0) * (Number(deptFormData.amount) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span> (₹{deptFormData.amount || 0} × {deptTargetCount} students)
                    </p>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {deptTargetStudents.map((st: any) => (
                        <div
                          key={st.id}
                          className="text-[10px] bg-white/80 border border-indigo-100 px-2 py-1 rounded-md flex items-center justify-between text-slate-700"
                        >
                          <span className="font-medium truncate max-w-[160px]">{st.full_name}</span>
                          <span className="font-mono text-indigo-700 font-semibold">{st.register_number}</span>
                          <span className="text-slate-400 font-mono">Yr {st.year}{st.section ? `-${st.section}` : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    No students match this department and batch filter.
                  </p>
                )}
              </div>

              {/* 4. Due Category & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Due Category *
                  </label>
                  <select
                    required
                    value={deptFormData.category_id}
                    onChange={(e) =>
                      setDeptFormData({ ...deptFormData, category_id: Number(e.target.value) })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount per Student (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={deptFormData.amount}
                    onChange={(e) => setDeptFormData({ ...deptFormData, amount: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 font-mono font-bold"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    {['200', '500', '1000', '2000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDeptFormData({ ...deptFormData, amount: amt })}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Description / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Odd Semester Lab Breakage Fee / Department Symposium Kit / Department Book Due"
                  value={deptFormData.description}
                  onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              {/* 6. Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department Remarks / Authorization (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Authorized by Department HOD Ref: 2026/09"
                  value={deptFormData.remarks}
                  onChange={(e) => setDeptFormData({ ...deptFormData, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeptModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deptSubmitting || !deptTargetCount}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                >
                  {deptSubmitting ? 'Allocating...' : `Confirm & Allocate to ${deptTargetCount || 0} Students`}
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
