import { router, usePathname } from 'expo-router';
import { Text, Pressable, StyleSheet } from 'react-native';

type Prop = {
   id: string;
};

export default function AnalyzeButton({ id }: Prop) {
   const pathname = usePathname();
   const entryPath = `/entries/${id}`;
   const alreadyOnEntry = pathname === entryPath;

   function aiAnalysis() {
      if (!alreadyOnEntry) {
         router.push(entryPath as any);
      }
      router.push(`/entries/${id}/dispute?analyze=1`);
   }
   return (
      <Pressable style={styles.button} onPress={aiAnalysis}>
         <Text style={styles.buttonText}>Analyze with AI</Text>
      </Pressable>
   );
}

const styles = StyleSheet.create({
   button: {
      marginTop: 4,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: '#af2eccff',
      alignItems: 'center',
      justifyContent: 'center',
   },
   buttonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
   },
});
