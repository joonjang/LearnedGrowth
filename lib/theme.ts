import {
  BELIEF_BG_CLASS,
  BELIEF_BORDER_CLASS,
  BELIEF_TEXT_CLASS,
  DISPUTE_BG_CLASS,
  DISPUTE_BORDER_CLASS,
  DISPUTE_TEXT_CLASS,
  ENERGY_BG_CLASS,
  ENERGY_BORDER_CLASS,
  ENERGY_TEXT_CLASS,
} from '@/lib/styles';

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
    case 'belief': 
      return {
        container: `${BELIEF_BG_CLASS} ${BELIEF_BORDER_CLASS}`,
        text: `${BELIEF_TEXT_CLASS} font-semibold`,
        label: 'text-slate-500 dark:text-slate-400',
      };
    case 'dispute': 
      return {
        container: `${DISPUTE_BG_CLASS} ${DISPUTE_BORDER_CLASS}`,
        text: `${DISPUTE_TEXT_CLASS} font-semibold`,
        label: 'text-slate-500 dark:text-slate-400',
      };
    case 'energy': 
      return {
        container: `${ENERGY_BG_CLASS} ${ENERGY_BORDER_CLASS}`,
        text: `${ENERGY_TEXT_CLASS} font-semibold`,
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
