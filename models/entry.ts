import { LearnedGrowthResponse } from "./aiService";

export type EntryAnalysis = LearnedGrowthResponse["analysis"];

export interface Entry {
   id: string;
   adversity: string;
   belief: string;
   consequence?: string;
   dispute?: string;
   energy?: string;
   analysis?: EntryAnalysis | null;
   createdAt: string;
   updatedAt: string;
   accountId?: string | null;
   dirtySince?: string | null;
   isDeleted: boolean;
}

export type NewEntry = Pick<
   Entry,
   'adversity' | 'belief' | 'consequence' | 'dispute' | 'energy' | 'accountId'
>;
