import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, authenticateUser, getUserPreferences, saveUserPreferences, UserPreferences } from '@/lib/database';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isTeacher: boolean;
  isViewer: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canTakeAttendance: boolean;
  canViewReports: boolean;
  preferences: UserPreferences | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          
          // Load user preferences
          const prefs = await getUserPreferences(parsedUser.id);
          if (prefs) {
            setPreferences(prefs);
            applyTheme(prefs.theme);
          }
        } catch {
          localStorage.removeItem('currentUser');
        }
      }
      setIsLoading(false);
    };
    loadUser();
  }, []);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const authenticatedUser = await authenticateUser(email, password);
    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
      
      // Load preferences
      const prefs = await getUserPreferences(authenticatedUser.id);
      if (prefs) {
        setPreferences(prefs);
        applyTheme(prefs.theme);
      }
      
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setPreferences(null);
    localStorage.removeItem('currentUser');
    document.documentElement.classList.remove('dark');
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    if (!user) return;
    const updated = await saveUserPreferences(user.id, prefs);
    setPreferences(updated);
    if (prefs.theme) {
      applyTheme(prefs.theme);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isViewer = user?.role === 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAdmin,
        isTeacher,
        isViewer,
        canManageUsers: isAdmin,
        canManageSettings: isAdmin,
        canTakeAttendance: isAdmin || isTeacher,
        canViewReports: true, // All roles can view reports
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
