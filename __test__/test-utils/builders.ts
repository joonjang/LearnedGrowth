import { Entry } from '@/models/entry';

export const baseEntry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'> = {
   adversity: 'Test adversity',
   belief: 'Test belief',
   aiResponse: null,
   aiRetryCount: 0,
   consequence: undefined,
   dispute: undefined,
   energy: undefined,
   disputeHistory: [],
   dirtySince: null,
   isDeleted: false,
   accountId: null,
};

export const customEntry = (overrides?: Partial<Entry>): Entry => ({
   id: overrides?.id ?? 'e1',
   createdAt: overrides?.createdAt ?? '2025-09-28T00:00:00.000Z',
   updatedAt: overrides?.updatedAt ?? '2025-09-28T00:00:00.000Z',
   ...baseEntry,
   ...overrides,
});
