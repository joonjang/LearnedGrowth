import { router, usePathname } from 'expo-router';
import { Text, Pressable, StyleSheet } from 'react-native';
import { makeThemedStyles } from '@/theme/theme';

type Prop = {
   id: string;
};

export default function CTAButton({ id }: Prop) {
   const pathname = usePathname();
   const entryPath = `/entries/${id}`;
   const alreadyOnEntry = pathname === entryPath;
   const styles = useStyles();

   return (
      <Pressable
         style={styles.button}
         onPress={() => {
            if (!alreadyOnEntry) {
               router.push(entryPath as any);
            }
            router.push(`/entries/${id}/dispute`);
         }}
      >
         <Text style={styles.buttonText}>✨ Dispute this belief</Text>
      </Pressable>
   );
}

const useStyles = makeThemedStyles(({ colors }) =>
   StyleSheet.create({
      button: {
         marginTop: 4,
         paddingVertical: 10,
         paddingHorizontal: 12,
         borderRadius: 999,
         backgroundColor: colors.disputeCTA,
         alignItems: 'center',
         justifyContent: 'center',
      },
      buttonText: {
         fontSize: 16,
         fontWeight: '600',
         color: colors.ctaText,
      },
   })
);
