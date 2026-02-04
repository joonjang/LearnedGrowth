import { systemClock } from '@/lib/clock';
import { supabase } from '@/lib/supabase';
import { makeEntriesService } from '@/services/makeEntriesService';
import { createSupabaseEntriesClient } from '@/services/supabaseEntries';
import { createEntriesStore, EntriesStore, placeholderEntriesStore } from '@/store/useEntriesStore';
import {
   createContext,
   ReactNode,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useEntriesAdapter } from './AdapterProvider';
import { useAuth } from './AuthProvider';

const EntriesStoreContext = createContext<EntriesStore | null>(null);
const EntriesSyncContext = createContext<(() => Promise<void>) | null>(null);
const EntriesRealtimeContext = createContext<
   ((entryId: string, onAiReady?: () => void) => () => void) | null
>(null);

export function EntriesStoreProvider({ children }: { children: ReactNode }) {
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
   const lastUserId = useRef<string | null>(null);
   const pendingLoginCleanupId = useRef<string | null>(null);
   const pendingLogoutCleanupId = useRef<string | null>(null);
   const lastLinkedAccountId = useRef<string | null>(null);
   const syncInFlightRef = useRef(false);
   const lastSyncAtRef = useRef(0);

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

   useEffect(() => {
      const currentId = user?.id ?? null;
      const prevId = lastUserId.current;

      if (prevId && !currentId) {
         pendingLogoutCleanupId.current = prevId;
      }
      if (currentId && currentId !== prevId) {
         pendingLoginCleanupId.current = currentId;
      }
      lastUserId.current = currentId;
   }, [user?.id]);

   useEffect(() => {
      const cleanupId = pendingLoginCleanupId.current;
      if (!cleanupId) return;
      if (!adapter || !ready) return;
      if (store === placeholderEntriesStore) return;

      (async () => {
         try {
            const rows = await adapter.getAllIncludingDeleted();
            const toRemove = rows.filter(
               (entry) => entry.accountId && entry.accountId !== cleanupId
            );
            for (const entry of toRemove) {
               await adapter.hardDelete(entry.id);
            }
            pendingLoginCleanupId.current = null;
            await store.getState().hydrate();
         } catch (e) {
            console.warn('Failed to clear entries after login', e);
         }
      })();
   }, [adapter, ready, store, user?.id]);

   useEffect(() => {
      const cleanupId = pendingLogoutCleanupId.current;
      if (!cleanupId) return;
      if (!adapter || !ready) return;
      if (store === placeholderEntriesStore) return;

      (async () => {
         try {
            const rows = await adapter.getAllIncludingDeleted();
            const toRemove = rows.filter(
               (entry) => entry.accountId === cleanupId
            );
            for (const entry of toRemove) {
               await adapter.hardDelete(entry.id);
            }
            pendingLogoutCleanupId.current = null;
            await store.getState().hydrate();
         } catch (e) {
            console.warn('Failed to clear entries after logout', e);
         }
      })();
   }, [adapter, ready, store, user?.id]);

   // --- SYNC LOGIC ---
   const syncWithCloud = useCallback(
      async (_reason: 'mount' | 'app-active') => {
         if (!cloud || !adapter || !ready) return;
         if (store === placeholderEntriesStore) return;
         if (!user?.id) return;
         if (syncInFlightRef.current) return;

         const now = Date.now();
         if (now - lastSyncAtRef.current < 1500) return;
         lastSyncAtRef.current = now;
         syncInFlightRef.current = true;

         try {
            // Pull remote changes
            const remote = await cloud.fetchAll();
            for (const entry of remote) {
               const local = await adapter.getById(entry.id);
               const remoteAiCreatedAt = entry.aiResponse?.createdAt ?? entry.updatedAt;
               const localAiCreatedAt = local?.aiResponse?.createdAt ?? local?.updatedAt ?? '';
               const shouldUpdateFromAi =
                  Boolean(entry.aiResponse) &&
                  (!local?.aiResponse || remoteAiCreatedAt > localAiCreatedAt);
               const shouldUpdateFromUpdatedAt =
                  !local || entry.updatedAt > local.updatedAt;
               if (!local) {
                  await adapter.add(entry);
               } else if (shouldUpdateFromUpdatedAt || shouldUpdateFromAi) {
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
         } finally {
            syncInFlightRef.current = false;
         }
      },
      [adapter, cloud, ready, store, user?.id],
   );

   useEffect(() => {
      void syncWithCloud('mount');
   }, [syncWithCloud]);

   useEffect(() => {
      if (!cloud || !adapter || !ready) return;
      if (store === placeholderEntriesStore) return;

      const handleAppState = (state: AppStateStatus) => {
         if (state === 'active') {
            void syncWithCloud('app-active');
         }
      };

      const subscription = AppState.addEventListener('change', handleAppState);
      return () => subscription.remove();
   }, [adapter, cloud, ready, store, syncWithCloud]);

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

   const syncNow = useCallback(() => syncWithCloud('app-active'), [syncWithCloud]);

   const subscribeToEntryAi = useCallback(
      (entryId: string, onAiReady?: () => void) => {
         if (!supabase || !entryId) return () => {};

         let active = true;
         const channel = supabase
            .channel(`entry-ai-${entryId}`)
            .on(
               'postgres_changes',
               {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'entries',
                  filter: `id=eq.${entryId}`,
               },
               (payload) => {
                  if (!active) return;
                  const next = payload?.new as Record<string, unknown> | null;
                  if (!next?.ai_response) return;
                  if (onAiReady) {
                     try {
                        onAiReady();
                     } catch (e) {
                        console.warn('AI realtime callback failed', e);
                     }
                     return;
                  }
                  void syncWithCloud('app-active');
               },
            )
            .subscribe();

         return () => {
            active = false;
            supabase.removeChannel(channel);
         };
      },
      [syncWithCloud],
   );

   return (
      <EntriesSyncContext.Provider value={syncNow}>
         <EntriesRealtimeContext.Provider value={subscribeToEntryAi}>
            <EntriesStoreContext.Provider value={store}>
               {children}
            </EntriesStoreContext.Provider>
         </EntriesRealtimeContext.Provider>
      </EntriesSyncContext.Provider>
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

export function useEntriesSync() {
   const ctx = useContext(EntriesSyncContext);
   if (!ctx)
      throw new Error(
         'useEntriesSync must be used within EntriesStoreProvider'
      );
   return ctx;
}

export function useEntriesRealtime() {
   const ctx = useContext(EntriesRealtimeContext);
   if (!ctx)
      throw new Error(
         'useEntriesRealtime must be used within EntriesStoreProvider'
      );
   return ctx;
}
