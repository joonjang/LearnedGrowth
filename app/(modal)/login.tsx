import { useAuth } from '@/providers/AuthProvider';
import { shadowSoft } from '@/theme/shadows';
import { useTheme } from '@/theme/theme';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
   ActivityIndicator,
   KeyboardAvoidingView,
   Platform,
   Pressable,
   StyleSheet,
   Text,
   TextInput,
   View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthModal() {
   const router = useRouter();
   const insets = useSafeAreaInsets();
   const { colors, mode } = useTheme();
   const { signIn, signUp, signInWithApple, signInWithGoogle } = useAuth();

   const [isSignUp, setIsSignUp] = useState(false);
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [submitting, setSubmitting] = useState(false);
   const [socialSubmitting, setSocialSubmitting] = useState<'apple' | 'google' | null>(null);
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
         style={{ flex: 1 }}
      >
         <Pressable 
            style={styles.overlayBackdrop} 
            onPress={handleClose} 
         />

         <View style={[
            styles.sheet, 
            { 
               backgroundColor: colors.cardBg,
               paddingBottom: insets.bottom + 20,
            }
         ]}>
            
            {/* Drag Handle */}
            <View style={styles.handleContainer}>
               <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={styles.header}>
               <Text style={[styles.title, { color: colors.text }]}>
                  {isSignUp ? 'Start your Growth' : 'Welcome Back'}
               </Text>
               <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
                  {isSignUp 
                     ? 'Create an account to save your journal and unlock AI insights.' 
                     : 'Sign in to sync your entries and continue your journey.'}
               </Text>
            </View>

            {/* Social Auth - STACKED */}
            <View style={styles.socialStack}>
               {Platform.OS === 'ios' && (
                  <AppleAuthentication.AppleAuthenticationButton
                     buttonType={
                        isSignUp 
                        ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                        : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                     }
                     buttonStyle={
                        mode === 'dark'
                           ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                           : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                     }
                     cornerRadius={14}
                     style={styles.appleBtnFixed}
                     onPress={handleAppleSignIn}
                  />
               )}

               <Pressable
                  style={({ pressed }) => [
                     styles.socialBtn,
                     { 
                        borderColor: colors.border, 
                        backgroundColor: pressed ? colors.border : 'transparent',
                        opacity: socialSubmitting ? 0.8 : 1 
                     },
                  ]}
                  onPress={handleGoogleSignIn}
                  disabled={submitting || Boolean(socialSubmitting)}
               >
                  {socialSubmitting === 'google' ? (
                     <ActivityIndicator color={colors.text} />
                  ) : (
                     <>
                        <Ionicons name="logo-google" size={20} color={colors.text} />
                        <Text style={[styles.socialText, { color: colors.text }]}>
                           Continue with Google
                        </Text>
                     </>
                  )}
               </Pressable>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
               <View style={[styles.line, { backgroundColor: colors.border }]} />
               <Text style={[styles.orText, { color: colors.textSubtle }]}>OR</Text>
               <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            {/* Inputs */}
            <View style={styles.form}>
               <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="Email address"
                  placeholderTextColor={colors.hint}
                  value={email}
                  onChangeText={setEmail}
                  style={[styles.input, { 
                     backgroundColor: colors.cardInput, 
                     color: colors.text,
                     borderColor: colors.border // <--- Added dynamic border color
                  }]}
               />
               <TextInput
                  placeholder="Password"
                  placeholderTextColor={colors.hint}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={[styles.input, { 
                     backgroundColor: colors.cardInput, 
                     color: colors.text,
                     borderColor: colors.border // <--- Added dynamic border color
                  }]}
               />
            </View>

            {localError && (
               <Text style={[styles.error, { color: colors.delete }]}>{localError}</Text>
            )}

            {/* Primary Action */}
            <Pressable
               style={({ pressed }) => [
                  styles.primaryBtn,
                  { 
                     backgroundColor: colors.disputeCTA, 
                     opacity: pressed || submitting ? 0.8 : 1,
                     transform: [{ scale: pressed ? 0.98 : 1 }]
                  }
               ]}
               onPress={handleSubmit}
               disabled={submitting}
            >
               {submitting ? (
                  <ActivityIndicator color="#FFF" />
               ) : (
                  <Text style={styles.primaryBtnText}>
                     {isSignUp ? 'Create Account' : 'Sign In'}
                  </Text>
               )}
            </Pressable>

            {/* Footer */}
            <Pressable 
               style={styles.footerLink} 
               onPress={() => setIsSignUp(!isSignUp)}
            >
               <Text style={[styles.footerText, { color: colors.textSubtle }]}>
                  {isSignUp ? 'Already have an account? ' : 'First time here? '}
                  <Text style={{ color: colors.disputeCTA, fontWeight: '700' }}>
                     {isSignUp ? 'Sign In' : 'Sign Up'}
                  </Text>
               </Text>
            </Pressable>

         </View>
      </KeyboardAvoidingView>
   );
}

const styles = StyleSheet.create({
   overlayBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', 
      zIndex: 0,
   },
   sheet: {
      backgroundColor: 'white',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingTop: 12,
      marginTop: 'auto', 
      zIndex: 1,
   },
   handleContainer: {
      alignItems: 'center',
      marginBottom: 20,
   },
   handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      opacity: 0.3,
   },
   header: {
      marginBottom: 24,
   },
   title: {
      fontSize: 28,
      fontWeight: '700',
      marginBottom: 8,
   },
   subtitle: {
      fontSize: 15,
      lineHeight: 22,
   },
   socialStack: {
      flexDirection: 'column', 
      gap: 12, 
      marginBottom: 24,
   },
   appleBtnFixed: {
       width: '100%', 
       height: 50, 
   },
   socialBtn: {
      width: '100%', 
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      gap: 8,
      height: 50, 
   },
   socialText: {
      fontWeight: '600',
      fontSize: 15,
   },
   dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      gap: 12,
   },
   line: {
      flex: 1,
      height: 1,
      opacity: 0.2,
   },
   orText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
   },
   form: {
      gap: 16,
      marginBottom: 24,
   },
   input: {
      height: 54,
      borderRadius: 14,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1, // <--- Added fixed width (the color is dynamic above)
      ...shadowSoft
   },
   error: {
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 14,
   },
   primaryBtn: {
      height: 54,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
   },
   primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
   },
   footerLink: {
      alignItems: 'center',
      paddingVertical: 8,
   },
   footerText: {
      fontSize: 14,
   },
});