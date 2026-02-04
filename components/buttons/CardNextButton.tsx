import AiDisclaimerModal from '@/components/appInfo/AiDisclaimerModal';
import { useAiCredits } from '@/hooks/useAiCredits';
import { useNavigationLock } from '@/hooks/useNavigationLock';
import { ROUTE_ENTRY_DETAIL } from '@/lib/constants';
import {
   AI_BUTTON_CLASS,
   AI_TEXT_PRIMARY_CLASS,
   DISPUTE_CTA_CLASS,
} from '@/lib/styles';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { router } from 'expo-router';
import {
   ArrowRight,
   FileText,
   Sparkles,
   type LucideIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
   const { canGenerate } = useAiCredits();
   const { user } = useAuth();
   const { lock: lockNavigation } = useNavigationLock();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { t } = useTranslation();

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

   const openDispute = useCallback(
      (refresh: boolean) => {
         onNavigate?.();
         if (fromEntryDetail) {
            router.push({
               pathname: '/dispute/[id]',
               params: {
                  id,
                  view: 'analysis',
                  ...(refresh ? { refresh: 'true' } : {}),
                  ...pathParam,
               },
            });
            return;
         }
         router.push({
            pathname: ROUTE_ENTRY_DETAIL,
            params: {
               id,
               openDispute: 'analysis',
               ...(refresh ? { refresh: 'true' } : {}),
            },
         });
      },
      [fromEntryDetail, id, onNavigate, pathParam],
   );

   const navigateToAnalysis = useCallback(() => {
      openDispute(true);
   }, [openDispute]);

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
      if (pendingAnalysis && canGenerate) {
         setPendingAnalysis(false);
         const t = setTimeout(() => {
            checkConsentAndNavigate();
         }, 500);
         return () => clearTimeout(t);
      }
   }, [pendingAnalysis, canGenerate, checkConsentAndNavigate]);

   const config = useMemo<ButtonConfig>(() => {
      if (hasCachedAnalysis) {
         return {
            label: t('analysis.view_analysis'),
            icon: FileText,
            bgColor: 'bg-blue-500 dark:bg-blue-700/50',
            textColor: 'text-white',
         };
      }
      if (canGenerate) {
         return {
            label: t('analysis.analyze_with_ai'),
            icon: Sparkles,
            bgColor: AI_BUTTON_CLASS,
            textColor: AI_TEXT_PRIMARY_CLASS,
            iconColor: isDark ? '#fef3c7' : '#78350f',
         };
      }
      return {
         label: t('common.continue'),
         icon: ArrowRight,
         bgColor: DISPUTE_CTA_CLASS,
         textColor: 'text-white',
      };
   }, [canGenerate, hasCachedAnalysis, isDark, t]);

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
            if (fromEntryDetail) {
               openDispute(false);
               return;
            }
            onNavigate?.();
            router.push({
               pathname: '/dispute/[id]',
               params: { id, view: 'analysis' },
            });
            return;
         }
         if (canGenerate) {
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
      lockNavigation,
      hasCachedAnalysis,
      canGenerate,
      onNavigate,
      id,
      pathParam,
      fromEntryDetail,
      openDispute,
      checkConsentAndNavigate,
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
