import { useDeletedEntries } from '@/hooks/useDeletedEntries';
import { formatDateTimeWithWeekday } from '@/lib/date';
import { getShadow } from '@/lib/shadow';
import { Entry } from '@/models/entry';
import { useEntriesAdapter } from '@/providers/AdapterProvider';
import { useAuth } from '@/providers/AuthProvider';
import { createSupabaseEntriesClient } from '@/services/supabaseEntries';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo, useState } from 'react';
import {
   ActivityIndicator,
   Alert,
   FlatList,
   Pressable,
   Text,
   View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeleteBinScreen() {
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
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
   const shadowSm = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark]
   );
   const cloud = useMemo(() => {
      if (!user?.id) return null;
      return createSupabaseEntriesClient(user.id);
   }, [user?.id]);
   const [deletingId, setDeletingId] = useState<string | null>(null);

   useFocusEffect(
      useCallback(() => {
         refresh();
      }, [refresh])
   );

   const deleteEntry = useCallback(
      async (entry: Entry) => {
         if (!adapter || !ready) return;
         setDeletingId(entry.id);
         try {
            if (user?.id && cloud) {
               await cloud.hardDelete(entry.id);
            }
            await adapter.hardDelete(entry.id);
            await refresh();
         } catch (e: any) {
            Alert.alert(
               'Delete failed',
               e?.message ?? 'Unable to delete this entry right now.'
            );
         } finally {
            setDeletingId((current) => (current === entry.id ? null : current));
         }
      },
      [adapter, cloud, ready, refresh, user?.id]
   );

   const confirmDelete = useCallback(
      (entry: Entry) => {
         Alert.alert(
            'Delete permanently?',
            'This will remove the entry from this device and the cloud.',
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
      [deleteEntry]
   );

   const iconColor = isDark ? '#cbd5e1' : '#475569';
   const deleteColor = isDark ? '#fca5a5' : '#dc2626';

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         <View
            className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800"
            style={{ paddingTop: insets.top + 12 }}
         >
            <View className="flex-row items-center justify-between">
               <Pressable
                  onPress={() => router.back()}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80"
               >
                  <ArrowLeft size={20} color={iconColor} strokeWidth={2.5} />
               </Pressable>
               <Text className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Delete Bin
               </Text>
               <View className="h-10 w-10" />
            </View>
            <Text className="text-sm text-slate-500 dark:text-slate-400 mt-3">
               {deletedCount > 0
                  ? `${deletedCount} deleted ${deletedCount === 1 ? 'entry' : 'entries'}`
                  : 'No deleted entries'}
            </Text>
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
                  <View
                     className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4"
                     style={shadowSm}
                  >
                     <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                           Deleted
                        </Text>
                        <Text className="text-xs text-slate-400 dark:text-slate-500">
                           {formatDateTimeWithWeekday(item.updatedAt)}
                        </Text>
                     </View>
                     <Text className="text-base font-semibold text-slate-900 dark:text-white">
                        {item.adversity}
                     </Text>
                     <Text className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {item.belief}
                     </Text>
                     <View className="flex-row items-center justify-end mt-4">
                        <Pressable
                           onPress={() => confirmDelete(item)}
                           disabled={deletingId === item.id}
                           className="flex-row items-center gap-2 px-3 py-2 rounded-full bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 active:opacity-80"
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
                  </View>
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
