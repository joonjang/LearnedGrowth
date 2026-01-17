import { Entry } from '@/models/entry';
import { useEntriesAdapter } from '@/providers/AdapterProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useCallback, useEffect, useState } from 'react';

export function useDeletedEntries() {
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
   const [deletedEntries, setDeletedEntries] = useState<Entry[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const refresh = useCallback(async () => {
      if (!adapter || !ready) return;
      setLoading(true);
      setError(null);
      try {
         const all = await adapter.getAllIncludingDeleted();
         const deleted = all
            .filter((entry) => entry.isDeleted)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
         setDeletedEntries(deleted);
      } catch (e: any) {
         setError(String(e?.message ?? e));
      } finally {
         setLoading(false);
      }
   }, [adapter, ready]);

   useEffect(() => {
      refresh();
   }, [refresh, user?.id]);

   return {
      deletedEntries,
      deletedCount: deletedEntries.length,
      loading,
      error,
      refresh,
   };
}
