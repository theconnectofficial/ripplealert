import { createContext, useContext, useEffect, useState } from "react";
import { supabase, supabaseEnabled } from "../lib/supabase";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const DEMO_USER_KEY = "ra:demoUser";

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoad]  = useState(true);

  useEffect(() => {
    // 1. Hydrate demo user (used when Supabase isn't configured)
    if (!supabaseEnabled) {
      try {
        const demo = localStorage.getItem(DEMO_USER_KEY);
        if (demo) setUser(JSON.parse(demo));
      } catch {}
      setLoad(false);
      return;
    }

    // 2. Real Supabase session
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setUser(data.session?.user || null); setLoad(false); }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => { mounted = false; sub?.subscription?.unsubscribe(); };
  }, []);

  const signInWithGitHub = async () => {
    if (!supabaseEnabled) {
      // Demo fallback so the OAuth flow can be previewed without Supabase
      const demo = {
        id: "demo-user",
        email: "demo@ripplealert.dev",
        user_metadata: {
          full_name: "Demo User",
          user_name: "demo",
          avatar_url: "https://avatars.githubusercontent.com/u/9919?v=4",
          provider: "demo",
        },
      };
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
      setUser(demo);
      return { error: null, demo: true };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/app`,
        scopes: "read:user user:email",
      },
    });
    return { error };
  };

  const signOut = async () => {
    if (!supabaseEnabled) {
      localStorage.removeItem(DEMO_USER_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signInWithGitHub, signOut, supabaseEnabled }}>
      {children}
    </AuthCtx.Provider>
  );
}
