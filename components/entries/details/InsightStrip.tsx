import { CATEGORY_ICON_MAP } from '@/components/constants';
import React, { memo } from 'react';
import { Text, View } from 'react-native';

// Move this helper outside or to a utility file
const getCategoryIcon = (category: string) => CATEGORY_ICON_MAP[category];

type InsightStripProps = {
   category: string;
   tags: string[];
   catColor: string;
   isDark: boolean;
};

// 'memo' prevents re-renders when you are just typing in the form below
export const InsightStrip = memo(
   ({ category, tags, catColor, isDark }: InsightStripProps) => {
      const CategoryIcon = getCategoryIcon(category);

      return (
         <View className="flex-row items-center mb-6 px-1">
            {/* Icon Anchor */}
            <View
               className="w-[52px] h-[52px] rounded-2xl items-center justify-center border mr-4"
               style={{
                  backgroundColor: isDark ? `${catColor}15` : `${catColor}10`,
                  borderColor: isDark ? `${catColor}25` : `${catColor}15`,
               }}
            >
               <CategoryIcon size={26} color={catColor} strokeWidth={2} />
            </View>

            {/* Data Container */}
            <View className="flex-1 flex-row items-center">
               {/* Category */}
               <View className="mr-5 justify-center shrink-0 py-1">
                  <Text
                     className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                     style={{ color: catColor, opacity: 0.9 }}
                  >
                     Category
                  </Text>
                  <Text className="text-[20px] font-extrabold text-slate-900 dark:text-slate-100 leading-6">
                     {category}
                  </Text>
               </View>

               {/* Divider */}
               <View className="w-[1px] bg-slate-200 dark:bg-slate-700 mr-5 rounded-full self-stretch my-1" />

               {/* Themes */}
               <View className="flex-1 justify-center py-1">
                  {tags.length > 0 && (
                     <>
                        <Text
                           className="text-[10px] font-bold uppercase tracking-widest mb-1.5"
                           style={{ color: catColor, opacity: 0.7 }}
                        >
                           Themes
                        </Text>
                        <View className="gap-1">
                           {tags.map((tag, i) => (
                              <Text
                                 key={i}
                                 className="text-[12px] font-medium text-slate-600 dark:text-slate-300 leading-4"
                              >
                                 {tag}
                              </Text>
                           ))}
                        </View>
                     </>
                  )}
               </View>
            </View>
         </View>
      );
   },
);

InsightStrip.displayName = 'InsightStrip';
