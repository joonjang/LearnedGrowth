import {
   createContext,
   ReactNode,
   useContext,
   useEffect,
   useMemo,
   useRef,
} from 'react';
import { useEntriesAdapter } from './AdapterProvider';
import { makeEntriesService } from '@/services/makeEntriesService';
import { systemClock } from '@/lib/clock';
import { createEntriesStore, EntriesStore, placeholderEntriesStore } from '@/store/useEntriesStore';
import { useAuth } from './AuthProvider';

const EntriesStoreContext = createContext<EntriesStore | null>(null);

export function EntriesStoreProvider({ children }: { children: ReactNode }) {
   const { adapter, ready, error } = useEntriesAdapter();
   const { user } = useAuth();
   const lastLinkedAccountId = useRef<string | null>(null);

   const service = useMemo(() => {
      if (!adapter) return null;
      return makeEntriesService(adapter, systemClock);
   }, [adapter]);

   const store = useMemo<EntriesStore>(() => {
      if (!service) return placeholderEntriesStore;
      return createEntriesStore(service, systemClock);
   }, [service]);

   useEffect(() => {
      if (!ready || store === placeholderEntriesStore) return;
      store.getState().hydrate();
   }, [ready, store]);

   useEffect(() => {
      if (!adapter || !ready || !user?.id) return;
      if (store === placeholderEntriesStore) return;
      if (lastLinkedAccountId.current === user.id) return;

      lastLinkedAccountId.current = user.id;
      const now = systemClock.nowIso();

      (async () => {
         try {
            const rows = await adapter.getAll();
            const missingAccount = rows.filter((e) => !e.accountId);
            for (const entry of missingAccount) {
               await adapter.update(entry.id, {
                  accountId: user.id,
                  dirtySince: entry.dirtySince ?? now,
               });
            }
            if (missingAccount.length > 0) {
               await store.getState().hydrate();
            }
         } catch (e) {
            console.warn('Failed to attach account_id to entries', e);
         }
      })();
   }, [adapter, ready, store, user?.id]);

   useEffect(() => {
      if (!user) {
         lastLinkedAccountId.current = null;
      }
   }, [user]);

   return (
      <EntriesStoreContext.Provider value={store}>
         {children}
      </EntriesStoreContext.Provider>
   );
}

export function useEntriesStore() {
   const ctx = useContext(EntriesStoreContext);
   if (!ctx)
      throw new Error(
         'useEntriesStore must be used within EntriesStoreProvider'
      );
   return ctx;
}
