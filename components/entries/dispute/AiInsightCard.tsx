import {
   AI_ANALYSIS_CREDIT_COST,
   FREE_MONTHLY_CREDITS,
} from '@/components/constants';
import { LearnedGrowthResponse } from '@/models/aiService';
import { useAuth } from '@/providers/AuthProvider';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';

import { AiInsightCreditShopSheet } from '../../CreditShopSheet';
import { getAiInsightAnimationTimeline } from './aiInsightCard/animation';
import {
   AiInsightCrisisBanner,
   AiInsightDisclaimer,
   AiInsightEmotionalValidation,
   AiInsightErrorState,
   AiInsightHeader,
   AiInsightLoadingState,
   AiInsightMinimizedState,
   AiInsightStaleBanner,
   AiInsightSuggestion,
   AiInsightThinkingPatterns,
} from './aiInsightCard/sections';
import { useCooldownLabel } from './aiInsightCard/useCooldownLabel';

type RefreshWindowState = {
   timestamps: number[];
   lastRetryCount: number;
};

const refreshWindowStore = new Map<string, RefreshWindowState>();

type Props = {
   entryId?: string;
   data?: LearnedGrowthResponse | null;
   streamingText?: string;
   loading?: boolean;
   error?: string | null;
   onRefresh?: () => void;
   retryCount?: number;
   maxRetries?: number;
   updatedAt?: string;
   allowMinimize?: boolean;
   initiallyMinimized?: boolean;
};

