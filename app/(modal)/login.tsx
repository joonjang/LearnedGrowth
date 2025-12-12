import { useAuth } from '@/providers/AuthProvider';
// REMOVED: import { shadowSoft } from '@/theme/shadows';
// REMOVED: import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind'; // <--- Added
import { useState } from 'react';
import {
   ActivityIndicator,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   Text,
   TextInput,
   View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthModal() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   
   // Hook into NativeWind theme
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const iconColor = isDark ? '#f8fafc' : '#0f172a'; // text vs text-inverse

   const { signIn, signUp, signInWithApple, signInWithGoogle } = useAuth();

   const [isSignUp, setIsSignUp] = useState(false);
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [socialSubmitting, setSocialSubmitting] = useState<
      'apple' | 'google' | null
   >(null);
   const [localError, setLocalError] = useState<string | null>(null);

   const handleClose = () => router.back();

   const handleSubmit = async () => {
      setLocalError(null);
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !password) {
         setLocalError('Please enter your email and password.');
         return;
      }
      setSubmitting(true);
      try {
         if (isSignUp) {
            await signUp(trimmedEmail, password);
         } else {
            await signIn(trimmedEmail, password);
         }
         router.back();
      } catch (err: any) {
         setLocalError(err?.message ?? 'Something went wrong.');
      } finally {
         setSubmitting(false);
      }
   };

   const handleAppleSignIn = async () => {
      setLocalError(null);
      setSocialSubmitting('apple');
      try {
         const success = await signInWithApple();
         if (success) router.back();
      } catch (err: any) {
         setLocalError(err?.message ?? 'Apple sign-in failed.');
      } finally {
         setSocialSubmitting(null);
      }
   };

   const handleGoogleSignIn = async () => {
      setLocalError(null);
      setSocialSubmitting('google');
      try {
         const success = await signInWithGoogle();
         if (success) router.back();
      } catch (err: any) {
         setLocalError(err?.message ?? 'Google sign-in failed.');
      } finally {
         setSocialSubmitting(null);
      }
   };

   return (
      <KeyboardAvoidingView
         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
         className="flex-1"
      >
         {/* Backdrop */}
         <Pressable 
            className="absolute inset-0 bg-black/50 z-0" 
            onPress={handleClose} 
         />

         {/* Bottom Sheet */}
         <View
            className="bg-card-bg rounded-t-3xl px-6 pt-6 mt-auto z-10"
            style={{ paddingBottom: insets.bottom + 20 }}
         >
            {/* Header */}
            <View className="mb-6">
               <View className="flex-row items-start justify-between mb-2">
                  <Text className="text-3xl font-bold text-text flex-1 mr-4">
                     {isSignUp ? 'Start your Growth' : 'Welcome Back'}
                  </Text>

                  {/* Close Button */}
                  <Pressable
                     onPress={handleClose}
                     hitSlop={15}
                     className="w-8 h-8 rounded-full items-center justify-center bg-gray-100 dark:bg-white/10 active:opacity-70"
                  >
                     <Ionicons
                        name="close"
                        size={20}
                        color={iconColor}
                        style={{ fontWeight: 'bold' }}
                     />
                  </Pressable>
               </View>

               <Text className="text-base text-text-subtle leading-snug">
                  {isSignUp
                     ? 'Create an account to save your journal and unlock AI insights.'
                     : 'Sign in to sync your entries and continue your journey.'}
               </Text>
            </View>

            {/* Social Auth Stack */}
            <View className="gap-3 mb-6">
               {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                     buttonType={
                        isSignUp
                           ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                           : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                     }
                     buttonStyle={
                        isDark
                           ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                           : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                     }
                     cornerRadius={14}
                     // Native components often need explicit style objects
                     style={{ width: '100%', height: 50 }}
                     onPress={handleAppleSignIn}
                  />
               )}

               <Pressable
                  className={`flex-row items-center justify-center h-[50px] rounded-[14px] border border-border gap-2 active:bg-border ${
                     socialSubmitting ? 'opacity-80' : ''
                  }`}
                  onPress={handleGoogleSignIn}
                  disabled={submitting || Boolean(socialSubmitting)}
               >
                  {socialSubmitting === 'google' ? (
                     <ActivityIndicator color={iconColor} />
                  ) : (
                     <>
                        <Ionicons
                           name="logo-google"
                           size={20}
                           color={iconColor}
                        />
                        <Text className="font-semibold text-[15px] text-text">
                           Continue with Google
                        </Text>
                     </>
                  )}
               </Pressable>
            </View>

            {/* Divider */}
            <View className="flex-row items-center gap-3 mb-6">
               <View className="flex-1 h-[1px] bg-border opacity-20" />
               <Text className="text-xs font-semibold text-text-subtle uppercase tracking-widest">
                  OR
               </Text>
               <View className="flex-1 h-[1px] bg-border opacity-20" />
            </View>

            {/* Form Inputs */}
            <View className="gap-4 mb-6">
               <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                  // 'placeholder-hint' class maps to text-hint color for placeholder? 
                  // Tailwind doesn't support placeholder-color via class easily in RN without config.
                  // Using inline for placeholder color is safest, or 'placeholder-hint' if configured plugin.
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'} 
                  value={email}
                  onChangeText={setEmail}
                  className="h-[54px] rounded-[14px] px-4 text-base border border-border bg-card-input text-text shadow-sm"
               />
               <TextInput
                  placeholder="Password"
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  className="h-[54px] rounded-[14px] px-4 text-base border border-border bg-card-input text-text shadow-sm"
               />
            </View>

            {localError && (
               <Text className="mb-4 text-center text-sm text-delete font-medium">
                  {localError}
               </Text>
            )}

            {/* Primary Action */}
            <Pressable
               className={`h-[54px] rounded-[14px] items-center justify-center mb-5 bg-disputeCTA shadow-md active:scale-[0.98] ${
                  submitting ? 'opacity-80' : ''
               }`}
               onPress={handleSubmit}
               disabled={submitting}
            >
               {submitting ? (
                  <ActivityIndicator color="#FFF" />
               ) : (
                  <Text className="text-white text-[17px] font-bold">
                     {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
               )}
            </Pressable>

            {/* Footer */}
            <Pressable
               className="items-center py-2"
               onPress={() => setIsSignUp(!isSignUp)}
            >
               <Text className="text-sm text-text-subtle">
                  {isSignUp ? 'Already have an account? ' : 'First time here? '}
                  <Text className="text-disputeCTA font-bold">
                     {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
               </Text>
            </Pressable>
         </View>
      </KeyboardAvoidingView>
   );
}