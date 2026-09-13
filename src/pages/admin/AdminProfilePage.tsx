import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AdminProfileData {
  id: number;
  full_name: string;
  username: string;
  email: string;
  role: string;
  designation: string;
  institution_name: string;
  office: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const AdminProfilePage: React.FC = () => {
  const { user, refreshMe } = useAuth();

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Profile metadata
  const [profileData, setProfileData] = useState<AdminProfileData | null>(null);

  // Fetch admin profile
  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await api.get('/admin/profile');
      const data: AdminProfileData = res.data;
      setProfileData(data);
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setEmail(data.email || '');
    } catch (err: any) {
      console.error('Failed to load admin profile:', err);
      // Fallback to auth user
      if (user) {
        setFullName(user.full_name || 'Dr. T. Senthilvel (Principal / Admin)');
        setUsername(user.username || user.email.split('@')[0]);
        setEmail(user.email || '');
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Handle Profile Update (Name, Username, Email)
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!fullName.trim()) {
      setProfileErrorMsg('Please enter your full name or administrator title.');
      return;
    }

    if (!username.trim()) {
      setProfileErrorMsg('Please enter a valid username (min 3 characters).');
      return;
    }

    if (username.trim().length < 3) {
      setProfileErrorMsg('Username must be at least 3 characters long.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setProfileErrorMsg('Please provide a valid institutional email address.');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await api.patch('/admin/profile', {
        full_name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase()
      });

      setProfileSuccessMsg(res.data.message || 'Administrator profile updated successfully!');
      
      // Update local storage and context
      if (res.data.user) {
        setProfileData((prev) => prev ? {
          ...prev,
          full_name: res.data.user.full_name,
          username: res.data.user.username,
          email: res.data.user.email
        } : null);
      }

      await refreshMe();

      // Clear success banner after 5 seconds
      setTimeout(() => {
        setProfileSuccessMsg('');
      }, 5000);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setProfileErrorMsg(err.response?.data?.detail || 'Failed to update administrator profile. Please check your inputs.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (!newPassword) {
      setPasswordErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirm password do not match.');
      return;
    }

    try {
      setPasswordSaving(true);
      const res = await api.post('/admin/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      setPasswordSuccessMsg(res.data.message || 'Password changed successfully! Next time log in with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setPasswordSuccessMsg('');
      }, 6000);
    } catch (err: any) {
      console.error('Password change error:', err);
      setPasswordErrorMsg(err.response?.data?.detail || 'Failed to update password. Please verify your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Loading Administrator Profile...</p>
      </div>
    );
  }

  const initialLetter = (fullName || user?.full_name || 'A').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-sm relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/25 border border-white/10 shrink-0">
              {initialLetter}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {fullName || 'Administrator Profile'}
                </h1>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Super Administrator
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 flex items-center gap-2">
                <span>@{username || 'admin'}</span>
                <span>•</span>
                <span>{email || 'admin@college.edu'}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Principal & Head of Institution • Office of Central Administration
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-2 shrink-0">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              Certificate Signatory Authority
            </span>
            <span className="text-[10px] text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md">
              Full Institutional Rights
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Details + Password Change */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Edit Profile Details (Name, Username, Email) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Administrator Profile & Username</h2>
                  <p className="text-xs text-slate-500">Edit your display name, username handle, and email address</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                Admin Details
              </span>
            </div>

            <form onSubmit={handleProfileSave} className="p-6 space-y-5">
              {/* Success Notification */}
              {profileSuccessMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{profileSuccessMsg}</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Your header title and admin portal credentials have been updated.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Notification */}
              {profileErrorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-medium">{profileErrorMsg}</p>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Administrator / Principal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="admin-profile-fullname"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. T. Senthilvel, M.E., Ph.D."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium text-slate-900 bg-white"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-500">
                  This name appears on the top navigation bar, clearance approvals, and issued certificates.
                </p>
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Login Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex rounded-lg border border-slate-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 bg-white overflow-hidden">
                  <span className="inline-flex items-center px-3 text-xs text-slate-500 bg-slate-50 border-r border-slate-200 font-semibold select-none">
                    @
                  </span>
                  <input
                    id="admin-profile-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="e.g. principal or admin"
                    className="flex-1 px-3 py-2 text-xs outline-hidden font-medium text-slate-900"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  You can use this username directly in the login portal instead of typing your full email address.
                </p>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Institutional Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="admin-profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    placeholder="e.g. principal@college.edu or admin@college.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium text-slate-900 bg-white"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Primary contact and administrative email for password recovery and college notifications.
                </p>
              </div>

              {/* Readonly Institutional Meta */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Office / Department</span>
                  <span className="font-semibold text-slate-800">Office of the Principal</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Role Clearance</span>
                  <span className="font-semibold text-indigo-700">Super Administrator (Principal)</span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  id="btn-save-admin-profile"
                  type="submit"
                  disabled={profileSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {profileSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Profile & Username
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Quick Login Reference Card */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-5 text-amber-900">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-950">Quick Login Information</p>
                <p className="text-amber-800 leading-relaxed">
                  You can now log into the <span className="font-semibold text-slate-900">Admin Portal</span> using either:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900 pt-1 font-medium">
                  <li>Username: <span className="font-mono font-bold bg-amber-100/80 px-1.5 py-0.5 rounded text-amber-950">@{username || 'admin'}</span></li>
                  <li>Email: <span className="font-mono font-bold bg-amber-100/80 px-1.5 py-0.5 rounded text-amber-950">{email || 'admin@college.edu'}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Change Password */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Change Password</h2>
                  <p className="text-xs text-slate-500">Update your administrator portal password</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md">
                Security
              </span>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-4.5">
              {/* Password Success Message */}
              {passwordSuccessMsg && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="font-semibold">{passwordSuccessMsg}</p>
                </div>
              )}

              {/* Password Error Message */}
              {passwordErrorMsg && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="font-medium">{passwordErrorMsg}</p>
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Current Password</label>
                <div className="relative">
                  <input
                    id="admin-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password (if known)"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium text-slate-900"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Optional verification: default was <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono text-[10px]">RamyaSasurie@123</code>
                </p>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="admin-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter secure new password"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium text-slate-900"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">Must be at least 6 characters long.</p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="admin-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-hidden font-medium text-slate-900"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Security Checklist */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword.length >= 6 ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>At least 6 characters</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${newPassword && newPassword === confirmPassword ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Passwords match</span>
                </div>
              </div>

              {/* Submit Password */}
              <div className="pt-2">
                <button
                  id="btn-update-admin-password"
                  type="submit"
                  disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {passwordSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security Notice */}
          <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Shield className="w-4 h-4 text-slate-700" />
              Administrative Security Policy
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Password changes are logged with timestamp and network IP in the audit trail. Once changed, all future logins will require the updated password.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
