import React from 'react';
import { Text, View } from 'react-native';
import { CategorySegment } from './types';

type Props = {
  segments: CategorySegment[];
};

const SegmentedCategoryLine = React.memo(({ segments }: Props) => {
  if (!segments || segments.length === 0) return null;

  return (
    <View className="mt-2.5 mb-1">
      <View className="flex-row h-2 w-full rounded-full overflow-hidden bg-slate-100">
        {segments.map((seg) => (
          <View
            key={seg.category}
            style={{
              height: '100%',
              width: `${seg.percentage}%`,
              marginRight: 1,
              backgroundColor: seg.colorHex,
            }}
          />
        ))}
      </View>

      <View className="flex-row flex-wrap gap-3 mt-2 justify-center">
        {segments.slice(0, 4).map((seg) => (
          <View key={seg.category} className="flex-row items-center gap-1.5">
            <View
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: seg.colorHex }}
            />
            <Text className="text-[11px] text-slate-500">
              <Text style={{ fontWeight: '600' }}>{seg.category}</Text>{' '}
              <Text style={{ opacity: 0.7 }}>
                {Math.round(seg.percentage)}%
              </Text>
            </Text>
          </View>
        ))}
        {segments.length > 4 && (
          <Text className="text-[10px] text-slate-400 self-center">
            +{segments.length - 4} more
          </Text>
        )}
      </View>
    </View>
  );
});

SegmentedCategoryLine.displayName = 'SegmentedCategoryLine';
export default SegmentedCategoryLine;
