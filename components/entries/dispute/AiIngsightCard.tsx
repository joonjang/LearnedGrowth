// AiIngsightCard.tsx (AiInsightCard)

import { LearnedGrowthResponse } from '@/models/aiService';
import {
  cardBase,
  chipBase,
  sectionBlock as sectionBase,
} from '@/theme/components';
import { palette } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import ThreeDotsLoader from '../../ThreeDotLoader';

type Props = {
  data?: LearnedGrowthResponse | null;
  streamingText?: string;
  loading?: boolean;
  error?: string | null;
  highlightColors?: {
    permanence?: string;
    pervasiveness?: string;
    personalization?: string;
  };
  onPressIn?: (
    field: 'permanence' | 'pervasiveness' | 'personalization'
  ) => void;
  // clear callback
  onPressOut?: () => void;
  showPermanenceHighlight?: boolean;
  showPervasivenessHighlight?: boolean;
  showPersonalizationHighlight?: boolean;
};

type Score =
  | 'optimistic'
  | 'mixed'
  | 'pessimistic'
  | null
  | undefined
  | string;

function lightenHex(hex: string, amount = 0.2) {
  const clean = hex.replace('#', '');
  const num = parseInt(
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean,
    16
  );
  const r = Math.min(255, Math.round(((num >> 16) & 255) + 255 * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 255) + 255 * amount));
  const b = Math.min(255, Math.round((num & 255) + 255 * amount));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getScoreChip(score: Score) {
  switch (score) {
    case 'optimistic':
      return {
        label: 'Optimstic',
        containerStyle: styles.chipOptimistic,
        textStyle: styles.chipTextOptimistic,
      };
    case 'pessimistic':
      return {
        label: 'Pessimistic',
        containerStyle: styles.chipPessimistic,
        textStyle: styles.chipTextPessimistic,
      };
    case 'mixed':
      return {
        label: 'Mixed view',
        containerStyle: styles.chipMixed,
        textStyle: styles.chipTextMixed,
      };
    default:
      return {
        label: 'No clear pattern',
        containerStyle: styles.chipNeutral,
        textStyle: styles.chipTextNeutral,
      };
  }
}

