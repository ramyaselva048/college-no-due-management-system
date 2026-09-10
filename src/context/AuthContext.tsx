import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, StudentProfile, StaffProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  studentProfile: StudentProfile | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  login: (email: string, password: string, role?: UserRole | string) => Promise<User>;
  signup: (payload: any) => Promise<any>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  isStudent: boolean;
  isStaff: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    // Clear any residual tokens from localStorage to prevent automatic background logins across sessions
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch {}

    // Only read token from the active browser tab sessionStorage
    const token = sessionStorage.getItem('token');

    if (!token) {
      setUser(null);
      setStudentProfile(null);
      setStaffProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      const data = res.data;
      const userObj: User = data.user || data;

      setUser(userObj);
      setStudentProfile(data.student_profile || (userObj.role === 'STUDENT' ? (data as any) : null));
      setStaffProfile(data.staff_profile || (userObj.role === 'STAFF' ? (data as any) : null));

      sessionStorage.setItem('user', JSON.stringify(userObj));
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.warn('Unable to load current user session:', err?.message || err);
      }
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      setUser(null);
      setStudentProfile(null);
      setStaffProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email: string, password: string, role?: UserRole | string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password, role });
    const { access_token, refresh_token, user: loggedUser } = res.data;

    // Securely persist ONLY in sessionStorage for the active session (closing the browser/tab requires fresh login)
    sessionStorage.setItem('token', access_token);
    if (refresh_token) {
      sessionStorage.setItem('refreshToken', refresh_token);
    }
    sessionStorage.setItem('user', JSON.stringify(loggedUser));

    // Clear localStorage to prevent any persistent direct auto-login
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch {}

    setUser(loggedUser);
    await fetchCurrentUser();
    return loggedUser;
  };

  const signup = async (payload: any) => {
    const res = await api.post('/auth/signup', payload);
    const { access_token, refresh_token, user: newUser } = res.data;

    sessionStorage.setItem('token', access_token);
    if (refresh_token) {
      sessionStorage.setItem('refreshToken', refresh_token);
    }
    sessionStorage.setItem('user', JSON.stringify(newUser));

    setUser(newUser);
    await fetchCurrentUser();
    return res.data;
  };

  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch (e) {
      console.warn('Logout API cleanup error', e);
    } finally {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } catch {}
      setUser(null);
      setStudentProfile(null);
      setStaffProfile(null);
    }
  };

  const refreshMe = async () => {
    await fetchCurrentUser();
  };

  const isStudent = user?.role === 'STUDENT';
  const isStaff = user?.role === 'STAFF';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        studentProfile,
        staffProfile,
        loading,
        login,
        signup,
        logout,
        refreshMe,
        isStudent,
        isStaff,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
