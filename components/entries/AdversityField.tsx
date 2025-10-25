import { Button, Text, TextInput, View } from 'react-native';

type Props = {
  value: string;
  setValue: (text: string) => void;
  setAToB: (val: boolean) => void;
};

export function AdversityField({ value, setValue, setAToB }: Props) {

   return (
      <View>
         <Text style={{ backgroundColor: 'yellow' }}>Adversity Field</Text>
         <TextInput
            editable
            multiline
            onChangeText={(inText) => setValue(inText)}
            value={value}
            style={{
               backgroundColor:'lightgrey'
            }}
         />
         <Button onPress={()=>setAToB(true)} title='Open Belief' />
      </View>
   );
}
