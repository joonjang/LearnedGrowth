// app/(tabs)/dev/index.tsx
import React, { useMemo } from "react";
import { View, Text, Button, FlatList, Pressable } from "react-native";
import { useEntriesStore } from "@/providers/EntriesStoreProvider";
import * as Crypto from "expo-crypto";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DevScreen() {
  const store = useEntriesStore();

  // subscribe to slices separately (no object literals)
  const allIds = store((s) => s.allIds);
  const byId = store((s) => s.byId);
  const isHydrating = store((s) => s.isHydrating);
  const pending = store((s) => s.pending);
  const errors = store((s) => s.errors);

  // derive rows with memo so FlatList gets a stable ref unless data changes
  const rows = useMemo(() => allIds.map((id) => byId[id]).filter(Boolean), [allIds, byId]);

  async function onHydrate() { await store.getState().hydrate(); }
  async function onRefresh() { await store.getState().refresh(); }
  async function onInsert() {
    const now = new Date().toISOString();
    const draft = {
      id: Crypto.randomUUID(),
      adversity: "test",
      belief: "belief",
      consequence: "",
      dispute: "",
      energy: "5",
      createdAt: now,
      updatedAt: now,
      accountId: null,
      dirtySince: null,
      isDeleted: false,
    };
    await store.getState().create(draft);
  }
  async function onUpdate(id: string) {
    const now = new Date().toISOString();
    await store.getState().update(id, { belief: "updated", updatedAt: now });
  }
  async function onDelete(id: string) { await store.getState().remove(id); }

  return (
    <SafeAreaView style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: "row" }}>
        <Button title={isHydrating ? "Hydrating..." : "Hydrate"} onPress={onHydrate} />
        <Button title="Refresh" onPress={onRefresh} />
        <Button title="Insert" onPress={onInsert} />
        <Button title="Clear Errors" onPress={() => store.getState().clearErrors()} />
      </View>

      {"global" in errors && errors["global"] ? <Text>Global error: {String(errors["global"])}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        renderItem={({ item: e }) => (
          <View style={{ paddingVertical: 8, borderBottomWidth: 1 }}>
            <Text>{e.adversity}</Text>
            <Text>{e.belief}</Text>
            <Text>{e.updatedAt}</Text>
            {pending[e.id] ? <Text>pending: {pending[e.id].op}</Text> : null}
            {errors[e.id] ? <Text>error: {String(errors[e.id])}</Text> : null}
            <View style={{ flexDirection: "row" }}>
              <Pressable onPress={() => onUpdate(e.id)}><Text>Update</Text></Pressable>
              <Pressable onPress={() => onDelete(e.id)}><Text> Delete</Text></Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>No entries yet.</Text>}
      />
    </SafeAreaView>
  );
}
