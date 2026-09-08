import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Department, Course } from '../../types';

export const SignupPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    register_number: '',
    password: '',
    phone: '',
    department_id: 4, // Default to CSE
    course_id: 1,     // Default to B.Tech CSE
    year: 4,
    section: 'A',
    admission_year: 2022
  });

  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load departments
    api.get('/student/departments')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDepartments(res.data);
          setFormData((prev) => ({
            ...prev,
            department_id: prev.department_id || res.data[0].id
          }));
        }
      })
      .catch((err) => console.warn('Departments fetch notice:', err));

    // Load courses
    api.get('/student/courses')
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCourses(res.data);
          setFormData((prev) => ({
            ...prev,
            course_id: prev.course_id || res.data[0].id
          }));
        }
      })
      .catch((err) => console.warn('Courses fetch notice:', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('_id') || name === 'year' || name === 'admission_year' ? Number(value) : value
    }));
  };

  const autofillSampleStudent = () => {
    const randomDigits = Math.floor(100 + Math.random() * 900);
    const chosenDept = departments.find(d => d.code === 'CSE') || departments[0];
    const chosenCourse = courses.find(c => c.code === 'BTECH_CSE') || courses[0];
    
    setFormData({
      full_name: `Kavitha Sundaram ${randomDigits}`,
      email: `student${randomDigits}@college.edu`,
      register_number: `2022BCSE${randomDigits}`,
      password: 'StudentPassword@123',
      phone: `+91 9840${randomDigits}01`,
      department_id: chosenDept ? chosenDept.id : 4,
      course_id: chosenCourse ? chosenCourse.id : 1,
      year: 4,
      section: 'A',
      admission_year: 2022
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await signup(formData);
      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please verify form details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl text-slate-900">Apex College</span>
        </Link>
        <h2 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
          Student Self-Registration
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Create your verified institutional student account to begin No Due clearance
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Priya Nair"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Register Number</label>
                <input
                  type="text"
                  name="register_number"
                  required
                  placeholder="e.g. 2022BCSE089"
                  value={formData.register_number}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="priya@college.edu"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                <select
                  name="department_id"
                  value={formData.department_id}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Degree / Course</label>
                <select
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                  required
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Current Year</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
                >
                  <option value={1}>1st Year</option>
                  <option value={2}>2nd Year</option>
                  <option value={3}>3rd Year</option>
                  <option value={4}>4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                <input
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800"
                  placeholder="A"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admission Year</label>
                <input
                  type="number"
                  name="admission_year"
                  value={formData.admission_year}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Account Password</label>
                <span className="text-[10px] text-slate-400">Min. 8 characters</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="Create institutional password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full text-xs px-3 py-2.5 pr-10 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Helper Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={autofillSampleStudent}
                className="w-full py-2 px-3 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Auto-fill Sample Student Registration Details
              </button>
            </div>

            <button
              id="btn-signup-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? 'Registering Account...' : 'Complete Registration'} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="text-indigo-600 font-bold hover:underline">
                Sign in to your account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
