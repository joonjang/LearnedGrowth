// 1. Add 'neutral' to the type definition
export type FieldTone = 'default' | 'neutral' | 'belief' | 'dispute' | 'energy';

export const getFieldStyles = (tone: FieldTone, isEditing: boolean = false) => {
  // 1. EDIT MODE: Uniform styling
  if (isEditing) {
    return {
      container: 'bg-zinc-50 dark:bg-slate-700 border-slate-200 dark:border-slate-700',
      text: 'text-slate-900 dark:text-slate-100',
      label: 'text-slate-900 dark:text-slate-100',
    };
  }

  // 2. VIEW MODE: Semantic styling
  switch (tone) {
    case 'belief': // ORANGE
      return {
        container: 'bg-belief-bg dark:bg-belief-bgDark border-belief-border dark:border-belief-borderDark',
        text: 'text-belief-text dark:text-belief-textDark font-semibold',
        label: 'text-slate-500 dark:text-slate-400',
      };
    case 'dispute': // BLUE/INDIGO
      return {
        container: 'bg-dispute-bg dark:bg-dispute-bgDark border-dispute-border dark:border-dispute-borderDark',
        text: 'text-dispute-text dark:text-dispute-textDark font-semibold',
        label: 'text-slate-500 dark:text-slate-400',
      };
    case 'energy': // GREEN
      return {
        container: 'bg-energy-bg dark:bg-energy-bgDark border-energy-border dark:border-energy-borderDark',
        text: 'text-energy-text dark:text-energy-textDark font-semibold',
        label: 'text-slate-500 dark:text-slate-400',
      };
    
    // 3. Add 'neutral' case here to fall through to default
    case 'neutral':
    default:
      return {
        container: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        text: 'text-slate-900 dark:text-slate-100',
        label: 'text-slate-500 dark:text-slate-400',
      };
  }
};