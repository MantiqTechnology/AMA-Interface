import { defineNuxtPlugin } from "#imports";
import { configureDate } from "./date.js";
export default defineNuxtPlugin({
  name: "vuetify:date:plugin",
  order: -25,
  parallel: true,
  setup(nuxtApp) {
    nuxtApp.hook("vuetify:configuration", ({ vuetifyOptions }) => {
      configureDate(vuetifyOptions);
    });
  }
});
