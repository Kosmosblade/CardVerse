import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase'; // adjust path if needed

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current session user on mount
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
    });

    // Subscribe to auth state changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // <-- Here is the fix: use session?.user (not session?.session?.user)
      setUser(session?.user || null);
    });

    // Cleanup subscription on unmount
    return () => listener?.subscription.unsubscribe();
  }, []);

  // Memoize value to optimize rerenders
  const value = useMemo(() => ({ user, setUser }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
