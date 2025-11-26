import { Entry } from "@/models/entry";
import { Text, View, StyleSheet } from "react-native";
import CTA from "./CTA";

type Prop = {
    entry: Entry
}

export default function EntryCard({entry}: Prop){

    return(
        <View style={styles.card}>
            <View style={styles.section}>
                <Text style={styles.label}>
                    Adversity
                </Text>
                <Text style={styles.text}>
                    {entry.adversity}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>
                    Belief
                </Text>
                <View style={styles.beliefBox}>
                <Text style={styles.beliefText}>
                    {entry.belief}
                </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>
                    Consequence
                </Text>
                <Text style={styles.text}>
                    {entry.consequence}
                </Text>
            </View>

            {!entry.dispute ? <CTA id={entry.id} /> 
            :<>
            <View style={styles.section}>
                <Text style={styles.label}>
                    Dispute
                </Text>
                <Text style={styles.text}>
                    {entry.dispute}
                </Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.label}>
                    Energy
                </Text>
                <Text style={styles.text}>
                    {entry.energy}
                </Text>
            </View>
            </>
            }
        </View>
    );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
  },
  section: {
    marginBottom: 8
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280', // gray-500-ish
    marginBottom: 2,
  },
  text: {
    fontSize: 14,
    color: '#111827',
  },
  beliefBox: {
    marginHorizontal: -16,       
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFE4E6',
    borderWidth: 1,
  borderColor: '#FDA4AF',

  },
  beliefText: {
    fontSize: 14,
    fontWeight: '500',
    // fontStyle: 'italic',

    color: '#9F1239',
  },
});