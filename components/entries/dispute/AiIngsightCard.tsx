// AiIngsightCard.tsx (AiInsightCard)

import { LearnedGrowthResponse } from '@/models/aiService';
import { makeThemedStyles } from '@/theme/theme';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import ThreeDotsLoader from '../../ThreeDotLoader';
import { useTheme } from '@/theme/theme';

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

type Score = 'optimistic' | 'mixed' | 'pessimistic' | null | undefined | string;

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
   const { colors } = useTheme();
   const styles = useStyles();

   const getScoreChip = (score: Score) => {
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
   };

   if (error) {
      return (
         <View style={[styles.card, styles.errorCard]}>
            <Text style={styles.title}>AI couldn’t respond</Text>
            <Text style={styles.errorText}>{error}</Text>
         </View>
      );
   }

   const MAX_VISIBLE_CHARS = 250; // tune this to what looks good in your UI

   const renderStreamingText =
      streamingText && streamingText.length > MAX_VISIBLE_CHARS
         ? '…' + streamingText.slice(-MAX_VISIBLE_CHARS)
         : streamingText;

   if (!data) {
      return (
         <View style={styles.card}>
            <ThreeDotsLoader />
            <View style={styles.streamingPreview}>
               <Text style={styles.streamingLabel}>Received data</Text>
               <Text style={styles.streamingCode}>{renderStreamingText}</Text>
            </View>
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
           color: colors.text,
           paddingHorizontal: 6,
           paddingVertical: 2,
           borderRadius: 6,
        }
      : null;
   const pervasivenessLabelStyle = highlightColors?.pervasiveness
      ? {
           backgroundColor: lightenHex(highlightColors.pervasiveness, 0.12),
           color: colors.text,
           paddingHorizontal: 6,
           paddingVertical: 2,
           borderRadius: 6,
        }
      : null;
   const personalizationLabelStyle = highlightColors?.personalization
      ? {
           backgroundColor: lightenHex(highlightColors.personalization, 0.12),
           color: colors.text,
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
            <Text style={styles.sectionTitle}>
               How your mind is seeing this
            </Text>

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
                  <View style={[styles.chip, permanenceChip.containerStyle]}>
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
                  <View style={[styles.chip, pervasivenessChip.containerStyle]}>
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
                     style={[styles.chip, personalizationChip.containerStyle]}
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

const useStyles = makeThemedStyles(({ colors, typography, components }) => {
   const chipBase = {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      alignSelf: 'flex-start',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      borderWidth: StyleSheet.hairlineWidth,
   } as const;

   return StyleSheet.create({
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
         height: 20,
         margin: 8,
         overflow: 'hidden',
         marginTop: 4,
      },
      streamingPreview: {
         backgroundColor: colors.surface,
         borderRadius: 12,
         padding: 10,
         marginTop: 8,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
      },
      streamingLabel: {
         ...typography.caption,
         letterSpacing: 0.5,
         color: colors.textSubtle,
         marginBottom: 4,
      },
      streamingCode: {
         fontFamily: Platform.select({
            ios: 'Menlo',
            android: 'monospace',
            default: 'Courier',
         }),
         fontSize: 12,
         color: colors.text,
         lineHeight: 18,
      },
      sectionBlock: {
         ...components.sectionBlock,
      },
      sectionTitle: {
         ...typography.subtitle,
      },
      bodyText: {
         ...typography.body,
      },
      dimensionRow: {
         marginTop: 8,
         gap: 6,
         padding: 12,
         borderRadius: 10,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         backgroundColor: colors.cardBg,
         shadowColor: colors.shadowColor,
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
         borderColor: colors.disputeCTA,
         shadowColor: colors.shadowColor,
         shadowOpacity: 0.08,
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
         color: colors.textSubtle,
      },
      dimensionText: {
         ...typography.body,
         color: colors.text,
      },
      counterBubble: {
         marginTop: 4,
         padding: 10,
         borderRadius: 12,
         backgroundColor: colors.cardInput,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
      },
      counterText: {
         ...typography.body,
         color: colors.text,
      },
      errorCard: {
         backgroundColor: colors.accentBeliefBg,
         borderColor: colors.accentBeliefBorder,
      },
      errorText: {
         ...typography.body,
         color: colors.accentBeliefText,
      },
      crisisBanner: {
         borderRadius: 12,
         padding: 10,
         backgroundColor: colors.accentBeliefBg,
         marginBottom: 4,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.accentBeliefBorder,
      },
      crisisTitle: {
         ...typography.subtitle,
         color: colors.accentBeliefText,
         marginBottom: 2,
      },
      crisisText: {
         ...typography.body,
         color: colors.accentBeliefText,
         fontSize: 13,
      },
      // chips
      chip: {
         ...chipBase,
      },
      chipOptimistic: {
         backgroundColor: colors.accentDisputeBg,
         borderColor: colors.accentDisputeBorder,
      },
      chipTextOptimistic: {
         ...typography.chip,
         color: colors.accentDisputeText,
      },
      chipPessimistic: {
         backgroundColor: colors.accentBeliefBg,
         borderColor: colors.accentBeliefBorder,
      },
      chipTextPessimistic: {
         ...typography.chip,
         color: colors.accentBeliefText,
      },
      chipMixed: {
         backgroundColor: colors.cardInput,
         borderColor: colors.border,
      },
      chipTextMixed: {
         ...typography.chip,
         color: colors.text,
      },
      chipNeutral: {
         backgroundColor: colors.cardGrey,
         borderColor: colors.border,
      },
      chipTextNeutral: {
         ...typography.chip,
         color: colors.textSubtle,
      },
   });
});
