import { Link } from "expo-router";
import { View, Text, Pressable } from "react-native";

type Prop = {
    id: string
}

export default function CTA({id} : Prop){
    return (
        <Pressable>
        <View style={{backgroundColor: 'orange'}}>
            <Link href={`/(tabs)/entries/${id}/dispute`} style={{textAlign:'center'}}>

                Call To Action

            </Link>
        </View>
        </Pressable>
    );
}