import { useNuxtApp } from "#imports";
import { adapter, dateConfiguration, enabled, i18n } from "virtual:vuetify-date-configuration";
export function configureDate(vuetifyOptions) {
  if (adapter === "custom" || !enabled) {
    return;
  }
  const dateOptions = dateConfiguration();
  if (i18n) {
    const locales = useNuxtApp().$i18n.locales.value;
    if (locales) {
      dateOptions.locale = locales.reduce((acc, locale) => {
        acc[locale.code] = locale.code;
        return acc;
      }, {});
    }
  }
  vuetifyOptions.date = dateOptions;
}
