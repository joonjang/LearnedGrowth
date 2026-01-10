import { getShadow } from '@/lib/shadow';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
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
   const buttonShadow = useMemo(
      () => getShadow({ isDark, preset: 'button' }),
      [isDark]
   );

   // Matching the icon color from SettingsScreen
   const iconColor = isDark ? '#94a3b8' : '#64748b'; 

   const [feedback, setFeedback] = useState('');
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [collapsed, setCollapsed] = useState(true);

   const toggle = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCollapsed(!collapsed);
   };

   const handleSend = useCallback(async () => {
      const text = feedback.trim();
      if (!text) {
         setMessage('Please add a message first.');
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
        setMessage('Thanks! We read every message.');
        
        // Auto collapse after success
        setTimeout(() => {
            if (!collapsed) toggle();
            setMessage(null);
        }, 2000);

      } catch (err: any) {
        setMessage(err?.message ?? 'Unable to send feedback right now.');
      } finally {
        setLoading(false);
      }
   }, [feedback, user?.email, user?.id, collapsed]);

   return (
      <View>
         {/* Header Row - Styled exactly like Account Actions */}
         <Pressable 
            className="flex-row items-center justify-between active:opacity-60" 
            onPress={toggle}
         >
            <Text className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
               Send Feedback
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
                  placeholder="Tell us what is working or what could be better..."
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
                         Send Message
                      </Text>
                  )}
               </Pressable>
               
               {message && (
                  <Text className={`text-xs text-center font-medium ${message.includes('Thanks') ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                     {message}
                  </Text>
               )}
            </View>
         )}
      </View>
   );
}
