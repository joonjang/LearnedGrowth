import {
   createContext,
   ReactNode,
   useContext,
   useEffect,
   useMemo,
} from 'react';
import { useEntriesAdapter } from './AdapterProvider';
import { makeEntriesService } from '@/services/makeEntriesService';
import { systemClock } from '@/lib/clock';
import { createEntriesStore, EntriesStore, placeholderEntriesStore } from '@/store/useEntriesStore';

const EntriesStoreContext = createContext<EntriesStore | null>(null);

export function EntriesStoreProvider({ children }: { children: ReactNode }) {
   const { adapter, ready, error } = useEntriesAdapter();

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
