import { Entry } from '@/models/entry';
import React from 'react';
import { View } from 'react-native';
import MentalFcousCard from './mentalFocus/MentalFocusCard';
import ThinkingPatternCard from './thinkingPattern/ThinkingPatternCard';
import { DashboardData } from './types';

type Props = {
   data: DashboardData;
   shadowSm: any;
   isDark: boolean;
   entries: Entry[];
};

const PatternDashboard = React.memo(
   ({ data, shadowSm, isDark, entries }: Props) => {
      if (data.weeklyScore === null) return null;

      return (
         <View className="gap-4">
            {/* 1. MOOD SUMMARY CARD (Unchanged) */}
            <MentalFcousCard
               entries={entries} // Pass the raw entries
               shadowStyle={shadowSm}
               isDark={isDark}
            />

            {/* 2. THINKING PATTERNS CARD */}
            <ThinkingPatternCard
               data={data}
               shadowStyle={shadowSm}
               isDark={isDark}
            />
         </View>
      );
   },
);

PatternDashboard.displayName = 'PatternDashboard';
export default PatternDashboard;
