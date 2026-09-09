import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, StudentProfile, StaffProfile } from '../types';

interface AuthContextType {
  user: User | null;
  studentProfile: StudentProfile | null;
  staffProfile: StaffProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
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
    // Check sessionStorage first (session-bound for admin), then localStorage
    let token = sessionStorage.getItem('token');
    let isSessionToken = Boolean(token);
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (!token) {
      setUser(null);
      setStudentProfile(null);
      setStaffProfile(null);
      setLoading(false);
      return;
    }

    // Security rule: Admin must authenticate fresh every time the browser/tab is closed and reopened.
    // If token only exists in localStorage, check if the previously saved user was an ADMIN.
    if (!isSessionToken) {
      const localUserStr = localStorage.getItem('user');
      if (localUserStr) {
        try {
          const parsed = JSON.parse(localUserStr);
          if (parsed?.role === 'ADMIN') {
            // Do not auto-login admin across closed browser sessions
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
            setStudentProfile(null);
            setStaffProfile(null);
            setLoading(false);
            return;
          }
        } catch {}
      }
    }

    try {
      const res = await api.get('/auth/me');
      const data = res.data;
      const userObj: User = data.user || data;

      // If user is ADMIN, they must only persist within an active sessionStorage.
      // If they arrived from a persistent localStorage across a closed browser session, reject auto-login!
      if (userObj.role === 'ADMIN' && !isSessionToken) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        setUser(null);
        setStudentProfile(null);
        setStaffProfile(null);
        setLoading(false);
        return;
      }

      setUser(userObj);
      setStudentProfile(data.student_profile || (userObj.role === 'STUDENT' ? (data as any) : null));
      setStaffProfile(data.staff_profile || (userObj.role === 'STAFF' ? (data as any) : null));

      if (userObj.role === 'ADMIN') {
        sessionStorage.setItem('user', JSON.stringify(userObj));
        // Remove any admin traces in localStorage so closing the window/tab resets session
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } else {
        localStorage.setItem('user', JSON.stringify(userObj));
      }
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        console.warn('Unable to load current user session:', err?.message || err);
      }
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
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

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token, user: loggedUser } = res.data;

    if (loggedUser.role === 'ADMIN') {
      // Admin session is stored strictly in sessionStorage so closing the tab/window requires fresh login
      sessionStorage.setItem('token', access_token);
      sessionStorage.setItem('refreshToken', refresh_token);
      sessionStorage.setItem('user', JSON.stringify(loggedUser));
      // Clear any persistent storage
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } else {
      localStorage.setItem('token', access_token);
      localStorage.setItem('refreshToken', refresh_token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    }

    setUser(loggedUser);
    await fetchCurrentUser();
    return loggedUser;
  };

  const signup = async (payload: any) => {
    const res = await api.post('/auth/signup', payload);
    const { access_token, refresh_token, user: newUser } = res.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('refreshToken', refresh_token);
    localStorage.setItem('user', JSON.stringify(newUser));

    setUser(newUser);
    await fetchCurrentUser();
    return res.data;
  };

  const logout = async () => {
    const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
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
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
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
