import AsyncStorage from "@react-native-async-storage/async-storage";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const isConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

export const supabaseConfig = {
  url: supabaseUrl ?? null,
  anonKey: supabaseKey ?? null,
  functionsUrl: supabaseUrl ? `${supabaseUrl}/functions/v1` : null,
};

export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error("Supabase env vars are missing");
  }
  return supabase;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.warn("Failed to read Supabase session", error);
    return null;
  }

  return data.session?.access_token ?? null;
}
