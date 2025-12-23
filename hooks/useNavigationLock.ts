import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_RESET_MS = 650;

export function useNavigationLock(resetMs: number = DEFAULT_RESET_MS) {
   const [locked, setLocked] = useState(false);
   const lockRef = useRef(false);
   const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   const clearTimer = useCallback(() => {
      if (timerRef.current) {
         clearTimeout(timerRef.current);
         timerRef.current = null;
      }
   }, []);

   const release = useCallback(() => {
      clearTimer();
      lockRef.current = false;
      setLocked(false);
   }, [clearTimer]);

   useEffect(() => () => clearTimer(), [clearTimer]);

   const lock = useCallback(
      (action: () => void | Promise<void>) => {
         if (lockRef.current) return;
         lockRef.current = true;
         setLocked(true);

         const scheduleRelease = () => {
            timerRef.current = setTimeout(release, resetMs);
         };

         try {
            const result = action();
            if (
               result &&
               typeof (result as Promise<unknown>).finally === 'function'
            ) {
               (result as Promise<unknown>).finally(scheduleRelease);
            } else {
               scheduleRelease();
            }
         } catch (err) {
            release();
            throw err;
         }
      },
      [release, resetMs]
   );

   return { lock, locked };
}
