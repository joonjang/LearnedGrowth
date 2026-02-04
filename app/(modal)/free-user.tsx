import AiDisclaimerModal from '@/components/appInfo/AiDisclaimerModal';
import CreditShop from '@/components/shop/CreditShop';
import {
   bottomSheetBackgroundStyle,
   bottomSheetHandleIndicatorStyle,
} from '@/components/utils/bottomSheetStyles';
import { ROUTE_LOGIN } from '@/lib/constants';
import { scheduleIdle } from '@/lib/scheduleIdle';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/lib/styles';
import { supabase } from '@/lib/supabase';
import { useAppConfig } from '@/providers/AppConfigProvider';
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
   Sparkles,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FreeUserChoiceScreen() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const modalRef = useRef<BottomSheetModal>(null);
   const navigationTargetRef = useRef<any>(null);

   const animationConfigs = useMemo(
      () => ({
         damping: 50,
         mass: 0.6,
         stiffness: 350,
      }),
      [],
   );

   const { status, profile, loadingProfile, refreshProfileIfStale, user } =
      useAuth();
   const { aiConfig } = useAppConfig();
   const { freeMonthlyCredits, aiCreditCost } = aiConfig;

   const { id, autoAi, onlyShowAiAnalysis, from } = useLocalSearchParams<{
      id?: string | string[];
      autoAi?: string | string[];
      onlyShowAiAnalysis?: string | string[];
      from?: string | string[];
   }>();

   const onlyShowAiAnalysisBool =
      (Array.isArray(onlyShowAiAnalysis)
         ? onlyShowAiAnalysis[0]
         : onlyShowAiAnalysis) === 'true';
   const fromQuery = Array.isArray(from) ? from[0] : from;
   const isFromEntryDetail = fromQuery === 'entryDetail';

   const [showShop, setShowShop] = useState(false);
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

   useEffect(() => {
      const cancelIdle = scheduleIdle(() => {
         refreshProfileIfStale();
      });
      return cancelIdle;
   }, [refreshProfileIfStale]);

   useEffect(() => {
      setHasConsent(hasAccountConsent);
   }, [hasAccountConsent]);

   useEffect(() => {
      if (!supabase) return;

      let mounted = true;
      const syncSession = async () => {
         const { data } = await supabase!.auth.getSession();
         if (mounted) setHasSession(Boolean(data.session));
      };
      syncSession();

      const { data: subData } = supabase.auth.onAuthStateChange(
         (_event, session) => {
            if (mounted) setHasSession(Boolean(session));
         },
      );

      return () => {
         mounted = false;
         subData?.subscription?.unsubscribe();
      };
   }, []);

   const entryId = Array.isArray(id) ? id[0] : id;
   const isSignedIn = status === 'signedIn';
   const effectiveSignedIn = isSignedIn || hasSession;

   const availableCredits = profile
      ? Math.max(freeMonthlyCredits - profile.aiCycleUsed, 0) +
        (profile.extraAiCredits ?? 0)
      : null;
   const isOutOfCredits =
      availableCredits !== null && availableCredits < aiCreditCost;

   const creditAvailability = useMemo(() => {
      if (!isSignedIn) return 'Sign in to see your credits.';
      if (loadingProfile) return 'Checking credits...';
      if (availableCredits === null) return 'Credits unavailable right now.';
      const suffix = availableCredits === 1 ? '' : 's';
      return `${availableCredits} credit${suffix} available.`;
   }, [isSignedIn, loadingProfile, availableCredits]);

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const theme = useMemo(
      () => ({
         bg: isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
         text: isDark ? '#f8fafc' : '#0f172a',
         subText: isDark ? '#cbd5e1' : '#64748b',

         // 1. Status Label (Amber)
         amberText: isDark ? '#fbbf24' : '#d97706',

         // 2. CHANGED: Primary CTA Colors reverted to AMBER
         primaryText: isDark ? '#fde68a' : '#b45309',
         primarySub: isDark
            ? 'rgba(254, 243, 199, 0.8)'
            : 'rgba(180, 83, 9, 0.8)',
         // Note: border-amber-500 is a valid Tailwind class, passing it as string to className
         primaryBorder: isDark ? 'border-amber-500/50' : 'border-amber-200',
         primaryBg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',

         slateBorder: isDark ? 'border-slate-700' : 'border-slate-200',
         slateBg: isDark ? 'bg-slate-800' : 'bg-slate-50',
      }),
      [isDark],
   );

   const contentContainerStyle = useMemo(
      () => ({
         paddingHorizontal: BOTTOM_SHEET_CONTENT_PADDING,
         paddingTop: 16,
         paddingBottom: insets.bottom + 20,
      }),
      [insets.bottom],
   );

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
      [],
   );

   useEffect(() => {
      let cancelled = false;
      let rafId: number | null = null;
      const cancelIdle = scheduleIdle(() => {
         if (cancelled) return;
         rafId = requestAnimationFrame(() => {
            if (cancelled) return;
            modalRef.current?.present();
         });
      }, 80);
      return () => {
         cancelled = true;
         if (rafId !== null) cancelAnimationFrame(rafId);
         cancelIdle();
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
            target = ROUTE_LOGIN;
         }

         navigationTargetRef.current = target;
         modalRef.current?.dismiss();
      },
      [effectiveSignedIn, entryId, isFromEntryDetail, onlyShowAiAnalysisBool],
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
      [hasConsent, proceedToPath],
   );

   const handleChoice = useCallback(
      (requiresAuth: boolean) => {
         if (requiresAuth && isOutOfCredits) {
            scheduleIdle(() => {
               setShowShop((prev) => !prev);
            });
            return;
         }

         if (!entryId) return modalRef.current?.dismiss();

         const path = requiresAuth
            ? isFromEntryDetail
               ? `/dispute/${entryId}?view=analysis&refresh=true&from=entryDetail`
               : `/entryDetail/${entryId}?openDispute=analysis&refresh=true`
            : isFromEntryDetail
              ? `/dispute/${entryId}?from=entryDetail`
              : `/entryDetail/${entryId}?openDispute=steps`;

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
         isOutOfCredits,
         entryId,
         isFromEntryDetail,
         effectiveSignedIn,
         proceedToPath,
         checkConsentAndNavigate,
      ],
   );

   const handlePurchaseSuccess = useCallback(() => {
      scheduleIdle(() => {
         setShowShop(false);
      });
   }, []);

   const handleShopCancel = useCallback(() => {
      scheduleIdle(() => {
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

   const handleChoiceTrue = useCallback(
      () => handleChoice(true),
      [handleChoice],
   );
   const handleChoiceFalse = useCallback(
      () => handleChoice(false),
      [handleChoice],
   );

   const autoAiRequested = (Array.isArray(autoAi) ? autoAi[0] : autoAi) === '1';

   const handleIndicatorStyle = useMemo(
      () => bottomSheetHandleIndicatorStyle(isDark),
      [isDark],
   );
   const backgroundStyle = useMemo(
      () => bottomSheetBackgroundStyle(isDark, theme.bg),
      [isDark, theme.bg],
   );

   const titleText = showShop
      ? 'Refill your credits'
      : onlyShowAiAnalysisBool
        ? 'Deepen your insight'
        : 'How do you want to dispute?';

   const subText = showShop
      ? 'Refill your credits to analyze more entries instantly.'
      : onlyShowAiAnalysisBool
        ? 'Unlock AI analysis to detect thinking patterns.'
        : 'Choose AI analysis or jump into the guided steps.';

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
            handleIndicatorStyle={handleIndicatorStyle}
            backgroundStyle={backgroundStyle}
         >
            <BottomSheetView style={contentContainerStyle}>
               <View className="mb-6">
                  <Text
                     className="text-sm font-semibold mb-1"
                     style={{ color: theme.amberText }}
                  >
                     {isOutOfCredits ? 'Out of credits' : 'Free plan'}
                  </Text>
                  <Text
                     className="text-2xl font-bold mb-1"
                     style={{ color: theme.text }}
                  >
                     {titleText}
                  </Text>
                  <Text className="text-base" style={{ color: theme.subText }}>
                     {subText}
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
                     {/* OPTION 1: AI ANALYSIS (AMBER THEME) */}
                     <Pressable
                        onPress={handleChoiceTrue}
                        className={`flex-row items-center justify-between rounded-2xl border ${theme.primaryBorder} ${theme.primaryBg} py-4 px-4 active:opacity-90`}
                     >
                        <View className="flex-1 pr-3">
                           <Text
                              className="text-lg font-bold"
                              style={{ color: theme.primaryText }}
                           >
                              {isOutOfCredits
                                 ? 'Get more AI Credits'
                                 : 'Let AI analyze this'}
                           </Text>

                           <View className="flex-row items-center mt-2 gap-1">
                              {isOutOfCredits ? (
                                 <AlertCircle
                                    size={14}
                                    color={theme.primaryText}
                                 />
                              ) : (
                                 <Leaf size={14} color={theme.primaryText} />
                              )}
                              <Text
                                 className="text-xs font-bold"
                                 style={{ color: theme.primaryText }}
                              >
                                 {isOutOfCredits
                                    ? 'Not enough credits for AI analysis.'
                                    : `Costs ${aiCreditCost} credit${
                                         aiCreditCost === 1 ? '' : 's'
                                      }. ${creditAvailability}`}
                              </Text>
                           </View>
                        </View>

                        {isOutOfCredits ? (
                           <PlusCircle size={24} color={theme.primaryText} />
                        ) : (
                           <Sparkles size={24} color={theme.primaryText} />
                        )}
                     </Pressable>

                     {/* OPTION 2: MANUAL STEPS (Hidden if onlyShowAiAnalysis is true) */}
                     {!onlyShowAiAnalysisBool && (
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
                     )}
                  </View>
               )}
            </BottomSheetView>
         </BottomSheetModal>

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
