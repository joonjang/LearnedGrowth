import { Button, Text, TextInput, View } from "react-native";

type Props = {
  value: string;
  setValue: (text: string) => void;
  setAToB: (val: boolean) => void;
};

export function BeliefField({ value, setValue, setAToB }: Props){

    return(
        <View>
        <Text style={{backgroundColor:'orange'}}>
            Belief Field
        </Text>
        <TextInput
            editable
            multiline
            onChangeText={(inText) => setValue(inText)}
            value={value}
            style={{
               backgroundColor:'lightblue'
            }}
         />
        <Button onPress={() => setAToB(false)} title="Go to adversity" />
        </View>
    )
}