export class TestClock {
   private current: string;

   constructor(start = "2025-09-11T00:00:00.000Z") {
      this.current = start;
   }

   // Always return the "current" time
   nowIso() {
      return this.current;
   }

   // Manually set the clock to a new time
   set(iso: string) {
      this.current = iso;
   }

   // Move time forward by some milliseconds
   advanceMs(ms: number) {
      const t = new Date(this.current).getTime();
      this.current = new Date(t + ms).toISOString();
   }
}
