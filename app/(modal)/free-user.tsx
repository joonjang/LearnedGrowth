import AiDisclaimerModal from '@/components/appInfo/AiDisclaimerModal';
import {
   AI_ANALYSIS_CREDIT_COST,
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_CONTENT_PADDING,
   FREE_MONTHLY_CREDITS,
   ROUTE_LOGIN,
} from '@/components/constants';
import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import CreditShop from '@/components/CreditShop';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
   AlertCircle,
   ArrowRight,
   Leaf,
   PlusCircle,
   Sparkles,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FreeUserChoiceScreen() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const modalRef = useRef<BottomSheetModal>(null);
   const {
      status,
      profile,
      loadingProfile,
      refreshProfile,
      refreshProfileIfStale,
      user,
   } = useAuth();
   const { id, autoAi } = useLocalSearchParams<{
      id?: string | string[];
      autoAi?: string | string[];
   }>();

   const [showShop, setShowShop] = useState(false);
   const isRedirecting = useRef(false);
   const [showDisclaimer, setShowDisclaimer] = useState(false);
   const [pendingTarget, setPendingTarget] = useState<{
      path: string;
      requiresAuth: boolean;
   } | null>(null);
   const hasAccountConsent =
      user?.user_metadata?.has_agreed_to_ai === true ||
      user?.user_metadata?.has_agreed_to_ai === 'true';
   const [hasConsent, setHasConsent] = useState<boolean>(hasAccountConsent);
   const [hasSession, setHasSession] = useState(false);

   // Ensure credits are accurate the moment this screen opens
   useEffect(() => {
      refreshProfileIfStale();
   }, [refreshProfileIfStale]);

   useEffect(() => {
      setHasConsent(hasAccountConsent);
   }, [hasAccountConsent]);

   // Track Supabase session directly to avoid redirect loops while auth status settles
   useEffect(() => {
      const client = supabase;
      if (!client) return;

      let mounted = true;
      const syncSession = async () => {
         const { data } = await client.auth.getSession();
         if (mounted) setHasSession(Boolean(data.session));
      };
      syncSession();
      const sub = client.auth.onAuthStateChange((_event, session) => {
         if (mounted) setHasSession(Boolean(session));
      });
      return () => {
         mounted = false;
         sub?.data?.subscription?.unsubscribe();
      };
   }, []);

   // Logic Helpers
   const entryId = Array.isArray(id) ? id[0] : id;
   const isSignedIn = status === 'signedIn';
    const effectiveSignedIn = isSignedIn || hasSession;
   const availableCredits = profile
      ? Math.max(FREE_MONTHLY_CREDITS - profile.aiCallsUsed, 0) +
        (profile.extraAiCredits ?? 0)
      : null;
   const creditAvailability = (() => {
      if (!isSignedIn) return 'Sign in to see your credits.';
      if (loadingProfile) return 'Checking credits...';
      if (availableCredits === null) return 'Credits unavailable right now.';
      const suffix = availableCredits === 1 ? '' : 's';
      return `${availableCredits} credit${suffix} available.`;
   })();

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const theme = {
      bg: isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
      text: isDark ? '#f8fafc' : '#0f172a',
      subText: isDark ? '#cbd5e1' : '#64748b',
      // Amber Card
      amberText: isDark ? '#fde68a' : '#b45309',
      amberSub: isDark ? 'rgba(254, 243, 199, 0.8)' : 'rgba(146, 64, 14, 0.8)',
      amberBorder: 'border-amber-500',
      amberBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      // Slate Card
      slateBorder: isDark ? 'border-slate-700' : 'border-slate-200',
      slateBg: isDark ? 'bg-slate-800' : 'bg-slate-50',
   };

   const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
         <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
         />
      ),
      []
   );

   useEffect(() => {
      const id = requestAnimationFrame(() => {
         modalRef.current?.present();
      });
      return () => cancelAnimationFrame(id);
   }, []);

   const handleDismiss = useCallback(() => {
      if (isRedirecting.current) return;
      router.back();
   }, [router]);

   const proceedToPath = useCallback(
      (path: string, requiresAuth: boolean) => {
         isRedirecting.current = true;

         if (requiresAuth && !effectiveSignedIn) {
            const redirectPath = `/(modal)/free-user?id=${entryId}&autoAi=1`;
            router.replace({
               pathname: ROUTE_LOGIN,
               params: { redirect: encodeURIComponent(redirectPath) },
            } as any);
         } else {
            router.replace(path as any);
         }
      },
      [effectiveSignedIn, entryId, router]
   );

   const checkConsentAndNavigate = useCallback(
      (path: string, requiresAuth: boolean) => {
         if (hasConsent) {
            proceedToPath(path, requiresAuth);
            return;
         }
         setPendingTarget({ path, requiresAuth });
         setShowDisclaimer(true);
      },
      [hasConsent, proceedToPath]
   );

   const handleChoice = useCallback(
      (requiresAuth: boolean) => {
         if (requiresAuth && availableCredits === 0) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setShowShop((prev) => !prev); // Toggle the shop visibility
            return;
         }

         if (!entryId) return modalRef.current?.dismiss();

         const path = requiresAuth
            ? `/dispute/${entryId}?view=analysis&refresh=true`
            : `/dispute/${entryId}`;

         if (requiresAuth && !effectiveSignedIn) {
            proceedToPath(path, requiresAuth);
            return;
         }

         if (requiresAuth) {
            checkConsentAndNavigate(path, requiresAuth);
            return;
         }

         proceedToPath(path, requiresAuth);
      },
      [
         availableCredits,
         checkConsentAndNavigate,
         entryId,
         effectiveSignedIn,
         proceedToPath,
      ]
   );

   const autoAiRequested =
      (Array.isArray(autoAi) ? autoAi[0] : autoAi) === '1';
   const hasAutoTriggeredRef = useRef(false);

   // If we were redirected here post-login to resume AI flow, auto-trigger once
   useEffect(() => {
      if (!autoAiRequested || hasAutoTriggeredRef.current) return;
      if (!effectiveSignedIn) return;
      hasAutoTriggeredRef.current = true;
      handleChoice(true);
   }, [autoAiRequested, effectiveSignedIn, handleChoice]);

   const handlePurchaseSuccess = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowShop(false);
   };

   return (
      <>
         <BottomSheetModal
            ref={modalRef}
            onDismiss={handleDismiss}
            index={0}
            enableDynamicSizing={true}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            handleIndicatorStyle={bottomSheetHandleIndicatorStyle(isDark)}
            backgroundStyle={bottomSheetBackgroundStyle(isDark, theme.bg)}
         >
            <BottomSheetScrollView
               contentContainerStyle={{
                  paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
                  paddingTop: 16,
                  paddingBottom: insets.bottom + 20,
               }}
            >
               {/* Header */}
               <View className="mb-6">
                  <Text className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">
                     {availableCredits === 0 ? 'Out of credits' : 'Free plan'}
                  </Text>
                  <Text
                     className="text-2xl font-bold mb-1"
                     style={{ color: theme.text }}
                  >
                     {showShop
                        ? 'Refill your credits'
                        : 'How do you want to dispute?'}
                  </Text>
                  <Text className="text-base" style={{ color: theme.subText }}>
                     {showShop
                        ? 'Refill your credits to analyze more entries instantly.'
                        : 'Choose AI analysis or jump into the guided steps.'}
                  </Text>
               </View>

               {/* If Shop is active, show the shop and a 'Back' button */}
               {showShop ? (
                  <View>
                     <CreditShop onSuccess={handlePurchaseSuccess} />

                     <Pressable
                        onPress={() => {
                           LayoutAnimation.configureNext(
                              LayoutAnimation.Presets.easeInEaseOut
                           );
                           setShowShop(false);
                        }}
                        className="mt-4 py-3 items-center"
                     >
                        <Text style={{ color: theme.subText }}>Cancel</Text>
                     </Pressable>
                  </View>
               ) : (
                  /* Normal View */
                  <View className="gap-3">
                     {/* AI Option */}
                     <Pressable
                        onPress={() => handleChoice(true)}
                        className={`flex-row items-center justify-between rounded-2xl border ${theme.amberBorder} ${theme.amberBg} py-4 px-4 active:opacity-90`}
                     >
                        <View className="flex-1 pr-3">
                           <Text
                              className="text-lg font-bold"
                              style={{ color: theme.amberText }}
                           >
                              {availableCredits === 0
                                 ? 'Get more AI Credits'
                                 : 'Let AI analyze this'}
                           </Text>

                           <View className="flex-row items-center mt-2 gap-1">
                              {availableCredits === 0 ? (
                                 <AlertCircle size={14} color={theme.amberText} />
                              ) : (
                                 <Leaf size={14} color={theme.amberText} />
                              )}
                              <Text
                                 className="text-xs font-bold"
                                 style={{ color: theme.amberText }}
                              >
                                 {availableCredits === 0
                                    ? 'You have 0 credits left.'
                                    : `Costs ${AI_ANALYSIS_CREDIT_COST} credit${
                                         AI_ANALYSIS_CREDIT_COST === 1 ? '' : 's'
                                      }. ${creditAvailability}`}
                              </Text>
                           </View>
                        </View>

                        {/* Icon changes if 0 credits */}
                        {availableCredits === 0 ? (
                           <PlusCircle size={24} color={theme.amberText} />
                        ) : (
                           <Sparkles size={24} color={theme.amberText} />
                        )}
                    </Pressable>

                     {/* Manual Option (Always available) */}
                     <Pressable
                        onPress={() => handleChoice(false)}
                        className={`flex-row items-center justify-between rounded-2xl border ${theme.slateBorder} ${theme.slateBg} py-4 px-4 active:opacity-90`}
                     >
                        <View className="flex-1 pr-3">
                           <Text
                              className="text-lg font-semibold"
                              style={{ color: theme.text }}
                           >
                              Go to dispute steps
                           </Text>
                           <Text
                              className="text-sm mt-1"
                              style={{ color: theme.subText }}
                           >
                              Work through the guided prompts without AI.
                           </Text>
                        </View>
                        <ArrowRight size={20} color={theme.text} />
                     </Pressable>
                  </View>
               )}
            </BottomSheetScrollView>
         </BottomSheetModal>

         <AiDisclaimerModal
            visible={showDisclaimer}
         onCancel={() => {
            setShowDisclaimer(false);
            setPendingTarget(null);
         }}
         onConfirm={async () => {
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
            if (pendingTarget) {
               const { path, requiresAuth } = pendingTarget;
               setPendingTarget(null);
               setTimeout(() => proceedToPath(path, requiresAuth), 250);
               }
            }}
         />
      </>
   );
}
