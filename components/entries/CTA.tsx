import { router } from 'expo-router';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Prop = {
  id: string;
};

export default function CTA({ id }: Prop) {
  return (
    <View>
      <View style={styles.divider} />

      <Pressable
        style={styles.button}
        onPress={() =>
          router.push({
            pathname: '/(cards)/[id]/dispute',
            params: {
              id,
              animateFromBottom: '1',
            },
          })
        }
      >
        <Text style={styles.buttonText}>✨ Challenge this belief</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 0.5,
    backgroundColor: '#9E9E9E',
    marginVertical: 8,
  },
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
