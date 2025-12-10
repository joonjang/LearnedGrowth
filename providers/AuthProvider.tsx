import { supabase } from "@/lib/supabase";
import {
  Session,
  User,
  type PostgrestSingleResponse,
} from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

type AccountPlan = "free" | "invested";

export type AccountProfile = {
  plan: AccountPlan;
  aiCallsUsed: number;
  aiCycleStart: string | null;
  extraAiCredits: number;
};

type AuthStatus = "checking" | "signedOut" | "signedIn";

type AuthContextShape = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  authError: string | null;
  profile: AccountProfile | null;
  loadingProfile: boolean;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | null>(null);

const EMPTY_PROFILE: AccountProfile = {
  plan: "free",
  aiCallsUsed: 0,
  aiCycleStart: null,
  extraAiCredits: 0,
};

const isSupabaseConfigured = Boolean(supabase);

function normalizeProfile(
  res: PostgrestSingleResponse<any>
): AccountProfile | null {
  if (!res?.data) return null;
  const {
    plan,
    ai_calls_used,
    ai_cycle_start,
    extra_ai_credits,
  } = res.data;
  return {
    plan: plan === "invested" ? "invested" : "free",
    aiCallsUsed: Number.isFinite(ai_calls_used) ? ai_calls_used : 0,
    aiCycleStart:
      typeof ai_cycle_start === "string" ? ai_cycle_start : ai_cycle_start ?? null,
    extraAiCredits: Number.isFinite(extra_ai_credits) ? extra_ai_credits : 0,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? "checking" : "signedOut"
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const handleSession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setStatus(nextSession ? "signedIn" : "signedOut");
    if (!nextSession?.user?.id) {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setProfile(null);
      return;
    }
    setLoadingProfile(true);
    setAuthError(null);
    try {
      const res = await supabase
        .from("profiles")
        .select(
          "plan, ai_calls_used, ai_cycle_start, extra_ai_credits"
        )
        .eq("id", session.user.id)
        .single();

      if (res.error) {
        // keep the app usable even if the profile table is missing or empty
        setAuthError(res.error.message);
        setProfile(EMPTY_PROFILE);
        return;
      }

      setProfile(normalizeProfile(res) ?? EMPTY_PROFILE);
    } catch (err: any) {
      setAuthError(err?.message ?? String(err));
      setProfile(EMPTY_PROFILE);
    } finally {
      setLoadingProfile(false);
    }
  }, [session?.user?.id]);

  const bootstrapSession = useCallback(async () => {
    if (!supabase) {
      setStatus("signedOut");
      setSession(null);
      return;
    }
    setStatus("checking");
    setAuthError(null);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setAuthError(error.message);
      setStatus("signedOut");
      setSession(null);
      return;
    }

    handleSession(data.session ?? null);
  }, [handleSession]);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    bootstrapSession();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      handleSession(nextSession);
    });

    return () => {
      mounted = false;
      data?.subscription.unsubscribe();
    };
  }, [bootstrapSession, handleSession]);

  useEffect(() => {
    if (status !== "signedIn" || !session?.user?.id) return;
    refreshProfile();
  }, [refreshProfile, session?.user?.id, status]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      handleSession(data.session ?? null);
    },
    [handleSession]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setAuthError(error.message);
        throw error;
      }
      handleSession(data.session ?? null);
    },
    [handleSession]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    handleSession(null);
    setProfile(null);
  }, [handleSession]);

  const value = useMemo<AuthContextShape>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      isConfigured: isSupabaseConfigured,
      authError,
      profile,
      loadingProfile,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }),
    [
      authError,
      loadingProfile,
      profile,
      refreshProfile,
      session,
      signIn,
      signOut,
      signUp,
      status,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
