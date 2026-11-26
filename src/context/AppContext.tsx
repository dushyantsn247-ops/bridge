import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from '../services/api';
import type { BrandProfile, CreatorProfile, User, UserRole } from '../types/domain';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
}

interface AppContextValue {
  user: User | null;
  creatorProfile: CreatorProfile | null;
  brandProfile: BrandProfile | null;
  unreadNotifications: number;
  authLoading: boolean;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<User>;
  signup: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }) => Promise<User>;
  demoLogin: (role: UserRole) => Promise<User>;
  googleLogin: (role?: UserRole) => Promise<User>;
  logout: () => void;
  showToast: (title: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(null);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, type }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    []
  );

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setCreatorProfile(null);
      setBrandProfile(null);
      setUnreadNotifications(0);
      setAuthLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
      setCreatorProfile(data.creatorProfile);
      setBrandProfile(data.brandProfile);
      setUnreadNotifications(data.unreadNotifications);
    } catch {
      setStoredToken(null);
      setUser(null);
      setCreatorProfile(null);
      setBrandProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setStoredToken(res.token);
    await refreshSession();
    showToast(`Welcome back, ${res.user.fullName}`, 'success');
    return res.user;
  };

  const signup = async (payload: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
  }) => {
    const res = await api.signup(payload);
    setStoredToken(res.token);
    await refreshSession();
    showToast('Account created — let’s build your profile', 'success');
    return res.user;
  };

  const demoLogin = async (role: UserRole) => {
    const res = await api.demoLogin(role);
    setStoredToken(res.token);
    await refreshSession();
    showToast(`Signed into ${role.toUpperCase()} Demo Environment`, 'success');
    return res.user;
  };

  const googleLogin = async (role?: UserRole) => {
    const res = await api.googleAdapterLogin({
      role: role || 'creator',
      email:
        role === 'brand'
          ? 'brand.google@bridge-local.in'
          : 'creator.google@bridge-local.in',
      fullName: role === 'brand' ? 'Kavita Nair' : 'Arjun Deshpande',
    });
    setStoredToken(res.token);
    await refreshSession();
    showToast('Authenticated via Local Google Auth Adapter', 'success');
    return res.user;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setCreatorProfile(null);
    setBrandProfile(null);
    setUnreadNotifications(0);
    showToast('Signed out cleanly', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        creatorProfile,
        brandProfile,
        unreadNotifications,
        authLoading,
        refreshSession,
        login,
        signup,
        demoLogin,
        googleLogin,
        logout,
        showToast,
      }}
    >
      {children}
      {/* Toast Notification Stack */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg bg-[#171B2C] border border-white/12 px-4 py-3 text-sm text-[#F5F5FA] shadow-xl transition-transform duration-150"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              )}
              {t.type === 'error' && (
                <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" />
              )}
              {t.type === 'info' && (
                <Info className="w-4 h-4 text-[#00D5FF] shrink-0" />
              )}
              <span className="truncate">{t.title}</span>
            </div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-[#9295A9] hover:text-[#F5F5FA] p-1 shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
