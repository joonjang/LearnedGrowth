import AiDisclaimerModal from '@/components/appInfo/AiDisclaimerModal';
import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/bottomSheetStyles';
import {
   AI_ANALYSIS_CREDIT_COST,
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_CONTENT_PADDING,
   FREE_MONTHLY_CREDITS,
   ROUTE_LOGIN,
} from '@/components/constants';
import CreditShop from '@/components/CreditShop';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import {
   BottomSheetBackdrop,
   BottomSheetBackdropProps,
   BottomSheetModal,
   BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
   AlertCircle,
   ArrowRight,
   Leaf,
   PlusCircle,
   UserSearch
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FreeUserChoiceScreen() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const modalRef = useRef<BottomSheetModal>(null);
   const navigationTargetRef = useRef<any>(null);
   
   // 1. Memoized Animation Config
   const animationConfigs = useMemo(
      () => ({
         damping: 50,
         mass: 0.6,
         stiffness: 350,
      }),
      []
   );

   const {
      status,
      profile,
      loadingProfile,
      refreshProfileIfStale,
      user,
   } = useAuth();
   
   const { id, autoAi } = useLocalSearchParams<{
      id?: string | string[];
      autoAi?: string | string[];
   }>();

   const [showShop, setShowShop] = useState(false);
   const [showDisclaimer, setShowDisclaimer] = useState(false);
   
   const [pendingTarget, setPendingTarget] = useState<{
      path: string;
      requiresAuth: boolean;
   } | null>(null);
   
   // Derived state (lightweight calculations don't need state)
   const hasAccountConsent =
      user?.user_metadata?.has_agreed_to_ai === true ||
      user?.user_metadata?.has_agreed_to_ai === 'true';

   const [hasConsent, setHasConsent] = useState<boolean>(hasAccountConsent);
   const [hasSession, setHasSession] = useState(false);

   useEffect(() => {
      const task = InteractionManager.runAfterInteractions(() => {
         refreshProfileIfStale();
      });
      return () => task.cancel?.();
   }, [refreshProfileIfStale]);

   // Sync local consent state if user object updates from remote
   useEffect(() => {
      setHasConsent(hasAccountConsent);
   }, [hasAccountConsent]);

   useEffect(() => {
      // Direct reference to supabase avoids dependency array issues
      if (!supabase) return;

      let mounted = true;
      const syncSession = async () => {
         const { data } = await supabase!.auth.getSession();
         if (mounted) setHasSession(Boolean(data.session));
      };
      syncSession();
      
      const { data: subData } = supabase.auth.onAuthStateChange((_event, session) => {
         if (mounted) setHasSession(Boolean(session));
      });
      
      return () => {
         mounted = false;
         subData?.subscription?.unsubscribe();
      };
   }, []);

   const entryId = Array.isArray(id) ? id[0] : id;
   const isSignedIn = status === 'signedIn';
   const effectiveSignedIn = isSignedIn || hasSession;
   
   const availableCredits = profile
      ? Math.max(FREE_MONTHLY_CREDITS - profile.aiCycleUsed, 0) +
        (profile.extraAiCredits ?? 0)
      : null;

   // 2. Memoize derived string to prevent reallocation on every render
   const creditAvailability = useMemo(() => {
      if (!isSignedIn) return 'Sign in to see your credits.';
      if (loadingProfile) return 'Checking credits...';
      if (availableCredits === null) return 'Credits unavailable right now.';
      const suffix = availableCredits === 1 ? '' : 's';
      return `${availableCredits} credit${suffix} available.`;
   }, [isSignedIn, loadingProfile, availableCredits]);

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   // 3. CRITICAL: Memoize the Theme Object
   // Previously, this created a new object on every frame, forcing children to re-render.
   const theme = useMemo(() => ({
      bg: isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
      text: isDark ? '#f8fafc' : '#0f172a',
      subText: isDark ? '#cbd5e1' : '#64748b',
      amberText: isDark ? '#fde68a' : '#b45309',
      amberSub: isDark ? 'rgba(254, 243, 199, 0.8)' : 'rgba(146, 64, 14, 0.8)',
      amberBorder: 'border-amber-500',
      amberBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      slateBorder: isDark ? 'border-slate-700' : 'border-slate-200',
      slateBg: isDark ? 'bg-slate-800' : 'bg-slate-50',
   }), [isDark]);

   // 4. Memoize Static/Dynamic Styles
   // Prevents passing new style objects to BottomSheetView on every render.
   const contentContainerStyle = useMemo(() => ({
      paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
      paddingTop: 16,
      paddingBottom: insets.bottom + 20,
   }), [insets.bottom]);

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
      let cancelled = false;
      let rafId: number | null = null;
      const task = InteractionManager.runAfterInteractions(() => {
         if (cancelled) return;
         rafId = requestAnimationFrame(() => {
            if (cancelled) return;
            modalRef.current?.present();
         });
      });
      return () => {
         cancelled = true;
         if (rafId !== null) cancelAnimationFrame(rafId);
         task.cancel?.();
      };
   }, []);

   const handleDismiss = useCallback(() => {
      if (navigationTargetRef.current) {
         router.replace(navigationTargetRef.current);
         navigationTargetRef.current = null;
      } else {
         router.back();
      }
   }, [router]);

   const proceedToPath = useCallback(
      (path: string, requiresAuth: boolean) => {
         let target: any = path;

         if (requiresAuth && !effectiveSignedIn) {
            const redirectPath = `/(modal)/free-user?id=${entryId}&autoAi=1`;
            target = {
               pathname: ROUTE_LOGIN,
               params: { redirect: encodeURIComponent(redirectPath) },
            };
         }
         
         navigationTargetRef.current = target;
         modalRef.current?.dismiss();
      },
      [effectiveSignedIn, entryId]
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
            // Using InteractionManager ensures we don't stutter if a gesture is active
            InteractionManager.runAfterInteractions(() => {
               setShowShop((prev) => !prev);
            });
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

   // 5. Memoize Event Handlers
   // These were previously defined inline, causing re-renders of children (CreditShop/Disclaimer)
   
   const handlePurchaseSuccess = useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
         setShowShop(false);
      });
   }, []);

   const handleShopCancel = useCallback(() => {
      InteractionManager.runAfterInteractions(() => {
         setShowShop(false);
      });
   }, []);

   const handleDisclaimerCancel = useCallback(() => {
      setShowDisclaimer(false);
      setPendingTarget(null);
   }, []);

   const handleDisclaimerConfirm = useCallback(async () => {
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
   }, [user, pendingTarget, proceedToPath]);

   // Wrapper for inline arrow functions in render
   const handleChoiceTrue = useCallback(() => handleChoice(true), [handleChoice]);
   const handleChoiceFalse = useCallback(() => handleChoice(false), [handleChoice]);

   const autoAiRequested = (Array.isArray(autoAi) ? autoAi[0] : autoAi) === '1';
   const hasAutoTriggeredRef = useRef(false);

   useEffect(() => {
      if (!autoAiRequested || hasAutoTriggeredRef.current) return;
      if (!effectiveSignedIn) return;
      hasAutoTriggeredRef.current = true;
      handleChoice(true);
   }, [autoAiRequested, effectiveSignedIn, handleChoice]);

   const handleIndicatorStyle = useMemo(
      () => bottomSheetHandleIndicatorStyle(isDark),
      [isDark]
   );
   const backgroundStyle = useMemo(
      () => bottomSheetBackgroundStyle(isDark, theme.bg),
      [isDark, theme.bg]
   );

   return (
      <>
         <BottomSheetModal
            ref={modalRef}
            onDismiss={handleDismiss} 
            animationConfigs={animationConfigs}
            index={0}
            enableDynamicSizing={true}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            // These functions are likely cheap, but if they return new objects, BottomSheet might re-render.
            handleIndicatorStyle={handleIndicatorStyle}
            backgroundStyle={backgroundStyle}
         >
            <BottomSheetView style={contentContainerStyle}>
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

               {showShop ? (
                  <View>
                     <CreditShop onSuccess={handlePurchaseSuccess} />

                     <Pressable
                        onPress={handleShopCancel}
                        className="mt-4 py-3 items-center"
                     >
                        <Text style={{ color: theme.subText }}>Cancel</Text>
                     </Pressable>
                  </View>
               ) : (
                  <View className="gap-3">
                     <Pressable
                        onPress={handleChoiceTrue}
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

                        {availableCredits === 0 ? (
                           <PlusCircle size={24} color={theme.amberText} />
                        ) : (
                           <UserSearch size={24} color={theme.amberText} />
                        )}
                    </Pressable>

                     <Pressable
                        onPress={handleChoiceFalse}
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
            </BottomSheetView>
         </BottomSheetModal>

         {/* 6. Lazy Render Disclaimer Modal */}
         {/* Only mount this component if we actually need it. */ }
         {showDisclaimer && (
             <AiDisclaimerModal
                visible={showDisclaimer}
                onCancel={handleDisclaimerCancel}
                onConfirm={handleDisclaimerConfirm}
             />
         )}
      </>
   );
}
