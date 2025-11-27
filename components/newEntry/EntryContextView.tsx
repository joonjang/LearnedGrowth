import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';

type Props = {
  adversity: string;
  belief: string;
  style?: StyleProp<ViewStyle>;
};

export default function EntryContextView({ adversity, belief, style }: Props) {
  return (
    <View style={[styles.contextBox, style]}>
      <View style={styles.contextRow}>
        <Text style={styles.contextLabel}>Adversity</Text>
        <Text style={styles.contextText}>{adversity}</Text>
      </View>
      <View style={styles.contextDivider} />
      <View style={styles.contextRow}>
        <Text style={styles.contextLabel}>Belief</Text>
        <Text style={styles.contextText}>{belief}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contextBox: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  contextRow: { gap: 4 },
  contextLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  contextText: { fontSize: 14, color: '#111827' },
  contextDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
});
