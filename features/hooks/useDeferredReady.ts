// useDeferredReady.ts
import { useEffect, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";

type IdleHandle = number;

const hasRIC = typeof globalThis.requestIdleCallback === "function";
const ric = (cb: IdleRequestCallback, opts?: IdleRequestOptions): IdleHandle =>
  hasRIC ? (globalThis.requestIdleCallback as any)(cb, opts) : (setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as any), 0) as unknown as number);

const cancelRIC = (id: IdleHandle) =>
  hasRIC ? (globalThis.cancelIdleCallback as any)(id) : clearTimeout(id as unknown as number);

export function useDeferredReady(delayMs = 1200) {
  const isFocused = useIsFocused();
  const [ready, setReady] = useState(false);

  const rafRef = useRef<number | null>(null);
  const idleRef = useRef<IdleHandle | null>(null);
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // reset when screen blurs
    if (!isFocused) {
      setReady(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (idleRef.current) cancelRIC(idleRef.current);
      if (tRef.current) clearTimeout(tRef.current);
      rafRef.current = null;
      idleRef.current = null;
      tRef.current = null;
      return;
    }

    // 1) wait a frame so layout/transition commits
    rafRef.current = requestAnimationFrame(() => {
      // 2) wait for idle (with a safety timeout so it still fires under load)
      idleRef.current = ric(
        () => {
          // 3) add your grace delay (1–2s)
          tRef.current = setTimeout(() => setReady(true), delayMs);
        },
        { timeout: 500 } // ensures it runs even if never truly idle
      );
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (idleRef.current) cancelRIC(idleRef.current);
      if (tRef.current) clearTimeout(tRef.current);
      rafRef.current = null;
      idleRef.current = null;
      tRef.current = null;
    };
  }, [isFocused, delayMs]);

  return ready;
}
