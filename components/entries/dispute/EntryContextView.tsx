import { palette } from '@/theme/colors';
import { shadowSoft } from '@/theme/shadows';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
   adversity: string;
   belief: string;
   consequence: string;
};

export default function EntryContextView({
   adversity,
   belief,
   consequence,
}: Props) {
   return (
      <View style={[styles.contextBox]}>
         <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>Adversity</Text>
            <Text style={styles.contextText}>{adversity}</Text>
         </View>
         <View style={styles.contextDivider} />
         <View style={styles.contextRow}>
            <Text style={styles.contextLabel}>Belief</Text>
            <Text style={styles.contextText}>{belief}</Text>
         </View>
         {consequence && (
            <>
               <View style={styles.contextDivider} />
               <View style={styles.contextRow}>
                  <Text style={styles.contextLabel}>Consequence</Text>
                  <Text style={styles.contextText}>{consequence}</Text>
               </View>
            </>
         )}
      </View>
   );
}

const styles = StyleSheet.create({
   contextBox: {
      backgroundColor: palette.cardGrey,
      padding: 12,
      borderRadius: 12,
      gap: 10,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#E5E7EB',

      ...shadowSoft
   },
   contextRow: { gap: 4 },
   contextLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: '#374151',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
   },
   contextText: { fontSize: 14, color: '#111827' },
   contextDivider: {
      height: 1,
      backgroundColor: '#E5E7EB',
      marginVertical: 2,
   },
});
