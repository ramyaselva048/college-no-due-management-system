import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Building2,
  Layers,
  Filter,
  Save,
  X,
  ArrowLeft
} from 'lucide-react';
import api from '../../services/api';
import { SubjectCourse } from '../../types';

export const HODCurriculumPage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(4);
  const [selectedSemester, setSelectedSemester] = useState<number>(7);
  const [nodes, setNodes] = useState<SubjectCourse[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<SubjectCourse | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    course_type: 'theory' as 'theory' | 'lab',
    slot: '',
    faculty_name: '',
    faculty_id: '' as string | number,
    is_elective: false
  });

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const [nodesRes, facRes] = await Promise.all([
        api.get(`/hod/clearance-nodes?year=${selectedYear}&semester=${selectedSemester}`),
        api.get('/hod/faculty')
      ]);
      setNodes(nodesRes.data);
      setFacultyList(facRes.data);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to fetch clearance nodes'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [selectedYear, selectedSemester]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Handle year change automatically updating default semester
  const handleYearChange = (yr: number) => {
    setSelectedYear(yr);
    setSelectedSemester(yr * 2 - 1);
  };

  const handleOpenAddModal = () => {
    setEditingNode(null);
    const theoryCount = nodes.filter((n) => n.course_type !== 'lab').length;
    setFormData({
      title: '',
      code: '',
      course_type: 'theory',
      slot: `Sub ${theoryCount + 1}`,
      faculty_name: facultyList[0]?.full_name || '',
      faculty_id: facultyList[0]?.id || '',
      is_elective: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (node: SubjectCourse) => {
    setEditingNode(node);
    setFormData({
      title: node.title,
      code: node.code,
      course_type: (node.course_type as 'theory' | 'lab') || 'theory',
      slot: node.slot || 'Sub 1',
      faculty_name: node.faculty_name || '',
      faculty_id: node.faculty_id || '',
      is_elective: Boolean(node.is_elective)
    });
    setIsModalOpen(true);
  };

  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const facId = e.target.value;
    const selectedFac = facultyList.find((f) => String(f.id) === String(facId));
    setFormData({
      ...formData,
      faculty_id: facId,
      faculty_name: selectedFac ? selectedFac.full_name : formData.faculty_name
    });
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNode) {
        await api.put(`/hod/clearance-nodes/${editingNode.id}`, {
          ...formData,
          year: selectedYear,
          semester: selectedSemester
        });
        setFeedback({ type: 'success', message: 'Clearance node updated successfully.' });
      } else {
        await api.post('/hod/clearance-nodes', {
          ...formData,
          year: selectedYear,
          semester: selectedSemester
        });
        setFeedback({ type: 'success', message: 'New clearance node allocated successfully.' });
      }
      setIsModalOpen(false);
      fetchNodes();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save clearance node.'
      });
    }
  };

  const handleDeleteNode = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from Semester ${selectedSemester} clearance nodes?`)) {
      return;
    }
    try {
      await api.delete(`/hod/clearance-nodes/${id}`);
      setFeedback({ type: 'success', message: 'Clearance node removed.' });
      fetchNodes();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to remove clearance node.'
      });
    }
  };

  const handlePopulateCurriculum = async () => {
    if (
      nodes.length > 0 &&
      !window.confirm(
        `Semester ${selectedSemester} already has ${nodes.length} nodes. Populating regulation syllabus will overwrite existing nodes for this semester. Continue?`
      )
    ) {
      return;
    }

    try {
      setPopulating(true);
      const res = await api.post('/hod/clearance-nodes/populate-semester', {
        year: selectedYear,
        semester: selectedSemester
      });
      setFeedback({ type: 'success', message: res.data.message });
      fetchNodes();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to populate standard curriculum.'
      });
    } finally {
      setPopulating(false);
    }
  };

  const theoryNodes = nodes.filter((n) => n.course_type !== 'lab');
  const labNodes = nodes.filter((n) => n.course_type === 'lab');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-xl text-slate-900">
              Department Clearance Nodes Allocation
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Year & Semester Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Configure the specific theory subjects and laboratory practicals for each semester. Students of your department will only be required to clear dues for the nodes you allocate here.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/dashboard"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={handlePopulateCurriculum}
            disabled={populating}
            className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            {populating ? 'Allocating Standard Syllabus...' : 'Auto-Load Regulation Syllabus'}
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Clearance Node
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Year & Semester Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Year Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Academic Year:
          </span>
          {[1, 2, 3, 4].map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => handleYearChange(yr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedYear === yr
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Year {yr}
            </button>
          ))}
        </div>

        {/* Semester Buttons for selected year */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
            Semester:
          </span>
          {[selectedYear * 2 - 1, selectedYear * 2].map((sem) => (
            <button
              key={sem}
              type="button"
              onClick={() => setSelectedSemester(sem)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedSemester === sem
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semester {sem}
            </button>
          ))}
        </div>
      </div>

      {/* Current Nodes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theory Subjects Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Theory Clearance Nodes ({theoryNodes.length}/6 Slots)
                </h3>
                <p className="text-[10px] text-slate-400">Standard college form Sub 1 through Sub 6</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Semester {selectedSemester} Theory
            </span>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading nodes...</div>
            ) : theoryNodes.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl p-4">
                <p className="font-semibold text-slate-600">No theory clearance nodes allocated for Semester {selectedSemester}</p>
                <p className="text-[11px] text-slate-400 mt-1">Click "Auto-Load Regulation Syllabus" above or add nodes manually.</p>
              </div>
            ) : (
              theoryNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 transition-all flex items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                      {node.slot?.replace('Sub ', 'S') || 'TH'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {node.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {node.title}
                        </h4>
                        {node.is_elective && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Elective
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>In-Charge:</span>
                        <span className="font-semibold text-slate-800 truncate">
                          {node.faculty_name || 'Department Faculty'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(node)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Edit Node"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(node.id, node.title)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Remove Node"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Practical / Laboratory Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Laboratory Clearance Nodes ({labNodes.length}/4 Slots)
                </h3>
                <p className="text-[10px] text-slate-400">Standard college form Lab 1 through Lab 4</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Semester {selectedSemester} Labs
            </span>
          </div>

          <div className="p-4 space-y-3">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading nodes...</div>
            ) : labNodes.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl p-4">
                <p className="font-semibold text-slate-600">No laboratory clearance nodes allocated for Semester {selectedSemester}</p>
                <p className="text-[11px] text-slate-400 mt-1">Click "Auto-Load Regulation Syllabus" above to populate labs.</p>
              </div>
            ) : (
              labNodes.map((node) => (
                <div
                  key={node.id}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 font-mono border border-emerald-200">
                      {node.slot?.replace('Lab ', 'L') || 'LAB'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                          {node.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {node.title}
                        </h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Lab In-Charge:</span>
                        <span className="font-semibold text-slate-800 truncate">
                          {node.faculty_name || 'Lab Instructor'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(node)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Edit Lab"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(node.id, node.title)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                      title="Remove Lab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Clearance Node Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  {editingNode ? 'Edit Clearance Node' : 'Allocate New Clearance Node'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Year {selectedYear} • Semester {selectedSemester}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNode} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Type
                  </label>
                  <select
                    value={formData.course_type}
                    onChange={(e) => {
                      const cType = e.target.value as 'theory' | 'lab';
                      const count = nodes.filter((n) => n.course_type === cType).length;
                      setFormData({
                        ...formData,
                        course_type: cType,
                        slot: cType === 'lab' ? `Lab ${count + 1}` : `Sub ${count + 1}`
                      });
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="theory">Theory Subject</option>
                    <option value="lab">Laboratory Practical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clearance Slot Label
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sub 1, Sub 2, Lab 1"
                    value={formData.slot}
                    onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject / Lab Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cryptography and Cyber Security"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS8792"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Elective Subject?
                  </label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="checkbox-elective"
                      checked={formData.is_elective}
                      onChange={(e) => setFormData({ ...formData, is_elective: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                    />
                    <label htmlFor="checkbox-elective" className="text-xs text-slate-700 font-medium cursor-pointer">
                      Professional Elective
                    </label>
                  </div>
                </div>
              </div>

              {/* Staff In-Charge Allocation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Staff In-Charge (Authorized to Clear Dues)
                </label>
                {facultyList.length > 0 ? (
                  <select
                    value={formData.faculty_id}
                    onChange={handleFacultyChange}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 mb-2"
                  >
                    <option value="">-- Choose from Department Staff --</option>
                    {facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.full_name} ({f.employee_id}) - {f.designation}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  placeholder="Or enter staff / instructor full name manually"
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This staff member will have the authority to clear dues or report lab equipment breakage fees for this subject.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingNode ? 'Update Node' : 'Allocate Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
