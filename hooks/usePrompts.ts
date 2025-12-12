import { useMemo } from 'react';

function pickRandomPrompt(list?: string[]) {
   if (!list?.length) return 'Empty prompt list';
   const i = Math.floor(Math.random() * list.length);
   return list[i];
}

export function usePrompts<K extends string>(
   keys: readonly K[],
   getList: (key: K) => string[] | undefined
) {
   return useMemo<Record<K, string>>(() => {
      const result = {} as Record<K, string>;
      keys.forEach((key) => {
         result[key] = pickRandomPrompt(getList(key));
      });
      return result;
   }, [keys, getList]);
}
