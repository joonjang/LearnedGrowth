import { Entry } from './entry';

export type PendKind = 'create' | 'update' | 'remove';

export type PendingOp = {
   op: PendKind;
   submittedAt: string; // ISO time (use your Clock)
   payload?: Partial<Entry>; // for replay/debug
};

export interface EntriesState {
   // Data
   byId: Record<string, Entry>;
   allIds: string[];

   // Meta
   pending: Record<string, PendingOp>;
   errors: Record<string | 'global', string>;
   isHydrating: boolean;
   lastHydratedAt: string | null;
   hydrateRequestId: number;

   // Actions
   hydrate(): Promise<void>;
   refresh(): Promise<void>;
   create(draft: Entry): Promise<Entry>;
   update(id: string, patch: Partial<Entry>): Promise<Entry>;
   remove(id: string): Promise<void>;
   clearErrors(): void;
}
