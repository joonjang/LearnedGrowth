import { HelpCircle, Scale, Sparkles, Wind } from 'lucide-react-native';

export function isOptimistic(score: string | null): boolean {
  if (!score) return false;
  const s = score.toLowerCase();
  return (
    s.includes('optimis') ||
    s.includes('temporary') ||
    s.includes('specific') ||
    s.includes('external')
  );
}

export function getMoodConfig(score: number | null, isDark: boolean) {
  if (score === null) {
    return {
      Icon: HelpCircle,
      label: 'No Data',
      description: 'Add entries to see your outlook.',
      weekDescription: 'Add entries this week to see your outlook.',
      color: isDark ? '#94a3b8' : '#64748b',
      bg: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
    };
  }
  if (score >= 7.0) {
    return {
      Icon: Sparkles,
      label: 'Seeing Possibilities',
      description:
        'You are focusing on a way forward and seeing the scope of your potential.',
      weekDescription:
        'This week you leaned into possibility and forward momentum.',
      color: isDark ? '#34d399' : '#059669',
      bg: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(5, 150, 105, 0.1)',
    };
  }
  if (score >= 4.0) {
    return {
      Icon: Scale,
      label: 'Grounded Reality',
      description:
        'You are seeing things as they are—a solid mix of good and bad.',
      weekDescription:
        'Your week balanced positives and challenges without swinging to extremes.',
      color: isDark ? '#fbbf24' : '#d97706',
      bg: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(217, 119, 6, 0.1)',
    };
  }
  return {
    Icon: Wind,
    label: 'Turning Inward',
    description: 'You are in a protective, introspective state right now.',
    weekDescription: 'Your entries skewed towards internalizing challenges this week.',
    color: isDark ? '#a5b4fc' : '#6366f1',
    bg: isDark ? 'rgba(165, 180, 252, 0.15)' : 'rgba(99, 102, 241, 0.1)',
  };
}
