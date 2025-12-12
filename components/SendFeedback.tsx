import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useCallback, useState } from 'react';
import {
   Pressable,
   Text,
   TextInput,
   View,
} from 'react-native';

export default function SendFeedback() {
   const { user } = useAuth();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';

   // Match 'text-hint' or 'text-muted-icon' from your global.css
   const iconColor = isDark ? '#64748b' : '#94a3b8'; 

   const [feedback, setFeedback] = useState('');
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [collapsed, setCollapsed] = useState(true);

   const handleSend = useCallback(async () => {
      const text = feedback.trim();
      if (!text) {
         setMessage('Add a quick note before sending.');
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
        setMessage('Thanks for the feedback.');
      } catch (err: any) {
        setMessage(err?.message ?? 'Unable to send feedback right now.');
      } finally {
        setLoading(false);
      }
   }, [feedback, user?.email, user?.id]);

   return (
      <View className="gap-2">
         {/* Header Row */}
         <Pressable 
            className="flex-row items-center justify-between py-1 active:opacity-60" 
            onPress={() => setCollapsed((c) => !c)}
         >
            <Text className="text-xs uppercase text-hint tracking-wider">
               Send feedback
            </Text>
            <Ionicons
               name={collapsed ? 'chevron-forward' : 'chevron-down'}
               size={18}
               color={iconColor}
            />
         </Pressable>

         {!collapsed && (
            <>
               <TextInput
                  className="min-h-[80px] border border-border rounded-xl p-3 text-sm bg-card-grey text-text"
                  placeholder="Tell us what is working or what is rough"
                  // Tailwind doesn't style placeholders easily, so we use inline hex
                  placeholderTextColor={iconColor}
                  multiline
                  value={feedback}
                  onChangeText={setFeedback}
                  editable={!loading}
                  textAlignVertical="top"
               />
               
               <Pressable
                  className={`bg-card-input py-3 rounded-xl items-center border border-border ${
                     loading ? 'opacity-60' : 'active:opacity-80'
                  }`}
                  onPress={handleSend}
                  disabled={loading}
               >
                  <Text className="text-text font-bold text-[15px]">
                     {loading ? 'Sending...' : 'Send Feedback'}
                  </Text>
               </Pressable>
               
               {message ? (
                  <Text className="text-xs text-text-subtle text-center">
                     {message}
                  </Text>
               ) : null}
            </>
         )}
      </View>
   );
}