import RoundedCloseButton from '@/components/buttons/RoundedCloseButton';
import { DISPUTE_CTA_CLASS } from '@/components/constants';
import { useAuth } from '@/providers/AuthProvider';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
   ActivityIndicator,
   Keyboard,
   Platform,
   Pressable,
   StyleSheet,
   Text,
   TextInput,
   useWindowDimensions,
   View,
} from 'react-native';
import {
   GestureHandlerRootView,
   ScrollView,
} from 'react-native-gesture-handler';
import {
   KeyboardAvoidingView,
   KeyboardProvider,
} from 'react-native-keyboard-controller';
import Animated, {
   Easing,
   runOnJS,
   useAnimatedStyle,
   useSharedValue,
   withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthStatus = 'idle' | 'sending' | 'verifying' | 'apple' | 'google';

export default function AuthModal() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { height: screenHeight } = useWindowDimensions();

   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   const theme = useMemo(
      () => ({
         bg: isDark ? '#1e293b' : '#ffffff',
         text: isDark ? '#f8fafc' : '#0f172a',
         subText: isDark ? '#cbd5e1' : '#475569',
         inputBg: isDark ? '#334155' : '#f8fafc',
         inputBorder: isDark ? 'border-slate-600' : 'border-slate-200',
         placeholder: isDark ? '#94a3b8' : '#64748b',
         backdrop: 'rgba(0,0,0,0.5)',
      }),
      [isDark]
   );

   // Animation State
   const translateY = useSharedValue(screenHeight);
   const opacity = useSharedValue(0);
   const scrollViewRef = useRef<ScrollView>(null);

   const {
      signInWithApple,
      signInWithGoogle,
      sendOtp,
      verifyOtp,
      status: authStatus,
   } = useAuth();

   const [email, setEmail] = useState('');
   const [code, setCode] = useState('');
   const [step, setStep] = useState<'email' | 'code'>('email');

   const [status, setStatus] = useState<AuthStatus>('idle');
   const [error, setError] = useState<string | null>(null);

   const isSubmitting = useRef(false);
   const hasNavigated = useRef(false);
   const { redirect } = useLocalSearchParams<{ redirect?: string }>();

   const safeBack = useCallback(() => {
      if (hasNavigated.current) return;
      hasNavigated.current = true;

      if (router.canGoBack()) {
         router.back();
      } else {
         router.replace('/');
      }
   }, [router]);

   const handleDismiss = useCallback(() => {
      if (hasNavigated.current) return;

      Keyboard.dismiss();
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(
         screenHeight,
         { duration: 250 },
         (finished) => {
            if (finished) {
               runOnJS(safeBack)();
            }
         }
      );
   }, [screenHeight, opacity, translateY, safeBack]);

   const handleInputFocus = () => {
      setTimeout(() => {
         scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
   };

   useEffect(() => {
      translateY.value = withTiming(0, {
         duration: 350,
         easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(1, { duration: 300 });
   }, [opacity, translateY]);

   useEffect(() => {
      if (authStatus === 'signedIn' && !hasNavigated.current) {
         setStatus('idle');
         isSubmitting.current = false;
         handleDismiss();
         if (redirect) {
            const path = decodeURIComponent(
               Array.isArray(redirect) ? redirect[0] : redirect
            );
            setTimeout(() => router.replace(path as any), 300);
         }
      }
   }, [authStatus, redirect, handleDismiss, router]);

   // 🔵 1. REFACTORED EXECUTE ACTION (Final Robust Version)
   const executeAction = async (
      targetStatus: AuthStatus,
      fn: () => Promise<any>,
      resetOnSuccess: boolean = false
   ) => {
      if (isSubmitting.current) return;

      Keyboard.dismiss();
      isSubmitting.current = true;
      setStatus(targetStatus);
      setError(null);

      try {
         const result = await fn(); // 👈 Capture the result

         // 🟢 SAFETY CHECK:
         // 1. If resetOnSuccess is true (e.g. sent email), reset.
         // 2. If result is explicit 'false' (e.g. user cancelled social login), reset.
         if (resetOnSuccess || result === false) {
            setStatus('idle');
         }
         // Otherwise, stay in 'targetStatus' (spinning) and wait for
         // authStatus to change to 'signedIn' -> triggers useEffect close.
      } catch (e: any) {
         setError(e.message || 'An error occurred');
         setStatus('idle');
      } finally {
         // ✅ LOCK RELEASE: Always unlock, even if we stay visually busy.
         isSubmitting.current = false;
      }
   };

   const onContinue = () => {
      if (step === 'email') {
         const normalizedEmail = email.trim().toLowerCase();
         if (!normalizedEmail) return setError('Please enter your email.');

         executeAction(
            'sending',
            async () => {
               await sendOtp(normalizedEmail);
               setStep('code');
            },
            true
         );
      } else {
         const normalizedEmail = email.trim().toLowerCase();
         const cleanCode = code.trim().replace(/\s+/g, '');

         // ✅ FIX: Added missing email check here
         if (!normalizedEmail) return setError('Please enter your email.');
         if (!cleanCode) return setError('Please enter the code.');

         executeAction(
            'verifying',
            async () => {
               await verifyOtp(normalizedEmail, cleanCode);
            },
            false
         );
      }
   };

   const backdropStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
   }));

   const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
   }));

   return (
      <GestureHandlerRootView style={{ flex: 1 }}>
         <KeyboardProvider>
            <Animated.View
               style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme.backdrop },
                  backdropStyle,
               ]}
            >
               <Pressable style={{ flex: 1 }} onPress={handleDismiss} />
            </Animated.View>

            <KeyboardAvoidingView
               behavior={'padding'}
               keyboardVerticalOffset={-30}
               style={{ flex: 1, justifyContent: 'flex-end' }}
            >
               <Animated.View
                  style={[
                     {
                        backgroundColor: theme.bg,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -5 },
                        shadowOpacity: 0.1,
                        shadowRadius: 10,
                        elevation: 5,
                        maxHeight: '85%',
                     },
                     sheetStyle,
                  ]}
               >
                  <ScrollView
                     ref={scrollViewRef}
                     keyboardShouldPersistTaps="handled"
                     showsVerticalScrollIndicator={false}
                     contentContainerStyle={{
                        paddingTop: 16,
                        paddingHorizontal: 24,
                        paddingBottom: insets.bottom + 20,
                     }}
                  >
                     <View className="mb-6 relative z-50">
                        <View
                           className="absolute right-0 -top-2 z-50"
                           style={{ zIndex: 999 }}
                        >
                           <RoundedCloseButton onPress={handleDismiss} />
                        </View>
                        <Text
                           className="text-3xl font-bold mb-2 pr-10"
                           style={{ color: theme.text }}
                        >
                           {step === 'email' ? 'Welcome' : 'Check your Email'}
                        </Text>
                        <Text
                           className="text-base"
                           style={{ color: theme.subText }}
                        >
                           {step === 'email'
                              ? 'Sign in to sync your journal.'
                              : `We sent a code to ${email}.`}
                        </Text>
                     </View>

                     {step === 'email' && (
                        <View className="gap-3 mb-6">
                           {Platform.OS === 'ios' && (
                              <AppleAuthentication.AppleAuthenticationButton
                                 buttonType={
                                    AppleAuthentication
                                       .AppleAuthenticationButtonType.SIGN_IN
                                 }
                                 buttonStyle={
                                    isDark
                                       ? AppleAuthentication
                                            .AppleAuthenticationButtonStyle
                                            .WHITE
                                       : AppleAuthentication
                                            .AppleAuthenticationButtonStyle
                                            .BLACK
                                 }
                                 cornerRadius={14}
                                 style={{ width: '100%', height: 50 }}
                                 onPress={() =>
                                    executeAction(
                                       'apple',
                                       signInWithApple,
                                       false
                                    )
                                 }
                              />
                           )}

                           <Pressable
                              className={`flex-row items-center justify-center h-[50px] rounded-[14px] border ${theme.inputBorder} active:opacity-70`}
                              onPress={() =>
                                 executeAction(
                                    'google',
                                    signInWithGoogle,
                                    false
                                 )
                              }
                              disabled={status !== 'idle'}
                           >
                              {status === 'google' ? (
                                 <ActivityIndicator color={theme.text} />
                              ) : (
                                 <View className="flex-row items-center gap-2">
                                    <FontAwesome
                                       name="google"
                                       size={20}
                                       color={theme.text}
                                    />
                                    <Text
                                       className="font-semibold text-[16px]"
                                       style={{ color: theme.text }}
                                    >
                                       Continue with Google
                                    </Text>
                                 </View>
                              )}
                           </Pressable>

                           <View className="flex-row items-center gap-3 mt-2 opacity-50">
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
                        </View>
                     )}

                     <View className="gap-4">
                        {step === 'email' ? (
                           <TextInput
                              placeholder="Email address"
                              placeholderTextColor={theme.placeholder}
                              value={email}
                              onFocus={handleInputFocus}
                              onChangeText={(text) => {
                                 setEmail(text);
                                 if (error) setError(null);
                              }}
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              autoComplete="email"
                              textContentType="emailAddress"
                              style={{
                                 backgroundColor: theme.inputBg,
                                 color: theme.text,
                                 textAlignVertical: 'center',
                                 letterSpacing: 0,
                              }}
                              className={`h-[54px] rounded-[14px] px-4 text-base border ${theme.inputBorder}`}
                           />
                        ) : (
                           <View>
                              <Pressable
                                 onPress={() => {
                                    setStep('email');
                                    setCode('');
                                    setError(null);
                                    setStatus('idle');
                                 }}
                              >
                                 <Text
                                    className="mb-3 text-sm text-center"
                                    style={{ color: theme.subText }}
                                 >
                                    Wrong email?{' '}
                                    <Text className="underline">
                                       Change it.
                                    </Text>
                                 </Text>
                              </Pressable>
                              <TextInput
                                 placeholder="Enter code"
                                 placeholderTextColor={theme.placeholder}
                                 value={code}
                                 onFocus={handleInputFocus}
                                 onChangeText={(text) => {
                                    setCode(text);
                                    if (error) setError(null);
                                 }}
                                 keyboardType="number-pad"
                                 textContentType="oneTimeCode"
                                 autoComplete="sms-otp"
                                 style={{
                                    backgroundColor: theme.inputBg,
                                    color: theme.text,
                                    letterSpacing: 8,
                                    textAlign: 'center',
                                    // 🟢 FIX: Removed explicit fontSize: 20
                                    // Relying on className for consistency
                                 }}
                                 // 🟢 FIX: Added 'text-xl' to make it slightly larger than email but consistent font
                                 className={`h-[54px] rounded-[14px] px-4 text-xl border ${theme.inputBorder}`}
                                 autoFocus
                              />
                           </View>
                        )}
                     </View>

                     <View className="h-8 justify-center mt-1">
                        {error ? (
                           <Text className="text-center text-sm font-medium text-rose-500">
                              {error}
                           </Text>
                        ) : null}
                     </View>

                     <Pressable
                        className={`h-[54px] rounded-[14px] items-center justify-center ${DISPUTE_CTA_CLASS} active:opacity-90 ${status !== 'idle' ? 'opacity-70' : ''}`}
                        onPress={onContinue}
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

                     {step === 'email' && (
                        <Pressable
                           className="items-center py-4"
                           onPress={() => {
                              const normalized = email.trim();
                              if (!normalized)
                                 return setError('Enter email first.');
                              setStep('code');
                           }}
                        >
                           <Text
                              className="text-sm"
                              style={{ color: theme.subText }}
                           >
                              Have a code?{' '}
                              <Text className="font-bold">Enter it here</Text>
                           </Text>
                        </Pressable>
                     )}
                  </ScrollView>
               </Animated.View>
            </KeyboardAvoidingView>
         </KeyboardProvider>
      </GestureHandlerRootView>
   );
}
