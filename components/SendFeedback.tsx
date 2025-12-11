import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import {
   Pressable,
   StyleSheet,
   Text,
   TextInput,
   View,
} from 'react-native';
import { useState, useCallback } from 'react';
import { makeThemedStyles } from '@/theme/theme';

export default function SendFeedback() {
   const { user } = useAuth();
   const [feedback, setFeedback] = useState('');
   const [loading, setLoading] = useState(false);
   const [message, setMessage] = useState<string | null>(null);
   const [collapsed, setCollapsed] = useState(true);
   const { styles, iconColor } = useStyles();

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
      <View style={styles.feedbackBlock}>
         <Pressable style={styles.headerRow} onPress={() => setCollapsed((c) => !c)}>
            <Text style={styles.label}>Send feedback</Text>
            <Ionicons
               name={collapsed ? 'chevron-forward' : 'chevron-down'}
               size={18}
               color={iconColor}
            />
         </Pressable>

         {!collapsed && (
            <>
               <TextInput
                  style={styles.input}
                  placeholder="Tell us what is working or what is rough"
                  multiline
                  value={feedback}
                  onChangeText={setFeedback}
                  editable={!loading}
               />
               <Pressable
                  style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSend}
                  disabled={loading}
               >
                  <Text style={styles.secondaryLabel}>
                     {loading ? 'Sending...' : 'Send Feedback'}
                  </Text>
               </Pressable>
               {message ? <Text style={styles.noteText}>{message}</Text> : null}
            </>
         )}
      </View>
   );
}

const useStyles = makeThemedStyles(({ colors }) => ({
   styles: StyleSheet.create({
      label: {
         fontSize: 12,
         textTransform: 'uppercase',
         color: colors.hint,
         letterSpacing: 0.5,
      },
      feedbackBlock: {
         gap: 8,
      },
      headerRow: {
         flexDirection: 'row',
         alignItems: 'center',
         justifyContent: 'space-between',
      },
      input: {
         minHeight: 80,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         borderRadius: 12,
         padding: 12,
         fontSize: 14,
         backgroundColor: colors.cardGrey,
         textAlignVertical: 'top',
         color: colors.text,
      },
      secondaryButton: {
         backgroundColor: colors.cardInput,
         paddingVertical: 12,
         borderRadius: 12,
         alignItems: 'center',
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
      },
      secondaryLabel: {
         color: colors.text,
         fontWeight: '700',
         fontSize: 15,
      },
      buttonDisabled: {
         opacity: 0.6,
      },
      noteText: {
         fontSize: 12,
         color: colors.textSubtle,
      },
   }),
   iconColor: colors.mutedIcon,
}));
