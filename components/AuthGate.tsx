import { useAuth } from "@/providers/AuthProvider";
import { useRouter, useSegments } from "expo-router";
import { ReactNode, useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, isConfigured } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  const isAuthRoute = useMemo(() => {
    if (!segments || segments.length === 0) return false;
    const root = segments[0];
    return root === "login" || root === "(auth)";
  }, [segments]);

  useEffect(() => {
    if (!isConfigured) return;
    if (status === "signedIn" && isAuthRoute) {
      router.replace("/(tabs)/entries");
    }
  }, [isAuthRoute, isConfigured, router, status]);

  if (!isConfigured) {
    return <>{children}</>;
  }

  if (status === "checking") {
    return (
      <View style={styles.overlay} pointerEvents="auto">
        <View style={styles.card}>
          <ActivityIndicator size="large" />
          <Text style={styles.label}>Checking session…</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  card: {
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
});
