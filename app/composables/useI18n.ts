import {
  defaultLocale,
  messages,
  normalizeLocale,
  supportedLocales,
  type AppLocale,
  type MessageKey
} from '#shared/i18n/messages';

type MessageParams = Record<string, string | number | boolean | null | undefined>;

function readPath(source: unknown, key: string) {
  return key.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[segment];
  }, source);
}

function interpolate(message: string, params?: MessageParams) {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/gu, (_, key: string) =>
    params[key] === undefined || params[key] === null ? '' : String(params[key])
  );
}

export function useAppLocale() {
  const cookie = useCookie<AppLocale>('ama_locale', {
    default: () => defaultLocale,
    sameSite: 'lax'
  });
  const locale = useState<AppLocale>('ama-locale', () => normalizeLocale(cookie.value));

  watch(
    locale,
    (value) => {
      cookie.value = normalizeLocale(value);
    },
    { immediate: true }
  );

  function setLocale(value: string) {
    locale.value = normalizeLocale(value);
  }

  return {
    locale,
    localeOptions: supportedLocales,
    setLocale
  };
}

export function useI18n() {
  const { locale, localeOptions, setLocale } = useAppLocale();

  function t(key: MessageKey, params?: MessageParams) {
    const localized = readPath(messages[locale.value], key);
    const fallback = readPath(messages[defaultLocale], key);
    const message =
      typeof localized === 'string' ? localized : typeof fallback === 'string' ? fallback : key;
    return interpolate(message, params);
  }

  return {
    locale,
    localeOptions,
    setLocale,
    t
  };
}
