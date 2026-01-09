import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
} from '@/components/bottomSheetStyles';
import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_CONTENT_PADDING,
} from '@/components/constants';
// ❌ DELETE: import { supabase } from '@/lib/supabase'; <-- No longer needed here
import { useAuth } from '@/providers/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
   BottomSheetBackdrop,
   BottomSheetModal,
   BottomSheetScrollView,
   BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   ActivityIndicator,
   Platform,
   Pressable,
   Text,
   View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthModal() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const modalRef = useRef<BottomSheetModal>(null);

   const isRedirecting = useRef(false);
   const isSubmitting = useRef(false);

   // ✅ GET ALL ACTIONS FROM PROVIDER
   const {
      signInWithApple,
      signInWithGoogle,
      sendOtp, // <--- New
      verifyOtp, // <--- New
      status: authStatus,
   } = useAuth();

   const { redirect } = useLocalSearchParams<{
      redirect?: string | string[];
   }>();

   const redirectParam = Array.isArray(redirect) ? redirect[0] : redirect;
   const redirectPath = redirectParam
      ? decodeURIComponent(redirectParam)
      : null;

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const theme = {
      bg: isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT,
      text: isDark ? '#f8fafc' : '#0f172a',
      subText: isDark ? '#cbd5e1' : '#475569',
      inputBg: isDark ? '#334155' : '#f8fafc',
      inputBorder: isDark ? 'border-slate-600' : 'border-slate-200',
      placeholder: isDark ? '#94a3b8' : '#64748b',
   };

   const [email, setEmail] = useState('');
   const [code, setCode] = useState('');
   const [step, setStep] = useState<'email' | 'code'>('email');
   const [status, setStatus] = useState<
      'idle' | 'sending' | 'verifying' | 'apple' | 'google'
   >('idle');
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      setTimeout(() => modalRef.current?.present(), 100);
   }, []);

   const handleDismiss = useCallback(() => {
      if (isRedirecting.current) return;
      router.back();
   }, [router]);

   const handleSuccess = useCallback(() => {
      if (isRedirecting.current) return;
      isRedirecting.current = true;

      if (router.canGoBack()) {
         router.dismiss();
      }

      if (redirectPath) {
         // Add a delay so the modal closes cleanly BEFORE we navigate
         setTimeout(() => {
            router.replace(redirectPath as any);
         }, 300);
      }
   }, [redirectPath, router]);

   // Auto-close when Provider says we are signed in
   useEffect(() => {
      if (authStatus === 'signedIn' && !isRedirecting.current) {
         setStatus('idle');
         isSubmitting.current = false;
         handleSuccess();
      }
   }, [authStatus, handleSuccess]);

   const handleSocial = async (
      action: () => Promise<void | boolean>,
      type: typeof status
   ) => {
      if (isSubmitting.current) return;
      isSubmitting.current = true;
      setError(null);
      setStatus(type);

      try {
         const result = await action();
         if (result === false) {
            setStatus('idle');
            isSubmitting.current = false;
         }
      } catch (err: any) {
         setError(err?.message ?? 'Authentication failed.');
         setStatus('idle');
         isSubmitting.current = false;
      }
   };

   // --- CLEANER EMAIL HANDLERS ---

   const onSendEmail = async () => {
      if (isSubmitting.current) return;

      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return setError('Please enter your email.');

      isSubmitting.current = true;
      setError(null);
      setStatus('sending');

      try {
         // ✅ DELEGATE TO PROVIDER
         await sendOtp(normalizedEmail);
         setStep('code');
      } catch (err: any) {
         setError(err?.message ?? 'Failed to send code.');
      } finally {
         setStatus('idle');
         isSubmitting.current = false;
      }
   };

   const onVerifyCode = async () => {
      if (isSubmitting.current) return;

      const normalizedEmail = email.trim().toLowerCase();
      const cleanCode = code.trim().replace(/\s+/g, '');

      if (!normalizedEmail) return setError('Please enter your email.');
      if (!cleanCode) return setError('Please enter the verification code.');

      isSubmitting.current = true;
      setError(null);
      setStatus('verifying');

      try {
         // ✅ DELEGATE TO PROVIDER
         await verifyOtp(normalizedEmail, cleanCode);

         // If verifyOtp doesn't throw, we are good.
         // The useEffect above listening to 'authStatus' will handle the redirect.
      } catch (err: any) {
         setError(err?.message ?? 'Invalid code or expired.');
         setStatus('idle');
         isSubmitting.current = false;
      }
   };

   const isIOS = Platform.OS === 'ios';

   const snapPoints = useMemo(() => {
      // Tune these numbers for your exact layout
      if (step === 'email') {
         return [isIOS ? '60%' : '49%']; // email step is taller on iOS (Apple button)
      }
      return [isIOS ? '40%' : '37%']; // code step
   }, [step, isIOS]);

   return (
      <BottomSheetModal
         ref={modalRef}
         enableContentPanningGesture={false}
         enableHandlePanningGesture={false}
         onDismiss={handleDismiss}
         index={0}
         // 👇 FIX 1: Use fixed snap points instead of dynamic sizing
         snapPoints={snapPoints}
         enableDynamicSizing={false}
         enablePanDownToClose={false}
         handleComponent={() => null}
         handleIndicatorStyle={{ height: 0, opacity: 0 }}
         backgroundStyle={bottomSheetBackgroundStyle(isDark, theme.bg)}
         // 👇 FIX 2: Standard keyboard handling works perfectly with fixed snap points
         keyboardBehavior="interactive"
         keyboardBlurBehavior="restore"
         topInset={insets.top}
         backdropComponent={(props) => (
            <BottomSheetBackdrop
               {...props}
               disappearsOnIndex={-1}
               appearsOnIndex={0}
               opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
               pressBehavior="none"
            />
         )}
      >
         <BottomSheetScrollView
            contentContainerStyle={{
               padding: BOTTOM_SHEET_CONTENT_PADDING,
               paddingBottom: insets.bottom + BOTTOM_SHEET_CONTENT_PADDING,
            }}
            keyboardShouldPersistTaps="handled"
         >
            <View className="mb-6 pt-2 pr-8 ">
               <View className="absolute right-0">
                  <RoundedCloseButton
                     onPress={() => modalRef.current?.dismiss()}
                  />
               </View>
               <Text
                  className="text-3xl font-bold mb-2"
                  style={{ color: theme.text }}
               >
                  {step === 'email' ? 'Welcome' : 'Check your Email'}
               </Text>
               <Text className="text-base" style={{ color: theme.subText }}>
                  {step === 'email' ? (
                     'Sign in to sync your journal.'
                  ) : (
                     <Text>
                        We sent a code to{' '}
                        <Text style={{ fontWeight: 'bold' }}>
                           {email.trim() || 'your email'}
                        </Text>
                        .
                     </Text>
                  )}
               </Text>
            </View>

            {step === 'email' && (
               <>
                  <View className="gap-3 mb-6">
                     {Platform.OS === 'ios' && (
                        <AppleAuthentication.AppleAuthenticationButton
                           buttonType={
                              AppleAuthentication.AppleAuthenticationButtonType
                                 .SIGN_IN
                           }
                           buttonStyle={
                              isDark
                                 ? AppleAuthentication
                                      .AppleAuthenticationButtonStyle.WHITE
                                 : AppleAuthentication
                                      .AppleAuthenticationButtonStyle.BLACK
                           }
                           cornerRadius={14}
                           style={{ width: '100%', height: 50 }}
                           onPress={() =>
                              handleSocial(signInWithApple, 'apple')
                           }
                        />
                     )}
                     <Pressable
                        className={`flex-row items-center justify-center h-[50px] rounded-[14px] border ${theme.inputBorder} active:opacity-70`}
                        onPress={() => handleSocial(signInWithGoogle, 'google')}
                        disabled={status !== 'idle'}
                     >
                        {status === 'google' ? (
                           <ActivityIndicator color={theme.text} />
                        ) : (
                           <>
                              <FontAwesome
                                 name="google"
                                 size={20}
                                 color={theme.text}
                              />
                              <Text
                                 className="ml-2 font-semibold text-[16px]"
                                 style={{ color: theme.text }}
                              >
                                 Continue with Google
                              </Text>
                           </>
                        )}
                     </Pressable>
                  </View>

                  <View className="flex-row items-center gap-3 mb-6 opacity-50">
                     <View
                        className="flex-1 h-[1px]"
                        style={{ backgroundColor: theme.subText }}
                     />
                     <Text
                        className="text-xs font-bold uppercase"
                        style={{ color: theme.subText }}
                     >
                        OR
                     </Text>
                     <View
                        className="flex-1 h-[1px]"
                        style={{ backgroundColor: theme.subText }}
                     />
                  </View>
               </>
            )}

            <View className="gap-4 mb-1">
               {step === 'email' ? (
                  <BottomSheetTextInput
                     placeholder="Email address"
                     placeholderTextColor={theme.placeholder}
                     value={email}
                     onChangeText={setEmail}
                     keyboardType="email-address"
                     autoCapitalize="none"
                     autoCorrect={false}
                     autoComplete="email"
                     textContentType="emailAddress"
                     style={{
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                     }}
                     className={`h-[54px] rounded-[14px] px-4 text-base border ${theme.inputBorder}`}
                  />
               ) : (
                  <>
                     <Pressable
                        className="items-center"
                        onPress={() => {
                           setStep('email');
                           setCode('');
                           setError(null);
                           setStatus('idle');
                           isSubmitting.current = false;
                        }}
                     >
                        <Text
                           className="mb-3 text-sm"
                           style={{ color: theme.subText }}
                        >
                           Wrong email? Tap here to change.
                        </Text>
                     </Pressable>

                     <BottomSheetTextInput
                        placeholder="Enter verification code"
                        placeholderTextColor={theme.placeholder}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        style={{
                           backgroundColor: theme.inputBg,
                           color: theme.text,
                           letterSpacing: 4,
                           textAlign: 'center',
                        }}
                        className={`h-[54px] rounded-[14px] px-4 text-base border ${theme.inputBorder}`}
                     />
                  </>
               )}
            </View>

            <View className="mb-1">
               <Text
                  className="text-center text-sm font-medium text-rose-500"
                  // keeps the space even when empty
                  style={{ opacity: error ? 1 : 0 }}
               >
                  {error ?? ' '}
               </Text>
            </View>

            <Pressable
               className={`h-[54px] rounded-[14px] items-center justify-center mb-1 bg-dispute-cta active:opacity-90 ${status !== 'idle' ? 'opacity-70' : ''}`}
               onPress={step === 'email' ? onSendEmail : onVerifyCode}
               disabled={status !== 'idle'}
            >
               {status === 'sending' || status === 'verifying' ? (
                  <ActivityIndicator color="#FFF" />
               ) : (
                  <Text className="text-white text-[17px] font-bold">
                     {step === 'email' ? 'Continue' : 'Verify Code'}
                  </Text>
               )}
            </Pressable>

            {/* 👇 NEW: Manual "Skip to Code" Button */}
            {step === 'email' && (
               <Pressable
                  className="items-center py-3"
                  onPress={() => {
                     const normalized = email.trim();
                     if (!normalized) {
                        setError('Please enter your email address first.');
                        return;
                     }
                     // Just switch screens. Do NOT call sendOtp().
                     setStep('code');
                     setError(null);
                  }}
               >
                  <Text className="text-sm" style={{ color: theme.subText }}>
                     Already have a code?{' '}
                     <Text className="font-bold">Enter it here</Text>
                  </Text>
               </Pressable>
            )}
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
