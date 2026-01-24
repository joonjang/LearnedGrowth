import { supabase } from "@/lib/supabase";
import { DisputeHistoryItem, Entry } from "@/models/entry";

type DbEntry = {
  id: string;
  adversity: string;
  belief: string;
  ai_response?: any;
  ai_retry_count?: number | null;
  consequence: string | null;
  dispute: string | null;
  energy: string | null;
  dispute_history?: unknown;
  created_at: string;
  updated_at: string;
  account_id: string;
  dirty_since: string | null;
  is_deleted: boolean;
};

type DbEntryWrite = Omit<DbEntry, "ai_response"> & { ai_response?: any };

function normalizeDisputeHistory(raw: unknown): DisputeHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const fallbackTimestamp = new Date().toISOString();
  const items: DisputeHistoryItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const dispute =
      typeof (item as any).dispute === "string" ? (item as any).dispute.trim() : "";
    if (!dispute) continue;
    const energy =
      typeof (item as any).energy === "string" ? (item as any).energy : null;
    const createdAt =
      typeof (item as any).createdAt === "string" ? (item as any).createdAt : fallbackTimestamp;
    items.push({ dispute, energy, createdAt });
  }
  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface SupabaseEntriesClient {
  upsert(entry: Entry): Promise<void>;
  remove(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  fetchAll(): Promise<Entry[]>;
}

export function createSupabaseEntriesClient(userId: string): SupabaseEntriesClient | null {
  const client = supabase;
  if (!client || !userId) return null;
  const db = client;

  const toDb = (entry: Entry): DbEntryWrite => ({
    id: entry.id,
    adversity: entry.adversity,
    belief: entry.belief,
    ai_retry_count: entry.aiRetryCount ?? 0,
    consequence: entry.consequence ?? null,
    dispute: entry.dispute ?? null,
    energy: entry.energy ?? null,
    dispute_history: entry.disputeHistory,
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
    disputeHistory: normalizeDisputeHistory(row.dispute_history),
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

    const { error } = await db.from("entries").upsert(dbRow, { onConflict: "id" });
    if (!error) return;

    const message = String((error as any)?.message ?? "");
    const missingRetryCount = message.includes("ai_retry_count");
    const missingDisputeHistory = message.includes("dispute_history");
    if (!missingRetryCount && !missingDisputeHistory) {
      console.warn("Supabase upsert failed", error);
      return;
    }

    // Backwards compatibility: older schemas may not have ai_retry_count or dispute_history yet.
    const { ai_retry_count: _omitRetry, dispute_history: _omitHistory, ...legacyRow } =
      dbRow;
    const retry = await db
      .from("entries")
      .upsert(legacyRow, { onConflict: "id" });
    if (retry.error) {
      console.warn("Supabase upsert failed", retry.error);
    }
  }

  async function remove(id: string) {
    const nowIso = new Date().toISOString();
    const { error } = await db
      .from("entries")
      .update({ is_deleted: true, updated_at: nowIso })
      .eq("id", id)
      .eq("account_id", userId);
    if (error) {
      console.warn("Supabase delete failed", error);
    }
  }

  async function hardDelete(id: string) {
    const { error } = await db
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("account_id", userId);
    if (error) {
      console.warn("Supabase hard delete failed", error);
      throw error;
    }
  }

  async function fetchAll(): Promise<Entry[]> {
    const columns =
      "id, adversity, belief, ai_response, ai_retry_count, consequence, dispute, energy, dispute_history, created_at, updated_at, account_id, dirty_since, is_deleted";

    const initial = await db
      .from("entries")
      .select(columns)
      .eq("account_id", userId);

    if (!initial.error) {
      const rows = (initial.data ?? []) as DbEntry[];
      return rows.map(fromDb);
    }

    const message = String((initial.error as any)?.message ?? "");
    const missingRetryCount = message.includes("ai_retry_count");
    const missingDisputeHistory = message.includes("dispute_history");
    if (!missingRetryCount && !missingDisputeHistory) {
      console.warn("Supabase fetch entries failed", initial.error);
      return [];
    }

    // Backwards compatibility: retry without missing columns.
    const fallbackColumns = [
      "id",
      "adversity",
      "belief",
      "ai_response",
      ...(missingRetryCount ? [] : ["ai_retry_count"]),
      "consequence",
      "dispute",
      "energy",
      ...(missingDisputeHistory ? [] : ["dispute_history"]),
      "created_at",
      "updated_at",
      "account_id",
      "dirty_since",
      "is_deleted",
    ];
    const fallback = await db
      .from("entries")
      .select(fallbackColumns.join(", "))
      .eq("account_id", userId);

    if (fallback.error) {
      console.warn("Supabase fetch entries failed", fallback.error);
      return [];
    }

    const rows = (fallback.data ?? []) as DbEntry[];
    return rows.map(fromDb);
  }

  return { upsert, remove, hardDelete, fetchAll };
}
