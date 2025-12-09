import { supabase } from "@/lib/supabase";
import { Entry } from "@/models/entry";

type DbEntry = {
  id: string;
  adversity: string;
  belief: string;
  ai_response: any;
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
    const { error } = await supabase
      .from("entries")
      .upsert(dbRow, { onConflict: "id" });
    if (error) {
      console.warn("Supabase upsert failed", error);
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
    const { data, error } = await supabase
      .from("entries")
      .select(
        "id, adversity, belief, ai_response, consequence, dispute, energy, created_at, updated_at, account_id, dirty_since, is_deleted"
      )
      .eq("account_id", userId);
    if (error) {
      console.warn("Supabase fetch entries failed", error);
      return [];
    }
    return (data ?? []).map(fromDb);
  }

  return { upsert, remove, fetchAll };
}
