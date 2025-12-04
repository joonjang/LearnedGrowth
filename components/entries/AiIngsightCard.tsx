import { LearnedGrowthResponse } from '@/models/aiService';
import { View, Text, StyleSheet } from 'react-native';
import ThreeDotsLoader from '../ThreeDotLoader';

type Props = {
  data?: LearnedGrowthResponse | null;
  streamingText?: string;
  loading?: boolean;
  error?: string | null;
};

type Score = 'optimistic' | 'mixed' | 'pessimistic' | null | undefined;

function getScoreChip(score: Score) {
  switch (score) {
    case 'optimistic':
      return {
        label: 'Helpful',
        containerStyle: styles.chipOptimistic,
        textStyle: styles.chipTextOptimistic,
      };
    case 'pessimistic':
      return {
        label: 'Unhelpful',
        containerStyle: styles.chipPessimistic,
        textStyle: styles.chipTextPessimistic,
      };
    case 'mixed':
      return {
        label: 'A bit mixed',
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

export function AiInsightCard({ data, streamingText, loading, error }: Props) {
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
          <Text style={styles.subText}>Still working on your insight.</Text>
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
              It sounds like you might be in crisis. Please reach out to local
              emergency services or a crisis line right away.
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
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeaderRow}>
            <Text style={styles.dimensionLabel}>Time</Text>
            <View style={[styles.chip, permanenceChip.containerStyle]}>
              <Text style={permanenceChip.textStyle}>
                {permanenceChip.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dimensionText}>
            {dims.permanence.insight || 'No clear pattern here.'}
          </Text>
        </View>

        {/* Pervasiveness */}
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeaderRow}>
            <Text style={styles.dimensionLabel}>How big it feels</Text>
            <View style={[styles.chip, pervasivenessChip.containerStyle]}>
              <Text style={pervasivenessChip.textStyle}>
                {pervasivenessChip.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dimensionText}>
            {dims.pervasiveness.insight || 'No clear pattern here.'}
          </Text>
        </View>

        {/* Personalization */}
        <View style={styles.dimensionRow}>
          <View style={styles.dimensionHeaderRow}>
            <Text style={styles.dimensionLabel}>Who gets the blame</Text>
            <View style={[styles.chip, personalizationChip.containerStyle]}>
              <Text style={personalizationChip.textStyle}>
                {personalizationChip.label}
              </Text>
            </View>
          </View>
          <Text style={styles.dimensionText}>
            {dims.personalization.insight || 'No clear pattern here.'}
          </Text>
        </View>
      </View>

      {/* Questions to reflect on */}
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Questions to think about</Text>

        {suggestions.evidenceQuestion ? (
          <View style={styles.questionRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.questionText}>
              {suggestions.evidenceQuestion}
            </Text>
          </View>
        ) : null}

        {suggestions.alternativesQuestion ? (
          <View style={styles.questionRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.questionText}>
              {suggestions.alternativesQuestion}
            </Text>
          </View>
        ) : null}

        {suggestions.usefulnessQuestion ? (
          <View style={styles.questionRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.questionText}>
              {suggestions.usefulnessQuestion}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Another way to talk to yourself */}
      {suggestions.counterBelief ? (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Another way you could say it</Text>
          <View style={styles.counterBubble}>
            <Text style={styles.counterText}>{suggestions.counterBelief}</Text>
          </View>
          <Text style={styles.helperText}>
            You can use this as-is, or tweak the wording to sound more like you.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#f5f5f7',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionBlock: {
    marginTop: 4,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  bodyText: {
    fontSize: 14,
    color: '#333',
  },
  dimensionRow: {
    marginTop: 8,
    gap: 2,
  },
  dimensionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dimensionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  dimensionText: {
    fontSize: 14,
    color: '#333',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  bullet: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  counterBubble: {
    marginTop: 4,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  counterText: {
    fontSize: 14,
    color: '#222',
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: '#777',
  },
  errorCard: {
    backgroundColor: '#ffe6e6',
  },
  errorText: {
    fontSize: 14,
    color: '#a00',
  },
  crisisBanner: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#ffe5e5',
    marginBottom: 4,
  },
  crisisTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a00000',
    marginBottom: 2,
  },
  crisisText: {
    fontSize: 13,
    color: '#a00000',
  },

  // chips
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  chipOptimistic: {
    backgroundColor: '#e3f8ea',
    borderWidth: 0,
  },
  chipTextOptimistic: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1b7b3c',
  },
  chipPessimistic: {
    backgroundColor: '#ffe5e5',
    borderWidth: 0,
  },
  chipTextPessimistic: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a00000',
  },
  chipMixed: {
    backgroundColor: '#fff4e0',
    borderWidth: 0,
  },
  chipTextMixed: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b46a00',
  },
  chipNeutral: {
    backgroundColor: '#ececf0',
    borderWidth: 0,
  },
  chipTextNeutral: {
    fontSize: 11,
    fontWeight: '600',
    color: '#585870',
  },
});
