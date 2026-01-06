import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_CONTENT_PADDING,
   ROUTE_ENTRIES,
} from '@/components/constants';
import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   bottomSheetBackgroundStyle,
} from '@/components/bottomSheetStyles';
import { supabase } from '@/lib/supabase';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
   ActivityIndicator,
   Keyboard,
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

   // 1. GUARD FLAGS
   const isRedirecting = useRef(false);
   const isSubmitting = useRef(false);

   // 2. GET GLOBAL SESSION (The Fix)
   // We pull the session/status from the global provider. 
   // If Supabase auto-logs us in, these will update instantly.
   const {
      signInWithApple,
      signInWithGoogle,
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

   // Toggle this if you want pure sign-in without creating accounts.
   const shouldCreateUser = true;

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
      // Prevent multiple redirects
      if (isRedirecting.current) return;
      isRedirecting.current = true;

      if (redirectPath) {
         if (router.canGoBack()) router.dismiss();
         setTimeout(() => {
            router.push(redirectPath as any);
         }, 100);
      } else {
         if (router.canGoBack()) router.dismiss();
         router.replace(ROUTE_ENTRIES);
      }
   }, [redirectPath, router]);

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
            return;
         }
         // handleSuccess is handled by the useEffect above now
      } catch (err: any) {
         setError(err?.message ?? 'Authentication failed.');
         setStatus('idle');
         isSubmitting.current = false;
      }
   };

   const onSendEmail = async () => {
      if (!supabase) return setError('Supabase client not initialized');
      if (isSubmitting.current) return;
      
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return setError('Please enter your email.');
      
      isSubmitting.current = true;
      setError(null);
      setStatus('sending');
      const otpPayload = {
         email: normalizedEmail,
         options: { shouldCreateUser },
      };
      
      try {
         const { error } = await supabase.auth.signInWithOtp(otpPayload);
         
         if (error) throw error;
         
         setStep('code');
      } catch (err: any) {
         setError(err?.message ?? 'Failed to send code.');
      } finally {
         setStatus('idle');
         isSubmitting.current = false;
      }
   };

const onVerifyCode = async () => {
      // 1. Guards
      if (!supabase) return setError('Supabase client not initialized');
      if (isSubmitting.current) return;
      
      const normalizedEmail = email.trim().toLowerCase();
      const cleanCode = code.trim().replace(/\s+/g, '');

      if (!normalizedEmail) return setError('Please enter your email.');
      // REMOVED the strict length check to allow for flexibility
      if (!cleanCode) return setError('Please enter the verification code.');
   
      isSubmitting.current = true;
      setError(null);
      setStatus('verifying');
   
      try {
         // Pre-check: If we are already logged in, stop here.
         const { data: preSession } = await supabase.auth.getSession();
         if (preSession?.session) {
            setStatus('idle');
            isSubmitting.current = false;
            handleSuccess();
            return;
         }

         // --- THE FIX: DUAL STRATEGY ---
         
         // Attempt 1: Try as a New User ('signup')
         let { error } = await supabase.auth.verifyOtp({
            email: normalizedEmail,
            token: cleanCode,
            type: 'signup',
         });
   
         // Attempt 2: If that failed, try as Existing User ('magiclink')
         if (error) {
            const { error: magicLinkError } = await supabase.auth.verifyOtp({
               email: normalizedEmail,
               token: cleanCode,
               type: 'magiclink',
            });
            // Update the error variable. If this succeeds, error becomes null.
            error = magicLinkError;
         }
   
         // If BOTH failed, throw the error
         if (error) throw error;
   
         // Success!
         setStatus('idle');
         isSubmitting.current = false;
         handleSuccess();
         
      } catch (err: any) {
         // Safety Net: Check if session exists anyway
         const { data: sessionData } = await supabase.auth.getSession();
         if (sessionData?.session) {
            setStatus('idle');
            isSubmitting.current = false;
            handleSuccess();
            return;
         }
   
         setError(err?.message ?? 'Invalid code or expired. Please try again.');
         setStatus('idle');
         isSubmitting.current = false;
      }
   };

   useEffect(() => {
      const event =
         Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
      const sub = Keyboard.addListener(event, () =>
         modalRef.current?.snapToIndex(0)
      );
      return () => sub.remove();
   }, []);

   return (
      <BottomSheetModal
         ref={modalRef}
         onDismiss={handleDismiss}
         index={0}
         enableDynamicSizing={true}
         enablePanDownToClose={false}
         handleComponent={() => null}
         handleIndicatorStyle={{ height: 0, opacity: 0 }}
         backgroundStyle={bottomSheetBackgroundStyle(isDark, theme.bg)}
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
            <View className="mb-6 pt-4 pr-8">
               <View className="absolute right-0">
                  <RoundedCloseButton onPress={() => modalRef.current?.dismiss()} />
               </View>
               <Text className="text-3xl font-bold mb-2" style={{ color: theme.text }}>
                  {step === 'email' ? 'Welcome' : 'Check your Email'}
               </Text>
               <Text className="text-base" style={{ color: theme.subText }}>
                  {step === 'email'
                     ? 'Sign in to sync your journal.'
                     : `We sent a code to ${email.trim() || 'your email'}.`}
               </Text>
            </View>

            {step === 'email' && (
               <>
                  <View className="gap-3 mb-6">
                     {Platform.OS === 'ios' && (
                        <AppleAuthentication.AppleAuthenticationButton
                           buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                           buttonStyle={
                              isDark
                                 ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                                 : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                           }
                           cornerRadius={14}
                           style={{ width: '100%', height: 50 }}
                           onPress={() => handleSocial(signInWithApple, 'apple')}
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
                              <FontAwesome name="google" size={20} color={theme.text} />
                              <Text className="ml-2 font-semibold text-[16px]" style={{ color: theme.text }}>
                                 Continue with Google
                              </Text>
                           </>
                        )}
                     </Pressable>
                  </View>

                  <View className="flex-row items-center gap-3 mb-6 opacity-50">
                     <View className="flex-1 h-[1px]" style={{ backgroundColor: theme.subText }} />
                     <Text className="text-xs font-bold uppercase" style={{ color: theme.subText }}>
                        OR
                     </Text>
                     <View className="flex-1 h-[1px]" style={{ backgroundColor: theme.subText }} />
                  </View>
               </>
            )}

            <View className="gap-4 mb-6">
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
                     style={{ backgroundColor: theme.inputBg, color: theme.text }}
                     className={`h-[54px] rounded-[14px] px-4 text-base border ${theme.inputBorder}`}
                  />
               ) : (
                  <>
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
                        <Text style={{ color: theme.subText }}>Change email</Text>
                     </Pressable>
                  </>
               )}
            </View>

            {error && (
               <Text className="mb-4 text-center text-sm text-rose-500 font-medium">
                  {error}
               </Text>
            )}

            <Pressable
               className={`h-[54px] rounded-[14px] items-center justify-center mb-5 bg-dispute-cta active:opacity-90 ${status !== 'idle' ? 'opacity-70' : ''}`}
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
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
