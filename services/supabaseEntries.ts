import { decryptData, encryptData } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { Entry } from "@/models/entry";

type DbEntry = {
  id: string;
  adversity: string;
  belief: string;
  ai_response: any;
  ai_retry_count?: number | null;
  consequence: string | null;
  dispute: string | null;
  energy: string | null;
  created_at: string;
  updated_at: string;
  account_id: string;
  dirty_since: string | null;
  is_deleted: boolean;
};

export interface SupabaseEntriesClient {
  upsert(entry: Entry): Promise<void>;
  remove(id: string): Promise<void>;
  fetchAll(): Promise<Entry[]>;
}

type EncryptionState = {
  isEncrypted: boolean;
  isUnlocked: boolean;
  masterKey: string | null;
};

export function createSupabaseEntriesClient(
  userId: string,
  getEncryption?: () => EncryptionState | null
): SupabaseEntriesClient | null {
  if (!supabase || !userId) return null;

  const toDb = (entry: Entry): DbEntry => ({
    id: entry.id,
    adversity: entry.adversity,
    belief: entry.belief,
    ai_response: entry.aiResponse ?? null,
    ai_retry_count: entry.aiRetryCount ?? 0,
    consequence: entry.consequence ?? null,
    dispute: entry.dispute ?? null,
    energy: entry.energy ?? null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    account_id: userId,
    dirty_since: entry.dirtySince ?? null,
    is_deleted: entry.isDeleted ?? false,
  });

  const toDbEncrypted = (entry: Entry, masterKey: string): DbEntry => {
    const base = toDb(entry);
    return {
      ...base,
      adversity: encryptData(entry.adversity ?? "", masterKey),
      belief: encryptData(entry.belief ?? "", masterKey),
      consequence: entry.consequence ? encryptData(entry.consequence, masterKey) : null,
      dispute: entry.dispute ? encryptData(entry.dispute, masterKey) : null,
      energy: entry.energy ? encryptData(entry.energy, masterKey) : null,
    };
  };

  const fromDb = (row: DbEntry): Entry => ({
    id: row.id,
    adversity: row.adversity,
    belief: row.belief,
    aiResponse: row.ai_response ?? null,
    aiRetryCount:
      typeof row.ai_retry_count === "number" && Number.isFinite(row.ai_retry_count)
        ? row.ai_retry_count
        : 0,
    consequence: row.consequence ?? undefined,
    dispute: row.dispute ?? undefined,
    energy: row.energy ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    accountId: row.account_id ?? null,
    dirtySince: row.dirty_since ?? null,
    isDeleted: !!row.is_deleted,
  });

  const fromDbEncrypted = (row: DbEntry, masterKey: string): Entry =>
    fromDb({
      ...row,
      adversity: decryptData(row.adversity ?? "", masterKey),
      belief: decryptData(row.belief ?? "", masterKey),
      consequence: row.consequence ? decryptData(row.consequence, masterKey) : null,
      dispute: row.dispute ? decryptData(row.dispute, masterKey) : null,
      energy: row.energy ? decryptData(row.energy, masterKey) : null,
    });

  const getEncryptionState = (): EncryptionState | null => {
    const state = getEncryption?.();
    if (!state) return null;
    return state;
  };

  async function upsert(entry: Entry) {
    const encryption = getEncryptionState();
    const shouldEncrypt =
      !!encryption?.isEncrypted && !!encryption?.isUnlocked && !!encryption.masterKey;

    if (encryption?.isEncrypted && !shouldEncrypt) {
      throw new Error("Vault is locked; cannot sync encrypted entries");
    }

    const dbRow = shouldEncrypt
      ? toDbEncrypted(entry, encryption!.masterKey as string)
      : toDb(entry);

    const { error } = await supabase.from("entries").upsert(dbRow, { onConflict: "id" });
    if (!error) return;

    const message = String((error as any)?.message ?? "");
    if (!message.includes("ai_retry_count")) {
      console.warn("Supabase upsert failed", error);
      return;
    }

    // Backwards compatibility: older schemas may not have ai_retry_count yet.
    const { ai_retry_count: _omit, ...legacyRow } = dbRow;
    const retry = await supabase
      .from("entries")
      .upsert(legacyRow, { onConflict: "id" });
    if (retry.error) {
      console.warn("Supabase upsert failed", retry.error);
    }
  }

  async function remove(id: string) {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("entries")
      .update({ is_deleted: true, updated_at: nowIso })
      .eq("id", id)
      .eq("account_id", userId);
    if (error) {
      console.warn("Supabase delete failed", error);
    }
  }

  async function fetchAll(): Promise<Entry[]> {
    const encryption = getEncryptionState();
    const shouldDecrypt =
      !!encryption?.isEncrypted && !!encryption?.isUnlocked && !!encryption.masterKey;

    if (encryption?.isEncrypted && !shouldDecrypt) {
      throw new Error("Vault is locked; cannot read encrypted entries");
    }

    const columns =
      "id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy, created_at, updated_at, account_id, dirty_since, is_deleted";

    const initial = await supabase
      .from("entries")
      .select(columns)
      .eq("account_id", userId);

    if (!initial.error) {
      const rows = (initial.data ?? []) as DbEntry[];
      if (!shouldDecrypt) {
        return rows.map(fromDb);
      }
      return rows.map((row) => fromDbEncrypted(row, encryption!.masterKey as string));
    }

    const message = String((initial.error as any)?.message ?? "");
    if (!message.includes("ai_retry_count")) {
      console.warn("Supabase fetch entries failed", initial.error);
      return [];
    }

    // Backwards compatibility: retry without the new column.
    const fallback = await supabase
      .from("entries")
      .select(
        "id, adversity, belief, ai_response, consequence, dispute, energy, created_at, updated_at, account_id, dirty_since, is_deleted"
      )
      .eq("account_id", userId);

    if (fallback.error) {
      console.warn("Supabase fetch entries failed", fallback.error);
      return [];
    }

    const rows = (fallback.data ?? []) as DbEntry[];
    if (!shouldDecrypt) {
      return rows.map(fromDb);
    }
    return rows.map((row) => fromDbEncrypted(row, encryption!.masterKey as string));
  }

  return { upsert, remove, fetchAll };
}
