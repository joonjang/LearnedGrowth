import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Mode = "signIn" | "signUp";

export default function LoginScreen() {
  const { status, signIn, signUp, authError, isConfigured } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status === "signedIn") {
      router.replace("/(tabs)/entries");
    }
  }, [router, status]);

  const handleSubmit = async () => {
    if (!email || !password) {
      setMessage("Enter email and password");
      return;
    }
    setMessage(null);
    setSubmitting(true);
    try {
      if (mode === "signUp") {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      setMessage(err?.message ?? "Auth error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>LearnedGrowth</Text>
          <Text style={styles.subtitle}>
            Sign in to sync entries. Free plan includes 5 AI analyses per month.
          </Text>

          {!isConfigured && (
            <Text style={styles.warning}>
              Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable auth.
            </Text>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!submitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
              secureTextEntry
              autoCapitalize="none"
              editable={!submitting}
            />
          </View>

          {(message || authError) && (
            <Text style={styles.error}>{message ?? authError}</Text>
          )}

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonLabel}>
                {mode === "signUp" ? "Create account" : "Sign in"}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/(tabs)/entries")}
            disabled={submitting}
          >
            <Text style={styles.secondaryLabel}>Skip for now</Text>
            <Text style={styles.secondaryHint}>Continue offline; data stays on this device</Text>
          </Pressable>

          <Pressable
            style={styles.switcher}
            onPress={() => setMode((m) => (m === "signUp" ? "signIn" : "signUp"))}
            disabled={submitting}
          >
            <Text style={styles.switcherText}>
              {mode === "signUp"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0f172a" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    gap: 14,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
  },
  warning: {
    fontSize: 12,
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    color: "#1f2937",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f8fafc",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#cbd5e1",
  },
  secondaryLabel: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryHint: {
    color: "#475569",
    fontSize: 12,
    marginTop: 2,
  },
  switcher: {
    alignItems: "center",
    paddingVertical: 4,
  },
  switcherText: {
    color: "#0f172a",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  error: {
    color: "#b91c1c",
    fontSize: 13,
  },
});
