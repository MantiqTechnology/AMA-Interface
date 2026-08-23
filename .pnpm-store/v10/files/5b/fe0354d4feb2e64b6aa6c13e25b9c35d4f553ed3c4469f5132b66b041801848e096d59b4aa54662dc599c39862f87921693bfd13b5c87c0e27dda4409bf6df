import { enabled, iconsConfiguration } from "virtual:vuetify-icons-configuration";
export function configureIcons(vuetifyOptions) {
  if (enabled) {
    const icons = iconsConfiguration();
    const custom = icons?.defaultSet === "custom";
    if (custom) {
      return;
    }
    vuetifyOptions.icons = icons;
  }
}
