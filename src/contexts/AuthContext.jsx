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

  const buildDemoUser = (overrides = {}) => ({
    id: "demo-user",
    email: overrides.email || "demo@ripplealert.dev",
    user_metadata: {
      full_name: overrides.full_name || "Demo User",
      user_name: overrides.user_name || "demo",
      avatar_url:
        overrides.avatar_url ||
        "https://avatars.githubusercontent.com/u/9919?v=4",
      provider: overrides.provider || "demo",
    },
  });

  const signInWithGitHub = async () => {
    if (!supabaseEnabled) {
      const demo = buildDemoUser({ provider: "github-demo" });
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

  const signInWithEmail = async (email, password) => {
    if (!supabaseEnabled) {
      if (!email || !password) return { error: { message: "Enter email and password." } };
      const demo = buildDemoUser({
        email,
        full_name: email.split("@")[0],
        user_name: email.split("@")[0],
        provider: "email-demo",
      });
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
      setUser(demo);
      return { error: null, demo: true };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email, password) => {
    if (!supabaseEnabled) {
      return signInWithEmail(email, password);
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    return { error };
  };

  const continueAsDemo = () => {
    const demo = buildDemoUser();
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demo));
    setUser(demo);
    return { error: null, demo: true };
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
    <AuthCtx.Provider value={{ user, loading, signInWithGitHub, signInWithEmail, signUpWithEmail, continueAsDemo, signOut, supabaseEnabled }}>
      {children}
    </AuthCtx.Provider>
  );
}
