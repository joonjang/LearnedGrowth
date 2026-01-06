import { StyleSheet } from 'react-native';

import { BOTTOM_SHEET_RADIUS } from '@/components/constants';

export const BOTTOM_SHEET_BG_DARK = '#0f172a';
export const BOTTOM_SHEET_BG_LIGHT = '#ffffff';
export const BOTTOM_SHEET_HANDLE_DARK = '#475569';
export const BOTTOM_SHEET_HANDLE_LIGHT = '#cbd5e1';
export const BOTTOM_SHEET_TOP_BORDER_DARK = 'rgba(71, 85, 105, 0.7)';

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
