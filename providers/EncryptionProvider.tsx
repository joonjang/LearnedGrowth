import { decryptData, decryptMasterKey, encryptData, encryptMasterKey, generateMasterKey } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type EncryptionContextShape = {
  isEncrypted: boolean;
  isUnlocked: boolean;
  masterKey: string | null;
  refreshEncryptionStatus: () => Promise<void>;
  enableEncryption: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  disableEncryption: (password: string) => Promise<void>;
};

type EncryptionProfile = {
  is_encrypted: boolean | null;
  encrypted_master_key: string | null;
  key_salt: string | null;
};

type EntryRow = {
  id: string;
  adversity: string;
  belief: string;
  consequence: string | null;
  dispute: string | null;
  energy: string | null;
  ai_response: any;
  ai_retry_count?: number | null;
  created_at: string;
  updated_at: string;
  account_id: string;
  dirty_since: string | null;
  is_deleted: boolean;
};

const ENTRY_COLUMNS =
  "id, adversity, belief, consequence, dispute, energy, ai_response, ai_retry_count, created_at, updated_at, account_id, dirty_since, is_deleted";
const ENTRY_COLUMNS_FALLBACK =
  "id, adversity, belief, consequence, dispute, energy, ai_response, created_at, updated_at, account_id, dirty_since, is_deleted";

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

function getSecureStore(): SecureStoreLike {
  try {
    // Lazy require so environments without native bindings (web/Jest) don't crash.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require("expo-secure-store") as SecureStoreLike;
    return module;
  } catch (error) {
    console.warn(
      "expo-secure-store unavailable; using in-memory fallback (non-persistent)",
      error
    );
    return {
      async getItemAsync(key: string) {
        return memoryStore.get(key) ?? null;
      },
      async setItemAsync(key: string, value: string) {
        memoryStore.set(key, value);
      },
      async deleteItemAsync(key: string) {
        memoryStore.delete(key);
      },
    };
  }
}

const secureStore = getSecureStore();

const masterKeyStorageKey = (userId: string) => `encryption:master-key:${userId}`;

const EncryptionContext = createContext<EncryptionContextShape | null>(null);

async function readStoredMasterKey(userId: string): Promise<string | null> {
  try {
    return await secureStore.getItemAsync(masterKeyStorageKey(userId));
  } catch (error) {
    console.warn("Failed to read master key from SecureStore", error);
    return null;
  }
}

async function writeStoredMasterKey(userId: string, key: string): Promise<void> {
  try {
    await secureStore.setItemAsync(masterKeyStorageKey(userId), key);
  } catch (error) {
    console.warn("Failed to persist master key to SecureStore", error);
    throw new Error("Could not store master key securely");
  }
}

async function clearStoredMasterKey(userId: string): Promise<void> {
  try {
    await secureStore.deleteItemAsync(masterKeyStorageKey(userId));
  } catch (error) {
    console.warn("Failed to clear master key from SecureStore", error);
  }
}

async function fetchEncryptionProfile(userId: string): Promise<EncryptionProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("is_encrypted, encrypted_master_key, key_salt")
    .eq("id", userId)
    .single();

  if (error) {
    console.warn("Unable to read encryption profile", error);
    return null;
  }

  return data as EncryptionProfile;
}

async function fetchEntries(userId: string): Promise<EntryRow[]> {
  if (!supabase) throw new Error("Supabase is not configured");

  const initial = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS)
    .eq("account_id", userId);

  if (!initial.error) {
    return (initial.data ?? []) as EntryRow[];
  }

  const message = String(initial.error.message ?? "");
  if (!message.includes("ai_retry_count")) {
    throw new Error(initial.error.message ?? "Failed to fetch entries");
  }

  const fallback = await supabase
    .from("entries")
    .select(ENTRY_COLUMNS_FALLBACK)
    .eq("account_id", userId);

  if (fallback.error) {
    throw new Error(fallback.error.message ?? "Failed to fetch entries");
  }

  return (fallback.data ?? []) as EntryRow[];
}

async function upsertEntries(entries: EntryRow[]): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  if (entries.length === 0) return;

  const { error } = await supabase.from("entries").upsert(entries, { onConflict: "id" });
  if (!error) return;

  const message = String(error.message ?? "");
  if (!message.includes("ai_retry_count")) {
    throw new Error(error.message ?? "Failed to persist entries");
  }

  const legacy = entries.map(({ ai_retry_count: _omit, ...rest }) => rest);
  const retry = await supabase.from("entries").upsert(legacy as EntryRow[], { onConflict: "id" });
  if (retry.error) {
    throw new Error(retry.error.message ?? "Failed to persist entries");
  }
}

const encryptEntryFields = (entry: EntryRow, masterKey: string, updatedAt: string): EntryRow => ({
  ...entry,
  adversity: encryptData(entry.adversity ?? "", masterKey),
  belief: encryptData(entry.belief ?? "", masterKey),
  consequence: entry.consequence ? encryptData(entry.consequence, masterKey) : entry.consequence,
  dispute: entry.dispute ? encryptData(entry.dispute, masterKey) : entry.dispute,
  energy: entry.energy ? encryptData(entry.energy, masterKey) : entry.energy,
  updated_at: updatedAt,
  dirty_since: entry.dirty_since ?? updatedAt,
});

