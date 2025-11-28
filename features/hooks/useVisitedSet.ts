import { useCallback, useState } from 'react';

export function useVisitedSet<T>() {
   const [visited, setVisited] = useState<Set<T>>(new Set());

   const hasVisited = useCallback((key: T) => visited.has(key), [visited]);

   const markVisited = useCallback((key: T) => {
      setVisited((prev) => {
         if (prev.has(key)) return prev;
         const next = new Set(prev);
         next.add(key);
         return next;
      });
   }, []);

   return { visited, hasVisited, markVisited };
}
