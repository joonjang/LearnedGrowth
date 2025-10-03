export interface Entry {
   id: string;
   adversity: string;
   belief: string;
   consequence?: string;
   dispute?: string;
   energy?: string;
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