export function AiInsightCard({
  data,
  streamingText,
  loading,
  error,
  highlightColors,
  onPressIn,
  onPressOut,
  showPermanenceHighlight,
  showPervasivenessHighlight,
  showPersonalizationHighlight,
}: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Thinking with you…</Text>
        <ThreeDotsLoader />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.title}>AI couldn’t respond</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Thinking with you…</Text>
        {streamingText ? (
          <Text style={styles.subText}>
            Still working on your insight.
          </Text>
        ) : (
          <Text style={styles.subText}>Waiting for your entry.</Text>
        )}
        <ThreeDotsLoader />
      </View>
    );
  }

  const { safety, analysis, suggestions } = data;
  const { dimensions: dims, emotionalLogic } = analysis;
  const showCrisis = safety.isCrisis;

  const permanenceChip = getScoreChip(dims.permanence.score);
  const pervasivenessChip = getScoreChip(dims.pervasiveness.score);
  const personalizationChip = getScoreChip(dims.personalization.score);

  const permanenceLabelStyle = highlightColors?.permanence
    ? {
        backgroundColor: lightenHex(highlightColors.permanence, 0.12),
        color: '#111',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
      }
    : null;
  const pervasivenessLabelStyle = highlightColors?.pervasiveness
    ? {
        backgroundColor: lightenHex(highlightColors.pervasiveness, 0.12),
        color: '#111',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
      }
    : null;
  const personalizationLabelStyle = highlightColors?.personalization
    ? {
        backgroundColor: lightenHex(highlightColors.personalization, 0.12),
        color: '#111',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
      }
    : null;

  return (
    <View style={styles.card}>
      {/* Crisis banner */}
      {showCrisis && (
        <View style={styles.crisisBanner}>
          <Text style={styles.crisisTitle}>You deserve support</Text>
          {safety.crisisMessage ? (
            <Text style={styles.crisisText}>{safety.crisisMessage}</Text>
          ) : (
            <Text style={styles.crisisText}>
              It sounds like you might be in crisis. Please reach out to
              local emergency services or a crisis line right away.
            </Text>
          )}
        </View>
      )}

      {/* Emotional validation */}
      <View style={styles.sectionBlock}>
        <Text style={styles.title}>Your reaction makes sense</Text>
        {!!emotionalLogic && (
          <Text style={styles.bodyText}>{emotionalLogic}</Text>
        )}
      </View>

      {/* How your mind is seeing this */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>How your mind is seeing this</Text>

        {/* Permanence */}
        <Pressable
          onPressIn={() => onPressIn?.('permanence')}
          // If it's a simple tap (no scroll), onPress fires on release and clears
          onPress={() => onPressOut?.()}
          style={({ pressed }) => [
            styles.dimensionRow,
            (pressed || showPermanenceHighlight) &&
              styles.dimensionRowPressed,
          ]}
        >
          <View style={styles.dimensionHeaderRow}>
            <Text style={[styles.dimensionLabel, permanenceLabelStyle]}>
              How long it feels
            </Text>
            <View
              style={[styles.chip, permanenceChip.containerStyle]}
            >
              <Text style={permanenceChip.textStyle}>
                {permanenceChip.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dimensionText}>
            {dims.permanence.insight || 'No clear pattern here.'}
          </Text>
        </Pressable>

        {/* Pervasiveness */}
        <Pressable
          onPressIn={() => onPressIn?.('pervasiveness')}
          onPress={() => onPressOut?.()}
          style={({ pressed }) => [
            styles.dimensionRow,
            (pressed || showPervasivenessHighlight) &&
              styles.dimensionRowPressed,
          ]}
        >
          <View style={styles.dimensionHeaderRow}>
            <Text
              style={[styles.dimensionLabel, pervasivenessLabelStyle]}
            >
              How big it feels
            </Text>
            <View
              style={[styles.chip, pervasivenessChip.containerStyle]}
            >
              <Text style={pervasivenessChip.textStyle}>
                {pervasivenessChip.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dimensionText}>
            {dims.pervasiveness.insight || 'No clear pattern here.'}
          </Text>
        </Pressable>

        {/* Personalization */}
        <Pressable
          onPressIn={() => onPressIn?.('personalization')}
          onPress={() => onPressOut?.()}
          style={({ pressed }) => [
            styles.dimensionRow,
            (pressed || showPersonalizationHighlight) &&
              styles.dimensionRowPressed,
          ]}
        >
          <View style={styles.dimensionHeaderRow}>
            <Text
              style={[styles.dimensionLabel, personalizationLabelStyle]}
            >
              Where blame goes
            </Text>
            <View
              style={[
                styles.chip,
                personalizationChip.containerStyle,
              ]}
            >
              <Text style={personalizationChip.textStyle}>
                {personalizationChip.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dimensionText}>
            {dims.personalization.insight || 'No clear pattern here.'}
          </Text>
        </Pressable>
      </View>

      {/* Another way to talk to yourself */}
      {suggestions.counterBelief ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Another way to see it</Text>
          <View style={styles.counterBubble}>
            <Text style={styles.counterText}>
              {suggestions.counterBelief}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardBase,
    backgroundColor: '#f5f5f7',
    gap: 12,
  },
  title: {
    ...typography.title,
    marginBottom: 4,
  },
  subText: {
    ...typography.body,
    color: '#666',
    marginTop: 4,
  },
  sectionBlock: {
    ...sectionBase,
  },
  sectionTitle: {
    ...typography.subtitle,
  },
  bodyText: {
    ...typography.body,
  },
  dimensionRow: {
    marginTop: 8,
    gap: 2,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: '#f8fafc',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dimensionRowDisabled: {
    opacity: 0.7,
  },
  dimensionRowPressed: {
    transform: [{ scale: 0.97 }, { translateY: 1 }],
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dimensionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dimensionLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: '#666',
  },
  dimensionText: {
    ...typography.body,
    color: '#333',
  },
  counterBubble: {
    marginTop: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: palette.cardBg,
  },
  counterText: {
    ...typography.body,
    color: '#222',
  },
  errorCard: {
    backgroundColor: '#ffe6e6',
  },
  errorText: {
    ...typography.body,
    color: '#a00',
  },
  crisisBanner: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#ffe5e5',
    marginBottom: 4,
  },
  crisisTitle: {
    ...typography.subtitle,
    color: '#a00000',
    marginBottom: 2,
  },
  crisisText: {
    ...typography.body,
    color: '#a00000',
    fontSize: 13,
  },

  // chips
  chip: {
    ...chipBase,
  },
  chipOptimistic: {
    backgroundColor: '#b7faccff',
    borderWidth: 0,
  },
  chipTextOptimistic: {
    ...typography.chip,
    color: '#1b7b3c',
  },
  chipPessimistic: {
    backgroundColor: '#ffe5e5',
    borderWidth: 0,
  },
  chipTextPessimistic: {
    ...typography.chip,
    color: '#a00000',
  },
  chipMixed: {
    backgroundColor: '#fff4e0',
    borderWidth: 0,
  },
  chipTextMixed: {
    ...typography.chip,
    color: '#b46a00',
  },
  chipNeutral: {
    backgroundColor: '#ececf0',
    borderWidth: 0,
  },
  chipTextNeutral: {
    ...typography.chip,
    color: '#585870',
  },
});
