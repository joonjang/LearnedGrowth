import { createDb } from "@/db/entries";
import { SQLEntriesAdapter } from "@/db/entriesAdapter.sqlite";
import { systemClock } from "@/lib/clock";
import { EntriesAdapter } from "@/models/entriesAdapter";
import {
   createContext,
   ReactNode,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useRef,
   useState,
} from "react";

interface AdapterContextShape {
   adapter: EntriesAdapter | null;
   ready: boolean;
   error: string | null;
   reload: () => Promise<void>;
}

export const AdapterContext = createContext<AdapterContextShape | null>(null);

export function AdapterProvider({ children }: { children: ReactNode }) {
   const mounted = useRef(false);
   const [adapter, setAdapter] = useState<EntriesAdapter | null>(null);
   const [ready, setReady] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const init = useCallback(async () => {
      setError(null);
      try {
         const db = await createDb();
         const clock = systemClock;

         if (!mounted.current) return;
         setAdapter(new SQLEntriesAdapter(db, clock));
         setReady(true);
      } catch (e: any) {
         if (!mounted.current) return;
         setError(`AdapterProvider error: ${e?.message ?? e}`);
         setAdapter(null);
         setReady(false);
      }
   }, []);

   useEffect(() => {
      mounted.current = true;
      init();
      return () => {
         mounted.current = false;
      };
   }, [init]);

   const value = useMemo(
      () => ({ adapter, ready, error, reload: init }),
      [adapter, ready, error, init]
   );

   return (
      <AdapterContext.Provider value={value}>
         {children}
      </AdapterContext.Provider>
   );
}

export function useEntriesAdapter() {
   const ctx = useContext(AdapterContext);
   if (!ctx)
      throw new Error("useEntriesAdapter must be used within AdapterProvider");
   return ctx;
}
