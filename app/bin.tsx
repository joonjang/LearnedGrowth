import { useDeletedEntries } from '@/hooks/useDeletedEntries';
import { useEntries } from '@/hooks/useEntries';
import { formatDateTimeWithWeekday } from '@/lib/date';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { useEntriesAdapter } from '@/providers/AdapterProvider';
import { useAuth } from '@/providers/AuthProvider';
import { createSupabaseEntriesClient } from '@/services/supabaseEntries';
import NetInfo from '@react-native-community/netinfo';
import { router, useFocusEffect } from 'expo-router';
import { ChevronLeft, RotateCcw, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
   ActivityIndicator,
   Alert,
   FlatList,
   Pressable,
   Text,
   View,
} from 'react-native';
import Animated, { FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeleteBinScreen() {
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
   const { refresh: refreshEntriesStore } = useEntries();
   const {
      deletedEntries,
      deletedCount,
      loading,
      error,
      refresh,
   } = useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const [isOffline, setIsOffline] = useState(false);
   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );
   const cloud = useMemo(() => {
      if (!user?.id) return null;
      return createSupabaseEntriesClient(user.id);
   }, [user?.id]);
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [restoringId, setRestoringId] = useState<string | null>(null);
   const [deletingAll, setDeletingAll] = useState(false);

   const canUseCloud = Boolean(user?.id && cloud && !isOffline);

   useFocusEffect(
      useCallback(() => {
         refresh();
      }, [refresh])
   );

   useEffect(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
         const connected = state.isConnected;
         const reachable = state.isInternetReachable;
         setIsOffline(connected === false || reachable === false);
      });
      return () => unsubscribe();
   }, []);

   const deleteEntry = useCallback(
      async (entry: Entry) => {
         if (!adapter || !ready) return;
         setDeletingId(entry.id);
         try {
            if (canUseCloud && cloud) {
               await cloud.hardDelete(entry.id);
            }
            await adapter.hardDelete(entry.id);
            await refresh();
            await refreshEntriesStore();
         } catch (e: any) {
            Alert.alert(
               'Delete failed',
               e?.message ?? 'Unable to delete this entry right now.'
            );
         } finally {
            setDeletingId((current) => (current === entry.id ? null : current));
         }
      },
      [adapter, canUseCloud, cloud, ready, refresh, refreshEntriesStore]
   );

   const confirmDelete = useCallback(
      (entry: Entry) => {
         const detail = canUseCloud
            ? 'This will remove the entry from this device and the cloud.'
            : 'This will remove the entry from this device.';
         Alert.alert(
            'Delete permanently?',
            detail,
            [
               { text: 'Cancel', style: 'cancel' },
               {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteEntry(entry),
               },
            ]
         );
      },
      [canUseCloud, deleteEntry]
   );

   const restoreEntry = useCallback(
      async (entry: Entry) => {
         if (!adapter || !ready) return;
         setRestoringId(entry.id);
         try {
            const restored = await adapter.update(entry.id, { isDeleted: false });
            if (canUseCloud && cloud) {
               await cloud.upsert(restored);
            }
            await refresh();
            await refreshEntriesStore();
         } catch (e: any) {
            Alert.alert(
               'Restore failed',
               e?.message ?? 'Unable to restore this entry right now.'
            );
         } finally {
            setRestoringId((current) => (current === entry.id ? null : current));
         }
      },
      [adapter, canUseCloud, cloud, ready, refresh, refreshEntriesStore]
   );

   const deleteAll = useCallback(async () => {
      if (!adapter || !ready || deletedEntries.length === 0) return;
      setDeletingAll(true);
      try {
         for (const entry of deletedEntries) {
            if (canUseCloud && cloud) {
               await cloud.hardDelete(entry.id);
            }
            await adapter.hardDelete(entry.id);
         }
         await refresh();
         await refreshEntriesStore();
      } catch (e: any) {
         Alert.alert(
            'Delete failed',
            e?.message ?? 'Unable to delete all entries right now.'
         );
      } finally {
         setDeletingAll(false);
      }
   }, [
      adapter,
      canUseCloud,
      cloud,
      deletedEntries,
      ready,
      refresh,
      refreshEntriesStore,
   ]);

   const confirmDeleteAll = useCallback(() => {
      const detail = canUseCloud
         ? 'This will remove all deleted entries from this device and the cloud.'
         : 'This will remove all deleted entries from this device.';
      Alert.alert('Delete all permanently?', detail, [
         { text: 'Cancel', style: 'cancel' },
         { text: 'Delete All', style: 'destructive', onPress: deleteAll },
      ]);
   }, [canUseCloud, deleteAll]);

   const iconColor = isDark ? '#cbd5e1' : '#475569';
   const deleteColor = isDark ? '#fca5a5' : '#dc2626';
   const restoreColor = isDark ? '#86efac' : '#16a34a';

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <View
            className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800"
            style={{ paddingTop: insets.top + 16 }}
         >
            <View className="flex-row items-start gap-2">
               <Pressable
                  onPress={() => router.back()}
                  hitSlop={8}
                  className="mt-1 p-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800"
               >
                  <ChevronLeft size={26} strokeWidth={2.8} color={iconColor} />
               </Pressable>
               <View className="flex-1">
                  <Text className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                     Delete Bin
                  </Text>
                  <Text
                     numberOfLines={1}
                     className="text-[15px] font-medium text-slate-500 dark:text-slate-400 mt-0.5"
                  >
                     {deletedCount > 0
                        ? `${deletedCount} deleted ${deletedCount === 1 ? 'entry' : 'entries'}`
                        : 'No deleted entries'}
                  </Text>
               </View>
               {deletedCount > 0 && (
                  <Pressable
                     onPress={confirmDeleteAll}
                     disabled={deletingAll}
                     className="mt-1 p-2 rounded-full active:bg-slate-100 dark:active:bg-slate-800"
                  >
                     {deletingAll ? (
                        <ActivityIndicator size="small" color={deleteColor} />
                     ) : (
                        <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                           Delete all
                        </Text>
                     )}
                  </Pressable>
               )}
            </View>
         </View>

         {error && (
            <View className="px-6 py-3">
               <Text className="text-sm text-rose-600 dark:text-rose-400">
                  {error}
               </Text>
            </View>
         )}

         {loading && deletedCount === 0 ? (
            <View className="flex-1 items-center justify-center">
               <ActivityIndicator size="small" color={iconColor} />
            </View>
         ) : (
            <FlatList
               data={deletedEntries}
               keyExtractor={(item) => item.id}
               contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 24 }}
               renderItem={({ item }) => (
                  <Animated.View
                     layout={LinearTransition.duration(180)}
                     exiting={FadeOutUp.duration(180)}
                     className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4"
                     style={shadowSm.style}
                  >
                     <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                           Deleted
                        </Text>
                        <Text className="text-xs text-slate-400 dark:text-slate-500">
                           {formatDateTimeWithWeekday(item.updatedAt)}
                        </Text>
                     </View>
                     <View className="gap-2">
                        {[
                           { label: 'Adversity', value: item.adversity },
                           { label: 'Belief', value: item.belief },
                           { label: 'Consequence', value: item.consequence },
                           { label: 'Dispute', value: item.dispute },
                           { label: 'Energy', value: item.energy },
                        ]
                           .filter((field) => (field.value ?? '').trim().length > 0)
                           .map((field) => (
                              <View key={field.label} className="gap-0.5">
                                 <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    {field.label}
                                 </Text>
                                 <Text className="text-sm text-slate-700 dark:text-slate-300">
                                    {field.value}
                                 </Text>
                              </View>
                           ))}
                     </View>
                     <View className="flex-row items-center justify-between mt-4 gap-3">
                        <Pressable
                           onPress={() => restoreEntry(item)}
                           disabled={restoringId === item.id}
                           className="flex-1 flex-row items-center justify-center gap-2 px-3 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 active:opacity-80"
                           style={restoringId === item.id ? { opacity: 0.6 } : undefined}
                        >
                           {restoringId === item.id ? (
                              <ActivityIndicator size="small" color={restoreColor} />
                           ) : (
                              <RotateCcw size={16} color={restoreColor} />
                           )}
                           <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                              Restore
                           </Text>
                        </Pressable>
                        <Pressable
                           onPress={() => confirmDelete(item)}
                           disabled={deletingId === item.id}
                           className="flex-1 flex-row items-center justify-center gap-2 px-3 py-2 rounded-full bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 active:opacity-80"
                           style={deletingId === item.id ? { opacity: 0.6 } : undefined}
                        >
                           {deletingId === item.id ? (
                              <ActivityIndicator size="small" color={deleteColor} />
                           ) : (
                              <Trash2 size={16} color={deleteColor} />
                           )}
                           <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                              Delete permanently
                           </Text>
                        </Pressable>
                     </View>
                  </Animated.View>
               )}
               ListEmptyComponent={
                  <View className="items-center justify-center py-16">
                     <Text className="text-sm text-slate-500 dark:text-slate-400">
                        Deleted entries will show up here.
                     </Text>
                  </View>
               }
            />
         )}
      </View>
   );
}
