// ABCAnalysis.tsx

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AiInsightCard } from '@/components/entries/dispute/AiIngsightCard';
import {
   HighlightMap,
   HighlightedText,
} from '@/components/entries/highlightUtils';
import { Entry } from '@/models/entry';
import { LearnedGrowthResponse } from '@/models/aiService';
import { makeThemedStyles } from '@/theme/theme';

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
   onPressIn?: (
      field: 'permanence' | 'pervasiveness' | 'personalization'
   ) => void;
   // now just a "clear" callback
   onPressOut?: () => void;
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
   const styles = useStyles();
   const activeHighlights: HighlightMap = {
      adversity: [
         ...(showPermanenceHighlight ? highlights.permanence.adversity : []),
         ...(showPervasivenessHighlight
            ? highlights.pervasiveness.adversity
            : []),
         ...(showPersonalizationHighlight
            ? highlights.personalization.adversity
            : []),
      ],
      belief: [
         ...(showPermanenceHighlight ? highlights.permanence.belief : []),
         ...(showPervasivenessHighlight ? highlights.pervasiveness.belief : []),
         ...(showPersonalizationHighlight
            ? highlights.personalization.belief
            : []),
      ],
      consequence: [
         ...(showPermanenceHighlight ? highlights.permanence.consequence : []),
         ...(showPervasivenessHighlight
            ? highlights.pervasiveness.consequence
            : []),
         ...(showPersonalizationHighlight
            ? highlights.personalization.consequence
            : []),
      ],
   };

   return (
      <ScrollView
         style={styles.scroll}
         contentContainerStyle={[styles.scrollContent, { paddingTop: 24 }]}
         keyboardShouldPersistTaps="always"
         showsVerticalScrollIndicator={false}
         // when scrolling gesture ends, clear the highlight
         onScrollEndDrag={() => onPressOut?.()}
         onMomentumScrollEnd={() => onPressOut?.()}
      >
         <View style={styles.container}>
            <Text style={styles.text}>AI Insight</Text>
         </View>

         <View style={styles.contentCard}>
            <View style={[styles.contextBox]}>
               <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Adversity</Text>
                  <HighlightedText
                     text={entry.adversity}
                     highlights={activeHighlights.adversity}
                  />
               </View>
               <View style={styles.contextDivider} />
               <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Belief</Text>
                  <HighlightedText
                     text={entry.belief}
                     highlights={activeHighlights.belief}
                  />
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

         <View style={styles.contentCard}>

               <AiInsightCard
                  data={aiData}
                  streamingText={streamingText}
                  loading={loading}
                  error={error}
                  highlightColors={highlightColors}
                  onPressIn={onPressIn}
                  onPressOut={onPressOut}
                  showPermanenceHighlight={showPermanenceHighlight}
                  showPervasivenessHighlight={showPervasivenessHighlight}
                  showPersonalizationHighlight={showPersonalizationHighlight}
               />
     

            {onGoToSteps && aiData ? (
               <Pressable style={styles.switchButton} onPress={onGoToSteps}>
                  <Text style={styles.switchButtonText}>
                     Dispute your belief
                  </Text>
               </Pressable>
            ) : null}
         </View>
      </ScrollView>
   );
}

const useStyles = makeThemedStyles(
   ({ colors, typography, components, shadows }) =>
      StyleSheet.create({
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
         contentCard: {
            flex: 1,
            ...shadows.shadowSoft,
         },
         text: { ...typography.body, fontSize: 16, fontWeight: '500' },
         switchButton: {
            marginTop: 16,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: colors.disputeCTA,
            alignItems: 'center',
            justifyContent: 'center',
            ...shadows.shadowSoft,
         },
         switchButtonText: {
            ...typography.body,
            fontSize: 16,
            fontWeight: '600',
            color: colors.ctaText,
         },
         contextBox: {
            ...components.compactCard,
            backgroundColor: colors.cardGrey,
            gap: 10,
         },
         contextRow: { gap: 4 },
         contextLabel: {
            ...typography.caption,
            fontWeight: '700',
            color: colors.textSubtle,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
         },
         contextDivider: {
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 2,
         },
         card: {
            ...components.cardBase,
            backgroundColor: colors.cardGrey,
            gap: 12,
         },
         title: {
            ...typography.title,
            marginBottom: 4,
         },
         subText: {
            ...typography.body,
            color: colors.textSubtle,
            marginTop: 4,
         },
         errorCard: {
            backgroundColor: colors.accentBeliefBg,
            borderColor: colors.accentBeliefBorder,
            borderWidth: StyleSheet.hairlineWidth,
         },
         errorText: {
            ...typography.body,
            color: colors.accentBeliefText,
         },
      })
);
