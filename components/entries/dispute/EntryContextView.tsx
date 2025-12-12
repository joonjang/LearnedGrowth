import React from 'react';
import { Text, View } from 'react-native';

type Props = {
   adversity: string;
   belief: string;
   consequence: string;
};

export default function EntryContextView({
   adversity,
   belief,
   consequence,
}: Props) {
   return (
      <View className="bg-card-grey p-3 rounded-xl gap-2.5 border border-border shadow-sm">
         {/* Adversity */}
         <View className="gap-1">
            <Text className="text-xs font-bold text-text-subtle uppercase tracking-widest">
               Adversity
            </Text>
            <Text className="text-sm text-text">{adversity}</Text>
         </View>
         
         <View className="h-[1px] bg-border my-0.5" />
         
         {/* Belief */}
         <View className="gap-1">
            <Text className="text-xs font-bold text-text-subtle uppercase tracking-widest">
               Belief
            </Text>
            <Text className="text-sm text-text">{belief}</Text>
         </View>
         
         {/* Consequence */}
         {consequence && (
            <>
               <View className="h-[1px] bg-border my-0.5" />
               <View className="gap-1">
                  <Text className="text-xs font-bold text-text-subtle uppercase tracking-widest">
                     Consequence
                  </Text>
                  <Text className="text-sm text-text">{consequence}</Text>
               </View>
            </>
         )}
      </View>
   );
}