import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-07-04',
  devtools: { enabled: true },
  modules: ['vuetify-nuxt-module'],
  srcDir: 'app',
  serverDir: 'server',
  alias: {
    '#operations': fileURLToPath(new URL('./app/utils/operations', import.meta.url)),
    '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    '#server': fileURLToPath(new URL('./server', import.meta.url))
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    dbPath: process.env.AMA_DB_PATH ?? './data/ama-demo.sqlite',
    demoMode: process.env.DEMO_MODE ?? 'true',
    public: {
      demoMode: process.env.DEMO_MODE ?? 'true'
    }
  },
  nitro: {
    experimental: {
      openAPI: true
    }
  },
  vite: {
    build: {
      cssMinify: 'lightningcss'
    },
    plugins: [tailwindcss()]
  },
  vuetify: {
    vuetifyOptions: {
      theme: {
        defaultTheme: 'amaLight',
        themes: {
          amaLight: {
            dark: false,
            colors: {
              primary: '#082B49',
              secondary: '#0E8C8A',
              'accent-cenderawasih': '#F47A1F',
              'accent-cenderawasih-hover': '#D95F0C',
              'accent-cenderawasih-soft': '#FFF0E3',
              'accent-cenderawasih-border': '#F6B071',
              warning: '#F2B544',
              danger: '#B9473B',
              error: '#B9473B',
              success: '#27805B',
              info: '#286E9E',
              background: '#F7F9FA',
              surface: '#FFFFFF',
              'text-primary': '#12211F',
              'text-secondary': '#5D6A6B',
              'border-default': '#D8E0E1'
            }
          },
          amaDark: {
            dark: true,
            colors: {
              primary: '#0E8C8A',
              secondary: '#F47A1F',
              'accent-cenderawasih': '#F47A1F',
              'accent-cenderawasih-hover': '#D95F0C',
              'accent-cenderawasih-soft': '#2A211A',
              'accent-cenderawasih-border': '#F6B071',
              warning: '#F2B544',
              danger: '#E06B60',
              error: '#E06B60',
              success: '#44A87C',
              info: '#5AA1CF',
              background: '#12211F',
              surface: '#082B49',
              'text-primary': '#F7F9FA',
              'text-secondary': '#D8E0E1',
              'border-default': '#286E9E'
            }
          }
        }
      },
      defaults: {
        VBtn: {
          rounded: 'lg',
          elevation: 0
        },
        VCard: {
          rounded: 'lg',
          elevation: 0
        },
        VChip: {
          rounded: 'pill'
        }
      }
    }
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
});
