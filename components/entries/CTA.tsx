import { router } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Prop = {
   id: string;
};

export default function CTA({ id }: Prop) {
   return (
      <View>
         

         <Pressable
            style={styles.button}
            onPress={() => {
               router.push(`/(tabs)/entries/${id}/dispute`);
            }}
         >
            <Text style={styles.buttonText}>✨ Challenge this belief</Text>
         </Pressable>
      </View>
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
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
   },
});
