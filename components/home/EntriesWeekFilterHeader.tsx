import type {
   EntryCountFilterKey,
   EntryCountFilterOption,
} from '@/lib/entries';
import { getShadow } from '@/lib/shadow';
import { Link } from 'expo-router';
import {
   Check,
   ChevronDown,
   Infinity,
   Info,
   Settings,
} from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

type EntriesWeekFilterHeaderProps = {
   isDark: boolean;
   isDropdownOpen: boolean;
   isLoading: boolean;
   displayLabel: string;
   selectedFilterKey: EntryCountFilterKey;
   filterOptions: EntryCountFilterOption[];
   showDropdown: boolean;
   totalCount: number;
   onToggleDropdown: () => void;
   onCloseDropdown: () => void;
   onSelectFilter: (key: EntryCountFilterKey) => void;
   onShowHelp: () => void;
   deletedCount: number;
};

export default function EntriesWeekFilterHeader({
   isDark,
   isDropdownOpen,
   isLoading,
   displayLabel,
   selectedFilterKey,
   filterOptions,
   showDropdown,
   totalCount,
   onToggleDropdown,
   onCloseDropdown,
   onSelectFilter,
   onShowHelp,
   deletedCount,
}: EntriesWeekFilterHeaderProps) {
   const hasCountOptions = useMemo(
      () => filterOptions.some((option) => option.key !== 'all'),
      [filterOptions],
   );
   const iconColor = isDark ? '#cbd5e1' : '#475569';
   const dropdownShadow = useMemo(
      () => getShadow({ isDark, preset: 'md', disableInDark: true }),
      [isDark],
   );
   const isDropdownVisible = showDropdown && isDropdownOpen;

   const triggerContent = (
      <View
         className={`flex-row items-center gap-2 bg-white dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 self-start ${isLoading ? 'opacity-70' : ''}`}
      >
         {isLoading ? (
            <View className="h-5 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
         ) : (
            <Text
               numberOfLines={1}
               ellipsizeMode="tail"
               className="text-xl font-bold text-slate-900 dark:text-white max-w-[200px]"
            >
               {displayLabel}
            </Text>
         )}
         {showDropdown && (
            <View
               className={`transform ${isDropdownVisible ? 'rotate-180' : 'rotate-0'}`}
            >
               <ChevronDown
                  size={16}
                  color={isDark ? '#94a3b8' : '#64748b'}
                  strokeWidth={2.5}
               />
            </View>
         )}
      </View>
   );

   const staticLabelContent = (
      <View className="flex-row items-center gap-2 self-start px-3.5 py-2">
         {isLoading ? (
            <View className="h-5 w-24 rounded-md bg-slate-200 dark:bg-slate-700" />
         ) : (
            <Text
               numberOfLines={1}
               ellipsizeMode="tail"
               className="text-xl font-bold text-slate-900 dark:text-white max-w-[200px]"
            >
               {displayLabel}
            </Text>
         )}
      </View>
   );

   return (
      <>
         {isDropdownVisible && (
            <Pressable
               style={{
                  position: 'absolute',
                  top: -1000,
                  left: -1000,
                  right: -1000,
                  bottom: -1000,
                  zIndex: 40,
               }}
               onPress={onCloseDropdown}
            />
         )}

         <View className="flex-row items-center justify-between mb-4 z-50">
            <View className="z-50 flex-1">
               <View className="z-50">
                  {showDropdown ? (
                     <Pressable onPress={onToggleDropdown} disabled={isLoading}>
                        {triggerContent}
                     </Pressable>
                  ) : (
                     staticLabelContent
                  )}

                  {isDropdownVisible && (
                     <Animated.View
                        entering={FadeIn.duration(150)}
                        exiting={FadeOut.duration(150)}
                        style={[
                           {
                              position: 'absolute',
                              top: 48,
                              left: 0,
                              width: 240,
                              maxHeight: 320,
                              backgroundColor: isDark ? '#1e293b' : '#ffffff',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: isDark ? '#334155' : '#e2e8f0',
                              zIndex: 100,
                           },
                           dropdownShadow.ios,
                           dropdownShadow.android,
                        ]}
                     >
                        <ScrollView
                           contentContainerStyle={{ padding: 6 }}
                           showsVerticalScrollIndicator={true}
                           nestedScrollEnabled={true}
                        >
                           {filterOptions.map((option) => {
                              const isSelected =
                                 selectedFilterKey === option.key;
                              const isAll = option.key === 'all';
                              return (
                                 <React.Fragment key={option.key}>
                                    <Pressable
                                       onPress={() =>
                                          onSelectFilter(option.key)
                                       }
                                    >
                                       <View
                                          className={`flex-row items-center justify-between p-3 rounded-xl ${isSelected ? 'bg-slate-100 dark:bg-slate-700/50' : ''}`}
                                       >
                                          {isAll ? (
                                             <View className="flex-row items-center gap-3">
                                                <Infinity
                                                   size={16}
                                                   color={
                                                      isDark
                                                         ? '#94a3b8'
                                                         : '#64748b'
                                                   }
                                                />
                                                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                   {`${option.label} (${totalCount})`}
                                                </Text>
                                             </View>
                                          ) : (
                                             <Text
                                                className={`text-xs font-bold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}
                                             >
                                                {option.label}
                                             </Text>
                                          )}
                                          {isSelected && (
                                             <Check
                                                size={14}
                                                color={
                                                   isDark
                                                      ? '#818cf8'
                                                      : '#4f46e5'
                                                }
                                             />
                                          )}
                                       </View>
                                    </Pressable>
                                    {isAll && hasCountOptions && (
                                       <View className="h-[1px] bg-slate-100 dark:bg-slate-700 my-1 mx-2" />
                                    )}
                                 </React.Fragment>
                              );
                           })}
                        </ScrollView>
                     </Animated.View>
                  )}
               </View>
            </View>

            <View className="flex-row items-center gap-3">
               <Pressable
                  onPress={onShowHelp}
                  className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80"
               >
                  <Info size={20} color={iconColor} strokeWidth={2.5} />
               </Pressable>
               <Link href="/settings" asChild>
                  <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 active:opacity-80">
                     <Settings size={20} color={iconColor} strokeWidth={2.5} />
                  </Pressable>
               </Link>
            </View>
         </View>
      </>
   );
}
