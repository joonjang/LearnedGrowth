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
import { createEntriesStore, EntriesStore } from '@/store/useEntriesStore';

const EntriesStoreContext = createContext<EntriesStore | null>(null);

export function EntriesStoreProvider({ children }: { children: ReactNode }) {
   const { adapter, ready, error } = useEntriesAdapter();

   const service = useMemo(() => {
      if (!adapter) return null;
      return makeEntriesService(adapter, systemClock);
   }, [adapter]);

   const storeRef = useRef<EntriesStore | null>(null);
   if (!storeRef.current && service) {
      storeRef.current = createEntriesStore(service, systemClock);
   }

   useEffect(() => {
      if (!ready || !storeRef.current) return;
      storeRef.current.getState().hydrate();
   }, [ready]);

   return (
      <EntriesStoreContext.Provider value={storeRef.current}>
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
