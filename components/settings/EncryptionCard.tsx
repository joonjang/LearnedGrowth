import { useAuth } from "@/providers/AuthProvider";
import { useEncryption } from "@/providers/EncryptionProvider";
import { getShadow } from "@/lib/shadow";
import { useMemo, useState } from "react";
import { useColorScheme } from "nativewind";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  isOffline: boolean;
  loaderColor: string;
};

export function EncryptionCard({ isOffline, loaderColor }: Props) {
  const { user } = useAuth();
  const {
    isEncrypted,
    isUnlocked,
    enableEncryption,
    unlockVault,
    disableEncryption,
  } = useEncryption();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const shadow = useMemo(() => getShadow({ isDark, preset: "sm" }), [isDark]);
  const shadowClass = shadow.className;

  if (!user) return null;

  const statusLabel = isEncrypted
    ? isUnlocked
      ? "Encryption enabled"
      : "Encryption enabled (needs password to finish setup)"
    : "Encryption off";

  const primaryLabel = !isEncrypted
    ? "Enable Encryption"
    : isUnlocked
    ? "Disable Encryption"
    : "Restore Access";

  const primaryAction = async () => {
    if (!password) {
      setError("Enter your password first.");
      return;
    }
    setLoading(true);
    setError(null);
    setNote(null);
    try {
      if (!isEncrypted) {
        await enableEncryption(password);
        setNote("Vault encrypted and unlocked.");
      } else if (isUnlocked) {
        await disableEncryption(password);
        setNote("Vault decrypted and turned off.");
      } else {
        await unlockVault(password);
        setNote("Vault unlocked on this device.");
      }
      setPassword("");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      className={`bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 gap-3 ${shadowClass}`}
      style={[shadow.ios, shadow.android]}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Encryption
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {statusLabel}
          </Text>
        </View>
        {loading && <ActivityIndicator size="small" color={loaderColor} />}
      </View>

      <View className="gap-2">
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={
            !isEncrypted
              ? "Set a password to enable encryption"
              : "Enter password to unlock/disable"
          }
          secureTextEntry
          placeholderTextColor="#94a3b8"
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100"
        />

        <Pressable
          className={`rounded-xl items-center justify-center border border-slate-200 dark:border-slate-700 ${shadowClass} active:bg-slate-100 dark:active:bg-slate-800 ${isOffline || loading ? "opacity-60" : ""} bg-slate-900 dark:bg-slate-100`}
          style={[shadow.ios, shadow.android]}
          onPress={primaryAction}
          disabled={isOffline || loading}
        >
          <Text className="text-white dark:text-slate-900 font-bold text-[15px] py-3">
            {primaryLabel}
          </Text>
        </Pressable>
      </View>

      {error && (
        <Text className="text-xs text-belief-text">
          {error}
        </Text>
      )}
      {note && (
        <Text className="text-xs text-slate-600 dark:text-slate-300">
          {note}
        </Text>
      )}
      {isOffline && (
        <Text className="text-xs text-slate-600 dark:text-slate-400">
          Go online to enable or sync encrypted data.
        </Text>
      )}
    </View>
  );
}

export default EncryptionCard;
