import { useEffect, useState } from 'react';

export function useCooldownLabel(
   isCoolingDown: boolean,
   lastUpdate: Date,
   cooldownMinutes: number
) {
   const [timeLabel, setTimeLabel] = useState('');

   useEffect(() => {
      if (!isCoolingDown) return;
      const unlockTime = lastUpdate.getTime() + cooldownMinutes * 60000;
      const updateTimer = () => {
         const currentNow = new Date().getTime();
         const diff = unlockTime - currentNow;
         if (diff <= 0) {
            setTimeLabel('');
         } else {
            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLabel(
               `${m.toString().padStart(2, '0')}:${s
                  .toString()
                  .padStart(2, '0')}`
            );
         }
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
   }, [cooldownMinutes, isCoolingDown, lastUpdate]);

   return timeLabel;
}
