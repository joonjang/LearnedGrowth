import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { makeThemedStyles } from '@/theme/theme';

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
   const styles = useStyles();
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

const useStyles = makeThemedStyles(({ colors, typography, components, shadows }) =>
   StyleSheet.create({
      contextBox: {
         backgroundColor: colors.cardGrey,
         padding: 12,
         borderRadius: 12,
         gap: 10,
         borderWidth: StyleSheet.hairlineWidth,
         borderColor: colors.border,
         ...shadows.shadowSoft,
      },
      contextRow: { gap: 4 },
      contextLabel: {
         ...typography.caption,
         fontWeight: '700',
         color: colors.textSubtle,
         textTransform: 'uppercase',
         letterSpacing: 0.4,
      },
      contextText: { ...typography.body },
      contextDivider: {
         height: 1,
         backgroundColor: colors.border,
         marginVertical: 2,
      },
   })
);
