import { useAuth } from "@/providers/AuthProvider";
import { useRouter, useSegments } from "expo-router";
import { useColorScheme } from "nativewind";
import { ReactNode, useEffect, useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, isConfigured } = useAuth();
  const router = useRouter();
  const segments = useSegments() as string[];
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isAuthRoute = useMemo(() => {
    if (!segments || segments.length === 0) return false;
    const root = segments[0];
    return root === "login" || root === "(modal)";
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
      <View className="flex-1 items-center justify-center bg-slate-50 dark:bg-slate-900 pointer-events-auto">
        <View className="items-center gap-2.5">
          <ActivityIndicator size="large" color={isDark ? '#ffffff' : '#000000'} />
          <Text className="text-base font-medium text-slate-900 dark:text-slate-100">Checking session…</Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}
