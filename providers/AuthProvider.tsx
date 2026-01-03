import { supabase } from "@/lib/supabase";
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  Session,
  User,
  type PostgrestSingleResponse,
} from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

type AccountPlan = "free" | "invested";

const logAuth = (...args: any[]) => console.log("[auth]", ...args);
const tokenPreview = (token?: string | null) => {
  if (!token) return "null";
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
};

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
  refreshProfileIfStale: (staleMs?: number) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithApple: () => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextShape | null>(null);

const EMPTY_PROFILE: AccountProfile = {
  plan: "free",
  aiCallsUsed: 0,
  aiCycleStart: null,
  extraAiCredits: 0,
};

const isSupabaseConfigured = Boolean(supabase);

function normalizeProfile(res: PostgrestSingleResponse<any>): AccountProfile | null {
  if (!res?.data) return null;
  const { plan, ai_calls_used, ai_cycle_start, extra_ai_credits } = res.data;
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

  const refreshProfilePromiseRef = useRef<Promise<void> | null>(null);
  const lastProfileFetchRef = useRef<number | null>(null);

  const handleSession = useCallback((nextSession: Session | null) => {
    logAuth("handleSession", {
      userId: nextSession?.user?.id ?? "none",
      hasSession: Boolean(nextSession),
    });
    setSession(nextSession);
    setStatus(nextSession ? "signedIn" : "signedOut");
    if (!nextSession?.user?.id) {
      setProfile(null);
      lastProfileFetchRef.current = null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setProfile(null);
      lastProfileFetchRef.current = null;
      return;
    }

    if (refreshProfilePromiseRef.current) {
      return refreshProfilePromiseRef.current;
    }

    const run = (async () => {
      logAuth("refreshProfile:start", { userId: session.user.id });
      setLoadingProfile(true);
      setAuthError(null);

      try {
        const res = await supabase
          .from("profiles")
          .select("plan, ai_calls_used, ai_cycle_start, extra_ai_credits")
          .eq("id", session.user.id)
          .single();

        if (res.error) {
          // keep the app usable even if the profile table is missing or empty
          logAuth("refreshProfile:error", res.error.message);
          setAuthError(res.error.message);
          setProfile(EMPTY_PROFILE);
          return;
        }

        logAuth("refreshProfile:success");
        setProfile(normalizeProfile(res) ?? EMPTY_PROFILE);
      } catch (err: any) {
        logAuth("refreshProfile:exception", err?.message ?? err);
        setAuthError(err?.message ?? String(err));
        setProfile(EMPTY_PROFILE);
      } finally {
        lastProfileFetchRef.current = Date.now();
        setLoadingProfile(false);
        refreshProfilePromiseRef.current = null;
      }
    })();

    refreshProfilePromiseRef.current = run;
    return run;
  }, [session?.user?.id]);

  const refreshProfileIfStale = useCallback(
    async (staleMs: number = 60_000) => {
      const last = lastProfileFetchRef.current;
      if (!last) return refreshProfile();

      const now = Date.now();
      if (now - last < staleMs) return;

      return refreshProfile();
    },
    [refreshProfile]
  );

  const bootstrapSession = useCallback(async () => {
    if (!supabase) {
      logAuth("bootstrapSession:noSupabase");
      setStatus("signedOut");
      setSession(null);
      return;
    }

    logAuth("bootstrapSession:start");
    setStatus("checking");
    setAuthError(null);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logAuth("bootstrapSession:error", error.message);
      setAuthError(error.message);
      setStatus("signedOut");
      setSession(null);
      return;
    }

    logAuth("bootstrapSession:session", {
      userId: data.session?.user?.id ?? "none",
      hasSession: Boolean(data.session),
    });
    handleSession(data.session ?? null);
  }, [handleSession]);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    bootstrapSession();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      logAuth("onAuthStateChange", {
        event,
        userId: nextSession?.user?.id ?? "none",
      });
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

  // Configure once so all Google calls (sign in/out) share the same config.
  useEffect(() => {
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    if (!webClientId) {
      logAuth("google:configure:missingWebClientId");
      return;
    }

    logAuth("google:configure", {
      hasWebClientId: Boolean(webClientId),
      hasIosClientId: Boolean(iosClientId),
      platform: Platform.OS,
    });

    GoogleSignin.configure({
      webClientId,
      iosClientId: iosClientId || undefined,
      scopes: ["profile", "email", "openid"],
      offlineAccess: true,
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");

      logAuth("signIn:start", { email });
      setAuthError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logAuth("signIn:error", error.message);
        setAuthError(error.message);
        throw error;
      }

      logAuth("signIn:success", { userId: data.session?.user?.id ?? "none" });
      handleSession(data.session ?? null);
    },
    [handleSession]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");

      logAuth("signUp:start", { email });
      setAuthError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        logAuth("signUp:error", error.message);
        setAuthError(error.message);
        throw error;
      }

      logAuth("signUp:success", { userId: data.session?.user?.id ?? "none" });
      handleSession(data.session ?? null);
    },
    [handleSession]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;

    logAuth("signOut:start");
    try {
      await GoogleSignin.signOut();
      logAuth("signOut:google");
    } catch (err) {
      console.warn("Failed to sign out of Google", err);
    }

    await supabase.auth.signOut();
    logAuth("signOut:supabase");

    handleSession(null);
    setProfile(null);
  }, [handleSession]);

  const signInWithApple = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");

    setAuthError(null);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        logAuth("apple:missingIdentityToken");
        throw new Error("Apple Sign-In did not return an identity token");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });

      if (error) {
        logAuth("apple:supabaseError", error.message);
        setAuthError(error.message);
        throw error;
      }

      logAuth("apple:success", { userId: data.session?.user?.id ?? "none" });
      handleSession(data.session ?? null);

      const { givenName, familyName } = credential.fullName ?? {};
      const fullName = [givenName, familyName].filter(Boolean).join(" ").trim();

      if (fullName) {
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName,
              ...(givenName ? { first_name: givenName } : {}),
              ...(familyName ? { last_name: familyName } : {}),
            },
          });
        } catch (updateErr) {
          console.warn("Failed to persist Apple full name to Supabase", updateErr);
        }
      }

      return true;
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED" || err?.code === "ERR_REQUEST_CANCELED") {
        return false;
      }
      logAuth("apple:error", err?.message ?? err);
      setAuthError(err?.message ?? "Apple sign-in failed");
      throw err;
    }
  }, [handleSession]);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured");

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    if (!webClientId) {
      logAuth("google:missingWebClientId");
      throw new Error("Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID");
    }

    logAuth("google:start", {
      platform: Platform.OS,
      hasIosClientId: Boolean(iosClientId),
    });

    setAuthError(null);

    try {
      if (Platform.OS === "android") {
        const playServices = await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
        logAuth("google:playServices", { available: playServices });
      }

      const response = await GoogleSignin.signIn();

      // IMPORTANT: signIn() returns a union. Tokens live at response.data for success.
      if (isCancelledResponse(response)) {
        logAuth("google:cancelled");
        return false;
      }

      if (!isSuccessResponse(response)) {
        logAuth("google:nonSuccessResponse", response);
        return false;
      }

      const { idToken, scopes, serverAuthCode } = response.data;

      logAuth("google:signInResponse", {
        hasIdToken: Boolean(idToken),
        scopes,
        serverAuthCode: tokenPreview(serverAuthCode),
      });

      if (!idToken) {
        // Optional fallback if you ever run into a case where idToken is missing:
        // const tokens = await GoogleSignin.getTokens();
        // if (tokens?.idToken) { idToken = tokens.idToken; }
        logAuth("google:noIdToken");
        throw new Error("Google sign-in did not return an ID token");
      }

      logAuth("google:gotIdToken", tokenPreview(idToken));

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        logAuth("google:supabaseError", error.message);
        setAuthError(error.message);
        throw error;
      }

      logAuth("google:success", { userId: data.session?.user?.id ?? "none" });
      handleSession(data.session ?? null);
      return true;
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        logAuth("google:cancelled");
        return false;
      }
      if (isErrorWithCode(err) && err.code === statusCodes.IN_PROGRESS) {
        // You can ignore or surface this, depending on UX
        logAuth("google:in_progress");
      }

      logAuth("google:error", err?.message ?? err);
      setAuthError(err?.message ?? "Google sign-in failed");
      throw err;
    }
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
      refreshProfileIfStale,
      signIn,
      signUp,
      signOut,
      signInWithApple,
      signInWithGoogle,
    }),
    [
      status,
      session,
      authError,
      profile,
      loadingProfile,
      refreshProfile,
      refreshProfileIfStale,
      signIn,
      signUp,
      signOut,
      signInWithApple,
      signInWithGoogle,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
