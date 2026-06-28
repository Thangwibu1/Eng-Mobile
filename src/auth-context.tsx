import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './api';

type AuthValue = { user: any; loading: boolean; refresh: () => Promise<void>; signOut: () => Promise<void>; setUser: (u: any) => void };
const AuthContext = createContext<AuthValue>({} as AuthValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => { try { setUser(await auth.me()); } catch { setUser(null); } finally { setLoading(false); } };
  const signOut = async () => { await auth.logout(); setUser(null); };
  useEffect(() => { refresh(); }, []);
  return <AuthContext.Provider value={{ user, loading, refresh, signOut, setUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
