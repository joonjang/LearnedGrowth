import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import ko from '@/locales/ko.json';

const RESOURCES = {
   en: { translation: en },
   ko: { translation: ko },
};

const deviceLang = Localization.getLocales?.()?.[0]?.languageCode ?? 'en';
const initialLang = deviceLang === 'ko' ? 'ko' : 'en';

// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init({
   resources: RESOURCES,
   lng: initialLang,
   fallbackLng: 'en',
   interpolation: {
      escapeValue: false, // React handles escaping
   },
   compatibilityJSON: 'v4', // Changed from 'v3' to 'v4' to fix Type Error
});

export default i18n;