const decryptEntryFields = (entry: EntryRow, masterKey: string, updatedAt: string): EntryRow => ({
  ...entry,
  adversity: decryptData(entry.adversity ?? "", masterKey),
  belief: decryptData(entry.belief ?? "", masterKey),
  consequence: entry.consequence ? decryptData(entry.consequence, masterKey) : entry.consequence,
  dispute: entry.dispute ? decryptData(entry.dispute, masterKey) : entry.dispute,
  energy: entry.energy ? decryptData(entry.energy, masterKey) : entry.energy,
  updated_at: updatedAt,
  dirty_since: entry.dirty_since ?? updatedAt,
});

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const resetState = useCallback(() => {
    setIsEncrypted(false);
    setIsUnlocked(false);
    setMasterKey(null);
  }, []);

  const refreshEncryptionStatus = useCallback(async () => {
    if (!supabase || !user?.id) {
      resetState();
      return;
    }

    try {
      const profile = await fetchEncryptionProfile(user.id);
      const encrypted = profile?.is_encrypted === true;
      setIsEncrypted(encrypted);

      if (!encrypted) {
        await clearStoredMasterKey(user.id);
        setIsUnlocked(false);
        setMasterKey(null);
        return;
      }

      const storedKey = await readStoredMasterKey(user.id);
      if (storedKey) {
        setMasterKey(storedKey);
        setIsUnlocked(true);
      } else {
        // No cached key: needs recovery flow (user re-enters password).
        setMasterKey(null);
        setIsUnlocked(false);
      }
    } catch (error) {
      console.warn("Failed to refresh encryption status", error);
      resetState();
    }
  }, [resetState, user?.id]);

  useEffect(() => {
    if (user?.id) {
      refreshEncryptionStatus();
      lastUserIdRef.current = user.id;
    } else {
      const prevId = lastUserIdRef.current;
      if (prevId) {
        clearStoredMasterKey(prevId);
      }
      lastUserIdRef.current = null;
      resetState();
    }
  }, [refreshEncryptionStatus, resetState, user?.id]);

  const enableEncryption = useCallback(
    async (password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      if (!user?.id) throw new Error("User must be signed in to enable encryption");
      if (!password) throw new Error("Password is required");

      const profile = await fetchEncryptionProfile(user.id);
      if (profile?.is_encrypted) {
        throw new Error("Encryption is already enabled");
      }

      const currentEntries = await fetchEntries(user.id);
      const newMasterKey = await generateMasterKey();
      const nowIso = new Date().toISOString();
      const encryptedEntries = currentEntries.map((entry) =>
        encryptEntryFields(entry, newMasterKey, nowIso)
      );
      const { encryptedMasterKey, salt } = await encryptMasterKey(newMasterKey, password);

      await upsertEntries(encryptedEntries);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_encrypted: true,
          encrypted_master_key: encryptedMasterKey,
          key_salt: salt,
        })
        .eq("id", user.id);

      if (profileError) {
        console.warn("Failed to persist encryption profile; attempting rollback");
        await upsertEntries(currentEntries).catch((rollbackErr) =>
          console.warn("Rollback failed", rollbackErr)
        );
        throw new Error(profileError.message ?? "Could not enable encryption");
      }

      await writeStoredMasterKey(user.id, newMasterKey);
      setMasterKey(newMasterKey);
      setIsEncrypted(true);
      setIsUnlocked(true);
    },
    [user?.id]
  );

  const unlockVault = useCallback(
    async (password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      if (!user?.id) throw new Error("User must be signed in to unlock");
      if (!password) throw new Error("Password is required");

      const profile = await fetchEncryptionProfile(user.id);
      if (!profile?.is_encrypted || !profile.encrypted_master_key || !profile.key_salt) {
        throw new Error("Encryption is not enabled for this account");
      }

      const decryptedMasterKey = decryptMasterKey(
        profile.encrypted_master_key,
        password,
        profile.key_salt
      );

      await writeStoredMasterKey(user.id, decryptedMasterKey);
      setMasterKey(decryptedMasterKey);
      setIsEncrypted(true);
      setIsUnlocked(true);
    },
    [user?.id]
  );

  const disableEncryption = useCallback(
    async (password: string) => {
      if (!supabase) throw new Error("Supabase is not configured");
      if (!user?.id) throw new Error("User must be signed in to disable encryption");
      if (!password) throw new Error("Password is required");

      const profile = await fetchEncryptionProfile(user.id);
      if (!profile?.is_encrypted || !profile.encrypted_master_key || !profile.key_salt) {
        resetState();
        return;
      }

      const activeMasterKey = decryptMasterKey(
        profile.encrypted_master_key,
        password,
        profile.key_salt
      );

      const encryptedEntries = await fetchEntries(user.id);
      const nowIso = new Date().toISOString();
      const decryptedEntries = encryptedEntries.map((entry) =>
        decryptEntryFields(entry, activeMasterKey, nowIso)
      );

      await upsertEntries(decryptedEntries);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          is_encrypted: false,
          encrypted_master_key: null,
          key_salt: null,
        })
        .eq("id", user.id);

      if (profileError) {
        console.warn("Failed to disable encryption; attempting rollback");
        await upsertEntries(encryptedEntries).catch((rollbackErr) =>
          console.warn("Rollback failed", rollbackErr)
        );
        throw new Error(profileError.message ?? "Could not disable encryption");
      }

      await clearStoredMasterKey(user.id);
      resetState();
    },
    [resetState, user?.id]
  );

  const value = useMemo<EncryptionContextShape>(
    () => ({
      isEncrypted,
      isUnlocked,
      masterKey,
      refreshEncryptionStatus,
      enableEncryption,
      unlockVault,
      disableEncryption,
    }),
    [
      disableEncryption,
      enableEncryption,
      isEncrypted,
      isUnlocked,
      masterKey,
      refreshEncryptionStatus,
      unlockVault,
    ]
  );

  return <EncryptionContext.Provider value={value}>{children}</EncryptionContext.Provider>;
}

export function useEncryption() {
  const ctx = useContext(EncryptionContext);
  if (!ctx) {
    throw new Error("useEncryption must be used within EncryptionProvider");
  }
  return ctx;
}
