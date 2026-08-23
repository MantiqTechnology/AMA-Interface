import { defineNuxtPlugin } from "#imports";
import { createAdapter } from "./i18n.js";
export default defineNuxtPlugin({
  name: "vuetify:i18n:plugin",
  order: -25,
  // @ts-expect-error i18n plugin missing on build time
  dependsOn: ["i18n:plugin"],
  parallel: true,
  setup(nuxtApp) {
    nuxtApp.hook("vuetify:configuration", ({ vuetifyOptions }) => {
      createAdapter(vuetifyOptions);
    });
  }
});
