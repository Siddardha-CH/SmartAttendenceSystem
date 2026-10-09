import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  UserPreferences,
  authenticateUser,
  getCurrentUser,
  getAuthToken,
  setAuthToken,
  setUnauthorizedHandler,
  getUserPreferences,
  saveUserPreferences,
} from '@/lib/database';

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

function applyTheme(theme: 'light' | 'dark' | 'system') {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setPreferences(null);
    document.documentElement.classList.remove('dark');
  }, []);

  const loadPreferences = useCallback(async (userId: string) => {
    try {
      const prefs = await getUserPreferences(userId);
      if (prefs) {
        setPreferences(prefs);
        applyTheme(prefs.theme);
      }
    } catch {
      // Preferences are cosmetic - never block the app on them.
    }
  }, []);

  // On page load: if we have a saved token, ask the server who it belongs to.
  // The server is the source of truth, so a tampered or expired token simply logs the user out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    (async () => {
      if (getAuthToken()) {
        try {
          const me = await getCurrentUser();
          setUser(me);
          await loadPreferences(me.id);
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout, loadPreferences]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const result = await authenticateUser(email, password);
    if (!result) return false;
    setAuthToken(result.token);
    setUser(result.user);
    await loadPreferences(result.user.id);
    return true;
  };

  const updatePreferences = async (prefs: Partial<UserPreferences>) => {
    if (!user) return;
    const updated = await saveUserPreferences(user.id, prefs);
    setPreferences(updated);
    if (prefs.theme) applyTheme(prefs.theme);
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
        canViewReports: true, // all roles can view reports
        preferences,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
