import { fetchAiConfig, type AiConfig, DEFAULT_AI_CONFIG } from '@/services/appConfig';
import {
   createContext,
   useCallback,
   useContext,
   useEffect,
   useMemo,
   useState,
   type ReactNode,
} from 'react';

type AppConfigContextShape = {
   aiConfig: AiConfig;
   loading: boolean;
   error: string | null;
   refresh: () => Promise<void>;
};

const AppConfigContext = createContext<AppConfigContextShape | null>(null);

export function AppConfigProvider({ children }: { children: ReactNode }) {
   const [aiConfig, setAiConfig] = useState<AiConfig>(DEFAULT_AI_CONFIG);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);

   const refresh = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const next = await fetchAiConfig();
         setAiConfig(next);
      } catch (err: any) {
         setError(err?.message ?? 'Failed to load app config');
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      refresh();
   }, [refresh]);

   const value = useMemo<AppConfigContextShape>(
      () => ({
         aiConfig,
         loading,
         error,
         refresh,
      }),
      [aiConfig, error, loading, refresh],
   );

   return (
      <AppConfigContext.Provider value={value}>
         {children}
      </AppConfigContext.Provider>
   );
}

export function useAppConfig() {
   const ctx = useContext(AppConfigContext);
   if (!ctx) {
      throw new Error('useAppConfig must be used within AppConfigProvider');
   }
   return ctx;
}
