import { createContext, useContext, useState, useEffect, useCallback, ReactNode, Dispatch, SetStateAction } from 'react';
import { api, getToken, setToken } from '../api/client';

export type Role = 'user' | 'reviewer' | 'admin';
export interface AuthUser { id: number; name: string; email: string; role: Role; is_active: boolean; created_at: string }

interface AppCtx {
  user: AuthUser | null;
  role: Role;
  isAuthenticated: boolean;
  authLoading: boolean;
  userName: string;
  userEmail: string;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  setUser: (u: AuthUser) => void;
  /** kept for older components: setAuthenticated(false) logs out */
  setAuthenticated: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>>;
}

const noop = async () => { throw new Error('AppProvider missing'); };
const AppContext = createContext<AppCtx>({
  user: null, role: 'user', isAuthenticated: false, authLoading: true, userName: '', userEmail: '',
  login: noop as any, register: noop as any, logout: () => {}, setUser: () => {}, setAuthenticated: () => {},
  sidebarOpen: true, setSidebarOpen: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(!!getToken());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  useEffect(() => {
    if (getToken()) api.get<AuthUser>('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setAuthLoading(false));
    const onUnauth = () => logout();
    window.addEventListener('privedge:unauthorized', onUnauth);
    return () => window.removeEventListener('privedge:unauthorized', onUnauth);
  }, [logout]);

  async function login(email: string, password: string) {
    const r = await api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(r.access_token); setUser(r.user); return r.user;
  }
  async function register(name: string, email: string, password: string) {
    const r = await api.post<{ access_token: string; user: AuthUser }>('/auth/register', { name, email, password });
    setToken(r.access_token); setUser(r.user); return r.user;
  }

  return (
    <AppContext.Provider value={{
      user, role: user?.role ?? 'user', isAuthenticated: !!user, authLoading,
      userName: user?.name ?? '', userEmail: user?.email ?? '',
      login, register, logout, setUser, setAuthenticated: v => { if (!v) logout(); },
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
