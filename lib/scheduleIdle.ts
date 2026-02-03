export const scheduleIdle = (work: () => void, fallbackDelayMs = 50) => {
   const idle = globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
   };

   if (typeof idle.requestIdleCallback === 'function') {
      const idleId = idle.requestIdleCallback(() => {
         work();
      });
      return () => idle.cancelIdleCallback?.(idleId);
   }

   const timeoutId = setTimeout(work, fallbackDelayMs);
   return () => clearTimeout(timeoutId);
};
