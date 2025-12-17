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

export function createSupabaseEntriesClient(
  userId: string
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

  async function upsert(entry: Entry) {
    const dbRow = toDb(entry);
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
    const columns =
      "id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy, created_at, updated_at, account_id, dirty_since, is_deleted";

    const initial = await supabase
      .from("entries")
      .select(columns)
      .eq("account_id", userId);

    if (!initial.error) {
      return (initial.data ?? []).map(fromDb);
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

    return (fallback.data ?? []).map(fromDb);
  }

  return { upsert, remove, fetchAll };
}
