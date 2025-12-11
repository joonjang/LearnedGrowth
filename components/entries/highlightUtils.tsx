import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { makeThemedStyles } from '@/theme/theme';

export type Highlight = { phrase: string; color?: string };
export type HighlightMap = {
  adversity: Highlight[];
  belief: Highlight[];
  consequence: Highlight[];
};

function lightenHex(hex: string, amount = 0.12) {
  const clean = hex.replace('#', '');
  const normalized =
    clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(normalized, 16);
  const r = Math.min(255, Math.round(((num >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((num & 255) + 255 * amount));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function buildHighlightMap(
  entry:
    | {
        adversity?: string | null;
        belief?: string | null;
        consequence?: string | null;
      }
    | null
    | undefined,
  phrase?: string | null,
  color?: string
): HighlightMap {
  if (!entry || !phrase) return { adversity: [], belief: [], consequence: [] };
  const needle = phrase.trim();
  if (!needle) return { adversity: [], belief: [], consequence: [] };
  const lower = needle.toLowerCase();
  const map: HighlightMap = { adversity: [], belief: [], consequence: [] };
  if (entry.adversity?.toLowerCase().includes(lower)) {
    map.adversity.push({ phrase: needle, color });
  }
  if (entry.belief?.toLowerCase().includes(lower)) {
    map.belief.push({ phrase: needle, color });
  }
  if (entry.consequence?.toLowerCase().includes(lower)) {
    map.consequence.push({ phrase: needle, color });
  }
  return map;
}

function findMatches(text: string, phrase: string, color?: string) {
  const hay = text.toLowerCase();
  const needle = phrase.toLowerCase();
  const spans: { start: number; end: number; color?: string }[] = [];
  let idx = hay.indexOf(needle);
  while (idx !== -1) {
    spans.push({ start: idx, end: idx + needle.length, color });
    idx = hay.indexOf(needle, idx + needle.length);
  }
  return spans;
}

export function buildSegments(text: string, highlights: Highlight[]) {
  if (!highlights.length) return [text];

  const matches = highlights.flatMap((h) => findMatches(text, h.phrase, h.color));
  if (!matches.length) return [text];

  const boundaries = new Set<number>([0, text.length]);
  matches.forEach(({ start, end }) => {
    boundaries.add(start);
    boundaries.add(end);
  });
  const points = Array.from(boundaries).sort((a, b) => a - b);

  const segments: (string | { text: string; color?: string })[] = [];
  let overlapIndex = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    if (end <= start) continue;
    const slice = text.slice(start, end);
    const active = matches.filter((m) => m.start < end && m.end > start);

    if (!active.length) {
      segments.push(slice);
      continue;
    }

    let color: string | undefined;
    if (active.length === 1) {
      color = active[0].color;
    } else {
      color = active[overlapIndex % active.length].color || active[0].color;
      overlapIndex += 1;
    }
      segments.push({ text: slice, color });
  }

  return segments;
}

export function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: Highlight[];
}) {
  const styles = useStyles();
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  return (
    <Text style={styles.contextText}>
      {segments.map((seg, i) =>
        typeof seg === 'string' ? (
          <Text key={i}>{seg}</Text>
        ) : (
          <Text
            key={i}
            style={[
              styles.highlight,
              seg.color
                ? {
                    backgroundColor: lightenHex(seg.color, 0.12),
                    borderColor: seg.color,
                  }
                : styles.highlightDefault,
            ]}
          >
            {seg.text}
          </Text>
        )
      )}
    </Text>
  );
}

const useStyles = makeThemedStyles(({ colors }) =>
  StyleSheet.create({
    contextText: { fontSize: 14, color: colors.text },
    highlight: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    highlightDefault: {
      backgroundColor: colors.cardInput,
      borderColor: colors.borderStrong,
    },
  })
);
