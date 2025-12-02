import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { useCallback, useMemo } from 'react';
import { Entry } from '@/models/entry';

export function useEntries() {
   const store = useEntriesStore();

   // subscribe to slices separately (no object literals)
   const allIds = store((s) => s.allIds);
   const byId = store((s) => s.byId);
   const isHydrating = store((s) => s.isHydrating);
   const pending = store((s) => s.pending);
   const errors = store((s) => s.errors);

   // derive rows with memo so FlatList gets a stable ref unless data changes
   const rows = useMemo(
      () => allIds.map((id) => byId[id]).filter(Boolean),
      [allIds, byId]
   );

   const hydrate = useCallback(
      async function onHydrate() {
         await store.getState().hydrate();
      },
      [store]
   );

   const refresh = useCallback(
      async function onRefresh() {
         await store.getState().refresh();
      },
      [store]
   );

   const createEntry = useCallback(
      async function onInsert(adversity: string, belief: string, consequence: string = '') {
         const draft = {
            id: 'new',
            adversity: adversity,
            belief: belief,
            consequence: consequence,
            dispute: '',
            energy: '',
            createdAt: '',
            updatedAt: '',
            accountId: null,
            dirtySince: null,
            isDeleted: false,
         };
         const newEntry = await store.getState().create(draft);

         return newEntry;
      },
      [store]
   );

   const getEntryById = useCallback(
      function getId(id: string){
         return store.getState().byId[id];
      }, [store]
   );

   const updateEntry = useCallback(
      async function onUpdate(id: string, patch: Partial<Entry>) {
         await store.getState().update(id, patch);
      },
      [store]
   );

   const deleteEntry = useCallback(
      async function onDelete(id: string) {
         await store.getState().remove(id);
      },
      [store]
   );

   const restoreEntry = useCallback(
      async function onRestore(entry: Entry) {
         await store.getState().restore(entry);
      },
      [store]
   );

   const clearErrors = useCallback(() => {
      store.getState().clearErrors();
   }, [store]);

   return {
      rows,
      isHydrating,
      pending,
      errors,
      hydrate,
      refresh,
      createEntry,
      getEntryById,
      updateEntry,
      deleteEntry,
      restoreEntry,
      clearErrors,
   };
}
