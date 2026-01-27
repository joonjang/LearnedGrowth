import { StyleSheet } from 'react-native';

import {
   BOTTOM_SHEET_BG_DARK,
   BOTTOM_SHEET_BG_LIGHT,
   BOTTOM_SHEET_HANDLE_DARK,
   BOTTOM_SHEET_HANDLE_LIGHT,
   BOTTOM_SHEET_RADIUS,
   BOTTOM_SHEET_TOP_BORDER_DARK,
} from '@/lib/styles';

export const bottomSheetBackgroundStyle = (
   isDark: boolean,
   backgroundColor?: string
) => ({
   backgroundColor: backgroundColor ?? (isDark ? BOTTOM_SHEET_BG_DARK : BOTTOM_SHEET_BG_LIGHT),
   borderRadius: BOTTOM_SHEET_RADIUS,
   borderTopWidth: isDark ? StyleSheet.hairlineWidth : 0,
   borderTopColor: isDark ? BOTTOM_SHEET_TOP_BORDER_DARK : 'transparent',
   borderTopLeftRadius: BOTTOM_SHEET_RADIUS,
   borderTopRightRadius: BOTTOM_SHEET_RADIUS,
});

export const bottomSheetHandleIndicatorStyle = (isDark: boolean) => ({
   backgroundColor: isDark ? BOTTOM_SHEET_HANDLE_DARK : BOTTOM_SHEET_HANDLE_LIGHT,
});
