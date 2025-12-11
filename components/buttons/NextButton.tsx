export default function NextButton(){
    return ();
}


// import { makeThemedStyles } from '@/theme/theme';
// import { router, usePathname } from 'expo-router';
// import { Pressable, StyleSheet, Text } from 'react-native';

// type Prop = {
//    id: string;
// };

// export default function AnalyzeButton({ id }: Prop) {
//    const pathname = usePathname();
//    const entryPath = `/entries/${id}`;
//    const alreadyOnEntry = pathname === entryPath;
//    const styles = useStyles();

//    function aiAnalysis() {
//       if (!alreadyOnEntry) {
//          router.push(entryPath as any);
//       }
//       router.push(`/entries/${id}/dispute?analyze=1`);
//    }
//    return (
//       <Pressable style={styles.button} onPress={aiAnalysis}>
//          <Text style={styles.buttonText}>Next</Text>
//       </Pressable>
//    );
// }

// const useStyles = makeThemedStyles(({ colors }) =>
//    StyleSheet.create({
//       button: {
//          marginTop: 4,
//          paddingVertical: 10,
//          paddingHorizontal: 12,
//          borderRadius: 999,
//          backgroundColor: colors.cta,
//          alignItems: 'center',
//          justifyContent: 'center',
//       },
//       buttonText: {
//          fontSize: 16,
//          fontWeight: '600',
//          color: colors.ctaText,
//       },
//    })
// );
