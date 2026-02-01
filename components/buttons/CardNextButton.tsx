import AiDisclaimerModal from '@/components/appInfo/AiDisclaimerModal';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import {
   AI_BUTTON_CLASS,
   AI_TEXT_PRIMARY_CLASS,
   ANALYZE_WITH_AI_LABEL,
   DISPUTE_CTA_CLASS,
} from '@/lib/styles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import {
   ArrowRight,
   FileText,
   Sparkles,
   type LucideIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useState } from 'react';
import WideButton from './WideButton';

type ButtonConfig = {
   label: string;
   icon: LucideIcon;
   bgColor: string;
   textColor: string;
   iconColor?: string;
};

type Prop = {
   id: string;
   onNavigate?: () => void;
   fromEntryDetail?: boolean;
};

export default function CardNextButton({
   id,
   onNavigate,
   fromEntryDetail = false,
}: Prop) {
   const { status, user } = useAuth();
   const { isGrowthPlusActive } = useRevenueCat();
   const isSubscribed = status === 'signedIn' && isGrowthPlusActive;
   const { lock: lockNavigation } = useNavigationLock();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const entriesStore = useEntriesStore();
   const hasCachedAnalysis = entriesStore((state) =>
      Boolean(state.byId[id]?.aiResponse),
   );

   const [showDisclaimer, setShowDisclaimer] = useState(false);
   const [pendingAnalysis, setPendingAnalysis] = useState(false);
   const hasAccountConsent =
      user?.user_metadata?.has_agreed_to_ai === true ||
      user?.user_metadata?.has_agreed_to_ai === 'true';
   const [hasConsent, setHasConsent] = useState<boolean>(hasAccountConsent);

   const pathParam = useMemo(
      () => (fromEntryDetail ? { from: 'entryDetail' } : {}),
      [fromEntryDetail],
   );

   const navigateToAnalysis = useCallback(() => {
      onNavigate?.();
      router.push({
         pathname: '/dispute/[id]',
         params: { id, view: 'analysis', refresh: 'true', ...pathParam },
      });
   }, [pathParam, id, onNavigate]);

   const checkConsentAndNavigate = useCallback(() => {
      if (hasConsent) {
         navigateToAnalysis();
         return;
      }
      setShowDisclaimer(true);
   }, [hasConsent, navigateToAnalysis]);

   useEffect(() => {
      setHasConsent(hasAccountConsent);
   }, [hasAccountConsent]);

   useEffect(() => {
      if (pendingAnalysis && isSubscribed) {
         setPendingAnalysis(false);
         const t = setTimeout(() => {
            checkConsentAndNavigate();
         }, 500);
         return () => clearTimeout(t);
      }
   }, [pendingAnalysis, isSubscribed, checkConsentAndNavigate]);

   const config = useMemo<ButtonConfig>(() => {
      if (hasCachedAnalysis) {
         return {
            label: 'View Analysis',
            icon: FileText,
            bgColor: 'bg-blue-500 dark:bg-blue-700/50',
            textColor: 'text-white',
         };
      }
      if (isSubscribed) {
         return {
            label: ANALYZE_WITH_AI_LABEL,
            icon: Sparkles,
            bgColor: AI_BUTTON_CLASS,
            textColor: AI_TEXT_PRIMARY_CLASS,
            iconColor: isDark ? '#fef3c7' : '#78350f',
         };
      }
      return {
         label: 'Continue',
         icon: ArrowRight,
         bgColor: DISPUTE_CTA_CLASS,
         textColor: 'text-white',
      };
   }, [hasCachedAnalysis, isDark, isSubscribed]);

   const onConfirmDisclaimer = async () => {
      try {
         if (supabase && user) {
            await supabase.auth.updateUser({
               data: { has_agreed_to_ai: true },
            });
         }
      } catch (error) {
         console.error('Error saving AI consent to account:', error);
      }
      setHasConsent(true);
      setShowDisclaimer(false);
      setTimeout(() => navigateToAnalysis(), 300);
   };

   const handlePress = useCallback(() => {
      lockNavigation(() => {
         if (hasCachedAnalysis) {
            onNavigate?.();
            router.push({
               pathname: '/dispute/[id]',
               params: { id, view: 'analysis', ...pathParam },
            });
            return;
         }
         if (isSubscribed) {
            checkConsentAndNavigate();
            return;
         }

         setPendingAnalysis(true);
         onNavigate?.();
         router.push({
            pathname: '/(modal)/free-user',
            params: { id, ...pathParam },
         } as any);
      });
   }, [
      checkConsentAndNavigate,
      pathParam,
      hasCachedAnalysis,
      id,
      isSubscribed,
      lockNavigation,
      onNavigate,
   ]);

   return (
      <>
         <WideButton
            label={config.label}
            icon={config.icon}
            onPress={handlePress}
            variant={hasCachedAnalysis ? 'neutral' : 'primary'}
            bgClassName={config.bgColor}
            textClassName={config.textColor}
            iconColor={config.iconColor}
         />
         <AiDisclaimerModal
            visible={showDisclaimer}
            onCancel={() => {
               setShowDisclaimer(false);
               setPendingAnalysis(false);
            }}
            onConfirm={onConfirmDisclaimer}
         />
      </>
   );
}
