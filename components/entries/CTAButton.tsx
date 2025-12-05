import { router } from 'expo-router';
import { Text, Pressable, StyleSheet } from 'react-native';

type Prop = {
   id: string;
};

export default function CTAButton({ id }: Prop) {
   return (
         <Pressable
            style={styles.button}
            onPress={() => {
               router.push(`/(tabs)/entries/${id}/dispute`);
            }}
         >
            <Text style={styles.buttonText}>✨ Dispute this belief</Text>
         </Pressable>
   );
}

const styles = StyleSheet.create({
   button: {
      marginTop: 4,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: '#2ECC71',
      alignItems: 'center',
      justifyContent: 'center',
   },
   buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
   },
});
