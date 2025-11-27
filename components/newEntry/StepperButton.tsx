import { canGoBack } from 'expo-router/build/global-state/routing';
import { View, Button, StyleSheet } from 'react-native';

export default function StepperButton() {
   return (
      <View style={styles.container} >
         <Button title="Back" />
         <View style={styles.divider} />
         <Button title="Next" />
      </View>
   );
}

const styles = StyleSheet.create({
    container:{
        flexDirection: 'row',
        justifyContent:'space-evenly',
        padding: 8
        // backgroundColor: 'yellow'
    },
    divider: {
        width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#e5e5e5',
    marginHorizontal: 8,
    }
})