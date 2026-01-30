import {
   AI_ANALYSIS_CREDIT_COST,
   FREE_MONTHLY_CREDITS,
} from '@/lib/constants';
import { supabase } from '@/lib/supabase';

export type AiConfig = {
   freeMonthlyCredits: number;
   aiCreditCost: number;
   updatedAt: string | null;
};

export const DEFAULT_AI_CONFIG: AiConfig = {
   freeMonthlyCredits: FREE_MONTHLY_CREDITS,
   aiCreditCost: AI_ANALYSIS_CREDIT_COST,
   updatedAt: null,
};

type AiConfigRow = {
   free_monthly_credits?: number | null;
   ai_credit_cost?: number | null;
   updated_at?: string | null;
};

function toNumber(value: unknown): number | null {
   const num = typeof value === 'string' ? Number(value) : (value as number);
   return Number.isFinite(num) ? num : null;
}

export async function fetchAiConfig(): Promise<AiConfig> {
   if (!supabase) return DEFAULT_AI_CONFIG;

   const { data, error } = await supabase.rpc('get_ai_config');
   if (error) {
      throw error;
   }

   const row = Array.isArray(data)
      ? (data[0] as AiConfigRow | undefined)
      : (data as AiConfigRow | null);

   if (!row) return DEFAULT_AI_CONFIG;

   const freeMonthlyCredits =
      toNumber(row.free_monthly_credits) ?? DEFAULT_AI_CONFIG.freeMonthlyCredits;
   const aiCreditCost =
      toNumber(row.ai_credit_cost) ?? DEFAULT_AI_CONFIG.aiCreditCost;

   return {
      freeMonthlyCredits: Math.max(freeMonthlyCredits, 0),
      aiCreditCost: Math.max(aiCreditCost, 1),
      updatedAt: row.updated_at ?? null,
   };
}
