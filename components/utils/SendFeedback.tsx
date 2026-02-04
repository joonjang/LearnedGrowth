import { getShadow } from '@/lib/shadow';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useCallback, useMemo, useState } from 'react';
import {
   ActivityIndicator,
   LayoutAnimation,
   Pressable,
   Text,
   TextInput,
   View,
} from 'react-native';

export default function SendFeedback() {
   const { user } = useAuth();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { t } = useTranslation();
   const buttonShadow = useMemo(
      () => getShadow({ isDark, preset: 'button' }),
      [isDark]
   );

   // Matching the icon color from SettingsScreen
   const iconColor = isDark ? '#94a3b8' : '#64748b'; 

   const [feedback, setFeedback] = useState('');
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<{
      text: string;
      tone: 'success' | 'error';
   } | null>(null);
   const [collapsed, setCollapsed] = useState(true);

   const toggle = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed((prev) => !prev);
   }, []);

   const handleSend = useCallback(async () => {
      const text = feedback.trim();
      if (!text) {
         setMessage({ text: t('feedback.empty'), tone: 'error' });
         return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('feedback').insert({
           message: text,
           user_id: user?.id ?? null,
           email: user?.email ?? null,
        });
        if (error) throw new Error(error.message);
        
        setFeedback('');
        setMessage({ text: t('feedback.success'), tone: 'success' });
        
        // Auto collapse after success
        setTimeout(() => {
            if (!collapsed) toggle();
            setMessage(null);
        }, 2000);

      } catch (err: any) {
        setMessage({
           text: err?.message ?? t('feedback.failed'),
           tone: 'error',
        });
      } finally {
        setLoading(false);
      }
   }, [feedback, user?.email, user?.id, collapsed, t, toggle]);

   return (
      <View>
         {/* Header Row - Styled exactly like Account Actions */}
         <Pressable 
            className="flex-row items-center justify-between active:opacity-60" 
            onPress={toggle}
         >
            <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
               {t('feedback.title')}
            </Text>
            {collapsed ? (
               <ChevronDown size={20} color={iconColor} />
            ) : (
               <ChevronUp size={20} color={iconColor} />
            )}
         </Pressable>

         {!collapsed && (
            <View className="pt-4 gap-3">
               <View className="h-[1px] bg-slate-100 dark:bg-slate-800 mb-1" />

               <TextInput
                  className="min-h-[100px] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-[15px] bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 leading-5"
                  placeholder={t('feedback.placeholder')}
                  placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                  multiline
                  value={feedback}
                  onChangeText={setFeedback}
                  editable={!loading}
                  textAlignVertical="top"
               />
               
               <Pressable
                  className={`bg-slate-900 dark:bg-slate-100 py-3 rounded-xl items-center ${
                     loading ? 'opacity-70' : 'active:opacity-80'
                  }`}
                  style={[buttonShadow.ios, buttonShadow.android]}
                  onPress={handleSend}
                  disabled={loading}
               >
                  {loading ? (
                      <ActivityIndicator size="small" color={isDark ? 'black' : 'white'} />
                  ) : (
                      <Text className="text-white dark:text-slate-900 font-bold text-[15px]">
                         {t('feedback.send')}
                      </Text>
                  )}
               </Pressable>
               
               {message && (
                  <Text
                     className={`text-xs text-center font-medium ${
                        message.tone === 'success'
                           ? 'text-green-600 dark:text-green-400'
                           : 'text-red-500'
                     }`}
                  >
                     {message.text}
                  </Text>
               )}
            </View>
         )}
      </View>
   );
}
