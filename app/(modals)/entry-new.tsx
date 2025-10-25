import { AdversityField } from "@/components/entries/AdversityField";
import { BeliefField } from "@/components/entries/BeliefField";
import { useEntries } from "@/features/entries/hooks/useEntries";
import { useState } from "react";
import { Button, Text, View } from "react-native";

export default function NewEntryModal() {
  const [adversity, setAdversity] = useState("Adversity Input");
  const [belief, setBelief] = useState("Belief Input");
  const [aToB, setAToB] = useState(false);
  const entries = useEntries();

  function submit(){
    entries.createEntry(adversity, belief);
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>New Entry Modal</Text>
      {!aToB && <AdversityField value={adversity} setValue={setAdversity} setAToB={setAToB} />}
      {aToB && <BeliefField value={belief} setValue={setBelief} setAToB={setAToB} />}

      <Button title="Submit" color={'red'} onPress={submit}/>
    </View>
  );
}
