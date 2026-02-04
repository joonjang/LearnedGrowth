import LeftBackChevron from '@/components/buttons/LeftBackChevron';
import BottomFade from '@/components/utils/BottomFade';
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
import { RotateCcw, Trash2 } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
   ActivityIndicator,
   Alert,
   FlatList,
   Pressable,
   Text,
   View,
} from 'react-native';
import Animated, {
   FadeOutUp,
   LinearTransition,
   useAnimatedScrollHandler,
   useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedFlatList = Animated.createAnimatedComponent(
   FlatList,
) as typeof FlatList;

export default function DeleteBinScreen() {
   // --- HOOKS & CONTEXT ---
   const { adapter, ready } = useEntriesAdapter();
   const { user } = useAuth();
   const { refresh: refreshEntriesStore } = useEntries();
   const { deletedEntries, deletedCount, loading, error, refresh } =
      useDeletedEntries();
   const insets = useSafeAreaInsets();
   const { colorScheme } = useColorScheme();
   const isDark = colorScheme === 'dark';
   const { t, i18n } = useTranslation();

   // --- STATE ---
   const [isOffline, setIsOffline] = useState(false);
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [restoringId, setRestoringId] = useState<string | null>(null);
   const [deletingAll, setDeletingAll] = useState(false);

   // --- ANIMATION ---
   const scrollY = useSharedValue(0);
   const scrollHandler = useAnimatedScrollHandler((event) => {
      scrollY.value = event.contentOffset.y;
   });

   // --- STYLES ---
   const buttonShadow = useMemo(
      () =>
         getShadow({
            isDark,
            preset: 'sm',
         }),
      [isDark],
   );

   const cardShadow = useMemo(
      () => getShadow({ isDark, preset: 'sm' }),
      [isDark],
   );

   const deleteColor = isDark ? '#fca5a5' : '#dc2626';
   const restoreColor = isDark ? '#86efac' : '#16a34a';
   const iconColor = isDark ? '#e2e8f0' : '#1e293b';

   // --- CLOUD LOGIC ---
   const cloud = useMemo(() => {
      if (!user?.id) return null;
      return createSupabaseEntriesClient(user.id);
   }, [user?.id]);

   const canUseCloud = Boolean(user?.id && cloud && !isOffline);

   // --- EFFECTS ---
   useFocusEffect(
      useCallback(() => {
         refresh();
      }, [refresh]),
   );

   useEffect(() => {
      const unsubscribe = NetInfo.addEventListener((state) => {
         const connected = state.isConnected;
         const reachable = state.isInternetReachable;
         setIsOffline(connected === false || reachable === false);
      });
      return () => unsubscribe();
   }, []);

   // --- HANDLERS ---
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
               t('bin.delete_failed_title'),
               e?.message ?? t('bin.delete_failed_message'),
           );
         } finally {
            setDeletingId((current) => (current === entry.id ? null : current));
         }
      },
      [adapter, canUseCloud, cloud, ready, refresh, refreshEntriesStore, t],
   );

   const confirmDelete = useCallback(
      (entry: Entry) => {
         const detail = canUseCloud
            ? t('bin.delete_detail_cloud')
            : t('bin.delete_detail_local');
         Alert.alert(t('bin.delete_confirm_title'), detail, [
            { text: t('common.cancel'), style: 'cancel' },
            {
               text: t('common.delete'),
               style: 'destructive',
               onPress: () => deleteEntry(entry),
            },
         ]);
      },
      [canUseCloud, deleteEntry, t],
   );

   const restoreEntry = useCallback(
      async (entry: Entry) => {
         if (!adapter || !ready) return;
         setRestoringId(entry.id);
         try {
            const restored = await adapter.update(entry.id, {
               isDeleted: false,
            });
            if (canUseCloud && cloud) {
               await cloud.upsert(restored);
            }
            await refresh();
            await refreshEntriesStore();
         } catch (e: any) {
           Alert.alert(
               t('bin.restore_failed_title'),
               e?.message ?? t('bin.restore_failed_message'),
           );
         } finally {
            setRestoringId((current) =>
               current === entry.id ? null : current,
            );
         }
      },
      [adapter, canUseCloud, cloud, ready, refresh, refreshEntriesStore, t],
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
            t('bin.delete_failed_title'),
            e?.message ?? t('bin.delete_all_failed_message'),
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
      t,
   ]);

   const confirmDeleteAll = useCallback(() => {
      const detail = canUseCloud
         ? t('bin.empty_detail_cloud')
         : t('bin.empty_detail_local');
      Alert.alert(t('bin.empty_confirm_title'), detail, [
         { text: t('common.cancel'), style: 'cancel' },
         { text: t('bin.empty_action'), style: 'destructive', onPress: deleteAll },
      ]);
   }, [canUseCloud, deleteAll, t]);

   // --- RENDER HELPERS ---
   const ListHeader = useMemo(
      () => (
         <View className="px-6 pb-6 items-center justify-center">
            <Text className="text-3xl font-black text-slate-900 dark:text-white mb-1 text-center">
               {t('bin.title')}
            </Text>
            <Text className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">
               {deletedCount > 0
                  ? t('bin.deleted_count', { count: deletedCount })
                  : t('bin.none_deleted')}
            </Text>
            {error && (
               <Text className="text-sm text-rose-600 dark:text-rose-400 mt-2 text-center">
                  {error}
               </Text>
            )}
         </View>
      ),
      [deletedCount, error, t],
   );

   return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
         {/* --- 1. FLOATING NAVIGATION (Absolute) --- */}

         {/* Left Button (Back) */}
         <View
            className="absolute left-6 z-50"
            style={{ top: insets.top + 10 }}
         >
            <Pressable
               onPress={() => router.back()}
               hitSlop={16}
               style={[buttonShadow.ios, buttonShadow.android]}
               className="w-12 h-12 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
            >
               <View className="items-center justify-center pl-2">
                  <LeftBackChevron isDark={isDark} />
               </View>
            </Pressable>
         </View>

         {/* Right Button (Delete All - Text Pill) */}
         {deletedCount > 0 && (
            <View
               className="absolute right-4 z-50 h-12 justify-center"
               style={{ top: insets.top + 10 }}
            >
               <Pressable
                  onPress={confirmDeleteAll}
                  disabled={deletingAll}
                  hitSlop={16}
                  style={[buttonShadow.ios, buttonShadow.android]}
                  // The button stays smaller (h-8) as you preferred
                  className="h-8 px-3 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 active:opacity-80"
               >
                  {deletingAll ? (
                     <ActivityIndicator size="small" color={deleteColor} />
                  ) : (
                     <Text className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
                        {t('bin.delete_all')}
                     </Text>
                  )}
               </Pressable>
            </View>
         )}

         {/* --- 2. MAIN LIST --- */}
         {loading && deletedCount === 0 ? (
            <View className="flex-1 items-center justify-center pt-32">
               <ActivityIndicator size="small" color={iconColor} />
            </View>
         ) : (
            <AnimatedFlatList
               data={deletedEntries}
               keyExtractor={(item: any) => item.id}
               ListHeaderComponent={ListHeader}
               className="flex-1"
               showsVerticalScrollIndicator={false}
               onScroll={scrollHandler}
               scrollEventThrottle={16}
               contentContainerStyle={{
                  paddingTop: insets.top + 10,
                  paddingBottom: insets.bottom + 24,
               }}
               ListEmptyComponent={
                  <View className="items-center justify-center py-8">
                     <Text className="text-sm text-slate-400 dark:text-slate-500">
                        {t('bin.empty_state')}
                     </Text>
                  </View>
               }
               renderItem={({ item }: { item: Entry }) => (
                  <Animated.View
                     layout={LinearTransition.duration(180)}
                     exiting={FadeOutUp.duration(180)}
                     className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4 mx-4"
                     style={cardShadow.style}
                  >
                     {/* Card Header: Date */}
                     <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                           {t('bin.deleted_label')}
                        </Text>
                        <Text className="text-xs text-slate-400 dark:text-slate-500">
                           {formatDateTimeWithWeekday(
                              item.updatedAt,
                              i18n.language === 'ko' ? 'ko-KR' : 'en-US',
                           )}
                        </Text>
                     </View>

                     {/* Card Body: Content Preview */}
                     <View className="gap-2">
                        {[
                           { label: t('abcde.adversity'), value: item.adversity },
                           { label: t('abcde.belief'), value: item.belief },
                           { label: t('abcde.consequence'), value: item.consequence },
                           { label: t('abcde.dispute'), value: item.dispute },
                           { label: t('abcde.energy'), value: item.energy },
                        ]
                           .filter(
                              (field) => (field.value ?? '').trim().length > 0,
                           )
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

                     {/* Card Actions: Restore / Delete */}
                     <View className="flex-row items-center justify-between mt-4 gap-3">
                        <Pressable
                           onPress={() => restoreEntry(item)}
                           disabled={restoringId === item.id}
                           className="flex-1 flex-row items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 active:opacity-80"
                           style={
                              restoringId === item.id
                                 ? { opacity: 0.6 }
                                 : undefined
                           }
                        >
                           {restoringId === item.id ? (
                              <ActivityIndicator
                                 size="small"
                                 color={restoreColor}
                              />
                           ) : (
                              <RotateCcw size={16} color={restoreColor} />
                           )}
                           <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                              {t('bin.restore')}
                           </Text>
                        </Pressable>

                        <Pressable
                           onPress={() => confirmDelete(item)}
                           disabled={deletingId === item.id}
                           className="flex-1 flex-row items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 active:opacity-80"
                           style={
                              deletingId === item.id
                                 ? { opacity: 0.6 }
                                 : undefined
                           }
                        >
                           {deletingId === item.id ? (
                              <ActivityIndicator
                                 size="small"
                                 color={deleteColor}
                              />
                           ) : (
                              <Trash2 size={16} color={deleteColor} />
                           )}
                           <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                              {t('common.delete')}
                           </Text>
                        </Pressable>
                     </View>
                  </Animated.View>
               )}
            />
         )}

         <BottomFade height={insets.bottom + 12} />
      </View>
   );
}
