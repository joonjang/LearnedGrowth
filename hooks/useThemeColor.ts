import { useColorScheme } from 'nativewind';

export function useThemeColor() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      // These MUST match the Hex codes in global.css
      background: isDark ? '#0f172a' : '#f8fafc',
      card:       isDark ? '#1e293b' : '#ffffff',
      border:     isDark ? '#1e293b' : '#e2e8f0', // Tab bar border
      
      // Icon Colors
      active:     isDark ? '#f8fafc' : '#0f172a',
      inactive:   isDark ? '#64748b' : '#94a3b8',
    }
  };
}