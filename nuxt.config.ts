import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

const defaultDbPath =
  process.env.AMA_DB_PATH ??
  (process.env.VERCEL || process.env.NODE_ENV === 'production'
    ? '/tmp/ama-demo.sqlite'
    : './data/ama-demo.sqlite');

function patchVuetifySwitchCss() {
  return {
    name: 'patch-vuetify-switch-css',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.includes('vuetify') || !id.endsWith('/VSwitch/VSwitch.css')) return;

      return code
        .replaceAll('calc(16px / 24px)', '0.6666666667')
        .replaceAll('calc(28px / 24px)', '1.1666666667');
    }
  };
}

export default defineNuxtConfig({
  buildDir: process.env.NUXT_BUILD_DIR ?? '.nuxt',
  compatibilityDate: '2026-07-04',
  devtools: { enabled: true },
  modules: ['vuetify-nuxt-module'],
  srcDir: 'app',
  serverDir: 'server',
  alias: {
    '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    '#server': fileURLToPath(new URL('./server', import.meta.url))
  },
  css: ['@mdi/font/css/materialdesignicons.css', '~/assets/css/main.css'],
  runtimeConfig: {
    dbPath: defaultDbPath,
    demoMode: process.env.DEMO_MODE ?? 'true',
    s3Upload: {
      bucket: process.env.S3_UPLOAD_BUCKET ?? '',
      endpoint: process.env.S3_UPLOAD_ENDPOINT ?? '',
      region: process.env.S3_UPLOAD_REGION ?? process.env.AWS_REGION ?? 'auto',
      publicBaseUrl: process.env.S3_UPLOAD_PUBLIC_BASE_URL ?? '',
      manifestKey: process.env.S3_UPLOAD_MANIFEST_KEY ?? '_manifests/ama-uploads.json',
      isConfigured: Boolean(
        process.env.S3_UPLOAD_BUCKET &&
        (process.env.S3_UPLOAD_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
        (process.env.S3_UPLOAD_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)
      )
    },
    public: {
      demoMode: process.env.DEMO_MODE ?? 'true',
      aircraftImageBaseUrl:
        process.env.AIRCRAFT_IMAGE_BASE_URL ?? process.env.S3_UPLOAD_PUBLIC_BASE_URL ?? ''
    }
  },
  nitro: {
    experimental: {
      openAPI: true,
      tasks: true
    },
    scheduledTasks: {
      '*/15 * * * *': ['airworthiness-sweep']
    }
  },
  vite: {
    build: {
      cssMinify: 'lightningcss'
    },
    plugins: [patchVuetifySwitchCss(), tailwindcss()]
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
          rounded: 'md',
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
    typeCheck: process.env.NUXT_TYPECHECK === 'true'
  }
});
