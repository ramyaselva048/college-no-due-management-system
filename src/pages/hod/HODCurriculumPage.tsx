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
  ArrowLeft,
  GraduationCap,
  Bus,
  Library,
  Wallet,
  Home,
  Trophy,
  ShieldCheck,
  Check,
  Globe
} from 'lucide-react';
import api from '../../services/api';
import { SubjectCourse } from '../../types';
import { SearchableSelect } from '../../components/common/SearchableSelect';

export const HODCurriculumPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'academic' | 'common'>('academic');

  // Academic Nodes State
  const [selectedYear, setSelectedYear] = useState<number>(4);
  const [selectedSemester, setSelectedSemester] = useState<number>(7);
  const [nodes, setNodes] = useState<SubjectCourse[]>([]);
  const [facultyList, setFacultyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Common Nodes State (Universal across all students)
  const [commonNodes, setCommonNodes] = useState<SubjectCourse[]>([]);
  const [officersList, setOfficersList] = useState<any[]>([]);
  const [loadingCommon, setLoadingCommon] = useState(false);
  const [populatingCommon, setPopulatingCommon] = useState(false);

  // Academic Modal / Form state
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

  // Common Node Modal / Form state
  const [isCommonModalOpen, setIsCommonModalOpen] = useState(false);
  const [editingCommonNode, setEditingCommonNode] = useState<SubjectCourse | null>(null);
  const [commonFormData, setCommonFormData] = useState({
    title: '',
    code: '',
    slot: '',
    faculty_id: '' as string | number,
    faculty_name: '',
    faculty_email: '',
    requirement_description: '',
    applies_to: 'all' as 'all' | 'hostel' | 'day_scholar',
    category_key: 'library' as 'library' | 'accounts' | 'transport' | 'hostel' | 'sports' | 'exam_cell' | 'general'
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

  const fetchCommonNodes = async () => {
    try {
      setLoadingCommon(true);
      const [nodesRes, officersRes] = await Promise.all([
        api.get('/hod/common-clearance-nodes'),
        api.get('/hod/all-officers')
      ]);
      setCommonNodes(nodesRes.data);
      setOfficersList(officersRes.data || []);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to fetch common clearance nodes'
      });
    } finally {
      setLoadingCommon(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [selectedYear, selectedSemester]);

  useEffect(() => {
    fetchCommonNodes();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (isCommonModalOpen) setIsCommonModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isCommonModalOpen]);

  // Handle year change automatically updating default semester
  const handleYearChange = (yr: number) => {
    setSelectedYear(yr);
    setSelectedSemester(yr * 2 - 1);
  };

  // Academic Node Actions
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

  // Common Institutional Nodes Actions (Library, Accounts, Transport, Hostel, Sports, CoE)
  const handleOpenAddCommonModal = (preset?: {
    title: string;
    code: string;
    slot: string;
    faculty_name: string;
    faculty_email?: string;
    requirement_description: string;
    category_key: any;
    applies_to?: any;
  }) => {
    setEditingCommonNode(null);
    if (preset) {
      const matchedOff = officersList.find((o) =>
        (preset.faculty_email && o.email?.toLowerCase() === preset.faculty_email.toLowerCase()) ||
        (preset.faculty_name && o.full_name?.toLowerCase().includes(preset.faculty_name.toLowerCase()))
      );
      setCommonFormData({
        title: preset.title,
        code: preset.code,
        slot: preset.slot,
        faculty_id: matchedOff?.id || '',
        faculty_name: matchedOff?.full_name || preset.faculty_name,
        faculty_email: matchedOff?.email || preset.faculty_email || '',
        requirement_description: preset.requirement_description,
        applies_to: preset.applies_to || 'all',
        category_key: preset.category_key
      });
    } else {
      setCommonFormData({
        title: '',
        code: '',
        slot: `COM-${commonNodes.length + 1}`,
        faculty_id: '',
        faculty_name: 'Officer In-Charge',
        faculty_email: '',
        requirement_description: 'Return issued items and clear all outstanding section dues',
        applies_to: 'all',
        category_key: 'general'
      });
    }
    setIsCommonModalOpen(true);
  };

  const handleOpenEditCommonModal = (node: SubjectCourse) => {
    setEditingCommonNode(node);
    setCommonFormData({
      title: node.title,
      code: node.code,
      slot: node.slot || 'COM',
      faculty_id: (node as any).faculty_id || '',
      faculty_name: node.faculty_name || 'Officer In-Charge',
      faculty_email: node.faculty_email || '',
      requirement_description: node.requirement_description || 'All institutional dues cleared',
      applies_to: (node.applies_to as any) || 'all',
      category_key: (node.category_key as any) || 'general'
    });
    setIsCommonModalOpen(true);
  };

  const handleSaveCommonNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCommonNode) {
        await api.put(`/hod/common-clearance-nodes/${editingCommonNode.id}`, commonFormData);
        setFeedback({ type: 'success', message: 'Common institutional clearance node updated.' });
      } else {
        await api.post('/hod/common-clearance-nodes', commonFormData);
        setFeedback({ type: 'success', message: 'New common clearance node allocated for all students.' });
      }
      setIsCommonModalOpen(false);
      fetchCommonNodes();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save common clearance node.'
      });
    }
  };

  const handleDeleteCommonNode = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" from the common institutional clearance nodes?`)) {
      return;
    }
    try {
      await api.delete(`/hod/common-clearance-nodes/${id}`);
      setFeedback({ type: 'success', message: 'Common clearance node removed.' });
      fetchCommonNodes();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to remove common clearance node.'
      });
    }
  };

  const handlePopulateDefaultCommonNodes = async () => {
    if (
      commonNodes.length > 0 &&
      !window.confirm('This will refresh the standard common nodes (Library, Accounts, Transport, Hostel, Sports, Exam Cell). Continue?')
    ) {
      return;
    }
    try {
      setPopulatingCommon(true);
      const res = await api.post('/hod/common-clearance-nodes/populate-defaults');
      setFeedback({ type: 'success', message: res.data.message });
      fetchCommonNodes();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to load standard common nodes.'
      });
    } finally {
      setPopulatingCommon(false);
    }
  };

  const theoryNodes = nodes.filter((n) => n.course_type !== 'lab');
  const labNodes = nodes.filter((n) => n.course_type === 'lab');

  // Quick Preset Definitions for Common Institutional Nodes
  const commonPresets = [
    {
      title: 'Central Library & Book Bank',
      code: 'LIB-101',
      slot: 'COM-LIB',
      faculty_name: 'D. Vinoth (Chief Librarian)',
      faculty_email: 'vinoth.library@sasurie.edu',
      requirement_description: 'Return all issued library books & project journals; clear overdue fines',
      category_key: 'library' as const,
      icon: Library,
      color: 'text-blue-700 bg-blue-50 border-blue-200'
    },
    {
      title: 'Accounts & College Finance Office',
      code: 'ACC-101',
      slot: 'COM-ACC',
      faculty_name: 'S. Accounts (Finance Officer)',
      faculty_email: 'accounts@sasurie.edu',
      requirement_description: 'Full semester tuition fee, special fees & examination fee clearance',
      category_key: 'accounts' as const,
      icon: Wallet,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    },
    {
      title: 'College Bus & Transport Section',
      code: 'TRN-101',
      slot: 'COM-TRN',
      faculty_name: 'K. Murugesan (Transport In-Charge)',
      faculty_email: 'transport@sasurie.edu',
      requirement_description: 'Bus pass surrender or route fee payment verification',
      category_key: 'transport' as const,
      icon: Bus,
      color: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      title: 'Campus Hostel & Mess Section',
      code: 'HST-101',
      slot: 'COM-HST',
      faculty_name: 'Dr. R. Warden (Chief Warden)',
      faculty_email: 'hostel@sasurie.edu',
      requirement_description: 'Hostel room inventory handover & mess fee clearance',
      category_key: 'hostel' as const,
      applies_to: 'hostel' as const,
      icon: Home,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200'
    },
    {
      title: 'Physical Education & Sports Department',
      code: 'PED-101',
      slot: 'COM-PED',
      faculty_name: 'P. Ravichandran (Physical Director)',
      faculty_email: 'sports@sasurie.edu',
      requirement_description: 'Return tournament kits, jerseys & sports equipment',
      category_key: 'sports' as const,
      icon: Trophy,
      color: 'text-orange-700 bg-orange-50 border-orange-200'
    },
    {
      title: 'Office of Controller of Examinations (CoE)',
      code: 'COE-101',
      slot: 'COM-COE',
      faculty_name: 'Dr. H. Sasipal CoE',
      faculty_email: 'coe@sasurie.edu',
      requirement_description: 'Exam registration confirmation & hall ticket verification',
      category_key: 'exam_cell' as const,
      icon: ShieldCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-xl text-slate-900">
              Clearance Nodes Allocation Portal
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              HOD Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Allocate and manage both academic semester courses (Theory & Labs) and universal institutional clearance nodes (Library, Accounts, Transport, Hostel, Sports) required across all students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/dashboard"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          {activeTab === 'academic' ? (
            <>
              <button
                type="button"
                onClick={handlePopulateCurriculum}
                disabled={populating}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors border border-amber-300 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                {populating ? 'Allocating Syllabus...' : 'Auto-Load Regulation Syllabus'}
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Academic Node
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handlePopulateDefaultCommonNodes}
                disabled={populatingCommon}
                className="px-3.5 py-2 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200 inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {populatingCommon ? 'Loading Defaults...' : 'Auto-Load Standard Common Nodes'}
              </button>
              <button
                type="button"
                onClick={() => handleOpenAddCommonModal()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Allocate Common Node
              </button>
            </>
          )}
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
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Section Navigation Switcher */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('academic')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'academic'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Department Academic Nodes (Semester Theory & Labs)</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'academic' ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            Sem {selectedSemester}: {nodes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('common')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'common'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Common Clearance Form (All Students: Library, Accounts, Transport...)</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === 'common' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {commonNodes.length} Nodes
          </span>
        </button>
      </div>

      {/* TAB 1: ACADEMIC CURRICULUM NODES (Theory & Labs) */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

          {/* Current Academic Nodes List */}
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
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Node"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNode(node.id, node.title)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Lab"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNode(node.id, node.title)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
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
        </div>
      )}

      {/* TAB 2: COMMON INSTITUTIONAL CLEARANCE NODES (Universal across all students) */}
      {activeTab === 'common' && (
        <div className="space-y-6">
          {/* Quick Presets Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Quick-Allocate Institutional Clearance Nodes (All Students)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click any standard department or section below to quickly prefill and allocate clearance requirements:
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddCommonModal()}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Custom Node
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {commonPresets.map((preset) => {
                const IconComp = preset.icon;
                const alreadyAdded = commonNodes.some(
                  (n) => n.code === preset.code || n.slot === preset.slot || n.category_key === preset.category_key
                );

                return (
                  <button
                    key={preset.code}
                    type="button"
                    onClick={() => handleOpenAddCommonModal(preset)}
                    className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between h-24 ${
                      alreadyAdded
                        ? 'bg-slate-50/80 border-slate-200 opacity-90'
                        : 'bg-white hover:bg-indigo-50/30 border-slate-200 hover:border-indigo-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-1.5 rounded-lg border ${preset.color}`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      {alreadyAdded && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Added
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-900 leading-snug line-clamp-1">
                        {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">
                        {preset.slot} • {preset.code}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Common Nodes Active Table/Card List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Allocated Common Clearance Nodes ({commonNodes.length} Active Nodes)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Mandatory for all college student clearance forms (Library, Accounts, Transport, Hostel, Sports, Exam Cell)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 self-start sm:self-auto">
                Applies to All Students
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {loadingCommon ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading common clearance nodes...</div>
              ) : commonNodes.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 p-4">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No common clearance nodes configured yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Click "Auto-Load Standard Common Nodes" above to populate Library, Accounts, Transport, Hostel, Sports, and Exam Cell.
                  </p>
                </div>
              ) : (
                commonNodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-4 hover:bg-slate-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs shrink-0 border border-indigo-200/70 shadow-2xs">
                        {node.slot?.replace('COM-', '') || 'COM'}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                            {node.code}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900">
                            {node.title}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                              node.applies_to === 'hostel'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : node.applies_to === 'day_scholar'
                                ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {node.applies_to === 'hostel'
                              ? 'Hostellers Only'
                              : node.applies_to === 'day_scholar'
                              ? 'Day Scholars Only'
                              : 'All Students'}
                          </span>
                          {node.slot && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              Slot: {node.slot}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {node.requirement_description || 'Clearance of all institutional dues and record verification'}
                        </p>

                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3 pt-0.5">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>In-Charge:</span>
                            <span className="font-semibold text-slate-800">
                              {node.faculty_name || 'Designated Officer'}
                            </span>
                          </div>
                          {node.faculty_email && (
                            <span className="text-slate-400 font-mono text-[10px]">
                              ({node.faculty_email})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCommonModal(node)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Edit Common Node"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCommonNode(node.id, node.title)}
                        className="p-2 rounded-xl text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
                        title="Delete Common Node"
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
      )}

      {/* Add / Edit Academic Clearance Node Modal */}
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
                  {editingNode ? 'Edit Academic Clearance Node' : 'Allocate New Academic Node'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Year {selectedYear} • Semester {selectedSemester}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
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
                  <SearchableSelect
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
                    placeholder="Select course type..."
                    searchPlaceholder="Type to filter..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    options={[
                      { value: 'theory', label: 'Theory Subject' },
                      { value: 'lab', label: 'Laboratory Practical' }
                    ]}
                  />
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
                  placeholder="e.g. Cryptography and Network Security"
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
                  <div className="mb-2">
                    <SearchableSelect
                      value={formData.faculty_id}
                      onChange={handleFacultyChange}
                      placeholder="-- Choose or type from Department Staff --"
                      searchPlaceholder="Type staff name or ID..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      options={[
                        { value: '', label: '-- Choose from Department Staff --' },
                        ...facultyList.map((f) => ({
                          value: f.id,
                          label: `${f.full_name} (${f.employee_id}) - ${f.designation}`
                        }))
                      ]}
                    />
                  </div>
                ) : null}
                <input
                  type="text"
                  placeholder="Or enter staff / instructor full name manually"
                  value={formData.faculty_name}
                  onChange={(e) => setFormData({ ...formData, faculty_name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingNode ? 'Update Node' : 'Allocate Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit COMMON INSTITUTIONAL CLEARANCE NODE Modal (All Students: Library, Accounts, Transport, etc.) */}
      {isCommonModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsCommonModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    {editingCommonNode
                      ? 'Edit Common Clearance Node'
                      : 'Allocate Common Clearance Node (All Students)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Universal Clearance Form for Library, Accounts, Transport, Hostel, Sports, etc.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCommonModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCommonNode} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clearance Category
                  </label>
                  <SearchableSelect
                    value={commonFormData.category_key}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      const matched = commonPresets.find((p) => p.category_key === cat);
                      if (matched && !editingCommonNode) {
                        setCommonFormData({
                          ...commonFormData,
                          category_key: cat,
                          title: matched.title,
                          code: matched.code,
                          slot: matched.slot,
                          faculty_name: matched.faculty_name,
                          requirement_description: matched.requirement_description,
                          applies_to: matched.applies_to || 'all'
                        });
                      } else {
                        setCommonFormData({ ...commonFormData, category_key: cat });
                      }
                    }}
                    placeholder="Select clearance category..."
                    searchPlaceholder="Type category name..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    options={[
                      { value: 'library', label: 'Central Library & Book Bank' },
                      { value: 'accounts', label: 'Accounts & Finance Office' },
                      { value: 'transport', label: 'Bus & Transport Section' },
                      { value: 'hostel', label: 'Campus Hostel & Mess Section' },
                      { value: 'sports', label: 'Physical Education & Sports' },
                      { value: 'exam_cell', label: 'Controller of Examinations (CoE)' },
                      { value: 'general', label: 'Other Institutional Clearance' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Clearance Slot Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COM-LIB, COM-ACC, COM-TRN"
                    value={commonFormData.slot}
                    onChange={(e) => setCommonFormData({ ...commonFormData, slot: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Node / Section Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Library & Book Bank"
                  value={commonFormData.title}
                  onChange={(e) => setCommonFormData({ ...commonFormData, title: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LIB-101, ACC-101"
                    value={commonFormData.code}
                    onChange={(e) => setCommonFormData({ ...commonFormData, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Applies To Which Students?
                  </label>
                  <SearchableSelect
                    value={commonFormData.applies_to}
                    onChange={(e) => setCommonFormData({ ...commonFormData, applies_to: e.target.value as any })}
                    placeholder="Select student group..."
                    searchPlaceholder="Type group name..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    options={[
                      { value: 'all', label: 'All College Students (Universal)' },
                      { value: 'hostel', label: 'Hostellers Only' },
                      { value: 'day_scholar', label: 'Day Scholars Only' }
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clearance Requirement / Instructions
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Return all library books & clear overdue book fines..."
                  value={commonFormData.requirement_description}
                  onChange={(e) => setCommonFormData({ ...commonFormData, requirement_description: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign Registered College Officer (Auto-fill)
                </label>
                <SearchableSelect
                  value={commonFormData.faculty_id ? String(commonFormData.faculty_id) : ''}
                  onChange={(e) => {
                    const offId = e.target.value;
                    const off = officersList.find((o) => String(o.id) === String(offId));
                    if (off) {
                      setCommonFormData({
                        ...commonFormData,
                        faculty_id: off.id,
                        faculty_name: off.full_name,
                        faculty_email: off.email || commonFormData.faculty_email
                      });
                    }
                  }}
                  placeholder="Select institutional officer..."
                  searchPlaceholder="Search officer by name, designation, department..."
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  options={[
                    { value: '', label: '— Custom / Unassigned Officer —' },
                    ...officersList.map((o) => ({
                      value: String(o.id),
                      label: `${o.full_name} (${o.designation} • ${o.department_code || o.department_name || 'Staff'})`
                    }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Officer / In-Charge Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. D. Vinoth (Chief Librarian)"
                    value={commonFormData.faculty_name}
                    onChange={(e) => setCommonFormData({ ...commonFormData, faculty_name: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. library@college.edu"
                    value={commonFormData.faculty_email}
                    onChange={(e) => setCommonFormData({ ...commonFormData, faculty_email: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCommonModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {editingCommonNode ? 'Update Common Node' : 'Allocate for All Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

