import { getCookie, getHeader, type H3Event } from 'h3';
import { defaultLocale, normalizeLocale, type AppLocale } from '../../shared/i18n/messages';

export function getRequestLocale(event: H3Event): AppLocale {
  const cookieLocale = getCookie(event, 'ama_locale');
  if (cookieLocale) return normalizeLocale(cookieLocale);

  const languageHeader = getHeader(event, 'accept-language');
  if (languageHeader) return normalizeLocale(languageHeader);

  return defaultLocale;
}