export function AiInsightCard({
   entryId,
   data,
   streamingText,
   error,
   onRefresh,
   retryCount = 0,
   maxRetries = 3,
   updatedAt,
   allowMinimize = false,
   initiallyMinimized = false,
}: Props) {
   const refreshWindowKey = entryId ?? 'ai-insight-default';
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { profile, status, refreshProfile, refreshProfileIfStale } = useAuth();
   const isFreePlan = profile?.plan === 'free';
   const shopSheetRef = useRef<BottomSheetModal>(null);

   // --- STATE ---
   const [showDefinitions, setShowDefinitions] = useState(false);
   const [isMinimized, setIsMinimized] = useState(
      allowMinimize && initiallyMinimized
   );

   const toggleHelp = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowDefinitions(!showDefinitions);
   };

   const toggleMinimized = () => {
      if (!allowMinimize) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsMinimized((prev) => !prev);
   };

   useEffect(() => {
      if (!allowMinimize) {
         setIsMinimized(false);
         return;
      }
      setIsMinimized(Boolean(initiallyMinimized));
   }, [allowMinimize, initiallyMinimized]);

   // --- CREDITS & COOLDOWN LOGIC ---
   const availableCredits = useMemo(() => {
      if (!profile) return null;
      return (
         Math.max(FREE_MONTHLY_CREDITS - (profile.aiCycleUsed ?? 0), 0) +
         (profile.extraAiCredits ?? 0)
      );
   }, [profile]);

   const refreshCostNote = useMemo(() => {
      if (!isFreePlan) return null;
      const costSuffix = AI_ANALYSIS_CREDIT_COST === 1 ? '' : 's';
      if (availableCredits === null) {
         return `Costs ${AI_ANALYSIS_CREDIT_COST} credit${costSuffix}.`;
      }
      const remainingSuffix = availableCredits === 1 ? '' : 's';
      return `Costs ${AI_ANALYSIS_CREDIT_COST} credit${costSuffix} • ${availableCredits} credit${remainingSuffix} left`;
   }, [availableCredits, isFreePlan]);

   const COOLDOWN_MINUTES = 2;
   const windowMs = COOLDOWN_MINUTES * 60000;
   const [nowMs, setNowMs] = useState(() => Date.now());
   const lastUpdate = useMemo(
      () => (updatedAt ? new Date(updatedAt) : new Date()),
      [updatedAt]
   );

   useEffect(() => {
      const interval = setInterval(() => setNowMs(Date.now()), 1000);
      return () => clearInterval(interval);
   }, []);

   useEffect(() => {
      const snapshot =
         refreshWindowStore.get(refreshWindowKey) ?? {
            timestamps: [],
            lastRetryCount: retryCount,
         };

      let timestamps = [...snapshot.timestamps];
      let lastRetryCount = snapshot.lastRetryCount;

      if (retryCount < lastRetryCount) {
         timestamps = [];
         lastRetryCount = retryCount;
      }

      if (retryCount > lastRetryCount) {
         const delta = retryCount - lastRetryCount;
         const timestampMs = Date.now();
         for (let i = 0; i < delta; i += 1) {
            timestamps.push(timestampMs);
         }
         lastRetryCount = retryCount;
      }

      refreshWindowStore.set(refreshWindowKey, {
         timestamps,
         lastRetryCount,
      });
   }, [data?.createdAt, refreshWindowKey, retryCount]);

   useEffect(() => {
      const snapshot = refreshWindowStore.get(refreshWindowKey);
      if (!snapshot || snapshot.timestamps.length === 0) return;
      const windowStart = nowMs - windowMs;
      const pruned = snapshot.timestamps.filter(
         (timestamp) => timestamp >= windowStart
      );
      if (pruned.length !== snapshot.timestamps.length) {
         refreshWindowStore.set(refreshWindowKey, {
            ...snapshot,
            timestamps: pruned,
         });
      }
   }, [nowMs, refreshWindowKey, windowMs]);

   const refreshWindowSnapshot = refreshWindowStore.get(refreshWindowKey);
   const windowStart = nowMs - windowMs;
   const timestampsInWindow = (
      refreshWindowSnapshot?.timestamps ?? []
   ).filter((timestamp) => timestamp >= windowStart);
   const refreshesInWindow = timestampsInWindow.length;
   const isCoolingDown = refreshesInWindow >= maxRetries;
   const isNudgeStep = refreshesInWindow === maxRetries - 1;
   const cooldownAnchor =
      isCoolingDown && timestampsInWindow.length > 0
         ? new Date(timestampsInWindow[0])
         : lastUpdate;

   useEffect(() => {
      if (status !== 'signedIn') return;
      refreshProfileIfStale();
   }, [refreshProfileIfStale, status]);

   const timeLabel = useCooldownLabel(
      isCoolingDown,
      cooldownAnchor,
      COOLDOWN_MINUTES
   );

   // --- FRESHNESS LOGIC ---
   const isFreshAnalysis = useMemo(() => {
      if (!data?.createdAt) return false;
      const diffMs = new Date().getTime() - new Date(data.createdAt).getTime();
      return diffMs < 20000; // Only animate if created in last 20s
   }, [data?.createdAt]);

   // --- RENDER HELPERS ---
   const MAX_VISIBLE_CHARS = 120;
   const renderStreamingText =
      streamingText && streamingText.length > MAX_VISIBLE_CHARS
         ? '…' + streamingText.slice(-MAX_VISIBLE_CHARS)
         : streamingText;
   const isLoading = !data && !error;

   const openShopSheet = () => {
      shopSheetRef.current?.present();
   };

   const handleShopSuccess = async () => {
      shopSheetRef.current?.dismiss();
      if (status === 'signedIn') {
         try {
            await refreshProfile();
         } catch (err) {
            console.warn('Failed to refresh credits after purchase', err);
         }
      }
   };

   const handleRefreshPress = async () => {
      const noCredits = availableCredits !== null && availableCredits <= 0;
      if (noCredits) {
         openShopSheet();
         return;
      }
      try {
         await onRefresh?.();
      } finally {
         if (status === 'signedIn') {
            refreshProfile();
         }
      }
   };

   // --- ANIMATION TIMINGS ---
   const animationTimeline = useMemo(
      () => getAiInsightAnimationTimeline(isFreshAnalysis),
      [isFreshAnalysis]
   );

   // --- VARIABLES FOR RENDER ---
   const safety = data?.safety;
   const analysis = data?.analysis;
   const suggestions = data?.suggestions;
   const isStale = data?.isStale;
   const dims = analysis?.dimensions;
   const emotionalLogic = analysis?.emotionalLogic;
   const previewText = suggestions?.counterBelief || emotionalLogic;

   const iconColor = isDark ? '#818cf8' : '#4f46e5'; 
   const textColor = 'text-slate-900 dark:text-slate-100';
   const descColor = 'text-slate-700 dark:text-slate-300';

   return (
      <Pressable
         onPress={allowMinimize ? toggleMinimized : undefined}
         style={{ opacity: 1 }}
      >
         <View className="w-full">
            <AiInsightHeader
               allowMinimize={allowMinimize}
               isMinimized={isMinimized}
               isStale={Boolean(isStale)}
               textColor={textColor}
               descColor={descColor}
               iconColor={iconColor}
               isDark={isDark}
            />

            {/* --- ERROR STATE --- */}
            {error && <AiInsightErrorState error={error} />}

            {/* --- LOADING STATE --- */}
            {isLoading && !error && (
               <AiInsightLoadingState
                  renderStreamingText={renderStreamingText}
               />
            )}

            {/* --- MINIMIZED STATE --- */}
            {data && isMinimized && (
               <AiInsightMinimizedState
                  previewText={previewText}
                  isDark={isDark}
               />
            )}

            {/* --- EXPANDED CONTENT --- */}
            {data && !isMinimized && (
               <View className="gap-6 pt-1">
                  <AiInsightStaleBanner
                     isStale={Boolean(isStale)}
                     isCoolingDown={isCoolingDown}
                     isNudgeStep={isNudgeStep}
                     refreshCostNote={refreshCostNote}
                     onRefresh={onRefresh}
                     onRefreshPress={handleRefreshPress}
                     timeLabel={timeLabel}
                     isDark={isDark}
                  />

                  <AiInsightCrisisBanner safety={safety} isDark={isDark} />

                  <AiInsightEmotionalValidation
                     emotionalLogic={emotionalLogic}
                     animationTimeline={animationTimeline}
                  />

                  <AiInsightThinkingPatterns
                     dims={dims}
                     showDefinitions={showDefinitions}
                     toggleHelp={toggleHelp}
                     animationTimeline={animationTimeline}
                     isFreshAnalysis={isFreshAnalysis}
                     isDark={isDark}
                  />

                  <AiInsightSuggestion
                     counterBelief={suggestions?.counterBelief}
                     animationTimeline={animationTimeline}
                  />

                  <AiInsightDisclaimer
                     allowMinimize={allowMinimize}
                     toggleMinimized={toggleMinimized}
                     animationTimeline={animationTimeline}
                     isDark={isDark}
                  />
               </View>
            )}
         </View>
         <AiInsightCreditShopSheet
            sheetRef={shopSheetRef}
            onDismiss={() => {}}
            onSuccess={handleShopSuccess}
            isDark={isDark}
         />
      </Pressable>
   );
}
