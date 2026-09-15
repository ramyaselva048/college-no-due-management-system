import React, { useState, useEffect } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { DueCategory, Department } from '../../types';
import { SearchableSelect } from '../common/SearchableSelect';

interface AddDueModalProps {
  studentId: number;
  studentName: string;
  studentRegNo: string;
  defaultDepartmentId?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddDueModal: React.FC<AddDueModalProps> = ({
  studentId,
  studentName,
  studentRegNo,
  defaultDepartmentId,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [categories, setCategories] = useState<DueCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState<number>(defaultDepartmentId || 0);
  const [deptText, setDeptText] = useState<string>('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [catText, setCatText] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch categories
      api.get('/student/due-categories').then((res) => {
        setCategories(res.data);
        if (res.data.length > 0) {
          setCategoryId(res.data[0].id);
          setCatText(res.data[0].name);
        }
      });
      // Fetch departments if admin
      if (!defaultDepartmentId) {
        api.get('/student/departments').then((res) => {
          setDepartments(res.data);
          if (res.data.length > 0) {
            setDepartmentId(res.data[0].id);
            setDeptText(res.data[0].name);
          }
        });
      } else {
        setDepartmentId(defaultDepartmentId);
      }
    }
  }, [isOpen, defaultDepartmentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than zero');
      setLoading(false);
      return;
    }

    try {
      let finalDeptId = departmentId || defaultDepartmentId;
      if (!finalDeptId && deptText) {
        const d = departments.find(
          (item) =>
            item.name.toLowerCase() === deptText.toLowerCase() ||
            item.code.toLowerCase() === deptText.toLowerCase()
        );
        if (d) finalDeptId = d.id;
      }
      let finalCatId = categoryId;
      if (!finalCatId && catText) {
        const c = categories.find(
          (item) =>
            item.name.toLowerCase() === catText.toLowerCase() ||
            (item.code && item.code.toLowerCase() === catText.toLowerCase())
        );
        if (c) finalCatId = c.id;
      }

      await api.post('/due-records', {
        student_id: studentId,
        department_id: finalDeptId,
        category_id: finalCatId,
        amount: parsedAmount,
        description,
        remarks: remarks || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to record due');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold text-slate-900 text-base">Record New Due</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-slate-400">Student: </span>
              <span className="font-bold text-slate-900">{studentName}</span>
            </div>
            <div>
              <span className="text-slate-400">Reg No: </span>
              <span className="font-mono font-bold text-indigo-700">{studentRegNo}</span>
            </div>
          </div>

          {!defaultDepartmentId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <SearchableSelect
                value={departmentId || deptText}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = Number(val);
                  if (!isNaN(num) && num > 0) {
                    setDepartmentId(num);
                    const d = departments.find((item) => item.id === num);
                    if (d) setDeptText(d.name);
                  } else {
                    setDeptText(String(val));
                    const matched = departments.find((d) => d.name.toLowerCase() === String(val).toLowerCase());
                    if (matched) setDepartmentId(matched.id);
                  }
                }}
                placeholder="Select or add department..."
                searchPlaceholder="Type to search or add department..."
                allowCustom={true}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                options={departments.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.code || 'DEPT'})`
                }))}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Category</label>
            <SearchableSelect
              value={categoryId || catText}
              onChange={(e) => {
                const val = e.target.value;
                const num = Number(val);
                if (!isNaN(num) && num > 0) {
                  setCategoryId(num);
                  const c = categories.find((item) => item.id === num);
                  if (c) setCatText(c.name);
                } else {
                  setCatText(String(val));
                  const matched = categories.find((c) => c.name.toLowerCase() === String(val).toLowerCase());
                  if (matched) setCategoryId(matched.id);
                }
              }}
              placeholder="Select or add due category..."
              searchPlaceholder="Type to search or add category..."
              allowCustom={true}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
              options={categories.map((c) => ({
                value: c.id,
                label: c.name
              }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 250.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Particulars</label>
            <input
              type="text"
              placeholder="e.g. Lost Database System Handbook (8th Edition)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
            <textarea
              rows={2}
              placeholder="Internal reference or counter notes"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="btn-submit-due"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Add Due Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
