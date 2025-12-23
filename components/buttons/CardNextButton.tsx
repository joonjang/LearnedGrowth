import { useNavigationLock } from '@/hooks/useNavigationLock';
import { supabase } from '@/lib/supabase';
import AiDisclaimerModal from '@/components/appInfo/AiDisclaimerModal';
import { useAuth } from '@/providers/AuthProvider';
import { useEntriesStore } from '@/providers/EntriesStoreProvider';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { router } from 'expo-router';
import { ArrowRight, FileText, Sparkles, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import WideButton from './WideButton';

type ButtonConfig = {
   label: string;
   icon: LucideIcon;
   bgColor: string;
   textColor: string;
};

type Prop = {
   id: string;
};

export default function CardNextButton({ id }: Prop) {
   const { status, user } = useAuth();
   const { isGrowthPlusActive } = useRevenueCat();
   const isSubscribed = status === 'signedIn' && isGrowthPlusActive;
   const { lock: lockNavigation } = useNavigationLock();

   const entriesStore = useEntriesStore();
   const hasCachedAnalysis = entriesStore((state) =>
      Boolean(state.byId[id]?.aiResponse)
   );

   const [showDisclaimer, setShowDisclaimer] = useState(false);
   const [pendingAnalysis, setPendingAnalysis] = useState(false);
   const hasAccountConsent =
      user?.user_metadata?.has_agreed_to_ai === true ||
      user?.user_metadata?.has_agreed_to_ai === 'true';
   const [hasConsent, setHasConsent] = useState<boolean>(hasAccountConsent);

   useEffect(() => {
      setHasConsent(hasAccountConsent);
   }, [hasAccountConsent]);

   useEffect(() => {
      if (pendingAnalysis && isSubscribed) {
         setPendingAnalysis(false);
         setTimeout(() => {
            checkConsentAndNavigate();
         }, 500);
      }
   }, [pendingAnalysis, isSubscribed]);

   const config = useMemo<ButtonConfig>(() => {
      if (hasCachedAnalysis) {
         return {
            label: 'View Analysis',
            icon: FileText,
            bgColor: 'bg-blue-500 dark:bg-blue-800',
            textColor: 'text-white',
         };
      }
      if (isSubscribed) {
         return {
            label: 'Analyze with AI',
            icon: Sparkles,
            bgColor: 'bg-dispute-cta dark:bg-green-800',
            textColor: 'text-white',
         };
      }
      return {
         label: 'Continue',
         icon: ArrowRight,
         bgColor: 'bg-dispute-cta dark:bg-green-800',
         textColor: 'text-white',
      };
   }, [hasCachedAnalysis, isSubscribed]);

   const navigateToAnalysis = () => {
      router.push(`/dispute/${id}?view=analysis&refresh=true`);
   };

   const checkConsentAndNavigate = async () => {
      if (hasConsent) {
         navigateToAnalysis();
         return;
      }
      setShowDisclaimer(true);
   };

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
            router.push(`/dispute/${id}?view=analysis`);
            return;
         }
         if (isSubscribed) {
            checkConsentAndNavigate();
            return;
         }

         setPendingAnalysis(true);
         router.push({
            pathname: '/(modal)/free-user',
            params: { id },
         } as any);
      });
   }, [hasCachedAnalysis, id, isSubscribed, lockNavigation]);

   return (
      <>
         <WideButton
            label={config.label}
            icon={config.icon}
            onPress={handlePress}
            variant={hasCachedAnalysis ? 'neutral' : 'primary'}
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
