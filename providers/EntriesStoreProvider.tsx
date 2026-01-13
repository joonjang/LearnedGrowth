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
import { Platform } from 'react-native';
import { useEntriesAdapter } from './AdapterProvider';
import { useAuth } from './AuthProvider';

const EntriesStoreContext = createContext<EntriesStore | null>(null);

export function EntriesStoreProvider({ children }: { children: ReactNode }) {
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
   const devSeeded = useRef(false);
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

   // Seed simulator/dev with fixture data when explicitly enabled.
   useEffect(() => {
      if (!__DEV__) return;
      if (Platform.OS === 'android') return;
      if (devSeeded.current) return;
      if (!adapter || !ready) return;
      if (store === placeholderEntriesStore) return;
      const envFlag =
         process.env.EXPO_PUBLIC_SEED_ENTRIES === 'true' ||
         process.env.EXPO_PUBLIC_SEED_ENTRIES === '1';

      devSeeded.current = true;
      (async () => {
         try {
            // Seed only when explicitly requested via env flag.
            if (!envFlag) return;

            const { weekEntries } = await import('../__test__/test-utils/weekEntries');
            let inserted = 0;
            let updated = 0;
            for (const entry of weekEntries) {
               const exists = await adapter.getById(entry.id);
               if (exists) {
                  const { createdAt: _omitCreated, ...rest } = entry;
                  await adapter.update(entry.id, {
                     ...rest,
                     aiResponse: entry.aiResponse ?? null,
                     aiRetryCount: entry.aiRetryCount ?? 0,
                     isDeleted: false,
                  });
                  updated += 1;
               } else {
                  await adapter.add(entry);
                  inserted += 1;
               }
            }
            if (inserted > 0 || updated > 0) {
               await store.getState().hydrate();
               console.log(
                  `[Dev Seed] Applied weekEntries fixture: ${inserted} inserted, ${updated} updated.`
               );
            } else {
               console.log('[Dev Seed] weekEntries already present, no inserts performed.');
            }
         } catch (e) {
            console.warn('[Dev Seed] Failed to insert weekEntries fixture', e);
         }
      })();
   }, [adapter, ready, store]);

   // --- SYNC LOGIC ---
   useEffect(() => {
      if (!cloud || !adapter || !ready) return;
      if (store === placeholderEntriesStore) return;

      (async () => {
         try {
            console.log('[Sync] Starting...');
            
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

            // Push local entries
            const locals = await adapter.getAll();
            for (const entry of locals) {
               if (entry.accountId !== user?.id) continue;
               await cloud.upsert(entry);
            }

            await store.getState().hydrate();
            console.log('[Sync] Complete.');
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
