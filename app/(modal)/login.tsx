import {
   BOTTOM_SHEET_BACKDROP_OPACITY,
   BOTTOM_SHEET_CONTENT_PADDING,
   BOTTOM_SHEET_RADIUS,
   ROUTE_ENTRIES,
} from '@/components/constants';
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

   // 1. GUARD FLAG
   const isRedirecting = useRef(false);

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
      bg: isDark ? '#0f172a' : '#ffffff',
      text: isDark ? '#f8fafc' : '#0f172a',
      subText: isDark ? '#cbd5e1' : '#475569',
      indicator: isDark ? '#475569' : '#cbd5e1',
      inputBg: isDark ? '#334155' : '#f8fafc',
      inputBorder: isDark ? 'border-slate-600' : 'border-slate-200',
      placeholder: isDark ? '#94a3b8' : '#64748b',
   };

   const { signIn, signUp, signInWithApple, signInWithGoogle } = useAuth();
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [isSignUp, setIsSignUp] = useState(false);
   const [status, setStatus] = useState<
      'idle' | 'submitting' | 'apple' | 'google'
   >('idle');
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
      setTimeout(() => modalRef.current?.present(), 100);
   }, []);

   // 2. GUARDED DISMISSAL
   const handleDismiss = useCallback(() => {
      if (isRedirecting.current) return;
      router.back();
   }, [router]);

   const handleAuth = async (
      action: () => Promise<void | boolean>,
      type: typeof status
   ) => {
      setError(null);
      setStatus(type);

      try {
         const result = await action();
         if (result === false) {
            setStatus('idle');
            return;
         }

         // --- CRITICAL UPDATE ---
         isRedirecting.current = true;

         if (redirectPath) {
            // CASE A: Specific Redirect (from Free User screen)
            if (router.canGoBack()) router.dismiss();

            setTimeout(() => {
               router.push(redirectPath as any);
            }, 100);
         } else {
            // CASE B: Default Login (No redirect param)
            // Since AuthGate no longer auto-redirects, we must do it manually.
            if (router.canGoBack()) {
               // Dismiss the modal/screen if we were pushed here
               router.dismiss();
            }

            // Go to the main app tabs
            router.replace(ROUTE_ENTRIES);
         }
      } catch (err: any) {
         setError(err?.message ?? 'Authentication failed.');
         setStatus('idle');
      }
   };

   const onEmailAuth = () => {
      if (!email.trim() || !password)
         return setError('Please enter email & password.');
      handleAuth(
         () => (isSignUp ? signUp(email, password) : signIn(email, password)),
         'submitting'
      );
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
         onDismiss={handleDismiss} // <--- Uses guarded handler
         index={0}
         enableDynamicSizing={true}
         enablePanDownToClose
         handleIndicatorStyle={{ backgroundColor: theme.indicator }}
         backgroundStyle={{
            backgroundColor: theme.bg,
            borderRadius: BOTTOM_SHEET_RADIUS,
         }}
         keyboardBehavior="interactive"
         keyboardBlurBehavior="restore"
         topInset={insets.top}
         backdropComponent={(props) => (
            <BottomSheetBackdrop
               {...props}
               disappearsOnIndex={-1}
               appearsOnIndex={0}
               opacity={BOTTOM_SHEET_BACKDROP_OPACITY}
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
            {/* Header */}
            <View className="mb-6">
               <Text
                  className="text-3xl font-bold mb-2"
                  style={{ color: theme.text }}
               >
                  {isSignUp ? 'Start your Growth' : 'Welcome Back'}
               </Text>
               <Text className="text-base" style={{ color: theme.subText }}>
                  {isSignUp
                     ? 'Create an account to save your journal.'
                     : 'Sign in to sync your entries.'}
               </Text>
            </View>

            {/* Social Buttons */}
            <View className="gap-3 mb-6">
               {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                     buttonType={
                        isSignUp
                           ? AppleAuthentication.AppleAuthenticationButtonType
                                .SIGN_UP
                           : AppleAuthentication.AppleAuthenticationButtonType
                                .SIGN_IN
                     }
                     buttonStyle={
                        isDark
                           ? AppleAuthentication.AppleAuthenticationButtonStyle
                                .WHITE
                           : AppleAuthentication.AppleAuthenticationButtonStyle
                                .BLACK
                     }
                     cornerRadius={14}
                     style={{ width: '100%', height: 50 }}
                     onPress={() => handleAuth(signInWithApple, 'apple')}
                  />
               )}
               <Pressable
                  className={`flex-row items-center justify-center h-[50px] rounded-[14px] border ${theme.inputBorder} active:opacity-70`}
                  onPress={() => handleAuth(signInWithGoogle, 'google')}
                  disabled={status !== 'idle'}
               >
                  {status === 'google' ? (
                     <ActivityIndicator color={theme.text} />
                  ) : (
                     <>
                        <FontAwesome name="google" size={20} color={theme.text} />
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

            {/* Form Inputs */}
            <View className="gap-4 mb-6">
               <BottomSheetTextInput
                  placeholder="Email address"
                  placeholderTextColor={theme.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ backgroundColor: theme.inputBg, color: theme.text }}
                  className={`h-[54px] rounded-[14px] px-4 text-base border ${theme.inputBorder}`}
               />
               <BottomSheetTextInput
                  placeholder="Password"
                  placeholderTextColor={theme.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={{ backgroundColor: theme.inputBg, color: theme.text }}
                  className={`h-[54px] rounded-[14px] px-4 text-base border ${theme.inputBorder}`}
               />
            </View>

            {error && (
               <Text className="mb-4 text-center text-sm text-rose-500 font-medium">
                  {error}
               </Text>
            )}

            <Pressable
               className={`h-[54px] rounded-[14px] items-center justify-center mb-5 bg-dispute-cta active:opacity-90 ${status !== 'idle' ? 'opacity-70' : ''}`}
               onPress={onEmailAuth}
               disabled={status !== 'idle'}
            >
               {status === 'submitting' ? (
                  <ActivityIndicator color="#FFF" />
               ) : (
                  <Text className="text-white text-[17px] font-bold">
                     {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
               )}
            </Pressable>

            <Pressable
               className="items-center py-2"
               onPress={() => {
                  setError(null);
                  setIsSignUp(!isSignUp);
               }}
            >
               <Text style={{ color: theme.subText }}>
                  {isSignUp ? 'Already have an account? ' : 'First time here? '}{' '}
                  <Text className="text-dispute-cta font-bold">
                     {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
               </Text>
            </Pressable>
         </BottomSheetScrollView>
      </BottomSheetModal>
   );
}
