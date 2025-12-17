import { LearnedGrowthResponse } from "./aiService";

export interface Entry {
   id: string;
   adversity: string;
   belief: string;
   consequence?: string;
   dispute?: string;
   energy?: string;
   aiResponse?: LearnedGrowthResponse | null;
   aiRetryCount?: number;
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
