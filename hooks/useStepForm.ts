import { useCallback, useMemo, useState } from 'react';

type StepFormOptions<K extends string, F extends Record<K, string>> = {
  steps: readonly K[];
  initialForm: F;
};

export function useStepForm<K extends string, F extends Record<K, string>>({
  steps,
  initialForm,
}: StepFormOptions<K, F>) {
  const [idx, setIdx] = useState(0);
  const [visited, setVisited] = useState<Set<K>>(new Set());
  const [form, setForm] = useState<F>(initialForm);

  const currKey = useMemo(() => steps[idx], [idx, steps]);
  const totalSteps = steps.length;
  const canGoBack = idx > 0;
  const isLast = idx === totalSteps - 1;
  const currentEmpty = !(form[currKey]?.trim());

  const setField = useCallback(
    (k: K) => (v: string) =>
      setForm((prev) => ({
        ...prev,
        [k]: v,
      })),
    []
  );

  const goNext = useCallback(
    (onSubmit?: () => void) => {
      if (isLast) {
        onSubmit?.();
      } else {
        setIdx((i) => Math.min(i + 1, totalSteps - 1));
      }
    },
    [isLast, totalSteps]
  );

  const goBack = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  return {
    idx,
    currKey,
    form,
    setForm,
    setField,
    visited,
    setVisited,
    canGoBack,
    isLast,
    currentEmpty,
    goNext,
    goBack,
    totalSteps,
  };
}
