import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AiInsightCard } from '@/components/entries/AiIngsightCard';
import ThreeDotsLoader from '@/components/ThreeDotLoader';
import { HighlightMap, HighlightedText } from '@/components/entries/highlightUtils';
import { Entry } from '@/models/entry';
import { LearnedGrowthResponse } from '@/models/aiService';

type Props = {
  entry: Entry;
  highlights: {
    permanence: HighlightMap;
    pervasiveness: HighlightMap;
    personalization: HighlightMap;
  };
  showPermanenceHighlight: boolean;
  showPervasivenessHighlight: boolean;
  showPersonalizationHighlight: boolean;
  aiData?: LearnedGrowthResponse | null;
  loading: boolean;
  error?: string | null;
  streamingText?: string;
  highlightColors?: {
    permanence?: string;
    pervasiveness?: string;
    personalization?: string;
  };
  onGoToSteps?: () => void;
  onPressIn?: (field: 'permanence' | 'pervasiveness' | 'personalization') => void;
  onPressOut?: (field: 'permanence' | 'pervasiveness' | 'personalization') => void;
};

export default function ABCAnalysis({
  entry,
  highlights,
  showPermanenceHighlight,
  showPervasivenessHighlight,
  showPersonalizationHighlight,
  aiData,
  loading,
  error,
  streamingText,
  highlightColors,
  onGoToSteps,
  onPressIn,
  onPressOut,
}: Props) {
  const activeHighlights: HighlightMap = {
    adversity: [
      ...(showPermanenceHighlight ? highlights.permanence.adversity : []),
      ...(showPervasivenessHighlight ? highlights.pervasiveness.adversity : []),
      ...(showPersonalizationHighlight ? highlights.personalization.adversity : []),
    ],
    belief: [
      ...(showPermanenceHighlight ? highlights.permanence.belief : []),
      ...(showPervasivenessHighlight ? highlights.pervasiveness.belief : []),
      ...(showPersonalizationHighlight ? highlights.personalization.belief : []),
    ],
    consequence: [
      ...(showPermanenceHighlight ? highlights.permanence.consequence : []),
      ...(showPervasivenessHighlight ? highlights.pervasiveness.consequence : []),
      ...(showPersonalizationHighlight ? highlights.personalization.consequence : []),
    ],
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingTop: 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        <Text style={styles.text}>AI Insight</Text>
        
      </View>

      <View style={{ flex: 1 }}>
        <View style={[styles.contextBox]}>
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>Adversity</Text>
            <HighlightedText text={entry.adversity} highlights={activeHighlights.adversity} />
          </View>
          <View style={styles.contextDivider} />
          <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>Belief</Text>
            <HighlightedText text={entry.belief} highlights={activeHighlights.belief} />
          </View>
          {entry.consequence && (
            <>
              <View style={styles.contextDivider} />
              <View style={styles.contextRow}>
                <Text style={styles.contextLabel}>Consequence</Text>
                <HighlightedText
                  text={entry.consequence}
                  highlights={activeHighlights.consequence}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {loading ? (
          <ThreeDotsLoader />
        ) : error ? (
          <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.title}>AI couldn’t respond</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : aiData ? (
          <AiInsightCard
            data={aiData}
            streamingText={streamingText}
            loading={loading}
            error={error}
            highlightColors={highlightColors}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          />
        ) : (
          <Text style={styles.subText}>Waiting for AI insight…</Text>
        )}

        {onGoToSteps && aiData ? (
          <Pressable style={styles.switchButton} onPress={onGoToSteps}>
            <Text style={styles.switchButtonText}>Dispute your belief</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: 16,
    paddingBottom: 48,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: { fontSize: 16, fontWeight: '500' },
  switchButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contextBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  contextRow: { gap: 4 },
  contextLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contextDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
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
  errorCard: {
    backgroundColor: '#ffe6e6',
  },
  errorText: {
    fontSize: 14,
    color: '#a00',
  },
});
