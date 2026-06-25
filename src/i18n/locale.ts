import * as Localization from 'expo-localization';
import { Language } from './types';

const SUPPORTED_LANGUAGES: Language[] = ['ja', 'ko', 'en', 'zh'];

export function mapLocaleToLanguage(locale?: string | null): Language {
  if (!locale) return 'ja';

  const code = locale.toLowerCase().split('-')[0];

  if (code === 'ko') return 'ko';
  if (code === 'en') return 'en';
  if (code === 'zh') return 'zh';
  if (code === 'ja') return 'ja';

  return 'ja';
}

export function getSystemLanguage(): Language {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const lang = mapLocaleToLanguage(locale.languageCode);
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      return lang;
    }
  }
  return mapLocaleToLanguage(Localization.locale);
}
