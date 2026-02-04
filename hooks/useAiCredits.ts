import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useAppConfig } from '@/providers/AppConfigProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';

type AiCreditState = {
   canGenerate: boolean;
   isSignedIn: boolean;
   isSubscribed: boolean;
   availableCredits: number | null;
   aiCreditCost: number;
   loading: boolean;
};

export function useAiCredits(): AiCreditState {
   const { status, profile, loadingProfile } = useAuth();
   const { aiConfig } = useAppConfig();
   const { isGrowthPlusActive } = useRevenueCat();

   const isSignedIn = status === 'signedIn';
   const isSubscribed = isSignedIn && isGrowthPlusActive;
   const { freeMonthlyCredits, aiCreditCost } = aiConfig;

   const availableCredits = useMemo(() => {
      if (!profile) return null;
      const base = Math.max(freeMonthlyCredits - profile.aiCycleUsed, 0);
      return base + (profile.extraAiCredits ?? 0);
   }, [freeMonthlyCredits, profile]);

   const canGenerate = useMemo(() => {
      if (!isSignedIn) return false;
      return isSubscribed;
   }, [isSignedIn, isSubscribed]);

   return {
      canGenerate,
      isSignedIn,
      isSubscribed,
      availableCredits,
      aiCreditCost,
      loading: loadingProfile,
   };
}
