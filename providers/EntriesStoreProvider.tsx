import { systemClock } from '@/lib/clock';
import { makeEntriesService } from '@/services/makeEntriesService';
import { createSupabaseEntriesClient } from '@/services/supabaseEntries';
import { createEntriesStore, EntriesStore, placeholderEntriesStore } from '@/store/useEntriesStore';
import {
   createContext,
   ReactNode,
   useContext,
   useEffect,
   useMemo,
   useRef,
} from 'react';
import { useEntriesAdapter } from './AdapterProvider';
import { useAuth } from './AuthProvider';

const EntriesStoreContext = createContext<EntriesStore | null>(null);

export function EntriesStoreProvider({ children }: { children: ReactNode }) {
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
   const lastLinkedAccountId = useRef<string | null>(null);

   const cloud = useMemo(() => {
      if (!user?.id) return null;
      return createSupabaseEntriesClient(user.id);
   }, [user?.id]);

   const service = useMemo(() => {
      if (!adapter) return null;
      return makeEntriesService(adapter, systemClock, cloud);
   }, [adapter, cloud]);

   const store = useMemo<EntriesStore>(() => {
      if (!service) return placeholderEntriesStore;
      return createEntriesStore(service, systemClock);
   }, [service]);

   // Hydrate local data immediately (even if locked, we can read local DB)
   useEffect(() => {
      if (!ready || store === placeholderEntriesStore) return;
      store.getState().hydrate();
   }, [ready, store]);

   // --- SYNC LOGIC ---
   useEffect(() => {
      if (!cloud || !adapter || !ready) return;
      if (store === placeholderEntriesStore) return;

      (async () => {
         try {
            
            // Pull remote changes
            const remote = await cloud.fetchAll();
            for (const entry of remote) {
               const local = await adapter.getById(entry.id);
               if (!local) {
                  await adapter.add(entry);
               } else if (entry.updatedAt > local.updatedAt) {
                  await adapter.update(entry.id, entry);
               }
            }

            // Push local entries (including deletions)
            const locals = await adapter.getAllIncludingDeleted();
            for (const entry of locals) {
               if (entry.accountId !== user?.id) continue;
               if (entry.isDeleted) {
                  await cloud.remove(entry.id);
                  continue;
               }
               await cloud.upsert(entry);
            }

            await store.getState().hydrate();
         } catch (e) {
            console.warn('Failed to sync entries from Supabase', e);
         }
      })();
      
      // 4. DEPENDENCIES: Re-run this effect when 'isUnlocked' changes.
   }, [adapter, cloud, ready, store, user?.id]);

   // Account Linking Logic (assigning local entries to the logged-in user)
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
